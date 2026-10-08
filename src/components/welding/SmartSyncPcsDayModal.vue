<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { getPcsKanban, syncSimulationPcsDayApi } from '@/services/PCD/Welding/Simulation';
import { useNotificationStore } from '@/stores/notification';

const props = defineProps<{
  modelValue: boolean;
  simulationId?: number | string;
  area?: string;
  periode?: string;
  currentLoads?: any[];
  isSubAssy?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'synced', payload: { loads?: any[]; summary?: any[]; message?: string }): void;
}>();

const notificationStore = useNotificationStore();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
});

const chosenSpmon = ref<string>('');
const isLoadingPreview = ref(false);
const isExecuting = ref(false);
const previewLoaded = ref(false);

const activeTab = ref<'parts' | 'machines'>('parts');
const filterChangeOnly = ref<'all' | 'changed' | 'increase' | 'decrease'>('all');
const globalSearchQuery = ref('');

// Options for SPMON dropdown
const spmonOptions = computed(() => {
  const options = [];
  const now = new Date();
  
  // 6 months back to 6 months forward
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const val = `${y}${m}`;
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const title = `${monthNames[d.getMonth()]} ${y} (${val})`;
    options.push({ title, value: val });
  }

  // Ensure props.periode format (e.g. 2026-09 -> 202609) is in options
  if (props.periode) {
    const rawVal = props.periode.replace('-', '');
    if (!options.some(o => o.value === rawVal)) {
      options.unshift({ title: `Periode Simulasi (${rawVal})`, value: rawVal });
    }
  }

  return options;
});

// Diff data items
interface PartDiffItem {
  part_number: string;
  part_name: string;
  job_number: string;
  model: string;
  machine_use: string;
  pcs_day_old: number;
  pcs_day_new: number;
  diff: number;
  selected: boolean;
}

const diffItems = ref<PartDiffItem[]>([]);

const normalizePn = (str: any) => {
  if (!str) return '';
  const s = String(str).replace(/^P/i, '').trim();
  return s.toLowerCase().replace(/[-\s]/g, '');
};

const loadPreview = async () => {
  if (!chosenSpmon.value) {
    notificationStore.showDialogError('Peringatan', 'Silakan pilih periode MDFO terlebih dahulu');
    return;
  }

  isLoadingPreview.value = true;
  diffItems.value = [];
  previewLoaded.value = false;
  resetAllPartExcelFilters();
  resetAllMachineExcelFilters();

  try {
    const area = props.area || 'WSS ADM';
    const res = await getPcsKanban(chosenSpmon.value, area);
    const kanbanData: any[] = (res && Array.isArray(res.data)) ? res.data : [];

    // Map kanban data by normalized PN
    const kanbanMap = new Map<string, any>();
    kanbanData.forEach(k => {
      const norm = normalizePn(k.part_number);
      if (norm) {
        kanbanMap.set(norm, k);
      }
    });

    const loads = props.currentLoads || [];
    const seenPns = new Set<string>();
    const items: PartDiffItem[] = [];

    loads.forEach(row => {
      const pn = String(row.part_number || '').trim();
      const norm = normalizePn(pn);
      if (!norm || seenPns.has(norm)) return;
      seenPns.add(norm);

      const oldPcs = Number(row.pcs_day ?? row.pcs_day_monthly ?? 0);
      const match = kanbanMap.get(norm);
      const newPcs = match ? Number(match.pcs_day_monthly ?? match.pcs_day ?? 0) : oldPcs;
      const diff = newPcs - oldPcs;

      items.push({
        part_number: pn,
        part_name: row.part_name || row.mw_part_name || match?.part_name || '-',
        job_number: row.job_number || row.mw_job_number || match?.job_number || '-',
        model: row.model || row.mw_model || match?.model || '-',
        machine_use: row.machine_use || row.machine || '-',
        pcs_day_old: oldPcs,
        pcs_day_new: newPcs,
        diff: diff,
        selected: true // Default select all
      });
    });

    diffItems.value = items;
    previewLoaded.value = true;
  } catch (err: any) {
    console.error('Error fetching preview Pcs/Day:', err);
    notificationStore.showDialogError('Error', err?.message || 'Gagal memuat preview data Pcs/Day MDFO');
  } finally {
    isLoadingPreview.value = false;
  }
};

