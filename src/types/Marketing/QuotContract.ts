export interface QuotContractItem {
  ZCUST: string
  ZMODEL: string
  MATNR: string
  BISMT: string
  MAKTX: string
  MATNR1: string
  BISMT1: string
  MAKTX1: string
  SPMON: string
  VBELN1: string
  VBELN2: string
  UMONTH: string | number
  UDAY: string | number
  WDAY: string | number
  SPMON1: string
  VBELN3: string
  VBELN4: string
  UMONTH1: string | number
  UDAY1: string | number
  WDAY1: string | number
  DIFF_UMONTH: string | number
  DIFF_UDAY: string | number
  PRS_UMONTH: string | number
  PRS_UDAY: string | number
  ZKET1: string
}

export interface QuotContractFilter {
  period: string
}
