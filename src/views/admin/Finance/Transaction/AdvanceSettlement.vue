<script setup lang="ts">
import { onMounted, shallowRef, computed } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';
import Autocomplete from '@/components/form/Autocomplete.vue';
import { useAdvanceSettlementStore } from '@/stores/Finance/Transaction/AdvanceSettlementStore';
import { STATUS_CONFIG } from '@/types/Finance/Transaction/AdvanceSettlement';
import type { AdvanceSettlementItem } from '@/types/Finance/Transaction/AdvanceSettlement';
import { SyncOutlined } from '@ant-design/icons-vue';

const breadcrumbs = shallowRef([
  { title: 'Finance', disabled: false, href: '#' },
  { title: 'Transaction', disabled: false, href: '#' },
  { title: 'Advance Settlement', disabled: true, href: '#' }
]);

const store = useAdvanceSettlementStore();
const {
  filter,
  kasbonForm,
  settlementForm,
  restoreForm,
  dialog,
  activeTab,
  activeListTab,
  activeCardKey,
  loading,
  selectedRow,
  employeeOptions,
  categoryOptions,
  selectedCategoryDueDays,
  openRows,
  approvedRows,
  closedRows,
  cancelledRows,
  summaryCards,
  canApprove,
  canClose,
  canCancel,
  canRestore,
  canEditKasbon,
  canEditSettlement,
  permissions,
  exportStatuses,
  exporting
} = storeToRefs(store);

// Opsi checkbox modal Download — jumlah baris diambil dari data yang sedang tampil
const exportOptions = computed(() => [
  {
    status: 'Open' as const,
    label: 'Open',
    hint: 'Semua kasbon outstanding (tanpa filter tanggal)',
    count: openRows.value.length,
    dot: 'bg-amber-500'
  },
  {
    status: 'Approved' as const,
    label: 'Approved',
    hint: 'Semua kasbon outstanding (tanpa filter tanggal)',
    count: approvedRows.value.length,
    dot: 'bg-blue-500'
  },
  {
    status: 'Closed' as const,
    label: 'Closed',
    hint: `Sesuai filter tanggal ${filter.value.date_from} s/d ${filter.value.date_to}`,
    count: closedRows.value.length,
    dot: 'bg-emerald-500'
  }
]);

// Date range hanya relevan untuk Closed & Dibatalkan; Open/Approved di-fetch dengan outstanding_all=1
const isDateFilteredTab = computed(() => activeListTab.value === 'closed' || activeListTab.value === 'cancelled');

const openTableColumns: TableColumn[] = [
  { key: 'kasbon_no', label: 'No. Kasbon', width: '140px' },
  { key: 'kasbon_date', label: 'Tgl Kasbon', width: '115px', align: 'center' },
  { key: 'employee_name', label: 'Karyawan', width: '140px' },
  { key: 'created_by_name', label: 'PIC', width: '140px' },
  { key: 'category_name', label: 'Kategori', width: '140px' },
  { key: 'description', label: 'Keterangan', width: '200px' },
  { key: 'amount_fmt', label: 'Nominal', width: '135px', align: 'right' },
  { key: 'realization_fmt', label: 'Nominal BKK', width: '135px', align: 'right' },
  { key: 'cash_received_fmt', label: 'Cash Received', width: '135px', align: 'right' },
  { key: 'outstanding_fmt', label: 'Outstanding', width: '135px', align: 'right' },
  { key: 'due_date', label: 'Jatuh Tempo', width: '115px', align: 'center' },
  { key: 'overdue_label', label: 'Overdue', width: '130px', align: 'center', sortable: false },
  { key: 'status', label: 'Status', width: '85px', align: 'center', sortable: false }
];

const approvedTableColumns: TableColumn[] = [
  { key: 'kasbon_no', label: 'No. Kasbon', width: '140px' },
  { key: 'kasbon_date', label: 'Tgl Kasbon', width: '115px', align: 'center' },
  { key: 'employee_name', label: 'Karyawan', width: '140px' },
  { key: 'created_by_name', label: 'PIC', width: '140px' },
  { key: 'category_name', label: 'Kategori', width: '140px' },
  { key: 'description', label: 'Keterangan', width: '200px' },
  { key: 'amount_fmt', label: 'Nominal', width: '135px', align: 'right' },
  { key: 'realization_fmt', label: 'Nominal BKK', width: '135px', align: 'right' },
  { key: 'cash_received_fmt', label: 'Cash Received', width: '135px', align: 'right' },
  { key: 'outstanding_fmt', label: 'Outstanding', width: '135px', align: 'right' },
  { key: 'approved_by', label: 'Di-approve Oleh', width: '140px' },
  { key: 'due_date', label: 'Jatuh Tempo', width: '115px', align: 'center' },
  { key: 'overdue_label', label: 'Overdue', width: '130px', align: 'center', sortable: false },
  { key: 'status', label: 'Status', width: '85px', align: 'center', sortable: false }
];

const closedTableColumns: TableColumn[] = [
  { key: 'kasbon_no', label: 'No. Kasbon', width: '140px' },
  { key: 'kasbon_date', label: 'Tgl Kasbon', width: '115px', align: 'center' },
  { key: 'employee_name', label: 'Karyawan', width: '140px' },
  { key: 'created_by_name', label: 'PIC', width: '140px' },
  { key: 'category_name', label: 'Kategori', width: '140px' },
  { key: 'description', label: 'Keterangan' },
  { key: 'amount_fmt', label: 'Nominal', width: '135px', align: 'right' },
  { key: 'realization_fmt', label: 'Nominal BKK', width: '135px', align: 'right' },
  { key: 'cash_received_fmt', label: 'Cash Received', width: '135px', align: 'right' },
  { key: 'outstanding_fmt', label: 'Outstanding', width: '135px', align: 'right' },
  { key: 'due_date', label: 'Jatuh Tempo', width: '115px', align: 'center' },
  { key: 'status', label: 'Status', width: '85px', align: 'center', sortable: false }
];

