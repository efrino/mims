<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMasterStrengthStore } from '@/stores/Logistik/MasterData/MasterStrength';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useRoute } from 'vue-router';
import type { StrengthItem, StrengthFormData } from '@/types/Logistik/MasterData/MasterStrength';

const store = useMasterStrengthStore();
const route = useRoute();

const page = ref({ title: 'Master Strength' });
const breadcrumbs = route.meta.headers as [];
const unitStrengths = ['Hours', 'Days'];

const columns: TableColumn[] = [
  { key: 'pilih', label: '', align: 'center', sortable: false, filterable: false, width: '44px' },
  { key: 'location', label: 'Area', align: 'center' },
  { key: 'customer', label: 'Customer', align: 'center' },
  { key: 'model', label: 'Model', align: 'center' },
  { key: 'cycle_type', label: 'Category', align: 'center' },
  { key: 'min_str', label: 'Min Strength', align: 'center' },
  { key: 'max_str', label: 'Max Strength', align: 'center' },
  { key: 'unit_str', label: 'Unit Strength', align: 'center' },
  { key: 'is_active', label: 'Active', align: 'center' }
];

// Pilih-semua mengikuti baris yang sedang tampil di tabel (sesudah filter kolom)
const tableRef = ref<InstanceType<typeof TableExcel> | null>(null);
const visibleRows = computed(() => (tableRef.value?.filteredData ?? []) as unknown as StrengthItem[]);
const allSelected = computed(() => visibleRows.value.length > 0 && visibleRows.value.every((r) => store.isSelected(r)));
const someSelected = computed(() => visibleRows.value.some((r) => store.isSelected(r)));

const asItem = (row: unknown) => row as StrengthItem;

const inputClass =
  'w-full text-xs px-2 py-1 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 outline-none';

const enforcePositiveBulk = (row: StrengthFormData, field: 'min_str' | 'max_str') => {
  if (Number(row[field]) < 0) row[field] = '0';
};

onMounted(() => {
  store.fetchMasterStrength();
});

