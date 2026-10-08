<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SpecMachinePress } from '@/types/Stamping/Master/SpecMachine';

type MachineLayoutItem = SpecMachinePress & {
  pos_row?: number | null;
  pos_col?: number | null;
};

type LineLayout = {
  key: string;
  name: string;
  order: number;
  slots: Array<MachineLayoutItem | null>;
};

type LayoutPayload = {
  id: string | number;
  pos_row: number;
  pos_col: number;
};

type DragPayload = {
  lineKey: string;
  slotIndex: number;
};

const props = defineProps<{
  machines: SpecMachinePress[];
}>();

const emit = defineEmits<{
  (event: 'save-layout', payload: LayoutPayload[]): void;
  (event: 'edit-machine', id: number | string): void;
  (event: 'reassign-lines', changes: { id: number | string; line: string }[]): void;
}>();

/**
 * Jumlah kotak mesin minimum dalam satu baris line.
 * Sesuai contoh gambar: 4 mesin per baris.
 */
const slotsPerLine = 4;

const selectedArea = ref<string | null>(null);
const lineLayouts = ref<LineLayout[]>([]);

const isEditMode = ref(false);
const hasChanges = ref(false);

/**
 * Daftar area dari master mesin.
 */
const areaItems = computed(() => {
  const result = new Set<string>();

  props.machines.forEach(machine => {
    if (machine.area) {
      result.add(machine.area);
    }
  });

  return Array.from(result).sort((a, b) =>
    a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: 'base'
    })
  );
});

/**
 * Mengubah data flat dari API menjadi:
 *
 * Area
 *   └── Line A
 *         ├── Machine A1
 *         ├── Machine A2
 *         └── Machine A3
 */
const initializeLayout = () => {
  const filteredMachines = props.machines.filter(machine => {
    if (!selectedArea.value) return true;
    return machine.area === selectedArea.value;
  }) as MachineLayoutItem[];

  const grouped = new Map<string, MachineLayoutItem[]>();

  filteredMachines.forEach(machine => {
    const lineName = machine.line?.trim() || 'Tanpa Line';

    if (!grouped.has(lineName)) {
      grouped.set(lineName, []);
    }

    grouped.get(lineName)!.push({ ...machine });
  });

  const layouts: LineLayout[] = [];

  grouped.forEach((machines, lineName) => {
    const savedRows = machines
      .map(machine => Number(machine.pos_row))
      .filter(row => Number.isFinite(row));

    const lineOrder =
      savedRows.length > 0
        ? Math.min(...savedRows)
        : Number.MAX_SAFE_INTEGER;

    const maximumSavedColumn = machines.reduce((maximum, machine) => {
      const column = Number(machine.pos_col);

      if (!Number.isFinite(column)) {
        return maximum;
      }

      return Math.max(maximum, column);
    }, -1);

    const requiredSlots = Math.max(
      slotsPerLine,
      machines.length,
      maximumSavedColumn + 1
    );

    /**
     * Selalu kelipatan 4 supaya bentuk grid konsisten.
     */
    const totalSlots =
      Math.ceil(requiredSlots / slotsPerLine) * slotsPerLine;

    const slots: Array<MachineLayoutItem | null> =
      Array(totalSlots).fill(null);

    machines.forEach(machine => {
      const savedColumn = Number(machine.pos_col);

      let targetIndex =
        Number.isFinite(savedColumn) &&
        savedColumn >= 0 &&
        savedColumn < slots.length &&
        slots[savedColumn] === null
          ? savedColumn
          : slots.findIndex(slot => slot === null);

      /**
       * Apabila semua slot penuh, tambah satu baris baru.
       */
      if (targetIndex === -1) {
        slots.push(...Array(slotsPerLine).fill(null));
        targetIndex = slots.findIndex(slot => slot === null);
      }

      slots[targetIndex] = machine;
    });

    layouts.push({
      key: lineName,
      name: lineName,
      order: lineOrder,
      slots
    });
  });

  /**
   * Prioritaskan posisi yang sudah disimpan.
   * Jika belum memiliki posisi, urut berdasarkan nama line.
   */
  layouts.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    return a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  });

  lineLayouts.value = layouts;
  hasChanges.value = false;
};

/**
 * Mulai drag mesin.
 */
const handleDragStart = (
  event: DragEvent,
  lineKey: string,
  slotIndex: number
) => {
  if (!isEditMode.value || !event.dataTransfer) {
    event.preventDefault();
    return;
  }

  const payload: DragPayload = {
    lineKey,
    slotIndex
  };

  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData(
    'application/json',
    JSON.stringify(payload)
  );
};

