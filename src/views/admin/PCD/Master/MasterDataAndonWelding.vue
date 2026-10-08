<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useMasterAndonWld } from '@/stores/PCD/Master/MasterDataAndonWelding';
import { storeToRefs } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import type { PlanAndActual, MasterPart } from '@/types/PCD/Master/MasterAndonWelding';

const page = ref({ title: 'Master Andon Welding' });
const breadcrumbs = shallowRef([
  {
    title: 'PCD',
    disabled: false,
    href: '#'
  },
  {
    title: 'Master',
    disabled: false,
    href: '#'
  },
  {
    title: 'Master Andon Welding',
    disabled: true,
    href: '#'
  }
]);

const notificationStore = useNotificationStore();
const activeTab = ref('plan');
const storeAndon = useMasterAndonWld();
const { planData, actualData, partData, isModalActualOpen, isModalPartOpen, isModalPlanOpen, form, action } = storeToRefs(storeAndon);

const isLoadingPlan = ref(true);
const isLoadingActual = ref(true);
const isLoadingPart = ref(true);
const tableKey_plan = ref(0);
const tableKey_actual = ref(0);
const tableKey_part = ref(0);

const columnsPlan: TableColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'information', label: 'Keterangan' }
];

const columnsActual: TableColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'information', label: 'Keterangan' }
];

const columnsPart: TableColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'part_number', label: 'Part Number' },
  { key: 'job_number', label: 'Job Number' },
  { key: 'line', label: 'Line' },
  { key: 'model', label: 'Model' }
];

onMounted(async () => {
  isLoadingPlan.value = true;
  await storeAndon.fetchPlanData();
  isLoadingPlan.value = false;
  tableKey_plan.value++;

  isLoadingActual.value = true;
  await storeAndon.fetchActualData();
  isLoadingActual.value = false;
  tableKey_actual.value++;

  isLoadingPart.value = true;
  await storeAndon.fetchMasterPart();
  isLoadingPart.value = false;
  tableKey_part.value++;
});

const tabs = [
  { id: 'plan', label: 'Keterangan Planning' },
  { id: 'act', label: 'Keterangan Actual' },
  { id: 'part', label: 'Part Number' }
];

const addData = () => {
  switch (activeTab.value) {
    case 'plan':
      isModalPlanOpen.value = true;
      break;
    case 'act':
      isModalActualOpen.value = true;
      break;
    case 'part':
      isModalPartOpen.value = true;
      break;
    default:
      notificationStore.showDialogWarning('Warning', 'Harap coba beberapa saat lagi');
  }
};

const closeModal = () => {
  isModalActualOpen.value = false;
  isModalPlanOpen.value = false;
  isModalPartOpen.value = false;

  const initialForm = {
    id: '',
    information: '',
    part_number: '',
    job_number: '',
    line: '',
    model: ''
  };

  form.value = { ...initialForm };
  action.value = 'add';
};

const editPlan = (row: Record<string, unknown>) => {
  action.value = 'edit';
  storeAndon.detailPlan(row as unknown as PlanAndActual);
};

const editActual = (row: Record<string, unknown>) => {
  action.value = 'edit';
  storeAndon.detailActual(row as unknown as PlanAndActual);
};

