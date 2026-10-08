import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import { useUtilityStore } from '@/stores/utility';
import moment from 'moment';
import type { response } from '@/types/response';
import type { params_sap } from '@/types/Stamping/Transaction/AchievementSAP';

type OpenFormPayload = {
  line_id: string;
  date: string;
  shift: string;
  patan: string;
};

type DeleteAchievementPayload = {
  line_id: string;
  date: string;
  shift: string;
  patan: string;
  urut: string | number;
};

type MoveAchievementPayload = {
  line_id: string;
  date: string;
  shift: string;
  urut: string | number;
  move: string;
};

type StartRunningPayload = {
  part_rh: string;
  urut_plan: string | number;
  line_id: string;
  date: string;
  shift: string;
};

type EmptyKanbanPayload = {
  part_rh?: string | null;
  part_lh?: string | null;
  total_kanban: string | number;
  line_id: string;
  date: string;
  shift: string;
  patan: string;
};

type StopRunningPayload = {
  part_rh: string;
  urut_plan: string | number;
  line_id: string;
  date: string;
  shift: string | number;
};

type StartProcessPayload = {
  part_rh: string;
  urut_plan: string | number;
  line_id: string;
  date: string;
  shift: string | number;
};

type StopProcessPayload = {
  part_rh: string;
  urut_plan: string | number;
  line_id: string;
  date: string;
  shift: string | number;
};

type KanbanStartPayload = {
  line_id: string;
  date: string;
  shift: string | number;
  patan: string;
  part_number_rh: string;
  part_number_lh?: string;
  lot_size_rh: string | number;
  urut: string | number;
  machine: string[];
  process: string[];
};

type PrintEKanbanPayload = {
  date: string;
  shift: string | number;
  part_numbers: string[];
  username: string;
  qty_ok: string | number;
};

type CancelEKanbanPayload = {
  date: string;
  shift: string | number;
  part_rh: string;
  part_lh?: string | null;
  username: string;
  qty_ok: string | number;
};

type AddLinePayload = {
  date: string;
  shift: string | number;
  patan: string;
  line_id: string;
};

type CloseFormPayload = {
  line_id: string;
  date: string;
  shift: string | number;
  patan: string;
};

type CloseRefreshFormPayload = {
  line_id: string;
  date: string;
  shift: string | number;
  patan: string;
  user_open: string;
};

type CheckFormPayload = {
  line_id: string;
  date: string;
  shift: string | number;
};

