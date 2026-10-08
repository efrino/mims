<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useGlcSimulationStore } from '@/stores/PCD/Welding/Simulation';
import { useNotificationStore } from '@/stores/notification';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';
import { getPcsDayDetail, getSimulationPartById, getSimulationLineDetail } from '@/services/PCD/Welding/Simulation';
import { getPatanByLine, getPatanBySimulation } from '@/services/PCD/Welding/SimulationPatan';
import Highcharts from 'highcharts';
import html2canvas from 'html2canvas';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import { decryptId, encryptId } from '@/utils/cryptoId';
import { exportGlcSimulationPptx } from '@/utils/pptxExportGlc';
import { useConfigStore } from '@/stores/config';
import PartMovementHistoryModal from '@/components/welding/PartMovementHistoryModal.vue';

const configStore = useConfigStore();

const isMovementHistoryOpen = ref(false);
const isBalancingExplanationModalOpen = ref(false);
const diagnosticsSearch = ref('');

const openBalancingExplanationModal = async () => {
  const rawParamId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
  const idSim = decryptId(rawParamId) || selectedSimulation.value?.header?.id || store.currentSimulationId;
  if (idSim) {
    await store.fetchBalancingDiagnostics(idSim);
  }
  diagnosticsSearch.value = '';
  isBalancingExplanationModalOpen.value = true;
};

const filteredDiagnostics = computed(() => {
  let list = store.balancingDiagnostics || [];
  if (diagnosticsSearch.value && diagnosticsSearch.value.trim()) {
    const q = diagnosticsSearch.value.toLowerCase().trim();
    list = list.filter((d: any) =>
      d.machine?.toLowerCase().includes(q) ||
      d.line?.toLowerCase().includes(q) ||
      d.spec?.nut_desc?.toLowerCase().includes(q) ||
      d.why_not_moved?.toLowerCase().includes(q) ||
      d.why_not_received?.toLowerCase().includes(q) ||
      d.recommendation?.toLowerCase().includes(q)
    );
  }
  return list;
});

const diagnosticsStats = computed(() => {
  const list = store.balancingDiagnostics || [];
  return {
    total: list.length,
    overload: list.filter((d: any) => d.status === 'overload').length,
    underload: list.filter((d: any) => d.status === 'underload').length,
    normal: list.filter((d: any) => d.status === 'normal').length,
  };
});

const page = ref({ title: 'Detail Simulasi Sub Assy' });
const breadcrumbs = ref([
  { title: 'Welding', disabled: false, href: '#' },
  { title: 'Transaction', disabled: false, href: '#' },
  { title: 'GLC Sub Assy Simulation', disabled: false, href: '/Transaction/welding/subassy-simulation' },
  { title: 'Detail', disabled: true, href: '#' }
]);

const store = useGlcSimulationStore();
const notificationStore = useNotificationStore();
const router = useRouter();
const route = useRoute();
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

const { selectedSimulation, detailLoading, lineOptions, lineDetailData, lineDetailLoading } = storeToRefs(store);

const chartContainer = ref(null);
const chartLineContainer = ref(null);
const showPartDetail = ref(true);
const showLinePartDetail = ref(false);
const partLoading = ref(false);
const activeTab = ref('machine');
const tabSwitchLoading = ref(false);
const selectedLine = ref<string | null>(null);

const isStatusPatanDetailModalOpen = ref(false);
const statusPatanDetailItem = ref<any>(null);
const statusPatanDetailList = ref<any[]>([]);

const statusPatanDetailLoading = ref(false);

const openStatusPatanDetailModal = async (item: any) => {
  if (!item || !item.part_number) return;
  const rawParamId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
  const idSim = selectedSimulation.value?.header?.id || decryptId(rawParamId) || '';
  if (!idSim) return;

  statusPatanDetailItem.value = item;
  statusPatanDetailList.value = [];
  isStatusPatanDetailModalOpen.value = true;
  statusPatanDetailLoading.value = true;

  try {
    const res = await store.getStatusPatanDetail(idSim, item.part_number, item.process);
    if (res && Array.isArray(res)) {
      statusPatanDetailList.value = res;
    }
  } catch (err) {
    console.error("Error fetching status patan detail:", err);
  } finally {
    statusPatanDetailLoading.value = false;
  }
};

const isPcsDayDetailModalOpen = ref(false);
const pcsDayDetailLoading = ref(false);
const pcsDayDetailData = ref<any>(null);

const formatPartNumber = (pn: string) => {
  if (!pn) return '-';
  const clean = pn.replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length === 10) {
    return `${clean.substring(0, 5)}-${clean.substring(5, 10)}`;
  } else if (clean.length === 12) {
    return `${clean.substring(0, 5)}-${clean.substring(5, 10)}-${clean.substring(10, 12)}`;
  }
  return pn;
};

const openPcsDayDetailModal = async (item: any) => {
  if (!item || !item.part_number) return;
  pcsDayDetailLoading.value = true;
  const rawPeriode = selectedSimulation.value?.header?.periode;
  const spmon = item.pcs_day_spmon || (rawPeriode ? String(rawPeriode).replace('-', '').trim() : undefined);
  pcsDayDetailData.value = {
    part_number: item.part_number,
    part_name: item.part_name || '-',
    model: item.model || '-',
    total_pcs_day: 0,
    parents_detail: [],
    spmon: spmon
  };
  isPcsDayDetailModalOpen.value = true;
  const cleanRowParent = String(item.part_top_parent || item.parent_part_number || item.top_parent_part_number || item.part_number_delivery || '').trim().replace(/^P/i, '');
  const rowParentP14 = cleanRowParent.length >= 14 ? cleanRowParent.substring(0, 14) : cleanRowParent;

  try {
    const res: any = await getPcsDayDetail(item.part_number, spmon, cleanRowParent || undefined);
    if (res && res.status === 'success' && res.data) {
      const rawParents = res.data.parents_detail || [];
      let filteredParents = rawParents;

      if (cleanRowParent && rawParents.length > 0) {
        const matched = rawParents.filter((p: any) => {
          const pParent = String(p.parent_part_number || p.part_number_delivery || '').trim().replace(/^P/i, '');
          const pP14 = pParent.length >= 14 ? pParent.substring(0, 14) : pParent;
          return pParent === cleanRowParent || pP14 === rowParentP14;
        });
        if (matched.length > 0) {
          filteredParents = matched;
        }
      }

      const calculatedTotal = filteredParents.reduce((sum: number, p: any) => sum + (Number(p.pcs_day) || 0), 0);

      pcsDayDetailData.value = {
        ...res.data,
        total_pcs_day: calculatedTotal > 0 ? calculatedTotal : (item.pcs_day || item.pcs_day_monthly || res.data.total_pcs_day || 0),
        parents_detail: filteredParents,
        spmon: spmon,
        parent_filter: cleanRowParent || null
      };
    }
  } catch (err) {
    console.error('Error fetching Pcs/Day detail:', err);
  } finally {
    pcsDayDetailLoading.value = false;
  }
};

const isApprovalModalOpen = ref(false);
const approvalAction = ref<string | null>(null); // 'APPROVE' or 'REJECT'
const approvalNotes = ref('');

// Helper to get effective Weld Time (fallback to prod_time or TPT net if prod_time_final is 0/null)
const getWeldTime = (item: any) => {
  if (!item) return 0;
  const prodFinal = Number(item.prod_time_final);
  const prodTime = Number(item.prod_time);
  const prodAdjust = Number(item.prod_time_adjust || 0);
  
  if (!isNaN(prodFinal) && prodFinal > 0) {
    return Number(prodFinal.toFixed(1));
  }
  
  if (!isNaN(prodTime) && prodTime > 0) {
    const calculated = prodTime + prodAdjust;
    return Number(calculated.toFixed(1));
  }
  
  const tpt = Number(item.tpt || item.tpt_jam || 0);
  const dandori = Number(item.dandori || 0);
  const dt = Number(item.downtime || 0);
  const tc = Number(item.tip_change ?? item.tc ?? 0);
  const teiryo = Number(item.teiryo || 0);
  const wt = tpt - dandori - dt - tc - teiryo;
  return wt > 0 ? Number(wt.toFixed(1)) : 0;
};

// Export PNG / PDF / PPTX State
const exportLoading = ref(false);
const exportType = ref<'png' | 'pdf' | 'pptx' | null>(null);
const summaryExportArea = ref<HTMLElement | null>(null);
const summaryTableArea = ref<HTMLElement | null>(null);

const exportSummary = async (type: 'png' | 'pdf') => {
  if (!selectedSimulation.value) return;
  exportLoading.value = true;
  exportType.value = type;

  try {
    const simId = selectedSimulation.value?.header?.id || 'simulasi';
    const area = (selectedSimulation.value?.header?.area || 'WSS').replace(/\s+/g, '_');
    const periode = selectedSimulation.value?.header?.periode || '';
    const periodeText = formatPeriodeBulanTahun(periode);
    const filename = `GLC_Summary_Simulasi_${simId}_${area}_${periode}`;

    const rawExportEl = (summaryExportArea.value as any)?.$el || summaryExportArea.value;
    const rawChartEl = (chartContainer.value as any)?.$el || chartContainer.value;
    const rawTableEl = (summaryTableArea.value as any)?.$el || summaryTableArea.value || rawExportEl;

    if (!rawExportEl) {
      throw new Error('Elemen summary tidak ditemukan.');
    }

    if (type === 'png') {
      const canvas = await html2canvas(rawExportEl, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: rawExportEl.scrollWidth,
        windowHeight: rawExportEl.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notificationStore.showDialogSuccess('Berhasil', 'Grafik & Tabel Summary berhasil diexport ke format PNG.');
    } else if (type === 'pdf') {
      let chartImgData = '';
      let tableImgData = '';

      if (rawChartEl && rawTableEl && rawChartEl !== rawTableEl) {
        try {
          const chartCanvas = await html2canvas(rawChartEl, {
            scale: 2.5,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false
          });
          chartImgData = chartCanvas.toDataURL('image/png');

          const tableCanvas = await html2canvas(rawTableEl, {
            scale: 2.5,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false,
            windowWidth: rawTableEl.scrollWidth,
            windowHeight: rawTableEl.scrollHeight
          });
          tableImgData = tableCanvas.toDataURL('image/png');
        } catch (eSub) {
          console.warn('Fallback capture full container for PDF:', eSub);
        }
      }

      // Fallback capture full container jika sub-capture belum terisi
      if (!chartImgData || !tableImgData) {
        const fullCanvas = await html2canvas(rawExportEl, {
          scale: 2.5,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          windowWidth: rawExportEl.scrollWidth,
          windowHeight: rawExportEl.scrollHeight
        });
        tableImgData = fullCanvas.toDataURL('image/png');
      }

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${filename}</title>
              <style>
                @page {
                  size: A4 landscape;
                  margin: 4mm 5mm;
                }
                * {
                  box-sizing: border-box;
                  margin: 0;
                  padding: 0;
                }
                html, body {
                  width: 100%;
                  height: 100%;
                  max-height: 100vh;
                  overflow: hidden !important;
                  background-color: #ffffff;
                  font-family: Arial, sans-serif;
                }
                .page-container {
                  width: 100%;
                  height: 100%;
                  max-height: 100%;
                  display: flex;
                  flex-direction: column;
                  justify-content: flex-start;
                  align-items: center;
                  box-sizing: border-box;
                  page-break-inside: avoid !important;
                  page-break-after: avoid !important;
                  break-inside: avoid !important;
                  break-after: avoid !important;
                  overflow: hidden !important;
                }
                .header-info {
                  width: 100%;
                  height: 22px;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 1.5px solid #0345A1;
                  margin-bottom: 4px;
                  flex-shrink: 0;
                }
                .header-title {
                  font-size: 13px;
                  font-weight: bold;
                  color: #0345A1;
                }
                .header-meta {
                  font-size: 10px;
                  color: #475569;
                  font-weight: 500;
                }
                /* Grafik dibatasi maksimal ~42% tinggi halaman (strictly di bawah 50%) */
                .chart-section {
                  width: 100%;
                  height: calc(44vh - 20px);
                  max-height: calc(44vh - 20px);
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  margin-bottom: 4px;
                  flex-shrink: 0;
                }
                .chart-section img {
                  max-width: 100%;
                  max-height: 100%;
                  width: 100%;
                  height: 100%;
                  object-fit: contain;
                }
                /* Tabel memanfaatkan sisa ruang kertas (~54%) */
                .table-section {
                  width: 100%;
                  height: calc(54vh - 18px);
                  max-height: calc(54vh - 18px);
                  display: flex;
                  justify-content: center;
                  align-items: flex-start;
                  flex-shrink: 0;
                  overflow: hidden;
                }
                .table-section img {
                  max-width: 100%;
                  max-height: 100%;
                  width: 100%;
                  height: auto;
                  object-fit: contain;
                }
                @media print {
                  html, body {
                    width: 100% !important;
                    height: 100% !important;
                    max-height: 100% !important;
                    overflow: hidden !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                  .page-container {
                    width: 100% !important;
                    height: 100% !important;
                    max-height: 100% !important;
                    page-break-after: avoid !important;
                    page-break-inside: avoid !important;
                    break-after: avoid !important;
                    break-inside: avoid !important;
                    overflow: hidden !important;
                  }
                }
              </style>
            </head>
            <body>
              <div class="page-container">
                <div class="header-info">
                  <span class="header-title">GLC WELDING SIMULATION SUMMARY - ${area.toUpperCase()}</span>
                  <span class="header-meta">Periode: ${periodeText} | ID Simulasi: #${simId}</span>
                </div>
                <div class="chart-section">
                  <img src="${chartImgData}" alt="Grafik TPT Mesin" />
                </div>
                <div class="table-section">
                  <img src="${tableImgData}" alt="Tabel Summary Mesin" />
                </div>
              </div>
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                    window.close();
                  }, 400);
                };
              <\/script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  } catch (err) {
    console.error('Error exporting summary:', err);
    notificationStore.showDialogError('Error', 'Gagal mengekspor data summary.');
  } finally {
    exportLoading.value = false;
    exportType.value = null;
  }
};

const exportPPT = async () => {
  if (!selectedSimulation.value) return;
  exportLoading.value = true;
  exportType.value = 'pptx';

  try {
    const header = selectedSimulation.value.header;
    const summary = selectedSimulation.value.summary || [];
    const simId = header?.id || '';

    // Pastikan daftar line tersedia
    let lines = lineOptions.value;
    if (!lines || lines.length === 0) {
      await store.fetchLinesByArea(header.area || 'SA ADM');
      lines = lineOptions.value;
    }

    if (!lines || lines.length === 0) {
      lines = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'];
    }

    // Fetch part untuk seluruh line secara paralel
    const linePromises = lines.map(async (l: string) => {
      try {
        const res: any = await getSimulationLineDetail(simId, l);
        return res?.data?.parts || [];
      } catch {
        return [];
      }
    });

    const results = await Promise.all(linePromises);
    const partsFromLines = results.flat();

    const partMap = new Map<string, any>();
    partsFromLines.forEach((p: any) => {
      const key = `${p.part_number}_${p.process}_${p.machine || p.machine_use}`;
      partMap.set(key, p);
    });

    // Fallback/merge dengan data semua part simulasi agar tidak ada item yang terlewat
    try {
      const allRes: any = await getSimulationPartById(simId, 'ALL');
      const allLoads = allRes?.loads || allRes?.data?.loads || [];
      allLoads.forEach((l: any) => {
        const key = `${l.part_number}_${l.process}_${l.machine || l.machine_use}`;
        if (!partMap.has(key)) {
          partMap.set(key, {
            ...l,
            line: l.line || '-'
          });
        }
      });
    } catch (e) {
      console.warn('Could not fetch all simulation parts fallback:', e);
    }

    const finalPartsList = Array.from(partMap.values());

    await exportGlcSimulationPptx({
      simulationHeader: header,
      summaryList: summary,
      chartElement: chartContainer.value,
      partsList: finalPartsList,
      templateUrl: '/file/template_glc.pptx'
    });

    notificationStore.showDialogSuccess('Berhasil', 'File presentasi PowerPoint (.pptx) berhasil dibuat dan diunduh.');
  } catch (err: any) {
    console.error('Error exporting PPTX:', err);
    notificationStore.showDialogError('Error', err.message || 'Gagal mengekspor presentasi PowerPoint.');
  } finally {
    exportLoading.value = false;
    exportType.value = null;
  }
};

const exportExcel = () => {
  const simId = selectedSimulation.value?.header?.id;
  if (!simId) return;
  const url = `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/ExportExcel?id_simulation=${encryptId(simId)}`;
  window.open(url, '_blank');
};

const handleStatusChange = async (status: string) => {
  if (!selectedSimulation.value) return;
  const id = selectedSimulation.value.header.id;
  let msg = "Apakah Anda yakin ingin submit simulasi ini untuk approval?";
  if (status === 'LIVE') msg = "Apakah Anda yakin ingin mengaktifkan (LIVE) simulasi ini?";
  
  notificationStore.showConfirm(
    "Konfirmasi Status",
    msg,
    async () => {
      const success = await store.changeSimulationStatus(id, status);
      if (success) {
        await store.fetchSimulationDetail(id); // reload detail
      }
    }
  );
};

const openApprovalModal = (action: string) => {
  approvalAction.value = action;
  approvalNotes.value = '';
  isApprovalModalOpen.value = true;
};

const submitApproval = async () => {
  if (approvalAction.value === null || !selectedSimulation.value) return;
  const id = selectedSimulation.value.header.id;
  const success = await store.changeSimulationStatus(id, approvalAction.value, approvalNotes.value);
  if (success) {
    isApprovalModalOpen.value = false;
    await store.fetchSimulationDetail(id); // reload detail
  }
};

const loadPartDetail = async () => {
  const rawParamId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
  const id = decryptId(rawParamId) || (rawParamId && !isNaN(Number(rawParamId)) ? Number(rawParamId) : null) || selectedSimulation.value?.header?.id;
  if (!id) return;
  partLoading.value = true;
  await store.fetchSimulationPartById(id, 'DETAIL');
  partLoading.value = false;
  showPartDetail.value = true;
};

