import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { CashAdvanceSummaryFilter } from '@/types/Finance/Report/CashAdvanceSummary';

const getFinanceUrl = (path: string) => {
  const configStore = useConfigStore();
  return `http://${configStore.apiUrl}/majsf_rest_api/api/finance/${path}`;
};

// Error validasi (mis. "Departemen user tidak ditemukan") dibalas HTTP 400 dengan body
// {status:false, message} — jangan sampai axios throw supaya message-nya tetap terbaca.
const ACCEPT_4XX = { validateStatus: (status: number) => status < 500 };

// Diisi NIK user login untuk membatasi hasil ke departemennya sendiri (dept head). Departemennya
// ditentukan backend dari NIK ini — parameter `department` diabaikan backend saat scope aktif.
// null = tanpa scope (finance/admin, semua departemen).
export type SummaryDepartmentScope = string | null;

const applyScope = (params: Record<string, any>, scopedTo: SummaryDepartmentScope) => {
  if (scopedTo === null) return;
  params.scope = 'department';
  params.requested_by = scopedTo;
};

export const cashAdvanceSummaryService = {
  // group_by dikunci ke "employee_nik" — tidak diekspos sebagai opsi yang bisa diubah.
  // till_date adalah tanggal acuan overdue (pengganti "hari ini"), bukan filter rentang kasbon_date.
  async fetchSummary(filter: CashAdvanceSummaryFilter, scopedTo: SummaryDepartmentScope = null): Promise<response> {
    const params: Record<string, any> = { group_by: 'employee_nik' };
    if (filter.till_date)    params.till_date    = filter.till_date;
    if (filter.employee_nik) params.employee_nik = filter.employee_nik;
    applyScope(params, scopedTo);

    const res = await axios.get(getFinanceUrl('cash_advance/summary'), { params, ...ACCEPT_4XX });
    return { status: res.status, data: res.data };
  },

  async fetchSummaryByDepartment(filter: CashAdvanceSummaryFilter, scopedTo: SummaryDepartmentScope = null): Promise<response> {
    const params: Record<string, any> = {};
    if (filter.till_date) params.till_date = filter.till_date;
    if (filter.department && scopedTo === null) params.department = filter.department;
    applyScope(params, scopedTo);

    const res = await axios.get(getFinanceUrl('cash_advance/summary_department'), { params, ...ACCEPT_4XX });
    return { status: res.status, data: res.data };
  },
};
