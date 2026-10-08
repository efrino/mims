import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type {
  SupplyLogItem,
  SupplyMaterialItem
} from "@/types/Logistik/IRM/Transaction/SupplyMaterial";
import { formatLineName, formatTanggal, formatJam } from "@/stores/Logistik/IRM/Transaction/SupplyMaterial";

export interface SupplyExportRow {
  item: SupplyMaterialItem;
  logs: SupplyLogItem[];
}

export interface SupplyExportMeta {
  start: string;
  end: string;
  line: string;
}

// ── Warna (samakan dengan tampilan tabel di layar) ───────────────────────────
const C = {
  mainDark:  "1D4ED8",
  mainLight: "DBEAFE",
  logDark:   "6D28D9",
  logLight:  "EDE9FE",
  title:     "1E3A8A",
  border:    "CBD5E1",
  zebra:     "F8FAFC",
  label:     "F1F5F9",
  white:     "FFFFFF",
  text:      "1F2937",
  muted:     "6B7280",
  red:       "DC2626",
  redFill:   "FEE2E2",
  orange:    "EA580C",
  green:     "16A34A",
  blue:      "2563EB",
  emerald:   "047857",
  violet:    "7C3AED"
};

const argb = (hex: string) => "FF" + hex;

const fill = (hex: string): ExcelJS.Fill => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: argb(hex) }
});

const border = (hex = C.border): Partial<ExcelJS.Borders> => {
  const side = { style: "thin" as const, color: { argb: argb(hex) } };
  return { top: side, left: side, bottom: side, right: side };
};

const font = (color: string, bold = false, extra: Partial<ExcelJS.Font> = {}): Partial<ExcelJS.Font> => ({
  name: "Calibri",
  size: 10,
  bold,
  color: { argb: argb(color) },
  ...extra
});

// ── Label ────────────────────────────────────────────────────────────────────
const ACTION_LABEL: Record<string, string> = {
  adjust:    "Update qty",
  tp:        "Transfer Posting",
  cancel_tp: "Batal TP",
  deleted:   "Dihapus dari SAP",
  restored:  "Muncul Kembali di SAP",
  sap_sync:  "Update qty"
};

const actionLabel = (action: string) => ACTION_LABEL[action] ?? "Update qty";

const isQtyChange = (log: SupplyLogItem) => log.action === "adjust" || log.action === "sap_sync";

// Status supply - aturannya sama dengan pewarnaan kolom Qty Supply di layar.
const supplyStatus = (item: SupplyMaterialItem): { text: string; color: string } => {
  if (item.qty_supply === 0) return { text: "Belum Supply", color: C.red };
  if (item.qty_supply < item.qty_request) return { text: "Kurang", color: C.orange };
  if (item.qty_supply === item.qty_request) return { text: "Sesuai", color: C.green };
  return { text: "Lebih", color: C.blue };
};

// Qty IFRM kritis kalau stok habis atau tidak cukup menutup sisa permintaan
const stockCritical = (item: SupplyMaterialItem) =>
  item.stock_irm === 0 || item.qty_request - item.qty_supply > item.stock_irm;

const dash = (value: string | null | undefined) =>
  value !== null && value !== undefined && String(value).trim() !== "" ? String(value) : "-";

// 'YYYY-MM-DD HH:MM:SS' -> 'DD/MM/YY HH:MM'
const formatWaktu = (value: string) => {
  if (!value) return "-";
  const jam = formatJam(value);
  return jam === "-" ? formatTanggal(value) : `${formatTanggal(value)} ${jam}`;
};

// ── Definisi kolom ───────────────────────────────────────────────────────────
type Align = "left" | "center";

interface ColumnDef {
  header: string;
  width: number;
  align: Align;
  keterangan: string;
}

