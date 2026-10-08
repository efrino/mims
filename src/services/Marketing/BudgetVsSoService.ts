import { MARKETING_API_BASE_URL as API_BASE } from './MarketingApiConfig';
import axios from 'axios';

import type {
  BudgetVsSoFilter,
  BudgetVsSoResponse
} from '@/types/Marketing/BudgetVsSo';

/* =========================================================
 * API CONFIGURATION
 * ======================================================= */

const BUDGET_MAT_API = `${API_BASE}/Budget_mat`;


/* =========================================================
 * BUDGET VS SALES ORDER
 * ======================================================= */

export async function getBudgetVsSo(
  payload: BudgetVsSoFilter
): Promise<BudgetVsSoResponse> {
  const response =
    await axios.get<BudgetVsSoResponse>(
      `${BUDGET_MAT_API}/budget_vs_so_hmmi`,
      {
        params: payload
      }
    );

  return response.data;
}
