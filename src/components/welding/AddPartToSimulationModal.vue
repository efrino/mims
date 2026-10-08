<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { getMasterPartWithMdfo, getMasterPart, addNewPartToSimulationApi } from '@/services/PCD/Welding/Simulation';
import { useNotificationStore } from '@/stores/notification';

const props = defineProps<{
  modelValue: boolean;
  simulationId?: number | string;
  area?: string;
  periode?: string;
  machines?: Array<{ machine: string; [key: string]: any }>;
  isSubAssy?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved', payload: { loads?: any[]; summary?: any[]; message?: string }): void;
}>();

const notificationStore = useNotificationStore();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
});

const currentStep = ref<number>(1);
const viewMode = ref<'search' | 'table'>('search');
const isLoadingParts = ref(false);
const isSaving = ref(false);

const masterParts = ref<any[]>([]);
const selectedPart = ref<any | null>(null);

// Step 2 Form
const selectedMachine = ref<string>('');
const inputPcsDay = ref<number>(0);
const inputCycleTime = ref<number>(0);
const inputQtyKanban = ref<number>(0);
const inputLotCycle = ref<number>(1);
const inputDowntime = ref<number>(0);
const inputJumlahSpot = ref<number>(1);
const inputJig = ref<string>('');
const inputReason = ref<string>('');

// Machine options
const machineOptions = computed<string[]>(() => {
  if (props.machines && props.machines.length > 0) {
    return props.machines.map(m => (typeof m === 'string' ? m : (m?.machine || ''))).filter((s): s is string => !!s);
  }
  // Fallback defaults
  if (props.isSubAssy) {
    return Array.from({ length: 27 }, (_, i) => `RSW-${i + 1}`);
  }
  return [];
});

const loadMasterParts = async () => {
  if (masterParts.value.length > 0) return;
  isLoadingParts.value = true;
  try {
    const area = props.area || 'WSS ADM';
    const periode = props.periode ? props.periode.replace('-', '') : undefined;
    const res = await getMasterPartWithMdfo(area, periode);
    if (res && res.parts && res.parts.length > 0) {
      masterParts.value = res.parts;
    } else {
      // Fallback to getMasterPart
      const resFallback = await getMasterPart(area);
      masterParts.value = resFallback?.data?.data || resFallback?.data || [];
    }
  } catch (err) {
    console.error('Error loading master parts:', err);
    try {
      const resFallback = await getMasterPart(props.area);
      masterParts.value = resFallback?.data?.data || resFallback?.data || [];
    } catch (fallbackErr) {
      console.error('Fallback error loading master parts:', fallbackErr);
    }
  } finally {
    isLoadingParts.value = false;
  }
};

watch(() => props.modelValue, (val) => {
  if (val) {
    currentStep.value = 1;
    selectedPart.value = null;
    selectedMachine.value = '';
    inputReason.value = '';
    resetAllMasterExcelFilters();
    loadMasterParts();
  }
});

const onPartSelected = (part: any) => {
  selectedPart.value = part;
  if (part) {
    const pcsDay = Number(part.pcs_day_monthly ?? part.pcs_day ?? 0);
    inputPcsDay.value = pcsDay;
    inputCycleTime.value = Number(part.cycle_time_sec ?? 0);
    inputQtyKanban.value = Number(part.qty_kanban ?? part.qty_kbn ?? 0);
    inputLotCycle.value = Number(part.lot_cycle ?? 1) || 1;
    inputJumlahSpot.value = Number(part.jumlah_spot ?? 1) || 1;
    inputJig.value = part.jig || '';
    inputDowntime.value = Number(part.downtime ?? (props.isSubAssy ? 0.38 : 0));
    
    // Suggest machine if available in part master
    const defaultM = part.machine_raw || part.machine || '';
    if (defaultM && machineOptions.value.includes(defaultM)) {
      selectedMachine.value = defaultM;
    } else if (machineOptions.value.length > 0) {
      selectedMachine.value = machineOptions.value[0];
    }
    inputReason.value = `Penambahan Part Baru ke Mesin ${selectedMachine.value || '-'}`;
  }
};

watch(selectedMachine, (newM) => {
  if (newM && selectedPart.value) {
    inputReason.value = `Penambahan Part Baru ke Mesin ${newM}`;
  }
});

