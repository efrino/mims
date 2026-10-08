import axios from 'axios';
import type { BarcodeDn, BarcodeDnFilter, UploadType, ApiResponse } from '@/types/Logistik/IFP/Transaction/BarcodeCustomer';

export class BarcodeDnService {
  private readonly baseUrl: string;

  constructor(apiUrl: string) {
    this.baseUrl = `http://${apiUrl}/majsf_rest_api/api/Barcode_Dn`;
  }

  async fetchBarcode(params: BarcodeDnFilter): Promise<ApiResponse<BarcodeDn[]>> {
    const res = await axios.get<ApiResponse<BarcodeDn[]>>(`${this.baseUrl}/get_barcode`, { params });
    return res.data;
  }

  getDownloadFormatUrl(apiUrl: string, type: UploadType): string {
    return `http://${apiUrl}/majsf_rest_api/api/Barcode_Dn/download_format?type=${type}`;
  }

  async uploadBarcode(
    file: File,
    type: UploadType,
    password?: string | null
  ): Promise<ApiResponse> {
    const formData = new FormData();

    formData.append('file_excel', file);

    if (type !== 'ADM') {
      formData.append('type', type);
    }

    if (type === 'ADM' && password) {
      formData.append('password_excel', password);
    }

    const endpoint =
      type === 'ADM'
        ? `${this.baseUrl}/upload_dn_adm`
        : `${this.baseUrl}/upload_barcode`;

    const res = await axios.post<ApiResponse>(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return res.data;
  }

}