import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { CategoryForm } from '@/types/Finance/Master/Category';

const getBaseUrl = () => {
  const configStore = useConfigStore();
  return `http://${configStore.apiUrl}/majsf_rest_api/api/finance/category`;
};

const FORM_HEADERS = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };

// Validasi gagal (field kosong, nama duplikat) dibalas HTTP 400 dengan body {status:false, message}
// yang tetap harus dibaca normal — axios default throw di non-2xx, jadi validateStatus di sini
// mencegah body 400 jatuh ke catch generik dan kehilangan message aslinya.
const ACCEPT_4XX = { validateStatus: (status: number) => status < 500 };

export const categoryService = {
  async fetchList(): Promise<response> {
    const res = await axios.get(getBaseUrl());
    return { status: res.status, data: res.data };
  },

  async create(payload: CategoryForm): Promise<response> {
    const body = new URLSearchParams({
      category: payload.category,
      due_days: String(payload.due_days ?? ''),
    });
    const res = await axios.post(getBaseUrl(), body, { ...FORM_HEADERS, ...ACCEPT_4XX });
    return { status: res.status, data: res.data };
  },

  async update(id: number, payload: CategoryForm): Promise<response> {
    const body = new URLSearchParams({
      category: payload.category,
      due_days: String(payload.due_days ?? ''),
    });
    const res = await axios.put(`${getBaseUrl()}/${id}`, body, { ...FORM_HEADERS, ...ACCEPT_4XX });
    return { status: res.status, data: res.data };
  },

  async toggle(id: number): Promise<response> {
    const res = await axios.put(`${getBaseUrl()}/${id}/toggle`, undefined, ACCEPT_4XX);
    return { status: res.status, data: res.data };
  },

  async remove(id: number): Promise<response> {
    const res = await axios.delete(`${getBaseUrl()}/${id}`, ACCEPT_4XX);
    return { status: res.status, data: res.data };
  },
};
