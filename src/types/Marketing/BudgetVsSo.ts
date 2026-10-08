export interface BudgetVsSoFilter {
  customer: string
  periode: string
  typebudget: string
}

export interface FilterSession {
  periode?: string
  typebudget?: string
}

export interface BudgetVsSoRow {
  id?: number | null
  month: string
  ket: string
  nokol: string | number | null
  cust: string
  model: string
  tipe: string
  name: string
  total_item: number | null
  n0_amount_act: number
  n_amount_forecast: number
  n1_amount_forecast: number
  n2_amount_forecast: number
  n3_amount_forecast: number
  n0_amountSales: number
  n_amountSales: number
  n1_amountSales: number
  n2_amountSales: number
  n3_amountSales: number
  n0_percentMatSales: number
  n_percentMatSales: number
  n1_percentMatSales: number
  n2_percentMatSales: number
  n3_percentMatSales: number
}

export interface BudgetVsSoResponse {
  status: string
  data: BudgetVsSoRow[]
}