<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue';
import type { SpecMachine } from '@/types/Welding/Master/SpecMachine';
import { useConfigStore } from '@/stores/config';
import axios from 'axios';

const props = defineProps<{
  machines: SpecMachine[];
}>();

const configStore = useConfigStore();
const emit = defineEmits(['save-layout']);

const isPartsModalOpen = ref(false);
const selectedMachineName = ref('');
const loadingParts = ref(false);
const partsList = ref<any[]>([]);
const selectedPartDetail = ref<any | null>(null);

const openPartsModal = async (machineName: string) => {
  if (!machineName) return;
  selectedMachineName.value = machineName;
  selectedPartDetail.value = null;
  isPartsModalOpen.value = true;
  loadingParts.value = true;
  partsList.value = [];

  try {
    const baseUrl = configStore.apiUrl ? `http://${configStore.apiUrl}` : 'http://192.168.10.67';
    const res = await axios.get(`${baseUrl}/majsf_rest_api/api/Welding_spec_machine/PartsByMachineNew`, {
      params: { machine: machineName }
    });
    if (res.data && res.data.status === 'success') {
      partsList.value = res.data.data || [];
    }
  } catch (error) {
    console.error('Error fetching parts:', error);
  } finally {
    loadingParts.value = false;
  }
};

const getMachineNutTypesStr = (machineName: string) => {
  if (!machineName || !props.machines) return '';
  const tokens = machineName.split(' ').map(t => t.trim()).filter(Boolean);
  const match = props.machines.find((m: any) => {
    const mTokens = (m.machine || '').split(' ').map((t: any) => t.trim()).filter(Boolean);
    return tokens.some(t => mTokens.includes(t));
  });
  if (match) {
    return match.nut_type_alias || match.nut_type || match.nut_part_number || '';
  }
  return '';
};

const slotsPerRow = 12;
const rows = ref(2);

// Local state for layout
const layout = ref<{ [key: string]: any | null }>({});
const selectedAreaFilter = ref<string | null>(null);

const filteredLayout = computed(() => {
  return layout.value;
});

const visibleRowIndices = computed(() => {
  const list: number[] = [];
  for (let r = 0; r < rows.value; r++) {
    list.push(r);
  }
  return list;
});

const unassignedMachines = ref<any[]>([]);
const filteredUnassignedMachines = computed(() => {
  return unassignedMachines.value;
});
const hasChanges = ref(false);
const showDetails = ref(false);
const isEditMode = ref(false);

const uniqueAreas = computed(() => {
  const areas = new Set<string>();
  props.machines.forEach(m => {
    const val = m.area || m.line;
    if (val) {
      areas.add(val);
    }
  });
  return Array.from(areas).map(name => ({
    name,
    color: getColorForLine(name)
  }));
});

const initializeLayout = () => {
  const newLayout: { [key: string]: SpecMachine | null } = {};
  const unassigned: SpecMachine[] = [];

  // Filter machines by selected area if applied
  const activeMachines = props.machines.filter(m => {
    if (!selectedAreaFilter.value) return true;
    return m.area === selectedAreaFilter.value || (!m.area && m.line === selectedAreaFilter.value);
  });

  // Determine max row from active machines
  let maxRow = 1;
  activeMachines.forEach(m => {
    if (m.pos_row !== null && m.pos_row !== undefined) {
      maxRow = Math.max(maxRow, m.pos_row);
    }
  });
  rows.value = Math.max(2, maxRow + 1);

  // Initialize empty slots
  for (let r = 0; r < rows.value; r++) {
    for (let c = 0; c < slotsPerRow; c++) {
      newLayout[`${r}-${c}`] = null;
    }
  }

  // Group machines by name and line
  const uniqueMachinesMap = new Map<string, SpecMachine[]>();
  activeMachines.forEach(m => {
    const key = `${m.machine}_${m.line || ''}`;
    if (!uniqueMachinesMap.has(key)) {
      uniqueMachinesMap.set(key, []);
    }
    uniqueMachinesMap.get(key)!.push(m);
  });

  const groupedMachines: any[] = [];
  uniqueMachinesMap.forEach((group) => {
    const rep = JSON.parse(JSON.stringify(group[0]));
    rep.represented_ids = group.map(m => m.id);
    rep.original_rows = group;
    
    rep.robo_groups = [...new Set(group.filter(m => m.robo_navi === '1').map(m => m.robo_navi_integrated || m.id))];
    rep.handy_groups = [...new Set(group.filter(m => m.handy_navi === '1').map(m => m.handy_navi_integrated || m.id))];
    rep.gate_groups = [...new Set(group.filter(m => m.gate_sensor === '1').map(m => m.gate_sensor_integrated || m.id))];
    rep.nut_types = [...new Set(group.map(m => m.nut_type_alias || m.nut_type || m.nut_part_number || ''))].filter(Boolean);
    
    groupedMachines.push(rep);
  });

  groupedMachines.forEach(m => {
    if (m.pos_row !== null && m.pos_row !== undefined && m.pos_col !== null && m.pos_col !== undefined && m.pos_col < slotsPerRow) {
      newLayout[`${m.pos_row}-${m.pos_col}`] = m;
    } else {
      unassigned.push(m);
    }
  });

  layout.value = newLayout;
  unassignedMachines.value = unassigned;
  hasChanges.value = false;
  drawGroupBorders();
};

watch(() => props.machines, () => {
  initializeLayout();
}, { deep: true });

watch(selectedAreaFilter, () => {
  initializeLayout();
});

onMounted(() => {
  if (uniqueAreas.value.length > 0) {
    selectedAreaFilter.value = uniqueAreas.value[0].name;
  }
  initializeLayout();
});

// Drag and Drop logic
const dragStart = (event: DragEvent, machine: SpecMachine, sourceRow: number | null, sourceCol: number | null) => {
  if (!isEditMode.value) {
    event.preventDefault();
    return;
  }
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', JSON.stringify({
      id: machine.id,
      sourceRow,
      sourceCol
    }));
  }
};

