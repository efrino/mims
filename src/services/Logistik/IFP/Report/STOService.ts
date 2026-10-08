import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { ParamsFilter } from '@/types/Logistik/IFP/Report/ScannedSTO';

export const useScannedSTOService = {
  async fetchScannedTagIfp(params: ParamsFilter): Promise<response> {
    const configStore = useConfigStore();

    return await axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/scan_barcode/history_scanned_sto`, {
      params: {
        start: params.start,
        end: params.end
      }
    });
  }
};