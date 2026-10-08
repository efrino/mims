<script setup lang="ts">
import { useTagOkStore } from '@/stores/Stamping/Transaction/TagOK';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { onMounted, ref, shallowRef } from 'vue';
import { useUtilityStore } from '@/stores/utility';
import { storeToRefs } from 'pinia';
import QrcodeVue from 'qrcode.vue';
import type { SelectPartNumber } from '@/types/Stamping/Transaction/TagOK';
import CustomSelectSearch from '@/components/CustomSelectSearch.vue';

const page = ref({ title: 'Tag Ok Stamping By Part Number' });
const breadcrumbs = shallowRef([
  {
    title: 'Stamping',
    disabled: false,
    href: '#'
  },
  {
    title: 'Production',
    disabled: false,
    href: '#'
  },
  {
    title: 'Tag Ok By Part Number',
    disabled: true,
    href: '#'
  }
]);

// simpan sementara
let selectedPart = ref<SelectPartNumber | null>(null);

const utilityStore = useUtilityStore();
const TagOkStore = useTagOkStore();

onMounted(async () => {
  TagOkStore.resetPreview();
  TagOkStore.getPrinters();
  // daftar part baru dimuat setelah type dipilih
  formData.value.type = '';
  partItemsTag.value = [];
  selectedPart.value = null;
});

const { formData, partItemsTag, table_tag, isPrinted, printers, selectedPrinter, timeNow } = storeToRefs(TagOkStore);

const getPart = async (type: string) => {
  // part dari type sebelumnya tidak boleh ikut terbawa ke tag
  selectedPart.value = null;
  formData.value.part_number = '';
  formData.value.job_number = '';
  formData.value.qty_pallet = '';
  await TagOkStore.fetchDataPartSTP(type);

  table_tag.value = [];
  isPrinted.value = true;
};

const changesQtyKbn = (part_number: string, job_number: string) => {
  const result = partItemsTag.value.find((item) => item.part_number === part_number && item.job_number === job_number);

  if (!result) {
    console.warn('Data tidak ditemukan');
    return;
  }

  formData.value.part_number = result.part_number;
  formData.value.job_number = result.job_number;
  formData.value.qty_pallet = result.qty_pallet;
};

const createTagOK = () => {
  isPrinted.value = false;
  TagOkStore.getTimeNow();
  TagOkStore.previewTagOk();
};

