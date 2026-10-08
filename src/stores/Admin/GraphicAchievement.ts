import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import { useNotificationStore } from '@/stores/notification';
import type { 
  DailyAchievData, 
  AchievementResponse, 
  RangeDateParams,
  LineChartData,
  DailyDetail,
  DailyDetailDaily,
  SummaryLine
} from '@/types/Admin/GraphicAchievement';

const getBaseUrl = (): string => {
  const configStore = useConfigStore();
  const apiUrl = configStore.apiUrl;
  return apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
};

const createDefaultDailyAchiev = (): DailyAchievData => ({
  items: [],
  itemsLine: [],
  details: [],
  details_daily: [],
  listDate: [],
  filters: {
    line_id: [],
    part_number: [],
  },
  cHeaders: [[], []],
});

export const useReportStockStore = defineStore('report-stock-stamping', () => {
  const notificationStore = useNotificationStore();

  const dailyAchievPress = ref<DailyAchievData>(createDefaultDailyAchiev());
  const dailyAchievWeld = ref<DailyAchievData>(createDefaultDailyAchiev());
  const loading = ref(false);
  const error = ref<string | null>(null);

  const dailyAchievPressData = computed(() => dailyAchievPress.value);
  const dailyAchievWeldData = computed(() => dailyAchievWeld.value);
  const isPressDataAvailable = computed(() => dailyAchievPress.value.items.length > 0);
  const isWeldDataAvailable = computed(() => dailyAchievWeld.value.items.length > 0);
  
  const getLineOptions = (process: 'press' | 'weld' = 'press'): string[] => {
    const data = process === 'press' ? dailyAchievPress.value : dailyAchievWeld.value;
    const lines = data.details.map((item: DailyDetail) => item.line_id);
    return [...new Set(lines)].sort();
  };
  
  const getPartOptions = (process: 'press' | 'weld' = 'press'): string[] => {
    const data = process === 'press' ? dailyAchievPress.value : dailyAchievWeld.value;
    const parts = data.details.map((item: DailyDetail) => item.part_number);
    return [...new Set(parts)].sort();
  };
  
  const fillListDateInBetween = (date1: string, date2: string): string[] => {
    const dates: string[] = [];
    const start = new Date(date1);
    const end = new Date(date2);
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };
  
  const getLineChartData = (lineId: string, process: 'press' | 'weld' = 'press'): LineChartData | null => {
    const data = process === 'press' ? dailyAchievPress.value : dailyAchievWeld.value;
    const lineDetails = data.details_daily.filter((item: DailyDetailDaily) => item.line_id === lineId);
    
    if (lineDetails.length === 0 && data.listDate.length === 0) {
      return null;
    }
    
    const plans: number[] = [];
    const actuals: number[] = [];
    const dates: string[] = [];
    
    data.listDate.forEach((date: string) => {
      const dayData = lineDetails.find((item: DailyDetailDaily) => item.date === date);
      plans.push(dayData?.plan || 0);
      actuals.push(dayData?.actual || 0);
      dates.push(date);
    });
    
    let cummPlan = 0;
    let cummAct = 0;
    const cummPlans: number[] = [];
    const cummActs: number[] = [];
    
    plans.forEach((plan: number, idx: number) => {
      cummPlan += plan;
      cummAct += actuals[idx];
      cummPlans.push(cummPlan);
      cummActs.push(cummAct);
    });
    
    return {
      lineId,
      dates,
      plans,
      actuals,
      cummPlans,
      cummActs,
    };
  };
  
  const getAllLinesChartData = (process: 'press' | 'weld' = 'press'): LineChartData[] => {
    const data = process === 'press' ? dailyAchievPress.value : dailyAchievWeld.value;
    const lines = [...new Set(data.details_daily.map((item: DailyDetailDaily) => item.line_id))];
    
    const result: LineChartData[] = [];
    for (const lineId of lines) {
      const chartData = getLineChartData(lineId, process);
      if (chartData) {
        result.push(chartData);
      }
    }
    return result;
  };
  
  const getLineTableData = (lineId: string, process: 'press' | 'weld' = 'press'): DailyDetail[] => {
    const data = process === 'press' ? dailyAchievPress.value : dailyAchievWeld.value;
    return data.details.filter((item: DailyDetail) => item.line_id === lineId);
  };
  
  const getSummaryData = (process: 'press' | 'weld' = 'press'): SummaryLine[] => {
    const data = process === 'press' ? dailyAchievPress.value : dailyAchievWeld.value;
    return data.itemsLine;
  };

  const buildHeaders = (data: DailyAchievData): void => {
    data.cHeaders = [[], []];
    data.cHeaders[0].length = 7;

    data.listDate.forEach((date: string) => {
      data.cHeaders[0].push({
        text: date,
        align: 'left',
        rowspan: 1,
        colspan: 3,
        value: date,
      });
      data.cHeaders[1].push(
        {
          text: 'Plan',
          align: 'left',
          rowspan: 1,
          colspan: 1,
          width: 50,
          value: `plan${date}`,
        },
        {
          text: 'Act',
          align: 'left',
          rowspan: 1,
          colspan: 1,
          width: 50,
          value: `act${date}`,
        },
        {
          text: 'Achv',
          align: 'left',
          rowspan: 1,
          colspan: 1,
          width: 60,
          value: `achiev${date}`,
        }
      );
    });
  };

  const attachDailyToDetails = (data: DailyAchievData): void => {
    data.details.forEach((detail: DailyDetail, index: number) => {
      const dailyData = data.details_daily.filter(
        (val: DailyDetailDaily) => val.line_id === detail.line_id && val.part_number === detail.part_number
      );
      
      const dailyByList: DailyDetailDaily[] = [];
      
      data.listDate.forEach((date: string) => {
        const found = dailyData.find((val: DailyDetailDaily) => val.date === date);
        if (found) {
          dailyByList.push(found);
        } else {
          dailyByList.push({
            line_id: detail.line_id,
            shift: 0,
            date: date,
            part_number: detail.part_number,
            plan: 0,
            actual: 0,
          });
        }
      });
      
      if (data.details[index]) {
        data.details[index].daily = dailyByList;
      }
    });
  };

  const processPressData = (response: AchievementResponse, start: string, end: string): void => {
    dailyAchievPress.value.items = response.summary || [];
    dailyAchievPress.value.itemsLine = response.summary_line || [];
    dailyAchievPress.value.details = response.detail || [];
    dailyAchievPress.value.details_daily = response.detail_daily || [];
    dailyAchievPress.value.listDate = fillListDateInBetween(start, end);
    
    console.log('ProcessPressData - itemsLine:', dailyAchievPress.value.itemsLine);
    
    buildHeaders(dailyAchievPress.value);
    attachDailyToDetails(dailyAchievPress.value);
  };

  const processWeldData = (response: AchievementResponse, start: string, end: string): void => {
    dailyAchievWeld.value.items = response.summary || [];
    dailyAchievWeld.value.itemsLine = response.summary_line || [];
    dailyAchievWeld.value.details = response.detail || [];
    dailyAchievWeld.value.details_daily = response.detail_daily || [];
    dailyAchievWeld.value.listDate = fillListDateInBetween(start, end);
    
    console.log('ProcessWeldData - itemsLine:', dailyAchievWeld.value.itemsLine);
    
    buildHeaders(dailyAchievWeld.value);
    attachDailyToDetails(dailyAchievWeld.value);
  };

  const fetchReportAchievementRangeDate = async (
    tanggal: string[],
    line: string = 'All',
    process: 'press' | 'weld' = 'press',
    cutoff: string = ''
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    const start = tanggal[0];
    const end = tanggal[1];

    if (!end || new Date(start) > new Date(end)) {
      notificationStore.showAlertError('Invalid date range selection!');
      loading.value = false;
      return;
    }

    if (cutoff !== '' && (new Date(cutoff) > new Date(end) || new Date(cutoff) < new Date(start))) {
      notificationStore.showAlertError('Invalid date cut off!');
      loading.value = false;
      return;
    }

    try {
      const baseUrl = getBaseUrl();
      const endpoint = process === 'press' 
        ? '/majsf_rest_api/api/report-stock/range_date'
        : '/majsf_rest_api/api/report-stock/range_date_weld';
      
      const lineParam = line || 'All';
      
      const url = `${baseUrl}${endpoint}?start=${start}&end=${end}&line=${lineParam}&cutoff=${cutoff}`;
      
      console.log('Fetching URL:', url);
      
      const response = await axios.get<AchievementResponse>(url);
      
      console.log('Response data summary_line:', response.data.summary_line);

      if (process === 'press') {
        processPressData(response.data, start, end);
      } else {
        processWeldData(response.data, start, end);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch achievement data';
      error.value = errorMessage;
      notificationStore.showAlertError(errorMessage);
      console.error('fetchReportAchievementRangeDate error:', err);
    } finally {
      loading.value = false;
    }
  };

  const filteredAchievItems = (process: 'press' | 'weld' = 'press'): DailyDetail[] => {
    const data = process === 'press' ? dailyAchievPress.value : dailyAchievWeld.value;
    const filters = data.filters;

    return data.details.filter((detail: DailyDetail) => {
      if (filters.line_id.length > 0 && !filters.line_id.includes(detail.line_id)) {
        return false;
      }
      if (filters.part_number.length > 0 && !filters.part_number.includes(detail.part_number)) {
        return false;
      }
      return true;
    });
  };

  const resetDailyAchievPress = (): void => {
    dailyAchievPress.value = createDefaultDailyAchiev();
  };

  const resetDailyAchievWeld = (): void => {
    dailyAchievWeld.value = createDefaultDailyAchiev();
  };

  const setFilters = (
    process: 'press' | 'weld', 
    filters: { line_id?: string[]; part_number?: string[] }
  ): void => {
    if (process === 'press') {
      if (filters.line_id) dailyAchievPress.value.filters.line_id = filters.line_id;
      if (filters.part_number) dailyAchievPress.value.filters.part_number = filters.part_number;
    } else {
      if (filters.line_id) dailyAchievWeld.value.filters.line_id = filters.line_id;
      if (filters.part_number) dailyAchievWeld.value.filters.part_number = filters.part_number;
    }
  };

  const clearFilters = (process: 'press' | 'weld'): void => {
    if (process === 'press') {
      dailyAchievPress.value.filters = { line_id: [], part_number: [] };
    } else {
      dailyAchievWeld.value.filters = { line_id: [], part_number: [] };
    }
  };

  return {
    dailyAchievPress,
    dailyAchievWeld,
    loading,
    error,
    dailyAchievPressData,
    dailyAchievWeldData,
    isPressDataAvailable,
    isWeldDataAvailable,
    getLineOptions,
    getPartOptions,
    getLineChartData,
    getAllLinesChartData,
    getLineTableData,
    getSummaryData,
    fetchReportAchievementRangeDate,
    filteredAchievItems,
    resetDailyAchievPress,
    resetDailyAchievWeld,
    setFilters,
    clearFilters,
  };
});