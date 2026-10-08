import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';
import type { ParamsFilter } from '@/types/Logistik/IFP/Transaction/Rundown';

export const useRundownService = {
  async RundownToDB(location: string): Promise<response> {
    const configStore = useConfigStore();

    return await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/inventory/sync`,
      {
        params: {
          file: `Master ${location}`
        }
      }
    );
  },

  async deleteRundown(location: string): Promise<response> {
    const configStore = useConfigStore();
    let url = '';

    if (location === 'IFP') {
      url = `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_ifp/delete_rundown_ifp`;
    } else if (location === 'IRM') {
      url = `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_irm/delete_rundown_irm`;
    } else if (location === 'WIP') {
      url = `http://${configStore.apiUrl}/majsf_rest_api/api/rundown_wip/delete_rundown_wip`;
    }

    return await axios.get(url);
  },

  async fetchInventory(params: ParamsFilter): Promise<response> {
    const configStore = useConfigStore();

    return await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/inventory`,
      {
        params
      }
    );
  },

  async fetchInventoryTrial(params: ParamsFilter): Promise<response> {
    const configStore = useConfigStore();

    return await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/inventory/trial`,
      {
        params
      }
    );
  },

  async fetchCustMdfo(period: string, status: string): Promise<response> {
    const configStore = useConfigStore();
    const endpoint = status === 'weekly' ? 'get_zcust_weekly' : 'get_zcust';

    return await axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/mdfoSalesOrder/${endpoint}`,
      {
        params: { period }
      }
    );
  },

  async generateSO(payload: { customers: any[]; default_workdays: number }): Promise<response> {
    const configStore = useConfigStore();

    return await axios.post(
      `http://${configStore.apiUrl}/majsf_rest_api/api/mdfoSalesOrder/updateTodayZplnph`,
      payload
    );
  },

  async downloadIfpInhouse(): Promise<any> {
    const configStore = useConfigStore();

    return await axios.get(
      `http://${configStore.apiUrl}/monitoring/production/rundown/report`,
      {
        params: {
          type: 'ifp-inhouse',
          destination: 'All'
        },
        responseType: 'blob'
      }
    );
  }
};