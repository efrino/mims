<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useAchievementWld } from '@/stores/Welding/Transaction/Achievement';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useUtilityStore } from '@/stores/utility';
import { useConfigStore } from '@/stores/config';
import { useNotificationStore } from '@/stores/notification';

const page = ref({ title: 'Achievement Welding' });
const breadcrumbs = shallowRef([
  {
    title: 'Welding',
    disabled: false,
    href: '#'
  },
  {
    title: 'Transaction',
    disabled: false,
    href: '#'
  },
  {
    title: 'Achievement',
    disabled: true,
    href: '#'
  }
]);

const storeAch = useAchievementWld();
const { cleanData, selectedPrefixLine, selectedLineId, isModalFilterOpen, filter, currentPatan, permissions } = storeToRefs(storeAch);
const router = useRouter();
const utils = useUtilityStore();
const configStore = useConfigStore();
const notificationStore = useNotificationStore();

const excelRef = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  page.value.title = `Achievement Welding - ${utils.dateMonth(filter.value.date)} Shift ${filter.value.shift}`;
  await storeAch.fetchData();
});

const viewAll = (line: string) => {
  selectedPrefixLine.value = line;
  router.push({ name: 'transaction-welding-achievement-showline' });
};

const viewDetail = (line: string, line_id: string) => {
  selectedPrefixLine.value = line;
  selectedLineId.value = line_id;
  router.push({ name: 'transaction-welding-achievement-detail' });
};

const closeModal = () => {
  isModalFilterOpen.value = false;
};

const filterData = async () => {
  page.value.title = `Achievement Welding - ${utils.dateMonth(filter.value.date)} Shift ${filter.value.shift}`;
  await storeAch.fetchData();
};

const editData = async (line: string, line_id: string) => {
  selectedPrefixLine.value = line;
  selectedLineId.value = line_id;
  if (!(await storeAch.canOpenForm())) {
    router.push({ name: 'transaction-welding-achievement-detail' });
    return;
  }
  storeAch.openFormEdit(currentPatan.value);
  router.push({ name: 'transaction-welding-achievement-detail-edit' });
};

const openFile = () => {
  excelRef.value?.click();
};

const handleFileUpload = async (e: Event): Promise<void> => {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) {
    notificationStore.loading = false;
    return;
  }

  const file: File = target.files[0];

  await storeAch.uploadFileXlsx(file);
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-col gap-8">
    <!-- Buttons -->
    <div class="flex flex-wrap gap-3">
      <a
        type="button"
        :href="`http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/download_template_excel`"
        class="flex items-center gap-2 h-fit capitalize text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
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
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2m-8 1V4m0 12-4-4m4 4 4-4"
          />
        </svg>
        <span class="capitalize">Template Report</span>
      </a>
      <div>
        <input type="file" ref="excelRef" class="hidden" accept=".xlsx,.xls" @change="handleFileUpload" />
        <button
          type="button"
          @click="openFile"
          class="flex items-center gap-2 h-fit capitalize text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
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
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h3a3 3 0 0 0 0-6h-.025a5.56 5.56 0 0 0 .025-.5A5.5 5.5 0 0 0 7.207 9.021C7.137 9.017 7.071 9 7 9a4 4 0 1 0 0 8h2.167M12 19v-9m0 0-2 2m2-2 2 2"
            />
          </svg>
          <span class="capitalize">Report Actual</span>
        </button>
      </div>
      <button
        type="button"
        @click="isModalFilterOpen = true"
        class="flex items-center gap-2 h-fit capitalize text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
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
        <span class="capitalize">Filter Data</span>
      </button>
    </div>

    <!-- Card -->
    <div v-if="cleanData && cleanData.length > 0" class="flex flex-wrap gap-5 justify-center mt-5">
      <div
        v-for="(value, i) in cleanData"
        :key="i"
        class="rounded-lg shadow bg-white text-blue-700 hover:shadow-lg transition hover-menu h-fit"
        style="border-top: 5px solid"
      >
        <div class="p-6 flex justify-between items-start w-md">
          <!-- LEFT -->
          <span class="text-xl font-semibold"> LINE {{ value.prefix_line_id }} </span>

          <!-- RIGHT BUTTONS -->
          <div v-if="value.total_line_id > 1" class="flex items-center space-x-1" @click="viewAll(value.prefix_line_id)">
            <button class="px-3 py-1 text-sm rounded text-blue-600 outline-1 transition me-2 hover:text-gray-800">view all</button>
          </div>

          <div v-else class="flex items-center space-x-1">
            <button
              @click="viewDetail(value.prefix_line_id, value.detail[0].line_id)"
              class="w-7 h-7 flex items-center justify-center rounded-full outline-1 text-blue-600 outline-offset-1 outline-solid transition me-2"
            >
              <i class="mdi mdi-eye text-sm"></i>
            </button>

            <button
              @click="editData(value.prefix_line_id, value.detail[0].line_id)"
              class="px-3 py-1 text-sm rounded transition me-2"
              :disabled="!permissions.create && !permissions.update && !permissions.pcd"
              :class="
                permissions.update || permissions.create || permissions.pcd
                  ? 'text-green-600 outline-1 border-green-600'
                  : 'text-gray-600 outline-1 border-gray-600 bg-gray-200 cursor-not-allowed'
              "
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex w-full justify-center mt-16">
      <p class="text-gray-400 text-center text-xl font-medium">
        Tidak ada data untuk tanggal <br />
        {{ utils.dateMonth(filter.date) }} Shift {{ filter.shift }}
      </p>
    </div>
  </div>

  <!-- Modal Filter Data -->
  <Transition name="modal">
    <div
      v-if="isModalFilterOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModal"
    >
      <div class="relative p-4 w-lg max-h-full">
        <!-- Modal content -->
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <!-- Modal header -->
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200">
            <h1 class="text-gray-600 text-xl font-semibold">Filter Data</h1>
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
          <!-- Modal body -->
          <div class="p-4 md:p-5">
            <form>
              <div class="mb-5">
                <label for="date" class="block mb-2 text-sm font-medium text-gray-900">Date</label>
                <input
                  type="date"
                  id="date"
                  v-model="filter.date"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div class="mb-5">
                <label for="shift" class="block mb-2 text-sm font-medium text-gray-900">Shift</label>
                <select
                  id="shift"
                  v-model="filter.shift"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                >
                  <option value="" disabled>Pilih</option>
                  <option value="1">Shift 1</option>
                  <option value="2">Shift 2</option>
                </select>
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
                  @click="filterData()"
                  class="text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  Filter Data
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
.hover-menu {
  transition: transform 0.3s ease-in-out;
}

.hover-menu:hover {
  transform: scale(1.1);
}

.border {
  border: 1px solid #e5e7eb !important;
}

/* Modal Transition */
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