const MAIN_COLUMNS: ColumnDef[] = [
  { header: "No", width: 6, align: "center", keterangan: "Nomor urut item pada tabel yang diekspor." },
  { header: "No Reservasi", width: 15, align: "center", keterangan: "Nomor reservasi dari SAP (RSNUM)." },
  { header: "Item", width: 8, align: "center", keterangan: "Nomor item di dalam reservasi (RSPOS)." },
  { header: "Line", width: 18, align: "left", keterangan: "Line tujuan supply, hasil normalisasi PRVBE dari SAP." },
  { header: "Job No", width: 16, align: "left", keterangan: "Nomor job / order produksi." },
  { header: "Part No", width: 26, align: "left", keterangan: "Nomor part material yang diminta." },
  { header: "Storage Location", width: 16, align: "center", keterangan: "Storage location material di SAP (LGORT)." },
  { header: "Batch", width: 16, align: "center", keterangan: "Nomor batch material di SAP (CHARG)." },
  { header: "Tanggal", width: 11, align: "center", keterangan: "Tanggal kebutuhan material dari SAP (BDTER)." },
  { header: "Jam", width: 8, align: "center", keterangan: "Jam data pertama kali masuk ke sistem." },
  { header: "Qty IFRM", width: 10, align: "center", keterangan: "Stok tersedia di IFRM. Tersorot merah bila stok habis atau tidak cukup menutup sisa permintaan." },
  { header: "Qty Request", width: 12, align: "center", keterangan: "Jumlah material yang diminta produksi." },
  { header: "Qty Supply", width: 12, align: "center", keterangan: "Jumlah material yang sudah disupply." },
  { header: "Selisih", width: 10, align: "center", keterangan: "Qty Supply dikurangi Qty Request. Nilai negatif berarti masih kurang." },
  { header: "Status Supply", width: 14, align: "center", keterangan: "Belum Supply / Kurang / Sesuai / Lebih." },
  { header: "Status Item", width: 18, align: "center", keterangan: "Aktif, atau Dihapus dari SAP bila item sudah tidak dikirim lagi oleh SAP." },
  { header: "Item Pemanfaatan", width: 28, align: "left", keterangan: "Terisi bila item ini merupakan item pemanfaatan atas item lain pada reservasi yang sama." },
  { header: "No Material Document", width: 20, align: "center", keterangan: "Nomor material document hasil Transfer Posting (EV_MBLNR)." },
  { header: "Posting Date", width: 13, align: "center", keterangan: "Tanggal posting yang dipakai saat Transfer Posting." },
  { header: "TP Oleh", width: 16, align: "left", keterangan: "User yang melakukan Transfer Posting." },
  { header: "TP Pada", width: 16, align: "center", keterangan: "Waktu Transfer Posting dilakukan." },
  { header: "Pesan Problem", width: 32, align: "left", keterangan: "Pesan problem yang dikirim ke SAP saat qty supply tidak sama dengan qty request." }
];

const LOG_COLUMNS: ColumnDef[] = [
  { header: "Waktu", width: 16, align: "center", keterangan: "Waktu perubahan tercatat." },
  { header: "Aksi", width: 20, align: "left", keterangan: "Jenis perubahan: Update qty, Transfer Posting, Batal TP, Dihapus dari SAP, Muncul Kembali di SAP. Kolom User membedakan perubahan dari MIMS dan dari SAP." },
  { header: "Tambah (+)", width: 11, align: "center", keterangan: "Jumlah yang ditambahkan pada perubahan tersebut." },
  { header: "Kurang (-)", width: 11, align: "center", keterangan: "Jumlah yang dikurangi pada perubahan tersebut." },
  { header: "Perubahan", width: 11, align: "center", keterangan: "Selisih bersih qty supply (tambah dikurangi kurang)." },
  { header: "Sebelum", width: 10, align: "center", keterangan: "Qty supply sebelum perubahan." },
  { header: "Sesudah", width: 10, align: "center", keterangan: "Qty supply setelah perubahan." },
  { header: "User", width: 16, align: "left", keterangan: "User yang melakukan perubahan." },
  { header: "Keterangan", width: 40, align: "left", keterangan: "Catatan tambahan pada perubahan tersebut." }
];

const MAIN_COUNT = MAIN_COLUMNS.length;
const TOTAL_COUNT = MAIN_COUNT + LOG_COLUMNS.length;

// Baris tetap di bagian atas sheet
const ROW_TITLE = 1;
const ROW_SUBTITLE = 2;
const ROW_INFO = 4; // 4..5 blok informasi (dua pasang label:value)
const ROW_NOTE = 6; // baris catatan selebar blok informasi
const ROW_GROUP = 8; // baris grup kolom
const ROW_HEADER = 9; // baris nama kolom
const ROW_FIRST_DATA = 10;

const TITLE_LAST_COL = 18; // kolom R

