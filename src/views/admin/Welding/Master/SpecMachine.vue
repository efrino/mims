<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useSpecMachineStore } from '@/stores/Welding/Master/SpecMachine';
import { useNotificationStore } from '@/stores/notification';
import { useConfigStore } from '@/stores/config';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';
import MachineLayout from '@/components/welding/master/MachineLayout.vue';
import FactoryEditor2D from '@/components/welding/master/layout2d/FactoryEditor2D.vue';

const configStore = useConfigStore();
const page = ref({ title: 'Welding Spec Machine' });
const breadcrumbs = ref([
  { title: 'Welding', disabled: false, href: '#' },
  { title: 'Master Data', disabled: false, href: '#' },
  { title: 'Spec Machine', disabled: true, href: '#' }
]);

const store = useSpecMachineStore();
const notificationStore = useNotificationStore();
const { dataTable, areaList, loading, isModalAddOpen, isModalEditOpen, formData } = storeToRefs(store);

const areaOptions = computed(() => {
  if (areaList.value && areaList.value.length > 0) {
    return areaList.value;
  }
  const areasFromTable = dataTable.value ? Array.from(new Set(dataTable.value.map(m => m.area).filter(Boolean))) : [];
  const defaultList = ['WSS ADM', 'WSS MMKI', 'WSS HMMI', 'CO ADM', 'CO MMKI', 'SA ADM', 'SA HMMI', 'INHOUSE', 'IFPD', 'IFRM'];
  return Array.from(new Set([...areasFromTable, ...defaultList])).sort();
});

const isRobotArea = computed(() => {
  const a = String(formData.value.area || '').toUpperCase();
  return a.includes('ROBOT') || a.includes('SUB ASSY') || a.startsWith('SA ') || a.startsWith('CO ');
});

const gunTypeOptions = ['GUN X', 'GUN C', 'GUN X&C'];

const searchQuery = ref('');
const viewMode2D = ref(true);

// Excel-like Filter Logic
const sortKey = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');

// Search Spec Machine Modal State
const isModalSearchSpecOpen = ref(false);

const searchSpecForm = ref({
  upper_holder: '',
  lower_holder: '',
  kva: '',
  nut_type: '',
  handy_navi: '',
  robo_navi: '',
  gate_sensor: '',
  container: ''
});

const resetSearchSpecForm = () => {
  searchSpecForm.value = {
    upper_holder: '',
    lower_holder: '',
    kva: '',
    nut_type: '',
    handy_navi: '',
    robo_navi: '',
    gate_sensor: '',
    container: ''
  };
};

const openSearchSpecModal = () => {
  resetSearchSpecForm();
  isModalSearchSpecOpen.value = true;
};

const uniqueKvas = computed(() => {
  if (!dataTable.value) return [];
  const items = new Set(dataTable.value.map(m => String(m.kva || '')).filter(Boolean));
  return Array.from(items).sort((a, b) => Number(a) - Number(b));
});

const uniqueNutTypes = computed(() => {
  if (!dataTable.value) return [];
  const items = new Set(dataTable.value.map(m => String(m.nut_type || '')).filter(Boolean));
  return Array.from(items).sort();
});

const filteredSearchMachines = computed(() => {
  let result = [...(dataTable.value || [])];
  
  if (searchSpecForm.value.upper_holder) {
    result = result.filter(m => m.upper_holder === searchSpecForm.value.upper_holder);
  }
  if (searchSpecForm.value.lower_holder) {
    result = result.filter(m => m.lower_holder === searchSpecForm.value.lower_holder);
  }
  if (searchSpecForm.value.kva) {
    result = result.filter(m => String(m.kva) === String(searchSpecForm.value.kva));
  }
  if (searchSpecForm.value.nut_type) {
    result = result.filter(m => m.nut_type === searchSpecForm.value.nut_type);
  }
  if (searchSpecForm.value.handy_navi) {
    result = result.filter(m => m.handy_navi === searchSpecForm.value.handy_navi);
  }
  if (searchSpecForm.value.robo_navi) {
    result = result.filter(m => m.robo_navi === searchSpecForm.value.robo_navi);
  }
  if (searchSpecForm.value.gate_sensor) {
    result = result.filter(m => m.gate_sensor === searchSpecForm.value.gate_sensor);
  }
  if (searchSpecForm.value.container) {
    const val = searchSpecForm.value.container;
    if (val === 'Pallet') {
      result = result.filter(m => String(m.is_pallet) === '1' && String(m.is_polybox) === '0');
    } else if (val === 'Polybox') {
      result = result.filter(m => String(m.is_pallet) === '0' && String(m.is_polybox) === '1');
    } else if (val === 'Polybox dan Pallet') {
      result = result.filter(m => String(m.is_pallet) === '1' && String(m.is_polybox) === '1');
    }
  }
  
  const uniqueMachinesMap = new Map<string, any[]>();
  result.forEach(m => {
    const key = `${m.machine}_${m.line || ''}`;
    if (!uniqueMachinesMap.has(key)) {
      uniqueMachinesMap.set(key, []);
    }
    uniqueMachinesMap.get(key)!.push(m);
  });

  const grouped: any[] = [];
  uniqueMachinesMap.forEach((group) => {
    const rep = JSON.parse(JSON.stringify(group[0]));
    rep.represented_ids = group.map(m => m.id);
    rep.original_rows = group;
    rep.nut_types = [...new Set(group.map(m => m.nut_type_alias || m.nut_type || m.nut_part_number || ''))].filter(Boolean);
    grouped.push(rep);
  });
  
  return grouped;
});

const excelSearchQueries = ref<Record<string, string>>({});
const excelCheckedFilters = ref<Record<string, string[]>>({});

const ckdNutTypes = ref<any[]>([]);
const fetchCkdNutTypes = async () => {
  try {
    const baseUrl = configStore.apiUrl ? `http://${configStore.apiUrl}` : 'http://192.168.10.67';
    const res = await fetch(`${baseUrl}/majsf_rest_api/api/Welding_spec_machine/CkdNutTypes`);
    const json = await res.json();
    if (json.status === 'success' && json.data) {
      ckdNutTypes.value = json.data.map((item: any) => {
        const id = item.id !== undefined && item.id !== null ? Number(item.id) : (item.nut_type || item.part_number);
        const alias = item.alias || '';
        const partNo = item.part_number || item.nut_type || '';
        const label = item.nut_type_label || (alias ? `${partNo} (${alias})` : partNo);
        return {
          id: id,
          nut_type: item.nut_type || partNo,
          alias: alias,
          part_number: partNo,
          nut_type_label: label
        };
      });
    }
  } catch (err) {
    console.error('Failed to fetch nut types', err);
  }
};

