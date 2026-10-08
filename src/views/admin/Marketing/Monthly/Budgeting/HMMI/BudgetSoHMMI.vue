<script setup>
import { storeToRefs } from 'pinia';
import { onMounted, ref, shallowRef } from 'vue';

import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useBudgetMatStore } from '@/stores/Marketing/BudgetMatStore.ts';
import { useBudgetVsSoStore } from '@/stores/Marketing/BudgetVsSoStore.ts';

/* ==============================
 * PAGE METADATA
 * ============================== */
const page = ref({
  title: 'Budget Pembelian Material & CKD HMMI VS Sales Order'
});

const breadcrumbs = shallowRef([
  {
    title: 'Marketing',
    disabled: false,
    href: '#'
  },
  {
    title: 'Monthly',
    disabled: false,
    href: '#'
  },
  {
    title: 'Budgeting',
    disabled: false,
    href: '#'
  },
  {
    title: 'HMMI',
    disabled: false,
    href: '#'
  },
  {
    title: 'Budget Sales Amount',
    disabled: true,
    href: '#'
  }
]);

const budgetMatStore = useBudgetMatStore();

const vsSoStore = useBudgetVsSoStore();

const { selectedMonth, selectedReportType, selectedVersion, headerMonths, selectedDateInfo, noteMonthShort, titleMonth } =
  storeToRefs(budgetMatStore);

const { rows: budgetMat, totalRow, isPreparingPrint, permissions } = storeToRefs(vsSoStore);

const {
  initSalesAmountPage,
  startSalesAmountPrint,

  groupNumber,
  rowspanNo,
  rowspanModel,
  shouldShowNo,
  shouldShowModel,
  shouldShowTotalItem,
  sumCKD,
  formatNumber,
  formatAmountThousand
} = vsSoStore;

/* ==============================
 * INITIAL DATA LOADING, AMBIL FILTER DARI SESSION, LALU LOAD BUDGET VS SO
 * ============================== */
