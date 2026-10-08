import { MARKETING_API_BASE_URL as BASE_URL } from './MarketingApiConfig';
import axios from 'axios';


export type MdfoDeleteEntity = 'RAW' | 'QUOTATION' | 'CONTRACT' | 'ZSTT' | 'TRACKING';
export type MdfoDeleteSelectionMode = 'SELECTED' | 'FILTERED';

export type MdfoDeleteTarget = {
  id: number;
  customer?: string;
};

export type MdfoDeleteProtectedRow = {
  id?: number;
  customer?: string;
  periode?: string;
  revision?: string;
  reason: string;
  sales_documents?: string[];
};

export type MdfoDeleteWarningRow = {
  id?: number;
  customer?: string;
  periode?: string;
  revision?: string;
  reason: string;
  sales_documents?: string[];
};

export type MdfoDeleteCounts = Record<
  'raw' | 'quotation' | 'contract' | 'zstt' | 'tracking',
  number
>;

export type MdfoDeleteImpact = {
  entity: MdfoDeleteEntity;
  requested: number;
  safe: number;
  protected: number;
  protected_rows: MdfoDeleteProtectedRow[];
  warning_count: number;
  warning_rows: MdfoDeleteWarningRow[];
  counts: MdfoDeleteCounts;
};

export type MdfoDeletePreviewResponse = {
  status: 'success';
  operation_id: number;
  token: string;
  expires_at: string;
  message: string;
  impact: MdfoDeleteImpact;
};

export type MdfoDeleteExecuteResponse = {
  status: 'success';
  operation_id: number;
  deleted: MdfoDeleteCounts;
  protected: number;
  message: string;
};

export type MdfoDeleteHistoryEvent = {
  id: number;
  operation_id: number | null;
  event_token: string;
  event_type: string;
  actor: string;
  reason: string;
  event_json?: string | null;
  created_at: string;
};

export type MdfoDeleteHistoryOperation = {
  id: number;
  requested_entity: MdfoDeleteEntity;
  selection_mode: MdfoDeleteSelectionMode;
  customer: string;
  periode: string;
  revision: string;
  requested_by: string;
  executed_by: string;
  reason: string;
  status: string;
  error_message?: string | null;
  expires_at: string;
  executed_at?: string | null;
  created_at: string;
  updated_at: string;
  impact: MdfoDeleteImpact;
  events: MdfoDeleteHistoryEvent[];
};

export async function previewMdfoDelete(payload: {
  entity: MdfoDeleteEntity;
  selection_mode: MdfoDeleteSelectionMode;
  targets: MdfoDeleteTarget[];
  customer?: string;
  periode?: string;
  revision?: string;
  requested_by?: string;
  reason?: string;
}): Promise<MdfoDeletePreviewResponse> {
  const response = await axios.post<MdfoDeletePreviewResponse>(
    `${BASE_URL}/MdfoDelete/preview`,
    payload
  );
  return response.data;
}

export async function executeMdfoDelete(payload: {
  token: string;
  executed_by?: string;
}): Promise<MdfoDeleteExecuteResponse> {
  const response = await axios.post<MdfoDeleteExecuteResponse>(
    `${BASE_URL}/MdfoDelete/execute`,
    payload
  );
  return response.data;
}

export async function restoreMdfoDelete(payload: {
  operation_id?: number;
  token?: string;
  restored_by: string;
  reason?: string;
}): Promise<{
  status: 'success';
  operation_id: number;
  restored: MdfoDeleteCounts;
  message: string;
}> {
  const response = await axios.post(
    `${BASE_URL}/MdfoDelete/restore`,
    payload
  );
  return response.data;
}

export async function purgeMdfoDelete(payload: {
  operation_id?: number;
  token?: string;
  purged_by: string;
  reason: string;
  confirmation: 'PURGE';
}): Promise<{
  status: 'success';
  operation_id: number;
  purged: MdfoDeleteCounts;
  message: string;
}> {
  const response = await axios.post(
    `${BASE_URL}/MdfoDelete/purge`,
    payload
  );
  return response.data;
}

export async function getMdfoDeleteHistory(limit = 50): Promise<{
  status: 'success';
  operations: MdfoDeleteHistoryOperation[];
}> {
  const response = await axios.get(
    `${BASE_URL}/MdfoDelete/history`,
    { params: { limit } }
  );
  return response.data;
}

export async function runMdfoDeleteRollbackTest(executedBy = ''): Promise<{
  status: 'success';
  passed: boolean;
  message: string;
}> {
  const response = await axios.post(
    `${BASE_URL}/MdfoDelete/rollbackTest`,
    { executed_by: executedBy }
  );
  return response.data;
}
