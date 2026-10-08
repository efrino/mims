<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PressDies, DiesPairing } from '@/types/Stamping/Master/Dies';
import type { SpecMachinePress } from '@/types/Stamping/Master/SpecMachine';

const props = defineProps<{
  diesList: PressDies[];
  machines: SpecMachinePress[];
  pairings: DiesPairing[];
}>();

const emit = defineEmits<{
  (e: 'pair', diesId: number, machineId: number): void;
  (e: 'unpair', pairingId: number): void;
}>();

const searchDies = ref('');
const showOnlyUnpaired = ref(false);
const draggingDiesId = ref<number | null>(null);

// --- Helper parsing angka & ukuran dari field free-text ---
const parseNumber = (val: string | null | undefined): number | null => {
  if (!val) return null;
  const n = parseFloat(String(val).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const parseSize = (val: string | null | undefined): { l: number; w: number } | null => {
  if (!val) return null;
  const match = String(val).toLowerCase().match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { l: parseFloat(match[1]), w: parseFloat(match[2]) };
};

// Kompatibel = tonnage dies <= tonnage mesin, DAN ukuran dies muat di
// ukuran mesin (die_size mesin dianggap area kerja maksimal). Kalau data
// pembanding tidak ada/tidak kebaca, dianggap "tidak bisa dipastikan tidak
// cocok" -> tetap ditandai kompatibel supaya tidak salah blokir.
const isCompatible = (dies: PressDies, machine: SpecMachinePress): boolean => {
  const diesTon = parseNumber(dies.tonnage_required);
  const machTon = parseNumber(machine.tonnage);
  if (diesTon != null && machTon != null && diesTon > machTon) return false;

  const diesL = parseNumber(dies.dies_length);
  const diesW = parseNumber(dies.dies_width);
  const machSize = parseSize(machine.die_size);
  if (diesL != null && diesW != null && machSize) {
    const diesMax = Math.max(diesL, diesW);
    const diesMin = Math.min(diesL, diesW);
    const machMax = Math.max(machSize.l, machSize.w);
    const machMin = Math.min(machSize.l, machSize.w);
    if (diesMax > machMax || diesMin > machMin) return false;
  }

  return true;
};

const pairingsByMachine = computed(() => {
  const map = new Map<number, DiesPairing[]>();
  props.pairings.forEach(p => {
    if (!map.has(p.machine_id)) map.set(p.machine_id, []);
    map.get(p.machine_id)!.push(p);
  });
  return map;
});

const pairedDiesIds = computed(() => new Set(props.pairings.map(p => p.dies_id)));

const filteredDies = computed(() => {
  let result = props.diesList.filter(d => d.is_deleted === '0' || d.is_deleted === 0 || !d.is_deleted);

  if (showOnlyUnpaired.value) {
    result = result.filter(d => !pairedDiesIds.value.has(d.id));
  }

  if (searchDies.value.trim()) {
    const q = searchDies.value.trim().toLowerCase();
    result = result.filter(d =>
      d.dies_code.toLowerCase().includes(q) ||
      (d.dies_name || '').toLowerCase().includes(q) ||
      (d.part_number || '').toLowerCase().includes(q)
    );
  }

  return result;
});

const machinesByLine = computed(() => {
  const map = new Map<string, SpecMachinePress[]>();
  props.machines
    .filter(m => m.is_deleted === '0' || m.is_deleted === 0 || !m.is_deleted)
    .forEach(m => {
      const key = m.line?.trim() || 'Tanpa Line';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }))
    .map(([name, machines]) => ({ name, machines }));
});

const draggingDies = computed(() => props.diesList.find(d => d.id === draggingDiesId.value) || null);

const machineCardStatus = (machine: SpecMachinePress): 'idle' | 'compatible' | 'incompatible' => {
  if (!draggingDies.value) return 'idle';
  return isCompatible(draggingDies.value, machine) ? 'compatible' : 'incompatible';
};

const onDragStart = (dies: PressDies) => {
  draggingDiesId.value = dies.id;
};

const onDragEnd = () => {
  draggingDiesId.value = null;
};

const onDrop = (machine: SpecMachinePress) => {
  if (!draggingDies.value) return;

  if (!isCompatible(draggingDies.value, machine)) {
    draggingDiesId.value = null;
    return;
  }

  const already = props.pairings.some(p => p.dies_id === draggingDies.value!.id && p.machine_id === machine.id);
  if (!already) {
    emit('pair', draggingDies.value.id, machine.id);
  }
  draggingDiesId.value = null;
};
</script>

<template>
  <v-card class="mb-6 elevation-3" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
    <v-card-title class="pa-4 bg-white border-bottom d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon color="primary" class="mr-2">mdi-puzzle-outline</v-icon>
        <div>
          <div class="font-weight-bold text-h6 text-primary">Papan Pairing Dies &amp; Mesin</div>
          <div class="text-caption text-grey">Tarik kartu Dies ke kotak Mesin yang kompatibel (hijau) untuk memasangkan</div>
        </div>
      </div>
    </v-card-title>

    <v-row no-gutters>
      <!-- Panel kiri: daftar Dies (draggable) -->
      <v-col cols="12" md="3" class="pa-4 dies-panel">
        <v-text-field
          v-model="searchDies"
          placeholder="Cari kode / nama / part..."
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-magnify"
          clearable
          class="mb-3"
        />
        <v-switch
          v-model="showOnlyUnpaired"
          label="Hanya yang belum dipasang"
          color="primary"
          density="compact"
          hide-details
          inset
          class="mb-3"
        />

        <div class="dies-list">
          <div
            v-for="dies in filteredDies"
            :key="dies.id"
            class="dies-card"
            :class="{ 'dies-card-dragging': draggingDiesId === dies.id }"
            draggable="true"
            @dragstart="onDragStart(dies)"
            @dragend="onDragEnd"
          >
            <div class="dies-card-header">
              <v-icon size="14" class="mr-1">mdi-drag</v-icon>
              {{ dies.dies_code }}
            </div>
            <div class="dies-card-body">
              <div v-if="dies.dies_name" class="dies-card-row">{{ dies.dies_name }}</div>
              <div v-if="dies.part_number" class="dies-card-row text-grey">PN: {{ dies.part_number }}</div>
              <div class="dies-card-row d-flex justify-space-between">
                <span v-if="dies.tonnage_required">{{ dies.tonnage_required }} Ton</span>
                <span v-if="dies.dies_length && dies.dies_width">{{ dies.dies_length }}x{{ dies.dies_width }}</span>
              </div>
              <v-chip
                v-if="pairedDiesIds.has(dies.id)"
                size="x-small"
                color="success"
                variant="tonal"
                class="mt-1"
              >
                {{ pairings.filter(p => p.dies_id === dies.id).length }} mesin terpasang
              </v-chip>
            </div>
          </div>

          <div v-if="filteredDies.length === 0" class="text-center text-grey pa-6 text-caption">
            Tidak ada Dies yang cocok filter.
          </div>
        </div>
      </v-col>

      <!-- Panel kanan: mesin per Line (drop target) -->
      <v-col cols="12" md="9" class="pa-4" style="background-color: #f8fafc;">
        <div v-for="group in machinesByLine" :key="group.name" class="mb-5">
          <div class="line-group-title">LINE {{ group.name.toUpperCase() }}</div>
          <div class="machine-drop-grid">
            <div
              v-for="machine in group.machines"
              :key="machine.id"
              class="machine-drop-card"
              :class="{
                'machine-drop-compatible': machineCardStatus(machine) === 'compatible',
                'machine-drop-incompatible': machineCardStatus(machine) === 'incompatible'
              }"
              @dragover.prevent
              @drop="onDrop(machine)"
            >
              <div class="machine-drop-header">
                {{ machine.machine }}
                <span class="text-caption" style="opacity: 0.85;" v-if="machine.tonnage">({{ machine.tonnage }} Ton)</span>
              </div>
              <div class="machine-drop-body">
                <div
                  v-for="p in (pairingsByMachine.get(machine.id) || [])"
                  :key="p.id"
                  class="paired-dies-chip"
                >
                  <span>{{ p.dies_code }}</span>
                  <v-icon size="12" class="ml-1 remove-pair-icon" @click="emit('unpair', p.id)">mdi-close</v-icon>
                </div>
                <div v-if="!(pairingsByMachine.get(machine.id) || []).length" class="text-caption text-grey">
                  Belum ada Dies
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="machinesByLine.length === 0" class="text-center text-grey pa-10">
          Belum ada data mesin. Tambahkan mesin di Master Spec Machine terlebih dahulu.
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>

