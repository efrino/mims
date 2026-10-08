export interface FormBudget {
  ZMATL: string;
  ZDESK: string;
  ZPLAN: string;
  ZSATUAN: string;
  ZPRESS: string;
  ZWELD: string;
  ZLOG: string;
  ZDIEMTC: string;
  ZDIEMFG: string;
  ZPSPRESS: string;
  ZPSWELDING: string;
  ZTOOLJIG: string;
  ZQC: string;
  ZGA: string;
  department: string;
  period: string;
}

export interface FilterBudget {
  department: string;
  period: string;
  date: string;
  inventaris: string;
}

export interface DataBudget {
  chart_actual: ChartActual[];
  chart_over: ChartOver[];
  data: Data[];
}

interface ChartActual {
  ZNAME: string;
  ZPALN: string;
  ZQTY: string;
}

interface ChartOver {
  ZNAME: string;
  ZPALN: string;
  ZQTY: string;
}

interface Data {
  ZCOST: string;
  ZDESK: string;
  ZMATL: string;
  ZPERIOD: string;
  ZPLAN: string;
  ZQTY: string;
  created_at: string;
  updated_at: string;
  user_created: string | null;
  user_updated: string | null;
}