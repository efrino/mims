<script setup lang="ts">
import { ref, shallowRef, computed, onMounted } from 'vue';
import { useCombineStore } from '@/stores/Logistik/MasterData/CombinePallet';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import AnimatedNumber from '@/components/shared/AnimatedNumber.vue';
import { storeToRefs } from 'pinia';

const page = ref({ title: 'Report RFID Pallet' });
const breadcrumbs = shallowRef([
  { title: 'Logistik', disabled: false, href: '#' },
  { title: 'Report', disabled: false, href: '#' },
  { title: 'RFID Pallet', disabled: true, href: '#' }
]);

const combineStore = useCombineStore();
const { dataTable, combineDriverData, combineDriverInData } = storeToRefs(combineStore);

const CUSTOMER_OPTIONS = ['ADM KAP', 'ADM SAP', 'MMKI', 'MKM', 'TMMIN', 'HMMI'] as const;

const activeTab = ref<string>('TOTAL');

onMounted(async () => {
  await Promise.all([
    combineStore.fetchMasterPallet(),
    combineStore.fetchCombineDriver(),
    combineStore.fetchCombineDriverIn()
  ]);
});

const resolveLabel = (id_label: string | null | undefined): string => {
  if (!id_label) return '-';
  const val = id_label.trim();
  if (!val) return '-';
  if (val.includes('MAJMKM')) return 'MKM';
  if (val.includes('HAXQ'))   return 'HMMI';
  if (val.includes('KBN'))    return 'TMMIN';
  if (val.includes('DN5'))    return 'ADM KAP';
  if (val.includes('DN4'))    return 'ADM SAP';
  if (/^\d+$/.test(val))      return 'MMKI';
  return val;
};

const conditionLabel = (is_active: string): string =>
  is_active === '1' ? 'OK' : is_active === '2' ? 'NC' : 'NG';

const masterRows = computed(() =>
  dataTable.value.map((p) => ({ ...p, condition: conditionLabel(p.is_active) }))
);

const ncRows = computed(() => masterRows.value.filter((p) => p.condition === 'NC'));
const ngRows = computed(() => masterRows.value.filter((p) => p.condition === 'NG'));

const outRowsByCustomer = (customer: string) =>
  combineDriverData.value.filter((row) => resolveLabel(row.id_label) === customer);

const customerCount = (customer: string): number => outRowsByCustomer(customer).length;

// Sama dengan ResumePallet: pallet OUT yang belum kembali lebih dari 2 hari
const isWarning = (updatedAt: string): boolean => {
  if (!updatedAt) return false;
  const diffMs = Math.abs(new Date().getTime() - new Date(updatedAt).getTime());
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) > 2;
};

const warningRows = computed(() =>
  combineDriverData.value
    .filter((p) => isWarning(p.log_updated_at))
    .map((p) => ({ ...p, destination: resolveLabel(p.id_label) }))
);

const PALLET_ICON = 'M4 6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h11.613a2 2 0 0 0 1.346-.52l4.4-4a2 2 0 0 0 0-2.96l-4.4-4A2 2 0 0 0 15.613 6H4Z';
const WARNING_ICON = 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 5a1 1 0 1 0-2 0v5a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V7Z';

const SUMMARY_CARDS = [
  { key: 'TOTAL', label: 'Total Pallet', caption: 'seluruh master pallet', color: '#2563EB', bg: '#EFF6FF', text: '#1D4ED8', ring: 'ring-blue-500', icon: PALLET_ICON },
  { key: 'IN', label: 'Inhouse MAJ', caption: 'pallet berada di MAJ', color: '#03A86E', bg: '#E1F5EE', text: '#0F6E56', ring: 'ring-emerald-500', icon: PALLET_ICON },
  { key: 'NC', label: 'Pallet NC', caption: 'kondisi pallet NC', color: '#F59E0B', bg: '#FFFBEB', text: '#D97706', ring: 'ring-amber-500', icon: '' },
  { key: 'NG', label: 'Pallet NG', caption: 'kondisi pallet NG', color: '#EF4444', bg: '#FEF2F2', text: '#DC2626', ring: 'ring-red-500', icon: '' },
  { key: 'WARNING', label: 'Pallet > 2 Hari', caption: 'belum kembali dari customer', color: '#EA580C', bg: '#FFF7ED', text: '#C2410C', ring: 'ring-orange-500', icon: WARNING_ICON }
] as const;

const summaryCount = (key: string): number => {
  if (key === 'TOTAL') return dataTable.value.length;
  if (key === 'IN') return combineDriverInData.value.length;
  if (key === 'NC') return ncRows.value.length;
  if (key === 'WARNING') return warningRows.value.length;
  return ngRows.value.length;
};