export const stampingProdService = {
  async fetchDataLines(params: any) {
    const utilityStore = useUtilityStore();
    const configStore = useConfigStore();

    const response = await axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement`, { params });

    if (response.status !== 200 || !response.data.status) {
      utilityStore.onApiResponse(response);
      return [];
    }

    return response.data.data.map((data: any) => {
      let total_qty_gsph = 0; 
      let total_tpt = 0;
      let downtime = 0;
      let idletime = 0;
      let repair = 0;
      let reject = 0;
      let qty_actual = 0;
      let qty_plan = 0;
      let stroke = 0;
      let lot_rh = 0;
      let lot_lh = 0;
      let tpt = 0;
      let total_stroke_actual = 0;
      let act_rh = 0;
      let act_lh = 0;
      let dandori = 0;
      let dt_machines = 0;
      let dt_dies = 0;
      let dt_other = 0;
      let dt_material = 0;
      let tpt_actual = 0;
      let total_repair = 0;
      let total_reject = 0;
      let gsph_total = 0;

      const time = params.shift === '1' ? '07:15' : '20:00';

      let current_actual = moment(`${params.date} ${time}`, 'YYYY-MM-DD HH:mm');
      let current_machine = moment(`${params.date} ${time}`, 'YYYY-MM-DD HH:mm');
      let current = moment(`${params.date} ${time}`, 'YYYY-MM-DD HH:mm');

      data.detail = data.detail.map((item: any) => {
        /** ===================== ACTUAL ===================== */
        if (item.part_rh) {
          downtime += +item.downtime || 0;
          repair += +item.repair || 0;
          reject += +item.reject || 0;
          qty_actual += +item.qty_actual || 0;

          if (item.is_tandem === '0' && item.is_trial === '0') {
            idletime += +item.idletime || 0;
            total_qty_gsph += +item.qty_actual || 0;
            total_tpt += +item.tpt_actual || 0;

            const startActual = current_actual.format('YYYY-MM-DD HH:mm');
            current_actual.add(+item.tpt_actual || 0, 'minutes');

            const breakTime = utilityStore.mappingBreak(params, startActual, current_actual.format('YYYY-MM-DD HH:mm'));

            current_actual.add(breakTime, 'minutes');
            item.finish_actual = current_actual.format('HH : mm');
          }
        }

        /** ===================== PLAN ===================== */
        stroke += +item.stroke_plan || 0;
        lot_rh += +item.lot_rh || 0;
        lot_lh += +item.lot_lh || 0;
        tpt += +item.tpt || 0;

        const stroke_actual = item.act_rh ? +item.act_rh * +item.act_process : 0;
        item.stroke_actual = stroke_actual;
        total_stroke_actual += stroke_actual;

        act_rh += +item.act_rh || 0;
        act_lh += +item.act_lh || 0;
        dandori += +item.dandori || 0;
        dt_machines += +item.dt_machines || 0;
        dt_dies += +item.dt_dies || 0;
        dt_other += +item.dt_other || 0;
        dt_material += +item.dt_material || 0;
        tpt_actual += +item.tpt_actual || 0;

        total_repair += (+item.repair_rh || 0) + (+item.repair_lh || 0);
        total_reject += (+item.reject_rh || 0) + (+item.reject_lh || 0);

        item.total_gsph = (stroke_actual / (item.value_combination * item.tpt_actual)) * 60;

        gsph_total = (stroke_actual / (4 * tpt_actual)) * 60;

        /** ===================== MACHINE ===================== */
        const startMachine = current_machine.format('YYYY-MM-DD HH:mm');
        current_machine.add(+item.tpt_machine || 0, 'minutes');

        const breakMachine = utilityStore.mappingBreak(params, startMachine, current_machine.format('YYYY-MM-DD HH:mm'));

        current_machine.add(breakMachine, 'minutes');
        item.finish_machine = item.tpt_machine ? current_machine.format('HH : mm') : '-';

        /** ===================== FINISH PLAN ===================== */
        qty_plan += +item.lotsize || 0;
        const start = current.format('YYYY-MM-DD HH:mm');
        current.add(+item.tpt || 0, 'minutes');

        const breakTime = utilityStore.mappingBreak(params, start, current.format('YYYY-MM-DD HH:mm'));

        current.add(breakTime, 'minutes');
        item.finish_plan = item.job_number ? current.format('HH : mm') : '-';

        return item;
      });

      /** ===================== SUMMARY ===================== */
      data.gsph_actual = total_qty_gsph && total_tpt ? (total_qty_gsph / (total_tpt - idletime)) * 60 : 0;

      data.cycle_time_actual = total_qty_gsph && total_tpt ? ((total_tpt - idletime) / total_qty_gsph) * 60 : 0;

      data.downtime_actual = downtime;
      data.idletime_actual = idletime;
      data.total_part_plan = qty_plan;
      data.total_part_actual = qty_actual;
      data.repair_actual = qty_actual ? (repair / qty_actual) * 100 : 0;
      data.reject_actual = qty_actual ? (reject / qty_actual) * 100 : 0;
      data.good_actual = 100 - data.repair_actual - data.reject_actual;

      data.total_stroke = stroke;
      data.total_lot_rh = lot_rh;
      data.total_lot_lh = lot_lh;
      data.tpt_total = tpt;
      data.total_stroke_actual = total_stroke_actual;
      data.total_act_rh = act_rh;
      data.total_act_lh = act_lh;
      data.total_dandori = dandori;
      data.total_dt_machines = dt_machines;
      data.total_dt_dies = dt_dies;
      data.total_dt_other = dt_other;
      data.total_dt_material = dt_material;
      data.total_tpt_actual = tpt_actual;
      data.total_gsph = gsph_total;
      data.reject = total_reject;
      data.repair = total_repair;
      data.qty_ok = act_rh + act_lh;

      data.expand = false;
      return data;
    });
  },
  async fetchPartItems() {
    const configStore = useConfigStore();
    const utilityStore = useUtilityStore();

    try {
      const response = await axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/master/part`);

      if (response.status === 200) {
        return response.data;
      }

      utilityStore.onApiResponse(response);
      return [];
    } catch (error) {
      utilityStore.onError(error);
      throw error;
    }
  },
  async openForm(payload: OpenFormPayload) {
    const configStore = useConfigStore();

    const fd = new URLSearchParams();
    fd.append('line_id', payload.line_id);
    fd.append('date', payload.date);
    fd.append('shift', String(payload.shift));
    fd.append('patan', payload.patan);

    const configHttp = {
      method: 'put' as const,
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/open`,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: fd
    };

    return axios(configHttp);
  },
  async checkForm(payload: CheckFormPayload) {
    const configStore = useConfigStore();

    return axios.get(
      `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/check`,
      {
        params: {
          line_id: payload.line_id,
          date: payload.date,
          shift: String(payload.shift)
        }
      }
    );
  },
  async KanbanStatusWait(line_id: string, params: any) {
    const configStore = useConfigStore();
    const utilityStore = useUtilityStore();

    try {
      const response = await axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/kanban_circulation/kanban_status_wait`, {
        params: {
          line_id,
          ...params
        }
      });

      if (response.status === 200) {
        return response.data;
      }

      utilityStore.onApiResponse(response);
      return null;
    } catch (error) {
      utilityStore.onError(error);
      throw error;
    }
  },
  async fetchDataLineRefreshKanban(lineId: string, date: string, params: any) {
    const configStore = useConfigStore();
    const utilityStore = useUtilityStore();

    try {
      const response = await axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display_refresh`, {
        params: {
          line: lineId,
          date,
          ...params
        }
      });

      if (response.status === 200) {
        return response.data;
      }

      utilityStore.onApiResponse(response);
      return null;
    } catch (error) {
      utilityStore.onError(error);
      throw error;
    }
  },
  async saveDetail(data: FormData) {
    const configStore = useConfigStore();

    return axios({
      method: 'post',
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement`,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data
    });
  },
  async fetchDataLineByID(lineId: string) {
    const configStore = useConfigStore();

    return axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display`, {
      params: {
        line: lineId
      }
    });
  },
  async deleteAchievementData(payload: DeleteAchievementPayload) {
    const configStore = useConfigStore();

    const fd = new URLSearchParams();
    fd.append('line_id', payload.line_id);
    fd.append('date', payload.date);
    fd.append('shift', String(payload.shift));
    fd.append('patan', payload.patan);
    fd.append('urut', String(payload.urut));

    return axios({
      method: 'delete',
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/data`,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: fd
    });
  },
  async fetchDataLineRefresh(lineId: string, date: string, params: any) {
    const configStore = useConfigStore();

    return axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/display_refresh`, {
      params: {
        line: lineId,
        date,
        ...params
      }
    });
  },
  async moveAchievementData(payload: MoveAchievementPayload) {
    const configStore = useConfigStore();

    const fd = new URLSearchParams();
    fd.append('line_id', payload.line_id);
    fd.append('date', payload.date);
    fd.append('shift', String(payload.shift));
    fd.append('urut', String(payload.urut));
    fd.append('move', payload.move);

    return axios({
      method: 'put',
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/move`,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: fd
    });
  },
  async startRunningItem(payload: StartRunningPayload) {
    const configStore = useConfigStore();

    const fd = new URLSearchParams();
    fd.append('part_rh', payload.part_rh);
    fd.append('urut_plan', String(payload.urut_plan));
    fd.append('line_id', payload.line_id);
    fd.append('date', payload.date);
    fd.append('shift', String(payload.shift));

    return axios({
      method: 'put',
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/start_running`,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: fd
    });
  },
  async setKanbanToEmpty(payload: EmptyKanbanPayload) {
    const configStore = useConfigStore();

    const fd = new FormData();

    if (payload.part_rh) {
      fd.append('part_rh', payload.part_rh);
    }

    if (payload.part_lh) {
      fd.append('part_lh', payload.part_lh);
    }

    fd.append('total_kanban', String(payload.total_kanban));
    fd.append('line_id', payload.line_id);
    fd.append('date', payload.date);
    fd.append('shift', String(payload.shift));
    fd.append('patan', payload.patan);

    return axios({
      method: 'post',
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/kanban_circulation/kanban_status_to_empty`,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: fd
    });
  },
  async stopRunningItem(payload: StopRunningPayload) {
    const configStore = useConfigStore();

    const fd = new URLSearchParams();
    fd.append('part_rh', payload.part_rh);
    fd.append('urut_plan', String(payload.urut_plan));
    fd.append('line_id', payload.line_id);
    fd.append('date', payload.date);
    fd.append('shift', String(payload.shift));

    return axios({
      method: 'put',
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/stop_running`,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: fd
    });
  },
  async startProcessItem(payload: StartProcessPayload) {
    const configStore = useConfigStore();

    const fd = new URLSearchParams();
    fd.append('part_rh', payload.part_rh);
    fd.append('urut_plan', String(payload.urut_plan));
    fd.append('line_id', payload.line_id);
    fd.append('date', payload.date);
    fd.append('shift', String(payload.shift));

    return axios({
      method: 'put',
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/start_process`,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: fd
    });
  },
  async stopProcessItem(payload: StopProcessPayload) {
    const configStore = useConfigStore();

    const fd = new URLSearchParams();
    fd.append('part_rh', payload.part_rh);
    fd.append('urut_plan', String(payload.urut_plan));
    fd.append('line_id', payload.line_id);
    fd.append('date', payload.date);
    fd.append('shift', String(payload.shift));

    return axios({
      method: 'put',
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/stop_process`,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: fd
    });
  },
  async kanbanStart(payload: KanbanStartPayload) {
    const configStore = useConfigStore();

    const fd = new URLSearchParams();
    fd.append('line_id', payload.line_id);
    fd.append('date', payload.date);
    fd.append('shift', String(payload.shift));
    fd.append('patan', payload.patan);
    fd.append('part_number_rh', payload.part_number_rh);

    if (payload.part_number_lh) {
      fd.append('part_number_lh', payload.part_number_lh);
    }

    fd.append('lot_size_rh', String(payload.lot_size_rh));
    fd.append('urut', String(payload.urut));

    // ⬇️ penting untuk CI3
    fd.append('machine', payload.machine.join(','));
    fd.append('process', payload.process.join(','));

    return axios({
      method: 'post',
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/kanban_start`,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: fd
    });
  },
  async printEKanban(payload: PrintEKanbanPayload) {
    const configStore = useConfigStore();

    const fd = new URLSearchParams();
    fd.append('date', payload.date);
    fd.append('shift', String(payload.shift));

    payload.part_numbers.forEach((pn) => {
      fd.append('part_number[]', pn);
    });

    fd.append('username', payload.username);
    fd.append('qty_oke', String(payload.qty_ok));

    return axios({
      method: 'put',
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/kanban-circulation/print_e_kanban`,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: fd
    });
  },
  async cancelEkanban(payload: CancelEKanbanPayload) {
    const configStore = useConfigStore();

    const fd = new URLSearchParams();
    fd.append('date', payload.date);
    fd.append('shift', String(payload.shift));
    fd.append('part_number[]', payload.part_rh);

    if (payload.part_lh) {
      fd.append('part_number[]', payload.part_lh);
    }

    fd.append('username', payload.username);
    fd.append('qty_oke', String(payload.qty_ok));

    return axios({
      method: 'put',
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/kanban-circulation/cancel_e_kanban`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: fd
    });
  },
  async addLine(payload: AddLinePayload) {
    const configStore = useConfigStore();

    const fd = new FormData();
    fd.append('date', payload.date);
    fd.append('shift', String(payload.shift));
    fd.append('patan', payload.patan);
    fd.append('line_id', payload.line_id);

    return axios({
      method: 'post',
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/add_line`,
      data: fd
    });
  },
  async closeForm(payload: CloseFormPayload) {
    const configStore = useConfigStore();

    const fd = new URLSearchParams();
    fd.append('line_id', payload.line_id);
    fd.append('date', payload.date);
    fd.append('shift', String(payload.shift));
    fd.append('patan', payload.patan);

    return axios({
      method: 'put',
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/close`,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: fd
    });
  },
  async closeRefreshForm(payload: CloseRefreshFormPayload) {
    const configStore = useConfigStore();

    const fd = new URLSearchParams();
    fd.append('line_id', payload.line_id);
    fd.append('date', payload.date);
    fd.append('shift', String(payload.shift));
    fd.append('patan', payload.patan);
    fd.append('user_open', payload.user_open);

    return axios({
      method: 'put',
      url: `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/close_refresh`,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: fd
    });
  },
  // AchivementKanban
  async fetchKanbanSTP(params: Record<string, any>): Promise<response> {
    const configStore = useConfigStore();

    const { data } = await axios.get<response>(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement_kanban`, {
      params
    });

    return data;
  },
  async fetchKanbanWLD(params: Record<string, any>): Promise<response> {
    const configStore = useConfigStore();

    const { data } = await axios.get<response>(
      `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/achievement_kanban_wld`,
      { params }
    );

    return data;
  },
  async fetchDataSAPKBN<T = response>(tag: string, params?: Record<string, any>): Promise<T | []> {
    const utilityStore = useUtilityStore();
    const configStore = useConfigStore();

    const response = await axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/report-kanban/sync_sap`, {
      params: {
        tag,
        ...params
      }
    });

    if (response.status !== 200 || !response.data?.status) {
      utilityStore.onApiResponse(response);
      return [];
    }

    return response.data.data as T;
  },
  // End Achievement Kanban
  // Start Achievement SAP
  async fetchDataAchievementSAP(params_sap: params_sap): Promise<response> {
    const configStore = useConfigStore();
    const paramsToSend = {
      ...params_sap,
      shift: String(params_sap.shift)
    };

    return axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement_sap`, { params: paramsToSend });
  },
  async DataSAP(params_sap: params_sap) {
    const configStore = useConfigStore();
    const paramsToSend = {
      ...params_sap,
      shift: String(params_sap.shift)
    };

    return axios.get(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/sync_sap`, { params: paramsToSend });
  },
  async saveAchievementSAP(formData: FormData) {
    const configStore = useConfigStore();

    return axios.post(`http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/achievement_sap`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
  // End Achievement SAP
};