const editPart = (row: Record<string, unknown>) => {
  action.value = 'edit';
  storeAndon.detailPart(row as unknown as MasterPart);
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="mx-auto">
    <div class="bg-white rounded-lg shadow-sm">
      <div class="border-b border-gray-200 flex justify-between items-center pt-3">
        <nav class="flex -mb-px">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'px-6 py-4 text-sm font-medium transition-colors',
              activeTab === tab.id ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            {{ tab.label }}
          </button>
        </nav>
        <button
          type="button"
          @click="addData"
          class="flex items-center gap-2 h-fit capitalize text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 mx-6 text-center"
        >
          <span class="capitalize">Tambah Data {{ activeTab == 'act' ? 'Actual' : activeTab == 'part' ? 'Part Number' : activeTab }}</span>
        </button>
      </div>

      <div class="px-2">
        <div v-show="activeTab === 'plan'" class="overflow-x-auto">
          <TableExcel
            :key="tableKey_plan"
            :columns="columnsPlan"
            :data="(planData as unknown as Record<string, unknown>[])"
            :loading="isLoadingPlan"
          >
            <template #actions="{ row }">
              <button type="button" @click="editPlan(row)" class="text-blue-600 hover:text-blue-800 inline-flex justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  ></path>
                </svg>
              </button>
            </template>
          </TableExcel>
        </div>

        <div v-show="activeTab === 'act'" class="overflow-x-auto">
          <TableExcel
            :key="tableKey_actual"
            :columns="columnsActual"
            :data="(actualData as unknown as Record<string, unknown>[])"
            :loading="isLoadingActual"
          >
            <template #actions="{ row }">
              <button type="button" @click="editActual(row)" class="text-blue-600 hover:text-blue-800 inline-flex justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  ></path>
                </svg>
              </button>
            </template>
          </TableExcel>
        </div>

        <div v-show="activeTab === 'part'" class="overflow-x-auto">
          <TableExcel
            :key="tableKey_part"
            :columns="columnsPart"
            :data="(partData as unknown as Record<string, unknown>[])"
            :loading="isLoadingPart"
          >
            <template #actions="{ row }">
              <button type="button" @click="editPart(row)" class="text-blue-600 hover:text-blue-800 inline-flex justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  ></path>
                </svg>
              </button>
            </template>
          </TableExcel>
        </div>
      </div>
    </div>
  </div>

  <Transition name="modal">
    <div
      v-if="isModalPlanOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModal"
    >
      <div class="relative p-4 w-lg max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200">
            <h1 class="text-gray-600 text-xl font-semibold">{{ action == 'add' ? 'Tambah' : 'Edit' }} Data Keterangan Plan</h1>
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
                <label for="information" class="block mb-2 text-sm font-medium text-gray-900">Keterangan</label>
                <input
                  type="text"
                  id="information"
                  v-model="form.information"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div class="flex gap-5 justify-end mt-10">
                <button
                  type="button"
                  @click="closeModal"
                  class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
                >
                  Cencel
                </button>
                <button
                  type="button"
                  @click="storeAndon.onUpdate('plan')"
                  class="text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <Transition name="modal">
    <div
      v-if="isModalActualOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModal"
    >
      <div class="relative p-4 w-lg max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200">
            <h1 class="text-gray-600 text-xl font-semibold">{{ action == 'add' ? 'Tambah' : 'Edit' }} Data Keterangan Actual</h1>
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
                <label for="information" class="block mb-2 text-sm font-medium text-gray-900">Keterangan</label>
                <input
                  type="text"
                  id="information"
                  v-model="form.information"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div class="flex gap-5 justify-end mt-10">
                <button
                  type="button"
                  @click="closeModal"
                  class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
                >
                  Cencel
                </button>
                <button
                  type="button"
                  @click="storeAndon.onUpdate('act')"
                  class="text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <Transition name="modal">
    <div
      v-if="isModalPartOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModal"
    >
      <div class="relative p-4 w-lg max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200">
            <h1 class="text-gray-600 text-xl font-semibold">{{ action == 'add' ? 'Tambah' : 'Edit' }} Data Part Number</h1>
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
                <label for="part_number" class="block mb-2 text-sm font-medium text-gray-900">Part Number</label>
                <input
                  type="text"
                  id="part_number"
                  v-model="form.part_number"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div class="mb-5">
                <label for="job_number" class="block mb-2 text-sm font-medium text-gray-900">Job Number</label>
                <input
                  type="text"
                  id="job_number"
                  v-model="form.job_number"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div class="mb-5">
                <label for="line" class="block mb-2 text-sm font-medium text-gray-900">Line</label>
                <input
                  type="text"
                  id="line"
                  v-model="form.line"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div class="mb-5">
                <label for="model" class="block mb-2 text-sm font-medium text-gray-900">Model</label>
                <input
                  type="text"
                  id="model"
                  v-model="form.model"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div class="flex gap-5 justify-end mt-10">
                <button
                  type="button"
                  @click="closeModal"
                  class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
                >
                  Cencel
                </button>
                <button
                  type="button"
                  @click="storeAndon.onUpdate('part')"
                  class="text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  Save
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
.border-b-2 {
  border-bottom: 2px solid #3b82f6 !important;
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
