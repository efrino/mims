import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { EmployeeEditForm } from '@/types/Finance/Master/Employee';

const getBaseUrl = () => {
  const configStore = useConfigStore();
  return `http://${configStore.apiUrl}/majsf_rest_api/api/finance/employees_ca`;
};

const FORM_HEADERS = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };

export const employeeService = {
  // ── Whitelist (ms_employees_ca) ──────────────────────────────────
  async fetchList(): Promise<response> {
    // active=all — tab Aktif/Nonaktif/Semua dipilah di sisi client dari field `active` per row
    const res = await axios.get(getBaseUrl(), { params: { active: 'all' } });
    return { status: res.status, data: res.data };
  },

  async fetchDetail(nik: string): Promise<response> {
    const res = await axios.get(`${getBaseUrl()}/${nik}`);
    return { status: res.status, data: res.data };
  },

  async fetchAvailable(): Promise<response> {
    const res = await axios.get(`${getBaseUrl()}/available`);
    return { status: res.status, data: res.data };
  },

  // POST wajib application/x-www-form-urlencoded, bukan JSON. kasbon_limit opsional — kosongkan untuk pakai default (3) di backend
  async create(nik: string, kasbonLimit?: number | null): Promise<response> {
    const body = new URLSearchParams({ nik });
    if (kasbonLimit !== null && kasbonLimit !== undefined) {
      body.append('kasbon_limit', String(kasbonLimit));
    }
    const res = await axios.post(getBaseUrl(), body, FORM_HEADERS);
    return { status: res.status, data: res.data };
  },

  async createBatch(niks: string[]): Promise<response> {
    const body = new URLSearchParams();
    niks.forEach((nik) => body.append('niks[]', nik));
    const res = await axios.post(getBaseUrl(), body, FORM_HEADERS);
    return { status: res.status, data: res.data };
  },

  // Update manual field whitelist — TIDAK menyertakan `active`, itu diubah lewat toggle() sendiri.
  // document_filename/document_base64 hanya disertakan kalau user memilih file baru — PHP tidak bisa
  // mengisi $_FILES untuk method PUT, jadi backend menerima file sebagai base64 string di body biasa,
  // bukan multipart/form-data.
  async update(nik: string, payload: EmployeeEditForm): Promise<response> {
    const body = new URLSearchParams({
      name: payload.name,
      gender: payload.gender,
      department: payload.department,
      division: payload.division,
      job_title: payload.job_title,
      emp_status: payload.emp_status,
      kasbon_limit: String(payload.kasbon_limit ?? ''),
    });
    if (payload.document_filename && payload.document_base64) {
      body.append('document_filename', payload.document_filename);
      body.append('document_base64', payload.document_base64);
    }
    const res = await axios.put(`${getBaseUrl()}/${nik}`, body, FORM_HEADERS);
    return { status: res.status, data: res.data };
  },

  // Re-sync semua field dari master (override manual edit)
  async syncFromMaster(nik: string): Promise<response> {
    const body = new URLSearchParams({ sync: 'true' });
    const res = await axios.put(`${getBaseUrl()}/${nik}`, body, FORM_HEADERS);
    return { status: res.status, data: res.data };
  },

  async toggle(nik: string): Promise<response> {
    const res = await axios.put(`${getBaseUrl()}/${nik}/toggle`);
    return { status: res.status, data: res.data };
  },

  async remove(nik: string): Promise<response> {
    const res = await axios.delete(`${getBaseUrl()}/${nik}`);
    return { status: res.status, data: res.data };
  },

  // ── Source (majsf_auth.employees) ────────────────────────────────
  async fetchSourceOptions(column: string): Promise<response> {
    const res = await axios.get(`${getBaseUrl()}/source/options`, { params: { column } });
    return { status: res.status, data: res.data };
  },

  // Balas JSON berisi signed URL sementara (valid 5 menit, divalidasi via HMAC di token, bukan
  // session/cookie) — bukan lagi stream file langsung. URL hasilnya yang dibuka di tab baru/iframe.
  async fetchDocumentUrl(nik: string): Promise<response> {
    const res = await axios.get(`${getBaseUrl()}/${nik}/document`);
    return { status: res.status, data: res.data };
  },
};
