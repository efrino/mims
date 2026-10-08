export interface RundownSupplyMatRaw {
  MANDT:       string
  WERKS:       string
  RSNUM:       string
  RSPOS:       string
  XLOEK:       string
  KZEAR:       string
  MATNR:       string
  BISMT:       string
  ZSTOCK:      string
  LGORT:       string
  PRVBE:       string
  CHARG:       string
  BDTER:       string
  BDMNG:       string
  MEINS:       string
  ENMNG:       string
  BWART:       string
  UMWRK:       string
  UMLGO:       string
  WEMPF:       string
  ZRES_ASLI:   string
  ZACC_ACT:    string
  ZPROBLEM:    string
  ZMATDOC:     string
  ZALTERNATIF: string
  ZDATE1:      string
  ZJAM1:       string
  ZQTY1:       string
  ZDATE2:      string
  ZJAM2:       string
  ZQTY2:       string
  ZDATE3:      string
  ZJAM3:       string
  ZQTY3:       string
  ZDATE4:      string
  ZJAM4:       string
  ZQTY4:       string
  ZNAME:       string
}

export interface RundownSupplyMatResponse {
  status: boolean
  data:   RundownSupplyMatRaw[]
}

export interface SupplyMatRow {
  noReservasi: string | number
  partNo:      string
  jobNo:       string
  stockIrm:    number
  qtyRequest:  number
  qtySupply:   number
}

export interface SupplyMatLineData {
  name: string
  rows: SupplyMatRow[]
}
