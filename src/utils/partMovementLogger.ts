import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { PartMovementLog } from '@/types/PCD/Welding/MovementHistory';
import { getMovementLogsApi, saveMovementLogBatchApi, clearMovementLogsApi } from '@/services/PCD/Welding/Simulation';

const STORAGE_PREFIX = 'glc_part_move_log_';

export const generateAutoReason = (
  fromMachine: string,
  toMachine: string,
  fromMachineTptHours?: number,
  shiftCapacity = 8
): string => {
  if (fromMachineTptHours && fromMachineTptHours > shiftCapacity) {
    return `Auto: Reduksi Overload di ${fromMachine} (${fromMachineTptHours.toFixed(1)} Jam > Kapasitas ${shiftCapacity} Jam)`;
  }
  return `Auto: Line Balancing & Alokasi Beban ke ${toMachine}`;
};

export const getMovementLogs = (
  simulationId?: number | string,
  loadsData?: any[]
): PartMovementLog[] => {
  const key = `${STORAGE_PREFIX}${simulationId || 'session'}`;
  let savedLogs: PartMovementLog[] = [];
  
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      savedLogs = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to parse movement logs from localStorage:', err);
  }

  // If there are loadsData where machine_prev !== machine_use, ensure they exist in logs
  if (loadsData && Array.isArray(loadsData)) {
    const existingLogKeys = new Set(
      savedLogs.map(l => `${l.part_number}_${l.process || 1}_${l.from_machine}_${l.to_machine}`)
    );

    loadsData.forEach(item => {
      const fromM = (item.machine_prev || '').trim();
      const toM = (item.machine_use || item.machine || '').trim();

      if (fromM && toM && fromM !== toM) {
        const proc = item.process || 1;
        const logKey = `${item.part_number}_${proc}_${fromM}_${toM}`;

        if (!existingLogKeys.has(logKey)) {
          const autoReason = generateAutoReason(fromM, toM);
          const synthesizedLog: PartMovementLog = {
            id: `synth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            simulation_id: simulationId,
            timestamp: item.updated_at || item.created_at || new Date().toLocaleString('id-ID'),
            user: item.updated_by || item.created_by || 'SYSTEM (Balancing)',
            part_number: item.part_number,
            part_name: item.part_name || item.mw_part_name || '',
            job_number: item.job_number || '-',
            model: item.model || '-',
            process: proc,
            from_machine: fromM,
            to_machine: toM,
            reason: autoReason,
            is_auto: true,
            pcs_day: Number(item.pcs_day || 0),
            cycle_time_sec: Number(item.cycle_time_sec || 0)
          };
          savedLogs.unshift(synthesizedLog);
          existingLogKeys.add(logKey);
        }
      }
    });
  }

  return savedLogs;
};

// Async fetcher: Calls Backend Database API directly, falls back to local storage synthesis
export const fetchMovementLogsAsync = async (
  simulationId?: number | string,
  loadsData?: any[]
): Promise<PartMovementLog[]> => {
  if (simulationId) {
    try {
      const res = await getMovementLogsApi(simulationId);
      if (res && (res.status === 200 || Array.isArray(res.data))) {
        const dbLogs = res.data || [];
        if (dbLogs.length > 0) {
          // Normalize fields from DB
          const formatted: PartMovementLog[] = dbLogs.map((d: any) => ({
            id: String(d.id),
            simulation_id: d.id_simulation,
            timestamp: d.created_at || d.timestamp || new Date().toLocaleString('id-ID'),
            user: d.created_by || d.user || 'SYSTEM',
            part_number: d.part_number,
            part_name: d.part_name || '',
            job_number: d.job_number || '-',
            model: d.model || '-',
            process: d.process || 1,
            from_machine: d.from_machine,
            to_machine: d.to_machine,
            reason: d.reason || (d.is_auto ? 'Auto-Balanced' : 'Manual Move'),
            is_auto: Number(d.is_auto) === 1,
            pcs_day: Number(d.pcs_day || 0),
            cycle_time_sec: Number(d.cycle_time_sec || 0)
          }));

          // Sync with localStorage
          try {
            localStorage.setItem(`${STORAGE_PREFIX}${simulationId}`, JSON.stringify(formatted));
          } catch (e) {}

          return formatted;
        }
      }
    } catch (err) {
      console.warn('Backend movement logs API unavailable, using local cache:', err);
    }
  }

  return getMovementLogs(simulationId, loadsData);
};

export const addMovementLogBatch = (
  items: Array<Omit<PartMovementLog, 'id' | 'timestamp'> & { timestamp?: string }>,
  simulationId?: number | string
) => {
  const key = `${STORAGE_PREFIX}${simulationId || 'session'}`;
  const logs = getMovementLogs(simulationId);
  const now = new Date().toLocaleString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const newEntries: PartMovementLog[] = items.map(item => ({
    ...item,
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: item.timestamp || now,
    simulation_id: simulationId
  }));

  const combined = [...newEntries, ...logs];
  try {
    localStorage.setItem(key, JSON.stringify(combined));
  } catch (err) {
    console.error('Failed to save batch movement logs to localStorage:', err);
  }

  // Push to backend database in background
  if (simulationId) {
    saveMovementLogBatchApi(simulationId, items).catch(err => {
      console.warn('Background save movement log to DB failed:', err);
    });
  }

  return combined;
};

export const clearMovementLogs = async (simulationId?: number | string) => {
  const key = `${STORAGE_PREFIX}${simulationId || 'session'}`;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Failed to clear movement logs from localStorage:', err);
  }

  if (simulationId) {
    try {
      await clearMovementLogsApi(simulationId);
    } catch (err) {
      console.warn('Failed to clear movement logs from DB:', err);
    }
  }
};

export const exportMovementLogsToExcel = async (
  logs: PartMovementLog[],
  title = 'Riwayat_Perpindahan_Part_GLC'
) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Movement History');

  // Title Row
  sheet.mergeCells('A1:H1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `LOG RIWAYAT PERPINDAHAN PART - GLC WELDING SIMULATION`;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0345A1' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 28;

  // Subtitle / Date
  sheet.mergeCells('A2:H2');
  const subCell = sheet.getCell('A2');
  subCell.value = `Tanggal Unduh: ${new Date().toLocaleString('id-ID')} | Total Item: ${logs.length}`;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(2).height = 20;

  // Header Row
  const headers = [
    'No',
    'Waktu Perpindahan',
    'Part Number',
    'Model',
    'Proses',
    'Rute Mesin (Asal → Tujuan)',
    'Tipe / Alasan Pemindahan',
    'User / Operator'
  ];

  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 24;

  headers.forEach((_, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 0 || idx === 4 ? 'center' : 'left' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Data Rows
  logs.forEach((log, index) => {
    const row = sheet.addRow([
      index + 1,
      log.timestamp,
      log.part_number,
      log.model || '-',
      log.process ? `Proses ${log.process}` : '1',
      `${log.from_machine} → ${log.to_machine}`,
      log.reason || (log.is_auto ? 'Auto-Balanced' : 'Manual'),
      log.user || 'SYSTEM'
    ]);
    row.height = 20;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 1 || colNumber === 5 ? 'center' : 'left'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
  });

  // Auto column width
  sheet.columns = [
    { width: 6 },
    { width: 22 },
    { width: 25 },
    { width: 14 },
    { width: 12 },
    { width: 24 },
    { width: 45 },
    { width: 20 }
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${title}_${Date.now()}.xlsx`);
};
