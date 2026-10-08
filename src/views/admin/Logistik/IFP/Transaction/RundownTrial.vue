<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef, computed, watch, reactive } from 'vue';
import { useRundownStore } from '@/stores/Logistik/IFP/Transaction/RundownExcel';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TemplateCopyCard from '@/components/rundown/TemplateCopyCard.vue';
import { storeToRefs } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import Pagination from '@/components/table/Pagination.vue';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import axios from 'axios';
import apexchart from 'vue3-apexcharts';

type AnyObj = Record<string, any>;

const page = ref({ title: 'Rundown IFP-INHOUSE' });
const breadcrumbs = shallowRef([
  { title: 'Logistik', disabled: false, href: '#' },
  { title: 'IFP', disabled: false, href: '#' },
  { title: 'Transaction', disabled: false, href: '#' },
  { title: 'Rundown Trial', disabled: true, href: '#' }
]);

const rundownStore = useRundownStore();
const notificationStore = useNotificationStore();

const showExportDropdown = ref(false);
const showAchievementDropdown = ref(false);
const achievementDate = ref(new Date().toISOString().slice(0, 10));
const checkedPriorities = ref<string[]>([]);

const achievementDropdownRef = ref<HTMLElement | null>(null);

const downloadAchievementExcel = () => {
  if (!achievementDate.value) {
    notificationStore.showDialogError('Peringatan', 'Silakan pilih tanggal terlebih dahulu');
    return;
  }
  const url = `http://192.168.10.67/majsf_rest_api/api/achievement_report/excel?date=${achievementDate.value}`;
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `achievement_report_${achievementDate.value}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showAchievementDropdown.value = false;
};

const handleAchievementOutsideClick = (event: MouseEvent) => {
  if (achievementDropdownRef.value && !achievementDropdownRef.value.contains(event.target as Node)) {
    showAchievementDropdown.value = false;
  }
};
const downloadSelectedPriorities = () => {
  if (checkedPriorities.value.length === 0) {
    notificationStore.showDialogError('Peringatan', 'Silakan pilih kategori terlebih dahulu');
    return;
  }

  let errorCount = 0;

  checkedPriorities.value.forEach((type, index) => {
    // Memberikan jeda waktu (misal: 400ms dikali urutan indeks file)
    // File 1: langsung download (0ms)
    // File 2: delay 400ms
    // File 3: delay 800ms, dst.
    setTimeout(() => {
      try {
        const url = urlExport.value[type as keyof typeof urlExport.value];

        if (url) {
          // Menggunakan trik membuat element link bayangan agar langsung trigger download otomatis
          // tanpa membuka tab/jendela baru (_blank) yang memicu pop-up blocker
          const link = document.createElement('a');
          link.href = url;
          // Mengambil nama file dari bagian akhir url (opsional)
          link.setAttribute('download', `${type}_export`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          errorCount++;
          console.error(`URL untuk kategori ${type} kosong`);
        }
      } catch (error) {
        errorCount++;
        console.error(error);
      }
    }, index * 400); // 400ms jeda antar file aman dari deteksi blocker browser
  });

  // Tampilkan notifikasi jika ada url yang gagal setelah loop selesai
  setTimeout(() => {
    if (errorCount > 0) {
      notificationStore.showDialogError('Error', `Gagal mengunduh ${errorCount} file karena kendala tautan sistem`);
    }
  }, checkedPriorities.value.length * 400);
};

const { updateRundownExcelToDB, deleteRundownDB, fetchPartIFPTrial, fetchCustMdfo, generateSO, downloadIfpInhouse } = rundownStore;

const { dialog, urlExport, dataTable, customers, reportUrl, permissions, parts, pcsSummaryParts } = storeToRefs(rundownStore);

const month = ref('');
const isLoading = ref(true);
const weekOffset = ref(0);
const rowsOptions = [10, 25, 50, 100];

const customerWorkdays = ref<any[]>([]);
const defaultWorkdays = ref(5);
const loadingGenerate = ref(false);

const generateResult = ref({
  show: false,
  updated: [] as any[],
  notFound: [] as any[],
  totalUpdated: 0,
  totalNotFound: 0
});

const searchUpdated = ref('');
const searchNotFound = ref('');
const pcsDaySearch = ref('');

const result = computed(() => ({
  show: generateResult.value.show,
  total_updated: generateResult.value.totalUpdated,
  total_not_found: generateResult.value.totalNotFound,
  updatedFormatted: generateResult.value.updated || [],
  notFoundFormatted: generateResult.value.notFound || []
}));

const formatNumber = (val: number) => {
  return new Intl.NumberFormat('id-ID').format(Number(val || 0));
};

const closeGenerateResult = () => {
  generateResult.value.show = false;
};

const getStatusColor = (status: string) => {
  if (!status) return 'bg-gray-100 text-gray-800';

  const s = status.toLowerCase();
  if (
    s.includes('tidak ada di ms customer') ||
    s.includes('tidak ada di jadwal minggu') ||
    s.includes('customer tidak ada jadwal kerja') ||
    s.includes('customer tidak ada jadwal kerja di minggu ini')
  ) {
    return 'bg-red-100 text-red-800';
  }

  return 'bg-green-100 text-green-800';
};

const getStatusIcon = (status: string) => {
  if (!status) return '';

  const s = status.toLowerCase();
  if (
    s.includes('tidak ada di ms customer') ||
    s.includes('tidak ada di jadwal minggu') ||
    s.includes('customer tidak ada jadwal kerja') ||
    s.includes('customer tidak ada jadwal kerja di minggu ini')
  ) {
    return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
  }

  return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
};

const confirmDeleteRundown = async (location: any) => {
  await deleteRundownDB(location);
  dialog.value.deleteRundown = false;
};

const openGenerateModal = async () => {
  loadingGenerate.value = true;
  dialog.value.loading = true;

  try {
    const now = new Date();
    const monthValue = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    month.value = monthValue;

    const res = await fetchCustMdfo(monthValue, 'weekly');

    if (res && res.data && Array.isArray(res.data)) {
      customerWorkdays.value = res.data
        .filter((item: any) => item.zcust && item.zcust !== '')
        .map((item: any) => ({
          zcust: item.zcust,
          customer_name: item.nama_customer || item.zcust,
          workdays: item.total_workdays > 0 ? item.total_workdays : defaultWorkdays.value,
          status_keterangan: item.status_keterangan || 'Data tersedia'
        }))
        .sort((a: any, b: any) => (a.customer_name || '').localeCompare(b.customer_name || ''));
    } else {
      const map: Record<string, any> = {};
      const arr = Array.isArray(parts.value) ? parts.value : [];

      arr.forEach((item: any) => {
        if (item.DEST1 && !map[item.DEST1]) {
          map[item.DEST1] = {
            zcust: item.DEST1,
            customer_name: item.DEST1,
            workdays: defaultWorkdays.value,
            status_keterangan: 'Data tidak ditemukan di Master'
          };
        }
      });

      customerWorkdays.value = Object.values(map).sort((a: any, b: any) => (a.customer_name || '').localeCompare(b.customer_name || ''));
    }

    dialog.value.generateSO = true;
  } catch (error) {
    console.error('Error fetching customer data:', error);
    notificationStore.showDialogError('Error', 'Gagal memuat data customer');
  } finally {
    loadingGenerate.value = false;
    dialog.value.loading = false;
  }
};

const submitGenerateSO = async () => {
  for (const cust of customerWorkdays.value) {
    if (!cust.workdays || cust.workdays <= 0) {
      notificationStore.showDialogError('Error', `Workdays untuk ${cust.customer_name || cust.zcust} tidak valid`);
      return;
    }
  }

  loadingGenerate.value = true;
  dialog.value.generateSO = false;
  dialog.value.loading = true;

  try {
    const resultGenerate = await generateSO({
      customers: customerWorkdays.value,
      default_workdays: defaultWorkdays.value
    });

    if (resultGenerate) {
      generateResult.value = {
        show: true,
        updated: resultGenerate.updated || [],
        notFound: resultGenerate.not_found || [],
        totalUpdated: resultGenerate.updated?.length || 0,
        totalNotFound: resultGenerate.not_found?.length || 0
      };

      await fetchPartIFPTrial(weekOffset.value);

      notificationStore.showDialogSuccess('Success', 'Generate SO & Refresh Data Berhasil');
    }
  } catch (error) {
    console.error('Error generating SO:', error);
    notificationStore.showDialogError('Error', 'Gagal generate SO');
  } finally {
    loadingGenerate.value = false;
    dialog.value.loading = false;
  }
};

const exportIfpInhouseExcel = async () => {
  try {
    dialog.value.loading = true;

    // 1. Ambil periode (format YYYYMM)
    const period = month.value;

    // 2. Susun URL Langsung ke API
    // Kita tambahkan parameter period jika API mendukungnya
    const downloadUrl = `http://192.168.10.67/majsf_rest_api/api/inventory/download_ifp_inhouse?period=${period}`;

    // 3. Picu Download menggunakan window.location
    // Ini adalah cara paling stabil untuk file Excel berukuran besar
    window.location.href = downloadUrl;

    // 4. Berikan notifikasi sukses
    notificationStore.showDialogSuccess('Success', 'Proses unduhan dimulai...');
  } catch (err) {
    console.error('Export gagal:', err);
    notificationStore.showDialogError('Error', 'Gagal memicu unduhan file.');
  } finally {
    // Berikan jeda sedikit sebelum mematikan loading agar user tidak klik berkali-kali
    setTimeout(() => {
      dialog.value.loading = false;
    }, 1000);
  }
};

const weekKey = (label: string) => {
  return (
    'wf_' +
    String(label)
      .toLowerCase()
      .replace(/\+/g, 'plus')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
  );
};

/* =========================
   TABLE 1 - Rundown Summary
   ========================= */
const table1 = reactive({
  searchQuery: '',
  currentPage: 1,
  rowsPerPage: 10,
  sortColumn: '',
  sortDirection: 'asc' as 'asc' | 'desc',
  strengthFilter: '',
  destination: 'All'
});

const sortTable1 = (columnKey: string) => {
  if (table1.sortColumn === columnKey) {
    table1.sortDirection = table1.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    table1.sortColumn = columnKey;
    table1.sortDirection = 'asc';
  }
};

