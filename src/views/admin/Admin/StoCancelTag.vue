<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import StoAksesHeader from '@/components/sto/StoAksesHeader.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import { ReloadOutlined } from '@ant-design/icons-vue';
import { useStoCancelTagStore } from '@/stores/Admin/StoCancelTag';
import type { StoTagRow } from '@/types/Admin/StoCancelTag';
import type { StoTagOkRow } from '@/types/Admin/StoTagList';

const page = shallowRef({ title: 'Cancel Tag' });
const breadcrumbs = shallowRef([
  { title: 'Admin', disabled: false, href: '#' },
  { title: 'STO', disabled: false, href: '#' },
  { title: 'Cancel Tag', disabled: true, href: '#' }
]);

const requestColumns: TableColumn[] = [
  { key: 'pilih', label: '', align: 'center', sortable: false, filterable: false, width: '44px' },
  { key: 'id_tag', label: 'ID Tag' },
  { key: 'area', label: 'Area', align: 'center' },
  { key: 'part_number', label: 'Part Number' },
  { key: 'material_description', label: 'Deskripsi', width: '14rem' },
  { key: 'qty', label: 'Qty A / B', align: 'center', sortable: false },
  { key: 'cancel_reason', label: 'Alasan', width: '18rem' },
  { key: 'cancel_requested_by_nik', label: 'Diajukan Oleh', align: 'center' },
  { key: 'cancel_requested_at', label: 'Diajukan', align: 'center' }
];

const requestOkColumns: TableColumn[] = [
  { key: 'pilih', label: '', align: 'center', sortable: false, filterable: false, width: '44px' },
  { key: 'id_tag_ok', label: 'ID Tag OK' },
  { key: 'area', label: 'Area', align: 'center' },
  { key: 'part_number', label: 'Part Number' },
  { key: 'job_number', label: 'Job Number' },
  { key: 'line', label: 'Line' },
  { key: 'qty_kbn', label: 'Qty KBN', align: 'center' },
  { key: 'cancel_reason', label: 'Alasan', width: '18rem' },
  { key: 'canceled_by', label: 'Diajukan Oleh', align: 'center' },
  { key: 'canceled_at', label: 'Diajukan', align: 'center' }
];

const store = useStoCancelTagStore();
const {
  fetchRequests,
  fetchRequestsOk,
  toggleSelectOk,
  toggleSelectAllOk,
  clearSelectionOk,
  confirmDecisionOk,
  confirmBulkDecisionOk,
  muatRingkasanAreaOk,
  bukaKonfirmasiAreaOk,
  submitCancelAreaOk,
  gantiTab,
  muatRingkasanArea,
  bukaKonfirmasiArea,
  tutupKonfirmasiArea,
  submitCancelArea,
  toggleSelect,
  toggleSelectAll,
  clearSelection,
  confirmDecision,
  confirmBulkDecision,
  submitDecision,
  resetDecision,
  openDetail,
  keluarSto
} = store;
const {
  adminNik,
  isLoggingOut,
  tab,
  areaCancel,
  areaOptions,
  eventOptions,
  areaConfirmed,
  areaTidakAdaYangDibatalkan,
  requests,
  requestArea,
  requestEvent,
  requestLimit,
  isLoadingRequests,
  requestsOk,
  requestAreaOk,
  requestEventOk,
  isLoadingRequestsOk,
  selectedOk,
  areaCancelOk,
  selected,
  decisionType,
  decisionIds,
  decisionTarget,
  isDeciding,
  decisionProgress,
  decisionResult,
  detail,
  isLoadingDetail,
  dialog,
  lastError,
  permissions,
  totalRequest,
  allSelected,
  someSelected,
  totalRequestOk,
  allSelectedOk,
  someSelectedOk,
  areaOkConfirmed,
  areaOkTidakAdaYangDibatalkan
} = storeToRefs(store);

onMounted(() => {
  fetchRequests();
});

function asRequest(row: Record<string, unknown>): StoTagRow {
  return row as unknown as StoTagRow;
}

function asRequestOk(row: Record<string, unknown>): StoTagOkRow {
  return row as unknown as StoTagOkRow;
}


// <option value> selalu string, sedangkan idEvent bertipe number|null.
const eventTerpilih = computed({
  get: () => (areaCancel.value.idEvent === null ? '' : String(areaCancel.value.idEvent)),
  set: (v: string) => {
    areaCancel.value.idEvent = v === '' ? null : Number(v);
  }
});

// <option value> selalu string, sedangkan id event bertipe number|null.
const eventTerpilihOk = computed({
  get: () => (areaCancelOk.value.idEvent === null ? '' : String(areaCancelOk.value.idEvent)),
  set: (v: string) => {
    areaCancelOk.value.idEvent = v === '' ? null : Number(v);
  }
});

const eventRequest = computed({
  get: () => (requestEvent.value === null ? '' : String(requestEvent.value)),
  set: (v: string) => {
    requestEvent.value = v === '' ? null : Number(v);
  }
});

const eventRequestOk = computed({
  get: () => (requestEventOk.value === null ? '' : String(requestEventOk.value)),
  set: (v: string) => {
    requestEventOk.value = v === '' ? null : Number(v);
  }
});

/**
 * Dialog konfirmasi dan dialog hasil dipakai bergantian oleh tab Cancel Tag
 * STO per Area dan tab Cancel Tag OK per Area. Alias di bawah menunjuk ke sisi
 * yang tabnya sedang terbuka, jadi isinya tidak perlu digandakan.
 */
