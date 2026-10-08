<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { SpecMachinePress } from '@/types/Stamping/Master/SpecMachine';

const props = defineProps<{
  machines: SpecMachinePress[];
}>();

const emit = defineEmits<{
  (e: 'edit-machine', id: number | string): void;
  (e: 'reassign-lines', changes: { id: number | string; line: string }[]): void;
}>();

const slotsPerLine = 4;
// Line yang mesinnya harus sejajar dalam satu baris tunggal (tidak boleh
// dipecah per 4 & dikasih conveyor separator), karena di lapangan memang
// berjejer lurus dalam satu row (area material/dies/pallet), bukan grid 4-4.
const noWrapLines = ['SP'];
const showDetails = ref(false);
const zoomLevel = ref(1.0);
const isEditMode = ref(false);
const hasChanges = ref(false);

// --- Salinan lokal yang bisa diedit (drag antar Line) tanpa mengubah props
// langsung. Disinkron ulang dari props setiap kali props berubah / keluar
// dari mode edit, supaya selalu merefleksikan data server terbaru.
const localMachines = ref<SpecMachinePress[]>([]);
const syncLocalMachines = () => {
  localMachines.value = props.machines.map(m => ({ ...m }));
};
watch(() => props.machines, syncLocalMachines, { immediate: true, deep: true });

const isEditableSource = computed(() => (isEditMode.value ? localMachines.value : props.machines));

const toggleEditMode = () => {
  syncLocalMachines();
  isEditMode.value = true;
  hasChanges.value = false;
};

const cancelEdit = () => {
  syncLocalMachines();
  isEditMode.value = false;
  hasChanges.value = false;
};

const saveLayoutChanges = () => {
  const changes = localMachines.value
    .filter(m => {
      const original = props.machines.find(o => String(o.id) === String(m.id));
      return original && (original.line || '') !== (m.line || '');
    })
    .map(m => ({ id: m.id, line: m.line || '' }));

  if (changes.length > 0) {
    emit('reassign-lines', changes);
  }
  isEditMode.value = false;
  hasChanges.value = false;
};

// --- Drag & drop antar Line ---
const dragMachineId = ref<number | string | null>(null);

const onDragStart = (machineId: number | string) => {
  if (!isEditMode.value) return;
  dragMachineId.value = machineId;
};

const onDropToZone = (targetLineName: string) => {
  if (!isEditMode.value || dragMachineId.value == null) return;
  const machine = localMachines.value.find(m => String(m.id) === String(dragMachineId.value));
  if (!machine) return;
  if ((machine.line || '') === targetLineName) return;

  machine.line = targetLineName;
  hasChanges.value = true;
  dragMachineId.value = null;
};

const printLayout = () => {
  const sourceNode = document.getElementById('printable-factory-press');
  if (!sourceNode) return;

  const clone = sourceNode.cloneNode(true) as HTMLElement;

  const hiddenElements = clone.querySelectorAll('.print-hide');
  hiddenElements.forEach((el: Element) => el.remove());

  const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
  let headHtml = '';
  styles.forEach(s => {
    headHtml += s.outerHTML;
  });

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Factory Layout Press</title>
        ${headHtml}
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .factory-blueprint {
            background-image: none !important;
            zoom: 0.65;
            width: max-content;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        ${(clone as HTMLElement).outerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 1000);
};

// --- Baris LINE sesuai denah lantai produksi: G+H bersebelahan, B+C
// bersebelahan, F+D bersebelahan (sisanya solo per baris). Line yang belum
// ada di daftar ini (line baru) jatuh ke baris solo di akhir, urut alfabet.
const rowsConfig = [
  ['G', 'H'],
  ['SP'],
  ['B', 'C'],
  ['A'],
  ['D', 'F'],
  ['E'],
];
const normalizeLineKey = (name: string) => name.trim().toUpperCase().replace(/^LINE\s+|\s+LINE$/g, '');

const buildZone = (name: string, machines: SpecMachinePress[]) => {
  const singleRow = noWrapLines.includes(normalizeLineKey(name));
  const perRow = singleRow ? Math.max(machines.length, 1) : slotsPerLine;
  const rowCount = Math.ceil(machines.length / perRow) || 1;
  const grid: (SpecMachinePress | null)[][] = [];
  for (let r = 0; r < rowCount; r++) {
    grid.push(machines.slice(r * perRow, r * perRow + perRow));
  }
  return { name, grid, singleRow };
};

const zoneRows = computed(() => {
  const grouped = new Map<string, SpecMachinePress[]>();

  isEditableSource.value.forEach(m => {
    const lineName = m.line?.trim() || 'Tanpa Line';
    if (!grouped.has(lineName)) grouped.set(lineName, []);
    grouped.get(lineName)!.push(m);
  });

  const remaining = new Map(grouped);
  const rows: { key: string; zones: ReturnType<typeof buildZone>[] }[] = [];

  rowsConfig.forEach(group => {
    const zonesInRow: ReturnType<typeof buildZone>[] = [];
    group.forEach(code => {
      const match = Array.from(remaining.keys()).find(name => normalizeLineKey(name) === code);
      if (match) {
        zonesInRow.push(buildZone(match, remaining.get(match)!));
        remaining.delete(match);
      }
    });
    if (zonesInRow.length > 0) {
      rows.push({ key: group.join('-'), zones: zonesInRow });
    }
  });

  // Line yang belum dipetakan di rowsConfig -> baris solo, urut alfabet
  Array.from(remaining.entries())
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }))
    .forEach(([name, machines]) => {
      rows.push({ key: name, zones: [buildZone(name, machines)] });
    });

  return rows;
});
</script>