const filteredItems1 = computed(() => {
  let items = Array.isArray(dataTable.value) ? [...dataTable.value] : [];

  // 1. Filter Berdasarkan Search Query (Global)
  if (table1.searchQuery) {
    const query = table1.searchQuery.toLowerCase().trim();
    items = items.filter(
      (item: any) =>
        (item.MATNR && item.MATNR.toString().toLowerCase().includes(query)) ||
        (item.MAKTX && item.MAKTX.toString().toLowerCase().includes(query)) ||
        (item.project_id && item.project_id.toString().toLowerCase().includes(query)) ||
        (item.BISMT && item.BISMT.toString().toLowerCase().includes(query)) ||
        (item.ZROUTING && item.ZROUTING.toString().toLowerCase().includes(query))
    );
  }

  // 2. FILTER CUSTOMER (DIPERBAIKI: Hanya Filter Berdasarkan DEST1)
  if (table1.destination && table1.destination !== '' && table1.destination !== 'All') {
    items = items.filter((item: any) => item.DEST1 === table1.destination);
  }

  // 3. Logika Sorting (Tetap Sama)
  if (table1.sortColumn) {
    items.sort((a: any, b: any) => {
      let valA = a[table1.sortColumn] ?? '';
      let valB = b[table1.sortColumn] ?? '';

      const isNumber = !isNaN(parseFloat(valA)) && isFinite(valA) && !isNaN(parseFloat(valB)) && isFinite(valB);

      if (isNumber) {
        valA = Number(valA);
        valB = Number(valB);
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return table1.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return table1.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // 4. Filter Strength (Tetap Sama)
  if (table1.strengthFilter) {
    const limit = parseFloat(table1.strengthFilter);
    items = items.filter((item: any) => parseFloat(item.ZSTRENGTH || 0) < limit);
  }

  return items;
});

const paginatedItems1 = computed(() => {
  const start = (table1.currentPage - 1) * table1.rowsPerPage;
  return filteredItems1.value.slice(start, start + table1.rowsPerPage);
});

const totalPages1 = computed(() => Math.ceil(filteredItems1.value.length / table1.rowsPerPage));

watch([() => table1.searchQuery, () => table1.destination, () => table1.rowsPerPage], () => {
  table1.currentPage = 1;
});

/* =========================
   PCS/DAY SUMMARY
   ========================= */
const pcsWeekLabels = computed(() => {
  const arr = Array.isArray(pcsSummaryParts.value) ? pcsSummaryParts.value : [];
  const first = arr.find((p: any) => Array.isArray(p.weekly_forecast) && p.weekly_forecast.length);

  return first ? first?.weekly_forecast?.map((w: any) => String(w?.week_label || '').trim()).filter(Boolean) : [];
});

const dest1CustomerList = computed(() => {
  const arr = Array.isArray(dataTable.value) ? dataTable.value : [];

  // Mengambil data DEST1, bersihkan spasi kosong, lalu hilangkan duplikat menggunakan Set
  const uniqueCustomers = new Set(arr.map((item: any) => (item.DEST1 ? String(item.DEST1).trim() : '')).filter(Boolean));

  // Kembalikan dalam bentuk Array yang sudah diurutkan dari A-Z
  return Array.from(uniqueCustomers).sort();
});

const pcsDayHeaders = computed(() => {
  return [
    { title: 'Part Number', key: 'part_number', align: 'center' },
    { title: 'Part Name', key: 'part_name', align: 'center' },
    { title: 'Job Number', key: 'job_number', align: 'center' },
    ...(pcsWeekLabels.value || []).map((lbl: string) => ({
      title: lbl,
      key: weekKey(lbl),
      align: 'center',
      sortable: false
    }))
  ];
});

type PcsDayItem = {
  pcs_day_mdfo: number;
  pcs_day_dlv: number;
  freq_delivery: number;
  total_wd: number;
  part_number: any;
  part_name: any;
  job_number: any;
  project_id: any;
  [key: string]: any;
};

const pcsDayItems = computed<PcsDayItem[]>(() => {
  const wdMap: Record<string, number> = {};
  (customerWorkdays.value || []).forEach((x: any) => {
    const key = String(x.zcust || '')
      .trim()
      .toUpperCase();
    if (key) wdMap[key] = Number(x.workdays || 0);
  });

  return (pcsSummaryParts.value || []).map((p: any) => {
    const weeklyCols: Record<string, number> = {};

    pcsWeekLabels.value!.forEach((lbl: string) => {
      weeklyCols[weekKey(lbl)] = 0;
    });

    (p.weekly_forecast || []).forEach((w: any) => {
      const lbl = String(w?.week_label || '').trim();
      if (!lbl) return;

      const key = weekKey(lbl);
      if (Object.prototype.hasOwnProperty.call(weeklyCols, key)) {
        weeklyCols[key] = Number(w?.pcs_kanban_combined ?? w?.pcs_kanban ?? w?.pcs ?? 0);
      }
    });

    return {
      // ─── TAMBAHKAN BARIS INI AGAR DATA DEST1 MASUK KE ITERASI ───
      customer_dest: p.DEST1 || '-',
      part_number: p.MATNR || '-',
      part_name: p.MAKTX || '-',
      job_number: p.BISMT || '-',
      project_id: p.project_id || '-',
      ZROUTING: p.ZROUTING || '-',
      ...weeklyCols,
      pcs_day_mdfo: Number(p.pcs_kanban_combined ?? p.pcs_day_mdfo_roundedkanban ?? p.pcs_day_mdfo ?? 0),
      pcs_day_dlv: Number(p.pcs_day_mdfo_delivery || 0),
      freq_delivery: Number(p.freq_delivery || 0),
      total_wd: Number(wdMap[String(p.DEST1 || p.zcust || '').toUpperCase()] || defaultWorkdays.value)
    };
  });
});

const table2 = reactive({
  searchQuery: '',
  currentPage: 1,
  rowsPerPage: 10,
  sortColumn: '',
  sortDirection: 'asc' as 'asc' | 'desc'
});

const sortTable2 = (columnKey: string, direction?: 'asc' | 'desc') => {
  if (direction) {
    table2.sortColumn = columnKey;
    table2.sortDirection = direction;
  } else {
    if (table2.sortColumn === columnKey) {
      table2.sortDirection = table2.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      table2.sortColumn = columnKey;
      table2.sortDirection = 'asc';
    }
  }
};

const filteredItems2 = computed(() => {
  let items = applyT2Filters(pcsDayItems.value);

  if (table2.searchQuery) {
    const query = table2.searchQuery.toLowerCase().trim();
    items = items.filter(
      (item: any) =>
        (item.part_number && item.part_number.toString().toLowerCase().includes(query)) ||
        (item.part_name && item.part_name.toString().toLowerCase().includes(query)) ||
        (item.project_id && item.project_id.toString().toLowerCase().includes(query)) ||
        (item.job_number && item.job_number.toString().toLowerCase().includes(query)) ||
        (item.ZROUTING && item.ZROUTING.toString().toLowerCase().includes(query)) ||
        // ─── TAMBAHAN KRITERIA: SEARCH BY CUSTOMER (DEST1) DI TABLE 2 ───
        (item.customer_dest && item.customer_dest.toString().toLowerCase().includes(query)) ||
        (item.zcust && item.zcust.toString().toLowerCase().includes(query)) ||
        (item.DEST1 && item.DEST1.toString().toLowerCase().includes(query))
    );
  }

  if (table2.sortColumn) {
    items.sort((a: any, b: any) => {
      let valA = a[table2.sortColumn] ?? 0;
      let valB = b[table2.sortColumn] ?? 0;

      const isNumber = !isNaN(parseFloat(valA)) && isFinite(valA) && !isNaN(parseFloat(valB)) && isFinite(valB);

      if (isNumber) {
        valA = Number(valA);
        valB = Number(valB);
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return table2.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return table2.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return items;
});

const paginatedItems2 = computed(() => {
  const start = (table2.currentPage - 1) * table2.rowsPerPage;
  return filteredItems2.value.slice(start, start + table2.rowsPerPage);
});

const totalPages2 = computed(() => Math.ceil(filteredItems2.value.length / table2.rowsPerPage));

watch([() => table2.searchQuery, () => table2.rowsPerPage], () => {
  table2.currentPage = 1;
});

const exportPcsDayExcel = () => {
  const items = Array.isArray(pcsDayItems.value) ? pcsDayItems.value : [];

  if (!items.length) {
    notificationStore.showDialogError('Error', 'Data PCS/Day Summary kosong');
    return;
  }

  const rows = items.map((item: any, index: number) => {
    const row: Record<string, any> = {
      No: index + 1,
      'Part Number': item.part_number || '-',
      'Part Name': item.part_name || '-',
      'Job Number': item.job_number || '-'
    };

    pcsWeekLabels?.value!.forEach((lbl: string) => {
      row[lbl] = Number(item[weekKey(lbl)] || 0);
    });

    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PCS_DAY_SUMMARY');

  const monthLabel = month.value || 'MONTH';
  XLSX.writeFile(wb, `PCS_DAY_SUMMARY_${monthLabel}.xlsx`);
};

const decrementWeekOffset = async () => {
  weekOffset.value--;
  await handleWeekOffsetChange();
};

const incrementWeekOffset = async () => {
  weekOffset.value++;
  await handleWeekOffsetChange();
};

const handleWeekOffsetChange = async () => {
  if (weekOffset.value === null || weekOffset.value === undefined || isNaN(weekOffset.value)) {
    weekOffset.value = 0;
  }
  isLoading.value = true;
  try {
    await fetchPartIFPTrial(weekOffset.value);
  } catch (error) {
    console.error('Error reloading data with offset:', error);
  } finally {
    isLoading.value = false;
  }
};

/* =========================
   SHIPPING PREPARATION
   ========================= */
const shippingFilter = reactive({
  search: '',
  status: 'All'
});

const shipDetailDialog = ref(false);
const shipDetail = reactive({
  part_number: '-',
  etd: '-',
  init_stok: 0,
  qty_added: 0,
  qty_reduced: 0,
  total_calc: 0,
  order_qty: 0,
  source: '-'
});

const shippingItemsFlat = computed(() => {
  const arr = Array.isArray(parts.value) ? parts.value : [];
  const rows: AnyObj[] = [];

  arr.forEach((p: any) => {
    const prep = Array.isArray(p.shipping_preparation) ? p.shipping_preparation : [];

    prep.forEach((r: any) => {
      rows.push({
        part_number: String(r.part_number || p.MATNR || '-').trim(),
        init_stok: Number(r.init_stok ?? r.init_stock ?? 0),
        qty_reduced: Number(r.qty_reduced ?? r.qty_reduced_scan ?? 0),
        qty_added: Number(r.qty_added ?? r.qty_added_scan ?? 0),
        total_calc: Number(r.total_calc ?? r.total_calc_assumpt_scan_ship ?? 0),
        etd: r.etd || '-',
        order_qty: Number(r.order_qty ?? 0),
        source: r.source || '-'
      });
    });
  });

  return rows;
});

const shippingEtdLabels = computed(() => {
  const set = new Set<string>();
  shippingItemsFlat.value.forEach((r: any) => {
    const etd = String(r.etd || '').trim();
    if (etd) set.add(etd);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
});

const shippingHourlyHeaders = computed(() => {
  return [
    { title: 'Part Number', key: 'part_number', width: 180 },
    { title: 'Init Stock', key: 'init_stock', width: 120, align: 'center' },
    { title: 'Status', key: 'status', width: 120, align: 'center' },
    ...shippingEtdLabels.value.map((etd: string) => ({
      title: etd,
      key: `etd_${etd}`,
      align: 'center',
      sortable: false,
      width: 110
    })),
    { title: 'Final', key: 'final_stock', width: 110, align: 'center' }
  ];
});

const shippingGrouped = computed(() => {
  const map: Record<string, any[]> = {};

  shippingItemsFlat.value.forEach((r: any) => {
    const key = String(r.part_number || '-').trim();
    if (!map[key]) map[key] = [];
    map[key].push(r);
  });

  return Object.keys(map).map((partNo) => {
    const rows = map[partNo].slice().sort((a, b) => String(a.etd || '').localeCompare(String(b.etd || '')));

    const initStock = rows.length ? Number(rows[0].init_stok || 0) : 0;
    const totalOrder = rows.reduce((s, x) => s + Number(x.order_qty || 0), 0);
    const finalStock = rows.length ? Number(rows[rows.length - 1].total_calc || 0) : initStock;

    const isRunout = !(Number(finalStock) > 0);

    return {
      part_number: partNo,
      rows,
      init_stock: initStock,
      total_order: totalOrder,
      final_stock: finalStock,
      is_runout: isRunout,
      status: isRunout ? 'RUNOUT' : 'SAFE'
    };
  });
});

const filteredShippingGroups = computed(() => {
  const q = String(shippingFilter.search || '')
    .trim()
    .toLowerCase();
  const st = String(shippingFilter.status || 'All');

  return shippingGrouped.value.filter((g: any) => {
    const matchSearch =
      !q ||
      String(g.part_number || '')
        .toLowerCase()
        .includes(q);

    let matchStatus = true;
    if (st === 'RUNOUT') matchStatus = !!g.is_runout;
    else if (st === 'SAFE') matchStatus = !g.is_runout;

    return matchSearch && matchStatus;
  });
});

const shippingSummary = computed(() => {
  const totalParts = shippingGrouped.value.length;
  const runoutParts = shippingGrouped.value.filter((g: any) => g.is_runout).length;

  return {
    total_parts: totalParts,
    runout_parts: runoutParts,
    safe_parts: totalParts - runoutParts
  };
});

const getShipRow = (item: any, etd: string) => {
  if (!item?.rows) return null;
  return item.rows.find((r: any) => String(r.etd || '').trim() === String(etd || '').trim()) || null;
};

const getShipFinal = (item: any, etd: string) => {
  const r = getShipRow(item, etd);
  if (!r) return 0;

  const init = Number(r.init_stok || 0);
  const input = Number(r.qty_added || 0);
  const out = Number(r.qty_reduced || 0);

  return init + input - out;
};

const openShipDetail = (item: any, etd: string) => {
  const row = getShipRow(item, etd);
  if (!row) return;

  shipDetail.part_number = item.part_number;
  shipDetail.etd = etd;
  shipDetail.init_stok = row.init_stok ?? 0;
  shipDetail.qty_added = row.qty_added ?? 0;
  shipDetail.qty_reduced = row.qty_reduced ?? 0;
  shipDetail.total_calc = row.total_calc ?? getShipFinal(item, etd) ?? 0;
  shipDetail.order_qty = row.order_qty ?? 0;
  shipDetail.source = String(row.source || '-')
    .trim()
    .toUpperCase();

  shipDetailDialog.value = true;
};

/* =========================
   RUNOUT PREDICTION
   ========================= */
const filterRunout = reactive({
  search: '',
  status: 'All'
});

const table3 = reactive({
  searchQuery: '',
  currentPage: 1,
  rowsPerPage: 10,
  sortColumn: '',
  sortDirection: 'asc' as 'asc' | 'desc',
  statusFilter: 'All'
});

const sortTable3 = (columnKey: string) => {
  if (table3.sortColumn === columnKey) {
    table3.sortDirection = table3.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    table3.sortColumn = columnKey;
    table3.sortDirection = 'asc';
  }
};

const runoutHeaders = computed(() => [
  { title: 'Part Number', key: 'MATNR', width: 180, sortable: true },
  { title: 'Customer', key: 'DEST1', width: 180, sortable: true },
  { title: 'Init Stock', key: 'LABST', width: 120 },
  { title: 'H+0', key: 't0', width: 110 },
  { title: 'H+1', key: 't1', width: 110 },
  { title: 'H+2', key: 't2', width: 110 },
  { title: 'H+3', key: 't3', width: 110 },
  { title: 'H+4', key: 't4', width: 110 },
  { title: 'H+5', key: 't5', width: 110 },
  { title: 'Status', key: 'status', width: 100 }
]);

const filteredRunoutParts = computed(() => {
  const arr = Array.isArray(parts.value) ? parts.value : [];

  const processed = arr.map((p: any) => {
    const prediction = p.runout_prediction || [];

    const getDayData = (label: string) => {
      const found = prediction.find((d: any) => d.day_label === label);
      return found || { stock_after: p.LABST, qty_deduction: 0, source: 'NONE' };
    };

    const t0 = getDayData('T+0');
    const t1 = getDayData('T+1');

    let status = 'STABLE';
    if (t0.stock_after <= 0) status = 'CRITICAL';
    else if (t1.stock_after <= 0) status = 'WARNING';

    return {
      ...p,
      t0,
      t1,
      t2: getDayData('T+2'),
      t3: getDayData('T+3'),
      t4: getDayData('T+4'),
      t5: getDayData('T+5'),
      calculatedStatus: status
    };
  });

  return processed.filter((item: any) => {
    const matchesSearch =
      !filterRunout.search ||
      String(item.MATNR || '')
        .toLowerCase()
        .includes(filterRunout.search.toLowerCase());

    const matchesStatus = filterRunout.status === 'All' || item.calculatedStatus === filterRunout.status;

    return matchesSearch && matchesStatus;
  });
});

const getRunoutClass = (stock: number) => {
  return Number(stock) <= 0 ? 'text-red-600 font-bold' : 'text-green-700 font-medium';
};

const filteredItems3 = computed(() => {
  let items = [...filteredRunoutParts.value];

  if (table3.searchQuery) {
    const query = table3.searchQuery.toLowerCase();
    items = items.filter((item: any) => item.MATNR && item.MATNR.toString().toLowerCase().includes(query));
  }

  if (table3.statusFilter !== 'All') {
    items = items.filter((item: any) => item.calculatedStatus === table3.statusFilter);
  }

  if (table3.sortColumn) {
    items.sort((a: any, b: any) => {
      let valA = a[table3.sortColumn] ?? '';
      let valB = b[table3.sortColumn] ?? '';

      const isNumber = !isNaN(parseFloat(valA)) && isFinite(valA) && !isNaN(parseFloat(valB)) && isFinite(valB);

      if (isNumber) {
        valA = Number(valA);
        valB = Number(valB);
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return table3.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return table3.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return items;
});

const paginatedItems3 = computed(() => {
  const start = (table3.currentPage - 1) * table3.rowsPerPage;
  return filteredItems3.value.slice(start, start + table3.rowsPerPage);
});

const totalPages3 = computed(() => Math.ceil(filteredItems3.value.length / table3.rowsPerPage));

watch([() => table3.searchQuery, () => table3.statusFilter, () => table3.rowsPerPage], () => {
  table3.currentPage = 1;
});

const shippingTable = reactive({
  currentPage: 1,
  rowsPerPage: 10
});

const shippingPaginatedItems = computed(() => {
  const start = (shippingTable.currentPage - 1) * shippingTable.rowsPerPage;
  return filteredShippingGroups.value.slice(start, start + shippingTable.rowsPerPage);
});

const shippingTotalPages = computed(() => Math.max(1, Math.ceil(filteredShippingGroups.value.length / shippingTable.rowsPerPage)));

watch([() => shippingFilter.search, () => shippingFilter.status, () => shippingTable.rowsPerPage], () => {
  shippingTable.currentPage = 1;
});

onUnmounted(() => {
  document.removeEventListener('click', handleAchievementOutsideClick);
});

onMounted(async () => {
  document.addEventListener('click', handleAchievementOutsideClick);

  isLoading.value = true;

  try {
    await fetchPartIFPTrial(weekOffset.value);

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    month.value = `${y}${m}`;
  } catch (error) {
    console.error('Error fetching data:', error);
    notificationStore.showDialogError('Error', 'Gagal memuat data');
  } finally {
    isLoading.value = false;
  }
});

/* =========================
   STRENGTH HISTORY
   ========================= */
const strengthStartDate = ref('');
const strengthEndDate = ref('');
const strengthHistoryList = ref<any[]>([]);
const strengthHistorySummary = ref<any[]>([]);
const isStrengthLoading = ref(false);
const isExportingExcel = ref(false);

const fetchStrengthHistory = async () => {
  isStrengthLoading.value = true;
  try {
    const response = await axios.get('http://192.168.10.67/majsf_rest_api/api/mutation_ifp/strength_history', {
      params: {
        start_date: strengthStartDate.value,
        end_date: strengthEndDate.value
      }
    });
    if (response.data && response.data.success) {
      strengthHistoryList.value = response.data.data || [];
      strengthHistorySummary.value = response.data.summary || [];

      if (response.data.start_date && !strengthStartDate.value) {
        strengthStartDate.value = response.data.start_date;
      }
      if (response.data.end_date && !strengthEndDate.value) {
        strengthEndDate.value = response.data.end_date;
      }
    } else {
      notificationStore.showDialogError('Error', 'Gagal memuat data Strength History');
    }
  } catch (error) {
    console.error('Error fetching strength history:', error);
    notificationStore.showDialogError('Error', 'Gagal memuat data Strength History');
  } finally {
    isStrengthLoading.value = false;
  }
};

function createDynamicExcelFilter(keysRef: () => string[], sourceRef: () => any[]) {
  const activeDropdown = ref<string | null>(null);
  const colFilters = reactive<Record<string, string[]>>({});
  const colSearch = reactive<Record<string, string>>({});

  const toggleDropdown = (col: string) => {
    if (!colFilters[col]) colFilters[col] = [];
    if (colSearch[col] === undefined) colSearch[col] = '';
    activeDropdown.value = activeDropdown.value === col ? null : col;
  };
  const closeDropdowns = () => {
    activeDropdown.value = null;
  };

  const getColUniqueValues = (col: string): string[] => {
    const raw = sourceRef().filter((r: any) => {
      return keysRef().every((c) => {
        if (c === col) return true;
        const active = colFilters[c];
        if (!active || !active.length) return true;
        const val = r[c];
        const isNull = val === null || val === undefined || val === '';
        if (active.includes('__NULL__') && isNull) return true;
        if (active.includes('-') && isNull) return true;
        if (isNull) return false;
        return active.includes(String(val));
      });
    });
    const set = new Set<string>();
    raw.forEach((r: any) => {
      const val = r[col];
      const strVal = (val === null || val === undefined || val === '') ? '-' : String(val);
      set.add(strVal);
    });
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  };

  const getColOptions = (col: string): string[] => {
    const search = (colSearch[col] || '').toLowerCase();
    const vals = getColUniqueValues(col);
    if (!search) return vals;
    return vals.filter(v => v.toLowerCase().includes(search));
  };

  const selectAllCol = (col: string) => {
    colFilters[col] = getColUniqueValues(col);
  };
  const clearColFilter = (col: string) => {
    colFilters[col] = [];
  };
  const selectOnly = (col: string, val: string) => {
    colFilters[col] = [val];
  };

  const isColAllSelected = (col: string): boolean => {
    const opts = getColOptions(col);
    if (!colFilters[col]) colFilters[col] = [];
    return opts.length > 0 && opts.every(o => colFilters[col].includes(o));
  };
  const toggleColAll = (col: string) => {
    const opts = getColOptions(col);
    if (!colFilters[col]) colFilters[col] = [];
    colFilters[col] = isColAllSelected(col) ? [] : [...opts];
  };
  const invertColSelection = (col: string) => {
    const opts = getColUniqueValues(col);
    if (!colFilters[col]) colFilters[col] = [];
    const active = colFilters[col];
    colFilters[col] = opts.filter(o => !active.includes(o));
  };
  const isAnyFilterActive = computed(() => keysRef().some(k => colFilters[k]?.length > 0));
  const resetFilters = () => {
    keysRef().forEach(k => {
      colFilters[k] = [];
      colSearch[k] = '';
    });
  };

  const applyFilters = (list: any[]): any[] => list.filter(row => keysRef().every(col => {
    const active = colFilters[col];
    if (!active || !active.length) return true;
    const val = row[col];
    const isNull = val === null || val === undefined || val === '';
    if (active.includes('-') && isNull) return true;
    if (active.includes('__NULL__') && isNull) return true;
    if (isNull) return false;
    return active.includes(String(val));
  }));

  return {
    activeDropdown,
    colFilters,
    colSearch,
    toggleDropdown,
    closeDropdowns,
    getColOptions,
    selectAllCol,
    clearColFilter,
    selectOnly,
    isColAllSelected,
    toggleColAll,
    invertColSelection,
    isAnyFilterActive,
    resetFilters,
    applyFilters
  };
}

const table2FilterKeys = computed(() => [
  'customer_dest',
  'project_id',
  'part_number',
  'job_number',
  'ZROUTING',
  ...(pcsWeekLabels.value || []).map(lbl => weekKey(lbl))
]);

const t2Filter = createDynamicExcelFilter(() => table2FilterKeys.value, () => pcsDayItems.value);
const {
  activeDropdown: t2ActiveDropdown,
  colFilters: t2ColFilters,
  colSearch: t2ColSearch,
  toggleDropdown: toggleT2Dropdown,
  closeDropdowns: closeT2Dropdowns,
  getColOptions: getT2ColOptions,
  selectAllCol: selectAllT2,
  clearColFilter: clearT2,
  selectOnly: selectT2Only,
  isColAllSelected: isT2ColAllSelected,
  toggleColAll: toggleT2ColAll,
  invertColSelection: invertT2ColSelection,
  isAnyFilterActive: isT2AnyFilterActive,
  resetFilters: resetT2Filters,
  applyFilters: applyT2Filters
} = t2Filter;

function createExcelFilter<K extends string>(keys: K[], sourceRef: () => any[]) {
  const activeDropdown = ref<K | null>(null);
  const colFilters = reactive<any>(Object.fromEntries(keys.map((k) => [k, []])));
  const colSearch = reactive<any>(Object.fromEntries(keys.map((k) => [k, ''])));

  const toggleDropdown = (col: K) => {
    activeDropdown.value = activeDropdown.value === col ? null : col;
  };
  const closeDropdowns = () => {
    activeDropdown.value = null;
  };

  const getColOptions = (col: K): string[] => {
    const search = (colSearch[col] || '').toLowerCase();
    const raw = sourceRef()
      .map((r: any) => {
        const v = r[col];
        return v === null || v === undefined || v === '' ? null : String(v);
      })
      .filter((v): v is string => v !== null);
    return [...new Set(raw)].filter((v) => v.toLowerCase().includes(search)).sort();
  };
  const isColAllSelected = (col: K): boolean => {
    const opts = getColOptions(col);
    return opts.length > 0 && opts.every((o) => colFilters[col].includes(o));
  };
  const toggleColAll = (col: K) => {
    const opts = getColOptions(col);
    colFilters[col] = isColAllSelected(col) ? [] : [...opts];
  };
  const invertColSelection = (col: K) => {
    const opts = getColOptions(col);
    const active = colFilters[col] as string[];
    colFilters[col] = opts.filter((o) => !active.includes(o));
  };
  const isAnyFilterActive = computed(() => keys.some((k) => colFilters[k].length > 0));
  const resetFilters = () => {
    keys.forEach((k) => {
      colFilters[k] = [];
      colSearch[k] = '';
    });
  };

  const applyFilters = (list: any[]): any[] =>
    list.filter((row) =>
      keys.every((col) => {
        const active = colFilters[col];
        if (!active.length) return true;
        const val = row[col];
        const isNull = val === null || val === undefined || val === '';
        if (active.includes('__NULL__') && isNull) return true;
        if (isNull) return false;
        return active.includes(String(val));
      })
    );

  return {
    activeDropdown,
    colFilters,
    colSearch,
    toggleDropdown,
    closeDropdowns,
    getColOptions,
    isColAllSelected,
    toggleColAll,
    invertColSelection,
    isAnyFilterActive,
    resetFilters,
    applyFilters
  };
}

const summaryKeys = ['matnr', 'bismt', 'dest1', 'project_id', 'zrouting', 'KRITIS', 'SAFE', 'OVER', 'total'];
type SummaryColKey = 'matnr' | 'bismt' | 'dest1' | 'project_id' | 'zrouting' | 'KRITIS' | 'SAFE' | 'OVER' | 'total';
const summaryFilter = createExcelFilter<SummaryColKey>(summaryKeys as SummaryColKey[], () => strengthHistorySummary.value);
const summaryFilteredList = computed(() => summaryFilter.applyFilters(strengthHistorySummary.value));

const kritisDetailBaseList = computed(() => {
  let rows = strengthHistorySummary.value.filter((item: any) => item.KRITIS > 0);
  rows = [...rows].sort((a: any, b: any) => b.KRITIS - a.KRITIS);
  return rows.slice(0, 15);
});

const overDetailBaseList = computed(() => {
  let rows = strengthHistorySummary.value.filter((item: any) => item.OVER > 0);
  rows = [...rows].sort((a: any, b: any) => b.OVER - a.OVER);
  return rows.slice(0, 15);
});

const detailKeys = ['matnr', 'bismt', 'dest1', 'zrouting'];
type DetailColKey = 'matnr' | 'bismt' | 'dest1' | 'zrouting';

// Kritis Details Table Logic
const kritisDetailFilter = createExcelFilter<DetailColKey>(detailKeys as DetailColKey[], () => kritisDetailBaseList.value);
const kritisDetailFilteredList = computed(() => kritisDetailFilter.applyFilters(kritisDetailBaseList.value));

const kritisDetailPagination = reactive({
  currentPage: 1,
  rowsPerPage: 10,
  searchQuery: ''
});

const filteredKritisDetailItems = computed(() => {
  let items = [...kritisDetailFilteredList.value];
  if (kritisDetailPagination.searchQuery) {
    const q = kritisDetailPagination.searchQuery.toLowerCase().trim();
    items = items.filter(
      (item: any) =>
        (item.matnr && item.matnr.toString().toLowerCase().includes(q)) ||
        (item.bismt && item.bismt.toString().toLowerCase().includes(q)) ||
        (item.zrouting && item.zrouting.toString().toLowerCase().includes(q)) ||
        (item.dest1 && item.dest1.toString().toLowerCase().includes(q)) ||
        (item.strength_status && item.strength_status.toString().toLowerCase().includes(q))
    );
  }
  return items;
});

const paginatedKritisDetailItems = computed(() => {
  const start = (kritisDetailPagination.currentPage - 1) * kritisDetailPagination.rowsPerPage;
  return filteredKritisDetailItems.value.slice(start, start + kritisDetailPagination.rowsPerPage);
});

const totalKritisDetailPages = computed(() => Math.ceil(filteredKritisDetailItems.value.length / kritisDetailPagination.rowsPerPage));

watch([() => kritisDetailPagination.searchQuery, () => kritisDetailPagination.rowsPerPage], () => {
  kritisDetailPagination.currentPage = 1;
});

// Over Details Table Logic
const overDetailFilter = createExcelFilter<DetailColKey>(detailKeys as DetailColKey[], () => overDetailBaseList.value);
const overDetailFilteredList = computed(() => overDetailFilter.applyFilters(overDetailBaseList.value));

const overDetailPagination = reactive({
  currentPage: 1,
  rowsPerPage: 10,
  searchQuery: ''
});

const filteredOverDetailItems = computed(() => {
  let items = [...overDetailFilteredList.value];
  if (overDetailPagination.searchQuery) {
    const q = overDetailPagination.searchQuery.toLowerCase().trim();
    items = items.filter(
      (item: any) =>
        (item.matnr && item.matnr.toString().toLowerCase().includes(q)) ||
        (item.bismt && item.bismt.toString().toLowerCase().includes(q)) ||
        (item.zrouting && item.zrouting.toString().toLowerCase().includes(q)) ||
        (item.dest1 && item.dest1.toString().toLowerCase().includes(q)) ||
        (item.strength_status && item.strength_status.toString().toLowerCase().includes(q))
    );
  }
  return items;
});

const paginatedOverDetailItems = computed(() => {
  const start = (overDetailPagination.currentPage - 1) * overDetailPagination.rowsPerPage;
  return filteredOverDetailItems.value.slice(start, start + overDetailPagination.rowsPerPage);
});

const totalOverDetailPages = computed(() => Math.ceil(filteredOverDetailItems.value.length / overDetailPagination.rowsPerPage));

watch([() => overDetailPagination.searchQuery, () => overDetailPagination.rowsPerPage], () => {
  overDetailPagination.currentPage = 1;
});

const exportKritisDetailsExcel = async () => {
  const items = filteredKritisDetailItems.value;
  if (!items.length) {
    notificationStore.showDialogError('Peringatan', 'Tidak ada data untuk diexport');
    return;
  }

  // Format nama file: YYYY.MM.DD HH.mm Item Kritis start to end.xlsx
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}`;
  
  const start = strengthStartDate.value || '-';
  const end = strengthEndDate.value || '-';
  const fileName = `${dateStr} Item Kritis ${start} to ${end}.xlsx`;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Kritis Details');

  worksheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Part Number', key: 'matnr', width: 22 },
    { header: 'Job Number', key: 'bismt', width: 18 },
    { header: 'Customer', key: 'dest1', width: 16 },
    { header: 'Routing', key: 'zrouting', width: 14 },
    { header: 'Total Kritis', key: 'kritis', width: 14 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' },
  };

  items.forEach((item: any, index: number) => {
    const row = worksheet.addRow({
      no: index + 1,
      matnr: item.matnr || '-',
      bismt: item.bismt || '-',
      dest1: item.dest1 || '-',
      zrouting: item.zrouting || '-',
      kritis: Number(item.KRITIS || 0),
    });
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('matnr').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('bismt').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('kritis').font = { bold: true, color: { argb: 'FFDC2626' } };
  });

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
  });

  // Capture & embed chart image (murni diagram grafik saja)
  const chartEl = document.getElementById('kritis-apexchart-wrap');
  if (chartEl) {
    try {
      const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#ffffff' });
      const base64Image = canvas.toDataURL('image/png');
      const imageId = workbook.addImage({
        base64: base64Image,
        extension: 'png',
      });
      worksheet.addImage(imageId, {
        tl: { col: 7, row: 0 },
        ext: { width: 864, height: 221 }, // 9 in x 2.3 in (96 DPI)
      });
    } catch (e) {
      console.warn('Gagal render chart ke excel:', e);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 300);
};

const exportOverDetailsExcel = async () => {
  const items = filteredOverDetailItems.value;
  if (!items.length) {
    notificationStore.showDialogError('Peringatan', 'Tidak ada data untuk diexport');
    return;
  }

  // Format nama file: YYYY.MM.DD HH.mm Item Over start to end.xlsx
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}`;
  
  const start = strengthStartDate.value || '-';
  const end = strengthEndDate.value || '-';
  const fileName = `${dateStr} Item Over ${start} to ${end}.xlsx`;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Over Details');

  worksheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Part Number', key: 'matnr', width: 22 },
    { header: 'Job Number', key: 'bismt', width: 18 },
    { header: 'Customer', key: 'dest1', width: 16 },
    { header: 'Routing', key: 'zrouting', width: 14 },
    { header: 'Total Over', key: 'over', width: 14 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD97706' }, // Amber 600
  };

  items.forEach((item: any, index: number) => {
    const row = worksheet.addRow({
      no: index + 1,
      matnr: item.matnr || '-',
      bismt: item.bismt || '-',
      dest1: item.dest1 || '-',
      zrouting: item.zrouting || '-',
      over: Number(item.OVER || 0),
    });
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('matnr').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('bismt').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('over').font = { bold: true, color: { argb: 'FFD97706' } };
  });

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
  });

  // Capture & embed chart image (murni diagram grafik saja)
  const chartEl = document.getElementById('over-apexchart-wrap');
  if (chartEl) {
    try {
      const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#ffffff' });
      const base64Image = canvas.toDataURL('image/png');
      const imageId = workbook.addImage({
        base64: base64Image,
        extension: 'png',
      });
      worksheet.addImage(imageId, {
        tl: { col: 7, row: 0 },
        ext: { width: 864, height: 221 }, // 9 in x 2.3 in (96 DPI)
      });
    } catch (e) {
      console.warn('Gagal render chart ke excel:', e);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 300);
};

const exportFrequencySummaryExcel = async () => {
  const kritisItems = filteredKritisDetailItems.value;
  const overItems = filteredOverDetailItems.value;
  const summaryItems = summaryFilteredList.value;

  if (!summaryItems.length && !kritisItems.length && !overItems.length) {
    notificationStore.showDialogError('Peringatan', 'Tidak ada data untuk diexport');
    return;
  }

  isExportingExcel.value = true;
  try {
    // Format nama file: YYYY.MM.DD HH.mm Freq Sum start to end.xlsx
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}`;
    
    const start = strengthStartDate.value || '-';
    const end = strengthEndDate.value || '-';
    const fileName = `${dateStr} Freq Sum ${start} to ${end}.xlsx`;

    const workbook = new ExcelJS.Workbook();

    // =========================================================
    // SHEET 1 — TOP 15 KRITIS (Data + Diagram 9 in x 2.3 in)
    // =========================================================
    const sheetKritis = workbook.addWorksheet('Top 15 Kritis');
    sheetKritis.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Part Number', key: 'matnr', width: 22 },
      { header: 'Job Number', key: 'bismt', width: 18 },
      { header: 'Customer', key: 'dest1', width: 16 },
      { header: 'Routing', key: 'zrouting', width: 14 },
      { header: 'Total Kritis', key: 'kritis', width: 14 },
    ];

    const headerKritis = sheetKritis.getRow(1);
    headerKritis.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerKritis.alignment = { vertical: 'middle', horizontal: 'center' };
    headerKritis.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    };

    kritisItems.forEach((item: any, index: number) => {
      const row = sheetKritis.addRow({
        no: index + 1,
        matnr: item.matnr || '-',
        bismt: item.bismt || '-',
        dest1: item.dest1 || '-',
        zrouting: item.zrouting || '-',
        kritis: Number(item.KRITIS || 0),
      });
      row.alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('matnr').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('bismt').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('kritis').font = { bold: true, color: { argb: 'FFDC2626' } };
    });

    sheetKritis.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    // Capture & embed Kritis Chart
    const chartKritisEl = document.getElementById('kritis-apexchart-wrap');
    if (chartKritisEl) {
      try {
        const canvasKritis = await html2canvas(chartKritisEl, { scale: 2, backgroundColor: '#ffffff' });
        const base64Kritis = canvasKritis.toDataURL('image/png');
        const imgIdKritis = workbook.addImage({
          base64: base64Kritis,
          extension: 'png',
        });
        sheetKritis.addImage(imgIdKritis, {
          tl: { col: 7, row: 0 },
          ext: { width: 864, height: 221 }, // 9 in x 2.3 in
        });
      } catch (e) {
        console.warn('Gagal render chart kritis ke excel:', e);
      }
    }

    // =========================================================
    // SHEET 2 — TOP 15 OVER (Data + Diagram 9 in x 2.3 in)
    // =========================================================
    const sheetOver = workbook.addWorksheet('Top 15 Over');
    sheetOver.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Part Number', key: 'matnr', width: 22 },
      { header: 'Job Number', key: 'bismt', width: 18 },
      { header: 'Customer', key: 'dest1', width: 16 },
      { header: 'Routing', key: 'zrouting', width: 14 },
      { header: 'Total Over', key: 'over', width: 14 },
    ];

    const headerOver = sheetOver.getRow(1);
    headerOver.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerOver.alignment = { vertical: 'middle', horizontal: 'center' };
    headerOver.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD97706' },
    };

    overItems.forEach((item: any, index: number) => {
      const row = sheetOver.addRow({
        no: index + 1,
        matnr: item.matnr || '-',
        bismt: item.bismt || '-',
        dest1: item.dest1 || '-',
        zrouting: item.zrouting || '-',
        over: Number(item.OVER || 0),
      });
      row.alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('matnr').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('bismt').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('over').font = { bold: true, color: { argb: 'FFD97706' } };
    });

    sheetOver.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    // Capture & embed Over Chart
    const chartOverEl = document.getElementById('over-apexchart-wrap');
    if (chartOverEl) {
      try {
        const canvasOver = await html2canvas(chartOverEl, { scale: 2, backgroundColor: '#ffffff' });
        const base64Over = canvasOver.toDataURL('image/png');
        const imgIdOver = workbook.addImage({
          base64: base64Over,
          extension: 'png',
        });
        sheetOver.addImage(imgIdOver, {
          tl: { col: 7, row: 0 },
          ext: { width: 864, height: 221 }, // 9 in x 2.3 in
        });
      } catch (e) {
        console.warn('Gagal render chart over ke excel:', e);
      }
    }

    // =========================================================
    // SHEET 3 — FREQUENCY SUMMARY (Semua Data Tabel Frequency)
    // =========================================================
    const sheetSummary = workbook.addWorksheet('Frequency Summary');
    sheetSummary.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Part Number', key: 'matnr', width: 22 },
      { header: 'Job Number', key: 'bismt', width: 18 },
      { header: 'Customer', key: 'dest1', width: 16 },
      { header: 'Model', key: 'project_id', width: 16 },
      { header: 'Routing', key: 'zrouting', width: 14 },
      { header: 'Kritis', key: 'kritis', width: 12 },
      { header: 'Safe', key: 'safe', width: 12 },
      { header: 'Over', key: 'over', width: 12 },
      { header: 'Total', key: 'total', width: 12 },
    ];

    const headerSummary = sheetSummary.getRow(1);
    headerSummary.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerSummary.alignment = { vertical: 'middle', horizontal: 'center' };
    headerSummary.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' }, // Slate 700
    };

    summaryItems.forEach((item: any, index: number) => {
      const row = sheetSummary.addRow({
        no: index + 1,
        matnr: item.matnr || '-',
        bismt: item.bismt || '-',
        dest1: item.dest1 || '-',
        project_id: item.project_id || '-',
        zrouting: item.zrouting || '-',
        kritis: Number(item.KRITIS || 0),
        safe: Number(item.SAFE || 0),
        over: Number(item.OVER || 0),
        total: Number(item.total || 0),
      });
      row.alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('matnr').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('bismt').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('kritis').font = { bold: true, color: { argb: 'FFDC2626' } };
      row.getCell('safe').font = { bold: true, color: { argb: 'FF16A34A' } };
      row.getCell('over').font = { bold: true, color: { argb: 'FFD97706' } };
      row.getCell('total').font = { bold: true, color: { argb: 'FF111827' } };
    });

    sheetSummary.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    // Download Unified 3-Sheet Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 300);
  } catch (err: any) {
    console.error('Error exporting excel:', err);
    notificationStore.showDialogError('Error', 'Gagal mengekspor file Excel: ' + (err?.message || err));
  } finally {
    isExportingExcel.value = false;
  }
};

const getParetoData = (key: string) => {
  let data = strengthHistorySummary.value.filter((item: any) => item[key] > 0);
  data.sort((a: any, b: any) => b[key] - a[key]);
  data = data.slice(0, 15);

  const total = data.reduce((sum: number, item: any) => sum + item[key], 0);
  let cumulative = 0;

  const counts = data.map((item: any) => item[key]);
  const cumulativePercents = data.map((item: any) => {
    cumulative += item[key];
    return total > 0 ? Number(((cumulative / total) * 100).toFixed(1)) : 0;
  });
  const categories = data.map((item: any) => item.bismt || item.matnr);

  return { counts, cumulativePercents, categories };
};

const kritisChartOptions = computed(() => {
  const { categories } = getParetoData('KRITIS');

  return {
    chart: {
      type: 'line',
      height: 250,
      toolbar: { show: true }
    },

    plotOptions: {
      bar: {
        columnWidth: '50%',
        dataLabels: {
          position: 'top'
        }
      }
    },

    dataLabels: {
      enabled: true,
      enabledOnSeries: [0], // Hanya untuk series batang
      offsetY: -15,
      background: {
        enabled: false // Tidak ada background
      },
      style: {
        colors: ['#000000'], // Angka hitam
        fontSize: '11px',
        fontWeight: 'bold'
      },
      formatter: function (val: any) {
        return val;
      }
    },

    stroke: {
      width: [0, 3],
      curve: 'straight'
    },

    // Tambahkan ini
    markers: {
      size: [0, 5], // Bar tidak ada marker, Line ukuran 5
      strokeWidth: 2,
      strokeColors: '#fff',
      hover: {
        size: 7
      }
    },

    xaxis: {
      categories: categories,
      labels: {
        rotate: -45,
        trim: true,
        style: {
          fontSize: '10px'
        }
      }
    },

    yaxis: [
      {
        title: { text: 'Count' },
        min: 0
      },
      {
        opposite: true,
        title: { text: 'Percentage (%)' },
        min: 0,
        max: 100,
        tickAmount: 5
      }
    ],

    colors: ['#ef4444', '#1d4ed8'],

    legend: {
      position: 'top',
      horizontalAlign: 'left'
    },

    tooltip: {
      shared: true,
      intersect: false
    }
  };
});

const kritisChartSeries = computed(() => {
  const { counts, cumulativePercents } = getParetoData('KRITIS');
  return [
    { name: 'KRITIS', type: 'column', data: counts },
    { name: 'Cumulative %', type: 'line', data: cumulativePercents }
  ];
});

const overChartOptions = computed(() => {
  const { categories } = getParetoData('OVER');

  return {
    chart: {
      type: 'line',
      height: 250,
      toolbar: { show: true }
    },

    plotOptions: {
      bar: {
        columnWidth: '50%',
        dataLabels: {
          position: 'top'
        }
      }
    },

    dataLabels: {
      enabled: true,
      enabledOnSeries: [0], // Hanya tampil pada series batang
      offsetY: -15,
      background: {
        enabled: false // Hilangkan background
      },
      style: {
        colors: ['#000000'], // Angka hitam
        fontSize: '11px',
        fontWeight: 'bold'
      },
      formatter: function (val: number) {
        return val;
      }
    },

    stroke: {
      width: [0, 3],
      curve: 'straight'
    },

    markers: {
      size: [0, 5],
      strokeWidth: 2,
      strokeColors: '#fff',
      hover: {
        size: 7
      }
    },

    xaxis: {
      categories: categories,
      labels: {
        rotate: -45,
        trim: true,
        style: {
          fontSize: '10px'
        }
      }
    },

    yaxis: [
      {
        title: { text: 'Count' },
        min: 0
      },
      {
        opposite: true,
        title: { text: 'Percentage (%)' },
        min: 0,
        max: 100,
        tickAmount: 5
      }
    ],

    colors: ['#f59e0b', '#1d4ed8'],

    legend: {
      position: 'top',
      horizontalAlign: 'left'
    },

    tooltip: {
      shared: true,
      intersect: false
    }
  };
});

const overChartSeries = computed(() => {
  const { counts, cumulativePercents } = getParetoData('OVER');
  return [
    { name: 'OVER', type: 'column', data: counts },
    { name: 'Cumulative %', type: 'line', data: cumulativePercents }
  ];
});

onMounted(() => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const formattedYesterday = yesterday.toISOString().slice(0, 10);
  strengthStartDate.value = formattedYesterday;
  strengthEndDate.value = formattedYesterday;

  fetchStrengthHistory();
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <div class="flex flex-col gap-8">
    <div class="flex gap-6 flex-wrap">
      <button
        v-if="permissions?.create"
        @click.stop="updateRundownExcelToDB('IFP')"
        class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-4 py-1.5 text-center"
        type="button"
      >
        <svg class="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2M12 4v12m0-12 4 4m-4-4L8 8"
          />
        </svg>
        Upload Rundown IFP
      </button>

      <button
        v-if="permissions?.create"
        @click="dialog.deleteRundown = true"
        class="flex items-center gap-2 text-white bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-full text-sm px-4 py-1.5 text-center"
        type="button"
      >
        <svg class="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"
          />
        </svg>
        Delete Rundown IFP
      </button>

      <button
        v-if="permissions?.create"
        @click="openGenerateModal"
        class="flex items-center gap-2 text-white font-medium rounded-full text-sm px-4 py-1.5 text-center transition-all"
        style="background: linear-gradient(to right, #fb923c, #f97316, #ea580c) !important; border: none"
        type="button"
      >
        <svg class="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7H5a2 2 0 0 0-2 2v4m5-6h8M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m0 0h3a2 2 0 0 1 2 2v4m0 0v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m16 0h-5m-7 0h-2"
          />
        </svg>
        Generate SO → Update PCS/Hour
      </button>

      <v-btn
        @click="exportIfpInhouseExcel"
        :loading="dialog.loading"
        class="text-white px-4 py-1.5 rounded-pill text-none"
        elevation="0"
        theme="light"
        style="background: linear-gradient(to right, #4ade80, #22c55e, #16a34a) !important; color: white !important; border: none"
      >
        <template v-slot:prepend>
          <!-- Ikon SVG -->
          <svg v-if="!dialog.loading" class="w-5 h-5 text-white mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </template>

        <span class="text-sm font-medium">Export Excel PCS/DAY </span>
      </v-btn>
    </div>

    <!-- Template Broadcast Copy Card -->
    <TemplateCopyCard />

    <div v-if="dialog.loading" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div class="bg-white rounded-lg shadow p-6 w-[300px] text-center">
        <svg aria-hidden="true" class="w-10 h-10 mx-auto text-gray-200 animate-spin fill-blue-600" viewBox="0 0 100 101" fill="none">
          <path
            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908Z"
            fill="currentColor"
          />
          <path
            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
            fill="currentFill"
          />
        </svg>
        <div class="mt-3 text-sm font-medium">Processing... please wait</div>
      </div>
    </div>

    <div v-if="result.show" class="mt-4 p-4 bg-white rounded-lg border border-gray-200">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Hasil Generate SO</h3>
        <button @click="closeGenerateResult" class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-lg border border-gray-200">
          <div class="px-4 py-3 font-semibold border-b">UPDATED PART ({{ result.total_updated }})</div>
          <div class="p-4">
            <input
              v-model="searchUpdated"
              type="text"
              placeholder="Search Updated"
              class="block w-full p-2 text-sm border border-gray-300 rounded-lg mb-3"
            />
            <div class="max-h-[400px] overflow-y-auto">
              <table class="w-full text-sm text-left">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-3 py-2">No</th>
                    <th class="px-3 py-2">Part Number</th>
                    <th class="px-3 py-2 text-right">Qty SO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, index) in result.updatedFormatted.filter(
                      (x) =>
                        !searchUpdated ||
                        String(x.part_no || '')
                          .toLowerCase()
                          .includes(searchUpdated.toLowerCase())
                    )"
                    :key="'u-' + index"
                    class="border-t"
                  >
                    <td class="px-3 py-2">{{ index + 1 }}</td>
                    <td class="px-3 py-2 text-green-600 font-semibold">{{ item.part_no }}</td>
                    <td class="px-3 py-2 text-right">{{ formatNumber(item.qty) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg border border-gray-200">
          <div class="px-4 py-3 font-semibold border-b">NOT FOUND PART ({{ result.total_not_found }})</div>
          <div class="p-4">
            <input
              v-model="searchNotFound"
              type="text"
              placeholder="Search Not Found"
              class="block w-full p-2 text-sm border border-gray-300 rounded-lg mb-3"
            />
            <div class="max-h-[400px] overflow-y-auto">
              <table class="w-full text-sm text-left">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-3 py-2">No</th>
                    <th class="px-3 py-2">Part Number</th>
                    <th class="px-3 py-2 text-right">Qty SO</th>
                    <th class="px-3 py-2">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, index) in result.notFoundFormatted.filter(
                      (x) =>
                        !searchNotFound ||
                        String(x.part_no || '')
                          .toLowerCase()
                          .includes(searchNotFound.toLowerCase())
                    )"
                    :key="'n-' + index"
                    class="border-t"
                  >
                    <td class="px-3 py-2">{{ index + 1 }}</td>
                    <td class="px-3 py-2 text-red-600 font-semibold">{{ item.part_no }}</td>
                    <td class="px-3 py-2 text-right">{{ formatNumber(item.qty) }}</td>
                    <td class="px-3 py-2">
                      <span class="inline-block px-2 py-1 text-xs rounded border border-red-300 text-red-600">
                        {{ item.status || 'Not Found' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table 1 -->
    <div class="w-full max-w-10xl mx-auto simple-dt-custom">
      <div class="border-l-4 border-green-500 pl-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <span class="text-sm font-bold text-green-600">Rundown IFP Summary</span>
      </div>

      <div class="flex gap-4 flex-wrap justify-between pa-3 mb-2">
        <div class="relative flex gap-4 flex-wrap">
          <div class="absolute inset-y-0 start-0 flex items-center pl-3 pointer-events-none">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            v-model="table1.searchQuery"
            type="text"
            class="block p-1.5 pl-8 text-xs text-gray-900 border border-gray-300 rounded-full w-64 bg-gray-50 focus:ring-green-400 focus:border-green-400"
            placeholder="Search part..."
          />
        </div>

        <div class="flex gap-3 flex-wrap items-center">
          <select
            v-model="table1.destination"
            class="block w-48 p-1.5 text-xs border border-gray-300 rounded-lg bg-gray-50 focus:ring-green-500 focus:border-green-500"
          >
            <option disabled value="">Pilih Customer</option>
            <option value="All">All</option>
            <option v-for="item in dest1CustomerList" :key="item" :value="item">{{ item }}</option>
          </select>

          <div class="relative inline-block text-left">
            <button
              @click="showExportDropdown = !showExportDropdown"
              class="flex items-center gap-1.5 text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-xs px-3 py-1.5 text-center transition-all shadow-sm"
            >
              <span>Export Priority</span>
              <svg
                class="w-3 h-3 transition-transform"
                :class="{ 'rotate-180': showExportDropdown }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              v-if="showExportDropdown"
              class="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden d-flex flex-col"
            >
              <div class="max-h-64 overflow-y-auto">
                <label class="flex items-center px-4 py-3 text-sm hover:bg-gray-50 cursor-pointer transition border-b select-none">
                  <input
                    type="checkbox"
                    value="kritisMgl"
                    v-model="checkedPriorities"
                    class="mr-3 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Kritis Items MGL</span>
                </label>

                <label class="flex items-center px-4 py-3 text-sm hover:bg-gray-50 cursor-pointer transition border-b select-none">
                  <input
                    type="checkbox"
                    value="overMgl"
                    v-model="checkedPriorities"
                    class="mr-3 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Over Items MGL</span>
                </label>

                <label class="flex items-center px-4 py-3 text-sm hover:bg-gray-50 cursor-pointer transition border-b select-none">
                  <input
                    type="checkbox"
                    value="kritis"
                    v-model="checkedPriorities"
                    class="mr-3 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Kritis Items</span>
                </label>

                <label class="flex items-center px-4 py-3 text-sm hover:bg-gray-50 cursor-pointer transition border-b select-none">
                  <input
                    type="checkbox"
                    value="over"
                    v-model="checkedPriorities"
                    class="mr-3 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Over Items</span>
                </label>

                <label class="flex items-center px-4 py-3 text-sm hover:bg-gray-50 pointer transition border-b select-none">
                  <input
                    type="checkbox"
                    value="kritisHmmi"
                    v-model="checkedPriorities"
                    class="mr-3 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Kritis Items HMMI</span>
                </label>

                <label class="flex items-center px-4 py-3 text-sm hover:bg-gray-50 cursor-pointer transition border-b select-none">
                  <input
                    type="checkbox"
                    value="overHmmi"
                    v-model="checkedPriorities"
                    class="mr-3 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Over Items HMMI</span>
                </label>
              </div>

              <div class="p-2 bg-gray-50 border-t flex gap-2">
                <button
                  @click="checkedPriorities = []"
                  class="flex-1 text-center py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100 transition"
                >
                  Reset
                </button>
                <button
                  @click="downloadSelectedPriorities"
                  :disabled="checkedPriorities.length === 0"
                  class="flex-1 text-center py-2 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Download ({{ checkedPriorities.length }})
                </button>
              </div>
            </div>
          </div>

          <!-- Export Achievement Dropdown -->
          <div class="relative inline-block text-left" ref="achievementDropdownRef">
            <button
              @click="
                showAchievementDropdown = !showAchievementDropdown;
                showExportDropdown = false;
              "
              class="flex items-center gap-1.5 text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-xs px-3 py-1.5 text-center transition-all shadow-sm"
            >
              <span>Export Achievement FP</span>
              <svg
                class="w-3 h-3 transition-transform"
                :class="{ 'rotate-180': showAchievementDropdown }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              v-if="showAchievementDropdown"
              class="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
            >
              <div class="px-4 py-3 border-b">
                <label class="block text-xs font-medium text-gray-700 mb-1">Pilih Tanggal</label>
                <input
                  v-model="achievementDate"
                  type="date"
                  class="block w-full p-1.5 text-xs border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div class="p-2 bg-gray-50 border-t">
                <button
                  @click="downloadAchievementExcel"
                  :disabled="!achievementDate"
                  class="w-full text-center py-2 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="w-full border border-gray-200 rounded-t-lg shadow-sm">
        <div class="overflow-x-auto overflow-y-auto max-h-130">
          <table
            class="text-[11px] text-gray-500 text-center whitespace-nowrap min-w-[2500px]"
            style="width: 100%; border-collapse: separate; border-spacing: 0"
          >
            <thead class="text-gray-600" style="position: sticky; top: 0; z-index: 2">
              <tr>
                <th class="cursor-pointer px-3 py-2 border-b bg-green-50" @click="sortTable1('project_id')">Model</th>
                <th class="cursor-pointer px-12 py-2 border-b min-w-[160px] text-left bg-green-50" @click="sortTable1('MATNR')">
                  Part Number
                </th>
                <th class="cursor-pointer px-3 py-2 border-b min-w-[280px] text-left bg-green-50" @click="sortTable1('MAKTX')">
                  Part Name
                </th>
                <th class="cursor-pointer px-3 py-2 border-b bg-green-50" @click="sortTable1('BISMT')">Job Number</th>
                <th class="cursor-pointer px-3 py-2 border-b bg-green-50" @click="sortTable1('ZROUTING')">Routing</th>
                <th class="cursor-pointer px-3 py-2 border-b bg-green-50" @click="sortTable1('BEHMG')">Qty/Kanban</th>
                <th class="cursor-pointer px-3 py-2 border-b bg-green-50" @click="sortTable1('pcs_day_mdfo_roundedkanban')">
                  Pcs/Day(MDFO)
                </th>
                <th class="px-3 py-2 border-b bg-green-50">Pcs/Day(DLV)</th>
                <th class="cursor-pointer px-3 py-2 border-b bg-green-50" @click="sortTable1('ZPLNPH')">Pcs/Day</th>
                <th class="cursor-pointer px-6 py-2 border-b bg-green-50" @click="sortTable1('periode')">Periode</th>
                <th class="cursor-pointer px-3 py-2 border-b bg-green-50" @click="sortTable1('ZMAJPH')">Plan/Hour</th>
                <th class="cursor-pointer px-3 py-2 border-b bg-green-50" @click="sortTable1('LABST')">Stock</th>
                <th class="px-3 py-2 border-b min-w-[80px] bg-green-50">
                  <div class="flex flex-col gap-1 items-center">
                    <span class="text-[13px] font-semibold">Strength</span>
                    <input
                      v-model="table1.strengthFilter"
                      @click.stop
                      type="number"
                      placeholder="<"
                      class="w-12 px-1 py-0.5 text-[9px] rounded border border-gray-300 focus:ring-1 focus:ring-green-500 outline-none text-center"
                    />
                  </div>
                </th>
                <th class="cursor-pointer px-3 py-2 border-b bg-green-50" @click="sortTable1('DEST1')">Destination 1</th>
                <th class="cursor-pointer px-3 py-2 border-b bg-green-50" @click="sortTable1('DEST2')">Destination 2</th>
                <th class="cursor-pointer px-3 py-2 border-b bg-green-50" @click="sortTable1('DEST3')">Destination 3</th>
              </tr>
            </thead>
            <tbody class="font-medium">
              <tr v-if="isLoading">
                <td colspan="16" class="px-3 py-10 text-center text-sm"><span class="animate-pulse">Loading data...</span></td>
              </tr>
              <tr
                v-else-if="paginatedItems1.length > 0"
                v-for="(value, index) in paginatedItems1"
                :key="index"
                class="odd:bg-white even:bg-gray-50 border-b hover:bg-green-50 transition-colors"
              >
                <td class="px-1 py-2 text-gray-900">{{ value.project_id }}</td>
                <td class="px-3 py-2 text-gray-900 text-left">{{ value.MATNR }}</td>
                <td class="px-3 py-2 text-gray-900 text-left whitespace-normal break-words">{{ value.MAKTX }}</td>
                <td class="px-3 py-2 text-gray-900">{{ value.BISMT }}</td>
                <td class="px-1 py-2 text-gray-900">{{ value.ZROUTING }}</td>
                <td class="px-1 py-2 text-gray-900">{{ value.BEHMG }}</td>
                <td class="px-1 py-2 text-gray-900">{{ value.pcs_day_mdfo_roundedkanban }}</td>
                <td class="px-1 py-2 text-gray-900">{{ value.pcs_day_mdfo_delivery_roundedkanban }}</td>
                <td class="px-1 py-2 text-gray-900">{{ value.ZPLNPH }}</td>
                <td class="px-1 py-2 text-gray-900">{{ value.periode }}</td>
                <td class="px-1 py-2 text-gray-900">{{ value.ZMAJPH }}</td>
                <td class="px-1 py-2 text-gray-900">{{ value.LABST }}</td>
                <td class="px-1 py-2 text-gray-900 font-bold">{{ value.ZSTRENGTH }}</td>
                <td class="px-3 py-2 text-gray-900">{{ value.DEST1 }}</td>
                <td class="px-3 py-2 text-gray-900">{{ value.DEST2 }}</td>
                <td class="px-3 py-2 text-gray-900">{{ value.DEST3 }}</td>
              </tr>
              <tr v-else>
                <td colspan="16" class="px-1 py-10 text-center text-gray-500 bg-gray-50">No data found</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Pagination
          class="bg-green-50 sticky bottom-0 z-2"
          :totalItems="filteredItems1.length"
          v-model:currentPage="table1.currentPage"
          v-model:itemsPerPage="table1.rowsPerPage"
          :perPageOptions="[10, 25, 50]"
        />
      </div>
    </div>

    <!-- Table 2 -->
    <div class="w-full max-w-10xl mx-auto simple-dt-custom" @click="closeT2Dropdowns()">
      <div class="border-l-4 border-blue-500 pl-4 flex items-center gap-2">
        <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <span class="text-base font-bold text-blue-600">PCS/Day Summary</span>
      </div>

      <div class="flex gap-6 flex-wrap pa-4 items-center">
        <div class="relative">
          <div class="absolute inset-y-0 start-0 flex items-center pl-3 pointer-events-none">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            v-model="table2.searchQuery"
            type="text"
            class="block p-2.5 pl-10 text-sm text-gray-900 border border-gray-300 rounded-full w-96 bg-gray-50 focus:ring-blue-400 focus:border-blue-400"
            placeholder="Search Model / Part / Job / Routing..."
          />
        </div>

        <!-- Week Offset Selector -->
        <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full shadow-sm">
          <span class="text-xs font-bold text-gray-600 uppercase tracking-wider">Week Offset:</span>
          <div class="flex items-center bg-white border border-gray-300 rounded-full overflow-hidden">
            <button
              @click="decrementWeekOffset"
              class="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-105 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none"
              type="button"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <input
              v-model.number="weekOffset"
              type="number"
              @change="handleWeekOffsetChange"
              class="w-12 h-8 text-center text-sm font-semibold text-gray-800 focus:outline-none border-x border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              @click="incrementWeekOffset"
              class="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-105 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none"
              type="button"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <button
          @click="exportPcsDayExcel"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-green-500 via-green-600 to-green-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          type="button"
        >
          Export PCS/Day Weekly
        </button>

        <button
          v-if="isT2AnyFilterActive"
          @click="resetT2Filters"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-full text-sm px-5 py-2.5 text-center transition-all"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear Filter
        </button>
      </div>

      <!-- ✅ KUNCI: max-height + overflow auto agar scroll di dalam container, bukan window -->
      <div class="w-full border border-gray-200 rounded-t-lg bg-white" style="overflow: auto; max-height: 520px">
        <table class="w-full text-sm text-gray-500 text-center whitespace-nowrap" style="border-collapse: separate; border-spacing: 0">
          <!-- ✅ sticky top:0 + background solid agar tidak transparan saat scroll -->
          <thead class="text-gray-600 text-center text-xs" style="position: sticky; top: 0; z-index: 2">
            <tr>
              <!-- Customer -->
              <th scope="col" class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" style="min-width:180px;" @click.stop>
                <div class="flex items-center justify-center gap-1">
                  <span>Customer</span>
                  <button @click.stop="toggleT2Dropdown('customer_dest')" :class="['excel-filter-btn', t2ColFilters.customer_dest?.length ? 'excel-filter-btn-active' : '']">▼</button>
                </div>
                <div v-if="t2ActiveDropdown === 'customer_dest'" class="excel-dropdown" @click.stop>
                  <div class="excel-dropdown-sort-section border-b border-gray-100 pb-1 mb-1">
                    <button @click.stop="sortTable2('customer_dest', 'asc'); closeT2Dropdowns()" class="excel-dropdown-sort-item">
                      <span class="text-blue-500">▲</span> Sort A to Z
                    </button>
                    <button @click.stop="sortTable2('customer_dest', 'desc'); closeT2Dropdowns()" class="excel-dropdown-sort-item">
                      <span class="text-blue-500">▼</span> Sort Z to A
                    </button>
                  </div>
                  <div class="excel-dropdown-search">
                    <input v-model="t2ColSearch.customer_dest" placeholder="Cari…" class="excel-search-input" @click.stop />
                  </div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllT2('customer_dest')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearT2('customer_dest')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertT2ColSelection('customer_dest')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getT2ColOptions('customer_dest')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="t2ColFilters.customer_dest" />
                        <span>{{ opt }}</span>
                      </label>
                      <button class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer" @click.stop="selectT2Only('customer_dest', opt)">Only</button>
                    </div>
                  </div>
                </div>
              </th>

              <!-- Model -->
              <th scope="col" class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" style="min-width:120px;" @click.stop>
                <div class="flex items-center justify-center gap-1">
                  <span>Model</span>
                  <button @click.stop="toggleT2Dropdown('project_id')" :class="['excel-filter-btn', t2ColFilters.project_id?.length ? 'excel-filter-btn-active' : '']">▼</button>
                </div>
                <div v-if="t2ActiveDropdown === 'project_id'" class="excel-dropdown" @click.stop>
                  <div class="excel-dropdown-sort-section border-b border-gray-100 pb-1 mb-1">
                    <button @click.stop="sortTable2('project_id', 'asc'); closeT2Dropdowns()" class="excel-dropdown-sort-item">
                      <span class="text-blue-500">▲</span> Sort A to Z
                    </button>
                    <button @click.stop="sortTable2('project_id', 'desc'); closeT2Dropdowns()" class="excel-dropdown-sort-item">
                      <span class="text-blue-500">▼</span> Sort Z to A
                    </button>
                  </div>
                  <div class="excel-dropdown-search">
                    <input v-model="t2ColSearch.project_id" placeholder="Cari…" class="excel-search-input" @click.stop />
                  </div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllT2('project_id')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearT2('project_id')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertT2ColSelection('project_id')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getT2ColOptions('project_id')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="t2ColFilters.project_id" />
                        <span>{{ opt }}</span>
                      </label>
                      <button class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer" @click.stop="selectT2Only('project_id', opt)">Only</button>
                    </div>
                  </div>
                </div>
              </th>

              <!-- Part Number -->
              <th scope="col" class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" style="min-width:200px;" @click.stop>
                <div class="flex items-center justify-center gap-1">
                  <span>Part Number</span>
                  <button @click.stop="toggleT2Dropdown('part_number')" :class="['excel-filter-btn', t2ColFilters.part_number?.length ? 'excel-filter-btn-active' : '']">▼</button>
                </div>
                <div v-if="t2ActiveDropdown === 'part_number'" class="excel-dropdown" @click.stop>
                  <div class="excel-dropdown-sort-section border-b border-gray-100 pb-1 mb-1">
                    <button @click.stop="sortTable2('part_number', 'asc'); closeT2Dropdowns()" class="excel-dropdown-sort-item">
                      <span class="text-blue-500">▲</span> Sort A to Z
                    </button>
                    <button @click.stop="sortTable2('part_number', 'desc'); closeT2Dropdowns()" class="excel-dropdown-sort-item">
                      <span class="text-blue-500">▼</span> Sort Z to A
                    </button>
                  </div>
                  <div class="excel-dropdown-search">
                    <input v-model="t2ColSearch.part_number" placeholder="Cari…" class="excel-search-input" @click.stop />
                  </div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllT2('part_number')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearT2('part_number')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertT2ColSelection('part_number')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getT2ColOptions('part_number')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="t2ColFilters.part_number" />
                        <span>{{ opt }}</span>
                      </label>
                      <button class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer" @click.stop="selectT2Only('part_number', opt)">Only</button>
                    </div>
                  </div>
                </div>
              </th>

              <!-- Job Number -->
              <th scope="col" class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative whitespace-nowrap" style="min-width:180px;" @click.stop>
                <div class="flex items-center justify-center gap-1 whitespace-nowrap">
                  <span>Job Number</span>
                  <button @click.stop="toggleT2Dropdown('job_number')" :class="['excel-filter-btn', t2ColFilters.job_number?.length ? 'excel-filter-btn-active' : '']">▼</button>
                </div>
                <div v-if="t2ActiveDropdown === 'job_number'" class="excel-dropdown" @click.stop>
                  <div class="excel-dropdown-sort-section border-b border-gray-100 pb-1 mb-1">
                    <button @click.stop="sortTable2('job_number', 'asc'); closeT2Dropdowns()" class="excel-dropdown-sort-item">
                      <span class="text-blue-500">▲</span> Sort A to Z
                    </button>
                    <button @click.stop="sortTable2('job_number', 'desc'); closeT2Dropdowns()" class="excel-dropdown-sort-item">
                      <span class="text-blue-500">▼</span> Sort Z to A
                    </button>
                  </div>
                  <div class="excel-dropdown-search">
                    <input v-model="t2ColSearch.job_number" placeholder="Cari…" class="excel-search-input" @click.stop />
                  </div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllT2('job_number')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearT2('job_number')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertT2ColSelection('job_number')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getT2ColOptions('job_number')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="t2ColFilters.job_number" />
                        <span>{{ opt }}</span>
                      </label>
                      <button class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer" @click.stop="selectT2Only('job_number', opt)">Only</button>
                    </div>
                  </div>
                </div>
              </th>

              <!-- Routing -->
              <th scope="col" class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative whitespace-nowrap" style="min-width:220px;" @click.stop>
                <div class="flex items-center justify-center gap-1 whitespace-nowrap">
                  <span>Routing</span>
                  <button @click.stop="toggleT2Dropdown('ZROUTING')" :class="['excel-filter-btn', t2ColFilters.ZROUTING?.length ? 'excel-filter-btn-active' : '']">▼</button>
                </div>
                <div v-if="t2ActiveDropdown === 'ZROUTING'" class="excel-dropdown" @click.stop>
                  <div class="excel-dropdown-sort-section border-b border-gray-100 pb-1 mb-1">
                    <button @click.stop="sortTable2('ZROUTING', 'asc'); closeT2Dropdowns()" class="excel-dropdown-sort-item">
                      <span class="text-blue-500">▲</span> Sort A to Z
                    </button>
                    <button @click.stop="sortTable2('ZROUTING', 'desc'); closeT2Dropdowns()" class="excel-dropdown-sort-item">
                      <span class="text-blue-500">▼</span> Sort Z to A
                    </button>
                  </div>
                  <div class="excel-dropdown-search">
                    <input v-model="t2ColSearch.ZROUTING" placeholder="Cari…" class="excel-search-input" @click.stop />
                  </div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllT2('ZROUTING')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearT2('ZROUTING')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertT2ColSelection('ZROUTING')" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getT2ColOptions('ZROUTING')" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="t2ColFilters.ZROUTING" />
                        <span>{{ opt }}</span>
                      </label>
                      <button class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer" @click.stop="selectT2Only('ZROUTING', opt)">Only</button>
                    </div>
                  </div>
                </div>
              </th>

              <!-- Dynamic Weeks -->
              <th
                v-for="lbl in pcsWeekLabels"
                :key="lbl"
                scope="col"
                class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative"
                style="min-width:200px;"
                @click.stop
              >
                <div class="flex items-center justify-center gap-1">
                  <span>{{ lbl }}</span>
                  <button @click.stop="toggleT2Dropdown(weekKey(lbl))" :class="['excel-filter-btn', t2ColFilters[weekKey(lbl)]?.length ? 'excel-filter-btn-active' : '']">▼</button>
                </div>
                <div v-if="t2ActiveDropdown === weekKey(lbl)" class="excel-dropdown" @click.stop style="right: 0; left: auto;">
                  <div class="excel-dropdown-sort-section border-b border-gray-100 pb-1 mb-1">
                    <button @click.stop="sortTable2(weekKey(lbl), 'asc'); closeT2Dropdowns()" class="excel-dropdown-sort-item">
                      <span class="text-blue-500">▲</span> Sort A to Z
                    </button>
                    <button @click.stop="sortTable2(weekKey(lbl), 'desc'); closeT2Dropdowns()" class="excel-dropdown-sort-item">
                      <span class="text-blue-500">▼</span> Sort Z to A
                    </button>
                  </div>
                  <div class="excel-dropdown-search">
                    <input v-model="t2ColSearch[weekKey(lbl)]" placeholder="Cari…" class="excel-search-input" @click.stop />
                  </div>
                  <div class="excel-selection-actions flex gap-2 justify-between">
                    <button @click.stop="selectAllT2(weekKey(lbl))" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">All</button>
                    <button @click.stop="clearT2(weekKey(lbl))" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Clear</button>
                    <button @click.stop="invertT2ColSelection(weekKey(lbl))" class="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-transparent border-none cursor-pointer">Invert</button>
                  </div>
                  <div class="excel-options-list">
                    <div v-for="opt in getT2ColOptions(weekKey(lbl))" :key="opt" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                      <label class="excel-option grow flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" :value="opt" v-model="t2ColFilters[weekKey(lbl)]" />
                        <span>{{ opt }}</span>
                      </label>
                      <button class="text-[10px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold bg-transparent border-none cursor-pointer" @click.stop="selectT2Only(weekKey(lbl), opt)">Only</button>
                    </div>
                  </div>
                </div>
              </th>
            </tr>
          </thead>

          <tbody class="font-medium">
            <tr v-if="isLoading">
              <td :colspan="5 + (pcsWeekLabels?.length ?? 0)" class="px-6 py-10 text-center text-gray-400">Loading data...</td>
            </tr>
            <tr
              v-else-if="paginatedItems2.length > 0"
              v-for="(item, index) in paginatedItems2"
              :key="index"
              class="odd:bg-white even:bg-gray-50 border-b border-gray-200 hover:bg-blue-50/50 transition-colors text-center whitespace-nowrap"
            >
              <td class="px-6 py-4 text-gray-900 font-semibold">{{ item.customer_dest }}</td>
              <td class="px-6 py-4 text-gray-900 font-semibold">{{ item.project_id }}</td>
              <td class="px-6 py-4 text-gray-900 font-semibold">{{ item.part_number }}</td>
              <td class="px-6 py-4 text-gray-700 font-mono">{{ item.job_number }}</td>
              <td class="px-6 py-4 text-gray-900 font-semibold">{{ item.ZROUTING }}</td>
              <td v-for="lbl in pcsWeekLabels" :key="weekKey(lbl) + '-' + item.part_number" class="px-6 py-4 text-gray-800">
                {{ formatNumber(item[weekKey(lbl)]) }}
              </td>
            </tr>
            <tr v-else>
              <td :colspan="5 + (pcsWeekLabels?.length ?? 0)" class="px-6 py-10 text-center text-gray-500 bg-gray-50">No data found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div
        v-if="!isLoading && filteredItems2.length > 0"
        class="flex flex-col md:flex-row items-center justify-between p-4 border border-t-0 border-gray-200 rounded-b-lg bg-gray-50"
      >
        <div class="flex items-center gap-2 mb-4 md:mb-0">
          <span class="text-sm text-gray-700">Rows per page:</span>
          <select v-model="table2.rowsPerPage" class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg px-6 py-1.5">
            <option v-for="opt in rowsOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>
        <span class="text-sm text-gray-700 mb-4 md:mb-0">
          Showing
          <span class="font-semibold text-gray-900">
            {{ filteredItems2.length === 0 ? 0 : (table2.currentPage - 1) * table2.rowsPerPage + 1 }}
          </span>
          –
          <span class="font-semibold text-gray-900">
            {{ Math.min(table2.currentPage * table2.rowsPerPage, filteredItems2.length) }}
          </span>
          of
          <span class="font-semibold text-gray-900">{{ filteredItems2.length }}</span>
          entries
        </span>
        <div class="flex items-center gap-2">
          <button
            @click="table2.currentPage--"
            :disabled="table2.currentPage === 1"
            class="px-3 py-1 text-sm font-medium text-gray-600 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span class="text-sm text-gray-700">Page {{ table2.currentPage }} / {{ totalPages2 }}</span>
          <button
            @click="table2.currentPage++"
            :disabled="table2.currentPage >= totalPages2"
            class="px-3 py-1 text-sm font-medium text-gray-600 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
    </div>

    <!-- Strength History Segment -->
    <div class="w-full max-w-10xl mx-auto mt-4 mb-6 bg-white p-5 border border-gray-200 rounded-lg shadow-sm">
      <div class="border-l-4 border-amber-500 pl-4 mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span class="text-base font-bold text-amber-600">Strength History</span>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700">Start Date:</label>
            <input
              type="date"
              v-model="strengthStartDate"
              class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700">End Date:</label>
            <input
              type="date"
              v-model="strengthEndDate"
              class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
            />
          </div>
          <button
            @click="fetchStrengthHistory"
            :disabled="isStrengthLoading"
            class="text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 transition-all"
          >
            <span v-if="isStrengthLoading">Loading...</span>
            <span v-else>Filter</span>
          </button>
          <button
            @click="exportFrequencySummaryExcel"
            :disabled="isStrengthLoading || isExportingExcel || summaryFilteredList.length === 0"
            class="text-white bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-emerald-300 font-medium rounded-lg text-sm px-4 py-2 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            <svg
              v-if="isExportingExcel"
              class="animate-spin -ml-0.5 mr-1 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <svg v-else class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6m4 18H6V4h7v5h5v11m-3-7l-1.41-1.41L11 14.17V10H9v4.17l-2.59-2.58L5 13l5 5l6-6z"/>
            </svg>
            <span>{{ isExportingExcel ? 'Mengunduh...' : 'Export Excel' }}</span>
          </button>
        </div>
      </div>

      <!-- Pareto Charts (Kritis & Over side-by-side in one row) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <!-- Pareto Chart KRITIS -->
        <div class="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
          <h3 class="text-sm font-bold text-gray-700 mb-2">Pareto Chart (KRITIS)</h3>
          <div id="kritis-apexchart-wrap" class="bg-white">
            <div v-if="isStrengthLoading" class="flex justify-center items-center h-[250px]">
              <span class="text-gray-400">Loading chart...</span>
            </div>
            <apexchart
              v-else-if="strengthHistorySummary.filter((i) => i.KRITIS > 0).length > 0"
              type="line"
              height="250"
              :options="kritisChartOptions"
              :series="kritisChartSeries"
            ></apexchart>
            <div v-else class="flex justify-center items-center h-[250px]">
              <span class="text-gray-400">No data Kritis</span>
            </div>
          </div>

          <!-- Kritis Details Table -->
          <div class="mt-4 border-t pt-4" @click="kritisDetailFilter.closeDropdowns">
            <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-xs font-bold text-gray-700">Kritis Details (Top 15 Items)</h4>
                <input
                  v-model="kritisDetailPagination.searchQuery"
                  type="text"
                  placeholder="Cari..."
                  class="block p-1 text-[10px] text-gray-900 border border-gray-300 rounded-full w-40 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  @click.stop
                />
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <div
                  v-if="filteredKritisDetailItems.length > 0 && kritisDetailFilter.isAnyFilterActive.value"
                  class="flex items-center gap-1"
                >
                  <button
                    @click="kritisDetailFilter.resetFilters()"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors"
                  >
                    ✕ Bersihkan
                  </button>
                </div>
              </div>
            </div>

            <div class="w-full border border-gray-200 rounded-t-lg bg-white overflow-auto max-h-[300px] min-h-[320px]">
              <table
                class="w-full text-xs text-gray-500 text-center whitespace-nowrap"
                style="border-collapse: separate; border-spacing: 0"
              >
                <thead class="text-gray-600 text-center text-[10px] bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" class="px-3 py-2 border-b">No</th>
                    <th scope="col" class="px-3 py-2 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" @click.stop>
                      <div class="flex items-center justify-center gap-1">
                        <span>Part Number</span>
                        <button
                          @click.stop="kritisDetailFilter.toggleDropdown('matnr')"
                          :class="['excel-filter-btn', kritisDetailFilter.colFilters.matnr.length ? 'excel-filter-btn-active' : '']"
                        >
                          ▼
                        </button>
                      </div>
                      <div v-if="kritisDetailFilter.activeDropdown.value === 'matnr'" class="excel-dropdown" @click.stop>
                        <div class="excel-dropdown-search">
                          <input v-model="kritisDetailFilter.colSearch.matnr" placeholder="Cari…" class="excel-search-input" @click.stop />
                        </div>
                        <label class="excel-check-all">
                          <input
                            type="checkbox"
                            :checked="kritisDetailFilter.isColAllSelected('matnr')"
                            @change="kritisDetailFilter.toggleColAll('matnr')"
                          />
                          <span>(Semua)</span>
                        </label>
                        <div class="excel-options-list">
                          <label v-for="opt in kritisDetailFilter.getColOptions('matnr')" :key="opt" class="excel-option">
                            <input type="checkbox" :value="opt" v-model="kritisDetailFilter.colFilters.matnr" />
                            <span>{{ opt }}</span>
                          </label>
                        </div>
                      </div>
                    </th>
                    <th scope="col" class="px-3 py-2 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" @click.stop>
                      <div class="flex items-center justify-center gap-1">
                        <span>Job Number</span>
                        <button
                          @click.stop="kritisDetailFilter.toggleDropdown('bismt')"
                          :class="['excel-filter-btn', kritisDetailFilter.colFilters.bismt.length ? 'excel-filter-btn-active' : '']"
                        >
                          ▼
                        </button>
                      </div>
                      <div v-if="kritisDetailFilter.activeDropdown.value === 'bismt'" class="excel-dropdown" @click.stop>
                        <div class="excel-dropdown-search">
                          <input v-model="kritisDetailFilter.colSearch.bismt" placeholder="Cari…" class="excel-search-input" @click.stop />
                        </div>
                        <label class="excel-check-all">
                          <input
                            type="checkbox"
                            :checked="kritisDetailFilter.isColAllSelected('bismt')"
                            @change="kritisDetailFilter.toggleColAll('bismt')"
                          />
                          <span>(Semua)</span>
                        </label>
                        <div class="excel-options-list">
                          <label v-for="opt in kritisDetailFilter.getColOptions('bismt')" :key="opt" class="excel-option">
                            <input type="checkbox" :value="opt" v-model="kritisDetailFilter.colFilters.bismt" />
                            <span>{{ opt }}</span>
                          </label>
                        </div>
                      </div>
                    </th>
                    <th scope="col" class="px-3 py-2 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" @click.stop>
                      <div class="flex items-center justify-center gap-1">
                        <span>Customer</span>
                        <button
                          @click.stop="kritisDetailFilter.toggleDropdown('dest1')"
                          :class="['excel-filter-btn', kritisDetailFilter.colFilters.dest1.length ? 'excel-filter-btn-active' : '']"
                        >
                          ▼
                        </button>
                      </div>
                      <div v-if="kritisDetailFilter.activeDropdown.value === 'dest1'" class="excel-dropdown" @click.stop>
                        <div class="excel-dropdown-search">
                          <input v-model="kritisDetailFilter.colSearch.dest1" placeholder="Cari…" class="excel-search-input" @click.stop />
                        </div>
                        <label class="excel-check-all">
                          <input
                            type="checkbox"
                            :checked="kritisDetailFilter.isColAllSelected('dest1')"
                            @change="kritisDetailFilter.toggleColAll('dest1')"
                          />
                          <span>(Semua)</span>
                        </label>
                        <div class="excel-options-list">
                          <label v-for="opt in kritisDetailFilter.getColOptions('dest1')" :key="opt" class="excel-option">
                            <input type="checkbox" :value="opt" v-model="kritisDetailFilter.colFilters.dest1" />
                            <span>{{ opt }}</span>
                          </label>
                        </div>
                      </div>
                    </th>
                    <th scope="col" class="px-3 py-2 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" @click.stop>
                      <div class="flex items-center justify-center gap-1">
                        <span>Routing</span>
                        <button
                          @click.stop="kritisDetailFilter.toggleDropdown('zrouting')"
                          :class="['excel-filter-btn', kritisDetailFilter.colFilters.zrouting.length ? 'excel-filter-btn-active' : '']"
                        >
                          ▼
                        </button>
                      </div>
                      <div v-if="kritisDetailFilter.activeDropdown.value === 'zrouting'" class="excel-dropdown" @click.stop>
                        <div class="excel-dropdown-search">
                          <input
                            v-model="kritisDetailFilter.colSearch.zrouting"
                            placeholder="Cari…"
                            class="excel-search-input"
                            @click.stop
                          />
                        </div>
                        <label class="excel-check-all">
                          <input
                            type="checkbox"
                            :checked="kritisDetailFilter.isColAllSelected('zrouting')"
                            @change="kritisDetailFilter.toggleColAll('zrouting')"
                          />
                          <span>(Semua)</span>
                        </label>
                        <div class="excel-options-list">
                          <label v-for="opt in kritisDetailFilter.getColOptions('zrouting')" :key="opt" class="excel-option">
                            <input type="checkbox" :value="opt" v-model="kritisDetailFilter.colFilters.zrouting" />
                            <span>{{ opt }}</span>
                          </label>
                        </div>
                      </div>
                    </th>
                    <th scope="col" class="px-3 py-2 border-b text-red-600">Total Kritis</th>
                  </tr>
                </thead>
                <tbody class="font-medium text-[11px]">
                  <tr v-if="isStrengthLoading">
                    <td colspan="6" class="px-3 py-2 text-center text-gray-400">Loading...</td>
                  </tr>
                  <tr v-else-if="filteredKritisDetailItems.length === 0">
                    <td colspan="6" class="px-3 py-2 text-center text-gray-500 bg-gray-50">No data found</td>
                  </tr>
                  <tr
                    v-else
                    v-for="(item, idx) in paginatedKritisDetailItems"
                    :key="idx"
                    class="odd:bg-white even:bg-gray-50 border-b border-gray-150 hover:bg-blue-50/30 transition-colors text-center whitespace-nowrap"
                  >
                    <td class="px-3 py-2 text-gray-900 font-semibold">
                      {{ (kritisDetailPagination.currentPage - 1) * kritisDetailPagination.rowsPerPage + idx + 1 }}
                    </td>
                    <td class="px-3 py-2 text-gray-900 font-semibold">{{ item.matnr }}</td>
                    <td class="px-3 py-2 text-gray-700 font-mono">{{ item.bismt }}</td>
                    <td class="px-3 py-2 text-gray-900 font-semibold">{{ item.dest1 }}</td>
                    <td class="px-3 py-2 text-gray-900 font-semibold">{{ item.zrouting }}</td>
                    <td class="px-3 py-2 text-center font-bold text-red-600">{{ item.KRITIS }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div
              class="flex justify-between items-center px-3 py-2 bg-gray-50 border border-t-0 border-gray-200 rounded-b-lg text-[10px] flex-wrap gap-2"
            >
              <span class="text-gray-500">
                Tampil
                {{
                  Math.min(
                    (kritisDetailPagination.currentPage - 1) * kritisDetailPagination.rowsPerPage + 1,
                    filteredKritisDetailItems.length
                  )
                }}
                -
                {{ Math.min(kritisDetailPagination.currentPage * kritisDetailPagination.rowsPerPage, filteredKritisDetailItems.length) }}
                dari {{ filteredKritisDetailItems.length }}
              </span>
              <div class="flex items-center gap-2">
                <button
                  @click="kritisDetailPagination.currentPage--"
                  :disabled="kritisDetailPagination.currentPage === 1"
                  class="px-2 py-0.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40"
                >
                  &larr; Prev
                </button>
                <span>Page {{ kritisDetailPagination.currentPage }} / {{ totalKritisDetailPages }}</span>
                <button
                  @click="kritisDetailPagination.currentPage++"
                  :disabled="kritisDetailPagination.currentPage >= totalKritisDetailPages"
                  class="px-2 py-0.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pareto Chart OVER -->
        <div class="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
          <h3 class="text-sm font-bold text-gray-700 mb-2">Pareto Chart (OVER)</h3>
          <div id="over-apexchart-wrap" class="bg-white">
            <div v-if="isStrengthLoading" class="flex justify-center items-center h-[250px]">
              <span class="text-gray-400">Loading chart...</span>
            </div>
            <apexchart
              v-else-if="strengthHistorySummary.filter((i) => i.OVER > 0).length > 0"
              type="line"
              height="250"
              :options="overChartOptions"
              :series="overChartSeries"
            ></apexchart>
            <div v-else class="flex justify-center items-center h-[250px]">
              <span class="text-gray-400">No data Over</span>
            </div>
          </div>

          <!-- Over Details Table -->
          <div class="mt-4 border-t pt-4" @click="overDetailFilter.closeDropdowns">
            <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-xs font-bold text-gray-700">Over Details (Top 15 Items)</h4>
                <input
                  v-model="overDetailPagination.searchQuery"
                  type="text"
                  placeholder="Cari..."
                  class="block p-1 text-[10px] text-gray-900 border border-gray-300 rounded-full w-40 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  @click.stop
                />
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <div v-if="filteredOverDetailItems.length > 0 && overDetailFilter.isAnyFilterActive.value" class="flex items-center gap-1">
                  <button
                    @click="overDetailFilter.resetFilters()"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors"
                  >
                    ✕ Bersihkan
                  </button>
                </div>
              </div>
            </div>

            <div class="w-full border border-gray-200 rounded-t-lg bg-white overflow-auto max-h-[300px] min-h-[320px]">
              <table
                class="w-full text-xs text-gray-500 text-center whitespace-nowrap"
                style="border-collapse: separate; border-spacing: 0"
              >
                <thead class="text-gray-600 text-center text-[10px] bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" class="px-3 py-2 border-b">No</th>
                    <th scope="col" class="px-3 py-2 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" @click.stop>
                      <div class="flex items-center justify-center gap-1">
                        <span>Part Number</span>
                        <button
                          @click.stop="overDetailFilter.toggleDropdown('matnr')"
                          :class="['excel-filter-btn', overDetailFilter.colFilters.matnr.length ? 'excel-filter-btn-active' : '']"
                        >
                          ▼
                        </button>
                      </div>
                      <div v-if="overDetailFilter.activeDropdown.value === 'matnr'" class="excel-dropdown" @click.stop>
                        <div class="excel-dropdown-search">
                          <input v-model="overDetailFilter.colSearch.matnr" placeholder="Cari…" class="excel-search-input" @click.stop />
                        </div>
                        <label class="excel-check-all">
                          <input
                            type="checkbox"
                            :checked="overDetailFilter.isColAllSelected('matnr')"
                            @change="overDetailFilter.toggleColAll('matnr')"
                          />
                          <span>(Semua)</span>
                        </label>
                        <div class="excel-options-list">
                          <label v-for="opt in overDetailFilter.getColOptions('matnr')" :key="opt" class="excel-option">
                            <input type="checkbox" :value="opt" v-model="overDetailFilter.colFilters.matnr" />
                            <span>{{ opt }}</span>
                          </label>
                        </div>
                      </div>
                    </th>
                    <th scope="col" class="px-3 py-2 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" @click.stop>
                      <div class="flex items-center justify-center gap-1">
                        <span>Job Number</span>
                        <button
                          @click.stop="overDetailFilter.toggleDropdown('bismt')"
                          :class="['excel-filter-btn', overDetailFilter.colFilters.bismt.length ? 'excel-filter-btn-active' : '']"
                        >
                          ▼
                        </button>
                      </div>
                      <div v-if="overDetailFilter.activeDropdown.value === 'bismt'" class="excel-dropdown" @click.stop>
                        <div class="excel-dropdown-search">
                          <input v-model="overDetailFilter.colSearch.bismt" placeholder="Cari…" class="excel-search-input" @click.stop />
                        </div>
                        <label class="excel-check-all">
                          <input
                            type="checkbox"
                            :checked="overDetailFilter.isColAllSelected('bismt')"
                            @change="overDetailFilter.toggleColAll('bismt')"
                          />
                          <span>(Semua)</span>
                        </label>
                        <div class="excel-options-list">
                          <label v-for="opt in overDetailFilter.getColOptions('bismt')" :key="opt" class="excel-option">
                            <input type="checkbox" :value="opt" v-model="overDetailFilter.colFilters.bismt" />
                            <span>{{ opt }}</span>
                          </label>
                        </div>
                      </div>
                    </th>
                    <th scope="col" class="px-3 py-2 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" @click.stop>
                      <div class="flex items-center justify-center gap-1">
                        <span>Customer</span>
                        <button
                          @click.stop="overDetailFilter.toggleDropdown('dest1')"
                          :class="['excel-filter-btn', overDetailFilter.colFilters.dest1.length ? 'excel-filter-btn-active' : '']"
                        >
                          ▼
                        </button>
                      </div>
                      <div v-if="overDetailFilter.activeDropdown.value === 'dest1'" class="excel-dropdown" @click.stop>
                        <div class="excel-dropdown-search">
                          <input v-model="overDetailFilter.colSearch.dest1" placeholder="Cari…" class="excel-search-input" @click.stop />
                        </div>
                        <label class="excel-check-all">
                          <input
                            type="checkbox"
                            :checked="overDetailFilter.isColAllSelected('dest1')"
                            @change="overDetailFilter.toggleColAll('dest1')"
                          />
                          <span>(Semua)</span>
                        </label>
                        <div class="excel-options-list">
                          <label v-for="opt in overDetailFilter.getColOptions('dest1')" :key="opt" class="excel-option">
                            <input type="checkbox" :value="opt" v-model="overDetailFilter.colFilters.dest1" />
                            <span>{{ opt }}</span>
                          </label>
                        </div>
                      </div>
                    </th>
                    <th scope="col" class="px-3 py-2 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" @click.stop>
                      <div class="flex items-center justify-center gap-1">
                        <span>Routing</span>
                        <button
                          @click.stop="overDetailFilter.toggleDropdown('zrouting')"
                          :class="['excel-filter-btn', overDetailFilter.colFilters.zrouting.length ? 'excel-filter-btn-active' : '']"
                        >
                          ▼
                        </button>
                      </div>
                      <div v-if="overDetailFilter.activeDropdown.value === 'zrouting'" class="excel-dropdown" @click.stop>
                        <div class="excel-dropdown-search">
                          <input v-model="overDetailFilter.colSearch.zrouting" placeholder="Cari…" class="excel-search-input" @click.stop />
                        </div>
                        <label class="excel-check-all">
                          <input
                            type="checkbox"
                            :checked="overDetailFilter.isColAllSelected('zrouting')"
                            @change="overDetailFilter.toggleColAll('zrouting')"
                          />
                          <span>(Semua)</span>
                        </label>
                        <div class="excel-options-list">
                          <label v-for="opt in overDetailFilter.getColOptions('zrouting')" :key="opt" class="excel-option">
                            <input type="checkbox" :value="opt" v-model="overDetailFilter.colFilters.zrouting" />
                            <span>{{ opt }}</span>
                          </label>
                        </div>
                      </div>
                    </th>
                    <th scope="col" class="px-3 py-2 border-b text-amber-500">Total Over</th>
                  </tr>
                </thead>
                <tbody class="font-medium text-[11px]">
                  <tr v-if="isStrengthLoading">
                    <td colspan="6" class="px-3 py-2 text-center text-gray-400">Loading...</td>
                  </tr>
                  <tr v-else-if="filteredOverDetailItems.length === 0">
                    <td colspan="6" class="px-3 py-2 text-center text-gray-500 bg-gray-50">No data found</td>
                  </tr>
                  <tr
                    v-else
                    v-for="(item, idx) in paginatedOverDetailItems"
                    :key="idx"
                    class="odd:bg-white even:bg-gray-50 border-b border-gray-150 hover:bg-blue-50/30 transition-colors text-center whitespace-nowrap"
                  >
                    <td class="px-3 py-2 text-gray-900 font-semibold">
                      {{ (overDetailPagination.currentPage - 1) * overDetailPagination.rowsPerPage + idx + 1 }}
                    </td>
                    <td class="px-3 py-2 text-gray-900 font-semibold">{{ item.matnr }}</td>
                    <td class="px-3 py-2 text-gray-700 font-mono">{{ item.bismt }}</td>
                    <td class="px-3 py-2 text-gray-900 font-semibold">{{ item.dest1 }}</td>
                    <td class="px-3 py-2 text-gray-900 font-semibold">{{ item.zrouting }}</td>
                    <td class="px-3 py-2 text-center font-bold text-amber-500">{{ item.OVER }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div
              class="flex justify-between items-center px-3 py-2 bg-gray-50 border border-t-0 border-gray-200 rounded-b-lg text-[10px] flex-wrap gap-2"
            >
              <span class="text-gray-500">
                Tampil
                {{
                  Math.min((overDetailPagination.currentPage - 1) * overDetailPagination.rowsPerPage + 1, filteredOverDetailItems.length)
                }}
                - {{ Math.min(overDetailPagination.currentPage * overDetailPagination.rowsPerPage, filteredOverDetailItems.length) }} dari
                {{ filteredOverDetailItems.length }}
              </span>
              <div class="flex items-center gap-2">
                <button
                  @click="overDetailPagination.currentPage--"
                  :disabled="overDetailPagination.currentPage === 1"
                  class="px-2 py-0.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40"
                >
                  &larr; Prev
                </button>
                <span>Page {{ overDetailPagination.currentPage }} / {{ totalOverDetailPages }}</span>
                <button
                  @click="overDetailPagination.currentPage++"
                  :disabled="overDetailPagination.currentPage >= totalOverDetailPages"
                  class="px-2 py-0.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Table (Full Width) -->
      <div class="w-full bg-white p-4 border border-gray-200 rounded-lg shadow-sm flex flex-col" @click="summaryFilter.closeDropdowns">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 class="text-sm font-bold text-gray-700">Frequency Summary</h3>
          <div v-if="summaryFilteredList.length > 0 && summaryFilter.isAnyFilterActive.value" class="flex items-center gap-2">
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100"
              >Filter Aktif</span
            >
            <button
              @click="summaryFilter.resetFilters()"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors"
            >
              ✕ Bersihkan
            </button>
          </div>
        </div>

        <!-- Table Wrapper matching PCS/Day Summary style -->
        <div class="w-full border border-gray-200 rounded-t-lg bg-white" style="overflow: auto; max-height: 520px; min-height: 380px">
          <table class="w-full text-sm text-gray-500 text-center whitespace-nowrap" style="border-collapse: separate; border-spacing: 0">
            <thead class="text-gray-600 text-center text-xs" style="position: sticky; top: 0; z-index: 2">
              <tr>
                <th scope="col" class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b">No</th>
                <th scope="col" class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" @click.stop>
                  <div class="flex items-center justify-center gap-1">
                    <span>Part Number</span>
                    <button
                      @click.stop="summaryFilter.toggleDropdown('matnr')"
                      :class="['excel-filter-btn', summaryFilter.colFilters.matnr.length ? 'excel-filter-btn-active' : '']"
                    >
                      ▼
                    </button>
                  </div>
                  <div v-if="summaryFilter.activeDropdown.value === 'matnr'" class="excel-dropdown" @click.stop>
                    <div class="excel-dropdown-search">
                      <input v-model="summaryFilter.colSearch.matnr" placeholder="Cari…" class="excel-search-input" @click.stop />
                    </div>
                    <label class="excel-check-all">
                      <input
                        type="checkbox"
                        :checked="summaryFilter.isColAllSelected('matnr')"
                        @change="summaryFilter.toggleColAll('matnr')"
                      />
                      <span>(Semua)</span>
                    </label>
                    <div class="excel-options-list">
                      <label v-for="opt in summaryFilter.getColOptions('matnr')" :key="opt" class="excel-option">
                        <input type="checkbox" :value="opt" v-model="summaryFilter.colFilters.matnr" />
                        <span>{{ opt }}</span>
                      </label>
                    </div>
                  </div>
                </th>
                <th scope="col" class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" @click.stop>
                  <div class="flex items-center justify-center gap-1">
                    <span>Job Number</span>
                    <button
                      @click.stop="summaryFilter.toggleDropdown('bismt')"
                      :class="['excel-filter-btn', summaryFilter.colFilters.bismt.length ? 'excel-filter-btn-active' : '']"
                    >
                      ▼
                    </button>
                  </div>
                  <div v-if="summaryFilter.activeDropdown.value === 'bismt'" class="excel-dropdown" @click.stop>
                    <div class="excel-dropdown-search">
                      <input v-model="summaryFilter.colSearch.bismt" placeholder="Cari…" class="excel-search-input" @click.stop />
                    </div>
                    <label class="excel-check-all">
                      <input
                        type="checkbox"
                        :checked="summaryFilter.isColAllSelected('bismt')"
                        @change="summaryFilter.toggleColAll('bismt')"
                      />
                      <span>(Semua)</span>
                    </label>
                    <div class="excel-options-list">
                      <label v-for="opt in summaryFilter.getColOptions('bismt')" :key="opt" class="excel-option">
                        <input type="checkbox" :value="opt" v-model="summaryFilter.colFilters.bismt" />
                        <span>{{ opt }}</span>
                      </label>
                    </div>
                  </div>
                </th>
                <th scope="col" class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" @click.stop>
                  <div class="flex items-center justify-center gap-1">
                    <span>Customer</span>
                    <button
                      @click.stop="summaryFilter.toggleDropdown('dest1')"
                      :class="['excel-filter-btn', summaryFilter.colFilters.dest1.length ? 'excel-filter-btn-active' : '']"
                    >
                      ▼
                    </button>
                  </div>
                  <div v-if="summaryFilter.activeDropdown.value === 'dest1'" class="excel-dropdown" @click.stop>
                    <div class="excel-dropdown-search">
                      <input v-model="summaryFilter.colSearch.dest1" placeholder="Cari…" class="excel-search-input" @click.stop />
                    </div>
                    <label class="excel-check-all">
                      <input
                        type="checkbox"
                        :checked="summaryFilter.isColAllSelected('dest1')"
                        @change="summaryFilter.toggleColAll('dest1')"
                      />
                      <span>(Semua)</span>
                    </label>
                    <div class="excel-options-list">
                      <label v-for="opt in summaryFilter.getColOptions('dest1')" :key="opt" class="excel-option">
                        <input type="checkbox" :value="opt" v-model="summaryFilter.colFilters.dest1" />
                        <span>{{ opt }}</span>
                      </label>
                    </div>
                  </div>
                </th>
                <th scope="col" class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" @click.stop>
                  <div class="flex items-center justify-center gap-1">
                    <span>Model</span>
                    <button
                      @click.stop="summaryFilter.toggleDropdown('project_id')"
                      :class="['excel-filter-btn', summaryFilter.colFilters.project_id.length ? 'excel-filter-btn-active' : '']"
                    >
                      ▼
                    </button>
                  </div>
                  <div v-if="summaryFilter.activeDropdown.value === 'project_id'" class="excel-dropdown" @click.stop>
                    <div class="excel-dropdown-search">
                      <input v-model="summaryFilter.colSearch.project_id" placeholder="Cari…" class="excel-search-input" @click.stop />
                    </div>
                    <label class="excel-check-all">
                      <input
                        type="checkbox"
                        :checked="summaryFilter.isColAllSelected('project_id')"
                        @change="summaryFilter.toggleColAll('project_id')"
                      />
                      <span>(Semua)</span>
                    </label>
                    <div class="excel-options-list">
                      <label v-for="opt in summaryFilter.getColOptions('project_id')" :key="opt" class="excel-option">
                        <input type="checkbox" :value="opt" v-model="summaryFilter.colFilters.project_id" />
                        <span>{{ opt }}</span>
                      </label>
                    </div>
                  </div>
                </th>
                <th scope="col" class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b relative" @click.stop>
                  <div class="flex items-center justify-center gap-1">
                    <span>Routing</span>
                    <button
                      @click.stop="summaryFilter.toggleDropdown('zrouting')"
                      :class="['excel-filter-btn', summaryFilter.colFilters.zrouting.length ? 'excel-filter-btn-active' : '']"
                    >
                      ▼
                    </button>
                  </div>
                  <div v-if="summaryFilter.activeDropdown.value === 'zrouting'" class="excel-dropdown" @click.stop>
                    <div class="excel-dropdown-search">
                      <input v-model="summaryFilter.colSearch.zrouting" placeholder="Cari…" class="excel-search-input" @click.stop />
                    </div>
                    <label class="excel-check-all">
                      <input
                        type="checkbox"
                        :checked="summaryFilter.isColAllSelected('zrouting')"
                        @change="summaryFilter.toggleColAll('zrouting')"
                      />
                      <span>(Semua)</span>
                    </label>
                    <div class="excel-options-list">
                      <label v-for="opt in summaryFilter.getColOptions('zrouting')" :key="opt" class="excel-option">
                        <input type="checkbox" :value="opt" v-model="summaryFilter.colFilters.zrouting" />
                        <span>{{ opt }}</span>
                      </label>
                    </div>
                  </div>
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b text-center text-red-600 relative"
                  @click.stop
                >
                  <div class="flex items-center justify-center gap-1">
                    <span>Kritis</span>
                    <button
                      @click.stop="summaryFilter.toggleDropdown('KRITIS')"
                      :class="['excel-filter-btn', summaryFilter.colFilters.KRITIS.length ? 'excel-filter-btn-active' : '']"
                    >
                      ▼
                    </button>
                  </div>
                  <div
                    v-if="summaryFilter.activeDropdown.value === 'KRITIS'"
                    class="excel-dropdown"
                    style="right: 0; left: auto"
                    @click.stop
                  >
                    <div class="excel-dropdown-search">
                      <input v-model="summaryFilter.colSearch.KRITIS" placeholder="Cari…" class="excel-search-input" @click.stop />
                    </div>
                    <label class="excel-check-all">
                      <input
                        type="checkbox"
                        :checked="summaryFilter.isColAllSelected('KRITIS')"
                        @change="summaryFilter.toggleColAll('KRITIS')"
                      />
                      <span>(Semua)</span>
                    </label>
                    <div class="excel-options-list">
                      <label v-for="opt in summaryFilter.getColOptions('KRITIS')" :key="opt" class="excel-option">
                        <input type="checkbox" :value="opt" v-model="summaryFilter.colFilters.KRITIS" />
                        <span>{{ opt }}</span>
                      </label>
                    </div>
                  </div>
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b text-center text-green-600 relative"
                  @click.stop
                >
                  <div class="flex items-center justify-center gap-1">
                    <span>Safe</span>
                    <button
                      @click.stop="summaryFilter.toggleDropdown('SAFE')"
                      :class="['excel-filter-btn', summaryFilter.colFilters.SAFE.length ? 'excel-filter-btn-active' : '']"
                    >
                      ▼
                    </button>
                  </div>
                  <div v-if="summaryFilter.activeDropdown.value === 'SAFE'" class="excel-dropdown" style="right: 0; left: auto" @click.stop>
                    <div class="excel-dropdown-search">
                      <input v-model="summaryFilter.colSearch.SAFE" placeholder="Cari…" class="excel-search-input" @click.stop />
                    </div>
                    <label class="excel-check-all">
                      <input
                        type="checkbox"
                        :checked="summaryFilter.isColAllSelected('SAFE')"
                        @change="summaryFilter.toggleColAll('SAFE')"
                      />
                      <span>(Semua)</span>
                    </label>
                    <div class="excel-options-list">
                      <label v-for="opt in summaryFilter.getColOptions('SAFE')" :key="opt" class="excel-option">
                        <input type="checkbox" :value="opt" v-model="summaryFilter.colFilters.SAFE" />
                        <span>{{ opt }}</span>
                      </label>
                    </div>
                  </div>
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b text-center text-amber-500 relative"
                  @click.stop
                >
                  <div class="flex items-center justify-center gap-1">
                    <span>Over</span>
                    <button
                      @click.stop="summaryFilter.toggleDropdown('OVER')"
                      :class="['excel-filter-btn', summaryFilter.colFilters.OVER.length ? 'excel-filter-btn-active' : '']"
                    >
                      ▼
                    </button>
                  </div>
                  <div v-if="summaryFilter.activeDropdown.value === 'OVER'" class="excel-dropdown" style="right: 0; left: auto" @click.stop>
                    <div class="excel-dropdown-search">
                      <input v-model="summaryFilter.colSearch.OVER" placeholder="Cari…" class="excel-search-input" @click.stop />
                    </div>
                    <label class="excel-check-all">
                      <input
                        type="checkbox"
                        :checked="summaryFilter.isColAllSelected('OVER')"
                        @change="summaryFilter.toggleColAll('OVER')"
                      />
                      <span>(Semua)</span>
                    </label>
                    <div class="excel-options-list">
                      <label v-for="opt in summaryFilter.getColOptions('OVER')" :key="opt" class="excel-option">
                        <input type="checkbox" :value="opt" v-model="summaryFilter.colFilters.OVER" />
                        <span>{{ opt }}</span>
                      </label>
                    </div>
                  </div>
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 cursor-pointer select-none hover:bg-blue-100 bg-blue-50 border-b text-center relative"
                  @click.stop
                >
                  <div class="flex items-center justify-center gap-1">
                    <span>Total</span>
                    <button
                      @click.stop="summaryFilter.toggleDropdown('total')"
                      :class="['excel-filter-btn', summaryFilter.colFilters.total.length ? 'excel-filter-btn-active' : '']"
                    >
                      ▼
                    </button>
                  </div>
                  <div
                    v-if="summaryFilter.activeDropdown.value === 'total'"
                    class="excel-dropdown"
                    style="right: 0; left: auto"
                    @click.stop
                  >
                    <div class="excel-dropdown-search">
                      <input v-model="summaryFilter.colSearch.total" placeholder="Cari…" class="excel-search-input" @click.stop />
                    </div>
                    <label class="excel-check-all">
                      <input
                        type="checkbox"
                        :checked="summaryFilter.isColAllSelected('total')"
                        @change="summaryFilter.toggleColAll('total')"
                      />
                      <span>(Semua)</span>
                    </label>
                    <div class="excel-options-list">
                      <label v-for="opt in summaryFilter.getColOptions('total')" :key="opt" class="excel-option">
                        <input type="checkbox" :value="opt" v-model="summaryFilter.colFilters.total" />
                        <span>{{ opt }}</span>
                      </label>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody class="font-medium">
              <tr v-if="isStrengthLoading">
                <td colspan="10" class="px-6 py-4 text-center text-gray-400">Loading data...</td>
              </tr>
              <tr v-else-if="summaryFilteredList.length === 0">
                <td colspan="10" class="px-6 py-4 text-center text-gray-500 bg-gray-50">No data found</td>
              </tr>
              <tr
                v-else
                v-for="(item, idx) in summaryFilteredList"
                :key="idx"
                class="odd:bg-white even:bg-gray-50 border-b border-gray-200 hover:bg-blue-50/50 transition-colors text-center whitespace-nowrap"
              >
                <td class="px-6 py-4 text-gray-900 font-semibold">{{ idx + 1 }}</td>
                <td class="px-6 py-4 text-gray-900 font-semibold">{{ item.matnr }}</td>
                <td class="px-6 py-4 text-gray-700 font-mono">{{ item.bismt }}</td>
                <td class="px-6 py-4 text-gray-900 font-semibold">{{ item.dest1 }}</td>
                <td class="px-6 py-4 text-gray-900 font-semibold">{{ item.project_id }}</td>
                <td class="px-6 py-4 text-gray-900 font-semibold">{{ item.zrouting }}</td>
                <td class="px-6 py-4 text-center font-bold text-red-600">{{ item.KRITIS }}</td>
                <td class="px-6 py-4 text-center font-bold text-green-600">{{ item.SAFE }}</td>
                <td class="px-6 py-4 text-center font-bold text-amber-500">{{ item.OVER }}</td>
                <td class="px-6 py-4 text-center font-bold text-gray-900">{{ item.total }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Shipping Preparation -->
    <div class="w-full max-w-10xl mx-auto simple-dt-custom">
      <div class="border-l-4 border-indigo-500 pl-4 mb-4 flex items-center gap-2">
        <span class="text-base font-bold text-indigo-600">Shipping Preparation (Per Jam)</span>
      </div>

      <div class="flex gap-4 flex-wrap items-center mb-4">
        <input
          v-model="shippingFilter.search"
          type="text"
          placeholder="Search Part Number"
          class="block p-2.5 text-sm text-gray-900 border border-gray-300 rounded-full w-72 bg-gray-50"
        />

        <select v-model="shippingFilter.status" class="block w-48 p-2 text-sm border border-gray-300 rounded-lg bg-gray-50">
          <option value="All">All</option>
          <option value="RUNOUT">RUNOUT</option>
          <option value="SAFE">SAFE</option>
        </select>

        <div class="flex gap-2 flex-wrap ml-auto">
          <span class="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
            Parts: {{ shippingSummary.total_parts }}
          </span>
          <span class="text-xs font-semibold bg-red-100 text-red-700 px-3 py-1 rounded-full">
            Runout: {{ shippingSummary.runout_parts }}
          </span>
          <span class="text-xs font-semibold bg-green-100 text-green-700 px-3 py-1 rounded-full">
            Safe: {{ shippingSummary.safe_parts }}
          </span>
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white">
        <div class="max-h-[480px] overflow-auto">
          <table class="w-full text-sm text-gray-500 text-center">
            <thead class="text-gray-600 bg-indigo-50 sticky top-0 z-10">
              <tr>
                <th class="px-4 py-3 bg-indigo-50">Part Number</th>
                <th class="px-4 py-3 bg-indigo-50">Init Stock</th>
                <th class="px-4 py-3 bg-indigo-50">Status</th>
                <th v-for="etd in shippingEtdLabels" :key="etd" class="px-4 py-3 bg-indigo-50">
                  {{ etd }}
                </th>
                <th class="px-4 py-3 bg-indigo-50">Final</th>
              </tr>
            </thead>

            <tbody class="font-medium">
              <tr v-if="shippingPaginatedItems.length === 0">
                <td :colspan="shippingEtdLabels.length + 4" class="px-4 py-8 text-center text-gray-400">No data found.</td>
              </tr>

              <tr
                v-for="item in shippingPaginatedItems"
                :key="item.part_number"
                class="odd:bg-white even:bg-gray-50 border-b border-gray-200"
              >
                <td class="px-4 py-3 font-semibold text-gray-900">{{ item.part_number }}</td>
                <td class="px-4 py-3">{{ formatNumber(item.init_stock) }}</td>

                <td class="px-4 py-3">
                  <span
                    :class="item.is_runout ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'"
                    class="inline-flex items-center px-2 py-1 rounded text-xs font-bold"
                  >
                    {{ item.status }}
                  </span>
                </td>

                <td v-for="etd in shippingEtdLabels" :key="'ship-' + item.part_number + '-' + etd" class="px-4 py-3">
                  <div v-if="!getShipRow(item, etd)" class="text-gray-400">-</div>

                  <div v-else class="flex flex-col items-center">
                    <button type="button" class="text-blue-600 font-bold hover:underline" @click="openShipDetail(item, etd)">
                      {{ formatNumber(getShipFinal(item, etd)) }}
                    </button>

                    <div class="text-xs text-gray-500 mt-1">
                      {{ formatNumber(getShipRow(item, etd).init_stok) }}
                      | +{{ formatNumber(getShipRow(item, etd).qty_added) }} | -{{ formatNumber(getShipRow(item, etd).qty_reduced) }}
                    </div>

                    <div class="text-[11px] text-gray-400">({{ String(getShipRow(item, etd).source || '-').trim() }})</div>
                  </div>
                </td>

                <td class="px-4 py-3">
                  <span
                    :class="item.final_stock <= 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'"
                    class="inline-flex items-center px-2 py-1 rounded text-xs font-bold"
                  >
                    {{ formatNumber(item.final_stock) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="filteredShippingGroups.length > 0"
          class="flex flex-col md:flex-row items-center justify-between p-4 border-t border-gray-200 bg-gray-50"
        >
          <div class="flex items-center gap-2 mb-4 md:mb-0">
            <span class="text-sm text-gray-700">Rows per page:</span>
            <select
              v-model="shippingTable.rowsPerPage"
              class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg min-w-[72px] h-10 px-3 pr-8 appearance-auto"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
          </div>

          <span class="text-sm text-gray-700 mb-4 md:mb-0">
            Showing
            <span class="font-semibold text-gray-900">
              {{ (shippingTable.currentPage - 1) * shippingTable.rowsPerPage + 1 }}
            </span>
            to
            <span class="font-semibold text-gray-900">
              {{ Math.min(shippingTable.currentPage * shippingTable.rowsPerPage, filteredShippingGroups.length) }}
            </span>
            of
            <span class="font-semibold text-gray-900">
              {{ filteredShippingGroups.length }}
            </span>
            Entries
          </span>

          <div class="flex items-center gap-2">
            <button
              @click="shippingTable.currentPage--"
              :disabled="shippingTable.currentPage === 1"
              class="px-3 py-1 text-sm font-medium text-gray-600 border border-gray-300 rounded disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Prev
            </button>

            <span class="text-sm text-gray-700"> Page {{ shippingTable.currentPage }} of {{ shippingTotalPages }} </span>

            <button
              @click="shippingTable.currentPage++"
              :disabled="shippingTable.currentPage === shippingTotalPages"
              class="px-3 py-1 text-sm font-medium text-gray-600 border border-gray-300 rounded disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div class="text-caption text-gray-500 mt-2">* Angka pada kolom jam = <b>Stock After</b> setelah shipment pada jam tersebut.</div>
    </div>

    <!-- Stock Empty Prediction -->
    <div class="w-full max-w-10xl mx-auto simple-dt-custom">
      <div class="border-l-4 border-red-500 pl-4 mb-4 flex items-center gap-2">
        <span class="text-base font-bold text-red-600">Stock Empty Prediction (H+0 to H+5)</span>
      </div>

      <div class="flex gap-6 flex-wrap justify-between pa-4">
        <div class="relative flex gap-6 flex-wrap">
          <div class="absolute inset-y-0 start-0 flex items-center pl-3 pointer-events-none">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            v-model="table3.searchQuery"
            type="text"
            class="block p-2.5 pl-10 text-sm text-gray-900 border border-gray-300 rounded-full w-72 bg-gray-50"
            placeholder="Search Part Number"
          />
        </div>

        <div class="flex gap-6 flex-wrap">
          <select v-model="table3.statusFilter" class="block w-76 p-2 text-sm border border-gray-300 rounded-lg bg-gray-50">
            <option value="All">All Status</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="WARNING">WARNING</option>
            <option value="STABLE">STABLE</option>
          </select>
        </div>
      </div>

      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="w-full text-sm text-gray-500 text-center">
          <thead class="text-gray-600 bg-red-50">
            <tr>
              <th class="px-6 py-3">Part Number</th>
              <th class="px-6 py-3">Customer</th>
              <th class="px-6 py-3">Init Stock</th>
              <th class="px-6 py-3">H+0</th>
              <th class="px-6 py-3">H+1</th>
              <th class="px-6 py-3">H+2</th>
              <th class="px-6 py-3">H+3</th>
              <th class="px-6 py-3">H+4</th>
              <th class="px-6 py-3">H+5</th>
              <th class="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="font-medium">
            <tr v-if="isLoading">
              <td colspan="10" class="px-6 py-10 text-center">Loading data...</td>
            </tr>
            <tr
              v-else-if="paginatedItems3.length > 0"
              v-for="(item, index) in paginatedItems3"
              :key="index"
              class="odd:bg-white even:bg-gray-50 border-b border-gray-200 hover:bg-red-50"
            >
              <td class="px-6 py-3 font-semibold text-gray-900">{{ item.MATNR }}</td>
              <td class="px-6 py-3 font-semibold text-gray-900">{{ item.DEST1 }}</td>
              <td class="px-6 py-3">
                <span class="bg-gray-100 text-gray-700 font-semibold px-2 py-1 rounded text-xs">
                  {{ item.LABST }}
                </span>
              </td>

              <td v-for="n in [0, 1, 2, 3, 4, 5]" :key="'r-' + item.MATNR + '-t' + n" class="px-4 py-3">
                <div class="flex flex-col items-center">
                  <span :class="getRunoutClass((item['t' + n] || {}).stock_after)">
                    {{ (item['t' + n] || {}).stock_after }}
                  </span>

                  <span v-if="((item['t' + n] || {}).qty_deduction || 0) > 0" class="text-gray-400 mt-0.5 text-[11px]">
                    -{{ (item['t' + n] || {}).qty_deduction }} ({{ (item['t' + n] || {}).source }})
                  </span>

                  <span v-else class="text-gray-300 mt-0.5 text-[11px]"> no demand </span>
                </div>
              </td>

              <td class="px-6 py-3">
                <span
                  v-if="item.calculatedStatus === 'CRITICAL'"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700"
                >
                  CRITICAL
                </span>
                <span
                  v-else-if="item.calculatedStatus === 'WARNING'"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700"
                >
                  WARNING
                </span>
                <span v-else class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">
                  STABLE
                </span>
              </td>
            </tr>
            <tr v-else>
              <td colspan="10" class="px-6 py-10 text-center text-gray-500 bg-gray-50">No data found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="!isLoading && filteredItems3.length > 0"
        class="flex flex-col md:flex-row items-center justify-between p-4 border-t border-gray-200 bg-gray-50"
      >
        <div class="flex items-center gap-2 mb-4 md:mb-0">
          <span class="text-sm text-gray-700">Rows per page:</span>
          <select v-model="table3.rowsPerPage" class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block p-3">
            <option v-for="opt in rowsOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>
        <span class="text-sm text-gray-700 mb-4 md:mb-0">
          Showing
          <span class="font-semibold text-gray-900">{{ (table3.currentPage - 1) * table3.rowsPerPage + 1 }}</span>
          to
          <span class="font-semibold text-gray-900">{{ Math.min(table3.currentPage * table3.rowsPerPage, filteredItems3.length) }}</span>
          of
          <span class="font-semibold text-gray-900">{{ filteredItems3.length }}</span>
          Entries
        </span>
        <div class="flex items-center gap-2">
          <button
            @click="table3.currentPage--"
            :disabled="table3.currentPage === 1"
            class="px-3 py-1 text-sm font-medium text-gray-600 border border-gray-300 rounded disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span class="text-sm text-gray-700">Page {{ table3.currentPage }} of {{ totalPages3 }}</span>
          <button
            @click="table3.currentPage++"
            :disabled="table3.currentPage === totalPages3"
            class="px-3 py-1 text-sm font-medium text-gray-600 border border-gray-300 rounded disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Delete Rundown -->
  <div v-if="dialog.deleteRundown" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 transition-opacity">
    <div class="relative w-full max-w-md max-h-full">
      <div class="relative bg-white rounded-lg shadow">
        <button
          @click="dialog.deleteRundown = false"
          type="button"
          class="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
        >
          <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
            />
          </svg>
        </button>
        <div class="p-6 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg class="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 class="mb-5 text-lg font-normal text-gray-500">
            Apakah Anda yakin ingin menghapus <br />
            <span class="font-bold text-gray-800">Rundown IFP</span> ini?
          </h3>
          <div class="flex justify-center gap-3">
            <button
              @click="confirmDeleteRundown('IFP')"
              type="button"
              class="text-white bg-red-600 hover:bg-red-800 rounded-lg text-sm inline-flex items-center px-5 py-2.5"
            >
              Yes, I'm sure
            </button>
            <button
              @click="dialog.deleteRundown = false"
              type="button"
              class="text-gray-500 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5"
            >
              No, cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Generate SO -->
  <div v-if="dialog.generateSO" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 transition-opacity">
    <div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div class="relative bg-white rounded-lg shadow">
        <button
          @click="dialog.generateSO = false"
          type="button"
          class="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
        >
          <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
            />
          </svg>
        </button>

        <div class="p-6">
          <h3 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">Generate Pcs/Day (1 week)</h3>

          <div class="bg-green-50 p-4 rounded-lg mb-6">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-sm font-medium text-gray-700">DEFAULT WORKDAYS (Global)</span>
                <p class="text-xs text-gray-500 mt-1">*Digunakan jika customer MDFO&SO tidak sesuai dengan data dibawah.</p>
              </div>
              <div class="w-32">
                <input
                  type="number"
                  v-model.number="defaultWorkdays"
                  min="1"
                  max="7"
                  class="block w-full p-2 text-sm border border-gray-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          <div class="mb-4">
            <h4 class="text-sm font-medium text-gray-700 mb-3">Specific Customer Workdays:</h4>

            <div v-if="loadingGenerate" class="flex justify-center py-8">
              <svg aria-hidden="true" class="w-8 h-8 text-gray-200 animate-spin fill-green-600" viewBox="0 0 100 101">
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
            </div>

            <div v-else class="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              <div v-if="customerWorkdays.length === 0" class="text-center py-4 text-gray-500">Tidak ada data customer</div>

              <div
                v-for="(cust, index) in customerWorkdays"
                :key="index"
                class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div class="w-1/3">
                  <div class="text-sm font-medium text-gray-900">{{ cust.zcust }}</div>
                  <div class="text-xs text-gray-500">{{ cust.customer_name }}</div>
                </div>

                <div class="w-2/5">
                  <span
                    :class="`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(cust.status_keterangan)}`"
                  >
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" :d="getStatusIcon(cust.status_keterangan)" />
                    </svg>
                    {{ cust.status_keterangan }}
                  </span>
                </div>

                <div class="w-1/5">
                  <input
                    type="number"
                    v-model.number="cust.workdays"
                    min="0"
                    max="7"
                    step="0.5"
                    class="block w-full p-1.5 text-sm border border-gray-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              @click="dialog.generateSO = false"
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              @click="submitGenerateSO"
              :disabled="loadingGenerate"
              class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="loadingGenerate">Processing...</span>
              <span v-else>Submit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Ship Detail -->
  <div v-if="shipDetailDialog" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
    <div class="w-full max-w-xl bg-white rounded-lg shadow">
      <div class="flex items-center justify-between p-4 border-b">
        <div>
          <div class="text-lg font-bold">Shipping Detail</div>
          <div class="text-sm text-gray-500">
            Part: <b>{{ shipDetail.part_number }}</b> • ETD: <b>{{ shipDetail.etd }}</b>
          </div>
        </div>
        <button @click="shipDetailDialog = false" class="text-gray-400 hover:text-gray-700">✕</button>
      </div>

      <div class="p-4">
        <table class="w-full text-sm">
          <tbody>
            <tr class="border-b">
              <td class="py-2 font-medium">Init Stock</td>
              <td class="py-2 text-right">{{ formatNumber(shipDetail.init_stok) }}</td>
            </tr>
            <tr class="border-b">
              <td class="py-2 font-medium">Added</td>
              <td class="py-2 text-right">+{{ formatNumber(shipDetail.qty_added) }}</td>
            </tr>
            <tr class="border-b">
              <td class="py-2 font-medium">Reduced</td>
              <td class="py-2 text-right">-{{ formatNumber(shipDetail.qty_reduced) }}</td>
            </tr>
            <tr class="border-b">
              <td class="py-2 font-medium">Stock After</td>
              <td class="py-2 text-right font-bold">{{ formatNumber(shipDetail.total_calc) }}</td>
            </tr>
            <tr class="border-b">
              <td class="py-2 font-medium">Order Qty</td>
              <td class="py-2 text-right">{{ formatNumber(shipDetail.order_qty) }}</td>
            </tr>
            <tr>
              <td class="py-2 font-medium">Source</td>
              <td class="py-2 text-right">{{ shipDetail.source }}</td>
            </tr>
          </tbody>
        </table>

        <div class="mt-4 p-3 rounded-lg bg-blue-50 text-sm text-gray-700">
          <b>Keterangan:</b><br />
          Stock After = Init Stock + Added − Reduced
        </div>
      </div>

      <div class="p-4 border-t flex justify-end">
        <button @click="shipDetailDialog = false" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg">Tutup</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(th),
:deep(td) {
  white-space: normal !important;
  word-wrap: break-word;
  font-size: 15px !important;
  font-weight: 500 !important;
  padding: 10px 20px !important;
  vertical-align: top;
}
</style>

<style>
.simple-dt-custom {
  overflow-x: auto;
}
.border {
  border: 1px solid #e5e7eb !important;
}

/* Excel filtering styles */
.excel-filter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 9px;
  border-radius: 3px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #94a3b8;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.12s;
  line-height: 1;
  padding: 0;
}
.excel-filter-btn:hover {
  background: #f1f5f9;
  color: #475569;
  border-color: #cbd5e1;
}
.excel-filter-btn-active {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}
.excel-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 200px;
  max-width: 280px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 2px 6px rgba(0, 0, 0, 0.06);
  z-index: 200;
  overflow: hidden;
  text-align: left;
}
.excel-dropdown-right {
  left: auto;
  right: 0;
}
.excel-dropdown-search {
  padding: 8px 10px 6px;
  border-bottom: 1px solid #f1f5f9;
}
.excel-search-input {
  width: 100%;
  padding: 4px 8px;
  font-size: 11px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  outline: none;
  background: #f8fafc;
  color: #1e293b;
  transition: all 0.15s;
}
.excel-search-input:focus {
  background: #fff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}
.excel-check-all {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #334155;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  user-select: none;
  text-align: left;
}
.excel-check-all input[type='checkbox'] {
  width: 13px;
  height: 13px;
  border-radius: 3px;
  border: 1px solid #cbd5e1;
  color: #2563eb;
  cursor: pointer;
}
.excel-options-list {
  max-height: 160px;
  overflow-y: auto;
  padding: 4px 0;
}
.excel-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  font-size: 11px;
  color: #475569;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
  text-align: left;
}
.excel-option:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.excel-option input[type='checkbox'] {
  width: 13px;
  height: 13px;
  border-radius: 3px;
  border: 1px solid #cbd5e1;
  color: #2563eb;
  cursor: pointer;
}

/* Sort options inside dropdown */
.excel-dropdown-sort-section {
  padding: 4px 0;
  display: flex;
  flex-direction: column;
}
.excel-dropdown-sort-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 12px;
  font-size: 11px;
  color: #475569;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.1s ease;
}
.excel-dropdown-sort-item:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.excel-selection-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
}
</style>
