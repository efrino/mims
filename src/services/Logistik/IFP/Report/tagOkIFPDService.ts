import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { ParamsFilter, UnscanTagPayload } from '@/types/Logistik/IFP/Report/TagOkIFPD';

/**
 * @param data
 * @returns
 */

export const useTagOkIFPDService = {
  async fetchScannedTagIfp(params: ParamsFilter): Promise<response> {
    const configStore = useConfigStore();

    return await axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/scan_barcode/list_scanned_tag_ifpd`, {
      params: {
        start: params.start,
        end: params.end
      }
    });
  },
  async unscanTagIfpd(payload: UnscanTagPayload): Promise<response> {
    const configStore = useConfigStore();

    const params = new URLSearchParams();
    params.append('id_tag_ok', String(payload.id_tag_ok));
    params.append('nik', payload.nik ?? '');

    return await axios.put(`http://${configStore.apiUrl}/majsf_rest_api/api/scan_barcode/unscan_tag_ifpd`, params);
  }
};
