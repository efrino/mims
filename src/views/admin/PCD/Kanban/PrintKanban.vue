<script setup lang="ts">
import { onMounted, ref, shallowRef, computed } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { usePrintKanbanStore } from '@/stores/PCD/Kanban/PrintKanban';
import CustomSelectSearch from "@/components/CustomSelectSearch.vue";
import { storeToRefs } from 'pinia';
import type { PartItems } from '@/types/PCD/Kanban/PrintKanban';

const page = ref({ title: 'Print Kanban' });
const breadcrumbs = shallowRef([
  {
    title: 'PCD',
    disabled: false,
    href: '#'
  },
  {
    title: 'Kanban',
    disabled: false,
    href: '#'
  },
  {
    title: 'Print Kanban',
    disabled: true,
    href: '#'
  }
]);

const printKanbanStore = usePrintKanbanStore();
const { partItems, dataTable, selectedPartNumber } = storeToRefs(printKanbanStore);
let selectedPart = ref<PartItems | null>(null);

// Filter states
const statusLockFilter = ref<string>('');
const kanbanType = ref<boolean>(false);
const rangeStart = ref<string>('');
const rangeTo = ref<string>('');
const selectedRows = ref<Set<number>>(new Set());
const rangeError = ref<string>('');

// Computed filtered indices
const filteredIndices = computed(() => {
  if (!dataTable.value || dataTable.value.length === 0) return new Set<number>();
  
  const indices = new Set<number>();
  
  dataTable.value.forEach((item, index) => {
    let matchStatusLock = true;
    let matchRange = true;
    
    // Filter by status lock
    if (statusLockFilter.value) {
      matchStatusLock = item.status_lock === statusLockFilter.value;
    }
    
    // Filter by range (1-based row number)
    if (rangeStart.value || rangeTo.value) {
      const rowNumber = index + 1;
      const start = rangeStart.value ? parseInt(rangeStart.value) : 1;
      const end = rangeTo.value ? parseInt(rangeTo.value) : dataTable.value.length;
      
      matchRange = rowNumber >= start && rowNumber <= end;
    }
    
    if (matchStatusLock && matchRange) {
      indices.add(index);
    }
  });
  
  return indices;
});

// Validate range input
const validateRange = () => {
  rangeError.value = '';
  
  if (rangeStart.value && rangeTo.value) {
    const start = parseInt(rangeStart.value);
    const end = parseInt(rangeTo.value);
    
    if (start > end) {
      rangeError.value = 'Start tidak boleh lebih besar dari To';
      return false;
    }
  }
  
  return true;
};

// Apply filter and select filtered rows
const applyFilter = () => {
  if (!validateRange()) return;
  
  // Clear previous selections
  selectedRows.value.clear();
  
  // Select all filtered rows
  filteredIndices.value.forEach(index => {
    selectedRows.value.add(index);
  });
};

// Toggle row selection
const toggleRowSelection = (index: number) => {
  if (selectedRows.value.has(index)) {
    selectedRows.value.delete(index);
  } else {
    selectedRows.value.add(index);
  }
};

// Check if row is selected
const isRowSelected = (index: number) => {
  return selectedRows.value.has(index);
};

// Clear all selections
const clearSelection = () => {
  selectedRows.value.clear();
};

// Process selected rows (fungsi kosong untuk pengolahan data)
const processSelectedRows = async () => {
  const selectedData = Array.from(selectedRows.value).map(index => {
    return dataTable.value[index];
  });
  
	await printKanbanStore.addPrintKanban(selectedData);
};

// On selected part item
const onPartChange = (item: PartItems | null) => {
	selectedPartNumber.value = item ? item.part_number : '';

	printKanbanStore.fetchSAPData();
};

onMounted(() => {
	printKanbanStore.getPartItems();
	printKanbanStore.fetchKanbanData();
});

