import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { FilterParams } from '@/types/Welding/Transaction/Achievement_v2';

const BASE = (apiUrl: string) => `http://${apiUrl}/majsf_rest_api/api/welding-achievement-v2`;

// ─── 1. DISPLAY & ACHIEVEMENT ──────────────────────────────────────────

export const getDisplay = async (params: FilterParams): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.get(`${BASE(apiUrl)}/display`, { params });
};

export const getDataAch = async (params: FilterParams): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.get(`${BASE(apiUrl)}/achievement`, { params });
};

export const saveData = async (params: FormData | URLSearchParams | any): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.post(`${BASE(apiUrl)}/achievement`, params, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updatePlanLotsize = async (payload: {
  id?: string | number | null;
  schedule_id?: string | number | null;
  part_number: string;
  date: string;
  shift: number;
  area: string;
  lotsize: number | null;
}): Promise<response> => {
  const { apiUrl } = useConfigStore();
  const fd = new FormData();
  if (payload.id)          fd.append('id',          String(payload.id));
  if (payload.schedule_id) fd.append('schedule_id', String(payload.schedule_id));
  fd.append('part_number', payload.part_number);
  fd.append('date',        payload.date);
  fd.append('shift',       String(payload.shift));
  fd.append('area',        payload.area);
  fd.append('lotsize',     payload.lotsize !== null ? String(payload.lotsize) : '');
  return axios.post(`${BASE(apiUrl)}/update_plan_lotsize`, fd);
};

export const refreshData = async (params: FilterParams): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.get(`${BASE(apiUrl)}/display_refresh`, { params });
};

export const removeData = async (schedule_id: string | number): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.delete(`${BASE(apiUrl)}/data`, {
    data: { schedule_id },
    headers: { 'Content-Type': 'application/json' },
  });
};

// ─── 2. FORM LOCKING (OPEN / CLOSE / CHECK) ───────────────────────────

// Lock form = 1 per (area, date, shift). Backend menolak open bila dipegang user lain.
export interface LockKey { area: string; date: string; shift: string | number }

const lockBody = (k: LockKey, extra: Record<string, string> = {}) => {
  const data = new URLSearchParams();
  data.append('area', k.area);
  data.append('date', k.date);
  data.append('shift', String(k.shift));
  Object.entries(extra).forEach(([a, b]) => data.append(a, b));
  return data;
};
const FORM = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };

export const checkUser = async (k: LockKey): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.get(`${BASE(apiUrl)}/check`, { params: { area: k.area, date: k.date, shift: k.shift } });
};

export const getLocks = async (date: string, shift: string | number): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.get(`${BASE(apiUrl)}/locks`, { params: { date, shift } });
};

export const openFormEdit = async (k: LockKey, force = false): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.put(`${BASE(apiUrl)}/open`, lockBody(k, { force: force ? '1' : '0' }), FORM);
};

// Presence modal View (banyak orang). action 'ping' tiap ±20 dtk, 'leave' saat tutup.
export const pingViewer = async (clientId: string, k: LockKey, action: 'ping' | 'leave' = 'ping'): Promise<response> => {
  const { apiUrl } = useConfigStore();
  const body = new URLSearchParams({ client_id: clientId, area: k.area, date: k.date, shift: String(k.shift), action });
  return axios.post(`${BASE(apiUrl)}/viewer`, body, FORM);
};

export const heartbeatFormEdit = async (k: LockKey): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.put(`${BASE(apiUrl)}/heartbeat`, lockBody(k), FORM);
};

export const closeFormEdit = async (k: LockKey): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.put(`${BASE(apiUrl)}/close`, lockBody(k), FORM);
};

/** Dipanggil saat tab ditutup (beforeunload) — sendBeacon tidak bisa bawa header auth,
 *  jadi username ikut di body. Backend memakai heartbeat-timeout sebagai jaring pengaman. */
export const closeFormEditBeacon = (k: LockKey, user: string) => {
  const { apiUrl } = useConfigStore();
  try {
    navigator.sendBeacon(`${BASE(apiUrl)}/close`, lockBody(k, { user }));
  } catch (e) { /* abaikan */ }
};

