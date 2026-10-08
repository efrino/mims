import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { IncomingApiResponse, IncomingFilter } from '@/types/Logistik/MasterData/Incoming';

/**
 * @param data
 * @returns
 */

export const useIncomingService = {
  async getMasterDataIncoming(filter: IncomingFilter): Promise<response> {
    const configStore = useConfigStore();

    return await axios.get<IncomingApiResponse>(`http://${configStore.apiUrl}/majsf_rest_api/api/consumable/master_data_incoming`, {
      params: filter
    });
  },
  async updateIncoming(data: URLSearchParams): Promise<response> {
    const configStore = useConfigStore();
    return await axios.put(
      `http://${configStore.apiUrl}/majsf_rest_api/api/consumable/incoming`,
      data,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
  }
};