const handleDrop = (event: DragEvent, targetRow: number | null, targetCol: number | null) => {
  if (!isEditMode.value) return;
  event.preventDefault();
  const dataString = event.dataTransfer?.getData('text/plain');
  if (!dataString) return;

  try {
    const data = JSON.parse(dataString);
    const machineId = data.id;
    const sourceRow = data.sourceRow;
    const sourceCol = data.sourceCol;

    if (sourceRow === targetRow && sourceCol === targetCol) return;

    // Find the machine object
    let machine: SpecMachine | null = null;
    if (sourceRow !== null && sourceCol !== null) {
      machine = layout.value[`${sourceRow}-${sourceCol}`];
    } else {
      const idx = unassignedMachines.value.findIndex(m => m.id === machineId);
      if (idx !== -1) {
        machine = unassignedMachines.value[idx];
      }
    }

    if (!machine) return;

    // Remove from source
    if (sourceRow !== null && sourceCol !== null) {
      layout.value[`${sourceRow}-${sourceCol}`] = null;
    } else {
      unassignedMachines.value = unassignedMachines.value.filter(m => m.id !== machineId);
    }

    // Add to target
    if (targetRow !== null && targetCol !== null) {
      const existingInTarget = layout.value[`${targetRow}-${targetCol}`];
      if (existingInTarget) {
        // Push existing to unassigned for simplicity
        existingInTarget.pos_row = null;
        existingInTarget.pos_col = null;
        unassignedMachines.value.push(existingInTarget);
      }
      machine.pos_row = targetRow;
      machine.pos_col = targetCol;
      layout.value[`${targetRow}-${targetCol}`] = machine;
    } else {
      machine.pos_row = null;
      machine.pos_col = null;
      unassignedMachines.value.push(machine);
    }

    hasChanges.value = true;
    drawGroupBorders();
  } catch (e) {
    console.error("Drop error", e);
  }
};

const hoveredSpecType = ref<string | null>(null);
const hoveredSpecValue = ref<string | null>(null);
const lockedSpecs = ref<{type: string, value: string}[]>([]);
const lockedMachine = ref<string | null>(null);

const onSpecHover = (type: string, value: string | null | undefined) => {
  hoveredSpecType.value = type;
  hoveredSpecValue.value = value || '-';
};

const onSpecLeave = () => {
  hoveredSpecType.value = null;
  hoveredSpecValue.value = null;
};

const toggleSpecLock = (machine: string, type: string, value: string | null | undefined) => {
  const val = value || '-';
  const isIntegrationType = ['handy', 'robo', 'gate', 'nut_feeder_badge'].includes(type);
  
  if (!isIntegrationType && lockedMachine.value !== machine) {
    // Clear only non-integration specs, keep integration ones
    lockedSpecs.value = lockedSpecs.value.filter(s => ['handy', 'robo', 'gate', 'nut_feeder_badge'].includes(s.type));
    lockedMachine.value = machine;
  }
  
  const index = lockedSpecs.value.findIndex(s => s.type === type && s.value === val);
  if (index >= 0) {
    lockedSpecs.value.splice(index, 1);
    if (!isIntegrationType && !lockedSpecs.value.some(s => !['handy', 'robo', 'gate', 'nut_feeder_badge'].includes(s.type))) {
      lockedMachine.value = null;
    }
  } else {
    lockedSpecs.value.push({ type, value: val });
    if (!isIntegrationType) {
      lockedMachine.value = machine;
    }
  }
};

const machineMatchesLockedSpecs = (m: any) => {
  if (!m || !lockedSpecs.value || lockedSpecs.value.length === 0) return true;
  
  return lockedSpecs.value.every(s => {
    const val = s.value;
    if (s.type === 'kva') {
      return String(m.kva || '-') === val;
    }
    if (s.type === 'up_holder') {
      return m.original_rows.some((r: any) => String(r.upper_holder || '-') === val);
    }
    if (s.type === 'low_holder') {
      return m.original_rows.some((r: any) => String(r.lower_holder || '-') === val);
    }
    if (s.type === 'rotary') {
      return m.original_rows.some((r: any) => String(r.rotary_holder || '-') === val);
    }
    if (s.type === 'nut_feeder') {
      return m.original_rows.some((r: any) => String(r.nut_feeder_type || '-') === val);
    }
    if (s.type === 'nut') {
      return m.original_rows.some((r: any) => String(r.nut_type || '-') === val);
    }
    if (s.type === 'robo') {
      return m.original_rows.some((r: any) => r.robo_navi === '1' || r.robo_navi === 1);
    }
    if (s.type === 'handy') {
      return m.original_rows.some((r: any) => r.handy_navi === '1' || r.handy_navi === 1);
    }
    if (s.type === 'gate') {
      return m.original_rows.some((r: any) => r.gate_sensor === '1' || r.gate_sensor === 1);
    }
    if (s.type === 'nut_feeder_badge') {
      return m.original_rows.some((r: any) => r.nut_feeder === '1' || r.nut_feeder === 1);
    }
    if (s.type === 'packaging') {
      const hasPallet = m.original_rows.some((r: any) => r.is_pallet === '1' || r.is_pallet === 1);
      const hasPolybox = m.original_rows.some((r: any) => r.is_polybox === '1' || r.is_polybox === 1);
      if (s.value === 'both') {
        return hasPallet && hasPolybox;
      }
      if (s.value === 'pallet') {
        return hasPallet;
      }
      if (s.value === 'polybox') {
        return hasPolybox;
      }
      return false;
    }
    return true;
  });
};

const getPackagingValue = (m: any) => {
  if (!m || !m.original_rows) return '-';
  const hasPallet = m.original_rows.some((r: any) => r.is_pallet === '1' || r.is_pallet === 1);
  const hasPolybox = m.original_rows.some((r: any) => r.is_polybox === '1' || r.is_polybox === 1);
  if (hasPallet && hasPolybox) return 'both';
  if (hasPallet) return 'pallet';
  if (hasPolybox) return 'polybox';
  return '-';
};

