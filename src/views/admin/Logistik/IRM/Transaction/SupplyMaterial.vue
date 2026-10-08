<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useSupplyMaterialStore, formatLineName, formatTanggal, formatJam } from '@/stores/Logistik/IRM/Transaction/SupplyMaterial';
import { storeToRefs } from 'pinia';
import { CalendarOutlined, ReloadOutlined, PlusOutlined, HistoryOutlined, SearchOutlined, LoadingOutlined, FileExcelOutlined } from '@ant-design/icons-vue';
// @ts-expect-error - flowbite-datepicker tidak menyediakan type declaration
import Datepicker from "flowbite-datepicker/Datepicker";
import type { SapMaterialItem, SupplyMaterialItem } from '@/types/Logistik/IRM/Transaction/SupplyMaterial';

type DatepickerChangeEvent = CustomEvent<{ date: Date }>;

const formatDateInput = (d: Date) =>
  [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");

const todayInput = () => formatDateInput(new Date());

const page = ref({ title: 'Supply Material' });
const breadcrumbs = shallowRef([
  { title: 'Logistik', disabled: false, href: '#' },
  { title: 'IRM', disabled: false, href: '#' },
  { title: 'Transaction', disabled: false, href: '#' },
  { title: 'Supply Material', disabled: true, href: '#' }
]);

const supplyMaterialStore = useSupplyMaterialStore();
const {
  filterDate, filterLine, keyword, lineOptions, filteredRows,
  history, utilizations, isSaving, isLoadingHistory, isLoadingUtilizations,
  materialResults, materialMessage, isSearchingMaterial, hasSearchedMaterial, isExporting
} = storeToRefs(supplyMaterialStore);

const isRefreshing = ref(false);

const dashValue = (value?: string | null) => (value && String(value).trim() !== '' ? value : '-');

const onRefresh = async () => {
  isRefreshing.value = true;
  try {
    await supplyMaterialStore.refreshFromSap();
  } finally {
    isRefreshing.value = false;
  }
};

const onDownloadExcel = () => supplyMaterialStore.downloadExcel();

// ── Filter tanggal ────────────────────────────────────────────────────────────
// Dropdown dikontrol manual (bukan Flowbite data-dropdown-toggle) supaya posisinya
// selalu menempel di bawah tombolnya dan tidak terpotong sidebar.
const startPickerRef = ref<HTMLElement | null>(null);
const endPickerRef = ref<HTMLElement | null>(null);
const showStartPicker = ref(false);
const showEndPicker = ref(false);

const toggleStartPicker = () => { showStartPicker.value = !showStartPicker.value; showEndPicker.value = false; };
const toggleEndPicker = () => { showEndPicker.value = !showEndPicker.value; showStartPicker.value = false; };

const onClickOutside = (e: MouseEvent) => {
  if (startPickerRef.value && !startPickerRef.value.contains(e.target as Node)) showStartPicker.value = false;
  if (endPickerRef.value && !endPickerRef.value.contains(e.target as Node)) showEndPicker.value = false;
  if (utilSearchRef.value && !utilSearchRef.value.contains(e.target as Node)) showUtilDropdown.value = false;
};

onMounted(async () => {
  document.addEventListener("click", onClickOutside);

  const start = document.getElementById("datepicker-inline-start");
  const end = document.getElementById("datepicker-inline-end");

  if (start && end) {
    const datepicker_start = new Datepicker(start, { autohide: false, format: "yyyy-mm-dd" });
    const datepicker_end = new Datepicker(end, { autohide: false, format: "yyyy-mm-dd" });

    if (filterDate.value.start) datepicker_start.setDate(filterDate.value.start);
    if (filterDate.value.end) datepicker_end.setDate(filterDate.value.end);

    start.addEventListener("changeDate", (e: Event) => {
      filterDate.value.start = formatDateInput((e as DatepickerChangeEvent).detail.date);
      showStartPicker.value = false;
    });

    end.addEventListener("changeDate", (e: Event) => {
      filterDate.value.end = formatDateInput((e as DatepickerChangeEvent).detail.date);
      showEndPicker.value = false;
    });
  }

  await supplyMaterialStore.fetchTableData();
});

onUnmounted(() => document.removeEventListener("click", onClickOutside));

// ── Modal Edit qty supply (per no reservasi, beberapa item sekaligus) ─────────
type EditEntry = { plus: number | null; minus: number | null };

const editReservasi = ref<string | null>(null);
const edits = ref<Record<string, EditEntry>>({});

const editItems = computed(() =>
  editReservasi.value ? supplyMaterialStore.itemsOfReservation(editReservasi.value) : []
);

// Status TP melekat per item: satu no reservasi bisa berisi item yang sudah
// ter-TP dan yang belum, karena TP diproses parsial mengikuti balasan SAP.
const isItemTp = (item: SupplyMaterialItem) => item.is_tp === 1 || isSapTp(item);

// Item yang sudah ter-TP atau sudah dihapus dari SAP tidak bisa diubah lagi.
const isLocked = (item: SupplyMaterialItem) => isItemTp(item) || isDeleted(item);

const editAllTp = computed(() => editItems.value.length > 0 && editItems.value.every(isItemTp));

const editSomeTp = computed(() => editItems.value.some(isItemTp));

const entryOf = (no_item: string): EditEntry => {
  if (!edits.value[no_item]) edits.value[no_item] = { plus: null, minus: null };
  return edits.value[no_item];
};

// Input user adalah SELISIH (tambah/kurang), bukan nilai akhir - ini previewnya.
const previewOf = (item: SupplyMaterialItem) => {
  const entry = edits.value[item.no_item];
  return item.qty_supply + (Number(entry?.plus) || 0) - (Number(entry?.minus) || 0);
};

// Blocking: hanya kondisi yang benar-benar tidak boleh disimpan.
const errorOf = (item: SupplyMaterialItem): string => {
  const entry = edits.value[item.no_item];
  const plus = Number(entry?.plus) || 0;
  const minus = Number(entry?.minus) || 0;
  if (plus < 0 || minus < 0) return 'Tidak boleh negatif';
  if (previewOf(item) < 0) return 'Hasil < 0';
  return '';
};


const warningOf = (item: SupplyMaterialItem): string => {
  if (errorOf(item)) return '';
  const result = previewOf(item);
  return result > item.stock_irm ? `Melebihi Stock IFRM (${item.stock_irm})` : '';
};

const editHasInput = computed(() =>
  editItems.value.some((item) => {
    if (isLocked(item)) return false;
    const entry = edits.value[item.no_item];
    return (Number(entry?.plus) || 0) !== 0 || (Number(entry?.minus) || 0) !== 0;
  })
);

const editHasError = computed(() => editItems.value.some((item) => errorOf(item) !== ''));

const editHasWarning = computed(() => editItems.value.some((item) => warningOf(item) !== ''));

const openEdit = async (row: SupplyMaterialItem) => {
  editReservasi.value = row.no_reservasi;
  edits.value = {};
  await supplyMaterialStore.loadUtilizations(row.no_reservasi);
};

const closeEdit = () => { editReservasi.value = null; };

const onSaveEdit = async () => {
  if (!editReservasi.value) return;

  const items = editItems.value
    .filter((item) => !isLocked(item))
    .map((item) => ({
      no_item: item.no_item,
      qty_plus: Number(edits.value[item.no_item]?.plus) || 0,
      qty_minus: Number(edits.value[item.no_item]?.minus) || 0,
    }));

  const ok = await supplyMaterialStore.saveAdjustments(editReservasi.value, items);

  if (ok) {
    closeEdit();
    return;
  }

  edits.value = {};
};

// ── Modal Riwayat (per item) ──────────────────────────────────────────────────
const historyItem = ref<SupplyMaterialItem | null>(null);

const openHistory = async (item: SupplyMaterialItem) => {
  historyItem.value = item;
  await supplyMaterialStore.loadHistory(item.no_reservasi, item.no_item);
};

const closeHistory = () => { historyItem.value = null; };

const actionLabel = (action: string) => {
  if (action === 'tp') return 'Transfer Posting';
  if (action === 'cancel_tp') return 'Batal TP';
  if (action === 'deleted') return 'Dihapus dari SAP';
  if (action === 'restored') return 'Muncul Kembali di SAP';
  // 'adjust' (dari MIMS) dan 'sap_sync' (mengikuti SAP) sama-sama mengubah angka
  // qty supply, jadi labelnya sama. Pembedanya kolom User dan Keterangan.
  return 'Update qty';
};

const actionClass = (action: string) => {
  if (action === 'deleted') return 'text-red-600 font-semibold';
  if (action === 'restored') return 'text-emerald-600 font-semibold';
  if (action === 'sap_sync') return 'text-sky-600 font-semibold';
  return '';
};

// ── Modal Item Baru / Pemanfaatan ─────────────────────────────────────────────
// Sentinel untuk pilihan "Item Baru": item yang berdiri sendiri, bukan pengganti
// item lain. Dikirim ke backend sebagai for_no_item kosong.
const UTIL_NEW_ITEM = '__NEW__';

const showUtilForm = ref(false);
const showUtilConfirm = ref(false);
const utilForm = ref({ part_no: '', status: '', qty: null as number | null, for_no_item: '' });

const utilFormValid = computed(() =>
  utilForm.value.part_no.trim() !== '' &&
  utilForm.value.status !== '' &&
  (Number(utilForm.value.qty) || 0) > 0 &&
  utilForm.value.for_no_item !== '' &&
  utilDuplicate.value === null
);

const utilIsNewItem = computed(() => utilForm.value.for_no_item === UTIL_NEW_ITEM);

// Item BARU harus part yang belum ada di reservasi ini. Baris yang sudah dihapus
// dari SAP tidak dihitung - item itu memang sudah tidak ada lagi.
// Aturan ini hanya berlaku untuk item baru; pemanfaatan tetap boleh memakai part
// yang sudah ada. Backend memvalidasi hal yang sama.
const utilDuplicate = computed(() => {
  if (!utilIsNewItem.value) return null;
  const partNo = utilForm.value.part_no.trim();
  if (!partNo) return null;
  return editItems.value.find((item) => item.part_no === partNo && item.is_deleted !== 1) ?? null;
});

// Pencarian material ke SAP. part_no HANYA terisi lewat pemilihan hasil
// pencarian - supaya item yang disimpan dipastikan benar-benar ada di SAP.
const utilKeyword = ref('');
const utilSelected = ref<SapMaterialItem | null>(null);
const showUtilDropdown = ref(false);
const utilSearchRef = ref<HTMLElement | null>(null);

const onSearchMaterial = async () => {
  await supplyMaterialStore.searchMaterialSap(utilKeyword.value);
  showUtilDropdown.value = true;
};

const onSelectMaterial = (item: SapMaterialItem) => {
  utilSelected.value = item;
  utilForm.value.part_no = item.part_no;
  utilKeyword.value = item.part_no;
  showUtilDropdown.value = false;
};

// Kata kunci diubah setelah memilih -> pilihan dibatalkan, supaya part_no tidak
// menyimpan item lama yang sudah tidak sesuai dengan isi kolom pencarian.
const onKeywordInput = () => {
  if (utilSelected.value) {
    utilSelected.value = null;
    utilForm.value.part_no = '';
  }
};

const openUtilForm = () => {
  utilForm.value = { part_no: '', status: '', qty: null, for_no_item: '' };
  utilKeyword.value = '';
  utilSelected.value = null;
  showUtilDropdown.value = false;
  supplyMaterialStore.resetMaterialSearch();
  showUtilForm.value = true;
};

const closeUtilForm = () => { showUtilForm.value = false; };

// Save -> tampilkan konfirmasi dulu, baru benar-benar dikirim
const askUtilConfirm = () => {
  if (!utilFormValid.value) return;
  showUtilConfirm.value = true;
};

const onSaveUtilization = async () => {
  if (!editReservasi.value) return;

  const ok = await supplyMaterialStore.saveUtilization({
    no_reservasi: editReservasi.value,
    part_no: utilForm.value.part_no.trim(),
    status: utilForm.value.status,
    qty: Number(utilForm.value.qty) || 0,
    // Item baru tidak punya item tujuan - dikirim kosong.
    for_no_item: utilIsNewItem.value ? '' : utilForm.value.for_no_item,
  });

  showUtilConfirm.value = false;
  if (ok) closeUtilForm();
};

// Item yang sudah dihapus dari SAP atau sudah di-TP tidak boleh jadi tujuan
// pemanfaatan - keduanya sudah terkunci, jadi tidak ditampilkan di dropdown.
// Backend menolak keduanya juga.
const utilTargetOptions = computed(() =>
  editItems.value.filter((item) => item.is_deleted !== 1 && item.is_tp !== 1)
);

const utilTargetLabel = computed(() => {
  if (utilIsNewItem.value) return 'Item Baru';
  const target = editItems.value.find((item) => item.no_item === utilForm.value.for_no_item);
  return target ? `${target.no_item} — ${target.part_no}` : '-';
});

// ── Modal TP (diproses per no reservasi) ──────────────────────────────────────
// Pesan problem dipilih dari daftar baku supaya alasannya seragam dan bisa
// direkap; 'Lainnya' menyediakan isian bebas untuk kasus di luar daftar.
const TP_PROBLEM_OPTIONS = ['Material Kosong', 'Shearing Kurang', 'Stamping Tidak Jadi Minta', 'QTY Lot Berlebih'];
const TP_PROBLEM_OTHER = 'Lainnya';

const tpReservasi = ref<string | null>(null);
const tpProblemChoice = ref<Record<string, string>>({});
const tpProblemOther = ref<Record<string, string>>({});
const tpPostingDate = ref(todayInput());

// Item yang sudah dihapus dari SAP tidak ikut di-TP (backend juga mengecualikannya)
// Hanya item yang belum ter-TP. Sejak TP bisa parsial, satu no reservasi bisa
// berisi item yang sudah punya material document dan yang belum.
const tpItems = computed(() =>
  tpReservasi.value
    ? supplyMaterialStore
        .itemsOfReservation(tpReservasi.value)
        .filter((item) => item.is_deleted !== 1 && item.is_tp !== 1)
    : []
);

// Item dengan qty supply 0 akan DIHAPUS di SAP saat TP - user dikonfirmasi dulu.
const tpZeroItems = computed(() => tpItems.value.filter((item) => item.qty_supply === 0));

const isMismatch = (item: SupplyMaterialItem) => item.qty_supply !== item.qty_request;

// Qty IFRM kurang dari Qty Supply hanya PERINGATAN - tidak lagi menghalangi TP.
// Boleh atau tidaknya ditentukan SAP, dan alasannya dibalas lewat ZTP_RSV.
const isOverStock = (item: SupplyMaterialItem) => item.stock_irm < item.qty_supply;

// Pesan problem wajib hanya kalau qty supply tidak sama dengan qty request.
const needsProblem = (item: SupplyMaterialItem) => isMismatch(item);

// Pesan yang benar-benar dikirim: pilihan dropdown, atau isian bebas kalau
// yang dipilih 'Lainnya'.
const problemValue = (no_item: string): string => {
  const choice = tpProblemChoice.value[no_item] || '';
  if (!choice) return '';
  if (choice === TP_PROBLEM_OTHER) return (tpProblemOther.value[no_item] || '').trim();
  return choice;
};

const tpProblems = computed<Record<string, string>>(() => {
  const result: Record<string, string> = {};
  for (const item of tpItems.value) {
    const value = problemValue(item.no_item);
    if (value) result[item.no_item] = value;
  }
  return result;
});

const tpMissingProblem = computed(() =>
  tpItems.value.some((item) => needsProblem(item) && !problemValue(item.no_item))
);

const openTp = (row: SupplyMaterialItem) => {
  tpReservasi.value = row.no_reservasi;
  tpProblemChoice.value = {};
  tpProblemOther.value = {};
  tpPostingDate.value = todayInput();
};

const closeTp = () => { tpReservasi.value = null; showTpZeroConfirm.value = false; };

const showTpZeroConfirm = ref(false);

// Ada item qty supply 0 -> konfirmasi dulu, karena di SAP item itu akan dihapus.
const askSubmitTp = () => {
  if (tpZeroItems.value.length > 0) {
    showTpZeroConfirm.value = true;
    return;
  }
  onSubmitTp();
};

const onSubmitTp = async () => {
  if (!tpReservasi.value) return;
  showTpZeroConfirm.value = false;
  const ok = await supplyMaterialStore.submitTransferPosting(
    tpReservasi.value,
    tpProblems.value,
    tpPostingDate.value
  );
  if (ok) closeTp();
};

// ── Modal Batal TP ────────────────────────────────────────────────────────────
const cancelRow = ref<SupplyMaterialItem | null>(null);
const cancelReason = ref('');

const openCancelTp = (row: SupplyMaterialItem) => {
  cancelRow.value = row;
  cancelReason.value = '';
};

const closeCancelTp = () => { cancelRow.value = null; };

const onSubmitCancelTp = async () => {
  if (!cancelRow.value) return;
  const ok = await supplyMaterialStore.cancelTransferPosting(cancelRow.value, cancelReason.value.trim());
  if (ok) closeCancelTp();
};

// ── Helper tampilan ───────────────────────────────────────────────────────────
const rowKey = (row: SupplyMaterialItem) => `${row.no_reservasi}::${row.no_item}`;

// Baris yang sudah tidak dikirim lagi oleh SAP - dikunci dari edit & TP
const isDeleted = (row: SupplyMaterialItem) => row.is_deleted === 1;

// Item yang di-TP langsung dari sisi SAP (KZEAR = 'X'). MIMS tidak punya nomor
// material dokumennya, tapi statusnya sama saja: sudah ter-TP dan terkunci.
const isSapTp = (row: SupplyMaterialItem) => row.is_sap_tp === 1;

// Sudah ter-TP dari sisi mana pun - lewat MIMS maupun langsung di SAP.
const isTpAnywhere = (row: SupplyMaterialItem) => row.is_tp === 1 || isSapTp(row);

const stockIrmCritical = (row: SupplyMaterialItem) =>
  row.stock_irm === 0 || (row.qty_request - row.qty_supply) > row.stock_irm;

// Qty Supply: merah=belum supply, oranye=kurang, hijau=sesuai, biru=lebih (selaras dengan display)
const qtySupplyClass = (row: SupplyMaterialItem) => {
  if (row.qty_supply === 0) return 'text-red-600 font-semibold';
  if (row.qty_supply < row.qty_request) return 'text-orange-600 font-semibold';
  if (row.qty_supply === row.qty_request) return 'text-green-600 font-semibold';
  return 'text-blue-600 font-semibold';
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-2"></BaseBreadcrumb>

  <div>
    <p class="text-xs text-gray-400 italic mb-4">
      * Perubahan Qty Supply pada halaman ini akan otomatis tampil pada layar
      <span class="font-semibold text-gray-500">Rundown Supply Material</span>.
    </p>

    <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">
      <div class="flex flex-wrap items-center gap-3">
        <!-- Filter date (start) -->
        <div class="relative" ref="startPickerRef">
          <button
            type="button"
            @click="toggleStartPicker"
            class="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          >
            <CalendarOutlined />
            <span class="font-normal text-blue-100">Start</span>
            <span class="font-semibold">{{ filterDate.start || '-' }}</span>
            <svg class="w-2.5 h-2.5 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
            </svg>
          </button>
          <div v-show="showStartPicker" class="absolute left-0 top-full z-50 mt-2 w-72 bg-white border rounded-lg shadow-lg">
            <div id="datepicker-inline-start"></div>
          </div>
        </div>

        <!-- Filter date (end) -->
        <div class="relative" ref="endPickerRef">
          <button
            type="button"
            @click="toggleEndPicker"
            class="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
          >
            <CalendarOutlined />
            <span class="font-normal text-blue-100">End</span>
            <span class="font-semibold">{{ filterDate.end || '-' }}</span>
            <svg class="w-2.5 h-2.5 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
            </svg>
          </button>
          <div v-show="showEndPicker" class="absolute left-0 top-full z-50 mt-2 w-72 bg-white border rounded-lg shadow-lg">
            <div id="datepicker-inline-end"></div>
          </div>
        </div>

        <!-- Filter line -->
        <select
          v-model="filterLine"
          class="block w-48 shrink-0 p-2.5 text-sm !border !border-gray-300 rounded-lg bg-gray-50 !focus:ring-blue-500 !focus:border-blue-500"
        >
          <option v-for="line in lineOptions" :key="line" :value="line">{{ line }}</option>
        </select>

        <!-- Search keyword -->
        <input
          v-model="keyword"
          type="text"
          placeholder="Cari No Reservasi / Part No / Job No"
          class="block flex-1 min-w-[16rem] p-2.5 text-sm !border !border-gray-300 rounded-lg bg-gray-50 !focus:ring-blue-500 !focus:border-blue-500"
        />

        <!-- Download Excel -->
        <button
          type="button"
          @click="onDownloadExcel"
          :disabled="isExporting || !filteredRows.length"
          :title="!filteredRows.length ? 'Tidak ada data untuk diunduh' : 'Unduh data sesuai filter beserta riwayat perubahannya'"
          class="flex items-center gap-2 text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300 font-medium rounded-full text-sm px-5 py-2.5 text-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LoadingOutlined v-if="isExporting" spin />
          <FileExcelOutlined v-else />
          {{ isExporting ? 'Menyiapkan file...' : 'Download Excel' }}
        </button>

        <!-- Refresh Button -->
        <button
          type="button"
          @click="onRefresh"
          :disabled="isRefreshing"
          class="flex items-center gap-2 text-white bg-indigo-500 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 font-medium rounded-full text-sm px-5 py-2.5 text-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ReloadOutlined :spin="isRefreshing" />
          {{ isRefreshing ? 'Mengambil data SAP...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Table: scroll di dalam container (bukan seluruh halaman), header ikut freeze -->
    <div class="table-scroll w-full overflow-auto border border-gray-200 rounded-lg shadow-sm">
      <table class="w-full text-xs text-gray-600 text-center whitespace-nowrap">
        <thead class="text-gray-700 uppercase">
          <tr>
            <th class="px-3 py-2 border-r border-gray-200">No</th>
            <th class="px-3 py-2 border-r border-gray-200">No Reservasi</th>
            <th class="px-3 py-2 border-r border-gray-200">Item</th>
            <th class="px-3 py-2 border-r border-gray-200">Line</th>
            <th class="px-3 py-2 border-r border-gray-200">Job No</th>
            <th class="px-3 py-2 border-r border-gray-200">Part No</th>
            <th class="px-3 py-2 border-r border-gray-200">Storage Location</th>
            <th class="px-3 py-2 border-r border-gray-200">Batch</th>
            <th class="px-3 py-2 border-r border-gray-200">Tanggal</th>
            <th class="px-3 py-2 border-r border-gray-200">Jam</th>
            <th class="px-3 py-2 border-r border-gray-200">Qty IFRM</th>
            <th class="px-3 py-2 border-r border-gray-200">Qty Request</th>
            <th class="px-3 py-2 border-r border-gray-200">Qty Supply</th>
            <th class="px-3 py-2 border-r border-gray-200">No Material Document</th>
            <th class="px-3 py-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in filteredRows"
            :key="rowKey(row)"
            class="odd:bg-white even:bg-gray-50 border-b border-gray-200 hover:bg-gray-100"
          >
            <td class="px-3 py-2 border-r border-gray-200">{{ index + 1 }}</td>
            <td class="px-3 py-2 border-r border-gray-200">{{ row.no_reservasi }}</td>
            <td class="px-3 py-2 border-r border-gray-200">{{ row.no_item }}</td>
            <td class="px-3 py-2 border-r border-gray-200">{{ formatLineName(row.line) }}</td>
            <td class="px-3 py-2 border-r border-gray-200">{{ row.job_no }}</td>
            <td class="px-3 py-2 border-r border-gray-200">
              <span :class="isDeleted(row) ? 'line-through text-gray-400' : ''">{{ row.part_no }}</span>
              <!-- Baris sudah tidak dikirim lagi oleh SAP -->
              <div v-if="isDeleted(row)" class="mt-0.5">
                <span class="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">
                  Dihapus dari SAP
                </span>
              </div>
              <!-- Baris ini cocok dengan item pemanfaatan yang pernah diinput -->
              <div v-if="row.util_for_no_item" class="mt-0.5 text-[10px] text-violet-600 font-medium">
                Item pemanfaatan atas {{ row.util_for_no_item }}
                <span v-if="row.util_for_part_no">— {{ row.util_for_part_no }}</span>
              </div>
            </td>
            <td class="px-3 py-2 border-r border-gray-200">{{ dashValue(row.lgort) }}</td>
            <td class="px-3 py-2 border-r border-gray-200">{{ dashValue(row.charg) }}</td>
            <td class="px-3 py-2 border-r border-gray-200">{{ row.req_date ? formatTanggal(row.req_date) : formatTanggal(row.created_at) }}</td>
            <td class="px-3 py-2 border-r border-gray-200">{{ formatJam(row.created_at) }}</td>
            <td
              class="px-3 py-2 border-r border-gray-200"
              :class="stockIrmCritical(row) ? 'bg-red-100 text-red-700 font-semibold' : ''"
            >
              {{ row.stock_irm }}
            </td>
            <td class="px-3 py-2 border-r border-gray-200">{{ row.qty_request }}</td>
            <td class="px-3 py-2 border-r border-gray-200" :class="qtySupplyClass(row)">{{ row.qty_supply }}</td>
            <td class="px-3 py-2 border-r border-gray-200">
              <span
                v-if="row.mat_doc"
                class="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold"
              >
                {{ row.mat_doc }}
              </span>
              <!-- TP dilakukan langsung di SAP: nomor dokumennya tidak dikirim ke MIMS -->
              <span
                v-else-if="isSapTp(row)"
                class="inline-block px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-semibold"
              >
                Sudah di-TP by SAP
              </span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="px-3 py-2">
              <div class="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  @click="openEdit(row)"
                  class="px-3 py-1.5 text-white text-xs font-medium rounded-lg focus:ring-4 focus:ring-blue-300"
                  :class="(isTpAnywhere(row) || isDeleted(row)) ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'"
                >
                  {{ (isTpAnywhere(row) || isDeleted(row)) ? 'Detail' : 'Edit' }}
                </button>
                <!-- TP dari SAP tidak menghasilkan baris TP di MIMS, jadi tombolnya
                     ditampilkan mati - bukan diganti Batal TP. -->
                <button
                  v-if="!row.is_tp && isSapTp(row)"
                  type="button"
                  disabled
                  title="Sudah di-TP langsung di SAP"
                  class="px-3 py-1.5 bg-gray-400 text-white text-xs font-medium rounded-lg cursor-not-allowed"
                >
                  TP
                </button>
                <button
                  v-else-if="!row.is_tp"
                  type="button"
                  @click="openTp(row)"
                  :disabled="isDeleted(row)"
                  :title="isDeleted(row) ? 'Item sudah dihapus dari SAP' : ''"
                  class="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  TP
                </button>

                <!-- Button TP -->
                <!-- <button
                  v-else
                  type="button"
                  @click="openCancelTp(row)"
                  class="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 focus:ring-4 focus:ring-amber-300"
                >
                  Batal TP
                </button> -->
              </div>
            </td>
          </tr>

          <tr v-if="!filteredRows.length">
            <td colspan="15" class="py-10 text-gray-400">
              Tidak ada data Supply Material untuk filter yang dipilih.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend, selaras dengan warna di display -->
    <div class="flex items-center gap-5 flex-wrap justify-center mt-4">
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 bg-red-100 border border-red-400 rounded shrink-0"></div>
        <span class="text-xs text-gray-500">Qty IFRM Kritis</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 bg-red-600 rounded-full shrink-0"></div>
        <span class="text-xs text-gray-500">Belum Supply</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 bg-orange-600 rounded-full shrink-0"></div>
        <span class="text-xs text-gray-500">Kurang Supply</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 bg-green-600 rounded-full shrink-0"></div>
        <span class="text-xs text-gray-500">Sesuai Request</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 bg-blue-600 rounded-full shrink-0"></div>
        <span class="text-xs text-gray-500">Melebihi Request</span>
      </div>
    </div>
  </div>

  <!-- ── Modal Edit qty supply (per no reservasi) ───────────────────────────── -->
  <Teleport to="body">
    <div v-if="editReservasi" class="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="closeEdit"></div>

      <div class="relative w-full max-w-6xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div class="px-5 py-3 bg-blue-600 text-white font-semibold flex items-center justify-between shrink-0">
          <span>{{ editAllTp ? 'Detail Qty Supply' : 'Edit Qty Supply' }} &mdash; No Reservasi {{ editReservasi }}</span>
          <button type="button" class="text-white/80 hover:text-white text-xl leading-none" @click="closeEdit">&times;</button>
        </div>

        <div class="p-5 overflow-y-auto">
          <div v-if="editAllTp" class="mb-4 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs">
            Seluruh item pada no reservasi ini sudah di-TP, qty supply tidak bisa diubah lagi.
          </div>
          <div v-else-if="editSomeTp" class="mb-4 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs">
            Item yang sudah di-TP tidak bisa diubah lagi. Silakan ubah item lain yang belum di-TP.
          </div>

          <div class="flex items-center justify-between mb-2">
            <p class="text-xs text-gray-400">
              Angka pada kolom Tambah/Kurang adalah <span class="font-semibold">selisih</span>, bukan nilai akhir.
              Beberapa item boleh diubah sekaligus.
            </p>
            <button
              v-if="!editAllTp"
              type="button"
              @click="openUtilForm"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 focus:ring-4 focus:ring-violet-300 shrink-0"
            >
              <PlusOutlined />
              Tambah Item Baru / Pemanfaatan
            </button>
          </div>

          <!-- Tabel item -->
          <div class="border border-gray-200 rounded-lg overflow-hidden">
            <table class="w-full text-xs text-center">
              <thead class="bg-gray-50 text-gray-600 uppercase">
                <tr>
                  <th class="px-2 py-2 border-r border-gray-200">Item</th>
                  <th class="px-2 py-2 border-r border-gray-200">Part No</th>
                  <th class="px-2 py-2 border-r border-gray-200">Qty Request</th>
                  <th class="px-2 py-2 border-r border-gray-200">Qty IFRM</th>
                  <th class="px-2 py-2 border-r border-gray-200">Qty Supply</th>
                  <th v-if="!editAllTp" class="px-2 py-2 border-r border-gray-200">Tambah (+)</th>
                  <th v-if="!editAllTp" class="px-2 py-2 border-r border-gray-200">Kurang (&minus;)</th>
                  <th v-if="!editAllTp" class="px-2 py-2 border-r border-gray-200">Hasil Akhir</th>
                  <th class="px-2 py-2">Riwayat</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in editItems" :key="item.no_item" class="border-t border-gray-200">
                  <td class="px-2 py-2 border-r border-gray-200">{{ item.no_item }}</td>
                  <td class="px-2 py-2 border-r border-gray-200 text-left">
                    <span :class="isDeleted(item) ? 'line-through text-gray-400' : ''">{{ item.part_no }}</span>
                    <div v-if="isDeleted(item)">
                      <span class="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">
                        Dihapus dari SAP
                      </span>
                    </div>
                    <div v-if="item.util_for_no_item" class="text-[10px] text-violet-600 font-medium">
                      Item pemanfaatan atas {{ item.util_for_no_item }}
                    </div>
                    <div v-if="isItemTp(item)">
                      <span
                        class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        :class="item.mat_doc ? 'bg-emerald-100 text-emerald-700' : 'bg-teal-100 text-teal-700'"
                      >
                        {{ item.mat_doc ? 'Sudah TP — ' + item.mat_doc : 'Sudah di-TP by SAP' }}
                      </span>
                    </div>
                  </td>
                  <td class="px-2 py-2 border-r border-gray-200">{{ item.qty_request }}</td>
                  <td
                    class="px-2 py-2 border-r border-gray-200"
                    :class="item.stock_irm === 0 ? 'bg-red-100 text-red-700 font-semibold' : ''"
                  >
                    {{ item.stock_irm }}
                  </td>
                  <td class="px-2 py-2 border-r border-gray-200" :class="qtySupplyClass(item)">{{ item.qty_supply }}</td>

                  <td v-if="!editAllTp" class="px-2 py-1.5 border-r border-gray-200">
                    <input
                      v-model.number="entryOf(item.no_item).plus"
                      type="number"
                      min="0"
                      placeholder="0"
                      :disabled="isLocked(item)"
                      class="w-20 p-1.5 text-xs text-center !border !border-gray-300 rounded-lg bg-white text-green-600 font-semibold disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td v-if="!editAllTp" class="px-2 py-1.5 border-r border-gray-200">
                    <input
                      v-model.number="entryOf(item.no_item).minus"
                      type="number"
                      min="0"
                      placeholder="0"
                      :disabled="isLocked(item)"
                      class="w-20 p-1.5 text-xs text-center !border !border-gray-300 rounded-lg bg-white text-red-600 font-semibold disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td v-if="!editAllTp" class="px-2 py-1.5 border-r border-gray-200">
                    <span v-if="isItemTp(item)" class="text-[10px] text-emerald-600">sudah TP</span>
                    <span v-else-if="isDeleted(item)" class="text-[10px] text-gray-400">terkunci</span>
                    <div
                      v-else
                      class="w-20 mx-auto p-1.5 text-xs text-center border rounded-lg font-semibold"
                      :class="errorOf(item)
                        ? 'border-red-300 bg-red-50 text-red-600'
                        : warningOf(item)
                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-700'"
                    >
                      {{ previewOf(item) }}
                    </div>
                    <div v-if="errorOf(item)" class="mt-0.5 text-[10px] text-red-600">{{ errorOf(item) }}</div>
                    <div v-else-if="warningOf(item)" class="mt-0.5 text-[10px] text-amber-600">
                      ⚠ {{ warningOf(item) }}
                    </div>
                  </td>

                  <td class="px-2 py-1.5">
                    <button
                      type="button"
                      @click="openHistory(item)"
                      class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-600 text-white text-[11px] font-medium rounded-lg hover:bg-gray-700"
                    >
                      <HistoryOutlined />
                      Riwayat
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Daftar item baru / pemanfaatan -->
          <div class="mt-5">
            <h6 class="text-xs font-semibold text-gray-600 uppercase mb-2">Riwayat Item Baru / Pemanfaatan</h6>

            <div v-if="isLoadingUtilizations" class="py-4 text-center text-xs text-gray-400">Memuat data...</div>

            <div v-else-if="!utilizations.length" class="py-4 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
              Belum ada item baru / pemanfaatan pada no reservasi ini.
            </div>

            <div v-else class="border border-gray-200 rounded-lg overflow-hidden">
              <table class="w-full text-xs text-center">
                <thead class="bg-gray-50 text-gray-600 uppercase">
                  <tr>
                    <th class="px-2 py-2 border-r border-gray-200">Nama Item</th>
                    <th class="px-2 py-2 border-r border-gray-200">Status</th>
                    <th class="px-2 py-2 border-r border-gray-200">Qty</th>
                    <th class="px-2 py-2 border-r border-gray-200">Atas Pemanfaatan</th>
                    <th class="px-2 py-2 border-r border-gray-200">User</th>
                    <th class="px-2 py-2">Status SAP</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="util in utilizations" :key="util.id" class="odd:bg-white even:bg-gray-50 border-t border-gray-200">
                    <td class="px-2 py-1.5 border-r border-gray-200">{{ util.part_no }}</td>
                    <td class="px-2 py-1.5 border-r border-gray-200">{{ util.status }}</td>
                    <td class="px-2 py-1.5 border-r border-gray-200">{{ util.qty }}</td>
                    <td class="px-2 py-1.5 border-r border-gray-200">
                      <span v-if="!util.for_no_item" class="text-violet-600 font-medium">Item Baru</span>
                      <template v-else>
                        {{ util.for_no_item }}<span v-if="util.for_part_no"> — {{ util.for_part_no }}</span>
                      </template>
                    </td>
                    <td class="px-2 py-1.5 border-r border-gray-200">{{ util.created_by || '-' }}</td>
                    <td class="px-2 py-1.5">
                      <span
                        v-if="util.sap_status === 'sent'"
                        class="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold"
                      >
                        Terkirim ke SAP
                      </span>
                      <span
                        v-else-if="util.sap_status === 'failed'"
                        class="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold"
                      >
                        Gagal kirim ke SAP
                      </span>
                      <span v-else class="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                        Belum terkirim ke SAP
                      </span>

                      <div v-if="util.sap_matched" class="mt-0.5 text-[10px] text-gray-400">
                        sudah muncul di rundown
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="px-5 py-3 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
          <p v-if="!editAllTp && editHasWarning" class="text-[11px] text-amber-600">
            ⚠ Terdapat item dengan Qty Supply melebihi Stock IFRM. Tetap bisa disimpan dan di-TP &mdash;
            diterima atau tidaknya ditentukan SAP.
          </p>
          <span v-else></span>

          <div class="flex gap-2 shrink-0">
            <button type="button" @click="closeEdit" class="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100">
              Tutup
            </button>
            <button
              v-if="!editAllTp"
              type="button"
              @click="onSaveEdit"
              :disabled="isSaving || editHasError || !editHasInput"
              class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Modal Riwayat (per item) ───────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="historyItem" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="closeHistory"></div>

      <div class="relative w-full max-w-3xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        <div class="px-5 py-3 bg-gray-700 text-white font-semibold flex items-center justify-between shrink-0">
          <span>Riwayat Perubahan &mdash; Item {{ historyItem.no_item }} ({{ historyItem.part_no }})</span>
          <button type="button" class="text-white/80 hover:text-white text-xl leading-none" @click="closeHistory">&times;</button>
        </div>

        <div class="p-5 overflow-y-auto">
          <div v-if="isLoadingHistory" class="py-6 text-center text-xs text-gray-400">Memuat riwayat...</div>

          <div v-else-if="!history.length" class="py-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
            Belum ada perubahan qty supply untuk item ini.
          </div>

          <div v-else class="border border-gray-200 rounded-lg overflow-hidden">
            <table class="w-full text-xs text-center">
              <thead class="bg-gray-50 text-gray-600 uppercase">
                <tr>
                  <th class="px-2 py-2 border-r border-gray-200">Tanggal</th>
                  <th class="px-2 py-2 border-r border-gray-200">Jam</th>
                  <th class="px-2 py-2 border-r border-gray-200">Aksi</th>
                  <th class="px-2 py-2 border-r border-gray-200">Perubahan</th>
                  <th class="px-2 py-2 border-r border-gray-200">Sebelum</th>
                  <th class="px-2 py-2 border-r border-gray-200">Sesudah</th>
                  <th class="px-2 py-2 border-r border-gray-200">User</th>
                  <th class="px-2 py-2">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(log, i) in history" :key="i" class="odd:bg-white even:bg-gray-50 border-t border-gray-200">
                  <td class="px-2 py-1.5 border-r border-gray-200">{{ formatTanggal(log.created_at) }}</td>
                  <td class="px-2 py-1.5 border-r border-gray-200">{{ formatJam(log.created_at) }}</td>
                  <td class="px-2 py-1.5 border-r border-gray-200" :class="actionClass(log.action)">
                    {{ actionLabel(log.action) }}
                  </td>
                  <td class="px-2 py-1.5 border-r border-gray-200">
                    <span v-if="log.action !== 'adjust' && log.action !== 'sap_sync'" class="text-gray-400">-</span>
                    <span v-else :class="log.qty_change >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'">
                      {{ log.qty_change >= 0 ? '+' : '' }}{{ log.qty_change }}
                    </span>
                  </td>
                  <td class="px-2 py-1.5 border-r border-gray-200">{{ log.qty_before }}</td>
                  <td class="px-2 py-1.5 border-r border-gray-200 font-semibold">{{ log.qty_after }}</td>
                  <td class="px-2 py-1.5 border-r border-gray-200">{{ log.created_by || '-' }}</td>
                  <td class="px-2 py-1.5 text-left">{{ log.note || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="px-5 py-3 border-t border-gray-200 flex justify-end shrink-0">
          <button type="button" @click="closeHistory" class="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100">
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Modal Form Item Baru / Pemanfaatan ─────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="showUtilForm" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="closeUtilForm"></div>

      <div class="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden">
        <div class="px-5 py-3 bg-violet-600 text-white font-semibold flex items-center justify-between">
          <span>Tambah Item Baru / Pemanfaatan</span>
          <button type="button" class="text-white/80 hover:text-white text-xl leading-none" @click="closeUtilForm">&times;</button>
        </div>

        <div class="p-5 space-y-3">
          <div class="relative" ref="utilSearchRef">
            <label class="block text-xs text-gray-500 mb-1">Nama Item <span class="text-red-500">*</span></label>

            <div class="flex gap-2">
              <input
                v-model="utilKeyword"
                @input="onKeywordInput"
                @keyup.enter="onSearchMaterial"
                type="text"
                placeholder="Masukan Part Number/Job Number"
                class="block flex-1 p-2.5 text-sm !border !border-gray-300 rounded-lg bg-white"
              />
              <button
                type="button"
                @click="onSearchMaterial"
                :disabled="isSearchingMaterial || !utilKeyword.trim()"
                class="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:bg-gray-400 disabled:cursor-not-allowed shrink-0"
              >
                <LoadingOutlined v-if="isSearchingMaterial" />
                <SearchOutlined v-else />
                {{ isSearchingMaterial ? 'Mencari...' : 'Search' }}
              </button>
            </div>

            <!-- Dropdown hasil pencarian SAP -->
            <div
              v-if="showUtilDropdown && !isSearchingMaterial"
              class="absolute left-0 right-0 top-full z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              <button
                v-for="(item, i) in materialResults"
                :key="`${item.part_no}-${i}`"
                type="button"
                @click="onSelectMaterial(item)"
                class="block w-full text-left px-3 py-2 hover:bg-violet-50 border-b border-gray-100 last:border-b-0"
              >
                <div class="text-sm font-semibold text-gray-700">
                  {{ item.part_no }}<span v-if="item.job_no"> / {{ item.job_no }}</span>
                </div>
                <div class="text-[11px] text-gray-500">{{ item.description || '-' }}</div>
              </button>

              <div v-if="!materialResults.length && hasSearchedMaterial" class="px-3 py-3 text-xs text-gray-400 text-center">
                {{ materialMessage || 'Material tidak ditemukan di SAP.' }}
              </div>
            </div>

            <p v-if="isSearchingMaterial" class="mt-1 text-[11px] text-gray-400">Mencari material di SAP...</p>
            <p v-else-if="utilSelected" class="mt-1 text-[11px] text-emerald-600">
              Dipilih: <span class="font-semibold">{{ utilSelected.part_no }}</span>
              <span v-if="utilSelected.job_no"> / {{ utilSelected.job_no }}</span>
              <span v-if="utilSelected.description"> — {{ utilSelected.description }}</span>
            </p>
            <p v-else class="mt-1 text-[11px] text-gray-400 italic">
              * Klik Search, lalu pilih material dari hasil pencarian SAP.
            </p>
          </div>

          <div>
            <label class="block text-xs text-gray-500 mb-1">Status <span class="text-red-500">*</span></label>
            <select
              v-model="utilForm.status"
              class="block w-full p-2.5 text-sm !border !border-gray-300 rounded-lg bg-white"
            >
              <option value="" disabled>Pilih status</option>
              <option value="GPART">GPART</option>
              <option value="NON GPART">NON GPART</option>
            </select>
          </div>

          <div>
            <label class="block text-xs text-gray-500 mb-1">Quantity <span class="text-red-500">*</span></label>
            <input
              v-model.number="utilForm.qty"
              type="number"
              min="1"
              placeholder="0"
              class="block w-full p-2.5 text-sm !border !border-gray-300 rounded-lg bg-white"
            />
          </div>

          <div>
            <label class="block text-xs text-gray-500 mb-1">Atas Pemanfaatan <span class="text-red-500">*</span></label>
            <select
              v-model="utilForm.for_no_item"
              class="block w-full p-2.5 text-sm !border !border-gray-300 rounded-lg bg-white"
            >
              <option value="" disabled>Pilih item pada no reservasi ini</option>
              <option v-for="item in utilTargetOptions" :key="item.no_item" :value="item.no_item">
                {{ item.no_item }} — {{ item.part_no }}
              </option>
              <!-- Item yang berdiri sendiri, bukan pengganti item mana pun -->
              <option :value="UTIL_NEW_ITEM">Item Baru</option>
            </select>
            <p v-if="utilDuplicate" class="mt-1 text-[11px] text-red-600">
              ⚠ {{ utilForm.part_no }} sudah ada pada no reservasi ini (item {{ utilDuplicate.no_item }}).
              Item baru hanya untuk part yang belum ada.
            </p>
            <p v-else-if="utilIsNewItem" class="mt-1 text-[11px] text-gray-400">
              Item baru berdiri sendiri, tidak dicatat sebagai pemanfaatan atas item lain.
            </p>
          </div>
        </div>

        <div class="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" @click="closeUtilForm" class="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100">
            Batal
          </button>
          <button
            type="button"
            @click="askUtilConfirm"
            :disabled="!utilFormValid || isSaving"
            class="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Modal Konfirmasi TP dengan Qty Supply 0 ────────────────────────────── -->
  <Teleport to="body">
    <div v-if="showTpZeroConfirm" class="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="showTpZeroConfirm = false"></div>

      <div class="relative w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
        <div class="px-5 py-3 bg-amber-500 text-white font-semibold">Konfirmasi Transfer Posting</div>

        <div class="p-5 text-sm text-gray-600">
          <p class="mb-3">
            Terdapat <span class="font-semibold text-amber-600">{{ tpZeroItems.length }} item</span>
            dengan Qty Supply <span class="font-semibold">0</span>. Jika di-TP, item tersebut akan
            <span class="font-semibold text-red-600">dihapus di SAP</span>.
          </p>

          <div class="text-xs border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-48 overflow-y-auto">
            <div v-for="item in tpZeroItems" :key="item.no_item" class="flex justify-between px-3 py-2">
              <span class="text-gray-400">Item {{ item.no_item }}</span>
              <span class="font-semibold text-gray-700">{{ item.part_no }}</span>
            </div>
          </div>

          <p class="mt-3 text-xs text-gray-400">Lanjutkan proses Transfer Posting?</p>
        </div>

        <div class="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" @click="showTpZeroConfirm = false" class="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100">
            Batal
          </button>
          <button
            type="button"
            @click="onSubmitTp"
            :disabled="isSaving"
            class="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {{ isSaving ? 'Memproses...' : 'Ya, Lanjutkan TP' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Modal Konfirmasi Item Baru / Pemanfaatan ───────────────────────────── -->
  <Teleport to="body">
    <div v-if="showUtilConfirm" class="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="showUtilConfirm = false"></div>

      <div class="relative w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
        <div class="px-5 py-3 bg-violet-600 text-white font-semibold">Konfirmasi Item Baru / Pemanfaatan</div>

        <div class="p-5 text-sm text-gray-600">
          <p class="mb-3">Simpan item berikut?</p>
          <div class="text-xs border border-gray-200 rounded-lg divide-y divide-gray-200">
            <div class="flex justify-between px-3 py-2">
              <span class="text-gray-400">Nama Item</span><span class="font-semibold text-gray-700">{{ utilForm.part_no }}</span>
            </div>
            <div class="flex justify-between px-3 py-2">
              <span class="text-gray-400">Status</span><span class="font-semibold text-gray-700">{{ utilForm.status }}</span>
            </div>
            <div class="flex justify-between px-3 py-2">
              <span class="text-gray-400">Quantity</span><span class="font-semibold text-gray-700">{{ utilForm.qty }}</span>
            </div>
            <div class="flex justify-between px-3 py-2">
              <span class="text-gray-400">Jenis / Atas Item</span><span class="font-semibold text-gray-700">{{ utilTargetLabel }}</span>
            </div>
          </div>
        </div>

        <div class="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" @click="showUtilConfirm = false" class="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100">
            Batal
          </button>
          <button
            type="button"
            @click="onSaveUtilization"
            :disabled="isSaving"
            class="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {{ isSaving ? 'Menyimpan...' : 'Ya, Simpan' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Modal Transfer Posting (per no reservasi) ──────────────────────────── -->
  <Teleport to="body">
    <div v-if="tpReservasi" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="closeTp"></div>

      <div class="relative w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div class="px-5 py-3 bg-emerald-600 text-white font-semibold flex items-center justify-between shrink-0">
          <span>Transfer Posting &mdash; No Reservasi {{ tpReservasi }}</span>
          <button type="button" class="text-white/80 hover:text-white text-xl leading-none" @click="closeTp">&times;</button>
        </div>

        <div class="p-5 overflow-y-auto">
          <p class="text-xs text-gray-500 mb-3">
            TP diproses untuk item yang <span class="font-semibold">belum ter-TP</span> pada no reservasi ini.
            Item yang Qty Supply-nya tidak sama dengan Qty Request <span class="font-semibold text-red-600">wajib</span> diisi pesan problem.
            Hasil akhirnya ditentukan SAP: item yang ditolak tetap terbuka dan bisa di-TP lagi menyusul.
            Item yang berhasil ter-TP qty supply-nya tidak bisa diubah lagi.
          </p>

          <!-- Posting date -->
          <div class="mb-4">
            <label class="block text-xs text-gray-500 mb-1">Posting Date <span class="text-red-500">*</span></label>
            <input
              v-model="tpPostingDate"
              type="date"
              class="block w-52 p-2.5 text-sm !border rounded-lg bg-white"
              :class="tpPostingDate ? '!border-gray-300' : '!border-red-300'"
            />
            <p v-if="!tpPostingDate" class="mt-1 text-[11px] text-red-600">Posting date wajib diisi.</p>
          </div>

          <div class="border border-gray-200 rounded-lg overflow-hidden">
            <table class="w-full text-xs text-center">
              <thead class="bg-gray-50 text-gray-600 uppercase">
                <tr>
                  <th class="px-2 py-2 border-r border-gray-200">Item</th>
                  <th class="px-2 py-2 border-r border-gray-200">Part No</th>
                  <th class="px-2 py-2 border-r border-gray-200">Qty Req</th>
                  <th class="px-2 py-2 border-r border-gray-200">Qty Supply</th>
                  <th class="px-2 py-2 border-r border-gray-200">Qty IFRM</th>
                  <th class="px-2 py-2">Pesan Problem</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in tpItems" :key="item.no_item" class="border-t border-gray-200 align-top">
                  <td class="px-2 py-2 border-r border-gray-200">{{ item.no_item }}</td>
                  <td class="px-2 py-2 border-r border-gray-200">{{ item.part_no }}</td>
                  <td class="px-2 py-2 border-r border-gray-200">{{ item.qty_request }}</td>
                  <td
                    class="px-2 py-2 border-r border-gray-200"
                    :class="isMismatch(item) ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'"
                  >
                    {{ item.qty_supply }}
                  </td>
                  <td
                    class="px-2 py-2 border-r border-gray-200"
                    :class="isOverStock(item) ? 'bg-amber-100 text-amber-700 font-semibold' : ''"
                  >
                    {{ item.stock_irm }}
                    <div v-if="isOverStock(item)" class="text-[10px] font-normal">⚠ kurang dari qty supply</div>
                  </td>
                  <td class="px-2 py-2 text-left">
                    <template v-if="needsProblem(item)">
                      <select
                        v-model="tpProblemChoice[item.no_item]"
                        class="block w-full p-2 text-xs !border rounded-lg bg-white"
                        :class="tpProblemChoice[item.no_item] ? '!border-gray-300' : '!border-red-300'"
                      >
                        <option value="">-- Pilih pesan problem --</option>
                        <option v-for="opt in TP_PROBLEM_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
                        <option :value="TP_PROBLEM_OTHER">{{ TP_PROBLEM_OTHER }}</option>
                      </select>

                      <!-- Isian bebas hanya untuk alasan di luar daftar baku -->
                      <textarea
                        v-if="tpProblemChoice[item.no_item] === TP_PROBLEM_OTHER"
                        v-model="tpProblemOther[item.no_item]"
                        rows="2"
                        placeholder="Wajib diisi — jelaskan kenapa qty tidak sesuai"
                        class="mt-1.5 block w-full p-2 text-xs !border rounded-lg bg-white"
                        :class="(tpProblemOther[item.no_item] || '').trim() ? '!border-gray-300' : '!border-red-300'"
                      ></textarea>
                    </template>
                    <span v-else class="text-gray-400 text-xs">Qty supply sudah sesuai</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p v-if="tpItems.some(isOverStock)" class="mt-3 text-xs text-amber-600">
            ⚠ Terdapat item dengan Qty Supply melebihi Stock IFRM.
          </p>

          <p v-if="tpMissingProblem" class="mt-3 text-xs text-red-600">
            ⚠ Terdapat pesan problem yang belum diisi.
          </p>
        </div>

        <div class="px-5 py-3 border-t border-gray-200 flex justify-end gap-2 shrink-0">
          <button type="button" @click="closeTp" class="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100">
            Batal
          </button>
          <button
            type="button"
            @click="askSubmitTp"
            :disabled="isSaving || tpMissingProblem || !tpPostingDate"
            class="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {{ isSaving ? 'Memproses...' : 'Proses TP' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Modal Batal TP ─────────────────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="cancelRow" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="closeCancelTp"></div>

      <div class="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden">
        <div class="px-5 py-3 bg-amber-500 text-white font-semibold flex items-center justify-between">
          <span>Batal Transfer Posting</span>
          <button type="button" class="text-white/80 hover:text-white text-xl leading-none" @click="closeCancelTp">&times;</button>
        </div>

        <div class="p-5">
          <p class="text-sm text-gray-600 mb-1">
            Batalkan TP untuk no reservasi <span class="font-semibold">{{ cancelRow.no_reservasi }}</span>?
          </p>
          <p class="text-xs text-gray-400 mb-4">
            Pembatalan berlaku untuk seluruh item pada
            {{ cancelRow.mat_doc ? `material dokumen ${cancelRow.mat_doc}` : 'no reservasi ini (nomor material dokumen belum tersedia)' }}.
            Setelah dibatalkan, qty supply bisa diubah lagi.
          </p>

          <label class="block text-xs text-gray-500 mb-1">Alasan (opsional)</label>
          <textarea
            v-model="cancelReason"
            rows="3"
            placeholder="Alasan pembatalan TP"
            class="block w-full p-2 text-sm !border !border-gray-300 rounded-lg bg-white"
          ></textarea>
        </div>

        <div class="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" @click="closeCancelTp" class="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100">
            Tutup
          </button>
          <button
            type="button"
            @click="onSubmitCancelTp"
            :disabled="isSaving"
            class="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {{ isSaving ? 'Memproses...' : 'Batalkan TP' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.border {
  border: 1px solid #e5e7eb !important;
}

.table-scroll {
  max-height: calc(100vh - 340px);
}

.table-scroll thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background-color: #f9fafb;
  box-shadow: inset 0 -1px 0 #e5e7eb;
}
</style>
