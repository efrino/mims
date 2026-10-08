<script setup lang="ts">
import { ref, computed } from 'vue';
import type { SpecMachine } from '@/types/Welding/Master/SpecMachine';
import { useConfigStore } from '@/stores/config';
import axios from 'axios';

const props = defineProps<{
  machines: SpecMachine[];
}>();

const configStore = useConfigStore();
const slotsPerRow = 12;
const showDetails = ref(false);
const zoomLevel = ref(1.0);

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
  if (!machineName) return '';
  const tokens = machineName.split(' ').map(t => t.trim()).filter(Boolean);
  const match = props.machines?.find((m: any) => {
    const mTokens = (m.machine || '').split(' ').map((t: any) => t.trim()).filter(Boolean);
    return tokens.some(t => mTokens.includes(t));
  });
  if (match) {
    return match.nut_type_alias || match.nut_type || match.nut_part_number || '';
  }
  return '';
};

const printLayout = () => {
  const sourceNode = document.getElementById('printable-factory');
  if (!sourceNode) return;
  
  const clone = sourceNode.cloneNode(true) as HTMLElement;

  
  // Hapus elemen yang tidak perlu dicetak
  const hiddenElements = clone.querySelectorAll('.print-hide');
  hiddenElements.forEach((el: Element) => el.remove());
  
  // Ambil semua style dari halaman utama
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
        <title>Print Factory Layout</title>
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
  
  // Beri waktu agar CSS eksternal termuat di iframe
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 1000);
};

