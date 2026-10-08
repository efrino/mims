<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useWeldingGlcStore } from '@/stores/PCD/Welding/welding_glc';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';
import { getPatanLines } from '@/services/PCD/Welding/SimulationPatan';
import { getSimulationList } from '@/services/PCD/Welding/Simulation';

const page = ref({ title: 'Welding GLC Master Part' });
const breadcrumbs = ref([
  { title: 'Welding', disabled: false, href: '#' },
  { title: 'Master Data', disabled: false, href: '#' },
  { title: 'GLC Master Part', disabled: true, href: '#' }
]);

const store = useWeldingGlcStore();
const { dataTable, loading } = storeToRefs(store);
const router = useRouter();

const searchQuery = ref('');

// Patan Line Selector Modal
const isPatanLineModalOpen = ref(false);
const patanModalLoading = ref(false);
const patanLineLoading = ref(false);

const simulationOptions = ref<Array<{ title: string; value: number; area: string }>>([]);
const selectedSimulationId = ref<number | null>(null);

const patanLineOptions = ref<string[]>([]);
const selectedPatanLine = ref<string>('');

const monthNamesIndo = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const formatPeriodeBulanTahun = (periode: any): string => {
  if (!periode) return '-';
  const str = String(periode).trim();

  if (/^\d{6}$/.test(str)) {
    const year = str.substring(0, 4);
    const monthIdx = parseInt(str.substring(4, 6), 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${monthNamesIndo[monthIdx]} ${year}`;
    }
  }

  const parts = str.split(/[-/]/);
  if (parts.length === 2) {
    const [part1, part2] = parts;
    if (part1.length === 4 && part2.length === 2) {
      const monthIdx = parseInt(part2, 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${monthNamesIndo[monthIdx]} ${part1}`;
      }
    }
  }

  return str;
};

const openPatanLineModal = async () => {
  isPatanLineModalOpen.value = true;
  patanModalLoading.value = true;
  try {
    const simRes = await getSimulationList('WSS ADM');
    if (simRes.data && simRes.data.status === 'success') {
      const list = simRes.data.data || [];
      simulationOptions.value = list.map((s: any) => ({
        title: `${formatPeriodeBulanTahun(s.periode)} - ${s.note || 'Tanpa Note'} - ${s.status || 'DRAFT'}`,
        value: s.id,
        area: s.area || 'WSS ADM'
      }));

      if (simulationOptions.value.length > 0) {
        const liveSim = list.find((s: any) => String(s.status).toUpperCase() === 'LIVE');
        selectedSimulationId.value = liveSim ? liveSim.id : list[0].id;
      }
    }
    if (selectedSimulationId.value) {
      await fetchPatanLinesForModal();
    }
  } catch (err) {
    console.error('Error loading simulation list for patan modal:', err);
  } finally {
    patanModalLoading.value = false;
  }
};

const fetchPatanLinesForModal = async () => {
  if (!selectedSimulationId.value) return;
  patanLineLoading.value = true;
  try {
    const res = await getPatanLines('WSS ADM', selectedSimulationId.value);
    if (res.data && res.data.status === 'success') {
      patanLineOptions.value = res.data.data || [];
      if (patanLineOptions.value.length > 0) {
        selectedPatanLine.value = patanLineOptions.value[0];
      } else {
        selectedPatanLine.value = '';
      }
    }
  } catch (err) {
    console.error('Error loading patan lines:', err);
  } finally {
    patanLineLoading.value = false;
  }
};

watch(selectedSimulationId, () => {
  if (isPatanLineModalOpen.value && selectedSimulationId.value) {
    fetchPatanLinesForModal();
  }
});

const goToPatanPage = () => {
  if (!selectedSimulationId.value || !selectedPatanLine.value) return;
  isPatanLineModalOpen.value = false;
  const currentSim = simulationOptions.value.find(s => s.value === selectedSimulationId.value);
  router.push({
    path: '/Transaction/welding/glc-simulation/patan',
    query: {
      id_simulation: selectedSimulationId.value,
      line: selectedPatanLine.value,
      area: currentSim?.area || 'WSS ADM'
    }
  });
};