<template>
  <v-card class="mb-6 elevation-3" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
    <v-card-title class="pa-4 bg-white border-bottom d-flex align-center justify-space-between print-hide">
      <div class="d-flex align-center">
        <v-icon color="primary" class="mr-2">mdi-domain</v-icon>
        <div>
          <div class="font-weight-bold text-h6 text-primary" style="font-family: 'Inter', sans-serif;">Stamping Factory Layout</div>
          <div class="text-caption text-grey">{{ isEditMode ? 'Tarik kartu mesin ke Line lain untuk memindahkan' : 'Klik kartu mesin untuk edit cepat' }}</div>
        </div>
      </div>
      <div class="d-flex align-center" style="gap: 12px;">
        <v-btn color="secondary" variant="outlined" prepend-icon="mdi-printer" @click="printLayout" size="small">Print</v-btn>
        <div style="width: 160px">
          <v-slider
            v-model="zoomLevel"
            min="0.5"
            max="1.5"
            step="0.1"
            prepend-icon="mdi-minus"
            append-icon="mdi-plus"
            hide-details
            density="compact"
            color="primary"
            thumb-label
          ></v-slider>
        </div>
        <v-switch
          v-model="showDetails"
          color="primary"
          label="Lihat Detail Mesin"
          hide-details
          density="compact"
          inset
          style="width: 170px"
        ></v-switch>

        <v-btn v-if="!isEditMode" color="warning" variant="outlined" prepend-icon="mdi-pencil" size="small" @click="toggleEditMode">
          Ubah Layout
        </v-btn>
        <template v-else>
          <v-btn color="error" variant="outlined" prepend-icon="mdi-close" size="small" @click="cancelEdit">
            Batal
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-content-save" size="small" :disabled="!hasChanges" @click="saveLayoutChanges">
            Simpan Layout
          </v-btn>
        </template>
      </div>
    </v-card-title>

    <div id="printable-factory-press" class="factory-blueprint pa-6" style="position: relative; overflow-x: auto; background-color: #f1f5f9;">

      <div v-if="zoneRows.length === 0" class="text-center pa-10 text-grey font-weight-medium print-hide">
        <v-icon size="40" class="mb-3" color="grey-lighten-1">mdi-map-marker-off</v-icon><br>
        Belum ada mesin press yang tersimpan.<br>
        Silakan tambah data mesin terlebih dahulu.
      </div>

      <div v-else class="d-flex" style="gap: 20px; align-items: stretch;" :style="`zoom: ${zoomLevel};`">

        <!-- Rel Daisha Kiri: Raw Material (sesuai denah asli, sejajar Raw Mat Line A) -->
        <div class="vertical-rail rail-material">
          <div class="rail-track"></div>
        </div>

        <!-- Center Factory Layout -->
        <div class="flex-grow-1 d-flex flex-column" style="gap: 20px; padding: 12px 0;">

          <div v-for="row in zoneRows" :key="row.key" class="d-flex" style="gap: 20px; align-items: stretch;">
            <div
              v-for="zone in row.zones"
              :key="zone.name"
              class="blueprint-zone flex-grow-1"
              :class="{ 'zone-compact': !showDetails, 'zone-drop-target': isEditMode }"
              style="flex-basis: 0;"
              @dragover.prevent
              @drop="onDropToZone(zone.name)"
            >
              <div class="zone-title">LINE {{ zone.name.toUpperCase() }}</div>
              <div class="zone-content-scrollable">
                <div class="layout-grid">
                  <div v-for="(gridRow, rIndex) in zone.grid" :key="`${zone.name}-row-${rIndex}`" class="layout-row-wrapper mb-2">
                    <div class="layout-row" :class="{ 'layout-row-expanded': showDetails, 'layout-row-nowrap': zone.singleRow }">
                      <div v-for="(machine, cIndex) in gridRow" :key="`${zone.name}-${rIndex}-${cIndex}`" class="slot-container" :class="{ 'slot-expanded': showDetails }">

                        <template v-if="machine">
                          <div
                            class="machine-card"
                            :class="{ 'expanded-card': showDetails, 'machine-card-editable': !isEditMode, 'machine-card-draggable': isEditMode }"
                            :draggable="isEditMode"
                            @dragstart="onDragStart(machine.id)"
                            @click="!isEditMode && emit('edit-machine', machine.id)"
                          >
                            <v-icon size="13" class="edit-hint-icon" v-if="!isEditMode">mdi-pencil</v-icon>
                            <v-icon size="13" class="edit-hint-icon drag-hint-icon" v-else>mdi-drag</v-icon>
                            <div class="machine-header d-flex flex-column justify-center align-center">
                              <div style="line-height: 1.2;">{{ machine.machine }}</div>
                            </div>
                            <div v-if="showDetails" class="machine-specs">
                              <div class="spec-list">
                                <div class="spec-row" v-if="machine.press_type">
                                  <span class="spec-label">Type</span>
                                  <span class="spec-value">{{ machine.press_type }}</span>
                                </div>
                                <div class="spec-row" v-if="machine.tonnage">
                                  <span class="spec-label">Tonnage</span>
                                  <span class="spec-value">{{ machine.tonnage }} Ton</span>
                                </div>
                                <div class="spec-row" v-if="machine.stroke">
                                  <span class="spec-label">Stroke</span>
                                  <span class="spec-value">{{ machine.stroke }}</span>
                                </div>
                                <div class="spec-row" v-if="machine.die_size">
                                  <span class="spec-label">Die Size</span>
                                  <span class="spec-value">{{ machine.die_size }}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </template>

                        <div v-else class="empty-slot-blueprint" :class="{ 'empty-expanded': showDetails }">
                          <div class="crosshair"></div>
                        </div>

                      </div>
                    </div>

                    <!-- Conveyor separator antar baris mesin -->
                    <div v-if="rIndex < zone.grid.length - 1" class="conveyor-belt-blueprint"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Rel Daisha Kanan: Transport Dies (terhubung ke Dojo Dies & Jig MTC) -->
        <div class="vertical-rail rail-dies">
          <div class="rail-track"></div>
        </div>

      </div>

      <!-- Compass: N menghadap kiri (jarum + label N sejajar di sisi kiri mawar
           angin, E di atas, S di kanan, W di bawah). Fixed di pojok kanan-atas
           card, di luar area yang di-scroll/di-zoom, supaya tidak pernah
           menimpa kotak LINE. -->
      <div v-if="zoneRows.length > 0" class="print-hide compass-widget">
        <v-icon size="44" style="transform: rotate(-90deg);">mdi-compass-outline</v-icon>
        <span class="compass-n-label">N</span>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.factory-blueprint {
  background-image:
    linear-gradient(#e2e8f0 1px, transparent 1px),
    linear-gradient(90deg, #e2e8f0 1px, transparent 1px);
  background-size: 20px 20px;
}

/* Rel Daisha Styling */
.vertical-rail {
  width: 60px;
  background-color: #e2e8f0;
  border-left: 2px dashed #94a3b8;
  border-right: 2px dashed #94a3b8;
  display: flex;
  justify-content: center;
  position: relative;
  min-height: 100%;
}
.rail-track {
  width: 20px;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    #64748b,
    #64748b 10px,
    transparent 10px,
    transparent 20px
  );
  border-left: 2px solid #334155;
  border-right: 2px solid #334155;
}
.vertical-rail::before {
  content: 'DAISHA RAIL';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-90deg);
  font-weight: bold;
  color: #334155;
  letter-spacing: 3px;
  font-size: 13px;
  white-space: nowrap;
  background: rgba(255,255,255,0.9);
  padding: 4px 12px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 5;
}

