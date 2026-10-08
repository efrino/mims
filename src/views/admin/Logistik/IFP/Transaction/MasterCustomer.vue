<script setup lang="ts">
import { ref, shallowRef, computed, onMounted } from 'vue';
import * as XLSX from 'xlsx';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useMasterCustomerStore } from '@/stores/Logistik/IFP/Transaction/MasterCustomer';
import { useNotificationStore } from '@/stores/notification';
import { storeToRefs } from 'pinia'
const page = ref({ title: 'Master Customer' });
const breadcrumbs = shallowRef([
  { title: 'Logistik', disabled: false, href: '#' },
  { title: 'IFP', disabled: false, href: '#' },
  { title: 'Transaction', disabled: false, href: '#' },
  { title: 'Master Customer', disabled: true, href: '#' },
]);

const store = useMasterCustomerStore();
const notificationStore = useNotificationStore();

const search = ref('');
const isLoading = ref(false);
const isTableReady = ref(false);
const tableKey = ref(0);

// ✅ State Baru untuk Kontrol Sorting
const currentSortKey = ref('id'); // Default sort berdasarkan ID
const currentSortOrder = ref<'asc' | 'desc'>('desc'); // Default urutan terbaru (desc)

const currentPage = ref(1);
const pageSize = ref(10);
const pageSizeOptions = [10, 15, 25, 50];

const showModal = ref(false);
const isEdit = ref(false);
const showDeleteModal = ref(false);
const deleteTarget = ref({ id: '' as string | number, nama: '' });

const form = ref({
  id: '',
  kode_customer: '',
  nama: '',
  nama_alias: '',
  kode_zstt: '',
  induk_customer: '',
});

// ✅ Fungsi Pemicu Perubahan Urutan Sorting saat Header diklik
function handleSort(key: string) {
  if (currentSortKey.value === key) {
    // Jika kolom sama diklik, balikkan arah urutan (asc <-> desc)
    currentSortOrder.value = currentSortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    // Jika kolom baru diklik, set kolom tersebut dengan urutan default asc
    currentSortKey.value = key;
    currentSortOrder.value = 'asc';
  }
  currentPage.value = 1; // Kembalikan ke halaman pertama setiap kali sortir berubah
}

// ✅ Filter & Sort diproses di sini sebelum dipotong oleh Pagination
const filtered = computed(() => {
  const q = search.value.toLowerCase().trim();
  let rows = [...(store.data ?? [])];

  // 1. Proses Pencarian (Filtering)
  if (q) {
    rows = rows.filter(
      (x) =>
        (x.kode_customer ?? '').toLowerCase().includes(q) ||
        (x.nama ?? '').toLowerCase().includes(q) ||
        (x.nama_alias ?? '').toLowerCase().includes(q) ||
        (x.kode_zstt ?? '').toLowerCase().includes(q)
    );
  }

  // 2. Proses Pengurutan Reaktif (Sorting)
  const key = currentSortKey.value;
  const order = currentSortOrder.value === 'asc' ? 1 : -1;

  rows.sort((a, b) => {
    // Jika sorting berdasarkan ID (Angka)
    if (key === 'id') {
      return (Number(a.id ?? 0) - Number(b.id ?? 0)) * order;
    }
    
    // Jika sorting berdasarkan teks/string standar
    const valA = String(a[key as keyof typeof a] ?? '').toLowerCase();
    const valB = String(b[key as keyof typeof b] ?? '').toLowerCase();
    return valA.localeCompare(valB) * order;
  });

  return rows;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));

const dataTable = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filtered.value.slice(start, start + pageSize.value);
});

const indukMap = computed(() => {
  const map: Record<number, { kode_customer: string; nama: string }> = {};
  (store.data ?? []).forEach((c) => {
    const id = Number(c.id);
    if (!Number.isNaN(id)) map[id] = { kode_customer: c.kode_customer, nama: c.nama };
  });
  return map;
});

const indukOptions = computed(() => {
  const selfId = Number(form.value.id || 0);
  return [...(store.data ?? [])]
    .sort((a, b) => (a.nama ?? '').localeCompare(b.nama ?? ''))
    .filter((x) => (selfId ? Number(x.id) !== selfId : true));
});

const pageNumbers = computed(() => {
  const total = totalPages.value;
  const cur = currentPage.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (cur > 3) pages.push('...');
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
  if (cur < total - 2) pages.push('...');
  pages.push(total);
  return pages;
});

