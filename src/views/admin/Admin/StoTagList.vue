<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import StoAksesHeader from '@/components/sto/StoAksesHeader.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import { ReloadOutlined } from '@ant-design/icons-vue';
import { useStoTagListStore } from '@/stores/Admin/StoTagList';
import type { StoTagListRow, StoTagOkRow } from '@/types/Admin/StoTagList';

const page = shallowRef({ title: 'List Tags' });
const breadcrumbs = shallowRef([
  { title: 'Admin', disabled: false, href: '#' },
  { title: 'STO', disabled: false, href: '#' },
  { title: 'List Tags', disabled: true, href: '#' }
]);

const columns: TableColumn[] = [
  { key: 'id_tag', label: 'ID Tag' },
  { key: 'area', label: 'Area', align: 'center' },
  { key: 'part_number', label: 'Part Number' },
  { key: 'job_number', label: 'Job Number' },
  { key: 'scan', label: 'Scan A / B', align: 'center', sortable: false },
  { key: 'is_canceled', label: 'Status', align: 'center' },
  { key: 'print_status', label: 'Cetak', align: 'center' },
  { key: 'event_name', label: 'Event' },
  { key: 'created_by_nik', label: 'Dicetak Oleh', align: 'center' },
  { key: 'created_at', label: 'Dibuat', align: 'center' }
];

const columnsOk: TableColumn[] = [
  { key: 'id_tag_ok', label: 'ID Tag OK' },
  { key: 'area', label: 'Area', align: 'center' },
  { key: 'part_number', label: 'Part Number' },
  { key: 'job_number', label: 'Job Number' },
  { key: 'line', label: 'Line' },
  { key: 'shift', label: 'Shift', align: 'center' },
  { key: 'qty_kbn', label: 'Qty KBN', align: 'center' },
  // scan_open 1 = tag masih terbuka, artinya belum ada yang men-scan.
  { key: 'scan_open', label: 'Scan', align: 'center' },
  { key: 'is_canceled', label: 'Status', align: 'center' },
  { key: 'scanned_by', label: 'Discan Oleh', align: 'center' },
  { key: 'scanned_at', label: 'Waktu Scan', align: 'center' }
];

const store = useStoTagListStore();
const {
  fetchTags,
  cariBertahap,
  terapkanFilter,
  resetFilter,
  openDetail,
  muatPilihan,
  keluarSto,
  gantiTab,
  fetchTagOk,
  cariBertahapOk,
  terapkanFilterOk,
  resetFilterOk,
  openDetailOk,
  bukaAjukanCancel,
  kirimAjukanCancel,
  exportTagSto,
  exportTagOk,
  exportReport
} = store;
const {
  nik,
  dataTable,
  totalSemua,
  filter,
  areaOptions,
  isLoggingOut,
  eventOptions,
  isLoading,
  lastError,
  detail,
  dialog,
  adaFilterAktif,
  tab,
  tagOk,
  adaFilterAktifOk,
  sedangExport,
  eventTerpilih,
  ajukan
} = storeToRefs(store);

onMounted(async () => {
  // Berurutan, bukan paralel -- fetchTags menunggu modal pilih-NIK dulu kalau
  // belum ada sesi sama sekali, dan muatPilihan (event-list) butuh NIK yang
  // sama itu sudah tersimpan supaya tidak ikut memanggil backend dengan nik="".
  await fetchTags();
  void muatPilihan();
});

function asTag(row: Record<string, unknown>): StoTagListRow {
  return row as unknown as StoTagListRow;
}

function asTagOk(row: Record<string, unknown>): StoTagOkRow {
  return row as unknown as StoTagOkRow;
}

const cancelLabel = (v: number) => (v === 1 ? 'Dibatalkan' : v === 2 ? 'Diajukan Batal' : 'Normal');

const cancelClass = (v: number) =>
  v === 1 ? 'bg-red-100 text-red-700' : v === 2 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';

const printClass = (v: string) =>
  v === 'printed' ? 'bg-emerald-100 text-emerald-700' : v === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600';

