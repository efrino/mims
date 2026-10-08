import axios from 'axios';
import type {
  MachinePress,
  MachinePressCreatePayload,
  MachinePressUpdatePayload,
  MachinePressDeletePayload,
  ApiResponse
} from '@/types/PCD/Master/MachinePress';

export class MachinePressService {
  private readonly baseUrl: string;

  constructor(apiUrl: string) {
    this.baseUrl = `http://${apiUrl}/majsf_rest_api/api/master/machine_press`;
  }

  async fetchData(lineId?: string): Promise<MachinePress[]> {
    const params = lineId ? { line_id: lineId } : undefined;
    const res = await axios.get<MachinePress[]>(this.baseUrl, params ? { params } : undefined);
    return Array.isArray(res.data) ? res.data : [];
  }

  async create(payload: MachinePressCreatePayload): Promise<ApiResponse> {
    const form = new URLSearchParams();
    form.append('line_id', payload.line_id);
    form.append('jumlah_mesin', payload.jumlah_mesin !== null ? String(payload.jumlah_mesin) : '');
    form.append('user_created', payload.user_created);

    const res = await axios.post<ApiResponse>(this.baseUrl, form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return res.data;
  }

  async update(payload: MachinePressUpdatePayload): Promise<ApiResponse> {
    const form = new URLSearchParams();
    form.append('line_id', payload.line_id);
    form.append('jumlah_mesin', payload.jumlah_mesin !== null ? String(payload.jumlah_mesin) : '');
    form.append('user_updated', payload.user_updated);

    const res = await axios.put<ApiResponse>(this.baseUrl, form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return res.data;
  }

  async delete(payload: MachinePressDeletePayload): Promise<ApiResponse> {
    const res = await axios.delete<ApiResponse>(this.baseUrl, {
      params: { line_id: payload.line_id }
    });
    return res.data;
  }
}
