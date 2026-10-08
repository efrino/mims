<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import StoAksesHeader from '@/components/sto/StoAksesHeader.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { useStoEventStore } from '@/stores/Admin/StoEvent';
import type { StoEventListItem } from '@/types/Admin/StoEvent';

const page = shallowRef({ title: 'Manage Event' });
const breadcrumbs = shallowRef([
  { title: 'Admin', disabled: false, href: '#' },
  { title: 'STO', disabled: false, href: '#' },
  { title: 'Manage Event', disabled: true, href: '#' }
]);

const headerTable: TableColumn[] = [
  { key: 'event_name', label: 'Nama Event' },
  { key: 'start_date', label: 'Tanggal Mulai', align: 'center' },
  { key: 'end_date', label: 'Tanggal Selesai', align: 'center' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'allow_print', label: 'Print Tag', align: 'center' },
  { key: 'total_tim', label: 'Jumlah Tim', align: 'center' },
  { key: 'tag_mode', label: 'Satuan Hitung', align: 'center' },
  { key: 'total_tag', label: 'Total Tag', align: 'center' },
  { key: 'total_used', label: 'Total Used', align: 'center' },
  { key: 'total_cancelled', label: 'Total Cancelled', align: 'center' }
];

const stoEventStore = useStoEventStore();
const {
  fetchAll,
  loadFormEvent,
  onSaveEvent,
  confirmDelete,
  deleteEvent,
  confirmActivate,
  activateEvent,
  confirmClose,
  closeEvent,
  updateFormData,
  mintaSimpan,
  keluarSto
} = stoEventStore;
const {
  nik,
  isLoggingOut,
  dataTable,
  currentEvent,
  formData,
  action,
  dialog,
  deleteData,
  actionTarget,
  isDeleting,
  isSaving,
  isActivating,
  isClosing,
  izinCetakTerkunci,
  totalEventAktif,
  totalTagSemua,
  permissions
} = storeToRefs(stoEventStore);

onMounted(() => {
  fetchAll();
});

function asItem(row: Record<string, unknown>): StoEventListItem {
  return row as unknown as StoEventListItem;
}

function isActiveStatus(status: unknown): boolean {
  return status == 1;
}

const LABEL_MODE: Record<string, string> = {
  sto: 'Tag STO saja',
  ok: 'Tag OK saja',
  both: 'Tag STO & Tag OK'
};

const modeClass = (v: string) =>
  v === 'sto' ? 'bg-sky-100 text-sky-700' : v === 'ok' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600';

// Aturan penamaan event. Dicek di layar saja -- backend menerima nama apa pun,
// jadi ini pengingat, bukan penghalang.
const POLA_NAMA = /^STO\s*-\s*[^-]+-\s*.+$/i;

const namaSesuaiPola = computed(() => POLA_NAMA.test(formData.value.event_name.trim()));

// Ketikan konfirmasi.
const cocokDenganNama = (ketikan: string, nama: string | undefined): boolean => {
  const target = (nama ?? '').trim();

  return target !== '' && ketikan.trim() === target;
};

const deleteConfirmText = ref('');
const isDeleteConfirmed = computed(() => cocokDenganNama(deleteConfirmText.value, deleteData.value.event_name));

const activateConfirmText = ref('');
const isActivateConfirmed = computed(() => cocokDenganNama(activateConfirmText.value, actionTarget.value?.event_name));

const closeConfirmText = ref('');
const isCloseConfirmed = computed(() => cocokDenganNama(closeConfirmText.value, actionTarget.value?.event_name));

// Kosongkan ketikan tiap kali dialog dibuka maupun ditutup.
watch(
  () => dialog.value.delete,
  () => {
    deleteConfirmText.value = '';
  }
);

watch(
  () => dialog.value.activate,
  () => {
    activateConfirmText.value = '';
  }
);