const headers = [
  { title: 'Part Number', key: 'part_number', align: 'start' as const },
  { title: 'Job Number', key: 'job_number', align: 'start' as const },
  { title: 'Part Name', key: 'part_name', align: 'start' as const },
  { title: 'OP', key: 'op', align: 'center' as const },
  { title: 'Status Part', key: 'status_part', align: 'center' as const },
  { title: 'Model', key: 'model', align: 'center' as const },
  { title: 'Machine', key: 'machine', align: 'center' as const },
  { title: 'Total Proses', key: 'total_proses', align: 'center' as const },
  { title: 'UPH', key: 'uph', align: 'end' as const },
  { title: 'Qty Kanban', key: 'qty_kanban', align: 'end' as const },
  { title: 'Pcs Kanban', key: 'pcs_kanban', align: 'end' as const },
  { title: 'Lot Cycle', key: 'lot_cycle', align: 'center' as const },
  { title: 'Patan', key: 'patan', align: 'center' as const },
];

// Excel-like Filter Logic
const sortKey = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');

const excelSearchQueries = ref<Record<string, string>>({});
const excelCheckedFilters = ref<Record<string, string[]>>({});

headers.forEach(h => {
  excelSearchQueries.value[h.key] = '';
  excelCheckedFilters.value[h.key] = [];
});

const getExcelUniqueItems = (key: string) => {
  if (!dataTable.value) return [];
  const unique = new Set(dataTable.value.map(item => String(item[key as keyof typeof item] || '-')));
  return Array.from(unique).sort();
};

const isAllExcelItemsChecked = (key: string) => {
  const allItems = getExcelUniqueItems(key);
  const checked = excelCheckedFilters.value[key] || [];
  return allItems.length > 0 && checked.length === allItems.length;
};

const toggleExcelSelectAll = (key: string) => {
  const allItems = getExcelUniqueItems(key);
  if (isAllExcelItemsChecked(key)) {
    excelCheckedFilters.value[key] = [];
  } else {
    excelCheckedFilters.value[key] = [...allItems];
  }
};

const isExcelFilterActive = (key: string) => {
  return (excelCheckedFilters.value[key] && excelCheckedFilters.value[key].length > 0) || 
         (excelSearchQueries.value[key] && excelSearchQueries.value[key].length > 0);
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
  excelCheckedFilters.value[key] = [];
  excelSearchQueries.value[key] = '';
  if (sortKey.value === key) sortKey.value = null;
};

const resetAllExcelFilters = () => {
  sortKey.value = null;
  sortDir.value = 'asc';
  headers.forEach(h => {
    excelSearchQueries.value[h.key] = '';
    excelCheckedFilters.value[h.key] = [];
  });
};

const isAnyExcelFilterActive = computed(() => {
  return headers.some(h => isExcelFilterActive(h.key)) || sortKey.value !== null;
});