onMounted(() => {
  void initSalesAmountPage();
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <!-- Page -->
  <div class="w-full min-w-0">
    <!-- Card -->
    <div class="relative isolate flex h-[calc(100dvh-10rem)] min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl bg-white shadow">
      <!-- Scroll area -->

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable]">
        <!-- Filter -->
        <div
          class="sticky top-0 z-[70] flex min-h-[62px] flex-wrap items-center gap-2 !border-b !border-solid !border-slate-200 bg-white/95 px-4 py-3 text-sm shadow-[0_3px_10px_rgba(15,23,42,0.08)] backdrop-blur-sm"
        >
          <label for="month" class="font-semibold text-gray-400"> Start Month : </label>
          <input
            id="month"
            type="month"
            v-model="selectedMonth"
            disabled
            class="px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-slate-500 text-sm cursor-not-allowed disabled:opacity-70"
          />
          <label for="reportType" class="font-semibold text-gray-400"> Report Type : </label>
          <select
            id="reportType"
            v-model="selectedReportType"
            disabled
            class="px-3 py-2 pr-7 rounded-lg border border-gray-300 bg-gray-100 text-slate-500 text-sm cursor-not-allowed disabled:opacity-70"
          >
            <option value="Original">Original</option>
            <option value="Balancing">Balancing</option>
          </select>

          <label for="version" class="font-semibold text-gray-400"> Version : </label>
          <select
            id="version"
            v-model="selectedVersion"
            disabled
            class="px-3 pr-7 py-2 rounded-lg border border-gray-300 bg-gray-100 text-slate-500 text-sm cursor-not-allowed disabled:opacity-70 appearance-none"
          >
            <option value="00">00</option>
            <option value="01">01</option>
            <option value="02">02</option>
            <option value="03">03</option>
          </select>
        </div>

        <!-- Report -->
        <div class="relative z-0 w-full min-w-0 overflow-x-auto bg-white px-4 pb-5 pt-3">
          <div id="printArea" class="mx-auto min-w-[1100px] max-w-[1450px] scroll-mt-[72px] box-border bg-white">
            <div class="report-frame box-border !border-[1px] !border-solid !border-black">
              <div class="report-content box-border min-h-[760px] m-3 p-1">
                <!-- Report header -->
                <div class="relative flex items-start pb-0 mb-[9px] !border-b-2 !border-black">
                  <div class="logo mr-4">
                    <img src="@/assets/images/logo.png" alt="Company Logo" class="max-h-[40px]" />
                  </div>

                  <div class="table-auto flex-1 pl-16">
                    <div class="table-row header-text-13">
                      <span class="table-cell font-bold pr-2 whitespace-nowrap"> TITLE </span>
                      <span class="table-cell font-bold" contenteditable="true">
                        : BUDGET PEMBELIAN MATERIAL &amp; CKD VS SALES ORDER
                        <span v-if="titleMonth"> {{ titleMonth }}</span>
                      </span>
                    </div>
                    <div class="table-row header-text-13">
                      <span class="table-cell font-bold pr-2 whitespace-nowrap"> PROJECT </span>
                      <span class="table-cell font-bold" contenteditable="true"> : SU2ID &amp; KS </span>
                    </div>
                    <div class="table-row header-text-13">
                      <span class="table-cell font-bold pr-2 whitespace-nowrap"> CUSTOMER </span>
                      <span class="table-cell font-bold" contenteditable="true"> : PT HMMI </span>
                    </div>
                  </div>

                  <div
                    class="absolute right-0 bottom-0 h-[26px] min-w-[170px] !border !border-black !border-b-0 bg-white flex items-center justify-center"
                  >
                    <span class="text-[10px] max-sm:text-[9px] italic font-bold whitespace-nowrap" contenteditable="true">
                      {{ selectedReportType }} Rev. {{ selectedVersion }}
                    </span>
                  </div>
                </div>

                <!-- Budget VS SO table -->
                <table
                  id="budget-table"
                  class="budget-table mt-4 w-full table-fixed border-collapse text-[9.5px] [&_th]:!border-[1px] [&_th]:!border-solid [&_th]:!border-black [&_td]:!border-[1px] [&_td]:!border-solid [&_td]:!border-black"
                >
                  <thead>
                    <tr>
                      <th rowspan="4" class="w-[30px] text-center align-middle bg-[#99ccff]">No</th>
                      <th rowspan="4" class="text-center align-middle bg-[#99ccff]">Model</th>
                      <th rowspan="4" colspan="2" class="w-[125px] text-center align-middle bg-[#99ccff]">Material / CKD</th>
                      <th rowspan="4" class="w-[50px] text-center align-middle bg-[#99ccff]">
                        Σ Item <br />
                        V to V / <br />
                        Gpart
                      </th>
                      <th colspan="15" class="text-center align-middle bg-[#99ccff] table-title-13 font-bold px-1 py-1">
                        BUDGET MATERIAL &amp; CKD VS SO
                      </th>
                    </tr>
                    <tr>
                      <th colspan="3" class="text-center bg-[#99ccff]">
                        {{ headerMonths.nMinus1 }}
                      </th>
                      <th colspan="3" class="text-center bg-[#99ccff]">
                        {{ headerMonths.n }}
                      </th>
                      <th colspan="3" class="text-center bg-[#99ccff]">
                        {{ headerMonths.nPlus1 }}
                      </th>
                      <th colspan="3" class="text-center bg-[#99ccff]">
                        {{ headerMonths.nPlus2 }}
                      </th>
                      <th colspan="3" class="text-center bg-[#99ccff]">
                        {{ headerMonths.nPlus3 }}
                      </th>
                    </tr>
                    <tr>
                      <th colspan="3" class="text-center bg-[#99ccff]">ACTUAL</th>
                      <th colspan="12" class="text-center bg-[#99ccff]">FORECAST</th>
                    </tr>
                    <tr class="italic whitespace-normal break-words">
                      <th class="bg-[#99ccff]">
                        Amount <br />
                        Mats <br />
                        (x1000)
                      </th>
                      <th class="bg-[#99ccff] px-1 py-1">
                        Amount Sales <br />
                        SO (x1000)
                      </th>
                      <th class="bg-[#99ccff]">
                        % <br />
                        Material <br />/ Sales
                      </th>
                      <th class="bg-[#99ccff]">
                        Amount <br />
                        Mats <br />
                        (x1000)
                      </th>
                      <th class="bg-[#99ccff] px-1 py-1">
                        Amount Sales <br />
                        SO (x1000)
                      </th>
                      <th class="bg-[#99ccff]">
                        % <br />
                        Material <br />/ Sales
                      </th>
                      <th class="bg-[#99ccff]">
                        Amount <br />
                        Mats <br />
                        (x1000)
                      </th>
                      <th class="bg-[#99ccff] px-1 py-1">
                        Amount Sales <br />
                        SO (x1000)
                      </th>
                      <th class="bg-[#99ccff]">
                        % <br />
                        Material <br />/ Sales
                      </th>
                      <th class="bg-[#99ccff]">
                        Amount <br />
                        Mats <br />
                        (x1000)
                      </th>
                      <th class="bg-[#99ccff] px-1 py-1">
                        Amount Sales <br />
                        SO (x1000)
                      </th>
                      <th class="bg-[#99ccff]">
                        % <br />
                        Material <br />/ Sales
                      </th>
                      <th class="bg-[#99ccff]">
                        Amount <br />
                        Mats <br />
                        (x1000)
                      </th>
                      <th class="bg-[#99ccff] px-1 py-1">
                        Amount Sales <br />
                        SO (x1000)
                      </th>
                      <th class="bg-[#99ccff]">
                        % <br />
                        Material <br />/ Sales
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <template v-for="(row, index) in budgetMat" :key="row.id">
                      <tr v-if="row.name === 'Material'">
                        <td v-if="shouldShowNo(index)" :rowspan="rowspanNo(row.nokol)" class="text-center font-bold">
                          {{ groupNumber(index) }}
                        </td>

                        <td v-if="shouldShowModel(index)" :rowspan="rowspanModel(row.nokol, row.model)" class="text-center font-bold">
                          {{ row.model }}
                        </td>
                        <td colspan="2" class="text-center font-bold">Material</td>
                        <td v-if="shouldShowTotalItem(index)" :rowspan="3" class="text-center">
                          {{ row.total_item }}
                        </td>

                        <td class="text-right px-1 py-1">
                          {{ formatNumber(row.n0_amount_act) }}
                        </td>
                        <td rowspan="3" class="text-right px-1 py-1">
                          {{ formatAmountThousand(row.n0_amountSales) }}
                        </td>
                        <td class="text-center px-1 py-1">{{ row.n0_percentMatSales }}%</td>

                        <td class="text-right px-1 py-1">
                          {{ formatNumber(row.n_amount_forecast) }}
                        </td>
                        <td rowspan="3" class="text-right px-1 py-1">
                          {{ formatAmountThousand(row.n_amountSales) }}
                        </td>
                        <td class="text-center px-1 py-1">{{ row.n_percentMatSales }}%</td>

                        <td class="text-right px-1 py-1">
                          {{ formatNumber(row.n1_amount_forecast) }}
                        </td>
                        <td rowspan="3" class="text-right px-1 py-1">
                          {{ formatAmountThousand(row.n1_amountSales) }}
                        </td>
                        <td class="text-center">{{ row.n1_percentMatSales }}%</td>

                        <td class="text-right px-1 py-1">
                          {{ formatNumber(row.n2_amount_forecast) }}
                        </td>
                        <td rowspan="3" class="text-right px-1 py-1">
                          {{ formatAmountThousand(row.n2_amountSales) }}
                        </td>
                        <td class="text-center">{{ row.n2_percentMatSales }}%</td>

                        <td class="text-right px-1 py-1">
                          {{ formatNumber(row.n3_amount_forecast) }}
                        </td>
                        <td rowspan="3" class="text-right px-1 py-1">
                          {{ formatAmountThousand(row.n3_amountSales) }}
                        </td>
                        <td class="text-center px-1 py-1">{{ row.n3_percentMatSales }}%</td>
                      </tr>

                      <template v-else-if="row.name === 'CKD PCS'">
                        <tr>
                          <td v-if="shouldShowNo(index)" :rowspan="2" class="text-center">
                            {{ row.nokol }}
                          </td>
                          <td v-if="shouldShowModel(index)" :rowspan="2" class="text-center">
                            {{ row.model }}
                          </td>
                          <td rowspan="2" class="text-center font-bold">CKD</td>
                          <td class="text-center font-bold">PCS</td>

                          <td :rowspan="2" class="text-right px-1 py-1">
                            {{ formatNumber(sumCKD(row.nokol, row.model, 'n0_amount_act')) }}
                          </td>
                          <td :rowspan="2" class="text-center px-1 py-1">{{ row.n0_percentMatSales }}%</td>

                          <td :rowspan="2" class="text-right px-1 py-1">
                            {{ formatNumber(sumCKD(row.nokol, row.model, 'n_amount_forecast')) }}
                          </td>
                          <td :rowspan="2" class="text-center px-1 py-1">{{ row.n_percentMatSales }}%</td>

                          <td :rowspan="2" class="text-right px-1 py-1">
                            {{ formatNumber(sumCKD(row.nokol, row.model, 'n1_amount_forecast')) }}
                          </td>
                          <td :rowspan="2" class="text-center px-1 py-1">{{ row.n1_percentMatSales }}%</td>

                          <td :rowspan="2" class="text-right px-1 py-1">
                            {{ formatNumber(sumCKD(row.nokol, row.model, 'n2_amount_forecast')) }}
                          </td>
                          <td :rowspan="2" class="text-center px-1 py-1">{{ row.n2_percentMatSales }}%</td>

                          <td :rowspan="2" class="text-right px-1 py-1">
                            {{ formatNumber(sumCKD(row.nokol, row.model, 'n3_amount_forecast')) }}
                          </td>
                          <td :rowspan="2" class="text-center px-1 py-1">{{ row.n3_percentMatSales }}%</td>
                        </tr>
                      </template>

                      <template v-else-if="row.name === 'CKD Transport'">
                        <tr>
                          <td class="px-1 py-1 text-center font-bold">Transport</td>
                        </tr>
                      </template>
                    </template>

                    <!-- Total row -->
                    <tr v-if="totalRow" class="bg-[#99ccff] [&_td]:font-bold print:[&_td]:whitespace-nowrap print:[&_td]:break-normal">
                      <td colspan="4" class="text-center font-bold">Total</td>

                      <td class="px-1 py-1 text-center">
                        {{ totalRow.total_item }}
                      </td>

                      <td class="text-right px-1 py-1">
                        {{ formatNumber(totalRow.n0_amount_act) }}
                      </td>
                      <td class="text-right px-1 py-1">
                        {{ formatAmountThousand(totalRow.n0_amountSales) }}
                      </td>
                      <td class="text-right px-1 py-1">{{ totalRow.n0_percentMatSales }}%</td>

                      <td class="text-right px-1 py-1">
                        {{ formatNumber(totalRow.n_amount_forecast) }}
                      </td>
                      <td class="text-right font-bold px-1 py-1">
                        {{ formatAmountThousand(totalRow.n_amountSales) }}
                      </td>
                      <td class="text-center font-bold">{{ totalRow.n_percentMatSales }}%</td>

                      <td class="text-right px-1 py-1">
                        {{ formatNumber(totalRow.n1_amount_forecast) }}
                      </td>
                      <td class="text-right px-1 py-1">
                        {{ formatAmountThousand(totalRow.n1_amountSales) }}
                      </td>
                      <td class="text-center font-bold">{{ totalRow.n1_percentMatSales }}%</td>

                      <td class="text-right px-1 py-1">
                        {{ formatNumber(totalRow.n2_amount_forecast) }}
                      </td>
                      <td class="text-right px-1 py-1">
                        {{ formatAmountThousand(totalRow.n2_amountSales) }}
                      </td>
                      <td class="text-center font-bold">{{ totalRow.n2_percentMatSales }}%</td>

                      <td class="text-right px-1 py-1">
                        {{ formatNumber(totalRow.n3_amount_forecast) }}
                      </td>
                      <td class="text-right px-1 py-1">
                        {{ formatAmountThousand(totalRow.n3_amountSales) }}
                      </td>
                      <td class="text-center font-bold">{{ totalRow.n3_percentMatSales }}%</td>
                    </tr>
                  </tbody>
                </table>

                <!-- Note -->
                <div class="note-section mt-8 break-inside-avoid text-[13px] font-bold">
                  <div class="text-left">
                    <strong class="block mb-1">Note:</strong>
                    <ul class="list-disc list-inside m-0 leading-[1.4]">
                      <li contenteditable="true">
                        Budget Material {{ noteMonthShort }} menggunakan Material Price periode
                        <span v-if="selectedDateInfo">
                          {{ selectedDateInfo.periodShort }}
                          {{ selectedDateInfo.periodYear }} </span
                        >.
                      </li>
                      <li contenteditable="true">Budget {{ noteMonthShort }} sudah termasuk Spare Part.</li>
                      <li contenteditable="true">Budget Transport merupakan Budget Transport CKD Import.</li>
                      <li contenteditable="true">
                        Diff. Budget MDFO vs Act
                        <span v-if="selectedDateInfo">
                          {{ selectedDateInfo.prevShort }}
                          {{ selectedDateInfo.prevYear }}
                        </span>
                        terabsorb pada qty budget {{ noteMonthShort }}.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Print footer -->
      <div
        class="relative z-[80] flex h-[58px] shrink-0 items-center justify-center !border-t !border-solid !border-slate-200 !bg-white px-4 shadow-[0_-4px_14px_rgba(15,23,42,0.05)] print:hidden"
      >
        <button
          type="button"
          :disabled="isPreparingPrint || !permissions.download"
          @click="startSalesAmountPrint"
          class="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl !border !border-solid !border-blue-600 !bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] transition hover:!bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <img src="@/assets/images/printer.png" alt="Print" class="h-[18px] w-[18px]" />

          {{ isPreparingPrint ? 'Preparing...' : 'Print' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-text-13 {
  font-size: 13px;
}

.table-title-13 {
  font-size: 13px;
}
</style>
