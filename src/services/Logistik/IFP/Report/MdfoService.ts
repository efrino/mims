import axios, { type AxiosResponse } from "axios";

type AnyRecord = Record<string, any>;

export interface GenerateSOPayload {
  customers: AnyRecord[];
  default_workdays: number;
}

export interface UpdateCalculationPayload {
  month: string;
  data: any[];
}

export const MdfoService  = {
  fetchMasterStrength(apiUrl: string): Promise<AxiosResponse<any>> {
    return axios.get(`http://${apiUrl}/majsf_rest_api/api/rundown_ifp`);
  },

  stockSAP(apiUrl: string, params: AnyRecord): Promise<AxiosResponse<any>> {
    return axios.get(`http://${apiUrl}/majsf_rest_api/api/rundown_ifp/stock`, {
      params,
    });
  },

  stockWithSAP(apiUrl: string, params: AnyRecord): Promise<AxiosResponse<any>> {
    return axios.get(`http://${apiUrl}/majsf_rest_api/api/rundown_ifp/stock_sap`, {
      params,
    });
  },

  fetchStockSAP(apiUrl: string, status: string): Promise<AxiosResponse<any>> {
    const data = new FormData();
    data.append("status", status);

    return axios.post(
      `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/stock_ifp`,
      data
    );
  },

  fetchCombineAging(apiUrl: string): Promise<AxiosResponse<any>> {
    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/ScanCombinedTag/getCombineResult`
    );
  },

  fetchStockDetailSAP(
    apiUrl: string,
    customer: string,
    model: string,
    status: string
  ): Promise<AxiosResponse<any>> {
    const data = new FormData();
    data.append("customer", customer);
    data.append("model", model);
    data.append("status", status);

    return axios.post(
      `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/stock_detail`,
      data
    );
  },

  fetchWIPDetailSAP(
    apiUrl: string,
    customer: string,
    model: string,
    status: string
  ): Promise<AxiosResponse<any>> {
    const data = new FormData();
    data.append("customer", customer);
    data.append("model", model);
    data.append("status", status);

    return axios.post(
      `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/wip_detail`,
      data
    );
  },

  fetchIRMDetailSAP(
    apiUrl: string,
    customer: string,
    model: string,
    status: string
  ): Promise<AxiosResponse<any>> {
    const data = new FormData();
    data.append("customer", customer);
    data.append("model", model);
    data.append("status", status);

    return axios.post(
      `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/irm_detail`,
      data
    );
  },

  stockSummarySAP(apiUrl: string, params: AnyRecord): Promise<AxiosResponse<any>> {
    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/ifp_summary`,
      { params }
    );
  },

  irmSummarySAP(apiUrl: string, params: AnyRecord): Promise<AxiosResponse<any>> {
    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/irm_summary`,
      { params }
    );
  },

  wipSummarySAP(apiUrl: string, params: AnyRecord): Promise<AxiosResponse<any>> {
    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/wip_summary`,
      { params }
    );
  },

  ckdSummarySAP(apiUrl: string, params: AnyRecord): Promise<AxiosResponse<any>> {
    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/ckd_summary`,
      { params }
    );
  },

  stockIFP(apiUrl: string): Promise<AxiosResponse<any>> {
    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/ifp_trial`
    );
  },

  stockAdjustment(apiUrl: string, params: AnyRecord): Promise<AxiosResponse<any>> {
    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/stock_adjustment`,
      { params }
    );
  },

  viewDetailItem(
    apiUrl: string,
    model: string,
    customer: string,
    type: string
  ): Promise<AxiosResponse<any>> {
    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/item_detail?customer=${customer}&model=${model}&type=${type}`
    );
  },

  viewDetailItemSAP(
    apiUrl: string,
    model: string,
    customer: string,
    type: string
  ): Promise<AxiosResponse<any>> {
    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/item_detail_sap?customer=${customer}&model=${model}&type=${type}`
    );
  },

  fetchPcsWeeklyChart(
    apiUrl: string,
    customer: string
  ): Promise<AxiosResponse<any>> {
    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/mdfoSalesOrder/pcsWeeklyChart`,
      { params: { customer } }
    );
  },

  fetchCombine(
    apiUrl: string,
    params: Record<string, any> = {}
  ): Promise<AxiosResponse<any>> {
    const queryString = new URLSearchParams(params).toString();
    const query = queryString ? `?${queryString}` : "";
    const baseUrl = apiUrl.startsWith("http") ? apiUrl : `http://${apiUrl}`;

    return axios.get(
      `${baseUrl}/majsf_rest_api/api/ScanCombinedTag/getCombineResult${query}`
    );
  },

  generateSO(
    apiUrl: string,
    payload: GenerateSOPayload
  ): Promise<AxiosResponse<any>> {
    return axios.post(
      `http://${apiUrl}/majsf_rest_api/api/mdfoSalesOrder/updateTodayZplnph`,
      {
        customers: payload.customers,
        default_workdays: payload.default_workdays,
      }
    );
  },

  updateRundownExcelToDB(
    apiUrl: string,
    location: string
  ): Promise<AxiosResponse<any>> {
    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/inventory/sync?file=Master%20${location}`
    );
  },

  deleteRundownDB(
    apiUrl: string,
    location: string
  ): Promise<AxiosResponse<any>> {
    if (location === "IFP") {
      return axios.get(
        `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/delete_rundown_ifp`
      );
    }

    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/rundown_irm/delete_rundown_irm`
    );
  },

  stockIFPD(apiUrl: string): Promise<AxiosResponse<any>> {
    return axios.get(`http://${apiUrl}/majsf_rest_api/api/rundown_ifp/ifp`);
  },

  stockIFPDTrial(apiUrl: string): Promise<AxiosResponse<any>> {
    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/ifpd_trial`
    );
  },

  viewDetailItemIFPD(
    apiUrl: string,
    model: string,
    customer: string,
    type: string
  ): Promise<AxiosResponse<any>> {
    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/item_detail_ifpd?customer=${customer}&model=${model}&type=${type}`
    );
  },

  downloadIfpInhouse(apiUrl: string): Promise<AxiosResponse<Blob>> {
    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/inventory/download_ifp_inhouse`,
      { responseType: "blob" }
    );
  },

  viewDetailItemIFPDTrial(
    apiUrl: string,
    model: string,
    customer: string,
    type: string
  ): Promise<AxiosResponse<any>> {
    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/rundown_ifp/item_detail_ifpd_trial?customer=${customer}&model=${model}&type=${type}`
    );
  },

  fetchCustMdfo(
    apiUrl: string,
    period: string,
    status: string
  ): Promise<AxiosResponse<any>> {
    const endpoint = status === "weekly" ? "get_zcust_weekly" : "get_zcust";

    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/mdfoSalesOrder/${endpoint}`,
      { params: { period } }
    );
  },

  fetchResumeStockHistory(
    apiUrl: string,
    alias: string | number,
    group: string | number | null = null
  ): Promise<AxiosResponse<any>> {
    if (alias === "2" || String(alias).includes("2")) {
      group = 2;
    }

    const apiLink = group
      ? `http://${apiUrl}/majsf_rest_api/api/inventory/resume_stock_history?area=IFPD&alias=${alias}&group=${group}`
      : `http://${apiUrl}/majsf_rest_api/api/inventory/resume_stock_history?area=IFPD&alias=${alias}`;

    return axios.get(apiLink);
  },

  fetchHistoryDN(
    apiUrl: string,
    startDate: string,
    endDate: string,
    partNo?: string,
    signal?: AbortSignal,
    timeout?: number
  ): Promise<AxiosResponse<any>> {
    const params: Record<string, string> = {
      start_date: startDate,
      end_date: endDate,
    };
    if (partNo) params['part_no'] = partNo;

    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/mutation_ifp/history_dn`,
      { params, signal, timeout: timeout ?? 60_000 }
    );
  },

  fetchMdfoData(
    apiUrl: string,
    spmon: string,
    partNo?: string,
    signal?: AbortSignal,
    timeout?: number
  ): Promise<AxiosResponse<any>> {
    const params: Record<string, string> = { spmon };
    if (partNo) params['part_no'] = partNo;

    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/mutation_ifp/mdfo_monthly`,
      { params, signal, timeout: timeout ?? 60_000 }
    );
  },

  fetchSalesOrderData(
    apiUrl: string,
    spmon: string,
    partNo?: string,
    signal?: AbortSignal,
    timeout?: number
  ): Promise<AxiosResponse<any>> {
    const params: Record<string, string> = { spmon };
    if (partNo) params['part_no'] = partNo;

    return axios.get(
      `http://${apiUrl}/majsf_rest_api/api/mutation_ifp/sales_order_monthly`,
      { params, signal, timeout: timeout ?? 60_000 }
    );
  },

  updateCalculationsMonth(
    apiUrl: string,
    payload: UpdateCalculationPayload
  ): Promise<AxiosResponse<any>> {
    return axios.post(
      `http://${apiUrl}/majsf_rest_api/api/mdfoSalesOrder/updateCalculationPcsMonth`,
      {
        month: payload.month,
        data: payload.data,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },
};