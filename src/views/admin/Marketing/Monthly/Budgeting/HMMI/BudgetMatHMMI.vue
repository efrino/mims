<script setup>
import { storeToRefs } from 'pinia';
import { onMounted, ref, shallowRef } from 'vue';

import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useBudgetMatStore } from '@/stores/Marketing/BudgetMatStore.ts';
import { useBudgetVsSoStore } from '@/stores/Marketing/BudgetVsSoStore';

const page = ref({ title: 'Budget Material' });

const breadcrumbs = shallowRef([
  { title: 'Marketing', disabled: false, href: '#' },
  { title: 'Monthly', disabled: false, href: '#' },
  { title: 'Budgeting', disabled: false, href: '#' },
  { title: 'HMMI', disabled: false, href: '#' },
  { title: 'Budget Material', disabled: true, href: '#' }
]);

const budgetMatStore = useBudgetMatStore();
const budgetVsSoStore = useBudgetVsSoStore();

const { continueSalesPrintFromMaterial } = budgetVsSoStore;

onMounted(() => {
  void continueSalesPrintFromMaterial();
});

const {
  /* Permission */
  permissions,

  /* Filter utama */
  budgetMat,
  selectedMonth,
  selectedReportType,
  selectedVersion,
  includeADT,

  /* Status filter dan schema */
  isReportTypeDisabled,
  isVersionDisabled,
  isFilterJsonDisabled,
  isExcelDisabled,
  canApplyMaterialSchema,
  isSelectedMonthHasADT,
  isSchemaMetaLoading,

  /* Header, tanggal, dan total */
  selectedDateInfo,
  noteMonthShort,
  headerMonths,
  titleMonth,
  formattedDate,
  volumeTotalAll,
  totalColumns,
  totalDiff,

  /* Modal dan file */
  showMaterialModal,
  scanFile,
  showPreview,
  previewUrl,
  isImage,
  isReadADT,
  iaaNo,
  existingScanFileName,

  /* Form schema */
  selectedModel,
  selectedName,
  selectedSchemaHandling,
  isDependentDisabled,
  modelOptions,
  nameOptions,
  effectiveMonth,
  effectiveHint,
  effectiveMinMonth,
  effectiveMaxMonth,
  monthsForSelectedYear,

  /* Advance */
  advanceMonth,
  advanceHint,
  advanceMinMonth,
  advanceMaxMonth,
  advanceList,
  canAddAdvanceMonth,

  /* Additional values */
  pcsPrev,
  pcsPrevAdjusted,
  kgPrev,
  amountPrev,
  pcsDifference,
  kgDifference,
  amountDifference,
  pcsAfter,
  kgAfter,
  amountAfter,

  /* Advance values */
  advancePcsPrev,
  advanceKgprev,
  advanceAmountprev,
  advancePcsDiff,
  advanceKgDiff,
  advanceAmountDiff,
  advancePcsAfter,
  advanceKgAfter,
  advanceAmountAfter,

  /* Reset dan lock */
  isPcsResetDisabled,
  isKgResetDisabled,
  isAmountResetDisabled,
  isSchemaHandlingLocked,
  schemaHandlingLockMessage
} = storeToRefs(budgetMatStore);