const printTagOk = () => {
  TagOkStore.printArea(selectedPrinter.value);
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-col lg:flex-row gap-6">
    <div class="w-full h-fit bg-white rounded-xl shadow p-8">
      <div class="flex flex-col w-full gap-8 mt-3">
        <h1 class="text-center text-2xl text-gray-900 font-semibold">Print Tag OK By Part Number</h1>
        <div class="w-full">
          <label for="default-datepicker" class="block mb-2 text-sm font-medium text-gray-900">Date</label>
          <div class="relative datepicker-wrapper w-full">
            <input
              v-model="formData.date"
              id="default-datepicker"
              type="date"
              class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:!border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:!border-blue-500"
              placeholder="Select date"
            />
          </div>
        </div>
        <div class="w-full">
          <label for="shift" class="block mb-2 text-sm font-medium text-gray-900">Shift</label>
          <select
            v-model="formData.shift"
            id="shift"
            class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
          >
            <option disabled selected>Pilih shift</option>
            <option value="1">Shift 1</option>
            <option value="2">Shift 2</option>
          </select>
        </div>
        <div class="w-full">
          <label for="type" class="block mb-2 text-sm font-medium text-gray-900">Type</label>
          <select
            v-model="formData.type"
            @change="getPart(formData.type)"
            id="type"
            class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
          >
            <option disabled value="">Pilih tipe</option>
            <option value="FP">FP</option>
            <option value="WIP">WIP</option>
          </select>
        </div>
        <div class="w-full">
          <CustomSelectSearch
            v-model="selectedPart"
            :items="partItemsTag"
            label="Part Number / Job Number"
            :require-type="true"
            @change="selectedPart && changesQtyKbn(selectedPart.part_number, selectedPart.job_number)"
          />
        </div>

        <div class="w-full">
          <label for="qtyKanban" class="block mb-2 text-sm font-medium text-gray-900">Qty Kanban</label>
          <input
            v-model="formData.qty_pallet"
            type="text"
            disabled
            id="qtyKanban"
            class="bg-gray-50 !border cursor-not-allowed !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
            placeholder=""
            required
          />
        </div>
        <div class="w-full">
          <label for="jumlahProduksi" class="block mb-2 text-sm font-medium text-gray-900">Jumlah PCS Produksi</label>
          <input
            v-model="formData.lotsize_actual"
            type="number"
            id="jumlahProduksi"
            class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
            placeholder="e.g. 20"
            required
          />
        </div>
        <div class="flex w-full justify-end">
          <button
            type="button"
            @click="createTagOK()"
            class="text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center me-2"
          >
            Buat Tag OK
          </button>
        </div>
      </div>
    </div>

    <div class="w-full py-8">
      <div class="flex flex-col w-full justify-start align-center gap-8">
        <h2 class="text-gray-900 text-2xl">Preview Tag OK</h2>
        <div class="flex w-full justify-center align-end gap-7">
          <div class="w-1/2">
            <label for="printer" class="block mb-2 text-sm font-medium text-gray-900">Printer</label>
            <select
              v-model="selectedPrinter"
              id="printer"
              class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
            >
              <option disabled value="">Pilih</option>
              <option v-for="item in printers" :key="item" :value="item">
                {{ item }}
              </option>
            </select>
          </div>
          <div class="">
            <button
              type="button"
              @click="printTagOk"
              class="text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center me-2"
            >
              Print Tag OK
            </button>
          </div>
        </div>

        <div v-if="table_tag && table_tag?.length > 0 && isPrinted === false" class="overflow-auto lg:h-[570px] lg:max-w-[650px]">
          <div class="mx-3 my-3" id="print-content" v-for="(item, index) in table_tag" :key="index">
            <table class="text-center overflow-auto table-fs mb-3">
              <tbody>
                <!-- WIP: arsir di kiri dan kanan, sama dengan Tag OK Welding -->
                <template v-if="formData.type === 'WIP'">
                  <tr>
                    <th rowspan="9">
                      <img src="/src/assets/images/arsir.png" alt="arsir" class="arsir" />
                    </th>
                    <th colspan="1" class="font-weight-black">PT MAJ</th>
                    <th colspan="3" class="text-h5 font-weight-black">TAG PRESS - UNFINISH PROCESS</th>
                    
                    <!-- GPART (G) / NON GPART (S) -->
                    <th colspan="4" rowspan="2" class="text-h1 font-weight-black"></th>

                    <th rowspan="9">
                      <img src="/src/assets/images/arsir.png" alt="arsir" class="arsir" />
                    </th>
                  </tr>
                  <tr>
                    <td class="whitespace-nowrap">{{ utilityStore.dateIndonesian(item.date!) }}</td>
                    <td>{{ index + 1 }}/{{ item.total_tag_ok }}</td>
                    <td colspan="2">{{ item.id_tag_ok }}</td>
                  </tr>
                  <tr>
                    <td>USER</td>
                    <td>SHIFT</td>
                    <td>LINE</td>
                    <td rowspan="3" class="px-2">
                      <qrcode-vue v-if="item.id_tag_ok" :value="item.id_tag_ok" :size="100" />
                    </td>
                    <td rowspan="3" class="px-2">
                      QTY/KBN <br />
                      <span class="text-4xl font-weight-black">{{ item.qty_kbn }}</span>
                    </td>
                  </tr>
                  <tr class="font-weight-black">
                    <td class="px-3">{{ item.user_create }}</td>
                    <td>{{ item.shift }}</td>
                    <td>
                      {{ item.line_id != null && item.line_id != '' ? (item.line_id == 'OUT' ? '-' : item.line_id) : '-' }}
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" class="font-weight-black">
                      {{ item.part_number }}
                    </td>
                    <td class="font-weight-black whitespace-nowrap px-2">
                      {{ item.job_number }}
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" class="font-weight-black part-name">
                      {{ item.part_name && item.part_name?.length > 23 ? item.part_name.substring(0, 23) + '...' : item.part_name || '-' }}
                    </td>
                    <td class="font-weight-black identity-text text-xl">
                      {{
                        item.part_number === '57451-BZ200-00-KZ'
                          ? 'DCWA'
                          : (item.identity ?? (item.part_name?.includes('RH') ? 'RH' : item.part_name?.includes('LH') ? 'LH' : ''))
                      }}
                    </td>
                    <td rowspan="3" class="pa-0 align-top">
                      <div class="text-[10px] font-medium text-center border-b-1 border-black py-0.5">Preparation</div>
                    </td>
                    <td rowspan="3" class="pa-0 align-top">
                      <div class="text-[10px] font-medium text-center border-b-1 border-black py-0.5">STO</div>
                    </td>
                  </tr>
                  <tr>
                    <td>PIC</td>
                    <td class="px-5">DATE</td>
                    <td class="px-5">NAME</td>
                  </tr>
                  <tr>
                    <td>STAMPING</td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr>
                    <td>QC</td>
                    <td></td>
                    <td></td>
                    <td colspan="2" class="px-5 whitespace-nowrap">
                      {{ timeNow }}
                    </td>
                  </tr>
                </template>

                <!-- FP -->
                <template v-else>
                  <tr>
                    <td colspan="2" class="font-weight-black">PT MAJ</td>
                    <td colspan="2" class="text-h5 font-weight-black">TAG OK PRESS</td>
                    <td rowspan="2" colspan="2" class="pa-0 relative h-full">
                      <div class="grid grid-cols-2 absolute inset-0">
                        <div class="flex flex-col h-full border-r border-black">
                          <div class="text-[10px] font-medium text-center border-b-1 border-black py-0.5">Preparation</div>
                          <div class="flex-1"></div>
                        </div>

                        <div class="flex flex-col h-full">
                          <div class="text-[10px] font-medium text-center border-b-1 border-black py-0.5">STO</div>
                          <div class="flex-1"></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td class="whitespace-nowrap">{{ utilityStore.dateIndonesian(item.date!) }}</td>
                    <td>{{ index + 1 }}/{{ item.total_tag_ok }}</td>
                    <td colspan="2">{{ item.id_tag_ok }}</td>
                  </tr>
                  <tr>
                    <td>USER</td>
                    <td>SHIFT</td>
                    <td>LINE</td>
                    <td rowspan="3" v-if="item && item.id_tag_ok" class="ps-5">
                      <qrcode-vue v-if="item.id_tag_ok" :value="item.id_tag_ok" :size="80" />
                    </td>
                    <td rowspan="3">
                      QTY/KBN <br />
                      <span class="text-3xl font-weight-black">{{ item.qty_kbn }}</span>
                    </td>
                    <td rowspan="3">
                      JOB NO. <br />
                      <span
                        class="font-weight-black wrap-text"
                        :class="item.job_number ? (item.job_number?.length > 11 ? 'text-h7' : 'text-2xl') : 'text-2xl'"
                      >
                        {{ item.job_number }}
                      </span>
                    </td>
                  </tr>
                  <tr class="font-weight-black">
                    <td>{{ item.user_create }}</td>
                    <td>{{ item.shift }}</td>
                    <td>
                      {{ item.line_id != null && item.line_id != '' ? (item.line_id == 'OUT' ? '-' : item.line_id) : '-' }}
                    </td>
                  </tr>
                  <tr>
                    <td>PIC</td>
                    <td>DATE</td>
                    <td>NAME</td>
                  </tr>
                  <tr>
                    <td>STAMPING</td>
                    <td></td>
                    <td></td>
                    <td colspan="2" class="font-weight-black">
                      {{ item.part_number }}
                    </td>
                    <td
                      rowspan="2"
                      :class="[
                        'font-weight-black identity-text',
                        item.identity === null || item.identity == undefined
                          ? 'text-4xl'
                          : item.identity?.length > 18
                            ? 'text-xl'
                            : 'text-2xl'
                      ]"
                    >
                      {{
                        item.part_number === '57451-BZ200-00-KZ'
                          ? 'DCWA'
                          : (item.identity !== '' ? (item.part_name?.includes('RH') ? 'RH' : item.part_name?.includes('LH') ? 'LH' : '') : '')
                      }}
                    </td>
                  </tr>
                  <tr>
                    <td>QC</td>
                    <td></td>
                    <td></td>
                    <td colspan="2" class="font-weight-black part-name">
                      {{ item.part_name && item.part_name?.length > 33 ? item.part_name.substring(0, 33) + '...' : item.part_name || '-' }}
                    </td>
                  </tr>
                  <tr>
                    <td>LOG</td>
                    <td></td>
                    <td></td>
                    <td class="font-weight-black">
                      {{ item.status }}
                    </td>
                    <td colspan="2" class="whitespace-nowrap">
                      {{ timeNow }}
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else class="box text-gray-400 mt-5 flex flex-col w-3/4 rounded-lg h-64 justify-center align-center">
          <h5 class="font-medium">No Preview Available</h5>
          <p class="text-sm">Please create ‘TAG OK’ first.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.box {
  border: 2px dashed #9ca3af;
  padding: 12px;
}

.part-name,
.text-h7 {
  font-size: 0.7rem;
}
.identity-text {
  max-width: 100px;
  word-break: break-word;
  white-space: pre-wrap;
  text-align: center;
}

.wrap-text {
  display: inline-block;
  max-width: 7ch;
  word-break: break-word;
  overflow-wrap: break-word;
  text-align: center;
}

.table-fs {
  border-collapse: collapse;
  border-spacing: 0;
  max-height: 7cm !important;
}

.table-fs td,
.table-fs th {
  padding: 2px;
}

#print-content td,
#print-content th {
  border: 1px solid black;
}

#print-content table {
  border-collapse: collapse !important;
  font-family: Arial, Helvetica, sans-serif !important;
}

.arsir {
  min-width: 40px !important;
  min-height: 300px !important;
  max-width: 40px !important;
  max-height: 300px !important;
  padding: 0;
}
</style>
