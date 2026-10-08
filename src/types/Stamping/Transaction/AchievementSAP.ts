export interface SAPLineItem {
    line_id: string;
    connection: boolean;
    detail: any[];
    [key: string]: any;
}

export interface params_sap {
  date: string;
  shift: string;
  patan?: string;
}