watch(
  () => dialog.value.close,
  () => {
    closeConfirmText.value = '';
  }
);
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-5" />

  <!-- ── Panel atas: info akses + ringkasan ────────────────────────── -->
  <div class="bg-white !border !border-gray-300 rounded-xl shadow-sm mb-4 overflow-hidden">
    <div class="flex items-start justify-between flex-wrap gap-4 px-5 py-4">
      <div class="flex items-stretch flex-wrap gap-y-3">
        <StoAksesHeader :nik="nik" keterangan="Seluruh endpoint STO wajib NIK ber-role admin" :loading="isLoggingOut" @logout="keluarSto" />

        <div class="px-8 !border-l !border-gray-300">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total Event</span>
          <div class="text-lg font-semibold text-gray-800 leading-tight">{{ dataTable.length }}</div>
        </div>
        <div class="px-8 !border-l !border-gray-300">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Event Aktif</span>
          <div class="text-lg font-semibold text-green-700 leading-tight">{{ totalEventAktif }}</div>
        </div>
        <div class="px-8 !border-l !border-gray-300">
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total Tag Tercetak</span>
          <div class="text-lg font-semibold text-gray-800 leading-tight">{{ totalTagSemua }}</div>
        </div>
      </div>

      <button
        v-if="permissions.create"
        type="button"
        class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-4 text-white bg-blue-600 hover:bg-blue-700 transition"
        @click="loadFormEvent('Create')"
      >
        <PlusOutlined />
        Tambah Event
      </button>
    </div>
  </div>

  <!-- ── Current Event Banner ─────────────────────────────────────── -->
  <div
    v-if="currentEvent"
    class="bg-white !border !border-gray-200 rounded-lg shadow-sm px-5 py-3 mb-3 flex items-center justify-between flex-wrap gap-2"
  >
    <div>
      <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Event Berjalan</span>
      <div class="text-sm font-semibold text-gray-800">
        {{ currentEvent.event_name }}
        <span class="text-gray-400 font-normal">({{ currentEvent.start_date }} - {{ currentEvent.end_date || 'sekarang' }})</span>
      </div>
    </div>
    <span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Aktif</span>
  </div>
  <div v-else class="bg-white !border !border-gray-200 rounded-lg shadow-sm px-5 py-3 mb-3">
    <span class="text-sm text-gray-400">Tidak ada STO Event yang sedang berjalan.</span>
  </div>

  <!-- ── Table ─────────────────────────────────────────────────────── -->
  <TableExcel :columns="headerTable" :data="dataTable" thead-class="bg-gray-50">
    <template #cell-status="{ row }">
      <span
        class="px-2 py-0.5 rounded-full text-xs font-semibold"
        :class="isActiveStatus(asItem(row).status) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
      >
        {{ isActiveStatus(asItem(row).status) ? 'Aktif' : 'Tidak Aktif' }}
      </span>
    </template>
    <template #cell-allow_print="{ row }">
      <span
        class="px-2 py-0.5 rounded-full text-xs font-semibold"
        :class="asItem(row).allow_print == 1 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'"
      >
        {{ asItem(row).allow_print == 1 ? 'Dibuka' : 'Ditutup' }}
      </span>
    </template>
    <template #cell-total_tim="{ value }"> {{ value }} Tim </template>
    <template #cell-tag_mode="{ value }">
      <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="modeClass(String(value))">
        {{ LABEL_MODE[String(value)] || '-' }}
      </span>
    </template>
    <template #cell-end_date="{ value }">
      {{ value || '-' }}
    </template>
    <template #actions="{ row }">
      <div class="flex items-center justify-center gap-1.5">
        <button
          v-if="!isActiveStatus(asItem(row).status)"
          @click="confirmActivate(asItem(row))"
          type="button"
          title="Aktifkan Event"
          class="inline-flex items-center justify-center p-1.5 text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
        >
          <i class="mdi mdi-play text-sm" />
        </button>
        <button
          v-else
          @click="confirmClose(asItem(row))"
          type="button"
          title="Tutup Event"
          class="inline-flex items-center justify-center p-1.5 text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition"
        >
          <i class="mdi mdi-stop text-sm" />
        </button>
        <button
          @click="loadFormEvent('Edit', asItem(row))"
          type="button"
          title="Edit Event"
          class="inline-flex items-center justify-center p-1.5 text-white bg-cyan-500 rounded-lg hover:bg-cyan-600 transition"
        >
          <i class="mdi mdi-pencil text-sm" />
        </button>
        <button
          @click="confirmDelete(asItem(row))"
          type="button"
          title="Hapus Event"
          class="inline-flex items-center justify-center p-1.5 text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
        >
          <i class="mdi mdi-delete text-sm" />
        </button>
      </div>
    </template>
    <template #empty>
      <div class="w-full">
        <span class="px-5 py-12 text-center text-gray-400 text-sm">Belum ada STO Event.</span>
      </div>
    </template>
  </TableExcel>

  <!-- ==================== Modal Form Event ==================== -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="dialog.form"
        class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 p-4"
        role="dialog"
        aria-modal="true"
        @click.self="dialog.form = false"
      >
        <div class="relative p-4 w-full max-w-lg max-h-full">
          <div class="flex items-center justify-between p-5 bg-white !border-b !border-gray-200 rounded-t dark:!border-gray-700">
            <h1 class="text-gray-600 dark:text-gray-300 text-xl font-semibold">{{ action }} STO Event</h1>
            <button
              type="button"
              @click="dialog.form = false"
              class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
            >
              <i class="mdi mdi-close" />
            </button>
          </div>
          <div class="relative bg-white dark:bg-gray-800 overflow-y-auto max-h-[70vh]">

            <div class="p-5 space-y-5 ">
              <div>
                <label for="event_name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nama Event</label>
                <input
                  type="text"
                  id="event_name"
                  :value="formData.event_name"
                  @input="updateFormData('event_name', ($event.target as HTMLInputElement).value)"
                  class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:!border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  placeholder="Contoh: STO - ADM SAP - Non GPart"
                  required
                />
                <p class="mt-1.5 text-xs" :class="namaSesuaiPola || !formData.event_name ? 'text-gray-500' : 'text-amber-600'">
                  Format penamaan:
                  <span class="font-semibold text-gray-700">STO - [customer] - [keterangan]</span>. <br>
                  Contoh: <span class="font-semibold text-gray-700">STO - ADM SAP - Non GPart</span>.
                </p>
              </div>
              <div>
                <label for="start_date" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tanggal Mulai</label>
                <input
                  type="date"
                  id="start_date"
                  :value="formData.start_date"
                  @input="updateFormData('start_date', ($event.target as HTMLInputElement).value)"
                  class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:!border-gray-600 dark:placeholder-gray-400 dark:text-white"
                />
              </div>
              <div>
                <span class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Izin Cetak Tag</span>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    v-for="pilihan in [
                      { nilai: 1, judul: 'Dibuka', ket: 'Operator boleh mencetak tag baru', ikon: 'mdi-printer' },
                      { nilai: 0, judul: 'Ditutup', ket: 'Pencetakan tag dihentikan sementara', ikon: 'mdi-printer-off' }
                    ]"
                    :key="pilihan.nilai"
                    type="button"
                    :disabled="izinCetakTerkunci"
                    @click="updateFormData('allow_print', pilihan.nilai as 0 | 1)"
                    :class="[
                      'flex items-start gap-2.5 rounded-lg p-3 text-left transition !border-2',
                      formData.allow_print === pilihan.nilai
                        ? '!border-blue-500 bg-blue-50'
                        : '!border-gray-300 bg-white hover:!border-gray-400',
                      izinCetakTerkunci ? 'opacity-60 cursor-not-allowed' : ''
                    ]"
                  >
                    <i
                      class="mdi text-lg leading-none mt-0.5"
                      :class="[pilihan.ikon, formData.allow_print === pilihan.nilai ? 'text-blue-600' : 'text-gray-400']"
                    />
                    <span>
                      <span class="block text-sm font-semibold text-gray-800">{{ pilihan.judul }}</span>
                      <span class="block text-xs text-gray-500">{{ pilihan.ket }}</span>
                    </span>
                  </button>
                </div>
                <p v-if="izinCetakTerkunci" class="mt-1.5 text-xs text-amber-600">
                  Event ini tidak aktif. Proses cetak tag bisa dibuka kembali setelah event diaktifkan.
                </p>
                <p v-else class="mt-1.5 text-xs text-gray-500">
                  Terpisah dari status event. Menutup pencetakan tidak menghentikan scan maupun laporan.
                </p>
              </div>
              <div>
                <span class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Satuan Hitung</span>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    v-for="pilihan in [
                      { nilai: 'both', judul: 'Keduanya', ket: 'Tag STO dan Tag OK sama-sama dipakai', ikon: 'mdi-check-all' },
                      { nilai: 'sto', judul: 'Tag STO saja', ket: 'Seluruh alur Tag OK ditutup', ikon: 'mdi-tag-outline' },
                      { nilai: 'ok', judul: 'Tag OK saja', ket: 'Pencetakan Tag STO ditutup', ikon: 'mdi-check-decagram-outline' }
                    ]"
                    :key="pilihan.nilai"
                    type="button"
                    @click="updateFormData('tag_mode', pilihan.nilai as 'sto' | 'ok' | 'both')"
                    :class="[
                      'flex items-start gap-2.5 rounded-lg p-3 text-left transition !border-2',
                      formData.tag_mode === pilihan.nilai
                        ? '!border-blue-500 bg-blue-50'
                        : '!border-gray-300 bg-white hover:!border-gray-400'
                    ]"
                  >
                    <i
                      class="mdi text-lg leading-none mt-0.5"
                      :class="[pilihan.ikon, formData.tag_mode === pilihan.nilai ? 'text-blue-600' : 'text-gray-400']"
                    />
                    <span>
                      <span class="block text-sm font-semibold text-gray-800">{{ pilihan.judul }}</span>
                      <span class="block text-xs text-gray-500">{{ pilihan.ket }}</span>
                    </span>
                  </button>
                </div>
              </div>
              <div>
                <span class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Jumlah Tim</span>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    v-for="pilihan in [
                      { nilai: 1, judul: '1 Tim', ket: 'Satu scan mengisi hasil tim A dan B sekaligus' },
                      { nilai: 2, judul: '2 Tim', ket: 'Tim A dan tim B menghitung terpisah lalu dibandingkan' }
                    ]"
                    :key="pilihan.nilai"
                    type="button"
                    @click="updateFormData('total_tim', pilihan.nilai as 1 | 2)"
                    :class="[
                      'flex items-start gap-2.5 rounded-lg p-3 text-left transition !border-2',
                      formData.total_tim === pilihan.nilai
                        ? '!border-blue-500 bg-blue-50'
                        : '!border-gray-300 bg-white hover:!border-gray-400'
                    ]"
                  >
                    <i
                      class="mdi mdi-account-group text-lg leading-none mt-0.5"
                      :class="formData.total_tim === pilihan.nilai ? 'text-blue-600' : 'text-gray-400'"
                    />
                    <span>
                      <span class="block text-sm font-semibold text-gray-800">{{ pilihan.judul }}</span>
                      <span class="block text-xs text-gray-500">{{ pilihan.ket }}</span>
                    </span>
                  </button>
                </div>
                <p v-if="action === 'Edit'" class="mt-1.5 text-xs text-gray-500">
                  Perubahan hanya berlaku untuk scan berikutnya. Tag yang sudah terlanjur dihitung tidak diubah.
                </p>
              </div>
              <div v-if="action === 'Edit'">
                <label for="end_date" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tanggal Selesai</label>
                <input
                  type="date"
                  id="end_date"
                  :value="formData.end_date"
                  @input="updateFormData('end_date', ($event.target as HTMLInputElement).value)"
                  class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:!border-gray-600 dark:placeholder-gray-400 dark:text-white"
                />
              </div>
            </div>

          </div>
          <div class="flex items-center justify-center gap-3 p-5 !border-t bg-white !border-gray-200 rounded-b dark:!border-gray-700">
            <button
              @click="dialog.form = false"
              type="button"
              class="text-gray-900 bg-white !border !border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              @click="mintaSimpan"
              :disabled="isSaving || !formData.event_name"
              type="button"
              class="flex gap-2 text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSaving ? 'Menyimpan...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ============ Modal Konfirmasi Buat Event (reset akses operator) ============ -->
  <Teleport to="body">
    <div v-if="dialog.resetOperator" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-lg bg-white rounded-xl shadow-2xl">
        <div class="p-6">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <i class="mdi mdi-account-multiple-remove-outline text-4xl text-amber-600" />
          </div>
          <h3 class="mb-3 text-center text-xl font-bold text-gray-800">Buat Event Baru</h3>

          <p class="mb-3 text-sm text-gray-600">
            Event <span class="font-semibold text-gray-800">{{ formData.event_name }}</span> akan dibuat. Karena ini
            event baru, pembagian tugas diulang dari nol:
          </p>

          <ul class="mb-4 space-y-1.5 text-sm text-gray-600">
            <li class="flex gap-2">
              <i class="mdi mdi-close-circle-outline text-amber-600 mt-0.5" />
              <span>Seluruh <span class="font-semibold text-gray-800">permissions</span> akun operator dikosongkan.</span>
            </li>
            <li class="flex gap-2">
              <i class="mdi mdi-close-circle-outline text-amber-600 mt-0.5" />
              <span>Seluruh <span class="font-semibold text-gray-800">area</span> akun operator dilepas.</span>
            </li>
            <li class="flex gap-2">
              <i class="mdi mdi-close-circle-outline text-amber-600 mt-0.5" />
              <span><span class="font-semibold text-gray-800">Tim</span> A / B pada akun operator dikosongkan.</span>
            </li>
            <li class="flex gap-2">
              <i class="mdi mdi-check-circle-outline text-emerald-600 mt-0.5" />
              <span>Akun, role, dan perangkatnya tidak disentuh. Akun admin juga tidak.</span>
            </li>
          </ul>

          <p class="mb-6 text-sm text-gray-500">
            Hak aksesnya dibagikan ulang lewat halaman Manage User setelah event ini berjalan.
          </p>

          <div class="flex justify-center gap-3">
            <button
              @click="onSaveEvent"
              :disabled="isSaving"
              type="button"
              class="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSaving ? 'Menyimpan...' : 'Ya, Buat Event' }}
            </button>
            <button
              @click="dialog.resetOperator = false"
              :disabled="isSaving"
              type="button"
              class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg !border !border-gray-200 text-sm font-medium px-5 py-2.5"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ==================== Modal Activate Confirmation ==================== -->
  <Teleport to="body">
    <div v-if="dialog.activate" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
        <div class="p-6 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <i class="mdi mdi-play-circle-outline text-4xl text-green-600" />
          </div>
          <h3 class="mb-2 text-xl font-bold text-gray-800">Aktifkan Event</h3>
          <p class="mb-2 text-lg font-normal text-gray-500">
            Aktifkan event <span class="font-bold text-gray-800">{{ actionTarget?.event_name }}</span
            >?
          </p>
          <p class="mb-3 text-sm text-gray-500">Event yang sedang aktif (jika ada) akan otomatis ditutup.</p>
          <div class="mb-6 text-left">
            <label class="block mb-1.5 text-xs font-medium text-gray-600">
              Ketik <span class="font-bold text-gray-800">{{ actionTarget?.event_name }}</span> untuk konfirmasi
            </label>
            <input
              v-model="activateConfirmText"
              type="text"
              class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5"
              :placeholder="actionTarget?.event_name"
              autocomplete="off"
            />
          </div>
          <div class="flex justify-center gap-3">
            <button
              @click="activateEvent"
              :disabled="isActivating || !isActivateConfirmed"
              type="button"
              class="text-white bg-green-600 hover:bg-green-700 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isActivating ? 'Mengaktifkan...' : 'Ya, Aktifkan' }}
            </button>
            <button
              @click="dialog.activate = false"
              type="button"
              class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg !border !border-gray-200 text-sm font-medium px-5 py-2.5"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ==================== Modal Close Confirmation ==================== -->
  <Teleport to="body">
    <div v-if="dialog.close" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
        <div class="p-6 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <i class="mdi mdi-stop-circle-outline text-4xl text-amber-600" />
          </div>
          <h3 class="mb-2 text-xl font-bold text-gray-800">Tutup Event</h3>
          <p class="mb-3 text-lg font-normal text-gray-500">
            Tutup event <span class="font-bold text-gray-800">{{ actionTarget?.event_name }}</span> sekarang?
          </p>
          <div class="mb-6 text-left">
            <label class="block mb-1.5 text-xs font-medium text-gray-600">
              Ketik <span class="font-bold text-gray-800">{{ actionTarget?.event_name }}</span> untuk konfirmasi
            </label>
            <input
              v-model="closeConfirmText"
              type="text"
              class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-2.5"
              :placeholder="actionTarget?.event_name"
              autocomplete="off"
            />
          </div>
          <div class="flex justify-center gap-3">
            <button
              @click="closeEvent"
              :disabled="isClosing || !isCloseConfirmed"
              type="button"
              class="text-white bg-amber-600 hover:bg-amber-700 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isClosing ? 'Menutup...' : 'Ya, Tutup' }}
            </button>
            <button
              @click="dialog.close = false"
              type="button"
              class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg !border !border-gray-200 text-sm font-medium px-5 py-2.5"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ==================== Modal Delete Confirmation ==================== -->
  <Teleport to="body">
    <div v-if="dialog.delete" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
        <div class="p-6 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <i class="mdi mdi-alert-outline text-4xl text-red-600" />
          </div>
          <h3 class="mb-2 text-xl font-bold text-gray-800">Delete Confirmation</h3>
          <p class="mb-5 text-lg font-normal text-gray-500">
            Apakah Anda yakin ingin menghapus event<br />
            <span class="font-bold text-gray-800">{{ deleteData.event_name }}</span>
          </p>
          <p class="mb-3 text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>
          <div class="mb-6 text-left">
            <label class="block mb-1.5 text-xs font-medium text-gray-600">
              Ketik <span class="font-bold text-gray-800">{{ deleteData.event_name }}</span> untuk konfirmasi
            </label>
            <input
              v-model="deleteConfirmText"
              type="text"
              class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-full p-2.5"
              :placeholder="deleteData.event_name"
              autocomplete="off"
            />
          </div>
          <div class="flex justify-center gap-3">
            <button
              @click="deleteEvent"
              :disabled="isDeleting || !isDeleteConfirmed"
              type="button"
              class="text-white bg-red-600 hover:bg-red-800 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isDeleting ? 'Menghapus...' : 'Ya, Hapus' }}
            </button>
            <button
              @click="dialog.delete = false"
              type="button"
              class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg !border !border-gray-200 text-sm font-medium px-5 py-2.5"
            >
              Tidak, batalkan
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

</template>