const {
  /* Filter, import, view */
  applyFilter,
  importExcelBudget,
  toggleMaterialSchema,
  printA4,

  /* Modal material handling */
  openMaterialHandling,
  handleMonthDotClick,
  confirmSaveModal,
  confirmCloseModal,
  confirmDeleteMaterial,
  confirmResetField,
  onFileChange,
  openPreview,
  closePreview,

  /* Advance extra */
  addAdvanceMonth,
  removeAdvanceMonth,
  handleAdvanceListMonthChange,
  updateAdvanceListDiff,
  rememberAdvanceListMonth,
  getAdvanceListAfter,

  /* Format dan helper tabel */
  formatNumber,
  formatDiff,
  formatModelName,
  getMonthTooltip,
  hasSchemaForMonth,
  rowspanNo,
  rowspanModel,
  groupNumber,
  shouldShowNo,
  shouldShowModel,
  shouldShowTotalItem,
  isSameCKD,
  sumCKD,
  getVolumeValue
} = budgetMatStore;
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <div class="w-full min-w-0">
    <!-- Budget Material -->

    <div class="relative isolate flex h-[calc(100dvh-9rem)] min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl !bg-white shadow">
      <!-- Scroll area -->

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain !bg-white [scrollbar-gutter:stable]">
        <!-- Filter -->
        <div
          class="sticky top-0 z-[70] flex min-h-[58px] flex-wrap items-center gap-2 !border-b !border-solid !border-slate-200 bg-white/95 px-4 py-3 text-sm shadow-[0_3px_10px_rgba(15,23,42,0.08)] backdrop-blur-sm"
        >
          <label for="month" class="font-semibold text-[#333]">Choose Start Month:</label>
          <input
            id="month"
            v-model="selectedMonth"
            type="month"
            class="h-10 rounded-xl !border !border-solid !border-slate-300 !bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:!border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:!bg-slate-100 disabled:text-slate-400"
          />

          <label for="reportType" class="font-semibold text-[#333]">Report Type:</label>
          <select
            id="reportType"
            v-model="selectedReportType"
            :disabled="isReportTypeDisabled"
            class="h-10 box-border rounded-xl !border !border-solid !border-slate-300 !bg-white py-0 pl-3 pr-8 text-sm text-slate-700 shadow-sm outline-none transition focus:!border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:!border-slate-200 disabled:!bg-slate-100 disabled:text-slate-400"
          >
            <option value="Original">Original</option>
            <option value="Balancing">Balancing</option>
          </select>

          <label for="version" class="font-semibold text-[#333]">Version:</label>
          <select
            id="version"
            v-model="selectedVersion"
            :disabled="isVersionDisabled"
            class="h-10 box-border rounded-xl !border !border-solid !border-slate-300 !bg-white py-0 pl-3 pr-8 text-sm text-slate-700 shadow-sm outline-none transition focus:!border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:!border-slate-200 disabled:!bg-slate-100 disabled:text-slate-400"
          >
            <option value="00">00</option>
            <option value="01">01</option>
            <option value="02">02</option>
            <option value="03">03</option>
          </select>
          <button
            @click="applyFilter"
            :disabled="isFilterJsonDisabled"
            :class="[
              'h-10 px-5 rounded-xl text-sm font-semibold shadow-sm transition active:scale-[0.98]',
              isFilterJsonDisabled
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
            ]"
          >
            Filter
          </button>

          <button
            type="button"
            @click="importExcelBudget"
            :disabled="isExcelDisabled || !permissions.download"
            :class="[
              'h-10 px-5 rounded-xl text-sm font-semibold shadow-sm transition active:scale-[0.98]',
              isExcelDisabled || !permissions.download
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-green-600 hover:bg-green-800 text-white cursor-pointer'
            ]"
          >
            Excel
          </button>

          <button
            type="button"
            @click="openMaterialHandling({ from: 'button' })"
            :disabled="isExcelDisabled || !permissions.create"
            :class="[
              'h-10 px-5 rounded-xl text-sm font-semibold shadow-sm transition active:scale-[0.98]',
              isExcelDisabled || !permissions.create
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-yellow-600 hover:bg-yellow-800 text-white cursor-pointer'
            ]"
          >
            Material Handling
          </button>

          <!-- Material schema -->
          <div class="inline-flex flex-col items-center gap-1.5">
            <button
              type="button"
              @click="toggleMaterialSchema"
              :disabled="!canApplyMaterialSchema"
              :class="[
                'h-10 px-5 rounded-xl text-sm font-semibold shadow-sm transition inline-flex items-center gap-2 active:scale-[0.98]',
                !canApplyMaterialSchema
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                  : includeADT
                    ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-600 cursor-pointer'
              ]"
            >
              <span
                :class="[
                  'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold',
                  includeADT ? 'bg-white text-green-600' : 'bg-gray-400 text-white'
                ]"
              >
                {{ includeADT ? '✓' : '×' }}
              </span>
              <span>{{ includeADT ? 'Material Schema Applied' : 'Apply Material Schema' }}</span>
            </button>

            <div
              v-if="selectedMonth && selectedReportType && selectedVersion && !isSchemaMetaLoading && !isSelectedMonthHasADT"
              class="text-[8px] text-orange-500 px-1 text-center"
            >
              ⚠️ Tidak tersedia untuk bulan ini
            </div>

            <div v-if="monthsForSelectedYear.length > 0" class="flex gap-1.5">
              <div
                v-for="month in monthsForSelectedYear"
                :key="month"
                class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                :class="
                  hasSchemaForMonth(month)
                    ? 'cursor-pointer bg-green-500 text-white hover:scale-125'
                    : 'cursor-default bg-gray-400 text-white opacity-70'
                "
                :title="getMonthTooltip(month)"
                @click="!isExcelDisabled && handleMonthDotClick(month)"
              >
                {{ month }}
              </div>
            </div>

            <div v-else class="text-[8px] text-gray-400 px-1">No ADT</div>
          </div>

          <!-- Material Handling modal -->
          <Teleport to="body">
            <div
              v-if="showMaterialModal"
              class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-2 backdrop-blur-[2px]"
            >
              <div
                class="flex w-full max-w-[620px] max-h-[78dvh] flex-col overflow-hidden rounded-[22px] !border !border-solid !border-slate-200 !bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]"
              >
                <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="confirmSaveModal">
                  <div
                    class="z-20 flex shrink-0 items-center justify-between !border-b !border-solid !border-slate-200 !bg-white px-6 py-4"
                  >
                    <h3 class="m-0 text-xl font-extrabold uppercase tracking-[0.4px] text-slate-900">
                      {{ isReadADT ? 'View Material Handling' : 'Material Handling Form' }}
                    </h3>
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl !border !border-solid !border-slate-200 !bg-white text-sm font-bold leading-none text-slate-500 shadow-sm transition hover:!border-red-200 hover:!bg-red-50 hover:text-red-600 active:scale-95"
                      @click="confirmCloseModal"
                    >
                      X
                    </button>
                  </div>

                  <!-- Modal body -->

                  <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain !bg-white px-6 py-4 [scrollbar-gutter:stable]">
                    <div class="block">
                      <!-- Material identity -->
                      <div
                        class="mb-[14px] [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                      >
                        <label>Model</label>
                        <select
                          v-model="selectedModel"
                          class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                          required
                        >
                          <option value="" disabled>Select model</option>
                          <option v-for="item in modelOptions" :key="item.model" :value="item.model">
                            {{ item.label }}
                          </option>
                        </select>
                      </div>

                      <div
                        class="mb-[14px] [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                      >
                        <label>Name</label>
                        <select
                          v-model="selectedName"
                          class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                          :disabled="isDependentDisabled"
                          required
                        >
                          <option value="" disabled>Select name</option>
                          <option v-for="item in nameOptions" :key="item.value" :value="item.value">
                            {{ item.label }}
                          </option>
                        </select>
                      </div>

                      <div
                        class="mb-[14px] [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                      >
                        <label>IAA Number</label>
                        <input
                          v-model="iaaNo"
                          type="text"
                          placeholder="Enter IAA Number"
                          class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 placeholder:text-sm placeholder:text-gray-400"
                          required
                        />
                      </div>

                      <!-- Upload scan -->

                      <div
                        class="mb-[14px] [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                      >
                        <label> Upload Scan </label>

                        <!-- Native file input -->
                        <input
                          id="materialHandlingScanInput"
                          type="file"
                          accept="image/*,.pdf,application/pdf"
                          class="hidden"
                          @change="onFileChange"
                        />

                        <div class="flex items-stretch gap-2">
                          <label
                            for="materialHandlingScanInput"
                            class="group flex h-[52px] min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl !border !border-solid !border-slate-300 !bg-white px-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-200 hover:!border-blue-400 hover:shadow-[0_4px_12px_rgba(15,23,42,0.07)]"
                          >
                            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg !bg-blue-50 text-blue-600">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.8"
                                class="h-[18px] w-[18px]"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  d="
                                    M14.25 2.25H6.75
                                    A2.25 2.25 0 0 0
                                    4.5 4.5v15
                                    a2.25 2.25 0 0 0
                                    2.25 2.25h10.5
                                    a2.25 2.25 0 0 0
                                    2.25-2.25V7.5
                                    L14.25 2.25Z
                                  "
                                />

                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  d="
                                      M14.25 2.25V7.5H19.5
                                    "
                                />
                              </svg>
                            </div>

                            <div class="min-w-0 flex-1">
                              <div
                                class="truncate text-sm font-semibold"
                                :class="scanFile || existingScanFileName ? 'text-slate-700' : 'text-slate-400'"
                              >
                                {{ scanFile?.name || existingScanFileName || 'Pilih file scan' }}
                              </div>

                              <div class="mt-0.5 text-[10px] font-medium text-slate-400">Image atau PDF</div>
                            </div>

                            <span
                              class="shrink-0 rounded-lg !bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition group-hover:!bg-blue-50 group-hover:text-blue-600"
                            >
                              Browse
                            </span>
                          </label>

                          <button
                            type="button"
                            :disabled="!scanFile && !existingScanFileName"
                            title="Preview file"
                            aria-label="Preview file"
                            class="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl !border !border-solid !border-slate-300 !bg-white text-slate-500 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-200 hover:!border-blue-400 hover:!bg-blue-50 hover:text-blue-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:!border-slate-300 disabled:hover:!bg-white disabled:hover:text-slate-500"
                            @click="openPreview"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              class="h-5 w-5"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="
                                  M2.25 12
                                  s3.75-6.75
                                  9.75-6.75
                                  S21.75 12
                                  21.75 12
                                  s-3.75 6.75
                                  -9.75 6.75
                                  S2.25 12
                                  2.25 12Z
                                "
                              />

                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="
                                    M15 12
                                    a3 3 0 1 1
                                    -6 0
                                    3 3 0 0 1
                                    6 0Z
                                  "
                                />
                            </svg>
                          </button>
                        </div>

                        <small v-if="existingScanFileName && !scanFile" class="mt-1.5 block text-[10px] font-medium text-slate-500">
                          Existing file:
                          {{ existingScanFileName }}
                        </small>
                      </div>

                      <!-- File preview -->
                      <div
                        v-if="showPreview"
                        class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/50 p-5 backdrop-blur-[2px]"
                      >
                        <div
                          class="flex max-h-[90vh] w-[95%] max-w-[1000px] flex-col overflow-hidden rounded-2xl !border !border-solid !border-slate-200 !bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)]"
                        >
                          <div class="flex items-center justify-between !border-b !border-solid !border-slate-200 px-5 py-4">
                            <div>
                              <h3 class="m-0 text-base font-bold text-slate-900">File Preview</h3>

                              <p class="m-0 mt-0.5 text-xs text-slate-400">
                                {{ scanFile?.name || existingScanFileName }}
                              </p>
                            </div>

                            <button
                              type="button"
                              class="flex h-9 w-9 items-center justify-center rounded-xl !border !border-solid !border-slate-200 !bg-white text-slate-500 transition hover:!border-red-200 hover:!bg-red-50 hover:text-red-600"
                              @click="closePreview"
                            >
                              ✕
                            </button>
                          </div>

                          <div class="min-h-0 flex-1 overflow-auto !bg-slate-50 p-4">
                            <img v-if="isImage" :src="previewUrl" class="mx-auto max-h-[70vh] max-w-full object-contain" />

                            <iframe
                              v-else
                              :src="previewUrl"
                              class="h-[70vh] w-full rounded-lg !border !border-solid !border-slate-200 !bg-white"
                            ></iframe>
                          </div>

                          <div class="mt-3 mr-3 mb-3 flex justify-end">
                            <button
                              type="button"
                              class="inline-flex h-10 items-center justify-center rounded-lg !border !border-solid !border-slate-300 !bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:!border-red-200 hover:!bg-red-50 hover:text-red-600 active:scale-[0.98]"
                              @click="closePreview"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>

                      <!-- Schema handling -->
                      <div
                        class="mb-[14px] [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                      >
                        <label>Schema Handling</label>

                        <select
                          v-model="selectedSchemaHandling"
                          class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                          :disabled="isDependentDisabled || isSchemaHandlingLocked"
                          required
                        >
                          <option value="" disabled>Select</option>
                          <option value="additional">Additional</option>
                          <option value="advance">Advance</option>
                        </select>

                        <small v-if="schemaHandlingLockMessage" class="text-[10px] text-orange-500">
                          {{ schemaHandlingLockMessage }}
                        </small>
                      </div>

                      <div
                        v-if="selectedSchemaHandling === 'advance'"
                        class="my-[24px] mb-[14px] flex items-center gap-3 rounded-lg border border-gray-200 bg-slate-50 p-3 font-bold text-gray-900 before:h-px before:flex-1 before:bg-gray-300 before:content-[''] after:h-px after:flex-1 after:bg-gray-300 after:content-[''] [&>span]:whitespace-nowrap [&>span]:text-base"
                      >
                        <span>Effective Month</span>
                      </div>

                      <div
                        v-if="selectedSchemaHandling"
                        class="mb-[14px] [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                      >
                        <label>Effective Month</label>
                        <input
                          v-model="effectiveMonth"
                          type="month"
                          :min="effectiveMinMonth"
                          :max="effectiveMaxMonth"
                          class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                          required
                        />
                        <small v-if="selectedSchemaHandling === 'additional' && effectiveHint" class="text-red-600">
                          {{ effectiveHint }}
                        </small>
                      </div>

                      <!-- Additional values -->
                      <div v-if="selectedSchemaHandling" class="-mx-2 flex flex-wrap">
                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>PCS Before</label>
                            <input
                              type="text"
                              :value="formatNumber(pcsPrevAdjusted)"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                              readonly
                            />
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>Difference</label>
                            <input
                              v-model.number="pcsDifference"
                              type="number"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                              :placeholder="selectedSchemaHandling === 'advance' ? '' : 'Enter change'"
                              :readonly="selectedSchemaHandling === 'advance'"
                              :disabled="selectedSchemaHandling === 'advance'"
                              required
                            />
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>PCS After</label>
                            <div class="flex items-center gap-2 [&>input]:min-w-0 [&>input]:flex-1">
                              <input
                                type="text"
                                :value="formatNumber(pcsAfter)"
                                class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                                readonly
                              />
                              <button
                                v-if="isReadADT"
                                type="button"
                                class="inline-flex h-[34px] w-[34px] min-w-[34px] cursor-pointer items-center justify-center rounded-lg border-0 bg-red-600 text-lg font-bold leading-none text-white transition-all duration-150 hover:rotate-[-20deg] hover:scale-105 hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-100 disabled:opacity-60 disabled:hover:rotate-0 disabled:hover:scale-100"
                                :disabled="isPcsResetDisabled || !permissions.update"
                                title="Reset PCS ke nilai original"
                                @click="confirmResetField('pcs')"
                              >
                                ↻
                              </button>
                            </div>
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>KG Before</label>
                            <input
                              type="text"
                              :value="formatNumber(kgPrev)"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                              readonly
                            />
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>Difference</label>
                            <input
                              v-model.number="kgDifference"
                              type="number"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                              :placeholder="selectedSchemaHandling === 'advance' ? '' : 'Enter change'"
                              :readonly="selectedSchemaHandling === 'advance'"
                              :disabled="selectedSchemaHandling === 'advance'"
                              required
                            />
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>KG After</label>
                            <div class="flex items-center gap-2 [&>input]:min-w-0 [&>input]:flex-1">
                              <input
                                type="text"
                                :value="formatNumber(kgAfter)"
                                class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                                readonly
                              />
                              <button
                                v-if="isReadADT"
                                type="button"
                                class="inline-flex h-[34px] w-[34px] min-w-[34px] cursor-pointer items-center justify-center rounded-lg border-0 bg-red-600 text-lg font-bold leading-none text-white transition-all duration-150 hover:rotate-[-20deg] hover:scale-105 hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-100 disabled:opacity-60 disabled:hover:rotate-0 disabled:hover:scale-100"
                                :disabled="isKgResetDisabled || !permissions.update"
                                title="Reset KG ke nilai original"
                                @click="confirmResetField('kg')"
                              >
                                ↻
                              </button>
                            </div>
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>Amount Before</label>
                            <input
                              type="text"
                              :value="formatNumber(amountPrev)"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                              readonly
                            />
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>Difference</label>
                            <input
                              v-model.number="amountDifference"
                              type="number"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                              :placeholder="selectedSchemaHandling === 'advance' ? '' : 'Enter change'"
                              :readonly="selectedSchemaHandling === 'advance'"
                              :disabled="selectedSchemaHandling === 'advance'"
                              required
                            />
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>Amount After</label>
                            <div class="flex items-center gap-2 [&>input]:min-w-0 [&>input]:flex-1">
                              <input
                                type="text"
                                :value="formatNumber(amountAfter)"
                                class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                                readonly
                              />
                              <button
                                v-if="isReadADT"
                                type="button"
                                class="inline-flex h-[34px] w-[34px] min-w-[34px] cursor-pointer items-center justify-center rounded-lg border-0 bg-red-600 text-lg font-bold leading-none text-white transition-all duration-150 hover:rotate-[-20deg] hover:scale-105 hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-100 disabled:opacity-60 disabled:hover:rotate-0 disabled:hover:scale-100"
                                :disabled="isAmountResetDisabled || !permissions.update"
                                title="Reset Amount ke nilai original"
                                @click="confirmResetField('amount')"
                              >
                                ↻
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Advance month -->
                      <div
                        v-if="selectedSchemaHandling === 'advance'"
                        class="my-[24px] mb-[14px] flex items-center gap-3 rounded-lg border border-gray-200 bg-slate-50 p-3 font-bold text-gray-900 before:h-px before:flex-1 before:bg-gray-300 before:content-[''] after:h-px after:flex-1 after:bg-gray-300 after:content-[''] [&>span]:whitespace-nowrap [&>span]:text-base"
                      >
                        <span>Advance Month</span>
                      </div>

                      <div
                        v-if="selectedSchemaHandling === 'advance'"
                        class="mb-[14px] [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                      >
                        <label>Advance Month</label>
                        <input
                          v-model="advanceMonth"
                          type="month"
                          :min="advanceMinMonth"
                          :max="advanceMaxMonth"
                          class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                          required
                        />
                        <small v-if="selectedSchemaHandling === 'advance' && advanceHint" class="text-red-600">
                          {{ advanceHint }}
                        </small>
                      </div>

                      <!-- Advance values -->
                      <div v-if="selectedSchemaHandling === 'advance'" class="-mx-2 flex flex-wrap">
                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>PCS Before</label>
                            <input
                              type="text"
                              :value="formatNumber(advancePcsPrev)"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                              readonly
                            />
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>PCS Advance</label>
                            <input
                              v-model="advancePcsDiff"
                              type="number"
                              placeholder="Enter change"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                            />
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>PCS After</label>
                            <input
                              type="text"
                              :value="formatNumber(advancePcsAfter)"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                              readonly
                            />
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>KG Before</label>
                            <input
                              type="text"
                              :value="formatNumber(advanceKgprev)"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                              readonly
                            />
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>KG Advance</label>
                            <input
                              v-model="advanceKgDiff"
                              type="number"
                              placeholder="Enter change"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                            />
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>KG After</label>
                            <input
                              type="text"
                              :value="formatNumber(advanceKgAfter)"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                              readonly
                            />
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>Amount Before</label>
                            <input
                              type="text"
                              :value="formatNumber(advanceAmountprev)"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                              readonly
                            />
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>Amount Advance</label>
                            <input
                              v-model="advanceAmountDiff"
                              type="number"
                              placeholder="Enter change"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                            />
                          </div>
                        </div>

                        <div
                          class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                        >
                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>Amount After</label>
                            <input
                              type="text"
                              :value="formatNumber(advanceAmountAfter)"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                              readonly
                            />
                          </div>
                        </div>
                      </div>

                      <!-- Extra advance month -->
                      <div v-if="selectedSchemaHandling === 'advance'" class="col-[1/-1] mt-[10px]">
                        <div
                          v-for="(item, index) in advanceList"
                          :key="item.uid"
                          class="mb-4 rounded-[14px] border border-gray-200 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.06)]"
                        >
                          <div
                            class="mb-[14px] flex items-start justify-between gap-3 border-b border-[#eef2f7] pb-[10px] [&_h4]:m-0 [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-gray-900 [&_small]:mt-[3px] [&_small]:block [&_small]:text-[11px] [&_small]:text-gray-500"
                          >
                            <div>
                              <h4>Advance Month {{ index + 2 }}</h4>
                              <small>Tambahan advance setelah advance month utama</small>
                            </div>

                            <button
                              type="button"
                              class="cursor-pointer rounded-full border-0 bg-red-100 px-3 py-[6px] text-[11px] font-bold text-red-700 hover:bg-red-200"
                              @click="removeAdvanceMonth(index)"
                            >
                              Remove
                            </button>
                          </div>

                          <div
                            class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                          >
                            <label>Advance Month</label>
                            <input
                              v-model="item.month"
                              type="month"
                              class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                              :min="advanceMinMonth"
                              :max="advanceMaxMonth"
                              @focus="rememberAdvanceListMonth(index)"
                              @mousedown="rememberAdvanceListMonth(index)"
                              @change="handleAdvanceListMonthChange(index)"
                            />

                            <small v-if="item.hint" class="text-red-600">
                              {{ item.hint }}
                            </small>
                          </div>

                          <div class="-mx-2 flex flex-wrap">
                            <div
                              class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                            >
                              <div
                                class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                              >
                                <label>PCS Before</label>
                                <input
                                  type="text"
                                  :value="formatNumber(item.pcsPrev)"
                                  class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                                  readonly
                                />
                              </div>
                            </div>

                            <div
                              class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                            >
                              <div
                                class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                              >
                                <label>PCS Advance</label>
                                <input
                                  :value="item.pcsDiff ?? 0"
                                  type="number"
                                  placeholder="Enter change"
                                  class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                                  @input="updateAdvanceListDiff(index, 'pcs', $event)"
                                />
                              </div>
                            </div>

                            <div
                              class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                            >
                              <div
                                class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                              >
                                <label>PCS After</label>
                                <input
                                  type="text"
                                  :value="formatNumber(getAdvanceListAfter(item, 'pcs'))"
                                  class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                                  readonly
                                />
                              </div>
                            </div>

                            <div
                              class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                            >
                              <div
                                class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                              >
                                <label>KG Before</label>
                                <input
                                  type="text"
                                  :value="formatNumber(item.kgPrev)"
                                  class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                                  readonly
                                />
                              </div>
                            </div>

                            <div
                              class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                            >
                              <div
                                class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                              >
                                <label>KG Advance</label>
                                <input
                                  :value="item.kgDiff ?? 0"
                                  type="number"
                                  placeholder="Enter change"
                                  class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                                  @input="updateAdvanceListDiff(index, 'kg', $event)"
                                />
                              </div>
                            </div>

                            <div
                              class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                            >
                              <div
                                class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                              >
                                <label>KG After</label>
                                <input
                                  type="text"
                                  :value="formatNumber(getAdvanceListAfter(item, 'kg'))"
                                  class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                                  readonly
                                />
                              </div>
                            </div>

                            <div
                              class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                            >
                              <div
                                class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                              >
                                <label>Amount Before</label>
                                <input
                                  type="text"
                                  :value="formatNumber(item.amountPrev)"
                                  class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                                  readonly
                                />
                              </div>
                            </div>

                            <div
                              class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                            >
                              <div
                                class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                              >
                                <label>Amount Advance</label>
                                <input
                                  :value="item.amountDiff ?? 0"
                                  type="number"
                                  placeholder="Enter change"
                                  class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                                  @input="updateAdvanceListDiff(index, 'amount', $event)"
                                />
                              </div>
                            </div>

                            <div
                              class="box-border max-w-[33.333333%] flex-[0_0_33.333333%] px-2 [&_input::placeholder]:text-sm [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-sm [&_textarea::placeholder]:text-gray-400"
                            >
                              <div
                                class="mb-3 [&>label]:mb-[6px] [&>label]:block [&>label]:text-sm [&>label]:font-bold [&>label]:text-gray-800"
                              >
                                <label>Amount After</label>
                                <input
                                  type="text"
                                  :value="formatNumber(getAdvanceListAfter(item, 'amount'))"
                                  class="w-full box-border rounded-xl !border !border-solid !border-slate-300 !bg-slate-50 px-3 py-[10px] outline-none transition-all duration-200 placeholder:text-sm placeholder:text-gray-400 hover:!border-slate-400 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                                  readonly
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div class="mt-1 flex items-center justify-start gap-3">
                          <button
                            type="button"
                            class="inline-flex cursor-pointer items-center gap-2 rounded-full border-0 bg-blue-600 px-[14px] py-2 text-xs font-bold text-white shadow-[0_8px_18px_rgba(37,99,235,0.24)] transition-all duration-200 hover:-translate-y-px hover:bg-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
                            :disabled="!canAddAdvanceMonth"
                            @click="addAdvanceMonth"
                          >
                            <span
                              class="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/20 text-sm leading-none"
                              >+</span
                            >
                            Add Advance Month
                          </button>

                          <small v-if="!canAddAdvanceMonth && advanceMonth" class="text-[11px] text-gray-500">
                            Semua sisa advance month sudah ditambahkan.
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Modal footer -->

                  <div
                    class="flex shrink-0 items-center justify-between gap-3 !border-t !border-solid !border-slate-200 !bg-white px-6 py-4"
                  >
                    <button
                      v-if="isReadADT"
                      type="button"
                      :disabled="!permissions.delete"
                      class="h-10 cursor-pointer rounded-xl !border-0 !bg-red-600 px-5 text-sm font-bold text-white shadow-sm transition hover:!bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:!bg-gray-300 disabled:text-gray-500"
                      @click="confirmDeleteMaterial"
                    >
                      Delete
                    </button>

                    <div class="ml-auto flex items-center gap-2.5">
                      <button
                        type="button"
                        class="h-10 cursor-pointer rounded-xl !border !border-solid !border-slate-300 !bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm transition hover:!border-slate-400 hover:!bg-slate-50 active:scale-[0.98]"
                        @click="confirmCloseModal"
                      >
                        {{ isReadADT ? 'Close' : 'Cancel' }}
                      </button>

                      <button
                        type="submit"
                        :disabled="isReadADT ? !permissions.update : !permissions.create"
                        class="h-10 cursor-pointer rounded-xl !border-0 !bg-green-700 px-5 text-sm font-bold text-white shadow-sm transition hover:!bg-green-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:!bg-gray-300 disabled:text-gray-500"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </Teleport>
        </div>

        <!-- Report -->
        <div class="relative z-0 w-full min-w-0 flex-1 overflow-x-auto !bg-white px-4 pt-1 pb-4 !border-0 !shadow-none">
          <div
            id="printArea"
            class="box-border mx-auto w-full min-w-[1300px] max-w-[1550px] scroll-mt-[72px] !bg-white pt-2 pr-0 pb-0 pl-0"
          >
            <div class="box-border m-0 w-full !border !border-solid !border-black p-[10px] print:m-0 print:w-full">
              <!-- Report header -->

              <div class="print-report-header w-full !bg-white">
                <div
                  class="print-header-main grid w-full min-h-[64px] grid-cols-[300px_minmax(0,1fr)_190px] items-start !border-b-[2px] !border-solid !border-black px-0 pt-[1px] pb-0.5"
                >
                  <div
                    class="print-report-logo flex min-w-0 items-start pt-[1px] [&_img]:block [&_img]:h-auto [&_img]:w-[260px] [&_img]:max-w-[260px] [&_img]:object-contain"
                  >
                    <img src="@/assets/images/logo.png" alt="Company Logo" />
                  </div>

                  <div class="print-report-meta mx-auto min-w-0 w-[560px] pt-[1px] text-[13px] font-bold leading-[1.18] text-black">
                    <div class="grid grid-cols-[92px_14px_minmax(0,1fr)] items-center">
                      <span class="whitespace-nowrap text-left font-bold"> TITLE </span>

                      <span class="text-center font-bold"> : </span>

                      <span class="print-budget-title min-w-0 whitespace-nowrap text-left font-bold" contenteditable="true">
                        BUDGET PEMBELIAN MATERIAL &amp; CKD
                        <span v-if="titleMonth">
                          {{ titleMonth }}
                        </span>
                      </span>
                    </div>

                    <div class="grid grid-cols-[92px_14px_minmax(0,1fr)] items-center">
                      <span class="whitespace-nowrap text-left font-bold"> PROJECT </span>

                      <span class="text-center font-bold"> : </span>

                      <span class="whitespace-nowrap text-left font-bold" contenteditable="true"> SU2ID &amp; KS </span>
                    </div>

                    <div class="grid grid-cols-[92px_14px_minmax(0,1fr)] items-center">
                      <span class="whitespace-nowrap text-left font-bold"> CUSTOMER </span>

                      <span class="text-center font-bold"> : </span>

                      <span class="whitespace-nowrap text-left font-bold" contenteditable="true"> PT HMMI </span>
                    </div>
                  </div>

                  <div class="flex h-full min-w-[180px] items-end justify-end">
                    <div
                      id="rev"
                      class="print-report-revision mb-[-2px] flex h-[22px] w-[135px] box-border items-center justify-center !border-t !border-l !border-r !border-solid !border-black !bg-white px-2 text-center text-[10px] font-bold italic leading-none"
                    >
                      <span class="whitespace-nowrap" contenteditable="true"> {{ selectedReportType }} Rev. {{ selectedVersion }} </span>
                    </div>
                  </div>
                </div>

                <div class="print-header-date-row flex h-[30px] w-full items-end justify-end !bg-white px-0">
                  <div
                    class="print-report-date flex h-[20px] w-[135px] box-border items-center justify-center !border-t !border-l !border-r !border-solid !border-black !bg-white px-1 text-center text-[9px] font-bold italic leading-none"
                  >
                    {{ formattedDate }}
                  </div>
                </div>
              </div>

              <table
                id="budget-table"
                class="report-table w-full table-fixed border-collapse text-[9px] [&_th]:!border [&_th]:!border-solid [&_th]:!border-black [&_th]:px-[3px] [&_th]:py-[2px] [&_th]:text-center [&_th]:text-black [&_th]:whitespace-normal [&_th]:break-words [&_th]:font-bold [&_td]:!border [&_td]:!border-solid [&_td]:!border-black [&_td]:px-[3px] [&_td]:py-[2px] [&_td]:text-right [&_td]:whitespace-normal [&_td]:break-words [&_td.text-center]:!text-center [&_td.col-no]:!text-center [&_td.col-model]:!text-center [&_th.date-empty-cell]:!border-0 [&_th.date-empty-cell]:!border-transparent [&_th.date-empty-cell]:!bg-white [&_th.date-empty-cell]:!shadow-none [&_th.date-empty-cell]:!p-0 [&_th.date-value-cell]:!bg-white"
              >
                <!-- Column widths -->

                <colgroup>
                  <col class="col-track-no" style="width: 20px" />

                  <col class="col-track-model" style="width: 48px" />

                  <col class="col-track-material" style="width: 52px" />

                  <col class="col-track-material-type" style="width: 60px" />

                  <col class="col-track-item" style="width: 38px" />

                  <col class="col-track-data col-track-pcs" style="width: 46px" />

                  <col class="col-track-data col-track-kg" style="width: 46px" />

                  <col class="col-track-data col-track-amount" style="width: 60px" />

                  <col class="col-track-data col-track-pcs" style="width: 46px" />

                  <col class="col-track-data col-track-kg" style="width: 46px" />

                  <col class="col-track-data col-track-amount" style="width: 60px" />

                  <col class="col-track-diff" style="width: 32px" />

                  <col class="col-track-data col-track-pcs" style="width: 46px" />

                  <col class="col-track-data col-track-kg" style="width: 46px" />

                  <col class="col-track-data col-track-amount" style="width: 60px" />

                  <col class="col-track-data col-track-pcs" style="width: 46px" />

                  <col class="col-track-data col-track-kg" style="width: 46px" />

                  <col class="col-track-data col-track-amount" style="width: 60px" />

                  <col class="col-track-data col-track-pcs" style="width: 46px" />

                  <col class="col-track-data col-track-kg" style="width: 46px" />

                  <col class="col-track-data col-track-amount" style="width: 60px" />

                  <col class="col-track-data col-track-pcs" style="width: 46px" />

                  <col class="col-track-data col-track-kg" style="width: 46px" />

                  <col class="col-track-data col-track-amount" style="width: 60px" />
                </colgroup>

                <thead>
                  <tr>
                    <th rowspan="4" class="col-no !bg-[#99ccff] text-center">No</th>
                    <th rowspan="4" class="col-model !bg-[#99ccff] text-center">Model</th>
                    <th rowspan="4" colspan="2" class="!bg-[#99ccff] text-center">Material/CKD</th>
                    <th rowspan="4" class="!bg-[#99ccff] text-center">
                      Σ Item
                      <br />
                      V to V /
                      <br />
                      Gpart
                    </th>
                    <th colspan="19" class="!bg-[#99ccff] text-[13px] font-bold">BUDGET MATERIAL & CKD</th>
                  </tr>

                  <tr>
                    <th colspan="6" class="!bg-[#99ccff]">{{ headerMonths.nMinus1 }}</th>
                    <th rowspan="3" class="!bg-[#99ccff] text-center">DIFF</th>
                    <th colspan="3" class="!bg-[#99ccff]">{{ headerMonths.n }}</th>
                    <th colspan="3" class="!bg-[#99ccff]">{{ headerMonths.nPlus1 }}</th>
                    <th colspan="3" class="!bg-[#99ccff]">{{ headerMonths.nPlus2 }}</th>
                    <th colspan="3" class="!bg-[#99ccff]">{{ headerMonths.nPlus3 }}</th>
                  </tr>

                  <tr>
                    <th colspan="3" class="!bg-[#99ccff]">FORECAST</th>
                    <th colspan="3" class="!bg-[#99ccff]">ACTUAL</th>
                    <th colspan="3" class="!bg-[#99ccff]">FORECAST</th>
                    <th colspan="3" class="!bg-[#99ccff]">FORECAST</th>
                    <th colspan="3" class="!bg-[#99ccff]">FORECAST</th>
                    <th colspan="3" class="!bg-[#99ccff]">FORECAST</th>
                  </tr>

                  <tr class="italic">
                    <th class="!bg-[#99ccff]">PCS</th>
                    <th class="!bg-[#99ccff]">KG</th>
                    <th class="!bg-[#99ccff]">AMOUNT<br />(x1000)</th>

                    <th class="!bg-[#99ccff]">PCS</th>
                    <th class="!bg-[#99ccff]">KG</th>
                    <th class="!bg-[#99ccff]">AMOUNT<br />(x1000)</th>

                    <th class="!bg-[#99ccff]">PCS</th>
                    <th class="!bg-[#99ccff]">KG</th>
                    <th class="!bg-[#99ccff]">AMOUNT<br />(x1000)</th>

                    <th class="!bg-[#99ccff]">PCS</th>
                    <th class="!bg-[#99ccff]">KG</th>
                    <th class="!bg-[#99ccff]">AMOUNT<br />(x1000)</th>

                    <th class="!bg-[#99ccff]">PCS</th>
                    <th class="!bg-[#99ccff]">KG</th>
                    <th class="!bg-[#99ccff]">AMOUNT<br />(x1000)</th>

                    <th class="!bg-[#99ccff]">PCS</th>
                    <th class="!bg-[#99ccff]">KG</th>
                    <th class="!bg-[#99ccff]">AMOUNT<br />(x1000)</th>
                  </tr>
                </thead>

                <tbody>
                  <template v-for="(row, index) in budgetMat" :key="row.id">
                    <tr v-if="row.name === 'Material'">
                      <td v-if="shouldShowNo(index)" :rowspan="rowspanNo(row.nokol)" class="col-no text-center font-bold">
                        {{ groupNumber(index) }}
                      </td>
                      <td
                        v-if="shouldShowModel(index)"
                        :rowspan="rowspanModel(row.nokol, row.model)"
                        class="col-model text-center font-bold"
                      >
                        {{ formatModelName(row.model) }}
                      </td>

                      <td colspan="2" class="text-center font-bold">Material</td>
                      <td v-if="shouldShowTotalItem(index)" :rowspan="3" class="text-center">
                        {{ row.total_item }}
                      </td>

                      <td>{{ formatNumber(row.n0_pcs_forecast) }}</td>
                      <td>{{ formatNumber(row.n0_kg_forecast) }}</td>
                      <td>{{ formatNumber(row.n0_amount_forecast) }}</td>
                      <td>{{ formatNumber(row.n0_pcs_act) }}</td>
                      <td>{{ formatNumber(row.n0_kg_act) }}</td>
                      <td>{{ formatNumber(row.n0_amount_act) }}</td>

                      <td :class="['text-center', row.difference < 0 ? 'text-red-600' : 'text-black']">
                        {{ formatDiff(row.difference) }}
                      </td>

                      <td>{{ formatNumber(row.n_pcs_forecast) }}</td>
                      <td>{{ formatNumber(row.n_kg_forecast) }}</td>
                      <td>{{ formatNumber(row.n_amount_forecast) }}</td>
                      <td>{{ formatNumber(row.n1_pcs_forecast) }}</td>
                      <td>{{ formatNumber(row.n1_kg_forecast) }}</td>
                      <td>{{ formatNumber(row.n1_amount_forecast) }}</td>
                      <td>{{ formatNumber(row.n2_pcs_forecast) }}</td>
                      <td>{{ formatNumber(row.n2_kg_forecast) }}</td>
                      <td>{{ formatNumber(row.n2_amount_forecast) }}</td>
                      <td>{{ formatNumber(row.n3_pcs_forecast) }}</td>
                      <td>{{ formatNumber(row.n3_kg_forecast) }}</td>
                      <td>{{ formatNumber(row.n3_amount_forecast) }}</td>
                    </tr>

                    <template v-else-if="row.name === 'CKD PCS'">
                      <tr>
                        <td v-if="shouldShowNo(index)" :rowspan="2" class="col-no text-center">
                          {{ row.nokol }}
                        </td>
                        <td v-if="shouldShowModel(index)" :rowspan="2" class="col-model text-center">
                          {{ formatModelName(row.model) }}
                        </td>
                        <td rowspan="2" class="text-center font-bold">CKD</td>
                        <td class="text-center font-bold">PCS</td>

                        <td :rowspan="2">
                          {{ sumCKD(row.nokol, row.model, 'n0_pcs_forecast') }}
                        </td>
                        <td v-if="isSameCKD(row.nokol, row.model, 'n0_kg_forecast')" :rowspan="2">
                          {{ formatNumber(row.n0_kg_forecast) }}
                        </td>
                        <td v-else>
                          {{ formatNumber(row.n0_kg_forecast) }}
                        </td>
                        <td>{{ formatNumber(row.n0_amount_forecast) }}</td>

                        <td :rowspan="2">
                          {{ sumCKD(row.nokol, row.model, 'n0_pcs_act') }}
                        </td>
                        <td v-if="isSameCKD(row.nokol, row.model, 'n0_kg_act')" :rowspan="2">
                          {{ formatNumber(row.n0_kg_act) }}
                        </td>
                        <td v-else>
                          {{ formatNumber(row.n0_kg_act) }}
                        </td>
                        <td>{{ formatNumber(row.n0_amount_act) }}</td>

                        <td :class="['text-center', row.difference < 0 ? 'text-red-600' : 'text-black']">
                          {{ formatDiff(row.difference) }}
                        </td>

                        <td :rowspan="2">
                          {{ sumCKD(row.nokol, row.model, 'n_pcs_forecast') }}
                        </td>
                        <td v-if="isSameCKD(row.nokol, row.model, 'n_kg_forecast')" :rowspan="2">
                          {{ formatNumber(row.n_kg_forecast) }}
                        </td>
                        <td v-else>
                          {{ formatNumber(row.n_kg_forecast) }}
                        </td>
                        <td>{{ formatNumber(row.n_amount_forecast) }}</td>

                        <td :rowspan="2">
                          {{ sumCKD(row.nokol, row.model, 'n1_pcs_forecast') }}
                        </td>
                        <td v-if="isSameCKD(row.nokol, row.model, 'n1_kg_forecast')" :rowspan="2">
                          {{ formatNumber(row.n1_kg_forecast) }}
                        </td>
                        <td v-else>
                          {{ formatNumber(row.n1_kg_forecast) }}
                        </td>
                        <td>{{ formatNumber(row.n1_amount_forecast) }}</td>

                        <td :rowspan="2">
                          {{ sumCKD(row.nokol, row.model, 'n2_pcs_forecast') }}
                        </td>
                        <td v-if="isSameCKD(row.nokol, row.model, 'n2_kg_forecast')" :rowspan="2">
                          {{ formatNumber(row.n2_kg_forecast) }}
                        </td>
                        <td v-else>
                          {{ formatNumber(row.n2_kg_forecast) }}
                        </td>
                        <td>{{ formatNumber(row.n2_amount_forecast) }}</td>

                        <td :rowspan="2">
                          {{ sumCKD(row.nokol, row.model, 'n3_pcs_forecast') }}
                        </td>
                        <td v-if="isSameCKD(row.nokol, row.model, 'n3_kg_forecast')" :rowspan="2">
                          {{ formatNumber(row.n3_kg_forecast) }}
                        </td>
                        <td v-else>
                          {{ formatNumber(row.n3_kg_forecast) }}
                        </td>
                        <td>{{ formatNumber(row.n3_amount_forecast) }}</td>
                      </tr>
                    </template>

                    <template v-else-if="row.name === 'CKD Transport'">
                      <tr>
                        <td class="text-center font-bold">Transport</td>

                        <td v-if="!isSameCKD(row.nokol, row.model, 'n0_amount_forecast')">
                          {{ formatNumber(row.n0_amount_forecast) }}
                        </td>

                        <td v-if="!isSameCKD(row.nokol, row.model, 'n0_amount_act')">
                          {{ formatNumber(row.n0_amount_act) }}
                        </td>

                        <td :class="['text-center', row.difference < 0 ? 'text-red-600' : 'text-black']">
                          {{ formatDiff(row.difference) }}
                        </td>

                        <td v-if="!isSameCKD(row.nokol, row.model, 'n_amount_forecast')">
                          {{ formatNumber(row.n_amount_forecast) }}
                        </td>

                        <td v-if="!isSameCKD(row.nokol, row.model, 'n1_amount_forecast')">
                          {{ formatNumber(row.n1_amount_forecast) }}
                        </td>

                        <td v-if="!isSameCKD(row.nokol, row.model, 'n2_amount_forecast')">
                          {{ formatNumber(row.n2_amount_forecast) }}
                        </td>

                        <td v-if="!isSameCKD(row.nokol, row.model, 'n3_amount_forecast')">
                          {{ formatNumber(row.n3_amount_forecast) }}
                        </td>
                      </tr>
                    </template>
                  </template>

                  <!-- Total row -->
                  <tr class="total-row bg-[#99ccff] [&_td]:font-bold [&_td]:text-right [&_td.text-center]:!text-center">
                    <td colspan="4" class="text-center">Total</td>
                    <td class="text-center">{{ totalColumns.total_item }}</td>
                    <td>{{ formatNumber(totalColumns.n0_pcs_forecast) }}</td>
                    <td>{{ formatNumber(totalColumns.n0_kg_forecast) }}</td>
                    <td>{{ formatNumber(totalColumns.n0_amount_forecast) }}</td>
                    <td>{{ formatNumber(totalColumns.n0_pcs_act) }}</td>
                    <td>{{ formatNumber(totalColumns.n0_kg_act) }}</td>
                    <td>{{ formatNumber(totalColumns.n0_amount_act) }}</td>
                    <td :class="['text-center', totalDiff < 0 ? 'text-red-600' : 'text-black']">
                      {{ formatDiff(totalDiff) }}
                    </td>
                    <td>{{ formatNumber(totalColumns.n_pcs_forecast) }}</td>
                    <td>{{ formatNumber(totalColumns.n_kg_forecast) }}</td>
                    <td>{{ formatNumber(totalColumns.n_amount_forecast) }}</td>
                    <td>{{ formatNumber(totalColumns.n1_pcs_forecast) }}</td>
                    <td>{{ formatNumber(totalColumns.n1_kg_forecast) }}</td>
                    <td>{{ formatNumber(totalColumns.n1_amount_forecast) }}</td>
                    <td>{{ formatNumber(totalColumns.n2_pcs_forecast) }}</td>
                    <td>{{ formatNumber(totalColumns.n2_kg_forecast) }}</td>
                    <td>{{ formatNumber(totalColumns.n2_amount_forecast) }}</td>
                    <td>{{ formatNumber(totalColumns.n3_pcs_forecast) }}</td>
                    <td>{{ formatNumber(totalColumns.n3_kg_forecast) }}</td>
                    <td>{{ formatNumber(totalColumns.n3_amount_forecast) }}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Volume & approval -->
              <div class="print-footer-grid mt-2 grid grid-cols-[1.05fr_1fr] items-start gap-x-4 px-2">
                <div class="-ml-[7px] mr-1 mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[9px]">
                  <div class="w-full">
                    <table
                      class="print-volume-table w-full table-fixed border-collapse [&_th]:!border [&_th]:!border-solid [&_th]:!border-black [&_th]:bg-[#cfe3f8] [&_th]:p-0 [&_th]:text-center [&_td]:!border [&_td]:!border-solid [&_td]:!border-black [&_td]:p-0 [&_td]:text-center [&_th:first-child]:font-bold [&_td:first-child]:font-bold"
                    >
                      <thead>
                        <tr>
                          <th class="m-0 mt-[3px] p-0 text-center text-[9px] font-bold" colspan="7">
                            Volume Unit Model SU2ID (After Sales)
                          </th>
                        </tr>
                        <tr>
                          <th rowspan="2">Var</th>
                          <th colspan="2">{{ headerMonths.nMinus1 }}</th>
                          <th rowspan="2">{{ headerMonths.n }}</th>
                          <th rowspan="2">{{ headerMonths.nPlus1 }}</th>
                          <th rowspan="2">{{ headerMonths.nPlus2 }}</th>
                          <th rowspan="2">{{ headerMonths.nPlus3 }}</th>
                        </tr>
                        <tr>
                          <th>FC</th>
                          <th>Act</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>ALL</td>
                          <td>{{ getVolumeValue('SU2ID', 'ALL', 'n_1_fc') }}</td>
                          <td>{{ getVolumeValue('SU2ID', 'ALL', 'n_1_act') }}</td>
                          <td>{{ getVolumeValue('SU2ID', 'ALL', 'n') }}</td>
                          <td>{{ getVolumeValue('SU2ID', 'ALL', 'n1') }}</td>
                          <td>{{ getVolumeValue('SU2ID', 'ALL', 'n2') }}</td>
                          <td>{{ getVolumeValue('SU2ID', 'ALL', 'n3') }}</td>
                        </tr>
                        <tr>
                          <td>RHD</td>
                          <td>{{ getVolumeValue('SU2ID', 'RHD', 'n_1_fc') }}</td>
                          <td>{{ getVolumeValue('SU2ID', 'RHD', 'n_1_act') }}</td>
                          <td>{{ getVolumeValue('SU2ID', 'RHD', 'n') }}</td>
                          <td>{{ getVolumeValue('SU2ID', 'RHD', 'n1') }}</td>
                          <td>{{ getVolumeValue('SU2ID', 'RHD', 'n2') }}</td>
                          <td>{{ getVolumeValue('SU2ID', 'RHD', 'n3') }}</td>
                        </tr>
                        <tr>
                          <td>LHD</td>
                          <td>{{ getVolumeValue('SU2ID', 'LHD', 'n_1_fc') }}</td>
                          <td>{{ getVolumeValue('SU2ID', 'LHD', 'n_1_act') }}</td>
                          <td>{{ getVolumeValue('SU2ID', 'LHD', 'n') }}</td>
                          <td>{{ getVolumeValue('SU2ID', 'LHD', 'n1') }}</td>
                          <td>{{ getVolumeValue('SU2ID', 'LHD', 'n2') }}</td>
                          <td>{{ getVolumeValue('SU2ID', 'LHD', 'n3') }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="w-full">
                    <table
                      class="print-volume-table w-full table-fixed border-collapse [&_th]:!border [&_th]:!border-solid [&_th]:!border-black [&_th]:bg-[#cfe3f8] [&_th]:p-0 [&_th]:text-center [&_td]:!border [&_td]:!border-solid [&_td]:!border-black [&_td]:p-0 [&_td]:text-center [&_th:first-child]:font-bold [&_td:first-child]:font-bold"
                    >
                      <thead>
                        <tr>
                          <th class="m-0 mt-[3px] p-0 text-center text-[9px] font-bold" colspan="7">Volume Unit Model KS</th>
                        </tr>
                        <tr>
                          <th rowspan="2">Var</th>
                          <th colspan="2">{{ headerMonths.nMinus1 }}</th>
                          <th rowspan="2">{{ headerMonths.n }}</th>
                          <th rowspan="2">{{ headerMonths.nPlus1 }}</th>
                          <th rowspan="2">{{ headerMonths.nPlus2 }}</th>
                          <th rowspan="2">{{ headerMonths.nPlus3 }}</th>
                        </tr>
                        <tr>
                          <th>FC</th>
                          <th>Act</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>ALL</td>
                          <td>{{ getVolumeValue('KS', 'ALL', 'n_1_fc') }}</td>
                          <td>{{ getVolumeValue('KS', 'ALL', 'n_1_act') }}</td>
                          <td>{{ getVolumeValue('KS', 'ALL', 'n') }}</td>
                          <td>{{ getVolumeValue('KS', 'ALL', 'n1') }}</td>
                          <td>{{ getVolumeValue('KS', 'ALL', 'n2') }}</td>
                          <td>{{ getVolumeValue('KS', 'ALL', 'n3') }}</td>
                        </tr>
                        <tr>
                          <td>RHD</td>
                          <td>{{ getVolumeValue('KS', 'RHD', 'n_1_fc') }}</td>
                          <td>{{ getVolumeValue('KS', 'RHD', 'n_1_act') }}</td>
                          <td>{{ getVolumeValue('KS', 'RHD', 'n') }}</td>
                          <td>{{ getVolumeValue('KS', 'RHD', 'n1') }}</td>
                          <td>{{ getVolumeValue('KS', 'RHD', 'n2') }}</td>
                          <td>{{ getVolumeValue('KS', 'RHD', 'n3') }}</td>
                        </tr>
                        <tr>
                          <td>LHD</td>
                          <td>{{ getVolumeValue('KS', 'LHD', 'n_1_fc') }}</td>
                          <td>{{ getVolumeValue('KS', 'LHD', 'n_1_act') }}</td>
                          <td>{{ getVolumeValue('KS', 'LHD', 'n') }}</td>
                          <td>{{ getVolumeValue('KS', 'LHD', 'n1') }}</td>
                          <td>{{ getVolumeValue('KS', 'LHD', 'n2') }}</td>
                          <td>{{ getVolumeValue('KS', 'LHD', 'n3') }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="w-full">
                    <table
                      class="print-volume-table w-full table-fixed border-collapse [&_th]:!border [&_th]:!border-solid [&_th]:!border-black [&_th]:bg-[#cfe3f8] [&_th]:p-0 [&_th]:text-center [&_td]:!border [&_td]:!border-solid [&_td]:!border-black [&_td]:p-0 [&_td]:text-center [&_th:first-child]:font-bold [&_td:first-child]:font-bold"
                    >
                      <thead>
                        <tr>
                          <th class="m-0 mt-[3px] p-0 text-center text-[9px] font-bold" colspan="7">Volume Unit Model SU2ID FL</th>
                        </tr>
                        <tr>
                          <th rowspan="2">Var</th>
                          <th colspan="2">{{ headerMonths.nMinus1 }}</th>
                          <th rowspan="2">{{ headerMonths.n }}</th>
                          <th rowspan="2">{{ headerMonths.nPlus1 }}</th>
                          <th rowspan="2">{{ headerMonths.nPlus2 }}</th>
                          <th rowspan="2">{{ headerMonths.nPlus3 }}</th>
                        </tr>
                        <tr>
                          <th>FC</th>
                          <th>Act</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>ALL</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'ALL', 'n_1_fc') }}</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'ALL', 'n_1_act') }}</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'ALL', 'n') }}</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'ALL', 'n1') }}</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'ALL', 'n2') }}</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'ALL', 'n3') }}</td>
                        </tr>
                        <tr>
                          <td>RHD</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'RHD', 'n_1_fc') }}</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'RHD', 'n_1_act') }}</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'RHD', 'n') }}</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'RHD', 'n1') }}</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'RHD', 'n2') }}</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'RHD', 'n3') }}</td>
                        </tr>
                        <tr>
                          <td>LHD</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'LHD', 'n_1_fc') }}</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'LHD', 'n_1_act') }}</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'LHD', 'n') }}</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'LHD', 'n1') }}</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'LHD', 'n2') }}</td>
                          <td>{{ getVolumeValue('SU2ID FL', 'LHD', 'n3') }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="w-full">
                    <table
                      class="print-volume-table w-full table-fixed border-collapse [&_th]:!border [&_th]:!border-solid [&_th]:!border-black [&_th]:bg-[#cfe3f8] [&_th]:p-0 [&_th]:text-center [&_td]:!border [&_td]:!border-solid [&_td]:!border-black [&_td]:p-0 [&_td]:text-center [&_th:first-child]:font-bold [&_td:first-child]:font-bold"
                    >
                      <thead>
                        <tr>
                          <th class="m-0 mt-[3px] p-0 text-center text-[9px] font-bold" colspan="7">Volume Unit Model KS FL</th>
                        </tr>
                        <tr>
                          <th rowspan="2">Var</th>
                          <th colspan="2">{{ headerMonths.nMinus1 }}</th>
                          <th rowspan="2">{{ headerMonths.n }}</th>
                          <th rowspan="2">{{ headerMonths.nPlus1 }}</th>
                          <th rowspan="2">{{ headerMonths.nPlus2 }}</th>
                          <th rowspan="2">{{ headerMonths.nPlus3 }}</th>
                        </tr>
                        <tr>
                          <th>FC</th>
                          <th>Act</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>ALL</td>
                          <td>{{ getVolumeValue('KS FL', 'ALL', 'n_1_fc') }}</td>
                          <td>{{ getVolumeValue('KS FL', 'ALL', 'n_1_act') }}</td>
                          <td>{{ getVolumeValue('KS FL', 'ALL', 'n') }}</td>
                          <td>{{ getVolumeValue('KS FL', 'ALL', 'n1') }}</td>
                          <td>{{ getVolumeValue('KS FL', 'ALL', 'n2') }}</td>
                          <td>{{ getVolumeValue('KS FL', 'ALL', 'n3') }}</td>
                        </tr>
                        <tr>
                          <td>RHD</td>
                          <td>{{ getVolumeValue('KS FL', 'RHD', 'n_1_fc') }}</td>
                          <td>{{ getVolumeValue('KS FL', 'RHD', 'n_1_act') }}</td>
                          <td>{{ getVolumeValue('KS FL', 'RHD', 'n') }}</td>
                          <td>{{ getVolumeValue('KS FL', 'RHD', 'n1') }}</td>
                          <td>{{ getVolumeValue('KS FL', 'RHD', 'n2') }}</td>
                          <td>{{ getVolumeValue('KS FL', 'RHD', 'n3') }}</td>
                        </tr>
                        <tr>
                          <td>LHD</td>
                          <td>{{ getVolumeValue('KS FL', 'LHD', 'n_1_fc') }}</td>
                          <td>{{ getVolumeValue('KS FL', 'LHD', 'n_1_act') }}</td>
                          <td>{{ getVolumeValue('KS FL', 'LHD', 'n') }}</td>
                          <td>{{ getVolumeValue('KS FL', 'LHD', 'n1') }}</td>
                          <td>{{ getVolumeValue('KS FL', 'LHD', 'n2') }}</td>
                          <td>{{ getVolumeValue('KS FL', 'LHD', 'n3') }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="print-volume-all-wrap w-full">
                    <table
                      class="print-volume-table print-volume-all-table w-full table-fixed text-[9.5px] border-collapse [&_th]:!border [&_th]:!border-solid [&_th]:!border-black [&_th]:bg-[#cfe3f8] [&_th]:p-0 [&_th]:text-center [&_td]:!border [&_td]:!border-solid [&_td]:!border-black [&_td]:p-0 [&_td]:text-center [&_th:first-child]:font-bold [&_td:first-child]:font-bold"
                    >
                      <thead>
                        <tr>
                          <th class="m-0 mt-[3px] p-0 text-center font-bold" colspan="7">Volume Unit All Model</th>
                        </tr>
                        <tr>
                          <th rowspan="2">Var</th>
                          <th colspan="2">{{ headerMonths.nMinus1 }}</th>
                          <th rowspan="2">{{ headerMonths.n }}</th>
                          <th rowspan="2">{{ headerMonths.nPlus1 }}</th>
                          <th rowspan="2">{{ headerMonths.nPlus2 }}</th>
                          <th rowspan="2">{{ headerMonths.nPlus3 }}</th>
                        </tr>
                        <tr>
                          <th>FC</th>
                          <th>Act</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>ALL</td>
                          <td>{{ formatNumber(volumeTotalAll.n_1_fc) }}</td>
                          <td>{{ formatNumber(volumeTotalAll.n_1_act) }}</td>
                          <td>{{ formatNumber(volumeTotalAll.n) }}</td>
                          <td>{{ formatNumber(volumeTotalAll.n1) }}</td>
                          <td>{{ formatNumber(volumeTotalAll.n2) }}</td>
                          <td>{{ formatNumber(volumeTotalAll.n3) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div class="print-footer-right ml-1 flex flex-col items-stretch gap-3 rounded-lg !bg-white">
                  <div class="print-note-block mb-[8px] !border-0 !bg-white p-0 text-xs font-bold text-black [&_*]:font-bold">
                    <div class="min-w-0 text-left [&_ul]:m-0 [&_ul]:list-inside [&_ul]:p-0 [&_ul]:leading-[1.4]">
                      <strong>Note:</strong>
                      <ul class="m-0 mt-px list-inside list-disc pl-[2px] [&_li]:m-0">
                        <li contenteditable="true">
                          Budget Material {{ noteMonthShort }} menggunakan Material Price periode
                          <span v-if="selectedDateInfo"> {{ selectedDateInfo.periodShort }} {{ selectedDateInfo.periodYear }} </span>.
                        </li>
                        <li contenteditable="true">Budget {{ noteMonthShort }} sudah termasuk Spare Part.</li>
                        <li contenteditable="true">Budget Transport merupakan Budget Transport CKD Import.</li>
                        <li contenteditable="true">
                          Diff. Budget MDFO vs Act
                          <span v-if="selectedDateInfo"> {{ selectedDateInfo.prevShort }} {{ selectedDateInfo.prevYear }} </span>
                          terabsorb pada qty budget {{ noteMonthShort }}.
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div class="print-sign-wrap block w-full">
                    <table
                      class="print-sign-table w-full min-w-0 table-fixed border-collapse text-center text-[10px] [&_th]:!border [&_th]:!border-solid [&_th]:!border-black [&_th]:bg-[#f0f0f0] [&_th]:p-0 [&_th]:align-middle [&_td]:!border [&_td]:!border-solid [&_td]:!border-black [&_td]:p-0 [&_td]:align-middle"
                    >
                      <thead>
                        <tr>
                          <th>Menyetujui</th>
                          <th>Mengetahui</th>
                          <th>Diperiksa</th>
                          <th>Dibuat</th>
                        </tr>
                      </thead>
                      <tbody>
                        <!-- Approval area -->

                        <tr class="print-sign-space-row">
                          <td class="h-[80px]"></td>
                          <td></td>
                          <td></td>
                          <td></td>
                        </tr>

                        <tr class="print-sign-name-row">
                          <td>
                            <span class="print-sign-name text-[9.5px] font-bold" contenteditable="true"> Rudy B. Darmawan </span>
                          </td>

                          <td>
                            <span class="print-sign-name text-[9.5px] font-bold" contenteditable="true"> Aditya Herliawan </span>
                          </td>

                          <td>
                            <span class="print-sign-name text-[9.5px] font-bold" contenteditable="true"> Erick Maryansyah </span>
                          </td>

                          <td>
                            <span class="print-sign-name text-[9.5px] font-bold" contenteditable="true"> Gema Ramadhan P. </span>
                          </td>
                        </tr>

                        <tr class="print-sign-title-row">
                          <td>
                            <span class="print-sign-title text-[9.5px] font-bold" contenteditable="true">
                              Deputy Executive
                              <br />
                              Officer Commercial
                            </span>
                          </td>

                          <td>
                            <span class="print-sign-title text-[9.5px] font-bold" contenteditable="true">
                              Dept. Head
                              <br />
                              Marketing
                            </span>
                          </td>

                          <td>
                            <span class="print-sign-title text-[9.5px] font-bold" contenteditable="true">
                              Asst. Dept. Head
                              <br />
                              Marketing
                            </span>
                          </td>

                          <td>
                            <span class="print-sign-title text-[9.5px] font-bold" contenteditable="true">
                              Section Head
                              <br />
                              Marketing
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="relative z-[80] flex h-[58px] shrink-0 items-center justify-center !border-t !border-solid !border-slate-200 !bg-white px-4 !shadow-none print:hidden"
      >
        <button
          type="button"
          @click="printA4"
          :disabled="!permissions.download"
          class="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl !border !border-solid !border-blue-600 !bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] transition hover:!bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:!border-gray-300 disabled:!bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
        >
          <img src="@/assets/images/printer.png" alt="Print" class="h-[18px] w-[18px]" />

          Print
        </button>
      </div>
    </div>
  </div>
</template>