// <option value> selalu string, sedangkan filter.id_event bertipe number|null.
const filterEvent = computed({
  get: () => (filter.value.id_event === null ? '' : String(filter.value.id_event)),
  set: (v: string) => {
    filter.value.id_event = v === '' ? null : Number(v);
  }
});

const rentang = computed(() => {
  if (dataTable.value.length === 0) return '0';
  const awal = filter.value.offset + 1;
  return `${awal} - ${filter.value.offset + dataTable.value.length}`;
});

// <option value> selalu string; sama seperti filterEvent pada tab Tag STO.
const filterEventOk = computed({
  get: () => (tagOk.value.filter.id_event === null ? '' : String(tagOk.value.filter.id_event)),
  set: (v: string) => {
    tagOk.value.filter.id_event = v === '' ? null : Number(v);
  }
});

const detailOkRows = computed(() => {
  const d = tagOk.value.detail;
  if (!d) return [];
  return [
    { label: 'ID Tag OK', value: d.id_tag_ok },
    { label: 'Area', value: d.area },
    { label: 'Part Number', value: d.part_number },
    { label: 'Job Number', value: d.job_number },
    { label: 'Line', value: d.line.trim() || '-' },
    { label: 'Shift', value: String(d.shift ?? '-') },
    { label: 'Customer / Project', value: [d.customer, d.project].filter(Boolean).join(' / ') || '-' },
    { label: 'Status Part', value: d.status || '-' },
    { label: 'Qty KBN', value: d.qty_kbn || '-' },
    { label: 'Disiapkan Oleh', value: d.opened_by ? `${d.opened_by} (${d.opened_at || '-'})` : '-' },
    { label: 'Scan', value: d.scan_open === 1 ? 'Belum discan' : 'Sudah discan' },
    { label: 'Discan Oleh', value: d.scanned_by ? `${d.scanned_by} (${d.scanned_at || '-'})` : '-' },
    { label: 'Status', value: cancelLabel(d.is_canceled) },
    { label: 'Alasan Batal', value: d.cancel_reason || '-' },
    { label: 'Dibatalkan Oleh', value: d.canceled_by ? `${d.canceled_by} (${d.canceled_at || '-'})` : '-' }
  ];
});

