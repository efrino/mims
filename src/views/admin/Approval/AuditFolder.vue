<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue';
import { BATAS_OVER_CAPACITY_GB, KETERANGAN_STATUS_AUDIT, LABEL_PINDAH_OLEH, LABEL_STATUS_AUDIT, useAuditFolderStore } from '@/stores/Approval/AuditFolder';
import type { AuditFolderLog, AuditFolderRow, AuditFolderStatus } from '@/types/Approval/AuditFolder';

const page = shallowRef({ title: 'Audit Folder' });
const breadcrumbs = shallowRef([
  { title: 'General', disabled: false, href: '#' },
  { title: 'Audit Folder', disabled: true, href: '#' }
]);

const store = useAuditFolderStore();
const { fetchAll, openCreate, openEdit, lookupNik, onSubmit, openDetail, openStatus, onUbahStatus, openHapus, onHapus } = store;
const {
  rowsTampil,
  dataTable,
  departemenList,
  filter,
  search,
  formData,
  dialog,
  selected,
  statusBaru,
  pindahOleh,
  catatanWajib,
  bolehOverCapacity,
  usageLewatQuota,
  catatan,
  isLoading,
  isSaving,
  isProcessing,
  isLoadingDetail,
  isLookup,
  lookupInfo,
  lastError,
  me,
  bolehCrud,
  tanpaAkses,
  labelCakupan,
  totalMenunggu,
  totalDihapus,
  totalDipindahkan,
  totalMemo
} = storeToRefs(store);

onMounted(() => {
  fetchAll();
});

const headerTable = computed<TableColumn[]>(() => [
  { key: 'tanggal', label: 'Tanggal', align: 'center' },
  { key: 'nik', label: 'NIK' },
  { key: 'nama', label: 'Nama' },
  { key: 'departemen', label: 'Department' },
  { key: 'nama_folder', label: 'Nama Folder' },
  { key: 'quota_gb', label: 'Quota (GB)', align: 'right' },
  { key: 'usage_gb', label: 'Usage (GB)', align: 'right' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'note', label: 'Note', sortable: false, filterable: false }
]);

const STATUS_CLS: Record<AuditFolderStatus, string> = {
  normal: 'bg-emerald-100 text-emerald-700',
  resign: 'bg-amber-100 text-amber-700',
  over_capacity: 'bg-red-100 text-red-700',
  dihapus: 'bg-slate-200 text-slate-700',
  dipindahkan: 'bg-blue-100 text-blue-700',
  membuat_memo: 'bg-purple-100 text-purple-700'
};

function asItem(row: Record<string, unknown>): AuditFolderRow {
  return row as unknown as AuditFolderRow;
}

function statusInfo(status: unknown) {
  const s = status as AuditFolderStatus;
  return { label: LABEL_STATUS_AUDIT[s] ?? String(status || '-'), cls: STATUS_CLS[s] ?? 'bg-gray-100 text-gray-600' };
}

function formatTanggal(value: string | null | undefined, withTime = false): string {
  if (!value) return '-';
  const d = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
  });
}

