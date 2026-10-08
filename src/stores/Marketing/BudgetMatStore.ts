import { defineStore } from 'pinia';
import { ref, computed, onMounted, watch } from 'vue';
import { useCustomizerStore } from '@/stores/customizer';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import {
  getVolumeHmmI,
  getBudgetMatHmmI,
  importBudgetMatHmmI,
  importSalesHmmI,
  getExcelHmmI,
  importExcelHmmI,
  downloadExcel,
  saveMaterialHandlingHmmI,
  deleteMaterialHandlingHmmI,
  resetMaterialHandlingFieldHmmI
} from '@/services/Marketing/BudgetMatService';

import type {
  AdvanceExtraDiffMemory,
  AdvanceExtraItem,
  AdvanceSubmitItem,
  ExistingSchemaType,
  FilterData,
  ResetField,
  SchemaHandling
} from '@/types/Marketing/BudgetMatStore';
export const useBudgetMatStore = defineStore('budgetMat', () => {
  /* ==============================
   * STORE LAIN
   * ============================== */
  const customizer = useCustomizerStore();
  const notification = useNotificationStore();
  const authStore = useAuthStore();

  type BudgetMaterialPermissionAction = 'view' | 'create' | 'update' | 'delete' | 'download';

  const permissions = computed(() => ({
    view: authStore.checkAccess('Marketing.View.Daily.BudgetMaterial'),
    create: authStore.checkAccess('Marketing.Create.Daily.BudgetMaterial'),
    update: authStore.checkAccess('Marketing.Update.Daily.BudgetMaterial'),
    delete: authStore.checkAccess('Marketing.Delete.Daily.BudgetMaterial'),
    download: authStore.checkAccess('Marketing.Download.Daily.BudgetMaterial')
  }));

  const salesAmountPermissions = computed(() => ({
    view: authStore.checkAccess('Marketing.View.Daily.BudgetSalesAmount'),
    create: authStore.checkAccess('Marketing.Create.Daily.BudgetSalesAmount'),
    update: authStore.checkAccess('Marketing.Update.Daily.BudgetSalesAmount'),
    download: authStore.checkAccess('Marketing.Download.Daily.BudgetSalesAmount')
  }));

  const canMutateBudgetMaterial = computed(() => permissions.value.create || permissions.value.update);
  const canMutateBudgetSalesAmount = computed(() => salesAmountPermissions.value.create || salesAmountPermissions.value.update);

  const requireBudgetMaterialPermission = (
    action: BudgetMaterialPermissionAction,
    label: string
  ): boolean => {
    if (permissions.value[action]) return true;

    notification.showAlertWarning(
      `Anda tidak memiliki permission ${label} untuk fitur Budget Material.`
    );
    return false;
  };

  const requireBudgetMaterialCreateOrUpdatePermission = (): boolean => {
    if (canMutateBudgetMaterial.value) return true;

    notification.showAlertWarning(
      'Anda tidak memiliki permission Create/Update untuk fitur Budget Material.'
    );
    return false;
  };

  const isOpeningAdtPopup = ref(false);
  const isHydratingAdvanceSchema = ref(false);

  /* ==============================
   * STATE UTAMA FILTER DAN DATA
   * ============================== */
  const budgetMat = ref<any[]>([]);
  const budgetCal = ref<any[]>([]);
  const selectedMonth = ref('');
  const selectedReportType = ref('');
  const selectedVersion = ref('');
  const customerCode = ref('HMMI');
  const includeADT = ref(false);
  const importStatus = ref<any | null>(null);

  const readJsonResponse = async (response: Response): Promise<any> => {
    const raw = await response.text();

    if (!raw.trim()) {
      return {};
    }

    try {
      return JSON.parse(raw);
    } catch {
      const contentType = response.headers.get('content-type') || 'unknown';
      throw new Error(
        `Respons API Budget Material bukan JSON (HTTP ${response.status}, ${contentType})`
      );
    }
  };

  /* ==============================
   * STATE MATERIAL HANDLING
   * ============================== */
  const iaaNo = ref('');
  const selectedModel = ref('');
  const selectedName = ref('');
  const selectedSchemaHandling = ref('');
  const effectiveMonth = ref('');
  const advanceMonth = ref('');
  const advanceHint = ref<any | null>(null);
  const effectiveHint = ref('');
  const isCarryForwardSchemaMode = ref(false);

  const CARRY_FORWARD_HINT = 'Mengikuti difference dari schema bulan sebelumnya';

  const carryForwardAdvanceMonthMap = ref<Record<string, boolean>>({});

  const getCarryForwardMonthKey = (month: any) => {
    const clean = String(month ?? '').replace(/\D/g, '');
    return clean.length >= 6 ? clean.slice(0, 6) : '';
  };

  const setCarryForwardAdvanceMonths = (items: AdvanceSubmitItem[]) => {
    const next: Record<string, boolean> = {};

    items.forEach((item) => {
      const key = getCarryForwardMonthKey(item.month);

      if (key) {
        next[key] = true;
      }
    });

    carryForwardAdvanceMonthMap.value = next;
  };

  const isCarryForwardAdvanceMonth = (month: any) => {
    const key = getCarryForwardMonthKey(month);
    return !!key && !!carryForwardAdvanceMonthMap.value[key];
  };

  const getCarryForwardAdvanceHint = (month: any) => {
    if (!isCarryForwardSchemaMode.value) return '';

    return isCarryForwardAdvanceMonth(month) ? CARRY_FORWARD_HINT : '';
  };

  const clearCarryForwardHint = () => {
    isCarryForwardSchemaMode.value = false;
    effectiveHint.value = '';
    advanceHint.value = '';
    carryForwardAdvanceMonthMap.value = {};
  };

  const activeSchemaRow = ref<any | null>(null);
  const isReadADT = ref(false);
  const currentADTId = ref<number | null>(null);

  const isDependentDisabled = computed(() => !selectedModel.value);

  /* ==============================
   * NILAI ADDITIONAL
   * ============================== */
  const pcsPrev = ref<number | null>(null);
  const kgPrev = ref<number | null>(null);
  const amountPrev = ref<number | null>(null);

  const pcsDifference = ref<number | null>(null);
  const kgDifference = ref<number | null>(null);
  const amountDifference = ref<number | null>(null);

  const pcsAfter = computed(() => {
    return (pcsPrevAdjusted.value ?? 0) + (pcsDifference.value ?? 0);
  });

  const kgAfter = computed(() => {
    return (kgPrev.value ?? 0) + (kgDifference.value ?? 0);
  });

  const amountAfter = computed(() => {
    return (amountPrev.value ?? 0) + (amountDifference.value ?? 0);
  });

  /* ==============================
   * NILAI ADVANCE
   * ============================== */
  const advancePcsPrev = ref<number | null>(null);
  const advanceKgprev = ref<number | null>(null);
  const advanceAmountprev = ref<number | null>(null);

  const advancePcsDiff = ref<number | null>(null);
  const advanceKgDiff = ref<number | null>(null);
  const advanceAmountDiff = ref<number | null>(null);

  const advancePcsAfter = computed(() => {
    return (advancePcsPrev.value ?? 0) - (advancePcsDiff.value ?? 0);
  });

  const advanceKgAfter = computed(() => {
    return (advanceKgprev.value ?? 0) - (advanceKgDiff.value ?? 0);
  });

  const advanceAmountAfter = computed(() => {
    return (advanceAmountprev.value ?? 0) - (advanceAmountDiff.value ?? 0);
  });

  const createAdvanceExtraItem = (month = ''): AdvanceExtraItem => ({
    uid: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    month,
    pcsPrev: 0,
    kgPrev: 0,
    amountPrev: 0,
    pcsDiff: 0,
    kgDiff: 0,
    amountDiff: 0,
    hint: ''
  });

  const advanceList = ref<AdvanceExtraItem[]>([]);
  const advanceExtraDiffMemory = ref<Record<string, AdvanceExtraDiffMemory>>({});
  const advanceExtraMonthSnapshot = ref<Record<string, string>>({});

  const getAdvanceExtraMemoryKey = (uid: string, month: string) => {
    return `${uid}|${month}`;
  };

  const saveAdvanceExtraDiffMemory = (item: AdvanceExtraItem, month = item.month) => {
    if (!item || !month) return;

    const key = getAdvanceExtraMemoryKey(item.uid, month);

    advanceExtraDiffMemory.value[key] = {
      pcsDiff: numberValue(item.pcsDiff),
      kgDiff: numberValue(item.kgDiff),
      amountDiff: numberValue(item.amountDiff)
    };
  };

  const restoreAdvanceExtraDiffMemory = (item: AdvanceExtraItem, month = item.month) => {
    if (!item || !month) return;

    const key = getAdvanceExtraMemoryKey(item.uid, month);
    const saved = advanceExtraDiffMemory.value[key];

    item.pcsDiff = saved ? saved.pcsDiff : 0;
    item.kgDiff = saved ? saved.kgDiff : 0;
    item.amountDiff = saved ? saved.amountDiff : 0;
  };

  const rememberAdvanceListMonth = (index: number) => {
    const item = advanceList.value[index];
    if (!item) return;

    advanceExtraMonthSnapshot.value[item.uid] = item.month;
    saveAdvanceExtraDiffMemory(item, item.month);
  };

  const handleAdvanceListMonthChange = (index: number) => {
    const item = advanceList.value[index];
    if (!item) return;

    const previousMonth = advanceExtraMonthSnapshot.value[item.uid] || '';
    const selectedNewMonth = item.month;

    if (previousMonth) {
      saveAdvanceExtraDiffMemory(item, previousMonth);
    }

    const used = [advanceMonth.value, ...advanceList.value.filter((_, i) => i !== index).map((i) => i.month)].filter(Boolean);

    if (used.includes(selectedNewMonth)) {
      notification.showAlertWarning('Bulan ini sudah dipilih pada advance sebelumnya');

      item.month = previousMonth || '';

      if (item.month) {
        hydrateAdvanceListItem(item);
        restoreAdvanceExtraDiffMemory(item, item.month);
        advanceExtraMonthSnapshot.value[item.uid] = item.month;
      } else {
        resetAdvanceListItemValue(item);
      }

      syncEffectiveDifferenceFromAdvance();
      return;
    }

    hydrateAdvanceListItem(item);
    restoreAdvanceExtraDiffMemory(item, selectedNewMonth);

    item.hint = getCarryForwardAdvanceHint(item.month);

    advanceExtraMonthSnapshot.value[item.uid] = selectedNewMonth;
    syncEffectiveDifferenceFromAdvance();
  };

  const getAdvanceExtraDiffTotal = (field: 'pcs' | 'kg' | 'amount') => {
    return advanceList.value.reduce((total, item) => {
      if (field === 'pcs') {
        return total + numberValue(item.pcsDiff);
      }

      if (field === 'kg') {
        return total + numberValue(item.kgDiff);
      }

      return total + numberValue(item.amountDiff);
    }, 0);
  };

  const getTotalAdvanceDiff = (field: 'pcs' | 'kg' | 'amount') => {
    if (field === 'pcs') {
      return numberValue(advancePcsDiff.value) + getAdvanceExtraDiffTotal('pcs');
    }

    if (field === 'kg') {
      return numberValue(advanceKgDiff.value) + getAdvanceExtraDiffTotal('kg');
    }

    return numberValue(advanceAmountDiff.value) + getAdvanceExtraDiffTotal('amount');
  };

  const syncEffectiveDifferenceFromAdvance = () => {
    if (selectedSchemaHandling.value !== 'advance') return;

    pcsDifference.value = getTotalAdvanceDiff('pcs');
    kgDifference.value = getTotalAdvanceDiff('kg');
    amountDifference.value = getTotalAdvanceDiff('amount');
  };

  /* ==============================
   * SNAPSHOT SCHEMA UNTUK RESET FIELD
   * ============================== */
  const pcsExistingSchemaDiff = ref(0);
  const kgExistingSchemaDiff = ref(0);
  const amountExistingSchemaDiff = ref(0);
  const existingSchemaType = ref<ExistingSchemaType>('none');

  const clearExistingSchemaDiffState = () => {
    pcsExistingSchemaDiff.value = 0;
    kgExistingSchemaDiff.value = 0;
    amountExistingSchemaDiff.value = 0;
    existingSchemaType.value = 'none';
  };

  /* ==============================
   * STATE MODAL DAN FILE PREVIEW
   * ============================== */
  const showMaterialModal = ref(false);
  const scanFile = ref<File | null>(null);
  const showPreview = ref(false);
  const previewUrl = ref('');
  const isImage = ref(false);
  const existingScanFileName = ref('');
  const getAdvanceItemsPayload = (): AdvanceSubmitItem[] => {
    if (selectedSchemaHandling.value !== 'advance') return [];

    const items: AdvanceSubmitItem[] = [
      {
        month: advanceMonth.value,
        pcs_diff: numberValue(advancePcsDiff.value),
        kg_diff: numberValue(advanceKgDiff.value),
        amount_diff: numberValue(advanceAmountDiff.value)
      },
      ...advanceList.value
        .filter((item) => !!item.month)
        .map((item) => ({
          month: item.month,
          pcs_diff: numberValue(item.pcsDiff),
          kg_diff: numberValue(item.kgDiff),
          amount_diff: numberValue(item.amountDiff)
        }))
    ];

    const unique = new Map<string, AdvanceSubmitItem>();

    items.forEach((item) => {
      if (!item.month) return;
      unique.set(item.month, item);
    });

    return [...unique.values()];
  };

  const getAdvancePayloadTotal = (items: AdvanceSubmitItem[], field: 'pcs_diff' | 'kg_diff' | 'amount_diff') => {
    return items.reduce((total, item) => total + numberValue(item[field]), 0);
  };

  /* ==============================
   * STATE VOLUME
   * ============================== */
  const volumeResume = ref<Record<string, any>>({});

  const volumeTotalAll = ref({
    n_1_fc: 0,
    n_1_act: 0,
    n: 0,
    n1: 0,
    n2: 0,
    n3: 0
  });

  /* ==============================
   * CACHE SCHEMA ADT/ADV
   * ============================== */
  const materialSchemaRows = ref<any[]>([]);
  const baseBudgetRows = ref<any[]>([]);
  const currentBaseMonthSchemaMap = ref<Record<string, string[]>>({});

  const monthsWithADTByYear = ref<Record<string, string[]>>({});
  const monthSchemaMapByYear = ref<Record<string, Record<string, string[]>>>({});
  const schemaOwnerMapByYear = ref<Record<string, Record<string, string[]>>>({});

  const isSchemaMetaLoading = ref(false);
  let schemaMetaRequestId = 0;

  /* ==============================
   * SESSION FILTER
   * ============================== */
  const FILTER_KEY = 'budgetMatFilter';
  const savedFilter = ref<FilterData | null>(null);
  const isExcelDisabled = ref(true);

  /* ==============================
   * HELPER FORMAT PERIODE DAN TYPE BUDGET
   * ============================== */
  const normalizePeriode = (value: any) => {
    const clean = String(value ?? '').replace(/\D/g, '');
    return clean.length >= 6 ? clean.slice(0, 6) : '';
  };

  const normalizeYm = (value: any): string => {
    return normalizePeriode(value);
  };

  const formatPeriode = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    return `${year}${month}`;
  };

  const periodeToMonthInput = (periode: string) => {
    const clean = normalizePeriode(periode);
    if (!clean || clean.length !== 6) return '';
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}`;
  };

  const buildTypeBudget = (reportType: string, version: string) => {
    if (!reportType || !version) return '';
    const letter = reportType === 'Original' ? 'R' : 'B';
    return `${letter}${version}`;
  };

  const getSelectedYear = (): string => {
    if (!selectedMonth.value) return '';
    return selectedMonth.value.split('-')[0];
  };

  const getSelectedPeriode = (): string => {
    return formatPeriode(selectedMonth.value);
  };
  type AdvancePickerTarget = 'main' | 'extra';

  const resetAdvanceList = () => {
    advanceList.value = [];
    advanceExtraDiffMemory.value = {};
    advanceExtraMonthSnapshot.value = {};
  };

  const resetAdvanceListItemValue = (item: AdvanceExtraItem) => {
    item.pcsPrev = 0;
    item.kgPrev = 0;
    item.amountPrev = 0;
    item.pcsDiff = 0;
    item.kgDiff = 0;
    item.amountDiff = 0;
  };

  const getUsedAdvanceMonths = (excludeIndex = -1, target: AdvancePickerTarget = 'extra') => {
    if (target === 'main') {
      return advanceList.value.map((item) => item.month).filter((month): month is string => Boolean(month));
    }

    return [advanceMonth.value, ...advanceList.value.filter((_, index) => index !== excludeIndex).map((item) => item.month)].filter(
      (month): month is string => Boolean(month)
    );
  };

  const getNextAvailableAdvanceMonth = (excludeIndex = -1) => {
    const allowed = getAdvanceAllowed();
    const used = getUsedAdvanceMonths(excludeIndex, 'extra');

    return allowed.find((month) => !used.includes(month)) || '';
  };

  const hydrateAdvanceListItem = (item: AdvanceExtraItem) => {
    if (selectedSchemaHandling.value !== 'advance' || !item.month || !selectedModel.value || !selectedName.value) {
      resetAdvanceListItemValue(item);
      item.hint = '';
      return;
    }

    const row = getOriginalBaseRowForBeforeValue();

    if (!row) {
      resetAdvanceListItemValue(item);
      item.hint = 'Row original/base belum tersedia';
      return;
    }

    const slot = getForecastSlotByMonth(item.month, selectedMonth.value);

    if (!slot) {
      resetAdvanceListItemValue(item);
      item.hint = 'Slot forecast tidak tersedia';
      return;
    }

    const values = getForecastValuesByMonth(row, item.month, selectedMonth.value);

    item.pcsPrev = values.pcs;
    item.kgPrev = values.kg;
    item.amountPrev = values.amount;
    item.hint = getCarryForwardAdvanceHint(item.month);
  };

  const canAddAdvanceMonth = computed(() => {
    if (selectedSchemaHandling.value !== 'advance') return false;
    if (!selectedMonth.value) return false;
    if (!effectiveMonth.value) return false;
    if (!advanceMonth.value) return false;

    return !!getNextAvailableAdvanceMonth();
  });

  const addAdvanceMonth = () => {
    const nextMonth = getNextAvailableAdvanceMonth();

    if (!nextMonth) return;

    const item = createAdvanceExtraItem(nextMonth);

    hydrateAdvanceListItem(item);

    item.hint = getCarryForwardAdvanceHint(item.month);

    advanceList.value.push(item);
  };

  const hasAdvanceExtraItemDiff = (item: AdvanceExtraItem) => {
    return isDifferentValue(item.pcsDiff) || isDifferentValue(item.kgDiff) || isDifferentValue(item.amountDiff);
  };

  const removeAdvanceMonthDirect = async (index: number) => {
    if (index < 0 || index >= advanceList.value.length) return;

    const oldId = currentADTId.value;

    advanceList.value.splice(index, 1);
    syncEffectiveDifferenceFromAdvance();
    if (!currentADTId.value || !isReadADT.value) {
      return;
    }

    const success = await doSubmitMaterialHandling({
      keepModalOpen: true,
      silent: true,
      allowZeroDiff: true
    });

    if (!success) return;

    currentADTId.value = oldId;

    await loadBudgetMat();

    const refreshedRow = getAdtRowForSelectedModel() || activeSchemaRow.value;

    if (refreshedRow) {
      activeSchemaRow.value = refreshedRow;
      currentADTId.value = refreshedRow.id ?? oldId;

      applyEffectiveSchemaDelta(refreshedRow);

      if (isAdvanceSchemaRow(refreshedRow)) {
        applyAdvanceSchemaDelta(refreshedRow);
      }
    }

    notification.showAlertSuccess('Advance tambahan berhasil dihapus dan disimpan');
  };

  const removeAdvanceMonth = (index: number) => {
    const item = advanceList.value[index];
    if (!item) return;

    if (hasAdvanceExtraItemDiff(item)) {
      notification.showConfirm(
        'Hapus Advance Tambahan',
        'Advance month tambahan ini memiliki difference. Jika dilanjutkan, data advance tambahan akan dihapus dan disimpan ke database. Apakah Anda yakin?',
        async () => {
          await removeAdvanceMonthDirect(index);
        }
      );

      return;
    }

    removeAdvanceMonthDirect(index);
  };

  const getAdvanceListAfter = (item: AdvanceExtraItem, field: 'pcs' | 'kg' | 'amount') => {
    if (field === 'pcs') {
      return numberValue(item.pcsPrev) - numberValue(item.pcsDiff);
    }

    if (field === 'kg') {
      return numberValue(item.kgPrev) - numberValue(item.kgDiff);
    }

    return numberValue(item.amountPrev) - numberValue(item.amountDiff);
  };

  const updateAdvanceListDiff = (index: number, field: 'pcs' | 'kg' | 'amount', eventOrValue: any) => {
    const item = advanceList.value[index];
    if (!item) return;

    const rawValue = eventOrValue?.target?.value ?? eventOrValue;
    const value = rawValue === '' ? 0 : numberValue(rawValue);

    if (field === 'pcs') {
      item.pcsDiff = value;
    }

    if (field === 'kg') {
      item.kgDiff = value;
    }

    if (field === 'amount') {
      item.amountDiff = value;
    }

    saveAdvanceExtraDiffMemory(item, item.month);
    syncEffectiveDifferenceFromAdvance();
  };

  /* ==============================
   * HELPER ANGKA
   * ============================== */
  const numberValue = (value: any) => {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  const isDifferentValue = (value: any) => {
    return Math.abs(numberValue(value)) > 0.000001;
  };

  /* ==============================
   * NORMALIZER SCHEMA CACHE
   * ============================== */
  const normalizeMonthsWithADT = (raw: any): string[] => {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item: any) => String(item ?? '').replace(/\D/g, ''))
      .filter((item: string) => item.length === 6)
      .filter((item: string, index: number, arr: string[]) => arr.indexOf(item) === index)
      .sort();
  };

  const normalizeMonthSchemaMap = (raw: any): Record<string, string[]> => {
    if (!raw || typeof raw !== 'object') return {};

    const result: Record<string, string[]> = {};

    Object.entries(raw).forEach(([periode, schemas]) => {
      const key = normalizePeriode(periode);
      if (!key || key.length !== 6) return;

      const arr = Array.isArray(schemas) ? schemas : [schemas];

      result[key] = arr
        .map((item: any) =>
          String(item ?? '')
            .toUpperCase()
            .trim()
        )
        .filter((item: string) => item === 'ADT' || item === 'ADV')
        .filter((item: string, index: number, self: string[]) => self.indexOf(item) === index)
        .sort();
    });

    return result;
  };

  const normalizeSchemaOwnerMap = (raw: any): Record<string, string[]> => {
    if (!raw || typeof raw !== 'object') return {};

    const result: Record<string, string[]> = {};

    Object.entries(raw).forEach(([effectivePeriode, owners]) => {
      const effectiveKey = normalizePeriode(effectivePeriode);
      if (!effectiveKey || effectiveKey.length !== 6) return;

      const ownerArray = Array.isArray(owners) ? owners : [owners];

      result[effectiveKey] = ownerArray
        .map((item: any) => normalizePeriode(item))
        .filter((item: string) => item.length === 6)
        .filter((item: string, index: number, self: string[]) => self.indexOf(item) === index)
        .sort();
    });

    return result;
  };

  const setMonthsWithADTForYear = (year: string, raw: any, options?: { preserveIfEmpty?: boolean }) => {
    if (!year) return;

    const nextMonths = normalizeMonthsWithADT(raw);
    const currentMonths = monthsWithADTByYear.value[year] ?? [];
    const preserveIfEmpty = options?.preserveIfEmpty ?? false;

    if (preserveIfEmpty && nextMonths.length === 0 && currentMonths.length > 0) {
      return;
    }

    monthsWithADTByYear.value[year] = nextMonths;
  };

  const getMonthsWithADTForYear = (year?: string): string[] => {
    if (!year) return [];
    return monthsWithADTByYear.value[year] ?? [];
  };

  const setMonthSchemaMapForYear = (year: string, raw: any, options?: { preserveIfEmpty?: boolean }) => {
    if (!year) return;

    const normalized = normalizeMonthSchemaMap(raw);
    const hasIncoming = Object.keys(normalized).length > 0;

    if (!hasIncoming && options?.preserveIfEmpty) {
      return;
    }

    monthSchemaMapByYear.value[year] = normalized;
  };

  const getMonthSchemaMapForYear = (year: string): Record<string, string[]> => {
    if (!year) return {};
    return monthSchemaMapByYear.value[year] || {};
  };

  const setSchemaOwnerMapForYear = (year: string, raw: any, options?: { preserveIfEmpty?: boolean }) => {
    if (!year) return;

    const normalized = normalizeSchemaOwnerMap(raw);
    const hasIncoming = Object.keys(normalized).length > 0;

    if (!hasIncoming && options?.preserveIfEmpty) {
      return;
    }

    schemaOwnerMapByYear.value[year] = normalized;
  };

  const getSchemaOwnerMapForYear = (year: string): Record<string, string[]> => {
    if (!year) return {};
    return schemaOwnerMapByYear.value[year] || {};
  };

  const buildSchemaOwnerMapFromRows = (rows: any[]) => {
    const result: Record<string, string[]> = {};

    const typeBudgetPrefix = buildTypeBudget(selectedReportType.value, selectedVersion.value).slice(0, 3);

    (Array.isArray(rows) ? rows : []).forEach((item: any) => {
      const ketStr = String(item?.ket ?? '')
        .toUpperCase()
        .trim();

      if (!ketStr.endsWith('ADT') && !ketStr.endsWith('ADV')) return;

      const itemKetPrefix = String(item?.ket ?? '').slice(0, 3);
      if (typeBudgetPrefix && itemKetPrefix !== typeBudgetPrefix) return;

      const effective = normalizePeriode(item?.effective_month || item?.month);
      const base = normalizePeriode(item?.base_month || item?.month);

      if (!effective || !base) return;

      if (!result[effective]) {
        result[effective] = [];
      }

      if (!result[effective].includes(base)) {
        result[effective].push(base);
      }
    });

    Object.keys(result).forEach((key) => {
      result[key].sort();
    });

    return result;
  };

  /* ==============================
   * HELPER DOT BULAN
   * ============================== */
  const dotMonthNames = [
    '',
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember'
  ];

  const getDotPeriode = (month: number | string) => {
    const selectedYear = getSelectedYear();
    if (!selectedYear) return '';

    const mm = String(month).padStart(2, '0');
    return `${selectedYear}${mm}`;
  };

  const getMonthLabelFromYm = (periode: string) => {
    const clean = normalizePeriode(periode);

    if (!clean || clean.length !== 6) return '';

    const year = clean.slice(0, 4);
    const month = Number(clean.slice(4, 6));

    return `${dotMonthNames[month] || clean.slice(4, 6)} ${year}`;
  };

  const getSchemaRowsForDotCheck = () => {
    const rows: any[] = [];

    if (Array.isArray(materialSchemaRows.value)) {
      rows.push(...materialSchemaRows.value);
    }

    if (Array.isArray(budgetMat.value)) {
      rows.push(...budgetMat.value);
    }

    const unique = new Map<string, any>();

    rows.forEach((item: any) => {
      const ketStr = String(item?.ket ?? '')
        .toUpperCase()
        .trim();

      if (!ketStr.endsWith('ADT') && !ketStr.endsWith('ADV')) return;

      const key = [
        item?.id ?? '',
        normalizePeriode(item?.base_month || item?.month),
        normalizePeriode(item?.effective_month || item?.month),
        String(item?.ket ?? '').trim(),
        String(item?.model ?? '').trim(),
        String(item?.tipe ?? '').trim(),
        String(item?.name ?? '').trim()
      ].join('|');

      if (!unique.has(key)) {
        unique.set(key, item);
      }
    });

    return [...unique.values()];
  };

  const getAdvanceItemPeriodesFromRow = (row: any) => {
    const raw = row?.advance_items;
    let parsed: any[] = [];

    if (Array.isArray(raw)) {
      parsed = raw;
    } else if (typeof raw === 'string' && raw.trim()) {
      try {
        const json = JSON.parse(raw);
        parsed = Array.isArray(json) ? json : [];
      } catch {
        parsed = [];
      }
    }

    return parsed
      .map((item) => normalizePeriode(item?.month))
      .filter((month: string) => month.length === 6)
      .filter((month: string, index: number, arr: string[]) => arr.indexOf(month) === index);
  };

  const findSchemaRowByBaseAndEffectiveMonth = (basePeriode: string, effectivePeriode: string) => {
    const typeBudgetPrefix = buildTypeBudget(selectedReportType.value, selectedVersion.value).slice(0, 3);

    if (!basePeriode || !effectivePeriode || !typeBudgetPrefix) return null;

    return (
      getSchemaRowsForDotCheck().find((item: any) => {
        const ketStr = String(item?.ket ?? '')
          .toUpperCase()
          .trim();

        const itemBaseMonth = normalizePeriode(item?.base_month || item?.month);
        const itemEffectiveMonth = normalizePeriode(item?.effective_month || item?.month);
        const itemAdvanceItemMonths = getAdvanceItemPeriodesFromRow(item);
        const itemKetPrefix = String(item?.ket ?? '').slice(0, 3);

        const isEffectiveTarget = itemEffectiveMonth === effectivePeriode;
        const isAdvanceTarget = ketStr.endsWith('ADV') && itemAdvanceItemMonths.includes(effectivePeriode);

        return itemBaseMonth === basePeriode && itemKetPrefix === typeBudgetPrefix && (isEffectiveTarget || isAdvanceTarget);
      }) ?? null
    );
  };

  const isDotBelongsToSelectedBaseMonth = (month: number | string) => {
    const selectedBasePeriode = getSelectedPeriode();
    const dotPeriode = getDotPeriode(month);

    if (!selectedBasePeriode || !dotPeriode) return false;

    const rowByBaseMonth = findSchemaRowByBaseAndEffectiveMonth(selectedBasePeriode, dotPeriode);

    if (rowByBaseMonth) return true;

    const baseSchemaMap = currentBaseMonthSchemaMap.value || {};
    const schemas = baseSchemaMap[dotPeriode] || [];

    return schemas.includes('ADT') || schemas.includes('ADV');
  };

  const getDotOwnerBaseCandidates = (month: number | string) => {
    const selectedYear = getSelectedYear();
    const dotPeriode = getDotPeriode(month);

    if (!selectedYear || !dotPeriode) return [];

    const ownerMap = getSchemaOwnerMapForYear(selectedYear);
    const fromOwnerMap = ownerMap[dotPeriode] || [];

    if (fromOwnerMap.length > 0) {
      return fromOwnerMap;
    }

    const typeBudgetPrefix = buildTypeBudget(selectedReportType.value, selectedVersion.value).slice(0, 3);

    const candidates = getSchemaRowsForDotCheck()
      .filter((item: any) => {
        const ketStr = String(item?.ket ?? '')
          .toUpperCase()
          .trim();

        if (!ketStr.endsWith('ADT') && !ketStr.endsWith('ADV')) {
          return false;
        }

        const itemEffectiveMonth = normalizePeriode(item?.effective_month || item?.month);
        const itemAdvanceItemMonths = getAdvanceItemPeriodesFromRow(item);
        const itemKetPrefix = String(item?.ket ?? '').slice(0, 3);

        const isEffectiveTarget = itemEffectiveMonth === dotPeriode;
        const isAdvanceTarget = ketStr.endsWith('ADV') && itemAdvanceItemMonths.includes(dotPeriode);

        return itemKetPrefix === typeBudgetPrefix && (isEffectiveTarget || isAdvanceTarget);
      })
      .map((item: any) => normalizePeriode(item?.base_month || item?.month))
      .filter((periode: string) => periode && periode.length === 6);

    return [...new Set(candidates)];
  };

  const getDotOwnerBasePeriode = (month: number | string) => {
    const selectedBasePeriode = getSelectedPeriode();
    const dotPeriode = getDotPeriode(month);

    if (!dotPeriode) return '';

    const rowForSelectedBase = findSchemaRowByBaseAndEffectiveMonth(selectedBasePeriode, dotPeriode);

    if (rowForSelectedBase) {
      return selectedBasePeriode;
    }

    const baseSchemaMap = currentBaseMonthSchemaMap.value || {};
    const schemas = baseSchemaMap[dotPeriode] || [];

    if (schemas.includes('ADT') || schemas.includes('ADV')) {
      return selectedBasePeriode;
    }

    const candidates = getDotOwnerBaseCandidates(month);

    if (candidates.includes(dotPeriode)) {
      return dotPeriode;
    }

    if (selectedBasePeriode && candidates.includes(selectedBasePeriode)) {
      return selectedBasePeriode;
    }

    const previousOrSame = candidates.filter((periode) => Number(periode) <= Number(dotPeriode)).sort((a, b) => Number(b) - Number(a));

    if (previousOrSame.length > 0) {
      return previousOrSame[0];
    }

    return candidates[0] || dotPeriode;
  };

  const showDotOutsideBaseMonthWarning = (month: number | string) => {
    const dotPeriode = getDotPeriode(month);
    const dotLabel = getMonthLabelFromYm(dotPeriode);

    const ownerBasePeriode = getDotOwnerBasePeriode(month);
    const ownerLabel = getMonthLabelFromYm(ownerBasePeriode);

    if (ownerBasePeriode && dotPeriode && ownerBasePeriode !== dotPeriode) {
      notification.showAlertWarning(
        `Data Material Handling untuk bulan ${dotLabel} dibuat dari base month ${ownerLabel}. Silakan pilih bulan ${ownerLabel} terlebih dahulu untuk melakukan edit`
      );
      return;
    }

    notification.showAlertWarning(
      `Data Material Handling ini terkait dengan bulan ${ownerLabel || dotLabel}. Silakan pilih bulan ${ownerLabel || dotLabel} terlebih dahulu untuk melakukan edit`
    );
  };

  /* ==============================
   * SESSION STORAGE
   * ============================== */
  const loadFilterFromStorage = (): FilterData | null => {
    try {
      const raw = sessionStorage.getItem(FILTER_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed.periode || !parsed.type_budget) return null;

      return parsed as FilterData;
    } catch {
      return null;
    }
  };

  const saveFilterToStorage = (payload: FilterData) => {
    savedFilter.value = payload;
    sessionStorage.setItem(FILTER_KEY, JSON.stringify(payload));
  };

  /* ==============================
   * RESET STATE
   * ============================== */
  const resetForm = () => {
    iaaNo.value = '';
    selectedModel.value = '';
    selectedName.value = '';
    selectedSchemaHandling.value = '';
    effectiveMonth.value = '';
    advanceMonth.value = '';

    pcsDifference.value = null;
    kgDifference.value = null;
    amountDifference.value = null;

    advancePcsDiff.value = null;
    advanceKgDiff.value = null;
    advanceAmountDiff.value = null;

    scanFile.value = null;
    previewUrl.value = '';
    showPreview.value = false;

    clearExistingSchemaDiffState();
    clearCarryForwardHint();
  };

  const resetMaterialHandlingState = () => {
    isReadADT.value = false;
    currentADTId.value = null;
    existingScanFileName.value = '';
    activeSchemaRow.value = null;

    resetForm();
    resetAdvanceList();

    pcsPrev.value = null;
    kgPrev.value = null;
    amountPrev.value = null;

    advancePcsPrev.value = null;
    advanceKgprev.value = null;
    advanceAmountprev.value = null;

    showPreview.value = false;
    previewUrl.value = '';
    scanFile.value = null;
  };

  const clearBudgetMatViewState = () => {
    budgetMat.value = [];
    budgetCal.value = [];
    materialSchemaRows.value = [];
    baseBudgetRows.value = [];
    volumeResume.value = {};
    activeSchemaRow.value = null;
    currentBaseMonthSchemaMap.value = {};

    volumeTotalAll.value = {
      n_1_fc: 0,
      n_1_act: 0,
      n: 0,
      n1: 0,
      n2: 0,
      n3: 0
    };

    includeADT.value = false;
    isExcelDisabled.value = true;

    resetMaterialHandlingState();
    showMaterialModal.value = false;
  };

  /* ==============================
   * COMPUTED FILTER DAN SCHEMA
   * ============================== */
  const isReportTypeDisabled = computed(() => !selectedMonth.value);

  const isVersionDisabled = computed(() => {
    return !selectedMonth.value || !selectedReportType.value;
  });

  const isFilterJsonDisabled = computed(() => {
    return !selectedMonth.value || !selectedReportType.value || !selectedVersion.value;
  });

  const addMonthsToMonthInput = (monthInput: string, add: number) => {
    if (!monthInput) return '';

    const [y, m] = monthInput.split('-').map(Number);
    if (!y || !m) return '';

    const d = new Date(y, m - 1, 1);
    d.setMonth(d.getMonth() + add);

    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');

    return `${yy}-${mm}`;
  };

  const getForecastMaxMonth = () => {
    if (!selectedMonth.value) return '';
    return addMonthsToMonthInput(selectedMonth.value, 3);
  };

  const getEffectiveMaxMonth = (baseMonth = selectedMonth.value) => {
    if (!baseMonth) return '';
    if (selectedSchemaHandling.value === 'advance') {
      return addMonthsToMonthInput(baseMonth, 2);
    }
    return addMonthsToMonthInput(baseMonth, 3);
  };

  const getAdvanceMaxMonth = () => {
    return getForecastMaxMonth();
  };

  const effectiveMinMonth = computed(() => {
    return selectedMonth.value || '';
  });

  const effectiveMaxMonth = computed(() => {
    return getEffectiveMaxMonth(selectedMonth.value);
  });

  const advanceMinMonth = computed(() => {
    if (!effectiveMonth.value) return '';
    return addMonthsToMonthInput(effectiveMonth.value, 1);
  });

  const advanceMaxMonth = computed(() => {
    if (selectedSchemaHandling.value !== 'advance') return '';
    if (!selectedMonth.value || !effectiveMonth.value) return '';

    return getAdvanceMaxMonth();
  });

  const FORECAST_SLOT_ORDER = ['n', 'n1', 'n2', 'n3'];

  const monthsWithADT = computed<string[]>(() => {
    return getMonthsWithADTForYear(getSelectedYear());
  });

  const hasSchemaForSelectedBaseMonthOnly = computed(() => {
    const map = currentBaseMonthSchemaMap.value || {};

    return Object.values(map).some((schemas: any) => {
      const list = Array.isArray(schemas) ? schemas : [];
      return list.includes('ADT') || list.includes('ADV');
    });
  });

  const hasSameBaseSchemaForTargetPeriode = (targetPeriode: string) => {
    const selectedBasePeriode = getSelectedPeriode();
    const cleanTarget = normalizePeriode(targetPeriode);

    if (!selectedBasePeriode || !cleanTarget) return false;

    const typeBudgetPrefix = buildTypeBudget(selectedReportType.value, selectedVersion.value).slice(0, 3);

    if (!typeBudgetPrefix) return false;

    const baseSchemaMap = currentBaseMonthSchemaMap.value || {};
    const schemasFromBaseMap = baseSchemaMap[cleanTarget] || [];

    if (Array.isArray(schemasFromBaseMap) && (schemasFromBaseMap.includes('ADT') || schemasFromBaseMap.includes('ADV'))) {
      return true;
    }

    return getSchemaRowsForDotCheck().some((item: any) => {
      const ketStr = String(item?.ket ?? '')
        .toUpperCase()
        .trim();

      if (!ketStr.endsWith('ADT') && !ketStr.endsWith('ADV')) {
        return false;
      }

      const itemBaseMonth = normalizePeriode(item?.base_month || item?.month);
      const itemEffectiveMonth = normalizePeriode(item?.effective_month || item?.month);
      const itemAdvanceItemMonths = getAdvanceItemPeriodesFromRow(item);
      const itemKetPrefix = String(item?.ket ?? '').slice(0, 3);

      const isEffectiveTarget = itemEffectiveMonth === cleanTarget;

      const isAdvanceTarget = ketStr.endsWith('ADV') && itemAdvanceItemMonths.includes(cleanTarget);

      return itemBaseMonth === selectedBasePeriode && itemKetPrefix === typeBudgetPrefix && (isEffectiveTarget || isAdvanceTarget);
    });
  };

  const joinIndonesianLabels = (labels: string[]) => {
    const cleanLabels = labels.filter(Boolean);

    if (cleanLabels.length === 0) return '';
    if (cleanLabels.length === 1) return cleanLabels[0];
    if (cleanLabels.length === 2) {
      return `${cleanLabels[0]} dan ${cleanLabels[1]}`;
    }

    return `${cleanLabels.slice(0, -1).join(', ')}, dan ${cleanLabels[cleanLabels.length - 1]}`;
  };

  const formatPeriodeListLabel = (periodes: string[]) => {
    const cleanPeriodes = [
      ...new Set(periodes.map((periode) => normalizePeriode(periode)).filter((periode) => periode.length === 6))
    ].sort();

    if (cleanPeriodes.length === 0) return '';

    const years = [...new Set(cleanPeriodes.map((periode) => periode.slice(0, 4)))];

    if (years.length === 1) {
      const monthLabels = cleanPeriodes.map((periode) => {
        const month = Number(periode.slice(4, 6));
        return dotMonthNames[month] || periode.slice(4, 6);
      });

      return `${joinIndonesianLabels(monthLabels)} ${years[0]}`;
    }

    return joinIndonesianLabels(cleanPeriodes.map((periode) => getMonthLabelFromYm(periode)));
  };

  const getReportWindowPeriodes = (baseMonthInput = selectedMonth.value) => {
    if (!baseMonthInput) return [];

    return FORECAST_SLOT_ORDER.map((_, index) => {
      return formatPeriode(addMonthsToMonthInput(baseMonthInput, index));
    })
      .map((periode) => normalizePeriode(periode))
      .filter((periode) => periode.length === 6);
  };

  const getCarryForwardSchemaTypesForTarget = (targetPeriode: string, ownerPeriodes: string[]) => {
    const cleanTarget = normalizePeriode(targetPeriode);

    const cleanOwners = ownerPeriodes.map((owner) => normalizePeriode(owner)).filter((owner) => owner.length === 6);

    const typeBudgetPrefix = buildTypeBudget(selectedReportType.value, selectedVersion.value).slice(0, 3);

    const schemaTypes = new Set<string>();

    if (!cleanTarget || !cleanOwners.length || !typeBudgetPrefix) {
      return [];
    }

    getSchemaRowsForDotCheck().forEach((item: any) => {
      const ketStr = String(item?.ket ?? '')
        .toUpperCase()
        .trim();

      if (!ketStr.endsWith('ADT') && !ketStr.endsWith('ADV')) return;

      const itemBaseMonth = normalizePeriode(item?.base_month || item?.month);
      const itemKetPrefix = String(item?.ket ?? '').slice(0, 3);

      if (!cleanOwners.includes(itemBaseMonth)) return;
      if (itemKetPrefix !== typeBudgetPrefix) return;

      const itemEffectiveMonth = normalizePeriode(item?.effective_month || item?.month);
      const itemAdvanceItemMonths = getAdvanceItemPeriodesFromRow(item);

      const isEffectiveTarget = itemEffectiveMonth === cleanTarget;

      const isAdvanceTarget = ketStr.endsWith('ADV') && itemAdvanceItemMonths.includes(cleanTarget);

      if (!isEffectiveTarget && !isAdvanceTarget) return;

      if (ketStr.endsWith('ADT')) schemaTypes.add('ADT');
      if (ketStr.endsWith('ADV')) schemaTypes.add('ADV');
    });

    return [...schemaTypes];
  };

  const getCarryForwardSchemaInfo = (targetMonth?: string) => {
    const selectedYear = getSelectedYear();
    const selectedBaseInput = targetMonth || selectedMonth.value;
    const selectedBasePeriode = selectedBaseInput ? formatPeriode(selectedBaseInput) : getSelectedPeriode();

    if (!selectedYear || !selectedBasePeriode) return null;

    const ownerMap = getSchemaOwnerMapForYear(selectedYear);
    const schemaMap = getMonthSchemaMapForYear(selectedYear);

    const affectedPeriodes: string[] = [];
    const ownerSet = new Set<string>();
    const schemaSet = new Set<string>();

    const reportWindowPeriodes = getReportWindowPeriodes(selectedBaseInput);

    reportWindowPeriodes.forEach((targetPeriode) => {
      const cleanTarget = normalizePeriode(targetPeriode);

      if (!cleanTarget) return;

      if (hasSameBaseSchemaForTargetPeriode(cleanTarget)) {
        return;
      }

      const owners = (ownerMap[cleanTarget] || [])
        .map((owner) => normalizePeriode(owner))
        .filter((owner) => {
          return owner && owner !== selectedBasePeriode && Number(owner) < Number(selectedBasePeriode);
        })
        .sort((a, b) => Number(b) - Number(a));

      if (!owners.length) return;

      const schemaTypesFromRows = getCarryForwardSchemaTypesForTarget(cleanTarget, owners);

      const schemaTypes = schemaTypesFromRows.length ? schemaTypesFromRows : schemaMap[cleanTarget] || [];

      if (!schemaTypes.length) return;

      affectedPeriodes.push(cleanTarget);

      owners.forEach((owner) => ownerSet.add(owner));

      schemaTypes.forEach((schemaType) => {
        if (schemaType === 'ADT' || schemaType === 'ADV') {
          schemaSet.add(schemaType);
        }
      });
    });

    if (!affectedPeriodes.length) return null;

    const labels: string[] = [];

    if (schemaSet.has('ADT')) labels.push('Additional');
    if (schemaSet.has('ADV')) labels.push('Advance');

    return {
      selectedLabel: getMonthLabelFromYm(selectedBasePeriode),
      affectedLabel: formatPeriodeListLabel(affectedPeriodes),
      ownerLabel: formatPeriodeListLabel([...ownerSet]),
      schemaLabel: labels.join(' / ')
    };
  };

  const isSelectedMonthHasADT = computed(() => {
    if (!selectedMonth.value) return false;

    const selectedYear = getSelectedYear();
    const selectedPeriode = getSelectedPeriode();

    if (!selectedYear || !selectedPeriode) return false;

    if (hasSchemaForSelectedBaseMonthOnly.value) return true;

    const schemaMap = getMonthSchemaMapForYear(selectedYear);
    const schemas = schemaMap[selectedPeriode] || [];

    return schemas.includes('ADT') || schemas.includes('ADV');
  });

  const getSelectedBaseSchemaEffectivePeriodes = () => {
    const selectedBasePeriode = getSelectedPeriode();

    if (!selectedBasePeriode) return [];

    const result = new Set<string>();
    const map = currentBaseMonthSchemaMap.value || {};

    Object.entries(map).forEach(([effectivePeriode, schemas]) => {
      const cleanEffective = normalizePeriode(effectivePeriode);
      const schemaList = Array.isArray(schemas) ? schemas : [];
      const hasSchema = schemaList.includes('ADT') || schemaList.includes('ADV');

      if (cleanEffective && hasSchema) {
        result.add(cleanEffective);
      }
    });

    const typeBudgetPrefix = buildTypeBudget(selectedReportType.value, selectedVersion.value).slice(0, 3);

    getSchemaRowsForDotCheck().forEach((item: any) => {
      const ketStr = String(item?.ket ?? '')
        .toUpperCase()
        .trim();

      if (!ketStr.endsWith('ADT') && !ketStr.endsWith('ADV')) return;

      const itemBaseMonth = normalizePeriode(item?.base_month || item?.month);
      const itemEffectiveMonth = normalizePeriode(item?.effective_month || item?.month);
      const itemKetPrefix = String(item?.ket ?? '').slice(0, 3);

      const itemAdvanceItemMonths = getAdvanceItemPeriodesFromRow(item);

      if (itemBaseMonth === selectedBasePeriode && itemKetPrefix === typeBudgetPrefix) {
        if (itemEffectiveMonth) {
          result.add(itemEffectiveMonth);
        }

        if (ketStr.endsWith('ADV')) {
          itemAdvanceItemMonths.forEach((month) => result.add(month));
        }
      }
    });

    return [...result].sort();
  };

  const monthsForSelectedYear = computed<number[]>(() => {
    const selectedYear = getSelectedYear();
    const months = getMonthsWithADTForYear(selectedYear);

    if (!selectedYear || !months.length) return [];

    return months
      .map((periode: string) => String(periode ?? '').replace(/\D/g, ''))
      .filter((periode: string) => periode.length === 6)
      .filter((periode: string) => periode.startsWith(selectedYear))
      .map((periode: string) => Number(periode.slice(4, 6)))
      .filter((month: number) => !Number.isNaN(month) && month >= 1 && month <= 12)
      .filter((month: number, index: number, arr: number[]) => arr.indexOf(month) === index)
      .sort((a: number, b: number) => a - b);
  });

  const canApplyMaterialSchema = computed(() => {
    if (isExcelDisabled.value) return false;
    if (!selectedMonth.value) return false;

    const selectedYear = getSelectedYear();
    const selectedPeriode = getSelectedPeriode();

    if (!selectedYear || !selectedPeriode) return false;

    if (hasSchemaForSelectedBaseMonthOnly.value) return true;

    const schemaMap = getMonthSchemaMapForYear(selectedYear);
    const schemas = schemaMap[selectedPeriode] || [];

    return schemas.includes('ADT') || schemas.includes('ADV');
  });

  const getFirstSchemaEffectiveMonthForSelectedBase = () => {
    const selectedBasePeriode = getSelectedPeriode();
    const effectiveMonths = getSelectedBaseSchemaEffectivePeriodes();

    if (!effectiveMonths.length) return '';

    if (selectedBasePeriode && effectiveMonths.includes(selectedBasePeriode)) {
      return selectedBasePeriode;
    }

    return effectiveMonths[0] || '';
  };

  /* ==============================
   * COMPUTED DROPDOWN MATERIAL HANDLING
   * ============================== */
  const isSchemaRow = (item: any) => {
    const ket = String(item?.ket ?? '')
      .toUpperCase()
      .trim();
    return ket.endsWith('ADT') || ket.endsWith('ADV');
  };

  const getOptionMonth = (item: any) => {
    if (isSchemaRow(item)) {
      return normalizePeriode(item.base_month || item.month);
    }

    return normalizePeriode(item.month);
  };

  const modelOptions = computed(() => {
    const unique = new Map();
    const month = formatPeriode(selectedMonth.value);
    const typeBudgetPrefix = buildTypeBudget(selectedReportType.value, selectedVersion.value).slice(0, 3);

    budgetMat.value
      .filter((item) => getOptionMonth(item) === month)
      .filter((item) => String(item.ket || '').slice(0, 3) === typeBudgetPrefix)
      .forEach((item) => {
        const model = String(item.model || '').trim();

        if (model && !unique.has(model)) {
          unique.set(model, {
            model,
            label: model
          });
        }
      });

    const currentModel = String(selectedModel.value || '').trim();

    if (currentModel && !unique.has(currentModel)) {
      unique.set(currentModel, {
        model: currentModel,
        label: currentModel
      });
    }

    return [...unique.values()];
  });

  const nameOptions = computed(() => {
    const unique = new Map();
    const month = formatPeriode(selectedMonth.value);
    const typeBudgetPrefix = buildTypeBudget(selectedReportType.value, selectedVersion.value).slice(0, 3);

    const currentModel = String(selectedModel.value || '').trim();

    budgetMat.value
      .filter((item) => getOptionMonth(item) === month)
      .filter((item) => String(item.ket || '').slice(0, 3) === typeBudgetPrefix)
      .filter((item) => String(item.model || '').trim() === currentModel)
      .forEach((item) => {
        const name = String(item.name || '').trim();

        if (name && !unique.has(name)) {
          unique.set(name, {
            value: name,
            label: name
          });
        }
      });

    const currentName = String(selectedName.value || '').trim();

    if (currentName && !unique.has(currentName)) {
      unique.set(currentName, {
        value: currentName,
        label: currentName
      });
    }

    return [...unique.values()];
  });

  /* ==============================
   * HELPER FORECAST MATERIAL HANDLING
   * ============================== */
  const getMonthIndex = (month: string, base: string) => {
    if (!month || !base) return -1;

    const diff = (new Date(month + '-01').getTime() - new Date(base + '-01').getTime()) / (1000 * 60 * 60 * 24 * 30);

    return Math.round(diff);
  };
  const getAdvanceAllowed = () => {
    if (!effectiveMonth.value || !selectedMonth.value) return [];

    const baseIndex = getMonthIndex(effectiveMonth.value, selectedMonth.value);

    const maxIndex = 3;

    const result = [];

    for (let i = baseIndex + 1; i <= maxIndex; i++) {
      result.push(addMonthsToMonthInput(selectedMonth.value, i));
    }

    return result;
  };

  const getMonthIndexFromEffectiveMonth = (effective: string, start: string) => {
    if (!effective || !start) return -1;

    const [ey, em] = effective.split('-').map(Number);
    const [sy, sm] = start.split('-').map(Number);

    return (ey - sy) * 12 + (em - sm);
  };

  const getForecastSlotByMonth = (targetMonth: string, startMonth: string) => {
    const idx = getMonthIndexFromEffectiveMonth(targetMonth, startMonth);

    const slotMap: Record<number, { pcs: string; kg: string; amount: string }> = {
      0: {
        pcs: 'n_pcs_forecast',
        kg: 'n_kg_forecast',
        amount: 'n_amount_forecast'
      },
      1: {
        pcs: 'n1_pcs_forecast',
        kg: 'n1_kg_forecast',
        amount: 'n1_amount_forecast'
      },
      2: {
        pcs: 'n2_pcs_forecast',
        kg: 'n2_kg_forecast',
        amount: 'n2_amount_forecast'
      },
      3: {
        pcs: 'n3_pcs_forecast',
        kg: 'n3_kg_forecast',
        amount: 'n3_amount_forecast'
      }
    };

    return slotMap[idx] || null;
  };

  const getForecastValuesByMonth = (row: any, targetMonth: string, startMonth: string) => {
    const slot = getForecastSlotByMonth(targetMonth, startMonth);

    if (!slot || !row) {
      return {
        pcs: 0,
        kg: 0,
        amount: 0
      };
    }

    return {
      pcs: numberValue(row?.[slot.pcs]),
      kg: numberValue(row?.[slot.kg]),
      amount: numberValue(row?.[slot.amount])
    };
  };

  const pcsPrevAdjusted = computed(() => {
    const base = pcsPrev.value ?? 0;

    const isCKD = selectedName.value?.includes('CKD');

    return isCKD ? base / 2 : base;
  });

  const clearAdvanceFields = (isAdvance = false) => {
    if (isAdvance) {
      advancePcsPrev.value = null;
      advanceKgprev.value = null;
      advanceAmountprev.value = null;
    } else {
      pcsPrev.value = null;
      kgPrev.value = null;
      amountPrev.value = null;
    }
  };

  const getOriginalBudgetRowForSchemaRow = (schemaRow: any) => {
    if (!schemaRow) return null;

    const baseMonth = normalizePeriode(schemaRow.base_month || selectedMonth.value);
    const ketPrefix = String(schemaRow.ket ?? '').slice(0, 3);

    const model = String(schemaRow.model ?? '').trim();
    const name = String(schemaRow.name ?? '').trim();
    const tipe = String(schemaRow.tipe ?? '').trim();

    const findOriginal = (rows: any[]) => {
      return (
        rows.find((item: any) => {
          const ketStr = String(item.ket ?? '')
            .toUpperCase()
            .trim();

          return (
            normalizePeriode(item.month) === baseMonth &&
            String(item.ket ?? '').slice(0, 3) === ketPrefix &&
            String(item.model ?? '').trim() === model &&
            String(item.name ?? '').trim() === name &&
            String(item.tipe ?? '').trim() === tipe &&
            !ketStr.endsWith('ADT') &&
            !ketStr.endsWith('ADV')
          );
        }) ?? null
      );
    };

    return findOriginal(baseBudgetRows.value) || findOriginal(budgetMat.value);
  };

  const removeSchemaSuffix = (ket: any) => {
    return String(ket ?? '').replace(/(ADT|ADV)$/i, '');
  };

  const isSameCurrentModelNameRow = (item: any) => {
    const month = formatPeriode(selectedMonth.value);
    const typeBudgetPrefix = buildTypeBudget(selectedReportType.value, selectedVersion.value).slice(0, 3);

    const model = String(selectedModel.value ?? '').trim();
    const name = String(selectedName.value ?? '').trim();

    if (!month || !model || !name || !typeBudgetPrefix) return false;

    const itemKet = removeSchemaSuffix(item?.ket);
    const itemMonth = getOptionMonth(item);

    return (
      normalizePeriode(itemMonth) === month &&
      String(item?.model ?? '').trim() === model &&
      String(item?.name ?? '').trim() === name &&
      itemKet.slice(0, 3) === typeBudgetPrefix
    );
  };

  const getOriginalBudgetRowByModelAndName = () => {
    const findOriginal = (rows: any[]) => {
      return (
        rows.find((item: any) => {
          const ketStr = String(item?.ket ?? '')
            .toUpperCase()
            .trim();

          return isSameCurrentModelNameRow(item) && !ketStr.endsWith('ADT') && !ketStr.endsWith('ADV');
        }) ?? null
      );
    };

    return findOriginal(baseBudgetRows.value) || findOriginal(budgetMat.value);
  };

  const getOriginalBaseRowForBeforeValue = () => {
    const schemaRow = activeSchemaRow.value || getAdtRowForSelectedModel();

    if (schemaRow) {
      return getOriginalBudgetRowForSchemaRow(schemaRow) || getOriginalBudgetRowByModelAndName();
    }

    return getOriginalBudgetRowByModelAndName();
  };

  const fillForecastFields = (targetMonth: string, prefixMonth: string, isAdvance = false) => {
    const row = getOriginalBaseRowForBeforeValue();

    if (!row) {
      clearAdvanceFields(isAdvance);
      return 'Row original/base belum tersedia';
    }

    const slot = getForecastSlotByMonth(targetMonth, prefixMonth);

    if (!slot) {
      clearAdvanceFields(isAdvance);
      return 'Slot forecast tidak tersedia';
    }

    const pcs = numberValue(row?.[slot.pcs]);
    const kg = numberValue(row?.[slot.kg]);
    const amount = numberValue(row?.[slot.amount]);

    if (isAdvance) {
      advancePcsPrev.value = pcs;
      advanceKgprev.value = kg;
      advanceAmountprev.value = amount;
    } else {
      pcsPrev.value = pcs;
      kgPrev.value = kg;
      amountPrev.value = amount;
    }

    return null;
  };

  const applyEffectiveSchemaDelta = (schemaRow: any) => {
    if (!schemaRow) {
      clearExistingSchemaDiffState();
      return;
    }

    const targetMonth = effectiveMonth.value || selectedMonth.value;
    const targetPeriode = formatPeriode(targetMonth);
    const startMonth = selectedMonth.value;

    const selectedBasePeriode = getSelectedPeriode();
    const schemaBasePeriode = normalizePeriode(schemaRow?.base_month || schemaRow?.month);

    const isCarryForwardSource = !!selectedBasePeriode && !!schemaBasePeriode && schemaBasePeriode !== selectedBasePeriode;

    const originalRow = isCarryForwardSource
      ? getOriginalBudgetRowByModelAndName()
      : getOriginalBudgetRowForSchemaRow(schemaRow) || getOriginalBudgetRowByModelAndName();

    if (!originalRow) {
      notification.showAlertWarning('Row original/base month tidak ditemukan. Nilai Before belum bisa dibandingkan dengan schema');

      pcsPrev.value = 0;
      kgPrev.value = 0;
      amountPrev.value = 0;

      pcsDifference.value = 0;
      kgDifference.value = 0;
      amountDifference.value = 0;

      clearExistingSchemaDiffState();
      return;
    }

    const original = getForecastValuesByMonth(originalRow, targetMonth, startMonth);

    const ketStr = String(schemaRow.ket ?? '')
      .toUpperCase()
      .trim();

    if (ketStr.endsWith('ADT')) {
      existingSchemaType.value = 'additional';
    } else if (ketStr.endsWith('ADV')) {
      existingSchemaType.value = 'advance';
    } else {
      existingSchemaType.value = 'none';
    }

    pcsPrev.value = original.pcs;
    kgPrev.value = original.kg;
    amountPrev.value = original.amount;

    let pcsDiff = 0;
    let kgDiff = 0;
    let amountDiff = 0;

    const savedAdditionalDiff = parseAdditionalDiff(schemaRow);

    if (savedAdditionalDiff) {
      pcsDifference.value = numberValue(savedAdditionalDiff.pcs_diff);
      kgDifference.value = numberValue(savedAdditionalDiff.kg_diff);
      amountDifference.value = numberValue(savedAdditionalDiff.amount_diff);

      pcsExistingSchemaDiff.value = pcsDifference.value;
      kgExistingSchemaDiff.value = kgDifference.value;
      amountExistingSchemaDiff.value = amountDifference.value;

      return;
    }

    if (isCarryForwardSource) {
      const delta = getSchemaSignedDelta(schemaRow, targetPeriode);

      pcsDiff = numberValue(delta?.pcs);
      kgDiff = numberValue(delta?.kg);
      amountDiff = numberValue(delta?.amount);
    } else {
      const current = getForecastValuesByMonth(schemaRow, targetMonth, startMonth);

      pcsDiff = current.pcs - original.pcs;
      kgDiff = current.kg - original.kg;
      amountDiff = current.amount - original.amount;
    }

    pcsDifference.value = pcsDiff;
    kgDifference.value = kgDiff;
    amountDifference.value = amountDiff;

    pcsExistingSchemaDiff.value = pcsDiff;
    kgExistingSchemaDiff.value = kgDiff;
    amountExistingSchemaDiff.value = amountDiff;
  };

  const isAdvanceSchemaRow = (row: any) => {
    return String(row?.ket ?? '')
      .toUpperCase()
      .trim()
      .endsWith('ADV');
  };

  const resetAdvanceDiffFields = () => {
    advancePcsDiff.value = 0;
    advanceKgDiff.value = 0;
    advanceAmountDiff.value = 0;
  };

  const applyAdvanceSchemaDelta = (schemaRow: any) => {
    isHydratingAdvanceSchema.value = true;

    resetAdvanceList();

    if (!schemaRow || !isAdvanceSchemaRow(schemaRow)) {
      clearAdvanceFields(true);
      resetAdvanceDiffFields();

      setTimeout(() => {
        isHydratingAdvanceSchema.value = false;
      }, 0);

      return;
    }

    const baseInputMonth = periodeToMonthInput(normalizePeriode(schemaRow.base_month || selectedMonth.value));

    const originalRow = getOriginalBudgetRowForSchemaRow(schemaRow);

    if (!originalRow) {
      clearAdvanceFields(true);
      resetAdvanceDiffFields();
      advanceHint.value = 'Row original untuk histori advance tidak ditemukan.';

      setTimeout(() => {
        isHydratingAdvanceSchema.value = false;
      }, 0);

      return;
    }

    const items = parseAdvanceItemsFromSchemaRow(schemaRow);

    if (items.length === 0) {
      clearAdvanceFields(true);
      resetAdvanceDiffFields();
      advanceHint.value = 'Advance items belum tersedia pada data ADV.';

      setTimeout(() => {
        isHydratingAdvanceSchema.value = false;
      }, 0);

      return;
    }

    const hydrateItem = (item: AdvanceSubmitItem): AdvanceExtraItem => {
      const original = getForecastValuesByMonth(originalRow, item.month, baseInputMonth);

      let pcsDiff = numberValue(item.pcs_diff);
      let kgDiff = numberValue(item.kg_diff);
      let amountDiff = numberValue(item.amount_diff);

      const hasSavedDiff = isDifferentValue(pcsDiff) || isDifferentValue(kgDiff) || isDifferentValue(amountDiff);

      if (!hasSavedDiff) {
        const current = getForecastValuesByMonth(schemaRow, item.month, baseInputMonth);

        pcsDiff = original.pcs - current.pcs;
        kgDiff = original.kg - current.kg;
        amountDiff = original.amount - current.amount;
      }

      return {
        uid: `schema-${schemaRow.id}-${item.month}-${Math.random().toString(16).slice(2)}`,
        month: item.month,
        pcsPrev: numberValue(original.pcs),
        kgPrev: numberValue(original.kg),
        amountPrev: numberValue(original.amount),
        pcsDiff,
        kgDiff,
        amountDiff,
        hint: getCarryForwardAdvanceHint(item.month)
      };
    };

    const mainItem = hydrateItem(items[0]);
    const extraItems = items.slice(1).map((item) => hydrateItem(item));

    advanceMonth.value = mainItem.month;

    advancePcsPrev.value = mainItem.pcsPrev;
    advanceKgprev.value = mainItem.kgPrev;
    advanceAmountprev.value = mainItem.amountPrev;

    advancePcsDiff.value = mainItem.pcsDiff;
    advanceKgDiff.value = mainItem.kgDiff;
    advanceAmountDiff.value = mainItem.amountDiff;

    advanceList.value.splice(0, advanceList.value.length, ...extraItems);

    advanceList.value.forEach((item) => {
      advanceExtraMonthSnapshot.value[item.uid] = item.month;
      saveAdvanceExtraDiffMemory(item, item.month);
    });

    advanceHint.value = getCarryForwardAdvanceHint(mainItem.month);

    syncEffectiveDifferenceFromAdvance();

    setTimeout(() => {
      isHydratingAdvanceSchema.value = false;
    }, 0);
  };

  /* ==============================
   * RESET DAN DISABLED CONTROL
   * ============================== */
  const hasExistingAdditionalSchema = computed(() => {
    return !!currentADTId.value && isReadADT.value && activeSchemaRow.value !== null && existingSchemaType.value === 'additional';
  });
  const isPcsResetActive = computed(() => {
    if (hasExistingAdvanceSchema.value) {
      return isAdvanceFieldResetActive('pcs');
    }

    return hasExistingAdditionalSchema.value && isDifferentValue(pcsExistingSchemaDiff.value);
  });

  const isKgResetActive = computed(() => {
    if (hasExistingAdvanceSchema.value) {
      return isAdvanceFieldResetActive('kg');
    }

    return hasExistingAdditionalSchema.value && isDifferentValue(kgExistingSchemaDiff.value);
  });

  const isAmountResetActive = computed(() => {
    if (hasExistingAdvanceSchema.value) {
      return isAdvanceFieldResetActive('amount');
    }

    return hasExistingAdditionalSchema.value && isDifferentValue(amountExistingSchemaDiff.value);
  });

  const isPcsResetDisabled = computed(() => !isPcsResetActive.value);
  const isKgResetDisabled = computed(() => !isKgResetActive.value);
  const isAmountResetDisabled = computed(() => !isAmountResetActive.value);

  /* ==============================
   * PRINT A4 LANDSCAPE
   * ============================== */

  /* ==============================
   * PRINT A4 LANDSCAPE - FINAL
   * ============================== */

  /* ==============================
   * PRINT FONT HELPER
   * ============================== */

  const getPoppinsFontFaceCss = (): string => {
    const rules: string[] = [];

    Array.from(document.styleSheets).forEach((styleSheet) => {
      try {
        const cssRules = Array.from(styleSheet.cssRules || []);

        cssRules.forEach((rule) => {
          /*
           * Kita hanya membutuhkan @font-face
           * yang mendefinisikan Poppins.
           */
          if (rule instanceof CSSFontFaceRule && rule.cssText.toLowerCase().includes('poppins')) {
            rules.push(rule.cssText);
          }
        });
      } catch {
        /*
         * Stylesheet cross-origin terkadang tidak boleh
         * dibaca browser.
         *
         * Abaikan saja.
         */
      }
    });

    return rules.join('\n');
  };

  const printA4 = async (): Promise<void> => {
    if (!requireBudgetMaterialPermission('download', 'Download/Print')) return;

    const source = document.getElementById('printArea');

    if (!source) {
      console.error('Element #printArea tidak ditemukan.');

      notification.showAlertError('Area print tidak ditemukan.');

      return;
    }

    /* ==============================
     * KONFIGURASI PRINT
     * ============================== */

    const PRINT_DESIGN_WIDTH = 1190;

    /* ==============================
     * FONT PRINT
     * ============================== */

    const poppinsFontFaceCss = getPoppinsFontFaceCss();

    const FRAME_ID = 'budget-material-print-frame';

    const STAGE_ID = 'budget-material-print-stage';

    /* ==============================
     * 1. BERSIHKAN PRINT SEBELUMNYA
     * ============================== */

    document.getElementById(FRAME_ID)?.remove();

    document.getElementById(STAGE_ID)?.remove();

    /* ==============================
     * 2. STAGING AREA
     * ============================== */

    const stage = document.createElement('div');

    stage.id = STAGE_ID;

    Object.assign(stage.style, {
      position: 'fixed',
      left: '-100000px',
      top: '0',
      width: `${PRINT_DESIGN_WIDTH}px`,
      height: 'auto',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '-99999',
      overflow: 'visible',
      background: '#ffffff'
    });

    document.body.appendChild(stage);

    /* ==============================
     * 3. CLONE KE STAGING
     * ============================== */

    const stagedSource = source.cloneNode(true) as HTMLElement;

    stagedSource.id = 'printArea';

    stagedSource.style.setProperty('width', `${PRINT_DESIGN_WIDTH}px`, 'important');

    stagedSource.style.setProperty('min-width', '0', 'important');

    stagedSource.style.setProperty('max-width', 'none', 'important');

    stagedSource.style.setProperty('height', 'auto', 'important');

    stagedSource.style.setProperty('max-height', 'none', 'important');

    stagedSource.style.setProperty('margin', '0', 'important');

    stagedSource.style.setProperty('padding', '0', 'important');

    stagedSource.style.setProperty('position', 'static', 'important');

    stagedSource.style.setProperty('overflow', 'visible', 'important');

    stagedSource.style.setProperty('transform', 'none', 'important');

    stagedSource.style.setProperty('background', '#ffffff', 'important');

    stage.appendChild(stagedSource);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    /* ==============================
     * 4. BUAT IFRAME PRINT
     * ============================== */

    const iframe = document.createElement('iframe');

    iframe.id = FRAME_ID;

    iframe.setAttribute('aria-hidden', 'true');

    Object.assign(iframe.style, {
      position: 'fixed',
      left: '-100000px',
      top: '0',
      width: '1px',
      height: '1px',
      border: '0',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '-99999'
    });

    document.body.appendChild(iframe);

    const printWindow = iframe.contentWindow;

    const printDocument = iframe.contentDocument;

    if (!printWindow || !printDocument) {
      stage.remove();
      iframe.remove();

      notification.showAlertError('Print frame gagal dibuat.');

      return;
    }

    /* ==============================
     * 5. HTML KHUSUS PRINT
     * ============================== */

    printDocument.open();

    printDocument.write(`
  <!DOCTYPE html>

  <html>
    <head>
      <meta charset="UTF-8" />

      <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
      />

      <base href="${document.baseURI}" />

      <title>Budget Material</title>

      <style>

        /* ==============================
        * FONT POPPINS
        * ============================== */

        ${poppinsFontFaceCss}


        @page {
          size: A4 landscape;
          margin: -4mm 3mm -3mm 3mm;
        }

        html,
        body {
          margin: 0;
          padding: 0;

          width: 100%;
          height: 100%;

          background: #ffffff;

          overflow: visible;

          font-family: 'Poppins', sans-serif !important;

          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        #budget-print-page {
          position: relative;

          width: 297mm;
          height: 221mm;
          margin: 0;
          padding: 0;

          overflow: hidden;

          box-sizing: border-box;

          background: #ffffff;

          font-family: 'Poppins', sans-serif !important;
        }

        #budget-print-scale {
          position: absolute;

          top: 0;
          left: 0;

          margin: 0;
          padding: 0;

          transform-origin: top left;

          font-family: 'Poppins', sans-serif !important;
        }

        #budget-print-scale,
        #budget-print-scale * {
          font-family: 'Poppins', sans-serif !important;

          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;

          box-sizing: border-box;
        }
      </style>
    </head>

    <body>
      <div id="budget-print-page">
        <div id="budget-print-scale"></div>
      </div>
    </body>
  </html>
