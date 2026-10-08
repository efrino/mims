<script setup lang="ts">
import { ref, shallowRef, computed, onMounted } from 'vue'
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue'
import CustomSelectSearch from '@/components/CustomSelectSearch.vue'
import { useRundownIFPStore } from '@/stores/Logistik/IFP/Report/ListScanShipping'
import { storeToRefs } from 'pinia'
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue'

const page = ref({ title: 'List Scan Shipping' })
const breadcrumbs = shallowRef([
  { title: 'Logistik', disabled: false, href: '#' },
  { title: 'IFP', disabled: false, href: '#' },
  { title: 'Report', disabled: false, href: '#' },
  { title: 'List Scan Shipping', disabled: true, href: '#' },
])

const store = useRundownIFPStore()
const { combineData, loading, error, totalCombineData, scannedCount } = storeToRefs(store)
const selectedCustomer = ref<string | null>(null)
const selectedPartNumber = ref<string | null>(null)
const selectedDate = ref('')
const customerItems = computed(() => {
  if (!combineData.value.length) return []
  
  const unique = [...new Set(
    combineData.value
      .map(item => item.customer)
      .filter(Boolean)
  )] as string[]
  
  return unique.sort().map(v => ({
    part_number: v,
    job_number: v,
    customer: v
  }))
})

const partNumberItems = computed(() => {
  if (!combineData.value.length) return []
  
  const unique = [...new Set(
    combineData.value
      .map(item => item.part)
      .filter(Boolean)
  )] as string[]
  
  return unique.sort().map(v => ({
    part_number: v,
    job_number: v,
    customer: v
  }))
})

const filteredData = computed(() => {
  let data = [...combineData.value]
  if (selectedCustomer.value) {
    data = data.filter(item => item.customer === selectedCustomer.value)
  }
  if (selectedPartNumber.value) {
    data = data.filter(item => item.part === selectedPartNumber.value)
  }
  if (selectedDate.value) {
    data = data.filter(item => {
      return item.created_at?.startsWith(selectedDate.value)
    })
  }

  return data
})

const columns: TableColumn[] = [
  { key: 'customer', label: 'Customer' },
  { key: 'id_label', label: 'ID Label' },
  { key: 'id_kanban', label: 'ID Kanban' },
  { key: 'part', label: 'Part Number' },
  { key: 'user_created', label: 'User' },
  { key: 'created_at', label: 'Create Date' }
]

async function loadData() {
  const filters: Record<string, string> = {}
  if (selectedDate.value) filters.created_at = selectedDate.value
  await store.fetchCombine(filters)
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

function resetFilters() {
  selectedCustomer.value = null
  selectedPartNumber.value = null
  selectedDate.value = ''
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <div class="flex flex-col gap-7">
    <div class="bg-white p-2 rounded-xl shadow w-full">
      <div class="flex flex-wrap items-end gap-4">
        <div class="w-125">
          <CustomSelectSearch
            v-model="selectedCustomer"
            :items="customerItems"
            label="Customer"
            placeholder="Pilih atau cari customer..."
            return-type="part_number"
            :disabled="loading"
          />
        </div>

        <div class="w-125">
          <CustomSelectSearch
            v-model="selectedPartNumber"
            :items="partNumberItems"
            label="Part Number"
            placeholder="Pilih atau cari part number..."
            return-type="part_number"
            :disabled="loading"
          />
        </div>

        <div class="flex flex-col w-125">
          <label class="text-sm font-medium text-gray-700 mb-1">Tanggal</label>
          <input
            type="date"
            v-model="selectedDate"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50"
            :disabled="loading"
          />
        </div>

        <div class="flex items-center gap-2">
          <button
            v-if="selectedCustomer || selectedPartNumber || selectedDate"
            @click="resetFilters"
            class="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            :disabled="loading"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reset Filter
          </button>
        </div>
      </div>

      <div v-if="combineData.length > 0" class="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
        <span v-if="filteredData.length !== totalCombineData" class="text-xs text-blue-600">
          Hasil filter: <span class="font-semibold">{{ filteredData.length }}</span> data
        </span>
      </div>

      <div v-if="loading && combineData.length === 0" class="mt-4 text-sm text-blue-600">
        Memuat data awal...
      </div>
    </div>

    <div
      v-if="error"
      class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
    >
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{{ error }}</span>
      <button 
        @click="loadData" 
        class="ml-auto text-sm font-medium text-red-800 hover:text-red-900 underline"
      >
        Coba lagi
      </button>
    </div>

    <div class="bg-white rounded-xl shadow overflow-hidden">
      <div v-if="selectedCustomer || selectedPartNumber || selectedDate" class="px-6 py-3 bg-blue-50 border-b border-blue-100">
        <div class="flex items-center gap-2 text-sm text-blue-700">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filter aktif:</span>
          <span v-if="selectedCustomer" class="bg-white px-2 py-0.5 rounded-md text-xs">
            Customer: <span class="font-semibold">{{ selectedCustomer }}</span>
          </span>
          <span v-if="selectedPartNumber" class="bg-white px-2 py-0.5 rounded-md text-xs">
            Part: <span class="font-semibold">{{ selectedPartNumber }}</span>
          </span>
          <span v-if="selectedDate" class="bg-white px-2 py-0.5 rounded-md text-xs">
            Tanggal: <span class="font-semibold">{{ new Date(selectedDate).toLocaleDateString('id-ID') }}</span>
          </span>
        </div>
      </div>

      <TableExcel :columns="columns" :data="(filteredData as unknown as Record<string, unknown>[])" :loading="loading">
        <template #cell-id_label="{ row }">
          <span
            v-if="(row as any).id_label"
            class="inline-block px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-md font-mono max-w-xs truncate"
            :title="(row as any).id_label"
          >
            {{ (row as any).id_label }}
          </span>
          <span v-else class="text-gray-300">—</span>
        </template>

        <template #cell-id_kanban="{ row }">
          <span class="font-mono text-xs text-gray-600 max-w-xs truncate block" :title="(row as any).id_kanban">
            {{ (row as any).id_kanban || '-' }}
          </span>
        </template>

        <template #cell-created_at="{ row }">
          <span class="text-gray-500 text-xs whitespace-nowrap">{{ formatDate((row as any).created_at) }}</span>
        </template>

        <template #empty>
          <div class="flex flex-col items-center gap-2 text-gray-400">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p class="text-sm font-medium">
              {{ combineData.length === 0
                ? 'Belum ada data. Klik "Load Data" untuk memuat.'
                : 'Tidak ada data sesuai filter yang dipilih.' }}
            </p>
          </div>
        </template>
      </TableExcel>
    </div>
  </div>
</template>