const filteredData = computed(() => {
  let result = [...(dataTable.value || [])];

  // Global search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(item => 
      Object.values(item).some(val => 
        String(val || '').toLowerCase().includes(q)
      )
    );
  }

  // Column filters
  headers.forEach(h => {
    const key = h.key;
    const query = excelSearchQueries.value[key]?.toLowerCase();
    const checked = excelCheckedFilters.value[key];

    if (query) {
      result = result.filter(item => String(item[key as keyof typeof item] || '-').toLowerCase().includes(query));
    }
    
    if (checked && checked.length > 0) {
      result = result.filter(item => checked.includes(String(item[key as keyof typeof item] || '-')));
    }
  });

  // Sorting
  if (sortKey.value) {
    result.sort((a, b) => {
      const valA = String(a[sortKey.value as keyof typeof a] || '').toLowerCase();
      const valB = String(b[sortKey.value as keyof typeof b] || '').toLowerCase();
      if (valA < valB) return sortDir.value === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir.value === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return result;
});

onMounted(() => {
  store.fetchMasterPartData();
});
</script>

<template>
  <div class="page-wrapper">
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

    <v-card class="pa-5 rounded-lg mb-6 elevation-2">
      <div class="d-flex justify-space-between align-center mb-4">
        <div class="text-h4 text-primary font-weight-medium">
          Master Data Welding GLC
        </div>
        <div>
          <v-btn
            color="indigo"
            variant="tonal"
            prepend-icon="mdi-calendar-sync-outline"
            @click="openPatanLineModal"
          >
            Lihat Patan Line
          </v-btn>
        </div>
      </div>

      <div class="d-flex align-center justify-space-between mb-3">
        <div class="text-caption text-grey d-flex align-center">
          <v-icon size="16" class="mr-1">mdi-filter-cog</v-icon>
          <span>Klik judul kolom pada tabel untuk memfilter / mengurutkan data.</span>
          <v-btn v-if="isAnyExcelFilterActive" size="x-small" color="red" variant="text" class="ml-2 text-none" @click="resetAllExcelFilters">
            Reset Semua Filter Kolom
          </v-btn>
        </div>
        <div style="width: 300px;">
          <v-text-field
            v-model="searchQuery"
            placeholder="Cari data global..."
            density="compact"
            variant="outlined"
            hide-details
            prepend-inner-icon="mdi-magnify"
            clearable
          />
        </div>
      </div>

      <v-data-table
        :headers="headers"
        :items="filteredData"
        :loading="loading"
        density="compact"
        class="elevation-1 rounded-lg premium-table custom-freeze-table text-body-2"
        hover
      >
        <template #headers="{ columns }">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key || ''"
              class="text-center text-body-2"
              style="background: #eef2f7;"
            >
              <v-menu :close-on-content-click="false" location="bottom start" transition="scale-transition">
                <template v-slot:activator="{ props }">
                  <div v-bind="props" class="header-inner d-flex align-center justify-center cursor-pointer select-none py-1 hover-header">
                    <span :class="{'text-primary font-weight-bold': isExcelFilterActive(col.key || '')}">
                      {{ col.title }}
                    </span>
                    <v-icon size="14" class="ml-1" :color="isExcelFilterActive(col.key || '') || sortKey === col.key ? 'primary' : 'grey-lighten-1'">
                      {{ sortKey === col.key ? (sortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-filter-variant' }}
                    </v-icon>
                  </div>
                </template>

                <v-card width="250" class="pa-2 rounded-lg">
                  <v-list density="compact" class="pa-0">
                    <v-list-item prepend-icon="mdi-sort-ascending" title="Sort A to Z / Ascending" @click="setExcelSort(col.key || '', 'asc')" />
                    <v-list-item prepend-icon="mdi-sort-descending" title="Sort Z to A / Descending" @click="setExcelSort(col.key || '', 'desc')" />
                  </v-list>
                  <v-divider class="my-1" />
                  
                  <v-text-field
                    v-model="excelSearchQueries[col.key || '']"
                    placeholder="Cari nilai..."
                    density="compact"
                    variant="outlined"
                    hide-details
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    class="mb-2"
                  />

                  <div style="max-height: 180px; overflow-y: auto;" class="border rounded pa-1">
                    <v-checkbox
                      label="(Select All)"
                      density="compact"
                      hide-details
                      :model-value="isAllExcelItemsChecked(col.key || '')"
                      @click="toggleExcelSelectAll(col.key || '')"
                      class="ma-0 pa-0"
                    />
                    <v-checkbox
                      v-for="item in getExcelUniqueItems(col.key || '')"
                      :key="item"
                      :label="item || '-'"
                      :value="item"
                      v-model="excelCheckedFilters[col.key || '']"
                      density="compact"
                      hide-details
                      class="ma-0 pa-0"
                    />
                  </div>
                  
                  <v-card-actions class="justify-end pa-0 mt-2">
                    <v-btn size="x-small" variant="text" color="grey" @click="clearSingleExcelFilter(col.key || '')">Reset</v-btn>
                  </v-card-actions>
                </v-card>
              </v-menu>
            </th>
          </tr>
        </template>

        <template #item="{ item }">
          <tr class="text-body-2">
            <td class="text-start">{{ item.part_number || '-' }}</td>
            <td class="text-start">{{ item.job_number || '-' }}</td>
            <td class="text-start">{{ item.part_name || '-' }}</td>
            <td class="text-center">{{ item.op || '-' }}</td>
            <td class="text-center">{{ item.status_part || '-' }}</td>
            <td class="text-center">{{ item.model || '-' }}</td>
            <td class="text-center">{{ item.machine || '-' }}</td>
            <td class="text-center">{{ item.total_proses || '-' }}</td>
            <td class="text-end">{{ item.uph || '-' }}</td>
            <td class="text-end">{{ item.qty_kanban || '-' }}</td>
            <td class="text-end">{{ item.pcs_kanban || '-' }}</td>
            <td class="text-center">{{ item.lot_cycle || '-' }}</td>
            <td class="text-center font-weight-medium">{{ item.patan || (item.lot_cycle ? (Number(item.lot_cycle) <= 1 ? 'A B C D' : 'A C') : '-') }}</td>
          </tr>
        </template>
      </v-data-table>
    </v-card>

    <!-- Modal Pilih Line Patan -->
    <v-dialog v-model="isPatanLineModalOpen" max-width="500px">
      <v-card class="rounded-lg overflow-hidden">
        <v-card-title class="text-white d-flex justify-space-between align-center pa-4" style="background-color: rgb(3, 69, 161) !important; min-height: 48px;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white">mdi-calendar-sync-outline</v-icon>
            <span class="text-subtitle-1 font-weight-bold">Pilih Simulasi & Line Patan</span>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" @click="isPatanLineModalOpen = false"></v-btn>
        </v-card-title>

        <v-card-text class="pa-5">
          <div class="mb-4 bg-grey-lighten-4 pa-3 rounded border text-body-2 text-grey-darken-2">
            Pilih data simulasi dan line mesin yang ingin ditampilkan daftar jadwal pembagian Patan (A, B, C, D).
          </div>

          <!-- Select 1: Simulasi -->
          <v-select
            v-model="selectedSimulationId"
            :items="simulationOptions"
            item-title="title"
            item-value="value"
            label="1. Pilih Data Simulasi *"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-chart-timeline-variant"
            :loading="patanModalLoading"
            placeholder="Pilih simulasi..."
            hide-details="auto"
            class="mb-4"
          ></v-select>

          <!-- Select 2: Line Mesin -->
          <v-select
            v-model="selectedPatanLine"
            :items="patanLineOptions"
            label="2. Pilih Line Mesin *"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-factory"
            :loading="patanLineLoading"
            :disabled="!selectedSimulationId || patanLineLoading"
            placeholder="Pilih line..."
            hide-details="auto"
          ></v-select>
        </v-card-text>

        <v-card-actions class="pa-4 bg-grey-lighten-4 border-t d-flex justify-end gap-2">
          <v-btn
            variant="outlined"
            color="grey-darken-1"
            size="large"
            @click="isPatanLineModalOpen = false"
          >
            Batal
          </v-btn>
          <v-btn
            style="background-color: rgb(3, 69, 161) !important; color: white !important;"
            variant="flat"
            size="large"
            prepend-icon="mdi-check-circle-outline"
            :disabled="!selectedSimulationId || !selectedPatanLine"
            @click="goToPatanPage"
          >
            Buka Halaman Patan
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.premium-table :deep(th) {
  background-color: #eef2f7 !important;
  color: #333 !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 12px !important;
  padding: 12px 16px !important;
  white-space: nowrap;
}

.premium-table :deep(td) {
  padding: 8px 16px !important;
  border-bottom: 1px solid #f0f0f0;
}

.premium-table :deep(tr:hover:not(.v-data-table__empty-wrapper)) {
  background-color: #f8fafc !important;
}

.hover-header:hover {
  background-color: #e2e8f0;
  border-radius: 4px;
}
</style>
