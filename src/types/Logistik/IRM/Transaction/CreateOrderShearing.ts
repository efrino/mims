export interface MaterialItems {
  part_number: string;
  spec: string;
  job_number: string;
}

export interface ShearingItems {
  shearing_number: string;
  bq: string;
  MATNR: string;
  MAKTX: string;
  MENGE: string;
}

export interface ShearingSpecs {
  part_number: string;
  spec: string;
  job_number: string;
}

export interface OrderResults {
  icon: string,
  zno: string,
  shearing_number: string,
  order_type: string,
  shearing_quantity: string,
  date: string,
  company_code: string,
  status: string,
  shearing_doc: string
}