const enforcePositive = (field: 'min_str' | 'max_str') => {
  const value = Number(store.formData[field]);
  if (value < 0) {
    store.formData[field] = '0';
  }
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-0"></BaseBreadcrumb>
  <div class="p-6">
    <!-- FAB Button -->
    <div class="fixed bottom-8 right-8 z-50">
      <button
        @click="store.openAddDialog()"
        class="group w-16 h-16 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
      >
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Dialog/Modal -->
    <Teleport to="body">
      <div v-if="store.isDialogOpen" class="fixed inset-0 z-1505 flex items-center justify-center p-4">
        <!-- Backdrop with Blur -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="store.closeDialog()" />

        <!-- Modal Content -->
        <div
          class="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl z-10 overflow-hidden transform transition-all duration-300 animate-[slideUp_0.3s_ease-out]"
        >

          <!-- Header -->
          <div class="relative flex items-center justify-between p-5 border-b border-gray-100 bg-linear-to-br from-green-500/10 to-green-600/10">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-linear-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900">{{ store.action }} Strength Model</h3>
                <p class="text-sm text-gray-500 mt-0.5">Enter strength specifications below</p>
              </div>
            </div>
            <button
              @click="store.closeDialog()"
              class="w-10 h-10 hover:bg-gray-100 rounded-xl transition-all duration-200 flex items-center justify-center group"
            >
              <svg
                class="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <!-- Customer -->
              <div class="group">
                <label class="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-2">
                  Area
                </label>
                <input
                  v-model="store.formData.location"
                  type="text"
                  autocomplete="off"
                  class="w-full text-sm px-3 py-1.5 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 outline-none"
                  placeholder="Enter location"
                />
              </div>
              <div class="group">
                <label class="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-2">
                  Customer
                </label>
                <input
                  v-model="store.formData.customer"
                  type="text"
                  autocomplete="off"
                  class="w-full text-sm px-3 py-1.5 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 outline-none"
                  placeholder="Enter customer name"
                />
              </div>

              <!-- Model -->
              <div class="group">
                <label class="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-2">
                  Model
                </label>
                <input
                  v-model="store.formData.model"
                  type="text"
                  autocomplete="off"
                  class="w-full text-sm px-3 py-1.5 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 outline-none"
                  placeholder="Enter model name"
                />
              </div>

              <!-- Category -->
              <div class="group">
                <label class="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-2">
                  Category
                </label>
                <input
                  v-model="store.formData.cycle_type"
                  type="text"
                  autocomplete="off"
                  class="w-full text-sm px-3 py-1.5 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 outline-none"
                  placeholder="Enter model name"
                />
              </div>

              <!-- Minimal Strength -->
              <div class="group">
                <label class="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-2">
                  Minimal Strength
                </label>
                <input
                  v-model="store.formData.min_str"
                  type="number"
                  min="0"
                  autocomplete="off"
                  @input="enforcePositive('min_str')"
                  class="w-full text-sm px-3 py-1.5 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 outline-none"
                  placeholder="0"
                />
              </div>

              <!-- Maximal Strength -->
              <div class="group">
                <label class="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-2">
                  Maximal Strength
                </label>
                <input
                  v-model="store.formData.max_str"
                  type="number"
                  min="0"
                  autocomplete="off"
                  @input="enforcePositive('max_str')"
                  class="w-full text-sm px-3 py-1.5 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 outline-none"
                  placeholder="0"
                />
              </div>
              <div class="group">
                <label class="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-2">
                  Unit Strength
                </label>
                <select
                  v-model="store.formData.unit_str"
                  class="w-full text-sm px-3 py-1.5 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 outline-none"
                >
                  <option v-for="unit in unitStrengths" :key="unit" :value="unit">
                    {{ unit }}
                  </option>
                </select>
              </div>
              <div class="group">
                <label class="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-2">
                  Is Active
                </label>
                <input
                  type="checkbox"
                  v-model="store.formData.is_active"
                  :true-value="1"
                  :false-value="0"
                  class="w-10 h-5 mx-5 px-4 py-1.5 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 outline-none"
                />
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end items-center gap-3 p-6 border-t border-gray-100 bg-gray-50">
            <button
              @click="store.closeDialog()"
              class="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl border-2 border-gray-300 transition-all duration-200 flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
            <button
              @click="store.onSubmit()"
              class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Bulk Edit Modal -->
    <Teleport to="body">
      <div v-if="store.isBulkDialogOpen" class="fixed inset-0 z-1505 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="store.closeBulkDialog()" />

        <div
          class="relative bg-white rounded-3xl shadow-2xl w-full max-w-6xl z-10 overflow-hidden flex flex-col max-h-[90vh] animate-[slideUp_0.3s_ease-out]"
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-5 border-b border-gray-100 bg-linear-to-br from-green-500/10 to-green-600/10">
            <div>
              <h3 class="text-lg font-bold text-gray-900">Edit {{ store.bulkFormData.length }} Strength Model</h3>
              <p class="text-sm text-gray-500 mt-0.5">Ubah data baris terpilih sekaligus</p>
            </div>
            <button
              @click="store.closeBulkDialog()"
              class="w-10 h-10 hover:bg-gray-100 rounded-xl transition-all duration-200 flex items-center justify-center"
            >
              <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-4 overflow-auto">
            <table class="w-full text-xs">
              <thead class="sticky top-0 bg-gray-50 z-10">
                <tr class="text-gray-600 uppercase tracking-wide">
                  <th class="px-2 py-2 w-10">No</th>
                  <th class="px-2 py-2">Area</th>
                  <th class="px-2 py-2">Customer</th>
                  <th class="px-2 py-2">Model</th>
                  <th class="px-2 py-2">Category</th>
                  <th class="px-2 py-2 w-24">Min</th>
                  <th class="px-2 py-2 w-24">Max</th>
                  <th class="px-2 py-2 w-28">Unit</th>
                  <th class="px-2 py-2 w-16">Active</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="(row, idx) in store.bulkFormData" :key="idx">
                  <td class="px-2 py-1.5 text-center text-gray-400">{{ idx + 1 }}</td>
                  <td class="px-2 py-1.5"><input v-model="row.location" type="text" autocomplete="off" :class="inputClass" /></td>
                  <td class="px-2 py-1.5"><input v-model="row.customer" type="text" autocomplete="off" :class="inputClass" /></td>
                  <td class="px-2 py-1.5"><input v-model="row.model" type="text" autocomplete="off" :class="inputClass" /></td>
                  <td class="px-2 py-1.5"><input v-model="row.cycle_type" type="text" autocomplete="off" :class="inputClass" /></td>
                  <td class="px-2 py-1.5">
                    <input v-model="row.min_str" type="number" min="0" :class="inputClass" @input="enforcePositiveBulk(row, 'min_str')" />
                  </td>
                  <td class="px-2 py-1.5">
                    <input v-model="row.max_str" type="number" min="0" :class="inputClass" @input="enforcePositiveBulk(row, 'max_str')" />
                  </td>
                  <td class="px-2 py-1.5">
                    <select v-model="row.unit_str" :class="inputClass">
                      <option v-for="unit in unitStrengths" :key="unit" :value="unit">{{ unit }}</option>
                    </select>
                  </td>
                  <td class="px-2 py-1.5 text-center">
                    <input v-model="row.is_active" type="checkbox" :true-value="1" :false-value="0" class="w-4 h-4" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="flex justify-end items-center gap-3 p-5 border-t border-gray-100 bg-gray-50">
            <button
              @click="store.closeBulkDialog()"
              class="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl border-2 border-gray-300 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              @click="store.onSubmitBulk()"
              class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all duration-200"
            >
              Save {{ store.bulkFormData.length }} Data
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Data Table -->
    <TableExcel
      ref="tableRef"
      :columns="columns"
      :data="(store.filteredItems as unknown as Record<string, unknown>[])"
      :loading="store.isLoading"
      :per-page-options="[5, 10, 20, 50]"
    >
      <template #header-actions>
        <div class="flex items-center gap-2">
          <button
            v-if="store.selectedItems.length > 0"
            type="button"
            @click="store.clearSelection()"
            class="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Batal Pilih
          </button>
          <button
            type="button"
            :disabled="store.selectedItems.length === 0"
            @click="store.openBulkEditDialog()"
            class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i class="mdi mdi-pencil-box-multiple text-sm" />
            Edit Terpilih ({{ store.selectedItems.length }})
          </button>
        </div>
      </template>

      <template #header-pilih>
        <input
          type="checkbox"
          class="w-4 h-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          :checked="allSelected"
          :indeterminate="someSelected && !allSelected"
          :disabled="visibleRows.length === 0"
          title="Pilih semua"
          @change="store.toggleSelectAll(visibleRows)"
        />
      </template>

      <template #cell-pilih="{ row }">
        <input
          type="checkbox"
          class="w-4 h-4 cursor-pointer"
          :checked="store.isSelected(asItem(row))"
          @change="store.toggleSelect(asItem(row))"
        />
      </template>

      <template #cell-model="{ value }">
        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {{ value }}
        </span>
      </template>

      <template #cell-is_active="{ row }">
        <input
          :checked="Number(asItem(row).is_active) === 1"
          disabled
          type="checkbox"
          class="w-4 h-4"
        />
      </template>

      <template #actions="{ row }">
        <button
          type="button"
          @click="store.openEditDialog(asItem(row))"
          class="mx-auto px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center gap-2"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Edit
        </button>
      </template>

      <template #empty>
        <p class="text-gray-500 font-medium text-lg mb-1">No data available</p>
        <p class="text-gray-400 text-sm">Click the + button to add your first entry</p>
      </template>
    </TableExcel>
  </div>
</template>

<style scoped>
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