const CUSTOMER_COLORS: Record<string, string> = {
  'ADM KAP': '#2563EB',
  'ADM SAP': '#7C3AED',
  MMKI: '#DB2777',
  MKM: '#EA580C',
  TMMIN: '#DC2626',
  HMMI: '#0891B2'
};

const activeMeta = computed(() => {
  const card = SUMMARY_CARDS.find((c) => c.key === activeTab.value);
  if (card) return card;
  return { label: `Pallet OUT - ${activeTab.value}`, caption: 'pallet berada di customer', color: '#EF4444', bg: '#FEF2F2', text: '#DC2626' };
});

const isMasterTab = computed(() => ['TOTAL', 'NC', 'NG'].includes(activeTab.value));

const activeRows = computed(() => {
  if (activeTab.value === 'TOTAL') return masterRows.value;
  if (activeTab.value === 'NC') return ncRows.value;
  if (activeTab.value === 'NG') return ngRows.value;
  if (activeTab.value === 'IN') return combineDriverInData.value;
  if (activeTab.value === 'WARNING') return warningRows.value;
  return outRowsByCustomer(activeTab.value);
});

const driverColumns: TableColumn[] = [
  { key: 'nik', label: 'NIK' },
  { key: 'nama_driver', label: 'Nama Driver' },
  { key: 'nama_lp', label: 'Nama LP' },
  { key: 'no_polisi', label: 'No Polisi' }
];

