import type { PalletLogItem, LogDateParams, LogDateResponse, CombinePalletDeliveryItem, CombineDeliveryParams, CombineDeliveryResponse, DeliveryCycleItem, DeliveryCyclesParams, DeliveryCyclesResponse } from "@/types/Logistik/Pallet/logsPallet";
import { useConfigStore } from '@/stores/config';
import axios from 'axios';

export const useLogsPalletService = () => {
  const configStore = useConfigStore();
  const baseUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/pallet`
  const apiUrl = `${baseUrl}/log_date`

  const getLogsByDate = async (params: LogDateParams): Promise<PalletLogItem[]> => {
    const response = await axios.get<LogDateResponse>(apiUrl, {
      params: {
        start_date: params.start_date,
        end_date: params.end_date,
        ...(params.customer && { customer: params.customer }),
      },
    });

    const data = response.data;

    if (!Array.isArray(data) && !data.success) {
      throw new Error(data.messages);
    }

    return data as PalletLogItem[];
  };

  const getCombineDelivery = async (params: CombineDeliveryParams = {}): Promise<CombinePalletDeliveryItem[]> => {
    const response = await axios.get<CombineDeliveryResponse>(`${baseUrl}/combine_delivery`, {
      params: {
        ...(params.status && { status: params.status }),
        ...(params.customer && { customer: params.customer }),
        ...(params.cycle !== undefined && params.cycle !== '' && { cycle: params.cycle }),
        ...(params.group && { group: params.group }),
        ...(params.no_rfid && { no_rfid: params.no_rfid }),
        ...(params.id_label && { id_label: params.id_label }),
        ...(params.start_date && { start_date: params.start_date }),
        ...(params.end_date && { end_date: params.end_date }),
      },
    });

    const data = response.data;

    if (!Array.isArray(data) && !data.success) {
      throw new Error(data.messages);
    }

    return data as CombinePalletDeliveryItem[];
  };

  const getDeliveryCycles = async (params: DeliveryCyclesParams = {}): Promise<DeliveryCycleItem[]> => {
    const response = await axios.get<DeliveryCyclesResponse>(`${baseUrl}/delivery_cycles`, {
      params: {
        ...(params.group && { group: params.group }),
        ...(params.date && { date: params.date }),
        ...(params.customer && { customer: params.customer }),
      },
    });

    const data = response.data;

    if (!Array.isArray(data) && !data.success) {
      throw new Error(data.messages);
    }

    return data as DeliveryCycleItem[];
  };

  return {
    getLogsByDate,
    getCombineDelivery,
    getDeliveryCycles,
  };
}
