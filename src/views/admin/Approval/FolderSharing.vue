<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import { DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue';
import { useFolderSharingStore } from '@/stores/Approval/FolderSharing';
import type { FolderSharingLog, FolderSharingRequest, FolderSharingStatus } from '@/types/Approval/FolderSharing';

const page = shallowRef({ title: 'Folder Sharing' });
const breadcrumbs = shallowRef([
  { title: 'General', disabled: false, href: '#' },
  { title: 'Folder Sharing', disabled: true, href: '#' }
]);

const store = useFolderSharingStore();
const { fetchAll, loadForm, onSubmit, openDetail, openAksi, onProcess, canCancel, exportExcel } = store;
const {
  dataTable,
  departemenList,
  filter,
  formData,
  dialog,
  selected,
  aksi,
  catatan,
  isLoading,
  isSaving,
  isProcessing,
  isExporting,
  lastError,
  permissions,
  me,
  totalPending,
  totalPerluSaya,
  totalApproved,
  totalRejected,
  totalAksesDiberikan,
  identitasTerkunci,
  labelCakupan,
  hariIni,
  batasAkses,
  isLoadingDetail,
  pilihanTujuan
} = storeToRefs(store);

// Admin bisa mengganti departemen pemohon setelah memilih tujuan; kalau jadi sama,
// pilihan tujuannya hilang dari daftar, jadi dikosongkan supaya tidak tersimpan diam-diam.
watch(
  () => formData.value.departemen,
  (dept) => {
    if (dept && formData.value.departemen_tujuan === dept) formData.value.departemen_tujuan = '';
  }
);

// Excel diambil dari baris yang sedang tampil di tabel -- filter checklist kolom dan
// sort hanya diketahui TableExcel, jadi barisnya diminta lewat ref, bukan dari store.
const tabel = ref<{ getVisibleRows: () => Record<string, unknown>[] } | null>(null);

function unduhExcel() {
  const rows = (tabel.value?.getVisibleRows() ?? []) as unknown as FolderSharingRequest[];
  exportExcel(rows);
}

onMounted(() => {
  fetchAll();
});

const headerTable = computed<TableColumn[]>(() => [
  { key: 'no_request', label: 'No. Request' },
  { key: 'created_at', label: 'Tanggal', align: 'center' },
  { key: 'nama', label: 'Pemohon' },
  { key: 'departemen', label: 'Departemen' },
  { key: 'departemen_tujuan', label: 'Dept. Tujuan' },
  { key: 'folder_path', label: 'Folder' },
  { key: 'jenis_akses', label: 'Akses', align: 'center' },
  { key: 'status', label: 'Status', align: 'center' }
]);

const STATUS_LABEL: Record<FolderSharingStatus, { label: string; cls: string }> = {
  pending: { label: 'Menunggu Dept. Pemohon', cls: 'bg-amber-100 text-amber-700' },
  pending_tujuan: { label: 'Menunggu Dept. Tujuan', cls: 'bg-orange-100 text-orange-700' },
  approved: { label: 'Disetujui', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Ditolak', cls: 'bg-red-100 text-red-700' },
  canceled: { label: 'Dibatalkan', cls: 'bg-gray-100 text-gray-600' },
  granted: { label: 'Akses Diberikan', cls: 'bg-blue-100 text-blue-700' },
  revoked: { label: 'Akses Ditarik', cls: 'bg-slate-200 text-slate-700' }
};

const AKSI_INFO = {
  approve: { judul: 'Setujui Permintaan', tombol: 'Ya, Setujui', ikon: 'mdi-check-decagram-outline', warna: 'emerald' },
  reject: { judul: 'Tolak Permintaan', tombol: 'Ya, Tolak', ikon: 'mdi-close-octagon-outline', warna: 'red' },
  cancel: { judul: 'Batalkan Permintaan', tombol: 'Ya, Batalkan', ikon: 'mdi-cancel', warna: 'gray' },
  grant: { judul: 'Tandai Akses Diberikan', tombol: 'Ya, Sudah Diberikan', ikon: 'mdi-folder-key-outline', warna: 'blue' },
  revoke: { judul: 'Tandai Akses Ditarik', tombol: 'Ya, Sudah Ditarik', ikon: 'mdi-folder-remove-outline', warna: 'slate' }
} as const;

const aksiInfo = computed(() => (aksi.value ? AKSI_INFO[aksi.value] : null));

function asItem(row: Record<string, unknown>): FolderSharingRequest {
  return row as unknown as FolderSharingRequest;
}

function statusInfo(status: unknown) {
  return STATUS_LABEL[status as FolderSharingStatus] ?? { label: String(status || '-'), cls: 'bg-gray-100 text-gray-600' };
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

function labelAkses(row: FolderSharingRequest): string {
  if (row.jenis_akses === '3bulan') return `3 Bulan (s/d ${formatTanggal(row.akses_sampai)})`;
  if (row.jenis_akses === 'sampai') return `Sampai ${formatTanggal(row.akses_sampai)}`;
  // Hanya baris lama, sebelum akses dibatasi maksimal 3 bulan.
  return 'Permanen';
}

// ── Riwayat ──────────────────────────────────────────────────────────────
const AKSI_RIWAYAT: Record<string, { label: string; ikon: string; warna: string }> = {
  ajukan: { label: 'Diajukan', ikon: 'mdi-send-outline', warna: 'bg-gray-500' },
  setujui_1: { label: 'Disetujui Tahap 1', ikon: 'mdi-check', warna: 'bg-emerald-500' },
  setujui_2: { label: 'Disetujui Tahap 2', ikon: 'mdi-check-all', warna: 'bg-emerald-600' },
  tolak: { label: 'Ditolak', ikon: 'mdi-close', warna: 'bg-red-600' },
  batal: { label: 'Dibatalkan Pemohon', ikon: 'mdi-cancel', warna: 'bg-gray-500' },
  beri_akses: { label: 'Akses Diberikan', ikon: 'mdi-folder-key-outline', warna: 'bg-blue-600' },
  tarik_akses: { label: 'Akses Ditarik', ikon: 'mdi-folder-remove-outline', warna: 'bg-slate-600' }
};

function aksiRiwayat(log: FolderSharingLog) {
  return AKSI_RIWAYAT[log.aksi] ?? { label: log.aksi, ikon: 'mdi-circle-small', warna: 'bg-gray-400' };
}

function pelaku(log: FolderSharingLog): string {
  return log.oleh_nama && log.oleh_nama !== log.oleh ? `${log.oleh_nama} (${log.oleh})` : log.oleh;
}

/**
 * Penolakan / pembatalan SESUDAH ada persetujuan perlu disebut terang-terangan,
 * karena itulah yang menggugurkan persetujuan sebelumnya.
 */
function menggugurkan(log: FolderSharingLog): boolean {
  return (log.aksi === 'tolak' || log.aksi === 'batal') && !!log.status_dari && log.status_dari !== 'pending';
}

const inputClass =
  'bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:!border-gray-600 dark:text-white';
const selectClass = `fs-select ${inputClass} py-2.5 pl-3 pr-9 cursor-pointer`;
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-5" />

  <!-- ── Panel atas: ringkasan + toolbar ──────────────────────────────── -->
  <div class="bg-white !border !border-gray-300 rounded-xl shadow-sm mb-4 overflow-hidden">
    <div class="flex items-start justify-between flex-wrap gap-4 px-5 py-4">
      <div class="flex items-stretch flex-wrap gap-y-3">
        <div class="pr-8">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Menampilkan</span>
          <div class="text-lg font-semibold text-gray-800 leading-tight">
            {{ labelCakupan }}
          </div>
          <!-- Cakupan & hak menyetujui ditentukan jabatan di portal HR. -->
          <div class="text-[11px] text-gray-400">
            <template v-if="me?.nik === 'ADMINISTRATOR'">
              Admin
            </template>

            <template v-else>
              {{ me?.jabatan || 'Jabatan tidak terdaftar' }}<span v-if="me?.departemen">&middot; {{ me.departemen }}</span>
            </template>
          </div>
        </div>
        <div class="px-8 !border-l !border-gray-300">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total</span>
          <div class="text-lg font-semibold text-gray-800 leading-tight">{{ dataTable.length }}</div>
        </div>
        <div v-if="totalPerluSaya" class="px-8 !border-l !border-gray-300">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Perlu Keputusan Anda</span>
          <div class="text-lg font-semibold text-purple-600 leading-tight">{{ totalPerluSaya }}</div>
        </div>
        <div class="px-8 !border-l !border-gray-300">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Menunggu Approval</span>
          <div class="text-lg font-semibold text-amber-600 leading-tight">{{ totalPending }}</div>
        </div>
        <div class="px-8 !border-l !border-gray-300">
          <!-- Disetujui dua lapis, tapi aksesnya belum ditandai diberikan tim IT. -->
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Menunggu IT</span>
          <div class="text-lg font-semibold text-emerald-600 leading-tight">{{ totalApproved }}</div>
        </div>
        <div class="px-8 !border-l !border-gray-300">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Akses Diberikan</span>
          <div class="text-lg font-semibold text-blue-600 leading-tight">{{ totalAksesDiberikan }}</div>
        </div>
        <div class="px-8 !border-l !border-gray-300">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Ditolak</span>
          <div class="text-lg font-semibold text-red-600 leading-tight">{{ totalRejected }}</div>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <span v-if="lastError" class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 !border !border-red-200">
          {{ lastError }}
        </span>
        <button
          v-if="permissions.create"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-4 text-white bg-blue-600 !border !border-blue-600 hover:bg-blue-700 hover:!border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
          @click="loadForm"
        >
          <PlusOutlined />
          Ajukan Permintaan
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex items-center justify-between flex-wrap gap-2 px-5 py-3 !border-t !border-gray-300 bg-gray-50">
      <div class="flex items-center gap-2 flex-wrap">
        <select
          v-model="filter.status"
          class="fs-select h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
          @change="fetchAll"
        >
          <option value="">Semua Status</option>
          <option value="pending">Menunggu Dept. Pemohon</option>
          <option value="pending_tujuan">Menunggu Dept. Tujuan</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
          <option value="canceled">Dibatalkan</option>
          <option value="granted">Akses Diberikan</option>
          <option value="revoked">Akses Ditarik</option>
        </select>

        <div class="flex items-center gap-1.5">
          <input
            v-model="filter.start_date"
            type="date"
            title="Diajukan dari tanggal"
            class="h-9 px-3 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
          />
          <span class="text-gray-400 text-sm">s/d</span>
          <input
            v-model="filter.end_date"
            type="date"
            title="Diajukan sampai tanggal"
            :min="filter.start_date || undefined"
            class="h-9 px-3 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
          />
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

      <button
        type="button"
        title="Unduh baris yang sedang tampil, sesuai filter dan urutan tabel"
        :disabled="isExporting || isLoading || !dataTable.length"
        class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-white bg-emerald-600 !border !border-emerald-600 hover:bg-emerald-700 hover:!border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        @click="unduhExcel"
      >
        <DownloadOutlined />
        {{ isExporting ? 'Menyiapkan...' : 'Download Excel' }}
      </button>
    </div>
  </div>

  <!-- ── Tabel ─────────────────────────────────────────────────────────── -->
  <div class="fs-table rounded-lg overflow-hidden !border !border-gray-300">
    <TableExcel ref="tabel" :columns="headerTable" :data="dataTable as unknown as Record<string, unknown>[]" :loading="isLoading" thead-class="bg-gray-50">
      <template #cell-no_request="{ value }">
        <span class="font-semibold text-gray-800">{{ value }}</span>
      </template>
      <template #cell-created_at="{ value }">{{ formatTanggal(value as string, true) }}</template>
      <template #cell-nama="{ row }">
        <div class="font-medium text-gray-700">{{ asItem(row).nama }}</div>
        <div class="text-[11px] text-gray-400">{{ asItem(row).nik }}</div>
      </template>
      <template #cell-folder_path="{ value }">
        <span class="font-mono text-xs text-gray-700 break-all">{{ value }}</span>
      </template>
      <template #cell-jenis_akses="{ row }">
        <span class="text-xs text-gray-700 whitespace-nowrap">{{ labelAkses(asItem(row)) }}</span>
      </template>
      <template #cell-status="{ row }">
        <div class="flex flex-col items-center gap-1">
          <span class="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" :class="statusInfo(asItem(row).status).cls">
            {{ statusInfo(asItem(row).status).label }}
          </span>
          <!-- Pada status menunggu, yang dinanti adalah atasan departemen ini. -->
          <span v-if="asItem(row).menunggu_departemen" class="text-[10px] text-gray-400">{{ asItem(row).menunggu_departemen }}</span>
          <span v-if="asItem(row).kedaluwarsa" class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700">
            Kedaluwarsa
          </span>
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

          <!-- Setujui hanya untuk atasan tahap yang sedang berjalan; Tolak tetap ada
               sesudah menyetujui, sampai akses diberikan. Keduanya dihitung backend. -->
          <button
            v-if="asItem(row).bisa_setujui"
            type="button"
            :title="`Setujui (atasan ${asItem(row).menunggu_departemen})`"
            class="inline-flex items-center justify-center p-1.5 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
            @click="openAksi(asItem(row), 'approve')"
          >
            <i class="mdi mdi-check text-sm" />
          </button>
          <button
            v-if="asItem(row).bisa_tolak"
            type="button"
            title="Tolak"
            class="inline-flex items-center justify-center p-1.5 text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
            @click="openAksi(asItem(row), 'reject')"
          >
            <i class="mdi mdi-close text-sm" />
          </button>

          <button
            v-if="canCancel(asItem(row))"
            type="button"
            title="Batalkan Permintaan"
            class="inline-flex items-center justify-center p-1.5 text-white bg-gray-500 rounded-lg hover:bg-gray-600 transition"
            @click="openAksi(asItem(row), 'cancel')"
          >
            <i class="mdi mdi-cancel text-sm" />
          </button>

          <!-- Pelaksanaan oleh tim IT: administrator saja. -->
          <button
            v-if="permissions.akses && asItem(row).status === 'approved'"
            type="button"
            title="Tandai Akses Diberikan"
            class="inline-flex items-center justify-center p-1.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            @click="openAksi(asItem(row), 'grant')"
          >
            <i class="mdi mdi-folder-key-outline text-sm" />
          </button>
          <button
            v-if="permissions.akses && (asItem(row).status === 'granted' || asItem(row).status === 'approved')"
            type="button"
            title="Tandai Akses Ditarik"
            class="inline-flex items-center justify-center p-1.5 text-white bg-slate-600 rounded-lg hover:bg-slate-700 transition"
            @click="openAksi(asItem(row), 'revoke')"
          >
            <i class="mdi mdi-folder-remove-outline text-sm" />
          </button>
        </div>
      </template>
      <template #empty>
        <div class="w-full">
          <span class="px-5 py-12 text-center text-gray-400 text-sm">Belum ada permintaan akses folder.</span>
        </div>
      </template>
    </TableExcel>
  </div>

  <!-- ==================== Modal Form Permintaan ==================== -->
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
          <div class="relative bg-white rounded-xl shadow-xl !border !border-gray-300 dark:bg-gray-800 dark:!border-gray-600">
            <div class="flex items-center justify-between p-5 !border-b rounded-t !border-gray-300 dark:!border-gray-700">
              <div>
                <h1 class="text-gray-600 dark:text-gray-300 text-xl font-semibold">Permintaan Akses Folder</h1>
                <p class="text-xs text-gray-400 mt-0.5">
                  Disetujui dua tahapan: atasan departemen Anda, lalu atasan departemen yang dituju.
                </p>
              </div>
              <button
                type="button"
                class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
                @click="dialog.form = false"
              >
                <i class="mdi mdi-close" />
              </button>
            </div>

            <div class="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p v-if="identitasTerkunci" class="md:col-span-2 mt- text-[11px]" :class="formData.departemen ? 'text-gray-400' : 'text-red-600'">
                  <template v-if="formData.departemen">
                    <i class="mdi mdi-lock-outline" /> Nama, NIK, dan departemen terisi otomatis dari data akun Anda.
                  </template>
                  <template v-else>
                    <i class="mdi mdi-alert-circle-outline" /> Data kepegawaian Anda di HR belum lengkap! permintaan belum bisa diajukan.
                    Hubungi Tim IT.
                  </template>
                </p>
                <div>
                  <label for="fs_nama" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nama <span class="text-red-500">*</span></label>
                  <input
                    id="fs_nama"
                    v-model="formData.nama"
                    type="text"
                    maxlength="100"
                    :disabled="identitasTerkunci"
                    :class="[inputClass, 'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed']"
                    placeholder="Nama lengkap"
                  />
                </div>
                <div>
                  <label for="fs_nik" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">NIK <span class="text-red-500">*</span></label>
                  <input
                    id="fs_nik"
                    v-model="formData.nik"
                    type="text"
                    maxlength="30"
                    :disabled="identitasTerkunci"
                    :class="[inputClass, 'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed']"
                    placeholder="Contoh: D.6804"
                  />
                </div>

                <div>
                  <label for="fs_departemen" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Departemen <span class="text-red-500">*</span>
                  </label>
                  <select
                    id="fs_departemen"
                    v-model="formData.departemen"
                    :disabled="identitasTerkunci"
                    :class="[selectClass, 'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed']"
                  >
                    <option value="">- Pilih Departemen -</option>
                    <option v-for="d in departemenList" :key="d" :value="d">{{ d }}</option>
                  </select>
                  <p class="mt-1 text-[11px] text-gray-400">Departemen pemohon.</p>
                </div>


                <div>
                  <label for="fs_departemen_tujuan" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Departemen yang Dituju <span class="text-red-500">*</span>
                  </label>
                  <select id="fs_departemen_tujuan" v-model="formData.departemen_tujuan" :class="selectClass">
                    <option value="">- Pilih Departemen -</option>
                    <option v-for="d in pilihanTujuan" :key="d" :value="d">{{ d }}</option>
                  </select>
                  <p class="mt-1 text-[11px] text-gray-400">Pemilik folder. Tidak boleh sama dengan departemen pemohon.</p>
                </div>
              </div>

              <div>
                <label for="fs_folder" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Folder yang Dituju <span class="text-red-500">*</span>
                </label>
                <input
                  id="fs_folder"
                  v-model="formData.folder_path"
                  type="text"
                  maxlength="255"
                  :class="[inputClass, 'font-mono']"
                  placeholder="\\192.168.10.66\report\HSE\"
                />
                <p class="mt-1 text-[11px] text-gray-400">Salin path dari address bar File Explorer, diawali <span class="font-mono">\\</span>.</p>
              </div>

              <div>
                <label for="fs_alasan" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Alasan / Kebutuhan Akses <span class="text-red-500">*</span>
                </label>
                <textarea
                  id="fs_alasan"
                  v-model="formData.alasan"
                  rows="4"
                  maxlength="2000"
                  :class="inputClass"
                  placeholder="Jelaskan kebutuhan akses ke folder ini..."
                />
              </div>

              <div>
                <span class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Akses <span class="text-red-500">*</span></span>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    class="flex items-center gap-3 rounded-lg !border p-3 cursor-pointer transition"
                    :class="formData.jenis_akses === '3bulan' ? '!border-blue-500 bg-blue-50' : '!border-gray-300 bg-gray-50 hover:bg-gray-100'"
                  >
                    <input v-model="formData.jenis_akses" type="radio" value="3bulan" class="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500" />
                    <span>
                      <span class="block text-md font-medium text-gray-800">3 Bulan</span>
                      <span class="block text-[11px] text-gray-500">Sampai {{ formatTanggal(batasAkses) }}</span>
                    </span>
                  </label>

                  <label
                    class="flex items-start gap-3 rounded-lg !border p-3 cursor-pointer transition"
                    :class="formData.jenis_akses === 'sampai' ? '!border-blue-500 bg-blue-50' : '!border-gray-300 bg-gray-50 hover:bg-gray-100'"
                  >
                    <input v-model="formData.jenis_akses" type="radio" value="sampai" class="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500" />
                    <span class="flex-1">
                      <span class="block text-sm font-medium text-gray-800">Sampai tanggal</span>
                      <input
                        v-model="formData.akses_sampai"
                        type="date"
                        :min="hariIni"
                        :max="batasAkses"
                        :disabled="formData.jenis_akses !== 'sampai'"
                        class="mt-1.5 h-9 w-full px-3 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        @focus="formData.jenis_akses = 'sampai'"
                      />
                      <span class="block mt-1 text-[11px] text-gray-500">Maksimal {{ formatTanggal(batasAkses) }}.</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 p-5 !border-t !border-gray-300 dark:!border-gray-700">
              <button
                type="button"
                class="text-gray-900 bg-white !border !border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:!border-gray-600 dark:hover:bg-gray-700"
                @click="dialog.form = false"
              >
                Batal
              </button>
              <button
                type="button"
                :disabled="isSaving"
                class="flex gap-2 text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                @click="onSubmit"
              >
                {{ isSaving ? 'Mengajukan...' : 'Ajukan Permintaan' }}
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
                <h1 class="text-gray-600 text-xl font-semibold">{{ selected.no_request }}</h1>
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="statusInfo(selected.status).cls">
                  {{ statusInfo(selected.status).label }}
                </span>
                <span v-if="selected.kedaluwarsa" class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-700">
                  Kedaluwarsa
                </span>
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
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div class="rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2">
                  <div class="text-[11px] text-gray-500">Nama</div>
                  <div class="font-semibold text-gray-800">{{ selected.nama }}</div>
                </div>
                <div class="rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2">
                  <div class="text-[11px] text-gray-500">NIK</div>
                  <div class="font-semibold text-gray-800">{{ selected.nik }}</div>
                </div>
                <div class="rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2">
                  <div class="text-[11px] text-gray-500">Departemen</div>
                  <div class="font-semibold text-gray-800">{{ selected.departemen }}</div>
                </div>
                <div class="rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2">
                  <div class="text-[11px] text-gray-500">Dept. Tujuan</div>
                  <div class="font-semibold text-gray-800">{{ selected.departemen_tujuan }}</div>
                </div>
              </div>

              <div>
                <div class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Folder yang Dituju</div>
                <div class="font-mono text-gray-800 rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2 break-all">{{ selected.folder_path }}</div>
              </div>

              <div>
                <div class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Alasan / Kebutuhan Akses</div>
                <div class="text-gray-800 rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2 whitespace-pre-line">{{ selected.alasan }}</div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Akses</div>
                  <div class="text-gray-800">{{ labelAkses(selected) }}</div>
                </div>
                <div>
                  <div class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Diajukan</div>
                  <div class="text-gray-800">
                    {{ formatTanggal(selected.created_at, true) }}
                    <span class="text-gray-500">oleh {{ selected.created_by_name || selected.created_by }}</span>
                  </div>
                </div>
              </div>

              <!-- Riwayat lengkap dari folder_sharing_log. Menggantikan blok jejak per
                   kolom: sejak tolak-sesudah-setuju diperbolehkan, hanya urutan waktu
                   yang bisa menceritakan apa yang sebenarnya terjadi. -->
              <div>
                <div class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Riwayat</div>

                <div v-if="isLoadingDetail && !selected.riwayat" class="text-gray-400 text-xs">Memuat riwayat...</div>
                <div v-else-if="!selected.riwayat" class="text-red-600 text-xs">Riwayat gagal dimuat. Tutup lalu buka lagi detailnya.</div>

                <ol v-else class="relative ms-3 !border-s !border-gray-200">
                  <li v-for="log in selected.riwayat" :key="log.id" class="ms-6 pb-4 last:pb-0">
                    <span
                      class="absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white text-white"
                      :class="aksiRiwayat(log).warna"
                    >
                      <i class="mdi text-xs" :class="aksiRiwayat(log).ikon" />
                    </span>

                    <div class="flex items-baseline justify-between gap-2 flex-wrap">
                      <span class="font-semibold text-gray-800">
                        {{ aksiRiwayat(log).label }}
                        <span v-if="menggugurkan(log)" class="ms-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                          setelah disetujui
                        </span>
                      </span>
                      <time class="text-[11px] text-gray-400">{{ formatTanggal(log.created_at, true) }}</time>
                    </div>
                    <div class="text-xs text-gray-600">
                      oleh {{ pelaku(log) }}<span v-if="log.peran"> &middot; {{ log.peran }}</span>
                    </div>
                    <div class="text-[11px] text-gray-400">
                      <template v-if="log.status_dari">{{ statusInfo(log.status_dari).label }} &rarr; </template>{{ statusInfo(log.status_ke).label }}
                      <span v-if="log.dari_migrasi" title="Diisi dari data lama saat riwayat mulai dicatat, bukan direkam saat kejadian">
                        &middot; dari data lama
                      </span>
                    </div>
                    <div v-if="log.catatan" class="mt-1 text-xs text-gray-700 whitespace-pre-line rounded bg-gray-50 !border !border-gray-200 px-2 py-1">
                      {{ log.catatan }}
                    </div>
                  </li>
                </ol>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 p-5 !border-t !border-gray-300">
              <button
                v-if="selected.bisa_tolak"
                type="button"
                class="text-white bg-red-600 hover:bg-red-700 font-medium rounded-lg text-sm px-5 py-2.5"
                @click="openAksi(selected, 'reject')"
              >
                Tolak
              </button>
              <button
                v-if="selected.bisa_setujui"
                type="button"
                class="text-white bg-emerald-600 hover:bg-emerald-700 font-medium rounded-lg text-sm px-5 py-2.5"
                @click="openAksi(selected, 'approve')"
              >
                Setujui
              </button>
              <button
                v-if="canCancel(selected)"
                type="button"
                class="text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
                @click="openAksi(selected, 'cancel')"
              >
                Batalkan
              </button>
              <button
                v-if="permissions.akses && selected.status === 'approved'"
                type="button"
                class="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-5 py-2.5"
                @click="openAksi(selected, 'grant')"
              >
                Tandai Akses Diberikan
              </button>
              <button
                v-if="permissions.akses && (selected.status === 'granted' || selected.status === 'approved')"
                type="button"
                class="text-white bg-slate-600 hover:bg-slate-700 font-medium rounded-lg text-sm px-5 py-2.5"
                @click="openAksi(selected, 'revoke')"
              >
                Tandai Akses Ditarik
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

  <!-- ==================== Modal Konfirmasi ==================== -->
  <Teleport to="body">
    <div v-if="dialog.aksi && selected && aksiInfo" class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl !border !border-gray-300">
        <div class="p-6 text-center">
          <div
            class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            :class="{
              'bg-emerald-100': aksiInfo.warna === 'emerald',
              'bg-red-100': aksiInfo.warna === 'red',
              'bg-gray-100': aksiInfo.warna === 'gray',
              'bg-blue-100': aksiInfo.warna === 'blue',
              'bg-slate-200': aksiInfo.warna === 'slate'
            }"
          >
            <i
              class="mdi text-4xl"
              :class="[
                aksiInfo.ikon,
                {
                  'text-emerald-600': aksiInfo.warna === 'emerald',
                  'text-red-600': aksiInfo.warna === 'red',
                  'text-gray-600': aksiInfo.warna === 'gray',
                  'text-blue-600': aksiInfo.warna === 'blue',
                  'text-slate-700': aksiInfo.warna === 'slate'
                }
              ]"
            />
          </div>
          <h3 class="mb-2 text-xl font-bold text-gray-800">{{ aksiInfo.judul }}</h3>
          <p class="mb-1 text-gray-500">
            <span class="font-bold text-gray-800">{{ selected.no_request }}</span> &mdash; {{ selected.nama }}
          </p>
          <p class="mb-2 font-mono text-xs text-gray-500 break-all">{{ selected.folder_path }}</p>
          <!-- Lapis 1 masih menyisakan satu persetujuan lagi; jangan sampai approver
               mengira permintaannya langsung selesai. -->
          <p v-if="aksi === 'approve' && selected.tahap === 1" class="mb-4 text-xs text-gray-500">
            Setelah ini masih menunggu persetujuan atasan {{ selected.departemen_tujuan }}.
          </p>
          <p v-else-if="aksi === 'approve'" class="mb-4 text-xs text-gray-500">Persetujuan terakhir, selanjutnya dikerjakan tim IT.</p>
          <!-- Tolak / batal sesudah ada persetujuan menggugurkan persetujuan itu. -->
          <p
            v-else-if="(aksi === 'reject' || aksi === 'cancel') && selected.status !== 'pending'"
            class="mb-4 text-xs text-amber-700 bg-amber-50 !border !border-amber-200 rounded-lg px-3 py-2 text-left"
          >
            <i class="mdi mdi-alert-outline" />
            Permintaan ini sudah disetujui
            {{ selected.status === 'approved' ? 'kedua tahap' : 'tahap 1' }}.
            {{ aksi === 'reject' ? 'Menolaknya' : 'Membatalkannya' }} sekarang membuat persetujuan itu tidak berlaku lagi,
            dan statusnya langsung menjadi {{ aksi === 'reject' ? 'Ditolak' : 'Dibatalkan' }}.
          </p>
          <p v-else class="mb-4" />

          <div class="mb-4 text-left">
            <label for="fs_catatan" class="block mb-1.5 text-xs font-medium text-gray-600">
              <template v-if="aksi === 'reject'">Alasan penolakan <span class="text-red-500">*</span></template>
              <template v-else>Catatan (opsional)</template>
            </label>
            <textarea
              id="fs_catatan"
              v-model="catatan"
              rows="3"
              maxlength="500"
              class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
              :placeholder="aksi === 'reject' ? 'Tuliskan alasan penolakan...' : 'Tambahkan catatan bila perlu...'"
            />
          </div>

          <div class="flex justify-center gap-3">
            <button
              type="button"
              :disabled="isProcessing || (aksi === 'reject' && !catatan.trim())"
              class="text-white font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="{
                'bg-emerald-600 hover:bg-emerald-700': aksiInfo.warna === 'emerald',
                'bg-red-600 hover:bg-red-700': aksiInfo.warna === 'red',
                'bg-gray-600 hover:bg-gray-700': aksiInfo.warna === 'gray',
                'bg-blue-600 hover:bg-blue-700': aksiInfo.warna === 'blue',
                'bg-slate-600 hover:bg-slate-700': aksiInfo.warna === 'slate'
              }"
              @click="onProcess"
            >
              {{ isProcessing ? 'Memproses...' : aksiInfo.tombol }}
            </button>
            <button
              type="button"
              class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg !border !border-gray-300 text-sm font-medium px-5 py-2.5"
              @click="dialog.aksi = false"
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
/* Panah select bawaan plugin form Tailwind terlalu besar -- sama seperti halaman STO. */
.fs-select {
  background-size: 0.85em 0.85em;
  background-position: right 0.625rem center;
}

/* Garis tabel bersama ditimpa di layer `vendor`, lihat catatan Border Tailwind vs
   Vuetify di CLAUDE.md -- di luar layer itu !important milik Vuetify selalu menang. */
@layer vendor {
  .fs-table :deep(thead tr) {
    border-bottom-color: #cbd5e1 !important;
  }

  .fs-table :deep(tbody tr) {
    border-bottom-color: #e5e7eb !important;
  }

  .fs-table :deep(.overflow-x-auto + div) {
    border-top-color: #cbd5e1 !important;
  }
}
</style>