const sisiOkAktif = computed(() => tab.value === 'areaOk');

const areaAktif = computed(() => (sisiOkAktif.value ? areaCancelOk.value : areaCancel.value));

const areaAktifConfirmed = computed(() => (sisiOkAktif.value ? areaOkConfirmed.value : areaConfirmed.value));

const satuanAktif = computed(() => (sisiOkAktif.value ? 'tag OK' : 'tag'));

function submitAreaAktif() {
  if (sisiOkAktif.value) {
    void submitCancelAreaOk();
  } else {
    void submitCancelArea();
  }
}

const namaEventTerpilih = computed(() => eventOptions.value.find((e) => e.id_event === areaAktif.value.idEvent)?.event_name ?? '-');

const decisionLabel = computed(() => (decisionType.value === 'approve' ? 'Setujui' : 'Tolak'));
const isBulk = computed(() => decisionIds.value.length > 1);

const detailRows = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return [
    { label: 'ID Tag', value: d.id_tag },
    { label: 'Area', value: d.area },
    { label: 'Part Number', value: d.part_number },
    { label: 'Job Number', value: d.job_number },
    { label: 'Deskripsi', value: d.material_description },
    { label: 'Type / Model', value: [d.type, d.model].filter(Boolean).join(' / ') || '-' },
    { label: 'Customer / Plant', value: [d.customer, d.plant].filter(Boolean).join(' / ') || '-' },
    { label: 'Tim A', value: d.nik_a ? `${d.nik_a} - qty ${d.qty_a} (${d.updated_a || '-'})` : 'Belum discan' },
    { label: 'Tim B', value: d.nik_b ? `${d.nik_b} - qty ${d.qty_b} (${d.updated_b || '-'})` : 'Belum discan' },
    { label: 'Alasan', value: d.cancel_reason || '-' },
    { label: 'Diajukan Oleh', value: d.cancel_requested_by_nik ? `${d.cancel_requested_by_nik} (${d.cancel_requested_at || '-'})` : '-' },
    { label: 'Dibuat', value: d.created_at || '-' }
  ];
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-5" />

  <!-- ══ Tab ══ -->
  <div class="flex items-center gap-1 mb-4 !border-b !border-gray-300 overflow-x-auto">
    <button
      v-for="t in [
        { id: 'requests', label: 'Permintaan Cancel Tag STO', ikon: 'mdi-clipboard-check-outline', jml: totalRequest },
        { id: 'area', label: 'Cancel Tag STO per Area', ikon: 'mdi-select-group', jml: 0 },
        { id: 'requestsOk', label: 'Permintaan Cancel Tag OK', ikon: 'mdi-clipboard-check-multiple-outline', jml: totalRequestOk },
        { id: 'areaOk', label: 'Cancel Tag OK per Area', ikon: 'mdi-select-multiple', jml: 0 }
      ]"
      :key="t.id"
      type="button"
      class="relative -mb-px inline-flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-semibold transition"
      :class="
        tab === t.id
          ? 'text-blue-700 !border-b-2 !border-blue-600'
          : 'text-gray-500 hover:text-gray-700 !border-b-2 !border-transparent'
      "
      @click="gantiTab(t.id as 'requests' | 'area' | 'requestsOk' | 'areaOk')"
    >
      <i class="mdi" :class="t.ikon" />
      {{ t.label }}
      <span v-if="t.jml > 0" class="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
        {{ t.jml }}
      </span>
    </button>
  </div>

  <!-- ════════ TAB 1: Permintaan Cancel (halaman lama, tidak diubah) ════════ -->
  <div v-show="tab === 'requests'">
    <!-- ── Panel atas: info akses ────────────────────────────────────── -->
    <div class="bg-white !border !border-gray-300 rounded-xl shadow-sm mb-4 overflow-hidden">
      <div class="flex items-start justify-between flex-wrap gap-4 px-5 py-4">
        <div class="flex items-stretch flex-wrap gap-y-3">
          <StoAksesHeader
            :nik="adminNik"
            keterangan="Acc / tolak pengajuan wajib NIK ber-role admin"
            :loading="isLoggingOut"
            @logout="keluarSto"
          />

          <div class="px-8 !border-l !border-gray-300">
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Menunggu Keputusan</span>
            <div class="text-lg font-semibold text-amber-700 leading-tight">{{ totalRequest }}</div>
          </div>
          <div class="px-8 !border-l !border-gray-300">
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Terpilih</span>
            <div class="text-lg font-semibold text-gray-800 leading-tight">{{ selected.length }}</div>
          </div>
        </div>

        <span v-if="lastError" class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 !border !border-red-200">
          {{ lastError }}
        </span>
      </div>

      <!-- Filter -->
      <div class="flex items-center gap-2 flex-wrap px-5 py-3 !border-t !border-gray-300 bg-gray-50">
        <input
          v-model="requestArea"
          type="text"
          placeholder="Filter area (mis. IFPD)"
          class="w-56 h-9 px-3 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
          @keydown.enter="fetchRequests"
        />
        <select
          v-model="eventRequest"
          class="sto-select w-72 h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
          @change="fetchRequests"
        >
          <option value="">Semua event (termasuk STO lama)</option>
          <option v-for="e in eventOptions" :key="e.id_event" :value="String(e.id_event)">
            {{ e.event_name }}{{ e.status === 1 ? ' (aktif)' : '' }}
          </option>
        </select>
        <select
          v-model.number="requestLimit"
          class="sto-select h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
          @change="fetchRequests"
        >
          <option :value="50">50 baris</option>
          <option :value="100">100 baris</option>
          <option :value="250">250 baris</option>
          <option :value="500">500 baris</option>
        </select>
        <button
          type="button"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition"
          @click="fetchRequests"
        >
          <ReloadOutlined />
          Terapkan
        </button>
      </div>
    </div>

    <!-- ── Aksi massal ───────────────────────────────────────────────── -->
    <div class="bg-white !border !border-gray-300 rounded-xl shadow-sm mb-3 px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div class="text-sm text-gray-600">
        <span class="font-semibold text-gray-800">{{ selected.length }}</span> dari {{ totalRequest }} pengajuan terpilih.
        <span class="text-[11px] text-gray-400">Centang minimal satu baris untuk acc / tolak sekaligus.</span>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          :disabled="totalRequest === 0"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
          @click="toggleSelectAll"
        >
          <i class="mdi" :class="allSelected ? 'mdi-checkbox-multiple-blank-outline' : 'mdi-checkbox-multiple-marked-outline'" />
          {{ allSelected ? 'Batal Pilih Semua' : 'Pilih Semua' }}
        </button>
        <button
          v-if="someSelected"
          type="button"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition"
          @click="clearSelection"
        >
          Kosongkan
        </button>
        <button
          v-if="permissions.approve"
          type="button"
          :disabled="selected.length === 0"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-4 text-white bg-emerald-600 !border !border-emerald-600 hover:bg-emerald-700 hover:!border-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          @click="confirmBulkDecision('approve')"
        >
          <i class="mdi mdi-check" />
          Setujui {{ selected.length }} Pengajuan
        </button>
        <button
          v-if="permissions.approve"
          type="button"
          :disabled="selected.length === 0"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-4 text-white bg-red-600 !border !border-red-600 hover:bg-red-700 hover:!border-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          @click="confirmBulkDecision('reject')"
        >
          <i class="mdi mdi-close" />
          Tolak {{ selected.length }} Pengajuan
        </button>
      </div>
    </div>

    <!-- ── Tabel pengajuan ───────────────────────────────────────────── -->
    <div class="sto-table rounded-lg overflow-hidden !border !border-gray-300">
      <TableExcel :columns="requestColumns" :data="requests" :loading="isLoadingRequests" thead-class="bg-gray-50">
        <template #header-pilih>
          <input
            type="checkbox"
            class="w-4 h-4 rounded text-blue-600 !border !border-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            :checked="allSelected"
            :indeterminate="someSelected && !allSelected"
            :disabled="totalRequest === 0"
            title="Pilih semua pengajuan"
            @change="toggleSelectAll"
          />
        </template>
        <template #cell-pilih="{ row }">
          <input
            type="checkbox"
            class="w-4 h-4 rounded text-blue-600 !border !border-gray-400 cursor-pointer"
            :checked="selected.includes(asRequest(row).id_tag)"
            title="Pilih pengajuan ini"
            @change="toggleSelect(asRequest(row).id_tag)"
          />
        </template>
        <template #cell-qty="{ row }"> {{ asRequest(row).qty_a }} / {{ asRequest(row).qty_b }} </template>
        <template #cell-material_description="{ value }">
          <span class="block max-w-[14rem] truncate" :title="String(value || '')">{{ value || '-' }}</span>
        </template>
        <template #cell-cancel_reason="{ value }">
          <span class="block max-w-[18rem] truncate" :title="String(value || '')">{{ value || '-' }}</span>
        </template>
        <template #actions="{ row }">
          <div class="flex items-center justify-center gap-1.5">
            <button
              type="button"
              title="Detail tag"
              class="inline-flex items-center justify-center p-1.5 text-white bg-gray-500 rounded-lg hover:bg-gray-600 transition"
              @click="openDetail(asRequest(row).id_tag)"
            >
              <i class="mdi mdi-eye-outline text-sm" />
            </button>
            <button
              v-if="permissions.approve"
              type="button"
              title="Setujui pembatalan"
              class="inline-flex items-center justify-center p-1.5 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
              @click="confirmDecision(asRequest(row), 'approve')"
            >
              <i class="mdi mdi-check text-sm" />
            </button>
            <button
              v-if="permissions.approve"
              type="button"
              title="Tolak pengajuan"
              class="inline-flex items-center justify-center p-1.5 text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
              @click="confirmDecision(asRequest(row), 'reject')"
            >
              <i class="mdi mdi-close text-sm" />
            </button>
          </div>
        </template>
        <template #empty>
          <div class="w-full">
            <span class="px-5 py-12 text-center text-gray-400 text-sm">Tidak ada pengajuan pembatalan yang menunggu keputusan.</span>
          </div>
        </template>
      </TableExcel>
    </div>
  </div>

  <!-- ══════════════════ TAB 2: Cancel Massal per Area ══════════════════ -->
  <div v-show="tab === 'area'">
    <div class="bg-white !border !border-gray-300 rounded-xl shadow-sm mb-4 overflow-hidden">
      <div class="px-5 py-4 !border-b !border-gray-300">
        <h3 class="text-base font-bold text-gray-800">Batalkan Seluruh Tag yang Belum di Scan</h3>
        <p class="mt-1 text-sm text-gray-500">
          Seluruh tag di satu area yang belum di scan tim A maupun tim B ditandai dibatalkan sekaligus. Tag yang sudah discan
          <span class="font-semibold text-gray-700">tidak ikut</span> di cancel.
        </p>
      </div>

      <!-- Pilihan area & event -->
      <div class="flex items-end gap-3 flex-wrap px-5 py-4 bg-gray-50 !border-b !border-gray-300">
        <div>
          <label class="block mb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Area</label>
          <select
            v-model="areaCancel.area"
            class="sto-select w-56 h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
            @change="muatRingkasanArea"
          >
            <option value="">— pilih area —</option>
            <option v-for="a in areaOptions" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>

        <div>
          <label class="block mb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Event</label>
          <select
            v-model="eventTerpilih"
            class="sto-select w-72 h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
            @change="muatRingkasanArea"
          >
            <option value="">Semua event (termasuk STO lama)</option>
            <option v-for="e in eventOptions" :key="e.id_event" :value="String(e.id_event)">
              {{ e.event_name }}{{ e.status === 1 ? ' (aktif)' : '' }}
            </option>
          </select>
        </div>

        <button
          type="button"
          :disabled="areaCancel.area === '' || areaCancel.isLoadingPreview"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
          @click="muatRingkasanArea"
        >
          <ReloadOutlined />
          Hitung Ulang
        </button>
      </div>

      <!-- Ringkasan -->
      <div class="p-5">
        <div v-if="areaCancel.area === ''" class="py-10 text-center text-sm text-gray-400">
          Pilih area lebih dulu untuk melihat berapa tag yang akan dibatalkan.
        </div>

        <div v-else-if="areaCancel.isLoadingPreview" class="py-10 text-center text-sm text-gray-400">
          <i class="mdi mdi-loading mdi-spin text-2xl block mb-2 text-blue-400" />
          Menghitung...
        </div>

        <template v-else-if="areaCancel.ringkasan">
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div class="rounded-lg !border !border-gray-300 bg-white px-4 py-3">
              <div class="text-[11px] text-gray-500 uppercase tracking-wide">Total Tag</div>
              <div class="text-xl font-semibold text-gray-800">{{ areaCancel.ringkasan.total_tag }}</div>
            </div>
            <div class="rounded-lg !border !border-gray-300 bg-white px-4 py-3">
              <div class="text-[11px] text-gray-500 uppercase tracking-wide">Sudah Discan</div>
              <div class="text-xl font-semibold text-emerald-700">{{ areaCancel.ringkasan.total_sudah_scan }}</div>
            </div>
            <div class="rounded-lg !border !border-gray-300 bg-white px-4 py-3">
              <div class="text-[11px] text-gray-500 uppercase tracking-wide">Belum Discan</div>
              <div class="text-xl font-semibold text-amber-700">{{ areaCancel.ringkasan.total_belum_scan }}</div>
            </div>
            <div class="rounded-lg !border !border-gray-300 bg-white px-4 py-3">
              <div class="text-[11px] text-gray-500 uppercase tracking-wide">Sudah di Cancel</div>
              <div class="text-xl font-semibold text-gray-600">{{ areaCancel.ringkasan.total_dibatalkan }}</div>
            </div>
            <div class="rounded-lg !border !border-red-300 bg-red-50 px-4 py-3">
              <div class="text-[11px] text-red-600 uppercase tracking-wide font-semibold">Akan di Cnacel</div>
              <div class="text-xl font-bold text-red-700">{{ areaCancel.ringkasan.akan_dibatalkan }}</div>
            </div>
          </div>

          <div v-if="areaCancel.contoh.length > 0" class="mt-5">
            <div class="mb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Sample tag yang akan di cancel</div>
            <div class="rounded-lg !border !border-gray-300 overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-gray-600">
                  <tr class="!border-b !border-gray-300">
                    <th class="px-3 py-2 text-left font-semibold">ID Tag</th>
                    <th class="px-3 py-2 text-left font-semibold">Part Number</th>
                    <th class="px-3 py-2 text-left font-semibold">Job Number</th>
                    <th class="px-3 py-2 text-left font-semibold">Deskripsi</th>
                    <th class="px-3 py-2 text-left font-semibold">Dibuat</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in areaCancel.contoh" :key="c.id_tag" class="!border-b !border-gray-200 last:!border-b-0">
                    <td class="px-3 py-2 font-medium text-gray-800">{{ c.id_tag }}</td>
                    <td class="px-3 py-2 text-gray-700">{{ c.part_number || '-' }}</td>
                    <td class="px-3 py-2 text-gray-700">{{ c.job_number || '-' }}</td>
                    <td class="px-3 py-2 text-gray-600">
                      <span class="block max-w-[18rem] truncate" :title="c.material_description">{{ c.material_description || '-' }}</span>
                    </td>
                    <td class="px-3 py-2 text-gray-500">{{ c.created_at || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mt-5 flex items-center justify-between gap-4 flex-wrap">
            <p class="text-xs text-gray-500">
              Dari {{ areaCancel.ringkasan.total_belum_scan }} tag yang belum di scan,
              <span class="font-semibold text-gray-700">{{ areaCancel.ringkasan.akan_dibatalkan }}</span> di antaranya belum berstatus batal — hanya itu yang akan berubah.
            </p>
            <button
              v-if="permissions.approve"
              type="button"
              :disabled="areaTidakAdaYangDibatalkan || areaCancel.isCanceling"
              class="inline-flex items-center gap-2 h-10 font-semibold rounded-lg text-sm px-5 text-white bg-red-600 !border !border-red-600 hover:bg-red-700 hover:!border-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              @click="bukaKonfirmasiArea"
            >
              <i class="mdi mdi-tag-off-outline" />
              Cancel {{ areaCancel.ringkasan.akan_dibatalkan }} Tag
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>


  <!-- ════════ TAB 3: Permintaan Cancel Tag OK ════════ -->
  <div v-show="tab === 'requestsOk'">
    <!-- ── Panel atas: info akses ────────────────────────────────────── -->
    <div class="bg-white !border !border-gray-300 rounded-xl shadow-sm mb-4 overflow-hidden">
      <div class="flex items-start justify-between flex-wrap gap-4 px-5 py-4">
        <div class="flex items-stretch flex-wrap gap-y-3">
          <StoAksesHeader
            :nik="adminNik"
            keterangan="Acc / tolak pengajuan wajib NIK ber-role admin"
            :loading="isLoggingOut"
            @logout="keluarSto"
          />

          <div class="px-8 !border-l !border-gray-300">
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Menunggu Keputusan</span>
            <div class="text-lg font-semibold text-amber-700 leading-tight">{{ totalRequestOk }}</div>
          </div>
          <div class="px-8 !border-l !border-gray-300">
            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Terpilih</span>
            <div class="text-lg font-semibold text-gray-800 leading-tight">{{ selectedOk.length }}</div>
          </div>
        </div>

        <span v-if="lastError" class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 !border !border-red-200">
          {{ lastError }}
        </span>
      </div>

      <!-- Filter -->
      <div class="flex items-center gap-2 flex-wrap px-5 py-3 !border-t !border-gray-300 bg-gray-50">
        <input
          v-model="requestAreaOk"
          type="text"
          placeholder="Filter area (mis. IFPD)"
          class="w-56 h-9 px-3 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
          @keydown.enter="fetchRequestsOk"
        />
        <select
          v-model="eventRequestOk"
          class="sto-select w-72 h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
          @change="fetchRequestsOk"
        >
          <option value="">Semua event (termasuk STO lama)</option>
          <option v-for="e in eventOptions" :key="e.id_event" :value="String(e.id_event)">
            {{ e.event_name }}{{ e.status === 1 ? ' (aktif)' : '' }}
          </option>
        </select>
        <button
          type="button"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition"
          @click="fetchRequestsOk"
        >
          <ReloadOutlined />
          Terapkan
        </button>
      </div>
    </div>

    <!-- ── Aksi massal ───────────────────────────────────────────────── -->
    <div class="bg-white !border !border-gray-300 rounded-xl shadow-sm mb-3 px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div class="text-sm text-gray-600">
        <span class="font-semibold text-gray-800">{{ selectedOk.length }}</span> dari {{ totalRequestOk }} pengajuan terpilih.
        <span class="text-[11px] text-gray-400">Centang minimal satu baris untuk acc / tolak sekaligus.</span>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          :disabled="totalRequestOk === 0"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
          @click="toggleSelectAllOk"
        >
          <i class="mdi" :class="allSelectedOk ? 'mdi-checkbox-multiple-blank-outline' : 'mdi-checkbox-multiple-marked-outline'" />
          {{ allSelectedOk ? 'Batal Pilih Semua' : 'Pilih Semua' }}
        </button>
        <button
          v-if="someSelectedOk"
          type="button"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition"
          @click="clearSelectionOk"
        >
          Kosongkan
        </button>
        <button
          v-if="permissions.approve"
          type="button"
          :disabled="selectedOk.length === 0"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-4 text-white bg-emerald-600 !border !border-emerald-600 hover:bg-emerald-700 hover:!border-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          @click="confirmBulkDecisionOk('approve')"
        >
          <i class="mdi mdi-check" />
          Setujui {{ selectedOk.length }} Pengajuan
        </button>
        <button
          v-if="permissions.approve"
          type="button"
          :disabled="selectedOk.length === 0"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-4 text-white bg-red-600 !border !border-red-600 hover:bg-red-700 hover:!border-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          @click="confirmBulkDecisionOk('reject')"
        >
          <i class="mdi mdi-close" />
          Tolak {{ selectedOk.length }} Pengajuan
        </button>
      </div>
    </div>

    <!-- ── Tabel pengajuan ───────────────────────────────────────────── -->
    <div class="sto-table rounded-lg overflow-hidden !border !border-gray-300">
      <TableExcel :columns="requestOkColumns" :data="requestsOk" :loading="isLoadingRequestsOk" thead-class="bg-gray-50">
        <template #header-pilih>
          <input
            type="checkbox"
            class="w-4 h-4 rounded text-blue-600 !border !border-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            :checked="allSelectedOk"
            :indeterminate="someSelectedOk && !allSelectedOk"
            :disabled="totalRequestOk === 0"
            title="Pilih semua pengajuan"
            @change="toggleSelectAllOk"
          />
        </template>
        <template #cell-pilih="{ row }">
          <input
            type="checkbox"
            class="w-4 h-4 rounded text-blue-600 !border !border-gray-400 cursor-pointer"
            :checked="selectedOk.includes(asRequestOk(row).id_tag_ok)"
            title="Pilih pengajuan ini"
            @change="toggleSelectOk(asRequestOk(row).id_tag_ok)"
          />
        </template>
        <template #cell-qty_kbn="{ value }"> {{ value || '-' }} </template>
        <template #cell-line="{ value }">
          <span class="block max-w-[12rem] truncate" :title="String(value || '')">{{ String(value || '').trim() || '-' }}</span>
        </template>
        <template #cell-cancel_reason="{ value }">
          <span class="block max-w-[18rem] truncate" :title="String(value || '')">{{ value || '-' }}</span>
        </template>
        <template #actions="{ row }">
          <div class="flex items-center justify-center gap-1.5">
            <button
              v-if="permissions.approve"
              type="button"
              title="Setujui pembatalan"
              class="inline-flex items-center justify-center p-1.5 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
              @click="confirmDecisionOk(asRequestOk(row).id_tag_ok, 'approve')"
            >
              <i class="mdi mdi-check text-sm" />
            </button>
            <button
              v-if="permissions.approve"
              type="button"
              title="Tolak pengajuan"
              class="inline-flex items-center justify-center p-1.5 text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
              @click="confirmDecisionOk(asRequestOk(row).id_tag_ok, 'reject')"
            >
              <i class="mdi mdi-close text-sm" />
            </button>
          </div>
        </template>
        <template #empty>
          <div class="w-full">
            <span class="px-5 py-12 text-center text-gray-400 text-sm">Tidak ada pengajuan pembatalan tag OK yang menunggu keputusan.</span>
          </div>
        </template>
      </TableExcel>
    </div>
  </div>


  <!-- ══════════════════ TAB 4: Cancel Tag OK per Area ══════════════════ -->
  <div v-show="tab === 'areaOk'">
    <div class="bg-white !border !border-gray-300 rounded-xl shadow-sm mb-4 overflow-hidden">
      <div class="px-5 py-4 !border-b !border-gray-300">
        <h3 class="text-base font-bold text-gray-800">Batalkan Seluruh Tag OK yang Belum di Scan</h3>
        <p class="mt-1 text-sm text-gray-500">
          Seluruh tag OK di satu area yang belum dihitung ditandai dibatalkan sekaligus. Tag OK yang sudah dihitung
          <span class="font-semibold text-gray-700">tidak ikut</span> di cancel.
        </p>
      </div>

      <!-- Pilihan area & event -->
      <div class="flex items-end gap-3 flex-wrap px-5 py-4 bg-gray-50 !border-b !border-gray-300">
        <div>
          <label class="block mb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Area</label>
          <select
            v-model="areaCancelOk.area"
            class="sto-select w-56 h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
            @change="muatRingkasanAreaOk"
          >
            <option value="">— pilih area —</option>
            <option v-for="a in areaOptions" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>

        <div>
          <label class="block mb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Event</label>
          <select
            v-model="eventTerpilihOk"
            class="sto-select w-72 h-9 pl-3 pr-9 text-sm !border !border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:!border-blue-400"
            @change="muatRingkasanAreaOk"
          >
            <option value="">Semua event (termasuk STO lama)</option>
            <option v-for="e in eventOptions" :key="e.id_event" :value="String(e.id_event)">
              {{ e.event_name }}{{ e.status === 1 ? ' (aktif)' : '' }}
            </option>
          </select>
        </div>

        <button
          type="button"
          :disabled="areaCancelOk.area === '' || areaCancelOk.isLoadingPreview"
          class="inline-flex items-center gap-2 h-9 font-medium rounded-lg text-sm px-3.5 text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 hover:!border-gray-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
          @click="muatRingkasanAreaOk"
        >
          <ReloadOutlined />
          Hitung Ulang
        </button>
      </div>

      <!-- Ringkasan -->
      <div class="p-5">
        <div v-if="areaCancelOk.area === ''" class="py-10 text-center text-sm text-gray-400">
          Pilih area lebih dulu untuk melihat berapa tag yang akan dibatalkan.
        </div>

        <div v-else-if="areaCancelOk.isLoadingPreview" class="py-10 text-center text-sm text-gray-400">
          <i class="mdi mdi-loading mdi-spin text-2xl block mb-2 text-blue-400" />
          Menghitung...
        </div>

        <template v-else-if="areaCancelOk.ringkasan">
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div class="rounded-lg !border !border-gray-300 bg-white px-4 py-3">
              <div class="text-[11px] text-gray-500 uppercase tracking-wide">Total Tag</div>
              <div class="text-xl font-semibold text-gray-800">{{ areaCancelOk.ringkasan.total_tag }}</div>
            </div>
            <div class="rounded-lg !border !border-gray-300 bg-white px-4 py-3">
              <div class="text-[11px] text-gray-500 uppercase tracking-wide">Sudah Discan</div>
              <div class="text-xl font-semibold text-emerald-700">{{ areaCancelOk.ringkasan.total_sudah_scan }}</div>
            </div>
            <div class="rounded-lg !border !border-gray-300 bg-white px-4 py-3">
              <div class="text-[11px] text-gray-500 uppercase tracking-wide">Belum Discan</div>
              <div class="text-xl font-semibold text-amber-700">{{ areaCancelOk.ringkasan.total_belum_scan }}</div>
            </div>
            <div class="rounded-lg !border !border-gray-300 bg-white px-4 py-3">
              <div class="text-[11px] text-gray-500 uppercase tracking-wide">Sudah di Cancel</div>
              <div class="text-xl font-semibold text-gray-600">{{ areaCancelOk.ringkasan.total_dibatalkan }}</div>
            </div>
            <div class="rounded-lg !border !border-red-300 bg-red-50 px-4 py-3">
              <div class="text-[11px] text-red-600 uppercase tracking-wide font-semibold">Akan di Cnacel</div>
              <div class="text-xl font-bold text-red-700">{{ areaCancelOk.ringkasan.akan_dibatalkan }}</div>
            </div>
          </div>

          <div v-if="areaCancelOk.contoh.length > 0" class="mt-5">
            <div class="mb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Sample tag yang akan di cancel</div>
            <div class="rounded-lg !border !border-gray-300 overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-gray-600">
                  <tr class="!border-b !border-gray-300">
                    <th class="px-3 py-2 text-left font-semibold">ID Tag</th>
                    <th class="px-3 py-2 text-left font-semibold">Part Number</th>
                    <th class="px-3 py-2 text-left font-semibold">Job Number</th>
                    <th class="px-3 py-2 text-left font-semibold">Deskripsi</th>
                    <th class="px-3 py-2 text-left font-semibold">Dibuat</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in areaCancelOk.contoh" :key="c.id_tag" class="!border-b !border-gray-200 last:!border-b-0">
                    <td class="px-3 py-2 font-medium text-gray-800">{{ c.id_tag }}</td>
                    <td class="px-3 py-2 text-gray-700">{{ c.part_number || '-' }}</td>
                    <td class="px-3 py-2 text-gray-700">{{ c.job_number || '-' }}</td>
                    <td class="px-3 py-2 text-gray-600">
                      <span class="block max-w-[18rem] truncate" :title="c.material_description">{{ c.material_description || '-' }}</span>
                    </td>
                    <td class="px-3 py-2 text-gray-500">{{ c.created_at || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mt-5 flex items-center justify-between gap-4 flex-wrap">
            <p class="text-xs text-gray-500">
              Dari {{ areaCancelOk.ringkasan.total_belum_scan }} tag yang belum di scan,
              <span class="font-semibold text-gray-700">{{ areaCancelOk.ringkasan.akan_dibatalkan }}</span> di antaranya belum berstatus batal — hanya itu yang akan berubah.
            </p>
            <button
              v-if="permissions.approve"
              type="button"
              :disabled="areaOkTidakAdaYangDibatalkan || areaCancelOk.isCanceling"
              class="inline-flex items-center gap-2 h-10 font-semibold rounded-lg text-sm px-5 text-white bg-red-600 !border !border-red-600 hover:bg-red-700 hover:!border-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              @click="bukaKonfirmasiAreaOk"
            >
              <i class="mdi mdi-tag-off-outline" />
              Cancel {{ areaCancelOk.ringkasan.akan_dibatalkan }} Tag
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>


  <!-- ==================== Modal Konfirmasi Cancel Massal ==================== -->
  <Teleport to="body">
    <div v-if="dialog.areaConfirm" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-lg bg-white rounded-xl shadow-2xl !border !border-gray-300">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
              <i class="mdi mdi-alert-outline text-2xl text-red-600" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-800">Batalkan Massal</h3>
              <p class="text-sm text-gray-500">Tindakan ini mengubah banyak baris sekaligus.</p>
            </div>
          </div>

          <div class="mb-4 rounded-lg !border !border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span class="font-bold">{{ areaAktif.ringkasan?.akan_dibatalkan ?? 0 }} {{ satuanAktif }}</span> di area
            <span class="font-bold">{{ areaAktif.area }}</span>
            <template v-if="areaAktif.idEvent !== null">
              pada event <span class="font-semibold">{{ namaEventTerpilih }}</span>
            </template>
            <template v-else> pada <span class="font-semibold">seluruh event</span> </template>
            akan ditandai dibatalkan.
          </div>

          <label class="block mb-1 text-sm font-medium text-gray-700">
            Ketik <span class="font-bold text-gray-900">{{ areaAktif.area }}</span> untuk menegaskan
          </label>
          <input
            v-model="areaAktif.konfirmasi"
            type="text"
            :placeholder="areaAktif.area"
            autocomplete="off"
            class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-red-500 focus:!border-red-500 block w-full p-2.5 mb-5"
            @keydown.enter="areaAktifConfirmed && submitAreaAktif()"
          />

          <div class="flex justify-end gap-3">
            <button
              type="button"
              :disabled="areaAktif.isCanceling"
              class="text-gray-500 bg-white hover:bg-gray-100 rounded-lg !border !border-gray-300 text-sm font-medium px-5 py-2.5 disabled:opacity-50"
              @click="tutupKonfirmasiArea"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="!areaAktifConfirmed || areaAktif.isCanceling"
              class="text-white bg-red-600 hover:bg-red-700 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="submitAreaAktif"
            >
              {{ areaAktif.isCanceling ? 'Memproses...' : 'Ya, Batalkan' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ==================== Modal Hasil Cancel Massal ==================== -->
  <Teleport to="body">
    <div v-if="dialog.areaResult && areaAktif.hasil" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-lg bg-white rounded-xl shadow-2xl !border !border-gray-300">
        <div class="p-6">
          <h3 class="mb-1 text-lg font-bold text-gray-800">Pembatalan Massal Selesai</h3>
          <p class="mb-4 text-sm text-gray-600">{{ areaAktif.hasil.message }}</p>

          <div class="grid grid-cols-2 gap-2 mb-5">
            <div class="rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2">
              <div class="text-[11px] text-gray-500">Dibatalkan Sekarang</div>
              <div class="text-lg font-semibold text-red-700">{{ areaAktif.hasil.total_canceled }}</div>
            </div>
            <div class="rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2">
              <div class="text-[11px] text-gray-500">Total Dibatalkan di Area</div>
              <div class="text-lg font-semibold text-gray-800">{{ areaAktif.hasil.sesudah?.total_dibatalkan ?? '-' }}</div>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              type="button"
              class="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-5 py-2.5"
              @click="dialog.areaResult = false"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ==================== Modal Keputusan ==================== -->
  <Teleport to="body">
    <div v-if="dialog.decision" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-lg bg-white rounded-xl shadow-2xl !border !border-gray-300">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-4">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
              :class="decisionType === 'approve' ? 'bg-emerald-100' : 'bg-red-100'"
            >
              <i
                class="text-2xl"
                :class="
                  decisionType === 'approve' ? 'mdi mdi-check-circle-outline text-emerald-600' : 'mdi mdi-close-circle-outline text-red-600'
                "
              />
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-800">{{ decisionLabel }} Pembatalan</h3>
              <p class="text-sm text-gray-500">
                {{ decisionIds.length }} pengajuan akan {{ decisionType === 'approve' ? 'disetujui' : 'ditolak' }}.
              </p>
            </div>
          </div>

          <!-- Satu baris: tampilkan alasan pengajunya sekalian -->
          <p v-if="!isBulk && decisionTarget" class="mb-4 text-sm text-gray-600">
            Tag <span class="font-semibold text-gray-800">{{ decisionTarget.id_tag }}</span> &mdash; alasan pengaju:
            <span class="italic">{{ decisionTarget.cancel_reason || '-' }}</span>
          </p>

          <!-- Banyak baris: tampilkan daftar id-nya -->
          <div v-else class="max-h-40 overflow-y-auto rounded-lg !border !border-gray-300 bg-gray-50 p-3 mb-4">
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="id in decisionIds"
                :key="id"
                class="px-2 py-0.5 rounded-full bg-white !border !border-gray-300 text-[11px] font-medium text-gray-700"
              >
                {{ id }}
              </span>
            </div>
          </div>

          <p class="mb-5 text-sm text-gray-500">
            {{
              decisionType === 'approve'
                ? 'Tag akan ditandai dibatalkan dan tidak lagi terhitung di summary.'
                : 'Pengajuan dibersihkan dan tag kembali normal.'
            }}
            <span v-if="isBulk">Keputusan dikirim satu per satu; tag yang gagal dilaporkan terpisah.</span>
          </p>

          <div v-if="isDeciding && isBulk" class="mb-4">
            <div class="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                class="h-full bg-blue-500 transition-all"
                :style="{ width: `${Math.round((decisionProgress / decisionIds.length) * 100)}%` }"
              />
            </div>
            <div class="mt-1 text-[11px] text-gray-500">{{ decisionProgress }} / {{ decisionIds.length }} diproses</div>
          </div>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              :disabled="isDeciding"
              class="text-gray-500 bg-white hover:bg-gray-100 rounded-lg !border !border-gray-300 text-sm font-medium px-5 py-2.5 disabled:opacity-50"
              @click="
                dialog.decision = false;
                resetDecision();
              "
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="isDeciding"
              class="text-white font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="decisionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'"
              @click="submitDecision"
            >
              {{ isDeciding ? 'Memproses...' : `Ya, ${decisionLabel}` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ==================== Modal Hasil (bila ada yang gagal) ==================== -->
  <Teleport to="body">
    <div v-if="dialog.result && decisionResult" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4">
      <div class="relative w-full max-w-lg bg-white rounded-xl shadow-2xl !border !border-gray-300">
        <div class="p-6">
          <h3 class="mb-1 text-lg font-bold text-gray-800">Hasil {{ decisionResult.type === 'approve' ? 'Persetujuan' : 'Penolakan' }}</h3>
          <p class="mb-4 text-sm text-gray-500">Sebagian pengajuan tidak bisa diproses.</p>

          <div class="grid grid-cols-2 gap-2 mb-4">
            <div class="rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2">
              <div class="text-[11px] text-gray-500">Berhasil</div>
              <div class="text-sm font-semibold text-emerald-700">{{ decisionResult.berhasil.length }}</div>
            </div>
            <div class="rounded-lg !border !border-gray-300 bg-gray-50 px-3 py-2">
              <div class="text-[11px] text-gray-500">Gagal</div>
              <div class="text-sm font-semibold text-red-700">{{ decisionResult.gagal.length }}</div>
            </div>
          </div>

          <div class="max-h-52 overflow-y-auto rounded-lg !border !border-gray-300 bg-gray-50 p-3 mb-5">
            <div v-for="g in decisionResult.gagal" :key="g.id_tag" class="py-1.5 !border-b !border-gray-200 last:!border-b-0">
              <div class="text-xs font-semibold text-gray-800">{{ g.id_tag }}</div>
              <div class="text-[11px] text-red-600">{{ g.message }}</div>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              type="button"
              class="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-5 py-2.5"
              @click="dialog.result = false"
            >
              Tutup
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
          <h3 class="text-lg font-bold text-gray-800">Detail Tag</h3>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-700 rounded-lg w-8 h-8 inline-flex justify-center items-center"
            @click="dialog.detail = false"
          >
            <i class="mdi mdi-close" />
          </button>
        </div>

        <div class="p-5 max-h-[70vh] overflow-y-auto">
          <div v-if="isLoadingDetail" class="py-10 text-center text-gray-400 text-sm">
            <i class="mdi mdi-loading mdi-spin text-2xl block mb-2 text-blue-400" />
            Memuat detail...
          </div>
          <dl v-else class="divide-y divide-gray-200">
            <div v-for="r in detailRows" :key="r.label" class="flex gap-4 py-2">
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
/* Panah select bawaan plugin form Tailwind berukuran 1.5em -- terlalu besar. */
.sto-select,
.sto-table :deep(select) {
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

  .sto-table :deep(.overflow-x-auto + div) {
    border-top-color: #cbd5e1 !important;
  }
}
</style>
