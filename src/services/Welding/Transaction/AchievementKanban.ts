import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';

interface params {
  clock: string;
  date: string;
  day: string;
  hour: string;
  period: string;
  period2: string;
  shift: Number;
}

export const fetchDataAchKanban = async (params: params): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/achievement_kanban_wld?date=${params.date}&period=${params.period}&period2=${params.period2}&clock=${params.clock}&hour=${params.hour}&shift=${params.shift}&day=${params.day}`
  );

  return response;
};

export const syncSAPAchKbn = async (params: params): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/sync_sap?tag=LKH-WLD&date=${params.date}&period=${params.period}&period2=${params.period2}&clock=${params.clock}&hour=${params.hour}&shift=${params.shift}&day=${params.day}`
  );

  return response;
};