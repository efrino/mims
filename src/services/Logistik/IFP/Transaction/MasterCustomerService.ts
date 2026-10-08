import axios from 'axios';
import type {
  Customer,
  CustomerCreatePayload,
  CustomerUpdatePayload,
  CustomerDeletePayload,
  ApiResponse,
} from '@/types/Logistik/IFP/Transaction/MasterCustomer';

export class CustomerService {
  private readonly baseUrl: string;

  constructor(apiUrl: string) {
    this.baseUrl = `http://${apiUrl}/majsf_rest_api/api/MsCustomer`;
  }

  async fetchData(params?: Record<string, unknown>): Promise<ApiResponse<Customer[]>> {
    const res = await axios.get<ApiResponse<Customer[]>>(this.baseUrl, params ? { params } : undefined);
    return res.data;
  }

  async create(payload: CustomerCreatePayload): Promise<ApiResponse> {
    const form = new URLSearchParams();
    form.append('kode_customer', payload.kode_customer);
    form.append('nama', payload.nama);
    form.append("nama_alias", payload.nama_alias || "");
    form.append("kode_zstt", payload.kode_zstt || "");
    form.append('induk_customer', payload.induk_customer ? String(payload.induk_customer) : '');
    form.append('created_by', payload.created_by);

    const res = await axios.post<ApiResponse>(`${this.baseUrl}/store`, form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data;
  }

  async update(payload: CustomerUpdatePayload): Promise<ApiResponse> {
    const form = new URLSearchParams();
    form.append('id', String(payload.id));
    form.append('kode_customer', payload.kode_customer);
    form.append('nama', payload.nama);
    form.append("nama_alias", payload.nama_alias || "");
    form.append("kode_zstt", payload.kode_zstt || "");    
    form.append('induk_customer', payload.induk_customer ? String(payload.induk_customer) : '');
    form.append('updated_by', payload.updated_by);

    const res = await axios.post<ApiResponse>(`${this.baseUrl}/update`, form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data;
  }

  async delete(payload: CustomerDeletePayload): Promise<ApiResponse> {
    const form = new URLSearchParams();
    form.append('id', String(payload.id));
    form.append('deleted_by', payload.deleted_by);

    const res = await axios.post<ApiResponse>(`${this.baseUrl}/delete`, form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data;
  }
}