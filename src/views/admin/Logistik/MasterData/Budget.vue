<script setup lang="ts">
import { onMounted, ref, shallowRef, computed } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useBudgetStore } from '@/stores/Logistik/MasterData/Budget';
import { storeToRefs } from 'pinia';
import { useUtilityStore } from '@/stores/utility';

const page = ref({ title: '' });
const breadcrumbs = shallowRef([
  {
    title: 'Logistik',
    disabled: false,
    href: '#'
  },
  {
    title: 'Master Data',
    disabled: false,
    href: '#'
  },
  {
    title: 'Budget',
    disabled: true,
    href: '#'
  }
]);

const budgetStore = useBudgetStore();
const { data, isModalUpdateOpen, filter, form, isModalFilterOpen, action, departmentList } = storeToRefs(budgetStore);
let year = ref('');
let month = ref('');
const utils = useUtilityStore();

const currentPage = ref(1);
const itemsPerPage = ref(10);

const filteredData = computed(() => {
  if (!data.value?.data) return [];
  return data.value.data;
});

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredData.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredData.value.length / itemsPerPage.value);
});

const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value + 1;
  const end = Math.min(currentPage.value * itemsPerPage.value, filteredData.value.length);
  const total = filteredData.value.length;
  return { start, end, total };
});

const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages.value, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  return pages;
});

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const changeItemsPerPage = (value: number) => {
  itemsPerPage.value = value;
  currentPage.value = 1;
};

const closeModal = () => {
  isModalUpdateOpen.value = false;
  isModalFilterOpen.value = false;
  action.value = 'add';

  form.value = {
    ZMATL: '',
    ZDESK: '',
    ZPLAN: '',
    ZSATUAN: '',
    ZPRESS: '',
    ZWELD: '',
    ZLOG: '',
    ZDIEMTC: '',
    ZDIEMFG: '',
    ZPSPRESS: '',
    ZPSWELDING: '',
    ZTOOLJIG: '',
    ZQC: '',
    ZGA: '',
    department: '',
    period: ''
  };
};

const setFilter = async () => {
  isModalFilterOpen.value = false;
  filter.value.period = `${year.value}-${month.value}`;
  await budgetStore.fetchDataBudget();
  page.value.title = `Master Data Budget ${utils.dateMonthFull(filter.value.period)}`;
  currentPage.value = 1;
};

const editData = (id: string) => {
  budgetStore.detailData(id);
};