const isSpecHighlighted = (type: string, value: string | null | undefined, m: any = null) => {
  const val = value || '-';
  
  if (type === 'packaging') {
    const lock = lockedSpecs.value.find(s => s.type === 'packaging');
    if (lock) {
      let matchesCompat = false;
      if (lock.value === 'both' && val === 'both') matchesCompat = true;
      else if (lock.value === 'pallet' && (val === 'pallet' || val === 'both')) matchesCompat = true;
      else if (lock.value === 'polybox' && (val === 'polybox' || val === 'both')) matchesCompat = true;
      
      if (matchesCompat) {
        return m ? machineMatchesLockedSpecs(m) : true;
      }
    }
    return false;
  }
  
  if (lockedSpecs.value.some(s => s.type === type && s.value === val)) {
    return m ? machineMatchesLockedSpecs(m) : true;
  }
  return false;
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

const saveLayout = () => {
  const payload: any[] = [];
  
  // Collect assigned machines
  for (let r = 0; r < rows.value; r++) {
    for (let c = 0; c < slotsPerRow; c++) {
      const m = layout.value[`${r}-${c}`];
      if (m && m.represented_ids) {
        m.represented_ids.forEach((id: any) => {
          payload.push({ id: id, pos_row: r, pos_col: c });
        });
      }
    }
  }

  // Collect unassigned machines
  unassignedMachines.value.forEach(m => {
    if (m.represented_ids) {
      m.represented_ids.forEach((id: any) => {
        payload.push({ id: id, pos_row: null, pos_col: null });
      });
    }
  });

  emit('save-layout', payload);
  hasChanges.value = false;
};

// Line Grouping logic
const lineGroups = ref<{ [key: string]: { line: string, minRow: number, maxRow: number, minCol: number, maxCol: number } }>({});

const drawGroupBorders = async () => {
  await nextTick();
  const groups: { [key: string]: { line: string, minRow: number, maxRow: number, minCol: number, maxCol: number } } = {};
  
  // Find min/max bounds for each line
  for (let r = 0; r < rows.value; r++) {
    for (let c = 0; c < slotsPerRow; c++) {
      const m = filteredLayout.value[`${r}-${c}`];
      if (m && m.line) {
        if (!groups[m.line]) {
          groups[m.line] = { line: m.line, minRow: r, maxRow: r, minCol: c, maxCol: c };
        } else {
          groups[m.line].minRow = Math.min(groups[m.line].minRow, r);
          groups[m.line].maxRow = Math.max(groups[m.line].maxRow, r);
          groups[m.line].minCol = Math.min(groups[m.line].minCol, c);
          groups[m.line].maxCol = Math.max(groups[m.line].maxCol, c);
        }
      }
    }
  }
  
  lineGroups.value = groups;
};

const getSlotStyle = (r: number, c: number) => {
  let style: any = { border: '1px dashed #ccc' };
  
  const m = filteredLayout.value[`${r}-${c}`];
  if (m) {
    const areaColorCode = m.area || m.line;
    if (areaColorCode) {
      style.backgroundColor = getColorForLine(areaColorCode) + '20'; // transparent background per area
    }
    
    // Group borders by line (for outer red borders)
    if (m.line) {
      const line = m.line;
      // Check neighbors
    const topM = filteredLayout.value[`${r-1}-${c}`];
    const bottomM = filteredLayout.value[`${r+1}-${c}`];
    const leftM = filteredLayout.value[`${r}-${c-1}`];
    const rightM = filteredLayout.value[`${r}-${c+1}`];

    if (!topM || topM.line !== line) style.borderTop = '3px solid red';
    else style.borderTop = 'none';

    if (!bottomM || bottomM.line !== line) style.borderBottom = '3px solid red';
    else style.borderBottom = 'none';

    if (!leftM || leftM.line !== line) style.borderLeft = '3px solid red';
    else style.borderLeft = 'none';

    if (!rightM || rightM.line !== line) style.borderRight = '3px solid red';
    else style.borderRight = 'none';
    }
  }
  return style;
};

const getBridgeStyle = (r: number, c: number) => {
  const m = filteredLayout.value[`${r}-${c}`];
  const bottomM = filteredLayout.value[`${r+1}-${c}`];
  
  if (!m || !bottomM || !m.line || m.line !== bottomM.line) return null;

  const leftM = filteredLayout.value[`${r}-${c-1}`];
  const rightM = filteredLayout.value[`${r}-${c+1}`];
  const bottomLeftM = filteredLayout.value[`${r+1}-${c-1}`];
  const bottomRightM = filteredLayout.value[`${r+1}-${c+1}`];

  let borderLeft = 'none';
  if ((!leftM || leftM.line !== m.line) || (!bottomLeftM || bottomLeftM.line !== m.line)) {
    borderLeft = '3px solid red';
  }

  let borderRight = 'none';
  if ((!rightM || rightM.line !== m.line) || (!bottomRightM || bottomRightM.line !== m.line)) {
    borderRight = '3px solid red';
  }
  
  const areaColorCode = m.area || m.line;
  const bgColor = areaColorCode ? getColorForLine(areaColorCode) + '20' : 'transparent';

  return {
    borderLeft,
    borderRight,
    backgroundColor: bgColor
  };
};

// Colors for badges
const getColorForLine = (line: string) => {
  const hash = Array.from(line).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
  return colors[hash % colors.length];
};

const getLineSpan = (rIndex: number, cIndex: number, line: string) => {
  let span = 1;
  while (cIndex + span < slotsPerRow) {
    const nextM = filteredLayout.value[`${rIndex}-${cIndex + span}`];
    if (nextM && nextM.line === line) {
      span++;
    } else {
      break;
    }
  }
  return span;
};

const addRow = () => {
  const newRow = rows.value;
  for (let c = 0; c < slotsPerRow; c++) {
    layout.value[`${newRow}-${c}`] = null;
  }
  rows.value++;
};

const cancelEdit = () => {
  isEditMode.value = false;
  initializeLayout();
};
</script>

<template>
  <v-card class="mb-6 elevation-2" style="background-color: #f9f9f9;">
    <v-card-title class="d-flex justify-space-between align-center pa-4 bg-white border-bottom">
      <div class="d-flex align-center">
        <v-icon color="primary" class="mr-2">mdi-chart-gantt</v-icon>
        <span class="font-weight-bold text-h6">Machine Layout Diagram</span>
      </div>
      <div class="d-flex align-center">
        <v-select
          v-model="selectedAreaFilter"
          :items="uniqueAreas.map(a => a.name)"
          label="Filter Area"
          variant="outlined"
          density="compact"
          clearable
          hide-details
          style="width: 200px;"
          class="mr-4"
        ></v-select>
        <v-switch v-model="showDetails" label="Tampilkan Detail Spec" color="primary" hide-details density="compact" class="mr-6"></v-switch>
        
        <v-btn v-if="!isEditMode" color="warning" variant="outlined" @click="isEditMode = true" prepend-icon="mdi-pencil" class="mr-2">
          Ubah Layout
        </v-btn>
        
        <v-btn v-if="isEditMode" color="error" variant="outlined" @click="cancelEdit" prepend-icon="mdi-close" class="mr-2">
          Batal
        </v-btn>

        <v-btn v-if="isEditMode" color="primary" @click="saveLayout" :disabled="!hasChanges" prepend-icon="mdi-content-save">
          Simpan Layout
        </v-btn>
      </div>
    </v-card-title>
    
    <v-card-text class="pa-4">
      <!-- Legend Section -->
      <v-card variant="outlined" class="mb-4 pa-3 rounded-lg bg-white" style="border-color: rgba(0,0,0,0.12);">
        <div class="text-caption font-weight-bold text-grey-darken-2 mb-2 d-flex align-center">
          <v-icon size="16" class="mr-1">mdi-help-circle-outline</v-icon>
          Keterangan / Legend Layout
        </div>
        <div style="display: flex; flex-wrap: wrap; align-items: center; row-gap: 8px; column-gap: 20px;" class="text-caption">
          <!-- Area Colors -->
          <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px; border-right: 1px solid #ddd; padding-right: 16px; margin-right: 16px;">
            <span class="font-weight-medium mr-1">Area / Line:</span>
            <div v-for="area in uniqueAreas" :key="area.name" style="display: flex; align-items: center; margin-right: 12px; margin-bottom: 4px;">
              <span style="width: 14px; height: 14px; border-radius: 3px; display: inline-block; margin-right: 4px;" :style="{ backgroundColor: area.color + '20', border: '1.5px solid ' + area.color }"></span>
              <span>{{ area.name }}</span>
            </div>
            <div v-if="uniqueAreas.length === 0" class="text-grey-darken-1">-</div>
          </div>

          <!-- Containers -->
          <div style="display: flex; align-items: center; gap: 16px; border-right: 1px solid #ddd; padding-right: 16px; margin-right: 16px; min-height: 24px;">
            <span class="font-weight-medium">Indikator Wadah:</span>
            <div style="display: flex; align-items: center;">
              <span style="width: 12px; height: 12px; background-color: #f44336; border-radius: 2px; display: inline-block; margin-right: 4px;"></span>
              <span>Pallet</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span style="width: 12px; height: 12px; background-color: #4caf50; border-radius: 2px; display: inline-block; margin-right: 4px;"></span>
              <span>Polybox</span>
            </div>
          </div>

          <!-- Integrations -->
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <span class="font-weight-medium">Navigasi & Feeder:</span>
            <div style="display: flex; align-items: center;">
              <span class="integ-badge nf text-center mr-1" style="font-size: 9px; padding: 1px 4px; display: inline-flex; align-items: center; justify-content: center; width: 28px; min-width: 28px; line-height: 1; height: 18px; border-radius: 3px;">NF</span>
              <span>Nut Feeder</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span class="integ-badge hn text-center mr-1" style="font-size: 9px; padding: 1px 4px; display: inline-flex; align-items: center; justify-content: center; width: 28px; min-width: 28px; line-height: 1; height: 18px; border-radius: 3px;">HN</span>
              <span>Handy Navi</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span class="integ-badge rn text-center mr-1" style="font-size: 9px; padding: 1px 4px; display: inline-flex; align-items: center; justify-content: center; width: 28px; min-width: 28px; line-height: 1; height: 18px; border-radius: 3px;">RN</span>
              <span>Robo Navi</span>
            </div>
          </div>
        </div>
      </v-card>

      <!-- Grid Area Scroll Container -->
      <div class="layout-container">
        <!-- Grid Area -->
        <div class="grid-area">
          <template v-for="(rIndex, idx) in visibleRowIndices" :key="rIndex">
            <div class="d-flex">
              <div class="slot-container" v-for="c in slotsPerRow" :key="c" 
                   :class="{ 'expanded-slot': showDetails }"
                   @dragover.prevent 
                   @drop="handleDrop($event, rIndex, c - 1)"
                   :style="getSlotStyle(rIndex, c - 1)">
                
                <!-- Draw Area/Line Badge centered over the entire line block -->
                <div class="line-badge" 
                     v-if="filteredLayout[`${rIndex}-${c-1}`]?.line && (!filteredLayout[`${rIndex-1}-${c-1}`] || filteredLayout[`${rIndex-1}-${c-1}`]!.line !== filteredLayout[`${rIndex}-${c-1}`]!.line) && (!filteredLayout[`${rIndex}-${c-2}`] || filteredLayout[`${rIndex}-${c-2}`]!.line !== filteredLayout[`${rIndex}-${c-1}`]!.line)"
                     :style="{ 
                        backgroundColor: getColorForLine(filteredLayout[`${rIndex}-${c-1}`]!.area || filteredLayout[`${rIndex}-${c-1}`]!.line || ''), 
                        zIndex: 20,
                        left: `calc(50% + ${(getLineSpan(rIndex, c - 1, filteredLayout[`${rIndex}-${c-1}`]!.line) - 1) * 50}%)`
                     }">
                  {{ filteredLayout[`${rIndex}-${c-1}`]!.line }}
                </div>

                <!-- Vertical Bridge across Conveyor -->
                <div class="vertical-bridge" v-if="getBridgeStyle(rIndex, c - 1)" :style="getBridgeStyle(rIndex, c - 1)"></div>

                <!-- Machine Card -->
                <div class="machine-card" 
                     :class="{ 'expanded-card': showDetails }"
                     v-if="filteredLayout[`${rIndex}-${c-1}`]" 
                     :draggable="isEditMode" 
                     @dragstart="dragStart($event, filteredLayout[`${rIndex}-${c-1}`]!, rIndex, c - 1)"
                     :style="isEditMode ? 'cursor: grab' : 'default'">
                   <div class="machine-header d-flex justify-space-between align-center"
                        @click.stop="!isEditMode && openPartsModal(filteredLayout[`${rIndex}-${c-1}`]!.machine)"
                        :style="!isEditMode ? 'cursor: pointer' : ''"
                        title="Klik header untuk melihat detail part mesin">
                     <span style="width: 100%; text-align: center;">{{ filteredLayout[`${rIndex}-${c-1}`]!.machine }}</span>
                   </div>
                   
                   <!-- Detailed Specs -->
                   <div v-if="showDetails" class="machine-specs">
                      <!-- Machine Specs (Key Value) -->
                      <div class="spec-list">
                        <div class="spec-row cursor-pointer" v-if="filteredLayout[`${rIndex}-${c-1}`]!.kva"
                             :class="{ 'highlighted-row': isSpecHighlighted('kva', filteredLayout[`${rIndex}-${c-1}`]!.kva, filteredLayout[`${rIndex}-${c-1}`]) }"
                             @mouseenter="onSpecHover('kva', filteredLayout[`${rIndex}-${c-1}`]!.kva)" @mouseleave="onSpecLeave" @click="toggleSpecLock(filteredLayout[`${rIndex}-${c-1}`]!.machine, 'kva', filteredLayout[`${rIndex}-${c-1}`]!.kva)">
                          <span class="spec-label">KVA</span>
                          <span class="spec-value">{{ filteredLayout[`${rIndex}-${c-1}`]!.kva }}</span>
                        </div>

                        <div class="spec-row cursor-pointer" v-if="filteredLayout[`${rIndex}-${c-1}`]!.original_rows.some((m: any) => m.is_pallet === '1' || m.is_polybox === '1')"
                             :class="{ 'highlighted-row': isSpecHighlighted('packaging', getPackagingValue(filteredLayout[`${rIndex}-${c-1}`]!)) }"
                             @click="toggleSpecLock(filteredLayout[`${rIndex}-${c-1}`]!.machine, 'packaging', getPackagingValue(filteredLayout[`${rIndex}-${c-1}`]!))">
                          <span class="spec-label">Packaging</span>
                          <div style="display: flex; gap: 4px; align-items: center;">
                            <div v-if="filteredLayout[`${rIndex}-${c-1}`]!.original_rows.some((m: any) => m.is_pallet === '1')" style="width: 15px; height: 15px; background-color: #f44336; border-radius: 2px;" title="Pallet"></div>
                            <div v-if="filteredLayout[`${rIndex}-${c-1}`]!.original_rows.some((m: any) => m.is_polybox === '1')" style="width: 15px; height: 15px; background-color: #4caf50; border-radius: 2px;" title="Polybox"></div>
                          </div>
                        </div>

                        <div class="spec-row cursor-pointer" v-if="filteredLayout[`${rIndex}-${c-1}`]!.original_rows[0]?.upper_holder"
                             :class="{ 'highlighted-row': isSpecHighlighted('up_holder', filteredLayout[`${rIndex}-${c-1}`]!.original_rows[0].upper_holder, filteredLayout[`${rIndex}-${c-1}`]) }"
                             @mouseenter="onSpecHover('up_holder', filteredLayout[`${rIndex}-${c-1}`]!.original_rows[0].upper_holder)" @mouseleave="onSpecLeave" @click="toggleSpecLock(filteredLayout[`${rIndex}-${c-1}`]!.machine, 'up_holder', filteredLayout[`${rIndex}-${c-1}`]!.original_rows[0].upper_holder)">
                          <span class="spec-label">Up Holder</span>
                          <span class="spec-value">{{ filteredLayout[`${rIndex}-${c-1}`]!.original_rows[0].upper_holder }}</span>
                        </div>

                        <div class="spec-row cursor-pointer" v-if="filteredLayout[`${rIndex}-${c-1}`]!.original_rows[0]?.lower_holder"
                             :class="{ 'highlighted-row': isSpecHighlighted('low_holder', filteredLayout[`${rIndex}-${c-1}`]!.original_rows[0].lower_holder, filteredLayout[`${rIndex}-${c-1}`]) }"
                             @mouseenter="onSpecHover('low_holder', filteredLayout[`${rIndex}-${c-1}`]!.original_rows[0].lower_holder)" @mouseleave="onSpecLeave" @click="toggleSpecLock(filteredLayout[`${rIndex}-${c-1}`]!.machine, 'low_holder', filteredLayout[`${rIndex}-${c-1}`]!.original_rows[0].lower_holder)">
                          <span class="spec-label">Low Holder</span>
                          <span class="spec-value">{{ filteredLayout[`${rIndex}-${c-1}`]!.original_rows[0].lower_holder }}</span>
                        </div>

                        <div class="spec-row cursor-pointer" v-if="filteredLayout[`${rIndex}-${c-1}`]!.original_rows[0]?.rotary_holder === '1'"
                             :class="{ 'highlighted-row': isSpecHighlighted('rotary', '1', filteredLayout[`${rIndex}-${c-1}`]) }"
                             @mouseenter="onSpecHover('rotary', '1')" @mouseleave="onSpecLeave" @click="toggleSpecLock(filteredLayout[`${rIndex}-${c-1}`]!.machine, 'rotary', '1')">
                          <span class="spec-label">Rotary</span>
                          <span class="spec-value">Yes</span>
                        </div>

                        <!-- Gate Sensor Row under Rotary -->
                        <div class="spec-row cursor-pointer" v-if="filteredLayout[`${rIndex}-${c-1}`]!.original_rows[0]?.gate_sensor === '1'"
                             :class="{ 'highlighted-row': isSpecHighlighted('gate', '1', filteredLayout[`${rIndex}-${c-1}`]) }"
                             @mouseenter="onSpecHover('gate', '1')" @mouseleave="onSpecLeave" @click="toggleSpecLock(filteredLayout[`${rIndex}-${c-1}`]!.machine, 'gate', '1')">
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
                              <tr v-for="(spec, idx) in filteredLayout[`${rIndex}-${c-1}`]!.original_rows" :key="spec.id" style="height: 32px;">
                                
                                <!-- Column 0: NF Badge (Rendered only if machine has NF) -->
                                <template v-if="filteredLayout[`${rIndex}-${c-1}`]!.original_rows.some((r: any) => r.nut_feeder === '1')">
                                  <td v-if="spec.nut_feeder === '1'"
                                      class="integ-badge nf cursor-pointer text-center"
                                      :class="{ 'highlighted-badge': isSpecHighlighted('nut_feeder_badge', '1', filteredLayout[`${rIndex}-${c-1}`]) }"
                                      @click="toggleSpecLock(filteredLayout[`${rIndex}-${c-1}`]!.machine, 'nut_feeder_badge', '1')"
                                      style="font-size: 10px !important; font-weight: bold; border-radius: 5px; height: 32px;">
                                    NF
                                  </td>
                                  <td v-else style="width: 24px; min-width: 24px; max-width: 24px; padding: 0; height: 32px;"></td>
                                </template>

                                <!-- Column 1: Nut Chip (Always rendered) -->
                                <td style="padding: 0; vertical-align: middle;">
                                  <div class="nut-chip cursor-pointer"
                                       :class="{ 'highlighted-chip': isSpecHighlighted('nut', spec.nut_type, filteredLayout[`${rIndex}-${c-1}`]) }"
                                       @click="toggleSpecLock(filteredLayout[`${rIndex}-${c-1}`]!.machine, 'nut', spec.nut_type)"
                                       style="font-size: 11px; padding: 2px 4px; text-align: center; width: 100%; height: 26px; min-height: 26px; box-sizing: border-box;">
                                      {{ spec.nut_type_alias || spec.nut_type || spec.nut_part_number || '-' }}
                                  </div>
                                </td>

                                <!-- Column 2: HN Badge (Rendered only if machine has HN) -->
                                <template v-if="filteredLayout[`${rIndex}-${c-1}`]!.original_rows.some((r: any) => r.handy_navi === '1')">
                                  <template v-if="getBadgeCellStatus(filteredLayout[`${rIndex}-${c-1}`]!.original_rows, idx, 'handy_navi', 'handy_navi_integrated') === 'render'">
                                    <td :rowspan="getBadgeSpanInfo(filteredLayout[`${rIndex}-${c-1}`]!.original_rows, idx, 'handy_navi', 'handy_navi_integrated')"
                                        class="integ-badge hn cursor-pointer text-center"
                                        :class="{ 'highlighted-badge': isSpecHighlighted('handy', '1', filteredLayout[`${rIndex}-${c-1}`]) }"
                                        @click="toggleSpecLock(filteredLayout[`${rIndex}-${c-1}`]!.machine, 'handy', '1')"
                                        style="font-size: 10px !important; font-weight: bold; border-radius: 5px;">
                                      HN
                                    </td>
                                  </template>
                                  <template v-else-if="getBadgeCellStatus(filteredLayout[`${rIndex}-${c-1}`]!.original_rows, idx, 'handy_navi', 'handy_navi_integrated') === 'empty'">
                                    <td style="width: 24px; min-width: 24px; max-width: 24px; padding: 0;"></td>
                                  </template>
                                </template>

                                <!-- Column 3: RN Badge (Rendered only if machine has RN) -->
                                <template v-if="filteredLayout[`${rIndex}-${c-1}`]!.original_rows.some((r: any) => r.robo_navi === '1')">
                                  <template v-if="getBadgeCellStatus(filteredLayout[`${rIndex}-${c-1}`]!.original_rows, idx, 'robo_navi', 'robo_navi_integrated') === 'render'">
                                    <td :rowspan="getBadgeSpanInfo(filteredLayout[`${rIndex}-${c-1}`]!.original_rows, idx, 'robo_navi', 'robo_navi_integrated')"
                                        class="integ-badge rn cursor-pointer text-center"
                                        :class="{ 'highlighted-badge': isSpecHighlighted('robo', '1', filteredLayout[`${rIndex}-${c-1}`]) }"
                                        @click="toggleSpecLock(filteredLayout[`${rIndex}-${c-1}`]!.machine, 'robo', '1')"
                                        style="font-size: 10px !important; font-weight: bold; border-radius: 5px;">
                                      RN
                                    </td>
                                  </template>
                                  <template v-else-if="getBadgeCellStatus(filteredLayout[`${rIndex}-${c-1}`]!.original_rows, idx, 'robo_navi', 'robo_navi_integrated') === 'empty'">
                                    <td style="width: 24px; min-width: 24px; max-width: 24px; padding: 0;"></td>
                                  </template>
                                </template>

                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                  <!-- Minimal Specs (Default) -->
                  <div v-else class="machine-body d-flex flex-column" style="gap: 2px; padding: 4px;">
                    <template v-if="filteredLayout[`${rIndex}-${c-1}`]!.nut_types.length > 0">
                      <div v-for="(nut, idx) in filteredLayout[`${rIndex}-${c-1}`]!.nut_types" :key="idx" 
                           class="text-primary font-weight-bold" style="font-size: 11px;"
                           :style="idx > 0 ? 'border-top: 1px solid #ddd; padding-top: 2px;' : ''">
                        {{ nut }}
                      </div>
                    </template>
                    <div v-else class="text-primary font-weight-bold">-</div>
                    <div class="text-caption text-grey mt-1" style="line-height: 1; border-top: 2px solid #ccc; padding-top: 3px;">{{ filteredLayout[`${rIndex}-${c-1}`]!.kva || '-' }} kVA</div>
                    <div class="d-flex align-center justify-center mt-1" style="gap: 4px;" v-if="filteredLayout[`${rIndex}-${c-1}`]!.original_rows.some((m: any) => m.is_pallet === '1' || m.is_polybox === '1')">
                      <div v-if="filteredLayout[`${rIndex}-${c-1}`]!.original_rows.some((m: any) => m.is_pallet === '1')" title="Pallet" style="width: 12px; height: 12px; background-color: #f44336; border-radius: 2px;"></div>
                      <div v-if="filteredLayout[`${rIndex}-${c-1}`]!.original_rows.some((m: any) => m.is_polybox === '1')" title="Polybox" style="width: 12px; height: 12px; background-color: #4caf50; border-radius: 2px;"></div>
                    </div>
                  </div>
                </div>
                
                <div v-else class="empty-slot-text">Kosong</div>
              </div>
            </div>
            
            <!-- Conveyor Line Separator between rows -->
            <div v-if="idx < visibleRowIndices.length - 1" class="conveyor-belt-relative"></div>
          </template>
        </div>
      </div>
        
      <!-- Add Row Button (Edit Mode Only) -->
      <div class="d-flex justify-center mt-4" v-if="isEditMode">
        <v-btn color="secondary" variant="outlined" prepend-icon="mdi-plus" @click="addRow">
          Tambah Baris Area Baru
        </v-btn>
      </div>
        
      <!-- Unassigned Machines -->
      <div class="mt-6" v-if="isEditMode">
        <div class="text-subtitle-1 font-weight-bold mb-2">Unassigned Machines (Tarik ke atas)</div>
        <div class="unassigned-area" @dragover.prevent @drop="handleDrop($event, null, null)">
          <div class="machine-card unassigned" 
               v-for="m in filteredUnassignedMachines" :key="m.id"
               :draggable="isEditMode"
               @dragstart="dragStart($event, m, null, null)"
               :style="isEditMode ? 'cursor: grab' : 'cursor: default'">
            <div class="machine-header">{{ m.machine }} ({{ m.represented_ids?.length || 1 }})</div>
            <div class="machine-body text-caption">Line: {{ m.line || '-' }}</div>
          </div>
          <div v-if="filteredUnassignedMachines.length === 0" class="text-grey pa-4 w-100 text-center">
            Semua mesin sudah masuk ke layout
          </div>
        </div>
      </div>
    <!-- Modal List Part Mesin -->
    <v-dialog v-model="isPartsModalOpen" :max-width="selectedPartDetail ? '1600px' : '900px'" transition="dialog-bottom-transition">
      <v-card class="rounded-lg">
        <v-card-title class="bg-primary text-white d-flex justify-space-between align-center pa-4">
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-robot-industrial</v-icon>
            <span class="text-h6 font-weight-bold">Detail Part Mesin: {{ selectedMachineName }}</span>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" @click="isPartsModalOpen = false"></v-btn>
        </v-card-title>

        <v-card-text class="pa-4">
          <div v-if="loadingParts" class="d-flex justify-center align-center py-8">
            <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
            <span class="ml-3 text-body-1 font-weight-medium">Mengambil data part...</span>
          </div>

          <template v-else>
            <v-alert v-if="partsList.length === 0" type="info" variant="tonal" class="mb-0">
              Tidak ada data part aktif (`is_runout = 0`) yang terdaftar untuk mesin <strong>{{ selectedMachineName }}</strong>.
            </v-alert>

            <v-row v-else no-gutters>
              <!-- Tabel List Part -->
              <v-col :cols="12" :md="selectedPartDetail ? 4 : 12" class="pe-md-3">
                <v-table density="compact" class="border rounded-lg text-body-2">
                  <thead>
                    <tr style="background-color: #eef2f7;">
                      <th class="text-center font-weight-bold" style="width: 40px;">No</th>
                      <th class="text-center font-weight-bold">Job No</th>
                      <th class="text-center font-weight-bold">Part Number</th>
                      <th v-if="!selectedPartDetail" class="text-start font-weight-bold">Part Name</th>
                      <th v-if="!selectedPartDetail" class="text-center font-weight-bold">Model</th>
                      <th class="text-center font-weight-bold">UPH</th>
                      <th class="text-center font-weight-bold">Status</th>
                      <th class="text-center font-weight-bold" style="width: 60px;">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="(p, idx) in partsList" 
                      :key="p.id || idx"
                      :class="{'bg-blue-lighten-5 font-weight-bold': selectedPartDetail && (selectedPartDetail.id === p.id || selectedPartDetail.part_number === p.part_number)}"
                    >
                      <td class="text-center">{{ idx + 1 }}</td>
                      <td class="text-center font-weight-bold text-primary">{{ p.job_number || '-' }}</td>
                      <td class="text-center font-weight-bold">{{ p.part_number || '-' }}</td>
                      <td v-if="!selectedPartDetail" class="text-start">{{ p.part_name || '-' }}</td>
                      <td v-if="!selectedPartDetail" class="text-center">{{ p.model || '-' }}</td>
                      <td class="text-center font-weight-bold text-success">{{ p.uph || '-' }}</td>
                      <td class="text-center">
                        <v-chip size="x-small" :color="p.status_part === 'WIP' ? 'info' : 'success'" variant="tonal" class="font-weight-bold">
                          {{ p.status_part || '-' }}
                        </v-chip>
                      </td>
                      <td class="text-center">
                        <v-btn 
                          icon="mdi-chevron-right" 
                          size="x-small" 
                          :color="selectedPartDetail && (selectedPartDetail.id === p.id || selectedPartDetail.part_number === p.part_number) ? 'primary' : 'grey-darken-1'"
                          variant="tonal" 
                          @click="selectedPartDetail = p"
                          title="Lihat Detail Part"
                        ></v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-col>

              <!-- Panel Segment Detail (Full Complete Data) -->
              <v-col v-if="selectedPartDetail" cols="12" md="8" class="ps-md-3 border-start">
                <v-card variant="flat" class="rounded-lg pa-0 overflow-hidden" style="max-height: 640px; display: flex; flex-direction: column; background-color: #f8fafc; border: 1px solid #cbd5e1;">
                  <!-- Minimalist Header -->
                  <div class="pa-4 bg-white d-flex justify-space-between align-center" style="border-bottom: 1px solid #cbd5e1;">
                    <div>
                      <div class="d-flex align-center gap-2 mb-1">
                        <span class="text-h6 font-weight-bold text-primary">{{ selectedPartDetail.part_number }}</span>
                        <v-chip size="x-small" :color="selectedPartDetail.is_wip == 1 || selectedPartDetail.is_wip == '1' ? 'info' : 'success'" variant="flat" class="font-weight-bold ml-2">
                          {{ selectedPartDetail.is_wip == 1 || selectedPartDetail.is_wip == '1' ? 'WIP' : 'FP' }}
                        </v-chip>
                        <v-chip v-if="selectedPartDetail.is_runout == 1 || selectedPartDetail.is_runout == '1'" size="x-small" color="error" class="font-weight-bold ml-1">RUNOUT</v-chip>
                        <span class="text-caption text-grey-darken-1 ml-2">ID: {{ selectedPartDetail.id || '-' }}</span>
                      </div>
                      <div class="text-body-2 text-grey-darken-2 font-weight-medium">{{ selectedPartDetail.part_name || '-' }}</div>
                    </div>
                    <v-btn icon="mdi-close" size="small" variant="text" color="grey-darken-2" @click="selectedPartDetail = null" title="Tutup Detail"></v-btn>
                  </div>

                  <!-- Scrollable Detail Body -->
                  <div class="pa-4" style="overflow-y: auto; flex: 1;">
                    <v-row>
                      <!-- Kolom Kiri: Identitas & Jenis Part -->
                      <v-col cols="12" md="6">
                        <v-card variant="outlined" class="pa-3 mb-3 bg-white rounded-lg border-opacity-50 h-100">
                          <div class="text-caption font-weight-bold text-primary mb-3 d-flex align-center border-bottom pb-2">
                            <v-icon size="16" class="mr-1">mdi-card-text-outline</v-icon>
                            IDENTITAS & HIERARKI PART
                          </div>
                          <v-row density="compact">
                            <v-col cols="6"><v-text-field label="Part Number" :model-value="selectedPartDetail.part_number || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5 font-weight-bold" /></v-col>
                            <v-col cols="6"><v-text-field label="Part Number Delivery" :model-value="selectedPartDetail.part_number_delivery || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="6"><v-text-field label="Job Number" :model-value="selectedPartDetail.job_number || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5 font-weight-bold text-primary" /></v-col>
                            <v-col cols="6"><v-text-field label="Job Number Delivery" :model-value="selectedPartDetail.job_number_delivery || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="6"><v-text-field label="Alias (Nama Pendek)" :model-value="selectedPartDetail.alias || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="6"><v-text-field label="GPart" :model-value="selectedPartDetail.gpart || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="6"><v-text-field label="Part Number Mix" :model-value="selectedPartDetail.part_number_mix || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="6"><v-text-field label="Parent Part Mix" :model-value="selectedPartDetail.parent_part_mix || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            
                            <v-col cols="4"><v-text-field label="Layer" :model-value="selectedPartDetail.layer || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="4"><v-text-field label="Category" :model-value="selectedPartDetail.category || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="4"><v-text-field label="IFPD Type" :model-value="selectedPartDetail.ifpd_type || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="6"><v-text-field label="Mother Count" :model-value="selectedPartDetail.mother_count !== undefined ? selectedPartDetail.mother_count : '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="6"><v-text-field label="Next Process" :model-value="selectedPartDetail.next_process || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="12"><v-text-field label="OP (Proses)" :model-value="selectedPartDetail.op ? 'OP ' + selectedPartDetail.op : '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                          </v-row>
                        </v-card>
                      </v-col>

                      <!-- Kolom Kanan: Spesifikasi Produksi -->
                      <v-col cols="12" md="6">
                        <v-card variant="outlined" class="pa-3 mb-3 bg-white rounded-lg border-opacity-50 h-100">
                          <div class="text-caption font-weight-bold text-primary mb-3 d-flex align-center border-bottom pb-2">
                            <v-icon size="16" class="mr-1">mdi-cog-outline</v-icon>
                            MESIN & SPESIFIKASI PRODUKSI
                          </div>
                          <v-row density="compact">
                            <v-col cols="6"><v-text-field label="Mesin (Welding)" :model-value="selectedPartDetail.machine || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5 font-weight-bold" /></v-col>
                            <v-col cols="6"><v-text-field label="Line Press" :model-value="selectedPartDetail.line_press || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="4"><v-text-field label="Total Proses" :model-value="selectedPartDetail.total_proses || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="4"><v-text-field label="Jig" :model-value="selectedPartDetail.jig || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="4"><v-text-field label="Nut Type" :model-value="selectedPartDetail.nut_type_alias || selectedPartDetail.nut_type || selectedPartDetail.nut_part_number || getMachineNutTypesStr(selectedMachineName) || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5 font-weight-bold text-primary" /></v-col>
                            <v-col cols="4"><v-text-field label="UPH (unit/hr)" :model-value="selectedPartDetail.uph || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5 font-weight-bold text-success" /></v-col>
                            <v-col cols="4"><v-text-field label="Cycle Time (sec)" :model-value="selectedPartDetail.cycle_time_sec || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="4"><v-text-field label="Stroke / Mili Spot" :model-value="selectedPartDetail.stroke_mili_spot || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="4"><v-text-field label="QTY Kanban" :model-value="selectedPartDetail.qty_kbn || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="4"><v-text-field label="Lot Cycle" :model-value="selectedPartDetail.lot_cycle || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="4"><v-text-field label="QTY Unit (per FP)" :model-value="selectedPartDetail.qty_unit || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="4"><v-text-field label="Stock" :model-value="selectedPartDetail.stock !== undefined ? selectedPartDetail.stock : '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="4"><v-text-field label="Satuan (UOM)" :model-value="selectedPartDetail.uom || 'PCS'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="4"><v-text-field label="Scrap Ratio" :model-value="selectedPartDetail.scrap_ratio || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="12"><v-text-field label="Tipe Pallet (Kemasan)" :model-value="selectedPartDetail.pallet_type || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                          </v-row>
                        </v-card>
                      </v-col>

                      <!-- Baris Bawah: Model, Customer & Audit -->
                      <v-col cols="12">
                        <v-card variant="outlined" class="pa-3 bg-white rounded-lg border-opacity-50">
                          <div class="text-caption font-weight-bold text-primary mb-3 d-flex align-center border-bottom pb-2">
                            <v-icon size="16" class="mr-1">mdi-car-side</v-icon>
                            MODEL, CUSTOMER & INFORMASI TAMBAHAN
                          </div>
                          <v-row density="compact">
                            <v-col cols="3"><v-text-field label="Kode Model" :model-value="selectedPartDetail.model || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5 font-weight-bold" /></v-col>
                            <v-col cols="3"><v-text-field label="Nama Kendaraan" :model-value="selectedPartDetail.car_name || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="3"><v-text-field label="Customer 1" :model-value="selectedPartDetail.customer_1 || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="3"><v-text-field label="Vendor 1" :model-value="selectedPartDetail.vendor || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="3"><v-text-field label="Customer 2" :model-value="selectedPartDetail.customer_2 || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="3"><v-text-field label="Vendor 2" :model-value="selectedPartDetail.vendor_2 || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="3"><v-text-field label="Customer 3" :model-value="selectedPartDetail.customer_3 || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            <v-col cols="3"><v-text-field label="Vendor 3" :model-value="selectedPartDetail.vendor_3 || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5" /></v-col>
                            
                            <v-col cols="3"><v-text-field label="Area" :model-value="selectedPartDetail.area || '-'" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5 font-weight-bold mt-2" /></v-col>
                            <v-col cols="3"><v-text-field label="Status & Tgl Runout" :model-value="(selectedPartDetail.is_runout == 1 || selectedPartDetail.is_runout == '1' ? 'Runout' : 'Aktif') + (selectedPartDetail.runout_date ? ' (' + selectedPartDetail.runout_date + ')' : '')" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5 mt-2" /></v-col>
                            <v-col cols="3"><v-text-field label="Created By / At" :model-value="(selectedPartDetail.created_by || 'SYSTEM') + ' / ' + (selectedPartDetail.created_at || '-')" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5 text-caption mt-2" /></v-col>
                            <v-col cols="3"><v-text-field label="Updated By / At" :model-value="(selectedPartDetail.last_user_updated || '-') + ' / ' + (selectedPartDetail.updated_at || '-')" readonly variant="outlined" density="compact" hide-details class="bg-grey-lighten-5 text-caption mt-2" /></v-col>
                          </v-row>
                        </v-card>
                      </v-col>
                    </v-row>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </template>
        </v-card-text>

        <v-card-actions class="pa-4 bg-grey-lighten-4 justify-end">
          <v-btn color="primary" variant="flat" @click="isPartsModalOpen = false" width="100">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.layout-container {
  width: 100%;
  overflow-x: auto;
}

