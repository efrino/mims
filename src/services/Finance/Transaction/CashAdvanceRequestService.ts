import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { CashAdvanceRequestForm, CashAdvanceRequestFilter } from '@/types/Finance/Transaction/CashAdvanceRequest';

const getBaseUrl = () => {
  const configStore = useConfigStore();
  return `http://${configStore.apiUrl}/majsf_rest_api/api/finance/cash_advance`;
};

const FORM_HEADERS = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };

export const cashAdvanceRequestService = {
  async fetchAll(filter: CashAdvanceRequestFilter): Promise<response> {
    const params: Record<string, any> = {
      created_by: filter.created_by,   // selalu dikirim — API memfilter per user login
      // Open/Approved milik PIC ini selalu ikut tanpa filter tanggal; date_from/date_to hanya
      // menyaring Closed (sama seperti menu Advance Settlement). created_by tetap membatasi ke
      // kasbon yang diajukan PIC ini saja.
      outstanding_all: 1,
    };
    if (filter.date_from)    params.date_from    = filter.date_from;
    if (filter.date_to)      params.date_to      = filter.date_to;
    if (filter.status)       params.status       = filter.status;
    if (filter.employee_nik) params.employee_nik = filter.employee_nik;
    if (filter.category_id)  params.category_id  = filter.category_id;

    const res = await axios.get(getBaseUrl(), { params });
    return { status: res.status, data: res.data };
  },

  async fetchEmployees(): Promise<response> {
    // Hanya karyawan whitelist (active=1 default) yang boleh dipilih untuk pengajuan kasbon
    const configStore = useConfigStore();
    const res = await axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/finance/employees_ca`);
    return { status: res.status, data: res.data };
  },

  // Semua kasbon aktif yang belum Closed (Open + Approved) dari SEMUA pengaju — dipakai untuk menghitung
  // jumlah kasbon outstanding per NIK terhadap kasbon_limit. Sengaja tanpa created_by: limit dihitung
  // per karyawan penerima, siapa pun yang mengajukan. outstanding_all=1 membuat Open/Approved tidak
  // terfilter tanggal; rentang tanggal dipersempit ke hari ini supaya data Closed yang ikut minimal.
  async fetchOutstanding(today: string): Promise<response> {
    const params = { active: '1', outstanding_all: 1, date_from: today, date_to: today };
    const res = await axios.get(getBaseUrl(), { params });
    return { status: res.status, data: res.data };
  },

  async fetchCategories(): Promise<response> {
    const configStore = useConfigStore();
    const res = await axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/finance/category`);
    return { status: res.status, data: res.data };
  },

  // POST wajib application/x-www-form-urlencoded, bukan JSON
  async create(payload: CashAdvanceRequestForm): Promise<response> {
    const body = new URLSearchParams({
      kasbon_date: payload.kasbon_date,
      employee_nik: payload.employee_nik,
      category_id: String(payload.category_id ?? ''),
      created_by: payload.created_by ?? '',
      description: payload.description,
      amount: String(payload.amount ?? ''),
      usage_date: payload.usage_date,
    });
    // Backend membalas HTTP 400 (bukan 200) saat limit kasbon aktif tercapai, tapi body-nya tetap
    // envelope { status:false, message, data:{limit,current} } yang human-readable — validateStatus
    // di sini supaya axios TIDAK throw untuk 400 dan body itu tetap sampai ke caller apa adanya.
    const res = await axios.post(getBaseUrl(), body, { ...FORM_HEADERS, validateStatus: (status) => status < 500 });
    return { status: res.status, data: res.data };
  },
};
