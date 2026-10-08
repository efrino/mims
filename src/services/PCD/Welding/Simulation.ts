import { useConfigStore } from "@/stores/config";
import type { response } from "@/types/response";
import axios from "axios";

export const getSimulationList = async (area?: string, periode?: string, status?: string, is_active?: string): Promise<response> => {
  const configStore = useConfigStore();
  let url = `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/Simulation`;
  
  const params = new URLSearchParams();
  if (area) params.append('area', area);
  if (periode) params.append('periode', periode);
  if (status) params.append('status', status);
  if (is_active) params.append('is_active', is_active);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await axios.get(url);
  return response;
};

export const getSimulationPartById = async (id: number | string, status_filter = 'DETAIL'): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/SimulationPartById?id=${id}&status_filter=${status_filter}`
  );
  return response;
};

export const getSimulationGraphicSummary = async (id: number | string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/SimulationGraphicSummary?id=${id}`
  );
  return response;
};

export const getAreaList = async (): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/Area`
  );
  return response;
};

export const getActiveMachines = async (area?: string): Promise<response> => {
  const configStore = useConfigStore();
  let url = `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/GetActiveMachines`;
  if (area) {
    url += `?area=${area}`;
  }
  const response = await axios.get(url);
  return response;
};

export const getMasterPart = async (area?: string): Promise<response> => {
  const configStore = useConfigStore();
  let url = `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/MasterPart`;
  if (area) {
    url += `?area=${area}`;
  }
  const response = await axios.get(url);
  return response;
};

export const getCreateFromMaster = async (area: string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/CreateFromMaster?area=${area}`
  );
  return response;
};

export const getLatestPartMachines = async (area: string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/GetLatestPartMachines?area=${area}`
  );
  return response;
};

export const getLinesByArea = async (area: string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/GetLinesByArea?area=${area}`
  );
  return response;
};

export const getSimulationLineDetail = async (id_simulation: number | string, line: string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/SimulationLineDetail?id_simulation=${id_simulation}&line=${line}`
  );
  return response;
};

export const getSimulationLive = async (area?: string): Promise<response> => {
  const configStore = useConfigStore();
  let url = `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/SimulationLive`;
  if (area) url += `?area=${area}`;
  const response = await axios.get(url);
  return response;
};

export const postSimulation = async (data: any): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/StoreSimulation`,
    data
  );
  return response.data;
};

export const updateSimulation = async (id: number | string, data: any): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/UpdateSimulation?id=${id}`,
    data
  );
  return response.data;
};

export const updateMachineLoad = async (data: any): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/UpdateMachineLoad`,
    data
  );
  return response.data;
};

export const updateMachineLoadBatch = async (items: any[]): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/UpdateMachineLoadBatch`,
    { items }
  );
  return response.data;
};

export const getSimulationSummaryByMachine = async (id_simulation: number | string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/SimulationSummaryByMachine?id_simulation=${id_simulation}`
  );
  return response.data;
};

export const getSimulationLiveSummary = async (area?: string): Promise<response> => {
  const configStore = useConfigStore();
  let url = `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/SimulationLiveSummary`;
  if (area) {
    url += `?area=${encodeURIComponent(area)}`;
  }
  const response = await axios.get(url);
  return response;
};

export const getSimulationLoadByMachine = async (id_simulation: number | string, machine: string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/SimulationLoadByMachine?id_simulation=${id_simulation}&machine=${encodeURIComponent(machine)}`
  );
  return response.data;
};

export const deleteSimulation = async (id_simulation: number | string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/DeleteSimulation`,
    { id_simulation }
  );
  return response.data;
};

export const updateSimulationStatus = async (id_simulation: number | string, status: number | string, approval_notes?: string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/UpdateSimulationStatus`,
    { id_simulation, status, approval_notes }
  );
  return response.data;
};

export const autoSimulationBalance = async (id_simulation: number | string, preview = true, items?: any[], mode = 'balanced'): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/AutoBalance`,
    { id_simulation, preview, items, mode }
  );
  return response.data;
};

export const getBalancingDiagnostics = async (id_simulation: number | string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/GetBalancingDiagnostics?id_simulation=${id_simulation}`
  );
  return response.data;
};

export const getPcsKanban = async (spmon?: string, area?: string): Promise<response> => {
  const configStore = useConfigStore();
  const queryParams = new URLSearchParams();
  if (spmon) queryParams.append('spmon', spmon);
  if (area) queryParams.append('area', area);
  const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/GetPcsKanban${qs}`
  );
  return response.data;
};

export const getInactiveMachineInUse = async (id_simulation: number | string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/InactiveMachineInUse?id_simulation=${id_simulation}`
  );
  return response.data;
};

export const getPcsDayDetail = async (part_number: string, spmon?: string, parent_part_number?: string): Promise<response> => {
  const configStore = useConfigStore();
  const params = new URLSearchParams();
  params.append('part_number', part_number);
  if (spmon) params.append('spmon', spmon);
  if (parent_part_number) params.append('parent_part_number', parent_part_number);
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/GetPcsDayDetail?${params.toString()}`
  );
  return response.data;
};