onMounted(async () => {
  await budgetStore.fetchDataBudget();
  page.value.title = `Master Data Budget ${utils.dateMonthFull(filter.value.period)}`;
  year.value = filter.value.period.split('-')[0];
  month.value = filter.value.period.split('-')[1];
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

  <div class="shadow-md sm:rounded-lg bg-white">
    <div class="flex justify-between items-center p-6 border-b border-gray-200">
      <h2 class="text-xl font-semibold text-gray-800">{{ filter.department }} Department</h2>
      <div class="flex gap-3">
        <button
          type="button"
          @click="isModalFilterOpen = true"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
        >
          <svg
            class="w-5 h-5 text-white"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="2"
              d="M18.796 4H5.204a1 1 0 0 0-.753 1.659l5.302 6.058a1 1 0 0 1 .247.659v4.874a.5.5 0 0 0 .2.4l3 2.25a.5.5 0 0 0 .8-.4v-7.124a1 1 0 0 1 .247-.659l5.302-6.059c.566-.646.106-1.658-.753-1.658Z"
            />
          </svg>
          Filter Data
        </button>
        <button
          type="button"
          @click="isModalUpdateOpen = true"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
        >
          Tambah Data
        </button>
      </div>
    </div>

    <div class="relative overflow-x-auto">
      <div v-if="data.data && data.data.length > 0">
        <table class="w-full text-sm text-left rtl:text-right text-gray-500">
          <thead class="text-xs text-gray-700 bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3">Code Material</th>
              <th scope="col" class="px-6 py-3">Material Description</th>
              <th scope="col" class="px-6 py-3">Budget</th>
              <th scope="col" class="px-6 py-3">Actual</th>
              <th scope="col" class="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(value, i) in paginatedData" :key="i + value.ZMATL" class="bg-white border-b border-gray-200 hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">{{ value.ZMATL }}</td>
              <td class="px-6 py-4 whitespace-nowrap">{{ value.ZDESK }}</td>
              <td class="px-6 py-4 whitespace-nowrap">{{ value.ZPLAN }}</td>
              <td class="px-6 py-4 whitespace-nowrap">{{ value.ZQTY }}</td>
              <td class="px-6 py-4">
                <button @click="editData(value.ZMATL)" class="text-blue-600 hover:text-blue-800">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    ></path>
                  </svg>
                </button>
              </td>
            </tr>
            <tr v-if="paginatedData.length === 0">
              <td colspan="5" class="px-6 py-8 text-center text-gray-400">No data available</td>
            </tr>
          </tbody>
        </table>

        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-white border-t border-gray-200">
          <!-- Left side: Pagination Info + Show Entries -->
          <div class="flex items-center gap-4 order-1 sm:order-1">
            <div class="text-sm text-gray-700">
              Showing <span class="font-semibold text-gray-700">{{ paginationInfo.start }}</span> to
              <span class="font-semibold text-gray-700">{{ paginationInfo.end }}</span> of
              <span class="font-semibold text-gray-700">{{ paginationInfo.total }}</span> entries
            </div>
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-700">Show</label>
              <select
                v-model.number="itemsPerPage"
                @change="changeItemsPerPage(itemsPerPage)"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 px-4"
              >
                <option :value="5">5</option>
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
              <label class="text-sm text-gray-700">entries</label>
            </div>
          </div>

          <!-- Right side: Pagination Buttons -->
          <nav aria-label="Page navigation" class="order-2 sm:order-2">
            <ul class="inline-flex -space-x-px text-sm h-8">
              <li>
                <button
                  @click="goToPage(currentPage - 1)"
                  :disabled="currentPage === 1"
                  :class="[
                    'flex items-center justify-center px-2 h-8 leading-tight border border-gray-300 rounded-l-lg',
                    currentPage === 1
                      ? 'text-gray-300 bg-white cursor-not-allowed'
                      : 'text-gray-500 bg-white hover:bg-gray-100 hover:text-gray-700'
                  ]"
                >
                  <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14 8-4 4 4 4" />
                  </svg>
                </button>
              </li>

              <li v-for="pageNum in visiblePages" :key="pageNum">
                <button
                  @click="goToPage(pageNum)"
                  :class="[
                    'flex items-center justify-center px-3 h-8 leading-tight border border-gray-300',
                    pageNum === currentPage
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700'
                      : 'text-gray-500 bg-white hover:bg-gray-100 hover:text-gray-700'
                  ]"
                >
                  {{ pageNum }}
                </button>
              </li>

              <li>
                <button
                  @click="goToPage(currentPage + 1)"
                  :disabled="currentPage === totalPages"
                  :class="[
                    'flex items-center justify-center px-2 h-8 leading-tight border border-gray-300 rounded-r-lg',
                    currentPage === totalPages
                      ? 'text-gray-300 bg-white cursor-not-allowed'
                      : 'text-gray-500 bg-white hover:bg-gray-100 hover:text-gray-700'
                  ]"
                >
                  <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m10 16 4-4-4-4" />
                  </svg>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div v-else>
        <h1 class="w-full text-center p-5 text-gray-400 font-medium">Data belum tersedia...</h1>
      </div>
    </div>
  </div>

  <!-- Modal Add Data-->
  <Transition name="modal">
    <div
      v-if="isModalUpdateOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModal"
    >
      <div class="relative p-4 w-lg max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200">
            <h1 class="text-gray-600 text-xl font-semibold capitalize">{{ action }} Data Budget {{ filter.department }}</h1>
            <button
              type="button"
              @click="closeModal"
              class="end-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
            >
              <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
              <span class="sr-only">Close modal</span>
            </button>
          </div>
          <div class="p-4 md:p-5">
            <form>
              <div class="mb-5">
                <label for="code_material" class="block mb-2 text-sm font-medium text-gray-900">Code Material</label>
                <input
                  type="text"
                  id="code_material"
                  :disabled="action == 'edit'"
                  v-model="form.ZMATL"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  :class="action == 'edit' ? 'cursor-not-allowed' : ''"
                  required
                />
              </div>
              <div class="mb-5">
                <label for="material_desc" class="block mb-2 text-sm font-medium text-gray-900">Material Description</label>
                <input
                  type="text"
                  id="material_desc"
                  v-model="form.ZDESK"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div class="mb-8">
                <label for="budget" class="block mb-2 text-sm font-medium text-gray-900">Budget</label>
                <input
                  type="number"
                  id="budget"
                  v-model="form.ZPLAN"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div>
                <button
                  type="button"
                  @click="budgetStore.updateData()"
                  class="w-full text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  {{ action == 'edit' ? 'Simpan Perubahan' : 'Tambah Data' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Modal Filter Data-->
  <Transition name="modal">
    <div
      v-if="isModalFilterOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModal"
    >
      <div class="relative p-4 w-lg max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200">
            <h1 class="text-gray-600 text-xl font-semibold">Filter Data Budget</h1>
            <button
              type="button"
              @click="closeModal"
              class="end-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
            >
              <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
              <span class="sr-only">Close modal</span>
            </button>
          </div>
          <div class="p-4 md:p-5">
            <form>
              <div class="mb-5">
                <label for="departement" class="block mb-2 text-sm font-medium text-gray-900">Department</label>
                <select
                  v-model="filter.department"
                  id="status"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                >
                  <option value="" disabled>Pilih</option>
                  <option v-for="(value, i) in departmentList" :key="i" :value="value">{{ value }}</option>
                </select>
              </div>
              <div class="mb-5">
                <label for="period" class="block mb-2 text-sm font-medium text-gray-900">Periode</label>
                <div class="flex gap-3">
                  <select
                    v-model="month"
                    id="status"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    required
                  >
                    <option value="" disabled>Pilih</option>
                    <option value="01">Januari</option>
                    <option value="02">Februari</option>
                    <option value="03">Maret</option>
                    <option value="04">April</option>
                    <option value="05">Mei</option>
                    <option value="06">Juni</option>
                    <option value="07">Juli</option>
                    <option value="08">Agustus</option>
                    <option value="09">September</option>
                    <option value="10">Oktober</option>
                    <option value="11">November</option>
                    <option value="12">Desember</option>
                  </select>
                  <select
                    v-model="year"
                    id="status"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    required
                  >
                    <option value="" disabled>Pilih</option>
                    <option v-for="i in 5" :key="i" :value="new Date().getFullYear() - (i - 1)">
                      {{ new Date().getFullYear() - (i - 1) }}
                    </option>
                  </select>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  @click="setFilter()"
                  class="w-full text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 mt-5 text-center"
                >
                  Set Filter
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
.border {
  border: 1px solid #e5e7eb !important;
}
.border-b {
  border-bottom: 1px solid #e5e7eb !important;
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
