<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { PartMovementLog } from '@/types/PCD/Welding/MovementHistory';
import { fetchMovementLogsAsync, clearMovementLogs, exportMovementLogsToExcel } from '@/utils/partMovementLogger';
import { useNotificationStore } from '@/stores/notification';

const props = defineProps<{
  modelValue: boolean;
  simulationId?: number | string;
  loadsData?: any[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const notificationStore = useNotificationStore();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
});

const logs = ref<PartMovementLog[]>([]);
const logsLoading = ref(false);
const globalSearchQuery = ref('');
const typeFilter = ref<'all' | 'auto' | 'manual'>('all');
const exportLoading = ref(false);

const loadLogs = async () => {
  logsLoading.value = true;
  resetAllExcelFilters();
  try {
    logs.value = await fetchMovementLogsAsync(props.simulationId, props.loadsData);
  } catch (err) {
    console.error('Error fetching movement logs:', err);
  } finally {
    logsLoading.value = false;
  }
};

watch(() => props.modelValue, (val) => {
  if (val) {
    loadLogs();
  }
});

watch(() => props.simulationId, () => {
  loadLogs();
});

// Summary Stats
const totalCount = computed(() => logs.value.length);
const autoCount = computed(() => logs.value.filter(l => l.is_auto).length);
const manualCount = computed(() => logs.value.filter(l => !l.is_auto).length);
const uniquePartsCount = computed(() => new Set(logs.value.map(l => l.part_number)).size);

// --- EXCEL FILTER & SORT LOGIC FOR LOGS TABLE ---
const logHeaders = [
  { title: 'Waktu', key: 'timestamp' },
  { title: 'Part Number', key: 'part_number' },
  { title: 'Job Number', key: 'job_number' },
  { title: 'Model', key: 'model' },
  { title: 'Proses', key: 'process' },
  { title: 'Dari Mesin', key: 'from_machine' },
  { title: 'Ke Mesin', key: 'to_machine' },
  { title: 'Alasan / Catatan Sistem', key: 'reason' },
  { title: 'Tipe', key: 'is_auto' },
  { title: 'User', key: 'user' },
];

const sortKey = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');
const searchQueries = ref<Record<string, string>>({});
const checkedFilters = ref<Record<string, any[]>>({});

const getUniqueItems = (key: string) => {
  const unique = new Set(logs.value.map((item: any) => {
    if (key === 'is_auto') {
      return item.is_auto ? 'Auto-Balanced' : 'Manual Move';
    }
    return String(item[key] ?? '');
  }));
  return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
};

const getFilteredUniqueItems = (key: string) => {
  const items = getUniqueItems(key);
  const query = (searchQueries.value[key] || '').toLowerCase().trim();
  if (!query) return items;
  return items.filter(item => String(item).toLowerCase().includes(query));
};

const isAllExcelItemsChecked = (key: string) => {
  const allFilteredItems = getFilteredUniqueItems(key);
  if (allFilteredItems.length === 0) return false;
  const checked = checkedFilters.value[key] || [];
  return allFilteredItems.every(item => checked.includes(item));
};

const toggleExcelSelectAll = (key: string) => {
  const allFilteredItems = getFilteredUniqueItems(key);
  const checked = checkedFilters.value[key] || [];
  const isAllChecked = allFilteredItems.every(item => checked.includes(item));
  
  if (isAllChecked) {
    checkedFilters.value[key] = checked.filter(c => !allFilteredItems.includes(c));
  } else {
    checkedFilters.value[key] = [...new Set([...checked, ...allFilteredItems])];
  }
};

const isExcelFilterActive = (key: string) => {
  return (checkedFilters.value[key] && checkedFilters.value[key].length > 0) || 
         (searchQueries.value[key] && searchQueries.value[key].length > 0);
};

const setExcelSort = (key: string, dir: 'asc' | 'desc') => {
  if (sortKey.value === key && sortDir.value === dir) {
    sortKey.value = null;
  } else {
    sortKey.value = key;
    sortDir.value = dir;
  }
};

const clearSingleExcelFilter = (key: string) => {
  checkedFilters.value[key] = [];
  searchQueries.value[key] = '';
  if (sortKey.value === key) sortKey.value = null;
};

