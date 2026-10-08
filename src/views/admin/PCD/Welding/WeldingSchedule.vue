<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useWeldingSchedule } from '@/stores/PCD/Welding/WeldingSchedule';
import { storeToRefs } from 'pinia';
import { useUtilityStore } from '@/stores/utility';
import { useRouter } from 'vue-router';
import { useConfigStore } from '@/stores/config';
import * as XLSX from 'xlsx';
import { useNotificationStore } from '@/stores/notification';

const page = ref({ title: '' });
const breadcrumbs = shallowRef([
  {
    title: 'PCD',
    disabled: false,
    href: '#'
  },
  {
    title: 'Welding',
    disabled: false,
    href: '#'
  },
  {
    title: 'Welding Schedule',
    disabled: true,
    href: '#'
  }
]);

const store = useWeldingSchedule();
const {
  dataTable,
  filter,
  isModalAddOpen,
  isModalFilterOpen,
  formData,
  lineList,
  isModalTagOKOpen,
  errorCount,
  dataTablesUpload,
  isModalUploadXlsx,
  permissions
} = storeToRefs(store);
const utility = useUtilityStore();
const router = useRouter();
const configStore = useConfigStore();
const excelRef = ref<HTMLInputElement | null>(null);
const notificationStore = useNotificationStore();

onMounted(async () => {
  await store.getDataTable();
  await store.getLineList();

  page.value.title = `Welding Schedule (Periode ${utility.dateMonthFull(filter.value.date)} Shift ${filter.value.shift})`;
});

const closeModal = () => {
  isModalAddOpen.value = false;
  isModalFilterOpen.value = false;
  isModalTagOKOpen.value = false;
  isModalUploadXlsx.value = false;

  // clear formData value
  Object.keys(formData.value).forEach((key) => {
    (formData.value as any)[key] = '';
  });

  // clear upload patan data
  dataTablesUpload.value = [];
  excelRef.value = null;
};

const filterData = async () => {
  await store.getDataTable();
  page.value.title = `Welding Schedule (Periode ${utility.dateMonthFull(filter.value.date)} Shift ${filter.value.shift})`;
};

const previewTagOK = async () => {
  await store.previewTagOK();
  router.push({ name: 'print-tagOK-welding-schedule' });
};

const openFile = () => {
  excelRef.value?.click();
};