// Live Preview Calculations
const calcPreview = computed(() => {
  const pcsDay = Number(inputPcsDay.value) || 0;
  const ct = Number(inputCycleTime.value) || 0;
  const qtyKbn = Number(inputQtyKanban.value) || 0;
  const lotCycle = Number(inputLotCycle.value) || 1;
  const dt = Number(inputDowntime.value) || 0;

  if (props.isSubAssy) {
    // Sub Assy formula
    const spots = Number(inputJumlahSpot.value) || 1;
    const stroke = pcsDay * spots;
    const prodTimeMin = ct > 0 ? Number(((ct * pcsDay * 1.1) / 60).toFixed(2)) : 0;
    const tptMin = prodTimeMin;
    return {
      lotSize: pcsDay,
      countPallet: qtyKbn > 0 ? Number((pcsDay / qtyKbn).toFixed(2)) : 0,
      prodTime: prodTimeMin,
      dandori: 0,
      downtime: dt,
      tpt: tptMin,
      stroke: stroke,
      uph: prodTimeMin > 0 ? Number(((pcsDay / prodTimeMin) * 60).toFixed(1)) : 0
    };
  } else {
    // WSS / Standard formula
    const baseLotSize = pcsDay * (lotCycle / 2);
    const lotSize = qtyKbn > 0 ? Math.ceil(baseLotSize / qtyKbn) * qtyKbn : Math.ceil(baseLotSize);
    const countPallet = qtyKbn > 0 ? Number((lotSize / qtyKbn).toFixed(2)) : 0;
    const prodTime = ct > 0 ? Number(((ct * lotSize) / 60).toFixed(2)) : 0;
    const dandori = 5.0;
    const tpt = Number((dandori + dt + prodTime).toFixed(2));
    const uph = prodTime > 0 ? Number(((lotSize / prodTime) * 60).toFixed(1)) : 0;
    const stroke = lotSize; // standard 1 stroke per part
    return {
      lotSize,
      countPallet,
      prodTime,
      dandori,
      downtime: dt,
      tpt,
      stroke,
      uph
    };
  }
});

// --- EXCEL FILTER & SORT LOGIC FOR MASTER PARTS TABLE ---
const masterHeaders = [
  { title: 'Part Number', key: 'part_number' },
  { title: 'Nama Part', key: 'part_name' },
  { title: 'Job Number', key: 'job_number' },
  { title: 'Model', key: 'model' },
  { title: 'OP', key: 'op' },
  { title: 'Mesin Master', key: 'machine_raw' },
  { title: 'Pcs/Day (MDFO)', key: 'pcs_day_monthly' },
  { title: 'C/T (s)', key: 'cycle_time_sec' },
  { title: 'Qty Kbn', key: 'qty_kanban' },
];

const masterSortKey = ref<string | null>(null);
const masterSortDir = ref<'asc' | 'desc'>('asc');
const masterSearchQueries = ref<Record<string, string>>({});
const masterCheckedFilters = ref<Record<string, any[]>>({});
const masterGlobalSearch = ref('');

const getMasterUniqueItems = (key: string) => {
  const unique = new Set(masterParts.value.map((item: any) => {
    let val = item[key];
    if (key === 'op') val = item.op ?? item.process ?? 1;
    if (key === 'machine_raw') val = item.machine_raw ?? item.machine ?? '-';
    if (key === 'pcs_day_monthly') val = item.pcs_day_monthly ?? item.pcs_day ?? 0;
    if (key === 'qty_kanban') val = item.qty_kanban ?? item.qty_kbn ?? 0;
    return String(val ?? '');
  }));
  return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
};

const getMasterFilteredUniqueItems = (key: string) => {
  const items = getMasterUniqueItems(key);
  const query = (masterSearchQueries.value[key] || '').toLowerCase().trim();
  if (!query) return items;
  return items.filter(item => String(item).toLowerCase().includes(query));
};

const isAllMasterExcelItemsChecked = (key: string) => {
  const allFilteredItems = getMasterFilteredUniqueItems(key);
  if (allFilteredItems.length === 0) return false;
  const checked = masterCheckedFilters.value[key] || [];
  return allFilteredItems.every(item => checked.includes(item));
};

const toggleMasterExcelSelectAll = (key: string) => {
  const allFilteredItems = getMasterFilteredUniqueItems(key);
  const checked = masterCheckedFilters.value[key] || [];
  const isAllChecked = allFilteredItems.every(item => checked.includes(item));
  
  if (isAllChecked) {
    masterCheckedFilters.value[key] = checked.filter(c => !allFilteredItems.includes(c));
  } else {
    masterCheckedFilters.value[key] = [...new Set([...checked, ...allFilteredItems])];
  }
};

const isMasterExcelFilterActive = (key: string) => {
  return (masterCheckedFilters.value[key] && masterCheckedFilters.value[key].length > 0) || 
         (masterSearchQueries.value[key] && masterSearchQueries.value[key].length > 0);
};

const setMasterExcelSort = (key: string, dir: 'asc' | 'desc') => {
  if (masterSortKey.value === key && masterSortDir.value === dir) {
    masterSortKey.value = null;
  } else {
    masterSortKey.value = key;
    masterSortDir.value = dir;
  }
};

const clearSingleMasterExcelFilter = (key: string) => {
  masterCheckedFilters.value[key] = [];
  masterSearchQueries.value[key] = '';
  if (masterSortKey.value === key) masterSortKey.value = null;
};

const resetAllMasterExcelFilters = () => {
  masterSortKey.value = null;
  masterSortDir.value = 'asc';
  masterHeaders.forEach(h => {
    masterSearchQueries.value[h.key] = '';
    masterCheckedFilters.value[h.key] = [];
  });
};

