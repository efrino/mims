export interface DailyDetail {
  line_id: string;
  part_number: string;
  plan: number;
  actual: number;
  status?: string;
  daily?: DailyDetailDaily[];
}

export interface DailyDetailDaily {
  line_id: string;
  shift: number;
  date: string;
  part_number: string;
  plan: number;
  actual: number;
}

export interface SummaryLine {
  line: string;  
  plan: number;
  actual: number;
  pct?: number;  
}

export interface AchievementResponse {
  summary: SummaryLine[];
  summary_line: SummaryLine[];
  detail: DailyDetail[];
  detail_daily: DailyDetailDaily[];
}

export interface DailyAchievData {
  items: SummaryLine[];
  itemsLine: SummaryLine[];
  details: DailyDetail[];
  details_daily: DailyDetailDaily[];
  listDate: string[];
  filters: {
    line_id: string[];
    part_number: string[];
  };
  cHeaders: Array<Array<{
    text: string;
    align: string;
    rowspan: number;
    colspan: number;
    value: string;
    width?: number;
  }>>;
}

export interface RangeDateParams {
  start: string;
  end: string;
  line?: string;
  cutoff?: string;
}

export interface LineChartData {
  lineId: string;
  dates: string[];
  plans: number[];
  actuals: number[];
  cummPlans: number[];
  cummActs: number[];
}