const handleFileUpload = (e: Event) => {
  notificationStore.loading = true;

  const input = e.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) {
    notificationStore.loading = false;
    return;
  }

  const file = input.files[0];

  const reader = new FileReader();
  errorCount.value = 0;

  reader.onloadend = () => {
    try {
      const read = new Uint8Array(reader.result as ArrayBuffer);
      const wb = XLSX.read(read, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];

      const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

      const keys = ['period', 'line_id', 'patan', 'total_process', 'part_number', 'stroke', 'lotsize', 'tpt', 'uph', 'status_plan'];

      const items: any[] = [];

      data.slice(1).forEach((rows) => {
        const item: any = {
          ERROR: '',
          ERROR_UPLOAD: ''
        };

        keys.forEach((key, i) => {
          item[key] = rows?.[i] ?? '';
        });

        if (!item.period) {
          errorCount.value++;
          item.ERROR += (item.ERROR ? ',\n' : '') + 'Period tidak boleh kosong.';
        }

        if (!item.line_id) {
          errorCount.value++;
          item.ERROR += (item.ERROR ? ',\n' : '') + 'Line tidak boleh kosong.';
        }

        if (!item.patan) {
          errorCount.value++;
          item.ERROR += (item.ERROR ? ',\n' : '') + 'Patan tidak boleh kosong.';
        }

        if (!item.part_number) {
          errorCount.value++;
          item.ERROR += (item.ERROR ? ',\n' : '') + 'Part Number tidak boleh kosong.';
        }

        items.push(item);
      });

      dataTablesUpload.value = items;
      isModalUploadXlsx.value = true;
    } catch (err) {
      notificationStore.showDialogWarning('warning', 'Cek kembali data yang akan diupload');
    } finally {
      setTimeout(() => {
        notificationStore.loading = false;
        if (excelRef.value) excelRef.value.value = '';
      }, 1000);
    }
  };

  reader.readAsArrayBuffer(file);
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-col">
    <!-- Buttons -->
    <div class="flex justify-between mb-3">
      <div class="flex gap-5">
        <button
          type="button"
          @click="isModalAddOpen = true"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
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
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7 7V5" />
          </svg>
          Tambah Data
        </button>
        <button
          type="button"
          @click="isModalFilterOpen = true"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
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
        <a
          type="button"
          :href="`http://${configStore.apiUrl}/majsf_rest_api/api/master/patan/export?period=${formData.period}`"
          class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
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
          Patan Period
        </a>
        <div>
          <input type="file" ref="excelRef" class="hidden" accept=".xlsx,.xls" @change="handleFileUpload" />
          <button
            type="button"
            @click="openFile"
            class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
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
                d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2M12 4v12m0-12 4 4m-4-4L8 8"
              />
            </svg>
            Upload Patan
          </button>
        </div>
      </div>

      <div>
        <button
          type="button"
          @click="isModalTagOKOpen = true"
          disabled
          class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
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
              stroke-linejoin="round"
              stroke-width="2"
              d="M16.444 18H19a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2.556M17 11V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v6h10ZM7 15h10v4a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-4Z"
            />
          </svg>
          Print Tag OK
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="w-full">
      <div class="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table class="w-full text-sm text-center text-gray-500">
          <thead class="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3">Period</th>
              <th scope="col" class="px-6 py-3">Line</th>
              <th scope="col" class="px-6 py-3">Patan</th>
              <th scope="col" class="px-6 py-3">Total Process</th>
              <th scope="col" class="px-6 py-3">Part Number</th>
              <th scope="col" class="px-6 py-3">Stroke</th>
              <th scope="col" class="px-6 py-3">Lot Size</th>
              <th scope="col" class="px-6 py-3">TPT (Menit)</th>
              <th scope="col" class="px-6 py-3">UPH Plan</th>
              <th scope="col" class="px-6 py-3">Status Plan</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="dataTable && dataTable.length != 0"
              v-for="(value, index) in dataTable"
              :key="index"
              class="odd:bg-white even:bg-gray-50 border-b border-gray-200"
            >
              <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                {{ value.period }}
              </th>
              <td class="px-6 py-4">
                {{ value.line_id }}
              </td>
              <td class="px-6 py-4">
                {{ value.patan }}
              </td>
              <td class="px-6 py-4">
                {{ value.total_process }}
              </td>
              <td class="px-6 py-4">
                {{ value.part_number }}
              </td>
              <td class="px-6 py-4">
                {{ value.stroke }}
              </td>
              <td class="px-6 py-4">
                {{ value.lotsize }}
              </td>
              <td class="px-6 py-4">
                {{ value.tpt }}
              </td>
              <td class="px-6 py-4">
                {{ value.uph }}
              </td>
              <td class="px-6 py-4">
                {{ value.status_plan }}
              </td>
            </tr>
            <tr v-else>
              <td colspan="10" class="text-center py-5">No data available</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Modal Add Data -->
  <Transition name="modal">
    <div
      v-if="isModalAddOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModal"
    >
      <div class="relative p-4 w-4xl max-h-full">
        <!-- Modal content -->
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <!-- Modal header -->
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200">
            <h1 class="text-gray-600 text-xl font-semibold">Add Data Patan</h1>
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
              <div class="flex gap-10 mb-5">
                <div class="w-full">
                  <div class="mb-5">
                    <label for="date" class="block mb-2 text-sm font-medium text-gray-900">Date</label>
                    <input
                      type="date"
                      v-model="formData.date"
                      id="date"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div class="mb-5">
                    <label for="shift" class="block mb-2 text-sm font-medium text-gray-900">Shift</label>
                    <select
                      id="shift"
                      v-model="formData.shift"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="" disabled>Pilih</option>
                      <option value="1">Shift 1</option>
                      <option value="2">Shift 2</option>
                    </select>
                  </div>
                  <div class="mb-5">
                    <label for="patan" class="block mb-2 text-sm font-medium text-gray-900">Patan</label>
                    <select
                      id="patan"
                      v-model="formData.patan"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="" disabled>Pilih</option>
                      <option value="A - C">A - C</option>
                      <option value="B - D">B - D</option>
                    </select>
                  </div>
                  <div class="mb-5">
                    <label for="line" class="block mb-2 text-sm font-medium text-gray-900">Line</label>
                    <select
                      id="line"
                      v-model="formData.line_id"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="" disabled>Pilih</option>
                      <option v-for="(value, i) in lineList" :key="i" :value="value.line">{{ value.line }}</option>
                    </select>
                  </div>
                  <div class="mb-5">
                    <label for="lot_size" class="block mb-2 text-sm font-medium text-gray-900">Lot Size</label>
                    <input
                      type="number"
                      v-model="formData.lotsize"
                      id="lot_size"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                </div>

                <div class="w-full">
                  <div class="mb-5">
                    <label for="part_number" class="block mb-2 text-sm font-medium text-gray-900">Part Number</label>
                    <input
                      type="text"
                      id="part_number"
                      v-model="formData.part_number"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div class="mb-5">
                    <label for="job_number" class="block mb-2 text-sm font-medium text-gray-900">Job Number</label>
                    <input
                      type="text"
                      id="job_number"
                      v-model="formData.job_number"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div class="mb-5">
                    <label for="TPT" class="block mb-2 text-sm font-medium text-gray-900">TPT (Menit)</label>
                    <input
                      type="number"
                      id="TPT"
                      v-model="formData.tpt"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div class="mb-5">
                    <label for="stroke" class="block mb-2 text-sm font-medium text-gray-900">Stroke</label>
                    <input
                      type="number"
                      id="stroke"
                      v-model="formData.stroke"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div class="mb-5">
                    <label for="UPH" class="block mb-2 text-sm font-medium text-gray-900">UPH</label>
                    <input
                      type="number"
                      id="UPH"
                      v-model="formData.uph"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                </div>
              </div>
              <div class="flex gap-5 justify-end">
                <button
                  type="button"
                  @click="closeModal"
                  class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
                >
                  Cencel
                </button>
                <button
                  type="button"
                  @click="store.addData()"
                  class="text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  Add Data
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Modal Upload XLSX Result -->
  <Transition name="modal">
    <div
      v-if="isModalUploadXlsx"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModal"
    >
      <div class="relative p-4 max-h-full">
        <!-- Modal content -->
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <!-- Modal header -->
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200">
            <h1 class="text-gray-600 text-xl font-semibold">Upload Data Patan</h1>
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
            <div class="flex flex-col gap-5 mb-5">
              <div class="flex gap-5 w-full">
                <div class="mb-5 w-full">
                  <label for="date" class="block mb-2 text-sm font-medium text-gray-900">Date</label>
                  <input
                    type="date"
                    v-model="formData.date"
                    id="date"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    required
                  />
                </div>
                <div class="mb-5 w-full">
                  <label for="shift" class="block mb-2 text-sm font-medium text-gray-900">Shift</label>
                  <select
                    id="shift"
                    v-model="formData.shift"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    required
                  >
                    <option value="" disabled>Pilih</option>
                    <option value="1">Shift 1</option>
                    <option value="2">Shift 2</option>
                  </select>
                </div>
              </div>
              <div class="w-full">
                <div class="relative overflow-auto lg:max-w-[1100px] 2xl:max-w-[1730px] lg:max-h-[390px] 2xl:max-h-[590px] sm:rounded-lg">
                  <table class="w-full text-sm text-center rtl:text-right text-gray-500">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th scope="col" class="px-6 py-3">Period</th>
                        <th scope="col" class="px-6 py-3">Line</th>
                        <th scope="col" class="px-6 py-3">Patan</th>
                        <th scope="col" class="px-6 py-3">Jumlah Process</th>
                        <th scope="col" class="px-6 py-3">Part Number</th>
                        <th scope="col" class="px-6 py-3">Stroke</th>
                        <th scope="col" class="px-6 py-3">Lot Size</th>
                        <th scope="col" class="px-6 py-3">TPT (Menit)</th>
                        <th scope="col" class="px-6 py-3">UPH Plan</th>
                        <th scope="col" class="px-6 py-3">Status Plan</th>
                        <th scope="col" class="px-6 py-3">Simulate</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-if="dataTablesUpload && dataTablesUpload.length != 0"
                        v-for="(value, index) in dataTablesUpload"
                        :key="index"
                        class="odd:bg-white even:bg-gray-50 border-b border-gray-200"
                      >
                        <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                          {{ value.period }}
                        </th>
                        <td class="px-6 py-4">
                          {{ value.line_id }}
                        </td>
                        <td class="px-6 py-4">
                          {{ value.patan }}
                        </td>
                        <td class="px-6 py-4">
                          {{ value.total_process }}
                        </td>
                        <td class="px-6 py-4">
                          {{ value.part_number }}
                        </td>
                        <td class="px-6 py-4">
                          {{ value.stroke }}
                        </td>
                        <td class="px-6 py-4">
                          {{ value.lotsize }}
                        </td>
                        <td class="px-6 py-4">
                          {{ value.tpt }}
                        </td>
                        <td class="px-6 py-4">
                          {{ value.uph }}
                        </td>
                        <td class="px-6 py-4">
                          {{ value.status_plan }}
                        </td>
                        <td class="px-6 py-4">
                          <template v-if="value.ERROR != ''">
                            <span class="flex justify-center w-full">
                              <svg
                                class="w-6 h-6 text-red-500"
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
                                  d="M12 13V8m0 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                />
                              </svg>
                            </span>
                          </template>
                          <template v-else>
                            <span class="flex justify-center w-full">
                              <svg
                                class="w-6 h-6 text-green-500"
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
                                  d="M8.5 11.5 11 14l4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                />
                              </svg>
                            </span>
                          </template>
                        </td>
                      </tr>
                      <tr v-else>
                        <td colspan="10" class="text-center py-5">No data available</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div class="flex gap-5 justify-end">
              <button
                type="button"
                @click="closeModal"
                class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
              >
                Cancel
              </button>
              <button
                type="button"
                v-if="permissions.create && dataTablesUpload.length && !errorCount"
                @click="store.handleUpload()"
                class="text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
              >
                Add Data
              </button>
              <div v-else class="flex items-center justify-center text-sm text-red-500 border rounded-lg px-3 cursor-not-allowed">
                Perbaiki data yang error terlebih dulu
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>

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
              <div class="mb-5">
                <label for="line" class="block mb-2 text-sm font-medium text-gray-900">Line</label>
                <select
                  id="line"
                  v-model="filter.line_id"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                >
                  <option value="" disabled>Pilih</option>
                  <option v-for="(value, i) in lineList" :key="i" :value="value.line">{{ value.line }}</option>
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
                  @click="filterData"
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

  <!-- Modal Print Tag OK -->
  <Transition name="modal">
    <div
      v-if="isModalTagOKOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50"
      @click.self="closeModal"
    >
      <div class="relative p-4 w-lg max-h-full">
        <!-- Modal content -->
        <div class="relative bg-white rounded-lg shadow-lg p-5">
          <!-- Modal header -->
          <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-200">
            <h1 class="text-gray-600 text-xl font-semibold">Pilih Data Untuk di Print</h1>
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
                  v-model="formData.date"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div class="mb-5">
                <label for="shift" class="block mb-2 text-sm font-medium text-gray-900">Shift</label>
                <select
                  id="shift"
                  v-model="formData.shift"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                >
                  <option value="" disabled>Pilih</option>
                  <option value="1">Shift 1</option>
                  <option value="2">Shift 2</option>
                </select>
              </div>
              <div class="mb-5">
                <label for="line" class="block mb-2 text-sm font-medium text-gray-900">Line</label>
                <select
                  id="line"
                  v-model="formData.line_id"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                >
                  <option value="" disabled>Pilih</option>
                  <option v-for="(value, i) in lineList" :key="i" :value="value.line">{{ value.line }}</option>
                </select>
              </div>
              <div class="mb-5">
                <label for="tipe_part" class="block mb-2 text-sm font-medium text-gray-900">Tipe Part</label>
                <select
                  id="tipe_part"
                  v-model="formData.tipe_part"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                >
                  <option value="" disabled>Pilih</option>
                  <option value="FP">FP</option>
                  <option value="WIP">WIP</option>
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
                  @click="previewTagOK()"
                  class="text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  Print Preview
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
