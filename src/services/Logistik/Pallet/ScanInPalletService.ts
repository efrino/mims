import type { PalletLogItem, PalletLogFormData } from '@/types/Logistik/Pallet/ScanPalletIn';
import { useConfigStore } from '@/stores/config';
import axios from 'axios';

interface GetLogParams {
  no_rfid?: string;
}

export const usePalletLogService = () => {
  const configStore = useConfigStore();
  const apiUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/pallet`;

  const handleError = (error: unknown): never => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.messages || error.message || 'Terjadi kesalahan pada server';
      throw new Error(message);
    }
    throw new Error('Terjadi kesalahan yang tidak diketahui');
  };

  const fetchPalletLogs = async (no_rfid?: string): Promise<PalletLogItem[]> => {
    try {
      const params: GetLogParams = no_rfid ? { no_rfid } : {};
      const response = await axios.get<unknown>(`${apiUrl}/log`, { params });

      if (response.status === 200) {
        const data = response.data;

        if (Array.isArray(data)) return data as PalletLogItem[];
        if (data && typeof data === 'object') return Object.values(data) as PalletLogItem[];
      }

      return [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const submitPalletLog = async (formData: PalletLogFormData) => {
    try {
      const payload = {
        id: formData.ms_pallet_id,
        no_rfid: formData.no_rfid,
        no_pallet: formData.no_pallet,
        type: formData.type,
        status: formData.status,
        category: formData.category,
        customer: formData.customer || null,
        id_label: formData.id_label || null
      };

      const response = await axios.post(`${apiUrl}/log`, payload);
      return response;
    } catch (error) {
      handleError(error);
    }
  };

  const submitScanInWithDriver = async (
    formData: PalletLogFormData,
    driver: { nik: string; nama_driver: string; nama_lp: string; no_polisi: string; nik_pic?: string }
  ) => {
    try {
      const payload = {
        id         : formData.ms_pallet_id,
        no_rfid    : formData.no_rfid,
        no_pallet  : formData.no_pallet,
        type       : formData.type,
        status     : 'IN',
        category   : formData.category,
        customer   : formData.customer || null,
        id_label   : formData.id_label || null,
        nik        : driver.nik,
        nama_driver: driver.nama_driver,
        nama_lp    : driver.nama_lp,
        no_polisi  : driver.no_polisi,
        // Satu kolom nik_pic dipakai lintas status (IN & OUT) di logs_pallet -
        // maknanya beda tergantung status: NIK penerima saat IN, NIK yang
        // mengetahui/menyetujui saat OUT (lihat Driver.ts store).
        nik_pic    : driver.nik_pic || null,
      };
      const response = await axios.post(`${apiUrl}/log`, payload);
      return response;
    } catch (error) {
      handleError(error);
    }
  };

  return {
    fetchPalletLogs,
    submitPalletLog,
    submitScanInWithDriver,
  };
};