const loadLinePartDetail = async () => {
  if (!selectedLine.value || !selectedSimulation.value) return;
  const id = selectedSimulation.value.header.id;
  partLoading.value = true;
  await store.fetchSimulationLineDetail(id, selectedLine.value);
  partLoading.value = false;
  showLinePartDetail.value = true;
  await nextTick();
  await initChart();
};

const initChart = async () => {
  await nextTick();
  if (activeTab.value === 'machine') {
    let summaryData = selectedSimulation.value?.summary;
    if (!summaryData || summaryData.length === 0) {
      const rawParamId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
      const simId = selectedSimulation.value?.header?.id || decryptId(rawParamId) || (rawParamId && !isNaN(Number(rawParamId)) ? Number(rawParamId) : null);
      if (simId) {
        await store.fetchSimulationGraphicSummary(simId);
        summaryData = selectedSimulation.value?.summary;
      }
    }
    if (!chartContainer.value) {
      setTimeout(() => {
        if (chartContainer.value && selectedSimulation.value?.summary) {
          initChart();
        }
      }, 100);
      return;
    }
    if (chartContainer.value && summaryData && summaryData.length > 0) {
      const summarySorted = [...summaryData].sort((a: any, b: any) =>
        String(a.machine || '').localeCompare(String(b.machine || ''), undefined, { numeric: true, sensitivity: 'base' })
      );
      const categories = summarySorted.map((d: any) => d.machine);
      const dandori = summarySorted.map((d: any) => Number(d.dandori || 0));
      const downtime = summarySorted.map((d: any) => Number(d.downtime || 0));
      const tc = summarySorted.map((d: any) => Number(d.tip_change ?? d.tc ?? 0));
      const teiryo = summarySorted.map((d: any) => Number(d.teiryo || 0));
      const weldTime = summarySorted.map((d: any) => getWeldTime(d));
      const uphData = summarySorted.map((d: any) => Number(d.uph || (d.tpt > 0 && d.pcs_day > 0 ? (d.pcs_day / d.tpt) : 0)).toFixed(1)).map(Number);

      Highcharts.chart(chartContainer.value, {
        chart: { type: 'column', marginRight: 75 },
        title: { text: '' },
        credits: { enabled: false },
        xAxis: {
          categories,
          labels: {
            style: { fontSize: '11px', fontWeight: 'bold' }
          },
          tickWidth: 1,
          tickmarkPlacement: 'on'
        },
        yAxis: [
          { 
            min: 0,
            max: 24,
            tickInterval: 2,
            endOnTick: true,
            maxPadding: 0,
            title: { text: 'TPT / DAY (JAM)', style: { fontWeight: 'bold', color: '#000000' } },
            lineWidth: 1.5,
            lineColor: '#000000',
            tickWidth: 1,
            tickColor: '#000000',
            plotLines: [
              { value: 8, color: '#1a237e', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '8', style: { color: '#1a237e', fontWeight: 'bold' } } },
              { value: 11, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '11', style: { color: '#f44336', fontWeight: 'bold' } } },
              { value: 16, color: '#1a237e', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '16', style: { color: '#1a237e', fontWeight: 'bold' } } },
              { value: 19, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '19', style: { color: '#f44336', fontWeight: 'bold' } } },
              { value: 21, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '21', style: { color: '#f44336', fontWeight: 'bold' } } }
            ],
            stackLabels: {
              enabled: true,
              style: {
                fontWeight: 'bold',
                color: '#333333'
              },
              formatter: function(this: any) {
                return this.total ? this.total.toFixed(1) : '';
              }
            }
          },
          {
            title: { text: 'UPH (Pcs / Jam)', style: { fontWeight: 'bold', color: '#000000' } },
            labels: { format: '{value}', style: { color: '#000000', fontWeight: 'bold' } },
            opposite: true,
            showEmpty: true,
            lineWidth: 1.5,
            lineColor: '#000000',
            tickWidth: 1,
            tickColor: '#000000',
            gridLineWidth: 0
          }
        ],
        plotOptions: {
          column: {
            stacking: 'normal',
            groupPadding: 0.05,
            pointPadding: 0.02,
            borderWidth: 0
          }
        },
        series: [
          { name: 'DownTime', data: downtime, color: '#d50000', stack: 'tpt', yAxis: 0 },
          { name: 'T/C', data: tc, color: '#fbc02d', stack: 'tpt', yAxis: 0 },
          { name: 'Dandori', data: dandori, color: '#00a2ff', stack: 'tpt', yAxis: 0 },
          { name: 'Weld Time', data: weldTime, color: '#005db9', stack: 'tpt', yAxis: 0 },
          { name: 'Teiryo', data: teiryo, color: '#800080', stack: 'tpt', showInLegend: false, yAxis: 0 },
          {
            name: 'UPH',
            type: 'spline',
            yAxis: 1,
            data: uphData,
            lineWidth: 0,
            marker: { enabled: false },
            showInLegend: false,
            enableMouseTracking: false
          }
        ]
      } as any);
    }
  } else if (activeTab.value === 'line' && chartLineContainer.value && lineDetailData.value?.machines) {
    const machinesSorted = [...lineDetailData.value.machines].sort((a: any, b: any) =>
      String(a.machine || '').localeCompare(String(b.machine || ''), undefined, { numeric: true, sensitivity: 'base' })
    );
    const categories = machinesSorted.map((d: any) => d.machine);
    const dandori = machinesSorted.map((d: any) => Number(d.dandori || 0));
    const downtime = machinesSorted.map((d: any) => Number(d.downtime || 0));
    const tc = machinesSorted.map((d: any) => Number(d.tc || 0));
    const teiryo = machinesSorted.map((d: any) => Number(d.teiryo || 0));
    const weldTime = machinesSorted.map((d: any) => {
      const tptVal = Number(d.tpt || 0);
      const dandoriVal = Number(d.dandori || 0);
      const downtimeVal = Number(d.downtime || 0);
      const tcVal = Number(d.tc || 0);
      const teiryoVal = Number(d.teiryo || 0);
      const wt = tptVal - dandoriVal - downtimeVal - tcVal - teiryoVal;
      return wt < 0 ? 0 : wt;
    });
    const uphData = machinesSorted.map((d: any) => Number(d.uph || (d.tpt > 0 && d.pcs_day > 0 ? (d.pcs_day / d.tpt) : 0)).toFixed(1)).map(Number);

    Highcharts.chart(chartLineContainer.value, {
      chart: { type: 'column', marginRight: 75 },
      title: { text: `Summary TPT By Line (${selectedLine.value})` },
      credits: { enabled: false },
      xAxis: {
        categories,
        labels: {
          style: { fontSize: '11px', fontWeight: 'bold' }
        },
        tickWidth: 1,
        tickmarkPlacement: 'on'
      },
      yAxis: [
        { 
          min: 0,
          max: 24,
          tickInterval: 2,
          endOnTick: true,
          maxPadding: 0,
          title: { text: 'TPT / DAY (JAM)', style: { fontWeight: 'bold', color: '#000000' } },
          lineWidth: 1.5,
          lineColor: '#000000',
          tickWidth: 1,
          tickColor: '#000000',
          plotLines: [
            { value: 8, color: '#1a237e', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '8', style: { color: '#1a237e', fontWeight: 'bold' } } },
            { value: 11, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '11', style: { color: '#f44336', fontWeight: 'bold' } } },
            { value: 16, color: '#1a237e', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '16', style: { color: '#1a237e', fontWeight: 'bold' } } },
            { value: 19, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '19', style: { color: '#f44336', fontWeight: 'bold' } } },
            { value: 21, color: '#f44336', dashStyle: 'Dash', width: 2, zIndex: 5, label: { text: '21', style: { color: '#f44336', fontWeight: 'bold' } } }
          ],
          stackLabels: {
            enabled: true,
            style: {
              fontWeight: 'bold',
              color: '#333333'
            },
            formatter: function(this: any) {
              return this.total ? this.total.toFixed(1) : '';
            }
          }
        },
        {
          title: { text: 'UPH (Pcs / Jam)', style: { fontWeight: 'bold', color: '#000000' } },
          labels: { format: '{value}', style: { color: '#000000', fontWeight: 'bold' } },
          opposite: true,
          showEmpty: true,
          lineWidth: 1.5,
          lineColor: '#000000',
          tickWidth: 1,
          tickColor: '#000000',
          gridLineWidth: 0
        }
      ],
      plotOptions: {
        column: {
          stacking: 'normal',
          groupPadding: 0.05,
          pointPadding: 0.02,
          borderWidth: 0
        }
      },
      series: [
        { name: 'DownTime', data: downtime, color: '#d50000', stack: 'tpt', yAxis: 0 },
        { name: 'T/C', data: tc, color: '#fbc02d', stack: 'tpt', yAxis: 0 },
        { name: 'Dandori', data: dandori, color: '#00a2ff', stack: 'tpt', yAxis: 0 },
        { name: 'Weld Time', data: weldTime, color: '#005db9', stack: 'tpt', yAxis: 0 },
        { name: 'Teiryo', data: teiryo, color: '#800080', stack: 'tpt', showInLegend: false, yAxis: 0 },
        {
          name: 'UPH',
          type: 'spline',
          yAxis: 1,
          data: uphData,
          lineWidth: 0,
          marker: { enabled: false },
          showInLegend: false,
          enableMouseTracking: false
        }
      ]
    } as any);
  }
};

onMounted(async () => {
  const rawParamId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
  const id = decryptId(rawParamId) || (rawParamId && !isNaN(Number(rawParamId)) ? Number(rawParamId) : null);
  if (id) {
    await store.fetchSimulationDetail(id);
    showPartDetail.value = true;
    await nextTick();
    setTimeout(async () => {
      await initChart();
    }, 150);
  }
});

watch(
  () => selectedSimulation.value?.summary,
  async (newVal) => {
    if (newVal && newVal.length > 0) {
      await nextTick();
      setTimeout(() => {
        initChart();
      }, 100);
    }
  },
  { deep: true }
);

watch(detailLoading, async (val) => {
  if (!val && selectedSimulation.value) {
    await nextTick();
    setTimeout(() => {
      initChart();
    }, 150);
  }
});

watch(activeTab, async (val) => {
  tabSwitchLoading.value = true;
  showLinePartDetail.value = false;
  if (val === 'line' && selectedSimulation.value && lineOptions.value.length === 0) {
    const area = selectedSimulation.value.header?.area || 'SA ADM';
    await store.fetchLinesByArea(area);
    if (lineOptions.value.length > 0 && !selectedLine.value) {
      selectedLine.value = lineOptions.value[0];
      const id = selectedSimulation.value.header.id;
      await Promise.all([
        store.fetchSimulationLineDetail(id, selectedLine.value),
        fetchPatanLineData(selectedLine.value, area, id)
      ]);
    }
  } else if (val === 'line' && selectedSimulation.value && selectedLine.value) {
    const id = selectedSimulation.value.header.id;
    const area = selectedSimulation.value.header?.area || 'SA ADM';
    await Promise.all([
      store.fetchSimulationLineDetail(id, selectedLine.value),
      fetchPatanLineData(selectedLine.value, area, id)
    ]);
  }
  // Allow DOM to update and show loading spinner before rendering heavy charts/tables
  setTimeout(async () => { 
    tabSwitchLoading.value = false;
    await nextTick(); // Wait for Vue to render the DOM elements after loading ends
    await initChart(); 
  }, 150);
});

// ==========================================
// PATAN DATA FOR MACHINE TAB (OVERALL SIMULATION)
// ==========================================
const patanMachineLoading = ref(false);
const activePatanMachineTab = ref<'A' | 'B' | 'C' | 'D' | 'ALL'>('A');
const patanMachineSearchQuery = ref('');
const patanMachineData = ref<{
  line: string;
  area: string;
  id_simulation?: number;
  summary: {
    total_parts: number;
    patan_a_count: number;
    patan_b_count: number;
    patan_c_count: number;
    patan_d_count: number;
  };
  summary_patan?: Record<string, any>;
  groups: {
    A: any[];
    B: any[];
    C: any[];
    D: any[];
  };
  all_parts: any[];
}>({
  line: 'ALL',
  area: 'SA ADM',
  summary: {
    total_parts: 0,
    patan_a_count: 0,
    patan_b_count: 0,
    patan_c_count: 0,
    patan_d_count: 0
  },
  groups: {
    A: [],
    B: [],
    C: [],
    D: []
  },
  all_parts: []
});

const showPatanMachineDetail = ref(false);

const parseLoadsToPatan = (loads: any[]) => {
  let mainParts = loads.filter((p: any) => !p.status_patan || p.status_patan === 'MAIN' || p.status_patan === '');
  if (mainParts.length === 0 && loads.length > 0) {
    mainParts = loads;
  }
  const patanA: any[] = [];
  const patanB: any[] = [];
  const patanC: any[] = [];
  const patanD: any[] = [];

  mainParts.forEach((p: any) => {
    const pObj = {
      ...p,
      machine: p.machine_use || p.machine || '-',
      patan: p.patan || (Number(p.lot_cycle) <= 1 ? 'A B C D' : 'A C')
    };
    const patanStr = String(pObj.patan).toUpperCase();
    if (patanStr.includes('A')) patanA.push(pObj);
    if (patanStr.includes('B')) patanB.push(pObj);
    if (patanStr.includes('C')) patanC.push(pObj);
    if (patanStr.includes('D')) patanD.push(pObj);
  });

  return {
    line: 'ALL',
    area: selectedSimulation.value?.header?.area || 'SA ADM',
    summary: {
      total_parts: mainParts.length,
      patan_a_count: patanA.length,
      patan_b_count: patanB.length,
      patan_c_count: patanC.length,
      patan_d_count: patanD.length
    },
    groups: {
      A: patanA,
      B: patanB,
      C: patanC,
      D: patanD
    },
    all_parts: mainParts.map((p: any) => ({
      ...p,
      machine: p.machine_use || p.machine || '-',
      patan: p.patan || (Number(p.lot_cycle) <= 1 ? 'A B C D' : 'A C')
    }))
  };
};

const loadPatanMachineDetail = async () => {
  showPatanMachineDetail.value = true;
  await fetchPatanMachineData();
};

const fetchPatanMachineData = async (area?: string, id?: number | string) => {
  const rawParamId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
  const idSim = id || selectedSimulation.value?.header?.id || decryptId(rawParamId);
  if (!idSim) return;
  patanMachineLoading.value = true;
  try {
    // 1. Panggil endpoint backend BySimulation khusus untuk seluruh mesin
    const res: any = await getPatanBySimulation(undefined, idSim);
    if (res && res.data && res.data.status === 'success' && res.data.data && res.data.data.all_parts && res.data.data.all_parts.length > 0) {
      patanMachineData.value = res.data.data;
    } else if (res && res.status === 'success' && res.data && res.data.all_parts && res.data.all_parts.length > 0) {
      patanMachineData.value = res.data;
    } else {
      // Fallback: fetch simulation parts directly dengan MAIN
      await store.fetchSimulationPartById(idSim, 'MAIN');
      if (selectedSimulation.value?.loads && selectedSimulation.value.loads.length > 0) {
        patanMachineData.value = parseLoadsToPatan(selectedSimulation.value.loads);
      }
    }
  } catch (err) {
    console.error("Error fetching patan machine data:", err);
    if (selectedSimulation.value?.loads && selectedSimulation.value.loads.length > 0) {
      patanMachineData.value = parseLoadsToPatan(selectedSimulation.value.loads);
    }
  } finally {
    patanMachineLoading.value = false;
  }
};

// ==========================================
// PATAN DATA FOR LINE TAB
// ==========================================
const patanLineLoading = ref(false);
const activePatanTab = ref<'A' | 'B' | 'C' | 'D' | 'ALL'>('A');
const patanSearchQuery = ref('');
const patanLineData = ref<{
  line: string;
  area: string;
  id_simulation?: number;
  summary: {
    total_parts: number;
    patan_a_count: number;
    patan_b_count: number;
    patan_c_count: number;
    patan_d_count: number;
  };
  summary_patan?: Record<string, any>;
  groups: {
    A: any[];
    B: any[];
    C: any[];
    D: any[];
  };
  all_parts: any[];
}>({
  line: '',
  area: 'SA ADM',
  summary: {
    total_parts: 0,
    patan_a_count: 0,
    patan_b_count: 0,
    patan_c_count: 0,
    patan_d_count: 0
  },
  groups: {
    A: [],
    B: [],
    C: [],
    D: []
  },
  all_parts: []
});

const fetchPatanLineData = async (line: string, area?: string, id?: number | string) => {
  if (!line) return;
  patanLineLoading.value = true;
  try {
    const rawParamId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
    const idSim = id || selectedSimulation.value?.header?.id || decryptId(rawParamId) || undefined;
    const areaParam = area || selectedSimulation.value?.header?.area || 'SA ADM';
    const res: any = await getPatanByLine(line, areaParam, idSim || undefined);
    if (res && res.data && res.data.status === 'success' && res.data.data) {
      patanLineData.value = res.data.data;
    } else if (res && res.status === 'success' && res.data) {
      patanLineData.value = res.data;
    }
  } catch (err) {
    console.error("Error fetching patan line data:", err);
  } finally {
    patanLineLoading.value = false;
  }
};

const onLineSelect = async () => {
  if (!selectedLine.value || !selectedSimulation.value) return;
  showLinePartDetail.value = false;
  const id = selectedSimulation.value.header.id;
  const area = selectedSimulation.value.header.area || 'SA ADM';
  await Promise.all([
    store.fetchSimulationLineDetail(id, selectedLine.value),
    fetchPatanLineData(selectedLine.value, area, id)
  ]);
  initChart();
};