watch(() => props.modelValue, (val) => {
  if (val) {
    previewLoaded.value = false;
    diffItems.value = [];
    activeTab.value = 'parts';
    filterChangeOnly.value = 'all';
    globalSearchQuery.value = '';

    // Set initial chosen spmon
    if (props.periode) {
      chosenSpmon.value = props.periode.replace('-', '');
    } else if (spmonOptions.value.length > 0) {
      chosenSpmon.value = spmonOptions.value[0].value;
    }
    
    // Auto load preview
    if (chosenSpmon.value) {
      loadPreview();
    }
  }
});

// Summary Stats
const totalPartsCount = computed(() => diffItems.value.length);
const changedPartsCount = computed(() => diffItems.value.filter(i => i.diff !== 0).length);
const increasedPartsCount = computed(() => diffItems.value.filter(i => i.diff > 0).length);
const decreasedPartsCount = computed(() => diffItems.value.filter(i => i.diff < 0).length);
const selectedCount = computed(() => diffItems.value.filter(i => i.selected).length);

const totalOldPcs = computed(() => diffItems.value.reduce((sum, i) => sum + i.pcs_day_old, 0));
const totalNewPcs = computed(() => diffItems.value.reduce((sum, i) => sum + (i.selected ? i.pcs_day_new : i.pcs_day_old), 0));

// --- EXCEL FILTER & SORT LOGIC FOR PART DIFF TABLE ---
const partHeaders = [
  { title: 'Part Number', key: 'part_number' },
  { title: 'Nama Part', key: 'part_name' },
  { title: 'Job Number', key: 'job_number' },
  { title: 'Model', key: 'model' },
  { title: 'Mesin Saat Ini', key: 'machine_use' },
  { title: 'Pcs/Day Lama', key: 'pcs_day_old' },
  { title: 'Pcs/Day Baru', key: 'pcs_day_new' },
  { title: 'Selisih', key: 'diff' },
];

const partSortKey = ref<string | null>(null);
const partSortDir = ref<'asc' | 'desc'>('asc');
const partSearchQueries = ref<Record<string, string>>({});
const partCheckedFilters = ref<Record<string, any[]>>({});

const getPartUniqueItems = (key: string) => {
  const unique = new Set(diffItems.value.map((item: any) => String(item[key] ?? '')));
  return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
};

const getPartFilteredUniqueItems = (key: string) => {
  const items = getPartUniqueItems(key);
  const query = (partSearchQueries.value[key] || '').toLowerCase().trim();
  if (!query) return items;
  return items.filter(item => String(item).toLowerCase().includes(query));
};

const isAllPartExcelItemsChecked = (key: string) => {
  const allFilteredItems = getPartFilteredUniqueItems(key);
  if (allFilteredItems.length === 0) return false;
  const checked = partCheckedFilters.value[key] || [];
  return allFilteredItems.every(item => checked.includes(item));
};

const togglePartExcelSelectAll = (key: string) => {
  const allFilteredItems = getPartFilteredUniqueItems(key);
  const checked = partCheckedFilters.value[key] || [];
  const isAllChecked = allFilteredItems.every(item => checked.includes(item));
  
  if (isAllChecked) {
    partCheckedFilters.value[key] = checked.filter(c => !allFilteredItems.includes(c));
  } else {
    partCheckedFilters.value[key] = [...new Set([...checked, ...allFilteredItems])];
  }
};

const isPartExcelFilterActive = (key: string) => {
  return (partCheckedFilters.value[key] && partCheckedFilters.value[key].length > 0) || 
         (partSearchQueries.value[key] && partSearchQueries.value[key].length > 0);
};

const setPartExcelSort = (key: string, dir: 'asc' | 'desc') => {
  if (partSortKey.value === key && partSortDir.value === dir) {
    partSortKey.value = null;
  } else {
    partSortKey.value = key;
    partSortDir.value = dir;
  }
};

const clearSinglePartExcelFilter = (key: string) => {
  partCheckedFilters.value[key] = [];
  partSearchQueries.value[key] = '';
  if (partSortKey.value === key) partSortKey.value = null;
};

const resetAllPartExcelFilters = () => {
  partSortKey.value = null;
  partSortDir.value = 'asc';
  partHeaders.forEach(h => {
    partSearchQueries.value[h.key] = '';
    partCheckedFilters.value[h.key] = [];
  });
};

