<script setup lang="ts">
import { ref, shallowRef, watch, nextTick, onMounted } from 'vue';
import { useUtilityStore } from '@/stores/utility';
import { useIncomingStore } from '@/stores/Logistik/MasterData/Incoming';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';
import { DataTable } from "simple-datatables";
import { useNotificationStore } from '@/stores/notification';
import * as XLSX from "xlsx";

const page = ref({ title: 'Incoming Consumable' });
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
    title: 'Incoming',
    disabled: true,
    href: '#'
  }
]);

const utilityStore = useUtilityStore();
const logistikStore = useIncomingStore();
const notificationStore = useNotificationStore();

const {
  formatPeriod
} = utilityStore

const {
  loadDataMasterIncoming,
  fetchMasterDataIncoming,
  onUpdateIncoming
} = logistikStore

const {
  filter,
  dataTable,
  filterDate,
} = storeToRefs(logistikStore)

let isLoading = ref(true);
let dataTableInstance: any = null;
const tableKey = ref(0);
const isTableReady = ref(true);

const moveDropdownToBottom = (wrapper: Element) => {
  setTimeout(() => {
    const dropdown = wrapper.querySelector(".datatable-top .datatable-dropdown");
    const bottom   = wrapper.querySelector(".datatable-bottom");
    const info     = wrapper.querySelector(".datatable-bottom .datatable-info");

    if (dropdown && bottom && info) {
      info.insertAdjacentElement("afterend", dropdown);
    }
  }, 0);
};

onMounted(async () => {
  await fetchMasterDataIncoming();
});

const destroyDataTable = () => {
  if (dataTableInstance) {
    try {
      dataTableInstance.destroy();
    } catch (error) {
      console.warn("Error destroying DataTable:", error);
    }
    dataTableInstance = null;
  }
};

const initDataTable = () => {
  const tableElement = document.querySelector("#filter-table") as HTMLTableElement | null;
  if (!tableElement) return;

  tableElement.addEventListener("click", (e: Event) => {
    const target = e.target as HTMLElement;
    const button = target.closest(".btn-edit") as HTMLElement | null;
    if (button) {
      const rawData = button.dataset.item;
      if (rawData) {
        try {
          const data = JSON.parse(rawData);
          loadDataMasterIncoming('Edit', data);
          logistikStore.urlPreview = null;
        } catch (error) {
          console.error("Gagal parsing data:", error);
        }
      }
    }
  });

  if (typeof DataTable !== "undefined") {
    dataTableInstance = new DataTable(tableElement, {
      tableRender: (_data, table, type) => {
        if (type === "print") return table;
        const tHead = table?.childNodes![0];
        const firstRowHeaders = tHead?.childNodes![0]?.childNodes;
        const totalColumns = firstRowHeaders?.length || 0;

        const filterHeaders = {
          nodeName: "TR",
          attributes: { class: "search-filtering-row" },
          childNodes: firstRowHeaders?.map((_th, index) => {
            if (index === 0 || index === totalColumns - 1) {
              return { nodeName: "TH", childNodes: [] };
            }
            return {
              nodeName: "TH",
              childNodes: [{
                nodeName: "INPUT",
                attributes: {
                  class: "datatable-input",
                  type: "search",
                  "data-columns": "[" + index + "]"
                }
              }]
            };
          })
        };
        tHead.childNodes?.push(filterHeaders);
        return table;
      }
    });

    const wrapper = tableElement.closest(".datatable-wrapper");
    if (wrapper) moveDropdownToBottom(wrapper);
  }
};

const excelInput = ref<HTMLInputElement | null>(null);
const errorCount = ref(0);

const openFile = () => {
  if (excelInput.value) {
    excelInput.value.click();
  }
};

const handleFileExcelUpload = (e: Event) => {
  isLoading.value = true;
  const target = e.target as HTMLInputElement;
  const files = target.files;

  if (!files || files.length === 0) {
    isLoading.value = false;
    return;
  }

  const excelFile = files[0];
  const reader = new FileReader();
  errorCount.value = 0;

  reader.onloadend = () => {
    const read = new Uint8Array(reader.result as ArrayBuffer);
    const wb = XLSX.read(read, { type: "array" });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];

    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    let items: any[] = [];

    data.slice(1).forEach((rows) => {
      try {
        let item: any = {
          "ERROR": "",
          "ERROR_UPLOAD": "",
          ZMATL: rows[2] || "",
          ZDESK: rows[9] || "",
          ZPLAN: rows[10] || "",
          ZQTY: rows[11] || "",
          ZSATUAN: rows[12] || "",
          ZASPEK: rows[13] || "",
        };

        if (!item["ZMATL"]) {
          errorCount.value++;
          item["ERROR"] = (item["ERROR"] ? item["ERROR"] + ", \n" : "") + "Code Material tidak boleh kosong.";
        }
        items.push(item);

      } catch (error) {
        notificationStore.showDialogWarning('warning',"Cek Kembali Data yang akan diupload");
      }
    });

    logistikStore.dataTable = items;

    logistikStore.dialog.upload = true;

    setTimeout(() => {
      isLoading.value = false;
      if (excelInput.value) excelInput.value.value = '';
    }, 1000);
  };

  reader.readAsArrayBuffer(excelFile);
};