const getPatanHeadersForTab = (tab: 'A' | 'B' | 'C' | 'D' | 'ALL') => {
  const baseHeaders = [
    { title: 'Urutan', key: 'urutan', align: 'center' as const },
    { title: 'Part Number', key: 'part_number', align: 'start' as const },
    { title: 'Job Number', key: 'job_number', align: 'start' as const },
    { title: 'Part Name', key: 'part_name', align: 'start' as const },
    { title: 'Model', key: 'model', align: 'center' as const },
    { title: 'Mesin', key: 'machine', align: 'center' as const },
    { title: 'Proses', key: 'process', align: 'center' as const },
  ];

  const shift1Headers = [
    { title: 'Jam Start (Shift 1)', key: 'time_proc_start', align: 'center' as const },
    { title: 'Jam End (Shift 1)', key: 'time_proc_end', align: 'center' as const },
  ];

  const shift2Headers = [
    { title: 'Jam Start (Shift 2)', key: 'time_proc_start_shift2', align: 'center' as const },
    { title: 'Jam End (Shift 2)', key: 'time_proc_end_shift2', align: 'center' as const },
  ];

  const tailHeaders = [
    { title: 'Lot Cycle', key: 'lot_cycle', align: 'center' as const },
    { title: 'Patan', key: 'patan', align: 'center' as const },
    { title: 'Qty Kanban', key: 'qty_kanban', align: 'end' as const },
    { title: 'Qty Pallet', key: 'qty_pallet', align: 'end' as const },
    { title: 'Count Pallet', key: 'count_pallet', align: 'end' as const },
    { title: 'Pcs/Day', key: 'pcs_day', align: 'end' as const },
    { title: 'Lot Size Shift', key: 'lot_size_shift', align: 'end' as const },
    { title: 'C/T (sec)', key: 'cycle_time_sec', align: 'center' as const },
    { title: 'TPT (mnt)', key: 'tpt', align: 'end' as const },
    { title: 'Aksi / Detail', key: 'action', align: 'center' as const }
  ];

  let timeHeaders: any[] = [];
  if (tab === 'A' || tab === 'C') {
    timeHeaders = shift1Headers;
  } else if (tab === 'B' || tab === 'D') {
    timeHeaders = shift2Headers;
  } else {
    timeHeaders = [...shift1Headers, ...shift2Headers];
  }

  return [...baseHeaders, ...timeHeaders, ...tailHeaders];
};

const patanHeaders = [
  { title: 'Urutan', key: 'urutan', align: 'center' as const },
  { title: 'Part Number', key: 'part_number', align: 'start' as const },
  { title: 'Job Number', key: 'job_number', align: 'start' as const },
  { title: 'Part Name', key: 'part_name', align: 'start' as const },
  { title: 'Model', key: 'model', align: 'center' as const },
  { title: 'Mesin', key: 'machine', align: 'center' as const },
  { title: 'Proses', key: 'process', align: 'center' as const },
  { title: 'Jam Start (Shift 1)', key: 'time_proc_start', align: 'center' as const },
  { title: 'Jam End (Shift 1)', key: 'time_proc_end', align: 'center' as const },
  { title: 'Jam Start (Shift 2)', key: 'time_proc_start_shift2', align: 'center' as const },
  { title: 'Jam End (Shift 2)', key: 'time_proc_end_shift2', align: 'center' as const },
  { title: 'Lot Cycle', key: 'lot_cycle', align: 'center' as const },
  { title: 'Patan', key: 'patan', align: 'center' as const },
  { title: 'Qty Kanban', key: 'qty_kanban', align: 'end' as const },
  { title: 'Qty Pallet', key: 'qty_pallet', align: 'end' as const },
  { title: 'Count Pallet', key: 'count_pallet', align: 'end' as const },
  { title: 'Pcs/Day', key: 'pcs_day', align: 'end' as const },
  { title: 'Lot Size Shift', key: 'lot_size_shift', align: 'end' as const },
  { title: 'C/T (sec)', key: 'cycle_time_sec', align: 'center' as const },
  { title: 'TPT (mnt)', key: 'tpt', align: 'end' as const },
  { title: 'Aksi / Detail', key: 'action', align: 'center' as const }
];

const currentPatanMachineHeaders = computed(() => {
  return getPatanHeadersForTab(activePatanMachineTab.value);
});

const currentPatanLineHeaders = computed(() => {
  return getPatanHeadersForTab(activePatanTab.value);
});

const patanSortKey = ref<string | null>(null);
const patanSortDir = ref<'asc' | 'desc'>('asc');
const patanSearchQueries = ref<Record<string, string>>({});
const patanCheckedFilters = ref<Record<string, string[]>>({});

patanHeaders.forEach(h => {
  patanSearchQueries.value[h.key] = '';
  patanCheckedFilters.value[h.key] = [];
});

const getPatanExcelUniqueItems = (key: string) => {
  let rawList: any[] = [];
  if (activePatanTab.value === 'ALL') {
    rawList = patanLineData.value.all_parts || [];
  } else {
    rawList = patanLineData.value.groups[activePatanTab.value] || [];
  }
  const unique = new Set(rawList.map(item => String(item[key] ?? '-')));
  return Array.from(unique).sort();
};

const isAllPatanExcelItemsChecked = (key: string) => {
  const allItems = getPatanExcelUniqueItems(key);
  const checked = patanCheckedFilters.value[key] || [];
  return allItems.length > 0 && checked.length === allItems.length;
};

const togglePatanExcelSelectAll = (key: string) => {
  const allItems = getPatanExcelUniqueItems(key);
  if (isAllPatanExcelItemsChecked(key)) {
    patanCheckedFilters.value[key] = [];
  } else {
    patanCheckedFilters.value[key] = [...allItems];
  }
};

const isPatanExcelFilterActive = (key: string) => {
  return (patanCheckedFilters.value[key] && patanCheckedFilters.value[key].length > 0) || 
         (patanSearchQueries.value[key] && patanSearchQueries.value[key].length > 0);
};

const setPatanExcelSort = (key: string, dir: 'asc' | 'desc') => {
  if (patanSortKey.value === key && patanSortDir.value === dir) {
    patanSortKey.value = null;
  } else {
    patanSortKey.value = key;
    patanSortDir.value = dir;
  }
};

const clearSinglePatanExcelFilter = (key: string) => {
  patanCheckedFilters.value[key] = [];
  patanSearchQueries.value[key] = '';
  if (patanSortKey.value === key) patanSortKey.value = null;
};

const resetAllPatanExcelFilters = () => {
  patanSortKey.value = null;
  patanSortDir.value = 'asc';
  patanHeaders.forEach(h => {
    patanSearchQueries.value[h.key] = '';
    patanCheckedFilters.value[h.key] = [];
  });
};

const isAnyPatanExcelFilterActive = computed(() => {
  return patanHeaders.some(h => isPatanExcelFilterActive(h.key)) || patanSortKey.value !== null;
});