const filteredMasterParts = computed(() => {
  let list = [...masterParts.value];

  // Global search in table mode
  if (masterGlobalSearch.value.trim()) {
    const q = masterGlobalSearch.value.trim().toLowerCase();
    list = list.filter((item: any) => {
      const pn = (item.part_number || '').toLowerCase();
      const name = (item.part_name || '').toLowerCase();
      const model = (item.model || '').toLowerCase();
      const job = (item.job_number || '').toLowerCase();
      const mach = (item.machine_raw || item.machine || '').toLowerCase();
      return pn.includes(q) || name.includes(q) || model.includes(q) || job.includes(q) || mach.includes(q);
    });
  }

  // Column excel filters
  masterHeaders.forEach(h => {
    const key = h.key;
    const query = masterSearchQueries.value[key]?.toLowerCase();
    const checked = masterCheckedFilters.value[key];

    if (query) {
      list = list.filter((item: any) => {
        let val = item[key];
        if (key === 'op') val = item.op ?? item.process ?? 1;
        if (key === 'machine_raw') val = item.machine_raw ?? item.machine ?? '-';
        if (key === 'pcs_day_monthly') val = item.pcs_day_monthly ?? item.pcs_day ?? 0;
        if (key === 'qty_kanban') val = item.qty_kanban ?? item.qty_kbn ?? 0;
        return String(val ?? '').toLowerCase().includes(query);
      });
    }
    
    if (checked && checked.length > 0) {
      list = list.filter((item: any) => {
        let val = item[key];
        if (key === 'op') val = item.op ?? item.process ?? 1;
        if (key === 'machine_raw') val = item.machine_raw ?? item.machine ?? '-';
        if (key === 'pcs_day_monthly') val = item.pcs_day_monthly ?? item.pcs_day ?? 0;
        if (key === 'qty_kanban') val = item.qty_kanban ?? item.qty_kbn ?? 0;
        return checked.includes(String(val ?? ''));
      });
    }
  });

  // Sort
  if (masterSortKey.value) {
    const key = masterSortKey.value;
    const dir = masterSortDir.value;
    list.sort((a: any, b: any) => {
      let valA = a[key];
      let valB = b[key];
      if (key === 'op') { valA = a.op ?? a.process ?? 1; valB = b.op ?? b.process ?? 1; }
      if (key === 'machine_raw') { valA = a.machine_raw ?? a.machine ?? ''; valB = b.machine_raw ?? b.machine ?? ''; }
      if (key === 'pcs_day_monthly') { valA = Number(a.pcs_day_monthly ?? a.pcs_day ?? 0); valB = Number(b.pcs_day_monthly ?? b.pcs_day ?? 0); }
      if (key === 'qty_kanban') { valA = Number(a.qty_kanban ?? a.qty_kbn ?? 0); valB = Number(b.qty_kanban ?? b.qty_kbn ?? 0); }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return dir === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA ?? '');
      const strB = String(valB ?? '');
      return dir === 'asc' ? strA.localeCompare(strB, undefined, { numeric: true }) : strB.localeCompare(strA, undefined, { numeric: true });
    });
  }

  return list;
});

const selectPartFromTable = (part: any) => {
  onPartSelected(part);
  goToStep2();
};

const goToStep2 = () => {
  if (!selectedPart.value) {
    notificationStore.showDialogError('Peringatan', 'Silakan pilih part terlebih dahulu');
    return;
  }
  currentStep.value = 2;
};

