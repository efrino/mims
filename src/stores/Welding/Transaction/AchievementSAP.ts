import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  SAPLine,
  SAPFormDetail,
  SAPParams,
  SAPDialogState,
  SAPList,
  ShiftEnum,
  AdditionalTypeEnum,
  KeteranganSAPOption,
  SAPFormDataPayload,
} from '@/types/Welding/Transaction/AchievementSAP';
import { KETERANGAN_SAP_OPTIONS, ShiftEnum as Shift, AdditionalTypeEnum as AdditionalEnum } from '@/types/Welding/Transaction/AchievementSAP';
import { createAchievementSAPService } from '@/services/Welding/Transaction/AchievementSAPService';
import { useConfigStore } from '@/stores/config';
import { useNotificationStore } from '@/stores/notification';
import { useUtilityStore } from '@/stores/utility';

export const useAchievementSAPStore = defineStore('achievement-sap', () => {
  const configStore = useConfigStore();
  const notificationStore = useNotificationStore();
  const utilityStore = useUtilityStore();

  const sapService = createAchievementSAPService(configStore.apiUrl);

  const view = ref<boolean>(false);
  const lines = ref<SAPLine[]>([]);
  const line = ref<SAPLine | null>(null);

  const formDetail = ref<SAPFormDetail>({
    urut_plan: [],
    additional: [],
    patan: [],
    part_number: [],
    lotsize: [],
    lotsize_actual: [],
    qty_sap: [],
    reject: [],
    keterangan_sap: [],
    total_lot_rh: 0,
    total_ok: 0,
    total_sap: 0,
    total_repair: 0,
  });

  const dialog = ref<SAPDialogState>({
    detail: false,
    filter: false,
    sync: false,
    datePicker: false,
  });

  const currentShift = utilityStore.getCurrentShift();

  const params = ref<SAPParams>({
    date: currentShift.date,
    shift: currentShift.shift as ShiftEnum,
    period: '',
  });

  const listShift = ref<readonly ShiftEnum[]>([
    Shift.SHIFT_1,
    Shift.SHIFT_2,
  ] as const);

  const list = ref<SAPList>({
    keterangan_sap: KETERANGAN_SAP_OPTIONS,
  });

  const pageTitle = computed<string>(() => {
    return `Achievement Welding Compare with SAP (${utilityStore.formatDate(
      params.value.date
    )} / Shift ${params.value.shift})`;
  });

  const hasLineSelected = computed<boolean>(() => {
    return line.value !== null;
  });

  const totalLines = computed<number>(() => {
    return lines.value.length;
  });

  function parseKeteranganSAP(keterangan: string): KeteranganSAPOption[] {
    if (!keterangan || typeof keterangan !== 'string') {
      return [];
    }

    return keterangan
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is KeteranganSAPOption =>
        KETERANGAN_SAP_OPTIONS.includes(s as KeteranganSAPOption)
      );
  }

  function toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  function handleServiceError(error: unknown): void {
    if (error instanceof Error) {
      notificationStore.showAlertError(error.message);
    } else {
      notificationStore.showAlertError('An unknown error occurred');
    }
  }

  function initializeFormDetail(length: number = 13): void {
    formDetail.value = {
      urut_plan: Array(length).fill(0),
      additional: Array(length).fill(AdditionalEnum.REGULAR),
      patan: Array(length).fill(''),
      part_number: Array(length).fill(''),
      lotsize: Array(length).fill(0),
      lotsize_actual: Array(length).fill(0),
      qty_sap: Array(length).fill(0),
      reject: Array(length).fill(0),
      keterangan_sap: Array(length).fill([]),
      total_lot_rh: 0,
      total_ok: 0,
      total_sap: 0,
      total_repair: 0,
    };
  }

  function calculateTotals(): void {
    formDetail.value.total_lot_rh = formDetail.value.lotsize.reduce(
      (sum, val) => sum + toNumber(val),
      0
    );

    formDetail.value.total_ok = formDetail.value.lotsize_actual.reduce(
      (sum, val) => sum + toNumber(val),
      0
    );

    formDetail.value.total_sap = formDetail.value.qty_sap.reduce(
      (sum, val) => sum + toNumber(val),
      0
    );

    formDetail.value.total_repair = formDetail.value.reject.reduce(
      (sum, val) => sum + toNumber(val),
      0
    );
  }

  async function fetchDataLineforSAP(): Promise<void> {
    try {
      notificationStore.loading = true;

      const response = await sapService.fetchAchievementForSAP(params.value);

      if (response.status && response.data) {
        lines.value = response.data.map((lineData) => ({
          ...lineData,
          connection: true,
          shift: params.value.shift,
          date: params.value.date,
        }));
      } else {
        lines.value = [];
        notificationStore.showAlertWarning(response.message || 'No data found');
      }

      configStore.page.name = pageTitle.value;
      dialog.value.filter = false;
    } catch (error) {
      lines.value = [];
      handleServiceError(error);
    } finally {
      notificationStore.disableLoading();
    }
  }

  function loadDataEditSAP(lineData: SAPLine): void {
    line.value = lineData;
    const items = lineData.detail;

    const length = Math.max(items.length, 13);
    initializeFormDetail(length);

    items.forEach((item, index) => {
      formDetail.value.urut_plan[index] = toNumber(item.urut_plan);
      formDetail.value.additional[index] = item.additional;
      formDetail.value.patan[index] = item.patan || '';
      formDetail.value.part_number[index] = item.part_number || '';
      formDetail.value.lotsize[index] = toNumber(item.lotsize);
      formDetail.value.lotsize_actual[index] = toNumber(item.lotsize_actual);
      formDetail.value.qty_sap[index] = toNumber(item.qty_sap);
      formDetail.value.reject[index] = toNumber(item.reject);
      formDetail.value.keterangan_sap[index] = parseKeteranganSAP(
        item.keterangan_sap
      );
    });

    calculateTotals();
    dialog.value.detail = true;
  }

  async function onSaveDetailSAP(): Promise<void> {
    if (!line.value) {
      notificationStore.showAlertWarning('No line selected');
      return;
    }

    try {
      notificationStore.loading = true;

      const payload: SAPFormDataPayload = {
        formDetail: formDetail.value,
        lineId: line.value.line_id,
        date: params.value.date,
        shift: params.value.shift,
        patan: line.value.patan,
      };

      const response = await sapService.saveSAPDetail(payload);

      if (response.status) {
        notificationStore.showAlertSuccess(response.message);

        if (response.additional_info) {
          notificationStore.showAlertWarning(response.additional_info);
        }

        await fetchDataLineforSAP();
        closeDetailDialog();
      } else {
        notificationStore.showAlertError(response.message || 'Save failed');
      }
    } catch (error) {
      handleServiceError(error);
    } finally {
      notificationStore.disableLoading();
    }
  }

  async function fetchDataSAP(tag: string = 'LKH-WLD'): Promise<void> {
    try {
      if (!params.value.period) {
        notificationStore.showAlertWarning('Please select a period');
        return;
      }

      notificationStore.loading = true;

      const response = await sapService.syncSAPData(tag, params.value.period);

      if (response.status) {
        notificationStore.showAlertSuccess(response.message);
        dialog.value.sync = false;
        await fetchDataLineforSAP();
      } else {
        notificationStore.showAlertError(response.message || 'Sync failed');
      }
    } catch (error) {
      handleServiceError(error);
    } finally {
      notificationStore.disableLoading();
    }
  }

  function closeDetailDialog(): void {
    dialog.value.detail = false;
    view.value = false;
  }

  function resetState(): void {
    lines.value = [];
    line.value = null;
    initializeFormDetail();
    dialog.value = {
      detail: false,
      filter: false,
      sync: false,
      datePicker: false,
    };
  }

  return {
    view,
    lines,
    line,
    formDetail,
    dialog,
    params,
    listShift,
    list,
    pageTitle,
    hasLineSelected,
    totalLines,
    fetchDataLineforSAP,
    loadDataEditSAP,
    onSaveDetailSAP,
    fetchDataSAP,
    closeDetailDialog,
    calculateTotals,
    initializeFormDetail,
    resetState,
  };
});