const HEAD_LAST_COL = 13;

const LABEL_SPAN = 2; // A:B  dan  G:H
const LEFT_LABEL_COL = 1;
const RIGHT_LABEL_COL = 7;

// ── Kepala laporan ───────────────────────────────────────────────────────────
function writeTitle(ws: ExcelJS.Worksheet, meta: SupplyExportMeta, totalItem: number, totalLog: number) {
  ws.mergeCells(ROW_TITLE, 1, ROW_TITLE, TITLE_LAST_COL);
  const title = ws.getCell(ROW_TITLE, 1);
  title.value = "LAPORAN SUPPLY MATERIAL";
  title.font = font(C.title, true, { size: 16 });
  title.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(ROW_TITLE).height = 26;

  ws.mergeCells(ROW_SUBTITLE, 1, ROW_SUBTITLE, TITLE_LAST_COL);
  const subtitle = ws.getCell(ROW_SUBTITLE, 1);
  subtitle.value = "Logistik  •  IRM  •  Transaction";
  subtitle.font = font(C.muted, false, { italic: true });
  subtitle.alignment = { horizontal: "center", vertical: "middle" };

  const periode =
    meta.start && meta.end ? `${formatTanggal(meta.start)} s/d ${formatTanggal(meta.end)}`
    : meta.start ? `Mulai ${formatTanggal(meta.start)}`
    : meta.end ? `Sampai ${formatTanggal(meta.end)}`
    : "Semua tanggal";

  const diunduh = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  // Label dan value sama-sama di-merge;
  const writePair = (row: number, labelCol: number, lastCol: number, label: string, value: string) => {
    ws.mergeCells(row, labelCol, row, labelCol + LABEL_SPAN - 1);
    const labelCell = ws.getCell(row, labelCol);
    labelCell.value = label;
    labelCell.font = font(C.text, true);
    labelCell.fill = fill(C.label);
    labelCell.border = border();
    labelCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };

    const valueCol = labelCol + LABEL_SPAN;
    ws.mergeCells(row, valueCol, row, lastCol);
    const valueCell = ws.getCell(row, valueCol);
    valueCell.value = value;
    valueCell.font = font(C.text);
    valueCell.border = border();
    valueCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  };

  // Dua pasang label:value per baris supaya kepala laporan tetap ringkas.
  const pairs: [string, string, string, string][] = [
    ["Periode", periode, "Diunduh", diunduh],
    ["Line", meta.line || "All", "Jumlah Data", `${totalItem} item • ${totalLog} perubahan`]
  ];

  pairs.forEach(([leftLabel, leftValue, rightLabel, rightValue], i) => {
    const row = ROW_INFO + i;
    writePair(row, LEFT_LABEL_COL, RIGHT_LABEL_COL - 1, leftLabel, leftValue);
    writePair(row, RIGHT_LABEL_COL, HEAD_LAST_COL, rightLabel, rightValue);
    ws.getRow(row).height = 17;
  });

  writePair(
    ROW_NOTE,
    LEFT_LABEL_COL,
    HEAD_LAST_COL,
    "Catatan",
    "Isi file sama dengan tabel yang sedang tampil di menu Supply Material"
  );
  ws.getRow(ROW_NOTE).height = 17;
}

// ── Header tabel ─────────────────────────────────────────────────────────────
function writeHeader(ws: ExcelJS.Worksheet) {
  const group = (from: number, to: number, text: string, color: string) => {
    ws.mergeCells(ROW_GROUP, from, ROW_GROUP, to);
    const cell = ws.getCell(ROW_GROUP, from);
    cell.value = text;
    cell.fill = fill(color);
    cell.font = font(C.white, true, { size: 11 });
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = border(color);
  };

  group(1, MAIN_COUNT, "DATA ITEM SUPPLY MATERIAL", C.mainDark);
  group(MAIN_COUNT + 1, TOTAL_COUNT, "RIWAYAT PERUBAHAN QTY SUPPLY", C.logDark);
  ws.getRow(ROW_GROUP).height = 22;

  [...MAIN_COLUMNS, ...LOG_COLUMNS].forEach((col, i) => {
    const isLog = i >= MAIN_COUNT;
    const cell = ws.getCell(ROW_HEADER, i + 1);
    cell.value = col.header;
    cell.fill = fill(isLog ? C.logLight : C.mainLight);
    cell.font = font(isLog ? C.logDark : C.mainDark, true);
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = border();
    ws.getColumn(i + 1).width = col.width;
  });

  ws.getRow(ROW_HEADER).height = 30;
}