watch(
  () => logistikStore.dataTable,
  async (newValue) => {
    isLoading.value = false;
    if (dataTableInstance) {
      dataTableInstance.destroy();
      dataTableInstance = null;
    }
    isTableReady.value = false;
    await nextTick();
    isTableReady.value = true;
    await nextTick();
    if (newValue && newValue.length > 0) {
      setTimeout(() => {
        initDataTable();
      }, 100);
    }
  },
  { deep: true }
);
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <input type="file" ref="excelInput" class="hidden" accept=".xlsx, .xls" @change="handleFileExcelUpload" />

  <div class="flex flex-wrap items-center gap-3 mb-5">
    <div class="flex items-center gap-2">
    <form class="flex">
      <select v-model="filterDate.month" id="month"
        class="bg-gray-200 min-w-[130px] border border-gray-600 text-gray-900 text-sm rounded-s-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        required>
        <option value="" disabled>Pilih Bulan</option>
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

      <select v-model="filterDate.year" id="year"
        class="bg-gray-200 min-w-[130px] border border-gray-600 text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        required>
        <option value="" disabled>Pilih Tahun</option>
        <option v-for="i in 5" :key="i" :value="String(new Date().getFullYear() - (i - 1))">
          {{ new Date().getFullYear() - (i - 1) }}
        </option>
      </select>

      <button type="button" @click="logistikStore.fetchMasterDataIncoming()"
        class="flex w-full items-center gap-2 whitespace-nowrap text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-e-full text-sm px-3 py-2.5 text-center">
        <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4" />
        </svg>
        Sync Data
      </button>
    </form>

    <a @click="openFile" target="_blank"
      class="flex items-center gap-2 text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-300 dark:focus:ring-green-800 font-medium rounded-full text-sm px-5 py-2.5 text-center decoration-0"
      role="button">
      <svg class="w-5 h-5 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
        fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2M12 4v12m0-12 4 4m-4-4L8 8" />
      </svg>
      Upload Data
    </a>
    </div>
  </div>

  <!-- card -->
  <div
    class="w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden dark:bg-gray-800 dark:border-gray-700">

    <div class="relative bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-600 py-4 px-4 sm:py-4 text-center">

      <div class="absolute inset-0 bg-white/5 opacity-30"
        style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 20px 20px;"></div>

      <div class="relative flex flex-col items-center justify-center space-y-4">

        <h1 class="text-6xl font-extrabold text-white sm:text-4xl md:text-5xl tracking-tight drop-shadow-sm">
          Master Data Incoming
        </h1>

        <div
          class="inline-flex items-center px-5 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white shadow-sm">
          <svg class="w-5 h-5 mr-2 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <span class="font-semibold text-xl tracking-wide">
            {{ formatPeriod(filter.period) }}
          </span>
        </div>

      </div>
    </div>

    <!-- Table -->
    <div class="px-2 sm:px-2 bg-white dark:bg-gray-800">
      <div v-if="!isLoading && isTableReady" class="w-full max-w-10xl mx-auto">
        <table id="filter-table" :key="tableKey" class="w-full text-sm rtl:text-right text-gray-500 text-center">
          <thead class="text-gray-700 bg-gray-50">
            <tr>
              <th scope="col">
                <span class="flex items-center mt-2">
                  No
                  <svg class="w-4 h-4 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                    fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="m8 15 4 4 4-4m0-6-4-4-4 4" />
                  </svg>
                </span>
              </th>
              <th scope="col">
                <span class="flex items-center mt-2">
                  Code Material
                  <svg class="w-4 h-4 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                    fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="m8 15 4 4 4-4m0-6-4-4-4 4" />
                  </svg>
                </span>
              </th>
              <th scope="col">
                <span class="flex items-center mt-2">
                  Material Description
                  <svg class="w-4 h-4 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                    fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="m8 15 4 4 4-4m0-6-4-4-4 4" />
                  </svg>
                </span>
              </th>
              <th scope="col">
                <span class="flex items-center mt-2">
                  Satuan
                  <svg class="w-4 h-4 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                    fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="m8 15 4 4 4-4m0-6-4-4-4 4" />
                  </svg>
                </span>
              </th>
              <th scope="col">
                <span class="flex items-center mt-2">
                  Aspek
                  <svg class="w-4 h-4 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                    fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="m8 15 4 4 4-4m0-6-4-4-4 4" />
                  </svg>
                </span>
              </th>
              <th scope="col">
                <span class="flex items-center mt-2">
                  Planning
                  <svg class="w-4 h-4 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                    fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="m8 15 4 4 4-4m0-6-4-4-4 4" />
                  </svg>
                </span>
              </th>
              <th scope="col">
                <span class="flex items-center mt-2">
                  Actual
                  <svg class="w-4 h-4 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                    fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="m8 15 4 4 4-4m0-6-4-4-4 4" />
                  </svg>
                </span>
              </th>
              <th scope="col">
                <span class="flex items-center mt-2">
                  Pending
                  <svg class="w-4 h-4 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                    fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="m8 15 4 4 4-4m0-6-4-4-4 4" />
                  </svg>
                </span>
              </th>
              <th scope="col">
                <span class="flex items-center mt-2">
                  Action
                  <svg class="w-4 h-4 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                    fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="m8 15 4 4 4-4m0-6-4-4-4 4" />
                  </svg>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(value, index) in dataTable" :key="index"
              class="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b hover:bg-blue-50! border-gray-200">
              <td class="px-6 py-4 font-medium text-gray-900">
                {{ index + 1 }}
              </td>
              <td class="px-6 py-4 font-medium">
                {{ value.ZMATL }}
              </td>
              <td class="px-6 py-4">
                {{ value.ZDESK }}
              </td>
              <td class="px-6 py-4">
                {{ value.ZSATUAN }}
              </td>
              <td class="px-6 py-4">
                {{ value.ZASPEK }}
              </td>
              <td class="px-6 py-4">
                {{ value.ZPLAN }}
              </td>
              <td class="px-6 py-4">
                {{ value.ZQTY }}
              </td>
              <td class="px-6 py-4"
                :class="(Number(value.ZQTY) - Number(value.ZPLAN)) < 0 ? 'text-red-600 font-bold' : ''">
                {{ Number(value.ZQTY) - Number(value.ZPLAN) }}
              </td>
              <td class="px-6 py-4 text-center sticky right-0 z-10 shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.1)]">
                <button type="button"
                  class="btn-edit group relative inline-flex items-center justify-center p-2 text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-cyan-500 to-blue-500 group-hover:from-cyan-500 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-cyan-200 dark:focus:ring-cyan-800"
                  :data-item="JSON.stringify(value)" title="Edit Data">

                  <span class="relative transition-all ease-in duration-75 text-white">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z">
                      </path>
                    </svg>
                  </span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="flex h-full w-full justify-center items-center">
        <p class="text-center font-semibold text-gray-400 my-7">loading ...</p>
      </div>
    </div>

  </div>

  <!-- Dialog Edit -->
  <div v-if="logistikStore.dialog.form"
    class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 transition-opacity" role="dialog"
    aria-modal="true">

    <div
      class="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">

      <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ logistikStore.action }} Master Data Incoming <span class="text-blue-600">{{ logistikStore.filter.department
          }}</span>
        </h3>
        <button type="button" @click="logistikStore.dialog.form = false"
          class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white">
          <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
          </svg>
          <span class="sr-only">Close modal</span>
        </button>
      </div>

      <div class="p-4 md:p-6">
        <div class="grid gap-6 mb-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">

          <div>
            <label for="zmatl" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Code
              Material</label>
            <input type="text" id="zmatl" v-model="logistikStore.formDataIncoming.ZMATL"
              :disabled="logistikStore.action === 'Edit'"
              class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:bg-gray-200 disabled:cursor-not-allowed dark:disabled:bg-gray-600"
              placeholder="Masukan Code" required>
          </div>

          <div class="sm:col-span-2 lg:col-span-1"> <label for="zdesk"
              class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Material Description</label>
            <input type="text" id="zdesk" v-model="logistikStore.formDataIncoming.ZDESK"
              class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              placeholder="Deskripsi Material">
          </div>

          <div>
            <label for="zplan" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Planning</label>
            <input type="number" id="zplan" v-model="logistikStore.formDataIncoming.ZPLAN"
              class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              placeholder="0">
          </div>

          <div>
            <label for="zqty" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Actual</label>
            <input type="number" id="zqty" v-model="logistikStore.formDataIncoming.ZQTY"
              class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              placeholder="0">
          </div>

          <div>
            <label for="zsatuan" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Satuan</label>
            <input type="text" id="zsatuan" v-model="logistikStore.formDataIncoming.ZSATUAN"
              class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              placeholder="PCS/KG">
          </div>

          <div>
            <label for="zaspek" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Aspek</label>
            <input type="text" id="zaspek" v-model="logistikStore.formDataIncoming.ZASPEK"
              class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              placeholder="Nama Aspek">
          </div>

        </div>
      </div>

      <div
        class="flex items-center justify-end p-4 md:p-5 border-t border-gray-200 rounded-b dark:border-gray-600 space-x-3">
        <button @click="logistikStore.dialog.form = false" type="button"
          class="py-2.5 px-5 ms-3 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">
          Cancel
        </button>

        <button @click="onUpdateIncoming" type="button"
          class="text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800 inline-flex items-center">
          <svg class="w-4 h-4 me-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save
        </button>
      </div>

    </div>
  </div>