const currentPatanList = computed(() => {
  let list: any[] = [];
  if (activePatanTab.value === 'ALL') {
    list = patanLineData.value.all_parts || [];
  } else {
    list = patanLineData.value.groups[activePatanTab.value] || [];
  }

  if (patanSearchQuery.value) {
    const q = patanSearchQuery.value.toLowerCase().trim();
    list = list.filter((item: any) => 
      Object.values(item).some(val => 
        String(val || '').toLowerCase().includes(q)
      )
    );
  }

  patanHeaders.forEach(h => {
    const key = h.key;
    const checked = patanCheckedFilters.value[key] || [];
    const search = (patanSearchQueries.value[key] || '').toLowerCase().trim();

    if (checked.length > 0) {
      list = list.filter(item => checked.includes(String(item[key] ?? '-')));
    }

    if (search) {
      list = list.filter(item => String(item[key] ?? '').toLowerCase().includes(search));
    }
  });

  if (patanSortKey.value) {
    const key = patanSortKey.value;
    list.sort((a, b) => {
      let valA = a[key] ?? '';
      let valB = b[key] ?? '';
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return patanSortDir.value === 'asc' ? numA - numB : numB - numA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return patanSortDir.value === 'asc' ? -1 : 1;
      if (strA > strB) return patanSortDir.value === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return list;
});

// ==========================================
// PATAN MACHINE TABLE HELPERS & FILTERS
// ==========================================
const patanMachineSortKey = ref<string | null>(null);
const patanMachineSortDir = ref<'asc' | 'desc'>('asc');
const patanMachineSearchQueries = ref<Record<string, string>>({});
const patanMachineCheckedFilters = ref<Record<string, string[]>>({});

patanHeaders.forEach(h => {
  patanMachineSearchQueries.value[h.key] = '';
  patanMachineCheckedFilters.value[h.key] = [];
});

const getPatanMachineExcelUniqueItems = (key: string) => {
  let rawList: any[] = [];
  if (activePatanMachineTab.value === 'ALL') {
    rawList = patanMachineData.value.all_parts || [];
  } else {
    rawList = patanMachineData.value.groups[activePatanMachineTab.value] || [];
  }
  const unique = new Set(rawList.map(item => String(item[key] ?? '-')));
  return Array.from(unique).sort();
};

const isAllPatanMachineExcelItemsChecked = (key: string) => {
  const allItems = getPatanMachineExcelUniqueItems(key);
  const checked = patanMachineCheckedFilters.value[key] || [];
  return allItems.length > 0 && checked.length === allItems.length;
};

const togglePatanMachineExcelSelectAll = (key: string) => {
  const allItems = getPatanMachineExcelUniqueItems(key);
  if (isAllPatanMachineExcelItemsChecked(key)) {
    patanMachineCheckedFilters.value[key] = [];
  } else {
    patanMachineCheckedFilters.value[key] = [...allItems];
  }
};

const isPatanMachineExcelFilterActive = (key: string) => {
  return (patanMachineCheckedFilters.value[key] && patanMachineCheckedFilters.value[key].length > 0) || 
         (patanMachineSearchQueries.value[key] && patanMachineSearchQueries.value[key].length > 0);
};

const setPatanMachineExcelSort = (key: string, dir: 'asc' | 'desc') => {
  if (patanMachineSortKey.value === key && patanMachineSortDir.value === dir) {
    patanMachineSortKey.value = null;
  } else {
    patanMachineSortKey.value = key;
    patanMachineSortDir.value = dir;
  }
};

const clearSinglePatanMachineExcelFilter = (key: string) => {
  patanMachineCheckedFilters.value[key] = [];
  patanMachineSearchQueries.value[key] = '';
  if (patanMachineSortKey.value === key) patanMachineSortKey.value = null;
};

const resetAllPatanMachineExcelFilters = () => {
  patanMachineSortKey.value = null;
  patanMachineSortDir.value = 'asc';
  patanHeaders.forEach(h => {
    patanMachineSearchQueries.value[h.key] = '';
    patanMachineCheckedFilters.value[h.key] = [];
  });
};

const isAnyPatanMachineExcelFilterActive = computed(() => {
  return patanHeaders.some(h => isPatanMachineExcelFilterActive(h.key)) || patanMachineSortKey.value !== null;
});

const currentPatanMachineList = computed(() => {
  let list: any[] = [];
  if (activePatanMachineTab.value === 'ALL') {
    list = patanMachineData.value.all_parts || [];
  } else {
    list = patanMachineData.value.groups[activePatanMachineTab.value] || [];
  }

  if (patanMachineSearchQuery.value) {
    const q = patanMachineSearchQuery.value.toLowerCase().trim();
    list = list.filter((item: any) => 
      Object.values(item).some(val => 
        String(val || '').toLowerCase().includes(q)
      )
    );
  }

  patanHeaders.forEach(h => {
    const key = h.key;
    const checked = patanMachineCheckedFilters.value[key] || [];
    const search = (patanMachineSearchQueries.value[key] || '').toLowerCase().trim();

    if (checked.length > 0) {
      list = list.filter(item => checked.includes(String(item[key] ?? '-')));
    }

    if (search) {
      list = list.filter(item => String(item[key] ?? '').toLowerCase().includes(search));
    }
  });

  if (patanMachineSortKey.value) {
    const key = patanMachineSortKey.value;
    list.sort((a, b) => {
      let valA = a[key] ?? '';
      let valB = b[key] ?? '';
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return patanMachineSortDir.value === 'asc' ? numA - numB : numB - numA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return patanMachineSortDir.value === 'asc' ? -1 : 1;
      if (strA > strB) return patanMachineSortDir.value === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return list;
});

const detailHeaders = [
  { title: 'Urutan', key: 'urutan' },
  { title: 'Part Number', key: 'part_number' },
  { title: 'Job Number', key: 'job_number' },
  { title: 'Total Proses', key: 'total_proses' },
  { title: 'Part Name', key: 'part_name' },
  { title: 'Proses', key: 'process' },
  { title: 'Jam Start (Shift 1)', key: 'time_proc_start' },
  { title: 'Jam End (Shift 1)', key: 'time_proc_end' },
  { title: 'Jam Start (Shift 2)', key: 'time_proc_start_shift2' },
  { title: 'Jam End (Shift 2)', key: 'time_proc_end_shift2' },
  { title: 'Qty Kanban', key: 'qty_kanban' },
  { title: 'Qty Pallet', key: 'qty_pallet' },
  { title: 'Count Pallet', key: 'count_pallet' },
  { title: 'Pcs/Day', key: 'pcs_day' },
  { title: 'Prev Pcs/Day', key: 'pcs_day_prev' },
  { title: 'Stroke', key: 'stroke_day' },
  { title: 'Machine Use', key: 'machine_use' },
  { title: 'Machine Prev', key: 'machine_prev' },
  { title: 'Next Process', key: 'next_process' },
  { title: 'Lot Cycle', key: 'lot_cycle' },
  { title: 'Patan', key: 'patan' },
  { title: 'Lot Size Shift', key: 'lot_size_shift' },
  { title: 'Cycle Time (sec)', key: 'cycle_time_sec' },
  { title: 'Jig', key: 'jig' },
  { title: 'Jumlah Spot', key: 'jumlah_spot' },
  { title: 'Freq Dresser', key: 'freq_dresser' },
  { title: 'Freq Tip Change', key: 'freq_tip_change' },
  { title: 'Dandori (mnt)', key: 'dandori' },
  { title: 'Downtime (mnt)', key: 'downtime' },
  { title: 'Prod Time (mnt)', key: 'prod_time' },
  { title: 'TPT (mnt)', key: 'tpt' },
  { title: 'UPH', key: 'uph' },
  { title: 'Aksi / Detail', key: 'action' }
];

const detailSortKey = ref<string | null>(null);
const detailSortDir = ref<'asc' | 'desc'>('asc');
const detailSearchQueries = ref<Record<string, string>>({});
const detailCheckedFilters = ref<Record<string, string[]>>({});

detailHeaders.forEach(h => {
  detailSearchQueries.value[h.key] = '';
  detailCheckedFilters.value[h.key] = [];
});

const getDetailUniqueItems = (partsList: any[], key: string) => {
  if (!partsList || !Array.isArray(partsList)) return [];
  const unique = new Set(partsList.map((item: any) => String(item[key] ?? '')));
  return Array.from(unique).sort();
};

const getDetailFilteredUniqueItems = (partsList: any[], key: string) => {
  const items = getDetailUniqueItems(partsList, key);
  const query = (detailSearchQueries.value[key] || '').toLowerCase().trim();
  if (!query) return items;
  return items.filter(item => String(item).toLowerCase().includes(query));
};

const isAllDetailItemsChecked = (partsList: any[], key: string) => {
  const allFilteredItems = getDetailFilteredUniqueItems(partsList, key);
  if (allFilteredItems.length === 0) return false;
  const checked = detailCheckedFilters.value[key] || [];
  return allFilteredItems.every(item => checked.includes(item));
};

const toggleDetailSelectAll = (partsList: any[], key: string) => {
  const allFilteredItems = getDetailFilteredUniqueItems(partsList, key);
  const checked = detailCheckedFilters.value[key] || [];
  const isAllChecked = allFilteredItems.every(item => checked.includes(item));
  
  if (isAllChecked) {
    detailCheckedFilters.value[key] = checked.filter(c => !allFilteredItems.includes(c));
  } else {
    detailCheckedFilters.value[key] = [...new Set([...checked, ...allFilteredItems])];
  }
};

const isDetailFilterActive = (key: string) => {
  return (detailCheckedFilters.value[key] && detailCheckedFilters.value[key].length > 0) || 
         (detailSearchQueries.value[key] && detailSearchQueries.value[key].length > 0);
};

const setDetailSort = (key: string, dir: 'asc' | 'desc') => {
  if (detailSortKey.value === key && detailSortDir.value === dir) {
    detailSortKey.value = null;
  } else {
    detailSortKey.value = key;
    detailSortDir.value = dir;
  }
};

const clearSingleDetailFilter = (key: string) => {
  detailCheckedFilters.value[key] = [];
  detailSearchQueries.value[key] = '';
  if (detailSortKey.value === key) detailSortKey.value = null;
};

const getPartsForMachine = (partsList: any[], machineName: string) => {
  if (!partsList || !Array.isArray(partsList)) return [];
  const norm = (s: any) => String(s || '').trim().toLowerCase();
  const targetNorm = norm(machineName);
  let result = partsList.filter((p: any) => norm(p.machine_use || p.machine) === targetNorm);

  detailHeaders.forEach(h => {
    const key = h.key;
    const query = detailSearchQueries.value[key]?.toLowerCase();
    const checked = detailCheckedFilters.value[key];

    if (query) {
      result = result.filter((item: any) => String(item[key] ?? '').toLowerCase().includes(query));
    }
    
    if (checked && checked.length > 0) {
      result = result.filter((item: any) => checked.includes(String(item[key] ?? '')));
    }
  });

  if (detailSortKey.value) {
    result.sort((a: any, b: any) => {
      const valA = String(a[detailSortKey.value!] ?? '').toLowerCase();
      const valB = String(b[detailSortKey.value!] ?? '').toLowerCase();
      if (valA < valB) return detailSortDir.value === 'asc' ? -1 : 1;
      if (valA > valB) return detailSortDir.value === 'asc' ? 1 : -1;
      return 0;
    });
  } else {
    result.sort((a: any, b: any) => {
      const uA = Number(a.urutan || 9999);
      const uB = Number(b.urutan || 9999);
      if (uA !== uB) return uA - uB;
      return String(a.part_number || '').localeCompare(String(b.part_number || ''));
    });
  }

  return result;
};

const openMonitoringView = () => {
  const rawParamId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
  const simId = selectedSimulation.value?.header?.id || decryptId(rawParamId);
  if (simId) {
    router.push(`/welding/monitoring/${encryptId(simId)}`);
  } else {
    router.push('/welding/monitoring');
  }
};

const goBack = () => {
  router.push('/Transaction/welding/subassy-simulation');
};
</script>

<template>
  <div class="page-wrapper">
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

    <div v-if="detailLoading" class="d-flex justify-center align-center py-10">
      <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
    </div>

    <div v-else-if="selectedSimulation">
      <!-- HEADER INFO -->
      <v-row class="mb-6">
        <v-col cols="12" md="4">
          <v-card class="pa-4 rounded-xl elevation-2 bg-white h-100 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
            <div class="d-flex align-center justify-space-between mb-3 border-b pb-2">
              <div class="d-flex align-center">
                <v-icon color="primary" class="mr-2">mdi-information-outline</v-icon>
                <span class="text-subtitle-1 font-weight-bold text-primary">Informasi Simulasi</span>
              </div>
              <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">ID: {{ selectedSimulation.header.id }}</v-chip>
            </div>
            <div class="text-body-2 d-flex flex-column gap-2">
              <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Judul:</span><span class="font-weight-bold text-grey-darken-3">{{ selectedSimulation.header.title }}</span></div>
              <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Area:</span><span class="font-weight-medium text-grey-darken-3">{{ selectedSimulation.header.area || '-' }}</span></div>
              <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Periode:</span><span class="font-weight-bold text-primary">{{ formatPeriodeBulanTahun(selectedSimulation.header.periode) }}</span></div>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card class="pa-4 rounded-xl elevation-2 bg-white h-100 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
            <div class="d-flex align-center justify-space-between mb-3 border-b pb-2">
              <div class="d-flex align-center">
                <v-icon color="primary" class="mr-2">mdi-account-check-outline</v-icon>
                <span class="text-subtitle-1 font-weight-bold text-primary">Status & Author</span>
              </div>
              <v-chip
                size="small"
                :color="String(selectedSimulation.header.status).toUpperCase() == 'DRAFT' ? 'grey-darken-1' : String(selectedSimulation.header.status).toUpperCase() == 'SUBMIT' ? 'info' : String(selectedSimulation.header.status).toUpperCase() == 'APPROVE' ? 'success' : String(selectedSimulation.header.status).toUpperCase() == 'REJECT' ? 'error' : 'deep-purple'"
                variant="flat"
                class="font-weight-bold"
              >
                {{ String(selectedSimulation.header.status).toUpperCase() }}
              </v-chip>
            </div>
            <div class="text-body-2 d-flex flex-column gap-2">
              <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Created By:</span><span class="font-weight-medium text-grey-darken-3">{{ selectedSimulation.header.created_by }}</span></div>
              <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Created At:</span><span class="font-weight-medium text-grey-darken-3">{{ selectedSimulation.header.created_at }}</span></div>
              <template v-if="selectedSimulation.header.approved_by">
                <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Approved By:</span><span class="font-weight-bold text-success">{{ selectedSimulation.header.approved_by }}</span></div>
                <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Approved At:</span><span class="font-weight-medium text-grey-darken-3">{{ selectedSimulation.header.approved_at }}</span></div>
              </template>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card class="pa-4 rounded-xl elevation-2 bg-white h-100 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
            <div class="d-flex align-center justify-space-between mb-3 border-b pb-2">
              <div class="d-flex align-center">
                <v-icon color="primary" class="mr-2">mdi-note-text-outline</v-icon>
                <span class="text-subtitle-1 font-weight-bold text-primary">Catatan Simulasi</span>
              </div>
            </div>
            <div class="text-body-2 text-grey-darken-3 bg-grey-lighten-4 pa-3 rounded border" style="white-space: pre-wrap; min-height: 72px;">
              {{ selectedSimulation.header.note || 'Tidak ada catatan untuk simulasi ini.' }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- APPROVAL NOTES (Read Only) -->
      <v-card class="mb-4 pa-4 elevation-2 bg-grey-lighten-4 rounded-xl border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;" v-if="String(selectedSimulation.header.status).toUpperCase() == 'APPROVE' || String(selectedSimulation.header.status).toUpperCase() == 'REJECT' || String(selectedSimulation.header.status).toUpperCase() == 'LIVE'">
        <div class="text-subtitle-1 font-weight-bold mb-2">Catatan Atasan (Approval Notes)</div>
        <div class="bg-white pa-3 rounded border ql-editor" v-html="selectedSimulation.header.approval_notes || '<i>Tidak ada catatan.</i>'"></div>
      </v-card>

      <!-- TABS -->
      <v-tabs v-model="activeTab" color="primary" class="mb-4">
        <v-tab value="machine">Detail By Machine</v-tab>
        <v-tab value="line">Detail By Line</v-tab>
      </v-tabs>

      <v-window v-model="activeTab" style="overflow: visible;">
        <!-- TAB MACHINE -->
        <v-window-item value="machine">
          <div v-if="tabSwitchLoading" class="d-flex justify-center align-center py-10">
            <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
          </div>
          <v-card v-else class="pa-5 rounded-xl mb-6 elevation-2 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
            <div class="text-h5 text-primary font-weight-medium mb-4 d-flex justify-space-between align-center flex-wrap gap-2">
              <div class="d-flex align-center">
                <span>Live Dashboard Mesin</span>
              </div>
              <div class="d-flex align-center flex-wrap gap-2">
                <!-- Bandingkan, Alasan Balancing Mesin, Riwayat Perpindahan, Mode Monitoring & Export buttons -->
                <v-btn
                  style="background-color: #4338ca !important; color: #ffffff !important;"
                  variant="flat"
                  size="small"
                  class="font-weight-bold elevation-1"
                  prepend-icon="mdi-scale-balance"
                  @click="router.push({ path: '/Transaction/welding/subassy-simulation/compare', query: { id_a: encryptId(selectedSimulation.header.id) } })"
                >
                  Bandingkan
                </v-btn>
                <v-btn
                  style="background-color: #0284c7 !important; color: #ffffff !important;"
                  variant="flat"
                  size="small"
                  class="font-weight-bold elevation-1"
                  prepend-icon="mdi-clipboard-text-search-outline"
                  @click="openBalancingExplanationModal"
                >
                  Alasan Balancing Mesin
                </v-btn>
                <v-btn
                  style="background-color: #334155 !important; color: #ffffff !important;"
                  variant="flat"
                  size="small"
                  class="font-weight-bold elevation-1"
                  prepend-icon="mdi-history"
                  @click="isMovementHistoryOpen = true"
                >
                  Riwayat &amp; Alasan Perpindahan
                </v-btn>
                <v-btn
                  color="primary"
                  variant="flat"
                  size="small"
                  class="font-weight-bold"
                  prepend-icon="mdi-monitor-dashboard"
                  @click="openMonitoringView"
                >
                  Mode Monitoring
                </v-btn>
                <v-btn
                  color="teal-darken-1"
                  variant="flat"
                  size="small"
                  class="font-weight-bold"
                  prepend-icon="mdi-file-image-outline"
                  :loading="exportLoading && exportType === 'png'"
                  :disabled="exportLoading"
                  @click="exportSummary('png')"
                >
                  Export PNG
                </v-btn>
                <v-btn
                  color="error"
                  variant="flat"
                  size="small"
                  class="font-weight-bold"
                  prepend-icon="mdi-file-pdf-box"
                  :loading="exportLoading && exportType === 'pdf'"
                  :disabled="exportLoading"
                  @click="exportSummary('pdf')"
                >
                  Cetak / PDF
                </v-btn>
                <v-btn
                  variant="flat"
                  size="small"
                  class="font-weight-bold text-white elevation-1"
                  style="background-color: #88241c !important; color: #ffffff !important;"
                  prepend-icon="mdi-file-powerpoint-box"
                  :loading="exportLoading && exportType === 'pptx'"
                  :disabled="exportLoading"
                  @click="exportPPT"
                >
                  Export PPT
                </v-btn>
                <v-btn
                  color="success"
                  variant="flat"
                  size="small"
                  class="font-weight-bold text-white elevation-1"
                  prepend-icon="mdi-file-excel"
                  :disabled="exportLoading"
                  @click="exportExcel"
                >
                  Export Excel
                </v-btn>

                <v-divider vertical class="mx-1" />

                <v-btn color="primary" variant="flat" v-if="String(selectedSimulation.header.status).toUpperCase() == 'DRAFT' || String(selectedSimulation.header.status).toUpperCase() == 'REJECT'" @click="handleStatusChange('SUBMIT')">Submit for Approval</v-btn>
                <v-btn color="deep-purple" variant="flat" v-if="String(selectedSimulation.header.status).toUpperCase() == 'APPROVE'" @click="handleStatusChange('LIVE')">Set to LIVE</v-btn>
                <v-btn color="error" variant="flat" v-if="String(selectedSimulation.header.status).toUpperCase() == 'SUBMIT'" @click="openApprovalModal('REJECT')">Reject</v-btn>
                <v-btn color="success" variant="flat" v-if="String(selectedSimulation.header.status).toUpperCase() == 'SUBMIT'" @click="openApprovalModal('APPROVE')">Approve</v-btn>
                <v-btn color="grey" variant="outlined" @click="goBack">Kembali</v-btn>
              </div>
            </div>
            
            <!-- EXPORT CONTAINER (Captured for PNG/PDF) -->
            <div ref="summaryExportArea" class="bg-white rounded-xl pa-1">
              <v-card class="mb-4 elevation-1 pa-4 rounded-xl border" style="border-radius: 14px !important;">
                  <div ref="chartContainer" style="width: 100%; height: 400px;"></div>
              </v-card>

              <div ref="summaryTableArea" v-if="selectedSimulation.summary">
                <v-card class="mb-2 elevation-2 border rounded-xl overflow-hidden" style="border-radius: 14px !important;">
                  <div class="py-1 px-4 d-flex align-center justify-space-between rounded-t-lg text-white" style="background-color: rgb(3, 69, 161) !important; min-height: 36px;">
                    <div class="d-flex align-center">
                      <v-icon class="mr-2" color="white" size="18">mdi-table-large</v-icon>
                      <span class="text-subtitle-2 font-weight-bold">Summary Table Simulation</span>
                    </div>
                  </div>
              <div class="overflow-x-auto">
                <v-table density="compact" class="custom-table text-body-2" style="white-space: nowrap;">
                  <thead>
                    <tr style="background-color: #eef2f7;">
                      <th class="text-left font-weight-bold" style="min-width: 150px; position: sticky; left: 0px; z-index: 6; background-color: #eef2f7 !important; border-right: 2px solid #94a3b8 !important;">Parameter</th>
                      <th v-for="m in selectedSimulation.summary" :key="'head'+m.machine" class="text-center">{{ m.machine || 'Unknown' }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                        <div class="d-flex align-center">
                          <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background-color: #d50000;"></span>
                          <span>Downtime (Jam)</span>
                        </div>
                      </td>
                      <td v-for="m in selectedSimulation.summary" :key="'downtime'+m.machine" class="text-center">{{ m.downtime !== undefined && m.downtime !== null ? m.downtime : '0.00' }}</td>
                    </tr>
                    <tr>
                      <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                        <div class="d-flex align-center">
                          <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background-color: #fbc02d;"></span>
                          <span>T/C (Jam)</span>
                        </div>
                      </td>
                      <td v-for="m in selectedSimulation.summary" :key="'tc'+m.machine" class="text-center">{{ m.tip_change !== undefined && m.tip_change !== null ? m.tip_change : (m.tc !== undefined ? m.tc : '0.00') }}</td>
                    </tr>
                    <tr>
                      <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                        <div class="d-flex align-center">
                          <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background-color: #00a2ff;"></span>
                          <span>Dandori (Jam)</span>
                        </div>
                      </td>
                      <td v-for="m in selectedSimulation.summary" :key="'dandori'+m.machine" class="text-center">{{ m.dandori !== undefined && m.dandori !== null ? m.dandori : '0.00' }}</td>
                    </tr>
                    <tr>
                      <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                        <div class="d-flex align-center">
                          <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background-color: #800080;"></span>
                          <span>Teiryo (Jam)</span>
                        </div>
                      </td>
                      <td v-for="m in selectedSimulation.summary" :key="'teiryo'+m.machine" class="text-center">{{ m.teiryo !== undefined && m.teiryo !== null ? m.teiryo : '0.00' }}</td>
                    </tr>
                    <tr>
                      <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                        <div class="d-flex align-center">
                          <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background-color: #005db9;"></span>
                          <span>Weld Time (Jam)</span>
                        </div>
                      </td>
                      <td
                        v-for="m in selectedSimulation.summary"
                        :key="'weld'+m.machine"
                        class="text-center"
                      >
                        <div class="d-flex align-center justify-center">
                          <span class="font-weight-bold" :class="{'text-amber-darken-4': Number(m.prod_time_adjust || 0) !== 0}">
                            {{ getWeldTime(m).toFixed(1) }}
                          </span>
                          <v-chip v-if="Number(m.prod_time_adjust || 0) !== 0" size="x-small" color="warning" density="compact" class="ml-1 px-1 font-weight-bold" style="font-size: 9.5px; height: 18px;" title="Nilai ini telah disesuaikan saat pembuatan/edit simulasi">
                            {{ Number(m.prod_time_adjust) > 0 ? '+' : '' }}{{ Number(m.prod_time_adjust).toFixed(1) }}
                          </v-chip>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td class="font-weight-bold bg-grey-lighten-4 text-primary" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                        <div class="d-flex align-center">
                          <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background: linear-gradient(135deg, #005db9, #00a2ff, #d50000);"></span>
                          <span>Hour/Day (TPT)</span>
                        </div>
                      </td>
                      <td v-for="m in selectedSimulation.summary" :key="'tpt'+m.machine" class="text-center text-primary font-weight-bold">{{ Number(m.tpt || 0).toFixed(1) }}</td>
                    </tr>
                    <tr>
                      <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                        <div class="d-flex align-center">
                          <span class="d-inline-block rounded-circle mr-2 flex-shrink-0" style="width: 7px; height: 7px; background-color: #000000;"></span>
                          <span>UPH</span>
                        </div>
                      </td>
                      <td v-for="m in selectedSimulation.summary" :key="'uph'+m.machine" class="text-center">{{ m.uph }}</td>
                    </tr>
                    <tr>
                      <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                        <div class="d-flex align-center">
                          <span class="d-inline-block mr-2 flex-shrink-0" style="width: 16px; height: 0px; border-top: 2.5px dashed #1a237e;"></span>
                          <span>WT 1 SHIFT</span>
                        </div>
                      </td>
                      <td v-for="m in selectedSimulation.summary" :key="'wt1'+m.machine" class="text-center">{{ m.wt_1_shift || '-' }}</td>
                    </tr>
                    <tr>
                      <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                        <div class="d-flex align-center">
                          <span class="d-inline-block mr-2 flex-shrink-0" style="width: 16px; height: 0px; border-top: 2.5px dashed #f44336;"></span>
                          <span>WT 1 SHIFT + PJK</span>
                        </div>
                      </td>
                      <td v-for="m in selectedSimulation.summary" :key="'wt1pjk'+m.machine" class="text-center">{{ m.wt_1_shift_pjk || '-' }}</td>
                    </tr>
                    <tr>
                      <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                        <div class="d-flex align-center">
                          <span class="d-inline-block mr-2 flex-shrink-0" style="width: 16px; height: 0px; border-top: 2.5px dashed #1a237e;"></span>
                          <span>WT 2 SHIFT</span>
                        </div>
                      </td>
                      <td v-for="m in selectedSimulation.summary" :key="'wt2'+m.machine" class="text-center">{{ m.wt_2_shift || '-' }}</td>
                    </tr>
                    <tr>
                      <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                        <div class="d-flex align-center">
                          <span class="d-inline-block mr-2 flex-shrink-0" style="width: 16px; height: 0px; border-top: 2.5px dashed #f44336;"></span>
                          <span>WT 2 SHIFT + PJK 1S</span>
                        </div>
                      </td>
                      <td v-for="m in selectedSimulation.summary" :key="'wt2pjk1s'+m.machine" class="text-center">{{ m.wt_2_shift_pjk1s !== undefined ? m.wt_2_shift_pjk1s : (m.wt_2_shift_pjk || '-') }}</td>
                    </tr>
                    <tr>
                      <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">
                        <div class="d-flex align-center">
                          <span class="d-inline-block mr-2 flex-shrink-0" style="width: 16px; height: 0px; border-top: 2.5px dashed #f44336;"></span>
                          <span>WT 2 SHIFT + PJK 2S</span>
                        </div>
                      </td>
                      <td v-for="m in selectedSimulation.summary" :key="'wt2pjk2s'+m.machine" class="text-center">{{ m.wt_2_shift_pjk2s !== undefined ? m.wt_2_shift_pjk2s : '-' }}</td>
                    </tr>
                    <tr>
                      <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">WORKING DAY</td>
                      <td v-for="m in selectedSimulation.summary" :key="'wday'+m.machine" class="text-center">{{ m.working_day !== undefined ? m.working_day : '-' }}</td>
                    </tr>
                    <tr>
                      <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">MP</td>
                      <td v-for="m in selectedSimulation.summary" :key="'mp'+m.machine" class="text-center">{{ m.mp !== undefined ? m.mp : '-' }}</td>
                    </tr>
                    <tr>
                      <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important;">JUMLAH ITEM</td>
                      <td v-for="m in selectedSimulation.summary" :key="'item'+m.machine" class="text-center">{{ m.item !== undefined ? m.item : '-' }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
            </v-card>
            </div>
          </div>
        </v-card>

          <!-- CARD TERPISAH: DETAIL SCHEDULE PART MESIN -->
          <v-card v-if="selectedSimulation.summary" class="pa-5 rounded-xl mb-6 elevation-2 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
            <div class="d-flex justify-space-between align-center mb-4">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="primary" size="24">mdi-format-list-bulleted-square</v-icon>
                <span class="text-h6 text-primary font-weight-bold">Detail Schedule Part Mesin</span>
              </div>
              <v-btn
                v-if="!showPartDetail"
                color="primary"
                variant="flat"
                @click="loadPartDetail"
                prepend-icon="mdi-eye"
                size="small"
              >
                Lihat Detail Part
              </v-btn>
              <v-btn
                v-else
                color="grey"
                variant="outlined"
                @click="showPartDetail = false"
                prepend-icon="mdi-eye-off"
                size="small"
              >
                Sembunyikan
              </v-btn>
            </div>

            <div v-if="showPartDetail">
              <div v-if="partLoading" class="d-flex justify-center align-center py-6">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
              </div>
              
              <div v-else class="mt-2">
                <v-table density="compact" class="custom-table text-body-2 border rounded-lg overflow-hidden elevation-1" fixed-header height="550px">
                  <thead>
                    <tr style="background-color: #eef2f7;">
                      <th class="text-center font-weight-bold" style="min-width: 100px;">Mesin</th>
                      <th class="text-center font-weight-bold" style="width: 50px;">No</th>
                      <th v-for="col in detailHeaders" :key="col.key" class="text-left font-weight-bold" style="white-space: nowrap;">
                        <v-menu :close-on-content-click="false" location="bottom start">
                          <template v-slot:activator="{ props }">
                            <div class="d-inline-flex align-center cursor-pointer select-none" v-bind="props">
                              <span>{{ col.title }}</span>
                              <v-icon size="14" class="ml-1" :color="isDetailFilterActive(col.key) || detailSortKey === col.key ? 'primary' : 'grey-lighten-1'">
                                {{ detailSortKey === col.key ? (detailSortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-filter-variant' }}
                              </v-icon>
                            </div>
                          </template>

                          <v-card width="250" class="pa-2 rounded-lg text-black">
                            <v-list density="compact" class="pa-0">
                              <v-list-item prepend-icon="mdi-sort-ascending" title="Sort A to Z / Ascending" @click="setDetailSort(col.key, 'asc')" />
                              <v-list-item prepend-icon="mdi-sort-descending" title="Sort Z to A / Descending" @click="setDetailSort(col.key, 'desc')" />
                            </v-list>
                            <v-divider class="my-1" />
                            
                            <v-text-field
                              v-model="detailSearchQueries[col.key]"
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
                                :model-value="isAllDetailItemsChecked(selectedSimulation.loads, col.key)"
                                @click="toggleDetailSelectAll(selectedSimulation.loads, col.key)"
                                class="ma-0 pa-0"
                              />
                              <v-checkbox
                                v-for="item in getDetailFilteredUniqueItems(selectedSimulation.loads, col.key)"
                                :key="item"
                                :label="item || '-'"
                                :value="item"
                                v-model="detailCheckedFilters[col.key]"
                                density="compact"
                                hide-details
                                class="ma-0 pa-0"
                              />
                            </div>
                            
                            <v-card-actions class="justify-end pa-0 mt-2">
                              <v-btn size="x-small" variant="text" color="grey" @click="clearSingleDetailFilter(col.key)">Reset</v-btn>
                            </v-card-actions>
                          </v-card>
                        </v-menu>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="m in selectedSimulation.summary" :key="'grp-'+m.machine">
                      <template v-if="getPartsForMachine(selectedSimulation.loads, m.machine).length > 0">
                        <tr
                          v-for="(p, pIdx) in getPartsForMachine(selectedSimulation.loads, m.machine)"
                          :key="p.id || pIdx"
                          :class="{'bg-grey-lighten-5': pIdx % 2 === 1}"
                        >
                          <td class="text-center font-weight-bold text-primary">{{ m.machine }}</td>
                          <td class="text-center text-grey-darken-1">{{ pIdx + 1 }}</td>
                          <td class="text-center font-weight-bold text-indigo">{{ (p as any).urutan !== undefined && (p as any).urutan !== null && (p as any).urutan !== '' && (p as any).urutan !== 0 ? (p as any).urutan : '-' }}</td>
                          <td class="font-weight-bold text-primary" style="font-size: 13px; white-space: nowrap;">
                            {{ p.part_number }}
                          </td>
                          <td class="text-center font-weight-medium">{{ p.job_number || '-' }}</td>
                          <td class="text-center">{{ p.total_proses || '-' }}</td>
                          <td class="text-left" style="white-space: nowrap;">{{ p.part_name || '-' }}</td>
                          <td class="text-center font-weight-medium">{{ p.process || '-' }}</td>
                          <td class="text-center font-weight-bold text-success" style="white-space: nowrap;">{{ (p as any).time_proc_start || '-' }}</td>
                          <td class="text-center font-weight-bold text-error" style="white-space: nowrap;">{{ (p as any).time_proc_end || '-' }}</td>
                          <td class="text-center font-weight-bold text-indigo" style="white-space: nowrap;">{{ (p as any).time_proc_start_shift2 || '-' }}</td>
                          <td class="text-center font-weight-bold text-deep-orange" style="white-space: nowrap;">{{ (p as any).time_proc_end_shift2 || '-' }}</td>
                          <td class="text-right">{{ p.qty_kanban || '0' }}</td>
                          <td class="text-right">{{ p.qty_pallet || '-' }}</td>
                          <td class="text-right font-weight-medium">{{ p.count_pallet !== undefined && p.count_pallet !== null && p.count_pallet !== '' && p.count_pallet !== '0.00' ? Number(p.count_pallet).toFixed(1) : (Number(p.qty_kanban) > 0 && Number(p.lot_size_shift) > 0 ? (Number(p.lot_size_shift) / Number(p.qty_kanban)).toFixed(1) : '0') }}</td>
                          <td class="text-right font-weight-bold cursor-pointer text-primary" @click="openPcsDayDetailModal(p)" title="Klik untuk melihat rincian Pcs/Day (Part Delivery)"><span>{{ p.pcs_day || p.pcs_day_monthly || '0' }}</span><v-icon size="12" color="primary" class="ml-1 opacity-60">mdi-information-outline</v-icon></td>
                          <td class="text-right">{{ p.pcs_day_prev !== undefined && p.pcs_day_prev !== null && p.pcs_day_prev !== '' ? p.pcs_day_prev : '-' }}</td>
                          <td class="text-right">{{ p.stroke_day || p.stroke || '0' }}</td>
                          <td class="text-center font-weight-bold text-primary">{{ p.machine_use || p.machine || '-' }}</td>
                          <td class="text-center">
                            <span v-if="p.machine_prev && p.machine_prev !== (p.machine_use || p.machine)" class="font-weight-medium text-amber-darken-3">
                              {{ p.machine_prev }}
                            </span>
                            <span v-else class="text-grey-darken-1">-</span>
                          </td>
                          <td class="text-center">{{ p.next_process || '-' }}</td>
                          <td class="text-center">{{ p.lot_cycle || '1' }}</td>
                          <td class="text-center font-weight-medium">{{ p.patan || (Number(p.lot_cycle) <= 1 ? 'A B C D' : 'A C') }}</td>
                          <td class="text-right">{{ p.lot_size_shift || '0' }}</td>
                          <td class="text-center">{{ p.cycle_time_sec || '0' }}</td>
                          <td class="text-center">{{ p.jig || '-' }}</td>
                          <td class="text-right">{{ p.jumlah_spot ?? '-' }}</td>
                          <td class="text-right">{{ p.freq_dresser ?? '-' }}</td>
                          <td class="text-right">{{ p.freq_tip_change ?? '-' }}</td>
                          <td class="text-right">{{ p.dandori || '0' }}</td>
                          <td class="text-right">{{ p.downtime || '0' }}</td>
                          <td class="text-right">{{ p.prod_time || '0' }}</td>
                          <td class="text-right font-weight-bold text-primary">{{ p.tpt ? Number(p.tpt).toFixed(1) : '0' }}</td>
                          <td class="text-right">{{ p.uph || '0' }}</td>
                          <td class="text-center">
                            <v-btn size="x-small" color="info" variant="flat" prepend-icon="mdi-information-outline" class="font-weight-bold" @click="openStatusPatanDetailModal(p)">Detail</v-btn>
                          </td>
                        </tr>
                      </template>
                    </template>
                  </tbody>
                </v-table>
              </div>
            </div>
          </v-card>

          <!-- CARD TERPISAH: DETAIL SCHEDULE PART PER PATAN (MESIN) -->
          <v-card v-if="selectedSimulation.summary" class="pa-5 rounded-xl mb-6 elevation-2 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
            <div class="d-flex justify-space-between align-center mb-4">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="primary" size="24">mdi-calendar-sync-outline</v-icon>
                <span class="text-h6 text-primary font-weight-bold">Detail Schedule Part Per Patan Mesin</span>
              </div>
              <div class="d-flex align-center gap-2">
                <v-btn
                  v-if="!showPatanMachineDetail"
                  color="primary"
                  variant="flat"
                  @click="loadPatanMachineDetail"
                  prepend-icon="mdi-eye"
                  size="small"
                  :loading="patanMachineLoading"
                >
                  Lihat Schedule Patan
                </v-btn>
                <template v-else>
                  <v-btn
                    color="primary"
                    variant="tonal"
                    @click="fetchPatanMachineData()"
                    prepend-icon="mdi-refresh"
                    size="small"
                    :loading="patanMachineLoading"
                  >
                    Refresh Data
                  </v-btn>
                  <v-btn
                    color="grey"
                    variant="outlined"
                    @click="showPatanMachineDetail = false"
                    prepend-icon="mdi-eye-off"
                    size="small"
                  >
                    Sembunyikan
                  </v-btn>
                </template>
              </div>
            </div>

            <div v-if="showPatanMachineDetail">
              <div v-if="patanMachineLoading" class="d-flex justify-center align-center py-6">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
              </div>
              
              <div v-else class="mt-2">
                <!-- Tabs Bar -->
                <div class="d-flex flex-wrap align-center justify-space-between mb-3 border-b bg-grey-lighten-5 pa-2 rounded-xl gap-2">
                  <v-tabs v-model="activePatanMachineTab" density="compact" color="primary">
                    <v-tab value="A">PATAN A ({{ patanMachineData.summary.patan_a_count || 0 }})</v-tab>
                    <v-tab value="B">PATAN B ({{ patanMachineData.summary.patan_b_count || 0 }})</v-tab>
                    <v-tab value="C">PATAN C ({{ patanMachineData.summary.patan_c_count || 0 }})</v-tab>
                    <v-tab value="D">PATAN D ({{ patanMachineData.summary.patan_d_count || 0 }})</v-tab>
                    <v-tab value="ALL">Semua Part ({{ patanMachineData.summary.total_parts || 0 }})</v-tab>
                  </v-tabs>
                </div>

                <!-- Filter Guidance & Global Search Bar -->
                <div class="d-flex align-center justify-space-between mb-3">
                  <div class="text-caption text-grey d-flex align-center">
                    <v-icon size="16" class="mr-1">mdi-filter-cog</v-icon>
                    <span>Klik judul kolom pada tabel untuk memfilter / mengurutkan data.</span>
                    <v-btn v-if="isAnyPatanMachineExcelFilterActive" size="x-small" color="red" variant="text" class="ml-2 text-none" @click="resetAllPatanMachineExcelFilters">
                      Reset Semua Filter Kolom
                    </v-btn>
                  </div>
                  <div style="width: 300px;">
                    <v-text-field
                      v-model="patanMachineSearchQuery"
                      placeholder="Cari data global..."
                      density="compact"
                      variant="outlined"
                      hide-details
                      prepend-inner-icon="mdi-magnify"
                      clearable
                    />
                  </div>
                </div>

                <!-- Data Table with Header Sorting & Menu Filtering -->
                <v-data-table
                  :headers="currentPatanMachineHeaders"
                  :items="currentPatanMachineList"
                  density="compact"
                  class="elevation-1 rounded-xl patan-table text-body-2"
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
                        <v-menu :close-on-content-click="false" location="bottom start" transition="scale-transition">
                          <template v-slot:activator="{ props }">
                            <div v-bind="props" class="header-inner d-flex align-center justify-center cursor-pointer select-none py-1 hover-header">
                              <span :class="{'text-primary font-weight-bold': isPatanMachineExcelFilterActive(col.key || '')}">
                                {{ col.title }}
                              </span>
                              <v-icon size="14" class="ml-1" :color="isPatanMachineExcelFilterActive(col.key || '') || patanMachineSortKey === col.key ? 'primary' : 'grey-lighten-1'">
                                {{ patanMachineSortKey === col.key ? (patanMachineSortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-filter-variant' }}
                              </v-icon>
                            </div>
                          </template>

                          <v-card width="250" class="pa-2 rounded-lg text-black">
                            <v-list density="compact" class="pa-0">
                              <v-list-item prepend-icon="mdi-sort-ascending" title="Sort A to Z / Ascending" @click="setPatanMachineExcelSort(col.key || '', 'asc')" />
                              <v-list-item prepend-icon="mdi-sort-descending" title="Sort Z to A / Descending" @click="setPatanMachineExcelSort(col.key || '', 'desc')" />
                            </v-list>
                            <v-divider class="my-1" />
                            
                            <v-text-field
                              v-model="patanMachineSearchQueries[col.key || '']"
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
                                :model-value="isAllPatanMachineExcelItemsChecked(col.key || '')"
                                @click="togglePatanMachineExcelSelectAll(col.key || '')"
                                class="ma-0 pa-0"
                              />
                              <v-checkbox
                                v-for="item in getPatanMachineExcelUniqueItems(col.key || '')"
                                :key="item"
                                :label="item || '-'"
                                :value="item"
                                v-model="patanMachineCheckedFilters[col.key || '']"
                                density="compact"
                                hide-details
                                class="ma-0 pa-0"
                              />
                            </div>
                            
                            <v-card-actions class="justify-end pa-0 mt-2">
                              <v-btn size="x-small" variant="text" color="grey" @click="clearSinglePatanMachineExcelFilter(col.key || '')">Reset</v-btn>
                            </v-card-actions>
                          </v-card>
                        </v-menu>
                      </th>
                    </tr>
                  </template>

                  <template #item="{ item }">
                    <tr class="hover-row text-body-2 text-black" style="color: #000000 !important;">
                      <td class="text-center font-weight-bold">{{ item.urutan || item.urutan_simulasi || item.urutan_priority || '-' }}</td>
                      <td class="text-start font-weight-bold">{{ item.part_number }}</td>
                      <td class="text-start">{{ item.job_number || '-' }}</td>
                      <td class="text-start">{{ item.part_name || '-' }}</td>
                      <td class="text-center">
                        <span>{{ item.model || '-' }}</span>
                      </td>
                      <td class="text-center font-weight-medium">
                        <span>{{ item.machine || '-' }}</span>
                      </td>
                      <td class="text-center">{{ item.process || item.op || '-' }}</td>
                      <td v-if="activePatanMachineTab === 'A' || activePatanMachineTab === 'C' || activePatanMachineTab === 'ALL'" class="text-center font-weight-medium" style="white-space: nowrap;">{{ item.time_proc_start || '-' }}</td>
                      <td v-if="activePatanMachineTab === 'A' || activePatanMachineTab === 'C' || activePatanMachineTab === 'ALL'" class="text-center font-weight-medium" style="white-space: nowrap;">{{ item.time_proc_end || '-' }}</td>
                      <td v-if="activePatanMachineTab === 'B' || activePatanMachineTab === 'D' || activePatanMachineTab === 'ALL'" class="text-center font-weight-medium" style="white-space: nowrap;">{{ item.time_proc_start_shift2 || '-' }}</td>
                      <td v-if="activePatanMachineTab === 'B' || activePatanMachineTab === 'D' || activePatanMachineTab === 'ALL'" class="text-center font-weight-medium" style="white-space: nowrap;">{{ item.time_proc_end_shift2 || '-' }}</td>
                      <td class="text-center font-weight-medium">{{ item.lot_cycle || '1' }}</td>
                      <td class="text-center font-weight-medium">
                        <span>{{ item.patan || (Number(item.lot_cycle) <= 1 ? 'A B C D' : 'A C') }}</span>
                      </td>
                      <td class="text-end">{{ item.qty_kanban || '0' }}</td>
                      <td class="text-end">{{ item.qty_pallet || '-' }}</td>
                      <td class="text-end font-weight-medium">{{ item.count_pallet !== undefined && item.count_pallet !== null && item.count_pallet !== '' && item.count_pallet !== '0.00' ? Number(item.count_pallet).toFixed(1) : (Number(item.qty_kanban) > 0 && Number(item.lot_size_shift) > 0 ? (Number(item.lot_size_shift) / Number(item.qty_kanban)).toFixed(1) : '0') }}</td>
                      <td class="text-end font-weight-bold cursor-pointer" @click="openPcsDayDetailModal(item)" title="Klik untuk melihat rincian Pcs/Day (Part Delivery)"><span>{{ item.pcs_day || '0' }}</span><v-icon size="12" class="ml-1 opacity-60">mdi-information-outline</v-icon></td>
                      <td class="text-end font-weight-medium">{{ item.lot_size_shift || '0' }}</td>
                      <td class="text-center">{{ item.cycle_time_sec || '0' }}</td>
                      <td class="text-end font-weight-bold">{{ item.tpt_menit !== undefined ? Number(item.tpt_menit).toFixed(1) : (item.tpt ? Number(item.tpt).toFixed(1) : '0') }}</td>
                      <td class="text-center">
                        <v-btn size="x-small" color="primary" variant="flat" prepend-icon="mdi-information-outline" class="font-weight-bold" @click="openStatusPatanDetailModal(item)">Detail</v-btn>
                      </td>
                    </tr>
                  </template>
                </v-data-table>
              </div>
            </div>
          </v-card>
        </v-window-item>

        <!-- TAB LINE -->
        <v-window-item value="line">
          <div v-if="tabSwitchLoading" class="d-flex justify-center align-center py-10">
            <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
          </div>
          <v-card v-else class="pa-5 rounded-xl mb-6 elevation-2 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
            <div class="text-h5 text-primary font-weight-medium mb-4">Dashboard By Line</div>
            
            <v-row class="mb-4">
              <v-col cols="12" md="4">
                <v-select
                  v-model="selectedLine"
                  :items="lineOptions"
                  label="Pilih Line"
                  variant="outlined"
                  density="compact"
                  @update:model-value="onLineSelect"
                ></v-select>
              </v-col>
            </v-row>

            <div v-if="lineDetailLoading" class="d-flex justify-center align-center py-6">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <div v-else-if="lineDetailData">
              <v-row class="mb-4">
                <v-col cols="6" md="3">
                  <v-card class="pa-4 rounded-xl elevation-2 bg-white text-center border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
                    <div class="text-caption text-grey-darken-1 font-weight-bold">TPT TOTAL</div>
                    <div class="text-h5 font-weight-bold text-primary mt-1">{{ lineDetailData.summary.tpt }} <span class="text-caption">Jam</span></div>
                  </v-card>
                </v-col>
                <v-col cols="6" md="3">
                  <v-card class="pa-4 rounded-xl elevation-2 bg-white text-center border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
                    <div class="text-caption text-grey-darken-1 font-weight-bold">PROD TIME TOTAL</div>
                    <div class="text-h5 font-weight-bold text-cyan-darken-3 mt-1">{{ lineDetailData.summary.prod_time }} <span class="text-caption">Jam</span></div>
                  </v-card>
                </v-col>
                <v-col cols="6" md="3">
                  <v-card class="pa-4 rounded-xl elevation-2 bg-white text-center border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
                    <div class="text-caption text-grey-darken-1 font-weight-bold">DANDORI TOTAL</div>
                    <div class="text-h5 font-weight-bold text-orange-darken-3 mt-1">{{ lineDetailData.summary.dandori }} <span class="text-caption">Jam</span></div>
                  </v-card>
                </v-col>
                <v-col cols="6" md="3">
                  <v-card class="pa-4 rounded-xl elevation-2 bg-white text-center border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
                    <div class="text-caption text-grey-darken-1 font-weight-bold">DOWNTIME TOTAL</div>
                    <div class="text-h5 font-weight-bold text-red-darken-3 mt-1">{{ lineDetailData.summary.downtime }} <span class="text-caption">Jam</span></div>
                  </v-card>
                </v-col>
              </v-row>

              <v-card class="mb-6 elevation-1 pa-4 rounded-xl border" style="border-radius: 14px !important;">
                <div ref="chartLineContainer" style="width: 100%; height: 400px;"></div>
              </v-card>

              <v-card class="mb-6 elevation-2 border rounded-xl overflow-hidden" style="border-radius: 14px !important;" v-if="lineDetailData.machines">
                <div class="py-1 px-4 d-flex align-center justify-space-between rounded-t-lg text-white" style="background-color: rgb(3, 69, 161) !important; min-height: 36px;">
                  <div class="d-flex align-center">
                    <v-icon class="mr-2" color="white" size="18">mdi-table-large</v-icon>
                    <span class="text-subtitle-2 font-weight-bold">Summary Table Line {{ selectedLine }}</span>
                  </div>
                </div>
                <div class="overflow-x-auto">
                  <v-table density="compact" class="custom-table text-body-2" style="white-space: nowrap;">
                    <thead>
                      <tr style="background-color: #eef2f7;">
                        <th class="text-left font-weight-bold" style="width: 156px; min-width: 156px; max-width: 156px; position: sticky; left: 0px; z-index: 6; background-color: #eef2f7 !important; border-right: 2px solid #94a3b8 !important;">Parameter</th>
                        <th v-for="m in lineDetailData.machines" :key="'head'+m.machine" class="text-center">{{ m.machine || 'Unknown' }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important; width: 156px; min-width: 156px; max-width: 156px;">
                          <div class="d-flex align-center">
                            <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background-color: #d50000;"></span>
                            <span>Downtime (Jam)</span>
                          </div>
                        </td>
                        <td v-for="m in lineDetailData.machines" :key="'downtime'+m.machine" class="text-center">{{ m.downtime }}</td>
                      </tr>
                      <tr>
                        <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important; width: 156px; min-width: 156px; max-width: 156px;">
                          <div class="d-flex align-center">
                            <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background-color: #fbc02d;"></span>
                            <span>T/C (Jam)</span>
                          </div>
                        </td>
                        <td v-for="m in lineDetailData.machines" :key="'tc'+m.machine" class="text-center">{{ m.tc !== undefined ? m.tc : '0.00' }}</td>
                      </tr>
                      <tr>
                        <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important; width: 156px; min-width: 156px; max-width: 156px;">
                          <div class="d-flex align-center">
                            <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background-color: #00a2ff;"></span>
                            <span>Dandori (Jam)</span>
                          </div>
                        </td>
                        <td v-for="m in lineDetailData.machines" :key="'dandori'+m.machine" class="text-center">{{ m.dandori }}</td>
                      </tr>
                      <tr>
                        <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important; width: 156px; min-width: 156px; max-width: 156px;">
                          <div class="d-flex align-center">
                            <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background-color: #800080;"></span>
                            <span>Teiryo (Jam)</span>
                          </div>
                        </td>
                        <td v-for="m in lineDetailData.machines" :key="'teiryo'+m.machine" class="text-center">{{ m.teiryo !== undefined ? m.teiryo : '0.00' }}</td>
                      </tr>
                      <tr>
                        <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important; width: 156px; min-width: 156px; max-width: 156px;">
                          <div class="d-flex align-center">
                            <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background-color: #005db9;"></span>
                            <span>Weld Time (Jam)</span>
                          </div>
                        </td>
                        <td v-for="m in lineDetailData.machines" :key="'weld'+m.machine" class="text-center">
                          {{ Number(Number(m.tpt || 0) - Number(m.downtime || 0) - Number(m.tc || 0) - Number(m.dandori || 0) - Number(m.teiryo || 0)).toFixed(1) }}
                        </td>
                      </tr>
                      <tr>
                        <td class="font-weight-bold bg-grey-lighten-4 text-primary" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important; width: 156px; min-width: 156px; max-width: 156px;">
                          <div class="d-flex align-center">
                            <span class="d-inline-block rounded-xs mr-2 flex-shrink-0" style="width: 11px; height: 11px; background: linear-gradient(135deg, #005db9, #00a2ff, #d50000);"></span>
                            <span>Hour/Day (TPT)</span>
                          </div>
                        </td>
                        <td v-for="m in lineDetailData.machines" :key="'tpt'+m.machine" class="text-center text-primary font-weight-bold">{{ Number(m.tpt || 0).toFixed(1) }}</td>
                      </tr>
                      <tr>
                        <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important; width: 156px; min-width: 156px; max-width: 156px;">
                          <div class="d-flex align-center">
                            <span class="d-inline-block rounded-circle mr-2 flex-shrink-0" style="width: 7px; height: 7px; background-color: #000000;"></span>
                            <span>UPH</span>
                          </div>
                        </td>
                        <td v-for="m in lineDetailData.machines" :key="'uph'+m.machine" class="text-center">{{ m.uph }}</td>
                      </tr>
                      <tr>
                        <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important; width: 156px; min-width: 156px; max-width: 156px;">
                          <div class="d-flex align-center">
                            <span class="d-inline-block mr-2 flex-shrink-0" style="width: 16px; height: 0px; border-top: 2.5px dashed #1a237e;"></span>
                            <span>WT 1 SHIFT</span>
                          </div>
                        </td>
                        <td v-for="m in lineDetailData.machines" :key="'wt1'+m.machine" class="text-center">{{ m.wt_1_shift || '-' }}</td>
                      </tr>
                      <tr>
                        <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important; width: 156px; min-width: 156px; max-width: 156px;">
                          <div class="d-flex align-center">
                            <span class="d-inline-block mr-2 flex-shrink-0" style="width: 16px; height: 0px; border-top: 2.5px dashed #f44336;"></span>
                            <span>WT 1 SHIFT + PJK</span>
                          </div>
                        </td>
                        <td v-for="m in lineDetailData.machines" :key="'wt1pjk'+m.machine" class="text-center">{{ m.wt_1_shift_pjk || '-' }}</td>
                      </tr>
                      <tr>
                        <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important; width: 156px; min-width: 156px; max-width: 156px;">
                          <div class="d-flex align-center">
                            <span class="d-inline-block mr-2 flex-shrink-0" style="width: 16px; height: 0px; border-top: 2.5px dashed #1a237e;"></span>
                            <span>WT 2 SHIFT</span>
                          </div>
                        </td>
                        <td v-for="m in lineDetailData.machines" :key="'wt2'+m.machine" class="text-center">{{ m.wt_2_shift || '-' }}</td>
                      </tr>
                      <tr>
                        <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important; width: 156px; min-width: 156px; max-width: 156px;">
                          <div class="d-flex align-center">
                            <span class="d-inline-block mr-2 flex-shrink-0" style="width: 16px; height: 0px; border-top: 2.5px dashed #f44336;"></span>
                            <span>WT 2 SHIFT + PJK 1S</span>
                          </div>
                        </td>
                        <td v-for="m in lineDetailData.machines" :key="'wt2pjk1s'+m.machine" class="text-center">{{ m.wt_2_shift_pjk1s !== undefined ? m.wt_2_shift_pjk1s : (m.wt_2_shift_pjk || '-') }}</td>
                      </tr>
                      <tr>
                        <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important; width: 156px; min-width: 156px; max-width: 156px;">
                          <div class="d-flex align-center">
                            <span class="d-inline-block mr-2 flex-shrink-0" style="width: 16px; height: 0px; border-top: 2.5px dashed #f44336;"></span>
                            <span>WT 2 SHIFT + PJK 2S</span>
                          </div>
                        </td>
                        <td v-for="m in lineDetailData.machines" :key="'wt2pjk2s'+m.machine" class="text-center">{{ m.wt_2_shift_pjk2s !== undefined ? m.wt_2_shift_pjk2s : '-' }}</td>
                      </tr>
                      <tr>
                        <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important; width: 156px; min-width: 156px; max-width: 156px;">WORKING DAY</td>
                        <td v-for="m in lineDetailData.machines" :key="'wday'+m.machine" class="text-center">{{ m.working_day !== undefined ? m.working_day : '-' }}</td>
                      </tr>
                      <tr>
                        <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important; width: 156px; min-width: 156px; max-width: 156px;">MP</td>
                        <td v-for="m in lineDetailData.machines" :key="'mp'+m.machine" class="text-center">{{ m.mp !== undefined ? m.mp : '-' }}</td>
                      </tr>
                      <tr>
                        <td class="font-weight-bold bg-grey-lighten-4" style="position: sticky; left: 0px; z-index: 5; background-color: #f1f5f9 !important; border-right: 2px solid #94a3b8 !important; width: 156px; min-width: 156px; max-width: 156px;">JUMLAH ITEM</td>
                        <td v-for="m in lineDetailData.machines" :key="'item'+m.machine" class="text-center">{{ m.item !== undefined ? m.item : '-' }}</td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </v-card>
            </div>
            
            <div v-else class="text-center text-grey py-6">
              Silakan pilih Line terlebih dahulu untuk melihat detailnya.
            </div>
          </v-card>

          <!-- CARD TERPISAH: DETAIL SCHEDULE PART LINE -->
          <v-card v-if="lineDetailData && lineDetailData.machines && lineDetailData.machines.length > 0" class="pa-5 rounded-xl mb-6 elevation-2 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
            <div class="d-flex justify-space-between align-center mb-4">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="primary" size="24">mdi-format-list-bulleted-square</v-icon>
                <span class="text-h6 text-primary font-weight-bold">Detail Schedule Part Line {{ selectedLine }}</span>
              </div>
              <v-btn
                v-if="!showLinePartDetail"
                color="primary"
                variant="flat"
                @click="loadLinePartDetail"
                prepend-icon="mdi-eye"
                size="small"
              >
                Lihat Detail Part
              </v-btn>
              <v-btn
                v-else
                color="grey"
                variant="outlined"
                @click="showLinePartDetail = false"
                prepend-icon="mdi-eye-off"
                size="small"
              >
                Sembunyikan
              </v-btn>
            </div>

            <div v-if="showLinePartDetail">
              <div v-if="partLoading" class="d-flex justify-center align-center py-6">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
              </div>
              
              <div v-else class="mt-2">
                <v-table density="compact" class="custom-table text-body-2 border rounded-lg overflow-hidden elevation-1" fixed-header height="550px">
                  <thead>
                    <tr style="background-color: #eef2f7;">
                      <th class="text-center font-weight-bold" style="min-width: 100px;">Mesin</th>
                      <th class="text-center font-weight-bold" style="width: 50px;">No</th>
                      <th v-for="col in detailHeaders" :key="col.key" class="text-left font-weight-bold" style="white-space: nowrap;">
                        <v-menu :close-on-content-click="false" location="bottom start">
                          <template v-slot:activator="{ props }">
                            <div class="d-inline-flex align-center cursor-pointer select-none" v-bind="props">
                              <span>{{ col.title }}</span>
                              <v-icon size="14" class="ml-1" :color="isDetailFilterActive(col.key) || detailSortKey === col.key ? 'primary' : 'grey-lighten-1'">
                                {{ detailSortKey === col.key ? (detailSortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-filter-variant' }}
                              </v-icon>
                            </div>
                          </template>

                          <v-card width="250" class="pa-2 rounded-lg text-black">
                            <v-list density="compact" class="pa-0">
                              <v-list-item prepend-icon="mdi-sort-ascending" title="Sort A to Z / Ascending" @click="setDetailSort(col.key, 'asc')" />
                              <v-list-item prepend-icon="mdi-sort-descending" title="Sort Z to A / Descending" @click="setDetailSort(col.key, 'desc')" />
                            </v-list>
                            <v-divider class="my-1" />
                            
                            <v-text-field
                              v-model="detailSearchQueries[col.key]"
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
                                :model-value="isAllDetailItemsChecked(lineDetailData.parts, col.key)"
                                @click="toggleDetailSelectAll(lineDetailData.parts, col.key)"
                                class="ma-0 pa-0"
                              />
                              <v-checkbox
                                v-for="item in getDetailFilteredUniqueItems(lineDetailData.parts, col.key)"
                                :key="item"
                                :label="item || '-'"
                                :value="item"
                                v-model="detailCheckedFilters[col.key]"
                                density="compact"
                                hide-details
                                class="ma-0 pa-0"
                              />
                            </div>
                            
                            <v-card-actions class="justify-end pa-0 mt-2">
                              <v-btn size="x-small" variant="text" color="grey" @click="clearSingleDetailFilter(col.key)">Reset</v-btn>
                            </v-card-actions>
                          </v-card>
                        </v-menu>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="m in lineDetailData.machines" :key="'grp-line-'+m.machine">
                      <template v-if="getPartsForMachine(lineDetailData.parts, m.machine).length > 0">
                        <tr
                          v-for="(p, pIdx) in getPartsForMachine(lineDetailData.parts, m.machine)"
                          :key="p.id || pIdx"
                          :class="{'bg-grey-lighten-5': pIdx % 2 === 1}"
                        >
                          <td class="text-center font-weight-bold text-primary">{{ m.machine }}</td>
                          <td class="text-center text-grey-darken-1">{{ pIdx + 1 }}</td>
                          <td class="text-center font-weight-bold text-indigo">{{ (p as any).urutan !== undefined && (p as any).urutan !== null && (p as any).urutan !== '' && (p as any).urutan !== 0 ? (p as any).urutan : '-' }}</td>
                          <td class="font-weight-bold text-primary" style="font-size: 13px; white-space: nowrap;">
                            {{ p.part_number }}
                          </td>
                          <td class="text-center font-weight-medium">{{ p.job_number || '-' }}</td>
                          <td class="text-center">{{ p.total_proses || '-' }}</td>
                          <td class="text-left" style="white-space: nowrap;">{{ p.part_name || '-' }}</td>
                          <td class="text-center font-weight-medium">{{ p.process || '-' }}</td>
                          <td class="text-center font-weight-bold text-success" style="white-space: nowrap;">{{ (p as any).time_proc_start || '-' }}</td>
                          <td class="text-center font-weight-bold text-error" style="white-space: nowrap;">{{ (p as any).time_proc_end || '-' }}</td>
                          <td class="text-center font-weight-bold text-indigo" style="white-space: nowrap;">{{ (p as any).time_proc_start_shift2 || '-' }}</td>
                          <td class="text-center font-weight-bold text-deep-orange" style="white-space: nowrap;">{{ (p as any).time_proc_end_shift2 || '-' }}</td>
                          <td class="text-right">{{ p.qty_kanban || '0' }}</td>
                          <td class="text-right">{{ p.qty_pallet || '-' }}</td>
                          <td class="text-right font-weight-medium">{{ p.count_pallet !== undefined && p.count_pallet !== null && p.count_pallet !== '' && p.count_pallet !== '0.00' ? Number(p.count_pallet).toFixed(1) : (Number(p.qty_kanban) > 0 && Number(p.lot_size_shift) > 0 ? (Number(p.lot_size_shift) / Number(p.qty_kanban)).toFixed(1) : '0') }}</td>
                          <td class="text-right font-weight-bold cursor-pointer text-primary" @click="openPcsDayDetailModal(p)" title="Klik untuk melihat rincian Pcs/Day (Part Delivery)"><span>{{ p.pcs_day || p.pcs_day_monthly || '0' }}</span><v-icon size="12" color="primary" class="ml-1 opacity-60">mdi-information-outline</v-icon></td>
                          <td class="text-right">{{ p.pcs_day_prev !== undefined && p.pcs_day_prev !== null && p.pcs_day_prev !== '' ? p.pcs_day_prev : '-' }}</td>
                          <td class="text-right">{{ p.stroke_day || p.stroke || '0' }}</td>
                          <td class="text-center font-weight-bold text-primary">{{ p.machine_use || p.machine || '-' }}</td>
                          <td class="text-center">
                            <span v-if="p.machine_prev && p.machine_prev !== (p.machine_use || p.machine)" class="font-weight-medium text-amber-darken-3">
                              {{ p.machine_prev }}
                            </span>
                            <span v-else class="text-grey-darken-1">-</span>
                          </td>
                          <td class="text-center">{{ p.next_process || '-' }}</td>
                          <td class="text-center">{{ p.lot_cycle || '1' }}</td>
                          <td class="text-center font-weight-medium">{{ p.patan || (Number(p.lot_cycle) <= 1 ? 'A B C D' : 'A C') }}</td>
                          <td class="text-right">{{ p.lot_size_shift || '0' }}</td>
                          <td class="text-center">{{ p.cycle_time_sec || '0' }}</td>
                          <td class="text-center">{{ p.jig || '-' }}</td>
                          <td class="text-right">{{ p.jumlah_spot ?? '-' }}</td>
                          <td class="text-right">{{ p.freq_dresser ?? '-' }}</td>
                          <td class="text-right">{{ p.freq_tip_change ?? '-' }}</td>
                          <td class="text-right">{{ p.dandori || '0' }}</td>
                          <td class="text-right">{{ p.downtime || '0' }}</td>
                          <td class="text-right">{{ p.prod_time || '0' }}</td>
                          <td class="text-right font-weight-bold text-primary">{{ p.tpt ? Number(p.tpt).toFixed(1) : '0' }}</td>
                          <td class="text-right">{{ p.uph || '0' }}</td>
                          <td class="text-center">
                            <v-btn size="x-small" color="info" variant="flat" prepend-icon="mdi-information-outline" class="font-weight-bold" @click="openStatusPatanDetailModal(p)">Detail</v-btn>
                          </td>
                        </tr>
                      </template>
                    </template>
                  </tbody>
                </v-table>
              </div>
            </div>
          </v-card>

          <!-- CARD TERPISAH: DETAIL SCHEDULE PART PER PATAN LINE -->
          <v-card v-if="lineDetailData && lineDetailData.machines && lineDetailData.machines.length > 0" class="pa-5 rounded-xl mb-6 elevation-2 border" style="border-radius: 14px !important; border-top: 4px solid #0345a1 !important;">
            <div class="d-flex justify-space-between align-center mb-4">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="primary" size="24">mdi-calendar-sync-outline</v-icon>
                <span class="text-h6 text-primary font-weight-bold">Detail Schedule Part Per Patan Line {{ selectedLine }}</span>
              </div>
            </div>

            <!-- Tabs Bar -->
            <div class="d-flex flex-wrap align-center justify-space-between mb-3 border-b bg-grey-lighten-5 pa-2 rounded-xl gap-2">
              <v-tabs v-model="activePatanTab" density="compact" color="primary">
                <v-tab value="A">PATAN A ({{ patanLineData.summary.patan_a_count || 0 }})</v-tab>
                <v-tab value="B">PATAN B ({{ patanLineData.summary.patan_b_count || 0 }})</v-tab>
                <v-tab value="C">PATAN C ({{ patanLineData.summary.patan_c_count || 0 }})</v-tab>
                <v-tab value="D">PATAN D ({{ patanLineData.summary.patan_d_count || 0 }})</v-tab>
                <v-tab value="ALL">Semua Part ({{ patanLineData.summary.total_parts || 0 }})</v-tab>
              </v-tabs>
            </div>

            <!-- Filter Guidance & Global Search Bar -->
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="text-caption text-grey d-flex align-center">
                <v-icon size="16" class="mr-1">mdi-filter-cog</v-icon>
                <span>Klik judul kolom pada tabel untuk memfilter / mengurutkan data.</span>
                <v-btn v-if="isAnyPatanExcelFilterActive" size="x-small" color="red" variant="text" class="ml-2 text-none" @click="resetAllPatanExcelFilters">
                  Reset Semua Filter Kolom
                </v-btn>
              </div>
              <div style="width: 300px;">
                <v-text-field
                  v-model="patanSearchQuery"
                  placeholder="Cari data global..."
                  density="compact"
                  variant="outlined"
                  hide-details
                  prepend-inner-icon="mdi-magnify"
                  clearable
                />
              </div>
            </div>

            <!-- Data Table with Header Sorting & Menu Filtering -->
            <v-data-table
              :headers="currentPatanLineHeaders"
              :items="currentPatanList"
              :loading="patanLineLoading"
              density="compact"
              class="elevation-1 rounded-xl patan-table text-body-2"
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
                    <v-menu :close-on-content-click="false" location="bottom start" transition="scale-transition">
                      <template v-slot:activator="{ props }">
                        <div v-bind="props" class="header-inner d-flex align-center justify-center cursor-pointer select-none py-1 hover-header">
                          <span :class="{'text-primary font-weight-bold': isPatanExcelFilterActive(col.key || '')}">
                            {{ col.title }}
                          </span>
                          <v-icon size="14" class="ml-1" :color="isPatanExcelFilterActive(col.key || '') || patanSortKey === col.key ? 'primary' : 'grey-lighten-1'">
                            {{ patanSortKey === col.key ? (patanSortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-filter-variant' }}
                          </v-icon>
                        </div>
                      </template>

                      <v-card width="250" class="pa-2 rounded-lg text-black">
                        <v-list density="compact" class="pa-0">
                          <v-list-item prepend-icon="mdi-sort-ascending" title="Sort A to Z / Ascending" @click="setPatanExcelSort(col.key || '', 'asc')" />
                          <v-list-item prepend-icon="mdi-sort-descending" title="Sort Z to A / Descending" @click="setPatanExcelSort(col.key || '', 'desc')" />
                        </v-list>
                        <v-divider class="my-1" />
                        
                        <v-text-field
                          v-model="patanSearchQueries[col.key || '']"
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
                            :model-value="isAllPatanExcelItemsChecked(col.key || '')"
                            @click="togglePatanExcelSelectAll(col.key || '')"
                            class="ma-0 pa-0"
                          />
                          <v-checkbox
                            v-for="item in getPatanExcelUniqueItems(col.key || '')"
                            :key="item"
                            :label="item || '-'"
                            :value="item"
                            v-model="patanCheckedFilters[col.key || '']"
                            density="compact"
                            hide-details
                            class="ma-0 pa-0"
                          />
                        </div>
                        
                        <v-card-actions class="justify-end pa-0 mt-2">
                          <v-btn size="x-small" variant="text" color="grey" @click="clearSinglePatanExcelFilter(col.key || '')">Reset</v-btn>
                        </v-card-actions>
                      </v-card>
                    </v-menu>
                  </th>
                </tr>
              </template>

              <template #item="{ item }">
                <tr class="hover-row text-body-2 text-black" style="color: #000000 !important;">
                  <td class="text-center font-weight-bold">{{ item.urutan || item.urutan_simulasi || item.urutan_priority || '-' }}</td>
                  <td class="text-start font-weight-bold">{{ item.part_number }}</td>
                  <td class="text-start">{{ item.job_number || '-' }}</td>
                  <td class="text-start">{{ item.part_name || '-' }}</td>
                  <td class="text-center">
                    <span>{{ item.model || '-' }}</span>
                  </td>
                  <td class="text-center font-weight-medium">
                    <span>{{ item.machine || '-' }}</span>
                  </td>
                  <td class="text-center">{{ item.process || item.op || '-' }}</td>
                  <td v-if="activePatanTab === 'A' || activePatanTab === 'C' || activePatanTab === 'ALL'" class="text-center font-weight-medium" style="white-space: nowrap;">{{ item.time_proc_start || '-' }}</td>
                  <td v-if="activePatanTab === 'A' || activePatanTab === 'C' || activePatanTab === 'ALL'" class="text-center font-weight-medium" style="white-space: nowrap;">{{ item.time_proc_end || '-' }}</td>
                  <td v-if="activePatanTab === 'B' || activePatanTab === 'D' || activePatanTab === 'ALL'" class="text-center font-weight-medium" style="white-space: nowrap;">{{ item.time_proc_start_shift2 || '-' }}</td>
                  <td v-if="activePatanTab === 'B' || activePatanTab === 'D' || activePatanTab === 'ALL'" class="text-center font-weight-medium" style="white-space: nowrap;">{{ item.time_proc_end_shift2 || '-' }}</td>
                  <td class="text-center font-weight-medium">{{ item.lot_cycle || '1' }}</td>
                  <td class="text-center font-weight-medium">
                    <span>{{ item.patan || (Number(item.lot_cycle) <= 1 ? 'A B C D' : 'A C') }}</span>
                  </td>
                  <td class="text-end">{{ item.qty_kanban || '0' }}</td>
                  <td class="text-end">{{ item.qty_pallet || '-' }}</td>
                  <td class="text-end font-weight-medium">{{ item.count_pallet !== undefined && item.count_pallet !== null && item.count_pallet !== '' && item.count_pallet !== '0.00' ? Number(item.count_pallet).toFixed(1) : (Number(item.qty_kanban) > 0 && Number(item.lot_size_shift) > 0 ? (Number(item.lot_size_shift) / Number(item.qty_kanban)).toFixed(1) : '0') }}</td>
                  <td class="text-end font-weight-bold cursor-pointer" @click="openPcsDayDetailModal(item)" title="Klik untuk melihat rincian Pcs/Day (Part Delivery)"><span>{{ item.pcs_day || '0' }}</span><v-icon size="12" class="ml-1 opacity-60">mdi-information-outline</v-icon></td>
                  <td class="text-end font-weight-medium">{{ item.lot_size_shift || '0' }}</td>
                  <td class="text-center">{{ item.cycle_time_sec || '0' }}</td>
                  <td class="text-end font-weight-bold">{{ item.tpt_menit !== undefined ? Number(item.tpt_menit).toFixed(1) : (item.tpt ? Number(item.tpt).toFixed(1) : '0') }}</td>
                  <td class="text-center">
                    <v-btn size="x-small" color="primary" variant="flat" prepend-icon="mdi-information-outline" class="font-weight-bold" @click="openStatusPatanDetailModal(item)">Detail</v-btn>
                  </td>
                </tr>
              </template>
            </v-data-table>
          </v-card>
        </v-window-item>
      </v-window>
    </div>

    <!-- Approval Modal -->
    <v-dialog v-model="isApprovalModalOpen" max-width="800">
      <v-card class="rounded-xl overflow-hidden" style="border-radius: 14px !important;">
        <v-card-title class="text-h5 bg-primary text-white">
          {{ approvalAction === 'APPROVE' ? 'Approve Simulation' : 'Reject Simulation' }}
        </v-card-title>
        <v-card-text class="pt-4">
          <div class="text-subtitle-1 mb-2 font-weight-bold">
            Berikan catatan tambahan (opsional):
          </div>
          <div style="height: 300px; margin-bottom: 50px;">
            <QuillEditor theme="snow" v-model:content="approvalNotes" contentType="html" />
          </div>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="isApprovalModalOpen = false">Batal</v-btn>
          <v-btn :color="approvalAction === 'APPROVE' ? 'success' : 'error'" variant="flat" @click="submitApproval">
            Konfirmasi {{ approvalAction === 'APPROVE' ? 'Approve' : 'Reject' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>

    <!-- Dialog Detail Asal-Usul Pcs/Day (Breakdown Part Delivery) -->
    <v-dialog v-model="isPcsDayDetailModalOpen" max-width="700px">
      <v-card class="rounded-xl overflow-hidden" style="border-radius: 14px !important;">
        <v-card-title class="bg-primary text-white d-flex justify-space-between align-center py-1.5 px-4" style="background-color: rgb(3, 69, 161) !important; min-height: 36px;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white">mdi-information-outline</v-icon>
            <span class="text-subtitle-1 font-weight-bold">Detail Asal-Usul Pcs/Day (Breakdown Part Delivery / Parent)</span>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" @click="isPcsDayDetailModalOpen = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-5">
          <div v-if="pcsDayDetailData" class="mb-4 bg-grey-lighten-4 pa-3 rounded border">
            <v-row density="compact">
              <v-col cols="12" sm="4">
                <div class="text-caption text-grey-darken-1">Part Number</div>
                <div class="font-weight-bold text-subtitle-1 text-primary">{{ formatPartNumber(pcsDayDetailData.part_number) }}</div>
              </v-col>
              <v-col cols="12" sm="4">
                <div class="text-caption text-grey-darken-1">Part Name / Model</div>
                <div class="font-weight-medium">{{ pcsDayDetailData.part_name }} ({{ pcsDayDetailData.model }})</div>
              </v-col>
              <v-col cols="12" sm="4">
                <div class="text-caption text-grey-darken-1">Periode Pcs/Day</div>
                <div class="font-weight-bold text-teal-darken-2">{{ formatPeriodeBulanTahun(pcsDayDetailData.spmon) }}</div>
              </v-col>
            </v-row>
          </div>

          <div v-if="pcsDayDetailLoading" class="text-center py-6">
            <v-progress-circular indeterminate color="primary" size="36"></v-progress-circular>
            <div class="text-caption text-grey-darken-1 mt-2">Memuat rincian part delivery...</div>
          </div>

          <div v-else-if="pcsDayDetailData && pcsDayDetailData.parents_detail && pcsDayDetailData.parents_detail.length > 0">
            <div class="text-subtitle-2 font-weight-bold mb-2 text-grey-darken-3">
              Daftar Part Number Delivery (Parent Part):
            </div>
            <v-table density="compact" class="border rounded custom-table">
              <thead>
                <tr style="background-color: #eef2f7;">
                  <th class="text-center font-weight-bold" style="width: 50px;">No</th>
                  <th class="text-left font-weight-bold">Part Number Delivery / Parent</th>
                  <th class="text-left font-weight-bold">Model (ZMODEL)</th>
                  <th class="text-left font-weight-bold">Customer</th>
                  <th class="text-right font-weight-bold">Pcs / Day</th>
                  <th class="text-right font-weight-bold">Kontribusi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, pIdx) in pcsDayDetailData.parents_detail" :key="pIdx">
                  <td class="text-center">{{ pIdx + 1 }}</td>
                  <td class="font-weight-bold text-primary">{{ p.part_number_delivery }}</td>
                  <td class="text-left font-weight-medium text-grey-darken-3">{{ p.zmodel || '-' }}</td>
                  <td class="text-left font-weight-medium text-grey-darken-3">{{ p.zcust || '-' }}</td>
                  <td class="text-right font-weight-bold">{{ Number(p.pcs_day).toLocaleString() }}</td>
                  <td class="text-right text-grey-darken-1">
                    {{ pcsDayDetailData.total_pcs_day > 0 ? ((Number(p.pcs_day) / pcsDayDetailData.total_pcs_day) * 100).toFixed(1) + '%' : '0%' }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="background-color: #f1f5f9;" class="font-weight-bold">
                  <td colspan="2" class="text-right">Total Pcs / Day:</td>
                  <td class="text-right text-primary" style="font-size: 13px;">{{ Number(pcsDayDetailData.total_pcs_day).toLocaleString() }}</td>
                  <td class="text-right text-primary">100%</td>
                </tr>
              </tfoot>
            </v-table>
          </div>

          <div v-else class="text-center py-6 text-grey">
            <v-icon size="40" color="grey-lighten-1" class="mb-2">mdi-alert-circle-outline</v-icon>
            <div>Tidak ada rincian Part Delivery yang terikat untuk part number ini.</div>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4 bg-grey-lighten-4 border-top justify-end">
          <v-btn color="primary" variant="flat" @click="isPcsDayDetailModalOpen = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Rincian Sub-Part (Status Patan DETAIL) -->
    <v-dialog v-model="isStatusPatanDetailModalOpen" max-width="1100px" scrollable>
      <v-card class="rounded-xl overflow-hidden" style="border-radius: 14px !important;">
        <v-card-title class="bg-primary text-white d-flex justify-space-between align-center py-2 px-4" style="background-color: rgb(3, 69, 161) !important; min-height: 42px;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white" size="20">mdi-layers-outline</v-icon>
            <span class="text-subtitle-1 font-weight-bold">Rincian Sub-Part Input (Status Patan: DETAIL)</span>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" density="compact" size="small" @click="isStatusPatanDetailModalOpen = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-4" style="max-height: 75vh;">
          <div v-if="statusPatanDetailItem" class="mb-4 bg-grey-lighten-4 pa-3 rounded border">
            <v-row density="compact">
              <v-col cols="12" sm="4">
                <div class="text-caption text-grey-darken-1 font-weight-bold">Part Number (MAIN)</div>
                <div class="font-weight-bold text-subtitle-2 text-black" style="color: #000000 !important;">{{ formatPartNumber(statusPatanDetailItem.part_number) }}</div>
              </v-col>
              <v-col cols="12" sm="3">
                <div class="text-caption text-grey-darken-1 font-weight-bold">Proses & Mesin</div>
                <div class="font-weight-medium text-body-2">
                  Proses {{ statusPatanDetailItem.process || '-' }} | <span class="font-weight-bold text-primary">{{ statusPatanDetailItem.machine_use || statusPatanDetailItem.machine || '-' }}</span>
                </div>
              </v-col>
              <v-col cols="12" sm="3">
                <div class="text-caption text-grey-darken-1 font-weight-bold">Part Name</div>
                <div class="font-weight-medium text-body-2 text-truncate">{{ statusPatanDetailItem.part_name || '-' }}</div>
              </v-col>
              <v-col cols="12" sm="2" class="text-sm-right d-flex align-center justify-sm-end">
                <v-chip color="info" size="small" variant="flat" class="font-weight-bold">
                  {{ statusPatanDetailList.length }} Sub-Part
                </v-chip>
              </v-col>
            </v-row>
          </div>

          <div v-if="statusPatanDetailLoading" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" size="40"></v-progress-circular>
            <div class="text-caption text-grey-darken-1 mt-2">Memuat rincian sub-part status DETAIL...</div>
          </div>

          <div v-else-if="statusPatanDetailList && statusPatanDetailList.length > 0">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-2 font-weight-bold text-grey-darken-3">
                Daftar Sub-Part Input (DETAIL):
              </div>
              <div class="text-caption text-grey-darken-1">
                *Baris-baris ini merupakan input aktual per item yang kemudian diagregasi menjadi 1 baris MAIN.
              </div>
            </div>
            
            <div style="overflow-x: auto;">
              <v-table density="compact" class="border rounded custom-table">
                <thead>
                  <tr style="background-color: #eef2f7;">
                    <th class="text-center font-weight-bold" style="width: 40px;">No</th>
                    <th class="text-left font-weight-bold">Part Number</th>
                    <th class="text-center font-weight-bold">Proses</th>
                    <th class="text-right font-weight-bold">Pcs / Day</th>
                    <th class="text-right font-weight-bold">Qty Kbn</th>
                    <th class="text-center font-weight-bold">Lot Cycle</th>
                    <th class="text-right font-weight-bold">Lotsize/Shift</th>
                    <th class="text-right font-weight-bold">Pallet</th>
                    <th class="text-right font-weight-bold">CT (s)</th>
                    <th class="text-right font-weight-bold">Prod Time (m)</th>
                    <th class="text-right font-weight-bold">Dandori (m)</th>
                    <th class="text-right font-weight-bold">Downtime (m)</th>
                    <th class="text-right font-weight-bold">TPT (m)</th>
                    <th class="text-right font-weight-bold">Stroke/Day</th>
                    <th class="text-center font-weight-bold">Patan</th>
                    <th class="text-center font-weight-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(sub, sIdx) in statusPatanDetailList" :key="sIdx">
                    <td class="text-center">{{ sIdx + 1 }}</td>
                    <td class="text-left font-weight-bold text-black" style="white-space: nowrap; color: #000000 !important;">
                      {{ formatPartNumber(sub.part_number) }}
                    </td>
                    <td class="text-center">{{ sub.process || '-' }}</td>
                    <td class="text-right font-weight-medium">{{ Number(sub.pcs_day || 0).toLocaleString() }}</td>
                    <td class="text-right">{{ sub.qty_kanban || sub.qty_kbn || '-' }}</td>
                    <td class="text-center">{{ sub.lot_cycle || '1' }}</td>
                    <td class="text-right font-weight-medium">{{ Number(sub.lot_size_shift || 0).toLocaleString() }}</td>
                    <td class="text-right">{{ sub.count_pallet || '0' }}</td>
                    <td class="text-right">{{ sub.cycle_time_sec || '0' }}</td>
                    <td class="text-right font-weight-medium">{{ Number(sub.prod_time || 0).toFixed(2) }}</td>
                    <td class="text-right text-grey-darken-1">{{ Number(sub.dandori || 0).toFixed(2) }}</td>
                    <td class="text-right text-grey-darken-1">{{ Number(sub.downtime || 0).toFixed(2) }}</td>
                    <td class="text-right font-weight-bold">{{ Number(sub.tpt || sub.prod_time || 0).toFixed(2) }}</td>
                    <td class="text-right">{{ Number(sub.stroke_day || 0).toLocaleString() }}</td>
                    <td class="text-center">{{ sub.patan || '-' }}</td>
                    <td class="text-center">
                      <v-chip size="x-small" color="teal" variant="flat" class="font-weight-bold">
                        {{ sub.status_patan || 'DETAIL' }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style="background-color: #f1f5f9;" class="font-weight-bold">
                    <td colspan="3" class="text-right">Total Sub-Part:</td>
                    <td class="text-right font-weight-bold">{{ statusPatanDetailList.reduce((acc, c) => acc + (Number(c.pcs_day) || 0), 0).toLocaleString() }}</td>
                    <td colspan="2"></td>
                    <td class="text-right font-weight-bold">{{ statusPatanDetailList.reduce((acc, c) => acc + (Number(c.lot_size_shift) || 0), 0).toLocaleString() }}</td>
                    <td></td>
                    <td></td>
                    <td class="text-right font-weight-bold">{{ statusPatanDetailList.reduce((acc, c) => acc + (Number(c.prod_time) || 0), 0).toFixed(2) }}</td>
                    <td colspan="2"></td>
                    <td class="text-right font-weight-bold">{{ statusPatanDetailList.reduce((acc, c) => acc + (Number(c.tpt || c.prod_time) || 0), 0).toFixed(2) }}</td>
                    <td class="text-right">{{ statusPatanDetailList.reduce((acc, c) => acc + (Number(c.stroke_day) || 0), 0).toLocaleString() }}</td>
                    <td colspan="2"></td>
                  </tr>
                </tfoot>
              </v-table>
            </div>
          </div>

          <div v-else class="text-center py-8 text-grey">
            <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-layers-off</v-icon>
            <div class="text-subtitle-2 font-weight-medium">Tidak ada rincian sub-part DETAIL terpisah untuk item ini.</div>
            <div class="text-caption text-grey-darken-1 mt-1">Item ini merupakan part tunggal yang langsung diproses di mesin.</div>
          </div>
        </v-card-text>

        <v-card-actions class="pa-3 bg-grey-lighten-4 border-top justify-end">
          <v-btn color="primary" variant="flat" @click="isStatusPatanDetailModalOpen = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL ALASAN & DIAGNOSTIK BALANCING MESIN -->
    <v-dialog v-model="isBalancingExplanationModalOpen" max-width="1250px" width="95vw" scrollable>
      <v-card class="rounded-xl overflow-hidden elevation-6">
        <!-- Header: Uniform Dark Blue (#0345a1) -->
        <v-card-title class="py-1.5 px-4 d-flex justify-space-between align-center text-white" style="background-color: rgb(3, 69, 161) !important; min-height: 42px;">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white" size="20">mdi-clipboard-text-search-outline</v-icon>
            <span class="text-subtitle-1 font-weight-bold">Analisis &amp; Alasan Distribusi Beban Mesin</span>
          </div>
          <v-btn icon="mdi-close" variant="text" density="compact" color="white" @click="isBalancingExplanationModalOpen = false"></v-btn>
        </v-card-title>

        <v-card-text class="pa-4 bg-grey-lighten-4">
          <!-- STAT SUMMARY CARDS -->
          <v-row dense class="mb-3">
            <v-col cols="12" sm="4">
              <v-card
                class="pa-3 rounded-lg border bg-white elevation-1"
                style="border-radius: 10px !important; border-top: 4px solid #0345a1 !important;"
              >
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <div class="text-caption text-grey-darken-2 font-weight-bold">Mesin Overload (&gt; 16 Jam)</div>
                    <div class="text-h5 font-weight-black text-grey-darken-4 mt-0.5">{{ diagnosticsStats.overload }} Mesin</div>
                  </div>
                  <v-icon size="28" color="error">mdi-alert-octagon-outline</v-icon>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="4">
              <v-card
                class="pa-3 rounded-lg border bg-white elevation-1"
                style="border-radius: 10px !important; border-top: 4px solid #0345a1 !important;"
              >
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <div class="text-caption text-grey-darken-2 font-weight-bold">Mesin Low-Load (&lt; 8 Jam)</div>
                    <div class="text-h5 font-weight-black text-grey-darken-4 mt-0.5">{{ diagnosticsStats.underload }} Mesin</div>
                  </div>
                  <v-icon size="28" color="warning">mdi-clock-fast</v-icon>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="4">
              <v-card
                class="pa-3 rounded-lg border bg-white elevation-1"
                style="border-radius: 10px !important; border-top: 4px solid #0345a1 !important;"
              >
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <div class="text-caption text-grey-darken-2 font-weight-bold">Mesin Standar (8 - 16 Jam)</div>
                    <div class="text-h5 font-weight-black text-grey-darken-4 mt-0.5">{{ diagnosticsStats.normal }} Mesin</div>
                  </div>
                  <v-icon size="28" color="success">mdi-check-circle-outline</v-icon>
                </div>
              </v-card>
            </v-col>
          </v-row>

          <!-- SEARCH & COUNT -->
          <div class="d-flex justify-space-between align-center mb-2 px-1">
            <span class="text-caption font-weight-bold text-grey-darken-2">
              Daftar Evaluasi Mesin ({{ filteredDiagnostics.length }} Mesin)
            </span>
            <v-text-field
              v-model="diagnosticsSearch"
              placeholder="Cari mesin, line, tipe nut, alasan..."
              prepend-inner-icon="mdi-magnify"
              density="compact"
              variant="outlined"
              bg-color="white"
              hide-details
              style="max-width: 300px;"
              clearable
            ></v-text-field>
          </div>

          <!-- TABLE DIAGNOSTIK MESIN -->
          <v-card class="border rounded-lg bg-white elevation-1 overflow-hidden">
            <div v-if="store.diagnosticsLoading" class="d-flex justify-center align-center py-10">
              <v-progress-circular indeterminate color="primary" size="36"></v-progress-circular>
              <span class="ml-3 text-caption font-weight-bold text-grey-darken-1">Memuat data analisis mesin...</span>
            </div>
            <div v-else class="overflow-x-auto">
              <v-table density="compact" class="custom-table text-caption" height="460px" fixed-header style="white-space: normal;">
                <thead>
                  <tr style="background-color: #f1f5f9;">
                    <th class="font-weight-bold text-center" style="width: 100px; min-width: 90px;">Mesin &amp; Line</th>
                    <th class="font-weight-bold text-center" style="width: 110px; min-width: 100px;">Beban (TPT)</th>
                    <th class="font-weight-bold text-left" style="width: 180px; min-width: 160px;">Spesifikasi Mesin</th>
                    <th class="font-weight-bold text-left" style="min-width: 300px;">Alasan Distribusi Beban</th>
                    <th class="font-weight-bold text-left" style="min-width: 250px;">Saran / Solusi Operasional</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="filteredDiagnostics.length === 0">
                    <td colspan="5" class="text-center py-6 text-grey">Tidak ada data mesin yang sesuai filter.</td>
                  </tr>
                  <tr v-for="d in filteredDiagnostics" :key="d.machine">
                    <!-- Mesin & Line -->
                    <td class="text-center font-weight-bold">
                      <div class="text-subtitle-2 font-weight-black text-grey-darken-4">{{ d.machine }}</div>
                      <v-chip size="x-small" color="grey-darken-2" variant="tonal" class="mt-0.5 font-weight-medium">Line {{ d.line }}</v-chip>
                    </td>

                    <!-- Beban TPT -->
                    <td class="text-center">
                      <div class="font-weight-black text-grey-darken-4" style="font-size: 13px;">
                        {{ Number(d.tpt).toFixed(1) }} jam
                      </div>
                      <div class="text-caption text-grey-darken-1 mt-0.5" style="font-size: 10px;">{{ d.parts_count }} Part</div>
                    </td>

                    <!-- Spesifikasi Mesin -->
                    <td class="text-caption">
                      <div><strong>Nut:</strong> <span class="text-grey-darken-4 font-weight-bold">{{ d.spec?.nut_desc || '-' }}</span></div>
                      <div><strong>kVA:</strong> {{ d.spec?.kva || '-' }} | <strong>Holder:</strong> {{ d.spec?.upper_holder || '-' }}</div>
                      <div><strong>Feeder:</strong> {{ d.spec?.nut_feeder }} | <strong>Rotary:</strong> {{ d.spec?.rotary_holder }}</div>
                    </td>

                    <!-- Alasan Distribusi Beban -->
                    <td class="text-caption py-2">
                      <div v-if="d.status === 'overload'">
                        <div class="d-flex align-center gap-1 font-weight-bold mb-1">
                          <v-icon size="15" color="error">mdi-lock-outline</v-icon>
                          <span class="text-grey-darken-4">Mengapa Tidak Dipindah:</span>
                        </div>
                        <div class="text-grey-darken-3" style="line-height: 1.4;">
                          {{ d.why_not_moved }}
                        </div>
                      </div>
                      <div v-else-if="d.status === 'underload'">
                        <div class="d-flex align-center gap-1 font-weight-bold mb-1">
                          <v-icon size="15" color="warning">mdi-minus-circle-outline</v-icon>
                          <span class="text-grey-darken-4">Mengapa Tidak Mendapat Part:</span>
                        </div>
                        <div class="text-grey-darken-3" style="line-height: 1.4;">
                          {{ d.why_not_received }}
                        </div>
                      </div>
                      <div v-else>
                        <div v-if="d.is_ideal" class="d-flex align-center gap-1 font-weight-bold mb-1">
                          <v-icon size="15" color="success">mdi-check-decagram</v-icon>
                          <span class="text-grey-darken-4">Kapasitas Ideal (~{{ d.target_threshold || '8' }} Jam)</span>
                        </div>
                        <div v-else class="d-flex align-center gap-1 font-weight-bold mb-1">
                          <v-icon size="15" color="primary">mdi-scale-balance</v-icon>
                          <span class="text-grey-darken-4">Penyesuaian Beban Diperlukan</span>
                        </div>
                        <div class="text-grey-darken-2" style="line-height: 1.4;">
                          {{ d.why_not_moved }} {{ d.why_not_received }}
                        </div>
                      </div>
                    </td>

                    <!-- Saran / Solusi Operasional -->
                    <td class="text-caption py-2">
                      <div class="d-flex align-start gap-1">
                        <v-icon size="15" color="primary" class="mt-0.5">mdi-lightbulb-outline</v-icon>
                        <span class="text-grey-darken-3" style="line-height: 1.4;">{{ d.recommendation }}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-card>

          <!-- ACCORDION PANDUAN ATURAN SELEKSI MESIN -->
          <v-expansion-panels class="mt-3" variant="accordion">
            <v-expansion-panel class="border rounded-lg elevation-1">
              <v-expansion-panel-title class="py-2 text-caption font-weight-bold text-primary">
                <v-icon size="16" class="mr-2">mdi-book-open-page-variant-outline</v-icon>
                Panduan Aturan Seleksi Mesin (Standar Bisnis Welding GLC)
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-caption text-grey-darken-3">
                <p class="mb-2">Sistem Auto Balancing mengecek kelayakan mesin penerima secara <strong>berurutan</strong>. Jika salah satu syarat tidak terpenuhi, mesin langsung dicoret dari daftar kandidat:</p>
                <ol class="pl-4 mb-2">
                  <li><strong>1. Nut Type:</strong> Tipe dan ukuran nut pada mesin kandidat wajib identik dengan kebutuhan part.</li>
                  <li><strong>2. Daya kVA:</strong> Kapasitas daya kVA mesin kandidat harus mencukupi standar kVA proses part.</li>
                  <li><strong>3. Upper Holder:</strong> Jenis upper holder mesin (Lurus / Pelatuk) harus sesuai dengan part.</li>
                  <li><strong>4. Nut Feeder:</strong> Jumlah nut feeder pada mesin harus memenuhi kebutuhan proses.</li>
                  <li><strong>5. Rotary Holder:</strong> Kompatibilitas holder rotary (jika part membutuhkan rotary).</li>
                  <li><strong>6. Robo &amp; Handy:</strong> Ketersediaan alat bantu navigasi (Robo Navi / Handy Navi).</li>
                  <li><strong>7. Mesin Cadangan (Backup Machine):</strong> Jika seluruh syarat 1-6 terpenuhi, sistem memprioritaskan mesin yang telah terdaftar sebagai Backup Machine.</li>
                  <li><strong>8. Line Coherence &amp; Kapasitas 16 Jam:</strong> Seluruh proses dari satu part number harus berada di Line yang sama dan mesin tujuan tidak boleh melebihi batas kapasitas shift 16 jam.</li>
                </ol>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>

        <v-card-actions class="bg-white pa-3 border-t d-flex justify-end">
          <v-btn color="primary" variant="flat" size="small" @click="isBalancingExplanationModalOpen = false">Tutup Penjelasan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Part Movement History Modal -->
    <PartMovementHistoryModal
      v-model="isMovementHistoryOpen"
      :simulation-id="selectedSimulation?.header?.id"
      :loads-data="selectedSimulation?.loads"
    />
</template>

<style scoped>
:deep(.v-card),
.v-card {
  border-radius: 14px !important;
}

.custom-table :deep(table) {
  border-collapse: separate !important;
  border-spacing: 0 !important;
  border: 1.5px solid #94a3b8 !important;
}

.custom-table :deep(th) {
  background-color: #eef2f7 !important;
  color: #000000 !important;
  font-weight: bold !important;
  text-transform: uppercase;
  font-size: 11px !important;
  padding: 4px 6px !important;
  border-top: 1.5px solid #94a3b8 !important;
  border-bottom: 2px solid #94a3b8 !important;
  border-right: 1.5px solid #cbd5e1 !important;
  white-space: nowrap;
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

.hover-adjust-cell {
  transition: all 0.2s ease;
}

.hover-adjust-cell:hover {
  background-color: #e0f2fe !important;
  color: #0369a1 !important;
}

.hover-adjust-cell .edit-icon-hint {
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.hover-adjust-cell:hover .edit-icon-hint {
  opacity: 1;
  color: #0284c7 !important;
}

.spec-table {
  border-collapse: collapse !important;
  border: 1.5px solid #94a3b8 !important;
  width: 100%;
}

.spec-table :deep(th) {
  background-color: #eef2f7 !important;
  color: #000000 !important;
  font-weight: bold !important;
  text-transform: uppercase;
  font-size: 11px !important;
  padding: 4px 6px !important;
  border-bottom: 2px solid #94a3b8 !important;
  border-right: 1.5px solid #cbd5e1 !important;
  text-align: center !important;
}

.spec-table :deep(td) {
  padding: 4px 6px !important;
  font-size: 11px !important;
  border-bottom: 1.5px solid #cbd5e1 !important;
  border-right: 1.5px solid #cbd5e1 !important;
  vertical-align: middle !important;
  color: #000000 !important;
  text-align: center !important;
}

.patan-table :deep(th) {
  background-color: #eef2f7 !important;
  color: #333 !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  font-size: 11px !important;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.hover-row:hover {
  background-color: #f5f9ff !important;
}
.hover-header:hover {
  background-color: #e2e8f0;
  border-radius: 4px;
}
</style>