// ── Isi tabel ────────────────────────────────────────────────────────────────
function writeBody(ws: ExcelJS.Worksheet, rows: SupplyExportRow[]): number {
  let cursor = ROW_FIRST_DATA;

  rows.forEach((entry, index) => {
    const { item, logs } = entry;
    const span = Math.max(1, logs.length);
    const top = cursor;
    const bottom = cursor + span - 1;
    const zebra = index % 2 === 1;
    const status = supplyStatus(item);
    const deleted = item.is_deleted === 1;

    const pemanfaatan = item.util_for_no_item
      ? `Atas item ${item.util_for_no_item}${item.util_for_part_no ? " — " + item.util_for_part_no : ""}`
      : "-";

    const values: (string | number)[] = [
      index + 1,
      item.no_reservasi,
      item.no_item,
      formatLineName(item.line),
      dash(item.job_no),
      item.part_no,
      dash(item.lgort),
      dash(item.charg),
      formatTanggal(item.req_date ?? item.created_at),
      formatJam(item.created_at),
      item.stock_irm,
      item.qty_request,
      item.qty_supply,
      item.qty_supply - item.qty_request,
      status.text,
      deleted ? "Dihapus dari SAP" : "Aktif",
      pemanfaatan,
      dash(item.mat_doc),
      item.posting_date ? formatTanggal(item.posting_date) : "-",
      dash(item.tp_by),
      item.tp_at ? formatWaktu(item.tp_at) : "-",
      dash(item.tp_problem)
    ];

    values.forEach((value, i) => {
      const col = i + 1;
      if (span > 1) ws.mergeCells(top, col, bottom, col);

      const def = MAIN_COLUMNS[i];
      const cell = ws.getCell(top, col);
      cell.value = value;
      cell.alignment = {
        horizontal: def.align,
        vertical: "middle",
        wrapText: def.align === "left",
        indent: def.align === "left" ? 1 : 0
      };
      cell.font = font(C.text);
      if (zebra) cell.fill = fill(C.zebra);
      cell.border = border();
    });

    // Penegasan warna, mengikuti tabel di layar.
    const at = (col: number) => ws.getCell(top, col);

    if (deleted) {
      at(6).font = font(C.muted, false, { strike: true });
      at(14).font = font(C.red, true);
    }
    if (stockCritical(item)) {
      at(9).fill = fill(C.redFill);
      at(9).font = font(C.red, true);
    }
    at(11).font = font(status.color, true);
    at(13).font = font(status.color, true);
    if (item.util_for_no_item) at(15).font = font(C.violet);
    if (item.mat_doc) at(16).font = font(C.emerald, true);

    // Kolom riwayat: satu baris Excel per perubahan.
    for (let i = 0; i < span; i++) {
      const rowNumber = top + i;
      const log = logs[i];

      const logValues: (string | number)[] = log
        ? [
            formatWaktu(log.created_at),
            actionLabel(log.action),
            isQtyChange(log) ? log.qty_plus : "-",
            isQtyChange(log) ? log.qty_minus : "-",
            isQtyChange(log) ? (log.qty_change >= 0 ? `+${log.qty_change}` : String(log.qty_change)) : "-",
            log.qty_before,
            log.qty_after,
            dash(log.created_by),
            dash(log.note)
          ]
        : ["-", "Belum ada perubahan", "-", "-", "-", "-", "-", "-", "-"];

      logValues.forEach((value, k) => {
        const def = LOG_COLUMNS[k];
        const cell = ws.getCell(rowNumber, MAIN_COUNT + k + 1);
        cell.value = value;
        cell.alignment = {
          horizontal: def.align,
          vertical: "middle",
          wrapText: def.align === "left",
          indent: def.align === "left" ? 1 : 0
        };
        cell.font = font(log ? C.text : C.muted, false, log ? {} : { italic: true });
        if (zebra) cell.fill = fill(C.zebra);
        cell.border = border();
      });

      if (log) {
        const actionCell = ws.getCell(rowNumber, MAIN_COUNT + 2);
        if (log.action === "deleted") actionCell.font = font(C.red, true);
        else if (log.action === "restored") actionCell.font = font(C.green, true);
        else if (log.action === "tp" || log.action === "cancel_tp") actionCell.font = font(C.blue, true);

        if (isQtyChange(log)) {
          ws.getCell(rowNumber, MAIN_COUNT + 5).font = font(log.qty_change >= 0 ? C.green : C.red, true);
        }
      }

      ws.getRow(rowNumber).height = 16;
    }

    cursor = bottom + 1;
  });

  return cursor - 1;
}

