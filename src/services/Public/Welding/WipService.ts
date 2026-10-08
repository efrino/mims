import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type {
  StockFilter,
  TrxFilter,
  WipGeneratePayload,
} from '@/types/Public/Welding/Wip';

const BASE = (apiUrl: string) =>
  `http://${apiUrl}/majsf_rest_api/api/welding-wip`;

// ── Stock ────────────────────────────────────────────────────────

export const getWipStock = async (filters: StockFilter = {}) => {
  const { apiUrl } = useConfigStore();
  const params = new URLSearchParams();
  if (filters.area_code) params.set('area_code', filters.area_code);
  if (filters.part_number) params.set('part_number', filters.part_number);
  if (filters.job_number) params.set('job_number', filters.job_number);
  if (filters.source) params.set('source', filters.source);
  const res = await axios.get(`${BASE(apiUrl)}/stock?${params}`);
  return res.data;
};

export const getWipStockSummary = async () => {
  const { apiUrl } = useConfigStore();
  const res = await axios.get(`${BASE(apiUrl)}/stock/summary`);
  return res.data;
};

export const getWipStockAreas = async () => {
  const { apiUrl } = useConfigStore();
  const res = await axios.get(`${BASE(apiUrl)}/stock/areas`);
  return res.data;
};

// ── Transactions ─────────────────────────────────────────────────

export const getWipTrxList = async (filters: TrxFilter = {}) => {
  const { apiUrl } = useConfigStore();
  const params = new URLSearchParams();
  if (filters.area_code) params.set('area_code', filters.area_code);
  if (filters.trx_date) params.set('trx_date', filters.trx_date);
  if (filters.shift) params.set('shift', filters.shift);
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);  // ← tambah
  const res = await axios.get(`${BASE(apiUrl)}/trx?${params}`);
  return res.data;
};
export const deleteWipTrx = async (id: number) => {
  const { apiUrl } = useConfigStore();
  const res = await axios.delete(`${BASE(apiUrl)}/trx?id=${id}`);
  return res.data;
};
export const getWipTrxDetail = async (id: number) => {
  const { apiUrl } = useConfigStore();
  const res = await axios.get(`${BASE(apiUrl)}/trx?id=${id}`);
  return res.data;
};

export const generateWipReceipt = async (payload: WipGeneratePayload) => {
  const { apiUrl } = useConfigStore();
  const res = await axios.post(`${BASE(apiUrl)}/trx/generate`, payload);
  return res.data;
};

export const confirmWipReceipt = async (id: number) => {
  const { apiUrl } = useConfigStore();
  const res = await axios.put(`${BASE(apiUrl)}/trx/confirm?id=${id}`);
  return res.data;
};

// ── Sync ─────────────────────────────────────────────────────────

export const syncWipStock = async () => {
  const { apiUrl } = useConfigStore();
  const res = await axios.post(`${BASE(apiUrl)}/sync`);
  return res.data;
};