onMounted(async () => {
  isLoading.value = true;
  await store.fetchCustomers();
  isLoading.value = false;
  isTableReady.value = true;
});

function resetPage() {
  currentPage.value = 1;
}

function openCreate() {
  isEdit.value = false;
  form.value = { id: '', kode_customer: '', nama: '', nama_alias: '', kode_zstt: '', induk_customer: '' };
  showModal.value = true;
}

function openEdit(c: (typeof store.data)[number]) {
  isEdit.value = true;
  form.value = {
    id: String(c.id),
    kode_customer: c.kode_customer,
    nama: c.nama,
    nama_alias: c.nama_alias ?? '',
    kode_zstt: c.kode_zstt ?? '',
    induk_customer: c.induk_customer ? String(c.induk_customer) : '',
  };
  showModal.value = true;
}

function closeModal() {
  if (store.saving) return;
  showModal.value = false;
}

function openDelete(c: (typeof store.data)[number]) {
  deleteTarget.value = { id: c.id, nama: c.nama };
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  if (store.saving) return;
  showDeleteModal.value = false;
}

async function submitForm() {
  const kode = form.value.kode_customer.trim().toUpperCase();
  const nama = form.value.nama.trim().toUpperCase();
  const namaAlias = form.value.nama_alias.trim() || null;
  const kodeZstt = form.value.kode_zstt.trim() || null;
  const indukId = form.value.induk_customer ? Number(form.value.induk_customer) : null;
  const selfId = form.value.id ? Number(form.value.id) : null;

  if (!kode || !nama) {
    notificationStore.showDialogError('Validasi', 'Kode dan Nama wajib diisi.');
    return;
  }

  if (indukId && selfId && indukId === selfId) {
    notificationStore.showDialogError('Validasi', 'Induk customer tidak boleh dirinya sendiri.');
    return;
  }

  const rows = store.data ?? [];

  const isDupKode = rows.some((x) => {
    if (isEdit.value && String(x.id) === form.value.id) return false;
    return (x.kode_customer ?? '').trim().toUpperCase() === kode;
  });
  if (isDupKode) {
    notificationStore.showDialogError('Validasi', 'Kode customer sudah digunakan.');
    return;
  }

  const isDupNama = rows.some((x) => {
    if (isEdit.value && String(x.id) === form.value.id) return false;
    return (x.nama ?? '').trim().toUpperCase() === nama;
  });
  if (isDupNama) {
    notificationStore.showDialogError('Validasi', 'Nama customer sudah digunakan.');
    return;
  }

  const payload = { kode_customer: kode, nama, nama_alias: namaAlias, kode_zstt: kodeZstt, induk_customer: indukId };

  const res = isEdit.value
    ? await store.updateCustomer({ ...payload, id: form.value.id, updated_by: 'admin' })
    : await store.createCustomer({ ...payload, created_by: 'admin' });

  if (res?.status === 'success') {
    notificationStore.showDialogSuccess('Success', isEdit.value ? 'Data customer berhasil diupdate.' : 'Data customer berhasil ditambah.');
    showModal.value = false;
    await store.fetchCustomers();
    tableKey.value++;
  } else {
    notificationStore.showDialogError('Error', res?.message ?? 'Gagal menyimpan data customer.');
  }
}

async function confirmDelete() {
  if (!deleteTarget.value.id) {
    notificationStore.showDialogError('Error', 'ID customer tidak ditemukan.');
    return;
  }

  try {
    const res = await store.deleteCustomer({ id: deleteTarget.value.id, deleted_by: 'admin' });
    if (res?.status === 'success') {
      notificationStore.showDialogSuccess('Success', 'Data customer berhasil dihapus.');
      showDeleteModal.value = false;
      await store.fetchCustomers();
      tableKey.value++;
    } else {
      notificationStore.showDialogError('Error', res?.message ?? 'Gagal menghapus data customer.');
    }
  } catch (e: unknown) {
    notificationStore.showDialogError('Error', e instanceof Error ? e.message : 'Terjadi error saat menghapus.');
  }
}