// ── Sheet keterangan ─────────────────────────────────────────────────────────
function writeKeteranganSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("Keterangan");
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 26;
  ws.getColumn(3).width = 90;

  ws.mergeCells(1, 1, 1, 3);
  const title = ws.getCell(1, 1);
  title.value = "KETERANGAN KOLOM";
  title.font = font(C.title, true, { size: 14 });
  title.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 24;

  let row = 3;

  const section = (text: string, color: string) => {
    ws.mergeCells(row, 1, row, 3);
    const cell = ws.getCell(row, 1);
    cell.value = text;
    cell.fill = fill(color);
    cell.font = font(C.white, true, { size: 11 });
    cell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    cell.border = border(color);
    ws.getRow(row).height = 20;
    row++;
  };

  const line = (no: string, label: string, description: string) => {
    ([
      [1, no, "center" as Align],
      [2, label, "left" as Align],
      [3, description, "left" as Align]
    ] as [number, string, Align][]).forEach(([col, value, align]) => {
      const cell = ws.getCell(row, col);
      cell.value = value;
      cell.font = font(C.text, col === 2);
      cell.alignment = {
        horizontal: align,
        vertical: "middle",
        wrapText: col === 3,
        indent: align === "left" ? 1 : 0
      };
      cell.border = border();
    });
    row++;
  };

  section("DATA ITEM SUPPLY MATERIAL", C.mainDark);
  MAIN_COLUMNS.forEach((col, i) => line(String(i + 1), col.header, col.keterangan));

  row++;
  section("RIWAYAT PERUBAHAN QTY SUPPLY", C.logDark);
  LOG_COLUMNS.forEach((col, i) => line(String(MAIN_COUNT + i + 1), col.header, col.keterangan));

  row++;
  section("CATATAN", C.title);
  ([
    ["Merge", "Satu item yang punya dua perubahan atau lebih ditulis dalam beberapa baris; kolom data utamanya di-merge menjadi satu."],
    ["Tanpa Riwayat", "Item yang belum pernah berubah tetap muncul satu baris, kolom riwayatnya diisi “Belum ada perubahan”."],
    ["Warna Qty Supply", "Merah = belum supply, oranye = kurang dari request, hijau = sesuai request, biru = melebihi request."],
    ["Sorotan Qty IFRM", "Latar merah berarti stok IFRM habis atau tidak cukup menutup sisa permintaan."],
    ["Item Dihapus", "Part No dicoret bila item sudah tidak dikirim lagi oleh SAP; item tersebut terkunci dari edit dan TP."]
  ] as [string, string][]).forEach(([label, description]) => line("", label, description));
}

// ── Entry point ──────────────────────────────────────────────────────────────
export async function downloadSupplyMaterialExcel(rows: SupplyExportRow[], meta: SupplyExportMeta) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MIMS";
  wb.created = new Date();

  const ws = wb.addWorksheet("Supply Material", {
    // Kolom kunci (No, No Reservasi, Item) dan header ikut terkunci saat di-scroll.
    views: [{ state: "frozen", xSplit: 3, ySplit: ROW_HEADER }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  const totalLog = rows.reduce((sum, entry) => sum + entry.logs.length, 0);

  writeTitle(ws, meta, rows.length, totalLog);
  writeHeader(ws);
  writeBody(ws, rows);

  ws.pageSetup.printTitlesRow = `${ROW_GROUP}:${ROW_HEADER}`;

  writeKeteranganSheet(wb);

  const stamp = [meta.start, meta.end].filter(Boolean).join("_") || new Date().toISOString().slice(0, 10);
  const buffer = await wb.xlsx.writeBuffer();

  saveAs(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `Supply_Material_${stamp}.xlsx`
  );
}