function formatGb(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  return Number.isNaN(n) ? String(value) : n.toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

/** Pemakaian melebihi kuota -- disorot walau statusnya bukan over capacity. */
function lewatKuota(row: AuditFolderRow): boolean {
  return row.quota_gb !== null && row.usage_gb !== null && row.usage_gb > row.quota_gb;
}

// ── Riwayat ──────────────────────────────────────────────────────────────
const AKSI_RIWAYAT: Record<string, { label: string; ikon: string; warna: string }> = {
  buat: { label: 'Data Dibuat', ikon: 'mdi-plus', warna: 'bg-gray-500' },
  ubah: { label: 'Data Diubah', ikon: 'mdi-pencil', warna: 'bg-amber-500' },
  ubah_status: { label: 'Status Diubah', ikon: 'mdi-swap-horizontal', warna: 'bg-blue-600' },
  hapus: { label: 'Data Dihapus', ikon: 'mdi-delete', warna: 'bg-red-600' }
};

function aksiRiwayat(log: AuditFolderLog) {
  return AKSI_RIWAYAT[log.aksi] ?? { label: log.aksi, ikon: 'mdi-circle-small', warna: 'bg-gray-400' };
}

function pelaku(log: AuditFolderLog): string {
  return log.oleh_nama && log.oleh_nama !== log.oleh ? `${log.oleh_nama} (${log.oleh})` : log.oleh;
}

const CONTOH_LOKASI = String.raw`Mis. \\192.168.10.66\arsip\LOGISTIC\ `.trim();

const inputClass =
  'bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:!border-gray-600 dark:text-white';
const selectClass = `af-select ${inputClass} py-2.5 pl-3 pr-9 cursor-pointer`;
const filterClass =
  'h-9 px-3 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400';
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-5" />

  <!-- Punya akses menu, tapi departemennya di HR tidak dikenali: tidak ada data
       departemen yang bisa ditampilkan. -->
  <div v-if="tanpaAkses" class="bg-white !border !border-gray-300 rounded-xl shadow-sm px-6 py-12 text-center">
    <i class="mdi mdi-account-alert-outline text-5xl text-gray-300" />
    <h2 class="mt-2 text-lg font-semibold text-gray-700">Departemen Anda tidak dikenali</h2>
    <p class="mt-1 text-sm text-gray-500">
      NIK {{ me?.nik }} tidak aktif di portal HR, atau departemennya tidak termasuk daftar departemen.
      Hubungi Tim IT.
    </p>
  </div>

  <template v-else>
    <!-- ── Panel atas: ringkasan + toolbar ──────────────────────────────── -->
    <div class="bg-white !border !border-gray-300 rounded-xl shadow-sm mb-4 overflow-hidden">
      <div class="flex items-start justify-between flex-wrap gap-4 px-5 py-4">
        <div class="flex items-stretch flex-wrap gap-y-3">
          <div class="pr-8">
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Menampilkan</span>
            <div class="text-lg font-semibold text-gray-800 leading-tight">{{ labelCakupan }}</div>
            <div class="text-[11px] text-gray-400">
              <template v-if="me?.administrator">Admin</template>
              <template v-else>{{ me?.jabatan || '-' }}<span v-if="me?.departemen"> &middot; {{ me.departemen }}</span></template>
            </div>
          </div>
          <div class="px-8 !border-l !border-gray-300">
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total</span>
            <div class="text-lg font-semibold text-gray-800 leading-tight">{{ dataTable.length }}</div>
          </div>
          <div class="px-8 !border-l !border-gray-300">
            <!-- Masih punya pilihan keputusan dan belum diputuskan atasan. -->
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Perlu Tindakan</span>
            <div class="text-lg font-semibold text-amber-600 leading-tight">{{ totalMenunggu }}</div>
          </div>
          <div class="px-8 !border-l !border-gray-300">
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Hapus</span>
            <div class="text-lg font-semibold text-slate-600 leading-tight">{{ totalDihapus }}</div>
          </div>
          <div class="px-8 !border-l !border-gray-300">
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Dipindahkan</span>
            <div class="text-lg font-semibold text-blue-600 leading-tight">{{ totalDipindahkan }}</div>
          </div>
          <div class="px-8 !border-l !border-gray-300">
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Memo</span>
            <div class="text-lg font-semibold text-purple-600 leading-tight">{{ totalMemo }}</div>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <span v-if="lastError" class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 !border !border-red-200">
            {{ lastError }}
          </span>
          <button
            v-if="bolehCrud"
            class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-4 text-white bg-blue-600 !border !border-blue-600 hover:bg-blue-700 hover:!border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
            @click="openCreate"
          >
            <PlusOutlined />
            Tambah Data
          </button>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="flex items-center justify-between flex-wrap gap-2 px-5 py-3 !border-t !border-gray-300 bg-gray-50">
        <div class="flex items-center gap-2 flex-wrap">
          <select v-model="filter.status" :class="['af-select pl-3 pr-9 cursor-pointer', filterClass]" @change="fetchAll">
            <option value="">Semua Status</option>
            <option v-for="(label, key) in LABEL_STATUS_AUDIT" :key="key" :value="key" :title="KETERANGAN_STATUS_AUDIT[key]">{{ label }}</option>
          </select>

          <div class="flex items-center gap-1.5">
            <input v-model="filter.start_date" type="date" title="Tanggal audit dari" :class="filterClass" />
            <span class="text-gray-400 text-sm">s/d</span>
            <input v-model="filter.end_date" type="date" title="Tanggal audit sampai" :min="filter.start_date || undefined" :class="filterClass" />
          </div>

          <button
            type="button"
            title="Muat ulang data dari server"
            class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition"
            @click="fetchAll"
          >
            <ReloadOutlined />
            Terapkan
          </button>
        </div>

        <div class="relative">
          <i class="mdi mdi-magnify absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input v-model="search" type="search" placeholder="Cari NIK, nama, folder, note..." :class="[filterClass, 'pl-8 w-72']" />
        </div>
      </div>
    </div>

    <!-- ── Tabel ─────────────────────────────────────────────────────────── -->
    <div class="af-table rounded-lg overflow-hidden !border !border-gray-300">
      <TableExcel :columns="headerTable" :data="rowsTampil as unknown as Record<string, unknown>[]" :loading="isLoading" thead-class="bg-gray-50">
        <template #cell-tanggal="{ value }">
          <span class="whitespace-nowrap">{{ formatTanggal(value as string) }}</span>
        </template>
        <template #cell-nik="{ value }">
          <span class="font-medium text-gray-700 whitespace-nowrap">{{ value }}</span>
        </template>
        <template #cell-nama_folder="{ value }">
          <span class="font-mono text-xs text-gray-700 break-all">{{ value }}</span>
        </template>
        <template #cell-quota_gb="{ value }">{{ formatGb(value) }}</template>
        <template #cell-usage_gb="{ row, value }">
          <span :class="lewatKuota(asItem(row)) ? 'font-semibold text-red-600' : ''">{{ formatGb(value) }}</span>
        </template>
        <template #cell-status="{ value }">
          <span class="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" :class="statusInfo(value).cls">
            {{ statusInfo(value).label }}
          </span>
        </template>
        <template #cell-note="{ row }">
          <div class="max-w-[220px]">
            <div class="text-xs text-gray-700 truncate" :title="asItem(row).note || ''">{{ asItem(row).note || '-' }}</div>
            <!-- Catatan keputusan atasan terakhir, lengkapnya di detail. -->
            <div v-if="asItem(row).status_catatan" class="text-[11px] text-blue-600 truncate" :title="asItem(row).status_catatan || ''">
              <i class="mdi mdi-comment-account-outline" /> {{ asItem(row).status_catatan }}
            </div>
          </div>
        </template>
        <template #actions="{ row }">
          <div class="flex items-center justify-center gap-1.5">
            <button
              type="button"
              title="Lihat Detail"
              class="inline-flex items-center justify-center p-1.5 text-white bg-cyan-500 rounded-lg hover:bg-cyan-600 transition"
              @click="openDetail(asItem(row))"
            >
              <i class="mdi mdi-eye text-sm" />
            </button>
            <button
              v-if="asItem(row).bisa_ubah_status"
              type="button"
              title="Ubah Status"
              class="inline-flex items-center justify-center p-1.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              @click="openStatus(asItem(row))"
            >
              <i class="mdi mdi-swap-horizontal text-sm" />
            </button>
            <template v-if="bolehCrud">
              <button
                type="button"
                title="Edit"
                class="inline-flex items-center justify-center p-1.5 text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition"
                @click="openEdit(asItem(row))"
              >
                <i class="mdi mdi-pencil text-sm" />
              </button>
              <button
                type="button"
                title="Hapus Data"
                class="inline-flex items-center justify-center p-1.5 text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                @click="openHapus(asItem(row))"
              >
                <i class="mdi mdi-delete text-sm" />
              </button>
            </template>
          </div>
        </template>
        <template #empty>
          <div class="w-full">
            <span class="px-5 py-12 text-center text-gray-400 text-sm">Belum ada data audit folder.</span>
          </div>
        </template>
      </TableExcel>
    </div>
  </template>

  <!-- ==================== Modal Form (admin) ==================== -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="dialog.form"
        class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 p-4"
        role="dialog"
        aria-modal="true"
        @click.self="dialog.form = false"
      >
        <div class="relative p-4 w-full max-w-2xl max-h-full">
          <div class="relative bg-white rounded-xl shadow-xl !border !border-gray-300">
            <div class="flex items-center justify-between p-5 !border-b rounded-t !border-gray-300">
              <h1 class="text-gray-600 text-xl font-semibold">{{ formData.id ? 'Edit' : 'Tambah' }} Data Audit Folder</h1>
              <button
                type="button"
                class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
                @click="dialog.form = false"
              >
                <i class="mdi mdi-close" />
              </button>
            </div>

            <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="af_tanggal" class="block mb-2 text-sm font-medium text-gray-900">Tanggal <span class="text-red-500">*</span></label>
                  <input id="af_tanggal" v-model="formData.tanggal" type="date" :class="inputClass" />
                </div>
                <div>
                  <label for="af_status" class="block mb-2 text-sm font-medium text-gray-900">Status <span class="text-red-500">*</span></label>
                  <select id="af_status" v-model="formData.status" :class="selectClass">
                    <option value="">- Pilih Status -</option>
                    <!-- Over Capacity dikunci selama quota belum di atas batas; aturan yang sama dicek server. -->
                    <option
                      v-for="(label, key) in LABEL_STATUS_AUDIT"
                      :key="key"
                      :value="key"
                      :disabled="key === 'over_capacity' && !bolehOverCapacity"
                    >
                      {{ label }}{{ key === 'over_capacity' && !bolehOverCapacity ? ` (quota > ${BATAS_OVER_CAPACITY_GB} GB)` : '' }}
                    </option>
                  </select>
                  <p v-if="formData.status === 'over_capacity' && !bolehOverCapacity" class="mt-1 text-[11px] text-red-600">
                    Over Capacity hanya untuk folder dengan quota lebih dari {{ BATAS_OVER_CAPACITY_GB }} GB.
                  </p>
                  <p v-else-if="formData.status" class="mt-1 text-[11px] text-gray-500">{{ KETERANGAN_STATUS_AUDIT[formData.status] }}</p>
                </div>

                <div>
                  <label for="af_nik" class="block mb-2 text-sm font-medium text-gray-900">NIK <span class="text-red-500">*</span></label>
                  <div class="flex gap-2">
                    <input
                      id="af_nik"
                      v-model="formData.nik"
                      type="text"
                      maxlength="30"
                      :class="inputClass"
                      placeholder="Contoh: D.6804"
                      @keydown.enter.prevent="lookupNik"
                    />
                    <button
                      type="button"
                      title="Isi nama & departemen dari portal HR"
                      :disabled="isLookup || !formData.nik.trim()"
                      class="shrink-0 px-3 text-sm font-medium rounded-lg text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      @click="lookupNik"
                    >
                      <i class="mdi" :class="isLookup ? 'mdi-loading mdi-spin' : 'mdi-account-search-outline'" />
                    </button>
                  </div>
                  <p v-if="lookupInfo" class="mt-1 text-[11px] text-amber-700">{{ lookupInfo }}</p>
                  <p v-else class="mt-1 text-[11px] text-gray-400">Tekan tombol cari untuk mengisi nama & departemen dari HR.</p>
                </div>
                <div>
                  <label for="af_nama" class="block mb-2 text-sm font-medium text-gray-900">Nama <span class="text-red-500">*</span></label>
                  <input id="af_nama" v-model="formData.nama" type="text" maxlength="100" :class="inputClass" placeholder="Nama lengkap" />
                </div>

                <div class="md:col-span-2">
                  <label for="af_departemen" class="block mb-2 text-sm font-medium text-gray-900">Department <span class="text-red-500">*</span></label>
                  <select id="af_departemen" v-model="formData.departemen" :class="selectClass">
                    <option value="">- Pilih Departemen -</option>
                    <option v-for="d in departemenList" :key="d" :value="d">{{ d }}</option>
                  </select>
                  <p class="mt-1 text-[11px] text-gray-400">Atasan departemen ini yang memutuskan statusnya.</p>
                </div>

                <div class="md:col-span-2">
                  <label for="af_folder" class="block mb-2 text-sm font-medium text-gray-900">Nama Folder <span class="text-red-500">*</span></label>
                  <input
                    id="af_folder"
                    v-model="formData.nama_folder"
                    type="text"
                    maxlength="255"
                    :class="[inputClass, 'font-mono']"
                    placeholder="\\192.168.10.66\home\D.6804"
                  />
                </div>

                <div>
                  <label for="af_quota" class="block mb-2 text-sm font-medium text-gray-900">Quota (GB)</label>
                  <input id="af_quota" v-model="formData.quota_gb" type="number" min="0" step="0.01" :class="inputClass" placeholder="0" />
                </div>
                <div>
                  <label for="af_usage" class="block mb-2 text-sm font-medium text-gray-900">Usage (GB)</label>
                  <input
                    id="af_usage"
                    v-model="formData.usage_gb"
                    type="number"
                    min="0"
                    step="0.01"
                    :max="formData.quota_gb || undefined"
                    :class="[inputClass, usageLewatQuota ? '!border-red-500' : '']"
                    placeholder="0"
                  />
                  <p v-if="usageLewatQuota" class="mt-1 text-[11px] text-red-600">Usage tidak boleh lebih besar dari quota.</p>
                </div>
              </div>

              <div>
                <label for="af_note" class="block mb-2 text-sm font-medium text-gray-900">Note</label>
                <textarea id="af_note" v-model="formData.note" rows="4" maxlength="5000" :class="inputClass" placeholder="Catatan untuk atasan..." />
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 p-5 !border-t !border-gray-300">
              <button
                type="button"
                class="text-gray-900 bg-white !border !border-gray-300 hover:bg-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
                @click="dialog.form = false"
              >
                Batal
              </button>
              <button
                type="button"
                :disabled="isSaving"
                class="text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="onSubmit"
              >
                {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ==================== Modal Detail ==================== -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="dialog.detail && selected"
        class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 p-4"
        role="dialog"
        aria-modal="true"
        @click.self="dialog.detail = false"
      >
        <div class="relative p-4 w-full max-w-2xl max-h-full">
          <div class="relative bg-white rounded-xl shadow-xl !border !border-gray-300">
            <div class="flex items-center justify-between p-5 !border-b rounded-t !border-gray-300">
              <div class="flex items-center gap-3 flex-wrap">
                <h1 class="text-gray-600 text-xl font-semibold">Detail Audit Folder</h1>
                <span
                  class="px-2 py-0.5 rounded-full text-xs font-semibold"
                  :class="statusInfo(selected.status).cls"
                  :title="KETERANGAN_STATUS_AUDIT[selected.status]"
                >
                  {{ statusInfo(selected.status).label }}
                </span>
                <span class="w-full text-xs text-gray-500">{{ KETERANGAN_STATUS_AUDIT[selected.status] }}</span>
              </div>
              <button
                type="button"
                class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
                @click="dialog.detail = false"
              >
                <i class="mdi mdi-close" />
              </button>
            </div>

            <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-sm">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2">
                  <div class="text-[11px] text-gray-500">Nama</div>
                  <div class="font-semibold text-gray-800">{{ selected.nama }}</div>
                </div>
                <div class="rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2">
                  <div class="text-[11px] text-gray-500">NIK</div>
                  <div class="font-semibold text-gray-800">{{ selected.nik }}</div>
                </div>
                <div class="rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2">
                  <div class="text-[11px] text-gray-500">Department</div>
                  <div class="font-semibold text-gray-800">{{ selected.departemen }}</div>
                </div>
                <div class="rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2">
                  <div class="text-[11px] text-gray-500">Tanggal</div>
                  <div class="font-semibold text-gray-800">{{ formatTanggal(selected.tanggal) }}</div>
                </div>
                <div class="rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2">
                  <div class="text-[11px] text-gray-500">Quota (GB)</div>
                  <div class="font-semibold text-gray-800">{{ formatGb(selected.quota_gb) }}</div>
                </div>
                <div class="rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2">
                  <div class="text-[11px] text-gray-500">Usage (GB)</div>
                  <div class="font-semibold" :class="lewatKuota(selected) ? 'text-red-600' : 'text-gray-800'">{{ formatGb(selected.usage_gb) }}</div>
                </div>
              </div>

              <div>
                <div class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Nama Folder</div>
                <div class="font-mono text-gray-800 rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2 break-all">{{ selected.nama_folder }}</div>
              </div>

              <div
                v-if="selected.diputuskan_at"
                class="rounded-lg !border !border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800"
              >
                <i class="mdi mdi-lock-outline" />
                Sudah diputuskan: <b>{{ statusInfo(selected.status).label }}</b>
                <template v-if="selected.pindah_oleh"> ({{ LABEL_PINDAH_OLEH[selected.pindah_oleh] }})</template>
                <template v-if="selected.status_by_name"> oleh {{ selected.status_by_name }}</template>
                pada {{ formatTanggal(selected.diputuskan_at, true) }}.
                <span class="text-blue-600">Hanya administrator yang dapat mengubahnya.</span>
                <div v-if="selected.status_catatan" class="mt-1 whitespace-pre-line text-gray-700">
                  {{ selected.pindah_oleh === 'it' ? 'Lokasi pemindahan' : 'Note' }}: {{ selected.status_catatan }}
                </div>
              </div>

              <div>
                <div class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Note</div>
                <div class="text-gray-800 rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2 whitespace-pre-line">{{ selected.note || '-' }}</div>
              </div>

              <div>
                <div class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Riwayat Perubahan</div>

                <div v-if="isLoadingDetail && !selected.riwayat" class="text-gray-400 text-xs">Memuat riwayat...</div>
                <div v-else-if="!selected.riwayat" class="text-red-600 text-xs">Riwayat gagal dimuat. Tutup lalu buka lagi detailnya.</div>
                <div v-else-if="!selected.riwayat.length" class="text-gray-400 text-xs">Belum ada riwayat.</div>

                <ol v-else class="relative ms-3 !border-s !border-gray-200">
                  <li v-for="log in selected.riwayat" :key="log.id" class="ms-6 pb-4 last:pb-0">
                    <span
                      class="absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white text-white"
                      :class="aksiRiwayat(log).warna"
                    >
                      <i class="mdi text-xs" :class="aksiRiwayat(log).ikon" />
                    </span>
                    <div class="flex items-baseline justify-between gap-2 flex-wrap">
                      <span class="font-semibold text-gray-800">{{ aksiRiwayat(log).label }}</span>
                      <time class="text-[11px] text-gray-400">{{ formatTanggal(log.created_at, true) }}</time>
                    </div>
                    <div class="text-xs text-gray-600">
                      oleh {{ pelaku(log) }}<span v-if="log.peran"> &middot; {{ log.peran }}</span>
                    </div>
                    <div v-if="log.status_ke" class="text-[11px] text-gray-400">
                      <template v-if="log.status_dari">{{ statusInfo(log.status_dari).label }} &rarr; </template>{{ statusInfo(log.status_ke).label }}
                      <template v-if="log.pindah_oleh"> &middot; {{ LABEL_PINDAH_OLEH[log.pindah_oleh] }}</template>
                    </div>
                    <ul v-if="log.perubahan && log.aksi === 'ubah'" class="mt-1 text-[11px] text-gray-500 list-disc ms-4">
                      <li v-for="(p, i) in log.perubahan.split('\n')" :key="i">{{ p }}</li>
                    </ul>
                    <div v-if="log.catatan" class="mt-1 text-xs text-gray-700 whitespace-pre-line rounded bg-gray-50 !border !border-gray-200 px-2 py-1">
                      {{ log.catatan }}
                    </div>
                  </li>
                </ol>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 p-5 !border-t !border-gray-300">
              <button
                v-if="selected.bisa_ubah_status"
                type="button"
                class="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-5 py-2.5"
                @click="openStatus(selected)"
              >
                Ubah Status
              </button>
              <button
                type="button"
                class="text-gray-900 bg-white !border !border-gray-300 hover:bg-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
                @click="dialog.detail = false"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ==================== Modal Ubah Status (atasan) ==================== -->
  <Teleport to="body">
    <div v-if="dialog.status && selected" class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl !border !border-gray-300">
        <div class="p-6">
          <h3 class="mb-1 text-xl font-bold text-gray-800 text-center">Ubah Status</h3>
          <p class="mb-1 text-center text-gray-500">
            <span class="font-bold text-gray-800">{{ selected.nama }}</span> ({{ selected.nik }})
          </p>
          <p class="mb-4 text-center font-mono text-xs text-gray-500 break-all">{{ selected.nama_folder }}</p>

          <div class="mb-1 text-xs font-medium text-gray-600">
            Status sekarang:
            <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold" :class="statusInfo(selected.status).cls">{{ statusInfo(selected.status).label }}</span>
          </div>

          <!-- Pilihan dari backend (pilihan_status), bergantung status sekarang. Radio asli
               disembunyikan (sr-only) -- bawaan plugin form tidak tampil di modal ini --
               dan diganti titik buatan sendiri. -->
          <div class="mt-3 mb-3 space-y-2" role="radiogroup" aria-label="Status baru">
            <label
              v-for="opsi in selected.pilihan_status"
              :key="opsi"
              class="flex items-center gap-3 rounded-lg !border px-3.5 py-2.5 cursor-pointer transition"
              :class="statusBaru === opsi ? '!border-blue-500 bg-blue-50 ring-1 ring-blue-500' : '!border-gray-300 hover:bg-gray-50'"
            >
              <input v-model="statusBaru" type="radio" :value="opsi" class="sr-only" />
              <span
                class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full !border-2"
                :class="statusBaru === opsi ? '!border-blue-600' : '!border-gray-300'"
              >
                <span v-if="statusBaru === opsi" class="h-2 w-2 rounded-full bg-blue-600" />
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold text-gray-800">{{ LABEL_STATUS_AUDIT[opsi] }}</span>
                <span class="block text-xs text-gray-500">
                  {{ opsi === 'normal' ? 'Folder tetap dipertahankan.' : KETERANGAN_STATUS_AUDIT[opsi] }}
                </span>
              </span>
            </label>
          </div>

          <!-- Dipindahkan: siapa yang memindahkan. Oleh IT -> lokasi wajib di note. -->
          <div v-if="statusBaru === 'dipindahkan'" class="mb-3 rounded-lg bg-gray-50 !border !border-gray-200 p-3">
            <div class="mb-2 text-xs font-medium text-gray-600">Dipindahkan oleh <span class="text-red-500">*</span></div>
            <div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Dipindahkan oleh">
              <label
                v-for="(label, key) in LABEL_PINDAH_OLEH"
                :key="key"
                class="flex items-center gap-2 rounded-lg !border bg-white px-3 py-2 text-sm cursor-pointer transition"
                :class="pindahOleh === key ? '!border-blue-500 ring-1 ring-blue-500 text-blue-700' : '!border-gray-300 text-gray-700 hover:bg-gray-50'"
              >
                <input v-model="pindahOleh" type="radio" :value="key" class="sr-only" />
                <span
                  class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full !border-2"
                  :class="pindahOleh === key ? '!border-blue-600' : '!border-gray-300'"
                >
                  <span v-if="pindahOleh === key" class="h-2 w-2 rounded-full bg-blue-600" />
                </span>
                {{ key === 'it' ? 'Oleh IT' : 'Sendiri' }}
              </label>
            </div>
          </div>

          <p class="mb-3 text-[11px] text-amber-700">
            <i class="mdi mdi-alert-outline" /> Keputusan hanya bisa dibuat sekali. Sesudah disimpan, hanya administrator yang dapat mengubahnya.
          </p>

          <div class="mb-4">
            <label for="af_catatan" class="block mb-1.5 text-xs font-medium text-gray-600">
              <template v-if="catatanWajib">Lokasi pemindahan <span class="text-red-500">*</span></template>
              <template v-else>Note (opsional)</template>
            </label>
            <textarea
              id="af_catatan"
              v-model="catatan"
              rows="3"
              maxlength="1000"
              class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
              :placeholder="catatanWajib ? CONTOH_LOKASI : 'Catatan untuk keputusan ini...'"
            />
          </div>

          <div class="flex justify-center gap-3">
            <button
              type="button"
              :disabled="isProcessing || !statusBaru || (statusBaru === 'dipindahkan' && !pindahOleh) || (catatanWajib && !catatan.trim())"
              class="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="onUbahStatus"
            >
              {{ isProcessing ? 'Menyimpan...' : 'Simpan Status' }}
            </button>
            <button
              type="button"
              class="text-gray-500 bg-white hover:bg-gray-100 rounded-lg !border !border-gray-300 text-sm font-medium px-5 py-2.5"
              @click="dialog.status = false"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ==================== Modal Hapus (admin) ==================== -->
  <Teleport to="body">
    <div v-if="dialog.hapus && selected" class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl !border !border-gray-300">
        <div class="p-6 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <i class="mdi mdi-delete-outline text-4xl text-red-600" />
          </div>
          <h3 class="mb-2 text-xl font-bold text-gray-800">Hapus Data Audit?</h3>
          <p class="mb-1 text-gray-500">
            <span class="font-bold text-gray-800">{{ selected.nama }}</span> ({{ selected.nik }})
          </p>
          <p class="mb-4 font-mono text-xs text-gray-500 break-all">{{ selected.nama_folder }}</p>
          <!-- Bukan status "Folder Dihapus": yang dihapus barisnya dari daftar ini. -->
          <p class="mb-4 text-xs text-gray-500">Baris ini hilang dari daftar. Untuk menandai foldernya sudah dihapus, pakai Ubah Status.</p>
          <div class="flex justify-center gap-3">
            <button
              type="button"
              :disabled="isProcessing"
              class="text-white bg-red-600 hover:bg-red-700 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="onHapus"
            >
              {{ isProcessing ? 'Menghapus...' : 'Ya, Hapus' }}
            </button>
            <button
              type="button"
              class="text-gray-500 bg-white hover:bg-gray-100 rounded-lg !border !border-gray-300 text-sm font-medium px-5 py-2.5"
              @click="dialog.hapus = false"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Panah select bawaan plugin form Tailwind terlalu besar -- sama seperti Folder Sharing. */
.af-select {
  background-size: 0.85em 0.85em;
  background-position: right 0.625rem center;
}

/* Lihat catatan Border Tailwind vs Vuetify di CLAUDE.md. */
@layer vendor {
  .af-table :deep(thead tr) {
    border-bottom-color: #cbd5e1 !important;
  }

  .af-table :deep(tbody tr) {
    border-bottom-color: #e5e7eb !important;
  }

  .af-table :deep(.overflow-x-auto + div) {
    border-top-color: #cbd5e1 !important;
  }
}
</style>