/* Kiri: transport dies (perbaikan / supply baru dll) */
.rail-dies {
  border-left-color: #c2410c;
  border-right-color: #c2410c;
  background-color: #fff1e6;
}
.rail-dies .rail-track {
  background: repeating-linear-gradient(0deg, #c2410c, #c2410c 10px, transparent 10px, transparent 20px);
  border-left-color: #7c2d12;
  border-right-color: #7c2d12;
}
.rail-dies::before {
  content: 'DAISHA RAIL - TRANSPORT DIES';
  color: #7c2d12;
}

/* Kanan: raw material */
.rail-material {
  border-left-color: #1d4ed8;
  border-right-color: #1d4ed8;
  background-color: #eaf1ff;
}
.rail-material .rail-track {
  background: repeating-linear-gradient(0deg, #1d4ed8, #1d4ed8 10px, transparent 10px, transparent 20px);
  border-left-color: #1e3a8a;
  border-right-color: #1e3a8a;
}
.rail-material::before {
  content: 'DAISHA RAIL - RAW MATERIAL';
  color: #1e3a8a;
}

/* Kompas: N di kiri (sejajar jarum), E di atas, S di kanan, W di bawah —
   dicapai dengan memutar ikon -90deg lalu menaruh label N di sisi kiri
   ikon (bukan di bawahnya), meniru referensi mawar angin standar. */
.compass-widget {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 44px;
  height: 44px;
  color: #64748b;
  pointer-events: none;
  z-index: 10;
}

.compass-n-label {
  position: absolute;
  left: -14px;
  top: 50%;
  transform: translateY(-50%);
  font-weight: bold;
  font-size: 12px;
}

.blueprint-zone {
  border: 3px dashed #94a3b8;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.6);
  position: relative;
  min-height: 140px;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

/* Saat "Lihat Detail Mesin" nonaktif, kartu jauh lebih pendek (45px) —
   hilangkan min-height & padding bawah supaya kotak Line tidak menyisakan
   ruang kosong besar di bawah baris mesin. */
.blueprint-zone.zone-compact {
  min-height: 0;
}

.zone-drop-target {
  border-color: #1565c0;
}

.zone-drop-target:hover {
  background-color: rgba(21, 101, 192, 0.06);
  border-color: #0d47a1;
}

.zone-title {
  position: absolute;
  top: -14px;
  left: 20px;
  background-color: #334155;
  color: white;
  padding: 4px 16px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 13px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 10;
  letter-spacing: 0.5px;
}

.zone-content-scrollable {
  padding: 30px 16px 16px 16px;
  overflow-x: auto;
}

.zone-compact .zone-content-scrollable {
  padding-bottom: 8px;
}

.layout-grid {
  display: flex;
  flex-direction: column;
}

.layout-row-wrapper {
  position: relative;
  padding: 0;
}

.layout-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 12px;
  position: relative;
  z-index: 2;
}

.layout-row-expanded {
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: 16px;
}

/* Line seperti SP: semua mesin harus sejajar/lurus dalam satu baris tunggal
   (sesuai denah lapangan asli), bukan grid 4-kolom yang bisa wrap. */
.layout-row-nowrap {
  display: flex;
  flex-wrap: nowrap;
}

.layout-row-nowrap .slot-container {
  flex: 0 0 120px;
}

.layout-row-nowrap.layout-row-expanded .slot-container {
  flex: 0 0 180px;
}

.slot-container {
  min-height: 40px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  position: relative;
  transition: all 0.3s ease;
}

.slot-container.slot-expanded {
  min-height: 160px;
}

.empty-slot-blueprint {
  width: 100%;
  height: 40px;
  border: 1px dashed rgba(148, 163, 184, 0.4);
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: height 0.3s ease;
}

.empty-slot-blueprint.empty-expanded {
  height: 160px;
}

.crosshair {
  width: 20px;
  height: 20px;
  position: relative;
}
.crosshair::before, .crosshair::after {
  content: '';
  position: absolute;
  background-color: rgba(148, 163, 184, 0.5);
}
.crosshair::before { width: 100%; height: 2px; top: 9px; left: 0; }
.crosshair::after { width: 2px; height: 100%; top: 0; left: 9px; }

/* Black and White Stripes Conveyor */
.conveyor-belt-blueprint {
  height: 12px;
  background: repeating-linear-gradient(
    45deg,
    #000000,
    #000000 10px,
    #ffffff 10px,
    #ffffff 20px
  );
  margin-top: 10px;
  border: 1px solid #000;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.machine-card {
  width: 100%;
  height: 100%;
  max-height: 45px;
  border: 2px solid #1565c0;
  border-radius: 6px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  transition: max-height 0.3s ease, width 0.3s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.machine-card-editable {
  cursor: pointer;
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
  color: rgba(255, 255, 255, 0.85);
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.machine-card-editable:hover .edit-hint-icon {
  opacity: 1;
}

.machine-card-draggable {
  cursor: grab;
  border-style: dashed;
}

.machine-card-draggable:active {
  cursor: grabbing;
}

.drag-hint-icon {
  opacity: 1;
}

.machine-card.expanded-card {
  max-height: 160px;
}

.machine-header {
  background-color: #1565c0;
  color: white;
  font-weight: bold;
  padding: 8px;
  font-size: 12px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.machine-card.expanded-card .machine-header {
  height: auto;
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
</style>
