<script setup lang="ts">
import { usePrintKanbanStore } from "@/stores/PCD/Kanban/PrintKanban";
import { useConfigStore } from "@/stores/config.js";
import { storeToRefs } from "pinia";
import { onMounted, ref } from "vue";
// @ts-ignore
import VueBarcode from '@chenfengyuan/vue-barcode'

const configStore = useConfigStore();
const printKanbanStore = usePrintKanbanStore();
const { tablePriview } = storeToRefs(printKanbanStore);

const isItemDcwa = ref(false);

const checkPartNumber = (part_number: string) => {
  const isDcwa = part_number.substring(part_number.length - 2) === "KZ";
  isItemDcwa.value = isDcwa;
  return isDcwa;
};

const getImgUrl = (part_number: string) => {
  try {
    return `http://${configStore.apiUrl}/part/` + part_number + ".png";
  } catch (_) {
    return `http://${configStore.apiUrl}/part/empty.png`;
  }
};

const formatIdentity = (identity: string) => {
  if (!identity) {
    return "AAAAAAAAAAAAAA"; // Jika kosong, tetap tampil transparan
  }
  return identity.length > 10
    ? (identity.match(/.{10}/g) ?? []).join("\n")
    : identity;
};

onMounted(() => {
  printKanbanStore.previewPrintKanban();
});

setTimeout(function () {
  window.print();
}, 2000);
setTimeout(function () {
  window.scrollTo({
    top: 99999999999,
    behavior: "smooth",
  });
}, 1000);
window.scrollTo(0, document.body.scrollHeight);
</script>

