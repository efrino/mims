<script setup lang="ts">
import { ref, shallowRef, onMounted, nextTick } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useTagOkStore } from '@/stores/Welding/Transaction/TagOK';
import { storeToRefs } from 'pinia';
import { useUtilityStore } from '@/stores/utility';
import QrcodeVue from 'qrcode.vue';

const page = ref({ title: 'Scan Tag OK Welding' });
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
    title: 'Scan Tag OK',
    disabled: true,
    href: '#'
  }
]);

const TagOkStore = useTagOkStore();
const utilityStore = useUtilityStore();

const tagOkInput = ref<HTMLInputElement | null>(null)
const { id_tag_ok, table_tag, timeNow } = storeToRefs(TagOkStore);

onMounted(async () => {
  await nextTick();
  tagOkInput.value?.focus();
  table_tag.value = [];
})

const onEnterKey = (id_tag_ok: string) => {
  TagOkStore.onScanTagOK(id_tag_ok)
  TagOkStore.getTimeNow();
}

</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="w-full flex flex-col justify-center items-center gap-16">
    <div class="w-2xl p-6 text-center bg-white border border-gray-200 rounded-xl shadow">
      <h5 class="mb-8 text-3xl font-bold tracking-tight text-gray-900">Scan Tag OK Welding</h5>
      <div class="text-start">
        <label for="id_kanban" class="block mb-2 text-md font-medium text-gray-900">ID Tag OK</label>
        <input ref="tagOkInput" v-model="id_tag_ok" @keyup.enter="onEnterKey(id_tag_ok)" type="text" id="id_kanban" class="bg-gray-50 border border-gray-300 text-gray-900 text-md rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="Input ID Tag OK" required />
      </div>
    </div>

    <div v-if="table_tag && table_tag.length > 0" class="flex flex-col items-center">
      <h2 class="text-gray-900 text-center text-3xl">Result Tag OK Welding</h2>

      <div class="mt-6">
        <div id="print-content" v-for="(item, index) in table_tag">
          <table class="text-center">
            <tbody>
              <tr>
                <th colspan="2" class="font-weight-black">PT MAJ</th>
                <th colspan="2" class="text-h5 font-weight-black">
                  TAG OK WLD
                </th>
                <th
                  rowspan="2"
                  colspan="2"
                  :class="[
                    'font-weight-black identity-text',
                    item.identity === null || item.identity == undefined
                      ? 'text-4xl'
                      : item.identity?.length > 18
                      ? 'text-xl'
                      : 'text-2xl',
                  ]"
                >
                  {{
                    item.part_number === "57451-BZ200-00-KZ"
                      ? "DCWA"
                      : item.identity ??
                        (item.part_name?.includes("RH")
                          ? "RH"
                          : item.part_name?.includes("LH")
                          ? "LH"
                          : "")
                  }}
                </th>
              </tr>
              <tr>
                <td class="whitespace-nowrap px-2">{{ utilityStore.dateIndonesian(item.date!) }}</td>
                <td>{{ index + 1 }}/{{ item.total_tag_ok }}</td>
                <td colspan="2" class="px-2">{{ item.id_tag_ok }}</td>
              </tr>
              <tr>
                <td>USER</td>
                <td>SHIFT</td>
                <td>LINE</td>
                <td rowspan="3" v-if="item && item.id_tag_ok" class="ps-5">
                  <qrcode-vue
                    v-if="item.id_tag_ok"
                    :value="item.id_tag_ok"
                    :size="80"
                  />
                </td>
                <td rowspan="3">
                  QTY/KBN <br />
                  <span class="text-4xl font-weight-black">{{
                    item.qty_kbn
                  }}</span>
                </td>
                <td rowspan="3">
                  JOB NO. <br />
                  <span
                    class="font-weight-black wrap-text"
                    :class="
                      item.job_number
                        ? item.job_number?.length > 11
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
                <td class="px-2">{{ item.user_create }}</td>
                <td>{{ item.shift }}</td>
                <td>
                  {{
                    item.line_id != null && item.line_id != ""
                      ? item.line_id == "OUT"
                        ? "-"
                        : item.line_id
                      : "-"
                  }}
                </td>
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
                <td colspan="3" class="font-weight-black">
                  {{ item.part_number }}
                </td>
              </tr>
              <tr>
                <td>QC</td>
                <td></td>
                <td></td>
                <td colspan="3" class="font-weight-black part-name">
                  {{
                    item.part_name && item.part_name?.length > 33
                      ? item.part_name.substring(0, 33) + "..."
                  : (item.part_name || '-')
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

  .box {
    border: 2px dashed #9CA3AF; 
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
    min-width: 50px !important;
    min-height: 300px !important;
    max-width: 50px !important;
    max-height: 300px !important;
    padding: 0;
  }
</style>