// Filtered Part Items with Quick Buttons + Excel Column Filters + Sort
const filteredDiffItems = computed(() => {
  let list = [...diffItems.value];

  // Quick category buttons
  if (filterChangeOnly.value === 'changed') {
    list = list.filter(i => i.diff !== 0);
  } else if (filterChangeOnly.value === 'increase') {
    list = list.filter(i => i.diff > 0);
  } else if (filterChangeOnly.value === 'decrease') {
    list = list.filter(i => i.diff < 0);
  }

  // Global search
  if (globalSearchQuery.value.trim()) {
    const q = globalSearchQuery.value.trim().toLowerCase();
    list = list.filter(i => 
      i.part_number.toLowerCase().includes(q) ||
      i.part_name.toLowerCase().includes(q) ||
      i.model.toLowerCase().includes(q) ||
      i.machine_use.toLowerCase().includes(q) ||
      i.job_number.toLowerCase().includes(q)
    );
  }

  // Column excel filters
  partHeaders.forEach(h => {
    const key = h.key;
    const query = partSearchQueries.value[key]?.toLowerCase();
    const checked = partCheckedFilters.value[key];

    if (query) {
      list = list.filter((item: any) => String(item[key] ?? '').toLowerCase().includes(query));
    }
    
    if (checked && checked.length > 0) {
      list = list.filter((item: any) => checked.includes(String(item[key] ?? '')));
    }
  });

  // Sorting
  if (partSortKey.value) {
    const key = partSortKey.value;
    const dir = partSortDir.value;
    list.sort((a: any, b: any) => {
      const valA = a[key] ?? '';
      const valB = b[key] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return dir === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA);
      const strB = String(valB);
      return dir === 'asc' ? strA.localeCompare(strB, undefined, { numeric: true }) : strB.localeCompare(strA, undefined, { numeric: true });
    });
  }

  return list;
});

// Select All / Deselect All
const isAllSelected = computed({
  get: () => filteredDiffItems.value.length > 0 && filteredDiffItems.value.every(i => i.selected),
  set: (val: boolean) => {
    filteredDiffItems.value.forEach(i => {
      i.selected = val;
    });
  }
});

// --- MACHINE IMPACT TABLE & EXCEL SORT/FILTER ---
const machineHeaders = [
  { title: 'Mesin', key: 'machine' },
  { title: 'Total Part', key: 'totalParts' },
  { title: 'Total Pcs/Day Lama', key: 'oldPcs' },
  { title: 'Total Pcs/Day Baru', key: 'newPcs' },
  { title: 'Selisih Beban', key: 'diff' },
];

const machineSortKey = ref<string | null>(null);
const machineSortDir = ref<'asc' | 'desc'>('asc');
const machineSearchQueries = ref<Record<string, string>>({});
const machineCheckedFilters = ref<Record<string, any[]>>({});

const rawMachineImpacts = computed(() => {
  const map: Record<string, { machine: string; totalParts: number; oldPcs: number; newPcs: number; diff: number }> = {};

  diffItems.value.forEach(item => {
    const m = item.machine_use || 'Unknown';
    if (!map[m]) {
      map[m] = { machine: m, totalParts: 0, oldPcs: 0, newPcs: 0, diff: 0 };
    }
    map[m].totalParts += 1;
    map[m].oldPcs += item.pcs_day_old;
    const targetNew = item.selected ? item.pcs_day_new : item.pcs_day_old;
    map[m].newPcs += targetNew;
    map[m].diff += (targetNew - item.pcs_day_old);
  });

  return Object.values(map);
});

const getMachineUniqueItems = (key: string) => {
  const unique = new Set(rawMachineImpacts.value.map((item: any) => String(item[key] ?? '')));
  return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
};

const getMachineFilteredUniqueItems = (key: string) => {
  const items = getMachineUniqueItems(key);
  const query = (machineSearchQueries.value[key] || '').toLowerCase().trim();
  if (!query) return items;
  return items.filter(item => String(item).toLowerCase().includes(query));
};

const isAllMachineExcelItemsChecked = (key: string) => {
  const allFilteredItems = getMachineFilteredUniqueItems(key);
  if (allFilteredItems.length === 0) return false;
  const checked = machineCheckedFilters.value[key] || [];
  return allFilteredItems.every(item => checked.includes(item));
};