/**
 * Memindahkan atau menukar posisi mesin — termasuk antar-line.
 *
 * Dalam satu line: swap posisi (pos_row/pos_col), disimpan lewat
 * emit('save-layout', ...).
 * Antar-line: field `line` mesin (dan mesin yang tertukar posisinya, jika
 * ada) diubah ke line tujuan, disimpan lewat emit('reassign-lines', ...)
 * saat Simpan Layout ditekan (lihat saveLayout()).
 */
const handleDrop = (
  event: DragEvent,
  targetLineKey: string,
  targetSlotIndex: number
) => {
  if (!isEditMode.value) return;

  event.preventDefault();

  const rawPayload =
    event.dataTransfer?.getData('application/json');

  if (!rawPayload) return;

  try {
    const source = JSON.parse(rawPayload) as DragPayload;

    if (
      source.lineKey === targetLineKey &&
      source.slotIndex === targetSlotIndex
    ) {
      return;
    }

    const sourceLine = lineLayouts.value.find(
      item => item.key === source.lineKey
    );
    const targetLine = lineLayouts.value.find(
      item => item.key === targetLineKey
    );

    if (!sourceLine || !targetLine) return;

    const sourceMachine = sourceLine.slots[source.slotIndex];
    const targetMachine = targetLine.slots[targetSlotIndex];

    if (!sourceMachine) return;

    if (sourceLine.key !== targetLine.key) {
      /**
       * Pindah antar-line: perbarui field `line` lokal supaya
       * saveLayout() tahu mesin mana yang perlu di-reassign.
       */
      sourceMachine.line = targetLine.name;
      if (targetMachine) {
        targetMachine.line = sourceLine.name;
      }
    }

    targetLine.slots[targetSlotIndex] = sourceMachine;
    sourceLine.slots[source.slotIndex] = targetMachine;

    hasChanges.value = true;
  } catch (error) {
    console.error('Gagal memproses drag layout:', error);
  }
};

/**
 * Menambahkan empat kotak kosong pada line tertentu.
 */
const addMachineSlots = (lineKey: string) => {
  const line = lineLayouts.value.find(
    item => item.key === lineKey
  );

  if (!line) return;

  line.slots.push(...Array(slotsPerLine).fill(null));
  hasChanges.value = true;
};

/**
 * Simpan posisi mesin.
 *
 * pos_row = urutan line
 * pos_col = posisi mesin di dalam line
 */
const saveLayout = () => {
  const payload: LayoutPayload[] = [];
  const lineChanges: { id: number | string; line: string }[] = [];

  lineLayouts.value.forEach((line, lineIndex) => {
    line.slots.forEach((machine, slotIndex) => {
      if (!machine) return;

      payload.push({
        id: machine.id,
        pos_row: lineIndex,
        pos_col: slotIndex
      });

      const original = props.machines.find(
        m => String(m.id) === String(machine.id)
      );
      if (original && (original.line || '') !== (machine.line || '')) {
        lineChanges.push({ id: machine.id, line: machine.line || '' });
      }
    });
  });

  emit('save-layout', payload);
  if (lineChanges.length > 0) {
    emit('reassign-lines', lineChanges);
  }

  hasChanges.value = false;
  isEditMode.value = false;
};

/**
 * Batalkan perubahan dan kembalikan dari props/API.
 */
const cancelEdit = () => {
  initializeLayout();
  isEditMode.value = false;
};

/**
 * Pilih area pertama setelah data API tersedia.
 */
watch(
  areaItems,
  areas => {
    if (
      areas.length > 0 &&
      (!selectedArea.value ||
        !areas.includes(selectedArea.value))
    ) {
      selectedArea.value = areas[0];
    }
  },
  { immediate: true }
);

/**
 * Bangun ulang layout ketika data atau filter berubah.
 */
watch(
  [() => props.machines, selectedArea],
  () => initializeLayout(),
  {
    deep: true,
    immediate: true
  }
);
</script>