const handleSave = async () => {
  if (!props.simulationId) {
    notificationStore.showDialogError('Error', 'ID Simulasi tidak ditemukan');
    return;
  }
  if (!selectedPart.value) {
    notificationStore.showDialogError('Peringatan', 'Silakan pilih part terlebih dahulu');
    return;
  }
  if (!selectedMachine.value) {
    notificationStore.showDialogError('Peringatan', 'Silakan pilih mesin tujuan');
    return;
  }
  if (inputPcsDay.value <= 0) {
    notificationStore.showDialogError('Peringatan', 'Nilai Pcs/Day harus lebih dari 0');
    return;
  }

  isSaving.value = true;
  try {
    const payload = {
      id_simulation: props.simulationId,
      id_ms_part: selectedPart.value.id || selectedPart.value.id_ms_part,
      part_number: selectedPart.value.part_number,
      part_name: selectedPart.value.part_name,
      model: selectedPart.value.model,
      job_number: selectedPart.value.job_number,
      process: selectedPart.value.op || selectedPart.value.process || 1,
      machine_use: selectedMachine.value,
      machine_prev: selectedPart.value.machine_raw || selectedPart.value.machine || '',
      pcs_day: Number(inputPcsDay.value),
      cycle_time_sec: Number(inputCycleTime.value),
      qty_kanban: Number(inputQtyKanban.value),
      lot_cycle: Number(inputLotCycle.value),
      jumlah_spot: Number(inputJumlahSpot.value),
      jig: inputJig.value,
      downtime: Number(inputDowntime.value),
      reason: inputReason.value || `Penambahan Part Baru ke Mesin ${selectedMachine.value}`,
      user: 'User'
    };

    const res = await addNewPartToSimulationApi(payload);
    if (res && res.status === 'success') {
      notificationStore.showDialogSuccess('Berhasil', res.message || 'Part berhasil ditambahkan ke simulasi');
      emit('saved', {
        loads: res.loads,
        summary: res.summary,
        message: res.message
      });
      isOpen.value = false;
    } else {
      notificationStore.showDialogError('Gagal', res?.message || 'Gagal menambahkan part');
    }
  } catch (err: any) {
    console.error('Error adding part to simulation:', err);
    notificationStore.showDialogError('Error', err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem saat menambahkan part');
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="isOpen" max-width="1050px" persistent scrollable>
    <v-card class="rounded-xl overflow-hidden shadow-2xl">
      <!-- Header with High Contrast White Icon -->
      <v-card-title class="pa-4 text-white d-flex align-center justify-space-between" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);">
        <div class="d-flex align-center">
          <v-avatar color="rgba(255, 255, 255, 0.2)" size="40" class="mr-3 elevation-1">
            <v-icon color="white" size="24">mdi-plus-box-multiple</v-icon>
          </v-avatar>
          <div>
            <div class="text-subtitle-1 font-weight-bold text-white">Tambah Part Baru ke Simulasi</div>
            <div class="text-caption text-blue-lighten-4">
              Step {{ currentStep }} dari 2: {{ currentStep === 1 ? 'Pilih Part dari Master (ms_welding)' : 'Alokasi Mesin & Beban Produksi' }}
            </div>
          </div>
        </div>
        <v-btn icon variant="text" size="small" color="white" @click="isOpen = false" :disabled="isSaving">
          <v-icon color="white">mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <!-- Step Progress Bar -->
      <div class="bg-grey-lighten-4 px-6 py-2 border-b d-flex align-center justify-space-between">
        <div class="d-flex align-center flex-grow-1 mr-4">
          <v-chip
            :color="currentStep >= 1 ? 'primary' : 'grey'"
            :variant="currentStep >= 1 ? 'flat' : 'outlined'"
            size="small"
            class="font-weight-bold mr-2"
          >
            1
          </v-chip>
          <span class="text-caption font-weight-bold mr-3" :class="currentStep === 1 ? 'text-primary' : 'text-grey-darken-1'">
            Pilih Part
          </span>
          <v-divider class="mx-2 flex-grow-1"></v-divider>
          <v-chip
            :color="currentStep >= 2 ? 'primary' : 'grey'"
            :variant="currentStep >= 2 ? 'flat' : 'outlined'"
            size="small"
            class="font-weight-bold mr-2"
          >
            2
          </v-chip>
          <span class="text-caption font-weight-bold" :class="currentStep === 2 ? 'text-primary' : 'text-grey-darken-1'">
            Alokasi Mesin & Parameter
          </span>
        </div>

        <div v-if="currentStep === 1" class="d-flex align-center gap-1">
          <v-btn
            size="x-small"
            :variant="viewMode === 'search' ? 'flat' : 'outlined'"
            color="primary"
            prepend-icon="mdi-magnify"
            @click="viewMode = 'search'"
          >
            Pencarian Cepat
          </v-btn>
          <v-btn
            size="x-small"
            :variant="viewMode === 'table' ? 'flat' : 'outlined'"
            color="primary"
            prepend-icon="mdi-table"
            @click="viewMode = 'table'"
          >
            Tabel Master Part ({{ masterParts.length }})
          </v-btn>
        </div>
      </div>

      <!-- Card Body -->
      <v-card-text class="pa-5" style="max-height: 65vh;">
        <!-- STEP 1: PILIH PART -->
        <div v-if="currentStep === 1">
          <!-- MODE 1: SEARCH / AUTOCOMPLETE -->
          <div v-if="viewMode === 'search'">
            <div class="text-subtitle-2 font-weight-bold text-grey-darken-3 mb-2 d-flex align-center">
              <v-icon color="primary" class="mr-1" size="18">mdi-magnify</v-icon>
              Cari Berdasarkan Part Number, Job Number, atau Nama Part:
            </div>

            <v-autocomplete
              :items="masterParts"
              :loading="isLoadingParts"
              item-title="part_number"
              return-object
              variant="outlined"
              density="comfortable"
              color="primary"
              placeholder="Ketik Part Number, Job Number, Nama Part, atau Model..."
              clearable
              hide-details="auto"
              :custom-filter="(itemTitle: string, queryText: string, item: any) => {
                const q = queryText.toLowerCase();
                const raw = item.raw || {};
                const pn = (raw.part_number || '').toLowerCase();
                const name = (raw.part_name || '').toLowerCase();
                const model = (raw.model || '').toLowerCase();
                const job = (raw.job_number || '').toLowerCase();
                return pn.includes(q) || name.includes(q) || model.includes(q) || job.includes(q);
              }"
              @update:model-value="onPartSelected"
            >
              <template #item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps" :title="undefined">
                  <div class="py-1">
                    <div class="d-flex align-center justify-space-between">
                      <span class="font-weight-bold text-primary">{{ item.raw.part_number }}</span>
                      <div class="d-flex align-center gap-1">
                        <v-chip size="x-small" color="indigo" variant="flat" class="font-weight-bold text-white">
                          Job: {{ item.raw.job_number || '-' }}
                        </v-chip>
                        <v-chip size="x-small" color="blue-grey" variant="tonal" class="font-weight-medium">
                          {{ item.raw.model || '-' }}
                        </v-chip>
                      </div>
                    </div>
                    <div class="text-caption text-grey-darken-2 text-truncate">{{ item.raw.part_name || 'No Description' }}</div>
                    <div class="d-flex align-center text-caption text-grey mt-0.5" style="font-size: 11px;">
                      <span class="mr-2">OP: <strong>{{ item.raw.op || item.raw.process || 1 }}</strong></span>
                      <span class="mr-2">CT: <strong>{{ item.raw.cycle_time_sec || 0 }}s</strong></span>
                      <span class="mr-2">Kbn: <strong>{{ item.raw.qty_kanban || item.raw.qty_kbn || '-' }}</strong></span>
                      <span class="mr-2">Mesin: <strong>{{ item.raw.machine_raw || item.raw.machine || '-' }}</strong></span>
                      <span>Pcs/Day: <strong class="text-success">{{ item.raw.pcs_day_monthly || item.raw.pcs_day || 0 }}</strong></span>
                    </div>
                  </div>
                </v-list-item>
              </template>
            </v-autocomplete>

            <!-- Selected Part Details Card -->
            <v-slide-y-transition>
              <v-card v-if="selectedPart" variant="tonal" color="primary" class="mt-4 pa-4 rounded-lg border">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="text-subtitle-1 font-weight-bold text-primary">
                    {{ selectedPart.part_number }}
                  </div>
                  <div class="d-flex align-center gap-1">
                    <v-chip size="small" color="indigo-darken-2" variant="flat" class="font-weight-bold text-white">
                      Job Number: {{ selectedPart.job_number || '-' }}
                    </v-chip>
                    <v-chip size="small" color="primary" variant="flat" class="font-weight-bold">
                      {{ selectedPart.model || 'Model N/A' }}
                    </v-chip>
                  </div>
                </div>

                <div class="text-body-2 font-weight-medium text-grey-darken-3 mb-3">
                  {{ selectedPart.part_name || 'Tidak ada deskripsi part' }}
                </div>

                <v-row dense class="text-caption">
                  <v-col cols="6" sm="4">
                    <span class="text-grey-darken-1">Job Number:</span>
                    <div class="font-weight-bold text-indigo-darken-2">{{ selectedPart.job_number || '-' }}</div>
                  </v-col>
                  <v-col cols="6" sm="4">
                    <span class="text-grey-darken-1">Proses / OP:</span>
                    <div class="font-weight-bold">{{ selectedPart.op || selectedPart.process || 1 }} (Total: {{ selectedPart.total_proses || 1 }})</div>
                  </v-col>
                  <v-col cols="6" sm="4">
                    <span class="text-grey-darken-1">Cycle Time (CT):</span>
                    <div class="font-weight-bold">{{ selectedPart.cycle_time_sec || 0 }} detik</div>
                  </v-col>
                  <v-col cols="6" sm="4">
                    <span class="text-grey-darken-1">Qty Kanban:</span>
                    <div class="font-weight-bold">{{ selectedPart.qty_kanban || selectedPart.qty_kbn || 0 }} pcs</div>
                  </v-col>
                  <v-col cols="6" sm="4">
                    <span class="text-grey-darken-1">Lot Cycle:</span>
                    <div class="font-weight-bold">{{ selectedPart.lot_cycle || 1 }} shift</div>
                  </v-col>
                  <v-col cols="6" sm="4">
                    <span class="text-grey-darken-1">Pcs/Day (MDFO):</span>
                    <div class="font-weight-bold text-success">{{ selectedPart.pcs_day_monthly || selectedPart.pcs_day || 0 }} pcs</div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="selectedPart.jig">
                    <span class="text-grey-darken-1">Jig:</span>
                    <div class="font-weight-bold">{{ selectedPart.jig }}</div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="selectedPart.jumlah_spot">
                    <span class="text-grey-darken-1">Jumlah Spot:</span>
                    <div class="font-weight-bold">{{ selectedPart.jumlah_spot }} spot</div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="selectedPart.machine_raw || selectedPart.machine">
                    <span class="text-grey-darken-1">Mesin Master:</span>
                    <div class="font-weight-bold text-blue-darken-2">{{ selectedPart.machine_raw || selectedPart.machine }}</div>
                  </v-col>
                </v-row>
              </v-card>
            </v-slide-y-transition>

            <v-alert v-if="!selectedPart" type="info" variant="tonal" class="mt-4 text-caption" density="compact" icon="mdi-information-outline">
              Ketik dan pilih part number atau job number dari ms_welding untuk melanjutkan ke konfigurasi alokasi mesin.
            </v-alert>
          </div>

          <!-- MODE 2: TABLE VIEW WITH EXCEL FILTER & SORT -->
          <div v-else-if="viewMode === 'table'">
            <div class="d-flex flex-wrap align-center justify-space-between gap-2 mb-3">
              <div class="d-flex align-center gap-2">
                <span class="text-caption font-weight-bold text-grey-darken-2">
                  Total Part Master: <strong>{{ masterParts.length }}</strong>
                </span>
                <v-btn
                  size="x-small"
                  variant="text"
                  color="grey-darken-1"
                  prepend-icon="mdi-filter-off"
                  @click="resetAllMasterExcelFilters"
                >
                  Reset Filter
                </v-btn>
              </div>

              <v-text-field
                v-model="masterGlobalSearch"
                density="compact"
                variant="outlined"
                placeholder="Cari part / job / model / mesin..."
                hide-details
                prepend-inner-icon="mdi-magnify"
                style="max-width: 280px;"
                clearable
              ></v-text-field>
            </div>

            <!-- Master Table -->
            <v-table density="compact" class="border rounded-lg overflow-hidden text-body-2" height="340px" fixed-header>
              <thead>
                <tr style="background-color: #f1f5f9;">
                  <th
                    v-for="col in masterHeaders"
                    :key="col.key"
                    style="background-color: #f1f5f9;"
                    class="font-weight-bold"
                    :class="['op', 'pcs_day_monthly', 'cycle_time_sec', 'qty_kanban'].includes(col.key) ? 'text-center' : 'text-left'"
                  >
                    <v-menu :close-on-content-click="false" location="bottom start" transition="scale-transition">
                      <template v-slot:activator="{ props: menuProps }">
                        <div v-bind="menuProps" class="header-inner d-flex align-center cursor-pointer select-none py-1 hover-header" :class="['op', 'pcs_day_monthly', 'cycle_time_sec', 'qty_kanban'].includes(col.key) ? 'justify-center' : 'justify-start'">
                          <span :class="{'text-primary font-weight-bold': isMasterExcelFilterActive(col.key)}">
                            {{ col.title }}
                          </span>
                          <v-icon size="14" class="ml-1" :color="isMasterExcelFilterActive(col.key) || masterSortKey === col.key ? 'primary' : 'grey-lighten-1'">
                            {{ masterSortKey === col.key ? (masterSortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-filter-variant' }}
                          </v-icon>
                        </div>
                      </template>

                      <v-card width="250" class="pa-2 rounded-lg text-black">
                        <v-list density="compact" class="pa-0">
                          <v-list-item prepend-icon="mdi-sort-ascending" title="Sort Ascending" @click="setMasterExcelSort(col.key, 'asc')" />
                          <v-list-item prepend-icon="mdi-sort-descending" title="Sort Descending" @click="setMasterExcelSort(col.key, 'desc')" />
                        </v-list>
                        <v-divider class="my-1" />
                        
                        <v-text-field
                          v-model="masterSearchQueries[col.key]"
                          placeholder="Cari nilai..."
                          density="compact"
                          variant="outlined"
                          hide-details
                          prepend-inner-icon="mdi-magnify"
                          clearable
                          class="mb-2"
                        />

                        <div style="max-height: 180px; overflow-y: auto;" class="border rounded pa-1 text-left">
                          <v-checkbox
                            label="(Select All)"
                            density="compact"
                            hide-details
                            :model-value="isAllMasterExcelItemsChecked(col.key)"
                            @click="toggleMasterExcelSelectAll(col.key)"
                            class="ma-0 pa-0"
                          />
                          <v-checkbox
                            v-for="item in getMasterFilteredUniqueItems(col.key)"
                            :key="item"
                            :label="item || '-'"
                            :value="item"
                            v-model="masterCheckedFilters[col.key]"
                            density="compact"
                            hide-details
                            class="ma-0 pa-0"
                          />
                        </div>
                        
                        <v-card-actions class="justify-end pa-0 mt-2">
                          <v-btn size="x-small" variant="text" color="grey" @click="clearSingleMasterExcelFilter(col.key)">Reset</v-btn>
                        </v-card-actions>
                      </v-card>
                    </v-menu>
                  </th>
                  <th style="background-color: #f1f5f9; width: 90px;" class="text-center font-weight-bold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="part in filteredMasterParts" :key="part.id || part.part_number" :class="{ 'bg-blue-lighten-5': selectedPart?.part_number === part.part_number }">
                  <td class="font-weight-bold text-primary">{{ part.part_number }}</td>
                  <td class="text-truncate" style="max-width: 170px;" :title="part.part_name">{{ part.part_name || '-' }}</td>
                  <td>
                    <span class="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {{ part.job_number || '-' }}
                    </span>
                  </td>
                  <td>{{ part.model || '-' }}</td>
                  <td class="text-center font-mono">{{ part.op || part.process || 1 }}</td>
                  <td>{{ part.machine_raw || part.machine || '-' }}</td>
                  <td class="text-center font-mono font-weight-bold text-success">{{ part.pcs_day_monthly || part.pcs_day || 0 }}</td>
                  <td class="text-center font-mono">{{ part.cycle_time_sec || 0 }}</td>
                  <td class="text-center font-mono">{{ part.qty_kanban || part.qty_kbn || 0 }}</td>
                  <td class="text-center">
                    <v-btn
                      size="x-small"
                      color="primary"
                      variant="flat"
                      class="font-weight-bold"
                      @click="selectPartFromTable(part)"
                    >
                      Pilih
                    </v-btn>
                  </td>
                </tr>
                <tr v-if="filteredMasterParts.length === 0">
                  <td colspan="10" class="text-center py-8 text-grey">
                    Tidak ada part yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </div>

        <!-- STEP 2: ALOKASI MESIN & PARAMETER -->
        <div v-else-if="currentStep === 2">
          <!-- Banner Selected Part with Job Number -->
          <div class="bg-blue-lighten-5 pa-3 rounded-lg border border-blue-lighten-3 mb-4 d-flex align-center justify-space-between">
            <div>
              <div class="d-flex align-center gap-2 mb-1">
                <span class="text-caption text-blue-darken-3 font-weight-bold">Part Terpilih:</span>
                <v-chip size="x-small" color="indigo-darken-2" variant="flat" class="font-weight-bold text-white">
                  Job: {{ selectedPart?.job_number || '-' }}
                </v-chip>
                <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                  {{ selectedPart?.model || '-' }}
                </v-chip>
              </div>
              <div class="text-subtitle-2 font-weight-bold text-primary">
                {{ selectedPart?.part_number }} - {{ selectedPart?.part_name }}
              </div>
            </div>
            <v-btn size="x-small" variant="text" color="primary" prepend-icon="mdi-pencil" @click="currentStep = 1">
              Ubah Part
            </v-btn>
          </div>

          <!-- Inputs -->
          <v-row dense>
            <v-col cols="12" sm="6">
              <label class="text-caption font-weight-bold text-grey-darken-3 mb-1 d-block">
                Mesin Tujuan (Machine Use) *
              </label>
              <v-select
                v-model="selectedMachine"
                :items="machineOptions"
                variant="outlined"
                density="comfortable"
                color="primary"
                placeholder="Pilih Mesin..."
                hide-details="auto"
                prepend-inner-icon="mdi-cog"
              ></v-select>
            </v-col>

            <v-col cols="12" sm="6">
              <label class="text-caption font-weight-bold text-grey-darken-3 mb-1 d-block">
                Pcs / Day (Kebutuhan Harian) *
              </label>
              <v-text-field
                v-model.number="inputPcsDay"
                type="number"
                min="1"
                variant="outlined"
                density="comfortable"
                color="primary"
                placeholder="Contoh: 120"
                hide-details="auto"
                suffix="pcs"
                prepend-inner-icon="mdi-calendar-today"
              ></v-text-field>
            </v-col>

            <v-col cols="6" sm="4">
              <label class="text-caption font-weight-bold text-grey-darken-3 mb-1 d-block">
                Cycle Time (Detik)
              </label>
              <v-text-field
                v-model.number="inputCycleTime"
                type="number"
                step="0.1"
                variant="outlined"
                density="compact"
                hide-details="auto"
                suffix="detik"
              ></v-text-field>
            </v-col>

            <v-col cols="6" sm="4">
              <label class="text-caption font-weight-bold text-grey-darken-3 mb-1 d-block">
                Qty / Kanban
              </label>
              <v-text-field
                v-model.number="inputQtyKanban"
                type="number"
                min="0"
                variant="outlined"
                density="compact"
                hide-details="auto"
                suffix="pcs"
              ></v-text-field>
            </v-col>

            <v-col cols="6" sm="4">
              <label class="text-caption font-weight-bold text-grey-darken-3 mb-1 d-block">
                Lot Cycle (Shift)
              </label>
              <v-text-field
                v-model.number="inputLotCycle"
                type="number"
                min="1"
                step="0.5"
                variant="outlined"
                density="compact"
                hide-details="auto"
              ></v-text-field>
            </v-col>

            <v-col cols="6" sm="4" v-if="isSubAssy">
              <label class="text-caption font-weight-bold text-grey-darken-3 mb-1 d-block">
                Jumlah Spot
              </label>
              <v-text-field
                v-model.number="inputJumlahSpot"
                type="number"
                min="1"
                variant="outlined"
                density="compact"
                hide-details="auto"
                suffix="spot"
              ></v-text-field>
            </v-col>

            <v-col cols="6" sm="4">
              <label class="text-caption font-weight-bold text-grey-darken-3 mb-1 d-block">
                Downtime (Menit)
              </label>
              <v-text-field
                v-model.number="inputDowntime"
                type="number"
                step="0.01"
                variant="outlined"
                density="compact"
                hide-details="auto"
                suffix="mnt"
              ></v-text-field>
            </v-col>

            <v-col cols="12" :sm="isSubAssy ? 4 : 8">
              <label class="text-caption font-weight-bold text-grey-darken-3 mb-1 d-block">
                Alasan / Catatan Penambahan
              </label>
              <v-text-field
                v-model="inputReason"
                variant="outlined"
                density="compact"
                placeholder="Alasan penambahan part..."
                hide-details="auto"
              ></v-text-field>
            </v-col>
          </v-row>

          <!-- LIVE PREVIEW CALCULATION CARD -->
          <v-card class="mt-4 pa-3 rounded-lg border bg-grey-lighten-5">
            <div class="text-caption font-weight-bold text-grey-darken-3 mb-2 d-flex align-center">
              <v-icon color="indigo" class="mr-1" size="16">mdi-calculator</v-icon>
              Preview Hasil Perhitungan Beban Mesin:
            </div>

            <v-row dense class="text-center">
              <v-col cols="4" sm="2">
                <v-sheet class="pa-2 rounded bg-white border">
                  <div class="text-caption text-grey">Lot Size</div>
                  <div class="text-subtitle-2 font-weight-bold text-primary">{{ calcPreview.lotSize }}</div>
                </v-sheet>
              </v-col>
              <v-col cols="4" sm="2">
                <v-sheet class="pa-2 rounded bg-white border">
                  <div class="text-caption text-grey">Prod Time</div>
                  <div class="text-subtitle-2 font-weight-bold text-indigo">{{ calcPreview.prodTime }} m</div>
                </v-sheet>
              </v-col>
              <v-col cols="4" sm="2">
                <v-sheet class="pa-2 rounded bg-white border">
                  <div class="text-caption text-grey">Dandori</div>
                  <div class="text-subtitle-2 font-weight-bold text-grey-darken-3">{{ calcPreview.dandori }} m</div>
                </v-sheet>
              </v-col>
              <v-col cols="4" sm="2">
                <v-sheet class="pa-2 rounded bg-white border">
                  <div class="text-caption text-grey">Downtime</div>
                  <div class="text-subtitle-2 font-weight-bold text-warning">{{ calcPreview.downtime }} m</div>
                </v-sheet>
              </v-col>
              <v-col cols="4" sm="2">
                <v-sheet class="pa-2 rounded bg-white border">
                  <div class="text-caption text-grey">Total TPT</div>
                  <div class="text-subtitle-2 font-weight-bold text-success">{{ calcPreview.tpt }} m</div>
                </v-sheet>
              </v-col>
              <v-col cols="4" sm="2">
                <v-sheet class="pa-2 rounded bg-white border">
                  <div class="text-caption text-grey">UPH</div>
                  <div class="text-subtitle-2 font-weight-bold text-purple">{{ calcPreview.uph }}</div>
                </v-sheet>
              </v-col>
            </v-row>
          </v-card>
        </div>
      </v-card-text>

      <!-- Footer Buttons -->
      <v-card-actions class="pa-4 bg-grey-lighten-4 border-t d-flex align-center justify-space-between">
        <div>
          <v-btn
            v-if="currentStep === 2"
            variant="outlined"
            color="grey-darken-1"
            size="small"
            prepend-icon="mdi-arrow-left"
            @click="currentStep = 1"
            :disabled="isSaving"
          >
            Kembali
          </v-btn>
        </div>

        <div class="d-flex align-center gap-2">
          <v-btn
            variant="text"
            color="grey-darken-2"
            size="small"
            @click="isOpen = false"
            :disabled="isSaving"
          >
            Batal
          </v-btn>

          <v-btn
            v-if="currentStep === 1"
            color="primary"
            variant="flat"
            size="small"
            append-icon="mdi-arrow-right"
            :disabled="!selectedPart"
            @click="goToStep2"
          >
            Lanjut ke Konfigurasi Mesin
          </v-btn>

          <v-btn
            v-else-if="currentStep === 2"
            color="success"
            variant="flat"
            size="small"
            prepend-icon="mdi-content-save"
            :loading="isSaving"
            :disabled="!selectedMachine || inputPcsDay <= 0"
            @click="handleSave"
          >
            Simpan & Tambahkan ke Simulasi
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.gap-1 {
  gap: 4px;
}
.gap-2 {
  gap: 8px;
}
.hover-header:hover {
  background-color: rgba(30, 60, 114, 0.08);
  border-radius: 4px;
}
</style>