const headers = [
  { title: 'Area', key: 'area', align: 'center' as const },
  { title: 'Line', key: 'line', align: 'center' as const },
  { title: 'Machine', key: 'machine', align: 'center' as const },
  { title: 'Upper Holder', key: 'upper_holder', align: 'center' as const },
  { title: 'Lower Holder', key: 'lower_holder', align: 'center' as const },
  { title: 'KVA', key: 'kva', align: 'center' as const },
  { title: 'Packaging', key: 'container', align: 'center' as const },
  { title: 'Nut Type', key: 'nut_type', align: 'center' as const },
  { title: 'Nut Feeder', key: 'nut_feeder', align: 'center' as const },
  { title: 'Rotary Holder', key: 'rotary_holder', align: 'center' as const },
  { title: 'Handy Navi', key: 'handy_navi', align: 'center' as const },
  { title: 'Robo Navi', key: 'robo_navi', align: 'center' as const },
  { title: 'Gate Sensor', key: 'gate_sensor', align: 'center' as const },
  { title: 'Nut Feeder Type', key: 'nut_feeder_type', align: 'center' as const },
  { title: 'Note', key: 'note', align: 'start' as const },
  { title: 'Action', key: 'actions', align: 'center' as const, sortable: false }
];

const yesNoOptions = [
  { title: 'Ya', value: '1' },
  { title: 'Tidak', value: '0' }
];

// Initialize filter state
headers.forEach(h => {
  excelSearchQueries.value[h.key] = '';
  excelCheckedFilters.value[h.key] = [];
});

const getNutTypeDisplayText = (item: any) => {
  const alias = item.nut_type_alias || '';
  const partNo = item.nut_part_number || (item.raw_nut_type && item.raw_nut_type !== alias ? item.raw_nut_type : '');
  if (alias && partNo && alias !== partNo) {
    return `${alias} (${partNo})`;
  }
  return alias || item.nut_type || partNo || '-';
};

const getExcelUniqueItems = (key: string) => {
  if (!dataTable.value) return [];
  const mapped = dataTable.value.map(item => ({
    ...item,
    container: getContainerText(item),
    nut_type: getNutTypeDisplayText(item)
  }));
  const unique = new Set(mapped.map(item => String(item[key as keyof typeof item] ?? '')));
  return Array.from(unique).sort();
};

const isAllExcelItemsChecked = (key: string) => {
  const allFilteredItems = getExcelFilteredUniqueItems(key);
  if (allFilteredItems.length === 0) return false;
  const checked = excelCheckedFilters.value[key] || [];
  return allFilteredItems.every(item => checked.includes(item));
};