const toggleMachineExcelSelectAll = (key: string) => {
  const allFilteredItems = getMachineFilteredUniqueItems(key);
  const checked = machineCheckedFilters.value[key] || [];
  const isAllChecked = allFilteredItems.every(item => checked.includes(item));
  
  if (isAllChecked) {
    machineCheckedFilters.value[key] = checked.filter(c => !allFilteredItems.includes(c));
  } else {
    machineCheckedFilters.value[key] = [...new Set([...checked, ...allFilteredItems])];
  }
};

const isMachineExcelFilterActive = (key: string) => {
  return (machineCheckedFilters.value[key] && machineCheckedFilters.value[key].length > 0) || 
         (machineSearchQueries.value[key] && machineSearchQueries.value[key].length > 0);
};

const setMachineExcelSort = (key: string, dir: 'asc' | 'desc') => {
  if (machineSortKey.value === key && machineSortDir.value === dir) {
    machineSortKey.value = null;
  } else {
    machineSortKey.value = key;
    machineSortDir.value = dir;
  }
};

const clearSingleMachineExcelFilter = (key: string) => {
  machineCheckedFilters.value[key] = [];
  machineSearchQueries.value[key] = '';
  if (machineSortKey.value === key) machineSortKey.value = null;
};

const resetAllMachineExcelFilters = () => {
  machineSortKey.value = null;
  machineSortDir.value = 'asc';
  machineHeaders.forEach(h => {
    machineSearchQueries.value[h.key] = '';
    machineCheckedFilters.value[h.key] = [];
  });
};

const filteredMachineImpacts = computed(() => {
  let list = [...rawMachineImpacts.value];

  machineHeaders.forEach(h => {
    const key = h.key;
    const query = machineSearchQueries.value[key]?.toLowerCase();
    const checked = machineCheckedFilters.value[key];

    if (query) {
      list = list.filter((item: any) => String(item[key] ?? '').toLowerCase().includes(query));
    }
    
    if (checked && checked.length > 0) {
      list = list.filter((item: any) => checked.includes(String(item[key] ?? '')));
    }
  });

  if (machineSortKey.value) {
    const key = machineSortKey.value;
    const dir = machineSortDir.value;
    list.sort((a: any, b: any) => {
      const valA = a[key] ?? '';
      const valB = b[key] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return dir === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA);
      const strB = String(valB);
      return dir === 'asc' ? strA.localeCompare(strB, undefined, { numeric: true }) : strB.localeCompare(strA, undefined, { numeric: true });
    });
  } else {
    list.sort((a, b) => a.machine.localeCompare(b.machine, undefined, { numeric: true }));
  }

  return list;
});