.grid-area {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  min-width: max-content;
}

.slot-container {
  width: 100px;
  height: 180px; /* Fixed height to prevent line borders from stretching */
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: stretch;
  justify-content: center;
  background-color: var(--dm-surface, #fff);
  transition: all 0.3s ease;
  padding: 10px 0;
}

.slot-container.expanded-slot {
  width: 195px;
  height: 340px;
}

.slot-container:hover {
  background-color: #f0f8ff;
}

.conveyor-belt-relative {
  width: 100%;
  height: 10px;
  background: linear-gradient(90deg, #ccc 50%, transparent 50%);
  background-size: 20px 10px;
  border-top: 1px solid #aaa;
  border-bottom: 1px solid #aaa;
  margin: 10px 0; /* Add space around the conveyor belt */
}

.machine-card {
  width: 80px;
  height: 100%; /* Constrain to slot size */
  max-height: 100%;
  background-color: var(--dm-surface, #ffffff);
  border: 2px solid #1565c0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  cursor: grab;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
  transition: all 0.3s ease;
  margin: auto;
}

.machine-card.expanded-card {
  width: 182px;
}

.machine-card:active {
  cursor: grabbing;
}

.machine-card.unassigned {
  background-color: var(--dm-bg, #f5f5f5);
  border-color: #9e9e9e;
  height: auto; /* Fixes huge drag ghost image by overriding height: 100% */
  min-height: 50px;
}

.machine-header {
  background-color: #1565c0;
  color: white;
  font-weight: bold;
  padding: 4px 8px;
  font-size: 12px;
  text-align: center;
}

.machine-card.unassigned .machine-header {
  background-color: #9e9e9e;
}

.machine-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
}

.machine-specs {
  flex: 1;
  display: flex;
  flex-direction: column; /* Stack top-to-bottom naturally */
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
  background-color: var(--dm-bg, #f5f5f5);
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

.nut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nut-chip {
  background-color: var(--dm-surface, #ffffff);
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

.integration-badges {
  display: flex;
  gap: 4px;
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

.highlighted-row {
  background-color: #fff59d !important;
  box-shadow: inset 2px 0 0 #fbc02d;
}

.highlighted-chip {
  background-color: #fbc02d !important;
  color: #212121 !important;
}

.highlighted-badge {
  background-color: #fbc02d !important;
  color: #212121 !important;
  border-color: #f57f17 !important;
}

.cursor-pointer {
  cursor: pointer !important;
}

.empty-slot-text {
  color: #ccc;
  font-size: 12px;
  user-select: none;
}

.unassigned-area {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 100px;
  padding: 10px;
  background-color: var(--dm-surface, #fff);
  border: 1px dashed #ccc;
  border-radius: 8px;
}

.line-badge {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid red;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  z-index: 20;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.vertical-bridge {
  position: absolute;
  bottom: -30px;
  left: -3px; /* To overlap the slot container's red borders */
  right: -3px;
  height: 30px;
  z-index: 1; /* Below the machine card but above the conveyor belt */
}
</style>