export const getAvailableParts = async (id_simulation?: number | string, area?: string, spmon?: string): Promise<response> => {
  const configStore = useConfigStore();
  const params = new URLSearchParams();
  if (id_simulation) params.append('id_simulation', String(id_simulation));
  if (area) params.append('area', area);
  if (spmon) params.append('spmon', spmon);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/GetAvailableParts${query}`
  );
  return response.data;
};

export const expandCandidateParts = async (part_ids: number[], area: string = 'WSS ADM', spmon?: string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/ExpandCandidateParts`,
    { part_ids, area, spmon }
  );
  return response.data;
};

export const getAchievementList = async (spmon?: string, id_simulation?: number | string, area?: string): Promise<response> => {
  const configStore = useConfigStore();
  const params = new URLSearchParams();
  if (spmon) params.append('spmon', spmon);
  if (id_simulation) params.append('id_simulation', String(id_simulation));
  if (area) params.append('area', area);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/GetAchievementList${query}`
  );
  return response.data;
};

export const calculateProductionTimes = async (id_simulation: number | string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/CalculateProductionTimes`,
    { id_simulation }
  );
  return response.data;
};

export const getStatusPatanDetail = async (id_simulation: number | string, part_number: string, process?: any): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/StatusPatanDetail`,
    { params: { id_simulation, part_number, process } }
  );
  return response.data;
};

export const adjustProdTime = async (payload: { id_simulation: number | string; machine: string; adjust_value: number; unit?: string }): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/AdjustProdTime`,
    payload
  );
  return response.data;
};

export const exportComparisonExcel = (id_simulation: number | string = 2, area = 'WSS ADM', spmon?: string) => {
  const configStore = useConfigStore();
  const params = new URLSearchParams();
  params.append('id_simulation', String(id_simulation));
  if (area) params.append('area', area);
  if (spmon) params.append('spmon', spmon);
  const url = `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/ExportComparisonExcel?${params.toString()}`;
  window.open(url, '_blank');
};

export const getPartEliminationTrace = async (
  id_simulation: number | string,
  part_number: string,
  process?: any,
  machine?: string
): Promise<any> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/TraceElimination`,
    { params: { id_simulation, part_number, process, machine } }
  );
  return response.data;
};

export const getComparisonScenarios = async (
  idA: number | string,
  idB: number | string
): Promise<{
  scenarioA: { summary: any[]; parts: any[] };
  scenarioB: { summary: any[]; parts: any[] };
}> => {
  const [summaryA, summaryB, partsA, partsB] = await Promise.all([
    getSimulationGraphicSummary(idA),
    getSimulationGraphicSummary(idB),
    getSimulationPartById(idA, 'ALL'),
    getSimulationPartById(idB, 'ALL')
  ]);

  return {
    scenarioA: {
      summary: summaryA?.data?.data || summaryA?.data || [],
      parts: partsA?.data?.loads || partsA?.data?.data || partsA?.data || []
    },
    scenarioB: {
      summary: summaryB?.data?.data || summaryB?.data || [],
      parts: partsB?.data?.loads || partsB?.data?.data || partsB?.data || []
    }
  };
};

export const getMovementLogsApi = async (id_simulation: number | string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/MovementLogs?id_simulation=${id_simulation}`
  );
  return response.data;
};

export const saveMovementLogBatchApi = async (
  id_simulation: number | string,
  items: any[],
  user = 'SYSTEM'
): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/SaveMovementLog`,
    {
      id_simulation,
      items,
      user
    }
  );
  return response.data;
};

export const clearMovementLogsApi = async (id_simulation: number | string): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/ClearMovementLogs`,
    { id_simulation }
  );
  return response.data;
};

export const getMasterPartWithMdfo = async (area?: string, spmon?: string): Promise<any> => {
  const configStore = useConfigStore();
  const params = new URLSearchParams();
  if (area) params.append('area', area);
  if (spmon) params.append('spmon', spmon);
  const url = `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/MasterPartWithMdfo?${params.toString()}`;
  const response = await axios.get(url);
  return response.data;
};

export const addNewPartToSimulationApi = async (payload: {
  id_simulation: number | string;
  part_number: string;
  part_name?: string;
  model?: string;
  job_number?: string;
  process?: number | string;
  machine_use: string;
  machine_prev?: string;
  pcs_day: number;
  cycle_time_sec?: number;
  qty_kanban?: number;
  lot_cycle?: number;
  jumlah_spot?: number;
  jig?: string;
  ckd?: number | string;
  ckd_part_number?: string;
  downtime?: number;
  reason?: string;
  user?: string;
  id_ms_part?: number | string;
}): Promise<any> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/AddNewPartToSimulation`,
    payload
  );
  return response.data;
};

export const syncSimulationPcsDayApi = async (payload: {
  id_simulation: number | string;
  spmon?: string;
  selected_parts?: string[];
}): Promise<any> => {
  const configStore = useConfigStore();
  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/SyncPcsDay`,
    payload
  );
  return response.data;
};



