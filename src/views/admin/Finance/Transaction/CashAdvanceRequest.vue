<script setup lang="ts">
import { onMounted, shallowRef, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import DateRangePickerSplitButton from '@/components/date/DateRangePickerSplitButton.vue';
import Autocomplete from '@/components/form/Autocomplete.vue';
import { useCashAdvanceRequestStore } from '@/stores/Finance/Transaction/CashAdvanceRequestStore';
import { STATUS_CONFIG } from '@/types/Finance/Transaction/CashAdvanceRequest';
import type { CashAdvanceRequestItem } from '@/types/Finance/Transaction/CashAdvanceRequest';
import { SyncOutlined, PlusOutlined, FileTextOutlined } from '@ant-design/icons-vue';

const breadcrumbs = shallowRef([
  { title: 'Finance', disabled: false, href: '#' },
  { title: 'Transaction', disabled: false, href: '#' },
  { title: 'Advance Payment Request', disabled: true, href: '#' }
]);

const store = useCashAdvanceRequestStore();
const {
  filter,
  form,
  dialog,
  activeTab,
  loading,
  permissions,
  selectedRow,
  employeeOptions,
  employeeLimitNotice,
  categoryOptions,
  selectedCategoryDueDays,
  openRows,
  approvedRows,
  closedRows,
  summaryCards
} = storeToRefs(store);

// Autocomplete tidak bisa men-disable opsi, jadi pemilihan NIK yang sudah limit dibatalkan di store
watch(
  () => form.value.employee_nik,
  (nik) => store.onEmployeeSelected(nik)
);

const tableColumns: TableColumn[] = [
  { key: 'kasbon_no', label: 'No. Kasbon', width: '150px' },
  { key: 'kasbon_date', label: 'Tgl Kasbon', width: '120px', align: 'center' },
  { key: 'employee_nik', label: 'NIK Karyawan', width: '130px' },
  { key: 'category_name', label: 'Kategori', width: '140px' },
  { key: 'description', label: 'Keterangan' },
  { key: 'amount_fmt', label: 'Nominal', width: '140px', align: 'right' },
  { key: 'outstanding_fmt', label: 'Outstanding Tagihan', width: '140px', align: 'right' },
  { key: 'usage_date', label: 'Tgl Penggunaan', width: '130px', align: 'center' },
  { key: 'due_date', label: 'Jatuh Tempo', width: '120px', align: 'center' },
  { key: 'status', label: 'Status', width: '90px', align: 'center', sortable: false }
];

const formatRupiah = (val: string | number | null) => {
  if (val === null || val === undefined) return '-';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return 'Rp ' + n.toLocaleString('id-ID', { minimumFractionDigits: 0 });
};

function toTableRows(rows: CashAdvanceRequestItem[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    ...r,
    amount_fmt: formatRupiah(r.amount),
    outstanding_fmt: formatRupiah(r.outstanding_amount)
  }));
}

const openTableData = computed(() => toTableRows(openRows.value));
const approvedTableData = computed(() => toTableRows(approvedRows.value));
const closedTableData = computed(() => toTableRows(closedRows.value));

onMounted(() => {
  store.fetchData();
  store.fetchEmployeeOptions();
  store.fetchCategoryOptions();
});
</script>