const cancelledTableColumns: TableColumn[] = [
  { key: 'kasbon_no', label: 'No. Kasbon', width: '140px' },
  { key: 'kasbon_date', label: 'Tgl Kasbon', width: '115px', align: 'center' },
  { key: 'employee_name', label: 'Karyawan', width: '140px' },
  { key: 'created_by_name', label: 'PIC', width: '140px' },
  { key: 'category_name', label: 'Kategori', width: '140px' },
  { key: 'description', label: 'Keterangan' },
  { key: 'amount_fmt', label: 'Nominal', width: '135px', align: 'right' },
  { key: 'cancelled_by', label: 'Dibatalkan Oleh', width: '130px' },
  { key: 'cancelled_at', label: 'Tgl Dibatalkan', width: '150px', align: 'center' }
];

const formatRupiah = (val: string | number | null | undefined) => {
  if (val === null || val === undefined || val === '') return '-';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n)) return '-';
  return 'Rp ' + n.toLocaleString('id-ID', { minimumFractionDigits: 0 });
};

// Selisih usia kasbon terhadap due_date, dalam hari (positif = terlambat) — Open & Approved sama-sama masih
// "berjalan" (belum Closed), jadi keduanya dihitung aging, bukan cuma Open.
function daysLate(row: { due_date: string; status: string }): number {
  if (!row.due_date || row.status === 'Closed') return 0;
  const due = new Date(row.due_date);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - due.getTime()) / 86400000);
}

// Segmentasi overdue mengikuti bucket sheet Detail: 0-5, 6-10, 11-15, 16-20, 21-25, >25
function overdueBucket(row: { due_date: string; status: string }): string {
  if (row.status === 'Closed') return 'Closed';
  const late = daysLate(row);
  if (late <= 0) return 'Belum Jatuh Tempo';
  if (late <= 5) return '0-5 Hari';
  if (late <= 10) return '6-10 Hari';
  if (late <= 15) return '11-15 Hari';
  if (late <= 20) return '16-20 Hari';
  if (late <= 25) return '21-25 Hari';
  return '>25 Hari';
}

function overdueBucketClass(row: { due_date: string; status: string }): string {
  if (row.status === 'Closed') return 'bg-gray-100 text-gray-500';
  const late = daysLate(row);
  if (late <= 0) return 'bg-emerald-100 text-emerald-700';
  if (late <= 5) return 'bg-lime-100 text-lime-700';
  if (late <= 10) return 'bg-yellow-100 text-yellow-700';
  if (late <= 15) return 'bg-amber-100 text-amber-700';
  if (late <= 20) return 'bg-orange-100 text-orange-700';
  if (late <= 25) return 'bg-red-100 text-red-700';
  return 'bg-red-200 text-red-800';
}

function toRows(rows: AdvanceSettlementItem[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    ...r,
    amount_fmt: formatRupiah(r.amount),
    realization_fmt: formatRupiah(r.realization_amount),
    cash_received_fmt: formatRupiah(r.cash_received),
    outstanding_fmt: formatRupiah(r.outstanding_amount),
    overdue_label: overdueBucket(r)
  }));
}

const openTableData = computed(() => toRows(openRows.value));
const approvedTableData = computed(() => toRows(approvedRows.value));
const closedTableData = computed(() => toRows(closedRows.value));
const cancelledTableData = computed(() => toRows(cancelledRows.value));

// Sebaran umur (aging) kasbon Open + Approved (belum Closed) — dipakai untuk panel ringkasan overdue
const AGING_BUCKETS = [
  {
    key: 'none',
    label: 'Belum Jatuh Tempo',
    match: (d: number) => d <= 0,
    barClass: 'border-l-emerald-500',
    chipClass: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
  },
  {
    key: '0-5',
    label: '0-5 Hari',
    match: (d: number) => d >= 1 && d <= 5,
    barClass: 'border-l-lime-500',
    chipClass: 'bg-lime-50 dark:bg-lime-950/20 text-lime-700 dark:text-lime-300'
  },
  {
    key: '6-10',
    label: '6-10 Hari',
    match: (d: number) => d >= 6 && d <= 10,
    barClass: 'border-l-yellow-500',
    chipClass: 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300'
  },
  {
    key: '11-15',
    label: '11-15 Hari',
    match: (d: number) => d >= 11 && d <= 15,
    barClass: 'border-l-amber-500',
    chipClass: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300'
  },
  {
    key: '16-20',
    label: '16-20 Hari',
    match: (d: number) => d >= 16 && d <= 20,
    barClass: 'border-l-orange-500',
    chipClass: 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300'
  },
  {
    key: '21-25',
    label: '21-25 Hari',
    match: (d: number) => d >= 21 && d <= 25,
    barClass: 'border-l-red-500',
    chipClass: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
  },
  {
    key: '>25',
    label: '> 25 Hari',
    match: (d: number) => d > 25,
    barClass: 'border-l-rose-700',
    chipClass: 'bg-rose-100 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300'
  }
];

const unclosedRows = computed(() => [...openRows.value, ...approvedRows.value]);

