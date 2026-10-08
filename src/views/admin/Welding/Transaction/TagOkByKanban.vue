<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { PrinterOutlined } from '@ant-design/icons-vue';
import { useTagOkStore } from "@/stores/Welding/Transaction/TagOK";
import { storeToRefs } from "pinia";
import { useUtilityStore } from '@/stores/utility'; 
import QrcodeVue from 'qrcode.vue';

const page = ref({ title: 'Tag OK by Kanban' });
const breadcrumbs = shallowRef([
  {
    title: 'Welding',
    disabled: false,
    href: '#'
  },
  {
    title: 'Production',
    disabled: false,
    href: '#'
  },
  {
    title: 'Tag OK by Kanban',
    disabled: true,
    href: '#'
  }
]);

const utilityStore = useUtilityStore();
const TagOkStore = useTagOkStore();
const tagOkInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  TagOkStore.resetPreview();
  TagOkStore.getPrinters();
  tagOkInput.value?.focus();
});

const { formData, table_tag, isPrinted, printers, selectedPrinter, timeNow } = storeToRefs(TagOkStore);

const onEnterKey = (id_kanban: string) => {
  isPrinted.value = false;
  TagOkStore.onScanKanban(id_kanban);
  TagOkStore.getPrinters();
  TagOkStore.getTimeNow();
}

</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="w-full flex flex-col justify-center items-center gap-16">
    <div class="w-2xl p-6 text-center bg-white border border-gray-200 rounded-xl shadow">
      <h5 class="mb-8 text-3xl font-bold tracking-tight text-gray-900">Tag OK by Kanban</h5>
      <div class="text-start">
        <label for="id_kanban" class="block mb-2 text-md font-medium text-gray-900">ID Kanban</label>
        <input ref="tagOkInput" v-model="formData.id_kanban" @keyup.enter="onEnterKey(formData.id_kanban)" type="text" id="id_kanban" autofocus class="bg-gray-50 border border-gray-300 text-gray-900 text-md rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="Input ID kanban" required />
      </div>
    </div>

    <div v-if="table_tag && table_tag.length > 0 && isPrinted === false" class="flex flex-col items-center">
      <h2 class="text-gray-900 mb-10 text-center">Preview Tag OK Welding</h2>
      <div class="flex justify-center items-center gap-5">
        <select id="printers" v-model="selectedPrinter" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-sm p-2.5">
          <option selected value="">Pilih Printer</option>
          <option v-for="item in printers" :key="item" :value="item">
            {{ item }}
          </option>
        </select>
        <button 
          type="button" @click="TagOkStore.printArea(selectedPrinter)"
          class="flex items-center gap-2 text-white bg-green-500 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5 text-center"
        >
          <PrinterOutlined :style="{ fontSize: '18px' }"/>
          Print TAG OK
        </button>
      </div>
      <div class="mt-6">
        <div id="print-content" v-for="item in table_tag">
          <table class="text-center table-fs">
            <tbody>
              <tr>
                <td colspan="2" class="font-weight-black">PT MAJ</td>
                <td colspan="2" class="text-h5 font-weight-black">TAG OK WLD</td>
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
                <td class="whitespace-nowrap px-2">{{ utilityStore.dateIndonesian(item.date!) }}</td>
                <td class="px-1">{{ item.page }}/{{ item.page_of }}</td>
                <td colspan="2" class="px-2">{{ item.id_label }}</td>
              </tr>
              <tr>
                <td>USER</td>
                <td>SHIFT</td>
                <td>LINE</td>
                <td rowspan="3" v-if="item && item.id_label" class="ps-5">
                  <qrcode-vue
                    v-if="item.id_label"
                    :value="item.id_label"
                    :size="80"
                  />
                </td>
                <td rowspan="3">
                  QTY/KBN <br />
                  <span class="text-4xl font-weight-black">{{
                    item.qty == "0" ? "0" : item.qty ?? item.qty_kbn
                  }}</span>
                </td>
                <td rowspan="3">
                  JOB NO. <br />
                  <span
                    class="font-weight-black wrap-text"
                    :class="
                      item.job_number
                        ? item.job_number.length > 11
                          ? 'text-h7'
                          : 'text-h5'
                        : ''
                    "
                  >
                    {{ item.job_number }}
                  </span>
                </td>
              </tr>
              <tr class="font-weight-black">
                <td class="px-1">{{ item.user_create }}</td>
                <td>{{ item.shift }}</td>
                <td>{{ item.line_id != null && item.line_id != "" ? (item.line_id == 'OUT' ? '-' : item.line_id) : '-' }}</td>
              </tr>
              <tr>
                <td>PIC</td>
                <td>DATE</td>
                <td>NAME</td>
              </tr>
              <tr>
                <td>WELDING</td>
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
                      : item.identity.length > 18
                      ? 'text-xl'
                      : 'text-2xl',
                  ]"
                >
                  {{
                    item.identity ??
                    (item.part_name?.includes("RH")
                      ? "RH"
                      : item.part_name?.includes("LH")
                      ? "LH"
                      : "")
                  }}
                </td>
              </tr>
              <tr>
                <td>QC</td>
                <td></td>
                <td></td>
                <td colspan="2" class="font-weight-black part-name px-2">
                  {{
                    item.part_name && item.part_name.length > 33
                      ? item.part_name?.substring(0, 33) + "..."
                      : item.part_name
                  }}
                </td>
              </tr>
              <tr>
                <td>LOG</td>
                <td></td>
                <td></td>
                <td class="font-weight-black">
                  {{ item.status }}
                </td>
                <td colspan="2" class="whitespace-nowrap px-2">
                  {{ timeNow }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.border {
  border: .5px solid #D1D5DB !important;
}
.custom-divider {
  border-width: 1px !important;
  border-color: #BDBDBD !important; 
}
.form-label {
  display: inline-block;
  margin-bottom: 0.5rem;
  font-weight: 500; /* Memberikan sedikit ketebalan teks */
  line-height: 1.5; /* Menyesuaikan jarak antara label dan elemen form */
  color: black;
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

.divider {
  border-top: none;
  border-bottom: none;
}
</style>
