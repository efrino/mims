import { MARKETING_API_BASE_URL as API_BASE } from './MarketingApiConfig';
import axios from 'axios';

/* =========================================================
 * API CONFIGURATION
 * ======================================================= */

const BUDGET_MAT_API = `${API_BASE}/Budget_mat`;


/* =========================================================
 * REQUEST TYPES
 * ======================================================= */

type BudgetBaseParams = {
  customer: string;
  periode: string;
  type_budget: string;
};

type BudgetMatParams = BudgetBaseParams & {
  include_adt: boolean;
};

type SalesImportParams = {
  customer: string;
  periode: string;
  typebudget: string;
};

type ResetMaterialHandlingPayload = {
  id: number;
  field: 'pcs' | 'kg' | 'amount';
};

/* =========================================================
 * DATA VOLUME & BUDGET
 * ======================================================= */

export const getVolumeHmmI = (
  params: BudgetBaseParams
) => {
  return axios.get(
    `${BUDGET_MAT_API}/get_volume_hmmi`,
    { params }
  );
};

export const getBudgetMatHmmI = (
  params: BudgetMatParams
) => {
  return axios.get(
    `${BUDGET_MAT_API}/get_budget_mat_hmmi`,
    { params }
  );
};

export const getExcelHmmI = (
  params: BudgetBaseParams
) => {
  return axios.get(
    `${BUDGET_MAT_API}/get_excel_budget_mat_hmmi`,
    { params }
  );
};

/* =========================================================
 * IMPORT
 * ======================================================= */

export const importExcelHmmI = (
  params: BudgetBaseParams
): Promise<Response> => {
  const search = new URLSearchParams({
    customer: params.customer,
    periode: params.periode,
    type_budget: params.type_budget
  });

  return fetch(
    `${BUDGET_MAT_API}/import_excel_budget_mat_hmmi?${search.toString()}`
  );
};

export const importBudgetMatHmmI = (
  params: BudgetBaseParams
): Promise<Response> => {
  const search = new URLSearchParams({
    customer: params.customer,
    periode: params.periode,
    type_budget: params.type_budget
  });

  return fetch(
    `${BUDGET_MAT_API}/import_budget_mat_hmmi?${search.toString()}`
  );
};

export const importSalesHmmI = (
  params: SalesImportParams
) => {
  return axios.get(
    `${BUDGET_MAT_API}/import_sales_hmmi`,
    { params }
  );
};

/* =========================================================
 * DOWNLOAD EXCEL
 * ======================================================= */

export const downloadExcel = (
  params: BudgetBaseParams
) => {
  return axios.get(
    `${BUDGET_MAT_API}/download_excel_budget_mat_hmmi`,
    {
      params,
      responseType: 'blob'
    }
  );
};

/* =========================================================
 * MATERIAL HANDLING
 * ======================================================= */

export const saveMaterialHandlingHmmI = async (
  formData: FormData
) => {
  try {
    /*
     * Jangan set Content-Type manual.
     * Axios/browser akan menambahkan multipart boundary.
     */
    return await axios.post(
      `${BUDGET_MAT_API}/savematerialhandlinghmmi`,
      formData
    );
  } catch (error: unknown) {
    console.error(
      'Error saving material handling:',
      error
    );

    throw error;
  }
};

export const deleteMaterialHandlingHmmI = (
  id: number | string
) => {
  return axios.delete(
    `${BUDGET_MAT_API}/deleteMaterialHandling/${encodeURIComponent(
      String(id)
    )}`
  );
};

export const resetMaterialHandlingFieldHmmI = async (
  payload: ResetMaterialHandlingPayload
) => {
  try {
    const formData = new FormData();

    formData.append(
      'id',
      String(payload.id)
    );

    formData.append(
      'field',
      payload.field
    );

    return await axios.post(
      `${BUDGET_MAT_API}/reset_material_handling_field_hmmi`,
      formData
    );
  } catch (error: unknown) {
    console.error(
      'Error resetting material handling field:',
      error
    );

    throw error;
  }
};