const agingSummary = computed(() =>
  AGING_BUCKETS.map((bucket) => {
    const rows = unclosedRows.value.filter((r) => bucket.match(daysLate(r)));
    return {
      ...bucket,
      count: rows.length,
      amount: rows.reduce((s, r) => s + parseFloat(r.outstanding_amount || '0'), 0)
    };
  })
);

const selectedDaysLate = computed(() => (selectedRow.value ? daysLate(selectedRow.value) : 0));
const selectedOverdueLabel = computed(() => (selectedRow.value ? overdueBucket(selectedRow.value) : '-'));
const selectedOverdueClass = computed(() => (selectedRow.value ? overdueBucketClass(selectedRow.value) : ''));
const reportDate = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

// Konfigurasi kartu ringkasan — di-klik untuk membuka detail
const summaryCardsConfig = computed(() => [
  {
    key: 'open' as const,
    title: 'Open',
    barColor: 'bg-amber-500',
    value: String(summaryCards.value.open),
    description: 'Jumlah kasbon berstatus Open yang masih menunggu approval dari finance.'
  },
  {
    key: 'approved' as const,
    title: 'Approved',
    barColor: 'bg-blue-500',
    value: String(summaryCards.value.approved),
    description: 'Jumlah kasbon yang sudah di-approve dan siap diisi realisasi/settlement oleh finance.'
  },
  {
    key: 'closed' as const,
    title: 'Closed',
    barColor: 'bg-emerald-600',
    value: String(summaryCards.value.closed),
    description: 'Jumlah kasbon yang sudah lunas/closed dan tidak lagi memiliki outstanding tagihan.'
  },
  {
    key: 'cancelled' as const,
    title: 'Dibatalkan',
    barColor: 'bg-gray-400',
    value: String(summaryCards.value.cancelled),
    description: 'Jumlah kasbon yang dibatalkan (soft delete) oleh finance dan berstatus non-aktif.'
  },
  {
    key: 'nominal' as const,
    title: 'Total Nominal',
    barColor: 'bg-amber-500',
    value: formatRupiah(summaryCards.value.totalAmount),
    description: 'Total nominal pengajuan dari seluruh kasbon yang belum Closed (Open + Approved).'
  },
  {
    key: 'outstanding' as const,
    title: 'Outstanding Tagihan',
    barColor: 'bg-red-500',
    value: formatRupiah(summaryCards.value.totalOutstanding),
    description: 'Total outstanding tagihan dari seluruh kasbon Open/Approved yang masih perlu dilunasi/di-close.'
  }
]);

const activeCardConfig = computed(() => summaryCardsConfig.value.find((c) => c.key === activeCardKey.value) ?? null);

// Cash Received tidak boleh melebihi sisa outstanding kasbon yang sedang di-edit
const maxCashReceived = computed(() => parseFloat(selectedRow.value?.outstanding_amount || '0'));

function clampCashReceived() {
  if (settlementForm.value.cash_received !== null && settlementForm.value.cash_received > maxCashReceived.value) {
    settlementForm.value.cash_received = maxCashReceived.value;
  }
}

onMounted(() => {
  store.fetchData();
  store.fetchEmployeeOptions();
  store.fetchCategoryOptions();
});
</script>