const driverTabColumns: TableColumn[] = [
  { key: 'no_rfid', label: 'RFID' },
  { key: 'name', label: 'NAME' },
  { key: 'no_pallet', label: 'No Pallet' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  ...driverColumns
];

// Tab per customer: sama dengan tab IN, hanya ditambah tanggal pallet keluar
const customerTabColumns: TableColumn[] = [
  ...driverTabColumns,
  { key: 'log_updated_at', label: 'Tgl OUT', align: 'center' }
];

const masterColumns: TableColumn[] = [
  { key: 'no_rfid', label: 'RFID' },
  { key: 'name', label: 'NAME' },
  { key: 'no_pallet', label: 'No Pallet' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'customer', label: 'Customer' },
  { key: 'condition', label: 'Condition Pallet', align: 'center' }
];

const warningColumns: TableColumn[] = [
  { key: 'no_rfid', label: 'RFID' },
  { key: 'no_pallet', label: 'No Pallet' },
  { key: 'type', label: 'Type' },
  { key: 'destination', label: 'Destination', align: 'center' },
  ...driverColumns,
  { key: 'log_updated_at', label: 'Tgl OUT', align: 'center' }
];

const columns = computed<TableColumn[]>(() => {
  if (activeTab.value === 'WARNING') return warningColumns;
  if (isMasterTab.value) return masterColumns;
  return activeTab.value === 'IN' ? driverTabColumns : customerTabColumns;
});

const tableRef = ref<{ filteredData: Record<string, unknown>[] } | null>(null);

const formatDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const downloadWarningExcel = () => {
  import('xlsx').then((XLSX) => {
    // Ikuti filter/sort kolom yang sedang aktif di tabel
    const source = (tableRef.value?.filteredData ?? warningRows.value) as typeof warningRows.value;
    const rows = source.map((p, i) => ({
      'No'          : i + 1,
      'ID RFID'     : p.no_rfid,
      'No Pallet'   : p.no_pallet,
      'Type'        : p.type,
      'Destination' : p.destination,
      'Category'    : p.category || '-',
      'NIK'         : p.nik || '-',
      'Nama Driver' : p.nama_driver || '-',
      'Nama LP'     : p.nama_lp || '-',
      'No Polisi'   : p.no_polisi || '-',
      'Tgl OUT'     : p.log_updated_at || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto column width
    ws['!cols'] = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r]).length)) + 2,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pallet Belum Kembali');

    XLSX.writeFile(wb, `Pallet_Belum_Kembali_Dari_Customer_${formatDate(new Date())}.xlsx`);
  });
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <div class="flex flex-col gap-3">

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      <button
        v-for="card in SUMMARY_CARDS"
        :key="card.key"
        @click="activeTab = card.key"
        :class="activeTab === card.key ? ['ring-2', card.ring, 'shadow-md'] : 'hover:shadow-md'"
        class="bg-white rounded-xl shadow px-4 py-3 w-full flex items-center gap-3 border-l-4 text-left transition-all duration-200 focus:outline-none dark:bg-gray-800"
        :style="{ borderLeftColor: card.color }"
      >
        <div
          class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
          :style="{ backgroundColor: card.bg, color: card.text }"
        >
          <svg v-if="card.icon" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
            <path :d="card.icon" />
          </svg>
          <span v-else>{{ card.key }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold text-black uppercase tracking-wide truncate dark:text-white">{{ card.label }}</p>
          <div class="flex items-baseline gap-2">
            <p class="text-xl font-extrabold leading-tight" :style="{ color: card.text }">
              <AnimatedNumber :value="summaryCount(card.key)" />
            </p>
            <p class="text-[11px] font-medium text-gray-500 truncate dark:text-gray-400">{{ card.caption }}</p>
          </div>
        </div>
      </button>
    </div>

    <!-- Pallet OUT per Customer -->
    <div class="bg-white rounded-xl shadow px-4 py-3 dark:bg-gray-800">
      <p class="text-sm font-bold text-black mb-2 dark:text-white">Pallet OUT per Customer</p>
      <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
        <button
          v-for="customer in CUSTOMER_OPTIONS"
          :key="customer"
          @click="activeTab = customer"
          :class="activeTab === customer
            ? 'customer-chip--active border-red-500 bg-red-50 ring-1 ring-red-500 dark:bg-red-900/20'
            : 'border-gray-200 hover:border-red-300 hover:bg-red-50/40 dark:border-gray-700'"
          class="customer-chip flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-all duration-200 focus:outline-none"
        >
          <span class="text-xs font-bold text-black uppercase tracking-wide truncate dark:text-white">
            {{ customer }}
          </span>
          <span
            class="text-base font-extrabold leading-none"
            :style="{ color: CUSTOMER_COLORS[customer] }"
          >
            <AnimatedNumber :value="customerCount(customer)" />
          </span>
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="w-full bg-white rounded-xl shadow overflow-hidden dark:bg-gray-800">
      <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-1.5 h-5 rounded-full flex-shrink-0" :style="{ backgroundColor: activeMeta.color }"></span>
          <p class="text-sm font-bold text-gray-800 truncate dark:text-gray-100">{{ activeMeta.label }}</p>
          <p class="hidden sm:block text-xs font-medium text-gray-500 truncate dark:text-gray-400">· {{ activeMeta.caption }}</p>
        </div>
        <span
          class="text-xs font-bold px-3 py-0.5 rounded-full"
          :style="{ backgroundColor: activeMeta.bg, color: activeMeta.text }"
        >
          {{ activeRows.length }} data
        </span>
      </div>

      <div class="p-2 sm:p-3 bg-white dark:bg-gray-800">
        <div class="w-full max-w-10xl mx-auto">
          <TableExcel ref="tableRef" :columns="columns" :data="(activeRows as unknown as Record<string, unknown>[])">
            <template v-if="activeTab === 'WARNING'" #header-actions>
              <button
                @click="downloadWarningExcel"
                :disabled="warningRows.length === 0"
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Download Excel"
              >
                <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                  <path fill-rule="evenodd" d="M12 2a1 1 0 0 1 1 1v9.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L11 12.586V3a1 1 0 0 1 1-1ZM4 17a1 1 0 0 1 1 1v1h14v-1a1 1 0 1 1 2 0v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1Z" clip-rule="evenodd"/>
                </svg>
                Download Excel
              </button>
            </template>

            <template #cell-destination="{ value }">
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                {{ value }}
              </span>
            </template>

            <template #cell-log_updated_at="{ value }">
              <span class="text-xs font-medium text-orange-700 bg-orange-100 px-2.5 py-1 rounded-full border border-orange-200">
                {{ value || '-' }}
              </span>
            </template>

            <template #cell-condition="{ value }">
              <span
                :class="value === 'OK'
                  ? 'bg-green-100 text-green-700'
                  : value === 'NC'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'"
                class="px-2.5 py-1 rounded-full text-xs font-semibold"
              >
                {{ value }}
              </span>
            </template>

            <template #cell-nik="{ value }">
              {{ value || '-' }}
            </template>

            <template #cell-nama_driver="{ value }">
              {{ value || '-' }}
            </template>

            <template #cell-nama_lp="{ value }">
              {{ value || '-' }}
            </template>

            <template #cell-no_polisi="{ value }">
              {{ value || '-' }}
            </template>

            <template #empty>
              <span class="text-sm text-gray-400">Tidak ada data pallet</span>
            </template>
          </TableExcel>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.border {
  border: 1px solid #e5e7eb !important;
}
/* Utilitas .border Vuetify ada di @layer vendor dengan !important, jadi warna border kartu customer diatur di layer yang sama */
@layer vendor {
  .customer-chip.border {
    border-color: #d1d5db !important;
  }
  .customer-chip.customer-chip--active.border {
    border-color: #ef4444 !important;
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.9);
}
</style>
