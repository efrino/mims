export interface ParamsFilter {
  start: string;
  end: string;
  cutoff: string;
  line: string;
  shift: number | null;
}

export interface DataAPI {
  detail: Detail[];
  detail_daily: DetailDaily[];
  summary: Summary[];
  summary_line: SummaryLine[];
}

export interface CleanData {
  detail: DetailWithDaily[];
  summary: Summary[];
  summary_line: SummaryLine[];
}

interface BaseDetail {
  actual: number;
  line_id: string;
  part_number: string;
  job_number?: string;
  plan: number;
  shift?: number | string | null;
}

interface Detail extends BaseDetail {
  status: string;
}

export interface DetailDaily extends BaseDetail {
  date: string;
  shift: string | null;
}

export interface DetailWithDaily extends BaseDetail {
  status: string;
  daily: DetailDaily[];
}

interface Summary {
  date: string;
  plan: number;
  actual: number;
  pct: string;
  cumm_plan: number;
  cumm_act: number;
  cumm_pct: string;
}

interface SummaryLine {
  actual: number;
  line: string;
  pct: number;
  plan: number;
}