const handleApplySync = async () => {
  if (!props.simulationId) {
    notificationStore.showDialogError('Error', 'ID Simulasi tidak ditemukan');
    return;
  }
  if (selectedCount.value === 0) {
    notificationStore.showDialogError('Peringatan', 'Silakan pilih minimal 1 part untuk disinkronkan');
    return;
  }

  isExecuting.value = true;
  try {
    const selectedPartsList = diffItems.value.filter(i => i.selected).map(i => i.part_number);
    
    const payload = {
      id_simulation: props.simulationId,
      spmon: chosenSpmon.value,
      selected_parts: selectedPartsList
    };

    const res = await syncSimulationPcsDayApi(payload);
    if (res && res.status === 'success') {
      notificationStore.showDialogSuccess(
        'Sinkronisasi Berhasil',
        res.message || `Berhasil memperbarui data Pcs/Day untuk ${selectedPartsList.length} part.`
      );
      emit('synced', {
        loads: res.loads,
        summary: res.summary,
        message: res.message
      });
      isOpen.value = false;
    } else {
      notificationStore.showDialogError('Gagal', res?.message || 'Gagal memperbarui data Pcs/Day');
    }
  } catch (err: any) {
    console.error('Error applying Pcs/Day sync:', err);
    notificationStore.showDialogError('Error', err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem saat sinkronisasi Pcs/Day');
  } finally {
    isExecuting.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="isOpen" max-width="1050px" persistent scrollable>
    <v-card class="rounded-xl overflow-hidden shadow-2xl">
      <!-- Header with High-Contrast White Icon -->
      <v-card-title class="pa-4 text-white d-flex align-center justify-space-between" style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);">
        <div class="d-flex align-center">
          <v-avatar color="rgba(255, 255, 255, 0.2)" size="40" class="mr-3 elevation-1">
            <v-icon color="white" size="24">mdi-cloud-sync</v-icon>
          </v-avatar>
          <div>
            <div class="text-subtitle-1 font-weight-bold text-white">Tarik Data Pcs / Day (MDFO Sync)</div>
            <div class="text-caption text-teal-lighten-4">
              Perbarui volume harian tanpa mereset alokasi mesin dan manual adjustment yang sudah ada
            </div>
          </div>
        </div>
        <v-btn icon variant="text" size="small" color="white" @click="isOpen = false" :disabled="isExecuting">
          <v-icon color="white">mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <!-- Toolbar Selection -->
      <div class="bg-grey-lighten-4 px-6 py-3 border-b">
        <v-row align="center" dense>
          <v-col cols="12" sm="7">
            <label class="text-caption font-weight-bold text-grey-darken-3 mb-1 d-block">
              Pilih Periode Data MDFO:
            </label>
            <v-select
              v-model="chosenSpmon"
              :items="spmonOptions"
              variant="outlined"
              density="compact"
              color="teal"
              hide-details
              prepend-inner-icon="mdi-calendar-month"
              @update:model-value="loadPreview"
            ></v-select>
          </v-col>
          <v-col cols="12" sm="5" class="d-flex align-end pt-3 pt-sm-0">
            <v-btn
              color="teal-darken-1"
              variant="flat"
              density="comfortable"
              class="font-weight-bold text-white flex-grow-1 elevation-1"
              prepend-icon="mdi-refresh"
              :loading="isLoadingPreview"
              @click="loadPreview"
            >
              Muat Ulang Preview
            </v-btn>
          </v-col>
        </v-row>
      </div>

      <!-- Card Body -->
      <v-card-text class="pa-5" style="max-height: 60vh;">
        <div v-if="isLoadingPreview" class="text-center py-10">
          <v-progress-circular indeterminate color="teal" size="48"></v-progress-circular>
          <div class="text-caption text-grey-darken-1 mt-3 font-weight-bold">
            Memuat perbandingan data MDFO dengan simulasi...
          </div>
        </div>

        <div v-else-if="previewLoaded">
          <!-- Summary Metrics Cards -->
          <v-row dense class="mb-4">
            <v-col cols="6" sm="3">
              <v-sheet class="pa-2.5 rounded-lg border bg-white text-center shadow-xs">
                <div class="text-caption text-grey">Total Part</div>
                <div class="text-subtitle-1 font-weight-bold text-primary">{{ totalPartsCount }}</div>
              </v-sheet>
            </v-col>
            <v-col cols="6" sm="3">
              <v-sheet class="pa-2.5 rounded-lg border bg-white text-center shadow-xs">
                <div class="text-caption text-grey">Part Berubah</div>
                <div class="text-subtitle-1 font-weight-bold text-warning">{{ changedPartsCount }}</div>
              </v-sheet>
            </v-col>
            <v-col cols="6" sm="3">
              <v-sheet class="pa-2.5 rounded-lg border bg-white text-center shadow-xs">
                <div class="text-caption text-grey">Pcs/Day Lama</div>
                <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">{{ totalOldPcs.toLocaleString() }}</div>
              </v-sheet>
            </v-col>
            <v-col cols="6" sm="3">
              <v-sheet class="pa-2.5 rounded-lg border bg-white text-center shadow-xs">
                <div class="text-caption text-grey">Pcs/Day Baru</div>
                <div class="text-subtitle-1 font-weight-bold text-teal-darken-2">{{ totalNewPcs.toLocaleString() }}</div>
              </v-sheet>
            </v-col>
          </v-row>

          <!-- Tabs View -->
          <v-tabs v-model="activeTab" density="compact" color="teal-darken-2" class="mb-3 border-b">
            <v-tab value="parts" class="font-weight-bold">
              <v-icon class="mr-1" size="18">mdi-format-list-checks</v-icon>
              Daftar Perubahan Part ({{ diffItems.length }})
            </v-tab>
            <v-tab value="machines" class="font-weight-bold">
              <v-icon class="mr-1" size="18">mdi-chart-box-outline</v-icon>
              Dampak Beban Mesin ({{ rawMachineImpacts.length }})
            </v-tab>
          </v-tabs>

          <!-- TAB 1: DAFTAR PART -->
          <div v-if="activeTab === 'parts'">
            <!-- Filters -->
            <div class="d-flex flex-wrap align-center justify-space-between gap-2 mb-3">
              <div class="d-flex align-center gap-1">
                <v-btn
                  size="x-small"
                  :variant="filterChangeOnly === 'all' ? 'flat' : 'outlined'"
                  :color="filterChangeOnly === 'all' ? 'teal' : 'grey'"
                  @click="filterChangeOnly = 'all'"
                >
                  Semua ({{ totalPartsCount }})
                </v-btn>
                <v-btn
                  size="x-small"
                  :variant="filterChangeOnly === 'changed' ? 'flat' : 'outlined'"
                  :color="filterChangeOnly === 'changed' ? 'warning' : 'grey'"
                  @click="filterChangeOnly = 'changed'"
                >
                  Berubah ({{ changedPartsCount }})
                </v-btn>
                <v-btn
                  size="x-small"
                  :variant="filterChangeOnly === 'increase' ? 'flat' : 'outlined'"
                  :color="filterChangeOnly === 'increase' ? 'success' : 'grey'"
                  @click="filterChangeOnly = 'increase'"
                >
                  🔺 Naik ({{ increasedPartsCount }})
                </v-btn>
                <v-btn
                  size="x-small"
                  :variant="filterChangeOnly === 'decrease' ? 'flat' : 'outlined'"
                  :color="filterChangeOnly === 'decrease' ? 'error' : 'grey'"
                  @click="filterChangeOnly = 'decrease'"
                >
                  🔻 Turun ({{ decreasedPartsCount }})
                </v-btn>
                <v-btn
                  size="x-small"
                  variant="text"
                  color="grey-darken-1"
                  prepend-icon="mdi-filter-off"
                  @click="resetAllPartExcelFilters"
                  class="ml-1"
                >
                  Reset Filter Excel
                </v-btn>
              </div>

              <v-text-field
                v-model="globalSearchQuery"
                density="compact"
                variant="outlined"
                placeholder="Cari part / job / mesin..."
                hide-details
                prepend-inner-icon="mdi-magnify"
                style="max-width: 240px;"
                clearable
              ></v-text-field>
            </div>

            <!-- Table Diff with Excel Sort & Filter Headers -->
            <v-table density="compact" class="custom-diff-table border rounded-lg overflow-hidden text-body-2" height="340px" fixed-header>
              <thead>
                <tr style="background-color: #f1f5f9;">
                  <th style="width: 45px; background-color: #f1f5f9;" class="text-center">
                    <v-checkbox-btn v-model="isAllSelected" density="compact" hide-details></v-checkbox-btn>
                  </th>
                  
                  <th
                    v-for="col in partHeaders"
                    :key="col.key"
                    style="background-color: #f1f5f9;"
                    class="font-weight-bold"
                    :class="['pcs_day_old', 'pcs_day_new', 'diff', 'machine_use'].includes(col.key) ? 'text-center' : 'text-left'"
                  >
                    <v-menu :close-on-content-click="false" location="bottom start" transition="scale-transition">
                      <template v-slot:activator="{ props: menuProps }">
                        <div v-bind="menuProps" class="header-inner d-flex align-center cursor-pointer select-none py-1 hover-header" :class="['pcs_day_old', 'pcs_day_new', 'diff', 'machine_use'].includes(col.key) ? 'justify-center' : 'justify-start'">
                          <span :class="{'text-teal-darken-2 font-weight-bold': isPartExcelFilterActive(col.key)}">
                            {{ col.title }}
                          </span>
                          <v-icon size="14" class="ml-1" :color="isPartExcelFilterActive(col.key) || partSortKey === col.key ? 'teal-darken-2' : 'grey-lighten-1'">
                            {{ partSortKey === col.key ? (partSortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-filter-variant' }}
                          </v-icon>
                        </div>
                      </template>

                      <v-card width="250" class="pa-2 rounded-lg text-black">
                        <v-list density="compact" class="pa-0">
                          <v-list-item prepend-icon="mdi-sort-ascending" title="Sort Ascending (A-Z / 0-9)" @click="setPartExcelSort(col.key, 'asc')" />
                          <v-list-item prepend-icon="mdi-sort-descending" title="Sort Descending (Z-A / 9-0)" @click="setPartExcelSort(col.key, 'desc')" />
                        </v-list>
                        <v-divider class="my-1" />
                        
                        <v-text-field
                          v-model="partSearchQueries[col.key]"
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
                            :model-value="isAllPartExcelItemsChecked(col.key)"
                            @click="togglePartExcelSelectAll(col.key)"
                            class="ma-0 pa-0"
                          />
                          <v-checkbox
                            v-for="item in getPartFilteredUniqueItems(col.key)"
                            :key="item"
                            :label="item || '-'"
                            :value="item"
                            v-model="partCheckedFilters[col.key]"
                            density="compact"
                            hide-details
                            class="ma-0 pa-0"
                          />
                        </div>
                        
                        <v-card-actions class="justify-end pa-0 mt-2">
                          <v-btn size="x-small" variant="text" color="grey" @click="clearSinglePartExcelFilter(col.key)">Reset</v-btn>
                        </v-card-actions>
                      </v-card>
                    </v-menu>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredDiffItems" :key="item.part_number" :class="{ 'bg-yellow-lighten-5': item.diff !== 0 && item.selected }">
                  <td class="text-center">
                    <v-checkbox-btn v-model="item.selected" density="compact" hide-details></v-checkbox-btn>
                  </td>
                  <td class="font-weight-bold text-primary">{{ item.part_number }}</td>
                  <td class="text-truncate" style="max-width: 180px;">{{ item.part_name }}</td>
                  <td>
                    <v-chip size="x-small" color="blue-grey" variant="tonal" class="font-weight-medium">
                      {{ item.job_number || '-' }}
                    </v-chip>
                  </td>
                  <td>
                    <span class="text-caption font-weight-medium text-grey-darken-2">{{ item.model || '-' }}</span>
                  </td>
                  <td class="text-center font-weight-medium text-blue-darken-3">{{ item.machine_use }}</td>
                  <td class="text-center font-mono text-grey-darken-2">{{ item.pcs_day_old }}</td>
                  <td class="text-center font-mono font-weight-bold" :class="item.diff !== 0 ? 'text-teal-darken-3' : 'text-grey-darken-2'">
                    {{ item.pcs_day_new }}
                  </td>
                  <td class="text-center font-mono font-weight-bold">
                    <span v-if="item.diff > 0" class="text-success">+{{ item.diff }}</span>
                    <span v-else-if="item.diff < 0" class="text-error">{{ item.diff }}</span>
                    <span v-else class="text-grey">-</span>
                  </td>
                </tr>
                <tr v-if="filteredDiffItems.length === 0">
                  <td colspan="9" class="text-center py-6 text-grey">
                    Tidak ada data part yang cocok dengan filter.
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <!-- TAB 2: DAMPAK BEBAN MESIN -->
          <div v-else-if="activeTab === 'machines'">
            <div class="d-flex justify-end mb-2">
              <v-btn
                size="x-small"
                variant="text"
                color="grey-darken-1"
                prepend-icon="mdi-filter-off"
                @click="resetAllMachineExcelFilters"
              >
                Reset Filter Mesin
              </v-btn>
            </div>

            <v-table density="compact" class="border rounded-lg overflow-hidden text-body-2" height="340px" fixed-header>
              <thead>
                <tr style="background-color: #f1f5f9;">
                  <th
                    v-for="col in machineHeaders"
                    :key="col.key"
                    style="background-color: #f1f5f9;"
                    class="font-weight-bold"
                    :class="col.key === 'machine' ? 'text-left' : 'text-center'"
                  >
                    <v-menu :close-on-content-click="false" location="bottom start" transition="scale-transition">
                      <template v-slot:activator="{ props: menuProps }">
                        <div v-bind="menuProps" class="header-inner d-flex align-center cursor-pointer select-none py-1 hover-header" :class="col.key === 'machine' ? 'justify-start' : 'justify-center'">
                          <span :class="{'text-teal-darken-2 font-weight-bold': isMachineExcelFilterActive(col.key)}">
                            {{ col.title }}
                          </span>
                          <v-icon size="14" class="ml-1" :color="isMachineExcelFilterActive(col.key) || machineSortKey === col.key ? 'teal-darken-2' : 'grey-lighten-1'">
                            {{ machineSortKey === col.key ? (machineSortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-filter-variant' }}
                          </v-icon>
                        </div>
                      </template>

                      <v-card width="250" class="pa-2 rounded-lg text-black">
                        <v-list density="compact" class="pa-0">
                          <v-list-item prepend-icon="mdi-sort-ascending" title="Sort Ascending (A-Z / 0-9)" @click="setMachineExcelSort(col.key, 'asc')" />
                          <v-list-item prepend-icon="mdi-sort-descending" title="Sort Descending (Z-A / 9-0)" @click="setMachineExcelSort(col.key, 'desc')" />
                        </v-list>
                        <v-divider class="my-1" />
                        
                        <v-text-field
                          v-model="machineSearchQueries[col.key]"
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
                            :model-value="isAllMachineExcelItemsChecked(col.key)"
                            @click="toggleMachineExcelSelectAll(col.key)"
                            class="ma-0 pa-0"
                          />
                          <v-checkbox
                            v-for="item in getMachineFilteredUniqueItems(col.key)"
                            :key="item"
                            :label="item || '-'"
                            :value="item"
                            v-model="machineCheckedFilters[col.key]"
                            density="compact"
                            hide-details
                            class="ma-0 pa-0"
                          />
                        </div>
                        
                        <v-card-actions class="justify-end pa-0 mt-2">
                          <v-btn size="x-small" variant="text" color="grey" @click="clearSingleMachineExcelFilter(col.key)">Reset</v-btn>
                        </v-card-actions>
                      </v-card>
                    </v-menu>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in filteredMachineImpacts" :key="m.machine" :class="{ 'bg-yellow-lighten-5': m.diff !== 0 }">
                  <td class="font-weight-bold text-primary">{{ m.machine }}</td>
                  <td class="text-center font-weight-medium">{{ m.totalParts }} part</td>
                  <td class="text-center font-mono text-grey-darken-2">{{ m.oldPcs.toLocaleString() }} pcs</td>
                  <td class="text-center font-mono font-weight-bold text-teal-darken-3">{{ m.newPcs.toLocaleString() }} pcs</td>
                  <td class="text-center font-mono font-weight-bold">
                    <span v-if="m.diff > 0" class="text-success">+{{ m.diff.toLocaleString() }}</span>
                    <span v-else-if="m.diff < 0" class="text-error">{{ m.diff.toLocaleString() }}</span>
                    <span v-else class="text-grey">-</span>
                  </td>
                </tr>
                <tr v-if="filteredMachineImpacts.length === 0">
                  <td colspan="5" class="text-center py-6 text-grey">
                    Tidak ada data mesin yang cocok.
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </div>

        <div v-else class="text-center py-10 text-grey-darken-1">
          <v-icon size="48" color="grey-lighten-1">mdi-database-search</v-icon>
          <div class="mt-2 text-body-2">Pilih periode di atas dan klik <strong>Muat Ulang Preview</strong> untuk melihat perbandingan.</div>
        </div>
      </v-card-text>

      <!-- Footer Buttons -->
      <v-card-actions class="pa-4 bg-grey-lighten-4 border-t d-flex align-center justify-space-between">
        <div class="text-caption text-grey-darken-2">
          <strong>{{ selectedCount }}</strong> dari <strong>{{ totalPartsCount }}</strong> part dipilih untuk disinkronkan
        </div>

        <div class="d-flex align-center gap-2">
          <v-btn
            variant="outlined"
            color="grey-darken-2"
            size="small"
            @click="isOpen = false"
            :disabled="isExecuting"
          >
            Batal
          </v-btn>

          <v-btn
            color="teal-darken-2"
            variant="flat"
            size="small"
            class="font-weight-bold text-white elevation-1"
            prepend-icon="mdi-check-all"
            :loading="isExecuting"
            :disabled="selectedCount === 0 || !previewLoaded"
            @click="handleApplySync"
          >
            Terapkan Sinkronisasi ({{ selectedCount }} Part)
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
  background-color: rgba(13, 148, 136, 0.08);
  border-radius: 4px;
}
</style>
