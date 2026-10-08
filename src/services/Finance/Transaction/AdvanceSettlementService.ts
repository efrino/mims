import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { KasbonEditForm, SettlementForm, SettlementFilter } from '@/types/Finance/Transaction/AdvanceSettlement';

const getBaseUrl = () => {
  const configStore = useConfigStore();
  return `http://${configStore.apiUrl}/majsf_rest_api/api/finance/cash_advance`;
};

const FORM_HEADERS = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };

// Backend membalas HTTP 400 (bukan 200) untuk rejection yang divalidasi (limit tercapai, field tidak
// sesuai status, transisi status invalid, dll), tapi body-nya tetap envelope {status:false, message}
// yang human-readable — validateStatus di sini supaya axios TIDAK throw untuk 400 dan body itu tetap
// sampai ke caller apa adanya, bukan jatuh ke catch generik yang kehilangan pesannya.
const ACCEPT_4XX = { validateStatus: (status: number) => status < 500 };

export const advanceSettlementService = {
  async fetchAll(filter: SettlementFilter, active: '1' | '0'): Promise<response> {
    // active=1 → kasbon aktif (tab Open/Approved/Closed), active=0 → kasbon dibatalkan (tab Dibatalkan)
    const params: Record<string, any> = { active };
    // outstanding_all=1: Open/Approved aktif selalu ikut tanpa filter tanggal — date_from/date_to hanya
    // menyaring Closed. Data dibatalkan (active=0) selalu terfilter tanggal, jadi tidak perlu dikirim.
    if (active === '1') params.outstanding_all = 1;
    if (filter.date_from) params.date_from = filter.date_from;
    if (filter.date_to)   params.date_to   = filter.date_to;

    const res = await axios.get(getBaseUrl(), { params });
    return { status: res.status, data: res.data };
  },

  // Hanya berlaku saat status Open — field pengajuan
  async updateKasbon(id: number, payload: KasbonEditForm, updatedBy: string): Promise<response> {
    const body = new URLSearchParams({
      kasbon_date: payload.kasbon_date,
      employee_nik: payload.employee_nik,
      category_id: String(payload.category_id ?? ''),
      description: payload.description,
      amount: String(payload.amount ?? ''),
      usage_date: payload.usage_date,
      updated_by: updatedBy,
    });
    const res = await axios.put(`${getBaseUrl()}/${id}`, body, { ...FORM_HEADERS, ...ACCEPT_4XX });
    return { status: res.status, data: res.data };
  },

  // Hanya berlaku saat status Approved — field settlement. bkk_date (dulu closing_date) diinput user,
  // format YYYY-MM-DD; hanya dikirim kalau diisi supaya string kosong tidak ditolak validasi format.
  async updateSettlement(id: number, payload: SettlementForm, updatedBy: string): Promise<response> {
    const body = new URLSearchParams({
      report_note: payload.report_note,
      bkk_no: payload.bkk_no,
      realization_amount: String(payload.realization_amount ?? ''),
      cash_received: String(payload.cash_received ?? ''),
      updated_by: updatedBy,
    });
    if (payload.bkk_date) body.append('bkk_date', payload.bkk_date);
    const res = await axios.put(`${getBaseUrl()}/${id}`, body, { ...FORM_HEADERS, ...ACCEPT_4XX });
    return { status: res.status, data: res.data };
  },

  // Open → Approved
  // Field pengajuan opsional — dikirim bersamaan supaya edit + approve jadi satu request atomik
  // (kalau gagal validasi, kasbon tetap Open dan tidak ada yang tersimpan)
  async approve(id: number, approvedBy: string, payload?: KasbonEditForm): Promise<response> {
    const body = new URLSearchParams({ approved_by: approvedBy });
    if (payload) {
      body.append('employee_nik', payload.employee_nik);
      body.append('category_id', String(payload.category_id ?? ''));
      body.append('kasbon_date', payload.kasbon_date);
      body.append('usage_date', payload.usage_date);
      body.append('amount', String(payload.amount ?? ''));
      body.append('description', payload.description);
    }
    const res = await axios.put(`${getBaseUrl()}/${id}/approve`, body, { ...FORM_HEADERS, ...ACCEPT_4XX });
    return { status: res.status, data: res.data };
  },

  async close(id: number): Promise<response> {
    const res = await axios.patch(`${getBaseUrl()}/${id}/close`, undefined, ACCEPT_4XX);
    return { status: res.status, data: res.data };
  },

  async cancel(id: number, cancelledBy: string): Promise<response> {
    const res = await axios.delete(`${getBaseUrl()}/${id}`, { params: { cancelled_by: cancelledBy }, ...ACCEPT_4XX });
    return { status: res.status, data: res.data };
  },

  async restore(bkkNo: string, restoredBy: string): Promise<response> {
    const body = new URLSearchParams({ bkk_no: bkkNo, restored_by: restoredBy });
    const res = await axios.post(`${getBaseUrl()}/restore`, body, { ...FORM_HEADERS, ...ACCEPT_4XX });
    return { status: res.status, data: res.data };
  },

  async fetchEmployees(): Promise<response> {
    // Hanya karyawan whitelist (active=1 default) yang boleh dipilih untuk PIC/NIK kasbon
    const configStore = useConfigStore();
    const res = await axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/finance/employees_ca`);
    return { status: res.status, data: res.data };
  },

  async fetchCategories(): Promise<response> {
    const configStore = useConfigStore();
    const res = await axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/finance/category`);
    return { status: res.status, data: res.data };
  },
};