function exportExcel() {
  const source = filtered.value;
  if (!source.length) {
    notificationStore.showDialogError('Error', 'Tidak ada data untuk diexport.');
    return;
  }

  const map = indukMap.value;
  const rows = source.map((c, i) => {
    const indukId = c.induk_customer ? Number(c.induk_customer) : null;
    return {
      No: i + 1,
      'Kode Customer': c.kode_customer ?? '',
      Nama: c.nama ?? '',
      'Nama Alias': c.nama_alias ?? '',
      'Kode ZSTT': c.kode_zstt ?? '',
      'Induk Kode': indukId ? (map[indukId]?.kode_customer ?? indukId) : '',
      'Induk Nama': indukId ? (map[indukId]?.nama ?? '') : '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 35 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 35 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Master Customer');
  const now = new Date();

  const formattedDate =
    `${now.getFullYear()}.` +
    `${String(now.getMonth() + 1).padStart(2, '0')}.` +
    `${String(now.getDate()).padStart(2, '0')} ` +
    `${String(now.getHours() % 12 || 12).padStart(2, '0')}.` +
    `${String(now.getMinutes()).padStart(2, '0')} ` +
    `${now.getHours() >= 12 ? 'PM' : 'AM'}`;

  XLSX.writeFile(wb, `${formattedDate}_MASTER CUSTOMER.xlsx`);
}
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <!-- Toolbar -->
  <div class="flex flex-wrap items-center justify-between gap-3 mb-5 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
    <div class="flex items-center gap-3 flex-wrap">
      <button v-if="store.permissions.create"
        @click="openCreate"
        class="flex items-center gap-2 text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Customer
      </button>

      <button
        @click="exportExcel"
        class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
        </svg>
        Export Excel
      </button>
    </div>

    <div class="flex items-center gap-3 flex-wrap">
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">Tampilkan</span>
        <select
          v-model="pageSize"
          @change="resetPage"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
        >
          <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
        <span class="text-sm text-gray-600">entri</span>
      </div>

      <div class="relative">
        <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
          </svg>
        </div>
        <input
          v-model="search"
          @input="resetPage"
          type="text"
          placeholder="Cari kode / nama..."
          class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-full focus:ring-blue-500 focus:border-blue-500 block w-[240px] pl-10 p-2.5"
        />
      </div>
    </div>
  </div>

  <!-- Table -->
  <div class="w-full bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
    <div v-if="!isLoading && isTableReady" class="w-full overflow-x-auto">
      <table :key="tableKey" class="w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th class="px-6 py-3 w-16 cursor-pointer select-none" @click="handleSort('id')">
              <span class="flex items-center gap-1">No
                <svg class="w-4 h-4 transition-colors" :class="currentSortKey === 'id' ? 'text-blue-500' : 'opacity-30'" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="currentSortKey === 'id' && currentSortOrder === 'desc' ? 'm16 9-4-4-4 4' : 'm8 15 4 4 4-4'" />
                </svg>
              </span>
            </th>

            <th class="px-6 py-3 cursor-pointer select-none" @click="handleSort('kode_customer')">
              <span class="flex items-center gap-1">Kode Customer
                <svg class="w-4 h-4 transition-colors" :class="currentSortKey === 'kode_customer' ? 'text-blue-500' : 'opacity-30'" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="currentSortKey === 'kode_customer' && currentSortOrder === 'desc' ? 'm16 9-4-4-4 4' : 'm8 15 4 4 4-4'"/>
                </svg>
              </span>
            </th>

            <th class="px-6 py-3 cursor-pointer select-none" @click="handleSort('nama')">
              <span class="flex items-center gap-1">Nama
                <svg class="w-4 h-4 transition-colors" :class="currentSortKey === 'nama' ? 'text-blue-500' : 'opacity-30'" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="currentSortKey === 'nama' && currentSortOrder === 'desc' ? 'm16 9-4-4-4 4' : 'm8 15 4 4 4-4'"/>
                </svg>
              </span>
            </th>

            <th class="px-6 py-3 cursor-pointer select-none" @click="handleSort('nama_alias')">
              <span class="flex items-center gap-1">Nama Alias
                <svg class="w-4 h-4 transition-colors" :class="currentSortKey === 'nama_alias' ? 'text-blue-500' : 'opacity-30'" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="currentSortKey === 'nama_alias' && currentSortOrder === 'desc' ? 'm16 9-4-4-4 4' : 'm8 15 4 4 4-4'"/>
                </svg>
              </span>
            </th>

            <th class="px-6 py-3 cursor-pointer select-none" @click="handleSort('kode_zstt')">
              <span class="flex items-center gap-1">Kode ZSTT
                <svg class="w-4 h-4 transition-colors" :class="currentSortKey === 'kode_zstt' ? 'text-blue-500' : 'opacity-30'" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="currentSortKey === 'kode_zstt' && currentSortOrder === 'desc' ? 'm16 9-4-4-4 4' : 'm8 15 4 4 4-4'"/>
                </svg>
              </span>
            </th>

            <th class="px-6 py-3 cursor-pointer select-none" @click="handleSort('induk_customer')">
              <span class="flex items-center gap-1">Induk Customer
                <svg class="w-4 h-4 transition-colors" :class="currentSortKey === 'induk_customer' ? 'text-blue-500' : 'opacity-30'" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="currentSortKey === 'induk_customer' && currentSortOrder === 'desc' ? 'm16 9-4-4-4 4' : 'm8 15 4 4 4-4'"/>
                </svg>
              </span>
            </th>

            <th class="px-6 py-3 text-center">Action</th>
          </tr>
        </thead>

          <tbody>
            <tr v-if="dataTable.length === 0">
              <td colspan="7" class="px-6 py-12 text-center">
                <div class="flex flex-col items-center gap-2 text-gray-400">
                  <svg class="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <span class="font-medium">Belum ada data customer.</span>
                </div>
              </td>
            </tr>

            <tr
              v-for="(c, index) in dataTable"
              :key="c.id ?? index"
              class="odd:bg-white even:bg-gray-50 border-b border-gray-200 hover:bg-blue-50 transition-colors duration-150"
            >
              <td class="px-6 py-4 text-gray-500">
                {{ (currentPage - 1) * pageSize + index + 1 }}
              </td>

              <td class="px-6 py-4 font-mono font-semibold text-gray-900">
                {{ c.kode_customer }}
              </td>

              <td class="px-6 py-4 text-gray-700">
                {{ c.nama }}
              </td>

              <td class="px-6 py-4 text-gray-600">
                <span v-if="c.nama_alias">{{ c.nama_alias }}</span>
                <span v-else class="text-gray-400 italic text-xs">-</span>
              </td>

              <td class="px-6 py-4 text-gray-600">
                <span v-if="c.kode_zstt" class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {{ c.kode_zstt }}
                </span>
                <span v-else class="text-gray-400 italic text-xs">-</span>
              </td>

              <td class="px-6 py-4 text-gray-600">
                <span v-if="c.induk_customer" class="text-gray-500">
                  {{ indukMap[Number(c.induk_customer)]?.nama ?? '' }}
                </span>
                <span v-else class="text-gray-400 italic text-xs">-</span>
              </td>

              <td class="px-6 py-4 border">
                <div class="flex items-center justify-center gap-2">
                  <button
                    v-if="store.permissions.update"
                    type="button"
                    title="Edit Data"
                    class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 focus:ring-2 focus:ring-blue-300"
                    @click="openEdit(c)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>

                  <button
                    v-if="store.permissions.delete"
                    type="button"
                    title="Delete Data"
                    class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 focus:ring-2 focus:ring-red-300"
                    @click="openDelete(c)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m2-3h6a1 1 0 011 1v1H8V5a1 1 0 011-1z" />
                    </svg>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="filtered.length > 0" class="flex flex-col md:flex-row items-center justify-between gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <p class="text-sm text-gray-600">
            Menampilkan
            <span class="font-semibold text-gray-900">
              {{ filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1 }}
            </span>
            –
            <span class="font-semibold text-gray-900">
              {{ Math.min(currentPage * pageSize, filtered.length) }}
            </span>
            dari
            <span class="font-semibold text-gray-900">{{ filtered.length }}</span>
            entri
          </p>

          <div class="flex items-center gap-1">
            <button
              :class="[
                'flex items-center px-3 py-1.5 text-sm font-medium rounded-lg',
                currentPage === 1
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              ]"
              :disabled="currentPage === 1"
              @click="currentPage--"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </button>

            <template v-for="p in pageNumbers" :key="p">
              <button
                v-if="p !== '...'"
                class="px-3 py-1.5 text-sm font-medium rounded-lg"
                :class="p === currentPage
                  ? 'text-white bg-blue-600 hover:bg-blue-700'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'"
                @click="currentPage = p as number"
              >{{ p }}</button>
              <span v-else class="px-2 text-sm text-gray-400">...</span>
            </template>

            <button
              :class="[
                'flex items-center px-3 py-1.5 text-sm font-medium rounded-lg',
                currentPage === totalPages
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              ]"
              :disabled="currentPage === totalPages"
              @click="currentPage++"
            >
              Next
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div v-else class="flex flex-col h-40 w-full justify-center items-center gap-3">
        <svg class="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p class="text-sm font-medium text-gray-400">Memuat data...</p>
      </div>
  </div>

  <Transition name="modal">
    <div
      v-if="showModal"
      class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="closeModal"
    >
      <div class="relative p-4 w-full max-w-2xl max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg">
          <div class="flex items-center justify-between p-5 border-b rounded-t border-gray-200">
            <div class="flex items-center space-x-3">
              <div :class="['p-2 rounded-lg', isEdit ? 'bg-blue-100' : 'bg-green-100']">
                <svg :class="['w-6 h-6', isEdit ? 'text-blue-600' : 'text-green-600']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="isEdit" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900">{{ isEdit ? 'Edit Customer' : 'Tambah Customer' }}</h3>
                <p class="text-sm text-gray-500 mt-0.5">{{ isEdit ? 'Ubah data customer.' : 'Isi data customer.' }}</p>
              </div>
            </div>
            <button
              type="button"
              @click="closeModal"
              class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="submitForm">
            <div class="p-6 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block mb-2 text-sm font-medium text-gray-900">Kode Customer <span class="text-red-500">*</span></label>
                  <input
                    v-model.trim="form.kode_customer"
                    type="text"
                    placeholder="Contoh: CUST001"
                    @input="form.kode_customer = form.kode_customer.toUpperCase()"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    required
                  />
                </div>

                <div>
                  <label class="block mb-2 text-sm font-medium text-gray-900">Nama Customer <span class="text-red-500">*</span></label>
                  <input
                    v-model.trim="form.nama"
                    type="text"
                    placeholder="Contoh: PT Maju Jaya"
                    @input="form.nama = form.nama.toUpperCase()"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    required
                  />
                </div>

                <div>
                  <label class="block mb-2 text-sm font-medium text-gray-900">Nama Alias <span class="text-gray-400 font-normal">(Opsional)</span></label>
                  <input
                    v-model.trim="form.nama_alias"
                    type="text"
                    placeholder="Contoh: Maju Jaya"
                    @input="form.nama_alias = form.nama_alias.toUpperCase()"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>

                <div>
                  <label class="block mb-2 text-sm font-medium text-gray-900">Kode ZSTT <span class="text-gray-400 font-normal">(Opsional)</span></label>
                  <input
                    v-model.trim="form.kode_zstt"
                    type="text"
                    placeholder="Contoh: ZSTT001"
                    @input="form.kode_zstt = form.kode_zstt.toUpperCase()"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>

                <div class="col-span-2">
                  <label class="block mb-2 text-sm font-medium text-gray-900">Induk Customer</label>
                  <select
                    v-model="form.induk_customer"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  >
                    <option value="">— Pilih Induk Customer —</option>
                    <option v-for="opt in indukOptions" :key="opt.id" :value="String(opt.id)">
                      {{ opt.kode_customer }} - {{ opt.nama }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end p-6 space-x-3 border-t border-gray-200">
              <button
                @click="closeModal"
                type="button"
                class="text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="store.saving"
                class="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg v-if="store.saving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Dialog Confirm Delete -->
  <div v-if="showDeleteModal"
    class="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 transition-opacity">
    <div class="relative w-full max-w-md max-h-full">
      <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
        <button @click="closeDeleteModal" type="button"
          class="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center">
          <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
          </svg>
          <span class="sr-only">Close modal</span>
        </button>

        <div class="p-6 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg class="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z">
              </path>
            </svg>
          </div>

          <h3 class="mb-5 text-lg font-normal text-gray-500">
            Apakah Anda yakin ingin menghapus customer <br>
            <span class="font-bold text-gray-800">{{ deleteTarget.nama }}?</span>
          </h3>

          <div class="flex justify-center gap-3">
            <button @click="confirmDelete" type="button" :disabled="store.saving"
              class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center mr-2 disabled:opacity-60 disabled:cursor-not-allowed">
              <svg v-if="store.saving" class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Ya, Hapus
            </button>

            <button @click="closeDeleteModal" type="button"
              class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10">
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>