</template>

<style>
.border {
  border: 1px solid #e5e7eb !important;
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

.datatable-wrapper {
  width: 100%;
  margin-top: 1rem;
}

.datatable-wrapper .datatable-top {
  display: none;
}

.datatable-wrapper .datatable-search .datatable-input {
  color: var(--color-gray-900);
  border: 1px solid var(--color-gray-300);
  background-color: var(--color-gray-50);
  border-radius: .5rem;
  min-width: 16rem;
  font-size: .875rem;
  display: none;
}

.datatable-wrapper .datatable-table thead {
  color: var(--color-gray-500);
  background-color: var(--color-gray-50);
  font-size: .90rem;
}

.datatable-wrapper thead th .datatable-input {
  color: var(--color-gray-900);
  background-color: #fff;
  width: 100px !important;
  min-width: 100px !important;
  max-width: 100px !important;
  height: 25px !important;
  margin: 5px 5px;
  font-weight: 400;
  border: 1px solid var(--color-gray-300);
  border-radius: .5rem;
}

.datatable-wrapper .datatable-bottom {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: .5rem;
  margin-top: 1rem;
  padding: 1rem 1.5rem;
  flex-wrap: wrap;
}

.datatable-wrapper .datatable-bottom .datatable-info {
  font-size: .8rem;
  color: var(--color-gray-500);
  order: 1;
}

.datatable-wrapper .datatable-bottom .datatable-dropdown {
  display: flex;
  align-items: center;
  gap: .25rem;
  order: 1;
  font-size: .8rem;
  color: var(--color-gray-500);
}

.datatable-wrapper .datatable-bottom .datatable-dropdown .datatable-selector {
  background-color: var(--color-gray-50);
  color: var(--color-gray-900);
  border: 1px solid var(--color-gray-300);
  border-radius: .5rem;
  min-width: 4rem;
  font-size: .875rem;
}

.datatable-wrapper .datatable-bottom .datatable-pagination {
  order: 2;
  margin-left: auto;
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item-link {
  color: var(--color-gray-500);
  border-top: 1px solid var(--color-gray-300);
  border-bottom: 1px solid var(--color-gray-300);
  border-right: 1px solid var(--color-gray-300);
  align-items: center;
  height: 2rem;
  padding-left: .75rem;
  padding-right: .75rem;
  font-size: .875rem;
  font-weight: 500;
  display: flex;
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item-link:hover {
  background-color: var(--color-gray-50);
  color: var(--color-gray-700);
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type,
.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type {
  position: relative;
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link,
.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link,
.dark .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link,
.dark .datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link {
  color: #0000;
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link:after {
  content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m14 8-4 4 4 4'/%3e %3c/svg%3e");
  width: 1.3rem;
  height: 1.3rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link:hover:after {
  content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%23111827' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m14 8-4 4 4 4'/%3e %3c/svg%3e");
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link:after {
  content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m10 16 4-4-4-4'/%3e %3c/svg%3e");
  width: 1.3rem;
  height: 1.3rem;
  position: absolute;
  top: 50%;
  right: 50%;
  transform: translate(50%, -50%);
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link:hover:after {
  content: url("data:image/svg+xml,%3csvg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24'%3e %3cpath stroke='%23111827' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m10 16 4-4-4-4'/%3e %3c/svg%3e");
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:first-of-type .datatable-pagination-list-item-link {
  border-left: 1px solid var(--color-gray-300);
  border-top-left-radius: .5rem;
  border-bottom-left-radius: .5rem;
}

.datatable-wrapper .datatable-bottom .datatable-pagination .datatable-pagination-list-item:last-of-type .datatable-pagination-list-item-link {
  border-left: 0;
  border-top-right-radius: .5rem;
  border-bottom-right-radius: .5rem;
}
</style>