console.log('partItems: ', partItems);
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-col gap-7">
		<div class="flex gap-5 bg-white p-5 rounded-xl shadow w-full">
			<div class="w-1/2">
				<CustomSelectSearch
					v-model="selectedPart"
					:items="partItems"
					@change="onPartChange(selectedPart)"
					label="Part Number"
				/>
				
				<!-- Tipe Kanban -->
				<div>
					<h5 class="text-sm font-medium text-gray-900 mt-5">Tipe Kanban</h5>
					<div class="flex gap-5 mt-2">
						<div class="flex items-center ps-4 border border-gray-200 rounded-lg w-full">
							<input 
								id="bordered-radio-1" 
								type="radio" 
								value="false" 
								v-model="kanbanType"
								name="kanbanType" 
								class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300"
							>
							<label for="bordered-radio-1" class="w-full py-2.5 ms-2 text-sm font-medium text-gray-900">OK</label>
						</div>
						<div class="flex items-center ps-4 border border-gray-200 rounded-lg w-full">
							<input 
								id="bordered-radio-2" 
								type="radio" 
								value="true" 
								v-model="kanbanType"
								name="kanbanType" 
								class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300"
							>
							<label for="bordered-radio-2" class="w-full py-2.5 ms-2 text-sm font-medium text-gray-900">NC</label>
						</div>
					</div>
				</div>
      </div>

			<div class="w-1/2">

				<!-- Status Lock -->
				<div>
					<h5 class="text-sm font-medium text-gray-900">Status Lock</h5>
					<div class="flex gap-5 mt-2">
						<div class="flex items-center ps-4 border border-gray-200 rounded-lg w-full">
							<input 
								id="bordered-radio-3" 
								type="radio" 
								value="Lock" 
								v-model="statusLockFilter"
								name="bordered-radio" 
								class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300"
							>
							<label for="bordered-radio-3" class="w-full py-2.5 ms-2 text-sm font-medium text-gray-900">Lock</label>
						</div>
						<div class="flex items-center ps-4 border border-gray-200 rounded-lg w-full">
							<input 
								id="bordered-radio-4" 
								type="radio" 
								value="Unlock" 
								v-model="statusLockFilter"
								name="bordered-radio" 
								class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300"
							>
							<label for="bordered-radio-4" class="w-full py-2.5 ms-2 text-sm font-medium text-gray-900">Unlock</label>
						</div>
					</div>
				</div>

				<!-- Batas Kanban -->
				<div class="mt-5">
					<label for="batas_kanban" class="block mb-2 text-sm font-medium text-gray-900">Batas Kanban</label>
					<div class="flex gap-3">
						<input 
							type="number" 
							id="start" 
							v-model="rangeStart"
							@input="validateRange"
							min="1"
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" 
							placeholder="Start" 
						/>
						<input 
							type="number" 
							id="to" 
							v-model="rangeTo"
							@input="validateRange"
							min="1"
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" 
							placeholder="To" 
						/>
					</div>
					<p v-if="rangeError" class="mt-2 text-sm text-red-600">{{ rangeError }}</p>
				</div>

				<!-- Button Apply Filter -->
				<div class="mt-5 flex gap-3 justify-end">
					<button 
						@click="applyFilter"
						:disabled="!!rangeError"
						class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
					>
						Apply Filter
					</button>
					<button 
						@click="clearSelection"
						class="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:ring-4 focus:ring-gray-300"
					>
						Clear Selection
					</button>
				</div>
			</div>
		</div>

		<div class="w-full">
			<div class="flex gap-5 items-center w-full mb-3">
				<!-- Button Print -->
				<div class="flex justify-end">
					<button 
						@click="processSelectedRows"
						class="gap-2 inline-flex px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-800"
					>
						<svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
							<path stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M16.444 18H19a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2.556M17 11V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v6h10ZM7 15h10v4a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-4Z"/>
						</svg>
						Print Kanban
					</button>
				</div>
			
				<!-- Count selected rows -->
				<div class="text-sm text-gray-600">
					<p>Selected: {{ selectedRows.size }} row(s)</p>
				</div>
			</div>

			<!-- Table -->
			<div class="relative overflow-x-auto shadow-md sm:rounded-lg">
				<table class="w-full text-sm text-center rtl:text-right text-gray-500">
					<thead class="text-xs text-gray-700 uppercase bg-gray-50">
						<tr>
							<th scope="col" class="px-6 py-3">
								No
							</th>
							<th scope="col" class="px-6 py-3">
								Part Number
							</th>
							<th scope="col" class="px-6 py-3">
								Job Number
							</th>
							<th scope="col" class="px-6 py-3">
								Part Name
							</th>
							<th scope="col" class="px-6 py-3">
								ID Kanban
							</th>
							<th scope="col" class="px-6 py-3">
								No. Kanban
							</th>
							<th scope="col" class="px-6 py-3">
								Status
							</th>
							<th scope="col" class="px-6 py-3">
								Status Lock
							</th>
							<th scope="col" class="px-6 py-3">
								Qty Kanban
							</th>
							<th scope="col" class="px-6 py-3">
								Tipe Pallet
							</th>
							<th scope="col" class="px-6 py-3">
								Storage
							</th>
							<th scope="col" class="px-6 py-3">
								Car Model
							</th>
							<th scope="col" class="px-6 py-3">
								Customer
							</th>
							<th scope="col" class="px-6 py-3">
								Line
							</th>
							<th scope="col" class="px-6 py-3">
								To
							</th>
						</tr>
					</thead>
					<tbody>
						<tr 
							v-if="dataTable && dataTable.length > 0"
							v-for="(item, index) in dataTable"
							:key="index"
							@click="toggleRowSelection(index)"
							:class="[
								'border-b border-gray-200 cursor-pointer transition-colors',
								isRowSelected(index) 
									? 'bg-blue-100 hover:bg-blue-200' 
									: 'bg-white hover:bg-gray-50'
							]"
						>
							<td class="px-6 py-4">
								<div class="flex items-center justify-center gap-2">
									<input 
										type="checkbox" 
										:checked="isRowSelected(index)"
										@click.stop="toggleRowSelection(index)"
										class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
									>
									{{ index + 1 }}
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								{{ item.part_number }}
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								{{ item.job_number }}
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								{{ item.part_name }}
							</td>
							<td class="px-6 py-4">
								{{ item.id_kanban }}
							</td>
							<td class="px-6 py-4">
								{{ item.no_kanban }}
							</td>
							<td class="px-6 py-4">
								{{ item.status }}
							</td>
							<td class="px-6 py-4">
								{{ item.status_lock }}
							</td>
							<td class="px-6 py-4">
								{{ item.qty_kbn }}
							</td>
							<td class="px-6 py-4">
								{{ item.type_pallet }}
							</td>
							<td class="px-6 py-4">
								{{ item.storage }}
							</td>
							<td class="px-6 py-4">
								{{ item.car }}
							</td>
							<td class="px-6 py-4">
								{{ item.customer }}
							</td>
							<td class="px-6 py-4">
								{{ item.line }}
							</td>
							<td class="px-6 py-4">
								{{ item.line2 }}
							</td>
						</tr>
						<tr v-else>
							<td colspan="15" class="px-6 py-4 text-center">
								No data available
							</td>
						</tr>
					</tbody>
				</table>
			</div>
    </div>
  </div>
</template>

<style>
	.border {
    border: .5px solid #D1D5DB !important;
  }
</style>