<template>
  <v-container>
    <div class="page">
      <div class="table-container">
        <table
          id="tabel"
          v-for="(item, index) in tablePriview"
          :key="index"
          class="table-content text-center"
          :class="[
            (index as number) == 0
              ? 'atas1'
              : (index as number) % 2 !== 0
              ? 'page2'
              : (index as number) % 2 == 0
              ? 'page3'
              : '',
            (index as number) == tablePriview.length - 1 && (index as number) % 2 !== 0 ? 'akhir' : '',
            (index as number) == 1 ? 'awal' : '',
          ]"
        >
          <tr class="atas">
            <td class="logo">
              <div class="bungkus2">
                <img
                  max-height="50"
                  max-width="150"
                  class="center"
                  src="/src/assets/images/MAJ-bw.jpg"
                />
              </div>
            </td>
            <td class="atas kako" style="font-weight: 800">
              {{ item.is_nc == "true" ? "KANBAN" : "KAKO" }}<br />
              {{ item.is_nc == "true" ? "REPAIR" : "KANBAN" }}
            </td>
            <td class="atas bb-none left routing" style="line-height: 1">
              ROUTING : <br />
              <span class="t4" style="font-weight: 800">
                {{ item.line }} - {{ item.line2 }}</span
              >
            </td>
            <td class="atas left my-0 py-0" style="line-height: 0.7">
              No : <br /><span class="t5"> {{ item.range }}</span>
            </td>
          </tr>
          <tr>
            <td class="left bb-none bo-0">Job No :</td>
            <td rowspan="4" class="left form_text1 kosong isi" colspan="3">
              <span>Part Name</span>:
              <span :class="{ 'small-text': item.part_name.length > 36 }">
                {{ item.part_name }} </span
              ><br />
              <span>Line Process</span>: {{ item.line }} <br />
              <span>Store Location</span>: {{ item.storage }}<br />
              <span>Job Master</span>: {{ item.job_number }}<br />
              <span>Car Model</span>: {{ item.car }}<br />
              <span>Customer</span>: {{ item.customer }}<br />
            </td>
          </tr>
          <tr>
            <td class="bt-none item" style="font-weight: 800">
              {{ item.job_number }}
            </td>
          </tr>
          <tr>
            <td class="left bb-none bo-0">Material No :</td>
          </tr>
          <tr>
            <td
              class="bt-none item"
              style="font-weight: 800"
              id="part"
              :class="
                checkPartNumber(item.part_number) || isItemDcwa
                  ? 'item-dcwa'
                  : ''
              "
            >
              {{ item.part_number }}
            </td>
          </tr>
          <tr class="left">
            <td class="my-0 py-0" style="line-height: 1">
              Qty/Kanban : <br />
              <span class="t5"> {{ item.qty_kbn }}</span>
            </td>
            <td class="my-0 py-0" style="line-height: 1">
              Qty/Pallet : <br />
              <span class="t5"> {{ item.qty_pallet }}</span>
            </td>
            <td class="my-0 py-0" style="line-height: 1">
              Pallet Type : <br />
              <span class="t5"> {{ item.type_pallet }}</span>
            </td>
            <td class="bt-none ket1 t4 text-center" style="font-weight: 800">
              <span v-if="item.zstatus === 'NON GPART'">
                NON <br />
                GPART
              </span>
              <span v-else>
                {{ item.zstatus }}
              </span>
            </td>
          </tr>

          <tr class="spacer"></tr>

          <tr class="atas mt-5">
            <td class="pa-3 bb-none pic-part" colspan="2" rowspan="3">
              <div class="bungkus">
                <img class="center pb-2" :src="getImgUrl(item.part_number)" />
              </div>
              <span class="part_number_img">{{ item.part_number }}</span>
            </td>
            <td
              colspan="2"
              height="90px"
              class="t4 word-break"
              style="font-weight: 800"
            >
              <span :class="!item.identity ? 'transparent--text' : ''">
                {{ item.identity.length > 10
                    ? (item.identity.match(/.{10}/g) ?? []).join("\n")
                    : item.identity 
                }}
              </span>
            </td>
          </tr>
          <tr>
            <td
              v-if="item.is_nc == 'true'"
              class="pa-1 text-left keterangan"
              colspan="2"
              rowspan="2"
            >
              Name : <br />
              <hr />
              Date : <br />
              <hr />
              Shift :
            </td>
            <td v-else class="pa-4 pic-barcode" colspan="2">
            <div class="barcode-wrapper">
                <vue-barcode
                  :value="String(item.id_kanban)"
                  :options="{
                    format: 'CODE128',
                    displayValue: false
                  }"
                  style="width:250px; height:65px"
                />
            </div>
              <p colspan="2" class="kecil bb-none br-none bl-none text-left font-bold">
                {{ item.id_kanban }}
              </p>            
              <p colspan="2" class="kecil bb-none br-none bl-none text-left">
                {{ item.user_create }} - {{ item.create_date }}
              </p>
            </td>
          </tr>
          <tr></tr>
          <tr class="left">
            <td rowspan="2" colspan="2">
              Part Name <br />
              <span
                style="font-weight: 800"
                :class="{ 'small-text': item.part_name.length > 32 }"
                >{{ item.part_name }}</span
              >
            </td>
            <td class="my-0 py-0" style="line-height: 1">
              Line : <br />
              <span class="t5"> {{ item.line }}</span>
            </td>
            <td class="my-0 py-0" style="line-height: 1">
              Qty/Kbn <br />
              <span class="t5-2"> {{ item.qty_kbn }}</span>
            </td>
          </tr>
        </table>
      </div>
    </div>
  </v-container>