const resetAllExcelFilters = () => {
  sortKey.value = null;
  sortDir.value = 'asc';
  logHeaders.forEach(h => {
    searchQueries.value[h.key] = '';
    checkedFilters.value[h.key] = [];
  });
};

// Filtered Logs
const filteredLogs = computed(() => {
  let list = [...logs.value];

  if (typeFilter.value === 'auto') {
    list = list.filter(l => l.is_auto);
  } else if (typeFilter.value === 'manual') {
    list = list.filter(l => !l.is_auto);
  }

  if (globalSearchQuery.value.trim()) {
    const q = globalSearchQuery.value.trim().toLowerCase();
    list = list.filter(l => 
      l.part_number.toLowerCase().includes(q) ||
      (l.job_number && l.job_number.toLowerCase().includes(q)) ||
      (l.model && l.model.toLowerCase().includes(q)) ||
      l.from_machine.toLowerCase().includes(q) ||
      l.to_machine.toLowerCase().includes(q) ||
      l.reason.toLowerCase().includes(q) ||
      l.user.toLowerCase().includes(q)
    );
  }

  // Column Excel Filters
  logHeaders.forEach(h => {
    const key = h.key;
    const query = searchQueries.value[key]?.toLowerCase();
    const checked = checkedFilters.value[key];

    if (query) {
      list = list.filter((item: any) => {
        const val = key === 'is_auto' ? (item.is_auto ? 'Auto-Balanced' : 'Manual Move') : String(item[key] ?? '');
        return val.toLowerCase().includes(query);
      });
    }
    
    if (checked && checked.length > 0) {
      list = list.filter((item: any) => {
        const val = key === 'is_auto' ? (item.is_auto ? 'Auto-Balanced' : 'Manual Move') : String(item[key] ?? '');
        return checked.includes(val);
      });
    }
  });

  // Sorting
  if (sortKey.value) {
    const key = sortKey.value;
    const dir = sortDir.value;
    list.sort((a: any, b: any) => {
      const valA = key === 'is_auto' ? (a.is_auto ? 'Auto-Balanced' : 'Manual Move') : (a[key] ?? '');
      const valB = key === 'is_auto' ? (b.is_auto ? 'Auto-Balanced' : 'Manual Move') : (b[key] ?? '');
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

const handleExport = async () => {
  if (logs.value.length === 0) {
    notificationStore.showDialogWarning('Warning', 'Tidak ada data log perpindahan untuk diexport.');
    return;
  }
  exportLoading.value = true;
  try {
    await exportMovementLogsToExcel(
      filteredLogs.value,
      `Log_Perpindahan_Part_Sim_${props.simulationId || 'Live'}`
    );
  } catch (err) {
    console.error('Export error:', err);
    notificationStore.showDialogError('Error', 'Gagal mengekspor file Excel.');
  } finally {
    exportLoading.value = false;
  }
};

const handleClear = () => {
  notificationStore.showConfirm(
    'Konfirmasi Reset Log',
    'Apakah Anda yakin ingin menghapus semua catatan riwayat perpindahan part pada simulasi ini?',
    () => {
      clearMovementLogs(props.simulationId);
      logs.value = [];
      notificationStore.showAlertSuccess('Riwayat perpindahan berhasil direset.');
    }
  );
};
</script>

<template>
  <v-dialog v-model="isOpen" max-width="1150" scrollable>
    <v-card class="rounded-xl overflow-hidden elevation-10">
      <!-- Blue Header Bar with High Contrast Icon -->
      <div class="py-3 px-6 d-flex align-center justify-space-between text-white" style="background-color: #0345a1 !important;">
        <div class="d-flex align-center">
          <v-avatar color="rgba(255, 255, 255, 0.2)" size="40" class="mr-3 elevation-1">
            <v-icon color="white" size="24">mdi-history</v-icon>
          </v-avatar>
          <div>
            <div class="text-subtitle-1 font-weight-bold text-white">Riwayat & Log Perpindahan Part</div>
            <div class="text-caption text-blue-lighten-4">
              Mencatat jejak rekam part yang dialokasikan ulang atau dipindahkan antar-mesin
            </div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" density="compact" @click="isOpen = false"></v-btn>
      </div>

      <v-card-text class="pa-5 bg-slate-50" style="max-height: 75vh;">
        <!-- Stat Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
          <div class="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
            <div>
              <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Perpindahan</div>
              <div class="text-xl font-bold text-slate-800">{{ totalCount }}</div>
            </div>
            <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
              <i class="mdi mdi-swap-horizontal"></i>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
            <div>
              <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Auto-Balanced</div>
              <div class="text-xl font-bold text-slate-800">{{ autoCount }}</div>
            </div>
            <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
              <i class="mdi mdi-robot-outline"></i>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
            <div>
              <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Manual Move</div>
              <div class="text-xl font-bold text-slate-800">{{ manualCount }}</div>
            </div>
            <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
              <i class="mdi mdi-hand-back-right-outline"></i>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
            <div>
              <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Unique Part</div>
              <div class="text-xl font-bold text-slate-800">{{ uniquePartsCount }}</div>
            </div>
            <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
              <i class="mdi mdi-layers-outline"></i>
            </div>
          </div>
        </div>

        <!-- Filter & Search Controls -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 mb-4 shadow-xs">
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
            <!-- Filter Tabs -->
            <div class="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-full sm:w-auto">
              <button
                @click="typeFilter = 'all'"
                :class="typeFilter === 'all' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'"
                class="px-3 py-1.5 rounded-md text-xs transition"
              >
                Semua ({{ totalCount }})
              </button>
              <button
                @click="typeFilter = 'auto'"
                :class="typeFilter === 'auto' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'"
                class="px-3 py-1.5 rounded-md text-xs transition flex items-center gap-1"
              >
                <i class="mdi mdi-robot-outline text-sm"></i>
                Auto-Balanced ({{ autoCount }})
              </button>
              <button
                @click="typeFilter = 'manual'"
                :class="typeFilter === 'manual' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'"
                class="px-3 py-1.5 rounded-md text-xs transition flex items-center gap-1"
              >
                <i class="mdi mdi-account-edit-outline text-sm"></i>
                Manual ({{ manualCount }})
              </button>
              <button
                @click="resetAllExcelFilters"
                class="px-2.5 py-1.5 rounded-md text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition flex items-center gap-1"
              >
                <i class="mdi mdi-filter-off text-sm"></i>
                Reset Filter
              </button>
            </div>

            <!-- Global Search Field -->
            <div class="w-full sm:w-72">
              <v-text-field
                v-model="globalSearchQuery"
                placeholder="Cari part, mesin, job, user..."
                density="compact"
                variant="outlined"
                hide-details
                prepend-inner-icon="mdi-magnify"
                clearable
                bg-color="white"
              />
            </div>
          </div>
        </div>

        <!-- Log Table with Excel Sort & Filter Headers -->
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div class="overflow-x-auto max-h-[380px]">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th class="py-2.5 px-3 text-center w-12 bg-slate-100">No</th>
                  
                  <th
                    v-for="col in logHeaders"
                    :key="col.key"
                    class="py-2 px-3 bg-slate-100"
                    :class="['process', 'is_auto'].includes(col.key) ? 'text-center' : 'text-left'"
                  >
                    <v-menu :close-on-content-click="false" location="bottom start" transition="scale-transition">
                      <template v-slot:activator="{ props: menuProps }">
                        <div v-bind="menuProps" class="header-inner flex items-center cursor-pointer select-none py-1 hover-header" :class="['process', 'is_auto'].includes(col.key) ? 'justify-center' : 'justify-start'">
                          <span :class="{'text-blue-700 font-bold': isExcelFilterActive(col.key)}">
                            {{ col.title }}
                          </span>
                          <v-icon size="14" class="ml-1" :color="isExcelFilterActive(col.key) || sortKey === col.key ? 'primary' : 'grey-lighten-1'">
                            {{ sortKey === col.key ? (sortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-filter-variant' }}
                          </v-icon>
                        </div>
                      </template>

                      <v-card width="250" class="pa-2 rounded-lg text-black">
                        <v-list density="compact" class="pa-0">
                          <v-list-item prepend-icon="mdi-sort-ascending" title="Sort Ascending (A-Z)" @click="setExcelSort(col.key, 'asc')" />
                          <v-list-item prepend-icon="mdi-sort-descending" title="Sort Descending (Z-A)" @click="setExcelSort(col.key, 'desc')" />
                        </v-list>
                        <v-divider class="my-1" />
                        
                        <v-text-field
                          v-model="searchQueries[col.key]"
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
                            :model-value="isAllExcelItemsChecked(col.key)"
                            @click="toggleExcelSelectAll(col.key)"
                            class="ma-0 pa-0"
                          />
                          <v-checkbox
                            v-for="item in getFilteredUniqueItems(col.key)"
                            :key="item"
                            :label="item || '-'"
                            :value="item"
                            v-model="checkedFilters[col.key]"
                            density="compact"
                            hide-details
                            class="ma-0 pa-0"
                          />
                        </div>
                        
                        <v-card-actions class="justify-end pa-0 mt-2">
                          <v-btn size="x-small" variant="text" color="grey" @click="clearSingleExcelFilter(col.key)">Reset</v-btn>
                        </v-card-actions>
                      </v-card>
                    </v-menu>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-if="filteredLogs.length === 0">
                  <td colspan="11" class="py-10 text-center text-slate-400">
                    <i class="mdi mdi-information-outline text-2xl block mb-1"></i>
                    Tidak ada riwayat perpindahan part yang cocok dengan kriteria filter.
                  </td>
                </tr>

                <tr v-for="(log, idx) in filteredLogs" :key="log.id" class="hover:bg-blue-50/40 transition">
                  <td class="py-2 px-3 text-center text-slate-400 font-mono">{{ idx + 1 }}</td>
                  <td class="py-2 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">{{ log.timestamp }}</td>
                  <td class="py-2 px-3">
                    <div class="font-bold text-slate-800">{{ log.part_number }}</div>
                    <div class="text-[10px] text-slate-400">{{ log.part_name || '-' }}</div>
                  </td>
                  <td class="py-2 px-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {{ log.job_number || '-' }}
                    </span>
                  </td>
                  <td class="py-2 px-3 text-slate-700 font-medium">{{ log.model || '-' }}</td>
                  <td class="py-2 px-3 text-center font-mono">{{ log.process || 1 }}</td>
                  <td class="py-2 px-3">
                    <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      {{ log.from_machine }}
                    </span>
                  </td>
                  <td class="py-2 px-3">
                    <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {{ log.to_machine }}
                    </span>
                  </td>
                  <td class="py-2 px-4 text-slate-600 max-w-xs truncate" :title="log.reason">
                    {{ log.reason || '-' }}
                  </td>
                  <td class="py-2 px-3 text-center">
                    <span
                      :class="log.is_auto ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'"
                      class="px-2 py-0.5 rounded text-[10px] font-bold border inline-block"
                    >
                      {{ log.is_auto ? 'AUTO' : 'MANUAL' }}
                    </span>
                  </td>
                  <td class="py-2 px-3 text-slate-500 font-medium">{{ log.user || 'User' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </v-card-text>

      <!-- Footer Buttons -->
      <v-card-actions class="pa-4 bg-white border-t border-slate-200 flex items-center justify-between">
        <v-btn
          v-if="logs.length > 0"
          color="error"
          variant="text"
          size="small"
          prepend-icon="mdi-trash-can-outline"
          @click="handleClear"
        >
          Hapus Riwayat Simulasi
        </v-btn>
        <div v-else></div>

        <div class="flex items-center gap-2">
          <v-btn
            color="success"
            variant="elevated"
            size="small"
            class="font-weight-bold text-white elevation-1"
            prepend-icon="mdi-file-excel"
            :loading="exportLoading"
            :disabled="filteredLogs.length === 0"
            @click="handleExport"
          >
            Export Excel ({{ filteredLogs.length }})
          </v-btn>
          <v-btn
            color="grey-darken-1"
            variant="outlined"
            size="small"
            @click="isOpen = false"
          >
            Tutup
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.hover-header:hover {
  background-color: rgba(3, 69, 161, 0.08);
  border-radius: 4px;
}
</style>