// --- Data Grouping ---
// Exactly as done in MachineLayout.vue to ensure cards render properly
const groupedMachines = computed(() => {
  const map = new Map<string, any[]>();
  
  // Hanya ambil mesin yang punya posisi agar grid bisa dibangun
  const savedMachines = props.machines.filter(m => m.pos_row !== null && m.pos_col !== null);
  
  savedMachines.forEach(m => {
    const key = `${m.machine}_${m.line || ''}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  });

  const arr: any[] = [];
  map.forEach((group) => {
    const rep = JSON.parse(JSON.stringify(group[0]));
    rep.original_rows = group;
    rep.nut_types = [...new Set(group.map(m => m.nut_type_alias || m.nut_type || m.nut_part_number || ''))].filter(Boolean);
    arr.push(rep);
  });
  return arr;
});

// Helper string matching
const matchText = (m: any, text: string) => {
  const str = `${m.line || ''} ${m.area || ''} ${m.machine || ''}`.toLowerCase();
  return str.includes(text.toLowerCase());
};

// --- Zone Grid Generator ---
// Membuat layout grid 12-kolom khusus untuk koleksi mesin tertentu
const getZoneGrid = (zoneMachines: any[]) => {
  const visibleRows = [...new Set(zoneMachines.map(m => m.pos_row))].sort((a, b) => a - b);
  const grid: { [key: string]: any | null } = {};
  
  zoneMachines.forEach(m => {
    grid[`${m.pos_row}-${m.pos_col}`] = m;
  });

  return { visibleRows, grid };
};

// --- Computed Zones ---
const zonesLayout = computed(() => {
  const isQc = (m: any) => matchText(m, 'qc');
  const allQc = groupedMachines.value.filter(m => isQc(m));
  
  const qcHyundai = allQc.filter(m => matchText(m, 'hyundai'));
  const qcCo = allQc.filter(m => matchText(m, 'co'));
  const qcMkm = allQc.filter(m => matchText(m, 'mkm'));
  const qcSpotAdm = allQc.filter(m => matchText(m, 'spot adm') || matchText(m, 'spot_adm'));
  const qcOther = allQc.filter(m => !matchText(m, 'hyundai') && !matchText(m, 'co') && !matchText(m, 'mkm') && !matchText(m, 'spot adm') && !matchText(m, 'spot_adm'));

  const spotAdmAll = groupedMachines.value.filter(m => (matchText(m, 'spot adm') || matchText(m, 'spot_adm')) && !isQc(m));
  const hyundai = groupedMachines.value.filter(m => matchText(m, 'hyundai') && !isQc(m));
  const coManual = groupedMachines.value.filter(m => (matchText(m, 'co') || matchText(m, 'manual')) && !isQc(m));
  const wssMkm = groupedMachines.value.filter(m => (matchText(m, 'wss mkm') || matchText(m, 'wss_mkm')) && !isQc(m));
  const wssAdm = groupedMachines.value.filter(m => (matchText(m, 'wss adm') || matchText(m, 'wss_adm')) && !isQc(m));
  
  // Pisahkan Spot ADM menjadi Atas dan Bawah berdasarkan median pos_row
  const spotAdmRows = spotAdmAll.map(m => m.pos_row).sort((a,b) => a-b);
  const medianRow = spotAdmRows.length > 0 ? spotAdmRows[Math.floor(spotAdmRows.length / 2)] : 5;
  const spotAdmTop = spotAdmAll.filter(m => m.pos_row < medianRow);
  const spotAdmMiddle = spotAdmAll.filter(m => m.pos_row >= medianRow);

  const unassigned = groupedMachines.value.filter(m => 
    !isQc(m) &&
    !matchText(m, 'hyundai') && !matchText(m, 'co') && !matchText(m, 'manual') &&
    !matchText(m, 'spot adm') && !matchText(m, 'spot_adm') &&
    !matchText(m, 'wss mkm') && !matchText(m, 'wss_mkm') &&
    !matchText(m, 'wss adm') && !matchText(m, 'wss_adm')
  );

  return {
    factoryRows: [
      {
        id: 'r1',
        isStreet: false,
        zones: [
          { id: 'qc-spot-top', title: 'QC GATE', widthStyle: 'width: 10%;', data: getZoneGrid(qcSpotAdm) },
          { id: 'spot-adm-top', title: 'LINE ROBOT SPOT ADM (Area Atas)', widthStyle: 'width: 70%; margin-left: 20%;', data: getZoneGrid(spotAdmTop) }
        ]
      },
      {
        id: 'r2',
        isStreet: false,
        zones: [
          { id: 'qc-hyundai', title: 'QC GATE', widthStyle: 'width: 10%;', data: getZoneGrid(qcHyundai) },
          { id: 'hyundai', title: 'LINE ROBOT SPOT HYUNDAI', widthStyle: 'width: 90%;', data: getZoneGrid(hyundai) }
        ]
      },
      {
        id: 'r3',
        isStreet: false,
        zones: [
          { id: 'co-manual', title: 'LINE ROBOT CO DAN MANUAL', widthStyle: 'width: 100%;', data: getZoneGrid(coManual) }
        ]
      },
      {
        id: 'r-street',
        isStreet: true,
        title: 'JALAN / AREA TRANSFER PALLET',
        zones: []
      },
      {
        id: 'r4',
        isStreet: false,
        zones: [
          { id: 'qc-co', title: 'QC GATE', widthStyle: 'width: 10%;', data: getZoneGrid(qcCo) },
          { id: 'spot-adm-mid', title: 'LINE ROBOT SPOT ADM', widthStyle: 'width: 90%;', data: getZoneGrid(spotAdmMiddle) }
        ]
      },
      {
        id: 'r5',
        isStreet: false,
        zones: [
          { id: 'qc-wss', title: 'QC GATE', widthStyle: 'width: 10%;', data: getZoneGrid(qcMkm) },
          { id: 'wss-mkm', title: 'LINE WSS MKM', widthStyle: 'width: 40%;', data: getZoneGrid(wssMkm) },
          { id: 'wss-adm', title: 'LINE WSS ADM', widthStyle: 'width: 50%;', data: getZoneGrid(wssAdm) }
        ]
      }
    ],
    unassignedZone: {
      id: 'unassigned',
      title: 'MESIN LAINNYA',
      widthStyle: 'width: 100%; border-color: #ef4444;',
      titleStyle: 'background-color: #ef4444;',
      data: getZoneGrid([...unassigned, ...qcOther])
    }
  };
});

// --- Card Helper Methods ---
const getBadgeSpanInfo = (rows: any[], index: number, typeField: string, idField: string) => {
  const spans = getIntegrationSpans(rows, typeField, idField);
  const match = spans.find(s => s.startRow - 1 === index);
  return match ? match.span : 1;
};

const getBadgeCellStatus = (rows: any[], index: number, typeField: string, idField: string) => {
  const spans = getIntegrationSpans(rows, typeField, idField);
  const matchStart = spans.find(s => s.startRow - 1 === index);
  if (matchStart) return 'render';
  const isInsideSpan = spans.some(s => index >= (s.startRow - 1) && index < (s.startRow - 1 + s.span));
  if (isInsideSpan) return 'skip';
  return 'empty';
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
</script>

<template>
  <v-card class="mb-6 elevation-3" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
    <v-card-title class="pa-4 bg-white border-bottom d-flex align-center justify-space-between print-hide">
      <div class="d-flex align-center">
        <v-icon color="primary" class="mr-2">mdi-domain</v-icon>
        <span class="font-weight-bold text-h6 text-primary" style="font-family: 'Inter', sans-serif;">Welding Factory Layout</span>
      </div>
      <div class="d-flex align-center" style="gap: 20px;">
        <v-btn color="secondary" variant="outlined" prepend-icon="mdi-printer" @click="printLayout" size="small" class="mr-2">Print</v-btn>
        <div style="width: 180px">
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
        <div style="width: 200px">
          <v-switch
            v-model="showDetails"
            color="primary"
            label="Lihat Detail Mesin"
            hide-details
            density="compact"
            inset
          ></v-switch>
        </div>
      </div>
    </v-card-title>
    
    <div id="printable-factory" class="factory-blueprint pa-6" style="overflow-x: auto; background-color: #f1f5f9;">
      
      <div v-if="groupedMachines.length === 0" class="text-center pa-10 text-grey font-weight-medium print-hide">
        <v-icon size="40" class="mb-3" color="grey-lighten-1">mdi-map-marker-off</v-icon><br>
        Belum ada mesin yang disimpan ke dalam layout.<br>
        Silakan atur letak mesin di menu "Machine Layout" terlebih dahulu.
      </div>

      <div v-else class="d-flex" style="gap: 20px; align-items: stretch;" :style="`zoom: ${zoomLevel};`">
        
        <!-- Rel Daisha Kiri -->
        <div class="vertical-rail">
           <div class="rail-track"></div>
        </div>
        
        <!-- Center Factory Layout -->
        <div class="flex-grow-1 d-flex flex-column" style="gap: 20px; position: relative; padding: 20px 0;" :style="showDetails ? 'min-width: 2400px;' : 'min-width: auto;'">
          
          <!-- Compass -->
          <div style="position: absolute; top: -10px; right: 0; text-align: center; color: #64748b; pointer-events: none; z-index: 10;">
             <v-icon size="60">mdi-compass-outline</v-icon>
             <div class="font-weight-bold text-caption mt-n2">N</div>
          </div>

          <div v-for="row in zonesLayout.factoryRows" :key="row.id">
            <template v-if="row.isStreet">
               <div class="factory-street">
                  <span class="street-label">{{ row.title }}</span>
               </div>
            </template>
            <template v-else>
               <div class="d-flex" style="gap: 20px;">
                  <div v-for="zone in row.zones" :key="zone.id" class="blueprint-zone" :style="zone.widthStyle">
                     <div class="zone-title">{{ zone.title }}</div>
                     <div class="zone-content-scrollable">
                        <div class="layout-grid">
                           <div v-for="rIndex in zone.data.visibleRows" :key="`row-${rIndex}`" class="layout-row-wrapper mb-2">
                              
                              <div class="layout-row" :class="{'layout-row-expanded': showDetails}">
                                 <div v-for="c in slotsPerRow" :key="`slot-${rIndex}-${c-1}`" class="slot-container" :class="{'slot-expanded': showDetails}">
                                    
                                    <template v-if="zone.data.grid[`${rIndex}-${c-1}`]">
                                      <!-- MACHINE CARD HTML -->
                                      <div class="machine-card" :class="{'expanded-card': showDetails}">
                                         <div class="machine-header d-flex flex-column justify-center align-center" @click.stop="openPartsModal(zone.data.grid[`${rIndex}-${c-1}`].machine)" style="cursor: pointer;" title="Klik header untuk melihat detail part mesin">
                                           <div style="line-height: 1.2;">{{ zone.data.grid[`${rIndex}-${c-1}`].machine }}</div>
                                           <div class="d-flex align-center justify-center mt-1" style="gap: 3px;" v-if="!showDetails && zone.data.grid[`${rIndex}-${c-1}`].original_rows.some((m: any) => m.is_pallet === '1' || m.is_polybox === '1')">
                                             <div v-if="zone.data.grid[`${rIndex}-${c-1}`].original_rows.some((m: any) => m.is_pallet === '1')" style="width: 8px; height: 8px; background-color: #f44336; border-radius: 2px;" title="Pallet"></div>
                                             <div v-if="zone.data.grid[`${rIndex}-${c-1}`].original_rows.some((m: any) => m.is_polybox === '1')" style="width: 8px; height: 8px; background-color: #4caf50; border-radius: 2px;" title="Polybox"></div>
                                           </div>
                                         </div>
                                         <div v-if="showDetails" class="machine-specs">
                                           <div class="spec-list">
                                             <div class="spec-row" v-if="zone.data.grid[`${rIndex}-${c-1}`].kva"><span class="spec-label">KVA</span><span class="spec-value">{{ zone.data.grid[`${rIndex}-${c-1}`].kva }}</span></div>
                                             <div class="spec-row" v-if="zone.data.grid[`${rIndex}-${c-1}`].original_rows.some((r: any) => r.is_pallet === '1' || r.is_polybox === '1')">
                                               <span class="spec-label">Packaging</span>
                                               <div style="display: flex; gap: 4px; align-items: center;">
                                                 <div v-if="zone.data.grid[`${rIndex}-${c-1}`].original_rows.some((r: any) => r.is_pallet === '1')" style="width: 15px; height: 15px; background-color: #f44336; border-radius: 2px;" title="Pallet"></div>
                                                 <div v-if="zone.data.grid[`${rIndex}-${c-1}`].original_rows.some((r: any) => r.is_polybox === '1')" style="width: 15px; height: 15px; background-color: #4caf50; border-radius: 2px;" title="Polybox"></div>
                                               </div>
                                             </div>
                                             <div class="spec-row" v-if="zone.data.grid[`${rIndex}-${c-1}`].original_rows[0]?.upper_holder"><span class="spec-label">Up Holder</span><span class="spec-value">{{ zone.data.grid[`${rIndex}-${c-1}`].original_rows[0].upper_holder }}</span></div>
                                             <div class="spec-row" v-if="zone.data.grid[`${rIndex}-${c-1}`].original_rows[0]?.lower_holder"><span class="spec-label">Low Holder</span><span class="spec-value">{{ zone.data.grid[`${rIndex}-${c-1}`].original_rows[0].lower_holder }}</span></div>
                                             <div class="spec-row" v-if="zone.data.grid[`${rIndex}-${c-1}`].original_rows[0]?.rotary_holder === '1'"><span class="spec-label">Rotary</span><span class="spec-value">Yes</span></div>
                                             <div class="spec-row" v-if="zone.data.grid[`${rIndex}-${c-1}`].original_rows[0]?.gate_sensor === '1'"><span class="spec-label">Gate Sensor</span><span class="spec-value">Yes</span></div>
                                           </div>
                                           <v-divider class="my-1 border-opacity-50"></v-divider>
                                           <div class="nut-section">
                                             <div class="text-caption text-grey mb-1" style="font-size: 10px !important;">Nut Types & Integrasi</div>
                                             <table style="width: 100%; border-collapse: separate; border-spacing: 2px; margin-top: -4px;">
                                               <tbody>
                                                 <tr v-for="(spec, idx) in zone.data.grid[`${rIndex}-${c-1}`].original_rows" :key="spec.id" style="height: 32px;">
                                                   <template v-if="zone.data.grid[`${rIndex}-${c-1}`].original_rows.some((r: any) => r.nut_feeder === '1')">
                                                     <td v-if="spec.nut_feeder === '1'" class="integ-badge nf text-center" style="font-size: 10px !important; border-radius: 5px; height: 32px;">NF</td>
                                                     <td v-else style="width: 24px; min-width: 24px; max-width: 24px; padding: 0; height: 32px;"></td>
                                                   </template>
                                                   <td style="padding: 0; vertical-align: middle;">
                                                     <div class="nut-chip" style="font-size: 11px; padding: 2px 4px; text-align: center; width: 100%; height: 26px; min-height: 26px; box-sizing: border-box;">{{ spec.nut_type_alias || spec.nut_type || spec.nut_part_number || '-' }}</div>
                                                   </td>
                                                   <template v-if="zone.data.grid[`${rIndex}-${c-1}`].original_rows.some((r: any) => r.handy_navi === '1')">
                                                     <template v-if="getBadgeCellStatus(zone.data.grid[`${rIndex}-${c-1}`].original_rows, idx, 'handy_navi', 'handy_navi_integrated') === 'render'">
                                                       <td :rowspan="getBadgeSpanInfo(zone.data.grid[`${rIndex}-${c-1}`].original_rows, idx, 'handy_navi', 'handy_navi_integrated')" class="integ-badge hn text-center" style="font-size: 10px !important; border-radius: 5px;">HN</td>
                                                     </template>
                                                     <template v-else-if="getBadgeCellStatus(zone.data.grid[`${rIndex}-${c-1}`].original_rows, idx, 'handy_navi', 'handy_navi_integrated') === 'empty'">
                                                       <td style="width: 24px; min-width: 24px; max-width: 24px; padding: 0;"></td>
                                                     </template>
                                                   </template>
                                                   <template v-if="zone.data.grid[`${rIndex}-${c-1}`].original_rows.some((r: any) => r.robo_navi === '1')">
                                                     <template v-if="getBadgeCellStatus(zone.data.grid[`${rIndex}-${c-1}`].original_rows, idx, 'robo_navi', 'robo_navi_integrated') === 'render'">
                                                       <td :rowspan="getBadgeSpanInfo(zone.data.grid[`${rIndex}-${c-1}`].original_rows, idx, 'robo_navi', 'robo_navi_integrated')" class="integ-badge rn text-center" style="font-size: 10px !important; border-radius: 5px;">RN</td>
                                                     </template>
                                                     <template v-else-if="getBadgeCellStatus(zone.data.grid[`${rIndex}-${c-1}`].original_rows, idx, 'robo_navi', 'robo_navi_integrated') === 'empty'">
                                                       <td style="width: 24px; min-width: 24px; max-width: 24px; padding: 0;"></td>
                                                     </template>
                                                   </template>
                                                 </tr>
                                               </tbody>
                                             </table>
                                           </div>
                                         </div>
                                      </div>
                                    </template>
                                    
                                    <div v-else class="empty-slot-blueprint" :class="{'empty-expanded': showDetails}">
                                      <div class="crosshair"></div>
                                    </div>
                                    
                                 </div>
                              </div>
                              
                              <!-- Black and White Striped Conveyor Separator -->
                              <div class="conveyor-belt-blueprint"></div>
                              
                           </div>
                        </div>
                        <div v-if="zone.data.visibleRows.length === 0 && !zone.id.includes('qc')" class="text-center pa-4 text-grey">
                          Belum ada mesin
                        </div>
                     </div>
                  </div>
               </div>
            </template>
          </div>

          <!-- Unassigned Zone (Jika Ada) -->
          <div v-if="zonesLayout.unassignedZone.data.visibleRows.length > 0" class="blueprint-zone" :style="zonesLayout.unassignedZone.widthStyle">
            <div class="zone-title" :style="zonesLayout.unassignedZone.titleStyle">{{ zonesLayout.unassignedZone.title }}</div>
            <div class="zone-content-scrollable">
              <div class="layout-grid">
                <div v-for="rIndex in zonesLayout.unassignedZone.data.visibleRows" :key="`row-${rIndex}`" class="layout-row-wrapper mb-2">
                  <div class="layout-row" :class="{'layout-row-expanded': showDetails}">
                    <div v-for="c in slotsPerRow" :key="`slot-${rIndex}-${c-1}`" class="slot-container" :class="{'slot-expanded': showDetails}">
                      
                      <template v-if="zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`]">
                        <!-- MACHINE CARD HTML -->
                        <div class="machine-card" :class="{'expanded-card': showDetails}">
                           <div class="machine-header d-flex flex-column justify-center align-center" @click.stop="openPartsModal(zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].machine)" style="cursor: pointer;" title="Klik header untuk melihat detail part mesin">
                             <div style="line-height: 1.2;">{{ zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].machine }}</div>
                             <div class="d-flex align-center justify-center mt-1" style="gap: 3px;" v-if="!showDetails && zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows.some((m: any) => m.is_pallet === '1' || m.is_polybox === '1')">
                               <div v-if="zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows.some((m: any) => m.is_pallet === '1')" style="width: 8px; height: 8px; background-color: #f44336; border-radius: 2px;" title="Pallet"></div>
                               <div v-if="zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows.some((m: any) => m.is_polybox === '1')" style="width: 8px; height: 8px; background-color: #4caf50; border-radius: 2px;" title="Polybox"></div>
                             </div>
                           </div>
                           <div v-if="showDetails" class="machine-specs">
                             <div class="spec-list">
                               <div class="spec-row" v-if="zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].kva"><span class="spec-label">KVA</span><span class="spec-value">{{ zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].kva }}</span></div>
                               <div class="spec-row" v-if="zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows.some((r: any) => r.is_pallet === '1' || r.is_polybox === '1')">
                                 <span class="spec-label">Packaging</span>
                                 <div style="display: flex; gap: 4px; align-items: center;">
                                   <div v-if="zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows.some((r: any) => r.is_pallet === '1')" style="width: 15px; height: 15px; background-color: #f44336; border-radius: 2px;" title="Pallet"></div>
                                   <div v-if="zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows.some((r: any) => r.is_polybox === '1')" style="width: 15px; height: 15px; background-color: #4caf50; border-radius: 2px;" title="Polybox"></div>
                                 </div>
                               </div>
                               <div class="spec-row" v-if="zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows[0]?.upper_holder"><span class="spec-label">Up Holder</span><span class="spec-value">{{ zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows[0].upper_holder }}</span></div>
                               <div class="spec-row" v-if="zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows[0]?.lower_holder"><span class="spec-label">Low Holder</span><span class="spec-value">{{ zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows[0].lower_holder }}</span></div>
                               <div class="spec-row" v-if="zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows[0]?.rotary_holder === '1'"><span class="spec-label">Rotary</span><span class="spec-value">Yes</span></div>
                               <div class="spec-row" v-if="zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows[0]?.gate_sensor === '1'"><span class="spec-label">Gate Sensor</span><span class="spec-value">Yes</span></div>
                             </div>
                             <v-divider class="my-1 border-opacity-50"></v-divider>
                             <div class="nut-section">
                               <div class="text-caption text-grey mb-1" style="font-size: 10px !important;">Nut Types & Integrasi</div>
                               <table style="width: 100%; border-collapse: separate; border-spacing: 2px; margin-top: -4px;">
                                 <tbody>
                                   <tr v-for="(spec, idx) in zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows" :key="spec.id" style="height: 32px;">
                                     <template v-if="zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows.some((r: any) => r.nut_feeder === '1')">
                                       <td v-if="spec.nut_feeder === '1'" class="integ-badge nf text-center" style="font-size: 10px !important; border-radius: 5px; height: 32px;">NF</td>
                                       <td v-else style="width: 24px; min-width: 24px; max-width: 24px; padding: 0; height: 32px;"></td>
                                     </template>
                                     <td style="padding: 0; vertical-align: middle;">
                                       <div class="nut-chip" style="font-size: 11px; padding: 2px 4px; text-align: center; width: 100%; height: 26px; min-height: 26px; box-sizing: border-box;">{{ spec.nut_type_alias || spec.nut_type || spec.nut_part_number || '-' }}</div>
                                     </td>
                                     <template v-if="zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows.some((r: any) => r.handy_navi === '1')">
                                       <template v-if="getBadgeCellStatus(zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows, idx, 'handy_navi', 'handy_navi_integrated') === 'render'">
                                         <td :rowspan="getBadgeSpanInfo(zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows, idx, 'handy_navi', 'handy_navi_integrated')" class="integ-badge hn text-center" style="font-size: 10px !important; border-radius: 5px;">HN</td>
                                       </template>
                                       <template v-else-if="getBadgeCellStatus(zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows, idx, 'handy_navi', 'handy_navi_integrated') === 'empty'">
                                         <td style="width: 24px; min-width: 24px; max-width: 24px; padding: 0;"></td>
                                       </template>
                                     </template>
                                     <template v-if="zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows.some((r: any) => r.robo_navi === '1')">
                                       <template v-if="getBadgeCellStatus(zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows, idx, 'robo_navi', 'robo_navi_integrated') === 'render'">
                                         <td :rowspan="getBadgeSpanInfo(zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows, idx, 'robo_navi', 'robo_navi_integrated')" class="integ-badge rn text-center" style="font-size: 10px !important; border-radius: 5px;">RN</td>
                                       </template>
                                       <template v-else-if="getBadgeCellStatus(zonesLayout.unassignedZone.data.grid[`${rIndex}-${c-1}`].original_rows, idx, 'robo_navi', 'robo_navi_integrated') === 'empty'">
                                         <td style="width: 24px; min-width: 24px; max-width: 24px; padding: 0;"></td>
                                       </template>
                                     </template>
                                   </tr>
                                 </tbody>
                               </table>
                             </div>
                           </div>
                        </div>
                      </template>
                      
                      <div v-else class="empty-slot-blueprint" :class="{'empty-expanded': showDetails}">
                        <div class="crosshair"></div>
                      </div>
                      
                    </div>
                  </div>
                  <!-- Conveyor Line Separator between rows -->
                  <div class="conveyor-belt-blueprint"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Rel Daisha Kanan -->
        <div class="vertical-rail">
           <div class="rail-track"></div>
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
  letter-spacing: 4px;
  font-size: 14px;
  white-space: nowrap;
  background: rgba(255,255,255,0.9);
  padding: 4px 12px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 5;
}