const detailRows = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return [
    { label: 'ID Tag', value: d.id_tag },
    { label: 'Event', value: d.event_name || '-' },
    { label: 'Area', value: d.area },
    { label: 'Part Number', value: d.part_number },
    { label: 'Job Number', value: d.job_number },
    { label: 'Deskripsi', value: d.material_description },
    { label: 'Type / Model', value: [d.type, d.model].filter(Boolean).join(' / ') || '-' },
    { label: 'Customer / Plant', value: [d.customer, d.plant].filter(Boolean).join(' / ') || '-' },
    { label: 'Tim A', value: d.updated_a ? `${d.nik_a || '-'} - qty ${d.qty_a} (${d.updated_a})` : 'Belum discan' },
    { label: 'Tim B', value: d.updated_b ? `${d.nik_b || '-'} - qty ${d.qty_b} (${d.updated_b})` : 'Belum discan' },
    { label: 'Status', value: cancelLabel(d.is_canceled) },
    { label: 'Alasan Batal', value: d.cancel_reason || '-' },
    { label: 'Diajukan Oleh', value: d.cancel_requested_by_nik ? `${d.cancel_requested_by_nik} (${d.cancel_requested_at || '-'})` : '-' },
    { label: 'Disetujui Oleh', value: d.cancel_approved_by_nik || '-' },
    { label: 'Cetak', value: d.print_status ? `${d.print_status}${d.printed_at ? ` (${d.printed_at})` : ''}` : '-' },
    { label: 'Dicetak Oleh', value: d.created_by_nik || '-' },
    { label: 'Dibuat', value: d.created_at || '-' }
  ];
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-5" />

  <!-- Tab -->
  <div class="flex items-center gap-1 mb-4 !border-b !border-gray-300">
    <button
      v-for="t in [
        { id: 'sto', label: 'Tag STO', ikon: 'mdi-tag-multiple-outline' },
        { id: 'ok', label: 'Tag OK', ikon: 'mdi-check-decagram-outline' }
      ]"
      :key="t.id"
      type="button"
      :class="[
        'inline-flex items-center gap-2 px-4 py-2.5 -mb-px text-sm font-semibold transition !border-b-2',
        tab === t.id ? '!border-blue-500 text-blue-600' : '!border-transparent text-gray-500 hover:text-gray-700'
      ]"
      @click="gantiTab(t.id as 'sto' | 'ok')"
    >
      <i class="mdi text-base leading-none" :class="t.ikon" />
      {{ t.label }}
    </button>
  </div>

  <!-- ================= TAB 1 - TAG STO ================= -->
  <template v-if="tab === 'sto'">
  <!-- ── Panel atas: info + filter ─────────────────────────────────── -->
  <div class="bg-white !border !border-gray-300 rounded-xl shadow-sm mb-4 overflow-hidden">
    <div class="flex items-start justify-between flex-wrap gap-4 px-5 py-4">
      <div class="flex items-stretch flex-wrap gap-y-3">
        <StoAksesHeader :nik="nik" keterangan="NIK ber-role admin" :loading="isLoggingOut" @logout="keluarSto" />

        <div class="px-8 !border-l !border-gray-300">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Tag Cocok Filter</span>
          <div class="text-lg font-semibold text-gray-800 leading-tight">{{ totalSemua }}</div>
        </div>
        <div class="px-8 !border-l !border-gray-300">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Ditampilkan</span>
          <div class="text-lg font-semibold text-gray-800 leading-tight">{{ rentang }}</div>
        </div>
      </div>

      <div class="flex flex-col items-end gap-1.5">
        <span v-if="lastError" class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 !border !border-red-200">
          {{ lastError }}
        </span>

        <div class="flex items-center gap-2">
          <button
            type="button"
            :title="eventTerpilih ? 'Unduh sesuai filter yang sedang aktif' : 'Pilih event dulu pada filter'"
            :disabled="sedangExport !== null || !eventTerpilih"
            class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            @click="exportTagSto"
          >
            <i class="mdi" :class="sedangExport === 'sto' ? 'mdi-loading mdi-spin' : 'mdi-file-excel-outline'" />
            {{ sedangExport === 'sto' ? 'Menyiapkan...' : 'Download Excel' }}
          </button>

          <button
            type="button"
            :title="eventTerpilih ? 'Unduh rekap per part number' : 'Pilih event dulu pada filter'"
            :disabled="sedangExport !== null || !eventTerpilih"
            class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            @click="exportReport"
          >
            <i class="mdi" :class="sedangExport === 'report' ? 'mdi-loading mdi-spin' : 'mdi-chart-box-outline'" />
            {{ sedangExport === 'report' ? 'Menyusun...' : 'Report STO' }}
          </button>
        </div>

        <!-- Unduhan menuntut event supaya cakupan datanya jelas. -->
        <span v-if="!eventTerpilih" class="text-[11px] text-amber-600 text-right max-w-[15rem]">
          Pilih event pada filter untuk mengaktifkan unduhan.
        </span>
      </div>
    </div>

    <!-- Filter -->
    <div class="flex items-center gap-2 flex-wrap px-5 py-3 !border-t !border-gray-300 bg-gray-50">
      <!-- Live search -->
      <div class="relative">
        <i class="mdi mdi-magnify absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
        <input
          v-model="filter.q"
          type="text"
          placeholder="Cari ID Tag / part / job / deskripsi / NIK scan..."
          class="w-80 h-9 pl-8 pr-8 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
          @input="cariBertahap"
          @keydown.enter="terapkanFilter"
        />
        <i v-if="isLoading" class="mdi mdi-loading mdi-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400 text-base" />
      </div>

      <select
        v-model="filter.area"
        class="sto-select h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
        @change="terapkanFilter"
      >
        <option value="">Semua area</option>
        <option v-for="a in areaOptions" :key="a" :value="a">{{ a }}</option>
      </select>

      <select
        v-model="filter.batal"
        class="sto-select h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
        @change="terapkanFilter"
      >
        <option value="">Semua status</option>
        <option value="0">Normal</option>
        <option value="2">Diajukan batal</option>
        <option value="1">Dibatalkan</option>
      </select>

      <select
        v-model="filter.scan"
        class="sto-select h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
        @change="terapkanFilter"
      >
        <option value="">Semua scan</option>
        <option value="sudah">Sudah discan</option>
        <option value="belum">Belum discan</option>
      </select>

      <select
        v-model="filterEvent"
        class="sto-select h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
        @change="terapkanFilter"
      >
        <option value="">Semua event</option>
        <option v-for="e in eventOptions" :key="e.id_event" :value="String(e.id_event)">
          {{ e.event_name }}{{ e.status === 1 ? ' (aktif)' : '' }}
        </option>
      </select>

      <button
        type="button"
        title="Muat ulang"
        class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition"
        @click="terapkanFilter"
      >
        <ReloadOutlined />
        Muat Ulang
      </button>

      <button
        v-if="adaFilterAktif"
        type="button"
        class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition"
        @click="resetFilter"
      >
        Reset Filter
      </button>

    </div>
  </div>

  <!-- ── Tabel ─────────────────────────────────────────────────────── -->
  <div class="sto-table rounded-lg overflow-hidden !border !border-gray-300">
    <TableExcel :columns="columns" :data="dataTable" :loading="isLoading" thead-class="bg-gray-50">
      <template #cell-job_number="{ value }">
        <span :title="String(value || '')">{{ value || '-' }}</span>
      </template>
      <template #cell-event_name="{ value }">
        <span class="block max-w-[12rem] truncate" :title="String(value || '')">{{ value || '-' }}</span>
      </template>
      <template #cell-scan="{ row }">
        <div class="flex items-center justify-center gap-1">
          <span
            class="px-1.5 py-0.5 rounded text-[11px] font-semibold"
            :class="asTag(row).updated_a ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-400'"
            :title="asTag(row).updated_a ? `${asTag(row).nik_a} - ${asTag(row).updated_a}` : 'Tim A belum scan'"
          >
            A: {{ asTag(row).updated_a ? asTag(row).qty_a : '-' }}
          </span>
          <span
            class="px-1.5 py-0.5 rounded text-[11px] font-semibold"
            :class="asTag(row).updated_b ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-400'"
            :title="asTag(row).updated_b ? `${asTag(row).nik_b} - ${asTag(row).updated_b}` : 'Tim B belum scan'"
          >
            B: {{ asTag(row).updated_b ? asTag(row).qty_b : '-' }}
          </span>
        </div>
      </template>
      <template #cell-is_canceled="{ row }">
        <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="cancelClass(asTag(row).is_canceled)">
          {{ cancelLabel(asTag(row).is_canceled) }}
        </span>
      </template>
      <template #cell-print_status="{ value }">
        <span v-if="value" class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="printClass(String(value))">{{ value }}</span>
        <span v-else class="text-gray-400">-</span>
      </template>
      <template #actions="{ row }">
        <div class="flex items-center justify-center gap-1.5">
          <button
            type="button"
            title="Detail tag"
            class="inline-flex items-center justify-center p-1.5 text-white bg-gray-500 rounded-lg hover:bg-gray-600 transition"
            @click="openDetail(asTag(row))"
          >
            <i class="mdi mdi-eye-outline text-sm" />
          </button>
          <button
            v-if="asTag(row).is_canceled === 0"
            type="button"
            title="Ajukan pembatalan tag"
            class="inline-flex items-center justify-center p-1.5 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition"
            @click="bukaAjukanCancel('sto', asTag(row).id_tag, asTag(row).part_number)"
          >
            <i class="mdi mdi-tag-remove-outline text-sm" />
          </button>
        </div>
      </template>
      <template #empty>
        <div class="w-full">
          <span class="px-5 py-12 text-center text-gray-400 text-sm">
            {{ adaFilterAktif ? 'Tidak ada tag yang cocok dengan filter ini.' : 'Belum ada tag STO.' }}
          </span>
        </div>
      </template>
    </TableExcel>

    <div class="flex items-center justify-between gap-3 flex-wrap px-5 py-3 !border-t !border-gray-300 bg-white">
      <span class="text-xs text-gray-500">
        Seluruh <span class="font-semibold text-gray-700">{{ totalSemua }}</span> tag yang cocok filter sudah dimuat.
        Penyaringan per kolom dan halaman diatur di tabel.
      </span>
    </div>
  </div>

  </template>

  <!-- ================= TAB 2 - TAG OK ================= -->
  <template v-else>
    <!-- Panel atas: ringkasan + filter -->
    <div class="bg-white !border !border-gray-300 rounded-xl shadow-sm mb-4 overflow-hidden">
      <div class="flex items-start justify-between flex-wrap gap-4 px-5 py-4">
        <div class="flex items-stretch flex-wrap gap-y-3">
          <StoAksesHeader :nik="nik" keterangan="NIK ber-role admin" :loading="isLoggingOut" @logout="keluarSto" />

          <div class="px-8 !border-l !border-gray-300">
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Belum Discan</span>
            <div class="text-lg font-semibold text-amber-600 leading-tight">{{ tagOk.summary?.terbuka ?? '-' }}</div>
          </div>
          <div class="px-8 !border-l !border-gray-300">
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Sudah Discan</span>
            <div class="text-lg font-semibold text-emerald-600 leading-tight">{{ tagOk.summary?.tertutup ?? '-' }}</div>
          </div>
          <div class="px-8 !border-l !border-gray-300">
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Dibatalkan</span>
            <div class="text-lg font-semibold text-red-600 leading-tight">{{ tagOk.summary?.batal ?? '-' }}</div>
          </div>
          <div class="px-8 !border-l !border-gray-300">
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total Qty</span>
            <div class="text-lg font-semibold text-gray-800 leading-tight">{{ tagOk.summary?.total_qty ?? '-' }}</div>
          </div>
        </div>

        <div class="flex flex-col items-end gap-1.5">
          <span
            v-if="tagOk.lastError"
            class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 !border !border-red-200"
          >
            {{ tagOk.lastError }}
          </span>

          <div class="flex items-center gap-2">
            <button
              type="button"
              :title="eventTerpilih ? 'Unduh sesuai filter yang sedang aktif' : 'Pilih event dulu pada filter'"
              :disabled="sedangExport !== null || !eventTerpilih"
              class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              @click="exportTagOk"
            >
              <i class="mdi" :class="sedangExport === 'ok' ? 'mdi-loading mdi-spin' : 'mdi-file-excel-outline'" />
              {{ sedangExport === 'ok' ? 'Menyiapkan...' : 'Download Excel' }}
            </button>

            <button
              type="button"
              :title="eventTerpilih ? 'Unduh rekap per part number' : 'Pilih event dulu pada filter'"
              :disabled="sedangExport !== null || !eventTerpilih"
              class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              @click="exportReport"
            >
              <i class="mdi" :class="sedangExport === 'report' ? 'mdi-loading mdi-spin' : 'mdi-chart-box-outline'" />
              {{ sedangExport === 'report' ? 'Menyusun...' : 'Report STO' }}
            </button>
          </div>

          <!-- Unduhan menuntut event supaya cakupan datanya jelas. -->
          <span v-if="!eventTerpilih" class="text-[11px] text-amber-600 text-right max-w-[15rem]">
            Pilih event pada filter untuk mengaktifkan unduhan.
          </span>
        </div>
      </div>

      <!-- Filter -->
      <div class="flex items-center gap-2 flex-wrap px-5 py-3 !border-t !border-gray-300 bg-gray-50">
        <div class="relative">
          <i class="mdi mdi-magnify absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
          <input
            v-model="tagOk.filter.q"
            type="text"
            placeholder="Cari ID Tag OK / part / job..."
            class="w-80 h-9 pl-8 pr-8 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
            @input="cariBertahapOk"
            @keydown.enter="terapkanFilterOk"
          />
          <i
            v-if="tagOk.isLoading"
            class="mdi mdi-loading mdi-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400 text-base"
          />
        </div>

        <select
          v-model="tagOk.filter.area"
          class="sto-select h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
          @change="terapkanFilterOk"
        >
          <option value="">Semua area</option>
          <option v-for="a in tagOk.areaOptions" :key="a" :value="a">{{ a }}</option>
        </select>

        <select
          v-model="tagOk.filter.open"
          class="sto-select h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
          @change="terapkanFilterOk"
        >
          <option value="">Semua scan</option>
          <option value="1">Belum discan</option>
          <option value="0">Sudah discan</option>
        </select>

        <select
          v-model="tagOk.filter.batal"
          class="sto-select h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
          @change="terapkanFilterOk"
        >
          <option value="">Semua status</option>
          <option value="0">Normal</option>
          <option value="2">Diajukan batal</option>
          <option value="1">Dibatalkan</option>
        </select>

        <select
          v-model="filterEventOk"
          class="sto-select h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
          @change="terapkanFilterOk"
        >
          <option value="">Semua event</option>
          <option v-for="e in eventOptions" :key="e.id_event" :value="String(e.id_event)">
            {{ e.event_name }}{{ e.status === 1 ? ' (aktif)' : '' }}
          </option>
        </select>

        <button
          type="button"
          title="Muat ulang"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition"
          @click="fetchTagOk"
        >
          <ReloadOutlined />
          Muat Ulang
        </button>

        <button
          v-if="adaFilterAktifOk"
          type="button"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition"
          @click="resetFilterOk"
        >
          Reset Filter
        </button>
      </div>
    </div>

    <!-- Tabel -->
    <div class="sto-table rounded-lg overflow-hidden !border !border-gray-300">
      <TableExcel :columns="columnsOk" :data="tagOk.dataTable" :loading="tagOk.isLoading" thead-class="bg-gray-50">
        <template #cell-job_number="{ value }">
          <span :title="String(value || '')">{{ value || '-' }}</span>
        </template>
        <template #cell-line="{ value }">
          <span :title="String(value || '')">{{ String(value || '').trim() || '-' }}</span>
        </template>
        <template #cell-qty_kbn="{ value }">
          {{ value || '-' }}
        </template>
        <template #cell-scan_open="{ value }">
          <span
            class="px-2 py-0.5 rounded-full text-xs font-semibold"
            :class="value === 1 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'"
          >
            {{ value === 1 ? 'Belum discan' : 'Sudah discan' }}
          </span>
        </template>
        <template #cell-is_canceled="{ row }">
          <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="cancelClass(asTagOk(row).is_canceled)">
            {{ cancelLabel(asTagOk(row).is_canceled) }}
          </span>
        </template>
        <template #cell-scanned_by="{ value }">
          {{ value || '-' }}
        </template>
        <template #cell-scanned_at="{ value }">
          {{ value || '-' }}
        </template>
        <template #actions="{ row }">
          <div class="flex items-center justify-center gap-1.5">
            <button
              type="button"
              title="Detail tag OK"
              class="inline-flex items-center justify-center p-1.5 text-white bg-gray-500 rounded-lg hover:bg-gray-600 transition"
              @click="openDetailOk(asTagOk(row))"
            >
              <i class="mdi mdi-eye-outline text-sm" />
            </button>
            <button
              v-if="asTagOk(row).is_canceled === 0"
              type="button"
              title="Ajukan pembatalan tag OK"
              class="inline-flex items-center justify-center p-1.5 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition"
              @click="bukaAjukanCancel('ok', asTagOk(row).id_tag_ok, asTagOk(row).part_number)"
            >
              <i class="mdi mdi-tag-remove-outline text-sm" />
            </button>
          </div>
        </template>
        <template #empty>
          <div class="w-full">
            <span class="px-5 py-12 text-center text-gray-400 text-sm">
              {{ adaFilterAktifOk ? 'Tidak ada tag OK yang cocok dengan filter ini.' : 'Belum ada tag OK.' }}
            </span>
          </div>
        </template>
      </TableExcel>

      <div class="flex items-center justify-between gap-3 flex-wrap px-5 py-3 !border-t !border-gray-300 bg-white">
        <span class="text-xs text-gray-500">
          Seluruh <span class="font-semibold text-gray-700">{{ tagOk.dataTable.length }}</span> tag OK yang cocok filter
          sudah dimuat. Penyaringan per kolom dan halaman diatur di tabel.
        </span>
      </div>
    </div>
  </template>

  <!-- ==================== Modal Ajukan Pembatalan ==================== -->
  <Teleport to="body">
    <div v-if="dialog.ajukanCancel" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl !border !border-gray-300">
        <div class="p-6">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <i class="mdi mdi-tag-remove-outline text-4xl text-orange-600" />
          </div>
          <h3 class="mb-2 text-center text-xl font-bold text-gray-800">Ajukan Pembatalan</h3>

          <p class="mb-4 text-center text-sm text-gray-500">
            <span class="font-semibold text-gray-800">{{ ajukan.id }}</span>
            <span v-if="ajukan.keterangan"> — {{ ajukan.keterangan }}</span>
          </p>

          <label class="block mb-1.5 text-xs font-medium text-gray-600">Alasan pembatalan</label>
          <textarea
            v-model="ajukan.alasan"
            rows="3"
            maxlength="255"
            placeholder="Contoh: Tag rusak / tidak terbaca saat scan"
            class="block w-full rounded-lg bg-gray-50 !border !border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:!border-orange-400"
          />
          <p class="mt-1.5 mb-6 text-xs text-gray-500">
            Tag belum langsung dibatalkan. Pengajuannya menunggu keputusan admin di halaman Cancel Tag.
          </p>

          <div class="flex justify-center gap-3">
            <button
              type="button"
              :disabled="ajukan.isSubmitting || ajukan.alasan.trim() === ''"
              class="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="kirimAjukanCancel"
            >
              {{ ajukan.isSubmitting ? 'Mengirim...' : 'Ajukan' }}
            </button>
            <button
              type="button"
              :disabled="ajukan.isSubmitting"
              class="rounded-lg bg-white !border !border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
              @click="dialog.ajukanCancel = false"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ==================== Modal Detail Tag ==================== -->
  <Teleport to="body">
    <div v-if="dialog.detail" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-lg bg-white rounded-xl shadow-2xl !border !border-gray-300">
        <div class="flex items-center justify-between p-5 !border-b !border-gray-300">
          <h3 class="text-lg font-bold text-gray-800">{{ tagOk.detail ? 'Detail Tag OK' : 'Detail Tag STO' }}</h3>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-700 rounded-lg w-8 h-8 inline-flex justify-center items-center"
            @click="dialog.detail = false"
          >
            <i class="mdi mdi-close" />
          </button>
        </div>

        <div class="p-5 max-h-[70vh] overflow-y-auto">
          <dl class="divide-y divide-gray-200">
            <div v-for="r in tagOk.detail ? detailOkRows : detailRows" :key="r.label" class="flex gap-4 py-2">
              <dt class="w-40 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ r.label }}</dt>
              <dd class="text-sm text-gray-800 break-words">{{ r.value || '-' }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sto-select {
  background-size: 0.85em 0.85em;
  background-position: right 0.625rem center;
}

/* Vuetify mendaftarkan utility bernama sama dengan Tailwind (`border`,
   `border-b`, ...) memakai !important di dalam layer `vendor`, sehingga garis
   milik TableBasic selalu memakai warna Vuetify yang nyaris tak terlihat.
   Override-nya ditaruh di layer yang sama supaya specificity yang menentukan. */
@layer vendor {
  .sto-table :deep(thead tr) {
    border-bottom-color: #cbd5e1 !important;
  }

  .sto-table :deep(tbody tr) {
    border-bottom-color: #e5e7eb !important;
  }
}
</style>