<template>
  <BaseBreadcrumb title="Advance Settlement" :breadcrumbs="breadcrumbs" class="mb-6" />

  <div class="flex flex-col gap-3">
    <!-- ── Summary Cards (klik untuk lihat detail) — compact ─────────── -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <button
        v-for="card in summaryCardsConfig"
        :key="card.key"
        type="button"
        @click="store.openCardDetail(card.key)"
        class="text-left rounded-lg bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow px-3 py-1.5 flex flex-col"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="w-1 h-3 rounded-full" :class="card.barColor" />
            <span class="text-[11px] font-semibold text-gray-600 dark:text-gray-300">{{ card.title }}</span>
          </div>
          <i class="mdi mdi-chevron-right text-gray-400 text-xs" />
        </div>
        <p class="text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug tabular-nums">{{ card.value }}</p>
      </button>
    </div>

    <!-- Sebaran aging kasbon Open, per bucket keterlambatan — compact -->
    <div class="rounded-lg bg-white dark:bg-gray-900 shadow-sm px-3 py-2">
      <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1.5">
        <i class="mdi mdi-clock-alert-outline" />Sebaran Umur Kasbon Open (Aging)
      </p>
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
        <div
          v-for="bucket in agingSummary"
          :key="bucket.key"
          class="rounded-md border-l-4 px-2.5 py-1"
          :class="[bucket.barClass, bucket.chipClass]"
        >
          <div class="flex items-baseline justify-between gap-2">
            <p class="text-[12px] font-semibold uppercase tracking-wide opacity-80 truncate">{{ bucket.label }}</p>
            <p class="text-base font-bold leading-none">{{ bucket.count }}</p>
          </div>
          <p class="text-[12px] tabular-nums opacity-80 leading-tight">{{ formatRupiah(bucket.amount) }}</p>
        </div>
      </div>
    </div>

    <!-- ── Filter Bar ─────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-end gap-3">
      <!-- Filter tanggal hanya menyaring Closed & Dibatalkan — Open/Approved selalu tampil semua (outstanding_all=1) -->
      <template v-if="isDateFilteredTab">
        <DateRangePickerSplitButton v-model:start="filter.date_from" v-model:end="filter.date_to" startLabel="Dari" endLabel="Sampai" />
      </template>

      <button
        @click="store.fetchData()"
        type="button"
        class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 font-medium rounded-full text-sm px-5 py-2 whitespace-nowrap"
      >
        <SyncOutlined />
        Reload
      </button>

      <p class="text-[11px] text-gray-400 flex items-center gap-1.5 pb-2">
        <i class="mdi mdi-information-outline" />
        <template v-if="isDateFilteredTab">Filter tanggal berlaku untuk tab Closed &amp; Dibatalkan.</template>
        <template v-else>Tab Open &amp; Approved menampilkan semua kasbon outstanding tanpa filter tanggal.</template>
      </p>
    </div>

    <!-- ── Tabs ───────────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex border-b border-gray-200 dark:border-gray-700 gap-1">
        <button
          @click="activeListTab = 'open'"
          type="button"
          class="px-5 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeListTab === 'open' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >
          Open
          <span
            class="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
            :class="activeListTab === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'"
            >{{ openRows.length }}</span
          >
        </button>
        <button
          @click="activeListTab = 'approved'"
          type="button"
          class="px-5 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeListTab === 'approved' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >
          Approved
          <span
            class="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
            :class="activeListTab === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'"
            >{{ approvedRows.length }}</span
          >
        </button>
        <button
          @click="activeListTab = 'closed'"
          type="button"
          class="px-5 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="
            activeListTab === 'closed' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          "
        >
          Closed
          <span
            class="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
            :class="activeListTab === 'closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'"
            >{{ closedRows.length }}</span
          >
        </button>
        <button
          v-show="permissions.update"
          @click="activeListTab = 'cancelled'"
          type="button"
          class="px-5 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeListTab === 'cancelled' ? 'border-gray-600 text-gray-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >
          Dibatalkan
          <span
            class="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
            :class="activeListTab === 'cancelled' ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500'"
            >{{ cancelledRows.length }}</span
          >
        </button>
      </div>
      <button
        v-if="permissions.download"
        @click="store.openExport()"
        type="button"
        :disabled="loading"
        class="flex items-center gap-2 text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 font-medium rounded-full text-sm px-5 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <i class="mdi mdi-microsoft-excel text-base" />
        Download Excel
      </button>
    </div>

    <!-- ── Table Open ─────────────────────────────────────────────── -->
    <div v-show="activeListTab === 'open'">
      <TableExcel :columns="openTableColumns" :data="openTableData" :loading="loading">
        <template #cell-status="{ value }">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            :class="[
              STATUS_CONFIG[value as keyof typeof STATUS_CONFIG]?.bgClass,
              STATUS_CONFIG[value as keyof typeof STATUS_CONFIG]?.textClass
            ]"
          >
            {{ value }}
          </span>
        </template>
        <template #cell-amount_fmt="{ value }">
          <span class="tabular-nums font-medium">{{ value }}</span>
        </template>
        <template #cell-realization_fmt="{ value }">
          <span class="tabular-nums text-amber-600 font-medium">{{ value }}</span>
        </template>
        <template #cell-cash_received_fmt="{ value }">
          <span class="tabular-nums text-yellow-600 font-medium">{{ value }}</span>
        </template>
        <template #cell-outstanding_fmt="{ row, value }">
          <span
            class="tabular-nums font-semibold"
            :class="parseFloat((row as any).outstanding_amount) > 0 ? 'text-red-600' : 'text-emerald-600'"
          >
            {{ value }}
          </span>
        </template>
        <template #cell-overdue_label="{ row, value }">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            :class="overdueBucketClass(row as any)"
          >
            {{ value }}
          </span>
        </template>
        <template v-if="permissions.update" #actions="{ row }">
          <div class="flex items-center justify-center gap-1">
            <!-- Lihat / Edit / Approve -->
            <button
              type="button"
              title="Lihat & Approve"
              @click="store.openSettlement(row as unknown as AdvanceSettlementItem)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100"
            >
              <i class="mdi mdi-file-document-edit-outline text-sm" />
            </button>
            <!-- Batalkan -->
            <button
              type="button"
              title="Batalkan Kasbon"
              @click="store.onCancel(row as unknown as AdvanceSettlementItem)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
            >
              <i class="mdi mdi-cancel text-sm" />
            </button>
          </div>
        </template>
      </TableExcel>
    </div>

    <!-- ── Table Approved ─────────────────────────────────────────── -->
    <div v-show="activeListTab === 'approved'">
      <TableExcel :columns="approvedTableColumns" :data="approvedTableData" :loading="loading">
        <template #cell-status="{ value }">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            :class="[
              STATUS_CONFIG[value as keyof typeof STATUS_CONFIG]?.bgClass,
              STATUS_CONFIG[value as keyof typeof STATUS_CONFIG]?.textClass
            ]"
          >
            {{ value }}
          </span>
        </template>
        <template #cell-amount_fmt="{ value }">
          <span class="tabular-nums font-medium">{{ value }}</span>
        </template>
        <template #cell-realization_fmt="{ value }">
          <span class="tabular-nums text-amber-600 font-medium">{{ value }}</span>
        </template>
        <template #cell-cash_received_fmt="{ value }">
          <span class="tabular-nums text-yellow-600 font-medium">{{ value }}</span>
        </template>
        <template #cell-outstanding_fmt="{ row, value }">
          <span
            class="tabular-nums font-semibold"
            :class="parseFloat((row as any).outstanding_amount) > 0 ? 'text-red-600' : 'text-emerald-600'"
          >
            {{ value }}
          </span>
        </template>
        <template #cell-approved_by="{ value }">
          <span class="text-gray-700 dark:text-gray-200">{{ value || '-' }}</span>
        </template>
        <template #cell-overdue_label="{ row, value }">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            :class="overdueBucketClass(row as any)"
          >
            {{ value }}
          </span>
        </template>
        <template #actions="{ row }">
          <div class="flex items-center justify-center gap-1">
            <!-- Realisasi / Settlement -->
            <button
              type="button"
              title="Realisasi & Settlement"
              @click="store.openSettlement(row as unknown as AdvanceSettlementItem)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
            >
              <i class="mdi mdi-file-document-edit-outline text-sm" />
            </button>
            <!-- Batalkan -->
            <button
              type="button"
              title="Batalkan Kasbon"
              @click="store.onCancel(row as unknown as AdvanceSettlementItem)"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
            >
              <i class="mdi mdi-cancel text-sm" />
            </button>
          </div>
        </template>
      </TableExcel>
    </div>

    <!-- ── Table Closed ───────────────────────────────────────────── -->
    <div v-show="activeListTab === 'closed'">
      <TableExcel :columns="closedTableColumns" :data="closedTableData" :loading="loading">
        <template #cell-status="{ value }">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            :class="[
              STATUS_CONFIG[value as keyof typeof STATUS_CONFIG]?.bgClass,
              STATUS_CONFIG[value as keyof typeof STATUS_CONFIG]?.textClass
            ]"
          >
            {{ value }}
          </span>
        </template>
        <template #cell-amount_fmt="{ value }">
          <span class="tabular-nums font-medium">{{ value }}</span>
        </template>
        <template #cell-realization_fmt="{ value }">
          <span class="tabular-nums text-amber-600 font-medium">{{ value }}</span>
        </template>
        <template #cell-cash_received_fmt="{ value }">
          <span class="tabular-nums text-emerald-600 font-medium">{{ value }}</span>
        </template>
        <template #cell-outstanding_fmt="{ value }">
          <span class="tabular-nums font-semibold text-emerald-600">{{ value }}</span>
        </template>
        <template #actions="{ row }">
          <button
            type="button"
            title="Lihat Detail"
            @click="store.openSettlement(row as unknown as AdvanceSettlementItem)"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
          >
            <i class="mdi mdi-eye-outline text-sm" />
          </button>
        </template>
      </TableExcel>
    </div>

    <!-- ── Table Dibatalkan ───────────────────────────────────────── -->
    <div v-show="activeListTab === 'cancelled'">
      <TableExcel :columns="cancelledTableColumns" :data="cancelledTableData" :loading="loading">
        <template #cell-amount_fmt="{ value }">
          <span class="tabular-nums font-medium">{{ value }}</span>
        </template>
        <!-- <template #actions="{ row }">
          <button
            type="button"
            title="Restore Kasbon"
            @click="store.openRestore(row as unknown as AdvanceSettlementItem)"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
          >
            <i class="mdi mdi-restore text-sm" />
          </button>
        </template> -->
      </TableExcel>
    </div>
  </div>

  <!-- ════════════════════════════════════════════════════════════════
       Modal: Settlement & Edit
  ═════════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <div
      v-if="dialog.settlement && selectedRow"
      class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4"
      @click.self="dialog.settlement = false"
    >
      <div class="relative w-full max-w-[80vw] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <i class="mdi mdi-file-document-edit-outline text-amber-600" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">{{ selectedRow.kasbon_no }}</h3>
              <p class="text-xs text-gray-400 leading-tight">{{ selectedRow.employee_name }} · {{ selectedRow.category_name }}</p>
            </div>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
              :class="[STATUS_CONFIG[selectedRow.status]?.bgClass, STATUS_CONFIG[selectedRow.status]?.textClass]"
              >{{ selectedRow.status }}</span
            >
            <span
              v-if="selectedRow.active === 0"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700"
              >Dibatalkan</span
            >
            <span v-if="selectedRow.approved_by" class="text-[11px] text-gray-400">
              Di-approve oleh <strong class="text-gray-600 dark:text-gray-300">{{ selectedRow.approved_by }}</strong>
            </span>
          </div>
          <button type="button" @click="dialog.settlement = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <i class="mdi mdi-close text-xl" />
          </button>
        </div>

        <!-- Balance strip -->
        <div class="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
          <div class="px-5 py-3 text-center">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Nominal</p>
            <p class="text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums">{{ formatRupiah(selectedRow.amount) }}</p>
          </div>
          <div class="px-5 py-3 text-center">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Realisasi</p>
            <p class="text-sm font-bold text-amber-600 tabular-nums">{{ formatRupiah(selectedRow.realization_amount) }}</p>
          </div>
          <div class="px-5 py-3 text-center">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Outstanding</p>
            <p
              class="text-sm font-bold tabular-nums"
              :class="parseFloat(selectedRow.outstanding_amount) > 0 ? 'text-red-600' : 'text-emerald-600'"
            >
              {{ formatRupiah(selectedRow.outstanding_amount) }}
            </p>
          </div>
        </div>

        <!-- Inner tabs -->
        <div class="flex border-b border-gray-100 dark:border-gray-800 px-6 flex-shrink-0 overflow-x-auto">
          <button
            @click="activeTab = 'detail'"
            type="button"
            class="px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap"
            :class="
              activeTab === 'detail'
                ? 'border-gray-700 text-gray-800 dark:text-gray-100'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            "
          >
            <i class="mdi mdi-view-grid-outline mr-1" />Detail
          </button>
          <button
            v-if="selectedRow.status !== 'Open'"
            @click="activeTab = 'settlement'"
            type="button"
            class="px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors"
            :class="activeTab === 'settlement' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-400 hover:text-gray-600'"
          >
            <i class="mdi mdi-check-decagram-outline mr-1" />Realisasi
          </button>
          <button
            v-if="selectedRow.status === 'Open'"
            @click="activeTab = 'kasbon'"
            type="button"
            class="px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors"
            :class="activeTab === 'kasbon' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'"
          >
            <i class="mdi mdi-pencil-outline mr-1" />Edit Data Kasbon
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 overflow-y-auto flex-1">
          <!-- ── Tab Detail (mirror sheet "Detail", tampilan landscape/tabel) ── -->
          <div v-show="activeTab === 'detail'" class="flex flex-col gap-3">
            <!-- Legend warna (referensi asal data, bukan pengelompokan) -->
            <div
              class="flex flex-wrap items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-2"
            >
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-amber-300" />Data Pengajuan</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-emerald-400" />Kalkulasi Sistem</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-orange-400" />Update Finance</span>
            </div>

            <!-- Baris 1: Data Pengajuan -->
            <div class="overflow-x-auto rounded-lg border-1 border-gray-200 dark:border-gray-700">
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-amber-300 bg-gray-50 dark:bg-gray-800/60"
                    >
                      No. Kasbon
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-amber-300 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Tgl Kasbon
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-amber-300 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Karyawan
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-amber-300 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Kategori
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-amber-300 bg-gray-50 dark:bg-gray-800/60"
                    >
                      PIC
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-amber-300 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Nominal
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-amber-300 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Tgl Pemakaian
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 w-full border-b-2 border-b-amber-300 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Keterangan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="bg-white dark:bg-gray-900">
                    <td class="px-3 py-2.5 whitespace-nowrap font-semibold text-gray-800 dark:text-gray-100">
                      {{ selectedRow.kasbon_no }}
                    </td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-200">{{ selectedRow.kasbon_date }}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-200">{{ selectedRow.employee_name }}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-200">{{ selectedRow.category_name || '-' }}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-200">{{ selectedRow.created_by_name }}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap tabular-nums text-gray-700 dark:text-gray-200">
                      {{ formatRupiah(selectedRow.amount) }}
                    </td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-200">{{ selectedRow.usage_date }}</td>
                    <td class="px-3 py-2.5 max-w-[220px] truncate text-gray-700 dark:text-gray-200" :title="selectedRow.description">
                      {{ selectedRow.description || '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Baris 2: Kalkulasi Jatuh Tempo & Update Realisasi -->
            <div class="overflow-x-auto rounded-lg border-1 border-gray-200 dark:border-gray-700">
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-emerald-400 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Jatuh Tempo
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-emerald-400 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Keterlambatan
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-emerald-400 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Posisi Tgl Laporan
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-orange-400 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Tanggal BKK
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-orange-400 bg-gray-50 dark:bg-gray-800/60"
                    >
                      No. BKK
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 w-full border-b-2 border-b-orange-400 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Catatan Realisasi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="bg-white dark:bg-gray-900">
                    <td class="px-3 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-200">{{ selectedRow.due_date }}</td>
                    <td
                      class="px-3 py-2.5 whitespace-nowrap tabular-nums"
                      :class="selectedDaysLate > 0 ? 'text-red-600 font-semibold' : 'text-gray-700 dark:text-gray-200'"
                    >
                      {{ selectedRow.status === 'Open' ? (selectedDaysLate > 0 ? `${selectedDaysLate} hari` : 'Belum telat') : '-' }}
                    </td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-200">{{ reportDate }}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-200">{{ selectedRow.bkk_date || '-' }}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-200">{{ selectedRow.bkk_no || '-' }}</td>
                    <td class="px-3 py-2.5 max-w-[260px] truncate text-gray-700 dark:text-gray-200" :title="selectedRow.report_note ?? ''">
                      {{ selectedRow.report_note || '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Baris 3: Nominal Realisasi & Status Akhir -->
            <div class="overflow-x-auto rounded-lg border-1 border-gray-200 dark:border-gray-700">
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-orange-400 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Realisasi BKK
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-emerald-400 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Selisih
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-orange-400 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Cash Received
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-emerald-400 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Status
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 whitespace-nowrap border-b-2 border-b-emerald-400 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Outstanding
                    </th>
                    <th
                      class="px-3 py-2 text-left font-semibold uppercase text-gray-400 w-full border-b-2 border-b-emerald-400 bg-gray-50 dark:bg-gray-800/60"
                    >
                      Segmen Overdue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="bg-white dark:bg-gray-900">
                    <td class="px-3 py-2.5 whitespace-nowrap tabular-nums text-gray-700 dark:text-gray-200">
                      {{ formatRupiah(selectedRow.realization_amount) }}
                    </td>
                    <td class="px-3 py-2.5 whitespace-nowrap tabular-nums text-gray-700 dark:text-gray-200">
                      {{ formatRupiah(parseFloat(selectedRow.amount || '0') - parseFloat(selectedRow.realization_amount || '0')) }}
                    </td>
                    <td class="px-3 py-2.5 whitespace-nowrap tabular-nums text-gray-700 dark:text-gray-200">
                      {{ formatRupiah(selectedRow.cash_received) }}
                    </td>
                    <td class="px-3 py-2.5 whitespace-nowrap">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        :class="[STATUS_CONFIG[selectedRow.status]?.bgClass, STATUS_CONFIG[selectedRow.status]?.textClass]"
                        >{{ selectedRow.status }}</span
                      >
                    </td>
                    <td
                      class="px-3 py-2.5 whitespace-nowrap tabular-nums font-semibold"
                      :class="parseFloat(selectedRow.outstanding_amount) > 0 ? 'text-red-600' : 'text-emerald-600'"
                    >
                      {{ formatRupiah(selectedRow.outstanding_amount) }}
                    </td>
                    <td class="px-3 py-2.5 whitespace-nowrap">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        :class="selectedOverdueClass"
                      >
                        {{ selectedOverdueLabel }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ── Tab Realisasi ── -->
          <div v-show="activeTab === 'settlement'" class="flex flex-col gap-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Nilai Pertanggung Jawaban / BKK (Rp)</label>
                <input
                  v-model.number="settlementForm.realization_amount"
                  type="number"
                  min="0"
                  placeholder="0"
                  :disabled="!canEditSettlement"
                  class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <p v-if="settlementForm.realization_amount" class="text-right text-xs font-semibold text-amber-600">
                  {{ formatRupiah(settlementForm.realization_amount) }}
                </p>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Cash Received (Rp)</label>
                <input
                  v-model.number="settlementForm.cash_received"
                  type="number"
                  min="0"
                  :max="maxCashReceived"
                  placeholder="0"
                  :disabled="!canEditSettlement"
                  @input="clampCashReceived"
                  @blur="clampCashReceived"
                  class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <p class="text-right text-[11px] text-gray-400">Maks. {{ formatRupiah(maxCashReceived) }} (outstanding)</p>
                <p v-if="settlementForm.cash_received" class="text-right text-xs font-semibold text-emerald-600">
                  {{ formatRupiah(settlementForm.cash_received) }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">No. BKK</label>
                <input
                  v-model="settlementForm.bkk_no"
                  type="text"
                  placeholder="BKK-YYYY-XXXX"
                  :disabled="!canEditSettlement"
                  class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <!-- Tanggal BKK (dulu closing_date) — diinput user, hanya aktif saat status Approved -->
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal BKK</label>
                <input
                  v-model="settlementForm.bkk_date"
                  type="date"
                  :disabled="!canEditSettlement"
                  class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Report Note</label>
              <textarea
                v-model="settlementForm.report_note"
                rows="3"
                placeholder="Catatan realisasi penggunaan kasbon..."
                :disabled="!canEditSettlement"
                class="py-1.5 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <!-- Info: kasbon bisa di-close jika sisa = 0 -->
            <div
              v-if="canClose"
              class="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border-1 border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
            >
              <i class="mdi mdi-check-circle-outline text-lg flex-shrink-0" />
              <span>Outstanding tagihan sudah <strong>Rp 0</strong>. Kasbon ini dapat ditutup.</span>
            </div>
          </div>

          <!-- ── Tab Edit Kasbon ── -->
          <div v-show="activeTab === 'kasbon'" class="flex flex-col gap-4">
            <Autocomplete
              v-model="kasbonForm.employee_nik"
              label="NIK Karyawan"
              placeholder="Cari karyawan..."
              :options="employeeOptions"
            />

            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</label>
              <select
                v-model.number="kasbonForm.category_id"
                class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
              >
                <option :value="null" disabled>Pilih kategori...</option>
                <option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">
                  {{ cat.label }} ({{ cat.due_days }} hari)
                </option>
              </select>
              <p v-if="selectedCategoryDueDays !== null" class="text-[11px] text-gray-400">
                Tenggat: <span class="font-semibold text-amber-600">{{ selectedCategoryDueDays }} hari</span> sejak tanggal pemakaian.
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal Kasbon</label>
                <input
                  v-model="kasbonForm.kasbon_date"
                  type="date"
                  class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Tgl Penggunaan</label>
                <input
                  v-model="kasbonForm.usage_date"
                  type="date"
                  class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Nominal (Rp)</label>
              <input
                v-model.number="kasbonForm.amount"
                type="number"
                min="0"
                placeholder="0"
                class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
              />
              <p v-if="kasbonForm.amount" class="text-right text-xs font-semibold text-gray-500">
                {{ formatRupiah(kasbonForm.amount) }}
              </p>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Keterangan</label>
              <textarea
                v-model="kasbonForm.description"
                rows="3"
                placeholder="Keterangan kasbon..."
                class="py-1.5 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40 resize-none"
              />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <!-- Kiri: tombol Close / Batalkan / Restore -->
          <div class="flex items-center gap-2">
            <button
              v-if="canApprove"
              type="button"
              @click="store.onApprove(selectedRow)"
              class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full"
            >
              <i class="mdi mdi-check-decagram-outline" />
              Approve
            </button>
            <button
              v-if="canClose"
              type="button"
              @click="store.onClose()"
              class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-full"
            >
              <i class="mdi mdi-lock-outline" />
              Tutup Kasbon
            </button>
            <button
              v-if="canCancel"
              type="button"
              @click="store.onCancel(selectedRow)"
              class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-full"
            >
              <i class="mdi mdi-cancel" />
              Batalkan
            </button>
            <button
              v-if="canRestore"
              type="button"
              @click="store.openRestore(selectedRow)"
              class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-full"
            >
              <i class="mdi mdi-restore" />
              Restore Kasbon
            </button>
          </div>

          <!-- Kanan: Batal + Simpan -->
          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="dialog.settlement = false"
              class="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-full"
            >
              Batal
            </button>
            <button
              v-if="(canEditKasbon || canEditSettlement) && selectedRow.active !== 0"
              type="button"
              @click="store.onUpdate()"
              class="px-5 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-full"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ════════════════════════════════════════════════════════════════
       Modal: Download Excel (pilih status — tiap status jadi sheet terpisah)
  ═════════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <div
      v-if="dialog.export"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      @click.self="dialog.export = false"
    >
      <div class="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <i class="mdi mdi-microsoft-excel text-emerald-600" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">Download Excel</h3>
              <p class="text-xs text-gray-400 leading-tight">Pilih status kasbon yang ingin diunduh</p>
            </div>
          </div>
          <button type="button" @click="dialog.export = false" class="text-gray-400 hover:text-gray-600">
            <i class="mdi mdi-close text-xl" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 flex flex-col gap-2">
          <label
            v-for="opt in exportOptions"
            :key="opt.status"
            class="flex items-start gap-3 rounded-lg border-1 px-4 py-3 cursor-pointer transition-colors"
            :class="
              exportStatuses.includes(opt.status)
                ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            "
          >
            <input v-model="exportStatuses" type="checkbox" :value="opt.status" class="mt-0.5 w-4 h-4 accent-emerald-600" />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" :class="opt.dot" />
                <span class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{ opt.label }}</span>
                <span class="ml-auto text-xs text-gray-500 tabular-nums">{{ opt.count }} data</span>
              </div>
              <p class="text-[11px] text-gray-400 mt-0.5">{{ opt.hint }}</p>
            </div>
          </label>
          <p class="text-[11px] text-gray-400 mt-1 flex items-start gap-1.5">
            <i class="mdi mdi-information-outline mt-px" />
            Jika memilih lebih dari satu status, tiap status akan menjadi sheet terpisah dalam satu file Excel.
          </p>
          <p v-if="exportStatuses.length === 0" class="text-[11px] text-red-500">Pilih minimal satu status.</p>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            @click="dialog.export = false"
            class="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 rounded-full"
          >
            Batal
          </button>
          <button
            type="button"
            @click="store.onExport()"
            :disabled="exportStatuses.length === 0 || exporting"
            class="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
          >
            <i class="mdi" :class="exporting ? 'mdi-loading mdi-spin' : 'mdi-download'" />
            Download
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ════════════════════════════════════════════════════════════════
       Modal: Restore Kasbon (konfirmasi No. BKK)
  ═════════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <div
      v-if="dialog.restore && selectedRow"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      @click.self="dialog.restore = false"
    >
      <div class="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <i class="mdi mdi-restore text-emerald-600" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">Restore Kasbon</h3>
              <p class="text-xs text-gray-400 leading-tight">{{ selectedRow.kasbon_no }}</p>
            </div>
          </div>
          <button type="button" @click="dialog.restore = false" class="text-gray-400 hover:text-gray-600">
            <i class="mdi mdi-close text-xl" />
          </button>
        </div>

        <!-- Info strip -->
        <div class="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div class="px-4 py-3 text-center">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">NIK</p>
            <p class="text-sm font-bold text-gray-700 dark:text-gray-200">{{ selectedRow.employee_nik }}</p>
          </div>
          <div class="px-4 py-3 text-center">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Nominal</p>
            <p class="text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums">{{ formatRupiah(selectedRow.amount) }}</p>
          </div>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 flex flex-col gap-3">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Untuk memastikan Anda me-restore kasbon yang benar, masukkan <strong>No. BKK</strong> milik kasbon ini sebagai konfirmasi.
          </p>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">No. BKK</label>
            <input
              v-model="restoreForm.bkk_no"
              type="text"
              placeholder="BKK-YYYY-XXXX"
              class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
            />
            <p v-if="restoreForm.bkk_no && restoreForm.bkk_no.trim() !== selectedRow.bkk_no" class="text-[11px] text-red-500">
              No. BKK tidak sesuai dengan data kasbon ini.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            @click="dialog.restore = false"
            class="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 rounded-full"
          >
            Batal
          </button>
          <button
            type="button"
            @click="store.onRestore()"
            :disabled="!restoreForm.bkk_no || restoreForm.bkk_no.trim() !== selectedRow.bkk_no"
            class="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ════════════════════════════════════════════════════════════════
       Modal: Detail Ringkasan (dari klik summary card)
  ═════════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <div
      v-if="dialog.cardDetail && activeCardConfig"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      @click.self="dialog.cardDetail = false"
    >
      <div class="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div class="flex items-center gap-2">
            <span class="w-1 h-4 rounded-full" :class="activeCardConfig.barColor" />
            <h3 class="text-sm font-bold text-gray-800 dark:text-gray-100">{{ activeCardConfig.title }}</h3>
          </div>
          <button type="button" @click="dialog.cardDetail = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <i class="mdi mdi-close text-xl" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 overflow-y-auto flex-1 flex flex-col gap-4">
          <div>
            <p class="text-3xl font-bold text-gray-900 dark:text-gray-100 leading-none">{{ activeCardConfig.value }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-snug">{{ activeCardConfig.description }}</p>
          </div>

          <!-- Breakdown aging — hanya relevan untuk kartu Open/Approved -->
          <div v-if="activeCardConfig.key === 'open' || activeCardConfig.key === 'approved'" class="flex flex-col gap-2">
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sebaran Umur (Aging)</p>
            <div
              v-for="bucket in agingSummary"
              :key="bucket.key"
              class="flex items-center justify-between rounded-lg border-l-4 px-3 py-2"
              :class="[bucket.barClass, bucket.chipClass]"
            >
              <span class="text-xs font-semibold">{{ bucket.label }}</span>
              <div class="text-right">
                <p class="text-sm font-bold leading-tight">{{ bucket.count }} kasbon</p>
                <p class="text-[10px] tabular-nums opacity-80">{{ formatRupiah(bucket.amount) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            type="button"
            @click="dialog.cardDetail = false"
            class="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 rounded-full"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