<template>
  <BaseBreadcrumb title="Advance Payment Request" :breadcrumbs="breadcrumbs" class="mb-6" />

  <div class="flex flex-col gap-5">
    <!-- ── Summary Cards ─────────────────────────────────────────── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <!-- Open count -->
      <div
        class="flex items-center gap-4 rounded-xl border-1 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-5 py-4 shadow-sm"
      >
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex-shrink-0">
          <i class="mdi mdi-cash-clock text-amber-600 dark:text-amber-300 text-xl" />
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-amber-500">Open</p>
          <p class="text-2xl font-bold text-amber-700 dark:text-amber-300 leading-tight">{{ summaryCards.open }}</p>
          <p class="text-[11px] text-amber-400">menunggu approval</p>
        </div>
      </div>

      <!-- Approved count -->
      <div
        class="flex items-center gap-4 rounded-xl border-1 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-5 py-4 shadow-sm"
      >
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex-shrink-0">
          <i class="mdi mdi-check-decagram-outline text-blue-600 dark:text-blue-300 text-xl" />
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-blue-500">Approved</p>
          <p class="text-2xl font-bold text-blue-700 dark:text-blue-300 leading-tight">{{ summaryCards.approved }}</p>
          <p class="text-[11px] text-blue-400">siap settlement</p>
        </div>
      </div>

      <!-- Closed count -->
      <div
        class="flex items-center gap-4 rounded-xl border-1 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-5 py-4 shadow-sm"
      >
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex-shrink-0">
          <i class="mdi mdi-cash-check text-emerald-600 dark:text-emerald-300 text-xl" />
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-emerald-500">Closed</p>
          <p class="text-2xl font-bold text-emerald-700 dark:text-emerald-300 leading-tight">{{ summaryCards.closed }}</p>
          <p class="text-[11px] text-emerald-400">sudah selesai</p>
        </div>
      </div>

      <!-- Total nominal belum Closed -->
      <div
        class="flex items-center gap-4 rounded-xl border-1 border-gray-200 bg-gray-50 dark:bg-gray-800/30 dark:border-gray-700 px-5 py-4 shadow-sm"
      >
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0">
          <i class="mdi mdi-cash-multiple text-gray-600 dark:text-gray-300 text-xl" />
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Total Nominal</p>
          <p class="text-base font-bold text-gray-700 dark:text-gray-300 leading-tight">{{ formatRupiah(summaryCards.totalAmount) }}</p>
          <p class="text-[11px] text-gray-400">Open + Approved</p>
        </div>
      </div>

      <!-- Total outstanding (sisa tagihan) -->
      <div
        class="flex items-center gap-4 rounded-xl border-1 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-5 py-4 shadow-sm"
      >
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex-shrink-0">
          <i class="mdi mdi-alert-circle-outline text-red-600 dark:text-red-300 text-xl" />
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-red-500">Outstanding Tagihan</p>
          <p class="text-base font-bold text-red-700 dark:text-red-300 leading-tight">{{ formatRupiah(summaryCards.totalOutstanding) }}</p>
          <p class="text-[11px] text-red-400">perlu di-close</p>
        </div>
      </div>
    </div>

    <!-- ── Filter Bar ─────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-end gap-3">
      <!-- Filter tanggal hanya menyaring Closed — Open/Approved selalu tampil semua (outstanding_all=1) -->
      <template v-if="activeTab === 'closed'">
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
        <template v-if="activeTab === 'closed'">Filter tanggal berlaku untuk tab Closed.</template>
        <template v-else>Tab Open &amp; Approved menampilkan semua kasbon outstanding Anda tanpa filter tanggal.</template>
      </p>

      <div class="flex-1" />

      <button
        v-if="permissions.create"
        @click="store.openCreate()"
        type="button"
        class="flex items-center gap-2 text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 font-medium rounded-full text-sm px-5 py-2 whitespace-nowrap shadow"
      >
        <PlusOutlined />
        Ajukan Kasbon
      </button>
    </div>

    <!-- ── Tabs ───────────────────────────────────────────────────── -->
    <div class="flex border-b border-gray-200 dark:border-gray-700 gap-1">
      <button
        @click="activeTab = 'open'"
        type="button"
        class="px-5 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === 'open' ? 'border-amber-600 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        Open
        <span
          class="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
          :class="activeTab === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'"
        >
          {{ openRows.length }}
        </span>
      </button>
      <button
        @click="activeTab = 'approved'"
        type="button"
        class="px-5 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === 'approved' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        Approved
        <span
          class="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
          :class="activeTab === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'"
        >
          {{ approvedRows.length }}
        </span>
      </button>
      <button
        @click="activeTab = 'closed'"
        type="button"
        class="px-5 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === 'closed' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        Closed
        <span
          class="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
          :class="activeTab === 'closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'"
        >
          {{ closedRows.length }}
        </span>
      </button>
    </div>

    <!-- ── Tabel Open ─────────────────────────────────────────────── -->
    <div v-show="activeTab === 'open'">
      <TableExcel :columns="tableColumns" :data="openTableData" :loading="loading">
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
          <span class="font-medium tabular-nums">{{ value }}</span>
        </template>
        <template #cell-outstanding_fmt="{ row, value }">
          <span
            class="font-semibold tabular-nums"
            :class="parseFloat((row as any).outstanding_amount) > 0 ? 'text-red-600' : 'text-emerald-600'"
          >
            {{ value }}
          </span>
        </template>
        <template #actions="{ row }">
          <button
            type="button"
            title="Lihat Detail"
            @click="store.openDetail(row as unknown as CashAdvanceRequestItem)"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
          >
            <FileTextOutlined />
          </button>
        </template>
      </TableExcel>
    </div>

    <!-- ── Tabel Approved ─────────────────────────────────────────── -->
    <div v-show="activeTab === 'approved'">
      <TableExcel :columns="tableColumns" :data="approvedTableData" :loading="loading">
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
          <span class="font-medium tabular-nums">{{ value }}</span>
        </template>
        <template #cell-outstanding_fmt="{ row, value }">
          <span
            class="font-semibold tabular-nums"
            :class="parseFloat((row as any).outstanding_amount) > 0 ? 'text-red-600' : 'text-emerald-600'"
          >
            {{ value }}
          </span>
        </template>
        <template #actions="{ row }">
          <button
            type="button"
            title="Lihat Detail"
            @click="store.openDetail(row as unknown as CashAdvanceRequestItem)"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
          >
            <FileTextOutlined />
          </button>
        </template>
      </TableExcel>
    </div>

    <!-- ── Tabel Closed ───────────────────────────────────────────── -->
    <div v-show="activeTab === 'closed'">
      <TableExcel :columns="tableColumns" :data="closedTableData" :loading="loading">
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
          <span class="font-medium tabular-nums">{{ value }}</span>
        </template>
        <template #cell-outstanding_fmt="{ row, value }">
          <span
            class="font-semibold tabular-nums"
            :class="parseFloat((row as any).outstanding_amount) > 0 ? 'text-red-600' : 'text-emerald-600'"
          >
            {{ value }}
          </span>
        </template>
        <template #actions="{ row }">
          <button
            type="button"
            title="Lihat Detail"
            @click="store.openDetail(row as unknown as CashAdvanceRequestItem)"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
          >
            <FileTextOutlined />
          </button>
        </template>
      </TableExcel>
    </div>
  </div>

  <!-- ════════════════════════════════════════════════════════════════
       Modal: Form Pengajuan Kasbon
  ═════════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <div
      v-if="dialog.form"
      class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4"
      @click.self="dialog.form = false"
    >
      <div class="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <i class="mdi mdi-cash-plus text-emerald-600" />
            </div>
            <h3 class="text-base font-bold text-gray-800 dark:text-gray-100">Pengajuan Kasbon Baru</h3>
          </div>
          <button type="button" @click="dialog.form = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <i class="mdi mdi-close text-xl" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          <!-- NIK Karyawan -->
          <div class="flex flex-col gap-1">
            <Autocomplete
              v-model="form.employee_nik"
              label="NIK Karyawan"
              placeholder="Cari NIK atau nama karyawan..."
              :options="employeeOptions"
            />
            <!-- Muncul saat user mencoba memilih NIK yang sudah mencapai kasbon_limit (pilihannya dibatalkan) -->
            <div
              v-if="employeeLimitNotice"
              class="flex items-start gap-2 rounded-lg border-1 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300"
            >
              <i class="mdi mdi-alert-circle-outline text-sm mt-px" />
              <span>{{ employeeLimitNotice }}</span>
            </div>
            <p v-else class="text-[11px] text-gray-400 flex items-center gap-1">
              <i class="mdi mdi-information-outline" />
              Karyawan berlabel merah "Limit" sudah mencapai batas kasbon outstanding dan tidak dapat dipilih.
            </p>
          </div>

          <!-- Kategori -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</label>
            <select
              v-model.number="form.category_id"
              class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
            >
              <option :value="null" disabled>Pilih kategori...</option>
              <option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">{{ cat.label }} ({{ cat.due_days }} hari)</option>
            </select>
            <p v-if="selectedCategoryDueDays !== null" class="text-[11px] text-gray-400">
              Tenggat pengembalian: <span class="font-semibold text-amber-600">{{ selectedCategoryDueDays }} hari</span> sejak tanggal
              pemakaian.
            </p>
          </div>

          <!-- Tanggal Kasbon + Tanggal Penggunaan -->
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal Kasbon</label>
              <input
                v-model="form.kasbon_date"
                type="date"
                class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Tgl Penggunaan</label>
              <input
                v-model="form.usage_date"
                type="date"
                class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
              />
            </div>
          </div>

          <!-- Nominal -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Nominal (Rp)</label>
            <input
              v-model.number="form.amount"
              type="number"
              min="0"
              placeholder="0"
              class="py-1 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
            />
            <p v-if="form.amount" class="text-right text-sm font-semibold text-emerald-600">
              {{ formatRupiah(form.amount) }}
            </p>
          </div>

          <!-- Keterangan -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Keterangan / Tujuan</label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="Jelaskan keperluan pengajuan kasbon..."
              class="py-1.5 px-2.5 text-gray-700 text-sm bg-white border-1 border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40 resize-none"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            type="button"
            @click="dialog.form = false"
            class="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-full"
          >
            Batal
          </button>
          <button
            type="button"
            @click="store.onCreate()"
            class="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-full"
          >
            Simpan Pengajuan
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ════════════════════════════════════════════════════════════════
       Modal: Detail Kasbon
  ═════════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <div
      v-if="dialog.detail && selectedRow"
      class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4"
      @click.self="dialog.detail = false"
    >
      <div class="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div class="flex items-center gap-3">
            <h3 class="text-base font-bold text-gray-800 dark:text-gray-100">{{ selectedRow.kasbon_no }}</h3>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
              :class="[STATUS_CONFIG[selectedRow.status]?.bgClass, STATUS_CONFIG[selectedRow.status]?.textClass]"
            >
              {{ selectedRow.status }}
            </span>
          </div>
          <button type="button" @click="dialog.detail = false" class="text-gray-400 hover:text-gray-600">
            <i class="mdi mdi-close text-xl" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 overflow-y-auto">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Tgl Kasbon</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.kasbon_date }}</p>
            </div>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Tgl Penggunaan</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.usage_date }}</p>
            </div>

            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">NIK Karyawan</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.employee_nik }}</p>
            </div>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Departemen</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.employee_department }}</p>
            </div>

            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Kategori</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.category_name || '-' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Jatuh Tempo</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.due_date }}</p>
            </div>

            <div class="col-span-2">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Keterangan</p>
              <p class="text-gray-700 dark:text-gray-300">{{ selectedRow.description }}</p>
            </div>

            <!-- Nominal -->
            <div class="col-span-2 rounded-xl bg-gray-50 dark:bg-gray-800 p-4 flex items-center justify-between">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Nominal Kasbon</p>
                <p class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ formatRupiah(selectedRow.amount) }}</p>
              </div>
              <div v-if="selectedRow.realization_amount" class="text-right">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Realisasi</p>
                <p class="text-xl font-bold text-purple-600">{{ formatRupiah(selectedRow.realization_amount) }}</p>
              </div>
            </div>

            <!-- Info Approval — tampil jika sudah di-approve -->
            <div v-if="selectedRow.approved_by">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Di-approve Oleh</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.approved_by }}</p>
            </div>
            <div v-if="selectedRow.approved_at">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Tgl Approval</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.approved_at }}</p>
            </div>

            <!-- Info Closed — hanya tampil jika sudah Closed -->
            <template v-if="selectedRow.status === 'Closed'">
              <div v-if="selectedRow.bkk_no">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">No. BKK</p>
                <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.bkk_no }}</p>
              </div>
              <div v-if="selectedRow.bkk_date">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Tanggal BKK</p>
                <p class="font-medium text-gray-800 dark:text-gray-200">{{ selectedRow.bkk_date }}</p>
              </div>
              <div v-if="selectedRow.report_note" class="col-span-2">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Catatan Laporan</p>
                <p class="text-gray-700 dark:text-gray-300 text-xs">{{ selectedRow.report_note }}</p>
              </div>
            </template>

            <!-- Timestamps -->
            <div class="col-span-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <p class="text-[10px] text-gray-400">
                Dibuat: {{ selectedRow.created_at }}
                <span v-if="selectedRow.updated_at && selectedRow.updated_by"> · Diupdate: {{ selectedRow.updated_at }}</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            type="button"
            @click="dialog.detail = false"
            class="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