const toggleExcelSelectAll = (key: string) => {
  const allFilteredItems = getExcelFilteredUniqueItems(key);
  const checked = excelCheckedFilters.value[key] || [];
  
  const isAllChecked = allFilteredItems.every(item => checked.includes(item));
  
  if (isAllChecked) {
    excelCheckedFilters.value[key] = checked.filter(c => !allFilteredItems.includes(c));
  } else {
    excelCheckedFilters.value[key] = [...new Set([...checked, ...allFilteredItems])];
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

const formatFilterValue = (key: string, val: any) => {
  if (['nut_feeder', 'rotary_holder', 'handy_navi', 'robo_navi', 'gate_sensor'].includes(key)) {
    if (val === '1' || val === 1) return 'Ya';
    if (val === '0' || val === 0) return 'Tidak';
    return '-';
  }
  return val || '-';
};

const getExcelFilteredUniqueItems = (key: string) => {
  const items = getExcelUniqueItems(key);
  const query = (excelSearchQueries.value[key] || '').toLowerCase().trim();
  if (!query) return items;
  return items.filter(item => {
    const displayVal = String(formatFilterValue(key, item)).toLowerCase();
    return displayVal.includes(query);
  });
};

const getContainerText = (item: any) => {
  const poly = String(item.is_polybox) === '1';
  const pall = String(item.is_pallet) === '1';
  if (poly && pall) return 'Polybox dan Pallet';
  if (poly) return 'Polybox';
  if (pall) return 'Pallet';
  return '-';
};

const getIntegrationSpans = (rows: any[], typeField: string, idField: string) => {
  const spans: any[] = [];
  let currentId: any = null;
  let startRow = 1;
  let span = 0;
  
  rows.forEach((row, index) => {
    if (row[typeField] === '1' || row[typeField] === 1) {
      const id = row[idField] || row.id;
      if (id === currentId) {
         span++;
      } else {
         if (currentId !== null) spans.push({ id: currentId, startRow, span });
         currentId = id;
         startRow = index + 1;
         span = 1;
      }
    } else {
      if (currentId !== null) {
         spans.push({ id: currentId, startRow, span });
         currentId = null;
      }
    }
  });
  if (currentId !== null) spans.push({ id: currentId, startRow, span });
  return spans;
};

const getBadgeSpanInfo = (rows: any[], index: number, typeField: string, idField: string) => {
  const spans = getIntegrationSpans(rows, typeField, idField);
  const match = spans.find(s => s.startRow - 1 === index);
  return match ? match.span : 0;
};

const getBadgeCellStatus = (rows: any[], index: number, typeField: string, idField: string) => {
  const spans = getIntegrationSpans(rows, typeField, idField);
  const startMatch = spans.find(s => s.startRow - 1 === index);
  if (startMatch) return 'render';
  
  const coveredMatch = spans.some(s => {
    const startIdx = s.startRow - 1;
    const endIdx = startIdx + s.span - 1;
    return index > startIdx && index <= endIdx;
  });
  if (coveredMatch) return 'span-covered';
  
  return 'empty';
};

const isConnectedTop = (rows: any[], index: number, typeField: string, idField: string) => {
  if (index === 0) return false;
  const current = rows[index];
  const prev = rows[index - 1];
  if (!current || !prev) return false;
  if (current[typeField] !== '1' && current[typeField] !== 1) return false;
  if (prev[typeField] !== '1' && prev[typeField] !== 1) return false;
  const currentId = current[idField] || current.id;
  const prevId = prev[idField] || prev.id;
  return String(currentId) === String(prevId);
};

const isConnectedBottom = (rows: any[], index: number, typeField: string, idField: string) => {
  if (index === rows.length - 1) return false;
  const current = rows[index];
  const next = rows[index + 1];
  if (!current || !next) return false;
  if (current[typeField] !== '1' && current[typeField] !== 1) return false;
  if (next[typeField] !== '1' && next[typeField] !== 1) return false;
  const currentId = current[idField] || current.id;
  const nextId = next[idField] || next.id;
  return String(currentId) === String(nextId);
};

const filteredData = computed(() => {
  let result = (dataTable.value || []).map(item => ({
    ...item,
    container: getContainerText(item),
    nut_type_formatted: getNutTypeDisplayText(item)
  }));

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
      result = result.filter(item => {
        const val = key === 'nut_type' ? item.nut_type_formatted : String(item[key as keyof typeof item] ?? '');
        return val.toLowerCase().includes(query);
      });
    }
    
    if (checked && checked.length > 0) {
      result = result.filter(item => {
        const val = key === 'nut_type' ? item.nut_type_formatted : String(item[key as keyof typeof item] ?? '');
        return checked.includes(val);
      });
    }
  });

  // Sorting
  if (sortKey.value) {
    result.sort((a, b) => {
      const valA = String(a[sortKey.value as keyof typeof a] ?? '').toLowerCase();
      const valB = String(b[sortKey.value as keyof typeof b] ?? '').toLowerCase();
      if (valA < valB) return sortDir.value === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir.value === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return result;
});

const openAddModal = () => {
  store.resetForm();
  isModalAddOpen.value = true;
};

const handleEdit = (id: number | string) => {
  store.editData(id);
};

const handleDelete = (id: number | string) => {
  notificationStore.showConfirm(
    'Apakah anda yakin?',
    'Data yang dihapus tidak dapat dikembalikan!',
    async () => {
      await store.deleteData(id);
    }
  );
};

const handleActivate = (id: number | string) => {
  notificationStore.showConfirm(
    'Apakah anda yakin?',
    'Data ini akan diaktifkan kembali!',
    async () => {
      await store.activateData(id);
    }
  );
};

const submitAdd = () => {
  store.addData();
};

const submitEdit = () => {
  store.updateData();
};

const handleSaveLayout = (layoutData: any[]) => {
  store.saveLayout(layoutData);
};

const getIntegrationOptions = (type: 'robo' | 'handy' | 'gate') => {
  if (!formData.value.machine) return [];
  const siblings = dataTable.value.filter(m => m.machine === formData.value.machine && m.id !== formData.value.id);
  
  let filtered = [];
  if (type === 'robo') {
    filtered = siblings.filter(m => m.robo_navi === '1');
    return filtered.map(m => ({
      title: m.nut_type ? `Nut Type: ${m.nut_type} (Grup ${m.robo_navi_integrated || m.id})` : `ID: ${m.id}`,
      value: m.robo_navi_integrated || m.id
    }));
  }
  if (type === 'handy') {
    filtered = siblings.filter(m => m.handy_navi === '1');
    return filtered.map(m => ({
      title: m.nut_type ? `Nut Type: ${m.nut_type} (Grup ${m.handy_navi_integrated || m.id})` : `ID: ${m.id}`,
      value: m.handy_navi_integrated || m.id
    }));
  }
  if (type === 'gate') {
    filtered = siblings.filter(m => m.gate_sensor === '1');
    return filtered.map(m => ({
      title: m.nut_type ? `Nut Type: ${m.nut_type} (Grup ${m.gate_sensor_integrated || m.id})` : `ID: ${m.id}`,
      value: m.gate_sensor_integrated || m.id
    }));
  }
  return [];
};

const isSameValue = (rowA: any, rowB: any, field: string) => {
  // 1. Line can only merge if Area is the same
  if (field === 'line') {
    return rowA.area === rowB.area && rowA.line === rowB.line;
  }
  
  // 2. Machine can only merge if Area and Line are the same
  if (field === 'machine') {
    return rowA.area === rowB.area && rowA.line === rowB.line && rowA.machine === rowB.machine;
  }
  
  // 3. Machine-dependent fields (Holders, KVA, Navis) can only merge if Machine is the same
  const machineDependentFields = ['upper_holder', 'lower_holder', 'kva', 'handy_navi', 'robo_navi'];
  if (machineDependentFields.includes(field)) {
    if (rowA.area !== rowB.area || rowA.line !== rowB.line || rowA.machine !== rowB.machine) {
      return false;
    }
  }

  if (field === 'robo_navi') {
    if (rowA.robo_navi === '1' && rowB.robo_navi === '1') {
      const idA = rowA.robo_navi_integrated || rowA.id;
      const idB = rowB.robo_navi_integrated || rowB.id;
      return String(idA) === String(idB);
    }
    return false;
  }
  if (field === 'handy_navi') {
    if (rowA.handy_navi === '1' && rowB.handy_navi === '1') {
      const idA = rowA.handy_navi_integrated || rowA.id;
      const idB = rowB.handy_navi_integrated || rowB.id;
      return String(idA) === String(idB);
    }
    return false;
  }
  return String(rowA[field] ?? '') === String(rowB[field] ?? '');
};

const getRowspan = (item: any, field: string) => {
  const data = filteredData.value;
  if (!data || data.length === 0) return 1;
  
  const index = data.findIndex(x => x.id === item.id);
  if (index === -1) return 1;
  
  if (index > 0 && isSameValue(data[index], data[index - 1], field)) {
    return 0;
  }
  
  let span = 1;
  for (let i = index + 1; i < data.length; i++) {
    if (isSameValue(data[i], data[index], field)) {
      span++;
    } else {
      break;
    }
  }
  return span;
};

const downloadExcel = () => {
  const isDeleted = store.filterIsDeleted;
  const url = `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_spec_machine/build?is_deleted=${isDeleted}`;
  window.open(url, '_blank');
};

onMounted(() => {
  store.fetchMasterData();
  store.fetchAreaList();
  fetchCkdNutTypes();
});
</script>

<template>
  <div class="page-wrapper">
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

    <div class="d-flex justify-end mb-2">
      <v-btn-toggle v-model="viewMode2D" color="primary" mandatory variant="outlined" density="compact">
        <v-btn :value="false" prepend-icon="mdi-grid">Grid Layout</v-btn>
        <v-btn :value="true" prepend-icon="mdi-factory">Welding Factory Layout</v-btn>
      </v-btn-toggle>
    </div>

    <FactoryEditor2D 
      v-if="viewMode2D"
      :machines="dataTable" 
    />
    <MachineLayout 
      v-else
      :machines="dataTable" 
      @save-layout="handleSaveLayout" 
    />

    <v-card class="pa-5 rounded-lg mb-6 elevation-2">
      <div class="d-flex justify-space-between align-center mb-4">
        <div class="text-h4 text-primary font-weight-medium">
          Master Spec Machine
        </div>
        <div class="d-flex gap-2">
          <v-btn color="info" variant="outlined" prepend-icon="mdi-magnify" @click="openSearchSpecModal" class="mr-2">
            Cari Spec Mesin
          </v-btn>
          <v-btn color="success" prepend-icon="mdi-file-excel" @click="downloadExcel" class="mr-2" v-if="store.permissions.download">
            Download Excel
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddModal" v-if="store.permissions.create">
            Tambah Data
          </v-btn>
        </div>
      </div>

      <div class="d-flex align-center justify-space-between mb-3">
        <div class="text-caption text-grey d-flex align-center">
          <v-icon size="16" class="mr-1">mdi-information</v-icon>
          <span>Data master untuk spesifikasi mesin welding.</span>
        </div>
        <div class="d-flex align-center gap-3" style="max-width: 600px; width: 100%; justify-content: flex-end;">
          <v-btn
            v-if="isAnyExcelFilterActive"
            color="error"
            variant="outlined"
            density="compact"
            prepend-icon="mdi-filter-off"
            @click="resetAllExcelFilters"
            class="text-caption"
            style="height: 40px;"
          >
            Reset Filter
          </v-btn>
          <v-select
            v-model="store.filterIsDeleted"
            :items="[{title: 'Aktif', value: '0'}, {title: 'Tidak Aktif', value: '1'}, {title: 'Semua', value: ''}]"
            item-title="title"
            item-value="value"
            label="Status"
            density="compact"
            variant="outlined"
            hide-details
            @update:model-value="store.fetchMasterData()"
            style="max-width: 130px;"
          ></v-select>
          <v-text-field
            v-model="searchQuery"
            placeholder="Cari data..."
            density="compact"
            variant="outlined"
            hide-details
            prepend-inner-icon="mdi-magnify"
            clearable
            style="max-width: 200px;"
          />
        </div>
      </div>

      <v-data-table
        fixed-header
        :headers="headers"
        :items="filteredData"
        :loading="loading"
        density="compact"
        class="elevation-1 rounded-lg custom-table text-body-2"
        hover
      >
        <template #headers="{ columns }">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key || ''"
              class="text-center text-body-2 font-weight-bold"
              style="background: #eef2f7;"
            >
              <v-menu v-if="col.key !== 'actions'" :close-on-content-click="false" location="bottom start" transition="scale-transition">
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
                      v-for="item in getExcelFilteredUniqueItems(col.key || '')"
                      :key="item"
                      :label="formatFilterValue(col.key || '', item)"
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
              <div v-else class="header-inner d-flex align-center justify-center py-1 font-weight-bold">
                {{ col.title }}
              </div>
            </th>
          </tr>
        </template>
        <template #item="{ item, index }">
          <tr :class="{'bg-grey-lighten-4 text-grey': item.is_deleted === '1' || item.is_deleted === 1}">
            <!-- 1. Area -->
            <td v-if="getRowspan(item, 'area') > 0" :rowspan="getRowspan(item, 'area')" class="text-center font-weight-bold">
              {{ item.area || '-' }}
            </td>

            <!-- 2. Line -->
            <td v-if="getRowspan(item, 'line') > 0" :rowspan="getRowspan(item, 'line')" class="text-center font-weight-bold">
              {{ item.line || '-' }}
            </td>

            <!-- 3. Machine -->
            <td v-if="getRowspan(item, 'machine') > 0" :rowspan="getRowspan(item, 'machine')" class="text-center">
              <div class="font-weight-bold">{{ item.machine || '-' }}</div>
              <v-chip v-if="item.tipe_gun" size="x-small" color="primary" variant="tonal" class="mt-1">
                {{ item.tipe_gun }}
              </v-chip>
              <div v-if="item.gun_type_detail" class="text-caption text-grey-darken-2 font-italic mt-1" style="font-size: 11px;">
                {{ item.gun_type_detail }}
              </div>
            </td>

            <!-- 4. Upper Holder -->
            <td v-if="getRowspan(item, 'upper_holder') > 0" :rowspan="getRowspan(item, 'upper_holder')" class="text-center">
              {{ item.upper_holder || '-' }}
            </td>

            <!-- 5. Lower Holder -->
            <td v-if="getRowspan(item, 'lower_holder') > 0" :rowspan="getRowspan(item, 'lower_holder')" class="text-center">
              {{ item.lower_holder || '-' }}
            </td>

            <!-- 6. KVA -->
            <td v-if="getRowspan(item, 'kva') > 0" :rowspan="getRowspan(item, 'kva')" class="text-center">
              {{ item.kva || '-' }}
            </td>

            <!-- Packaging / Container (Not Grouped) -->
            <td class="text-center">
              {{ item.container }}
            </td>

            <!-- 7. Nut Type (Alias on Top, Part Number in Span underneath) -->
            <td class="text-center align-middle">
              <div class="font-weight-bold text-body-2" style="line-height: 1.2;">
                {{ item.nut_type_alias || item.nut_type || '-' }}
              </div>
              <span v-if="item.nut_part_number" 
                    class="text-caption text-grey-darken-1 d-block mt-1" 
                    style="font-size: 11px;">
                {{ item.nut_part_number }}
              </span>
            </td>

            <!-- 8. Nut Feeder (Not Grouped) -->
            <td class="text-center">
              <v-chip size="small" :color="item.nut_feeder === '1' ? 'success' : (item.nut_feeder === '0' ? 'error' : 'default')">
                {{ item.nut_feeder === '1' ? 'Ya' : (item.nut_feeder === '0' ? 'Tidak' : '-') }}
              </v-chip>
            </td>

            <!-- 9. Rotary Holder (Not Grouped) -->
            <td class="text-center">
              <v-chip size="small" :color="item.rotary_holder === '1' ? 'success' : (item.rotary_holder === '0' ? 'error' : 'default')">
                {{ item.rotary_holder === '1' ? 'Ya' : (item.rotary_holder === '0' ? 'Tidak' : '-') }}
              </v-chip>
            </td>

            <!-- 10. Handy Navi -->
            <td v-if="getRowspan(item, 'handy_navi') > 0" :rowspan="getRowspan(item, 'handy_navi')" class="text-center">
              <v-chip size="small" :color="item.handy_navi === '1' ? 'success' : (item.handy_navi === '0' ? 'error' : 'default')">
                {{ item.handy_navi === '1' ? 'Ya' : (item.handy_navi === '0' ? 'Tidak' : '-') }}
              </v-chip>
            </td>

            <!-- 11. Robo Navi -->
            <td v-if="getRowspan(item, 'robo_navi') > 0" :rowspan="getRowspan(item, 'robo_navi')" class="text-center">
              <v-chip size="small" :color="item.robo_navi === '1' ? 'success' : (item.robo_navi === '0' ? 'error' : 'default')">
                {{ item.robo_navi === '1' ? 'Ya' : (item.robo_navi === '0' ? 'Tidak' : '-') }}
              </v-chip>
            </td>

            <!-- 12. Gate Sensor (Not Grouped) -->
            <td class="text-center">
              <v-chip size="small" :color="item.gate_sensor === '1' ? 'success' : (item.gate_sensor === '0' ? 'error' : 'default')">
                {{ item.gate_sensor === '1' ? 'Ya' : (item.gate_sensor === '0' ? 'Tidak' : '-') }}
              </v-chip>
            </td>

            <!-- 13. Nut Feeder Type (Not Grouped) -->
            <td class="text-center">
              {{ item.nut_feeder_type || '-' }}
            </td>

            <!-- 14. Note (Not Grouped) -->
            <td>
              {{ item.note || '-' }}
            </td>

            <!-- 15. Actions (Not Grouped) -->
            <td class="text-center">
              <div class="d-flex justify-center align-center">
                <v-tooltip text="Edit" v-if="(item.is_deleted === '0' || item.is_deleted === 0 || !item.is_deleted) && store.permissions.update">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-pencil"
                      size="x-small"
                      color="warning"
                      variant="text"
                      @click="handleEdit(item.id)"
                    ></v-btn>
                  </template>
                </v-tooltip>
                
                <v-tooltip text="Hapus" v-if="(item.is_deleted === '0' || item.is_deleted === 0 || !item.is_deleted) && store.permissions.update">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-delete"
                      size="x-small"
                      color="error"
                      variant="text"
                      @click="handleDelete(item.id)"
                    ></v-btn>
                  </template>
                </v-tooltip>

                <v-tooltip text="Aktifkan" v-if="(item.is_deleted === '1' || item.is_deleted === 1) && store.permissions.update">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-restore"
                      size="x-small"
                      color="success"
                      variant="text"
                      @click="handleActivate(item.id)"
                    ></v-btn>
                  </template>
                </v-tooltip>
              </div>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>

    <!-- Modal Add -->
    <v-dialog v-model="isModalAddOpen" max-width="800px" persistent>
      <v-card>
        <v-card-title class="bg-primary text-white d-flex justify-space-between align-center pa-4">
          <span class="text-h5">Tambah Spec Machine</span>
          <v-btn icon="mdi-close" variant="text" @click="isModalAddOpen = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-4 pt-6">
          <v-form @submit.prevent="submitAdd" id="form-add">
            <v-row>
              <!-- 1. Area Selector at Top -->
              <v-col cols="12">
                <v-autocomplete
                  v-model="formData.area"
                  :items="areaOptions"
                  label="Pilih Area *"
                  variant="outlined"
                  density="compact"
                  placeholder="Pilih area (misal: WSS ADM, SA ADM, CO ADM)..."
                  clearable
                  required
                />
              </v-col>

              <!-- ================= IF ROBOT AREA (ROBOT TIMUR / ROBOT BARAT) ================= -->
              <template v-if="isRobotArea">
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.machine" label="Machine *" placeholder="Contoh: RSW-1" variant="outlined" density="compact" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.line" label="Line" placeholder="Contoh: LINE A" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.tipe_gun" :items="gunTypeOptions" label="Tipe Gun *" variant="outlined" density="compact" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.gun_type_detail" label="Gun Type Detail" placeholder="Contoh: SRTX-14573, TMX-849-3" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model.number="formData.stroke_dress" type="number" label="Stroke Dress" variant="outlined" density="compact" hint="Default: 350" persistent-hint />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model.number="formData.dress_tip_change" type="number" label="Dress Tip Change" variant="outlined" density="compact" hint="Default: 2450" persistent-hint />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model.number="formData.downtime" type="number" step="0.01" label="Downtime (menit)" variant="outlined" density="compact" hint="Default: 5.17" persistent-hint />
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="formData.note" label="Note" variant="outlined" density="compact" rows="2" />
                </v-col>
              </template>

              <!-- ================= ELSE (WSS ADM / SPOT MANUAL) ================= -->
              <template v-else>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.machine" label="Machine *" variant="outlined" density="compact" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.line" label="Line" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.upper_holder" :items="['Lurus', 'Pelatuk']" label="Upper Holder" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.lower_holder" :items="['Single', 'Rotary']" label="Lower Holder" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.kva" label="KVA" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-autocomplete v-model="formData.id_ms_nut" :items="ckdNutTypes" item-title="nut_type_label" item-value="id" label="Nut Type (CKD)" variant="outlined" density="compact" clearable />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.nut_feeder" :items="yesNoOptions" item-title="title" item-value="value" label="Nut Feeder" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.rotary_holder" :items="yesNoOptions" item-title="title" item-value="value" label="Rotary Holder" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.handy_navi" :items="yesNoOptions" item-title="title" item-value="value" label="Handy Navi" variant="outlined" density="compact" />
                  <v-select v-if="formData.handy_navi === '1'" v-model="formData.handy_navi_integrated" 
                    :items="getIntegrationOptions('handy')" item-title="title" item-value="value"
                    label="Share Integrasi dengan (Opsional)" variant="outlined" density="compact" clearable
                    hint="Kosongkan jika bukan share (berdiri sendiri)" persistent-hint class="mt-2" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.robo_navi" :items="yesNoOptions" item-title="title" item-value="value" label="Robo Navi" variant="outlined" density="compact" />
                  <v-select v-if="formData.robo_navi === '1'" v-model="formData.robo_navi_integrated" 
                    :items="getIntegrationOptions('robo')" item-title="title" item-value="value"
                    label="Share Integrasi dengan (Opsional)" variant="outlined" density="compact" clearable
                    hint="Kosongkan jika bukan share (berdiri sendiri)" persistent-hint class="mt-2" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.gate_sensor" :items="yesNoOptions" item-title="title" item-value="value" label="Gate Sensor" variant="outlined" density="compact" />
                  <v-select v-if="formData.gate_sensor === '1'" v-model="formData.gate_sensor_integrated" 
                    :items="getIntegrationOptions('gate')" item-title="title" item-value="value"
                    label="Share Integrasi dengan (Opsional)" variant="outlined" density="compact" clearable
                    hint="Kosongkan jika bukan share (berdiri sendiri)" persistent-hint class="mt-2" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.nut_feeder_type" label="Nut Feeder Type" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.is_polybox" :items="yesNoOptions" item-title="title" item-value="value" label="Polybox" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.is_pallet" :items="yesNoOptions" item-title="title" item-value="value" label="Pallet" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="formData.note" label="Note" variant="outlined" density="compact" rows="3" />
                </v-col>
              </template>
            </v-row>
          </v-form>
        </v-card-text>
        
        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="isModalAddOpen = false">Batal</v-btn>
          <v-btn color="primary" variant="flat" type="submit" form="form-add">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Edit -->
    <v-dialog v-model="isModalEditOpen" max-width="800px" persistent>
      <v-card>
        <v-card-title class="bg-warning text-white d-flex justify-space-between align-center pa-4">
          <span class="text-h5">Edit Spec Machine</span>
          <v-btn icon="mdi-close" variant="text" @click="isModalEditOpen = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-4 pt-6">
          <v-form @submit.prevent="submitEdit" id="form-edit">
            <v-row>
              <!-- 1. Area Selector at Top -->
              <v-col cols="12">
                <v-autocomplete
                  v-model="formData.area"
                  :items="areaOptions"
                  label="Pilih Area *"
                  variant="outlined"
                  density="compact"
                  placeholder="Pilih area (misal: WSS ADM, SA ADM, CO ADM)..."
                  clearable
                  required
                />
              </v-col>

              <!-- ================= IF ROBOT AREA (ROBOT TIMUR / ROBOT BARAT) ================= -->
              <template v-if="isRobotArea">
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.machine" label="Machine *" placeholder="Contoh: RSW-1" variant="outlined" density="compact" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.line" label="Line" placeholder="Contoh: LINE A" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.tipe_gun" :items="gunTypeOptions" label="Tipe Gun *" variant="outlined" density="compact" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.gun_type_detail" label="Gun Type Detail" placeholder="Contoh: SRTX-14573, TMX-849-3" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model.number="formData.stroke_dress" type="number" label="Stroke Dress" variant="outlined" density="compact" hint="Default: 350" persistent-hint />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model.number="formData.dress_tip_change" type="number" label="Dress Tip Change" variant="outlined" density="compact" hint="Default: 2450" persistent-hint />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model.number="formData.downtime" type="number" step="0.01" label="Downtime (menit)" variant="outlined" density="compact" hint="Default: 5.17" persistent-hint />
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="formData.note" label="Note" variant="outlined" density="compact" rows="2" />
                </v-col>
              </template>

              <!-- ================= ELSE (WSS ADM / SPOT MANUAL) ================= -->
              <template v-else>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.machine" label="Machine *" variant="outlined" density="compact" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.line" label="Line" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.upper_holder" :items="['Lurus', 'Pelatuk']" label="Upper Holder" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.lower_holder" :items="['Single', 'Rotary']" label="Lower Holder" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.kva" label="KVA" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-autocomplete v-model="formData.id_ms_nut" :items="ckdNutTypes" item-title="nut_type_label" item-value="id" label="Nut Type (CKD)" variant="outlined" density="compact" clearable />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.nut_feeder" :items="yesNoOptions" item-title="title" item-value="value" label="Nut Feeder" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.rotary_holder" :items="yesNoOptions" item-title="title" item-value="value" label="Rotary Holder" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.handy_navi" :items="yesNoOptions" item-title="title" item-value="value" label="Handy Navi" variant="outlined" density="compact" />
                  <v-select v-if="formData.handy_navi === '1'" v-model="formData.handy_navi_integrated" 
                    :items="getIntegrationOptions('handy')" item-title="title" item-value="value"
                    label="Share Integrasi dengan (Opsional)" variant="outlined" density="compact" clearable
                    hint="Kosongkan jika bukan share (berdiri sendiri)" persistent-hint class="mt-2" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.robo_navi" :items="yesNoOptions" item-title="title" item-value="value" label="Robo Navi" variant="outlined" density="compact" />
                  <v-select v-if="formData.robo_navi === '1'" v-model="formData.robo_navi_integrated" 
                    :items="getIntegrationOptions('robo')" item-title="title" item-value="value"
                    label="Share Integrasi dengan (Opsional)" variant="outlined" density="compact" clearable
                    hint="Kosongkan jika bukan share (berdiri sendiri)" persistent-hint class="mt-2" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.gate_sensor" :items="yesNoOptions" item-title="title" item-value="value" label="Gate Sensor" variant="outlined" density="compact" />
                  <v-select v-if="formData.gate_sensor === '1'" v-model="formData.gate_sensor_integrated" 
                    :items="getIntegrationOptions('gate')" item-title="title" item-value="value"
                    label="Share Integrasi dengan (Opsional)" variant="outlined" density="compact" clearable
                    hint="Kosongkan jika bukan share (berdiri sendiri)" persistent-hint class="mt-2" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.nut_feeder_type" label="Nut Feeder Type" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.is_polybox" :items="yesNoOptions" item-title="title" item-value="value" label="Polybox" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="formData.is_pallet" :items="yesNoOptions" item-title="title" item-value="value" label="Pallet" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="formData.note" label="Note" variant="outlined" density="compact" rows="3" />
                </v-col>
              </template>
            </v-row>
          </v-form>
        </v-card-text>
        
        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="isModalEditOpen = false">Batal</v-btn>
          <v-btn color="warning" variant="flat" type="submit" form="form-edit">Update</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Search Spec -->
    <v-dialog v-model="isModalSearchSpecOpen" max-width="1500px" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="bg-primary text-white d-flex justify-space-between align-center py-2 px-4">
          <span class="text-h6 font-weight-bold">
            <v-icon class="mr-2">mdi-magnify</v-icon>
            Cari Spec Mesin
          </span>
          <v-btn icon="mdi-close" variant="text" @click="isModalSearchSpecOpen = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-0">
          <v-row no-gutters style="min-height: 680px;">
            <!-- Left Side: Selection Controls -->
            <v-col cols="12" md="3" class="pa-4 border-right" style="background-color: #f8fafc; border-right: 1px solid #cbd5e1;">
              <div class="text-subtitle-1 font-weight-bold text-primary mb-3">Filter Spesifikasi</div>
              
              <v-select
                v-model="searchSpecForm.upper_holder"
                :items="['Lurus', 'Pelatuk']"
                label="Upper Holder"
                variant="outlined"
                density="compact"
                clearable
                class="mb-3"
              />
              
              <v-select
                v-model="searchSpecForm.lower_holder"
                :items="['Single', 'Rotary']"
                label="Lower Holder"
                variant="outlined"
                density="compact"
                clearable
                class="mb-3"
              />
              
              <v-select
                v-model="searchSpecForm.kva"
                :items="uniqueKvas"
                label="KVA"
                variant="outlined"
                density="compact"
                clearable
                class="mb-3"
              />
              
              <v-select
                v-model="searchSpecForm.container"
                :items="['Pallet', 'Polybox', 'Polybox dan Pallet']"
                label="Packaging"
                variant="outlined"
                density="compact"
                clearable
                class="mb-3"
              />
              
              <v-select
                v-model="searchSpecForm.nut_type"
                :items="uniqueNutTypes"
                label="Nut Type"
                variant="outlined"
                density="compact"
                clearable
                class="mb-3"
              />
              
              <v-select
                v-model="searchSpecForm.handy_navi"
                :items="[{title: 'Ya', value: '1'}, {title: 'Tidak', value: '0'}]"
                item-title="title"
                item-value="value"
                label="Handy Navi"
                variant="outlined"
                density="compact"
                clearable
                class="mb-3"
              />
              
              <v-select
                v-model="searchSpecForm.robo_navi"
                :items="[{title: 'Ya', value: '1'}, {title: 'Tidak', value: '0'}]"
                item-title="title"
                item-value="value"
                label="Robo Navi"
                variant="outlined"
                density="compact"
                clearable
                class="mb-3"
              />
              
              <v-select
                v-model="searchSpecForm.gate_sensor"
                :items="[{title: 'Ya', value: '1'}, {title: 'Tidak', value: '0'}]"
                item-title="title"
                item-value="value"
                label="Gate Sensor"
                variant="outlined"
                density="compact"
                clearable
                class="mb-3"
              />
              
              <v-btn
                color="secondary"
                variant="outlined"
                block
                prepend-icon="mdi-refresh"
                @click="resetSearchSpecForm"
                class="mt-2"
              >
                Reset Filter
              </v-btn>
            </v-col>
            
            <!-- Right Side: Machine Cards -->
            <v-col cols="12" md="9" class="pa-4 d-flex flex-column" style="background-color: #ffffff;">
              <div class="text-subtitle-1 font-weight-bold text-primary mb-3 d-flex justify-space-between align-center">
                <span>Hasil Pencarian ({{ filteredSearchMachines.length }} Mesin)</span>
                <span class="text-caption text-grey">Menampilkan mesin yang sesuai spesifikasi</span>
              </div>
              
              <div style="flex: 1; overflow-y: auto; max-height: 640px;" class="pe-2">
                <div style="display: flex; flex-wrap: wrap; gap: 16px;">
                  <div
                    v-for="m in filteredSearchMachines"
                    :key="m.id"
                    class="machine-card expanded-card"
                    style="width: 182px; height: 340px;"
                  >
                     <div class="machine-header d-flex justify-space-between align-center">
                       <span style="width: 100%; text-align: center;">{{ m.machine }}</span>
                     </div>
                     
                     <div class="machine-specs" style="font-size: 11px;">
                       <!-- Machine Specs (Key Value) -->
                       <div class="spec-list">
                         <!-- Line & Area Context -->
                         <div class="spec-row" style="background-color: #eef2f7; border-radius: 4px; margin-bottom: 2px;">
                           <span class="spec-label" style="font-size: 9px; color: #666;">Line: {{ m.line || '-' }} ({{ m.area || '-' }})</span>
                         </div>

                         <div class="spec-row" v-if="m.kva">
                           <span class="spec-label">KVA</span>
                           <span class="spec-value">{{ m.kva }}</span>
                         </div>

                         <div class="spec-row" v-if="m.original_rows.some((r: any) => r.is_pallet === '1' || r.is_polybox === '1')">
                           <span class="spec-label">Packaging</span>
                           <div style="display: flex; gap: 4px; align-items: center;">
                             <div v-if="m.original_rows.some((r: any) => r.is_pallet === '1')" style="width: 15px; height: 15px; background-color: #f44336; border-radius: 2px;" title="Pallet"></div>
                             <div v-if="m.original_rows.some((r: any) => r.is_polybox === '1')" style="width: 15px; height: 15px; background-color: #4caf50; border-radius: 2px;" title="Polybox"></div>
                           </div>
                         </div>

                         <div class="spec-row" v-if="m.original_rows[0]?.upper_holder">
                           <span class="spec-label">Up Holder</span>
                           <span class="spec-value">{{ m.original_rows[0].upper_holder }}</span>
                         </div>

                         <div class="spec-row" v-if="m.original_rows[0]?.lower_holder">
                           <span class="spec-label">Low Holder</span>
                           <span class="spec-value">{{ m.original_rows[0].lower_holder }}</span>
                         </div>

                         <div class="spec-row" v-if="m.original_rows[0]?.rotary_holder === '1'">
                           <span class="spec-label">Rotary</span>
                           <span class="spec-value">Yes</span>
                         </div>

                         <!-- Gate Sensor Row under Rotary -->
                         <div class="spec-row" v-if="m.original_rows[0]?.gate_sensor === '1'">
                           <span class="spec-label">Gate Sensor</span>
                           <span class="spec-value">Yes</span>
                         </div>
                       </div>

                       <v-divider class="my-1 border-opacity-50"></v-divider>

                        <!-- Nut Types & Integrations -->
                        <div class="nut-section">
                          <div class="text-caption text-grey mb-1" style="font-size: 10px !important;">Nut Types & Integrasi</div>
                          <table style="width: 100%; border-collapse: separate; border-spacing: 2px; margin-top: -4px;">
                            <tbody>
                              <tr v-for="(spec, idx) in m.original_rows" :key="spec.id" style="height: 32px;">
                                
                                <!-- Column 0: NF Badge (Rendered only if machine has NF) -->
                                <template v-if="m.original_rows.some((r: any) => r.nut_feeder === '1')">
                                  <td v-if="spec.nut_feeder === '1'"
                                      class="integ-badge nf text-center"
                                      style="font-size: 10px !important; font-weight: bold; border-radius: 5px; height: 32px;">
                                    NF
                                  </td>
                                  <td v-else style="width: 24px; min-width: 24px; max-width: 24px; padding: 0; height: 32px;"></td>
                                </template>

                                <!-- Column 1: Nut Chip (Always rendered) -->
                                <td style="padding: 0; vertical-align: middle;">
                                  <div class="nut-chip" style="font-size: 11px; padding: 2px 4px; text-align: center; width: 100%; height: 26px; min-height: 26px; box-sizing: border-box;">
                                     {{ spec.nut_type_alias || spec.nut_type || spec.nut_part_number || '-' }}
                                  </div>
                                </td>

                                <!-- Column 2: HN Badge (Rendered only if machine has HN) -->
                                <template v-if="m.original_rows.some((r: any) => r.handy_navi === '1')">
                                  <template v-if="getBadgeCellStatus(m.original_rows, idx, 'handy_navi', 'handy_navi_integrated') === 'render'">
                                    <td :rowspan="getBadgeSpanInfo(m.original_rows, idx, 'handy_navi', 'handy_navi_integrated')"
                                        class="integ-badge hn text-center"
                                        style="font-size: 10px !important; font-weight: bold; border-radius: 5px;">
                                      HN
                                    </td>
                                  </template>
                                  <template v-else-if="getBadgeCellStatus(m.original_rows, idx, 'handy_navi', 'handy_navi_integrated') === 'empty'">
                                    <td style="width: 24px; min-width: 24px; max-width: 24px; padding: 0;"></td>
                                  </template>
                                </template>

                                <!-- Column 3: RN Badge (Rendered only if machine has RN) -->
                                <template v-if="m.original_rows.some((r: any) => r.robo_navi === '1')">
                                  <template v-if="getBadgeCellStatus(m.original_rows, idx, 'robo_navi', 'robo_navi_integrated') === 'render'">
                                    <td :rowspan="getBadgeSpanInfo(m.original_rows, idx, 'robo_navi', 'robo_navi_integrated')"
                                        class="integ-badge rn text-center"
                                        style="font-size: 10px !important; font-weight: bold; border-radius: 5px;">
                                      RN
                                    </td>
                                  </template>
                                  <template v-else-if="getBadgeCellStatus(m.original_rows, idx, 'robo_navi', 'robo_navi_integrated') === 'empty'">
                                    <td style="width: 24px; min-width: 24px; max-width: 24px; padding: 0;"></td>
                                  </template>
                                </template>

                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                  </div>
                  
                  <div v-if="filteredSearchMachines.length === 0" class="text-grey pa-8 w-100 text-center text-subtitle-1">
                    <v-icon size="40" color="grey-lighten-1" class="mb-2">mdi-alert-circle-outline</v-icon>
                    <div>Tidak ada mesin yang cocok dengan spesifikasi terpilih</div>
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="flat" @click="isModalSearchSpecOpen = false" width="100">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<style scoped>
.custom-table :deep(.v-table__wrapper) {
  max-height: 700px;
  overflow-y: auto;
}

.custom-table :deep(table) {
  border-collapse: collapse !important;
  border: 1.5px solid #94a3b8 !important;
}

.custom-table :deep(th) {
  background-color: #eef2f7 !important;
  color: #000000 !important;
  font-weight: bold !important;
  text-transform: uppercase;
  font-size: 11px !important;
  padding: 4px 6px !important;
  border-bottom: 2px solid #94a3b8 !important;
  border-right: 1.5px solid #cbd5e1 !important;
}

.custom-table :deep(td) {
  padding: 4px 6px !important;
  font-size: 11px !important;
  border-bottom: 1.5px solid #cbd5e1 !important;
  border-right: 1.5px solid #cbd5e1 !important;
  vertical-align: middle !important;
  color: #000000 !important;
}

.custom-table :deep(tr:hover:not(.v-data-table__empty-wrapper)) {
  background-color: rgba(33, 150, 243, 0.08) !important;
}

.hover-header:hover {
  background-color: #e2e8f0;
  border-radius: 4px;
}

.integ-badge {
  font-size: 10px !important;
  font-weight: bold;
  padding: 0;
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: default;
  text-align: center;
  vertical-align: middle;
  width: 24px;
  min-width: 24px;
  max-width: 24px;
  box-sizing: border-box;
}

.connected-top {
  border-top-left-radius: 0px !important;
  border-top-right-radius: 0px !important;
  border-top: none !important;
}

.connected-bottom {
  border-bottom-left-radius: 0px !important;
  border-bottom-right-radius: 0px !important;
  border-bottom: none !important;
}

.rn { color: #0277bd; background-color: #e1f5fe; border: 1px solid #81d4fa; }
.hn { color: #6a1b9a; background-color: #f3e5f5; border: 1px solid #ce93d8; }
.gs { color: #e65100; background-color: #fff3e0; border: 1px solid #ffcc80; }
.nf { color: #00796b; background-color: #e0f2f1; border: 1px solid #b2dfdb; }

.machine-card {
  width: 80px;
  background-color: #e3f2fd;
  border: 2px solid #2196f3;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.machine-card.expanded-card {
  width: 182px;
}

.machine-header {
  background-color: #2196f3;
  color: white;
  font-weight: bold;
  padding: 4px 8px;
  font-size: 12px;
  text-align: center;
}

.machine-specs {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 4px;
  overflow-y: auto;
  gap: 0px;
}

.spec-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.spec-row:hover {
  background-color: #f5f5f5;
}

.spec-label {
  font-size: 10px;
  color: #000;
  font-weight: 600;
}

.spec-value {
  font-size: 11px;
  color: #000;
  font-weight: bold;
}

.nut-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nut-chip {
  background-color: #ffffff;
  color: #1976d2;
  border: 1px solid #90caf9;
  font-size: 11px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  height: 100%;
  min-height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
</style>