<template>
  <v-card class="mb-6 rounded-lg elevation-2 terminal-card">
    <!-- Header -->
    <v-card-title
      class="d-flex justify-space-between align-center flex-wrap ga-3 pa-4 terminal-toolbar"
    >
      <div class="d-flex align-center">
        <v-icon color="#1565c0" class="mr-2">
          mdi-view-dashboard-outline
        </v-icon>

        <div>
          <div class="text-h6 font-weight-bold terminal-title-main">
            Machine Stamping Layout
          </div>

          <div class="text-caption terminal-subtitle">
            Tata letak line, mesin, dan dies stamping
          </div>
        </div>
      </div>

      <div class="d-flex align-center flex-wrap ga-2">
        <v-select
          v-model="selectedArea"
          :items="areaItems"
          label="Area"
          variant="outlined"
          density="compact"
          hide-details
          theme="dark"
          style="width: 190px"
        />

        <v-btn
          v-if="!isEditMode"
          color="warning"
          variant="outlined"
          prepend-icon="mdi-pencil"
          @click="isEditMode = true"
        >
          Ubah Layout
        </v-btn>

        <template v-else>
          <v-btn
            color="error"
            variant="outlined"
            prepend-icon="mdi-close"
            @click="cancelEdit"
          >
            Batal
          </v-btn>

          <v-btn
            color="primary"
            prepend-icon="mdi-content-save"
            :disabled="!hasChanges"
            @click="saveLayout"
          >
            Simpan Layout
          </v-btn>
        </template>
      </div>
    </v-card-title>

    <v-divider style="border-color: rgba(34, 211, 238, 0.25);" />

    <v-card-text class="pa-4 terminal-body">
      <v-alert
        v-if="isEditMode"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        Tarik mesin untuk mengubah urutan, atau lepas di Line lain
        untuk memindahkannya ke Line tersebut.
      </v-alert>

      <div v-if="lineLayouts.length" class="tree-board">
        <div class="area-title">
          AREA {{ (selectedArea || '-').toUpperCase() }}
        </div>

        <!-- Satu cabang pohon mewakili satu line -->
        <section
          v-for="(line, lineIndex) in lineLayouts"
          :key="line.key"
          class="tree-line"
          :class="{ 'is-last': lineIndex === lineLayouts.length - 1 }"
        >
          <div class="branch-row">
            <span class="branch-glyph">{{
              lineIndex === lineLayouts.length - 1 ? '└─' : '├─'
            }}</span>
            <span class="line-title">LINE {{ line.name }}</span>
            <span class="branch-rule"></span>
            <span class="line-count">{{
              line.slots.filter(machine => machine !== null).length
            }} Mesin</span>
          </div>

          <div class="machine-row">
            <div
              v-for="(machine, slotIndex) in line.slots"
              :key="`${line.key}-${slotIndex}`"
              class="machine-slot"
              :class="{
                'edit-slot': isEditMode,
                'empty-slot': !machine
              }"
              @dragover.prevent
              @drop="
                handleDrop(
                  $event,
                  line.key,
                  slotIndex
                )
              "
            >
              <article
                v-if="machine"
                class="machine-card corner-box"
                :class="{ draggable: isEditMode, 'machine-card-editable': !isEditMode }"
                :draggable="isEditMode"
                @dragstart="
                  handleDragStart(
                    $event,
                    line.key,
                    slotIndex
                  )
                "
                @click="!isEditMode && emit('edit-machine', machine.id)"
              >
                <span class="corner corner-tl"></span>
                <span class="corner corner-tr"></span>
                <span class="corner corner-bl"></span>
                <span class="corner corner-br"></span>
                <v-icon v-if="!isEditMode" size="13" class="edit-hint-icon">mdi-pencil</v-icon>

                <!-- Nama mesin: A1/B1/C1/D1 -->
                <div class="machine-header">
                  MACHINE {{ machine.machine }}
                </div>

                <div class="machine-content">
                  <div class="machine-specification">
                    <div class="specification-item">
                      <span class="specification-label">
                        Type
                      </span>

                      <span class="specification-value">
                        {{ machine.press_type || '-' }}
                      </span>
                    </div>

                    <div class="specification-item">
                      <span class="specification-label">
                        Tonnage
                      </span>

                      <span class="specification-value">
                        {{
                          machine.tonnage
                            ? `${machine.tonnage} Ton`
                            : '-'
                        }}
                      </span>
                    </div>
                  </div>

                  <!-- Kotak dies di dalam mesin -->
                  <div class="dies-box corner-box">
                    <span class="corner corner-tl"></span>
                    <span class="corner corner-tr"></span>
                    <span class="corner corner-bl"></span>
                    <span class="corner corner-br"></span>

                    <div class="dies-label">DIES</div>
                    <div class="dies-value">
                      {{ machine.die_size || 'Belum ada' }}
                    </div>
                  </div>
                </div>

                <div
                  v-if="isEditMode"
                  class="drag-indicator"
                >
                  <v-icon size="15" color="#1565c0">
                    mdi-drag
                  </v-icon>
                </div>
              </article>

              <div v-else class="empty-machine">
                <v-icon size="20" color="#cbd5e1">
                  mdi-plus
                </v-icon>
                <span>Slot Kosong</span>
              </div>
            </div>
          </div>

          <div
            v-if="isEditMode"
            class="line-action"
          >
            <v-btn
              size="small"
              variant="text"
              color="#1565c0"
              prepend-icon="mdi-plus"
              @click="addMachineSlots(line.key)"
            >
              Tambah 4 Slot
            </v-btn>
          </div>
        </section>
      </div>

      <div
        v-else
        class="empty-layout"
      >
        <v-icon size="48" color="#cbd5e1">
          mdi-factory
        </v-icon>

        <div class="text-subtitle-1 mt-2 terminal-subtitle">
          Tidak ada mesin pada area ini
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
/*
 * Tema terang: struktur pohon (AREA -> LINE -> MACHINE -> DIES) yang sama,
 * warna disesuaikan ke light theme standar Vuetify (putih/abu-abu/biru).
 */