export const closeRefreshArea = async (date: string, shift: string | number, area: string): Promise<response> => {
  const { apiUrl } = useConfigStore();
  const data = new URLSearchParams();
  data.append('date', date);
  data.append('shift', String(shift));
  data.append('area', area); // PHP also accepts line_id
  return axios.put(`${BASE(apiUrl)}/close_refresh`, data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
};

// ─── 3. PROCESS CONTROL (START / STOP / NEXT / MOVE) ──────────────────

export const startRunning = async (schedule_id: string | number): Promise<response> => {
  const { apiUrl } = useConfigStore();
  const data = new URLSearchParams();
  data.append('schedule_id', String(schedule_id));
  return axios.put(`${BASE(apiUrl)}/start_running`, data);
};

export const stopRunning = async (schedule_id: string | number): Promise<response> => {
  const { apiUrl } = useConfigStore();
  const data = new URLSearchParams();
  data.append('schedule_id', String(schedule_id));
  return axios.put(`${BASE(apiUrl)}/stop_running`, data);
};

export const startProcess = async (schedule_id: string | number): Promise<response> => {
  const { apiUrl } = useConfigStore();
  const data = new URLSearchParams();
  data.append('schedule_id', String(schedule_id));
  return axios.put(`${BASE(apiUrl)}/start_process`, data);
};

export const stopProcess = async (schedule_id: string | number): Promise<response> => {
  const { apiUrl } = useConfigStore();
  const data = new URLSearchParams();
  data.append('schedule_id', String(schedule_id));
  return axios.put(`${BASE(apiUrl)}/stop_process`, data);
};

export const moveUrut = async (schedule_id: string | number, direction: 'up' | 'down'): Promise<response> => {
  const { apiUrl } = useConfigStore();
  const data = new URLSearchParams();
  data.append('schedule_id', String(schedule_id));
  data.append('move', direction);
  return axios.put(`${BASE(apiUrl)}/move`, data);
};

export const syncUrut = async (date: string): Promise<response> => {
  const { apiUrl } = useConfigStore();
  const data = new URLSearchParams();
  data.append('date', date);
  return axios.post(`${BASE(apiUrl)}/sync_urut`, data);
};

// ─── 4. MASTER DATA (PARTS, KETERANGAN) ───────────────────────────────

export const getPart = async (): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.get(`http://${apiUrl}/majsf_rest_api/api/master/Welding/part?tipe=part`);
};

export const getKetPlan = async (): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.get(`http://${apiUrl}/majsf_rest_api/api/master/Welding/plan?tipe=plan`);
};

export const getKetActual = async (): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.get(`http://${apiUrl}/majsf_rest_api/api/master/Welding/actual?tipe=actual`);
};

// Lookup master (machine/uph/stroke/op) + plan LKH untuk smart-form Add Row.
export const lookupPartMaster = async (
  part: string, area: string, date: string, shift: string | number
): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.get(`${BASE(apiUrl)}/part_master`, { params: { part, area, date, shift } });
};

// Kandidat part utk modal Tambah Planning Manual — tampilan mutasi di dalam achievement.
export const listPartCandidates = async (
  area: string, date: string, shift: string | number
): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.get(`${BASE(apiUrl)}/part_candidates`, { params: { area, date, shift } });
};

// ─── 5. EXCEL & REPORTS ───────────────────────────────────────────────

export const downloadTemplate = async (): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.get(`${BASE(apiUrl)}/download_template_excel`, { responseType: 'blob' });
};

export const importExcel = async (file: File): Promise<response> => {
  const { apiUrl } = useConfigStore();
  const data = new FormData();
  data.append('file', file);
  return axios.post(`${BASE(apiUrl)}/import_template_excel`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getReport = async (start: string, end: string): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.get(`${BASE(apiUrl)}/report`, { params: { start, end } });
};

export const postReport = async (start: string, end: string): Promise<response> => {
  const { apiUrl } = useConfigStore();
  const data = new URLSearchParams();
  data.append('start', start);
  data.append('end', end);
  return axios.post(`${BASE(apiUrl)}/report`, data);
};

// ─── 6. SYNC SAP & MONITOR MACHINE ────────────────────────────────────

export const getAchievementSap = async (date: string, shift: string | number): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.get(`${BASE(apiUrl)}/achievement_sap`, { params: { date, shift } });
};

export const getMonitorMachine = async (): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.get(`${BASE(apiUrl)}/achiev_machine_prod`);
};

export const syncSap = async (period?: string): Promise<response> => {
  const { apiUrl } = useConfigStore();
  return axios.get(`${BASE(apiUrl)}/sync_sap`, { params: { period } });
};