<style scoped>
.dies-panel {
  border-right: 1px solid #e2e8f0;
  background-color: #ffffff;
}

.dies-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 720px;
  overflow-y: auto;
}

.dies-card {
  border: 1.5px solid #90caf9;
  border-radius: 6px;
  background-color: #ffffff;
  cursor: grab;
  overflow: hidden;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.dies-card:hover {
  box-shadow: 0 3px 8px rgba(21, 101, 192, 0.25);
}

.dies-card:active {
  cursor: grabbing;
}

.dies-card-dragging {
  opacity: 0.5;
}

.dies-card-header {
  background-color: #1565c0;
  color: white;
  font-weight: bold;
  font-size: 12px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
}

.dies-card-body {
  padding: 6px 8px;
  font-size: 11px;
}

.dies-card-row {
  padding: 1px 0;
}

.line-group-title {
  font-weight: 800;
  font-size: 12px;
  letter-spacing: 0.5px;
  color: #334155;
  background-color: #e2e8f0;
  display: inline-block;
  padding: 3px 12px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.machine-drop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.machine-drop-card {
  border: 2px dashed #cbd5e1;
  border-radius: 6px;
  background-color: #ffffff;
  min-height: 70px;
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.1s ease;
}

.machine-drop-header {
  background-color: #334155;
  color: white;
  font-weight: bold;
  font-size: 11px;
  padding: 5px 8px;
  text-align: center;
}

.machine-drop-body {
  padding: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 30px;
}

.machine-drop-compatible {
  border-color: #22c55e;
  background-color: #f0fdf4;
  transform: scale(1.03);
}

.machine-drop-incompatible {
  border-color: #ef4444;
  background-color: #fef2f2;
  opacity: 0.6;
}

.paired-dies-chip {
  display: flex;
  align-items: center;
  background-color: #e0f2f1;
  color: #00695c;
  border: 1px solid #4db6ac;
  border-radius: 10px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 600;
}

.remove-pair-icon {
  cursor: pointer;
}

.remove-pair-icon:hover {
  color: #c62828;
}
</style>