/* Factory Street */
.factory-street {
  height: 80px;
  background-color: #cbd5e1;
  border-top: 3px dashed #64748b;
  border-bottom: 3px dashed #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px 0;
  position: relative;
  border-radius: 4px;
}
.factory-street::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 2px;
  background: repeating-linear-gradient(90deg, #fff 0, #fff 20px, transparent 20px, transparent 40px);
}
.street-label {
  background: #334155;
  color: white;
  padding: 6px 20px;
  border-radius: 20px;
  font-weight: bold;
  z-index: 2;
  font-size: 14px;
  letter-spacing: 1px;
}

.blueprint-zone {
  border: 3px dashed #94a3b8;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.6);
  position: relative;
  min-height: 140px;
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

/* Grid Layout Styles */
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
  grid-template-columns: repeat(12, minmax(40px, 1fr));
  gap: 4px;
  position: relative;
  z-index: 2;
}

.layout-row-expanded {
  grid-template-columns: repeat(12, minmax(180px, 1fr));
  gap: 12px;
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
  min-height: 250px;
}

/* Empty slots aesthetic for blueprint */
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
  height: 250px;
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

/* Machine Card Styles - MATCHING MachineLayout.vue */
.machine-card-wrapper {
  flex-shrink: 0;
}

.machine-card {
  width: 100%;
  height: 100%;
  max-height: 45px;
  border: 2px solid #1565c0; /* Blue border matching layout grid */
  border-radius: 6px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  transition: max-height 0.3s ease, width 0.3s ease;
}

.machine-card.expanded-card {
  max-height: 250px;
}

.machine-header {
  background-color: #1565c0; /* Blue header matching layout grid */
  color: white;
  font-weight: bold;
  padding: 8px;
  font-size: 12px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%; /* Fill header fully when collapsed */
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
  padding: 2px 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.integ-badge {
  font-size: 10px !important;
  font-weight: bold;
  padding: 0;
  border-radius: 4px;
  text-align: center;
  vertical-align: middle;
}

.rn { color: #0277bd; background-color: #e1f5fe; border: 1px solid #81d4fa; }
.hn { color: #6a1b9a; background-color: #f3e5f5; border: 1px solid #ce93d8; }
.nf { color: #00796b; background-color: #e0f2f1; border: 1px solid #b2dfdb; }

</style>
