import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { response } from '@/types/response';

interface filterAchievementReport {
  start: string;
  end: string;
}

interface detailAchievementReportKbn {
  start: string;
  end: string;
  part_number: string;
}

export const fetchAchievementReportWLDService = async (filter: filterAchievementReport): Promise<response> => {
  const configStore = useConfigStore();

  const data = new FormData();

  data.append("start", filter.start);
  data.append("end", filter.end);

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/report`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      }
    },
  );
  
  return response;
};

export const fetchDashboardKanban = async (filter: string): Promise<response> => {
  const configStore = useConfigStore();
  
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/welding?period=${filter}`
  )
  
  return response;
};

export const fetchAchievementReportKbn = async (filter: filterAchievementReport): Promise<response> => {
  const configStore = useConfigStore();
  
  const data = new FormData();

  data.append("start", filter.start);
  data.append("end", filter.end);

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/welding`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      }
    },
  );
  
  return response;
};

export const fetchIncompleteKanban = async (filter: filterAchievementReport): Promise<response> => {
  const configStore = useConfigStore();
  
  const data = new FormData();

  data.append("start", filter.start);
  data.append("end", filter.end);

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/incomplete`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      }
    },
  );
  
  return response;
};

export const detailAchievementReportKbn = async (filter: detailAchievementReportKbn): Promise<response> => {
  const configStore = useConfigStore();
  
  const data = new FormData();

  data.append("start", filter.start);
  data.append("end", filter.end);
  data.append("part_number", filter.part_number);

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/detail`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      }
    },
  );
  
  return response;
};