`);

    printDocument.close();

    /* ==============================
     * 6. CLONE FINAL
     * ============================== */

    const printClone = stagedSource.cloneNode(true) as HTMLElement;

    const scaleContainer = printDocument.getElementById('budget-print-scale') as HTMLElement | null;

    const printPage = printDocument.getElementById('budget-print-page') as HTMLElement | null;

    if (!scaleContainer || !printPage) {
      stage.remove();
      iframe.remove();

      notification.showAlertError('Container print tidak ditemukan.');

      return;
    }

    scaleContainer.appendChild(printClone);

    /* ==============================
     * 7. COPY COMPUTED STYLE
     * ============================== */

    const copyComputedStyle = (sourceElement: Element, targetElement: HTMLElement): void => {
      const computed = window.getComputedStyle(sourceElement);

      for (let index = 0; index < computed.length; index++) {
        const property = computed.item(index);

        if (!property) continue;

        /*
         * Jangan copy property ini.
         * Bisa membuat clone tersembunyi.
         */
        if (property === 'visibility' || property === 'opacity') {
          continue;
        }

        const value = computed.getPropertyValue(property);

        const priority = computed.getPropertyPriority(property);

        try {
          targetElement.style.setProperty(property, value, priority);
        } catch {
          // Abaikan browser-specific property.
        }
      }
    };

    copyComputedStyle(stagedSource, printClone);

    const stagedChildren = Array.from(stagedSource.querySelectorAll<HTMLElement>('*'));

    const printChildren = Array.from(printClone.querySelectorAll<HTMLElement>('*'));

    stagedChildren.forEach((sourceChild, index) => {
      const targetChild = printChildren[index];

      if (!targetChild) return;

      copyComputedStyle(sourceChild, targetChild);
    });

    /* ==============================
     * 7A. FORCE POPPINS SETELAH COPY COMPUTED STYLE
     * ============================== */

    const PRINT_FONT = "'Poppins', sans-serif";

    /*
     * Root clone.
     */
    printClone.style.setProperty('font-family', PRINT_FONT, 'important');

    /*
     * Semua descendant.
     */
    printClone.querySelectorAll<HTMLElement>('*').forEach((element) => {
      element.style.setProperty('font-family', PRINT_FONT, 'important');
    });

    /* ==============================
     * 8. NORMALISASI ROOT
     * ============================== */

    printClone.style.setProperty('visibility', 'visible', 'important');

    printClone.style.setProperty('opacity', '1', 'important');

    printClone.style.setProperty('width', `${PRINT_DESIGN_WIDTH}px`, 'important');

    printClone.style.setProperty('min-width', '0', 'important');

    printClone.style.setProperty('max-width', 'none', 'important');

    printClone.style.setProperty('height', 'auto', 'important');

    printClone.style.setProperty('max-height', 'none', 'important');

    printClone.style.setProperty('margin', '0', 'important');

    printClone.style.setProperty('padding', '0', 'important');

    printClone.style.setProperty('position', 'static', 'important');

    printClone.style.setProperty('overflow', 'visible', 'important');

    printClone.style.setProperty('transform', 'none', 'important');

    printClone.style.setProperty('background', '#ffffff', 'important');

    /* ==============================
     * 9. FRAME LUAR REPORT
     * ============================== */

    const reportFrame = printClone.querySelector<HTMLElement>(':scope > div');

    if (reportFrame) {
      reportFrame.style.setProperty('width', '100%', 'important');

      reportFrame.style.setProperty('min-width', '0', 'important');

      reportFrame.style.setProperty('max-width', 'none', 'important');

      reportFrame.style.setProperty('height', 'auto', 'important');

      reportFrame.style.setProperty('margin', '0', 'important');

      /*
       * Pertahankan frame report seperti referensi.
       */
      reportFrame.style.setProperty('padding', '10px', 'important');

      reportFrame.style.setProperty('border', '1px solid #000000', 'important');

      reportFrame.style.setProperty('box-sizing', 'border-box', 'important');

      reportFrame.style.setProperty('overflow', 'visible', 'important');

      reportFrame.style.setProperty('background', '#ffffff', 'important');
    }

    /* ==============================
     * 10. HEADER REPORT - MATCH REFERENSI
     * ============================== */

    const reportHeader = printClone.querySelector<HTMLElement>('.print-report-header');

    if (reportHeader) {
      reportHeader.style.setProperty('width', '100%', 'important');

      reportHeader.style.setProperty('max-width', '100%', 'important');

      reportHeader.style.setProperty('margin', '0', 'important');

      reportHeader.style.setProperty('padding', '0', 'important');

      reportHeader.style.setProperty('box-sizing', 'border-box', 'important');
    }

    /* ==============================
     * HEADER UTAMA
     * ============================== */

    const headerMain = printClone.querySelector<HTMLElement>('.print-header-main');

    if (headerMain) {
      headerMain.style.setProperty('display', 'grid', 'important');

      /*
       * Dibuat mendekati template asli:
       *
       * logo  : 300
       * tengah: flexible
       * kanan : 190
       */
      headerMain.style.setProperty('grid-template-columns', '300px minmax(0, 1fr) 190px', 'important');

      headerMain.style.setProperty('column-gap', '0', 'important');

      headerMain.style.setProperty('width', '100%', 'important');

      headerMain.style.setProperty('max-width', '100%', 'important');

      headerMain.style.setProperty('min-height', '64px', 'important');

      headerMain.style.setProperty('margin', '0', 'important');

      headerMain.style.setProperty('padding', '1px 0 2px 0', 'important');

      headerMain.style.setProperty('align-items', 'start', 'important');

      headerMain.style.setProperty('box-sizing', 'border-box', 'important');

      headerMain.style.setProperty('border-bottom', '2px solid #000000', 'important');
    }

    /* ==============================
     * 11. LOGO
     * ============================== */

    const reportLogo = printClone.querySelector<HTMLElement>('.print-report-logo');

    if (reportLogo) {
      reportLogo.style.setProperty('display', 'flex', 'important');

      reportLogo.style.setProperty('align-items', 'center', 'important');

      reportLogo.style.setProperty('justify-content', 'flex-start', 'important');

      reportLogo.style.setProperty('align-self', 'center', 'important');

      reportLogo.style.setProperty('padding', '0', 'important');

      reportLogo.style.setProperty('margin', '0', 'important');

      reportLogo.style.setProperty('transform', 'translateY(-4px)', 'important');
    }

    const reportLogoImg = printClone.querySelector<HTMLElement>('.print-report-logo img');

    if (reportLogoImg) {
      /*
       * Sebelumnya 205px terlalu kecil.
       *
       * 240px lebih mendekati referensi.
       */
      reportLogoImg.style.setProperty('width', '240px', 'important');

      reportLogoImg.style.setProperty('max-width', '255px', 'important');

      reportLogoImg.style.setProperty('height', 'auto', 'important');

      reportLogoImg.style.setProperty('max-height', '54px', 'important');

      reportLogoImg.style.setProperty('object-fit', 'contain', 'important');
    }

    /* ==============================
     * 12. TITLE / PROJECT / CUSTOMER
     * ============================== */

    const reportMeta = printClone.querySelector<HTMLElement>('.print-report-meta');

    if (reportMeta) {
      reportMeta.style.setProperty('display', 'grid', 'important');

      /*
       * Template asli = 560px.
       */
      reportMeta.style.setProperty('width', '560px', 'important');

      reportMeta.style.setProperty('max-width', '100%', 'important');

      reportMeta.style.setProperty('justify-self', 'center', 'important');

      reportMeta.style.setProperty('align-self', 'center', 'important');

      reportMeta.style.setProperty('margin', '0 auto', 'important');

      reportMeta.style.setProperty('padding', '0', 'important');

      reportMeta.style.setProperty('row-gap', '4px', 'important');

      reportMeta.style.setProperty('font-family', PRINT_FONT, 'important');

      reportMeta.style.setProperty('font-size', '14px', 'important');

      reportMeta.style.setProperty('font-weight', '700', 'important');

      reportMeta.style.setProperty('line-height', '1.2', 'important');

      reportMeta.style.setProperty('transform', 'translateY(-5px)', 'important');
    }

    /*
     * PENTING:
     *
     * TITLE    : value
     * PROJECT  : value
     * CUSTOMER : value
     *
     * Tetap 3 kolom.
     */
    printClone.querySelectorAll<HTMLElement>('.print-report-meta > div').forEach((row) => {
      row.style.setProperty('display', 'grid', 'important');

      row.style.setProperty('grid-template-columns', '92px 14px minmax(0, 1fr)', 'important');

      row.style.setProperty('column-gap', '0', 'important');

      row.style.setProperty('align-items', 'center', 'important');

      row.style.setProperty('width', '100%', 'important');

      row.style.setProperty('margin', '0', 'important');

      row.style.setProperty('padding', '0', 'important');
    });

    printClone.querySelectorAll<HTMLElement>('.print-report-meta > div > span').forEach((span) => {
      span.style.setProperty('font-family', PRINT_FONT, 'important');

      span.style.setProperty('font-size', '14px', 'important');

      span.style.setProperty('font-weight', '700', 'important');

      span.style.setProperty('line-height', '1.2', 'important');

      span.style.setProperty('white-space', 'nowrap', 'important');
    });

    /* LABEL */
    printClone.querySelectorAll<HTMLElement>('.print-report-meta > div > span:nth-child(1)').forEach((label) => {
      label.style.setProperty('text-align', 'left', 'important');
    });

    /* TITIK DUA */
    printClone.querySelectorAll<HTMLElement>('.print-report-meta > div > span:nth-child(2)').forEach((colon) => {
      colon.style.setProperty('text-align', 'center', 'important');
    });

    /* VALUE */
    printClone.querySelectorAll<HTMLElement>('.print-report-meta > div > span:nth-child(3)').forEach((value) => {
      value.style.setProperty('text-align', 'left', 'important');
    });

    const budgetTitle = printClone.querySelector<HTMLElement>('.print-budget-title');

    if (budgetTitle) {
      budgetTitle.style.setProperty('font-size', '13px', 'important');

      budgetTitle.style.setProperty('font-weight', '700', 'important');

      budgetTitle.style.setProperty('line-height', '1.15', 'important');

      budgetTitle.style.setProperty('white-space', 'nowrap', 'important');
    }

    /* ==============================
     * 13. ORIGINAL REVISION
     * ============================== */

    const revisionBox = printClone.querySelector<HTMLElement>('.print-report-revision');

    if (revisionBox) {
      /*
       * Ikuti template:
       * width 170px.
       */
      revisionBox.style.setProperty('width', '155px', 'important');

      revisionBox.style.setProperty('min-width', '155px', 'important');

      revisionBox.style.setProperty('max-width', '155px', 'important');

      revisionBox.style.setProperty('height', '22px', 'important');

      revisionBox.style.setProperty('min-height', '22px', 'important');

      revisionBox.style.setProperty('margin', '0 0 -2px auto', 'important');

      revisionBox.style.setProperty('padding', '0 6px', 'important');

      revisionBox.style.setProperty('box-sizing', 'border-box', 'important');

      revisionBox.style.setProperty('border-top', '1px solid #000000', 'important');

      revisionBox.style.setProperty('border-left', '1px solid #000000', 'important');

      revisionBox.style.setProperty('border-right', '1px solid #000000', 'important');

      revisionBox.style.setProperty('border-bottom', '0', 'important');

      revisionBox.style.setProperty('font-family', PRINT_FONT, 'important');

      revisionBox.style.setProperty('font-size', '12px', 'important');

      revisionBox.style.setProperty('font-weight', '700', 'important');

      revisionBox.style.setProperty('font-style', 'italic', 'important');

      revisionBox.style.setProperty('line-height', '1', 'important');

      revisionBox.style.setProperty('background', '#ffffff', 'important');
    }

    const revisionText = printClone.querySelector<HTMLElement>('.print-report-revision span');

    if (revisionText) {
      revisionText.style.setProperty('font-size', '10px', 'important');

      revisionText.style.setProperty('font-weight', '700', 'important');

      revisionText.style.setProperty('font-style', 'italic', 'important');

      revisionText.style.setProperty('white-space', 'nowrap', 'important');
    }

    /* ==============================
     * 14. TANGGAL
     * ============================== */

    const dateRow = printClone.querySelector<HTMLElement>('.print-header-date-row');

    if (dateRow) {
      dateRow.style.setProperty('display', 'flex', 'important');

      dateRow.style.setProperty('justify-content', 'flex-end', 'important');

      dateRow.style.setProperty('align-items', 'flex-end', 'important');

      /*
       * Sebelumnya 26px.
       * Referensi lebih turun sedikit.
       */
      dateRow.style.setProperty('height', '30px', 'important');

      dateRow.style.setProperty('width', '100%', 'important');

      dateRow.style.setProperty('margin', '0', 'important');

      dateRow.style.setProperty('padding', '0', 'important');

      dateRow.style.setProperty('box-sizing', 'border-box', 'important');
    }

    const dateBox = printClone.querySelector<HTMLElement>('.print-report-date');

    if (dateBox) {
      dateBox.style.setProperty('width', '155px', 'important');

      dateBox.style.setProperty('min-width', '155px', 'important');

      dateBox.style.setProperty('max-width', '155px', 'important');

      dateBox.style.setProperty('height', '20px', 'important');

      dateBox.style.setProperty('margin', '0', 'important');

      dateBox.style.setProperty('padding', '0 4px', 'important');

      dateBox.style.setProperty('box-sizing', 'border-box', 'important');

      dateBox.style.setProperty('border-top', '1px solid #000000', 'important');

      dateBox.style.setProperty('border-left', '1px solid #000000', 'important');

      dateBox.style.setProperty('border-right', '1px solid #000000', 'important');

      dateBox.style.setProperty('border-bottom', '0', 'important');

      dateBox.style.setProperty('font-size', '9px', 'important');

      dateBox.style.setProperty('font-weight', '700', 'important');

      dateBox.style.setProperty('font-style', 'italic', 'important');

      dateBox.style.setProperty('line-height', '1', 'important');

      dateBox.style.setProperty('background', '#ffffff', 'important');
    }

    /* ==============================
     * PRINT - WIDTH KOLOM DIFF
     * ============================== */

    const PRINT_DIFF_WIDTH = '35px';

    const diffColumnTrack = printClone.querySelector<HTMLElement>('#budget-table col.col-track-diff');

    if (diffColumnTrack) {
      diffColumnTrack.style.setProperty('width', PRINT_DIFF_WIDTH, 'important');

      diffColumnTrack.style.setProperty('min-width', PRINT_DIFF_WIDTH, 'important');

      diffColumnTrack.style.setProperty('max-width', PRINT_DIFF_WIDTH, 'important');
    }

    /* ==============================
     * 15. TABEL UTAMA
     * ============================== */

    const budgetTable = printClone.querySelector<HTMLElement>('#budget-table');

    if (budgetTable) {
      budgetTable.style.setProperty('width', '100%', 'important');

      budgetTable.style.setProperty('max-width', '100%', 'important');

      budgetTable.style.setProperty('table-layout', 'fixed', 'important');

      budgetTable.style.setProperty('border-collapse', 'collapse', 'important');

      budgetTable.style.setProperty('font-family', PRINT_FONT, 'important');

      budgetTable.style.setProperty('margin', '0', 'important');
    }

    /* ==============================
     * HEADER TABLE
     * ============================== */

    printClone.querySelectorAll<HTMLElement>('#budget-table thead th').forEach((cell) => {
      cell.style.setProperty('background', '#99ccff', 'important');

      cell.style.setProperty('background-color', '#99ccff', 'important');

      cell.style.setProperty('border', '1px solid #000000', 'important');

      cell.style.setProperty('font-family', PRINT_FONT, 'important');

      cell.style.setProperty('font-size', '9px', 'important');

      cell.style.setProperty('font-weight', '700', 'important');

      cell.style.setProperty('padding', '1.5px 2px', 'important');

      cell.style.setProperty('line-height', '1.12', 'important');

      cell.style.setProperty('height', '20px', 'important');

      cell.style.setProperty('vertical-align', 'middle', 'important');

      cell.style.setProperty('text-align', 'center', 'important');
    });

    /* ==============================
     * BUDGET MATERIAL & CKD
     * ============================== */

    const mainTableTitle = printClone.querySelector<HTMLElement>('#budget-table thead tr:first-child th:last-child');

    if (mainTableTitle) {
      mainTableTitle.style.setProperty('font-size', '12px', 'important');

      mainTableTitle.style.setProperty('font-weight', '700', 'important');
    }

    /* ==============================
     * BODY TABLE
     * ============================== */

    /*
     * Total Anda berada di TBODY,
     * bukan TFOOT.
     */
    /* ==============================
     * TOTAL ROW
     * ============================== */

    const totalRow = printClone.querySelector<HTMLElement>('#budget-table tbody tr:last-child');

    if (totalRow) {
      totalRow.querySelectorAll<HTMLElement>('td').forEach((cell) => {
        cell.style.setProperty('background', '#99ccff', 'important');

        cell.style.setProperty('background-color', '#99ccff', 'important');

        cell.style.setProperty('font-family', PRINT_FONT, 'important');

        /*
         * TOTAL dibuat sedikit lebih kecil
         * dari body supaya angka panjang tidak turun.
         */
        cell.style.setProperty('font-size', '8px', 'important');

        cell.style.setProperty('font-weight', '700', 'important');

        cell.style.setProperty('line-height', '1.05', 'important');

        cell.style.setProperty('height', '20px', 'important');

        cell.style.setProperty('padding', '1px 1px', 'important');

        cell.style.setProperty('padding-right', '10px', 'important');

        cell.style.setProperty('vertical-align', 'middle', 'important');

        cell.style.setProperty('white-space', 'nowrap', 'important');
      });
    }

    printClone.querySelectorAll<HTMLElement>('#budget-table tbody td').forEach((cell) => {
      cell.style.setProperty('border', '1px solid #000000', 'important');

      cell.style.setProperty('font-family', PRINT_FONT, 'important');

      cell.style.setProperty('font-size', '9.5px', 'important');

      cell.style.setProperty('padding', '1.5px 2px', 'important');

      cell.style.setProperty('line-height', '1.6', 'important');

      cell.style.setProperty('height', '25px', 'important');

      cell.style.setProperty('vertical-align', 'middle', 'important');
    });
    /* ==============================
     * 16. KOLOM NO
     * ============================== */

    const noColumnTrack = printClone.querySelector<HTMLElement>('#budget-table col.col-track-no');

    if (noColumnTrack) {
      noColumnTrack.style.setProperty('width', '17px', 'important');
    }

    printClone.querySelectorAll<HTMLElement>('#budget-table th.col-no, #budget-table td.col-no').forEach((cell) => {
      cell.style.setProperty('width', '20px', 'important');

      cell.style.setProperty('min-width', '20px', 'important');

      cell.style.setProperty('max-width', '20px', 'important');

      cell.style.setProperty('padding-left', '0', 'important');

      cell.style.setProperty('padding-right', '0', 'important');

      cell.style.setProperty('text-align', 'center', 'important');

      cell.style.setProperty('font-weight', '700', 'important');
    });

    /* ==============================
     * 17. MODEL
     * ============================== */

    printClone.querySelectorAll<HTMLElement>('#budget-table th.col-model, #budget-table td.col-model').forEach((cell) => {
      cell.style.setProperty('font-size', '8.7px', 'important');

      cell.style.setProperty('font-weight', '700', 'important');

      cell.style.setProperty('font-family', PRINT_FONT, 'important');

      cell.style.setProperty('text-align', 'center', 'important');

      cell.style.setProperty('line-height', '1.15', 'important');
    });

    /* ==============================
     * 18. TABEL VOLUME + APPROVAL
     * ============================== */

    printClone.querySelectorAll<HTMLElement>('table:not(#budget-table)').forEach((table) => {
      table.style.setProperty('width', '100%', 'important');

      table.style.setProperty('table-layout', 'fixed', 'important');

      table.style.setProperty('border-collapse', 'collapse', 'important');

      table.style.setProperty('font-family', PRINT_FONT, 'important');
    });

    printClone.querySelectorAll<HTMLElement>('table:not(#budget-table) th, table:not(#budget-table) td').forEach((cell) => {
      cell.style.setProperty('border', '1px solid #000000', 'important');

      cell.style.setProperty('font-size', '9px', 'important');

      cell.style.setProperty('padding', '1px', 'important');

      cell.style.setProperty('line-height', '1.1', 'important');

      cell.style.setProperty('vertical-align', 'middle', 'important');
    });

    /* ==============================
     * 18A. FOOTER PRINT - BALANCE LEFT / RIGHT
     * ============================== */

    const printFooterGrid = printClone.querySelector<HTMLElement>('.print-footer-grid');

    if (printFooterGrid) {
      printFooterGrid.style.setProperty('display', 'grid', 'important');

      printFooterGrid.style.setProperty('grid-template-columns', '1.05fr 1fr', 'important');

      /*
       * PENTING:
       * sebelumnya items-start.
       *
       * Stretch supaya kiri dan kanan
       * mempunyai tinggi footer yang sama.
       */
      printFooterGrid.style.setProperty('align-items', 'stretch', 'important');

      printFooterGrid.style.setProperty('column-gap', '16px', 'important');

      printFooterGrid.style.setProperty('width', '100%', 'important');

      printFooterGrid.style.setProperty('margin-top', '6px', 'important');

      printFooterGrid.style.setProperty('padding', '0 6px', 'important');

      printFooterGrid.style.setProperty('box-sizing', 'border-box', 'important');
    }

    /* ==============================
     * 18B. GRID VOLUME KIRI
     * ============================== */

    const printVolumeGrid = printClone.querySelector<HTMLElement>('.print-volume-grid');

    if (printVolumeGrid) {
      printVolumeGrid.style.setProperty('display', 'grid', 'important');

      printVolumeGrid.style.setProperty('grid-template-columns', 'repeat(2, minmax(0, 1fr))', 'important');

      /*
       * Row:
       *
       * 1 = SU2ID + KS
       * 2 = SU2ID FL + KS FL
       * 3 = All Model
       *
       * Row ketiga mengambil ruang tersisa.
       */
      printVolumeGrid.style.setProperty('grid-template-rows', 'auto auto minmax(0, 1fr)', 'important');

      printVolumeGrid.style.setProperty('column-gap', '10px', 'important');

      printVolumeGrid.style.setProperty('row-gap', '6px', 'important');

      printVolumeGrid.style.setProperty('height', '100%', 'important');

      printVolumeGrid.style.setProperty('align-self', 'stretch', 'important');

      printVolumeGrid.style.setProperty('margin-top', '0', 'important');
    }

    /* ==============================
     * 18C. SEMUA CELL VOLUME
     * ============================== */

    printClone.querySelectorAll<HTMLElement>('.print-volume-table th, .print-volume-table td').forEach((cell) => {
      cell.style.setProperty('vertical-align', 'middle', 'important');

      cell.style.setProperty('text-align', 'center', 'important');

      cell.style.setProperty('line-height', '0.8', 'important');

      cell.style.setProperty('padding', '2px 1px', 'important');
    });

    /*
     * Body volume sedikit lebih tinggi
     * supaya angka benar-benar berada di tengah.
     */
    printClone.querySelectorAll<HTMLElement>('.print-volume-table tbody td').forEach((cell) => {
      cell.style.setProperty('height', '4px', 'important');

      cell.style.setProperty('vertical-align', 'middle', 'important');

      cell.style.setProperty('padding-top', '1px', 'important');

      cell.style.setProperty('padding-bottom', '1px', 'important');
    });

    /* ==============================
     * 18D. VOLUME UNIT ALL MODEL
     * ============================== */

    const printVolumeAllWrap = printClone.querySelector<HTMLElement>('.print-volume-all-wrap');

    if (printVolumeAllWrap) {
      printVolumeAllWrap.style.setProperty('display', 'flex', 'important');

      printVolumeAllWrap.style.setProperty('flex-direction', 'column', 'important');

      /*
       * INI yang membuat All Model
       * rata tengah atas-bawah.
       */
      printVolumeAllWrap.style.setProperty('justify-content', 'center', 'important');

      printVolumeAllWrap.style.setProperty('align-items', 'stretch', 'important');

      printVolumeAllWrap.style.setProperty('height', '100%', 'important');

      printVolumeAllWrap.style.setProperty('min-height', '0', 'important');

      printVolumeAllWrap.style.setProperty('padding', '1px 0', 'important');

      printVolumeAllWrap.style.setProperty('margin', '0', 'important');
    }

    /* ==============================
     * 18E. KOLOM KANAN - NOTE + SIGN
     * ============================== */

    const printFooterRight = printClone.querySelector<HTMLElement>('.print-footer-right');

    if (printFooterRight) {
      printFooterRight.style.setProperty('display', 'grid', 'important');

      /*
       * Note mengikuti isi.
       * Sign mengambil seluruh sisa tinggi.
       */
      printFooterRight.style.setProperty('grid-template-rows', 'auto minmax(0, 1fr)', 'important');

      printFooterRight.style.setProperty('row-gap', '10px', 'important');

      printFooterRight.style.setProperty('height', '100%', 'important');

      printFooterRight.style.setProperty('align-self', 'stretch', 'important');

      printFooterRight.style.setProperty('margin-top', '2px', 'important');
    }

    /* ==============================
     * 18F. NOTE
     * ============================== */

    const printNoteBlock = printClone.querySelector<HTMLElement>('.print-note-block');

    if (printNoteBlock) {
      printNoteBlock.style.setProperty('margin', '0', 'important');

      printNoteBlock.style.setProperty('padding', '0', 'important');
    }

    /* ==============================
     * 18G. WRAPPER SIGNATURE
     * ============================== */

    const printSignWrap = printClone.querySelector<HTMLElement>('.print-sign-wrap');

    if (printSignWrap) {
      printSignWrap.style.setProperty('display', 'flex', 'important');

      printSignWrap.style.setProperty('flex-direction', 'column', 'important');

      printSignWrap.style.setProperty('justify-content', 'center', 'important');

      printSignWrap.style.setProperty('align-items', 'stretch', 'important');

      printSignWrap.style.setProperty('height', '100%', 'important');

      printSignWrap.style.setProperty('min-height', '0', 'important');

      printSignWrap.style.setProperty('padding', '4px 0', 'important');

      printSignWrap.style.setProperty('margin', '0', 'important');
    }

    /* ==============================
     * 18H. SIGNATURE TABLE
     * ============================== */

    const printSignTable = printClone.querySelector<HTMLElement>('.print-sign-table');

    if (printSignTable) {
      printSignTable.style.setProperty('width', '100%', 'important');

      printSignTable.style.setProperty('table-layout', 'fixed', 'important');

      printSignTable.style.setProperty('border-collapse', 'collapse', 'important');

      printSignTable.style.setProperty('margin', '0', 'important');

      printSignTable.style.setProperty('font-family', PRINT_FONT, 'important');
    }

    /*
     * Semua TH / TD sign harus middle.
     *
     * Ini sekaligus menimpa align-top
     * yang berasal dari template lama.
     */
    /*
     * Semua cell signature
     */
    printClone.querySelectorAll<HTMLElement>('.print-sign-table th, .print-sign-table td').forEach((cell) => {
      cell.style.setProperty('vertical-align', 'middle', 'important');

      cell.style.setProperty('text-align', 'center', 'important');

      cell.style.setProperty('font-family', PRINT_FONT, 'important');
    });

    /*
     * HEADER SIGNED
     *
     * Menyetujui
     * Mengetahui
     * Diperiksa
     * Dibuat
     */
    printClone.querySelectorAll<HTMLElement>('.print-sign-table thead th').forEach((cell) => {
      cell.style.setProperty('font-size', '11px', 'important');

      cell.style.setProperty('font-weight', '700', 'important');

      cell.style.setProperty('line-height', '1.15', 'important');

      cell.style.setProperty('height', '24px', 'important');

      cell.style.setProperty('padding', '2px', 'important');

      cell.style.setProperty('vertical-align', 'middle', 'important');

      cell.style.setProperty('text-align', 'center', 'important');
    });

    /* ==============================
     * 18I. AREA KOSONG UNTUK TANDA TANGAN
     * ============================== */

    printClone.querySelectorAll<HTMLElement>('.print-sign-space-row td').forEach((cell) => {
      cell.style.setProperty('height', '72px', 'important');

      cell.style.setProperty('padding', '0', 'important');
    });

    printClone.querySelectorAll<HTMLElement>('.print-sign-name').forEach((element) => {
      element.style.setProperty('display', 'inline-block', 'important');

      element.style.setProperty('line-height', '1.15', 'important');

      element.style.setProperty('font-weight', '700', 'important');

      element.style.setProperty('text-align', 'center', 'important');
    });

    printClone.querySelectorAll<HTMLElement>('.print-sign-name').forEach((element) => {
      element.style.setProperty('display', 'inline-block', 'important');

      element.style.setProperty('line-height', '1.15', 'important');

      element.style.setProperty('font-weight', '700', 'important');

      element.style.setProperty('text-align', 'center', 'important');
    });

    /* ==============================
     * 18K. BARIS JABATAN
     * ============================== */
    printClone.querySelectorAll<HTMLElement>('.print-sign-title').forEach((element) => {
      element.style.setProperty('display', 'inline-block', 'important');

      element.style.setProperty('line-height', '1.35', 'important');

      element.style.setProperty('font-weight', '700', 'important');

      element.style.setProperty('text-align', 'center', 'important');

      element.style.setProperty('vertical-align', 'middle', 'important');

      element.style.setProperty('padding', '1px 0', 'important');
    });

    /* ==============================
     * 18L. TEXT JABATAN
     * ============================== */

    printClone.querySelectorAll<HTMLElement>('.print-sign-title').forEach((element) => {
      element.style.setProperty('display', 'inline-block', 'important');

      /*
       * Jarak antara:
       *
       * Deputy Executive
       * Officer Commercial
       *
       * lebih lega.
       */
      element.style.setProperty('line-height', '1.35', 'important');

      element.style.setProperty('font-weight', '700', 'important');

      element.style.setProperty('text-align', 'center', 'important');

      element.style.setProperty('vertical-align', 'middle', 'important');

      element.style.setProperty('padding', '1px 0', 'important');
    });

    /* ==============================
     * 19. WARNA HEADER SMALL TABLE
     * ============================== */
    printClone.querySelectorAll<HTMLElement>('table:not(#budget-table) thead th').forEach((cell) => {
      /*
       * Approval tetap abu seperti desain,
       * volume menggunakan warna yang sudah tercopy.
       */
      cell.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');

      cell.style.setProperty('print-color-adjust', 'exact', 'important');
    });

    /* ==============================
     * 20. PRINT COLOR
     * ============================== */

    printClone.querySelectorAll<HTMLElement>('*').forEach((element) => {
      element.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');

      element.style.setProperty('print-color-adjust', 'exact', 'important');
    });

    /* ==============================
     * 20A. FINAL FONT OVERRIDE
     * ============================== */

    printClone.style.setProperty('font-family', PRINT_FONT, 'important');

    printClone.querySelectorAll<HTMLElement>('*').forEach((element) => {
      element.style.setProperty('font-family', PRINT_FONT, 'important');
    });

    /* ==============================
     * 21. WAIT IMAGE
     * ============================== */

    const images = Array.from(printDocument.images);

    await Promise.all(
      images.map((image) => {
        if (image.complete) {
          return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
          image.onload = () => resolve();
          image.onerror = () => resolve();
        });
      })
    );

    /* ==============================
     * 22. WAIT FONT
     * ============================== */

    try {
      if (printDocument.fonts) {
        await printDocument.fonts.ready;
      }
    } catch {
      // Tidak menggagalkan proses print.
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    /* ==============================
     * 23. UKUR CONTENT
     * ============================== */

    const contentWidth = Math.max(printClone.scrollWidth, printClone.getBoundingClientRect().width);

    const contentHeight = Math.max(printClone.scrollHeight, printClone.getBoundingClientRect().height);

    const pageWidth = printPage.clientWidth;

    const pageHeight = printPage.clientHeight;

    if (contentWidth <= 0 || contentHeight <= 0 || pageWidth <= 0 || pageHeight <= 0) {
      stage.remove();
      iframe.remove();

      notification.showAlertError('Ukuran area print tidak valid.');

      return;
    }

    /* ==============================
     * 24. AUTO SCALE
     * ============================== */
    /* ==============================
     * SCALE FINAL
     * ============================== */

    /* ==============================
     * 24. FINAL SCALE + POSITION
     * ============================== */

    /* ==============================
     * FINAL SCALE & MARGIN
     * ============================== */

    const PRINT_INNER_MARGIN = 4;

    /*
     * Area yang benar-benar boleh ditempati report.
     */
    const availableWidth = pageWidth - PRINT_INNER_MARGIN * 2;

    const availableHeight = pageHeight - PRINT_INNER_MARGIN * 2;

    /*
     * Scale berdasarkan area tersebut.
     */
    const scaleX = availableWidth / contentWidth;

    const scaleY = availableHeight / contentHeight;

    /*
     * Jangan stretch.
     *
     * Proporsi report tetap asli.
     */
    const scale = Math.min(scaleX, scaleY);

    /* ==============================
     * APPLY SCALE
     * ============================== */

    scaleContainer.style.width = `${contentWidth}px`;

    scaleContainer.style.height = `${contentHeight}px`;

    scaleContainer.style.transform = `scale(${scale})`;

    scaleContainer.style.transformOrigin = 'top left';

    /* ==============================
     * HASIL SETELAH SCALE
     * ============================== */

    const scaledWidth = contentWidth * scale;

    const scaledHeight = contentHeight * scale;

    /* ==============================
     * CENTER DI DALAM SAFE AREA
     * ============================== */

    const freeHorizontal = availableWidth - scaledWidth;

    const freeVertical = availableHeight - scaledHeight;

    /*
     * Margin minimum = PRINT_INNER_MARGIN.
     *
     * Kalau masih ada ruang sisa,
     * bagi dua kiri-kanan / atas-bawah.
     */
    const offsetLeft = PRINT_INNER_MARGIN + Math.max(freeHorizontal / 2, 0);

    const offsetTop = PRINT_INNER_MARGIN + Math.max(freeVertical / 2, 0);

    /* ==============================
     * FINAL POSITION
     * ============================== */

    scaleContainer.style.left = `${offsetLeft}px`;

    scaleContainer.style.top = `${offsetTop}px`;

    /* ==============================
     * 25. CLEANUP
     * ============================== */

    let isCleanedUp = false;

    const cleanup = (): void => {
      if (isCleanedUp) return;

      isCleanedUp = true;

      window.setTimeout(() => {
        if (stage.isConnected) {
          stage.remove();
        }

        if (iframe.isConnected) {
          iframe.remove();
        }
      }, 300);
    };

    printWindow.addEventListener('afterprint', cleanup, {
      once: true
    });

    /*
     * Pastikan layout Chrome selesai.
     */
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 250);
    });

    /* ==============================
     * 26. PRINT
     * ============================== */

    printWindow.focus();
    printWindow.print();

    /*
     * Fallback kalau browser tidak
     * mengirim event afterprint.
     */
    window.setTimeout(cleanup, 60000);
  };

  const goFullScreen = () => {
    customizer.mini_sidebar = true;

    const el = document.getElementById('printArea');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  /* ==============================
   * LOAD DATA
   * ============================== */
  const loadVolumeResume = async () => {
    const periode = formatPeriode(selectedMonth.value);
    const typeBudget = buildTypeBudget(selectedReportType.value, selectedVersion.value);

    if (!periode || !typeBudget) return;

    try {
      const params = {
        customer: customerCode.value,
        periode,
        type_budget: typeBudget
      };

      const res = await getVolumeHmmI(params);

      if (res.data.status === 'ok') {
        const rows = res.data.data || [];

        if (res.data.total_all) {
          volumeTotalAll.value = res.data.total_all;
        }

        const grouped: Record<string, any> = {};

        rows.forEach((row: any) => {
          const project = row.project_model;
          const varian = row.varian;

          if (!grouped[project]) grouped[project] = {};

          grouped[project][varian] = {
            n_1_fc: row.n_1_fc || 0,
            n_1_act: row.n_1_act || 0,
            n: row.n || 0,
            n1: row.n1 || 0,
            n2: row.n2 || 0,
            n3: row.n3 || 0,
            n4: row.n4 || 0
          };
        });

        volumeResume.value = grouped;
      }
    } catch (e) {
      console.error('Error loadVolumeResume', e);
    }
  };

  const cloneRow = (row: any) => {
    return JSON.parse(JSON.stringify(row || {}));
  };

  const parseSchemaDiffMap = (raw: any): Record<string, any> => {
    if (!raw) return {};

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }

    if (typeof raw === 'object') {
      return raw;
    }

    return {};
  };

  const getSchemaSignedDelta = (schemaRow: any, targetPeriode: string) => {
    const cleanTarget = normalizePeriode(targetPeriode);

    if (!cleanTarget) return null;

    const diffMap = parseSchemaDiffMap(schemaRow?.schema_diffs);
    const mapped = diffMap[cleanTarget];

    if (mapped) {
      return {
        pcs: numberValue(mapped.pcs),
        kg: numberValue(mapped.kg),
        amount: numberValue(mapped.amount)
      };
    }

    const baseMonth = normalizePeriode(schemaRow?.base_month || schemaRow?.month);
    const targetMonthInput = periodeToMonthInput(cleanTarget);
    const baseMonthInput = periodeToMonthInput(baseMonth);

    const slot = getForecastSlotByMonth(targetMonthInput, baseMonthInput);
    const originalRow = getOriginalBudgetRowForSchemaRow(schemaRow);

    if (!slot || !originalRow) return null;

    return {
      pcs: numberValue(schemaRow?.[slot.pcs]) - numberValue(originalRow?.[slot.pcs]),
      kg: numberValue(schemaRow?.[slot.kg]) - numberValue(originalRow?.[slot.kg]),
      amount: numberValue(schemaRow?.[slot.amount]) - numberValue(originalRow?.[slot.amount])
    };
  };

  const isPeriodeInsideSelectedReportWindow = (periode: string) => {
    const targetMonthInput = periodeToMonthInput(periode);
    if (!targetMonthInput || !selectedMonth.value) return false;

    return !!getForecastSlotByMonth(targetMonthInput, selectedMonth.value);
  };

  const getSchemaTargetPeriodes = (schemaRow: any) => {
    const result = new Set<string>();

    const ketStr = String(schemaRow?.ket ?? '')
      .toUpperCase()
      .trim();

    const effectiveMonth = normalizePeriode(schemaRow?.effective_month || schemaRow?.month);

    if (effectiveMonth) {
      result.add(effectiveMonth);
    }

    if (ketStr.endsWith('ADV')) {
      getAdvanceItemPeriodesFromRow(schemaRow).forEach((month) => {
        result.add(month);
      });
    }

    return [...result];
  };

  const applySchemaDeltaToSelectedReportSlot = (targetRow: any, schemaRow: any, targetPeriode: string) => {
    const targetMonthInput = periodeToMonthInput(targetPeriode);
    const slot = getForecastSlotByMonth(targetMonthInput, selectedMonth.value);

    if (!slot) return;

    const delta = getSchemaSignedDelta(schemaRow, targetPeriode);

    if (!delta) return;

    targetRow[slot.pcs] = numberValue(targetRow[slot.pcs]) + delta.pcs;
    targetRow[slot.kg] = numberValue(targetRow[slot.kg]) + delta.kg;
    targetRow[slot.amount] = numberValue(targetRow[slot.amount]) + delta.amount;
  };

  const applySameBaseSchemaRowToTargetSlots = (targetRow: any, schemaRow: any, baseMonth: string) => {
    const baseMonthInput = periodeToMonthInput(baseMonth);

    if (!baseMonthInput) return;

    const targetPeriodes = getSchemaTargetPeriodes(schemaRow).filter((periode) => isPeriodeInsideSelectedReportWindow(periode));

    targetPeriodes.forEach((targetPeriode) => {
      const targetMonthInput = periodeToMonthInput(targetPeriode);
      const slot = getForecastSlotByMonth(targetMonthInput, baseMonthInput);

      if (!slot) return;

      targetRow[slot.pcs] = numberValue(schemaRow?.[slot.pcs]);
      targetRow[slot.kg] = numberValue(schemaRow?.[slot.kg]);
      targetRow[slot.amount] = numberValue(schemaRow?.[slot.amount]);
    });
  };
  const isSchemaRowTargetingPeriode = (row: any, targetPeriode: string) => {
    const cleanTarget = normalizePeriode(targetPeriode);
    const ketStr = String(row?.ket ?? '')
      .toUpperCase()
      .trim();

    if (!cleanTarget) return false;

    const effectivePeriode = normalizePeriode(row?.effective_month || row?.month);
    const advanceItemPeriodes = getAdvanceItemPeriodesFromRow(row);

    if (effectivePeriode === cleanTarget) return true;

    if (ketStr.endsWith('ADV') && advanceItemPeriodes.includes(cleanTarget)) {
      return true;
    }

    return false;
  };

  const findSchemaRowById = (id: any) => {
    const cleanId = Number(id);

    if (!cleanId) return null;

    return (
      getAdtSearchRows().find((row: any) => {
        return Number(row?.id ?? 0) === cleanId;
      }) ?? null
    );
  };

  const getCarryForwardSchemaRowForDot = (month: number | string) => {
    const selectedBasePeriode = getSelectedPeriode();
    const dotPeriode = getDotPeriode(month);

    const typeBudgetPrefix = buildTypeBudget(selectedReportType.value, selectedVersion.value).slice(0, 3);

    if (!selectedBasePeriode || !dotPeriode || !typeBudgetPrefix) {
      return null;
    }

    if (Number(dotPeriode) < Number(selectedBasePeriode)) {
      return null;
    }

    if (!isDotInsideSelectedBaseRange(month)) {
      return null;
    }

    const candidates = getAdtSearchRows()
      .filter((item: any) => {
        const ketStr = String(item?.ket ?? '')
          .toUpperCase()
          .trim();

        if (!ketStr.endsWith('ADT') && !ketStr.endsWith('ADV')) {
          return false;
        }

        const itemBaseMonth = normalizePeriode(item?.base_month || item?.month);
        const itemKetPrefix = String(item?.ket ?? '').slice(0, 3);

        if (!itemBaseMonth) return false;
        if (itemBaseMonth === selectedBasePeriode) return false;
        if (itemKetPrefix !== typeBudgetPrefix) return false;

        return isSchemaRowTargetingPeriode(item, dotPeriode);
      })
      .sort((a: any, b: any) => {
        const baseA = Number(normalizePeriode(a?.base_month || a?.month));
        const baseB = Number(normalizePeriode(b?.base_month || b?.month));

        return baseB - baseA;
      });

    return candidates[0] || null;
  };
  const applySchemaRowsToBaseRows = (baseRows: any[], schemaRows: any[], allowCarryForward: boolean) => {
    const selectedPeriode = getSelectedPeriode();
    const typeBudgetPrefix = buildTypeBudget(selectedReportType.value, selectedVersion.value).slice(0, 3);

    if (!selectedPeriode || !typeBudgetPrefix) {
      return baseRows;
    }

    const grouped = new Map<string, any>();
    const sameBaseTargetSet = new Set<string>();

    const makeRowKey = (row: any) => {
      return [row?.nokol ?? '', row?.model ?? '', row?.tipe ?? '', row?.name ?? ''].join('|');
    };

    const makeTargetKey = (row: any, targetPeriode: string) => {
      return `${makeRowKey(row)}|${normalizePeriode(targetPeriode)}`;
    };

    baseRows.forEach((row: any) => {
      grouped.set(makeRowKey(row), cloneRow(row));
    });

    schemaRows.forEach((schemaRow: any) => {
      const ketStr = String(schemaRow?.ket ?? '')
        .toUpperCase()
        .trim();

      if (!ketStr.endsWith('ADT') && !ketStr.endsWith('ADV')) return;

      const itemKetPrefix = String(schemaRow?.ket ?? '').slice(0, 3);
      if (itemKetPrefix !== typeBudgetPrefix) return;

      const baseMonth = normalizePeriode(schemaRow?.base_month || schemaRow?.month);

      if (baseMonth !== selectedPeriode) return;

      getSchemaTargetPeriodes(schemaRow).forEach((targetPeriode) => {
        sameBaseTargetSet.add(makeTargetKey(schemaRow, targetPeriode));
      });
    });

    schemaRows.forEach((schemaRow: any) => {
      const ketStr = String(schemaRow?.ket ?? '')
        .toUpperCase()
        .trim();

      if (!ketStr.endsWith('ADT') && !ketStr.endsWith('ADV')) return;

      const itemKetPrefix = String(schemaRow?.ket ?? '').slice(0, 3);
      if (itemKetPrefix !== typeBudgetPrefix) return;

      const baseMonth = normalizePeriode(schemaRow?.base_month || schemaRow?.month);

      if (!baseMonth || baseMonth === selectedPeriode) return;
      if (!allowCarryForward) return;

      const targetRow = grouped.get(makeRowKey(schemaRow));
      if (!targetRow) return;

      const targetPeriodes = getSchemaTargetPeriodes(schemaRow)
        .filter((periode) => isPeriodeInsideSelectedReportWindow(periode))
        .filter((periode) => {
          return !sameBaseTargetSet.has(makeTargetKey(schemaRow, periode));
        });

      targetPeriodes.forEach((targetPeriode) => {
        applySchemaDeltaToSelectedReportSlot(targetRow, schemaRow, targetPeriode);
      });
    });

    schemaRows.forEach((schemaRow: any) => {
      const ketStr = String(schemaRow?.ket ?? '')
        .toUpperCase()
        .trim();

      if (!ketStr.endsWith('ADT') && !ketStr.endsWith('ADV')) return;

      const itemKetPrefix = String(schemaRow?.ket ?? '').slice(0, 3);
      if (itemKetPrefix !== typeBudgetPrefix) return;

      const baseMonth = normalizePeriode(schemaRow?.base_month || schemaRow?.month);

      if (baseMonth !== selectedPeriode) return;

      const targetRow = grouped.get(makeRowKey(schemaRow));
      if (!targetRow) return;

      applySameBaseSchemaRowToTargetSlots(targetRow, schemaRow, baseMonth);

      targetRow.id = schemaRow?.id ?? targetRow.id;
      targetRow.ket = schemaRow?.ket ?? targetRow.ket;
      targetRow.iaa_no = schemaRow?.iaa_no ?? '';
      targetRow.scan_file = schemaRow?.scan_file ?? '';
      targetRow.base_month = baseMonth;
      targetRow.effective_month = normalizePeriode(schemaRow?.effective_month || schemaRow?.month);
      targetRow.advance_items = schemaRow?.advance_items ?? null;
    });

    return [...grouped.values()];
  };

  const loadBudgetMat = async () => {
    const periode = formatPeriode(selectedMonth.value);
    const typeBudget = buildTypeBudget(selectedReportType.value, selectedVersion.value);
    const selectedYear = getSelectedYear();

    const res = await getBudgetMatHmmI({
      customer: customerCode.value,
      periode,
      type_budget: typeBudget,
      include_adt: includeADT.value
    });

    const normalizedMonths = normalizeMonthsWithADT(res.data?.monthswithadt);

    currentBaseMonthSchemaMap.value = normalizeMonthSchemaMap(res.data?.basemonthschemas ?? {});

    let responseRows: any[] = [];
    let responseSchemaRows: any[] = [];

    if (res.data?.data) {
      responseRows = Array.isArray(res.data.data) ? res.data.data : [];
      responseSchemaRows = Array.isArray(res.data.schemarows) ? res.data.schemarows : [];

      setMonthsWithADTForYear(selectedYear, normalizedMonths, {
        preserveIfEmpty: true
      });

      setMonthSchemaMapForYear(selectedYear, res.data.monthschemas, {
        preserveIfEmpty: true
      });

      const schemaOwnerSource = res.data.schemaowners || buildSchemaOwnerMapFromRows(res.data.schemarows || res.data.data || []);

      setSchemaOwnerMapForYear(selectedYear, schemaOwnerSource, {
        preserveIfEmpty: true
      });
    } else {
      responseRows = Array.isArray(res.data) ? res.data : [];
      responseSchemaRows = [];

      setMonthsWithADTForYear(selectedYear, normalizedMonths, {
        preserveIfEmpty: true
      });

      setMonthSchemaMapForYear(
        selectedYear,
        {},
        {
          preserveIfEmpty: true
        }
      );

      setSchemaOwnerMapForYear(
        selectedYear,
        {},
        {
          preserveIfEmpty: true
        }
      );
    }

    materialSchemaRows.value = responseSchemaRows;

    try {
      const baseRes = await getBudgetMatHmmI({
        customer: customerCode.value,
        periode,
        type_budget: typeBudget,
        include_adt: false
      });

      if (baseRes.data?.data) {
        baseBudgetRows.value = Array.isArray(baseRes.data.data) ? baseRes.data.data : [];
      } else {
        baseBudgetRows.value = Array.isArray(baseRes.data) ? baseRes.data : [];
      }
    } catch (e) {
      console.error('Error load baseBudgetRows', e);
      baseBudgetRows.value = [];
    }

    if (!includeADT.value) {
      budgetMat.value = responseRows;
      return;
    }

    budgetMat.value = applySchemaRowsToBaseRows(baseBudgetRows.value, materialSchemaRows.value, applyCarryForwardMode.value);
  };

  const refreshSchemaCacheForSelectedBase = async () => {
    const periode = formatPeriode(selectedMonth.value);
    const typeBudget = buildTypeBudget(selectedReportType.value, selectedVersion.value);
    const selectedYear = getSelectedYear();

    if (!periode || !typeBudget || !selectedYear) {
      return false;
    }

    try {
      const res = await getBudgetMatHmmI({
        customer: customerCode.value,
        periode,
        type_budget: typeBudget,
        include_adt: true
      });

      const data = res.data || {};
      const normalizedMonths = normalizeMonthsWithADT(data.monthswithadt);

      setMonthsWithADTForYear(selectedYear, normalizedMonths, {
        preserveIfEmpty: true
      });

      setMonthSchemaMapForYear(selectedYear, data.monthschemas, {
        preserveIfEmpty: true
      });

      const schemaOwnerSource = data.schemaowners || buildSchemaOwnerMapFromRows(data.schemarows || data.data || []);

      setSchemaOwnerMapForYear(selectedYear, schemaOwnerSource, {
        preserveIfEmpty: true
      });

      currentBaseMonthSchemaMap.value = normalizeMonthSchemaMap(data.basemonthschemas ?? {});

      if (Array.isArray(data.schemarows)) {
        materialSchemaRows.value = data.schemarows;
      } else if (Array.isArray(data.data)) {
        materialSchemaRows.value = data.data.filter((item: any) => {
          const ketStr = String(item?.ket ?? '')
            .toUpperCase()
            .trim();
          return ketStr.endsWith('ADT') || ketStr.endsWith('ADV');
        });
      }

      return getSelectedBaseSchemaEffectivePeriodes().length > 0;
    } catch (error) {
      console.error('refreshSchemaCacheForSelectedBase error', error);
      return getSelectedBaseSchemaEffectivePeriodes().length > 0;
    }
  };

  const refreshSchemaAvailabilityOnly = async () => {
    const periode = formatPeriode(selectedMonth.value);
    const typeBudget = buildTypeBudget(selectedReportType.value, selectedVersion.value);
    const selectedYear = getSelectedYear();

    const requestId = ++schemaMetaRequestId;

    if (!periode || !typeBudget || !selectedYear) {
      currentBaseMonthSchemaMap.value = {};
      return;
    }

    isSchemaMetaLoading.value = true;

    try {
      const res = await getBudgetMatHmmI({
        customer: customerCode.value,
        periode,
        type_budget: typeBudget,
        include_adt: true
      });

      if (requestId !== schemaMetaRequestId) return;

      const data = res.data || {};
      const normalizedMonths = normalizeMonthsWithADT(data.monthswithadt);

      currentBaseMonthSchemaMap.value = normalizeMonthSchemaMap(data.basemonthschemas ?? {});

      setMonthsWithADTForYear(selectedYear, normalizedMonths, {
        preserveIfEmpty: false
      });

      setMonthSchemaMapForYear(selectedYear, data.monthschemas ?? {}, {
        preserveIfEmpty: false
      });

      const schemaOwnerSource = data.schemaowners || buildSchemaOwnerMapFromRows(data.schemarows || data.data || []);

      setSchemaOwnerMapForYear(selectedYear, schemaOwnerSource, {
        preserveIfEmpty: false
      });

      if (Array.isArray(data.schemarows)) {
        materialSchemaRows.value = data.schemarows;
      }
    } catch (error) {
      if (requestId !== schemaMetaRequestId) return;

      console.error('refreshSchemaAvailabilityOnly error', error);

      currentBaseMonthSchemaMap.value = {};

      setMonthsWithADTForYear(selectedYear, [], {
        preserveIfEmpty: false
      });

      setMonthSchemaMapForYear(
        selectedYear,
        {},
        {
          preserveIfEmpty: false
        }
      );

      setSchemaOwnerMapForYear(
        selectedYear,
        {},
        {
          preserveIfEmpty: false
        }
      );
    } finally {
      if (requestId === schemaMetaRequestId) {
        isSchemaMetaLoading.value = false;
      }
    }
  };

  const reloadAfterSchemaMutation = async () => {
    await refreshSchemaAvailabilityOnly();
    await loadBudgetMat();

    const stillHasSchemaForBase = getSelectedBaseSchemaEffectivePeriodes().length > 0;

    if (!stillHasSchemaForBase) {
      includeADT.value = false;
      applyCarryForwardMode.value = false;
      await loadBudgetMat();
    }
  };

  const loadBudgetCal = async () => {
    const periode = formatPeriode(selectedMonth.value);
    const typeBudget = buildTypeBudget(selectedReportType.value, selectedVersion.value);

    if (!periode || !typeBudget) return;

    try {
      const res = await getExcelHmmI({
        customer: customerCode.value,
        periode,
        type_budget: typeBudget
      });

      budgetCal.value = res.data || [];
    } catch (e) {
      console.error('Error loadBudgetCal', e);
      budgetCal.value = [];
    }
  };

  /* ==============================
   * IMPORT / APPLY FILTER
   * ============================== */
  const importBudgetToSql = async () => {
    if (!requireBudgetMaterialCreateOrUpdatePermission()) {
      return { ok: false, status: 'forbidden' };
    }

    const periode = formatPeriode(selectedMonth.value);
    const typeBudget = buildTypeBudget(selectedReportType.value, selectedVersion.value);
    const selectedYear = getSelectedYear();

    if (!periode || !typeBudget) {
      notification.showAlertWarning('Pilih Month, Report Type, dan Version dulu');
      return { ok: false, status: 'invalid' };
    }

    try {
      const importRes = await importBudgetMatHmmI({
        customer: customerCode.value,
        periode,
        type_budget: typeBudget
      });

      const dataImport = await readJsonResponse(importRes);
      importStatus.value = dataImport;

      if (importRes.status === 404 || dataImport.status === 'notfound') {
        notification.showAlertWarning(dataImport.message || 'Data versi tersebut tidak ada di JSON');

        budgetMat.value = [];

        setMonthsWithADTForYear(selectedYear, [], {
          preserveIfEmpty: true
        });

        return { ok: false, status: 'notfound' };
      }

      if (dataImport.status === 'ok') {
        notification.showAlertSuccess(dataImport.message || 'Import data budget berhasil');
      } else if (!importRes.ok) {
        notification.showAlertWarning('Data tidak ditemukan!');
        return { ok: false, status: 'error' };
      }

      const sqlRes = await getBudgetMatHmmI({
        customer: customerCode.value,
        periode,
        type_budget: typeBudget,
        include_adt: includeADT.value
      });

      if (sqlRes.data?.data) {
        budgetMat.value = Array.isArray(sqlRes.data.data) ? sqlRes.data.data : [];

        setMonthsWithADTForYear(selectedYear, sqlRes.data.monthswithadt, {
          preserveIfEmpty: true
        });
      } else {
        budgetMat.value = Array.isArray(sqlRes.data) ? sqlRes.data : [];

        setMonthsWithADTForYear(selectedYear, [], {
          preserveIfEmpty: true
        });
      }

      await loadVolumeResume();

      if (canMutateBudgetSalesAmount.value) {
        await importSalesHmmI({
          customer: customerCode.value,
          periode,
          typebudget: typeBudget
        });
      }

      return { ok: true, status: 'ok' };
    } catch (err) {
      console.error('Error import/load Budget Material', err);

      const message =
        err instanceof Error && err.message.includes('bukan JSON')
          ? 'Endpoint Budget Material tidak mengembalikan data yang valid. Periksa route API.'
          : 'Terjadi error saat import atau load data Budget Material';

      notification.showAlertError(message);
      return { ok: false, status: 'error' };
    }
  };

  const importBudgetCalToSql = async () => {
    if (!requireBudgetMaterialCreateOrUpdatePermission()) return false;

    const periode = formatPeriode(selectedMonth.value);
    const typeBudget = buildTypeBudget(selectedReportType.value, selectedVersion.value);

    if (!periode || !typeBudget) {
      notification.showAlertWarning('Pilih Month, Report Type, dan Version dulu');
      return;
    }

    try {
      notification.loading = true;

      const importRes = await importExcelHmmI({
        customer: customerCode.value,
        periode,
        type_budget: typeBudget
      });

      const dataImport = await readJsonResponse(importRes);

      if (importRes.status === 404 || dataImport.status === 'notfound') {
        return;
      }

      if (dataImport.status === 'exists' || dataImport.status === 'ok') {
        await loadBudgetCal();
      }
    } catch (err) {
      console.error('Error importBudgetCalToSql', err);
    } finally {
      notification.disableLoading();
    }
  };

  const applyFilter = async () => {
    const periode = formatPeriode(selectedMonth.value);
    const typeBudget = buildTypeBudget(selectedReportType.value, selectedVersion.value);

    if (!periode || !typeBudget) {
      notification.showAlertWarning('Pilih Month, Report Type, dan Version dulu');
      return;
    }

    let successMessage = '';
    notification.loading = true;

    try {
      /*
       * View-only tetap boleh memilih filter dan membaca snapshot SQL.
       * Import/upsert SAP hanya berjalan jika user mempunyai Create/Update.
       */
      if (canMutateBudgetMaterial.value) {
        const result = await importBudgetToSql();

        if (!result?.ok) {
          isExcelDisabled.value = true;
          includeADT.value = false;
          return;
        }
      }

      saveFilterToStorage({
        customer: customerCode.value,
        periode,
        type_budget: typeBudget
      });

      await loadVolumeResume();
      await loadBudgetMat();
      await loadBudgetCal();

      isExcelDisabled.value = budgetMat.value.length === 0;
      successMessage = 'Filter berhasil diterapkan';
    } catch (e) {
      console.error(e);
      notification.showAlertError('Terjadi error saat memproses filter');
      isExcelDisabled.value = true;
    } finally {
      notification.disableLoading();
      if (successMessage) notification.showAlertSuccess(successMessage);
    }
  };

  /* ==============================
   * IMPORT / DOWNLOAD EXCEL
   * ============================== */
  const downloadExcelFromSql = async () => {
    if (!requireBudgetMaterialPermission('download', 'Download')) return;

    const periode = formatPeriode(selectedMonth.value);
    const typeBudget = buildTypeBudget(selectedReportType.value, selectedVersion.value);

    notification.loading = true;

    try {
      const excelRes = await downloadExcel({
        customer: customerCode.value,
        periode,
        type_budget: typeBudget
      });

      const blob = new Blob([excelRes.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `BudgetMat-${customerCode.value}-${periode}-${typeBudget}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      notification.showAlertSuccess('File Excel berhasil diunduh!');
    } catch (error) {
      console.error('Download Excel SQL error', error);
      notification.showAlertError('File Excel gagal diunduh!');
    } finally {
      notification.disableLoading();
    }
  };

  const importExcelBudget = async () => {
    if (!requireBudgetMaterialPermission('download', 'Download')) return;

    const periode = formatPeriode(selectedMonth.value);
    const typeBudget = buildTypeBudget(selectedReportType.value, selectedVersion.value);

    if (!periode || !typeBudget) {
      notification.showAlertWarning('Pilih Month, Report Type, dan Version dulu!');
      return;
    }

    notification.loading = true;

    try {
      /* Download-only tidak boleh mengubah SQL. */
      if (canMutateBudgetMaterial.value) {
        await importBudgetCalToSql();
      }

      await Promise.all([loadBudgetCal(), downloadExcelFromSql()]);
    } catch (e) {
      console.error('Import Excel error', e);
      notification.showAlertError('Import/Download Excel gagal!');
    } finally {
      notification.disableLoading();
    }
  };

  /* ==============================
   * MATERIAL SCHEMA / DOT MONTH
   * ============================== */
  const hasSchemaForMonth = (month: number | string) => {
    const selectedYear = getSelectedYear();
    if (!selectedYear) return false;

    const mm = String(month).padStart(2, '0');
    const periode = `${selectedYear}${mm}`;

    const schemaMap = getMonthSchemaMapForYear(selectedYear);
    const schemas = schemaMap[periode] || [];

    return schemas.includes('ADT') || schemas.includes('ADV');
  };

  const isMonthHasADT = (month: number | string) => {
    return hasSchemaForMonth(month);
  };

  const applyCarryForwardMode = ref(false);

  const toggleMaterialSchema = async () => {
    if (includeADT.value === true) {
      resetMaterialHandlingState();
      showMaterialModal.value = false;
      includeADT.value = false;
      applyCarryForwardMode.value = false;
      await loadBudgetMat();
      return;
    }

    await refreshSchemaCacheForSelectedBase();

    const carryForwardInfo = getCarryForwardSchemaInfo(selectedMonth.value);

    if (carryForwardInfo) {
      notification.showConfirm(
        'Konfirmasi Apply Material Schema',
        `Data skema bulan ${carryForwardInfo.affectedLabel} terdeteksi pernah dilakukan ${carryForwardInfo.schemaLabel} pada bulan ${carryForwardInfo.ownerLabel}.

        Pilih OK untuk memakai data dari bulan ${carryForwardInfo.ownerLabel}.
        Pilih Close untuk membatalkan apply dan tetap memakai tampilan asli bulan ${carryForwardInfo.selectedLabel}.`,
        async () => {
          includeADT.value = true;
          applyCarryForwardMode.value = true;
          await loadBudgetMat();
        },
        async () => {
          includeADT.value = false;
          applyCarryForwardMode.value = false;
          resetMaterialHandlingState();
          showMaterialModal.value = false;
          await loadBudgetMat();
        }
      );

      return;
    }

    includeADT.value = true;
    applyCarryForwardMode.value = false;
    await loadBudgetMat();
  };

  const handleMonthDotClick = async (month: number) => {
    if (!isMonthHasADT(month)) return;

    if (isDotBeforeSelectedBaseMonth(month) || !isDotInsideSelectedBaseRange(month)) {
      showDotOutOfSelectedRangeWarning(month);
      return;
    }

    await refreshSchemaCacheForSelectedBase();

    const carryForwardSchemaRow = getCarryForwardSchemaRowForDot(month);

    if (carryForwardSchemaRow && !isDotBelongsToSelectedBaseMonth(month)) {
      if (!includeADT.value) {
        notification.showConfirm(
          'Apply Material Schema',
          'Data material handling bulan ini berasal dari base month sebelumnya. Sistem akan membuka data tersebut sebagai dasar difference untuk base month yang sedang dipilih. Apakah Anda ingin apply sekarang?',
          async () => {
            includeADT.value = true;
            applyCarryForwardMode.value = true;
            await loadBudgetMat();
            openCarryForwardSchemaPopup(month, carryForwardSchemaRow);
          }
        );

        return;
      }

      openCarryForwardSchemaPopup(month, carryForwardSchemaRow);
      return;
    }

    if (!isDotBelongsToSelectedBaseMonth(month)) {
      showDotOutsideBaseMonthWarning(month);
      return;
    }

    await openMaterialHandling({ month, from: 'monthDot' });
  };

  const isDotBeforeSelectedBaseMonth = (month: number | string) => {
    const selectedBasePeriode = getSelectedPeriode();
    const dotPeriode = getDotPeriode(month);

    if (!selectedBasePeriode || !dotPeriode) return false;

    return Number(dotPeriode) < Number(selectedBasePeriode);
  };

  const isDotInsideSelectedBaseRange = (month: number | string) => {
    const dotPeriode = getDotPeriode(month);
    const dotMonthInput = periodeToMonthInput(dotPeriode);

    if (!dotMonthInput || !selectedMonth.value) return false;

    return !!getForecastSlotByMonth(dotMonthInput, selectedMonth.value);
  };

  const showDotOutOfSelectedRangeWarning = (month: number | string) => {
    const dotPeriode = getDotPeriode(month);
    const dotLabel = getMonthLabelFromYm(dotPeriode);
    const selectedLabel = getMonthLabelFromYm(getSelectedPeriode());

    notification.showAlertWarning(
      `Data Material Handling untuk bulan ${dotLabel} berada di luar range base month ${selectedLabel}. Silakan pilih bulan ${dotLabel} terlebih dahulu untuk melakukan edit`
    );
  };

  const openCarryForwardAdditionalPopup = (month: number | string, sourceSchemaRow: any) => {
    const targetPeriode = getDotPeriode(month);
    const targetMonth = periodeToMonthInput(targetPeriode);

    if (!targetPeriode || !targetMonth) {
      notification.showAlertWarning('Target month tidak valid.');
      return;
    }

    const delta = getSchemaSignedDelta(sourceSchemaRow, targetPeriode);

    if (!delta) {
      notification.showAlertWarning('Difference dari schema bulan sebelumnya belum bisa dibaca');
      return;
    }

    isOpeningAdtPopup.value = true;

    isCarryForwardSchemaMode.value = true;
    effectiveHint.value = CARRY_FORWARD_HINT;
    advanceHint.value = '';

    isReadADT.value = false;
    currentADTId.value = null;
    activeSchemaRow.value = null;

    selectedModel.value = String(sourceSchemaRow?.model ?? '').trim();
    selectedName.value = String(sourceSchemaRow?.name ?? '').trim();
    selectedSchemaHandling.value = 'additional';
    effectiveMonth.value = targetMonth;

    iaaNo.value = sourceSchemaRow?.iaa_no || '';
    existingScanFileName.value = sourceSchemaRow?.scan_file || '';
    scanFile.value = null;
    previewUrl.value = '';
    showPreview.value = false;

    clearExistingSchemaDiffState();
    resetAdvanceList();

    fillForecastFields(targetMonth, selectedMonth.value, false);

    pcsDifference.value = delta.pcs;
    kgDifference.value = delta.kg;
    amountDifference.value = delta.amount;

    advanceMonth.value = '';
    advanceHint.value = '';
    clearAdvanceFields(true);
    resetAdvanceDiffFields();

    isCarryForwardSchemaMode.value = true;
    effectiveHint.value = CARRY_FORWARD_HINT;

    showMaterialModal.value = true;

    setTimeout(() => {
      isOpeningAdtPopup.value = false;
    }, 0);
  };

  const openCarryForwardSchemaPopup = (month: number | string, sourceSchemaRow: any) => {
    const ketStr = String(sourceSchemaRow?.ket ?? '')
      .toUpperCase()
      .trim();

    if (ketStr.endsWith('ADT')) {
      openCarryForwardAdditionalPopup(month, sourceSchemaRow);
      return;
    }

    if (ketStr.endsWith('ADV')) {
      openCarryForwardAdvancePopup(month, sourceSchemaRow);
      return;
    }

    notification.showAlertWarning('Jenis schema material handling tidak valid');
  };

  const openCarryForwardAdvancePopup = (month: number | string, sourceSchemaRow: any) => {
    const targetPeriode = getDotPeriode(month);

    if (!targetPeriode) {
      notification.showAlertWarning('Target month tidak valid');
      return;
    }

    const sourceItems = parseAdvanceItemsFromSchemaRow(sourceSchemaRow);

    if (!sourceItems.length) {
      notification.showAlertWarning('Advance items dari schema bulan sebelumnya belum tersedia');
      return;
    }

    isOpeningAdtPopup.value = true;

    clearCarryForwardHint();
    effectiveHint.value = '';
    advanceHint.value = '';

    isReadADT.value = false;
    currentADTId.value = null;
    activeSchemaRow.value = null;

    selectedModel.value = String(sourceSchemaRow?.model ?? '').trim();
    selectedName.value = String(sourceSchemaRow?.name ?? '').trim();
    selectedSchemaHandling.value = 'advance';

    const selectedBaseMonth = selectedMonth.value;
    const maxEffectiveMonth = addMonthsToMonthInput(selectedBaseMonth, 2);

    let nextEffectiveMonth = periodeToMonthInput(normalizePeriode(sourceSchemaRow?.effective_month || sourceSchemaRow?.month));

    if (!nextEffectiveMonth || nextEffectiveMonth < selectedBaseMonth || nextEffectiveMonth > maxEffectiveMonth) {
      nextEffectiveMonth = selectedBaseMonth;
    }

    effectiveMonth.value = nextEffectiveMonth;

    const originalRow = getOriginalBudgetRowByModelAndName();

    if (!originalRow) {
      notification.showAlertWarning('Row original/base month tidak ditemukan untuk base month yang sedang dipilih');

      setTimeout(() => {
        isOpeningAdtPopup.value = false;
      }, 0);

      return;
    }

    const validAdvanceItems = sourceItems.filter((item) => {
      if (!item.month) return false;
      if (item.month <= nextEffectiveMonth) return false;

      return !!getForecastSlotByMonth(item.month, selectedBaseMonth);
    });

    if (!validAdvanceItems.length) {
      notification.showAlertWarning('Advance month dari schema sebelumnya tidak valid untuk base month yang sedang dipilih');

      setTimeout(() => {
        isOpeningAdtPopup.value = false;
      }, 0);

      return;
    }

    isCarryForwardSchemaMode.value = true;
    effectiveHint.value = '';
    setCarryForwardAdvanceMonths(validAdvanceItems);

    iaaNo.value = sourceSchemaRow?.iaa_no || '';
    existingScanFileName.value = sourceSchemaRow?.scan_file || '';
    scanFile.value = null;
    previewUrl.value = '';
    showPreview.value = false;

    clearExistingSchemaDiffState();
    resetAdvanceList();

    fillForecastFields(effectiveMonth.value, selectedMonth.value, false);

    const mainItem = validAdvanceItems[0];
    const extraItems = validAdvanceItems.slice(1);

    advanceMonth.value = mainItem.month;

    const mainValues = getForecastValuesByMonth(originalRow, mainItem.month, selectedBaseMonth);

    advancePcsPrev.value = numberValue(mainValues.pcs);
    advanceKgprev.value = numberValue(mainValues.kg);
    advanceAmountprev.value = numberValue(mainValues.amount);

    advancePcsDiff.value = numberValue(mainItem.pcs_diff);
    advanceKgDiff.value = numberValue(mainItem.kg_diff);
    advanceAmountDiff.value = numberValue(mainItem.amount_diff);

    advanceList.value = extraItems.map((item) => {
      const values = getForecastValuesByMonth(originalRow, item.month, selectedBaseMonth);

      return {
        uid: `carry-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        month: item.month,
        pcsPrev: numberValue(values.pcs),
        kgPrev: numberValue(values.kg),
        amountPrev: numberValue(values.amount),
        pcsDiff: numberValue(item.pcs_diff),
        kgDiff: numberValue(item.kg_diff),
        amountDiff: numberValue(item.amount_diff),
        hint: getCarryForwardAdvanceHint(item.month)
      };
    });

    advanceList.value.forEach((item) => {
      advanceExtraMonthSnapshot.value[item.uid] = item.month;
      saveAdvanceExtraDiffMemory(item, item.month);
    });

    syncEffectiveDifferenceFromAdvance();

    effectiveHint.value = '';
    advanceHint.value = getCarryForwardAdvanceHint(mainItem.month);
    showMaterialModal.value = true;

    setTimeout(() => {
      isOpeningAdtPopup.value = false;
    }, 0);
  };

  /* ==============================
   * MATERIAL HANDLING HELPER
   * ============================== */
  const getAdtSearchRows = () => {
    const rows = [
      ...(Array.isArray(materialSchemaRows.value) ? materialSchemaRows.value : []),
      ...(Array.isArray(budgetMat.value) ? budgetMat.value : [])
    ];

    const unique = new Map<string, any>();

    rows.forEach((item: any) => {
      const ketStr = String(item?.ket ?? '')
        .toUpperCase()
        .trim();

      if (!ketStr.endsWith('ADT') && !ketStr.endsWith('ADV')) return;

      const key = [
        item?.id ?? '',
        normalizePeriode(item?.base_month || item?.month),
        normalizePeriode(item?.effective_month || item?.month),
        String(item?.ket ?? '').trim(),
        String(item?.model ?? '').trim(),
        String(item?.tipe ?? '').trim(),
        String(item?.name ?? '').trim()
      ].join('|');

      if (!unique.has(key)) {
        unique.set(key, item);
      }
    });

    return [...unique.values()];
  };

  const getAdtRowForSelectedModel = () => {
    const selectedBasePeriode = getSelectedPeriode();
    const targetPeriode = formatPeriode(effectiveMonth.value || selectedMonth.value);

    const typeBudgetPrefix = buildTypeBudget(selectedReportType.value, selectedVersion.value).slice(0, 3);

    const currentModel = String(selectedModel.value ?? '').trim();
    const currentName = String(selectedName.value ?? '').trim();

    if (!selectedBasePeriode || !targetPeriode || !typeBudgetPrefix || !currentModel || !currentName) {
      return null;
    }

    const rows = getAdtSearchRows().filter((item: any) => {
      const ketStr = String(item?.ket ?? '')
        .toUpperCase()
        .trim();

      if (!ketStr.endsWith('ADT') && !ketStr.endsWith('ADV')) {
        return false;
      }

      if (selectedSchemaHandling.value === 'additional' && !ketStr.endsWith('ADT')) {
        return false;
      }

      if (selectedSchemaHandling.value === 'advance' && !ketStr.endsWith('ADV')) {
        return false;
      }

      return (
        String(item?.ket ?? '').slice(0, 3) === typeBudgetPrefix &&
        String(item?.model ?? '').trim() === currentModel &&
        String(item?.name ?? '').trim() === currentName
      );
    });

    const sameBaseSameTarget = rows.find((item: any) => {
      const basePeriode = normalizePeriode(item?.base_month || item?.month);

      return basePeriode === selectedBasePeriode && isSchemaRowTargetingPeriode(item, targetPeriode);
    });

    if (sameBaseSameTarget) {
      return sameBaseSameTarget;
    }

    return null;
  };

  const getSchemaTypeFromKet = (ket: any): SchemaHandling => {
    const ketStr = String(ket ?? '')
      .toUpperCase()
      .trim();

    if (ketStr.endsWith('ADT')) return 'additional';
    if (ketStr.endsWith('ADV')) return 'advance';

    return '';
  };

  const getSchemaRows = () => {
    const rows: any[] = [];

    if (Array.isArray(materialSchemaRows.value)) {
      rows.push(...materialSchemaRows.value);
    }

    if (Array.isArray(budgetMat.value)) {
      rows.push(...budgetMat.value);
    }

    return rows;
  };

  const getSelectedSchemaTarget = () => {
    const baseMonth = formatPeriode(selectedMonth.value);
    const effective = formatPeriode(effectiveMonth.value);

    const model = String(selectedModel.value ?? '').trim();
    const name = String(selectedName.value ?? '').trim();

    const typeBudgetPrefix = buildTypeBudget(selectedReportType.value, selectedVersion.value).slice(0, 3);

    return {
      baseMonth,
      effective,
      model,
      name,
      typeBudgetPrefix
    };
  };

  const findSchemaForSelectedTarget = (options?: { excludeCurrent?: boolean }) => {
    const { baseMonth, effective, model, name, typeBudgetPrefix } = getSelectedSchemaTarget();

    if (!baseMonth || !effective || !model || !name || !typeBudgetPrefix) {
      return null;
    }

    const rows = getSchemaRows();
    const excludeCurrent = options?.excludeCurrent ?? false;

    return (
      rows.find((item: any) => {
        const schemaType = getSchemaTypeFromKet(item?.ket);

        if (!schemaType) return false;

        const itemId = Number(item?.id ?? 0);
        const currentId = Number(currentADTId.value ?? 0);

        if (excludeCurrent && currentId > 0 && itemId === currentId) {
          return false;
        }

        const itemBaseMonth = normalizeYm(item?.base_month || item?.month);
        const itemEffectiveMonth = normalizeYm(item?.effective_month || item?.month);
        const itemModel = String(item?.model ?? '').trim();
        const itemName = String(item?.name ?? '').trim();
        const itemKetPrefix = String(item?.ket ?? '').slice(0, 3);

        return (
          itemBaseMonth === baseMonth &&
          itemEffectiveMonth === effective &&
          itemModel === model &&
          itemName === name &&
          itemKetPrefix === typeBudgetPrefix
        );
      }) ?? null
    );
  };

  const selectedTargetExistingSchema = computed(() => {
    return findSchemaForSelectedTarget({ excludeCurrent: false });
  });

  const selectedTargetExistingSchemaType = computed(() => {
    return selectedTargetExistingSchema.value ? getSchemaTypeFromKet(selectedTargetExistingSchema.value?.ket) : '';
  });

  const isSchemaHandlingLocked = computed(() => {
    if (!selectedModel.value || !selectedName.value || !effectiveMonth.value) {
      return false;
    }

    return !!selectedTargetExistingSchema.value;
  });

  const schemaHandlingLockMessage = computed(() => {
    if (!isSchemaHandlingLocked.value) return '';

    const type = selectedTargetExistingSchemaType.value;
    const label = type === 'advance' ? 'Advance' : 'Additional';

    return `${selectedModel.value} - ${selectedName.value} pada effective month ${effectiveMonth.value} sudah memiliki schema ${label}. Hapus data dahulu jika ingin membuat schema baru.`;
  });

  const findExistingSchemaForEffectiveMonth = () => {
    return findSchemaForSelectedTarget({ excludeCurrent: true });
  };

  const buildExistingSchemaMessage = (existing: any) => {
    const schemaType = getSchemaTypeFromKet(existing?.ket);
    const schemaLabel = schemaType === 'advance' ? 'Advance' : 'Additional';

    const model = String(existing?.model ?? selectedModel.value ?? '').trim();
    const name = String(existing?.name ?? selectedName.value ?? '').trim();
    const effective = effectiveMonth.value;

    return `Data untuk model ${model} dan name ${name} pada effective month ${effective} sudah memiliki schema ${schemaLabel}. Hapus data tersebut terlebih dahulu jika ingin membuat schema baru.`;
  };

  const getServerFileUrl = (fileName: string) => {
    const BASE_FILE_URL = 'http://localhost/MAJ_BE/uploads/material_handling';
    return `${BASE_FILE_URL}/${fileName}`;
  };

  /* ==============================
   * MATERIAL HANDLING ACTION
   * ============================== */
  const onFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files ? target.files[0] : null;
    scanFile.value = file;

    if (!file) {
      scanFile.value = null;
      previewUrl.value = '';
      isImage.value = false;
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      notification.showAlertWarning('Ukuran file tidak boleh lebih dari 5 MB!');

      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value);
      }

      target.value = '';
      scanFile.value = null;
      previewUrl.value = '';
      isImage.value = false;
      return;
    }

    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
    }

    scanFile.value = file;
    previewUrl.value = URL.createObjectURL(file);
    isImage.value = file.type.startsWith('image/');
  };

  const openModalBase = () => {
    isReadADT.value = false;
    currentADTId.value = null;

    clearCarryForwardHint();

    iaaNo.value = '';
    scanFile.value = null;
    existingScanFileName.value = '';
    previewUrl.value = '';
    showPreview.value = false;
    activeSchemaRow.value = null;
    clearExistingSchemaDiffState();

    selectedModel.value = '';
    selectedName.value = '';
    selectedSchemaHandling.value = 'additional';

    effectiveMonth.value = selectedMonth.value;

    pcsPrev.value = 0;
    kgPrev.value = 0;
    amountPrev.value = 0;

    pcsDifference.value = 0;
    kgDifference.value = 0;
    amountDifference.value = 0;

    advanceMonth.value = '';
    advancePcsPrev.value = null;
    advanceKgprev.value = null;
    advanceAmountprev.value = null;
    advancePcsDiff.value = null;
    advanceKgDiff.value = null;
    advanceAmountDiff.value = null;
    advanceHint.value = '';

    resetAdvanceList();

    showMaterialModal.value = true;
  };

  const openMaterialHandling = async (opts?: { month?: string | number; from?: 'button' | 'monthDot' }) => {
    const source = opts?.from ?? 'button';
    const monthParam = opts?.month;

    if (source === 'button' && !requireBudgetMaterialPermission('create', 'Create')) {
      return;
    }

    if (source === 'monthDot') {
      if (!monthParam || !isMonthHasADT(monthParam)) return;

      if (isDotBeforeSelectedBaseMonth(monthParam) || !isDotInsideSelectedBaseRange(monthParam)) {
        showDotOutOfSelectedRangeWarning(monthParam);
        return;
      }

      await refreshSchemaCacheForSelectedBase();

      const carryForwardSchemaRow = getCarryForwardSchemaRowForDot(monthParam);

      if (carryForwardSchemaRow && !isDotBelongsToSelectedBaseMonth(monthParam)) {
        if (!includeADT.value) {
          notification.showConfirm(
            'Apply Material Schema',
            'Data material handling bulan ini berasal dari base month sebelumnya. Sistem akan membuka data tersebut sebagai dasar difference untuk base month yang sedang dipilih. Apakah Anda ingin apply sekarang?',
            async () => {
              includeADT.value = true;
              applyCarryForwardMode.value = true;
              await loadBudgetMat();
              openCarryForwardSchemaPopup(monthParam, carryForwardSchemaRow);
            }
          );

          return;
        }

        openCarryForwardSchemaPopup(monthParam, carryForwardSchemaRow);
        return;
      }

      if (!isDotBelongsToSelectedBaseMonth(monthParam)) {
        notification.showAlertWarning('Data Material Handling belum bisa dibuka karena schema sumber tidak ditemukan!');
        return;
      }

      if (!includeADT.value) {
        notification.showConfirm(
          'Apply Material Schema',
          'Silakan klik Apply Material Schema terlebih dahulu untuk memuat data Material Handling. Apakah Anda ingin apply sekarang?',
          async () => {
            includeADT.value = true;
            await loadBudgetMat();
            openAdtPopup(monthParam);
          }
        );

        return;
      }

      openAdtPopup(monthParam);
      return;
    }

    const hasSchemaForSelectedBase = await refreshSchemaCacheForSelectedBase();

    if (!hasSchemaForSelectedBase) {
      openModalBase();
      return;
    }

    let targetEffectivePeriode = getFirstSchemaEffectiveMonthForSelectedBase();

    if (!targetEffectivePeriode) {
      openModalBase();
      return;
    }

    const openExistingMaterialHandling = async () => {
      const targetEffectiveMonth = periodeToMonthInput(targetEffectivePeriode);
      openAdtPopup(targetEffectiveMonth || selectedMonth.value);
    };

    if (!includeADT.value) {
      notification.showConfirm(
        'Apply Material Schema',
        'Data Material Handling untuk bulan ini sudah ada. Silakan klik Apply Material Schema terlebih dahulu untuk membuka mode update. Apakah Anda ingin apply sekarang?',
        async () => {
          includeADT.value = true;
          await loadBudgetMat();

          targetEffectivePeriode = getFirstSchemaEffectiveMonthForSelectedBase();

          if (!targetEffectivePeriode) {
            notification.showAlertWarning('Data Material Handling belum ditemukan setelah Apply Material Schema');
            return;
          }

          await openExistingMaterialHandling();
        }
      );
      return;
    }

    await openExistingMaterialHandling();
  };

  /* ==============================
   * VALIDASI CLOSE MATERIAL HANDLING
   * ============================== */
  const hasAdditionalDifference = () => {
    return isDifferentValue(pcsDifference.value) || isDifferentValue(kgDifference.value) || isDifferentValue(amountDifference.value);
  };

  const hasAdvanceDifference = () => {
    const items = getAdvanceItemsPayload();

    return items.some((item) => {
      return isDifferentValue(item.pcs_diff) || isDifferentValue(item.kg_diff) || isDifferentValue(item.amount_diff);
    });
  };

  const hasMaterialHandlingDifference = () => {
    if (selectedSchemaHandling.value === 'advance') {
      return hasAdvanceDifference();
    }

    return hasAdditionalDifference();
  };

  const isCloseBlockedBecauseNoDifference = () => {
    if (!showMaterialModal.value) return false;

    /*
     * Kalau belum ada schema handling, biarkan close normal.
     */
    if (!selectedSchemaHandling.value) return false;

    /*
     * Kalau ada difference, boleh close.
     */
    if (hasMaterialHandlingDifference()) return false;

    /*
     * Kalau data sudah tersimpan tetapi semua difference 0,
     * user harus isi difference atau hapus data dahulu.
     */
    return !!currentADTId.value || isReadADT.value;
  };

  const confirmCloseModal = () => {
    if (!showMaterialModal.value) {
      return;
    }

    /*
     * Existing Material Handling dalam mode VIEW:
     *
     * Jika seluruh Difference / Advance = 0,
     * tidak ada perubahan numerik yang perlu
     * diperingatkan. Tutup modal langsung.
     */
    if (isReadADT.value && !hasMaterialHandlingDifference()) {
      showMaterialModal.value = false;
      return;
    }

    /*
     * Jika ada nilai Difference / Advance,
     * pertahankan konfirmasi agar perubahan
     * tidak hilang tanpa sengaja.
     */
    notification.showConfirm('Konfirmasi', 'Yakin ingin membatalkan?', async () => {
      showMaterialModal.value = false;
    });
  };

  const confirmSaveModal = () => {
    const requiredAction: BudgetMaterialPermissionAction = currentADTId.value ? 'update' : 'create';
    const requiredLabel = currentADTId.value ? 'Update' : 'Create';

    if (!requireBudgetMaterialPermission(requiredAction, requiredLabel)) return;

    notification.showConfirm('Konfirmasi Simpan', 'Apakah Anda yakin ingin menyimpan data?', async () => {
      await saveForm();
    });
  };
  const hasExistingAdvanceSchema = computed(() => {
    return !!currentADTId.value && isReadADT.value && activeSchemaRow.value !== null && existingSchemaType.value === 'advance';
  });

  const isAdvanceFieldResetActive = (field: ResetField) => {
    if (!hasExistingAdvanceSchema.value) return false;

    if (field === 'pcs') {
      return isDifferentValue(pcsDifference.value) || isDifferentValue(advancePcsDiff.value);
    }

    if (field === 'kg') {
      return isDifferentValue(kgDifference.value) || isDifferentValue(advanceKgDiff.value);
    }

    return isDifferentValue(amountDifference.value) || isDifferentValue(advanceAmountDiff.value);
  };

  const resetAdvanceFieldValue = (field: ResetField) => {
    if (field === 'pcs') {
      advancePcsDiff.value = 0;

      advanceList.value.forEach((item) => {
        item.pcsDiff = 0;
      });

      syncEffectiveDifferenceFromAdvance();
      return;
    }

    if (field === 'kg') {
      advanceKgDiff.value = 0;

      advanceList.value.forEach((item) => {
        item.kgDiff = 0;
      });

      syncEffectiveDifferenceFromAdvance();
      return;
    }

    advanceAmountDiff.value = 0;

    advanceList.value.forEach((item) => {
      item.amountDiff = 0;
    });

    syncEffectiveDifferenceFromAdvance();
  };

  const confirmResetAdvanceField = (field: ResetField) => {
    const labelMap = {
      pcs: 'PCS',
      kg: 'KG',
      amount: 'Amount'
    };

    if (!currentADTId.value) {
      notification.showAlertWarning('Data material handling belum tersimpan, reset tidak bisa dilakukan!');
      return;
    }

    if (!isAdvanceFieldResetActive(field)) {
      notification.showAlertWarning(`${labelMap[field]} tidak memiliki perubahan dari nilai original!`);
      return;
    }

    notification.showConfirm(
      `Reset ${labelMap[field]}`,
      `Apakah Anda yakin ingin mengembalikan ${labelMap[field]} ke nilai original sebelum schema advance diterapkan?`,
      async () => {
        const oldId = currentADTId.value;

        resetAdvanceFieldValue(field);

        const success = await doSubmitMaterialHandling({
          keepModalOpen: true,
          silent: true,
          allowZeroDiff: true
        });

        if (!success) return;

        currentADTId.value = oldId;

        const refreshedRow = getAdtRowForSelectedModel() || activeSchemaRow.value;

        if (refreshedRow) {
          activeSchemaRow.value = refreshedRow;
          currentADTId.value = refreshedRow.id ?? oldId;

          applyEffectiveSchemaDelta(refreshedRow);

          if (isAdvanceSchemaRow(refreshedRow)) {
            applyAdvanceSchemaDelta(refreshedRow);
          }
        }

        notification.showAlertSuccess(`${labelMap[field]} berhasil direset`);
      }
    );
  };
  const confirmResetField = (field: 'pcs' | 'kg' | 'amount') => {
    if (!requireBudgetMaterialPermission('update', 'Update')) return;

    const labelMap = {
      pcs: 'PCS',
      kg: 'KG',
      amount: 'Amount'
    };

    if (hasExistingAdvanceSchema.value) {
      confirmResetAdvanceField(field);
      return;
    }

    const activeMap = {
      pcs: isPcsResetActive.value,
      kg: isKgResetActive.value,
      amount: isAmountResetActive.value
    };

    if (!currentADTId.value) {
      notification.showAlertWarning('Data material handling belum tersimpan, reset tidak bisa dilakukan!');
      return;
    }

    if (!activeMap[field]) {
      notification.showAlertWarning(`${labelMap[field]} tidak memiliki perubahan dari nilai original`);
      return;
    }

    notification.showConfirm(
      `Reset ${labelMap[field]}`,
      `Apakah Anda yakin ingin mengembalikan ${labelMap[field]} ke nilai original sebelum schema diterapkan?`,
      async () => {
        try {
          notification.loading = true;

          const res = await resetMaterialHandlingFieldHmmI({
            id: currentADTId.value as number,
            field
          });

          const data = res.data;

          if (!data || data.status !== 'ok') {
            notification.showAlertError(data?.message || `Gagal reset ${labelMap[field]}.`);
            return;
          }

          await loadBudgetMat();

          const refreshedRow = getAdtRowForSelectedModel() || activeSchemaRow.value;

          if (refreshedRow) {
            activeSchemaRow.value = refreshedRow;
            applyEffectiveSchemaDelta(refreshedRow);
          } else {
            fillForecastFields(effectiveMonth.value || selectedMonth.value, selectedMonth.value, false);
            pcsDifference.value = 0;
            kgDifference.value = 0;
            amountDifference.value = 0;
          }

          notification.showAlertSuccess(data.message || `${labelMap[field]} berhasil direset`);
        } catch (e) {
          console.error('reset material field error', e);
          notification.showAlertError(`Terjadi error saat reset ${labelMap[field]}.`);
        } finally {
          notification.disableLoading();
        }
      }
    );
  };

  const isImageFileName = (fileName: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName || '');
  };

  const openPreview = () => {
    if (scanFile.value) {
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value);
      }

      previewUrl.value = URL.createObjectURL(scanFile.value);
      isImage.value = scanFile.value.type.startsWith('image/');
      showPreview.value = true;
      return;
    }

    if (existingScanFileName.value) {
      previewUrl.value = getServerFileUrl(existingScanFileName.value);
      isImage.value = isImageFileName(existingScanFileName.value);
      showPreview.value = true;
    }
  };

  const closePreview = () => {
    showPreview.value = false;
  };

  const doSubmitMaterialHandling = async (options?: { keepModalOpen?: boolean; silent?: boolean; allowZeroDiff?: boolean }) => {
    const requiredAction: BudgetMaterialPermissionAction = currentADTId.value ? 'update' : 'create';
    const requiredLabel = currentADTId.value ? 'Update' : 'Create';

    if (!requireBudgetMaterialPermission(requiredAction, requiredLabel)) return false;

    const month = formatPeriode(selectedMonth.value);

    const baseRow = getOriginalBudgetRowByModelAndName() || getOriginalBaseRowForBeforeValue();

    if (!baseRow) {
      notification.showAlertError('Row original budget_mat_hmmi tidak ditemukan!');
      return false;
    }

    const isAdvance = selectedSchemaHandling.value === 'advance';

    const advanceItemsPayload = isAdvance ? getAdvanceItemsPayload() : [];

    const totalAdvancePcs = isAdvance ? getAdvancePayloadTotal(advanceItemsPayload, 'pcs_diff') : 0;

    const totalAdvanceKg = isAdvance ? getAdvancePayloadTotal(advanceItemsPayload, 'kg_diff') : 0;

    const totalAdvanceAmount = isAdvance ? getAdvancePayloadTotal(advanceItemsPayload, 'amount_diff') : 0;

    if (!selectedSchemaHandling.value) {
      notification.showAlertWarning('Pilih Schema Handling terlebih dahulu!');
      return;
    }

    if (!effectiveMonth.value) {
      notification.showAlertWarning('Effective Month wajib diisi!');
      return;
    }

    if (isAdvance && !advanceMonth.value) {
      notification.showAlertWarning('Advance Month wajib diisi untuk skema advance.');
      return;
    }

    if (!isAdvance) {
      const diffPcs = Number(pcsDifference.value ?? 0);
      const diffKg = Number(kgDifference.value ?? 0);
      const diffAmount = Number(amountDifference.value ?? 0);

      if (!options?.allowZeroDiff && diffPcs === 0 && diffKg === 0 && diffAmount === 0) {
        notification.showAlertWarning(
          'Nilai difference (PCS/KG/Amount) semuanya 0.\nData ini belum menjadi additional terhadap budget sebelumnya!'
        );
        return;
      }
    } else {
      if (advanceItemsPayload.length === 0) {
        notification.showAlertWarning('Minimal satu Advance Month wajib diisi!');
        return;
      }

      const hasEmptyMonth = advanceList.value.some((item) => !item.month);

      if (hasEmptyMonth) {
        notification.showAlertWarning('Advance Month tambahan masih ada yang kosong!');
        return;
      }

      if (!options?.allowZeroDiff && totalAdvancePcs === 0 && totalAdvanceKg === 0 && totalAdvanceAmount === 0) {
        notification.showAlertWarning(
          'Nilai advance (PCS/KG/Amount) semuanya 0.\nData ini belum menjadi advance terhadap budget bulan berikutnya!'
        );
        return;
      }
    }

    const formData = new FormData();

    if (currentADTId.value) {
      formData.append('id', String(currentADTId.value));
    }

    formData.append('month', month);
    formData.append('ket', removeSchemaSuffix(baseRow.ket));
    formData.append('schema', selectedSchemaHandling.value);
    formData.append('cust', baseRow.cust || customerCode.value);
    formData.append('model', baseRow.model);
    formData.append('tipe', String(baseRow.tipe ?? 0));
    formData.append('name', selectedName.value);
    formData.append('iaa_no', iaaNo.value || '');
    if (existingScanFileName.value) {
      formData.append('existing_scan_file', existingScanFileName.value);
    }

    formData.append('effective_month', effectiveMonth.value || '');
    if (isAdvance) {
      formData.append('advance_items', JSON.stringify(advanceItemsPayload));
    }

    if (scanFile.value) {
      formData.append('scan_file', scanFile.value);
    }

    formData.append('diff_pcs', String(isAdvance ? totalAdvancePcs : numberValue(pcsDifference.value)));

    formData.append('diff_kg', String(isAdvance ? totalAdvanceKg : numberValue(kgDifference.value)));

    formData.append('diff_amount', String(isAdvance ? totalAdvanceAmount : numberValue(amountDifference.value)));

    formData.append(
      'row_base',
      JSON.stringify({
        ...baseRow,
        ket: removeSchemaSuffix(baseRow.ket)
      })
    );

    formData.append('apply_all_type_budget', 'true');

    try {
      notification.loading = true;

      const res = await saveMaterialHandlingHmmI(formData);
      const data = res.data;

      if (!data || data.status !== 'ok') {
        notification.showAlertError(data?.message || 'Gagal simpan material handling');
        return;
      }

      if (!options?.silent) {
        notification.showAlertSuccess(
          currentADTId.value ? data.message || 'Material handling berhasil diupdate!' : data.message || 'Material handling tersimpan!'
        );
      }

      await loadBudgetMat();
      await refreshSchemaCacheForSelectedBase();

      applyCarryForwardMode.value = false;

      const savedRow = findSchemaRowById(data?.id) || getAdtRowForSelectedModel() || activeSchemaRow.value;

      if (savedRow) {
        activeSchemaRow.value = savedRow;
        currentADTId.value = Number(savedRow?.id ?? data?.id ?? 0) || null;

        if (options?.keepModalOpen) {
          iaaNo.value = savedRow.iaa_no || '';
          existingScanFileName.value = savedRow.scan_file || '';

          applyEffectiveSchemaDelta(savedRow);

          if (isAdvanceSchemaRow(savedRow)) {
            applyAdvanceSchemaDelta(savedRow);
          }
        }
      }

      if (!options?.keepModalOpen) {
        resetForm();
        showMaterialModal.value = false;
      }

      return true;
    } catch (e: any) {
      console.error('saveForm error', e);

      const message = e?.response?.data?.message || 'Terjadi error jaringan saat simpan material handling.';

      notification.showAlertError(message);

      return false;
    } finally {
      notification.disableLoading();
    }
  };

  const saveForm = async () => {
    const isAdvance = selectedSchemaHandling.value === 'advance';

    if (!selectedSchemaHandling.value) {
      notification.showAlertWarning('Schema Handling wajib dipilih!');
      return;
    }

    if (!effectiveMonth.value) {
      notification.showAlertWarning('Effective Month wajib diisi!');
      return;
    }

    if (isAdvance && !advanceMonth.value) {
      notification.showAlertWarning('Advance Month wajib diisi untuk skema advance!');
      return;
    }

    if (!scanFile.value && !existingScanFileName.value) {
      notification.showAlertWarning('Upload Scan wajib diisi!');
      return;
    }

    const existingSchema = findExistingSchemaForEffectiveMonth();

    if (existingSchema) {
      notification.showAlertWarning(buildExistingSchemaMessage(existingSchema));
      return;
    }

    await doSubmitMaterialHandling();
  };
  const toMonthInput = (value: any) => {
    const clean = normalizePeriode(value);
    return clean ? periodeToMonthInput(clean) : '';
  };

  const parseAdvanceItemsFromSchemaRow = (schemaRow: any): AdvanceSubmitItem[] => {
    const result = new Map<string, AdvanceSubmitItem>();

    const raw = schemaRow?.advance_items;
    let parsed: any[] = [];

    if (Array.isArray(raw)) {
      parsed = raw;
    } else if (typeof raw === 'string' && raw.trim()) {
      try {
        const json = JSON.parse(raw);
        parsed = Array.isArray(json) ? json : [];
      } catch {
        parsed = [];
      }
    }

    parsed.forEach((item) => {
      const month = toMonthInput(item?.month);

      if (!month) return;

      result.set(month, {
        month,
        pcs_diff: numberValue(item?.pcs_diff),
        kg_diff: numberValue(item?.kg_diff),
        amount_diff: numberValue(item?.amount_diff)
      });
    });

    return [...result.values()];
  };

  const parseAdditionalDiff = (row: any) => {
    const raw = row?.additional_diff;

    if (!raw) return null;

    if (typeof raw === 'object') return raw;

    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }

    return null;
  };

  const openAdtPopup = (monthNumber?: number | string) => {
    if (!includeADT.value) {
      notification.showAlertWarning('Silakan klik Apply Material Schema terlebih dahulu untuk memuat ADT/ADV!');
      return;
    }

    clearCarryForwardHint();

    let targetMonth = selectedMonth.value;

    if (monthNumber !== undefined && monthNumber !== null && monthNumber !== '') {
      const raw = String(monthNumber).trim();

      if (/^\d{4}-\d{2}$/.test(raw)) {
        targetMonth = raw;
      } else if (/^\d{6}$/.test(raw)) {
        targetMonth = periodeToMonthInput(raw);
      } else {
        const selectedYear = getSelectedYear();
        const mm = raw.padStart(2, '0');
        targetMonth = `${selectedYear}-${mm}`;
      }
    }

    const basePeriode = formatPeriode(selectedMonth.value);
    const targetPeriode = normalizePeriode(targetMonth);

    const typeBudgetPrefix = buildTypeBudget(selectedReportType.value, selectedVersion.value).slice(0, 3);

    if (!basePeriode || !targetPeriode || !typeBudgetPrefix) return;

    const rows = getAdtSearchRows();

    const schemaRow =
      rows.find((item: any) => {
        const ketStr = String(item?.ket ?? '')
          .toUpperCase()
          .trim();

        const itemBaseMonth = normalizePeriode(item?.base_month || item?.month);
        const itemEffectiveMonth = normalizePeriode(item?.effective_month || item?.month);
        const itemKetPrefix = String(item?.ket ?? '').slice(0, 3);

        return (
          itemBaseMonth === basePeriode &&
          itemEffectiveMonth === targetPeriode &&
          itemKetPrefix === typeBudgetPrefix &&
          (ketStr.endsWith('ADT') || ketStr.endsWith('ADV'))
        );
      }) ||
      rows.find((item: any) => {
        const ketStr = String(item?.ket ?? '')
          .toUpperCase()
          .trim();

        const itemBaseMonth = normalizePeriode(item?.base_month || item?.month);
        const itemAdvanceItemMonths = getAdvanceItemPeriodesFromRow(item);
        const itemKetPrefix = String(item?.ket ?? '').slice(0, 3);

        return (
          itemBaseMonth === basePeriode &&
          itemKetPrefix === typeBudgetPrefix &&
          ketStr.endsWith('ADV') &&
          itemAdvanceItemMonths.includes(targetPeriode)
        );
      });

    if (!schemaRow) {
      notification.showAlertWarning(
        'Data Material Handling untuk bulan ini belum ditemukan. Pastikan data ADT/ADV sudah tersimpan dan Material Schema sudah di-apply!'
      );
      return;
    }

    const ketStr = String(schemaRow.ket ?? '')
      .toUpperCase()
      .trim();
    const isAdvance = ketStr.endsWith('ADV');

    activeSchemaRow.value = schemaRow;

    isReadADT.value = true;
    currentADTId.value = schemaRow.id ?? null;

    existingScanFileName.value = schemaRow.scan_file || '';
    iaaNo.value = schemaRow.iaa_no || '';

    isOpeningAdtPopup.value = true;

    selectedModel.value = String(schemaRow.model ?? '').trim();
    selectedName.value = String(schemaRow.name ?? '').trim();
    selectedSchemaHandling.value = isAdvance ? 'advance' : 'additional';

    effectiveMonth.value = periodeToMonthInput(schemaRow.effective_month || schemaRow.month);

    const parsedAdvanceItems = isAdvance ? parseAdvanceItemsFromSchemaRow(schemaRow) : [];

    advanceMonth.value = isAdvance ? parsedAdvanceItems[0]?.month || '' : '';

    applyEffectiveSchemaDelta(schemaRow);

    if (isAdvance && advanceMonth.value) {
      applyAdvanceSchemaDelta(schemaRow);
    } else {
      resetAdvanceList();
      advanceHint.value = null;
      advancePcsPrev.value = null;
      advanceKgprev.value = null;
      advanceAmountprev.value = null;
      resetAdvanceDiffFields();
    }

    scanFile.value = null;
    previewUrl.value = '';
    showPreview.value = false;
    showMaterialModal.value = true;

    setTimeout(() => {
      isOpeningAdtPopup.value = false;
    }, 0);
  };

  const confirmDeleteMaterial = async () => {
    if (!requireBudgetMaterialPermission('delete', 'Delete')) return;

    if (!currentADTId.value) {
      notification.showAlertWarning('Data ADT/ADV yang akan dihapus tidak ditemukan!');
      return;
    }

    notification.showConfirm(
      'Konfirmasi Hapus',
      `Yakin ingin menghapus data material handling ${selectedModel.value} - ${selectedName.value}?`,
      async () => {
        try {
          notification.loading = true;

          const res = await deleteMaterialHandlingHmmI(currentADTId.value as number);
          const data = res.data;

          if (!data || data.status !== 'ok') {
            notification.showAlertError(data?.message || 'Gagal menghapus material handling!');
            return;
          }

          notification.showAlertSuccess(data.message || 'Data material handling berhasil dihapus');

          await reloadAfterSchemaMutation();

          resetMaterialHandlingState();
          showMaterialModal.value = false;
        } catch (e) {
          console.error('delete material error', e);
          notification.showAlertError('Terjadi error saat menghapus material handling.');
        } finally {
          notification.disableLoading();
        }
      }
    );
  };

  /* ==============================
   * FORMAT TABEL
   * ============================== */
  const formatNumber = (value: any) => {
    if (value === null || value === undefined || value === '') return '0';

    const n = Math.round(Number(value) || 0);
    if (n === 0) return '-';

    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const formatModelName = (name: string) => {
    if (!name) return '';

    let n = String(name).replace(/-/g, ' ');

    if (n.trim().toUpperCase() === 'KS FL') {
      n = 'KS FL';
    }

    return n;
  };

  const rowspanNo = (no: string | number) => {
    return budgetMat.value.filter((r) => r.nokol === no).length;
  };

  const rowspanModel = (no: string | number, model: string) => {
    return budgetMat.value.filter((r) => r.nokol === no && r.model === model).length;
  };

  const shouldShowNo = (index: number) => {
    return index === 0 || budgetMat.value[index].nokol !== budgetMat.value[index - 1].nokol;
  };

  const groupNumber = (index: number) => {
    const seen = new Set();
    let counter = 0;

    for (let i = 0; i <= index; i += 1) {
      const key = budgetMat.value[i].nokol;

      if (!seen.has(key)) {
        seen.add(key);
        counter += 1;
      }
    }

    return counter;
  };

  const shouldShowModel = (index: number) => {
    return index === 0 || budgetMat.value[index].model !== budgetMat.value[index - 1].model;
  };

  const shouldShowTotalItem = (index: number) => {
    return index === 0 || budgetMat.value[index].total_item !== budgetMat.value[index - 1].total_item;
  };

  const isSameCKD = (no: any, model: any, field: string) => {
    const group = budgetMat.value.filter(
      (r) => r.nokol === no && r.model === model && (r.name === 'CKD PCS' || r.name === 'CKD Transport')
    );

    return group.length === 2 && group[0]?.[field] === group[1]?.[field];
  };

  const sumCKD = (no: any, model: any, field: string) => {
    const ckdPcsRow = budgetMat.value.find((r) => r.nokol === no && r.model === model && r.name === 'CKD PCS');

    return formatNumber(Number(ckdPcsRow?.[field] || 0));
  };

  const totalColumns = computed(() => {
    const totals: Record<string, number> = {
      total_item: 0,
      n0_pcs_forecast: 0,
      n0_kg_forecast: 0,
      n0_amount_forecast: 0,
      n0_pcs_act: 0,
      n0_kg_act: 0,
      n0_amount_act: 0,
      n_pcs_forecast: 0,
      n_kg_forecast: 0,
      n_amount_forecast: 0,
      n1_pcs_forecast: 0,
      n1_kg_forecast: 0,
      n1_amount_forecast: 0,
      n2_pcs_forecast: 0,
      n2_kg_forecast: 0,
      n2_amount_forecast: 0,
      n3_pcs_forecast: 0,
      n3_kg_forecast: 0,
      n3_amount_forecast: 0
    };

    budgetMat.value.forEach((row) => {
      if (row.name === 'Material') {
        totals.total_item += Number(row.total_item || 0);
      }

      Object.keys(totals).forEach((key) => {
        if (key === 'total_item') return;

        const raw = row[key];
        if (raw === null || raw === undefined || raw === '') return;

       const value =
        Number(raw || 0);

      const isPcsCol =
        key.includes('pcs');

      const isCKDTransportRow =
        row.name === 'CKD Transport';

      if (
        isPcsCol &&
        isCKDTransportRow
      ) {
        return;
      }

      totals[key] += value;
      });
    });

    Object.keys(totals).forEach((key) => {
      totals[key] = Math.round(totals[key]);
    });

    return totals;
  });

  const formatDiff = (value: any) => {
    const n = Number(value ?? 0);
    const percent = Math.round(n);
    const absText = `${Math.abs(percent)}%`;

    return percent < 0 ? `(${absText})` : absText;
  };

  const totalDiff = computed(() => {
    const { n0_amount_forecast, n0_amount_act } = totalColumns.value as any;

    const forecast = Number(n0_amount_forecast || 0);
    const actual = Number(n0_amount_act || 0);

    if (!forecast) return 0;

    return ((actual - forecast) / forecast) * 100;
  });

  /* ==============================
   * BULAN / HEADER / NOTE
   * ============================== */
  const monthMap = [
    { full: 'Januari', fullShort: 'Jan', short: 'Jan' },
    { full: 'Februari', fullShort: 'Feb', short: 'Feb' },
    { full: 'Maret', fullShort: 'Mar', short: 'Mar' },
    { full: 'April', fullShort: 'Apr', short: 'Apr' },
    { full: 'Mei', fullShort: 'Mei', short: 'Mei' },
    { full: 'Juni', fullShort: 'Jun', short: 'Jun' },
    { full: 'Juli', fullShort: 'Jul', short: 'Jul' },
    { full: 'Agustus', fullShort: 'Agu', short: 'Agu' },
    { full: 'September', fullShort: 'Sep', short: 'Sep' },
    { full: 'Oktober', fullShort: 'Okt', short: 'Okt' },
    { full: 'November', fullShort: 'Nov', short: 'Nov' },
    { full: 'Desember', fullShort: 'Des', short: 'Des' }
  ];

  const getMonthTooltip = (month: any) => {
    const monthNumber = Number(month);
    const index = monthNumber - 1;

    const monthName = index >= 0 && index < monthMap.length ? monthMap[index]?.full || `Month ${month}` : `Month ${month}`;

    const selectedYear = getSelectedYear();
    if (!selectedYear) return monthName;

    const periode = `${selectedYear}${String(monthNumber).padStart(2, '0')}`;
    const schemaMap = getMonthSchemaMapForYear(selectedYear);
    const schemas = schemaMap[periode] || [];

    if (!schemas.length) return `${monthName} - ADT/ADV`;

    const labels: string[] = [];

    if (schemas.includes('ADT')) labels.push('Additional');
    if (schemas.includes('ADV')) labels.push('Advance');

    return `${monthName} - ${labels.join(', ')}`;
  };

  const selectedDateInfo = computed(() => {
    if (!selectedMonth.value) return null;

    const [yearStr, monthStr] = selectedMonth.value.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    const cur = monthMap[monthIndex];

    if (!cur) return null;

    const startIndex = (monthIndex + 12 - 3) % 12;
    const endIndex = (monthIndex + 12 - 1) % 12;
    const periodYear = monthIndex < 3 ? year - 1 : year;

    const prev = monthMap[endIndex];
    const prevYear = endIndex === 11 ? year - 1 : year;

    return {
      year,
      full: cur.full,
      short: cur.short,
      prevShort: prev.short,
      prevYear,
      periodShort: `${monthMap[startIndex].short} - ${monthMap[endIndex].short}`,
      periodYear
    };
  });

  const noteMonthShort = computed(() => {
    if (!selectedDateInfo.value) return '';
    return `${selectedDateInfo.value.short} ${selectedDateInfo.value.year}`;
  });

  const headerMonths = computed(() => {
    if (!selectedMonth.value) {
      return {
        nMinus1: '',
        n: '',
        nPlus1: '',
        nPlus2: '',
        nPlus3: ''
      };
    }

    const [yearStr, monthStr] = selectedMonth.value.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;

    const idx = [(monthIndex + 12 - 1) % 12, monthIndex, (monthIndex + 1) % 12, (monthIndex + 2) % 12, (monthIndex + 3) % 12];

    const years = idx.map((mi, i) => {
      if (i === 0 && mi > monthIndex) return year - 1;
      if (i >= 1 && mi < monthIndex) return year + 1;
      return year;
    });

    const short = (i: number) => monthMap[i].short;
    const yy = (v: number) => String(v).slice(-2);

    return {
      nMinus1: `${short(idx[0])}-${yy(years[0])}`,
      n: `${short(idx[1])}-${yy(years[1])}`,
      nPlus1: `${short(idx[2])}-${yy(years[2])}`,
      nPlus2: `${short(idx[3])}-${yy(years[3])}`,
      nPlus3: `${short(idx[4])}-${yy(years[4])}`
    };
  });

  const titleMonth = computed(() => {
    if (!selectedMonth.value) return '';

    const [year, month] = selectedMonth.value.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);

    const monthName = date.toLocaleString('id-ID', { month: 'long' }).toUpperCase();

    return `${monthName} ${year}`;
  });

  const formattedDate = computed(() => {
    const today = new Date();

    return today.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  });

  /* ==============================
   * HELPER VOLUME
   * ============================== */
  const getVolumeValue = (project: string, varian: string, field: string) => {
    const v = volumeResume.value?.[project]?.[varian]?.[field];
    return formatNumber(v);
  };

  /* ==============================
   * WATCH MATERIAL HANDLING
   * ============================== */
  watch([effectiveMonth, selectedSchemaHandling], () => {
    if (!effectiveMonth.value || !selectedMonth.value) return;

    const minEffective = effectiveMinMonth.value;
    const maxEffective = effectiveMaxMonth.value;

    if (minEffective && effectiveMonth.value < minEffective) {
      effectiveMonth.value = minEffective;
      return;
    }

    if (maxEffective && effectiveMonth.value > maxEffective) {
      effectiveMonth.value = maxEffective;
      return;
    }

    if (selectedSchemaHandling.value !== 'advance') return;

    const minAdvance = advanceMinMonth.value;
    const maxAdvance = advanceMaxMonth.value;

    if (!minAdvance || !maxAdvance) return;

    if (!advanceMonth.value || advanceMonth.value < minAdvance) {
      advanceMonth.value = minAdvance;
      return;
    }

    if (advanceMonth.value > maxAdvance) {
      advanceMonth.value = maxAdvance;
    }
  });

  watch(effectiveMonth, (val) => {
    if (!val || !selectedMonth.value) return;

    const max = getEffectiveMaxMonth(selectedMonth.value);

    if (val > max) {
      effectiveMonth.value = max;
    }
  });

  watch(effectiveMonth, () => {
    if (isOpeningAdtPopup.value) return;
    if (isHydratingAdvanceSchema.value) return;
    if (isReadADT.value) return;
    if (!effectiveMonth.value) return;

    const allowed = getAdvanceAllowed();

    if (!allowed.includes(advanceMonth.value)) {
      advanceMonth.value = allowed[0] || '';
    }

    resetAdvanceList();
  });

  watch([effectiveMonth, selectedModel, selectedName], () => {
    if (isOpeningAdtPopup.value) return;

    if (!effectiveMonth.value || !selectedModel.value || !selectedName.value) {
      pcsPrev.value = 0;
      kgPrev.value = 0;
      amountPrev.value = 0;

      pcsDifference.value = 0;
      kgDifference.value = 0;
      amountDifference.value = 0;

      activeSchemaRow.value = null;
      currentADTId.value = null;
      clearExistingSchemaDiffState();

      existingScanFileName.value = '';
      previewUrl.value = '';
      showPreview.value = false;

      return;
    }

    const schemaRow = getAdtRowForSelectedModel();

    if (schemaRow) {
      activeSchemaRow.value = schemaRow;
      currentADTId.value = schemaRow.id ?? null;

      iaaNo.value = iaaNo.value || schemaRow.iaa_no || '';
      existingScanFileName.value = schemaRow.scan_file || '';

      applyEffectiveSchemaDelta(schemaRow);

      if (isAdvanceSchemaRow(schemaRow)) {
        applyAdvanceSchemaDelta(schemaRow);
      }

      return;
    }

    activeSchemaRow.value = null;
    currentADTId.value = null;
    clearExistingSchemaDiffState();

    existingScanFileName.value = '';
    previewUrl.value = '';
    showPreview.value = false;

    fillForecastFields(effectiveMonth.value, selectedMonth.value, false);

    pcsDifference.value = 0;
    kgDifference.value = 0;
    amountDifference.value = 0;

    clearAdvanceFields(true);
    resetAdvanceDiffFields();
    resetAdvanceList();
  });

  const fillAdvanceBeforeFields = (targetMonth: string) => {
    const row = getOriginalBudgetRowByModelAndName();

    if (!row) {
      clearAdvanceFields(true);
      return 'Row original/base belum tersedia';
    }

    const slot = getForecastSlotByMonth(targetMonth, selectedMonth.value);

    if (!slot) {
      clearAdvanceFields(true);
      return 'Slot forecast tidak tersedia';
    }

    advancePcsPrev.value = numberValue(row?.[slot.pcs]);
    advanceKgprev.value = numberValue(row?.[slot.kg]);
    advanceAmountprev.value = numberValue(row?.[slot.amount]);

    return '';
  };

  watch([advanceMonth, selectedModel, selectedName], () => {
    if (selectedSchemaHandling.value !== 'advance') return;

    if (!advanceMonth.value || !selectedModel.value || !selectedName.value) {
      clearAdvanceFields(true);
      resetAdvanceDiffFields();
      advanceHint.value = '';
      return;
    }

    const schemaRow = activeSchemaRow.value || getAdtRowForSelectedModel();
    const selectedAdvancePeriode = formatPeriode(advanceMonth.value);
    const schemaAdvanceItemPeriodes = getAdvanceItemPeriodesFromRow(schemaRow);

    if (schemaRow && isAdvanceSchemaRow(schemaRow) && schemaAdvanceItemPeriodes.includes(selectedAdvancePeriode)) {
      applyAdvanceSchemaDelta(schemaRow);
      return;
    }

    const beforeHint = fillAdvanceBeforeFields(advanceMonth.value);

    advanceHint.value = beforeHint || getCarryForwardAdvanceHint(advanceMonth.value);
  });

  watch(selectedSchemaHandling, (val) => {
    if (isOpeningAdtPopup.value) return;
    if (isHydratingAdvanceSchema.value) return;
    if (isReadADT.value) return;

    if (val === 'advance') {
      const firstEffectiveMonth = selectedMonth.value;

      if (!effectiveMonth.value || effectiveMonth.value < effectiveMinMonth.value || effectiveMonth.value > effectiveMaxMonth.value) {
        effectiveMonth.value = firstEffectiveMonth;
      }

      advanceMonth.value = effectiveMonth.value ? addMonthsToMonthInput(effectiveMonth.value, 1) : '';

      if (advanceMonth.value > advanceMaxMonth.value) {
        advanceMonth.value = advanceMaxMonth.value;
      }

      resetAdvanceList();
      syncEffectiveDifferenceFromAdvance();
    }

    if (val === 'additional') {
      advanceMonth.value = '';
      advanceHint.value = '';
      resetAdvanceList();
    }
  });

  watch([advancePcsDiff, advanceKgDiff, advanceAmountDiff], () => {
    syncEffectiveDifferenceFromAdvance();
  });

  watch(
    advanceList,
    () => {
      syncEffectiveDifferenceFromAdvance();
    },
    { deep: true }
  );

  watch([selectedModel, selectedName], ([newModel, newName], [oldModel, oldName]) => {
    if (!showMaterialModal.value) return;

    if (isOpeningAdtPopup.value) return;

    if (newModel !== oldModel) {
      selectedName.value = '';
      return;
    }

    if (!newModel || !newName) {
      existingScanFileName.value = '';
      currentADTId.value = null;
      activeSchemaRow.value = null;
      clearExistingSchemaDiffState();

      previewUrl.value = '';
      showPreview.value = false;

      pcsPrev.value = 0;
      kgPrev.value = 0;
      amountPrev.value = 0;

      pcsDifference.value = 0;
      kgDifference.value = 0;
      amountDifference.value = 0;

      clearAdvanceFields(true);
      resetAdvanceDiffFields();
      resetAdvanceList();
      return;
    }

    const schemaRow = getAdtRowForSelectedModel();

    if (schemaRow) {
      activeSchemaRow.value = schemaRow;
      currentADTId.value = schemaRow.id ?? null;
      iaaNo.value = iaaNo.value || schemaRow.iaa_no || '';
      existingScanFileName.value = schemaRow.scan_file || '';

      applyEffectiveSchemaDelta(schemaRow);

      if (isAdvanceSchemaRow(schemaRow)) {
        applyAdvanceSchemaDelta(schemaRow);
      } else {
        resetAdvanceList();
      }

      return;
    }

    activeSchemaRow.value = null;
    currentADTId.value = null;
    existingScanFileName.value = '';
    clearExistingSchemaDiffState();

    previewUrl.value = '';
    showPreview.value = false;

    fillForecastFields(effectiveMonth.value, selectedMonth.value, false);

    pcsDifference.value = 0;
    kgDifference.value = 0;
    amountDifference.value = 0;

    clearAdvanceFields(true);
    resetAdvanceDiffFields();
    resetAdvanceList();
  });

  watch(selectedModel, (newModel, oldModel) => {
    if (!showMaterialModal.value) return;
    if (isReadADT.value) return;

    if (newModel !== oldModel && !isOpeningAdtPopup.value) {
      pcsDifference.value = 0;
      kgDifference.value = 0;
      amountDifference.value = 0;

      advancePcsDiff.value = null;
      advanceKgDiff.value = null;
      advanceAmountDiff.value = null;
    }
  });

  watch([effectiveMonth, selectedSchemaHandling], () => {
    if (!showMaterialModal.value) return;
    if (isReadADT.value) return;
    if (!effectiveMonth.value) return;
    if (!selectedSchemaHandling.value) return;

    const existingSchema = findExistingSchemaForEffectiveMonth();

    if (!existingSchema) return;

    notification.showAlertWarning(buildExistingSchemaMessage(existingSchema));

    selectedSchemaHandling.value = '';
    advanceMonth.value = '';
    advanceHint.value = '';

    pcsDifference.value = null;
    kgDifference.value = null;
    amountDifference.value = null;

    advancePcsDiff.value = null;
    advanceKgDiff.value = null;
    advanceAmountDiff.value = null;
  });

  /* ==============================
   * WATCH FILTER
   * ============================== */
  watch([customerCode, selectedMonth, selectedReportType, selectedVersion], async () => {
    clearBudgetMatViewState();

    if (selectedMonth.value && selectedReportType.value && selectedVersion.value) {
      await refreshSchemaAvailabilityOnly();
    }
  });

  watch(selectedMonth, () => {
    if (includeADT.value && monthsWithADT.value.length === 0) {
      includeADT.value = false;
    }
  });
  watch([selectedModel, selectedName, effectiveMonth], () => {
    if (!showMaterialModal.value) return;
    if (!selectedModel.value || !selectedName.value || !effectiveMonth.value) return;

    const existing = findSchemaForSelectedTarget({ excludeCurrent: false });

    if (!existing) {
      return;
    }

    const schemaType = getSchemaTypeFromKet(existing?.ket);

    if (schemaType) {
      selectedSchemaHandling.value = schemaType;
    }
  });

  /* ==============================
   * INIT
   * ============================== */
  onMounted(async () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('hmmi')) customerCode.value = 'HMMI';

    try {
      const f = loadFilterFromStorage();

      if (f && f.periode && f.type_budget) {
        const year = f.periode.slice(0, 4);
        const month = f.periode.slice(4, 6);

        selectedMonth.value = `${year}-${month}`;

        const letter = f.type_budget.slice(0, 1);
        const version = f.type_budget.slice(1);

        selectedReportType.value = letter === 'R' ? 'Original' : 'Balancing';
        selectedVersion.value = version;

        await loadVolumeResume();
        await loadBudgetMat();
        await loadBudgetCal();
      }
    } catch (e) {
      console.error('getFilterData error', e);
    }
  });

  /* ==============================
   * RETURN UNTUK VUE
   * ============================== */
  return {
    /* Permission */
    permissions,
    salesAmountPermissions,
    canMutateBudgetMaterial,
    canMutateBudgetSalesAmount,

    /* Store/filter utama */
    customizer,
    budgetMat,
    selectedMonth,
    selectedReportType,
    selectedVersion,
    includeADT,

    /* Volume dan total */
    volumeTotalAll,
    totalColumns,
    totalDiff,

    /* Status filter dan schema */
    isReportTypeDisabled,
    isVersionDisabled,
    isFilterJsonDisabled,
    isExcelDisabled,
    canApplyMaterialSchema,
    isSelectedMonthHasADT,
    isSchemaMetaLoading,

    /* Header, note, dan tanggal report */
    selectedDateInfo,
    noteMonthShort,
    headerMonths,
    titleMonth,
    formattedDate,

    /* Modal material handling */
    showMaterialModal,
    scanFile,
    showPreview,
    previewUrl,
    isImage,
    isReadADT,
    iaaNo,
    existingScanFileName,

    /* Form material handling */
    effectiveHint,
    effectiveMonth,
    monthsForSelectedYear,
    advanceMonth,
    advanceHint,
    advanceMinMonth,

    /* Nilai additional */
    pcsPrev,
    kgPrev,
    amountPrev,
    pcsDifference,
    kgDifference,
    amountDifference,
    pcsAfter,
    kgAfter,
    amountAfter,

    /* Nilai advance */
    advancePcsPrev,
    advanceKgprev,
    advanceAmountprev,
    advancePcsDiff,
    advanceKgDiff,
    advanceAmountDiff,
    advancePcsAfter,
    advanceKgAfter,
    advanceAmountAfter,

    /* Dropdown dan dependency form */
    modelOptions,
    selectedModel,
    nameOptions,
    selectedName,
    selectedSchemaHandling,
    isDependentDisabled,

    /* Reset field controls */
    isPcsResetDisabled,
    isKgResetDisabled,
    isAmountResetDisabled,
    pcsPrevAdjusted,

    /* Filter/report actions */
    printA4,
    goFullScreen,
    applyFilter,
    toggleMaterialSchema,
    importExcelBudget,

    /* Material handling actions */
    onFileChange,
    confirmCloseModal,
    confirmDeleteMaterial,
    confirmResetField,
    confirmSaveModal,
    openMaterialHandling,
    handleMonthDotClick,
    openPreview,
    closePreview,

    /* Table formatting */
    formatNumber,
    getMonthTooltip,
    formatModelName,
    rowspanModel,
    shouldShowNo,
    shouldShowModel,
    shouldShowTotalItem,
    isSameCKD,
    sumCKD,
    formatDiff,
    rowspanNo,
    groupNumber,
    getVolumeValue,
    hasSchemaForMonth,
    advanceMaxMonth,
    effectiveMinMonth,
    effectiveMaxMonth,
    isSchemaHandlingLocked,
    schemaHandlingLockMessage,
    addAdvanceMonth,
    advanceList,
    canAddAdvanceMonth,
    removeAdvanceMonth,
    handleAdvanceListMonthChange,
    getAdvanceListAfter,
    updateAdvanceListDiff,
    rememberAdvanceListMonth,
    loadBudgetMat
  };
});