</template>
<style scoped>
.barcode-wrapper {
  display: flex;
  justify-content: center;
}
.keterangan {
  line-height: 1.4cm;
  padding-left: 20px !;
}
.bo-0 {
  padding-bottom: 0 !important;
}
.small-text {
  font-size: 12px;
}
.awal {
  margin-top: 6px !important;
}
.atas1 {
  margin-top: -4px !important;
}
.page2 {
  page-break-after: left;
}
.page3 {
  position: relative;
  top: 5px !important;
  margin-bottom: 8px !important;
}
body {
  overflow: hidden !important;
  margin: 0 !important;
  background-color: transparent !important;
}
.akhir {
  position: absolute;
  margin-bottom: -1000px !important;
}
.ket1 {
  height: 7.24mm;
}
.isi {
  font-size: 15px !important;
}
.kosong {
  height: 35.8mm;
}
.spacer {
  height: 1.5mm !important;
}
.ket {
  height: 6.5mm !important;
}
.left {
  text-align: left !important;
}
.t1 {
  font-size: 42px !important;
  padding: 0 !important;
}
.t3 {
  font-size: 14px !important;
  padding: 0 !important;
}
.pic-part {
  width: 96mm !important;
  height: 45mm !important;
  padding: 4px 0 !important;
}
.pic-barcode {
  width: 79mm !important;
  padding: 0 !important;
}
.kako {
  width: 34.85mm !important;
}
.logo {
  width: 44.07mm !important;
}
.routing {
  width: 45mm !important;
}
.number {
  width: 35mm !important;
  height: 8.03mm !important;
}
.item {
  font-size: 18px !important;
  padding-top: 0 !important;
}
.item-dcwa {
  font-size: 16px !important;
  padding-top: 0 !important;
}
td.form_text1 > span {
  display: inline-block;
  min-width: 104px;
}
.bb-none {
  border-bottom: none !important;
}
.bt-none {
  border-top: none !important;
}
.atas {
  font-size: 20px !important;
}
.no-wrap {
  white-space: nowrap;
}
.no-padding {
  padding: 0;
}
.tengah {
  display: block;
  margin: 0 auto !important;
}
table {
  border-collapse: collapse !important;
  font-family: Arial, Helvetica, sans-serif !important;
  margin-left: -10px !important;
  text-align: center !important;
  height: 7cm !important;
  overflow: hidden;
}
td {
  font-size: 18px !important;
  padding: 2px 6px !important;
  border: 1px solid black !important;
}
th {
  border: 1px solid #e2e2e2 !important;
  color: black !important;
}
.t5 {
  padding: 0 !important;
  margin: 0 !important;
  font-size: 46px !important;
  font-weight: 800;
  display: block;
  text-align: center;
}
.t5-2 {
  padding: 0 !important;
  margin: 0 !important;
  font-size: 42px !important;
  font-weight: 800;
  display: block;
  text-align: center;
}
.t4 {
  font-size: 24px !important;
}
.center {
  margin: auto; /* Required */
  position: absolute; /* Required */
  bottom: 0; /* Aligns at the bottom */
  top: 0; /* Aligns at the bottom */
  left: 0;
  right: 0; /* Aligns horizontal center */
  max-height: 100%; /* images bigger than 175 px  */
  max-width: 100%;
}
.bungkus {
  position: relative;
  width: 100%;
  height: 165px;
}
.word-break {
  white-space: pre-wrap; /* Memastikan teks bisa pindah baris */
  word-wrap: break-word;
  text-align: center;
}
.bungkus2 {
  position: relative;
  width: 100%;
  height: 50px;
}
.center2 {
  margin: auto; /* Required */
  position: absolute; /* Required */
  bottom: 0; /* Aligns at the bottom */
  top: 0; /* Aligns at the bottom */
  left: 0;
  right: 0; /* Aligns horizontal center */
  max-height: 100px; /* images bigger than 175 px  */
  max-width: 100px;
}
.kecil {
  font-size: 12px !important;
  margin: 0 !important;
  text-align: center !important;
}

@media print {
  @page {
    size: A4 portrait; /* Pastikan ukuran A4 */
    padding-top: 0px;
    margin: 0px;
  }
  .page {
    height: 297mm; /* Sesuaikan tinggi */
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
}
</style>
<style>
@media print {
  body {
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }
  .table-content {
    page-break-after: auto;
  }
}

.v-navigation-drawer,
.v-toolbar__content {
  display: none !important;
}

.v-main,
.page-wrapper {
  margin: 0 !important;
  padding: 0 !important;
}
</style>