.terminal-card {
  background-color: #ffffff !important;
  border: 1px solid #e2e8f0;
}

.terminal-toolbar {
  background-color: #f8fafc;
}

.terminal-title-main {
  color: #1e293b !important;
}

.terminal-subtitle,
.terminal-body {
  color: #64748b !important;
}

.tree-board {
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow-x: auto;
  padding: 8px 4px;
}

.area-title {
  margin-bottom: 18px;
  color: #1565c0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 1px;
}

/*
 * Satu cabang line: garis batang vertikal di sisi kiri + rak mesin.
 */
.tree-line {
  position: relative;
  min-width: 760px;
  padding-left: 26px;
  padding-bottom: 26px;
  border-left: 1px solid #cbd5e1;
  margin-left: 6px;
}

.tree-line.is-last {
  border-left-color: transparent;
}

.branch-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: -26px;
  margin-bottom: 14px;
}

.branch-glyph {
  color: #1565c0;
  font-weight: 700;
}

.line-title {
  color: #1565c0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 1px;
}

.branch-rule {
  flex: 1;
  height: 1px;
  min-width: 40px;
  background-color: #cbd5e1;
}

.line-count {
  padding: 2px 10px;
  color: #64748b;
  font-size: 10px;
  font-weight: 600;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
}

/*
 * Empat mesin dalam satu baris, seperti sketsa.
 */
.machine-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 16px;
}

.machine-slot {
  min-width: 150px;
  min-height: 150px;
  padding: 6px;
  border: 1px dashed transparent;
  border-radius: 4px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.machine-slot.edit-slot {
  border-color: #90caf9;
}

.machine-slot.edit-slot:hover {
  background-color: rgba(21, 101, 192, 0.06);
  border-color: #1565c0;
}

/*
 * Kotak sudut ala blueprint (dipakai machine-card & dies-box).
 */
.corner-box {
  position: relative;
  border: 1px dashed #90caf9;
}

.corner {
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: #1565c0;
  border-style: solid;
}

.corner-tl {
  top: -1px;
  left: -1px;
  border-width: 2px 0 0 2px;
}

.corner-tr {
  top: -1px;
  right: -1px;
  border-width: 2px 2px 0 0;
}

.corner-bl {
  bottom: -1px;
  left: -1px;
  border-width: 0 0 2px 2px;
}

.corner-br {
  bottom: -1px;
  right: -1px;
  border-width: 0 2px 2px 0;
}

/*
 * Kotak mesin.
 */
.machine-card {
  display: flex;
  flex-direction: column;
  min-height: 138px;
  background-color: #ffffff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  user-select: none;
}

.machine-card.draggable {
  cursor: grab;
}

.machine-card.draggable:active {
  cursor: grabbing;
}

.machine-card-editable {
  cursor: pointer;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.machine-card-editable:hover {
  box-shadow: 0 4px 10px rgba(21, 101, 192, 0.35);
  transform: translateY(-1px);
}

.edit-hint-icon {
  position: absolute;
  top: 3px;
  right: 3px;
  z-index: 3;
  color: #1565c0;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.machine-card-editable:hover .edit-hint-icon {
  opacity: 1;
}

.machine-header {
  padding: 8px 10px 4px;
  color: #1565c0;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
  letter-spacing: 0.5px;
}

.machine-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  padding: 4px 10px 10px;
}

.machine-specification {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.specification-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 10px;
}

.specification-label {
  color: #94a3b8;
}

.specification-value {
  color: #0f172a;
  font-weight: 700;
  text-align: right;
}

/*
 * Kotak dies di dalam mesin (nested corner-box).
 */
.dies-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: auto;
  padding: 6px 8px;
  border-radius: 4px;
  background-color: #f1f5f9;
}

.dies-label {
  color: #1565c0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1px;
}

.dies-value {
  color: #0f172a;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
}

.drag-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  color: #1565c0;
}

.empty-machine {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  min-height: 138px;
  color: #cbd5e1;
  font-size: 10px;
  border: 1px dashed #e2e8f0;
  border-radius: 4px;
}

.line-action {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.empty-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  color: #94a3b8;
}

@media (max-width: 900px) {
  .tree-line {
    min-width: 660px;
  }

  .machine-row {
    grid-template-columns: repeat(4, 145px);
  }
}
</style>