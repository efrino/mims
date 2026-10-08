export interface PlanAndActual {
  id: string;
  information: string;
  created_at: string | null;
  updated_at: string | null;
  user_created: string | null;
  user_updated: string | null;
}

export interface MasterPart {
  id: string;
  job_number: string;
  line: string;
  model: string;
  part_number: string;
  created_at: string | null;
  updated_at: string | null;
  user_created: string | null;
  user_updated: string | null;
}

export interface FormAndonWld {
  id: string;
  information: string;
  part_number: string;
  job_number: string;
  line: string;
  model: string;
}