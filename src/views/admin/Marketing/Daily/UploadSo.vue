<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import FormatSOFilterPopup from '@/components/shared/FormatSOFilterPopup.vue';
import RawOrderFilterPopup from '@/components/shared/RawOrderFilterPopup.vue';
import TrackingFilterPopup from '@/components/shared/TrackingFilterPopup.vue';
import DnCrosscheckFilterPopup from '@/components/shared/DnCrosscheckFilterPopup.vue';
import { useCustomerOrderStore } from '@/stores/Marketing/UploadSo';
import { customerOrderService } from '@/services/Marketing/CustomerOrderService';

const customerOrderStore = useCustomerOrderStore();

// Scroll container modal upload dan anchor Upload By.
// Saat dropdown Upload By dibuka, modal digeser otomatis agar seluruh daftar user terlihat.
const uploadFormScrollRef = ref<HTMLFormElement | null>(null);
const uploadBySectionRef = ref<HTMLDivElement | null>(null);

// Section berat dimuat saat mendekati viewport, bukan saat halaman pertama dibuka.
const formatSOSectionRef = ref<HTMLElement | null>(null);
const trackingSectionRef = ref<HTMLElement | null>(null);
let heavySectionObserver: IntersectionObserver | null = null;

const setupHeavySectionLazyLoading = (): void => {
  heavySectionObserver?.disconnect();
  heavySectionObserver = null;

  if (typeof IntersectionObserver === 'undefined') {
    void customerOrderStore.activateFormatSOSection();
    void customerOrderStore.activateTrackingSection();
    return;
  }

  heavySectionObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        if (entry.target === formatSOSectionRef.value) {
          observer.unobserve(entry.target);
          void customerOrderStore.activateFormatSOSection();
          return;
        }

        if (entry.target === trackingSectionRef.value) {
          observer.unobserve(entry.target);
          void customerOrderStore.activateTrackingSection();
        }
      });
    },
    {
      root: null,
      rootMargin: '420px 0px',
      threshold: 0.01
    }
  );

  if (formatSOSectionRef.value) {
    heavySectionObserver.observe(formatSOSectionRef.value);
  }

  if (trackingSectionRef.value) {
    heavySectionObserver.observe(trackingSectionRef.value);
  }
};

// ============================================================
// DN MONITORING - WEEKEND ROW CLASS
// Sabtu  = kuning
// Minggu = merah muda
//
// Class hanya dipasang ke row. Cell GAP negatif dan ACV 100% tetap
// memakai warna existing karena style value-cell mempunyai prioritas
// lebih tinggi dan tidak diubah oleh weekend highlight.
// ============================================================
const getDnMonitoringWeekendClass = (
  row: { date?: string | null }
): string => {
  const value = String(row?.date ?? '').trim();

  if (!value) {
    return '';
  }

  let year = 0;
  let month = 0;
  let day = 0;

  // Format ISO bila backend suatu saat mengirim YYYY-MM-DD.
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else {
    // Format report saat ini: 01-Sep-26.
    const reportMatch = value.match(
      /^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/
    );

    if (!reportMatch) {
      return '';
    }

    const monthMap: Record<string, number> = {
      JAN: 1,
      FEB: 2,
      MAR: 3,
      APR: 4,
      MAY: 5,
      JUN: 6,
      JUL: 7,
      AUG: 8,
      SEP: 9,
      OCT: 10,
      NOV: 11,
      DEC: 12
    };

    day = Number(reportMatch[1]);
    month = monthMap[reportMatch[2].toUpperCase()] ?? 0;

    const rawYear = Number(reportMatch[3]);
    year = reportMatch[3].length === 2
      ? 2000 + rawYear
      : rawYear;
  }

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year <= 0 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return '';
  }

  // UTC dipakai supaya hasil hari tidak berubah karena timezone browser.
  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return '';
  }

  const weekDay = date.getUTCDay();

  if (weekDay === 6) {
    return 'dn-weekend-saturday';
  }

  if (weekDay === 0) {
    return 'dn-weekend-sunday';
  }

  return '';
};

const {
  permissions,
  page,
  breadcrumbs,
  selectedCustomer,
  rawMultiSchemaNotice,
  hasMultiSpecialRawSchemaSelection,
  isTmminSoMode,
  isNtcSoMode,
  isAsiAdmSoMode,
  isGayaSoMode,
  isDcwaSoMode,
  isDpmSoMode,
  isFtiSoMode,
  isMesSoMode,
  showHeaderCustomerDropdown,
  showOrderDateFilter,
  fromDate,
  toDate,
  minToDate,
  maxOrderDate,
  showDeliveryDateFilter,
  deliveryFromDate,
  deliveryToDate,
  minDeliveryToDate,
  maxDeliveryDate,
  showCreationDateFilter,
  creationFromDate,
  creationToDate,
  minCreationToDate,
  todayDate,
  showUploadModal,
  selectedCustomerUpload,
  selectedUploadPeriod,
  selectedUploadPeriodLabel,
  uploadDeliveryPeriodOptions,
  showUploadDeliveryPeriodChoice,
  pendingUploadPeriod,
  isAnalyzingUploadPeriods,
  hasDetectedUploadPeriods,
  isSelectedUploadPeriodAvailable,
  showCustomerDropdown,
  showUploadUserDropdown,
  selectedUploadUser,
  canSelectUploadUser,
  excelPassword,
  showExcelPassword,
  uploadFiles,
  admUploadFiles,
  tmminSoUploadFiles,
  ntcSoUploadFiles,
  dpmSoUploadFiles,
  gayaSoUploadFiles,
  mesSoUploadFiles,
  asiAdmSoUploadFiles,
  asiAdmDetectedOrderType,
  asiAdmServicePartDeliveryDate,
  asiAdmFileTypes,
  isInspectingAsiAdmFiles,
  showMissingContractPartsModal,
  missingContractPartsPeriod,
  missingContractPartGroups,
  missingContractParts,
  missingContractPartsCopied,
  isValidatingPreviewContractParts,
  dcwaSoUploadFiles,
  dcwaSoUploadFileLabel,
  dcwaSoHasRequiredFileTypes,
  tmminSoDetectedTxtFiles,
  uploadFileName,
  isTmminSoUpload,
  isNtcSoUpload,
  isMesSoUpload,
  isAsiAdmSoUpload,
  isGayaSoUpload,
  isDcwaSoUpload,
  isDpmSoUpload,
  isFtiSoUpload,
  showUploadPreview,
  isPreviewLoading,
  isUploading,
  showContractMaterialChoiceModal,
  contractMaterialChoiceItems,
  contractMaterialChoiceMessage,
  canConfirmContractMaterialChoice,
  excelSheetNames,
  selectedExcelSheet,
  excelPreviewHeaders,
  excelPreviewError,
  normalizedExcelPreviewRows,
  admUploadPreviewSummaryByPlant,
  tmminUploadPreviewSummary,
  ntcUploadPreviewSummaryBySite,
  showExcelPasswordInput,
  hasExcelPassword,
  canOpenUploadPreview,
  canSubmitUpload,
  uploadSubmitDisabledReason,
  uploadUserOptions,
  uploadFormUserOptions,
  formatSOSelectedFilters,
  formatSOCurrentPage,
  formatSOSorted,
  formatSOPaginatedData,
  formatSOTotalPages,
  formatSOVisiblePages,
  formatSOShowingStart,
  formatSOShowingEnd,
  formatSOTableWidth,
  formatSOSelectedCount,
  isAllCurrentPageFormatSOSelected,
  formatSORowsPerPage,
  isLoadingFormatSO,
  isLoadingRawData,
  isDownloadingFormatSO,
  isAnyExcelDownloading,
  isRegeneratingFormatSO,
  canDownloadRawExcel,
  canDownloadFormatSOExcel,
  canDownloadSelectedRawExcel,
  canDownloadSelectedFormatSOExcel,
  selectedRawDownloadDescription,
  selectedFormatSODownloadDescription,
  downloadDescriptionIsError,
  rawDownloadDescription,
  rawDownloadTitle,
  formatSODownloadDescription,
  rawDownloadButtonLabel,
  formatSODownloadButtonLabel,
  rawActiveRowCount,
  rawCurrentTableTotalCount,
  formatSOActiveRowCount,
  regenerateFormatSOActiveRowCount,
  card2SelectedFilters,
  card2CurrentPage,
  card2RowsPerPage,
  card2TableWidth,
  card2PaginatedData,
  card2TotalPages,
  card2VisiblePages,
  card2ShowingStart,
  card2ShowingEnd,
  card2SortedData,
  isDownloadingRawExcel,
  dcwaRawSoPreviewColumns,
  dcwaRawSoPreviewRows,
  dcwaRawSoPreviewSummary,
  dcwaRawSoPreviewErrors,
  dcwaRawSoCanSubmitPreview,
  showDcwaRawSoPreview,
  dcwaRawSoData,
  isLoadingDcwaRawSo,
  dcwaRawSoSelectedIds,
  dcwaRawSoSelectedFilters,
  dcwaRawSoCurrentPage,
  dcwaRawSoRowsPerPage,
  dcwaRawSoTableWidth,
  dcwaRawSoPreviewTableWidth,
  dcwaRawSoSortedRows,
  dcwaRawSoPaginatedRows,
  dcwaRawSoTotalPages,
  dcwaRawSoVisiblePages,
  dcwaRawSoShowingStart,
  dcwaRawSoShowingEnd,
  isAllCurrentPageDcwaRawSoSelected,
  asiAdmRawSoSelectedFilters,
  asiAdmRawSoCurrentPage,
  asiAdmRawSoRowsPerPage,
  asiAdmRawSoTableWidth,
  asiAdmRawSoPreviewTableWidth,
  asiAdmRawSoSortedRows,
  asiAdmRawSoPaginatedRows,
  asiAdmRawSoTotalPages,
  asiAdmRawSoVisiblePages,
  asiAdmRawSoShowingStart,
  asiAdmRawSoShowingEnd,
  asiAdmRawSoPreviewRows,
  asiAdmRawSoPreviewSummary,
  asiAdmRawSoPreviewErrors,
  asiAdmRawSoCanSubmitPreview,
  showAsiAdmRawSoPreview,
  gayaRawSoVisibleColumns,
  gayaRawSoPreviewColumns,
  gayaRawSoSelectedFilters,
  gayaRawSoCurrentPage,
  gayaRawSoRowsPerPage,
  gayaRawSoTableWidth,
  gayaRawSoPreviewTableWidth,
  gayaRawSoSortedRows,
  gayaRawSoPaginatedRows,
  gayaRawSoTotalPages,
  gayaRawSoVisiblePages,
  gayaRawSoShowingStart,
  gayaRawSoShowingEnd,
  showGayaRawSoPreview,
  gayaRawSoPreviewFiles,
  gayaRawSoActivePreviewFile,
  gayaRawSoActivePreviewRows,
  gayaRawSoActivePreviewSummary,
  ntcRawSoVisibleColumns,
  ntcRawSoPreviewVisibleColumns,
  ntcRawSoSelectedFilters,
  ntcRawSoCurrentPage,
  ntcRawSoRowsPerPage,
  ntcRawSoTableWidth,
  ntcRawSoPreviewTableWidth,
  ntcRawSoSortedRows,
  ntcRawSoPaginatedRows,
  ntcRawSoTotalPages,
  ntcRawSoVisiblePages,
  ntcRawSoShowingStart,
  ntcRawSoShowingEnd,
  showNtcRawSoPreview,
  ntcRawSoPreviewRows,
  mesRawSoData,
  mesRawSoPreviewRows,
  mesRawSoPreviewSummary,
  showMesRawSoPreview,
  mesPartNameConflicts,
  mesPartNameChoices,
  hasUnresolvedMesPartNameConflict,
  mesRawSoSelectedFilters,
  mesRawSoTableWidth,
  mesRawSoCurrentPage,
  mesRawSoRowsPerPage,
  mesRawSoSortedRows,
  mesRawSoPaginatedRows,
  mesRawSoTotalPages,
  mesRawSoVisiblePages,
  mesRawSoShowingStart,
  mesRawSoShowingEnd,
  ftiRawSoData,
  ftiRawSoPreviewRows,
  ftiRawSoPreviewSummary,
  showFtiRawSoPreview,
  ftiAdditionalOrderEnabled,
  ftiAdditionalOrderMode,
  ftiAdditionalOrderFile,
  ftiAdditionalOrderPreview,
  showFtiAdditionalOrderPreview,
  ftiAdditionalOrderScheduleConfirmed,
  ftiAdditionalManualParts,
  ftiAdditionalManualPoNumber,
  ftiAdditionalManualPoNumberLength,
  isFtiAdditionalManualPoNumberValid,
  ftiAdditionalManualPoNumberWarning,
  ftiAdditionalManualQtyDrafts,
  isLoadingFtiAdditionalManualParts,
  isFtiAdditionalOrderAllocationValid,
  ftiRawSoSelectedFilters,
  ftiRawSoTableWidth,
  ftiRawSoCurrentPage,
  ftiRawSoRowsPerPage,
  ftiRawSoSortedRows,
  ftiRawSoPaginatedRows,
  ftiRawSoTotalPages,
  ftiRawSoVisiblePages,
  ftiRawSoShowingStart,
  ftiRawSoShowingEnd,
  dpmRawSoSelectedFilters,
  dpmRawSoCurrentPage,
  dpmRawSoRowsPerPage,
  dpmRawSoSortedRows,
  dpmRawSoPaginatedRows,
  dpmRawSoTotalPages,
  dpmRawSoVisiblePages,
  dpmRawSoShowingStart,
  dpmRawSoShowingEnd,
  dpmRawSoPreviewRows,
  dpmRawSoPreviewSummary,
  dpmRawSoPoValidation,
  dpmRawSoHasPoMismatch,
  dpmRawSoPoValidationMessage,
  dpmRawSoTotalPoEligible,
  dpmRawSoContractValidation,
  showDpmRawSoPreview,
  dpmRawSoDuplicateValidation,
  dpmRawSoDuplicateRows,
  dpmRawSoDuplicateExistingFiles,
  dpmRawSoEligibleRows,
  dpmRawSoUploadDuplicateRows,
  dpmRawSoTotalEligible,
  dpmRawSoCanUploadFromSelectedFile,
  dpmRawSoDuplicatePreviewMode,
  dpmRawSoDuplicatePreviewRows,
  showDpmRawSoDuplicatePreview,
  dpmRawSoDetectedPeriodLabel,
  tmminRawSoVisibleColumns,
  tmminRawSoPreviewVisibleColumns,
  tmminRawSoSelectedFilters,
  tmminRawSoCurrentPage,
  tmminRawSoRowsPerPage,
  tmminRawSoTableWidth,
  tmminRawSoPreviewTableWidth,
  tmminRawSoFilteredRows,
  tmminRawSoSortedRows,
  tmminRawSoPaginatedRows,
  tmminRawSoTotalPages,
  tmminRawSoVisiblePages,
  tmminRawSoShowingStart,
  tmminRawSoShowingEnd,
  showTmminRawSoPreview,
  tmminRawSoPreviewRows,
  currentPage,
  tableWidth,
  paginatedData,
  totalPages,
  showingStart,
  showingEnd,
  trackingDisplayTotal,
  isLoadingTracking,
  trackingRowsPerPage,
  trackingVisiblePages,
  sortedData,
  selectedCustomers,
  draftSelectedCustomers,
  selectedCustomerLabel,
  openTrackingUploadUserId,
  trackingUploadUserPopupPosition,
  openTrackingStatusId,
  trackingStatusPopupPosition,
  openTrackingRemarksId,
  trackingRemarksPopupPosition,
  activeTrackingRemarksDraft,
  isAllHeaderCustomersSelected,
  dnPasteText,
  dnInOfficeDate,
  dnCrosscheckRows,
  dnCrosscheckDisplayRows,
  isCheckingDn,
  isLoadingDnSummary,
  isRegisteringDn,
  parsedDnNumbers,
  dnCrosscheckSelectedFilters,
  dnCrosscheckVisibleColumns,
  dnCrosscheckTotal,
  dnCrosscheckFound,
  dnCrosscheckNotFound,
  registerableDnRows,
  dnCrosscheckRegisterableCount,
  dnCrosscheckCurrentPage,
  dnCrosscheckRowsPerPage,
  dnCrosscheckPaginatedRows,
  dnCrosscheckTotalPages,
  dnCrosscheckVisiblePages,
  dnCrosscheckShowingStart,
  dnCrosscheckShowingEnd,
  isCheckAllDnMode,
  dnCrosscheckClose,
  dnCrosscheckOpen,
  dnRegisterDisabledMessage,
  isDeletingDnRegister,
  dnDeleteSelectedCount,
  deletableDnFilteredRows,
  deletableDnCurrentPageRows,
  isAllCurrentPageDnSelected,
  isExportingDnMonitoringExcel,
  isPrintingDnMonitoringReport,
  isDownloadingDnMonitoringImage,
  isDownloadingDnMonitoringPdf,
  dnMonitoringReportDnNumbers,
  dnMonitoringReportCount,
  showDnMonitoringReport,
  showDnMonitoringCompare,
  dnMonitoringReportData,
  hasDnMonitoringReportCache,
  isDnMonitoringReportStale,
  isLoadingDnMonitoringReport,
  isDeletingRawFiles,
  rawDeleteSelectedCount,
  isAllCurrentPageRawSelected,
  showDnMonitoringPeriodModal,
  dnMonitoringReportPeriod,
  dnMonitoringReportPeriodLabel,
  dnMonitoringReportDateBasis,
  dnMonitoringReportDateBasisLabel,
  rawFilteredDeleteCount,
  hasRawDeleteActiveFilter,
  selectedRawIds,
  isCancellingRawFiles,
  isRestoringRawFiles,
  showCancelRawModal,
  cancelRawMode,
  cancelReason,
  cancelActionBy,
  rawCancelSelectedCount,
  rawFilteredCancelCount,
  showCancelledDrawer,
  cancelledDrawerTab,
  isLoadingCancelledData,
  cancelledRawRows,
  cancelledDnRows,
  cancelHistoryRows,
  cancelledRawTotal,
  cancelledDnTotal,
  cancelHistoryTotal,
  cancelledRawPage,
  cancelHistoryPage,
  cancelledRowsPerPage,
  cancelHistoryRowsPerPage,
  cancelledRowsPerPageOptions,
  cancelledRawTotalPages,
  cancelHistoryTotalPages,
  cancelledDnLoaded,
  selectedCancelledRawIds,
  cancelledSelectedCount,
  restoreReason,
  uploadFileInput,
  trackingBulkMode,
  trackingBulkSelectedIds,
  trackingBulkDate,
  trackingBulkTime,
  trackingBulkUser,
  trackingBulkStatus,
  trackingBulkRemarks,
  trackingBulkUserDropdownOpen,
  trackingBulkStatusDropdownOpen,
  trackingBulkVisibleUserOptions,
  trackingBulkStatusMeta,
  trackingBulkIsApplying,
  trackingBulkProgressDone,
  trackingBulkProgressTotal,
  trackingBulkMessage,
  trackingBulkMessageType,
  trackingBulkSelectedRows,
  trackingBulkSelectedCount,
  trackingBulkHasChanges,
  isTrackingBulkCurrentPageSelected,
  uploadCustomerOptions,
  selectedUploadCustomerLabel,
  activeAdmCombinedPreviewCustomer,
  isAdmP1P4CombinedUpload,
  isAdmExcelUploadPreview,
  excelPreviewPlantCodeIndex,
  admP1ExcelPreviewRows,
  admP4ExcelPreviewRows,
  visibleExcelPreviewHeaders,
  visibleExcelPreviewRows,
  tmminRawSoPreviewCodeCounts,
  activeAdmPreviewPlantCode,
  activeAdmUploadPreviewSummary,
  tmminUploadPreviewSummarySafe,
  tmminRawSoPreviewFrozenColumnCount,
  admExcelPreviewFrozenColumnCount,
  admExcelPreviewColumnWidths,
  admExcelPreviewTableWidth,
  showCancelActionMenu,
  showDeleteActionMenu,
  cancelActionMenuRef,
  deleteActionMenuRef,
  cancelledCount,
  tmminRawLifecyclePreviewRows,
  selectedRawPreviewRows,
  cancelCandidateRows,
  cancelPreviewRows,
  cancelPreviewHiddenCount,
  cancelPreviewOrderNos,
  cancelTotalCount,
  showFinalCancelConfirm,
  showRestoreConfirmModal,
  restoreConfirmTitle,
  restoreConfirmMessage,
  restoreConfirmIds,
  dnReportZoom,
  dnCompareReportZoom,
  activeDnReportZoom,
  showDnRegisterTooltip,
  isPageTop,
  isFloatingActionOpen
} = storeToRefs(customerOrderStore);

const {
  customerOptions,
  isHeaderCustomerSelected,
  toggleHeaderCustomerSelection,
  toggleAllHeaderCustomerSelection,
  applyHeaderCustomerFilter,
  clearHeaderCustomerSelection,
  applyOrderDateFilter,
  clearOrderDateFilter,
  toggleDeliveryDateFilterPopup,
  applyDeliveryDateFilter,
  clearDeliveryDateFilter,
  toggleCreationDateFilterPopup,
  applyCreationDateFilter,
  clearCreationDateFilter,
  openUploadModal,
  closeUploadModal,
  selectCustomerUpload,
  selectUploadUser,
  selectPendingUploadPeriod,
  closeUploadDeliveryPeriodChoice,
  confirmUploadDeliveryPeriodChoice,
  handleSelectedUploadPeriodChange,
  validateCustomerBeforeChooseFile,
  onUploadFileChange,
  clearUploadFormData,
  removeAdmUploadFile,
  removeAsiAdmSoUploadFile,
  openMissingContractPartsModal,
  closeMissingContractPartsModal,
  copyMissingContractParts,
  removeGayaSoUploadFile,
  removeNtcSoUploadFile,
  removeDpmSoUploadFile,
  setDpmRawSoDuplicatePreviewMode,
  closeDpmRawSoDuplicatePreview,
  removeTmminDetectedTxtFile,
  openUploadPreview,
  closeUploadPreview,
  handleExcelSheetChange,
  submitUploadForm,
  selectContractMaterialChoice,
  isContractMaterialChoiceSelected,
  closeContractMaterialChoice,
  confirmContractMaterialChoiceAndContinue,
  dcwaRawSoColumns,
  asiAdmRawSoColumns,
  dcwaRawSoRowsPerPageOptions,
  removeDcwaSoUploadFile,
  closeDcwaRawSoPreview,
  getDcwaRawSoSelectedLabel,
  toggleDcwaRawSoDropdown,
  getDcwaRawSoColumnStyle,
  toggleDcwaRawSoSelection,
  toggleAllCurrentPageDcwaRawSo,
  isDcwaRawSoSelected,
  dcwaRawSoFirstPage,
  dcwaRawSoPrevPage,
  dcwaRawSoNextPage,
  dcwaRawSoLastPage,
  isDcwaRawSoNumericColumn,
  isDcwaRawSoValidationColumn,
  isDcwaRawSoValidationMissing,
  asiAdmRawSoRowsPerPageOptions,
  getAsiAdmRawSoSelectedLabel,
  toggleAsiAdmRawSoDropdown,
  getAsiAdmRawSoColumnStyle,
  closeAsiAdmRawSoPreview,
  asiAdmRawSoFirstPage,
  asiAdmRawSoPrevPage,
  asiAdmRawSoNextPage,
  asiAdmRawSoLastPage,
  gayaRawSoRowsPerPageOptions,
  getGayaRawSoSelectedLabel,
  toggleGayaRawSoDropdown,
  getGayaRawSoColumnStyle,
  closeGayaRawSoPreview,
  closeDcwaRawSoFilter,
  selectGayaRawSoPreviewFile,
  gayaRawSoFirstPage,
  gayaRawSoPrevPage,
  gayaRawSoNextPage,
  gayaRawSoLastPage,
  ntcRawSoRowsPerPageOptions,
  getNtcRawSoSelectedLabel,
  toggleNtcRawSoDropdown,
  getNtcRawSoColumnStyle,
  closeNtcRawSoPreview,
  ntcRawSoFirstPage,
  ntcRawSoPrevPage,
  ntcRawSoNextPage,
  ntcRawSoLastPage,
  mesRawSoColumns,
  mesRawSoRowsPerPageOptions,
  getMesRawSoSelectedLabel,
  toggleMesRawSoDropdown,
  getMesRawSoColumnStyle,
  mesRawSoFirstPage,
  mesRawSoPrevPage,
  mesRawSoNextPage,
  mesRawSoLastPage,
  setMesPartNameChoice,
  removeMesSoUploadFile,
  ftiRawSoColumns,
  ftiRawSoRowsPerPageOptions,
  toggleFtiAdditionalOrder,
  setFtiAdditionalOrderMode,
  setFtiAdditionalOrderFile,
  setFtiAdditionalManualPoNumber,
  setFtiAdditionalManualQty,
  refreshFtiAdditionalManualPreview,
  refreshFtiAdditionalOrderPreview,
  getFtiAdditionalOrderAllocationQty,
  getFtiAdditionalOrderAllocationTotal,
  updateFtiAdditionalOrderAllocation,
  resetFtiAdditionalOrderAllocationsToSystemPlan,
  confirmFtiAdditionalOrderSchedule,
  openFtiAdditionalOrderConfirmedSchedule,
  getFtiRawSoSelectedLabel,
  toggleFtiRawSoDropdown,
  getFtiRawSoColumnStyle,
  ftiRawSoFirstPage,
  ftiRawSoPrevPage,
  ftiRawSoNextPage,
  ftiRawSoLastPage,
  dpmRawSoRowsPerPageOptions,
  dpmRawSoColumns,
  getDpmRawSoColumnStyle,
  getDpmRawSoSelectedLabel,
  toggleDpmRawSoDropdown,
  tmminRawSoRowsPerPageOptions,
  getTmminRawSoSelectedLabel,
  toggleTmminRawSoDropdown,
  getTmminRawSoColumnStyle,
  getTmminRawSoCheckboxColumnStyle,
  closeTmminRawSoPreview,
  tmminRawSoFirstPage,
  tmminRawSoPrevPage,
  tmminRawSoNextPage,
  tmminRawSoLastPage,
  card2Columns,
  card2FrozenColumns,
  card2RowsPerPageOptions,
  downloadRawFilesExcel,
  downloadSelectedRawFilesExcel,
  getCard2ColumnStyle,
  toggleCard2Dropdown,
  getCard2SelectedLabel,
  isCard2ChipColumn,
  card2ChipClass,
  displayCard2Value,
  card2FirstPage,
  card2PrevPage,
  card2NextPage,
  card2LastPage,
  formatSOColumns,
  formatSOFrozenColumns,
  formatSORowsPerPageOptions,
  downloadFormatSOExcel,
  downloadSelectedFormatSOExcel,
  regenerateFormatSalesOrder,
  getFormatSOColumnStyle,
  getFormatSOCheckboxColumnStyle,
  isFormatSOSelected,
  toggleFormatSOSelection,
  toggleAllCurrentPageFormatSO,
  clearFormatSOSelection,
  toggleFormatSOFilter,
  getFormatSOSelectedLabel,
  formatSOFirstPage,
  formatSOPrevPage,
  formatSONextPage,
  formatSOLastPage,
  columns,
  frozenColumns,
  trackingRowsPerPageOptions,
  getColumnStyle,
  toggleDropdown,
  getSelectedLabel,
  trackingFirstPage,
  trackingLastPage,
  prevPage,
  nextPage,
  userColorClass,
  formatTrackingDate,
  isTrackingCellSaving,
  saveTrackingCell,
  saveTrackingFieldFromEvent,
  setTrackingTimeNow,
  getTrackingTimeDraft,
  updateTrackingTimeDraft,
  saveTrackingTimeDraft,
  toggleTrackingUploadUserDropdown,
  selectTrackingUploadUser,
  trackingStatusOptions,
  trackingStatusClass,
  trackingStatusLabel,
  toggleTrackingStatusDropdown,
  selectTrackingStatus,
  toggleTrackingRemarksPopup,
  cancelTrackingRemarks,
  saveTrackingRemarksPopup,
  toggleHeaderCustomerDropdown,
  toggleOrderDateFilterPopup,
  toggleUploadCustomerDropdown,
  toggleUploadUserDropdown,
  clearDnCrosscheck,
  formatDnCrosscheckDate,
  dnCrosscheckColumns,
  getDnCrosscheckCustomerBadgeClass,
  getDnCrosscheckCustomerCode,
  getDnCrosscheckCustomerCodeBadgeClass,
  registerDnInOffice,
  toggleDnCrosscheckFilter,
  getDnCrosscheckSelectedLabel,
  dnCrosscheckRowsPerPageOptions,
  dnCrosscheckFirstPage,
  dnCrosscheckPrevPage,
  dnCrosscheckNextPage,
  dnCrosscheckLastPage,
  toggleDnCheckAllMode,
  toggleDnCrosscheckQuickStatus,
  isDnCrosscheckQuickStatusActive,
  isDnDeletable,
  isDnSelectedForDelete,
  toggleDnDeleteSelection,
  toggleAllCurrentPageDnDelete,
  clearDnDeleteSelection,
  deleteSelectedDnRegisters,
  deleteFilteredDnRegisters,
  exportDnMonitoringExcel,
  downloadDnMonitoringImage,
  downloadDnMonitoringPdf,
  toggleDnMonitoringReport,
  toggleDnMonitoringCompare,
  refreshDnMonitoringReport,
  openDnMonitoringReportSettings,
  printDnMonitoringReport,
  isRawSelectedForDelete,
  toggleRawDeleteSelection,
  toggleAllCurrentPageRawDelete,
  clearRawDeleteSelection,
  deleteSelectedRawFiles,
  getCard2CheckboxColumnStyle,
  closeDnMonitoringPeriodModal,
  confirmDnMonitoringPeriodAndView,
  openCancelSelectedRawFiles,
  openCancelFilteredRawFiles,
  closeCancelRawModal,
  confirmCancelRawFiles,
  loadCancelledData,
  openCancelledDrawerPanel,
  closeCancelledDrawerPanel,
  setCancelledDrawerTab,
  setCancelledRawPage,
  setCancelHistoryPage,
  setCancelledRowsPerPage,
  setCancelHistoryRowsPerPage,
  isCancelledRawSelected,
  toggleCancelledRawSelection,
  toggleAllCancelledRawSelection,
  executeRestoreRawOrders,
  formatCancelLifecycleDate,
  deleteFilteredRawFiles,
  closeTrackingBulkValueDropdowns,
  toggleTrackingBulkUserValueDropdown,
  toggleTrackingBulkStatusValueDropdown,
  selectTrackingBulkUserValue,
  selectTrackingBulkStatusValue,
  getJakartaDateValue,
  getJakartaTimeValue,
  toggleTrackingBulkMode,
  isTrackingBulkRowSelected,
  toggleTrackingBulkRow,
  selectTrackingBulkCurrentPage,
  toggleTrackingBulkCurrentPageSelection,
  selectTrackingBulkFilteredRows,
  clearTrackingBulkSelection,
  setTrackingBulkToday,
  setTrackingBulkNow,
  applyTrackingBulkUpdate,
  getExcelPreviewPlantCode,
  selectAdmCombinedPreviewCustomer,
  formatUploadPreviewNumber,
  formatUploadPreviewDate,
  formatUploadPreviewDateRange,
  normalizeUploadPreviewHeader,
  isExcelPreviewCenteredColumn,
  isTmminPreviewCenteredColumn,
  getTmminRawSoPreviewColumnWidth,
  getTmminRawSoPreviewFrozenLeft,
  getTmminRawSoPreviewCellStyle,
  admExcelPreviewColumnMinWidth,
  estimateAdmExcelPreviewTextWidth,
  getAdmExcelPreviewColumnWidth,
  getAdmExcelPreviewFrozenLeft,
  getAdmExcelPreviewCellStyle,
  getExcelPreviewDisplayHeader,
  toggleCancelActionMenu,
  toggleDeleteActionMenu,
  openUploadModalWithClose,
  openCancelSelectedFromMenu,
  openCancelFilteredFromMenu,
  openCancelledFromMenu,
  openDeleteSelectedFromMenu,
  openDeleteFilteredFromMenu,
  handleOutsideActionMenu,
  openFinalCancelConfirm,
  closeFinalCancelConfirm,
  executeFinalCancel,
  closeRestoreConfirmModal,
  openRestoreSelectedConfirm,
  openRestoreDnConfirm,
  confirmRestoreFromModal,
  DN_REPORT_ZOOM_MIN,
  DN_REPORT_ZOOM_MAX,
  DN_REPORT_ZOOM_STEP,
  setDnReportZoom,
  zoomInDnReport,
  zoomOutDnReport,
  resetDnReportZoom,
  showRegisterTooltip,
  hideRegisterTooltip,
  ACTION_BAR_SCROLL_THRESHOLD,
  handlePageScroll,
  toggleFloatingAction,
  openUploadFilePicker,
  scrollToPageBottom,
  formatDnCount,
  hasDnActivity,
  getDnMonitoringGap,
  getDnMonitoringAchievement,
  getDnMonitoringAchievementClass
} = customerOrderStore;

// ============================================================
// DN MONITORING - LAZY OPEN GAP DETAIL
// ============================================================
// Detail tidak ditambahkan ke payload preview report. Data baru diminta saat
// popup dibuka pada scope tanggal/customer yang dipilih, lalu pagination,
// sorting, dan filter berjalan lokal tanpa request database berulang. Pada mode
// Paste, source kecil yang sudah ada di browser digunakan kembali.

type DnGapDetailScope = 'day' | 'section' | 'grand';
type DnGapDetailFilterKey = 'dnNumber' | 'customer' | 'quantity' | 'orderDate' | 'deliveryDate';
type DnGapDetailSortDirection = 'none' | 'asc' | 'desc';
type DnGapDetailPageSize = 10 | 20 | 50 | 100 | 'all';

type DnGapDetailContext = {
  scope: DnGapDetailScope;
  customer: string;
  customerLabel: string;
  reportDate: string;
  reportDateLabel: string;
  gap: number;
};

type DnGapDetailRow = {
  dnNumber: string;
  customer: string;
  quantity: number;
  orderDate: string;
  deliveryDate: string;
};

const dnGapDetailFilterColumns: Array<{ key: DnGapDetailFilterKey; label: string }> = [
  { key: 'customer', label: 'Customer' },
  { key: 'dnNumber', label: 'No. DN' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'orderDate', label: 'Order Date' },
  { key: 'deliveryDate', label: 'Delivery Date' }
];

const createDnGapDetailFilterRecord = <T,>(factory: () => T): Record<DnGapDetailFilterKey, T> => ({
  dnNumber: factory(),
  customer: factory(),
  quantity: factory(),
  orderDate: factory(),
  deliveryDate: factory()
});

const showDnGapDetailModal = ref(false);
const isLoadingDnGapDetail = ref(false);
const dnGapDetailError = ref('');
const isDownloadingDnGapExcel = ref(false);
const dnGapDetailDownloadError = ref('');

// Paste mode tetap menggunakan row lokal yang memang sudah tersedia.
// Check All menyimpan HANYA page aktif dari server. Seluruh dataset hanya
// diambil bertahap jika user secara eksplisit memilih Show All.
const dnGapDetailAllRows = ref<DnGapDetailRow[]>([]);
const dnGapDetailServerRows = ref<DnGapDetailRow[]>([]);
const dnGapDetailServerTotal = ref(0);
const dnGapDetailServerSourceTotal = ref(0);
const dnGapDetailServerTotalPages = ref(1);

const dnGapDetailPage = ref(1);
const dnGapDetailPageSize = ref<DnGapDetailPageSize>(10);
const dnGapDetailPageSizeOptions: DnGapDetailPageSize[] = [10, 20, 50, 100, 'all'];
const dnGapDetailSortKey = ref<DnGapDetailFilterKey | null>(null);
const dnGapDetailSortDirection = ref<DnGapDetailSortDirection>('none');
const dnGapDetailContext = ref<DnGapDetailContext | null>(null);
const dnGapDetailActiveTriggerId = ref('');
const dnGapDetailSourceLoaded = ref(false);
const dnGapDetailSelectedFilters = ref<Record<DnGapDetailFilterKey, string[]>>(
  createDnGapDetailFilterRecord(() => [])
);
const dnGapDetailSearchFilters = ref<Record<DnGapDetailFilterKey, string>>(
  createDnGapDetailFilterRecord(() => '')
);
const dnGapDetailRemoteFilterOptions = ref<Record<DnGapDetailFilterKey, string[]>>(
  createDnGapDetailFilterRecord(() => [])
);
const dnGapDetailOpenFilterKey = ref<DnGapDetailFilterKey | null>(null);
const dnGapDetailModalElement = ref<HTMLElement | null>(null);
const dnGapDetailFilterPopupPosition = ref({ top: 0, left: 0, maxHeight: 420 });
const isLoadingDnGapDetailFilterOptions = ref(false);
let dnGapDetailAbortController: AbortController | null = null;
let dnGapDetailRequestSerial = 0;
let dnGapDetailFilterSearchTimer: number | null = null;
let dnGapDetailFilterSearchAbortController: AbortController | null = null;
let dnGapDetailFilterSearchSerial = 0;

const isDnGapDetailServerPaged = computed(() =>
  Boolean(isCheckAllDnMode.value && dnGapDetailContext.value)
);

// Petunjuk remote search hanya diperlukan bila scope mempunyai data di luar
// row yang saat ini sudah tersedia di popup. Untuk GAP kecil (mis. 1-4 DN),
// sembunyikan helper ini agar opsi filter mendapat ruang utama dan langsung
// terlihat tanpa perlu scroll.
const shouldShowDnGapDetailRemoteSearchHint = computed(() =>
  isDnGapDetailServerPaged.value &&
  Math.max(dnGapDetailServerTotal.value, dnGapDetailServerSourceTotal.value) >
    dnGapDetailServerRows.value.length
);

const normalizeDnGapCustomer = (value: unknown): string => {
  const customer = String(value ?? '').trim().toUpperCase();

  if (customer === 'GAYA MOTOR' || customer === 'GAYA MTR') {
    return 'GAYA MTR';
  }

  if (customer.startsWith('TMMIN')) {
    return 'TMMIN';
  }

  return customer;
};

const getDnGapCustomerLabel = (row: any): string => {
  const customer = normalizeDnGapCustomer(row?.customer);
  const customerCode = String(row?.customer_code ?? '').trim().toUpperCase();

  if (customer === 'TMMIN' && ['T034', 'TMAJ'].includes(customerCode)) {
    return `TMMIN ${customerCode}`;
  }

  return customer === 'GAYA MTR' ? 'GAYA MOTOR' : (customer || '-');
};

const getDnMonitoringRowIsoDate = (row: { no?: number | string }): string => {
  const period = String(dnMonitoringReportPeriod.value ?? '').trim();
  const day = Number(row?.no ?? 0);

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || day < 1 || day > 31) {
    return '';
  }

  return `${period}-${String(day).padStart(2, '0')}`;
};

const getDnGapPeriodRange = (): { start: string; end: string } => {
  const period = String(dnMonitoringReportPeriod.value ?? '').trim();
  const match = period.match(/^(\d{4})-(0[1-9]|1[0-2])$/);

  if (!match) {
    return { start: '', end: '' };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    start: `${period}-01`,
    end: `${period}-${String(lastDay).padStart(2, '0')}`
  };
};

const getDnGapReportCustomers = (customer = ''): string[] => {
  const singleCustomer = normalizeDnGapCustomer(customer);

  if (singleCustomer) {
    return [singleCustomer];
  }

  // Pertahankan source DN Monitoring existing. FTI, ASI ADM, DPM dan DCWA
  // tidak ditambahkan melalui popup GAP ini.
  const allowed = new Set([
    'ADM P1',
    'ADM P4',
    'ADM P5',
    'GAYA MTR',
    'TMMIN',
    'NTC'
  ]);

  const selected = selectedCustomers.value
    .map(normalizeDnGapCustomer)
    .filter((value) => allowed.has(value));

  return selected.length > 0
    ? Array.from(new Set(selected))
    : Array.from(allowed);
};

const mapDnGapDetailRow = (row: any): DnGapDetailRow => {
  const numericQuantity = Number(row?.quantity ?? 0);

  return {
    dnNumber: String(row?.order_no ?? row?.dn_number ?? '').trim().toUpperCase(),
    customer: getDnGapCustomerLabel(row),
    quantity: Number.isFinite(numericQuantity) ? numericQuantity : 0,
    orderDate: String(row?.order_date ?? '').trim(),
    deliveryDate: String(row?.delivery_date ?? '').trim()
  };
};

const formatDnGapQuantity = (value: unknown): string => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '0';

  return numeric.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
};

const getDnGapDetailFilterValue = (
  row: DnGapDetailRow,
  key: DnGapDetailFilterKey
): string => String(row[key] ?? '').trim();

const getDnGapDetailColumnLabel = (key: DnGapDetailFilterKey): string =>
  dnGapDetailFilterColumns.find((column) => column.key === key)?.label ?? key;

const dnGapDetailBackendColumnMap: Record<DnGapDetailFilterKey, 'order_no' | 'customer' | 'quantity' | 'order_date' | 'delivery_date'> = {
  dnNumber: 'order_no',
  customer: 'customer',
  quantity: 'quantity',
  orderDate: 'order_date',
  deliveryDate: 'delivery_date'
};

const normalizeDnGapBackendFilterValue = (
  key: DnGapDetailFilterKey,
  value: string
): string => {
  const normalized = String(value ?? '').trim();
  if (key !== 'customer') return normalized;

  const upper = normalized.toUpperCase();
  if (upper === 'GAYA MOTOR') return 'GAYA MTR';
  return upper;
};

const mapDnGapFilterOptionFromBackend = (
  key: DnGapDetailFilterKey,
  value: string
): string => {
  const normalized = String(value ?? '').trim();
  if (key === 'customer' && normalized.toUpperCase() === 'GAYA MTR') {
    return 'GAYA MOTOR';
  }
  return normalized;
};

const buildDnGapBackendFilters = (): Record<string, string[]> => {
  const filters: Record<string, string[]> = {
    status: ['OPEN']
  };

  dnGapDetailFilterColumns.forEach(({ key }) => {
    const values = dnGapDetailSelectedFilters.value[key]
      .map((value) => normalizeDnGapBackendFilterValue(key, value))
      .filter(Boolean);

    if (values.length > 0) {
      filters[dnGapDetailBackendColumnMap[key]] = Array.from(new Set(values));
    }
  });

  return filters;
};

const getDnGapServerScope = () => {
  const context = dnGapDetailContext.value;
  if (!context) {
    throw new Error('Scope detail DN Open tidak tersedia.');
  }

  const range = getDnGapPeriodRange();
  if (!range.start || !range.end) {
    throw new Error('Periode DN Monitoring tidak valid.');
  }

  const fromDate = context.reportDate || range.start;
  const toDate = context.reportDate || range.end;
  const params = dnMonitoringReportDateBasis.value === 'delivery_date'
    ? { delivery_from_date: fromDate, delivery_to_date: toDate }
    : { from_date: fromDate, to_date: toDate };

  return {
    params,
    customers: getDnGapReportCustomers(context.customer)
  };
};

const dnGapDetailFilterOptionRows = computed<DnGapDetailRow[]>(() =>
  isDnGapDetailServerPaged.value
    ? dnGapDetailServerRows.value
    : dnGapDetailAllRows.value
);

const dnGapDetailFilterOptions = computed<Record<DnGapDetailFilterKey, string[]>>(() => {
  const values = createDnGapDetailFilterRecord(() => new Set<string>());

  dnGapDetailFilterOptionRows.value.forEach((row) => {
    dnGapDetailFilterColumns.forEach(({ key }) => {
      values[key].add(getDnGapDetailFilterValue(row, key));
    });
  });

  dnGapDetailFilterColumns.forEach(({ key }) => {
    dnGapDetailSelectedFilters.value[key].forEach((value) => values[key].add(value));
    dnGapDetailRemoteFilterOptions.value[key].forEach((value) => values[key].add(value));
  });

  return {
    dnNumber: Array.from(values.dnNumber).sort((a, b) => a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' })),
    customer: Array.from(values.customer).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' })),
    quantity: Array.from(values.quantity).sort((a, b) => Number(a) - Number(b)),
    orderDate: Array.from(values.orderDate).sort((a, b) => a.localeCompare(b)),
    deliveryDate: Array.from(values.deliveryDate).sort((a, b) => a.localeCompare(b))
  };
});

const getDnGapDetailFilterOptions = (key: DnGapDetailFilterKey): string[] =>
  dnGapDetailFilterOptions.value[key];

const getDnGapDetailVisibleFilterOptions = (key: DnGapDetailFilterKey): string[] => {
  const search = String(dnGapDetailSearchFilters.value[key] ?? '')
    .trim()
    .toLowerCase();

  const options = getDnGapDetailFilterOptions(key);
  if (!search) return options;

  return options.filter((option) => {
    const raw = String(option).toLowerCase();
    const formatted = String(formatDnGapDetailFilterOption(key, option)).toLowerCase();
    return raw.includes(search) || formatted.includes(search);
  });
};

const isDnGapDetailFilterSelected = (
  key: DnGapDetailFilterKey,
  value: string
): boolean => dnGapDetailSelectedFilters.value[key].includes(value);

const getDnGapDetailSelectedFilterCount = (key: DnGapDetailFilterKey): number =>
  dnGapDetailSelectedFilters.value[key].length;

const areAllVisibleDnGapDetailFilterOptionsSelected = (key: DnGapDetailFilterKey): boolean => {
  const visible = getDnGapDetailVisibleFilterOptions(key);
  const selected = new Set(dnGapDetailSelectedFilters.value[key]);
  return visible.length > 0 && visible.every((value) => selected.has(value));
};

const formatDnGapDetailFilterOption = (key: DnGapDetailFilterKey, value: string): string => {
  if (value === '') return '(Kosong)';
  if (key === 'quantity') return formatDnGapQuantity(value);
  return (key === 'orderDate' || key === 'deliveryDate')
    ? formatDnCrosscheckDate(value)
    : value;
};

const resetDnGapDetailPage = (): void => {
  dnGapDetailPage.value = 1;
};

const clearDnGapDetailFilterSearchRequest = (): void => {
  if (dnGapDetailFilterSearchTimer !== null) {
    window.clearTimeout(dnGapDetailFilterSearchTimer);
    dnGapDetailFilterSearchTimer = null;
  }

  dnGapDetailFilterSearchSerial++;
  dnGapDetailFilterSearchAbortController?.abort();
  dnGapDetailFilterSearchAbortController = null;
  isLoadingDnGapDetailFilterOptions.value = false;
};

const loadDnGapDetailFilterOptions = async (key: DnGapDetailFilterKey): Promise<void> => {
  if (!isDnGapDetailServerPaged.value) return;

  const rawSearch = String(dnGapDetailSearchFilters.value[key] ?? '').trim();
  if (rawSearch.length < 3) {
    dnGapDetailRemoteFilterOptions.value[key] = [];
    return;
  }

  const search = key === 'customer' && rawSearch.toUpperCase().startsWith('GAYA')
    ? 'GAYA'
    : rawSearch;

  const serial = ++dnGapDetailFilterSearchSerial;
  dnGapDetailFilterSearchAbortController?.abort();
  const controller = new AbortController();
  dnGapDetailFilterSearchAbortController = controller;
  isLoadingDnGapDetailFilterOptions.value = true;

  try {
    const scope = getDnGapServerScope();
    const values = await customerOrderService.searchDnFilterOptions(
      scope.params,
      scope.customers,
      dnGapDetailBackendColumnMap[key],
      search,
      buildDnGapBackendFilters(),
      controller.signal
    );

    if (serial !== dnGapDetailFilterSearchSerial || controller.signal.aborted) return;

    dnGapDetailRemoteFilterOptions.value[key] = Array.from(
      new Set(
        values
          .map((value) => mapDnGapFilterOptionFromBackend(key, value))
          .filter(Boolean)
      )
    );
  } catch (error: any) {
    const cancelled =
      controller.signal.aborted ||
      error?.code === 'ERR_CANCELED' ||
      error?.name === 'CanceledError' ||
      error?.name === 'AbortError';

    if (!cancelled && serial === dnGapDetailFilterSearchSerial) {
      dnGapDetailRemoteFilterOptions.value[key] = [];
    }
  } finally {
    if (serial === dnGapDetailFilterSearchSerial) {
      isLoadingDnGapDetailFilterOptions.value = false;
    }
  }
};

const setDnGapDetailSearchValue = (key: DnGapDetailFilterKey, value: string): void => {
  dnGapDetailSearchFilters.value[key] = value;

  if (!isDnGapDetailServerPaged.value) return;

  if (dnGapDetailFilterSearchTimer !== null) {
    window.clearTimeout(dnGapDetailFilterSearchTimer);
    dnGapDetailFilterSearchTimer = null;
  }

  dnGapDetailFilterSearchAbortController?.abort();
  dnGapDetailFilterSearchAbortController = null;

  if (String(value ?? '').trim().length < 3) {
    dnGapDetailRemoteFilterOptions.value[key] = [];
    isLoadingDnGapDetailFilterOptions.value = false;
    return;
  }

  dnGapDetailFilterSearchTimer = window.setTimeout(() => {
    dnGapDetailFilterSearchTimer = null;
    void loadDnGapDetailFilterOptions(key);
  }, 260);
};

const onDnGapDetailSearchInput = (key: DnGapDetailFilterKey, event: Event): void => {
  const input = event.target as HTMLInputElement | null;
  setDnGapDetailSearchValue(key, input?.value ?? '');
};

const dnGapDetailFilteredRows = computed<DnGapDetailRow[]>(() => {
  const rows = dnGapDetailAllRows.value.filter((row) =>
    dnGapDetailFilterColumns.every(({ key }) => {
      const selected = dnGapDetailSelectedFilters.value[key];
      return selected.length === 0 || selected.includes(getDnGapDetailFilterValue(row, key));
    })
  );

  const sortKey = dnGapDetailSortKey.value;
  const sortDirection = dnGapDetailSortDirection.value;
  if (!sortKey || sortDirection === 'none') return rows;

  return [...rows].sort((first, second) => {
    const left = getDnGapDetailFilterValue(first, sortKey);
    const right = getDnGapDetailFilterValue(second, sortKey);
    const result = left.localeCompare(right, 'id', {
      numeric: true,
      sensitivity: 'base'
    });
    return sortDirection === 'desc' ? -result : result;
  });
});

const hasDnGapDetailActiveFilters = computed(() =>
  dnGapDetailFilterColumns.some(
    ({ key }) => dnGapDetailSelectedFilters.value[key].length > 0
  )
);

const dnGapDetailTotal = computed(() =>
  isDnGapDetailServerPaged.value
    ? dnGapDetailServerTotal.value
    : dnGapDetailFilteredRows.value.length
);

const dnGapDetailSourceTotal = computed(() =>
  isDnGapDetailServerPaged.value
    ? dnGapDetailServerSourceTotal.value
    : dnGapDetailAllRows.value.length
);

const dnGapDetailExpectedTotal = computed(() =>
  Math.abs(Number(dnGapDetailContext.value?.gap ?? 0))
);

const hasDnGapDetailSnapshotDifference = computed(() =>
  dnGapDetailSourceLoaded.value &&
  dnGapDetailSourceTotal.value !== dnGapDetailExpectedTotal.value
);

const dnGapDetailEffectivePageSize = computed(() =>
  dnGapDetailPageSize.value === 'all'
    ? Math.max(1, dnGapDetailTotal.value)
    : dnGapDetailPageSize.value
);

const dnGapDetailTotalPages = computed(() => {
  if (isDnGapDetailServerPaged.value) {
    return dnGapDetailPageSize.value === 'all'
      ? 1
      : Math.max(1, dnGapDetailServerTotalPages.value);
  }

  return Math.max(1, Math.ceil(dnGapDetailTotal.value / dnGapDetailEffectivePageSize.value));
});

const dnGapDetailShowingStart = computed(() =>
  dnGapDetailTotal.value === 0
    ? 0
    : ((dnGapDetailPage.value - 1) * dnGapDetailEffectivePageSize.value) + 1
);

const dnGapDetailShowingEnd = computed(() =>
  Math.min(
    dnGapDetailPage.value * dnGapDetailEffectivePageSize.value,
    dnGapDetailTotal.value
  )
);

const dnGapDetailRows = computed(() => {
  if (isDnGapDetailServerPaged.value) {
    return dnGapDetailServerRows.value;
  }

  const safePage = Math.min(dnGapDetailPage.value, dnGapDetailTotalPages.value);
  const offset = (safePage - 1) * dnGapDetailEffectivePageSize.value;
  return dnGapDetailFilteredRows.value.slice(
    offset,
    offset + dnGapDetailEffectivePageSize.value
  );
});

const dnGapDetailVisiblePages = computed(() => {
  const total = dnGapDetailTotalPages.value;
  if (total <= 3) return Array.from({ length: total }, (_, index) => index + 1);

  const start = Math.min(Math.max(dnGapDetailPage.value - 1, 1), total - 2);
  return [start, start + 1, start + 2];
});

const shouldScrollDnGapDetailTable = computed(() =>
  dnGapDetailEffectivePageSize.value > 10 && dnGapDetailRows.value.length > 10
);

const getDnGapDetailSortDirection = (key: DnGapDetailFilterKey): DnGapDetailSortDirection =>
  dnGapDetailSortKey.value === key ? dnGapDetailSortDirection.value : 'none';

const closeDnGapDetailFilter = (): void => {
  dnGapDetailOpenFilterKey.value = null;
  clearDnGapDetailFilterSearchRequest();
};

const loadDnGapDetailPage = async (requestedPage = 1): Promise<void> => {
  const context = dnGapDetailContext.value;
  if (!context) return;

  const page = Math.max(1, Number(requestedPage) || 1);
  const requestSerial = ++dnGapDetailRequestSerial;
  dnGapDetailAbortController?.abort();
  const controller = new AbortController();
  dnGapDetailAbortController = controller;
  isLoadingDnGapDetail.value = true;
  dnGapDetailError.value = '';

  try {
    if (isDnGapDetailServerPaged.value) {
      const scope = getDnGapServerScope();
      const filters = buildDnGapBackendFilters();
      const sortKey = dnGapDetailSortKey.value
        ? dnGapDetailBackendColumnMap[dnGapDetailSortKey.value]
        : '';
      const sortDirection = dnGapDetailSortDirection.value;
      const isUnfilteredSnapshot = !hasDnGapDetailActiveFilters.value;

      if (dnGapDetailPageSize.value === 'all') {
        // "All" hanya mengambil seluruh row saat user memilihnya. Data dibaca
        // per 100 row agar setiap request PHP tetap kecil pada memory_limit 128M.
        const chunkSize = 100;
        const firstResponse = await customerOrderService.getAllDnStatusPage(
          scope.params,
          scope.customers,
          1,
          chunkSize,
          filters,
          sortKey,
          sortDirection,
          controller.signal
        );

        if (requestSerial !== dnGapDetailRequestSerial || controller.signal.aborted) return;
        if (firstResponse?.status !== 'success') {
          throw new Error(firstResponse?.message || 'Gagal memuat detail DN Open.');
        }

        const allRows: DnGapDetailRow[] = (firstResponse.data ?? [])
          .map(mapDnGapDetailRow)
          .filter((row) => row.dnNumber !== '');

        const totalPages = Math.max(1, Number(firstResponse.total_pages ?? 1));
        for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
          const response = await customerOrderService.getAllDnStatusPage(
            scope.params,
            scope.customers,
            currentPage,
            chunkSize,
            filters,
            sortKey,
            sortDirection,
            controller.signal
          );

          if (requestSerial !== dnGapDetailRequestSerial || controller.signal.aborted) return;
          if (response?.status !== 'success') {
            throw new Error(response?.message || 'Gagal memuat seluruh detail DN Open.');
          }

          allRows.push(
            ...(response.data ?? [])
              .map(mapDnGapDetailRow)
              .filter((row) => row.dnNumber !== '')
          );
        }

        dnGapDetailServerRows.value = allRows;
        dnGapDetailServerTotal.value = Number(firstResponse.total ?? allRows.length);
        dnGapDetailServerTotalPages.value = 1;
        dnGapDetailPage.value = 1;

        if (isUnfilteredSnapshot) {
          dnGapDetailServerSourceTotal.value = Number(firstResponse.total ?? allRows.length);
        }
      } else {
        const perPage = dnGapDetailPageSize.value;
        const response = await customerOrderService.getAllDnStatusPage(
          scope.params,
          scope.customers,
          page,
          perPage,
          filters,
          sortKey,
          sortDirection,
          controller.signal
        );

        if (requestSerial !== dnGapDetailRequestSerial || controller.signal.aborted) return;
        if (response?.status !== 'success') {
          throw new Error(response?.message || 'Gagal memuat detail DN Open.');
        }

        dnGapDetailServerRows.value = (response.data ?? [])
          .map(mapDnGapDetailRow)
          .filter((row) => row.dnNumber !== '');
        dnGapDetailServerTotal.value = Math.max(0, Number(response.total ?? 0));
        dnGapDetailServerTotalPages.value = Math.max(1, Number(response.total_pages ?? 1));
        dnGapDetailPage.value = Math.min(
          Math.max(1, Number(response.page ?? page)),
          dnGapDetailServerTotalPages.value
        );

        if (isUnfilteredSnapshot) {
          dnGapDetailServerSourceTotal.value = dnGapDetailServerTotal.value;
        }
      }

      dnGapDetailSourceLoaded.value = true;
      return;
    }

    // Paste mode: source kecil sudah tersedia di browser sehingga tidak ada
    // request backend tambahan sama sekali.
    const reportNumbers = new Set(
      dnMonitoringReportDnNumbers.value
        .map((value) => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
    );
    const resultMap = new Map<string, DnGapDetailRow>();

    dnCrosscheckDisplayRows.value.forEach((row: any) => {
      const dnNumber = String(row?.order_no ?? row?.dn_number ?? '')
        .trim()
        .toUpperCase();

      if (!dnNumber || !reportNumbers.has(dnNumber) || row?.found !== true || row?.registered === true) {
        return;
      }

      if (
        context.customer &&
        normalizeDnGapCustomer(row?.customer) !== normalizeDnGapCustomer(context.customer)
      ) {
        return;
      }

      const rowReportDate = String(
        dnMonitoringReportDateBasis.value === 'delivery_date'
          ? row?.delivery_date
          : row?.order_date
      ).slice(0, 10);

      if (context.reportDate && rowReportDate !== context.reportDate) return;

      const mapped = mapDnGapDetailRow(row);
      resultMap.set(`${mapped.customer}|${mapped.dnNumber}`, mapped);
    });

    dnGapDetailAllRows.value = Array.from(resultMap.values()).sort((first, second) => {
      const customerCompare = first.customer.localeCompare(second.customer, 'id', { sensitivity: 'base' });
      if (customerCompare !== 0) return customerCompare;
      return first.dnNumber.localeCompare(second.dnNumber, 'id', { numeric: true, sensitivity: 'base' });
    });
    dnGapDetailSourceLoaded.value = true;
    dnGapDetailPage.value = Math.min(page, dnGapDetailTotalPages.value);
  } catch (error: any) {
    const cancelled =
      controller.signal.aborted ||
      error?.code === 'ERR_CANCELED' ||
      error?.name === 'CanceledError' ||
      error?.name === 'AbortError';

    if (!cancelled && requestSerial === dnGapDetailRequestSerial) {
      dnGapDetailServerRows.value = [];
      if (!isDnGapDetailServerPaged.value) {
        dnGapDetailAllRows.value = [];
      }
      dnGapDetailSourceLoaded.value = false;
      dnGapDetailError.value =
        error?.response?.data?.message ||
        error?.message ||
        'Gagal memuat detail DN Open.';
    }
  } finally {
    if (requestSerial === dnGapDetailRequestSerial) {
      isLoadingDnGapDetail.value = false;
    }
  }
};

const setDnGapDetailSort = (
  key: DnGapDetailFilterKey,
  direction: DnGapDetailSortDirection
): void => {
  dnGapDetailSortKey.value = direction === 'none' ? null : key;
  dnGapDetailSortDirection.value = direction;
  resetDnGapDetailPage();

  if (isDnGapDetailServerPaged.value) {
    void loadDnGapDetailPage(1);
  }
};

const toggleDnGapDetailFilterValue = (
  key: DnGapDetailFilterKey,
  value: string
): void => {
  const current = dnGapDetailSelectedFilters.value[key];
  dnGapDetailSelectedFilters.value[key] = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
  resetDnGapDetailPage();

  if (isDnGapDetailServerPaged.value) {
    void loadDnGapDetailPage(1);
  }
};

const toggleAllDnGapDetailFilterOptions = (key: DnGapDetailFilterKey): void => {
  const visible = getDnGapDetailVisibleFilterOptions(key);
  const current = new Set(dnGapDetailSelectedFilters.value[key]);
  const allSelected = visible.length > 0 && visible.every((value) => current.has(value));

  visible.forEach((value) => {
    if (allSelected) current.delete(value);
    else current.add(value);
  });

  dnGapDetailSelectedFilters.value[key] = Array.from(current);
  resetDnGapDetailPage();

  if (isDnGapDetailServerPaged.value) {
    void loadDnGapDetailPage(1);
  }
};

const clearDnGapDetailColumnFilter = (key: DnGapDetailFilterKey): void => {
  clearDnGapDetailFilterSearchRequest();
  dnGapDetailSelectedFilters.value[key] = [];
  dnGapDetailSearchFilters.value[key] = '';
  dnGapDetailRemoteFilterOptions.value[key] = [];
  resetDnGapDetailPage();

  if (isDnGapDetailServerPaged.value) {
    void loadDnGapDetailPage(1);
  }
};

const resetDnGapDetailFilters = (reloadServer = true): void => {
  dnGapDetailSelectedFilters.value = createDnGapDetailFilterRecord(() => []);
  dnGapDetailSearchFilters.value = createDnGapDetailFilterRecord(() => '');
  dnGapDetailRemoteFilterOptions.value = createDnGapDetailFilterRecord(() => []);
  dnGapDetailSortKey.value = null;
  dnGapDetailSortDirection.value = 'none';
  dnGapDetailOpenFilterKey.value = null;
  clearDnGapDetailFilterSearchRequest();
  resetDnGapDetailPage();

  if (reloadServer && showDnGapDetailModal.value && isDnGapDetailServerPaged.value) {
    void loadDnGapDetailPage(1);
  }
};

const changeDnGapDetailPageSize = (event: Event): void => {
  const value = String((event.target as HTMLSelectElement | null)?.value ?? '10');
  const numericValue = Number(value);
  dnGapDetailPageSize.value = value === 'all'
    ? 'all'
    : ([10, 20, 50, 100].includes(numericValue)
        ? numericValue as Exclude<DnGapDetailPageSize, 'all'>
        : 10);
  dnGapDetailPage.value = 1;
  closeDnGapDetailFilter();

  if (isDnGapDetailServerPaged.value) {
    void loadDnGapDetailPage(1);
  }
};

const goToDnGapDetailPage = (page: number): void => {
  const nextPage = Math.min(
    Math.max(1, Number(page) || 1),
    dnGapDetailTotalPages.value
  );
  closeDnGapDetailFilter();

  if (isDnGapDetailServerPaged.value) {
    void loadDnGapDetailPage(nextPage);
    return;
  }

  dnGapDetailPage.value = nextPage;
};

const toggleDnGapDetailFilter = (
  key: DnGapDetailFilterKey,
  event: MouseEvent
): void => {
  if (dnGapDetailOpenFilterKey.value === key) {
    closeDnGapDetailFilter();
    return;
  }

  clearDnGapDetailFilterSearchRequest();
  const trigger = event.currentTarget as HTMLElement | null;
  if (!trigger) return;

  const rect = trigger.getBoundingClientRect();
  const modalRect = dnGapDetailModalElement.value?.getBoundingClientRect();
  const width = 270;
  const desiredHeight = 440;
  const gap = 6;
  const padding = 10;
  const topBound = Math.max(
    padding,
    Number(modalRect?.top ?? 0) + padding
  );
  const bottomBound = Math.min(
    window.innerHeight - padding,
    Number(modalRect?.bottom ?? window.innerHeight) - padding
  );
  const modalAvailableHeight = Math.max(220, bottomBound - topBound);

  // Filter GAP ditampilkan sebagai floating panel di dalam batas modal, bukan
  // dipaksa hanya memakai ruang tepat di bawah/atas tombol. Pada popup GAP
  // dengan sedikit row, ruang di bawah header sangat pendek dan sebelumnya
  // membuat daftar opsi menyusut sampai hampir tidak terlihat.
  const maxHeight = Math.max(
    220,
    Math.min(desiredHeight, modalAvailableHeight)
  );
  const leftBound = Math.max(padding, Number(modalRect?.left ?? padding) + padding);
  const rightBound = Math.min(
    window.innerWidth - padding,
    Number(modalRect?.right ?? window.innerWidth - padding) - padding
  );
  const maxLeft = Math.max(leftBound, rightBound - width);
  const left = Math.min(Math.max(rect.left, leftBound), maxLeft);

  // Prioritaskan buka di bawah tombol jika seluruh panel muat. Jika tidak,
  // clamp posisinya ke dalam modal. Dengan begitu opsi filter tetap mendapat
  // ruang yang cukup walaupun tabel hanya memiliki 1-4 baris.
  const preferredTop = rect.bottom + gap;
  const preferredAboveTop = rect.top - gap - maxHeight;
  const top = preferredTop + maxHeight <= bottomBound
    ? preferredTop
    : preferredAboveTop >= topBound
      ? preferredAboveTop
      : Math.min(
          Math.max(preferredTop, topBound),
          Math.max(topBound, bottomBound - maxHeight)
        );

  dnGapDetailFilterPopupPosition.value = { top, left, maxHeight };
  dnGapDetailOpenFilterKey.value = key;
};

const getDnGapDetailTriggerId = (
  scope: DnGapDetailScope,
  customer = '',
  reportDate = ''
): string => [scope, normalizeDnGapCustomer(customer), reportDate].join('|');

const openDnGapDetail = (
  scope: DnGapDetailScope,
  gap: number,
  customer = '',
  customerLabel = '',
  reportDate = '',
  reportDateLabel = ''
): void => {
  if (Number(gap) >= 0) return;

  dnGapDetailRequestSerial++;
  dnGapDetailAbortController?.abort();
  dnGapDetailAbortController = null;
  clearDnGapDetailFilterSearchRequest();
  dnGapDetailContext.value = {
    scope,
    customer,
    customerLabel,
    reportDate,
    reportDateLabel,
    gap: Number(gap)
  };
  dnGapDetailActiveTriggerId.value = getDnGapDetailTriggerId(scope, customer, reportDate);
  dnGapDetailAllRows.value = [];
  dnGapDetailServerRows.value = [];
  dnGapDetailServerTotal.value = 0;
  dnGapDetailServerSourceTotal.value = 0;
  dnGapDetailServerTotalPages.value = 1;
  dnGapDetailSourceLoaded.value = false;
  dnGapDetailPageSize.value = 10;
  dnGapDetailPage.value = 1;
  dnGapDetailError.value = '';
  dnGapDetailDownloadError.value = '';
  resetDnGapDetailFilters(false);
  showDnGapDetailModal.value = true;
  void loadDnGapDetailPage(1);
};

const closeDnGapDetail = (): void => {
  dnGapDetailRequestSerial++;
  dnGapDetailAbortController?.abort();
  dnGapDetailAbortController = null;
  clearDnGapDetailFilterSearchRequest();
  showDnGapDetailModal.value = false;
  isLoadingDnGapDetail.value = false;
  dnGapDetailAllRows.value = [];
  dnGapDetailServerRows.value = [];
  dnGapDetailServerTotal.value = 0;
  dnGapDetailServerSourceTotal.value = 0;
  dnGapDetailServerTotalPages.value = 1;
  dnGapDetailSourceLoaded.value = false;
  dnGapDetailError.value = '';
  dnGapDetailDownloadError.value = '';
  dnGapDetailContext.value = null;
  dnGapDetailActiveTriggerId.value = '';
  resetDnGapDetailFilters(false);
};

const getDnGapDetailTitle = computed(() => {
  const context = dnGapDetailContext.value;

  if (!context) return 'Detail DN Open';
  if (context.scope === 'day') {
    return `Detail DN Open · ${context.customerLabel} · ${context.reportDateLabel}`;
  }
  if (context.scope === 'section') {
    return `Detail DN Open · Total ${context.customerLabel}`;
  }
  return 'Detail DN Open · Grand Total';
});

const getDnGapDownloadErrorMessage = async (error: any): Promise<string> => {
  const responseData = error?.response?.data;

  if (responseData instanceof Blob) {
    try {
      const text = await responseData.text();
      const parsed = JSON.parse(text);
      const message = String(parsed?.message ?? '').trim();
      if (message) return message;
    } catch {
      // Blob bukan JSON; lanjutkan fallback di bawah.
    }
  }

  return String(
    error?.response?.data?.message ||
    error?.message ||
    'Gagal menyiapkan Excel detail DN Open.'
  );
};

const downloadDnGapDetailExcel = async (): Promise<void> => {
  if (isDownloadingDnGapExcel.value || dnGapDetailTotal.value <= 0) return;

  isDownloadingDnGapExcel.value = true;
  dnGapDetailDownloadError.value = '';

  try {
    const scope = getDnGapServerScope();
    const payload: Record<string, unknown> = {
      ...scope.params,
      customers: scope.customers,
      filters: buildDnGapBackendFilters(),
      sort_key: dnGapDetailSortKey.value
        ? dnGapDetailBackendColumnMap[dnGapDetailSortKey.value]
        : '',
      sort_direction: dnGapDetailSortDirection.value
    };

    // Paste mode memang sudah mempunyai seluruh row GAP di browser. Kirim
    // hanya row terfilter tersebut agar hasil Excel persis popup tanpa query
    // seluruh scope database lagi. Check All tetap selalu server-side.
    if (!isDnGapDetailServerPaged.value) {
      payload.local_rows = dnGapDetailFilteredRows.value.map((row) => ({
        customer: row.customer,
        dnNumber: row.dnNumber,
        quantity: row.quantity,
        orderDate: row.orderDate,
        deliveryDate: row.deliveryDate
      }));
    }

    const response = await customerOrderService.downloadDnGapExcel(payload);
    const blob = response.data;

    if (!(blob instanceof Blob) || blob.size <= 0) {
      throw new Error('File Excel detail DN Open kosong.');
    }

    const disposition = String(response.headers?.['content-disposition'] ?? '');
    const fileNameMatch = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    const fileName = fileNameMatch?.[1]
      ? decodeURIComponent(fileNameMatch[1].replace(/^"|"$/g, '').trim())
      : 'DN_Open_GAP.xlsx';

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error: any) {
    dnGapDetailDownloadError.value = await getDnGapDownloadErrorMessage(error);
  } finally {
    isDownloadingDnGapExcel.value = false;
  }
};

// ============================================================
// UPLOAD PREVIEW GUIDANCE
// UX hybrid:
// 1. Setelah file siap dipreview, preview dibuka otomatis SATU KALI.
// 2. Submit tetap boleh dilakukan langsung; preview tidak menjadi blocking step.
// 3. Selama preview belum pernah dibuka, ikon eye dan helper card disorot
//    agar user selalu diarahkan untuk memeriksa hasil parsing terlebih dahulu.
// ============================================================
const hasReviewedCurrentUploadPreview = ref(false);
const lastAutoPreviewSourceKey = ref('');
const lastAutoPreviewPasswordSnapshot = ref('');
const isAutoOpeningUploadPreview = ref(false);

// Auto-preview normal tetap cepat. Khusus Excel ADM terenkripsi, tunggu user
// berhenti mengetik password agar request tidak memakai password parsial.
const AUTO_PREVIEW_DEFAULT_DELAY_MS = 260;
const AUTO_PREVIEW_PASSWORD_DELAY_MS = 900;
let uploadAutoPreviewTimer: number | null = null;

const clearUploadAutoPreviewTimer = (): void => {
  if (uploadAutoPreviewTimer !== null) {
    window.clearTimeout(uploadAutoPreviewTimer);
    uploadAutoPreviewTimer = null;
  }
};

const buildFileSignature = (file: File | null | undefined): string => {
  if (!file) return '';
  return `${file.name}:${file.size}:${file.lastModified}`;
};

const buildFilesSignature = (files: File[]): string => {
  return files
    .map((file) => buildFileSignature(file))
    .sort((left, right) => left.localeCompare(right))
    .join('|');
};

const currentUploadPreviewSourceKey = computed(() => {
  if (!showUploadModal.value || !selectedCustomerUpload.value) {
    return '';
  }

  let signature = '';

  if (isDcwaSoUpload.value) {
    signature = buildFilesSignature(dcwaSoUploadFiles.value);
  } else if (isAsiAdmSoUpload.value) {
    signature = buildFilesSignature(asiAdmSoUploadFiles.value);
  } else if (isGayaSoUpload.value) {
    signature = buildFilesSignature(gayaSoUploadFiles.value);
  } else if (isMesSoUpload.value) {
    signature = buildFilesSignature(mesSoUploadFiles.value);
  } else if (isDpmSoUpload.value) {
    signature = buildFilesSignature(dpmSoUploadFiles.value);
  } else if (isNtcSoUpload.value) {
    signature = buildFilesSignature(ntcSoUploadFiles.value);
  } else if (isTmminSoUpload.value) {
    signature = buildFilesSignature(tmminSoUploadFiles.value);
  } else if (isFtiSoUpload.value && ftiAdditionalOrderFile.value) {
    signature = buildFileSignature(ftiAdditionalOrderFile.value);
  } else if (admUploadFiles.value.length > 0) {
    signature = buildFilesSignature(admUploadFiles.value);
  } else {
    signature = buildFileSignature(uploadFiles.value);
  }

  if (!signature) {
    return '';
  }

  return `${selectedCustomerUpload.value}::${signature}`;
});

const isAnyUploadPreviewVisible = computed(() =>
  Boolean(
    showUploadPreview.value ||
    showDcwaRawSoPreview.value ||
    showAsiAdmRawSoPreview.value ||
    showGayaRawSoPreview.value ||
    showNtcRawSoPreview.value ||
    showTmminRawSoPreview.value ||
    showDpmRawSoPreview.value ||
    showDpmRawSoDuplicatePreview.value ||
    showFtiRawSoPreview.value ||
    showMesRawSoPreview.value ||
    showFtiAdditionalOrderPreview.value
  )
);

const shouldShowUploadPreviewGuidance = computed(() =>
  Boolean(currentUploadPreviewSourceKey.value)
);

const uploadPreviewGuidanceTitle = computed(() => {
  if (isAutoOpeningUploadPreview.value) {
    return 'Preview sedang dibuka otomatis';
  }

  if (hasReviewedCurrentUploadPreview.value) {
    return 'Preview sudah diperiksa';
  }

  if (canOpenUploadPreview.value) {
    return 'Periksa Preview sebelum Submit';
  }

  if (showExcelPasswordInput.value && !hasExcelPassword.value) {
    return 'Isi password agar Preview dapat dibuka';
  }

  return 'Menyiapkan Preview';
});

const uploadPreviewGuidanceMessage = computed(() => {
  if (isAutoOpeningUploadPreview.value) {
    return 'File sudah siap. Sistem akan membuka Preview satu kali agar hasil parsing dapat dicek sebelum Submit.';
  }

  if (hasReviewedCurrentUploadPreview.value) {
    return 'Anda tetap dapat membuka Preview lagi melalui ikon eye. Submit tetap dapat dilakukan seperti biasa.';
  }

  if (canOpenUploadPreview.value) {
    return 'Preview biasanya terbuka otomatis. Jika belum muncul, klik ikon eye atau tombol Buka Preview di bawah ini.';
  }

  if (showExcelPasswordInput.value && !hasExcelPassword.value) {
    return 'Setelah password Excel diisi, sistem menunggu sebentar sampai Anda selesai mengetik lalu Preview akan terbuka otomatis.';
  }

  return 'Sistem sedang membaca file dan menyiapkan data Preview. Tunggu hingga proses Preview selesai sebelum Submit.';
});

const openUploadPreviewWithGuidance = async (): Promise<void> => {
  if (!canOpenUploadPreview.value || isAutoOpeningUploadPreview.value) {
    return;
  }

  await openUploadPreview();
};

watch(
  currentUploadPreviewSourceKey,
  (newKey, oldKey) => {
    if (newKey === oldKey) return;

    clearUploadAutoPreviewTimer();
    hasReviewedCurrentUploadPreview.value = false;
    lastAutoPreviewSourceKey.value = '';
    lastAutoPreviewPasswordSnapshot.value = '';
  },
  { immediate: true }
);

watch(
  isAnyUploadPreviewVisible,
  (isVisible) => {
    if (isVisible && currentUploadPreviewSourceKey.value) {
      hasReviewedCurrentUploadPreview.value = true;
    }
  }
);

watch(
  [
    canOpenUploadPreview,
    currentUploadPreviewSourceKey,
    showUploadModal,
    excelPassword
  ],
  ([canOpen, sourceKey, modalOpen]) => {
    // Setiap ketikan password membatalkan timer sebelumnya. Dengan begitu
    // Excel encrypted tidak auto-preview dari password yang masih parsial.
    clearUploadAutoPreviewTimer();

    const encryptedPasswordMode = showExcelPasswordInput.value;
    const passwordSnapshot = encryptedPasswordMode
      ? excelPassword.value
      : '';

    // Untuk file encrypted, password baru boleh membuat auto-preview baru
    // walaupun file yang dipilih masih sama. Ini penting jika attempt sebelumnya
    // memakai password yang belum lengkap / salah.
    const sameCompletedAttempt =
      lastAutoPreviewSourceKey.value === sourceKey &&
      (!encryptedPasswordMode ||
        lastAutoPreviewPasswordSnapshot.value === passwordSnapshot);

    if (
      !modalOpen ||
      !canOpen ||
      !sourceKey ||
      hasReviewedCurrentUploadPreview.value ||
      isAutoOpeningUploadPreview.value ||
      sameCompletedAttempt
    ) {
      return;
    }

    const delayMs = encryptedPasswordMode
      ? AUTO_PREVIEW_PASSWORD_DELAY_MS
      : AUTO_PREVIEW_DEFAULT_DELAY_MS;

    uploadAutoPreviewTimer = window.setTimeout(
      async () => {
        uploadAutoPreviewTimer = null;

        // Password berubah selama debounce: jangan kirim request lama.
        if (
          encryptedPasswordMode &&
          excelPassword.value !== passwordSnapshot
        ) {
          return;
        }

        if (
          !showUploadModal.value ||
          !canOpenUploadPreview.value ||
          currentUploadPreviewSourceKey.value !== sourceKey ||
          hasReviewedCurrentUploadPreview.value ||
          isAutoOpeningUploadPreview.value
        ) {
          return;
        }

        isAutoOpeningUploadPreview.value = true;
        lastAutoPreviewSourceKey.value = sourceKey;
        lastAutoPreviewPasswordSnapshot.value = passwordSnapshot;

        try {
          await nextTick();

          // Guard kedua sesaat sebelum request dikirim.
          if (
            encryptedPasswordMode &&
            excelPassword.value !== passwordSnapshot
          ) {
            lastAutoPreviewSourceKey.value = '';
            lastAutoPreviewPasswordSnapshot.value = '';
            return;
          }

          await openUploadPreview();
        } finally {
          isAutoOpeningUploadPreview.value = false;
        }
      },
      delayMs
    );
  }
);

const onFtiAdditionalOrderFileChange = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  setFtiAdditionalOrderFile(input.files?.[0] ?? null);

  // Memungkinkan file yang sama dipilih ulang setelah Preview gagal/reset.
  input.value = '';
};

const onFtiAdditionalAllocationInput = (
  partNo: string,
  date: string,
  event: Event
): void => {
  const input = event.target as HTMLInputElement;
  updateFtiAdditionalOrderAllocation(partNo, date, input.value);
};

const onFtiAdditionalManualPoNumberInput = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  setFtiAdditionalManualPoNumber(input.value);
};

const onFtiAdditionalManualQtyInput = (partNo: string, event: Event): void => {
  const input = event.target as HTMLInputElement;
  setFtiAdditionalManualQty(partNo, input.value);
};

const formatFtiAdditionalNumber = (value: unknown): string => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '0';
  return numeric.toLocaleString('id-ID', {
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : 0,
    maximumFractionDigits: 3
  });
};

const formatFtiAdditionalDate = (value: string): string => {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(value ?? '');
  return `${match[3]}-${match[2]}-${match[1]}`;
};

// DPM:
// - preview upload freeze panes sampai kolom DI Number.
// - Kanban Del Qty dan Production Date tidak ditampilkan di preview upload maupun Raw Files utama.
// - Raw Sales Order utama juga freeze panes sampai kolom DI Number agar konsisten.
// - Istilah kolom DN pada preview DPM dipastikan tampil sebagai DI Number.
type DpmRawSoPreviewColumnKey = Parameters<typeof getDpmRawSoColumnStyle>[0];

const DPM_RAW_SO_PREVIEW_FROZEN_THROUGH_INDEX = 3;
const DPM_RAW_SO_PREVIEW_HIDDEN_KEYS = new Set<DpmRawSoPreviewColumnKey>([
  'kanbanDelQty',
  'productionDate',
  'createdAt'
]);

const dpmRawSoPreviewColumns = dpmRawSoColumns.filter(
  (column) => !DPM_RAW_SO_PREVIEW_HIDDEN_KEYS.has(column.key)
);

const dpmRawSoPreviewTableWidth = `${dpmRawSoPreviewColumns.reduce(
  (sum, column) => sum + Number.parseInt(column.width, 10),
  0
)}px`;

const getDpmRawSoPreviewColumnStyle = (
  key: DpmRawSoPreviewColumnKey,
  isHeader = false,
  rowIndex = 0
) => {
  const baseStyle = getDpmRawSoColumnStyle(key, isHeader, rowIndex);
  const columnIndex = dpmRawSoPreviewColumns.findIndex((column) => column.key === key);

  if (
    columnIndex < 0 ||
    columnIndex > DPM_RAW_SO_PREVIEW_FROZEN_THROUGH_INDEX
  ) {
    return baseStyle;
  }

  const left = dpmRawSoPreviewColumns
    .slice(0, columnIndex)
    .reduce((sum, column) => sum + Number.parseInt(column.width, 10), 0);

  const existingShadow = String(baseStyle.boxShadow ?? '').trim();
  // Separator freeze preview DPM dibuat tipis seperti border tabel biasa.
  // Tidak memakai drop-shadow tebal agar batas setelah DI Number tetap rapi.
  const freezeEdgeShadow =
    columnIndex === DPM_RAW_SO_PREVIEW_FROZEN_THROUGH_INDEX
      ? 'inset -0.5px 0 0 #e2e8f0'
      : '';

  return {
    ...baseStyle,
    position: 'sticky' as const,
    left: `${left}px`,
    ...(isHeader ? { top: '0px' } : {}),
    zIndex: isHeader ? 140 : 90,
    boxShadow: [existingShadow, freezeEdgeShadow].filter(Boolean).join(', ')
  };
};

const isDpmRawSoPreviewPoMatched = (
  row: Record<string, unknown>
): boolean => {
  const validation = dpmRawSoPoValidation.value;

  // Saat validasi PO belum siap, jangan menandai row sebagai ditahan.
  if (!validation?.is_ready) {
    return true;
  }

  const rowPo = String(row?.po_number ?? '')
    .trim()
    .toUpperCase();

  if (rowPo === '') {
    return false;
  }

  // Backend lama dapat mengirim PO numeric sebagai number karena coercion
  // array-key PHP. Selalu normalisasi ke string sebelum dibandingkan.
  const isMatched = (validation.matched_po_numbers ?? []).some(
    (value) =>
      String(value ?? '')
        .trim()
        .toUpperCase() === rowPo
  );

  if (isMatched) {
    return true;
  }

  const isMismatch = (validation.mismatched_po_numbers ?? []).some(
    (item) =>
      String(item?.po_number ?? '')
        .trim()
        .toUpperCase() === rowPo
  );

  if (isMismatch) {
    return false;
  }

  return Boolean(validation.all_matched);
};

const dpmRawSoEligiblePreviewSummary = computed(() => {
  const matchedPoNumbers = new Set(
    (dpmRawSoPoValidation.value?.matched_po_numbers ?? [])
      .map((value) => String(value ?? '').trim().toUpperCase())
      .filter((value) => value !== '')
  );

  const rows =
    dpmRawSoPoValidation.value?.is_ready
      ? dpmRawSoEligibleRows.value.filter((row) =>
          matchedPoNumbers.has(
            String(row?.po_number ?? '').trim().toUpperCase()
          )
        )
      : dpmRawSoEligibleRows.value;

  const uniqueValues = (key: string): string[] =>
    Array.from(
      new Set(
        rows
          .map((row) => String(row?.[key] ?? '').trim())
          .filter((value) => value !== '')
      )
    );

  const deliveryDates = uniqueValues('delivery_date').sort((left, right) => {
    const toSortKey = (value: string): string => {
      const normalized = String(value ?? '').trim();

      const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) {
        return `${iso[1]}-${iso[2]}-${iso[3]}`;
      }

      const dmy = normalized.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
      if (dmy) {
        return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
      }

      return normalized;
    };

    return toSortKey(left).localeCompare(toSortKey(right));
  });

  const totalDiQty = rows.reduce((total, row) => {
    const numeric = Number(row?.di_qty ?? 0);
    return total + (Number.isFinite(numeric) ? numeric : 0);
  }, 0);

  const sourceFiles = uniqueValues('source_file');
  const diNumbers = uniqueValues('di_number');
  const poNumbers = uniqueValues('po_number');
  const partNumbers = uniqueValues('part_number');
  const plants = uniqueValues('plant');
  const vendors = uniqueValues('vendor_code');
  const periods = uniqueValues('periode');

  return {
    total_files: sourceFiles.length,
    total_rows: rows.length,
    total_di_qty: totalDiQty,
    di_numbers: diNumbers,
    total_di_numbers: diNumbers.length,
    po_numbers: poNumbers,
    total_po_numbers: poNumbers.length,
    total_part_numbers: partNumbers.length,
    plants,
    vendors,
    periods,
    delivery_date_from: deliveryDates[0] ?? '',
    delivery_date_to: deliveryDates[deliveryDates.length - 1] ?? ''
  };
});

const submitDpmEligibleRowsFromPreview = async (): Promise<void> => {
  /*
   * File Excel tetap berada di form upload. Tombol ini hanya menutup popup
   * validasi lalu menjalankan Submit yang sama, sehingga user tidak perlu
   * Browse / upload ulang file. Backend akan menyimpan row eligible saja.
   */
  closeDpmRawSoDuplicatePreview();
  await submitUploadForm();
};

const formatDpmConfirmQtyDel = (value: unknown): string => {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return '';
  }

  // Backend DPM dapat mengembalikan DECIMAL seperti 100.000.
  // Helper ini dipertahankan untuk preview lama. Raw Files utama sekarang
  // memakai formatter numeric generik untuk SEMUA kolom quantity DPM.
  const numericValue = Number(raw);
  if (Number.isFinite(numericValue)) {
    return Number.isInteger(numericValue)
      ? String(numericValue)
      : String(numericValue).replace(/\.?0+$/, '');
  }

  return raw;
};

const DPM_RAW_SO_MAIN_FROZEN_THROUGH_INDEX = 2;
const DPM_RAW_SO_MAIN_HIDDEN_KEYS = new Set<DpmRawSoPreviewColumnKey>([
  'no',
  'kanbanDelQty',
  'productionDate'
]);

// Main Raw Files DPM hanya menampilkan kolom yang memang dipakai user.
// Data aslinya tetap dipertahankan di store/backend agar tidak mengubah proses lain.
const dpmRawSoMainColumns = dpmRawSoColumns.filter(
  (column) => !DPM_RAW_SO_MAIN_HIDDEN_KEYS.has(column.key)
);

const DPM_RAW_SO_SELECTION_WIDTH = 44;

const dpmRawSoMainTableWidth = `${DPM_RAW_SO_SELECTION_WIDTH + dpmRawSoMainColumns.reduce(
  (sum, column) => sum + Number.parseInt(column.width, 10),
  0
)}px`;

const getDpmRawSoMainColumnStyle = (
  key: DpmRawSoPreviewColumnKey,
  isHeader = false,
  rowIndex = 0
) => {
  const baseStyle = getDpmRawSoColumnStyle(key, isHeader, rowIndex);
  const columnIndex = dpmRawSoMainColumns.findIndex((column) => column.key === key);

  if (columnIndex < 0 || columnIndex > DPM_RAW_SO_MAIN_FROZEN_THROUGH_INDEX) {
    return baseStyle;
  }

  const left = DPM_RAW_SO_SELECTION_WIDTH + dpmRawSoMainColumns
    .slice(0, columnIndex)
    .reduce((sum, column) => sum + Number.parseInt(column.width, 10), 0);

  const existingShadow = String(baseStyle.boxShadow ?? '').trim();
  const freezeEdgeShadow =
    columnIndex === DPM_RAW_SO_MAIN_FROZEN_THROUGH_INDEX
      ? '2px 0 4px -3px rgba(15, 23, 42, 0.18)'
      : '';

  return {
    ...baseStyle,
    position: 'sticky' as const,
    left: `${left}px`,
    ...(isHeader ? { top: '-1px' } : {}),
    zIndex: isHeader ? 360 : 90,
    boxShadow: [existingShadow, freezeEdgeShadow].filter(Boolean).join(', ')
  };
};

const toggleUploadUserDropdownAndScroll = async (): Promise<void> => {
  if (!canSelectUploadUser.value) {
    return;
  }

  const willOpen = !showUploadUserDropdown.value;

  toggleUploadUserDropdown();

  if (!willOpen) {
    return;
  }

  await nextTick();

  window.requestAnimationFrame(() => {
    const scrollContainer = uploadFormScrollRef.value;
    const uploadBySection = uploadBySectionRef.value;

    if (!scrollContainer || !uploadBySection) {
      return;
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    const sectionRect = uploadBySection.getBoundingClientRect();

    // Tempatkan field Upload By tepat di bawah sticky header.
    // Ruang di bawahnya cukup untuk dropdown user tanpa perlu scroll manual lagi.
    const stickyHeaderSafeOffset = 88;
    const delta =
      sectionRect.top -
      containerRect.top -
      stickyHeaderSafeOffset;

    scrollContainer.scrollTo({
      top: Math.max(0, scrollContainer.scrollTop + delta),
      behavior: 'smooth'
    });
  });
};

onMounted(async () => {
  document.body.classList.add('so-upload-page');
  customerOrderStore.initializeUploadSoView();
  await nextTick();
  setupHeavySectionLazyLoading();
});

onBeforeUnmount(() => {
  heavySectionObserver?.disconnect();
  heavySectionObserver = null;
  dnGapDetailAbortController?.abort();
  dnGapDetailAbortController = null;
  clearDnGapDetailFilterSearchRequest();
  clearUploadAutoPreviewTimer();
  document.body.classList.remove('so-upload-page');
  customerOrderStore.disposeUploadSoView();
});
</script>

<template>
  <!-- ======================================================= -->
  <!-- BREADCRUMB                                              -->
  <!-- ======================================================= -->

  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-5" />

  <div class="p-4 space-y-6 bg-gray-50 min-h-screen">
    <!-- HEADER ACTION -->

    <!-- ====================================================== -->
    <!-- ADAPTIVE STICKY ACTION BAR                             -->
    <!-- ====================================================== -->

    <div class="sticky top-[64px] z-[900] h-[64px] pointer-events-none">
      <!-- ==================================================== -->
      <!-- FULL / EXPANDED BAR                                  -->
      <!-- ==================================================== -->

      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-[-6px] scale-[0.97]"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-[0.97]"
      >
        <div
          v-if="isPageTop || isFloatingActionOpen"
          class="pointer-events-auto flex h-[56px] items-center gap-3 transition-all duration-300"
          :class="
            isPageTop
              ? `
              w-full
              justify-start
              rounded-2xl
              px-3
            `
              : `
              ml-auto
              w-fit
              justify-end
              rounded-2xl
              !border
              !border-slate-200
              bg-white/95
              px-2
              shadow-lg
              backdrop-blur-md
            `
          "
        >
          <!-- ================================================ -->
          <!-- SELECT FILE                                      -->
          <!-- ================================================ -->

          <button
            type="button"
            :disabled="!permissions.create"
            :title="permissions.create ? 'Select File' : 'Tidak memiliki permission Create Upload SO'"
            @click="openUploadModalWithClose"
            class="min-w-[110px] h-10 px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-[0_3px_6px_rgba(37,99,235,0.35)] hover:bg-blue-700 hover:shadow-[0_5px_6px_rgba(37,99,235,0.45)] active:scale-95 transition-all duration-200 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
          >
            Select File
          </button>

          <!-- ================================================ -->
          <!-- SELECT CUSTOMER                                  -->
          <!-- ================================================ -->

          <div class="relative">
            <button
              type="button"
              @click="toggleHeaderCustomerDropdown"
              class="h-10 min-w-[170px] px-5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-[0_3px_6px_rgba(37,99,235,0.35)] hover:bg-blue-700 hover:shadow-[0_5px_6px_rgba(37,99,235,0.45)] transition flex items-center justify-between gap-2"
            >
              <span>
                {{ selectedCustomerLabel }}
              </span>

              <svg
                class="h-5 w-5 text-white transition-transform duration-200"
                :class="showHeaderCustomerDropdown ? 'rotate-180' : ''"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="
                M5.23 7.21
                a.75.75 0 0 1
                1.06.02
                L10 11.17
                l3.71-3.94
                a.75.75 0 1 1
                1.08 1.04
                l-4.25 4.5
                a.75.75 0 0 1
                -1.08 0
                l-4.25-4.5
                a.75.75 0 0 1
                .02-1.06Z
              "
                  clip-rule="evenodd"
                />
              </svg>
            </button>

            <!-- CUSTOMER DROPDOWN -->

            <div
              v-if="showHeaderCustomerDropdown"
              class="absolute left-0 top-[46px] z-[9999] w-[330px] overflow-hidden rounded-2xl !border !border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
              @click.stop
            >
              <!-- ALL CUSTOMER - layout disamakan dengan MDFO -->
              <div class="!border-b !border-slate-200 px-3 py-2.5">
                <label
                  class="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
                  @click.stop
                >
                  <input
                    type="checkbox"
                    :checked="isAllHeaderCustomersSelected"
                    class="h-4 w-4 shrink-0 cursor-pointer rounded !border !border-slate-400 text-blue-600 focus:ring-blue-500"
                    @change="toggleAllHeaderCustomerSelection()"
                  />

                  <span class="min-w-0 flex-1 truncate">All Customer</span>

                  <span
                    v-if="selectedCustomers.length === 0"
                    class="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600"
                  >
                    Table
                  </span>
                </label>
              </div>

              <!-- CUSTOMER LIST - checkbox kiri, Table kanan seperti MDFO -->
              <div class="max-h-[290px] overflow-y-auto p-2">
                <label
                  v-for="customer in customerOptions"
                  :key="customer"
                  class="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-blue-50"
                  @click.stop
                >
                  <input
                    type="checkbox"
                    :checked="isHeaderCustomerSelected(customer)"
                    class="h-4 w-4 shrink-0 cursor-pointer rounded !border !border-slate-400 text-blue-600 focus:ring-blue-500"
                    @change="toggleHeaderCustomerSelection(customer)"
                  />

                  <span class="min-w-0 flex-1 truncate">
                    {{ customer }}
                  </span>

                  <span
                    v-if="selectedCustomers.length > 0 && selectedCustomers.includes(customer)"
                    class="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600"
                  >
                    Table
                  </span>
                </label>
              </div>

              <!-- FOOTER -->
              <div class="flex items-center justify-between gap-3 !border-t !border-slate-200 bg-slate-50 px-3 py-3">
                <!-- JUMLAH TERPILIH -->
                <span class="min-w-0 flex-1 text-xs text-slate-500">
                  {{ draftSelectedCustomers.length ? `${draftSelectedCustomers.length} selected` : 'No customer selected' }}
                </span>

                <!-- ACTION -->
                <div class="flex shrink-0 items-center gap-2">
                  <!-- CLEAR -->
                  <button
                    type="button"
                    :disabled="draftSelectedCustomers.length === 0"
                    class="h-9 rounded-xl !border !border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 transition-all hover:border-slate-400 hover:bg-slate-100 hover:text-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    @click.stop="clearHeaderCustomerSelection()"
                  >
                    Clear
                  </button>

                  <!-- APPLY -->
                  <button
                    type="button"
                    :disabled="draftSelectedCustomers.length === 0"
                    class="h-9 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
                    @click.stop="applyHeaderCustomerFilter()"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ================================================ -->
          <!-- FILTER ORDER DATE                                -->
          <!-- ================================================ -->

          <div class="relative">
            <button
              type="button"
              @click="toggleOrderDateFilterPopup"
              class="h-10 min-w-[165px] px-5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-[0_3px_6px_rgba(37,99,235,0.35)] hover:bg-blue-700 hover:shadow-[0_5px_6px_rgba(37,99,235,0.45)] transition flex items-center justify-between gap-2"
            >
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="
                  M8 7V3
                  m8 4V3
                  m-9 8h10
                  M5 21h14
                  a2 2 0 0 0 2-2V7
                  a2 2 0 0 0-2-2H5
                  a2 2 0 0 0-2 2v12
                  a2 2 0 0 0 2 2z
                "
                  />
                </svg>

                <span>By Order Date</span>
              </div>

              <span>▾</span>
            </button>

            <!--
          PAKAI POPUP ORDER DATE KAMU YANG SEKARANG
          DI SINI.
          Tidak perlu ubah isi popup.
        -->

            <div
              v-if="showOrderDateFilter"
              class="absolute top-12 right-0 z-[9999] w-[320px] rounded-2xl !border !border-gray-200 bg-white p-5 shadow-xl"
            >
              <h3 class="text-sm font-bold text-gray-700 mb-4">Filter berdasarkan Order Date</h3>

              <label class="text-xs font-semibold text-gray-500"> From Date </label>

              <input
                type="date"
                v-model="fromDate"
                :max="maxOrderDate"
                class="mt-1 mb-4 h-10 w-full rounded-xl !border !border-gray-300 px-3 text-sm"
              />

              <label class="text-xs font-semibold text-gray-500"> To Date </label>

              <input
                type="date"
                v-model="toDate"
                :min="minToDate"
                :max="maxOrderDate"
                class="mt-1 mb-4 h-10 w-full rounded-xl !border !border-gray-300 px-3 text-sm"
              />

              <div class="flex justify-end gap-2 mt-5">
                <button
                  type="button"
                  @click="clearOrderDateFilter"
                  class="px-4 py-2 rounded-xl text-sm font-semibold !border !border-gray-300 bg-white"
                >
                  Clear
                </button>

                <button
                  type="button"
                  @click="applyOrderDateFilter"
                  class="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          <!-- ================================================ -->
          <!-- FILTER DELIVERY DATE                             -->
          <!-- ================================================ -->

          <div class="relative">
            <button
              type="button"
              @click="toggleDeliveryDateFilterPopup"
              class="h-10 min-w-[175px] px-5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-[0_3px_6px_rgba(37,99,235,0.35)] hover:bg-blue-700 hover:shadow-[0_5px_6px_rgba(37,99,235,0.45)] transition flex items-center justify-between gap-2"
            >
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="
                      M8 7V3
                      m8 4V3
                      m-9 8h10
                      M5 21h14
                      a2 2 0 0 0 2-2V7
                      a2 2 0 0 0-2-2H5
                      a2 2 0 0 0-2 2v12
                      a2 2 0 0 0 2 2z
                    "
                  />
                </svg>

                <span>By Delivery Date</span>
              </div>

              <span>▾</span>
            </button>

            <div
              v-if="showDeliveryDateFilter"
              class="absolute top-12 right-0 z-[9999] w-[320px] rounded-2xl !border !border-gray-200 bg-white p-5 shadow-xl"
            >
              <h3 class="mb-4 text-sm font-bold text-gray-700">
                Filter berdasarkan Delivery Date
              </h3>

              <label class="text-xs font-semibold text-gray-500">
                From Date
              </label>

              <input
                type="date"
                v-model="deliveryFromDate"
                :max="maxDeliveryDate"
                class="mt-1 mb-4 h-10 w-full rounded-xl !border !border-gray-300 px-3 text-sm"
              />

              <label class="text-xs font-semibold text-gray-500">
                To Date
              </label>

              <input
                type="date"
                v-model="deliveryToDate"
                :min="minDeliveryToDate"
                :max="maxDeliveryDate"
                class="mt-1 mb-4 h-10 w-full rounded-xl !border !border-gray-300 px-3 text-sm"
              />

              <div class="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  @click="clearDeliveryDateFilter"
                  class="rounded-xl !border !border-gray-300 bg-white px-4 py-2 text-sm font-semibold"
                >
                  Clear
                </button>

                <button
                  type="button"
                  @click="applyDeliveryDateFilter"
                  class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Apply
                </button>
              </div>
            </div>

          </div>

          <!-- ================================================ -->
          <!-- FILTER CREATION DATE                             -->
          <!-- tanggal data diupload ke database               -->
          <!-- ================================================ -->

          <div class="relative">
            <button
              type="button"
              @click="toggleCreationDateFilterPopup"
              class="h-10 min-w-[175px] px-5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-[0_3px_6px_rgba(37,99,235,0.35)] hover:bg-blue-700 hover:shadow-[0_5px_6px_rgba(37,99,235,0.45)] transition flex items-center justify-between gap-2"
            >
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
                  />
                </svg>

                <span>By Creation Date</span>
              </div>

              <span>▾</span>
            </button>

            <div
              v-if="showCreationDateFilter"
              class="absolute top-12 right-0 z-[9999] w-[320px] rounded-2xl !border !border-gray-200 bg-white p-5 shadow-xl"
            >
              <h3 class="mb-4 text-sm font-bold text-gray-700">
                Filter berdasarkan Creation Date
              </h3>

              <label class="text-xs font-semibold text-gray-500">
                From Date
              </label>

              <input
                type="date"
                v-model="creationFromDate"
                :max="todayDate"
                class="mt-1 mb-4 h-10 w-full rounded-xl !border !border-gray-300 px-3 text-sm"
              />

              <label class="text-xs font-semibold text-gray-500">
                To Date <span class="font-normal text-gray-400">(opsional)</span>
              </label>

              <input
                type="date"
                v-model="creationToDate"
                :min="minCreationToDate"
                :max="todayDate"
                class="mt-1 h-10 w-full rounded-xl !border !border-gray-300 px-3 text-sm"
              />

              <p class="mt-1 text-[11px] text-gray-400">
                Kosong = otomatis sampai hari ini.
              </p>

              <div class="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  @click="clearCreationDateFilter"
                  class="rounded-xl !border !border-gray-300 bg-white px-4 py-2 text-sm font-semibold"
                >
                  Clear
                </button>

                <button
                  type="button"
                  @click="applyCreationDateFilter"
                  class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          <!-- ================================================ -->
          <!-- CLOSE FLOATING BAR                               -->
          <!-- hanya muncul ketika scroll                       -->
          <!-- ================================================ -->

          <button
            v-if="!isPageTop"
            type="button"
            title="Minimize"
            @click="toggleFloatingAction"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-slate-500 transition hover:bg-red-100 hover:text-red-600 active:scale-95"
          >
            ✕
          </button>
        </div>
      </Transition>

      <!-- ==================================================== -->
      <!-- COLLAPSED FLOATING BUTTON                            -->
      <!-- ==================================================== -->

      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-x-4 scale-90"
        enter-to-class="opacity-100 translate-x-0 scale-100"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-90"
      >
        <button
          v-if="!isPageTop && !isFloatingActionOpen"
          type="button"
          @click="toggleFloatingAction"
          class="pointer-events-auto absolute right-0 top-[-15px] flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_5px_9px_rgba(37,99,235,0.30)] transition-all duration-200 hover:bg-blue-700 hover:shadow-[0_10px_28px_rgba(37,99,235,0.36)] active:scale-95"
        >
          <!-- FILTER ICON -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="
            M4 6h16
            M7 12h10
            M10 18h4
          "
            />
          </svg>

          <span> Filters </span>

          <!-- DOT jika ada filter aktif -->
          <span
            v-if="
              selectedCustomers.length > 0 ||
              fromDate ||
              toDate ||
              deliveryFromDate ||
              deliveryToDate
            "
            class="h-2 w-2 rounded-full bg-amber-300"
          />
        </button>
      </Transition>
    </div>

    <!-- Upload form dipindahkan ke body agar tidak terpotong layout parent. -->
    <Teleport to="body">
      <!-- PREVIEW FTI ADDITIONAL ORDER -->
      <div
        v-if="showFtiAdditionalOrderPreview && ftiAdditionalOrderPreview"
        class="fixed inset-0 z-[10070] flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/55 p-2 sm:p-4 lg:items-center lg:p-6"
        @click.self="showFtiAdditionalOrderPreview = false"
      >
        <div class="my-2 flex max-h-[calc(100dvh-1rem)] w-[96vw] max-w-[1240px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-0 sm:max-h-[calc(100dvh-2rem)] sm:w-[94vw] lg:max-h-[calc(100dvh-3rem)] lg:w-[92vw]">
          <div class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-bold text-slate-900">Preview Additional Order FTI</h3>
                <span class="rounded-full !border !border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">{{ ftiAdditionalOrderPreview.source_mode === 'MANUAL' ? 'Manual Plan' : 'OCR PDF' }}</span>
                <span class="rounded-full !border !border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">{{ ftiAdditionalOrderPreview.selected_period }}</span>
              </div>
              <p class="mt-1 text-xs text-slate-500">
                PO {{ ftiAdditionalOrderPreview.po_number }} · {{ ftiAdditionalOrderPreview.source_mode === 'MANUAL' ? 'Plan akhir' : 'Delivery' }} {{ formatFtiAdditionalDate(ftiAdditionalOrderPreview.delivery_date) }} · Contract {{ ftiAdditionalOrderPreview.contract_document }}
              </p>
            </div>
            <button
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-lg text-slate-500 hover:bg-slate-50"
              @click="showFtiAdditionalOrderPreview = false"
            >×</button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase text-slate-400">PO Number</p>
                <p class="mt-1 truncate text-sm font-bold text-slate-800">{{ ftiAdditionalOrderPreview.po_number }}</p>
              </div>
              <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase text-slate-400">{{ ftiAdditionalOrderPreview.source_mode === 'MANUAL' ? 'Plan Mulai' : 'PO Date' }}</p>
                <p class="mt-1 text-sm font-bold text-slate-800">{{ formatFtiAdditionalDate(ftiAdditionalOrderPreview.po_date) || '-' }}</p>
              </div>
              <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase text-slate-400">{{ ftiAdditionalOrderPreview.source_mode === 'MANUAL' ? 'Plan Akhir' : 'Delivery Date' }}</p>
                <p class="mt-1 text-sm font-bold text-slate-800">{{ formatFtiAdditionalDate(ftiAdditionalOrderPreview.delivery_date) }}</p>
              </div>
              <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase text-slate-400">Items</p>
                <p class="mt-1 text-sm font-bold text-slate-800">{{ ftiAdditionalOrderPreview.total_items }}</p>
              </div>
              <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase text-slate-400">{{ ftiAdditionalOrderPreview.source_mode === 'MANUAL' ? 'Input Qty' : 'PDF Qty' }}</p>
                <p class="mt-1 text-sm font-bold text-slate-800">{{ formatFtiAdditionalNumber(ftiAdditionalOrderPreview.total_pdf_qty) }}</p>
              </div>
              <div class="rounded-xl !border !border-orange-200 bg-orange-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase text-orange-500">Need Add</p>
                <p class="mt-1 text-sm font-bold text-orange-700">{{ formatFtiAdditionalNumber(ftiAdditionalOrderPreview.total_required_qty) }}</p>
              </div>
            </div>

            <div class="mt-4 rounded-xl !border !border-blue-200 bg-blue-50 px-3 py-2.5 text-[11px] leading-relaxed text-blue-700">
              <template v-if="ftiAdditionalOrderPreview.source_mode === 'MANUAL'">
                Plan otomatis tetap dibuat oleh sistem dari sisa target terhadap Raw Order aktif. Kolom Additional Qty dapat diedit manual setelah plan terbentuk. Total per part tidak boleh melebihi Target Qty dan harus kembali sama dengan target sebelum Submit. Sabtu/Minggu tetap tidak digunakan; Order Date dan Delivery Date dibuat sama.
              </template>
              <template v-else>
                Saran Qty dihitung dari target PO kumulatif dikurangi Raw Order aktif. Tanggal hanya menampilkan tail schedule pada hari kerja. Tanggal terakhir bulan menjadi closing qty otomatis agar total tetap sesuai.
              </template>
            </div>

            <div class="mt-4 space-y-4">
              <div
                v-for="item in ftiAdditionalOrderPreview.items"
                :key="`fti-additional-${item.part_no}`"
                class="overflow-hidden rounded-2xl !border !border-slate-200 bg-white"
              >
                <div class="flex flex-col gap-2 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="font-bold text-slate-800">{{ item.part_no }}</p>
                      <span class="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 !border !border-slate-200">Normal {{ formatFtiAdditionalNumber(item.normal_daily_qty) }}/hari</span>
                    </div>
                    <p class="mt-0.5 truncate text-xs text-slate-500">{{ item.part_name }}</p>
                  </div>
                  <div class="grid grid-cols-3 gap-1.5 text-center sm:min-w-[360px]">
                    <div class="rounded-lg bg-white px-2 py-1.5 !border !border-slate-200">
                      <p class="text-[9px] font-semibold uppercase text-slate-400">{{ ftiAdditionalOrderPreview.source_mode === 'MANUAL' ? 'Input Qty' : 'PDF Qty' }}</p>
                      <p class="text-xs font-bold text-slate-700">{{ formatFtiAdditionalNumber(item.pdf_qty) }}</p>
                    </div>
                    <div class="rounded-lg bg-white px-2 py-1.5 !border !border-slate-200">
                      <p class="text-[9px] font-semibold uppercase text-slate-400">Existing</p>
                      <p class="text-xs font-bold text-slate-700">{{ formatFtiAdditionalNumber(item.existing_order_qty) }}</p>
                    </div>
                    <div class="rounded-lg bg-orange-50 px-2 py-1.5 !border !border-orange-200">
                      <p class="text-[9px] font-semibold uppercase text-orange-500">Need Add</p>
                      <p class="text-xs font-bold text-orange-700">{{ formatFtiAdditionalNumber(item.required_qty) }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="item.required_qty <= 0" class="px-4 py-4 text-sm font-medium text-emerald-700">
                  PO ini sudah seluruhnya tertampung pada Raw Order aktif. Tidak ada Qty tambahan yang perlu dibuat.
                </div>

                <div v-else class="overflow-x-auto">
                  <table class="min-w-[760px] w-full border-collapse text-xs">
                    <thead>
                      <tr class="bg-blue-50 text-slate-700">
                        <th class="!border !border-slate-200 px-3 py-2 text-left">Tanggal</th>
                        <th class="!border !border-slate-200 px-3 py-2 text-right">Existing Raw</th>
                        <th class="!border !border-slate-200 px-3 py-2 text-right">Schedule</th>
                        <th class="!border !border-slate-200 px-3 py-2 text-right">Normal/Hari</th>
                        <th class="!border !border-slate-200 px-3 py-2 text-right">Additional Qty</th>
                        <th class="!border !border-slate-200 px-3 py-2 text-right">Final Raw</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="candidate in item.candidates" :key="`${item.part_no}-${candidate.date}`">
                        <td class="!border !border-slate-200 px-3 py-2 font-medium text-slate-700">
                          <div class="flex items-center gap-2">
                            {{ formatFtiAdditionalDate(candidate.date) }}
                            <span v-if="candidate.is_closing" class="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-bold text-orange-700">Closing</span>
                          </div>
                        </td>
                        <td class="!border !border-slate-200 px-3 py-2 text-right">{{ formatFtiAdditionalNumber(candidate.existing_qty) }}</td>
                        <td class="!border !border-slate-200 px-3 py-2 text-right">{{ formatFtiAdditionalNumber(candidate.scheduled_qty) }}</td>
                        <td class="!border !border-slate-200 px-3 py-2 text-right">{{ formatFtiAdditionalNumber(candidate.normal_daily_qty) }}</td>
                        <td class="!border !border-slate-200 px-3 py-1.5 text-right">
                          <div class="flex justify-end">
                            <input
                              v-if="ftiAdditionalOrderPreview.source_mode === 'MANUAL' || !candidate.is_closing"
                              type="number"
                              min="0"
                              :max="item.required_qty"
                              step="1"
                              class="h-8 w-28 rounded-lg !border !border-slate-300 bg-white px-2 text-right text-xs font-semibold text-slate-700 outline-none focus:!border-blue-500 focus:ring-2 focus:ring-blue-100"
                              :class="ftiAdditionalOrderPreview.source_mode === 'MANUAL' ? '!border-orange-200 bg-orange-50/40' : ''"
                              :title="ftiAdditionalOrderPreview.source_mode === 'MANUAL' ? `Bisa diedit. Total maksimal ${formatFtiAdditionalNumber(item.required_qty)}` : ''"
                              :value="getFtiAdditionalOrderAllocationQty(item.part_no, candidate.date)"
                              @input="onFtiAdditionalAllocationInput(item.part_no, candidate.date, $event)"
                            />
                            <div
                              v-else
                              class="flex h-8 w-28 items-center justify-end rounded-lg !border !border-orange-200 bg-orange-50 px-2 text-xs font-bold text-orange-700"
                            >
                              {{ formatFtiAdditionalNumber(getFtiAdditionalOrderAllocationQty(item.part_no, candidate.date)) }}
                            </div>
                          </div>
                        </td>
                        <td class="!border !border-slate-200 px-3 py-2 text-right font-bold text-slate-800">
                          {{ formatFtiAdditionalNumber(candidate.existing_qty + getFtiAdditionalOrderAllocationQty(item.part_no, candidate.date)) }}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr class="bg-slate-50">
                        <td colspan="4" class="!border !border-slate-200 px-3 py-2 text-right text-[11px] font-bold uppercase text-slate-500">Total Additional</td>
                        <td class="!border !border-slate-200 px-3 py-2 text-right font-bold text-blue-700">{{ formatFtiAdditionalNumber(getFtiAdditionalOrderAllocationTotal(item.part_no)) }}</td>
                        <td class="!border !border-slate-200 px-3 py-2 text-right text-[11px] font-semibold" :class="Math.abs(getFtiAdditionalOrderAllocationTotal(item.part_no) - item.required_qty) <= 0.001 ? 'text-emerald-600' : 'text-red-600'">
                          Target {{ formatFtiAdditionalNumber(item.required_qty) }}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p class="text-[11px]" :class="isFtiAdditionalOrderAllocationValid ? 'text-emerald-600' : 'text-red-600'">
              {{
                isFtiAdditionalOrderAllocationValid
                  ? 'Allocation valid. Konfirmasi Schedule untuk menyimpan plan ini sementara; data baru digenerate saat Submit pada Upload Form.'
                  : 'Total Additional Qty tidak boleh melebihi target dan harus sama dengan Target Qty sebelum Schedule dikonfirmasi.'
              }}
            </p>
            <div class="flex flex-wrap justify-end gap-2">
              <button
                v-if="ftiAdditionalOrderPreview.source_mode === 'MANUAL'"
                type="button"
                class="rounded-xl !border !border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                title="Kembalikan seluruh Additional Qty ke pembagian awal yang disarankan sistem"
                @click="resetFtiAdditionalOrderAllocationsToSystemPlan"
              >
                Kembali ke Plan Sistem
              </button>
              <button type="button" class="rounded-xl !border !border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600" @click="showFtiAdditionalOrderPreview = false">Tutup</button>
              <button
                type="button"
                :disabled="!isFtiAdditionalOrderAllocationValid"
                class="rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                @click="confirmFtiAdditionalOrderSchedule"
              >
                Konfirmasi Schedule
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- PREVIEW RAW SALES ORDER FTI DARI ZSTT -->
      <div
        v-if="showFtiRawSoPreview"
        class="fixed inset-0 z-[10060] flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/55 p-2 sm:p-4 lg:items-center lg:p-6"
        @click.self="showFtiRawSoPreview = false"
      >
        <div class="my-2 flex max-h-[calc(100dvh-1rem)] w-[96vw] max-w-[1180px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-0 sm:max-h-[calc(100dvh-2rem)] sm:w-[94vw] lg:max-h-[calc(100dvh-3rem)] lg:w-[92vw]">
          <div class="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-bold text-gray-900">Preview Raw Sales Order</h3>
                <span class="inline-flex items-center rounded-full !border !border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">FTI</span>
                <span class="inline-flex items-center rounded-full !border !border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Generate dari ZSTT</span>
              </div>
              <p class="mt-1 text-xs text-gray-500">
                Periode {{ selectedUploadPeriodLabel || selectedUploadPeriod }} · hanya Qty ZSTT &gt; 0
              </p>
            </div>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-lg text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-800"
              @click="showFtiRawSoPreview = false"
            >×</button>
          </div>

          <div
            class="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6"
            style="scrollbar-gutter: stable;"
          >
            <div class="shrink-0 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Rows</p>
                <p class="mt-1 text-sm font-bold text-slate-800">{{ ftiRawSoPreviewSummary?.total_rows ?? ftiRawSoPreviewRows.length }}</p>
              </div>
              <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Parts</p>
                <p class="mt-1 text-sm font-bold text-slate-800">{{ ftiRawSoPreviewSummary?.total_parts ?? 0 }}</p>
              </div>
              <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">PO</p>
                <p class="mt-1 text-sm font-bold text-slate-800">{{ ftiRawSoPreviewSummary?.total_po ?? 0 }}</p>
              </div>
              <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total Qty</p>
                <p class="mt-1 text-sm font-bold text-blue-700">{{ formatUploadPreviewNumber(ftiRawSoPreviewSummary?.total_qty ?? 0) }}</p>
              </div>
              <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Revision</p>
                <p class="mt-1 text-sm font-bold text-slate-800">Rev {{ ftiRawSoPreviewSummary?.revision ?? 0 }}</p>
              </div>
              <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Order Date</p>
                <p class="mt-1 truncate text-xs font-bold text-slate-800" :title="formatUploadPreviewDateRange(ftiRawSoPreviewSummary?.order_date_from, ftiRawSoPreviewSummary?.order_date_to)">
                  {{ formatUploadPreviewDateRange(ftiRawSoPreviewSummary?.order_date_from, ftiRawSoPreviewSummary?.order_date_to) || '-' }}
                </p>
              </div>
            </div>

            <div class="mt-4 shrink-0">
              <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p class="text-sm font-bold text-slate-800">Detail Raw Sales Order FTI</p>
                  <p class="mt-0.5 text-[11px] text-slate-500">
                    Data dibentuk otomatis dari ZSTT FTI. Tabel preview menampilkan maksimal 100 baris; ringkasan tetap menghitung seluruh data.
                  </p>
                </div>
                <div class="rounded-full !border !border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  {{ formatUploadPreviewNumber(ftiRawSoPreviewRows.length) }} baris
                </div>
              </div>

              <div
                class="relative isolate h-[clamp(260px,44dvh,500px)] min-h-[260px] overflow-auto overscroll-contain rounded-xl !border !border-slate-300 bg-white"
                style="scrollbar-gutter: stable; direction: ltr;"
              >
                <table class="m-0 w-full min-w-[970px] table-fixed border-separate border-spacing-0 bg-white text-xs">
                  <thead class="sticky top-0 z-30 bg-blue-50">
                    <tr>
                      <th
                        v-for="column in ftiRawSoColumns"
                        :key="`fti-preview-head-${column.key}`"
                        class="box-border whitespace-nowrap px-3 py-2.5 text-center font-bold text-slate-900 shadow-[inset_0_-1px_0_#cbd5e1,inset_-1px_0_0_#e2e8f0]"
                        :style="{ width: column.width, minWidth: column.width }"
                      >
                        {{ column.label }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(row, rowIndex) in ftiRawSoPreviewRows"
                      :key="`fti-preview-${row.sourceZsttBatchId}-${row.partNo}-${row.orderDate}-${rowIndex}`"
                      class="odd:bg-white even:bg-slate-50/70"
                    >
                      <td
                        v-for="column in ftiRawSoColumns"
                        :key="`fti-preview-cell-${rowIndex}-${column.key}`"
                        :class="[
                          'box-border min-h-9 px-3 py-2 text-xs text-slate-700 shadow-[inset_0_-1px_0_#e2e8f0,inset_-1px_0_0_#f1f5f9]',
                          column.key === 'partName' ? 'whitespace-normal text-left leading-5' : 'whitespace-nowrap text-center'
                        ]"
                        :title="String(row[column.key] ?? '')"
                      >
                        {{
                          column.key === 'qty'
                            ? formatUploadPreviewNumber(row[column.key])
                            : ['orderDate', 'deliveryDate'].includes(column.key)
                              ? formatUploadPreviewDate(row[column.key])
                              : row[column.key]
                        }}
                      </td>
                    </tr>
                    <tr v-if="ftiRawSoPreviewRows.length === 0">
                      <td :colspan="ftiRawSoColumns.length" class="p-8 text-center text-slate-400">
                        Data ZSTT FTI non-zero tidak ditemukan
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 items-center justify-end border-t border-slate-200 bg-white px-6 py-4">
            <button
              type="button"
              class="h-10 rounded-xl !border !border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
              @click="showFtiRawSoPreview = false"
            >Close</button>
          </div>
        </div>
      </div>

      <!-- PREVIEW RAW SALES ORDER MES DARI PDF TEXT -->
      <div
        v-if="showMesRawSoPreview"
        class="fixed inset-0 z-[10062] flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/55 p-2 sm:p-4 lg:items-center lg:p-6"
        @click.self="showMesRawSoPreview = false"
      >
        <div class="my-2 flex max-h-[calc(100dvh-1rem)] w-[96vw] max-w-[1220px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-0 sm:max-h-[calc(100dvh-2rem)] sm:w-[94vw] lg:max-h-[calc(100dvh-3rem)] lg:w-[92vw]">
          <div class="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-bold text-gray-900">Preview Raw Sales Order</h3>
                <span class="inline-flex items-center rounded-full !border !border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">MES</span>
                <span class="inline-flex items-center rounded-full !border !border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">PDF Text Parser</span>
              </div>
              <p class="mt-1 text-xs text-gray-500">
                Periode {{ selectedUploadPeriodLabel || selectedUploadPeriod }} · PO, Description, Qty, dan Delivery Date dibaca langsung dari text PDF
              </p>
            </div>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-lg text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-800"
              @click="showMesRawSoPreview = false"
            >×</button>
          </div>

          <div class="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6" style="scrollbar-gutter: stable;">
            <div class="shrink-0 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Rows</p>
                <p class="mt-1 text-sm font-bold text-slate-800">{{ mesRawSoPreviewSummary?.total_rows ?? mesRawSoPreviewRows.length }}</p>
              </div>
              <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Parts</p>
                <p class="mt-1 text-sm font-bold text-slate-800">{{ mesRawSoPreviewSummary?.total_parts ?? 0 }}</p>
              </div>
              <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">PO</p>
                <p class="mt-1 text-sm font-bold text-slate-800">{{ mesRawSoPreviewSummary?.total_po ?? 0 }}</p>
              </div>
              <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total Qty</p>
                <p class="mt-1 text-sm font-bold text-blue-700">{{ formatUploadPreviewNumber(mesRawSoPreviewSummary?.total_qty ?? 0) }}</p>
              </div>
              <div class="rounded-xl !border px-3 py-2.5" :class="mesPartNameConflicts.length > 0 ? '!border-amber-200 bg-amber-50' : '!border-emerald-200 bg-emerald-50'">
                <p class="text-[10px] font-semibold uppercase tracking-wide" :class="mesPartNameConflicts.length > 0 ? 'text-amber-500' : 'text-emerald-500'">Part Name Check</p>
                <p class="mt-1 text-sm font-bold" :class="mesPartNameConflicts.length > 0 ? 'text-amber-700' : 'text-emerald-700'">
                  {{ mesPartNameConflicts.length > 0 ? `${mesPartNameConflicts.length} perlu dipilih` : 'Sesuai Contract' }}
                </p>
              </div>
            </div>

            <div v-if="mesPartNameConflicts.length > 0" class="mt-4 shrink-0 rounded-2xl !border !border-amber-200 bg-amber-50/70 p-3 sm:p-4">
              <div class="mb-3 flex items-start gap-2">
                <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 font-bold text-amber-700">!</span>
                <div>
                  <p class="text-sm font-bold text-amber-900">Part Name PDF berbeda dengan Contract MES</p>
                  <p class="mt-0.5 text-[11px] leading-4 text-amber-700">
                    Part Number cocok. Pilih nama yang akan disimpan untuk setiap perbedaan. Perbedaan kecil seperti spasi/tanda baca tetap ditampilkan agar user yang menentukan.
                  </p>
                </div>
              </div>

              <div class="space-y-2">
                <div
                  v-for="conflict in mesPartNameConflicts"
                  :key="`mes-name-${conflict.key}`"
                  class="rounded-xl !border !border-amber-200 bg-white p-3"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p class="text-xs font-bold text-slate-800">{{ conflict.part_no }}</p>
                      <p class="mt-0.5 text-[10px] text-slate-500">Kemiripan {{ conflict.similarity }}% · {{ conflict.severity === 'minor' ? 'perbedaan minor' : 'perlu perhatian' }}</p>
                    </div>
                    <span
                      class="rounded-full px-2.5 py-1 text-[10px] font-bold"
                      :class="mesPartNameChoices[conflict.key] ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
                    >
                      {{ mesPartNameChoices[conflict.key] ? 'Sudah dipilih' : 'Wajib pilih' }}
                    </span>
                  </div>

                  <div class="mt-2 grid gap-2 md:grid-cols-2">
                    <button
                      type="button"
                      class="rounded-xl !border p-3 text-left transition-all"
                      :class="mesPartNameChoices[conflict.key] === 'PDF' ? '!border-blue-500 bg-blue-50 ring-2 ring-blue-100' : '!border-slate-200 bg-white hover:!border-blue-300 hover:bg-blue-50/40'"
                      @click="setMesPartNameChoice(conflict.key, 'PDF')"
                    >
                      <span class="text-[10px] font-bold uppercase tracking-wide text-blue-600">Gunakan dari PDF</span>
                      <span class="mt-1 block text-xs font-semibold text-slate-800">{{ conflict.pdf_part_name }}</span>
                    </button>
                    <button
                      type="button"
                      class="rounded-xl !border p-3 text-left transition-all"
                      :class="mesPartNameChoices[conflict.key] === 'CONTRACT' ? '!border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100' : '!border-slate-200 bg-white hover:!border-emerald-300 hover:bg-emerald-50/40'"
                      @click="setMesPartNameChoice(conflict.key, 'CONTRACT')"
                    >
                      <span class="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Gunakan dari Contract</span>
                      <span class="mt-1 block text-xs font-semibold text-slate-800">{{ conflict.contract_part_name }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-4 shrink-0">
              <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p class="text-sm font-bold text-slate-800">Detail hasil parser PDF MES</p>
                  <p class="mt-0.5 text-[11px] text-slate-500">Part No otomatis ditambah suffix -00. Tabel preview maksimal 100 baris; ringkasan dan validasi tetap memakai seluruh data.</p>
                </div>
                <div class="rounded-full !border !border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  {{ formatUploadPreviewNumber(mesRawSoPreviewRows.length) }} baris
                </div>
              </div>

              <div class="relative isolate h-[clamp(260px,40dvh,470px)] min-h-[260px] w-full max-w-full overflow-auto overscroll-contain rounded-xl !border !border-slate-300 bg-white" style="scrollbar-gutter: auto; direction: ltr;">
                <table class="m-0 table-fixed border-separate border-spacing-0 bg-white text-xs" style="width: max(100%, 1050px); min-width: 100%;">
                  <thead class="sticky top-0 z-30 bg-blue-50">
                    <tr>
                      <th
                        v-for="column in mesRawSoColumns"
                        :key="`mes-preview-head-${column.key}`"
                        class="box-border whitespace-nowrap px-3 py-2.5 text-center font-bold text-slate-900 shadow-[inset_0_-1px_0_#cbd5e1,inset_-1px_0_0_#e2e8f0]"
                        :style="{ width: column.width, minWidth: column.width }"
                      >
                        {{ column.label }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in mesRawSoPreviewRows" :key="`mes-preview-${row.sourceFileName}-${row.sourceRow}-${rowIndex}`" class="odd:bg-white even:bg-slate-50/70">
                      <td
                        v-for="column in mesRawSoColumns"
                        :key="`mes-preview-cell-${rowIndex}-${column.key}`"
                        :class="[
                          'box-border min-h-9 px-3 py-2 text-xs text-slate-700 shadow-[inset_0_-1px_0_#e2e8f0,inset_-1px_0_0_#f1f5f9]',
                          column.key === 'partName' ? 'whitespace-normal text-left leading-5' : 'whitespace-nowrap text-center'
                        ]"
                        :title="String(row[column.key] ?? '')"
                      >
                        {{
                          column.key === 'qty'
                            ? formatUploadPreviewNumber(row[column.key])
                            : ['orderDate', 'deliveryDate'].includes(column.key)
                              ? formatUploadPreviewDate(row[column.key])
                              : row[column.key] || '-'
                        }}
                      </td>
                    </tr>
                    <tr v-if="mesRawSoPreviewRows.length === 0">
                      <td :colspan="mesRawSoColumns.length" class="p-8 text-center text-slate-400">Data PDF MES tidak ditemukan</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-[11px]" :class="hasUnresolvedMesPartNameConflict ? 'text-amber-700' : 'text-emerald-600'">
              {{ hasUnresolvedMesPartNameConflict ? 'Pilih Part Name pada seluruh perbedaan sebelum Submit.' : 'Preview MES siap. Submit dapat dilanjutkan dari Upload Form.' }}
            </p>
            <button type="button" class="h-10 rounded-xl !border !border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50" @click="showMesRawSoPreview = false">Close</button>
          </div>
        </div>
      </div>

      <div
        v-if="showDpmRawSoPreview"
        class="fixed inset-0 z-[10050] flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/55 p-2 sm:p-4 lg:items-center lg:p-6"
        @click.self="showDpmRawSoPreview = false"
      >
        <div class="my-2 flex max-h-[calc(100dvh-1rem)] w-[96vw] max-w-[1120px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-0 sm:max-h-[calc(100dvh-2rem)] sm:w-[94vw] lg:max-h-[calc(100dvh-3rem)] lg:w-[92vw]">
          <div class="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-bold text-gray-900">Excel Preview</h3>
                <span class="inline-flex items-center rounded-full !border !border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  DPM
                </span>
              </div>
              <p class="mt-1 text-xs text-gray-500">
                {{ uploadFileName }}
                <span class="ml-2 inline-flex items-center rounded-full !border !border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                  {{ dpmRawSoDetectedPeriodLabel || selectedUploadPeriodLabel || selectedUploadPeriod }}
                </span>
              </p>
            </div>

            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full !border !border-slate-300 bg-white text-lg font-bold text-gray-600 transition-all duration-200 hover:!border-red-200 hover:bg-red-100 hover:text-red-600 active:scale-95"
              @click="showDpmRawSoPreview = false"
            >
              X
            </button>
          </div>

          <div
            class="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-3 sm:px-6 sm:py-4"
            style="scrollbar-gutter: stable;"
          >
            <div class="mb-3 shrink-0 space-y-1 text-sm text-gray-700">
              <p><strong>File Name:</strong> {{ uploadFileName }}</p>
              <p><strong>File Type:</strong> {{ uploadFiles?.type || 'Excel File' }}</p>
              <p class="text-[11px] text-slate-500">Tabel preview maksimal 100 baris. Summary, duplicate check, PO validation, dan Contract tetap dihitung dari seluruh data.</p>
            </div>

            <div v-if="dpmRawSoPreviewSummary" class="mb-3 shrink-0">
              <div class="grid grid-cols-2 gap-2 lg:grid-cols-5">
                <div class="rounded-xl !border !border-blue-200 bg-blue-50 px-4 py-3">
                  <div class="text-[10px] font-bold uppercase tracking-wide text-blue-600">DI Qty (Pcs)</div>
                  <div class="mt-1 text-xl font-extrabold text-slate-900">
                    {{ formatUploadPreviewNumber(dpmRawSoPreviewSummary.total_di_qty) }}
                  </div>
                  <div class="mt-0.5 text-[10px] text-slate-500">Total quantity periode terpilih</div>
                </div>

                <div class="rounded-xl !border !border-slate-200 bg-white px-4 py-3">
                  <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Baris Upload</div>
                  <div class="mt-1 text-lg font-extrabold text-slate-800">
                    {{ formatUploadPreviewNumber(dpmRawSoPreviewSummary.total_rows) }}
                  </div>
                  <div class="mt-0.5 text-[10px] text-slate-500">
                    {{ formatUploadPreviewNumber(dpmRawSoPreviewSummary.total_files) }} file Excel
                  </div>
                </div>

                <div class="rounded-xl !border !border-slate-200 bg-white px-4 py-3">
                  <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">DI Number</div>
                  <div class="mt-1 text-lg font-extrabold text-slate-800">
                    {{ formatUploadPreviewNumber(dpmRawSoPreviewSummary.total_di_numbers ?? dpmRawSoPreviewSummary.di_numbers?.length) }}
                  </div>
                  <div class="mt-0.5 truncate text-[10px] text-slate-500">
                    {{ dpmRawSoPreviewSummary.di_numbers?.join(', ') || '-' }}
                  </div>
                </div>

                <div class="rounded-xl !border !border-slate-200 bg-white px-4 py-3">
                  <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">PO Number</div>
                  <div class="mt-1 text-lg font-extrabold text-slate-800">
                    {{ formatUploadPreviewNumber(dpmRawSoPreviewSummary.total_po_numbers ?? dpmRawSoPreviewSummary.po_numbers?.length) }}
                  </div>
                  <div class="mt-0.5 truncate text-[10px] text-slate-500">
                    {{ dpmRawSoPreviewSummary.po_numbers?.join(', ') || '-' }}
                  </div>
                </div>

                <div
                  class="rounded-xl !border px-4 py-3"
                  :class="dpmRawSoPoValidation?.is_ready
                    ? (dpmRawSoPoValidation?.all_matched
                      ? '!border-emerald-200 bg-emerald-50'
                      : '!border-red-200 bg-red-50')
                    : '!border-slate-200 bg-slate-50'"
                >
                  <div
                    class="text-[10px] font-bold uppercase tracking-wide"
                    :class="dpmRawSoPoValidation?.is_ready
                      ? (dpmRawSoPoValidation?.all_matched ? 'text-emerald-600' : 'text-red-600')
                      : 'text-slate-400'"
                  >
                    PO MDFO Matched
                  </div>
                  <div class="mt-1 text-lg font-extrabold text-slate-900">
                    {{
                      dpmRawSoPoValidation?.is_ready
                        ? `${dpmRawSoPoValidation?.matched_po_count ?? 0}/${dpmRawSoPoValidation?.total_po_numbers ?? 0}`
                        : '-'
                    }}
                  </div>
                  <div class="mt-0.5 truncate text-[10px] text-slate-500">
                    {{ dpmRawSoPoValidation?.selected_period_label || 'Menunggu periode' }}
                  </div>
                </div>
              </div>

              <div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 px-4 py-3 text-xs md:grid-cols-3 lg:grid-cols-5">
                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">Part Number</div>
                  <div class="mt-0.5 font-semibold text-slate-700">
                    {{ formatUploadPreviewNumber(dpmRawSoPreviewSummary.total_part_numbers) }}
                  </div>
                </div>
                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">Plant</div>
                  <div class="mt-0.5 font-semibold text-slate-700">{{ dpmRawSoPreviewSummary.plants?.join(', ') || '-' }}</div>
                </div>
                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">Vendor</div>
                  <div class="mt-0.5 font-semibold text-slate-700">{{ dpmRawSoPreviewSummary.vendors?.join(', ') || '-' }}</div>
                </div>
                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">Periode</div>
                  <div class="mt-0.5 whitespace-nowrap font-semibold text-slate-700">
                    {{ dpmRawSoDetectedPeriodLabel || selectedUploadPeriodLabel || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">Delivery Date</div>
                  <div class="mt-0.5 whitespace-nowrap font-semibold text-slate-700">
                    {{ formatUploadPreviewDateRange(dpmRawSoPreviewSummary.delivery_date_from, dpmRawSoPreviewSummary.delivery_date_to) }}
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="dpmRawSoPoValidation?.is_ready && dpmRawSoPoValidation?.all_matched"
              class="mb-3 shrink-0 rounded-xl !border !border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800"
            >
              <span class="font-bold">PO Number matched.</span>
              {{ dpmRawSoPoValidation?.matched_po_count ?? 0 }} PO pada data baru tersedia di Raw MDFO DPM periode
              {{ dpmRawSoPoValidation?.selected_period_label || '-' }}.
            </div>

            <div
              v-if="dpmRawSoHasPoMismatch"
              class="mb-3 shrink-0 overflow-hidden rounded-xl !border !border-red-200 bg-red-50"
            >
              <div class="border-b border-red-200 px-4 py-3">
                <div class="text-xs font-bold text-red-800">
                  PO Number tidak sesuai dengan MDFO DPM periode {{ dpmRawSoPoValidation?.selected_period_label || '-' }}
                </div>
                <div class="mt-1 text-[11px] text-red-700">
                  Row dengan PO ini tidak akan disimpan. Order dengan PO yang match MDFO pada bulan yang sama tetap dapat diupload.
                </div>
              </div>
              <div class="overflow-x-auto bg-white">
                <table class="w-full min-w-[680px] text-xs">
                  <thead class="bg-red-50 text-red-800">
                    <tr>
                      <th class="border-b border-red-100 px-3 py-2 text-left">PO Number</th>
                      <th class="border-b border-red-100 px-3 py-2 text-center">Row</th>
                      <th class="border-b border-red-100 px-3 py-2 text-center">Status</th>
                      <th class="border-b border-red-100 px-3 py-2 text-left">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(item, index) in dpmRawSoPoValidation?.mismatched_po_numbers ?? []"
                      :key="`dpm-po-mismatch-preview-${item.po_number || 'empty'}-${index}`"
                      class="odd:bg-white even:bg-slate-50/60"
                    >
                      <td class="border-b border-slate-100 px-3 py-2 font-semibold text-slate-800">
                        {{ item.po_number || '(PO kosong)' }}
                      </td>
                      <td class="border-b border-slate-100 px-3 py-2 text-center text-slate-600">
                        {{ item.row_count ?? 0 }}
                      </td>
                      <td class="border-b border-slate-100 px-3 py-2 text-center">
                        <span
                          class="inline-flex rounded-full px-2 py-1 text-[10px] font-bold"
                          :class="item.status === 'WRONG_PERIOD'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'"
                        >
                          {{
                            item.status === 'WRONG_PERIOD'
                              ? 'Beda Bulan'
                              : item.status === 'NOT_FOUND'
                                ? 'Belum di MDFO'
                                : 'Perlu Cek'
                          }}
                        </span>
                      </td>
                      <td class="border-b border-slate-100 px-3 py-2 text-slate-600">
                        {{ item.message }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div
              v-if="dpmRawSoContractValidation && !dpmRawSoContractValidation.is_ready"
              class="mb-3 shrink-0 rounded-xl !border !border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800"
            >
              <span class="font-bold">Contract belum lengkap:</span>
              {{ dpmRawSoContractValidation.missing_parts?.join(', ') }}.
            </div>

            <div
              class="relative isolate h-[clamp(220px,42dvh,460px)] min-h-[220px] shrink-0 overflow-auto overscroll-contain rounded-xl !border !border-slate-300 bg-white"
              style="scrollbar-gutter: stable; direction: ltr;"
            >
              <table
                class="m-0 table-fixed border-separate border-spacing-0 text-xs"
                :style="{ width: dpmRawSoPreviewTableWidth, minWidth: dpmRawSoPreviewTableWidth, marginLeft: '0px' }"
              >
                <thead>
                  <tr>
                    <th
                      v-for="col in dpmRawSoPreviewColumns"
                      :key="`dpm-preview-${col.key}`"
                      class="box-border whitespace-nowrap px-3 py-2 text-center font-bold text-gray-900"
                      :style="getDpmRawSoPreviewColumnStyle(col.key, true, 0)"
                    >
                      {{ col.key === 'diNumber' ? 'DI Number' : col.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, rowIndex) in dpmRawSoPreviewRows"
                    :key="`dpm-preview-row-${rowIndex}`"
                    class="odd:bg-white even:bg-slate-50/60"
                  >
                    <td
                      v-for="col in dpmRawSoPreviewColumns"
                      :key="`dpm-preview-cell-${rowIndex}-${col.key}`"
                      :class="[
                        'box-border whitespace-nowrap px-3 py-2 text-gray-900',
                        ['description', 'vendorName', 'deliveryLocation'].includes(col.key)
                          ? 'text-left'
                          : 'text-center'
                      ]"
                      :style="getDpmRawSoPreviewColumnStyle(col.key, false, rowIndex)"
                    >
                      {{
                        col.key === 'deliveryDate'
                          ? formatUploadPreviewDate(row[col.key])
                          : col.key === 'confirmQtyDel'
                            ? formatDpmConfirmQtyDel(row[col.key])
                            : col.numeric
                              ? formatUploadPreviewNumber(row[col.key])
                              : row[col.key]
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
            <button
              type="button"
              class="h-10 min-w-[90px] rounded-xl !border !border-slate-300 bg-white px-4 font-semibold text-gray-700 transition-all duration-200 hover:!border-slate-400 hover:bg-gray-100 hover:text-gray-900 active:scale-95"
              @click="showDpmRawSoPreview = false"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <!-- DPM DUPLICATE / ELIGIBLE PREVIEW -->
      <div
        v-if="showDpmRawSoDuplicatePreview"
        class="fixed inset-0 z-[10070] flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/60 p-2 sm:p-4 lg:items-center lg:p-6"
        @click.self="closeDpmRawSoDuplicatePreview"
      >
        <div class="my-2 flex max-h-[calc(100dvh-1rem)] w-[97vw] max-w-[1320px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-0 sm:max-h-[calc(100dvh-2rem)] sm:w-[95vw] lg:max-h-[calc(100dvh-3rem)]">
          <div class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-bold text-slate-900">
                  Data DPM Sudah Pernah Diupload
                </h3>
                <span class="inline-flex items-center rounded-full !border !border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                  {{ dpmRawSoDuplicateValidation?.total_incoming ?? dpmRawSoPreviewRows.length }} data
                </span>
                <span
                  v-if="dpmRawSoCanUploadFromSelectedFile"
                  class="inline-flex items-center rounded-full !border !border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"
                >
                  {{ dpmRawSoTotalPoEligible }} siap upload
                </span>
                <span
                  v-if="dpmRawSoHasPoMismatch"
                  class="inline-flex items-center rounded-full !border !border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700"
                >
                  {{ dpmRawSoPoValidation?.mismatched_rows ?? 0 }} row PO ditahan
                </span>
              </div>
              <p class="mt-1 max-w-[980px] text-xs text-slate-500">
                Sistem membandingkan file Excel yang masih dipilih dengan database. Data yang sudah ada akan dilewati otomatis,
                sedangkan data yang belum pernah tersimpan dapat dipreview dan diupload dari file yang sama tanpa Browse ulang. Detail tabel dibatasi maksimal 100 baris per kategori; angka total tetap seluruh data.
              </p>
            </div>

            <button
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full !border !border-slate-300 bg-white text-lg font-bold text-slate-600 transition-all hover:!border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95"
              @click="closeDpmRawSoDuplicatePreview"
            >
              X
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
            <div class="mb-3 grid grid-cols-2 gap-3 xl:grid-cols-5">
              <div class="rounded-xl !border !border-red-200 bg-red-50 px-4 py-3">
                <div class="text-[10px] font-bold uppercase tracking-wide text-red-500">
                  Sudah Tersimpan
                </div>
                <div class="mt-1 text-xl font-extrabold text-slate-900">
                  {{ dpmRawSoDuplicateValidation?.total_existing ?? dpmRawSoDuplicateRows.length }}
                </div>
                <div class="mt-0.5 text-[10px] text-slate-500">
                  business key ditemukan di database
                </div>
              </div>

              <div class="rounded-xl !border !border-slate-200 bg-white px-4 py-3">
                <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  File Lama
                </div>
                <div class="mt-1 text-xl font-extrabold text-slate-900">
                  {{ dpmRawSoDuplicateExistingFiles.length }}
                </div>
                <div class="mt-0.5 text-[10px] text-slate-500">
                  file sumber yang sudah pernah diupload
                </div>
              </div>

              <div class="rounded-xl !border !border-emerald-200 bg-emerald-50 px-4 py-3">
                <div class="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                  Bisa Diupload
                </div>
                <div class="mt-1 text-xl font-extrabold text-slate-900">
                  {{ dpmRawSoTotalPoEligible }}
                </div>
                <div class="mt-0.5 text-[10px] text-slate-500">
                  {{ dpmRawSoHasPoMismatch
                    ? `${dpmRawSoPoValidation?.mismatched_rows ?? 0} row PO lain ditahan`
                    : 'data baru yang belum ada di sistem' }}
                </div>
              </div>

              <div class="rounded-xl !border !border-amber-200 bg-amber-50 px-4 py-3">
                <div class="text-[10px] font-bold uppercase tracking-wide text-amber-600">
                  Duplikat Dalam File Baru
                </div>
                <div class="mt-1 text-xl font-extrabold text-slate-900">
                  {{ dpmRawSoDuplicateValidation?.total_upload_duplicates ?? dpmRawSoUploadDuplicateRows.length }}
                </div>
                <div class="mt-0.5 text-[10px] text-slate-500">
                  row ganda yang akan dilewati
                </div>
              </div>

              <div
                class="rounded-xl !border px-4 py-3"
                :class="dpmRawSoPoValidation?.is_ready
                  ? (dpmRawSoPoValidation?.all_matched
                    ? '!border-emerald-200 bg-emerald-50'
                    : '!border-red-200 bg-red-50')
                  : '!border-slate-200 bg-slate-50'"
              >
                <div
                  class="text-[10px] font-bold uppercase tracking-wide"
                  :class="dpmRawSoPoValidation?.is_ready
                    ? (dpmRawSoPoValidation?.all_matched ? 'text-emerald-600' : 'text-red-600')
                    : 'text-slate-400'"
                >
                  PO MDFO Matched
                </div>
                <div class="mt-1 text-xl font-extrabold text-slate-900">
                  {{
                    dpmRawSoPoValidation?.is_ready
                      ? `${dpmRawSoPoValidation?.matched_po_count ?? 0}/${dpmRawSoPoValidation?.total_po_numbers ?? 0}`
                      : '-'
                  }}
                </div>
                <div class="mt-0.5 text-[10px] text-slate-500">
                  {{ dpmRawSoPoValidation?.selected_period_label || 'Menunggu periode' }}
                </div>
              </div>
            </div>

            <div
              v-if="dpmRawSoDuplicateExistingFiles.length > 0"
              class="mb-3 rounded-xl !border !border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  File yang sudah pernah diupload
                </div>
                <div class="text-[10px] font-semibold text-slate-500">
                  {{ dpmRawSoDuplicateExistingFiles.length }} file lama
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="fileName in dpmRawSoDuplicateExistingFiles"
                  :key="`dpm-duplicate-file-${fileName}`"
                  class="inline-flex max-w-full items-center rounded-full !border !border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700"
                  :title="fileName"
                >
                  <span class="max-w-[360px] truncate">{{ fileName }}</span>
                </span>
              </div>
            </div>

            <div
              v-if="dpmRawSoHasPoMismatch"
              class="mb-3 overflow-hidden rounded-xl !border !border-red-200 bg-red-50"
            >
              <div class="border-b border-red-200 px-4 py-3">
                <div class="text-xs font-bold text-red-800">
                  Ada PO Number yang tidak sesuai MDFO DPM
                </div>
                <div class="mt-1 text-[11px] text-red-700">
                  {{ dpmRawSoPoValidationMessage || 'Row dengan PO salah bulan / belum ada di MDFO akan dilewati. PO yang match tetap dapat diupload.' }}
                </div>
              </div>
              <div class="overflow-x-auto bg-white">
                <table class="w-full min-w-[700px] text-xs">
                  <thead class="bg-red-50 text-red-800">
                    <tr>
                      <th class="border-b border-red-100 px-3 py-2 text-left">PO Number</th>
                      <th class="border-b border-red-100 px-3 py-2 text-center">Row Baru</th>
                      <th class="border-b border-red-100 px-3 py-2 text-center">Status</th>
                      <th class="border-b border-red-100 px-3 py-2 text-left">Keterangan MDFO</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(item, index) in dpmRawSoPoValidation?.mismatched_po_numbers ?? []"
                      :key="`dpm-po-mismatch-duplicate-${item.po_number || 'empty'}-${index}`"
                      class="odd:bg-white even:bg-slate-50/60"
                    >
                      <td class="border-b border-slate-100 px-3 py-2 font-semibold text-slate-800">
                        {{ item.po_number || '(PO kosong)' }}
                      </td>
                      <td class="border-b border-slate-100 px-3 py-2 text-center text-slate-600">
                        {{ item.row_count ?? 0 }}
                      </td>
                      <td class="border-b border-slate-100 px-3 py-2 text-center">
                        <span
                          class="inline-flex rounded-full px-2 py-1 text-[10px] font-bold"
                          :class="item.status === 'WRONG_PERIOD'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'"
                        >
                          {{
                            item.status === 'WRONG_PERIOD'
                              ? 'Beda Bulan'
                              : item.status === 'NOT_FOUND'
                                ? 'Belum di MDFO'
                                : 'Perlu Cek'
                          }}
                        </span>
                      </td>
                      <td class="border-b border-slate-100 px-3 py-2 text-slate-600">
                        {{ item.message }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div
              v-if="dpmRawSoCanUploadFromSelectedFile"
              class="mb-3 flex flex-col gap-2 rounded-xl !border !border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span class="font-bold">{{ dpmRawSoTotalPoEligible }} data baru siap masuk.</span>
                File tetap tersimpan di form upload. Data existing dan row dengan PO yang tidak match MDFO tidak akan disimpan ulang.
              </div>
              <button
                type="button"
                class="shrink-0 rounded-lg !border !border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                @click="setDpmRawSoDuplicatePreviewMode('eligible')"
              >
                Preview Data Baru
              </button>
            </div>

            <div
              v-else-if="!dpmRawSoHasPoMismatch"
              class="mb-3 rounded-xl !border !border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"
            >
              <span class="font-bold">Tidak ada data baru untuk diupload.</span>
              Seluruh business key pada file/periode ini sudah tersimpan atau merupakan duplikat di file baru.
            </div>

            <div class="mb-3 flex flex-wrap gap-2">
              <button
                v-if="dpmRawSoDuplicateRows.length > 0"
                type="button"
                class="rounded-full px-3 py-1.5 text-[11px] font-bold transition"
                :class="dpmRawSoDuplicatePreviewMode === 'existing'
                  ? '!border !border-red-300 bg-red-100 text-red-700'
                  : '!border !border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                @click="setDpmRawSoDuplicatePreviewMode('existing')"
              >
                Sudah Tersimpan ({{ dpmRawSoDuplicateRows.length }})
              </button>

              <button
                v-if="dpmRawSoEligibleRows.length > 0"
                type="button"
                class="rounded-full px-3 py-1.5 text-[11px] font-bold transition"
                :class="dpmRawSoDuplicatePreviewMode === 'eligible'
                  ? '!border !border-emerald-300 bg-emerald-100 text-emerald-700'
                  : '!border !border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                @click="setDpmRawSoDuplicatePreviewMode('eligible')"
              >
                Data Baru ({{ dpmRawSoEligibleRows.length }})
              </button>

              <button
                v-if="dpmRawSoUploadDuplicateRows.length > 0"
                type="button"
                class="rounded-full px-3 py-1.5 text-[11px] font-bold transition"
                :class="dpmRawSoDuplicatePreviewMode === 'upload_duplicate'
                  ? '!border !border-amber-300 bg-amber-100 text-amber-700'
                  : '!border !border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                @click="setDpmRawSoDuplicatePreviewMode('upload_duplicate')"
              >
                Duplikat File Baru ({{ dpmRawSoUploadDuplicateRows.length }})
              </button>
            </div>

            <div
              v-if="dpmRawSoDuplicatePreviewMode === 'eligible' && dpmRawSoEligibleRows.length > 0"
              class="mb-3"
            >
              <div class="mb-2 flex items-center justify-between gap-3">
                <div>
                  <div class="text-xs font-bold text-slate-800">
                    Summary Data Baru
                  </div>
                  <div class="mt-0.5 text-[10px] text-slate-500">
                    Ringkasan hanya menghitung data yang benar-benar siap diupload.
                  </div>
                </div>
                <span class="inline-flex items-center rounded-full !border !border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                  {{ formatUploadPreviewNumber(dpmRawSoEligiblePreviewSummary.total_rows) }} row
                </span>
              </div>

              <div class="grid grid-cols-2 gap-2 lg:grid-cols-5">
                <div class="rounded-xl !border !border-blue-200 bg-blue-50 px-4 py-3">
                  <div class="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                    DI Qty (Pcs)
                  </div>
                  <div class="mt-1 text-xl font-extrabold text-slate-900">
                    {{ formatUploadPreviewNumber(dpmRawSoEligiblePreviewSummary.total_di_qty) }}
                  </div>
                  <div class="mt-0.5 text-[10px] text-slate-500">
                    Total quantity data baru
                  </div>
                </div>

                <div class="rounded-xl !border !border-slate-200 bg-white px-4 py-3">
                  <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Baris Upload
                  </div>
                  <div class="mt-1 text-lg font-extrabold text-slate-800">
                    {{ formatUploadPreviewNumber(dpmRawSoEligiblePreviewSummary.total_rows) }}
                  </div>
                  <div class="mt-0.5 text-[10px] text-slate-500">
                    {{ formatUploadPreviewNumber(dpmRawSoEligiblePreviewSummary.total_files) }} file Excel
                  </div>
                </div>

                <div class="rounded-xl !border !border-slate-200 bg-white px-4 py-3">
                  <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    DI Number
                  </div>
                  <div class="mt-1 text-lg font-extrabold text-slate-800">
                    {{ formatUploadPreviewNumber(dpmRawSoEligiblePreviewSummary.total_di_numbers) }}
                  </div>
                  <div
                    class="mt-0.5 truncate text-[10px] text-slate-500"
                    :title="dpmRawSoEligiblePreviewSummary.di_numbers.join(', ')"
                  >
                    {{ dpmRawSoEligiblePreviewSummary.di_numbers.join(', ') || '-' }}
                  </div>
                </div>

                <div class="rounded-xl !border !border-slate-200 bg-white px-4 py-3">
                  <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    PO Number
                  </div>
                  <div class="mt-1 text-lg font-extrabold text-slate-800">
                    {{ formatUploadPreviewNumber(dpmRawSoEligiblePreviewSummary.total_po_numbers) }}
                  </div>
                  <div
                    class="mt-0.5 truncate text-[10px] text-slate-500"
                    :title="dpmRawSoEligiblePreviewSummary.po_numbers.join(', ')"
                  >
                    {{ dpmRawSoEligiblePreviewSummary.po_numbers.join(', ') || '-' }}
                  </div>
                </div>

                <div
                  class="rounded-xl !border px-4 py-3"
                  :class="dpmRawSoPoValidation?.all_matched
                    ? '!border-emerald-200 bg-emerald-50'
                    : '!border-red-200 bg-red-50'"
                >
                  <div
                    class="text-[10px] font-bold uppercase tracking-wide"
                    :class="dpmRawSoPoValidation?.all_matched ? 'text-emerald-600' : 'text-red-600'"
                  >
                    PO MDFO Matched
                  </div>
                  <div class="mt-1 text-lg font-extrabold text-slate-800">
                    {{ `${dpmRawSoPoValidation?.matched_po_count ?? 0}/${dpmRawSoPoValidation?.total_po_numbers ?? 0}` }}
                  </div>
                  <div class="mt-0.5 truncate text-[10px] text-slate-500">
                    {{ dpmRawSoPoValidation?.selected_period_label || '-' }}
                  </div>
                </div>
              </div>

              <div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl !border !border-slate-200 bg-slate-50 px-4 py-3 text-xs md:grid-cols-3 lg:grid-cols-5">
                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    Part Number
                  </div>
                  <div class="mt-0.5 font-semibold text-slate-700">
                    {{ formatUploadPreviewNumber(dpmRawSoEligiblePreviewSummary.total_part_numbers) }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    Plant
                  </div>
                  <div
                    class="mt-0.5 truncate font-semibold text-slate-700"
                    :title="dpmRawSoEligiblePreviewSummary.plants.join(', ')"
                  >
                    {{ dpmRawSoEligiblePreviewSummary.plants.join(', ') || '-' }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    Vendor
                  </div>
                  <div
                    class="mt-0.5 truncate font-semibold text-slate-700"
                    :title="dpmRawSoEligiblePreviewSummary.vendors.join(', ')"
                  >
                    {{ dpmRawSoEligiblePreviewSummary.vendors.join(', ') || '-' }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    Periode
                  </div>
                  <div class="mt-0.5 whitespace-nowrap font-semibold text-slate-700">
                    {{ dpmRawSoDetectedPeriodLabel || selectedUploadPeriodLabel || dpmRawSoEligiblePreviewSummary.periods.join(', ') || '-' }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    Delivery Date
                  </div>
                  <div class="mt-0.5 whitespace-nowrap font-semibold text-slate-700">
                    {{ formatUploadPreviewDateRange(
                      dpmRawSoEligiblePreviewSummary.delivery_date_from,
                      dpmRawSoEligiblePreviewSummary.delivery_date_to
                    ) }}
                  </div>
                </div>
              </div>
            </div>

            <div
              class="relative isolate h-[clamp(270px,48dvh,520px)] min-h-[270px] overflow-auto overscroll-contain rounded-xl !border !border-slate-300 bg-white"
              style="scrollbar-gutter: stable; direction: ltr;"
            >
              <table class="m-0 min-w-[1540px] table-fixed border-separate border-spacing-0 bg-white text-xs">
                <thead class="sticky top-0 z-30 bg-blue-50">
                  <tr>
                    <!-- Freeze pane 1 -->
                    <th class="sticky left-0 top-0 z-[55] w-[190px] min-w-[190px] bg-blue-50 px-3 py-2.5 text-center font-bold text-slate-900 shadow-[inset_1px_0_0_#e2e8f0,inset_-1px_0_0_#e2e8f0,inset_0_-1px_0_#cbd5e1]">
                      File Baru
                    </th>
                    <!-- Freeze pane 2 -->
                    <th class="sticky left-[190px] top-0 z-[55] w-[190px] min-w-[190px] bg-blue-50 px-3 py-2.5 text-center font-bold text-slate-900 shadow-[inset_-1px_0_0_#e2e8f0,inset_0_-1px_0_#cbd5e1]">
                      File Tersimpan
                    </th>
                    <!-- Freeze pane 3: DI Number -->
                    <th class="sticky left-[380px] top-0 z-[56] w-[145px] min-w-[145px] bg-blue-50 px-3 py-2.5 text-center font-bold text-slate-900 shadow-[inset_-0.5px_0_0_#e2e8f0,inset_0_-1px_0_#cbd5e1]">
                      DI Number
                    </th>
                    <th class="w-[115px] min-w-[115px] px-3 py-2.5 text-center font-bold text-slate-900 shadow-[inset_-1px_0_0_#e2e8f0,inset_0_-1px_0_#cbd5e1]">
                      Delivery Date
                    </th>
                    <th class="w-[185px] min-w-[185px] px-3 py-2.5 text-center font-bold text-slate-900 shadow-[inset_-1px_0_0_#e2e8f0,inset_0_-1px_0_#cbd5e1]">
                      ID Material
                    </th>
                    <th class="w-[155px] min-w-[155px] px-3 py-2.5 text-center font-bold text-slate-900 shadow-[inset_-1px_0_0_#e2e8f0,inset_0_-1px_0_#cbd5e1]">
                      Part Number
                    </th>
                    <th class="w-[125px] min-w-[125px] px-3 py-2.5 text-center font-bold text-slate-900 shadow-[inset_-1px_0_0_#e2e8f0,inset_0_-1px_0_#cbd5e1]">
                      PO Number
                    </th>
                    <th class="w-[80px] min-w-[80px] px-3 py-2.5 text-center font-bold text-slate-900 shadow-[inset_-1px_0_0_#e2e8f0,inset_0_-1px_0_#cbd5e1]">
                      PO Item
                    </th>
                    <th class="w-[105px] min-w-[105px] px-3 py-2.5 text-center font-bold text-slate-900 shadow-[inset_-1px_0_0_#e2e8f0,inset_0_-1px_0_#cbd5e1]">
                      Qty
                    </th>
                    <th class="w-[110px] min-w-[110px] px-3 py-2.5 text-center font-bold text-slate-900 shadow-[inset_-1px_0_0_#e2e8f0,inset_0_-1px_0_#cbd5e1]">
                      Upload By
                    </th>
                    <th class="w-[155px] min-w-[155px] px-3 py-2.5 text-center font-bold text-slate-900 shadow-[inset_-1px_0_0_#e2e8f0,inset_0_-1px_0_#cbd5e1]">
                      Created At
                    </th>
                    <th class="w-[110px] min-w-[110px] px-3 py-2.5 text-center font-bold text-slate-900 shadow-[inset_-1px_0_0_#e2e8f0,inset_0_-1px_0_#cbd5e1]">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="(row, rowIndex) in dpmRawSoDuplicatePreviewRows"
                    :key="`dpm-validation-row-${dpmRawSoDuplicatePreviewMode}-${row.id ?? row.source_row ?? rowIndex}-${rowIndex}`"
                    class="odd:bg-white even:bg-slate-50/70"
                  >
                    <td
                      class="sticky left-0 z-20 px-3 py-2 text-left text-slate-700 shadow-[inset_1px_0_0_#e2e8f0,inset_-1px_0_0_#f1f5f9,inset_0_-1px_0_#e2e8f0]"
                      :class="rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'"
                    >
                      <div
                        class="max-w-[170px] truncate font-medium"
                        :title="String(dpmRawSoDuplicatePreviewMode === 'existing' ? (row.incoming_source_file ?? '') : (row.source_file ?? ''))"
                      >
                        {{ dpmRawSoDuplicatePreviewMode === 'existing'
                          ? (row.incoming_source_file || '-')
                          : (row.source_file || '-') }}
                      </div>
                      <div
                        v-if="dpmRawSoDuplicatePreviewMode === 'existing' ? row.incoming_source_row : row.source_row"
                        class="mt-0.5 text-[10px] text-slate-400"
                      >
                        row {{ dpmRawSoDuplicatePreviewMode === 'existing' ? row.incoming_source_row : row.source_row }}
                      </div>
                    </td>

                    <td
                      class="sticky left-[190px] z-20 px-3 py-2 text-left text-slate-700 shadow-[inset_-1px_0_0_#f1f5f9,inset_0_-1px_0_#e2e8f0]"
                      :class="rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'"
                    >
                      <template v-if="dpmRawSoDuplicatePreviewMode === 'existing'">
                        <div class="max-w-[170px] truncate font-medium" :title="String(row.source_file ?? '')">
                          {{ row.source_file || '-' }}
                        </div>
                        <div v-if="row.source_row" class="mt-0.5 text-[10px] text-slate-400">
                          row {{ row.source_row }}
                        </div>
                      </template>
                      <template v-else-if="dpmRawSoDuplicatePreviewMode === 'eligible'">
                        <span class="font-semibold text-emerald-700">Belum ada</span>
                      </template>
                      <template v-else>
                        <span class="font-semibold text-amber-700">Duplikat di file baru</span>
                      </template>
                    </td>

                    <td
                      class="sticky left-[380px] z-[21] whitespace-nowrap px-3 py-2 text-center font-semibold text-slate-700 shadow-[inset_-0.5px_0_0_#e2e8f0,inset_0_-1px_0_#e2e8f0]"
                      :class="rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'"
                    >
                      {{ row.di_number || '-' }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-center text-slate-700 shadow-[inset_-1px_0_0_#f1f5f9,inset_0_-1px_0_#e2e8f0]">
                      {{ formatUploadPreviewDate(row.delivery_date) }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-center text-slate-700 shadow-[inset_-1px_0_0_#f1f5f9,inset_0_-1px_0_#e2e8f0]">
                      {{ row.material_id || '-' }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-center font-medium text-slate-800 shadow-[inset_-1px_0_0_#f1f5f9,inset_0_-1px_0_#e2e8f0]">
                      {{ row.part_number || '-' }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-center text-slate-700 shadow-[inset_-1px_0_0_#f1f5f9,inset_0_-1px_0_#e2e8f0]">
                      {{ row.po_number || '-' }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-center text-slate-700 shadow-[inset_-1px_0_0_#f1f5f9,inset_0_-1px_0_#e2e8f0]">
                      {{ row.po_item || '-' }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-700 shadow-[inset_-1px_0_0_#f1f5f9,inset_0_-1px_0_#e2e8f0]">
                      {{ formatUploadPreviewNumber(row.confirm_qty_del ?? row.di_qty ?? 0) }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-center text-slate-700 shadow-[inset_-1px_0_0_#f1f5f9,inset_0_-1px_0_#e2e8f0]">
                      {{ dpmRawSoDuplicatePreviewMode === 'existing' ? (row.uploaded_by || '-') : '-' }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-center text-slate-700 shadow-[inset_-1px_0_0_#f1f5f9,inset_0_-1px_0_#e2e8f0]">
                      {{ dpmRawSoDuplicatePreviewMode === 'existing' ? (row.created_at || '-') : '-' }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-center shadow-[inset_-1px_0_0_#e2e8f0,inset_0_-1px_0_#e2e8f0]">
                      <span
                        v-if="
                          dpmRawSoDuplicatePreviewMode === 'eligible' &&
                          isDpmRawSoPreviewPoMatched(row)
                        "
                        class="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700"
                      >
                        PO Match
                      </span>
                      <span
                        v-else-if="dpmRawSoDuplicatePreviewMode === 'eligible'"
                        class="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-700"
                      >
                        PO Ditahan
                      </span>
                      <span
                        v-else-if="dpmRawSoDuplicatePreviewMode === 'upload_duplicate'"
                        class="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700"
                      >
                        Dilewati
                      </span>
                      <span
                        v-else
                        class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold"
                        :class="Number(row.is_cancelled ?? 0) === 1
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'"
                      >
                        {{ Number(row.is_cancelled ?? 0) === 1 ? 'Cancelled' : 'Sudah Ada' }}
                      </span>
                    </td>
                  </tr>

                  <tr v-if="dpmRawSoDuplicatePreviewRows.length === 0">
                    <td colspan="12" class="px-4 py-12 text-center text-sm text-slate-400">
                      Tidak ada data pada kategori ini.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-2 text-[10px] text-slate-400">
              Freeze panes aktif sampai kolom ke-3: <strong>DI Number</strong>. Geser tabel ke kanan untuk melihat kolom berikutnya.
            </div>
          </div>

          <div class="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div class="text-xs text-slate-500">
              <template v-if="dpmRawSoCanUploadFromSelectedFile">
                <strong class="text-emerald-700">{{ dpmRawSoTotalPoEligible }} data PO matched</strong>
                dapat diproses.
                <span v-if="dpmRawSoHasPoMismatch" class="text-red-600">
                  {{ dpmRawSoPoValidation?.mismatched_rows ?? 0 }} row PO tidak match akan dilewati.
                </span>
              </template>
              <template v-else>
                Tidak ada data baru yang dapat disimpan dari file ini.
              </template>
            </div>

            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="h-10 min-w-[96px] rounded-xl !border !border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-95"
                @click="closeDpmRawSoDuplicatePreview"
              >
                Close
              </button>
              <button
                v-if="dpmRawSoCanUploadFromSelectedFile"
                type="button"
                class="h-10 min-w-[150px] rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95"
                :disabled="isUploading"
                @click="submitDpmEligibleRowsFromPreview"
              >
                {{ isUploading ? 'Processing...' : `Upload ${dpmRawSoTotalPoEligible} Data Matched` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showUploadModal"
        class="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/45 p-2 sm:p-4 lg:items-center lg:p-6"
      >
        <div
          class="relative z-[10000] my-2 w-full max-h-[calc(100dvh-1rem)] overflow-hidden rounded-[20px] bg-white shadow-2xl ring-1 ring-slate-200/70 transition-[max-width] duration-200 sm:my-0 sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px] lg:max-h-[calc(100dvh-3rem)]"
          :class="
            isFtiSoUpload && ftiAdditionalOrderEnabled
              ? 'max-w-[1080px]'
              : 'max-w-[620px]'
          "
        >
          <form
            ref="uploadFormScrollRef"
            class="max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain sm:max-h-[calc(100dvh-2rem)] lg:max-h-[calc(100dvh-3rem)]"
            style="scrollbar-gutter: stable;"
            @submit.prevent="submitUploadForm"
          >
            <div class="sticky top-0 z-[30] flex items-center justify-between !border-b !border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4 rounded-t-[20px] sm:rounded-t-[28px]">
              <h3 class="text-xl font-bold text-gray-900 sm:text-2xl">UPLOAD FILE FORM</h3>

            <button
              type="button"
              class="w-9 h-9 rounded-full flex items-center justify-center !border !border-slate-300 bg-white text-gray-600 font-bold text-lg hover:!border-red-200 hover:bg-red-100 hover:text-red-600 active:scale-95 transition-all duration-200"
              @click="closeUploadModal"
            >
              X
            </button>
          </div>

            <div class="relative overflow-visible px-4 py-3 sm:px-6">
            <div class="grid grid-cols-1 gap-4 overflow-visible">
              <!-- CUSTOMER -->
              <div class="flex flex-col gap-2">
                <label class="text-md font-semibold text-slate-700"> Customer </label>

                <div class="relative">
                  <button
                    type="button"
                    class="group flex h-[48px] w-full items-center justify-between rounded-2xl !border !border-solid !border-slate-300 bg-white px-4 text-left text-sm text-slate-800 shadow-[0_2px_8px_rgba(15,23,42,0.04)] outline-none transition-all duration-200 hover:!border-blue-400 hover:shadow-[0_5px_16px_rgba(37,99,235,0.10)] focus:!border-blue-500 focus:ring-2 focus:ring-blue-100"
                    @click="toggleUploadCustomerDropdown"
                  >
                    <span
                      class="transition-colors duration-200 group-hover:text-slate-900"
                      :class="selectedCustomerUpload ? 'text-slate-700 font-medium' : 'text-slate-400'"
                    >
                      {{ selectedUploadCustomerLabel || 'Select Customer' }}
                    </span>

                    <svg
                      class="h-5 w-5 text-slate-400 transition-all duration-200 group-hover:text-blue-600"
                      :class="showCustomerDropdown ? 'rotate-180' : ''"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                      />
                    </svg>
                  </button>

                  <div
                    v-if="showCustomerDropdown"
                    class="absolute left-0 right-0 top-[48px] z-[10080] max-h-55 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-1 ring-slate-100"
                  >
                    <button
                      type="button"
                      class="mb-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-400 transition-all duration-150 hover:bg-slate-50"
                      @click="selectCustomerUpload('')"
                    >
                      Select Customer
                    </button>

                    <button
                      v-for="option in uploadCustomerOptions"
                      :key="option.value"
                      type="button"
                      class="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-all duration-150"
                      :class="
                        selectedCustomerUpload === option.value
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                      "
                      @click="selectCustomerUpload(option.value)"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>

                <div
                  v-if="isAdmP1P4CombinedUpload"
                  class="rounded-xl !border !border-blue-100 bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-700"
                >
                  <span class="font-semibold">ADM P1 & P4:</span>
                  satu file boleh berisi D101 dan D104. Saat Preview, data tetap dipisahkan
                  menjadi tab ADM P1 dan ADM P4 agar mudah dicek sebelum Submit.
                </div>
              </div>

              <!-- UPLOAD PERIOD -->
              <div class="flex flex-col gap-2">
                <label class="text-md font-semibold text-slate-700">
                  Bulan Upload
                </label>

                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-4 top-1/2 z-[1] flex -translate-y-1/2 items-center text-blue-600"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      class="h-4 w-4"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
                      />
                    </svg>
                  </span>

                  <input
                    v-model="selectedUploadPeriod"
                    type="month"
                    required
                    :disabled="isAnalyzingUploadPeriods || isPreviewLoading || (isMesSoUpload && mesSoUploadFiles.length > 0) || (isFtiSoUpload && ftiAdditionalOrderEnabled && ftiAdditionalOrderMode === 'OCR')"
                    class="h-[48px] w-full rounded-2xl !border !border-solid !border-slate-300 bg-white pl-11 pr-4 text-sm font-medium text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.04)] outline-none transition-all duration-200 hover:!border-blue-400 focus:!border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-wait disabled:bg-slate-50 disabled:text-slate-400"
                    @change="handleSelectedUploadPeriodChange()"
                  />
                </div>

                <p class="px-1 text-[10px] leading-relaxed text-slate-400">
                  <template v-if="isMesSoUpload">
                    MES membaca periode otomatis dari Delivery Date pada PDF Purchase Order / RFQ. Setelah PDF dipilih, Bulan Upload mengikuti hasil parser dan dikunci agar sesuai dokumen.
                  </template>
                  <template v-else-if="isFtiSoUpload">
                    <template v-if="ftiAdditionalOrderEnabled && ftiAdditionalOrderMode === 'MANUAL'">
                      Additional Order manual memakai Raw MDFO FTI aktif pada bulan terpilih. Part No dan Part Name diambil otomatis dari MDFO; Order Date dan Delivery Date dibentuk otomatis dari plan hari kerja.
                    </template>
                    <template v-else-if="ftiAdditionalOrderEnabled">
                      Mode OCR membaca periode otomatis dari Delivery Date PDF. Bulan Upload akan terkunci setelah Preview PDF berhasil.
                    </template>
                    <template v-else>
                      FTI tidak membutuhkan upload file. Raw Order digenerate langsung dari ZSTT FTI pada periode terpilih; hanya alokasi Qty ZSTT yang lebih dari 0 yang ditampilkan.
                    </template>
                  </template>
                  <template v-else-if="isDpmSoUpload">
                    DPM mengikuti kolom Delivery Date pada file Excel. Bulan default adalah bulan sekarang dan otomatis menyesuaikan dengan periode yang terdeteksi dari file.
                  </template>
                  <template v-else-if="isDcwaSoUpload">
                    Regular DCWA dibagi dari kolom Periode Excel. Special Order dibaca langsung dari PDF dan periodenya mengikuti ETD. JOB Number keduanya diambil dari Raw MDFO DCWA.
                  </template>
                  <template v-else-if="isAsiAdmSoUpload">
                    ASI ADM dicocokkan ke MDFO pada bulan terpilih berdasarkan Part Number Final dan Qty N, lalu tanggal/Qty diambil dari daily MDFO.
                  </template>
                  <template v-else-if="isGayaSoUpload">
                    Periode Gaya Motor ditentukan dari Agreement No (PO) pada PDF dan tanggal DELIVERY pada nama file. Order Date dan Delivery Date memakai tanggal nama file yang sama. Jika Agreement No yang sama sudah ada di bulan sebelumnya, periode tetap mengikuti bulan sebelumnya. Cycle tetap dibaca dari nama file CYCLE 1 / CYCLE 2.
                  </template>
                  <template v-else-if="isNtcSoUpload">
                    NTC dibagi berdasarkan kolom Period. Contoh 2609 = September 2026.
                  </template>
                  <template v-else-if="isTmminSoUpload">
                    TMMIN dibagi berdasarkan 6 digit awal nomor PO (YYYYMM). Contoh 202607 = Juli 2026, 202608 = Agustus 2026.
                  </template>
                  <template v-else>
                    ADM tetap divalidasi dari kolom Del. Date.
                  </template>
                  Hanya data periode
                  <span class="font-semibold text-blue-600">
                    {{ selectedUploadPeriodLabel || selectedUploadPeriod }}
                  </span>
                  yang dapat diupload.
                </p>

                <div
                  v-if="isAnalyzingUploadPeriods"
                  class="flex items-center gap-2 rounded-xl !border !border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-medium text-blue-700"
                >
                  <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.25" stroke-width="3" />
                    <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                  </svg>
                  {{
                    isDpmSoUpload
                      ? 'Mendeteksi bulan Delivery Date DPM dari file...'
                      : isDcwaSoUpload
                      ? 'Membaca Excel/PDF dan mendeteksi periode DCWA...'
                      : isGayaSoUpload
                        ? 'Membaca PDF dan mendeteksi Agreement No + tanggal DELIVERY dari nama file Gaya Motor...'
                      : isNtcSoUpload
                        ? 'Mendeteksi periode dari kolom Period NTC...'
                        : isTmminSoUpload
                        ? 'Mendeteksi periode dari nomor PO TMMIN...'
                        : 'Mendeteksi bulan Delivery Date dari file...'
                  }}
                </div>

                <div
                  v-else-if="hasDetectedUploadPeriods"
                  class="flex flex-wrap items-center gap-1.5 px-1"
                >
                  <span class="text-[10px] font-medium text-slate-400">Terdeteksi:</span>

                  <button
                    v-for="option in uploadDeliveryPeriodOptions"
                    :key="`upload-period-chip-${option.period}`"
                    type="button"
                    class="rounded-full !border px-2.5 py-1 text-[10px] font-semibold transition-all"
                    :class="
                      option.period === selectedUploadPeriod
                        ? '!border-blue-200 bg-blue-50 text-blue-700'
                        : '!border-slate-200 bg-white text-slate-500 hover:!border-blue-200 hover:text-blue-600'
                    "
                    @click="selectPendingUploadPeriod(option.period); confirmUploadDeliveryPeriodChoice()"
                  >
                    {{ option.label }} · {{ option.count }} data
                  </button>
                </div>
              </div>



              <!-- SOURCE ORDER FTI -->
              <div v-if="isFtiSoUpload" class="flex flex-col gap-2">
                <div class="flex items-center justify-between gap-3">
                  <label class="text-md font-semibold text-slate-700"> Source Order </label>

                  <button
                    type="button"
                    class="inline-flex h-8 items-center gap-1.5 rounded-xl !border px-3 text-[11px] font-semibold transition-all"
                    :class="
                      ftiAdditionalOrderEnabled
                        ? '!border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'
                        : '!border-slate-300 bg-white text-slate-600 hover:!border-blue-300 hover:text-blue-700'
                    "
                    @click="toggleFtiAdditionalOrder"
                  >
                    <svg v-if="!ftiAdditionalOrderEnabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                      <path stroke-linecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                      <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
                    </svg>
                    {{ ftiAdditionalOrderEnabled ? 'Tutup Additional Order' : 'Additional Order' }}
                  </button>
                </div>

                <div
                  class="rounded-2xl !border p-4 transition-all"
                  :class="
                    ftiAdditionalOrderEnabled
                      ? '!border-slate-200 bg-slate-50/70 opacity-70'
                      : '!border-blue-200 bg-blue-50/70'
                  "
                >
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span
                          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                          :class="ftiAdditionalOrderEnabled ? 'bg-slate-400' : 'bg-blue-600'"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-[18px] w-[18px]">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v6h6M20 20v-6h-6" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5.5 14a7 7 0 0 0 11.8 3M18.5 10A7 7 0 0 0 6.7 7" />
                          </svg>
                        </span>
                        <div>
                          <p class="text-sm font-bold text-slate-800">Generate dari ZSTT FTI</p>
                          <p class="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                            Flow reguler tetap sama. Additional Order tidak mengubah ZSTT/MDFO yang sudah ada.
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      :disabled="ftiAdditionalOrderEnabled || !canOpenUploadPreview"
                      class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl !border !border-blue-300 bg-white px-4 text-xs font-semibold text-blue-700 shadow-sm transition-all hover:!border-blue-500 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                      @click="openUploadPreview"
                    >
                      <svg v-if="!isPreviewLoading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                      <span v-else class="h-4 w-4 animate-spin rounded-full !border-2 !border-blue-200 !border-t-blue-600"></span>
                      {{ isPreviewLoading ? 'Membaca ZSTT...' : 'Preview Generate' }}
                    </button>
                  </div>
                </div>

                <div
                  v-if="ftiAdditionalOrderEnabled"
                  class="rounded-2xl !border !border-orange-200 bg-orange-50/60 p-4"
                >
                  <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div class="flex items-start gap-2">
                      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                      <div>
                        <p class="text-sm font-bold text-slate-800">Additional Order FTI</p>
                        <p class="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                          Default Manual. Part hanya berasal dari MDFO aktif; sistem membagi Qty ke hari kerja, melewati Sabtu/Minggu, lalu sisa ditempatkan di akhir.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      class="inline-flex h-8 items-center gap-1.5 rounded-xl !border px-3 text-[10px] font-semibold transition-all"
                      :class="ftiAdditionalOrderMode === 'OCR' ? '!border-orange-300 bg-orange-100 text-orange-700' : '!border-slate-300 bg-white text-slate-600 hover:!border-orange-300 hover:text-orange-700'"
                      @click="setFtiAdditionalOrderMode(ftiAdditionalOrderMode === 'OCR' ? 'MANUAL' : 'OCR')"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 5h18M5 3v4m14-4v4M5 11h14M7 15h10M9 19h6" />
                      </svg>
                      {{ ftiAdditionalOrderMode === 'OCR' ? 'Kembali Manual' : 'OCR PDF' }}
                    </button>
                  </div>

                  <!-- DEFAULT: MANUAL ADDITIONAL ORDER -->
                  <div v-if="ftiAdditionalOrderMode === 'MANUAL'" class="space-y-3">
                    <div class="overflow-hidden rounded-xl !border !border-slate-200 bg-white">
                      <div class="overflow-x-auto">
                        <table class="w-full min-w-[850px] border-collapse text-xs">
                          <thead>
                            <tr class="bg-slate-50 text-slate-700">
                              <th class="!border-b !border-r !border-slate-200 px-3 py-2 text-left">Part No</th>
                              <th class="!border-b !border-r !border-slate-200 px-3 py-2 text-left">Part Name</th>
                              <th class="!border-b !border-r !border-slate-200 px-3 py-2 text-left">PO Number</th>
                              <th class="!border-b !border-slate-200 px-3 py-2 text-right">Qty Additional</th>
                            </tr>
                          </thead>
                          <tbody v-if="ftiAdditionalManualParts.length > 0">
                            <tr v-for="part in ftiAdditionalManualParts" :key="`fti-manual-${part.part_no}`">
                              <td class="!border-b !border-r !border-slate-200 px-3 py-2">
                                <input
                                  :value="part.part_no"
                                  readonly
                                  class="h-9 w-full min-w-[170px] rounded-lg !border !border-slate-200 bg-slate-50 px-2 font-semibold text-slate-700 outline-none"
                                />
                              </td>
                              <td class="!border-b !border-r !border-slate-200 px-3 py-2">
                                <input
                                  :value="part.part_name"
                                  readonly
                                  class="h-9 w-full min-w-[260px] rounded-lg !border !border-slate-200 bg-slate-50 px-2 text-slate-600 outline-none"
                                />
                              </td>
                              <td class="!border-b !border-r !border-slate-200 px-3 py-2">
                                <input
                                  :value="ftiAdditionalManualPoNumber"
                                  type="text"
                                  inputmode="numeric"
                                  pattern="[0-9]*"
                                  maxlength="10"
                                  placeholder="PO Number"
                                  class="h-9 w-full min-w-[150px] rounded-lg !border bg-white px-2 font-medium text-slate-700 outline-none transition"
                                  :class="
                                    ftiAdditionalManualPoNumberLength > 0 &&
                                    !isFtiAdditionalManualPoNumberValid
                                      ? '!border-red-300 focus:!border-red-400 focus:ring-2 focus:ring-red-100'
                                      : '!border-slate-300 focus:!border-orange-400 focus:ring-2 focus:ring-orange-100'
                                  "
                                  @input="onFtiAdditionalManualPoNumberInput"
                                />
                              </td>
                              <td class="!border-b !border-slate-200 px-3 py-2 text-right">
                                <input
                                  :value="ftiAdditionalManualQtyDrafts[part.part_no] ?? ''"
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder="0"
                                  class="h-9 w-32 rounded-lg !border !border-slate-300 bg-white px-2 text-right font-semibold text-slate-700 outline-none focus:!border-orange-400 focus:ring-2 focus:ring-orange-100"
                                  @input="onFtiAdditionalManualQtyInput(part.part_no, $event)"
                                />
                              </td>
                            </tr>
                          </tbody>
                          <tbody v-else>
                            <tr>
                              <td colspan="4" class="px-4 py-6 text-center text-xs text-slate-400">
                                {{ isLoadingFtiAdditionalManualParts ? 'Membaca part dari MDFO FTI...' : 'Part MDFO FTI periode ini belum tersedia.' }}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div
                      v-if="ftiAdditionalManualPoNumberWarning"
                      class="flex items-center justify-between gap-3 rounded-xl !border !border-red-200 bg-red-50 px-3 py-2"
                    >
                      <p class="text-[10px] font-semibold text-red-600">
                        {{ ftiAdditionalManualPoNumberWarning }}
                      </p>
                      <span class="shrink-0 text-[10px] font-bold text-red-500">
                        {{ ftiAdditionalManualPoNumberLength }}/10 digit
                      </span>
                    </div>

                    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p class="text-[10px] leading-relaxed text-slate-500">
                        Part No dan Part Name readonly dari MDFO. PO Number FTI wajib 10 digit. Qty kosong/0 dilewati. Order Date = Delivery Date dan ditentukan otomatis saat Preview Plan.
                      </p>
                      <button
                        type="button"
                        :disabled="!canOpenUploadPreview"
                        class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                        @click="refreshFtiAdditionalManualPreview(true)"
                      >
                        <svg v-if="!isPreviewLoading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z" />
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                        <span v-else class="h-4 w-4 animate-spin rounded-full !border-2 !border-orange-200 !border-t-white"></span>
                        {{ isPreviewLoading ? 'Membuat Plan...' : 'Preview Plan Order' }}
                      </button>
                    </div>
                  </div>

                  <!-- OCR LEGACY: DIPERTAHANKAN -->
                  <div v-else class="space-y-3">
                    <div class="rounded-xl !border !border-orange-200 bg-white px-3 py-2 text-[10px] leading-relaxed text-orange-700">
                      Mode OCR lama tetap tersedia. PO Number, Qty dan tanggal dibaca dari Purchase Order PDF.
                    </div>

                    <input
                      id="ftiAdditionalOrderFileInput"
                      type="file"
                      accept=".pdf,application/pdf"
                      class="hidden"
                      @change="onFtiAdditionalOrderFileChange"
                    />

                    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label
                        for="ftiAdditionalOrderFileInput"
                        class="flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-between rounded-xl !border !border-slate-300 bg-white px-3 transition-all hover:!border-orange-300"
                      >
                        <div class="flex min-w-0 items-center gap-2">
                          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <path stroke-linecap="round" stroke-linejoin="round" d="M14 2v6h6" />
                            </svg>
                          </span>
                          <span class="truncate text-xs font-medium" :class="ftiAdditionalOrderFile ? 'text-slate-700' : 'text-slate-400'">
                            {{ ftiAdditionalOrderFile?.name || 'Pilih PDF Purchase Order FTI' }}
                          </span>
                        </div>
                        <span class="ml-2 shrink-0 text-[10px] font-semibold text-orange-600">Browse</span>
                      </label>

                      <button
                        type="button"
                        :disabled="!ftiAdditionalOrderFile || isPreviewLoading"
                        class="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl !border !border-orange-300 bg-white px-4 text-xs font-semibold text-orange-700 transition-all hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                        @click="refreshFtiAdditionalOrderPreview(true)"
                      >
                        <svg v-if="!isPreviewLoading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z" />
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                        <span v-else class="h-4 w-4 animate-spin rounded-full !border-2 !border-orange-200 !border-t-orange-600"></span>
                        {{ isPreviewLoading ? 'Membaca PDF...' : 'Preview OCR' }}
                      </button>
                    </div>
                  </div>

                  <!-- STATUS KONFIRMASI SCHEDULE ADDITIONAL ORDER -->
                  <div
                    v-if="ftiAdditionalOrderPreview"
                    class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl !border px-3 py-2"
                    :class="
                      ftiAdditionalOrderScheduleConfirmed
                        ? '!border-emerald-200 bg-emerald-50'
                        : '!border-orange-200 bg-orange-100/70'
                    "
                  >
                    <div class="flex min-w-0 items-center gap-2">
                      <span
                        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        :class="
                          ftiAdditionalOrderScheduleConfirmed
                            ? 'bg-emerald-500 text-white'
                            : 'bg-orange-500 text-white'
                        "
                      >
                        {{ ftiAdditionalOrderScheduleConfirmed ? '✓' : '!' }}
                      </span>
                      <p
                        class="text-[10px] font-medium"
                        :class="
                          ftiAdditionalOrderScheduleConfirmed
                            ? 'text-emerald-700'
                            : 'text-orange-700'
                        "
                      >
                        {{
                          ftiAdditionalOrderScheduleConfirmed
                            ? 'Schedule sudah dikonfirmasi. Klik Submit untuk generate Raw Order, Format SO, dan Tracking.'
                            : 'Schedule belum dikonfirmasi. Submit utama belum akan memproses Additional Order.'
                        }}
                      </p>
                    </div>

                    <button
                      type="button"
                      class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg !border px-3 text-[10px] font-semibold transition"
                      :class="
                        ftiAdditionalOrderScheduleConfirmed
                          ? '!border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100'
                          : '!border-orange-300 bg-white text-orange-700 hover:bg-orange-100'
                      "
                      @click="openFtiAdditionalOrderConfirmedSchedule"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        class="h-3.5 w-3.5"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                      {{ ftiAdditionalOrderScheduleConfirmed ? 'Schedule Terkonfirmasi' : 'Buka Schedule' }}
                    </button>
                  </div>

                  <div
                    v-else
                    class="mt-3 rounded-xl !border !border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-medium text-amber-700"
                  >
                    Preview dan konfirmasi Schedule Additional Order terlebih dahulu sebelum Submit.
                  </div>
                </div>
              </div>

              <!-- UPLOAD FILE -->
              <div v-else class="flex flex-col gap-2">
                <label class="text-md font-semibold text-slate-700"> Upload File </label>

                <div class="flex items-center gap-3">
                  <!-- INPUT ASLI -->
                  <input
                    ref="uploadFileInput"
                    id="uploadFileInput"
                    type="file"
                    :accept="isMesSoUpload ? '.pdf,application/pdf' : isDcwaSoUpload ? '.xlsx,.xls,.pdf,application/pdf' : isAsiAdmSoUpload ? '.pdf,application/pdf' : isGayaSoUpload ? '.pdf,application/pdf' : isNtcSoUpload ? '.csv,text/csv' : isTmminSoUpload ? '.txt,.zip,.rar,text/plain,application/zip,application/x-rar-compressed' : '.xlsx,.xls'"
                    multiple
                    class="hidden"
                    @change="onUploadFileChange"
                  />

                  <!-- CUSTOM FILE BUTTON -->
                  <button
                    type="button"
                    class="group flex h-[48px] min-w-0 flex-1 items-center justify-between rounded-2xl !border !border-solid !border-slate-300 bg-white px-3 text-left shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-200 hover:!border-blue-400 hover:shadow-[0_5px_16px_rgba(37,99,235,0.10)] focus:!border-blue-500 focus:ring-2 focus:ring-blue-100"
                    @click="openUploadFilePicker"
                  >
                    <div class="flex min-w-0 items-center gap-3">
                      <span
                        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-all duration-200 group-hover:bg-blue-100"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-[18px] w-[18px]">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                          />

                          <path stroke-linecap="round" stroke-linejoin="round" d="M14 2v6h6" />

                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-6m0 0-2.5 2.5M12 12l2.5 2.5" />
                        </svg>
                      </span>

                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium" :class="uploadFileName ? 'text-slate-700' : 'text-slate-400'">
                          {{
                            uploadFileName ||
                            (isMesSoUpload
                              ? 'Select PDF Purchase Order / RFQ MES'
                              : isDcwaSoUpload
                              ? 'Select Excel + PDF Regular / PDF Special Order'
                              : isAsiAdmSoUpload
                                ? 'Select PDF Purchase Order ASI ADM'
                              : isGayaSoUpload
                                ? 'Select PDF Gaya Motor'
                              : isDpmSoUpload
                                ? 'Select Excel Delivery Instruction DPM'
                              : isNtcSoUpload
                                ? 'Select CSV NTC'
                                : isTmminSoUpload
                                  ? 'Select TXT / ZIP / RAR'
                                  : 'Select Excel file')
                          }}
                        </p>

                        <p class="text-[10px] text-slate-400">
                          {{
                            isMesSoUpload
                              ? (
                                  isPreviewLoading
                                    ? 'Membaca text PDF MES dan memvalidasi Part Number terhadap Contract...'
                                    : 'PDF text-based · PO, Description, Qty, dan Delivery Date diparse otomatis'
                                )
                              : isDcwaSoUpload
                              ? (
                                  isPreviewLoading
                                    ? 'Membaca Excel/PDF dan memvalidasi PO + JOB Number DCWA...'
                                    : 'Regular: Excel + PDF · Special Order: PDF saja · JOB memakai exact Part No'
                                )
                              : isAsiAdmSoUpload
                                ? (
                                  isPreviewLoading
                                    ? 'Membaca Purchase Order PDF dan mencocokkan MDFO ASI ADM...'
                                    : 'Multiple PDF; REGULAR / SERVICE PART dideteksi dari Note'
                                )
                              : isGayaSoUpload
                                ? (
                                  isPreviewLoading
                                    ? 'Membaca Delivery Note PDF Gaya Motor...'
                                    : 'Multiple PDF dapat ditambahkan; Cycle dibaca dari nama file'
                                )
                              : isDpmSoUpload
                                ? (
                                    isPreviewLoading
                                      ? 'Membaca multiple Excel dan memeriksa Contract DPM...'
                                      : 'XLSX/XLS multiple; Part Number dipetakan dari Description'
                                  )
                              : isNtcSoUpload
                                ? (
                                    isPreviewLoading
                                      ? 'Membaca CSV dan mendeteksi Site / Period...'
                                      : 'CSV NTC semicolon-delimited, multiple file dapat ditambahkan'
                                  )
                                : isTmminSoUpload
                                ? (
                                    isPreviewLoading
                                      ? 'Mendeteksi TXT di dalam archive...'
                                      : 'TXT / ZIP / RAR T034 / TMAJ, archive otomatis diekstrak'
                                  )
                                : 'XLSX atau XLS, pilihan berikutnya akan ditambahkan'
                          }}
                        </p>
                      </div>
                    </div>

                    <span
                      class="ml-3 shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition-all duration-200 group-hover:bg-blue-600 group-hover:text-white"
                    >
                      Browse
                    </span>
                  </button>

                  <!-- PREVIEW FILE -->
                  <button
                    type="button"
                    :title="
                      isMesSoUpload
                        ? (
                            mesSoUploadFiles.length === 0
                              ? 'Pilih PDF Purchase Order / RFQ MES terlebih dahulu'
                              : 'Preview hasil parser Sales Order MES'
                          )
                        : isDcwaSoUpload
                        ? (
                            dcwaSoHasRequiredFileTypes
                              ? 'Preview Raw Sales Order DCWA'
                              : 'Pilih minimal satu PDF DCWA'
                          )
                        : isGayaSoUpload
                          ? (
                            gayaSoUploadFiles.length === 0
                              ? 'Pilih PDF Gaya Motor terlebih dahulu'
                              : 'Preview Raw Sales Order Gaya Motor'
                          )
                        : isNtcSoUpload
                          ? (
                              ntcSoUploadFiles.length === 0
                                ? 'Pilih file CSV NTC terlebih dahulu'
                                : 'Preview Raw Sales Order NTC'
                            )
                          : isTmminSoUpload
                          ? (
                              !uploadFiles
                                ? 'Pilih file TXT / ZIP / RAR terlebih dahulu'
                                : 'Preview TXT hasil deteksi'
                            )
                          : (
                              !uploadFiles
                                ? 'Pilih file terlebih dahulu'
                                : showExcelPasswordInput && !hasExcelPassword
                                  ? 'Isi password Excel terlebih dahulu'
                                  : 'Preview file'
                            )
                    "
                    :aria-label="
                      canOpenUploadPreview
                        ? (
                            isMesSoUpload
                              ? 'Buka preview Raw Sales Order MES'
                              : isDcwaSoUpload
                              ? 'Buka preview Raw Sales Order DCWA'
                              : isAsiAdmSoUpload
                                ? 'Buka preview Raw Ordering ASI ADM'
                              : isGayaSoUpload
                                ? 'Buka preview Raw Sales Order Gaya Motor'
                              : isNtcSoUpload
                                ? 'Buka preview Raw Sales Order NTC'
                                : isTmminSoUpload
                                ? 'Buka preview hasil konversi TXT'
                                : 'Buka preview file'
                          )
                        : showExcelPasswordInput && !hasExcelPassword
                          ? 'Password Excel belum diisi'
                          : 'Preview file belum tersedia'
                    "
                    :disabled="!canOpenUploadPreview"
                    class="relative flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-2xl !border !border-solid bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    :class="
                      canOpenUploadPreview
                        ? (
                            !hasReviewedCurrentUploadPreview
                              ? `
                                  !border-blue-500
                                  bg-blue-50
                                  text-blue-700
                                  ring-4
                                  ring-blue-100
                                  animate-pulse
                                  hover:bg-blue-100
                                `
                              : `
                                  !border-blue-300
                                  text-blue-600
                                  hover:!border-blue-500
                                  hover:bg-blue-50
                                  hover:text-blue-700
                                `
                          )
                        : `
                              !border-slate-300
                              text-slate-400
                              hover:!border-slate-400
                              hover:bg-slate-50
                              hover:text-slate-500
                            `
                    "
                    @click="openUploadPreviewWithGuidance"
                  >
                    <span
                      v-if="canOpenUploadPreview && !hasReviewedCurrentUploadPreview"
                      class="absolute -right-1 -top-1 flex h-3 w-3"
                      aria-hidden="true"
                    >
                      <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-70"></span>
                      <span class="relative inline-flex h-3 w-3 rounded-full bg-blue-600 ring-2 ring-white"></span>
                    </span>
                    <!-- EYE TERBUKA: preview siap dibuka -->
                    <svg
                      v-if="canOpenUploadPreview"
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z"
                      />

                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>

                    <!-- EYE DICORET: preview belum dapat dibuka -->
                    <svg
                      v-else
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18" />

                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />

                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M9.88 4.24A9.7 9.7 0 0 1 12 4c6 0 10 8 10 8a17.6 17.6 0 0 1-2.3 3.5"
                      />

                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6.61 6.61C3.62 8.63 2 12 2 12s4 8 10 8a9.8 9.8 0 0 0 5.39-1.61"
                      />
                    </svg>
                  </button>
                </div>

                <!-- INFORMASI FILE TERPILIH -->
                <div v-if="uploadFileName" class="flex items-center gap-1.5 px-1 text-xs text-emerald-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m5 12 4 4L19 6" />
                  </svg>

                  <span class="truncate"> File berhasil dipilih </span>
                </div>

                <!-- GUIDANCE PREVIEW: tidak memblokir Submit, hanya membantu user selalu cek hasil parsing -->
                <div
                  v-if="shouldShowUploadPreviewGuidance"
                  class="flex flex-col gap-2 rounded-2xl !border px-3 py-3 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between"
                  :class="
                    hasReviewedCurrentUploadPreview
                      ? '!border-emerald-200 bg-emerald-50/80'
                      : canOpenUploadPreview
                        ? '!border-blue-200 bg-blue-50/90 shadow-[0_4px_14px_rgba(37,99,235,0.08)]'
                        : '!border-amber-200 bg-amber-50/80'
                  "
                >
                  <div class="flex min-w-0 items-start gap-2.5">
                    <span
                      class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                      :class="
                        hasReviewedCurrentUploadPreview
                          ? 'bg-emerald-100 text-emerald-700'
                          : canOpenUploadPreview
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                      "
                    >
                      <svg
                        v-if="hasReviewedCurrentUploadPreview"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        class="h-4 w-4"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="m5 12 4 4L19 6" />
                      </svg>
                      <svg
                        v-else
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        class="h-4 w-4"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </span>

                    <div class="min-w-0">
                      <p
                        class="text-xs font-bold"
                        :class="
                          hasReviewedCurrentUploadPreview
                            ? 'text-emerald-800'
                            : canOpenUploadPreview
                              ? 'text-blue-800'
                              : 'text-amber-800'
                        "
                      >
                        {{ uploadPreviewGuidanceTitle }}
                      </p>
                      <p
                        class="mt-0.5 text-[10px] leading-4"
                        :class="
                          hasReviewedCurrentUploadPreview
                            ? 'text-emerald-700'
                            : canOpenUploadPreview
                              ? 'text-blue-700'
                              : 'text-amber-700'
                        "
                      >
                        {{ uploadPreviewGuidanceMessage }}
                      </p>
                    </div>
                  </div>

                  <button
                    v-if="canOpenUploadPreview && !isAutoOpeningUploadPreview && !hasReviewedCurrentUploadPreview"
                    type="button"
                    class="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl !border !border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 shadow-sm transition-all hover:!border-blue-400 hover:bg-blue-600 hover:text-white active:scale-95"
                    @click="openUploadPreviewWithGuidance"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                    Buka Preview
                  </button>
                </div>

                <div
                  v-if="!isTmminSoUpload && !isNtcSoUpload && !isDpmSoUpload && !isAsiAdmSoUpload && !isGayaSoUpload && !isDcwaSoUpload && admUploadFiles.length > 0"
                  class="max-h-28 space-y-1 overflow-y-auto rounded-xl !border !border-slate-200 bg-slate-50 p-2"
                >
                  <div
                    v-for="(file, fileIndex) in admUploadFiles"
                    :key="`adm-${file.name}-${file.size}-${file.lastModified}`"
                    class="flex items-center justify-between gap-3 rounded-lg !border !border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <div class="min-w-0">
                      <p class="truncate font-medium text-slate-700" :title="file.name">
                        {{ file.name }}
                      </p>
                      <p class="text-[10px] text-slate-400">File {{ fileIndex + 1 }}</p>
                    </div>

                    <button
                      type="button"
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg !border !border-red-200 bg-red-50 text-red-500 transition-all hover:!border-red-300 hover:bg-red-100 hover:text-red-600 active:scale-90"
                      :aria-label="`Hapus ${file.name}`"
                      :title="`Hapus ${file.name}`"
                      @click="removeAdmUploadFile(fileIndex)"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div
                  v-if="isMesSoUpload && mesSoUploadFiles.length > 0"
                  class="max-h-32 space-y-1 overflow-y-auto rounded-xl !border !border-slate-200 bg-slate-50 p-2"
                >
                  <div
                    v-for="(file, fileIndex) in mesSoUploadFiles"
                    :key="`mes-${file.name}-${file.size}-${file.lastModified}`"
                    class="flex items-center justify-between gap-3 rounded-lg !border !border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <div class="min-w-0">
                      <p class="truncate font-medium text-slate-700" :title="file.name">
                        {{ file.name }}
                      </p>
                      <p class="text-[10px] text-slate-400">
                        PDF Purchase Order / RFQ MES · File {{ fileIndex + 1 }}
                      </p>
                    </div>

                    <button
                      type="button"
                      :disabled="isPreviewLoading || isUploading"
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg !border !border-red-200 bg-red-50 text-red-500 transition-all hover:!border-red-300 hover:bg-red-100 hover:text-red-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                      :aria-label="`Hapus ${file.name}`"
                      :title="`Hapus ${file.name}`"
                      @click="removeMesSoUploadFile(fileIndex)"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div
                  v-if="isDpmSoUpload && dpmSoUploadFiles.length > 0"
                  class="max-h-32 space-y-1 overflow-y-auto rounded-xl !border !border-slate-200 bg-slate-50 p-2"
                >
                  <div
                    v-for="(file, fileIndex) in dpmSoUploadFiles"
                    :key="`dpm-${file.name}-${file.size}-${file.lastModified}`"
                    class="flex items-center justify-between gap-3 rounded-lg !border !border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <div class="min-w-0">
                      <p class="truncate font-medium text-slate-700" :title="file.name">
                        {{ file.name }}
                      </p>
                      <p class="text-[10px] text-slate-400">
                        Excel Delivery Instruction DPM · File {{ fileIndex + 1 }}
                      </p>
                    </div>

                    <button
                      type="button"
                      :disabled="isPreviewLoading || isUploading"
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg !border !border-red-200 bg-red-50 text-red-500 transition-all hover:!border-red-300 hover:bg-red-100 hover:text-red-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                      :aria-label="`Hapus ${file.name}`"
                      :title="`Hapus ${file.name}`"
                      @click="removeDpmSoUploadFile(fileIndex)"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div
                  v-if="isDcwaSoUpload && dcwaSoUploadFiles.length > 0"
                  class="max-h-32 space-y-1 overflow-y-auto rounded-xl !border !border-slate-200 bg-slate-50 p-2"
                >
                  <div
                    v-for="(file, fileIndex) in dcwaSoUploadFiles"
                    :key="`dcwa-${file.name}-${file.size}-${file.lastModified}`"
                    class="flex items-center justify-between gap-3 rounded-lg !border !border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <div class="min-w-0">
                      <p class="truncate font-medium text-slate-700" :title="file.name">
                        {{ file.name }}
                      </p>
                      <p class="text-[10px] text-slate-400">
                        {{ /\.pdf$/i.test(file.name) ? 'PDF Delivery Note / Special Order' : 'Excel Raw Order Regular' }} · File {{ fileIndex + 1 }}
                      </p>
                    </div>

                    <button
                      type="button"
                      :disabled="isPreviewLoading || isUploading"
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg !border !border-red-200 bg-red-50 text-red-500 transition-all hover:!border-red-300 hover:bg-red-100 hover:text-red-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                      :aria-label="`Hapus ${file.name}`"
                      :title="`Hapus ${file.name}`"
                      @click="removeDcwaSoUploadFile(fileIndex)"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div
                  v-if="isAsiAdmSoUpload && asiAdmSoUploadFiles.length > 0"
                  class="max-h-32 space-y-1 overflow-y-auto rounded-xl !border !border-slate-200 bg-slate-50 p-2"
                >
                  <div
                    v-for="(file, fileIndex) in asiAdmSoUploadFiles"
                    :key="`asi-adm-${file.name}-${file.size}-${file.lastModified}`"
                    class="flex items-center justify-between gap-3 rounded-lg !border !border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <div class="min-w-0">
                      <p class="truncate font-medium text-slate-700" :title="file.name">
                        {{ file.name }}
                      </p>
                      <p class="text-[10px] text-slate-400">
                        PDF Purchase Order ASI ADM · File {{ fileIndex + 1 }}
                      </p>
                    </div>

                    <button
                      type="button"
                      :disabled="isPreviewLoading || isUploading"
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg !border !border-red-200 bg-red-50 text-red-500 transition-all hover:!border-red-300 hover:bg-red-100 hover:text-red-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                      :aria-label="`Hapus ${file.name}`"
                      :title="`Hapus ${file.name}`"
                      @click="removeAsiAdmSoUploadFile(fileIndex)"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <!-- ASI ADM: tipe PDF wajib seragam. -->
                <div
                  v-if="isAsiAdmSoUpload && asiAdmSoUploadFiles.length > 0"
                  class="space-y-2"
                >
                  <div
                    v-if="isInspectingAsiAdmFiles"
                    class="flex items-center gap-2 rounded-xl !border !border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                  >
                    <span class="h-3.5 w-3.5 animate-spin rounded-full !border-2 !border-blue-300 !border-t-blue-600"></span>
                    Memeriksa tipe PDF ASI ADM...
                  </div>

                  <div
                    v-else-if="asiAdmDetectedOrderType"
                    class="flex items-start gap-3 rounded-xl !border px-3 py-2.5"
                    :class="
                      asiAdmDetectedOrderType === 'SERVICE PART'
                        ? '!border-amber-200 bg-amber-50'
                        : '!border-emerald-200 bg-emerald-50'
                    "
                  >
                    <div class="min-w-0 flex-1">
                      <div
                        class="text-xs font-bold"
                        :class="
                          asiAdmDetectedOrderType === 'SERVICE PART'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        "
                      >
                        {{ asiAdmDetectedOrderType }}
                      </div>
                      <p
                        class="mt-0.5 text-[11px] leading-relaxed"
                        :class="
                          asiAdmDetectedOrderType === 'SERVICE PART'
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        "
                      >
                        <template v-if="asiAdmDetectedOrderType === 'SERVICE PART'">
                          Service Part tidak mengambil tanggal dari MDFO. Delivery Date wajib diisi manual dan Part Number harus tersedia di Contract.
                        </template>
                        <template v-else>
                          Regular mengambil Order Date dan Delivery Date otomatis dari daily MDFO.
                        </template>
                      </p>
                    </div>
                  </div>

                  <!-- Khusus Service Part: Delivery Date manual dan wajib. -->
                  <div
                    v-if="asiAdmDetectedOrderType === 'SERVICE PART'"
                    class="rounded-xl !border !border-amber-200 bg-white p-3"
                  >
                    <label class="mb-1.5 block text-xs font-bold text-slate-700">
                      Delivery Date Service Part <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="asiAdmServicePartDeliveryDate"
                      type="date"
                      :min="`${selectedUploadPeriod}-01`"
                      class="h-10 w-full rounded-xl !border !border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:!border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <p class="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                      Order Date otomatis disamakan dengan Delivery Date. Tanggal wajib berada pada bulan
                      <span class="font-semibold text-slate-700">{{ selectedUploadPeriodLabel }}</span>.
                    </p>
                    <p class="mt-1 text-[11px] leading-relaxed text-amber-700">
                      Jika Part Number belum tersedia pada Contract, Preview akan menampilkan daftar yang dapat dicopy lalu dipaste ke Upload MDFO → Add Part.
                    </p>
                  </div>
                </div>

                <div
                  v-if="isGayaSoUpload && gayaSoUploadFiles.length > 0"
                  class="max-h-32 space-y-1 overflow-y-auto rounded-xl !border !border-slate-200 bg-slate-50 p-2"
                >
                  <div
                    v-for="(file, fileIndex) in gayaSoUploadFiles"
                    :key="`gaya-${file.name}-${file.size}-${file.lastModified}`"
                    class="flex items-center justify-between gap-3 rounded-lg !border !border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <div class="min-w-0">
                      <p class="truncate font-medium text-slate-700" :title="file.name">
                        {{ file.name }}
                      </p>
                      <p class="text-[10px] text-slate-400">
                        PDF Gaya Motor {{ fileIndex + 1 }}
                      </p>
                    </div>

                    <button
                      type="button"
                      :disabled="isPreviewLoading || isUploading"
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg !border !border-red-200 bg-red-50 text-red-500 transition-all hover:!border-red-300 hover:bg-red-100 hover:text-red-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                      :aria-label="`Hapus ${file.name}`"
                      :title="`Hapus ${file.name}`"
                      @click="removeGayaSoUploadFile(fileIndex)"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div
                  v-if="isNtcSoUpload && ntcSoUploadFiles.length > 0"
                  class="max-h-32 space-y-1 overflow-y-auto rounded-xl !border !border-slate-200 bg-slate-50 p-2"
                >
                  <div
                    v-for="(file, fileIndex) in ntcSoUploadFiles"
                    :key="`ntc-${file.name}-${file.size}-${file.lastModified}`"
                    class="flex items-center justify-between gap-3 rounded-lg !border !border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <div class="min-w-0">
                      <p class="truncate font-medium text-slate-700" :title="file.name">
                        {{ file.name }}
                      </p>
                      <p class="text-[10px] text-slate-400">
                        CSV NTC {{ fileIndex + 1 }}
                      </p>
                    </div>

                    <button
                      type="button"
                      :disabled="isPreviewLoading"
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg !border !border-red-200 bg-red-50 text-red-500 transition-all hover:!border-red-300 hover:bg-red-100 hover:text-red-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                      :aria-label="`Hapus ${file.name}`"
                      :title="`Hapus ${file.name}`"
                      @click="removeNtcSoUploadFile(fileIndex)"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div
                  v-if="
                    isTmminSoUpload &&
                    (tmminSoUploadFiles.length > 0 || isPreviewLoading)
                  "
                  class="max-h-32 space-y-1 overflow-y-auto rounded-xl !border !border-slate-200 bg-slate-50 p-2"
                >
                  <div
                    v-if="isPreviewLoading"
                    class="flex items-center gap-2 rounded-lg !border !border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700"
                  >
                    <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        stroke-opacity="0.25"
                        stroke-width="3"
                      />
                      <path
                        d="M21 12a9 9 0 0 1-9 9"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                      />
                    </svg>

                    <span>
                      Membaca archive dan mendeteksi file TXT TMMIN...
                    </span>
                  </div>

                  <div
                    v-for="(file, fileIndex) in tmminSoDetectedTxtFiles"
                    :key="file.key"
                    class="flex items-center justify-between gap-3 rounded-lg !border !border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <div class="min-w-0">
                      <p
                        class="truncate font-medium text-slate-700"
                        :title="file.entryName"
                      >
                        {{ file.name }}
                      </p>

                      <p class="truncate text-[10px] text-slate-400">
                        {{
                          file.archiveName
                            ? `TXT ${fileIndex + 1} • dari ${file.archiveName}`
                            : `TXT ${fileIndex + 1} • file langsung`
                        }}
                      </p>
                    </div>

                    <button
                      type="button"
                      :disabled="isPreviewLoading"
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg !border !border-red-200 bg-red-50 text-red-500 transition-all hover:!border-red-300 hover:bg-red-100 hover:text-red-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                      :aria-label="`Hapus ${file.name}`"
                      :title="`Jangan proses ${file.name}`"
                      @click="removeTmminDetectedTxtFile(file.key)"
                    >
                      ×
                    </button>
                  </div>

                  <div
                    v-if="
                      !isPreviewLoading &&
                      tmminSoUploadFiles.length > 0 &&
                      tmminSoDetectedTxtFiles.length === 0
                    "
                    class="rounded-lg !border !border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700"
                  >
                    Tidak ada TXT aktif. Pilih ulang TXT / ZIP / RAR atau Clear Data.
                  </div>
                </div>

                <div
                  v-if="isDcwaSoUpload"
                  class="rounded-xl !border !border-blue-100 bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-700"
                >
                  <strong>Regular:</strong> Excel A:W + PDF untuk PO.
                  <strong>Special Order:</strong> seluruh kolom Raw dibaca langsung dari PDF bertanda SPECIAL ORDER.
                  Kolom <strong>JOB Number</strong> keduanya diambil dari Raw MDFO DCWA revision terbaru berdasarkan exact Part No.
                </div>

                <div
                  v-if="isNtcSoUpload"
                  class="rounded-xl !border !border-blue-100 bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-700"
                >
                  Raw SO NTC diproses dari <strong>CSV semicolon-delimited</strong>.
                  Site <strong>PLANT-1</strong> diringkas sebagai NTC Plant 1 dan
                  <strong>PLANT-2</strong> sebagai NTC Plant 2. Arrival Date digunakan
                  sebagai Delivery Date dan Qty Total sebagai quantity preview.
                </div>

                <div
                  v-if="isTmminSoUpload"
                  class="rounded-xl !border !border-blue-100 bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-700"
                >
                  Raw SO TMMIN tetap diproses sebagai <strong>TXT tab-delimited</strong>.
                  ZIP / RAR hanya menjadi wadah upload dan otomatis diekstrak;
                  file selain TXT di dalam archive diabaikan. Baris dengan
                  <strong>KBN = 0</strong> otomatis dilewati.
                </div>
              </div>

              <!-- EXCEL PASSWORD -->
              <div v-if="showExcelPasswordInput" class="flex flex-col gap-2">
                <label class="text-md font-semibold text-slate-700"> Password Excel </label>

                <div class="relative">
                  <input
                    v-model="excelPassword"
                    :type="showExcelPassword ? 'text' : 'password'"
                    class="h-[42px] w-full rounded-2xl !border !border-gray-300 bg-white px-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-blue-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter Excel password"
                  />

                  <button
                    type="button"
                    @click="showExcelPassword = !showExcelPassword"
                    class="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                  >
                    <!-- EYE Terbuka -->
                    <svg
                      v-if="!showExcelPassword"
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0s-3-7-9-7-9 7-9 7 3 7 9 7 9-7 9-7z"
                      />
                    </svg>

                    <!-- Icon hide unhide password -->
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-6 0-9-7-9-7a17.48 17.48 0 013.41-4.59m3.13-2.12A9.96 9.96 0 0112 5c6 0 9 7 9 7a17.43 17.43 0 01-2.29 3.34M15 
                        12a3 3 0 00-4.24-2.76M3 3l18 18"
                      />
                    </svg>
                  </button>
                </div>

                <small class="text-xs text-slate-500">
                  Password diperlukan untuk file Excel yang terenkripsi. Setelah password selesai diisi, sistem otomatis mendeteksi bulan Del. Date tanpa menunggu Submit.
                </small>
              </div>
              <!-- UPLOAD BY -->
              <div ref="uploadBySectionRef" class="flex flex-col gap-2">
                <label class="text-md font-semibold text-slate-700"> Upload By </label>

                <div class="relative">
                  <button
                    type="button"
                    :disabled="!canSelectUploadUser"
                    class="group flex h-[48px] w-full items-center justify-between rounded-2xl !border !border-solid !border-slate-300 bg-white px-4 text-left text-sm text-slate-800 shadow-[0_2px_8px_rgba(15,23,42,0.04)] outline-none transition-all duration-200 hover:!border-blue-400 hover:shadow-[0_5px_16px_rgba(37,99,235,0.10)] focus:!border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:!border-slate-200 disabled:!bg-slate-100 disabled:shadow-none disabled:hover:!border-slate-200"
                    @click="toggleUploadUserDropdownAndScroll"
                  >
                    <span
                      class="transition-colors duration-200 group-hover:text-slate-900"
                      :class="selectedUploadUser ? 'text-slate-700 font-medium' : 'text-slate-400'"
                    >
                      {{ selectedUploadUser || 'Select User' }}
                    </span>

                    <svg
                      class="h-5 w-5 text-slate-400 transition-all duration-200 group-hover:text-blue-600"
                      :class="showUploadUserDropdown ? 'rotate-180' : ''"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                      />
                    </svg>
                  </button>

                  <div
                    v-if="showUploadUserDropdown && canSelectUploadUser"
                    class="absolute left-0 right-0 top-[48px] z-[10090] max-h-40 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-1 ring-slate-100"
                  >
                    <button
                      type="button"
                      class="mb-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-400 transition-all duration-150 hover:bg-slate-50"
                      @click="selectUploadUser('')"
                    >
                      Select User
                    </button>

                    <button
                      v-for="u in uploadFormUserOptions"
                      :key="u"
                      type="button"
                      class="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-all"
                      :class="selectedUploadUser === u ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-blue-50'"
                      @click="selectUploadUser(u)"
                    >
                      <span class="mr-2 w-3 h-3 rounded-full" :class="userColorClass(u)"> </span>

                      {{ u }}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

            <div class="sticky bottom-0 z-[30] flex flex-wrap items-center justify-end gap-2 !border-t !border-gray-200 bg-white px-4 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.04)] sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-4">
            <button
              type="button"
              class="h-10 min-w-[100px] flex-1 rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold sm:flex-none text-slate-600 transition-all duration-200 hover:!border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isUploading"
              @click="clearUploadFormData"
            >
              Clear Data
            </button>

            <button
              type="button"
              class="h-10 min-w-[90px] flex-1 rounded-xl !border !border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 sm:flex-none hover:bg-gray-100 hover:border-gray-400 hover:text-gray-900 active:scale-95 transition-all duration-200"
              @click="closeUploadModal"
            >
              Cancel
            </button>

            <button
              type="submit"
              :disabled="!permissions.create || !canSubmitUpload"
              :title="!permissions.create ? 'Tidak memiliki permission Create Upload SO' : (uploadSubmitDisabledReason || 'Submit Sales Order')"
              class="inline-flex h-10 min-w-[110px] flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_3px_6px_rgba(37,99,235,0.35)] transition-all duration-200 hover:bg-blue-700 active:scale-95 sm:flex-none disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
            >
              <svg
                v-if="isUploading"
                class="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />

                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
                />
              </svg>

              <span>{{ isUploading ? 'Uploading...' : 'Submit' }}</span>
            </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ======================================================= -->
    <!-- PILIH BULAN DELIVERY DATE - MULTI PERIOD                  -->
    <!-- ======================================================= -->
    <div
      v-if="showUploadModal && showUploadDeliveryPeriodChoice"
      class="fixed inset-0 z-[10120] flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-950/45 p-2 sm:p-4 lg:items-center lg:p-5"
    >
      <div class="my-2 flex max-h-[calc(100dvh-1rem)] w-full max-w-[540px] flex-col overflow-hidden rounded-[20px] !border !border-slate-200 bg-white shadow-2xl sm:my-0 sm:max-h-[calc(100dvh-2rem)] sm:rounded-[26px]">
        <div class="shrink-0 flex items-start justify-between gap-4 !border-b !border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <div class="mb-2 inline-flex items-center gap-2 rounded-full !border !border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-blue-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
              </svg>
              {{
                isDcwaSoUpload
                  ? (uploadDeliveryPeriodOptions.length > 1 ? 'Multi DCWA Period' : 'DCWA Period Detected')
                  : isGayaSoUpload
                    ? (uploadDeliveryPeriodOptions.length > 1 ? 'Multi Gaya Motor Period' : 'Gaya Motor Period Detected')
                  : isNtcSoUpload
                    ? (uploadDeliveryPeriodOptions.length > 1 ? 'Multi NTC Period' : 'NTC Period Detected')
                    : isTmminSoUpload
                    ? (uploadDeliveryPeriodOptions.length > 1 ? 'Multi PO Period' : 'PO Period Detected')
                    : (uploadDeliveryPeriodOptions.length > 1 ? 'Multi Delivery Month' : 'Delivery Month Detected')
              }}
            </div>

            <h3 class="text-lg font-bold text-slate-900">
              {{ isDcwaSoUpload ? 'Pilih Periode DCWA' : isGayaSoUpload ? 'Pilih Periode Gaya Motor' : isNtcSoUpload ? 'Pilih Periode NTC' : isTmminSoUpload ? 'Pilih Periode Nomor PO' : 'Pilih Bulan Delivery Date' }}
            </h3>

            <p class="mt-1 text-xs leading-relaxed text-slate-500">
              <template v-if="isDcwaSoUpload">
                Periode Regular dibaca dari Excel; periode Special Order dibaca dari ETD pada PDF. Pilih periode yang ingin dipreview dan diupload.
                PO dan JOB Number tetap divalidasi ulang untuk periode terpilih sebelum Submit.
              </template>
              <template v-else-if="isGayaSoUpload">
                <template v-if="uploadDeliveryPeriodOptions.length > 1">
                  PDF Gaya Motor yang dipilih terdeteksi pada lebih dari satu periode bisnis.
                  Periode dihitung dari Agreement No (PO) dan tanggal DELIVERY pada nama file. Pilih satu periode yang ingin dipreview dan diupload.
                </template>
                <template v-else>
                  Periode Agreement No + tanggal DELIVERY pada nama file berbeda dari bulan default/pilihan form.
                  Konfirmasi periode yang ingin digunakan.
                </template>
                PDF periode lain tetap berada di file sumber dan tidak ikut diproses pada upload ini.
              </template>
              <template v-else-if="isNtcSoUpload">
                <template v-if="uploadDeliveryPeriodOptions.length > 1">
                  File CSV NTC berisi lebih dari satu periode.
                  Periode dibaca dari kolom Period (YYMM). Pilih satu periode yang ingin dipreview dan diupload.
                </template>
                <template v-else>
                  Period pada CSV NTC berbeda dari bulan default/pilihan form.
                  Konfirmasi periode yang ingin digunakan.
                </template>
                Row periode lain tetap berada di CSV mentahan dan tidak ikut diproses pada upload ini.
              </template>
              <template v-else-if="isTmminSoUpload">
                <template v-if="uploadDeliveryPeriodOptions.length > 1">
                  File TMMIN berisi nomor PO dari lebih dari satu periode.
                  Periode dibaca dari 6 digit awal PO (YYYYMM). Pilih satu periode yang ingin dipreview dan diupload.
                </template>
                <template v-else>
                  Periode nomor PO pada file berbeda dari bulan default/pilihan form.
                  Konfirmasi periode PO yang ingin digunakan.
                </template>
                Row dengan periode PO lain tetap berada di TXT mentahan dan tidak ikut diproses pada upload ini.
              </template>
              <template v-else>
                <template v-if="uploadDeliveryPeriodOptions.length > 1">
                  File yang dipilih berisi lebih dari satu bulan Delivery Date.
                  Pilih satu bulan yang ingin dipreview dan diupload.
                </template>
                <template v-else>
                  Bulan Delivery Date pada file berbeda dari bulan default/pilihan form.
                  Konfirmasi periode file yang ingin digunakan.
                </template>
                Data bulan lain tetap berada di file mentahan dan tidak ikut diproses pada upload ini.
              </template>
            </p>
          </div>

          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full !border !border-slate-300 bg-white text-lg font-bold text-slate-500 transition hover:!border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95"
            @click="closeUploadDeliveryPeriodChoice()"
          >
            ×
          </button>
        </div>

        <div class="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          <button
            v-for="option in uploadDeliveryPeriodOptions"
            :key="`delivery-period-choice-${option.period}`"
            type="button"
            class="flex w-full items-center justify-between gap-4 rounded-2xl !border px-4 py-3.5 text-left transition-all duration-150 active:scale-[0.99]"
            :class="
              pendingUploadPeriod === option.period
                ? '!border-blue-500 bg-blue-50 shadow-[0_5px_18px_rgba(37,99,235,0.10)]'
                : '!border-slate-200 bg-white hover:!border-blue-300 hover:bg-blue-50/50'
            "
            @click="selectPendingUploadPeriod(option.period)"
          >
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border text-sm font-bold"
                :class="
                  pendingUploadPeriod === option.period
                    ? '!border-blue-200 bg-blue-600 text-white'
                    : '!border-slate-200 bg-slate-50 text-slate-500'
                "
              >
                {{ option.period.slice(5, 7) }}
              </span>

              <div class="min-w-0">
                <p class="truncate text-sm font-bold text-slate-800">
                  {{ option.label }}
                </p>
                <p class="mt-0.5 text-[11px] text-slate-400">
                  {{
                    isDcwaSoUpload
                      ? `${option.count} row DCWA terdeteksi`
                      : isGayaSoUpload
                        ? `${option.count} row periode Gaya Motor terdeteksi`
                      : isNtcSoUpload
                        ? `${option.count} row Period NTC terdeteksi`
                        : isTmminSoUpload
                        ? `${option.count} row periode PO terdeteksi`
                        : `${option.count} row Delivery Date terdeteksi`
                  }}
                </p>
              </div>
            </div>

            <span
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full !border text-[11px] font-bold"
              :class="
                pendingUploadPeriod === option.period
                  ? '!border-blue-600 bg-blue-600 text-white'
                  : '!border-slate-300 bg-white text-transparent'
              "
            >
              ✓
            </span>
          </button>

          <div class="rounded-2xl !border !border-amber-100 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-800">
            <strong>{{ isDcwaSoUpload ? 'DCWA' : isGayaSoUpload ? 'GAYA MOTOR' : isNtcSoUpload ? 'NTC' : isTmminSoUpload ? 'TMMIN' : 'ADM' }}:</strong>
            {{
              isDcwaSoUpload
                ? 'periode Regular dari Excel, periode Special Order dari ETD PDF; JOB Number dari Raw MDFO.'
                : isGayaSoUpload
                  ? 'periode ditentukan dari Agreement No (PO) + tanggal DELIVERY pada nama file; Order Date dan Delivery Date sama. Agreement No yang sama pada bulan sebelumnya tetap mengikuti periode lama. Cycle dibaca dari nama file.'
                : isNtcSoUpload
                  ? 'periode dibaca dari kolom Period (YYMM).'
                  : isTmminSoUpload
                    ? 'periode dibaca dari 6 digit awal Nomor PO (YYYYMM).'
                    : 'periode dibaca dari kolom Del. Date.'
            }}
            <template v-if="isDcwaSoUpload">
              Raw Sales Order, Format Sales Order, dan Tracking DCWA diproses untuk periode yang dipilih. Regular memakai DN sebagai PO Format SO; Special Order memakai PO No dari header PDF.
            </template>
            <template v-else-if="isGayaSoUpload">
              Raw Sales Order, Format Sales Order, dan Tracking Gaya Motor hanya diproses untuk periode yang dipilih. JIT Call digunakan sebagai Nomor DN untuk DN Crosscheck/Monitoring.
            </template>
            <template v-else-if="isNtcSoUpload">
              Hanya Raw Sales Order NTC periode yang dipilih yang disimpan.
            </template>
            <template v-else>
              Contract dan Format Sales Order hanya diproses untuk bulan yang dipilih.
            </template>
          </div>
        </div>

        <div class="shrink-0 flex flex-wrap items-center justify-end gap-2 !border-t !border-slate-200 bg-slate-50 px-4 py-3 sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-4">
          <button
            type="button"
            class="h-10 rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 active:scale-95"
            @click="closeUploadDeliveryPeriodChoice()"
          >
            Tutup
          </button>

          <button
            type="button"
            :disabled="!pendingUploadPeriod || isPreviewLoading || isAnalyzingUploadPeriods"
            class="inline-flex h-10 min-w-[150px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            @click="confirmUploadDeliveryPeriodChoice()"
          >
            <svg
              v-if="isPreviewLoading || isAnalyzingUploadPeriods"
              class="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.3" stroke-width="3" />
              <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            Gunakan Bulan Ini
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- PILIH PART NUMBER CONTRACT - TITIK / TANPA TITIK        -->
    <!-- ======================================================= -->
    <div
      v-if="showUploadModal && showContractMaterialChoiceModal"
      class="fixed inset-0 z-[10140] flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-950/50 p-2 sm:p-4 lg:items-center lg:p-5"
    >
      <div class="my-2 flex max-h-[calc(100dvh-1rem)] w-full max-w-[650px] min-h-0 flex-col overflow-hidden rounded-[20px] !border !border-slate-200 bg-white shadow-2xl sm:my-0 sm:max-h-[calc(100dvh-2rem)] sm:rounded-[26px] lg:max-h-[86vh]">
        <div class="flex shrink-0 items-start justify-between gap-4 !border-b !border-slate-200 bg-white px-6 py-5">
          <div class="min-w-0">
            <div class="mb-2 inline-flex items-center rounded-full !border !border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">
              Contract Match
            </div>

            <h3 class="text-lg font-bold text-slate-900">
              Pilih Part Number Contract
            </h3>

            <p class="mt-1 max-w-[520px] text-xs leading-relaxed text-slate-500">
              {{ contractMaterialChoiceMessage || 'Contract mempunyai Part Number bertitik dan tanpa titik. Pilih yang dipakai untuk order ini.' }}
            </p>
          </div>

          <button
            type="button"
            title="Close"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full !border !border-slate-300 bg-white text-xl font-semibold text-slate-500 transition hover:!border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95"
            @click="closeContractMaterialChoice()"
          >
            ×
          </button>
        </div>

        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/50 px-6 py-5">
          <div
            v-for="item in contractMaterialChoiceItems"
            :key="item.key"
            class="overflow-hidden rounded-2xl !border !border-slate-200 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
          >
            <div class="!border-b !border-slate-100 bg-slate-50 px-4 py-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full !border !border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                  {{ item.contract_document }}
                </span>

                <span
                  v-if="item.order_no"
                  class="rounded-full !border !border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                >
                  Order {{ item.order_no }}
                </span>

                <span
                  v-else-if="item.manifest"
                  class="rounded-full !border !border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                >
                  Manifest {{ item.manifest }}
                </span>

                <span
                  v-if="item.job_no"
                  class="rounded-full !border !border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                >
                  Job {{ item.job_no }}
                </span>
              </div>

              <p class="mt-2 text-xs text-slate-500">
                Part dari order:
                <span class="font-mono font-bold text-slate-800">
                  {{ item.source_material }}
                </span>
                <span v-if="item.part_name" class="ml-1 text-slate-400">
                  — {{ item.part_name }}
                </span>
              </p>
            </div>

            <div class="grid gap-2 p-4 sm:grid-cols-2">
              <button
                v-for="option in item.options"
                :key="`${item.key}-${option}`"
                type="button"
                class="flex min-h-[58px] items-center justify-between gap-3 rounded-xl !border px-4 py-3 text-left transition-all duration-150 active:scale-[0.99]"
                :class="
                  isContractMaterialChoiceSelected(item.key, option)
                    ? '!border-blue-500 bg-blue-50 text-blue-800 shadow-[0_5px_16px_rgba(37,99,235,0.10)]'
                    : '!border-slate-200 bg-white text-slate-700 hover:!border-blue-300 hover:bg-blue-50/40'
                "
                @click="selectContractMaterialChoice(item.key, option)"
              >
                <div class="min-w-0">
                  <p class="break-all font-mono text-xs font-bold">
                    {{ option }}
                  </p>

                  <p class="mt-1 text-[10px] font-medium text-slate-400">
                    {{ option.endsWith('.') ? 'Dengan titik di akhir' : 'Tanpa titik di akhir' }}
                  </p>
                </div>

                <span
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full !border text-xs font-bold"
                  :class="
                    isContractMaterialChoiceSelected(item.key, option)
                      ? '!border-blue-600 bg-blue-600 text-white'
                      : '!border-slate-300 bg-white text-transparent'
                  "
                >
                  ✓
                </span>
              </button>
            </div>
          </div>

          <div class="rounded-2xl !border !border-blue-100 bg-blue-50 px-4 py-3 text-[11px] leading-relaxed text-blue-700">
            Pilihan hanya berlaku untuk order yang sedang diupload. Part Number bertitik dan tanpa titik tetap disimpan sebagai dua material yang berbeda.
          </div>
        </div>

        <div class="flex shrink-0 items-center justify-end gap-3 !border-t !border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            :disabled="isUploading"
            class="h-10 rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            @click="closeContractMaterialChoice()"
          >
            Nanti
          </button>

          <button
            type="button"
            :disabled="!canConfirmContractMaterialChoice || isUploading"
            class="inline-flex h-10 min-w-[190px] items-center justify-center gap-2 rounded-xl !border !border-blue-600 bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:!border-blue-700 hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:!border-blue-200 disabled:bg-blue-200"
            @click="confirmContractMaterialChoiceAndContinue()"
          >
            <svg
              v-if="isUploading"
              class="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.3" stroke-width="3" />
              <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>

            {{ isUploading ? 'Memproses...' : 'Gunakan Pilihan & Lanjutkan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- PREVIEW MODAL EXCEL -->
    <div
      v-if="showUploadPreview"
      class="fixed inset-0 z-[10050] flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/55 p-2 sm:p-4 lg:items-center lg:p-6"
      @click.self="closeUploadPreview"
    >
      <div class="my-2 flex max-h-[calc(100dvh-1rem)] w-[96vw] max-w-[1120px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-0 sm:max-h-[calc(100dvh-2rem)] sm:w-[94vw] lg:max-h-[calc(100dvh-3rem)] lg:w-[92vw]">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-lg font-bold text-gray-900">
                Excel Preview
              </h3>

              <span
                v-if="isAdmP1P4CombinedUpload"
                class="inline-flex items-center rounded-full !border !border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700"
              >
                ADM P1 & P4
              </span>
            </div>

            <p class="text-xs text-gray-500 mt-1">
              {{ uploadFileName }}
              <span class="ml-2 inline-flex items-center rounded-full !border !border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                {{ selectedUploadPeriodLabel || selectedUploadPeriod }}
              </span>
            </p>
          </div>

          <button
            type="button"
            class="w-9 h-9 rounded-full flex items-center justify-center !border !border-slate-300 bg-white text-gray-600 font-bold text-lg hover:!border-red-200 hover:bg-red-100 hover:text-red-600 active:scale-95 transition-all duration-200"
            @click="closeUploadPreview"
          >
            X
          </button>
        </div>

        <div
          class="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-3 sm:px-6 sm:py-4"
          style="scrollbar-gutter: stable;"
        >
          <div class="text-sm text-gray-700 space-y-1 mb-3 shrink-0">
            <p><strong>File Name:</strong> {{ uploadFileName }}</p>
            <p><strong>File Type:</strong> {{ uploadFiles?.type || 'Excel File' }}</p>
          </div>

          <div v-if="excelSheetNames.length > 1 && !isAdmExcelUploadPreview" class="grid grid-cols-[80px_1fr] items-center gap-3 mb-3 shrink-0">
            <label class="text-sm font-semibold text-gray-700">Sheet</label>

            <select
              v-model="selectedExcelSheet"
              class="w-full h-10 border border-gray-300 rounded-xl px-3 bg-white outline-none focus:border-blue-600"
              @change="handleExcelSheetChange"
            >
              <option v-for="sheet in excelSheetNames" :key="sheet" :value="sheet">
                {{ sheet }}
              </option>
            </select>
          </div>

          <div v-if="isPreviewLoading" class="p-3 rounded-xl bg-blue-50 text-blue-700 text-sm">
            Membuka file Excel terenkripsi, mohon tunggu...
          </div>

          <div v-else-if="excelPreviewError" class="p-3 rounded-xl bg-red-100 text-red-700 text-sm">
            {{ excelPreviewError }}
          </div>

          <div
            v-if="!isPreviewLoading && !excelPreviewError && isAdmExcelUploadPreview"
            class="mb-3 rounded-xl !border !border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700"
          >
            Preview tabel dibatasi maksimal 100 data per customer agar penggunaan memory tetap ringan. Summary tetap dihitung dari seluruh data pada periode yang dipilih.
          </div>

          <!-- ADM P1 + P4: tetap satu modal, tetapi dipisah per customer -->
          <div
            v-if="
              !isPreviewLoading &&
              !excelPreviewError &&
              isAdmP1P4CombinedUpload
            "
            class="mb-3 shrink-0 rounded-2xl !border !border-slate-200 bg-slate-50 p-2"
          >
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="flex h-11 items-center justify-between rounded-xl !border px-4 text-sm font-semibold transition-all"
                :class="
                  activeAdmCombinedPreviewCustomer === 'ADM P1'
                    ? '!border-blue-500 bg-blue-600 text-white shadow-sm'
                    : '!border-slate-200 bg-white text-slate-600 hover:!border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                "
                @click="selectAdmCombinedPreviewCustomer('ADM P1')"
              >
                <span>ADM P1</span>
                <span
                  class="rounded-full px-2 py-0.5 text-[11px]"
                  :class="
                    activeAdmCombinedPreviewCustomer === 'ADM P1'
                      ? 'bg-white/20 text-white'
                      : 'bg-blue-50 text-blue-700'
                  "
                >
                  D101 · {{
                    formatUploadPreviewNumber(
                      admUploadPreviewSummaryByPlant?.D101?.total_rows ??
                        admP1ExcelPreviewRows.length
                    )
                  }} row
                </span>
              </button>

              <button
                type="button"
                class="flex h-11 items-center justify-between rounded-xl !border px-4 text-sm font-semibold transition-all"
                :class="
                  activeAdmCombinedPreviewCustomer === 'ADM P4'
                    ? '!border-indigo-500 bg-indigo-600 text-white shadow-sm'
                    : '!border-slate-200 bg-white text-slate-600 hover:!border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                "
                @click="selectAdmCombinedPreviewCustomer('ADM P4')"
              >
                <span>ADM P4</span>
                <span
                  class="rounded-full px-2 py-0.5 text-[11px]"
                  :class="
                    activeAdmCombinedPreviewCustomer === 'ADM P4'
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-50 text-indigo-700'
                  "
                >
                  D104 · {{
                    formatUploadPreviewNumber(
                      admUploadPreviewSummaryByPlant?.D104?.total_rows ??
                        admP4ExcelPreviewRows.length
                    )
                  }} row
                </span>
              </button>
            </div>

            <p class="px-1 pt-2 text-[10px] leading-relaxed text-slate-500">
              File tetap satu. Tab hanya memisahkan tampilan berdasarkan Plant Code:
              D101 = ADM P1 dan D104 = ADM P4.
            </p>
          </div>

          <!-- SUMMARY UPLOAD SO ADM -->
          <div
            v-if="
              !isPreviewLoading &&
              !excelPreviewError &&
              Object.keys(activeAdmUploadPreviewSummary).length > 0
            "
            class="mb-3 shrink-0"
          >
            <div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <div class="rounded-xl !border !border-blue-200 bg-blue-50 px-4 py-3">
                <div class="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                  Qty Order (Pcs)
                </div>
                <div class="mt-1 text-xl font-extrabold text-slate-900">
                  {{
                    formatUploadPreviewNumber(
                      activeAdmUploadPreviewSummary.total_qty_order_pcs
                    )
                  }}
                </div>
                <div class="mt-0.5 text-[10px] text-slate-500">
                  Total seluruh order periode terpilih
                </div>
              </div>

              <div class="rounded-xl !border !border-slate-200 bg-white px-4 py-3">
                <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Baris Upload
                </div>
                <div class="mt-1 text-lg font-extrabold text-slate-800">
                  {{
                    formatUploadPreviewNumber(
                      activeAdmUploadPreviewSummary.total_rows
                    )
                  }}
                </div>
                <div class="mt-0.5 text-[10px] text-slate-500">
                  {{ activeAdmUploadPreviewSummary.plant_code || '-' }}
                </div>
              </div>

              <div class="rounded-xl !border !border-slate-200 bg-white px-4 py-3">
                <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Order No / Nomor DN
                </div>
                <div class="mt-1 text-lg font-extrabold text-slate-800">
                  {{
                    formatUploadPreviewNumber(
                      activeAdmUploadPreviewSummary.unique_order_no
                    )
                  }}
                </div>
                <div class="mt-0.5 text-[10px] text-slate-500">
                  Jumlah nomor DN
                </div>
              </div>

              <div class="rounded-xl !border !border-slate-200 bg-white px-4 py-3">
                <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  PO Number
                </div>
                <div class="mt-1 text-lg font-extrabold text-slate-800">
                  {{
                    formatUploadPreviewNumber(
                      activeAdmUploadPreviewSummary.unique_po_number
                    )
                  }}
                </div>
                <div class="mt-0.5 text-[10px] text-slate-500">
                  Jumlah PO
                </div>
              </div>
            </div>

            <div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 px-4 py-3 text-xs md:grid-cols-3 lg:grid-cols-5">
              <div>
                <div class="text-[9px] font-bold uppercase text-slate-400">
                  Part No
                </div>
                <div class="mt-0.5 font-semibold text-slate-700">
                  {{ formatUploadPreviewNumber(activeAdmUploadPreviewSummary.unique_part_no) }}
                </div>
              </div>

              <div>
                <div class="text-[9px] font-bold uppercase text-slate-400">
                  Shop
                </div>
                <div class="mt-0.5 font-semibold text-slate-700">
                  {{ formatUploadPreviewNumber(activeAdmUploadPreviewSummary.unique_shop_code) }}
                </div>
              </div>

              <div>
                <div class="text-[9px] font-bold uppercase text-slate-400">
                  Part Category
                </div>
                <div class="mt-0.5 font-semibold text-slate-700">
                  {{ formatUploadPreviewNumber(activeAdmUploadPreviewSummary.unique_part_category) }}
                </div>
              </div>

              <div>
                <div class="text-[9px] font-bold uppercase text-slate-400">
                  Order Date
                </div>
                <div class="mt-0.5 whitespace-nowrap font-semibold text-slate-700">
                  {{
                    formatUploadPreviewDateRange(
                      activeAdmUploadPreviewSummary.order_date_from,
                      activeAdmUploadPreviewSummary.order_date_to
                    )
                  }}
                </div>
              </div>

              <div>
                <div class="text-[9px] font-bold uppercase text-slate-400">
                  Delivery Date
                </div>
                <div class="mt-0.5 whitespace-nowrap font-semibold text-slate-700">
                  {{
                    formatUploadPreviewDateRange(
                      activeAdmUploadPreviewSummary.delivery_date_from,
                      activeAdmUploadPreviewSummary.delivery_date_to
                    )
                  }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="
              !isPreviewLoading &&
              !excelPreviewError &&
              visibleExcelPreviewRows.length === 0
            "
            class="p-3 rounded-xl bg-gray-100 text-gray-600 text-sm"
          >
            Tidak ada data
            {{
              isAdmP1P4CombinedUpload
                ? activeAdmCombinedPreviewCustomer
                : ''
            }}
            pada periode yang dipilih.
          </div>

          <div
            v-else-if="
              !isPreviewLoading &&
              !excelPreviewError
            "
            class="relative isolate h-[clamp(260px,44dvh,500px)] min-h-[260px] shrink-0 overflow-auto overscroll-contain !border !border-slate-300 rounded-xl bg-white"
            style="scrollbar-gutter: stable; direction: ltr;"
          >
            <table
              class="m-0 table-fixed border-separate border-spacing-0 text-xs"
              :style="{
                width: `${admExcelPreviewTableWidth}px`,
                minWidth: `${admExcelPreviewTableWidth}px`,
                marginLeft: '0px'
              }"
            >
              <!-- HEADER EXCEL -->
              <thead>
                <tr>
                  <th
                    v-for="(cell, cellIndex) in visibleExcelPreviewHeaders"
                    :key="cellIndex"
                    class="box-border whitespace-nowrap px-3 py-2 text-center font-bold text-gray-900"
                    :style="getAdmExcelPreviewCellStyle(cellIndex, true, 0)"
                  >
                    {{ getExcelPreviewDisplayHeader(cell) }}
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(row, rowIndex) in visibleExcelPreviewRows"
                  :key="`${activeAdmCombinedPreviewCustomer}-${rowIndex}`"
                  class="odd:bg-white even:bg-slate-50/60"
                >
                  <td
                    v-for="(cell, cellIndex) in row"
                    :key="cellIndex"
                    :class="[
                      'box-border px-3 py-2 whitespace-nowrap text-gray-900',
                      isExcelPreviewCenteredColumn(visibleExcelPreviewHeaders[cellIndex])
                        ? 'text-center'
                        : 'text-left'
                    ]"
                    :style="getAdmExcelPreviewCellStyle(cellIndex, false, rowIndex)"
                  >
                    {{ cell }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <small
            v-if="
              !isPreviewLoading &&
              !excelPreviewError &&
              visibleExcelPreviewRows.length >= 100
            "
            class="block mt-3 text-xs text-gray-500 shrink-0"
          >
            Preview menampilkan maksimal 100 baris per customer agar halaman tetap ringan.
          </small>
        </div>

        <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white shrink-0">
          <button
            type="button"
            class="min-w-[90px] h-10 px-4 !border !border-slate-300 rounded-xl bg-white text-gray-700 font-semibold hover:bg-gray-100 hover:!border-slate-400 hover:text-gray-900 active:scale-95 transition-all duration-200"
            @click="closeUploadPreview"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- PREVIEW RAW SALES ORDER DCWA                            -->
    <!-- A:W dari Excel, X = PO PDF, Y = JOB Number MDFO         -->
    <!-- ======================================================= -->
    <div
      v-if="showDcwaRawSoPreview"
      class="fixed inset-0 z-[100126] flex items-center justify-center bg-slate-950/50 p-2 sm:p-3"
      @click.self="closeDcwaRawSoPreview()"
    >
      <div class="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[1760px] min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div class="flex shrink-0 items-center justify-between gap-4 !border-b !border-slate-200 bg-white px-6 py-4">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-lg font-bold text-slate-900">Preview Raw Sales Order DCWA</h3>
              <span
                class="inline-flex rounded-full !border px-2.5 py-1 text-[11px] font-bold"
                :class="dcwaRawSoCanSubmitPreview
                  ? '!border-emerald-200 bg-emerald-50 text-emerald-700'
                  : '!border-amber-200 bg-amber-50 text-amber-700'"
              >
                {{ dcwaRawSoCanSubmitPreview ? 'Ready to Submit' : 'Need Validation' }}
              </span>
            </div>
            <p class="mt-1 text-xs text-slate-500">
              {{ dcwaSoUploadFileLabel || 'Excel + PDF Regular / PDF Special Order DCWA' }}
              <span class="ml-2 rounded-full !border !border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                {{ selectedUploadPeriodLabel || selectedUploadPeriod }}
              </span>
            </p>
          </div>

          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full !border !border-slate-300 bg-white text-base font-bold text-slate-600 transition hover:!border-red-200 hover:bg-red-50 hover:text-red-600"
            @click="closeDcwaRawSoPreview()"
          >
            X
          </button>
        </div>

        <div v-if="dcwaRawSoPreviewSummary" class="shrink-0 px-5 pt-4">
          <div class="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-10">
            <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2">
              <div class="text-[9px] font-bold uppercase tracking-wide text-slate-400">Rows</div>
              <div class="mt-1 text-base font-extrabold text-slate-800">{{ formatUploadPreviewNumber(dcwaRawSoPreviewSummary.total_rows) }}</div>
            </div>
            <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2">
              <div class="text-[9px] font-bold uppercase tracking-wide text-slate-400">Excel / PDF</div>
              <div class="mt-1 text-sm font-extrabold text-slate-800">{{ dcwaRawSoPreviewSummary.total_excel_files }} / {{ dcwaRawSoPreviewSummary.total_pdf_files }}</div>
            </div>
            <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2">
              <div class="text-[9px] font-bold uppercase tracking-wide text-slate-400">Regular</div>
              <div class="mt-1 text-base font-extrabold text-slate-800">{{ formatUploadPreviewNumber(dcwaRawSoPreviewSummary.regular_rows ?? 0) }}</div>
            </div>
            <div class="rounded-xl !border !border-violet-200 bg-violet-50 px-3 py-2">
              <div class="text-[9px] font-bold uppercase tracking-wide text-violet-500">SO DCWA</div>
              <div class="mt-1 text-base font-extrabold text-violet-700">{{ formatUploadPreviewNumber(dcwaRawSoPreviewSummary.special_order_rows ?? 0) }}</div>
            </div>
            <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2">
              <div class="text-[9px] font-bold uppercase tracking-wide text-slate-400">No. DN</div>
              <div class="mt-1 text-base font-extrabold text-slate-800">{{ formatUploadPreviewNumber(dcwaRawSoPreviewSummary.unique_dn) }}</div>
            </div>
            <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2">
              <div class="text-[9px] font-bold uppercase tracking-wide text-slate-400">Total Order Qty</div>
              <div class="mt-1 text-base font-extrabold text-slate-800">{{ formatUploadPreviewNumber(dcwaRawSoPreviewSummary.total_order_qty) }}</div>
            </div>
            <div class="rounded-xl !border !border-emerald-200 bg-emerald-50 px-3 py-2">
              <div class="text-[9px] font-bold uppercase tracking-wide text-emerald-500">PO Matched</div>
              <div class="mt-1 text-base font-extrabold text-emerald-700">{{ formatUploadPreviewNumber(dcwaRawSoPreviewSummary.matched_po) }}</div>
            </div>
            <div class="rounded-xl !border !border-blue-200 bg-blue-50 px-3 py-2">
              <div class="text-[9px] font-bold uppercase tracking-wide text-blue-500">JOB Matched</div>
              <div class="mt-1 text-base font-extrabold text-blue-700">{{ formatUploadPreviewNumber(dcwaRawSoPreviewSummary.matched_job) }}</div>
            </div>
            <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2">
              <div class="text-[9px] font-bold uppercase tracking-wide text-slate-400">Order Date</div>
              <div class="mt-1 whitespace-nowrap text-xs font-bold text-slate-700">
                {{ formatUploadPreviewDateRange(dcwaRawSoPreviewSummary.order_date_from, dcwaRawSoPreviewSummary.order_date_to) }}
              </div>
            </div>
            <div class="rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2">
              <div class="text-[9px] font-bold uppercase tracking-wide text-slate-400">Delivery Date</div>
              <div class="mt-1 whitespace-nowrap text-xs font-bold text-slate-700">
                {{ formatUploadPreviewDateRange(dcwaRawSoPreviewSummary.delivery_date_from, dcwaRawSoPreviewSummary.delivery_date_to) }}
              </div>
            </div>
          </div>

          <div
            v-if="dcwaRawSoPreviewErrors.length > 0"
            class="mt-3 max-h-[98px] overflow-y-auto rounded-xl !border !border-amber-200 bg-amber-50 px-4 py-3"
          >
            <div class="text-[11px] font-bold uppercase tracking-wide text-amber-700">Validation</div>
            <div
              v-for="(errorMessage, errorIndex) in dcwaRawSoPreviewErrors"
              :key="`dcwa-validation-${errorIndex}`"
              class="mt-1 text-xs leading-relaxed text-amber-800"
            >
              • {{ errorMessage }}
            </div>
          </div>
        </div>

        <div class="h-0 min-h-0 flex-1 overflow-hidden bg-white px-5 pb-5 pt-3">
          <div class="relative isolate h-full w-full min-h-0 min-w-0 overflow-auto overscroll-contain rounded-xl !border !border-slate-200 bg-white" style="scrollbar-gutter: stable;">
            <table
              class="relative z-0 table-fixed border-separate border-spacing-0 bg-white text-sm"
              :style="{ width: dcwaRawSoPreviewTableWidth }"
            >
              <thead class="sticky top-0 z-[100] bg-blue-50">
                <tr>
                  <th
                    v-for="col in dcwaRawSoPreviewColumns"
                    :key="`dcwa-preview-${col.key}`"
                    class="box-border p-2 text-center align-middle"
                    :style="getDcwaRawSoColumnStyle(col.key, true, 0, true)"
                  >
                    <div class="whitespace-pre-line text-xs font-semibold leading-tight text-slate-700">{{ col.label }}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, rowIndex) in dcwaRawSoPreviewRows"
                  :key="`dcwa-preview-row-${row.sourceFile}-${row.sourceRow}-${rowIndex}`"
                  class="h-9 odd:bg-white even:bg-slate-50"
                >
                  <td
                    v-for="col in dcwaRawSoPreviewColumns"
                    :key="`dcwa-preview-cell-${rowIndex}-${col.key}`"
                    class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight"
                    :class="isDcwaRawSoValidationColumn(col.key) && isDcwaRawSoValidationMissing(row, col.key)
                      ? '!bg-amber-50 text-amber-800'
                      : ''"
                    :style="getDcwaRawSoColumnStyle(col.key, false, rowIndex, true)"
                  >
                    <span class="block max-w-full truncate" :title="String(row[col.key] ?? '')">
                      {{
                        ['orderDate', 'deliveryDate'].includes(col.key)
                          ? formatUploadPreviewDate(row[col.key])
                          : isDcwaRawSoNumericColumn(col.key)
                            ? formatUploadPreviewNumber(row[col.key])
                            : row[col.key]
                      }}
                    </span>
                  </td>
                </tr>
                <tr v-if="dcwaRawSoPreviewRows.length === 0">
                  <td :colspan="dcwaRawSoPreviewColumns.length" class="p-8 text-center text-sm text-slate-400">
                    Data DCWA tidak ditemukan pada periode terpilih
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex shrink-0 items-center justify-between gap-3 !border-t !border-slate-200 bg-white px-6 py-4">
          <p class="text-[11px] text-slate-500">
            PO hanya diambil jika Part No Excel identik dengan Material No PDF. Module Number PDF tidak dipakai sebagai Material No.
          </p>
          <button
            type="button"
            class="h-10 min-w-[90px] rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-95"
            @click="closeDcwaRawSoPreview()"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- MISSING CONTRACT PARTS - SHARED ALL CUSTOMER            -->
    <!-- ======================================================= -->
    <Teleport to="body">
      <div
        v-if="showMissingContractPartsModal"
        class="fixed inset-0 z-[100220] flex items-center justify-center bg-slate-950/55 p-4"
        @click.self="closeMissingContractPartsModal"
      >
        <div class="flex max-h-[86vh] w-full max-w-[680px] flex-col overflow-hidden rounded-3xl !border !border-red-200 bg-white shadow-2xl">
          <div class="flex shrink-0 items-start justify-between gap-4 !border-b !border-slate-200 bg-white px-6 py-5">
            <div>
              <div class="mb-2 inline-flex rounded-full !border !border-red-200 bg-red-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-red-600">
                Contract Validation
              </div>
              <h3 class="text-lg font-bold text-slate-900">
                Part Number belum terdaftar di Contract
              </h3>
              <p class="mt-1 text-xs leading-relaxed text-slate-500">
                {{ missingContractParts.length }} Part Number belum tersedia untuk periode
                <span class="font-semibold text-slate-700">{{ missingContractPartsPeriod }}</span>.
              </p>
            </div>

            <button
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full !border !border-slate-200 bg-white text-slate-400 transition hover:!border-red-200 hover:bg-red-50 hover:text-red-500"
              @click="closeMissingContractPartsModal"
            >
              ×
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div class="mb-4 rounded-2xl !border !border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
              Copy Part Number di bawah, buka <strong>Upload MDFO → Add Part</strong>, pilih Customer / Period / Revision yang sesuai, lalu paste ke fitur Multiple Part.
              Part qty 1 dari bulan sebelumnya tetap mengikuti skema carry-forward existing sehingga tidak perlu dimasukkan ulang bila sudah terbawa.
            </div>

            <div class="space-y-4">
              <div
                v-for="group in missingContractPartGroups"
                :key="`${group.customer}-${group.revision ?? 'none'}`"
                class="overflow-hidden rounded-2xl !border !border-slate-200"
              >
                <div class="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                  <div class="text-sm font-bold text-slate-700">
                    {{ group.customer }}
                  </div>
                  <div class="text-right text-[11px] font-semibold text-slate-500">
                    <template v-if="group.contractDocuments?.length">
                      Contract {{ group.contractDocuments.join(', ') }}
                    </template>
                    <template v-else>
                      Revision {{ group.revision ?? '-' }}
                    </template>
                    · {{ group.parts.length }} Part
                  </div>
                </div>
                <div class="max-h-52 overflow-y-auto bg-white px-4 py-3 font-mono text-xs text-slate-700">
                  <div
                    v-for="part in group.parts"
                    :key="`${group.customer}-${part}`"
                    class="py-1"
                  >
                    {{ part }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 items-center justify-between gap-3 !border-t !border-slate-200 bg-slate-50 px-6 py-4">
            <span class="text-xs text-slate-500">
              Paste list ini ke fitur Add Part, lalu ulangi Preview setelah Contract ter-update.
            </span>
            <div class="flex shrink-0 items-center gap-2">
              <button
                type="button"
                class="h-10 rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                @click="closeMissingContractPartsModal"
              >
                Close
              </button>
              <button
                type="button"
                :disabled="missingContractParts.length === 0"
                class="h-10 min-w-[170px] rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-300"
                :class="missingContractPartsCopied ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'"
                @click="copyMissingContractParts"
              >
                <span v-if="missingContractPartsCopied" class="inline-flex items-center gap-1.5">
                  <span aria-hidden="true">✓</span>
                  Copied
                </span>
                <span v-else>Copy Part Number</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ======================================================= -->
    <!-- PREVIEW RAW ORDERING ASI ADM                            -->
    <!-- ======================================================= -->
    <div
      v-if="showAsiAdmRawSoPreview"
      class="fixed inset-0 z-[100127] flex items-center justify-center bg-slate-950/50 p-2 sm:p-3"
      @click.self="closeAsiAdmRawSoPreview()"
    >
      <div class="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[1500px] min-h-0 flex-col overflow-hidden rounded-3xl !border !border-slate-200 bg-white shadow-2xl">
        <!-- Header modal selalu tetap di atas. -->
        <div class="flex shrink-0 items-start justify-between gap-4 !border-b !border-slate-200 bg-white px-6 py-4">
          <div>
            <h3 class="text-lg font-bold text-slate-800">Preview Raw Ordering ASI ADM</h3>
            <p class="mt-1 text-xs text-slate-500">PDF Purchase Order → Part + Qty N MDFO → Qty harian berdasarkan daily MDFO.</p>
          </div>
          <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full !border !border-slate-200 bg-white text-slate-400 hover:!border-red-200 hover:bg-red-50 hover:text-red-500" @click="closeAsiAdmRawSoPreview()">×</button>
        </div>

        <!-- Summary dipisahkan dari area scroll tabel supaya tetap terlihat. -->
        <div class="shrink-0 bg-white px-5 pb-4 pt-5">
          <div v-if="asiAdmRawSoPreviewSummary" class="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            <div class="rounded-xl !border !border-slate-200 bg-slate-50 p-3"><div class="text-[10px] font-bold uppercase text-slate-400">Files</div><div class="mt-1 font-bold text-slate-700">{{ asiAdmRawSoPreviewSummary.total_files }}</div></div>
            <div class="rounded-xl !border !border-slate-200 bg-slate-50 p-3"><div class="text-[10px] font-bold uppercase text-slate-400">PDF Items</div><div class="mt-1 font-bold text-slate-700">{{ asiAdmRawSoPreviewSummary.total_items_pdf }}</div></div>
            <div class="rounded-xl !border !border-slate-200 bg-slate-50 p-3"><div class="text-[10px] font-bold uppercase text-slate-400">Daily Rows</div><div class="mt-1 font-bold text-slate-700">{{ asiAdmRawSoPreviewSummary.total_rows }}</div></div>
            <div class="rounded-xl !border !border-slate-200 bg-slate-50 p-3"><div class="text-[10px] font-bold uppercase text-slate-400">Regular</div><div class="mt-1 font-bold text-slate-700">{{ asiAdmRawSoPreviewSummary.regular_rows }}</div></div>
            <div class="rounded-xl !border !border-slate-200 bg-slate-50 p-3"><div class="text-[10px] font-bold uppercase text-slate-400">Service Part</div><div class="mt-1 font-bold text-slate-700">{{ asiAdmRawSoPreviewSummary.service_part_rows }}</div></div>
            <div class="rounded-xl !border !border-slate-200 bg-slate-50 p-3"><div class="text-[10px] font-bold uppercase text-slate-400">Total Qty</div><div class="mt-1 font-bold text-slate-700">{{ formatUploadPreviewNumber(asiAdmRawSoPreviewSummary.total_daily_qty) }}</div></div>
            <div class="rounded-xl !border !border-slate-200 bg-slate-50 p-3"><div class="text-[10px] font-bold uppercase text-slate-400">Date</div><div class="mt-1 text-xs font-bold text-slate-700">{{ formatUploadPreviewDateRange(asiAdmRawSoPreviewSummary.order_date_from, asiAdmRawSoPreviewSummary.order_date_to) }}</div></div>
            <div class="rounded-xl !border p-3" :class="asiAdmRawSoCanSubmitPreview ? '!border-emerald-200 bg-emerald-50' : '!border-red-200 bg-red-50'"><div class="text-[10px] font-bold uppercase" :class="asiAdmRawSoCanSubmitPreview ? 'text-emerald-500' : 'text-red-500'">Validation</div><div class="mt-1 font-bold" :class="asiAdmRawSoCanSubmitPreview ? 'text-emerald-700' : 'text-red-700'">{{ asiAdmRawSoCanSubmitPreview ? 'MATCHED' : `${asiAdmRawSoPreviewErrors.length} ERROR` }}</div></div>
          </div>

          <div
            v-if="missingContractPartGroups.some((group) => group.customer === 'ASI ADM')"
            class="mt-4 flex items-start justify-between gap-4 rounded-xl !border !border-amber-200 bg-amber-50 p-3"
          >
            <div class="min-w-0 text-xs leading-relaxed text-amber-800">
              <strong>{{ missingContractParts.length }} Part Number</strong> belum terdaftar pada Contract ASI ADM.
              Tambahkan melalui Upload MDFO → Add Part sebelum Submit Service Part / Regular ini.
            </div>
            <button
              type="button"
              class="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-blue-700"
              @click="openMissingContractPartsModal"
            >
              Preview Part
            </button>
          </div>

          <div v-if="asiAdmRawSoPreviewErrors.length > 0" class="mt-4 max-h-24 overflow-auto rounded-xl !border !border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <div v-for="(message, index) in asiAdmRawSoPreviewErrors" :key="`asi-error-${index}`" class="py-0.5">{{ message }}</div>
          </div>
        </div>

        <!-- Hanya isi tabel yang scroll. Header kolom tetap sticky di atas viewport tabel. -->
        <div class="min-h-0 flex-1 overflow-hidden bg-white px-5 pb-5">
          <div class="relative isolate h-full min-h-0 w-full overflow-auto overscroll-contain rounded-xl !border !border-slate-200 bg-white" style="scrollbar-gutter: stable;">
            <table class="relative table-fixed border-separate border-spacing-0 text-sm" :style="{ width: asiAdmRawSoPreviewTableWidth }">
              <thead class="sticky top-0 z-[120] bg-blue-50 shadow-[inset_0_-1px_0_#cbd5e1]">
                <tr>
                  <th v-for="col in asiAdmRawSoColumns" :key="`asi-preview-${col.key}`" class="sticky top-0 z-[121] box-border bg-blue-50 p-2 text-center text-xs font-semibold shadow-[inset_0_-1px_0_#cbd5e1]" :style="getAsiAdmRawSoColumnStyle(col.key, true, 0, true)">{{ col.label }}</th>
                </tr>
              </thead>
              <tbody class="relative z-0 bg-white">
                <tr v-for="(row, rowIndex) in asiAdmRawSoPreviewRows" :key="`asi-preview-row-${row.sourceFile}-${row.sourceRow}-${row.orderDate}-${rowIndex}`" class="h-9 odd:bg-white even:bg-slate-50">
                  <td v-for="col in asiAdmRawSoColumns" :key="`asi-preview-cell-${rowIndex}-${col.key}`" class="box-border overflow-hidden px-2 text-center text-xs" :style="getAsiAdmRawSoColumnStyle(col.key, false, rowIndex, true)">
                    <span class="block truncate" :title="String(row[col.key] ?? '')">{{ ['orderDate', 'deliveryDate'].includes(col.key) ? formatUploadPreviewDate(row[col.key]) : col.key === 'qty' ? formatUploadPreviewNumber(row[col.key]) : row[col.key] }}</span>
                  </td>
                </tr>
                <tr v-if="asiAdmRawSoPreviewRows.length === 0"><td :colspan="asiAdmRawSoColumns.length" class="p-6 text-center text-slate-400">Data preview tidak ditemukan</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex shrink-0 items-center justify-between gap-3 !border-t !border-slate-200 bg-slate-50 px-6 py-4">
          <div class="text-xs" :class="asiAdmRawSoCanSubmitPreview ? 'text-emerald-600' : 'text-red-600'">{{ asiAdmRawSoCanSubmitPreview ? 'Semua Part Number dan Qty PDF cocok dengan MDFO.' : 'Perbaiki data MDFO/PDF sebelum Submit.' }}</div>
          <button type="button" class="h-10 rounded-xl !border !border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700" @click="closeAsiAdmRawSoPreview()">Close</button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- PREVIEW RAW SALES ORDER GAYA MOTOR                      -->
    <!-- ======================================================= -->
    <div
      v-if="showGayaRawSoPreview"
      class="fixed inset-0 z-[100126] flex items-center justify-center bg-slate-950/50 p-4"
      @click.self="closeGayaRawSoPreview()"
    >
      <div class="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[1650px] min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div class="flex shrink-0 items-center justify-between gap-4 !border-b !border-slate-200 bg-white px-6 py-4">
          <div>
            <h3 class="text-lg font-bold text-slate-900">
              Preview Raw Sales Order Gaya Motor
            </h3>
            <p class="mt-1 text-xs text-slate-500">
              Preview per file PDF sebelum Submit
              <span class="font-semibold text-blue-600">
                ({{ gayaRawSoActivePreviewRows.length }} data)
              </span>
              <span class="ml-2 inline-flex items-center rounded-full !border !border-indigo-200 bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">
                {{ selectedUploadPeriodLabel || selectedUploadPeriod }}
              </span>
            </p>
          </div>

          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full !border !border-slate-300 bg-white text-lg text-slate-500 transition hover:!border-red-200 hover:bg-red-50 hover:text-red-600"
            @click="closeGayaRawSoPreview()"
          >
            ×
          </button>
        </div>

        <!-- FILE TABS: setiap PDF tampil terpisah -->
        <div
          v-if="gayaRawSoPreviewFiles.length > 0"
          class="shrink-0 px-5 pt-4"
        >
          <div class="rounded-2xl !border !border-slate-200 bg-white p-2.5">
            <div class="flex items-center justify-between gap-3 px-1 pb-2">
              <div class="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                File PDF
              </div>
              <div class="text-[10px] font-medium text-slate-400">
                Klik nama file untuk melihat detail
              </div>
            </div>

            <div class="flex gap-2 overflow-x-auto pb-1">
              <button
                v-for="fileItem in gayaRawSoPreviewFiles"
                :key="`gaya-preview-file-${fileItem.index}-${fileItem.name}`"
                type="button"
                :title="fileItem.name"
                :class="[
                  'group flex min-w-[230px] max-w-[360px] shrink-0 items-center justify-between gap-3 rounded-xl !border px-3 py-2 text-left transition-all',
                  gayaRawSoActivePreviewFile === fileItem.name
                    ? '!border-blue-300 bg-blue-50 shadow-sm'
                    : '!border-slate-200 bg-slate-50/70 hover:!border-blue-200 hover:bg-blue-50/60'
                ]"
                @click="selectGayaRawSoPreviewFile(fileItem.name)"
              >
                <div class="min-w-0">
                  <div
                    :class="[
                      'truncate text-xs font-bold',
                      gayaRawSoActivePreviewFile === fileItem.name
                        ? 'text-blue-700'
                        : 'text-slate-700'
                    ]"
                  >
                    {{ fileItem.index + 1 }}. {{ fileItem.name }}
                  </div>
                </div>

                <span
                  :class="[
                    'shrink-0 rounded-full !border px-2 py-0.5 text-[10px] font-bold',
                    gayaRawSoActivePreviewFile === fileItem.name
                      ? '!border-blue-200 bg-white text-blue-700'
                      : '!border-slate-200 bg-white text-slate-500'
                  ]"
                >
                  {{ fileItem.rowCount }} row
                </span>
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="gayaRawSoActivePreviewSummary"
          class="shrink-0 px-5 pt-3"
        >
          <div class="rounded-2xl !border !border-slate-200 bg-slate-50/70 p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-sm font-extrabold text-slate-900">GAYA MOTOR</div>
                <div
                  class="mt-0.5 max-w-[720px] truncate text-[11px] font-semibold text-slate-500"
                  :title="gayaRawSoActivePreviewFile"
                >
                  {{ gayaRawSoActivePreviewFile || '-' }} · Delivery Note PDF · Cycle dari nama file
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <span class="rounded-full !border !border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                  {{ formatUploadPreviewNumber(gayaRawSoActivePreviewSummary.total_files) }} file
                </span>
                <span class="rounded-full !border !border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  {{ formatUploadPreviewNumber(gayaRawSoActivePreviewSummary.total_rows) }} row
                </span>
              </div>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
              <div class="rounded-xl bg-white px-3 py-2 !border !border-slate-200">
                <div class="text-[9px] font-bold uppercase text-slate-400">Total Qty</div>
                <div class="mt-1 text-base font-extrabold text-slate-800">
                  {{ formatUploadPreviewNumber(gayaRawSoActivePreviewSummary.total_qty) }}
                </div>
              </div>
              <div class="rounded-xl bg-white px-3 py-2 !border !border-slate-200">
                <div class="text-[9px] font-bold uppercase text-slate-400">Total Kanban</div>
                <div class="mt-1 text-base font-extrabold text-slate-800">
                  {{ formatUploadPreviewNumber(gayaRawSoActivePreviewSummary.total_kanban) }}
                </div>
              </div>
              <div class="rounded-xl bg-white px-3 py-2 !border !border-slate-200">
                <div class="text-[9px] font-bold uppercase text-slate-400">JIT Call</div>
                <div class="mt-1 truncate text-xs font-semibold text-slate-700" :title="gayaRawSoActivePreviewSummary.jit_call_numbers.join(', ')">
                  {{ gayaRawSoActivePreviewSummary.jit_call_numbers.join(', ') || '-' }}
                </div>
              </div>
              <div class="rounded-xl bg-white px-3 py-2 !border !border-slate-200">
                <div class="text-[9px] font-bold uppercase text-slate-400">Agreement / PO</div>
                <div class="mt-1 truncate text-xs font-semibold text-slate-700" :title="gayaRawSoActivePreviewSummary.agreement_numbers.join(', ')">
                  {{ gayaRawSoActivePreviewSummary.agreement_numbers.join(', ') || '-' }}
                </div>
              </div>
              <div class="rounded-xl bg-white px-3 py-2 !border !border-slate-200">
                <div class="text-[9px] font-bold uppercase text-slate-400">Cycle</div>
                <div class="mt-1 text-xs font-semibold text-slate-700">
                  {{ gayaRawSoActivePreviewSummary.cycles.join(', ') || '-' }}
                </div>
              </div>
              <div class="rounded-xl bg-white px-3 py-2 !border !border-slate-200">
                <div class="text-[9px] font-bold uppercase text-slate-400">Order Date</div>
                <div class="mt-1 whitespace-nowrap text-xs font-semibold text-slate-700">
                  {{ formatUploadPreviewDateRange(gayaRawSoActivePreviewSummary.order_date_from, gayaRawSoActivePreviewSummary.order_date_to) }}
                </div>
              </div>
              <div class="rounded-xl bg-white px-3 py-2 !border !border-slate-200 md:col-span-2">
                <div class="text-[9px] font-bold uppercase text-slate-400">Delivery Date</div>
                <div class="mt-1 whitespace-nowrap text-xs font-semibold text-slate-700">
                  {{ formatUploadPreviewDateRange(gayaRawSoActivePreviewSummary.delivery_date_from, gayaRawSoActivePreviewSummary.delivery_date_to) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="h-0 min-h-0 flex-1 overflow-hidden bg-white px-5 pb-5 pt-3">
          <div
            class="relative isolate h-full w-full min-h-0 min-w-0 overflow-auto overscroll-contain rounded-xl !border !border-slate-200 bg-white"
            style="contain: paint;"
          >
            <table
              class="relative z-0 w-full table-fixed border-separate border-spacing-0 bg-white text-sm"
              :style="{ width: '100%', minWidth: gayaRawSoPreviewTableWidth }"
            >
              <thead class="relative z-[100] bg-blue-50">
                <tr>
                  <th
                    v-for="col in gayaRawSoPreviewColumns"
                    :key="`gaya-preview-${col.key}`"
                    class="sticky top-0 box-border p-2 text-center align-middle"
                    :style="{ ...getGayaRawSoColumnStyle(col.key, true, 0, true), ...(col.key === 'jobNo' ? { width: 'auto', maxWidth: 'none' } : {}) }"
                  >
                    <span class="block whitespace-pre-line text-xs font-semibold leading-tight">
                      {{ col.label }}
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody class="relative z-0 bg-white">
                <tr
                  v-for="(row, rowIndex) in gayaRawSoActivePreviewRows"
                  :key="`gaya-preview-row-${gayaRawSoActivePreviewFile}-${row.id || rowIndex}-${row.sourceRow}`"
                  class="h-9"
                >
                  <td
                    v-for="col in gayaRawSoPreviewColumns"
                    :key="`gaya-preview-cell-${rowIndex}-${col.key}`"
                    class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight"
                    :style="{ ...getGayaRawSoColumnStyle(col.key, false, rowIndex, true), ...(col.key === 'jobNo' ? { width: 'auto', maxWidth: 'none' } : {}) }"
                  >
                    <span class="block max-w-full truncate" :title="String(row[col.key] ?? '')">
                      {{
                        ['orderDate', 'deliveryDate'].includes(col.key)
                          ? formatUploadPreviewDate(row[col.key])
                          : ['totalQty', 'qtyPerKanban', 'totalKanban'].includes(col.key)
                            ? formatUploadPreviewNumber(row[col.key])
                            : row[col.key]
                      }}
                    </span>
                  </td>
                </tr>

                <tr v-if="gayaRawSoActivePreviewRows.length === 0">
                  <td
                    :colspan="gayaRawSoPreviewColumns.length"
                    class="p-8 text-center text-gray-400"
                  >
                    Tidak ada data PDF Gaya Motor pada periode terpilih untuk file ini
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex shrink-0 justify-end !border-t !border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            class="h-10 min-w-[90px] rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-95"
            @click="closeGayaRawSoPreview()"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- PREVIEW RAW SALES ORDER NTC                             -->
    <!-- ======================================================= -->
    <div
      v-if="showNtcRawSoPreview"
      class="fixed inset-0 z-[100125] flex items-center justify-center bg-slate-950/50 p-2 sm:p-3"
      @click.self="closeNtcRawSoPreview()"
    >
      <div class="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[1600px] min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div class="flex shrink-0 items-center justify-between gap-4 !border-b !border-slate-200 bg-white px-6 py-4">
          <div>
            <h3 class="text-lg font-bold text-slate-900">
              Preview Raw Sales Order NTC
            </h3>

            <p class="mt-1 text-xs text-slate-500">
              Preview gabungan CSV sebelum Submit - maksimal 100 baris ditampilkan
              <span class="font-semibold text-blue-600">
                ({{ ntcRawSoPreviewRows.length }} preview)
              </span>

              <span class="ml-2 inline-flex items-center rounded-full !border !border-indigo-200 bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">
                {{ selectedUploadPeriodLabel || selectedUploadPeriod }}
              </span>
            </p>
          </div>

          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full !border !border-slate-300 bg-white text-lg text-slate-500 transition hover:!border-red-200 hover:bg-red-50 hover:text-red-600"
            @click="closeNtcRawSoPreview()"
          >
            ×
          </button>
        </div>

        <!-- Summary dipisahkan per Site, tetapi file dari Site yang sama digabung. -->
        <div
          v-if="ntcUploadPreviewSummaryBySite.length > 0"
          class="shrink-0 px-5 pt-4"
        >
          <div
            class="grid grid-cols-1 gap-3"
            :class="ntcUploadPreviewSummaryBySite.length > 1 ? 'lg:grid-cols-2' : ''"
          >
            <div
              v-for="summary in ntcUploadPreviewSummaryBySite"
              :key="summary.site"
              class="rounded-2xl !border !border-slate-200 bg-slate-50/70 p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-extrabold text-slate-900">
                    {{ summary.label }}
                  </div>
                  <div class="mt-0.5 text-[11px] font-semibold text-slate-500">
                    {{ summary.site }}
                  </div>
                </div>

                <div class="flex gap-2">
                  <span class="rounded-full !border !border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                    {{ formatUploadPreviewNumber(summary.total_files) }} file
                  </span>
                  <span class="rounded-full !border !border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    {{ formatUploadPreviewNumber(summary.total_rows) }} row
                  </span>
                </div>
              </div>

              <div class="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                <div class="rounded-xl bg-white px-3 py-2 !border !border-slate-200">
                  <div class="text-[9px] font-bold uppercase text-slate-400">Qty Total</div>
                  <div class="mt-1 text-base font-extrabold text-slate-800">
                    {{ formatUploadPreviewNumber(summary.total_qty) }}
                  </div>
                </div>

                <div class="rounded-xl bg-white px-3 py-2 !border !border-slate-200">
                  <div class="text-[9px] font-bold uppercase text-slate-400">PO</div>
                  <div class="mt-1 truncate text-xs font-semibold text-slate-700" :title="summary.po_numbers.join(', ')">
                    {{ summary.po_numbers.length > 0 ? summary.po_numbers.join(', ') : '-' }}
                  </div>
                </div>

                <div class="rounded-xl bg-white px-3 py-2 !border !border-slate-200">
                  <div class="text-[9px] font-bold uppercase text-slate-400">Order Date</div>
                  <div class="mt-1 whitespace-nowrap text-xs font-semibold text-slate-700">
                    {{ formatUploadPreviewDateRange(summary.order_date_from, summary.order_date_to) }}
                  </div>
                </div>

                <div class="rounded-xl bg-white px-3 py-2 !border !border-slate-200">
                  <div class="text-[9px] font-bold uppercase text-slate-400">Delivery Date</div>
                  <div class="mt-1 whitespace-nowrap text-xs font-semibold text-slate-700">
                    {{ formatUploadPreviewDateRange(summary.delivery_date_from, summary.delivery_date_to) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="h-0 min-h-0 flex-1 overflow-hidden bg-white px-5 pb-5 pt-3">
          <div
            class="relative isolate h-full w-full min-h-0 min-w-0 overflow-auto overscroll-contain rounded-xl !border !border-slate-200 bg-white"
            style="contain: paint; scrollbar-gutter: stable;"
          >
            <table
              class="relative z-0 min-w-max table-fixed border-separate border-spacing-0 bg-white text-sm"
              :style="{ width: ntcRawSoPreviewTableWidth }"
            >
              <thead class="relative z-[100] bg-blue-50">
                <tr>
                  <th
                    v-for="col in ntcRawSoPreviewVisibleColumns"
                    :key="`ntc-preview-${col.key}`"
                    class="sticky top-0 box-border p-2 text-center align-middle"
                    :style="getNtcRawSoColumnStyle(col.key, true, 0, true)"
                  >
                    <span class="block whitespace-pre-line text-xs font-semibold leading-tight">
                      {{ col.label }}
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody class="relative z-0 bg-white">
                <tr
                  v-for="(row, rowIndex) in ntcRawSoPreviewRows"
                  :key="`ntc-preview-row-${row.id || rowIndex}`"
                  class="h-9"
                >
                  <td
                    v-for="col in ntcRawSoPreviewVisibleColumns"
                    :key="`ntc-preview-cell-${rowIndex}-${col.key}`"
                    class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight"
                    :style="getNtcRawSoColumnStyle(col.key, false, rowIndex, true)"
                  >
                    <span
                      class="block max-w-full truncate"
                      :title="row[col.key]"
                    >
                      {{
                        col.key === 'orderDate' || col.key === 'arrivalDate'
                          ? formatUploadPreviewDate(row[col.key])
                          : row[col.key]
                      }}
                    </span>
                  </td>
                </tr>

                <tr v-if="ntcRawSoPreviewRows.length === 0">
                  <td
                    :colspan="ntcRawSoPreviewVisibleColumns.length"
                    class="p-8 text-center text-gray-400"
                  >
                    Tidak ada data CSV NTC pada periode terpilih
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex shrink-0 justify-end !border-t !border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            class="h-10 min-w-[90px] rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-95"
            @click="closeNtcRawSoPreview()"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- PREVIEW HASIL KONVERSI RAW SO TMMIN                     -->
    <!-- ======================================================= -->
    <div
      v-if="showTmminRawSoPreview"
      class="fixed inset-0 z-[100120] flex items-center justify-center bg-slate-950/50 p-2 sm:p-3"
      @click.self="closeTmminRawSoPreview()"
    >
      <div class="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[1500px] min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div class="flex shrink-0 items-center justify-between gap-4 !border-b !border-slate-200 bg-white px-6 py-4">
          <div>
            <h3 class="text-lg font-bold text-slate-900">
              Preview Raw Sales Order TMMIN
            </h3>

            <p class="mt-1 text-xs text-slate-500">
              Preview hasil konversi TXT sebelum Submit - maksimal 100 baris ditampilkan
              <span class="font-semibold text-blue-600">
                ({{ tmminRawSoPreviewRows.length }} preview)
              </span>

              <span class="ml-2 inline-flex items-center rounded-full !border !border-indigo-200 bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">
                {{ selectedUploadPeriodLabel || selectedUploadPeriod }}
              </span>

              <span class="ml-1 inline-flex items-center rounded-full !border !border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                T034 {{ tmminRawSoPreviewCodeCounts.t034 }}
              </span>

              <span class="ml-1 inline-flex items-center rounded-full !border !border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                TMAJ {{ tmminRawSoPreviewCodeCounts.tmaj }}
              </span>
            </p>
          </div>

          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full !border !border-slate-300 bg-white text-lg text-slate-500 transition hover:!border-red-200 hover:bg-red-50 hover:text-red-600"
            @click="closeTmminRawSoPreview()"
          >
            ×
          </button>
        </div>

        <!-- SUMMARY UPLOAD SO TMMIN -->
        <div
          v-if="Object.keys(tmminUploadPreviewSummarySafe).length > 0"
          class="shrink-0 px-5 pt-4"
        >
          <div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div class="rounded-xl !border !border-blue-200 bg-blue-50 px-4 py-3">
              <div class="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                Qty Order (Pcs)
              </div>
              <div class="mt-1 text-xl font-extrabold text-slate-900">
                {{
                  formatUploadPreviewNumber(
                    tmminUploadPreviewSummarySafe.total_qty_order_pcs
                  )
                }}
              </div>
              <div class="mt-0.5 text-[10px] text-slate-500">
                Total quantity periode terpilih
              </div>
            </div>

            <div class="rounded-xl !border !border-slate-200 bg-white px-4 py-3">
              <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Baris Upload
              </div>
              <div class="mt-1 text-lg font-extrabold text-slate-800">
                {{ formatUploadPreviewNumber(tmminUploadPreviewSummarySafe.total_rows) }}
              </div>
              <div class="mt-0.5 text-[10px] text-slate-500">
                KBN aktif
              </div>
            </div>

            <div class="rounded-xl !border !border-slate-200 bg-white px-4 py-3">
              <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Manifest
              </div>
              <div class="mt-1 text-lg font-extrabold text-slate-800">
                {{ formatUploadPreviewNumber(tmminUploadPreviewSummarySafe.unique_manifest) }}
              </div>
              <div class="mt-0.5 text-[10px] text-slate-500">
                Jumlah manifest
              </div>
            </div>

            <div class="rounded-xl !border !border-slate-200 bg-white px-4 py-3">
              <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                PO
              </div>
              <div class="mt-1 text-lg font-extrabold text-slate-800">
                {{ formatUploadPreviewNumber(tmminUploadPreviewSummarySafe.unique_po_number) }}
              </div>
              <div class="mt-0.5 text-[10px] text-slate-500">
                Jumlah PO
              </div>
            </div>
          </div>

          <div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 px-4 py-3 text-xs md:grid-cols-3 lg:grid-cols-6">
            <div>
              <div class="text-[9px] font-bold uppercase text-slate-400">
                Part No
              </div>
              <div class="mt-0.5 font-semibold text-slate-700">
                {{ formatUploadPreviewNumber(tmminUploadPreviewSummarySafe.unique_part_no) }}
              </div>
            </div>

            <div>
              <div class="text-[9px] font-bold uppercase text-slate-400">
                Job No
              </div>
              <div class="mt-0.5 font-semibold text-slate-700">
                {{ formatUploadPreviewNumber(tmminUploadPreviewSummarySafe.unique_job_no) }}
              </div>
            </div>

            <div>
              <div class="text-[9px] font-bold uppercase text-slate-400">
                TXT
              </div>
              <div class="mt-0.5 font-semibold text-slate-700">
                {{ formatUploadPreviewNumber(tmminUploadPreviewSummarySafe.total_txt_files) }} file
              </div>
            </div>

            <div>
              <div class="text-[9px] font-bold uppercase text-slate-400">
                Date SO
              </div>
              <div class="mt-0.5 whitespace-nowrap font-semibold text-slate-700">
                {{
                  formatUploadPreviewDateRange(
                    tmminUploadPreviewSummarySafe.delivery_date_from,
                    tmminUploadPreviewSummarySafe.delivery_date_to
                  )
                }}
              </div>
            </div>

            <div>
              <div class="text-[9px] font-bold uppercase text-slate-400">
                Order Date
              </div>
              <div class="mt-0.5 whitespace-nowrap font-semibold text-slate-700">
                {{
                  formatUploadPreviewDateRange(
                    tmminUploadPreviewSummarySafe.order_date_from,
                    tmminUploadPreviewSummarySafe.order_date_to
                  )
                }}
              </div>
            </div>

            <div>
              <div class="text-[9px] font-bold uppercase text-slate-400">
                Delivery Date
              </div>
              <div class="mt-0.5 whitespace-nowrap font-semibold text-slate-700">
                {{
                  formatUploadPreviewDateRange(
                    tmminUploadPreviewSummarySafe.delivery_date_from,
                    tmminUploadPreviewSummarySafe.delivery_date_to
                  )
                }}
              </div>
            </div>
          </div>
        </div>

        <!-- =================================================== -->
        <!-- PREVIEW TABLE SCROLL VIEWPORT                       -->
        <!-- =================================================== -->
        <!--
          Padding dipisahkan dari scroll viewport supaya row tabel
          tidak pernah terlihat di area atas header ketika vertical
          scroll. Sticky diterapkan langsung pada setiap TH karena
          lebih stabil daripada sticky pada THEAD di browser.
        -->
        <div class="h-0 min-h-0 flex-1 overflow-hidden bg-white px-5 pb-5 pt-3">
          <div
            class="relative isolate h-full w-full min-h-0 min-w-0 overflow-auto overscroll-contain rounded-xl !border !border-slate-200 bg-white"
            style="contain: paint; scrollbar-gutter: stable;"
          >
            <table
              class="relative z-0 min-w-max table-fixed border-separate border-spacing-0 bg-white text-sm"
              :style="{ width: tmminRawSoPreviewTableWidth }"
            >
              <thead class="relative z-[100] bg-blue-50">
                <tr>
                  <th
                    v-for="(col, colIndex) in tmminRawSoPreviewVisibleColumns"
                    :key="`preview-${col.key}`"
                    class="box-border p-2 text-center align-middle"
                    :style="getTmminRawSoPreviewCellStyle(colIndex, true, 0)"
                  >
                    <span class="block whitespace-pre-line text-xs font-semibold leading-tight">
                      {{ col.label }}
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody class="relative z-0 bg-white">
                <tr
                  v-for="(row, rowIndex) in tmminRawSoPreviewRows"
                  :key="`preview-row-${row.id || rowIndex}`"
                  class="h-9"
                >
                  <td
                    v-for="(col, colIndex) in tmminRawSoPreviewVisibleColumns"
                    :key="`preview-cell-${rowIndex}-${col.key}`"
                    :class="[
                      'h-9 box-border overflow-hidden px-1 py-0 align-middle text-xs leading-tight',
                      isTmminPreviewCenteredColumn(col.key)
                        ? 'text-center'
                        : 'text-left'
                    ]"
                    :style="getTmminRawSoPreviewCellStyle(colIndex, false, rowIndex)"
                  >
                    <span
                      class="block max-w-full truncate"
                      :title="row[col.key]"
                    >
                      {{ row[col.key] }}
                    </span>
                  </td>
                </tr>

                <tr v-if="tmminRawSoPreviewRows.length === 0">
                  <td
                    :colspan="tmminRawSoPreviewVisibleColumns.length"
                    class="p-8 text-center text-gray-400"
                  >
                    Tidak ada data hasil konversi
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex shrink-0 justify-end !border-t !border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            class="h-10 min-w-[90px] rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-95"
            @click="closeTmminRawSoPreview()"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- ========================= -->
    <!-- RAW FILES                 -->
    <!-- ========================= -->
    <div class="mb-10 rounded-xl !border !border-gray-200 bg-white p-4 shadow-md">
      <!-- HEADER CARD -->
      <!-- HEADER CARD -->

      <div class="mb-4 grid gap-3 lg:grid-cols-[minmax(190px,1fr)_auto] lg:items-start">
        <!-- LEFT -->

        <div class="min-w-0 flex-1">
          <h2 class="mt-2 text-xl font-bold text-blue-600">Raw Files</h2>

          <p class="mt-2 text-sm text-gray-500">
            File Mentahan Customer
          </p>

          <div
            v-if="isLoadingRawData"
            class="mt-3 inline-flex items-center gap-2 rounded-lg !border !border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4 animate-spin">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 12a8 8 0 10-2.34 5.66" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 4v8h-8" />
            </svg>
            <span>Memuat Raw Sales Order...</span>
          </div>

        </div>

        <!-- RIGHT ACTION -->

        <div
          class="flex shrink-0 flex-wrap items-start justify-end gap-2 lg:flex-nowrap"
        >
          <!-- CLEAR SELECTION -->

          <button
            v-if="rawDeleteSelectedCount > 0"
            type="button"
            :disabled="isDeletingRawFiles || isCancellingRawFiles || isRestoringRawFiles"
            class="inline-flex h-11 items-center justify-center rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 active:scale-95 disabled:opacity-40"
            @click="clearRawDeleteSelection()"
          >
            Clear Selection
          </button>

          <!-- ===================================================== -->
          <!-- CANCEL - ONE MAIN BUTTON                              -->
          <!-- ===================================================== -->

          <div ref="cancelActionMenuRef" class="relative">
            <button
              type="button"
              :disabled="!permissions.update || isCancellingRawFiles || isDeletingRawFiles || isRestoringRawFiles"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-xl !border !border-orange-700 bg-orange-600 px-4 text-sm font-semibold text-white shadow-md transition-all hover:!border-orange-800 hover:bg-orange-700 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:!border-orange-200 disabled:bg-orange-200 disabled:text-orange-500 disabled:shadow-none"
              @click.stop="toggleCancelActionMenu()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>

              <span>Cancel</span>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-4 w-4 transition-transform"
                :class="showCancelActionMenu ? 'rotate-180' : ''"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="translate-y-[-4px] opacity-0 scale-[0.98]"
              enter-to-class="translate-y-0 opacity-100 scale-100"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="translate-y-0 opacity-100 scale-100"
              leave-to-class="translate-y-[-4px] opacity-0 scale-[0.98]"
            >
              <div
                v-if="showCancelActionMenu"
                class="absolute right-0 z-[1200] mt-2 w-[280px] overflow-hidden rounded-2xl !border !border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.20)]"
                @click.stop
              >
                <div class="px-3 pb-2 pt-1">
                  <p class="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                    Cancel Order
                  </p>

                  <p class="mt-1 text-[10px] leading-relaxed text-slate-400">
                    Reversible dan dapat direstore kembali.
                  </p>
                </div>

                <button
                  type="button"
                  :disabled="!permissions.update || rawCancelSelectedCount === 0"
                  class="flex w-full items-center justify-between rounded-xl !border !border-gray-200 bg-orange-50 px-3 py-2.5 text-left text-sm font-semibold text-orange-700 transition hover:!border-orange-200 hover:bg-orange-100 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-40"
                  @click="openCancelSelectedFromMenu()"
                >
                  <span>Cancel Selected</span>

                  <span class="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                    {{ rawCancelSelectedCount }}
                  </span>
                </button>

                <button
                  type="button"
                  :disabled="!permissions.update || !hasRawDeleteActiveFilter || rawFilteredCancelCount === 0"
                  class="mt-1 flex w-full items-center justify-between rounded-xl !border !border-gray-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:!border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                  @click="openCancelFilteredFromMenu()"
                >
                  <span>Cancel Filtered</span>

                  <span class="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                    {{ rawFilteredCancelCount }}
                  </span>
                </button>

                <p
                  v-if="!hasRawDeleteActiveFilter"
                  class="mt-1 rounded-xl !border !border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700"
                >
                  Aktifkan filter data terlebih dahulu untuk menggunakan <strong>Cancel Filtered</strong>.
                </p>

                <div class="my-2 border-t border-slate-100"></div>

                <button
                  type="button"
                  :disabled="isLoadingCancelledData"
                  class="flex w-full items-center justify-between rounded-xl !border !border-gray-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:!border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                  @click="openCancelledFromMenu()"
                >
                  <div class="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
                    </svg>

                    <span>Cancelled ({{ cancelledCount }})</span>
                  </div>

                  <span class="text-xs text-slate-400">View / Restore</span>
                </button>
              </div>
            </Transition>
          </div>

          <!-- ===================================================== -->
          <!-- DELETE - ONE MAIN BUTTON                              -->
          <!-- ===================================================== -->

          <div ref="deleteActionMenuRef" class="relative">
            <button
              type="button"
              :disabled="!permissions.delete || isDeletingRawFiles || isCancellingRawFiles || isRestoringRawFiles"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-xl !border !border-red-700 bg-red-600 px-4 text-sm font-semibold text-white shadow-md transition-all hover:!border-red-800 hover:bg-red-700 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:!border-red-200 disabled:bg-red-200 disabled:text-red-400 disabled:shadow-none"
              @click.stop="toggleDeleteActionMenu()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
              </svg>

              <span>Delete</span>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-4 w-4 transition-transform"
                :class="showDeleteActionMenu ? 'rotate-180' : ''"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="translate-y-[-4px] opacity-0 scale-[0.98]"
              enter-to-class="translate-y-0 opacity-100 scale-100"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="translate-y-0 opacity-100 scale-100"
              leave-to-class="translate-y-[-4px] opacity-0 scale-[0.98]"
            >
              <div
                v-if="showDeleteActionMenu"
                class="absolute right-0 z-[1200] mt-2 w-[280px] overflow-hidden rounded-2xl !border !border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.20)]"
                @click.stop
              >
                <div class="px-3 pb-2 pt-1">
                  <p class="text-[10px] font-bold uppercase tracking-[0.08em] text-red-500">
                    Permanent Delete
                  </p>

                  <p class="mt-1 text-[10px] leading-relaxed text-slate-400">
                    Data yang dihapus tidak dapat direstore.
                  </p>
                </div>

                <button
                  type="button"
                  :disabled="!permissions.delete || rawDeleteSelectedCount === 0"
                  class="flex w-full items-center justify-between rounded-xl !border !border-gray-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:!border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                  @click="openDeleteSelectedFromMenu()"
                >
                  <span>Delete Selected</span>

                  <span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                    {{ rawDeleteSelectedCount }}
                  </span>
                </button>

                <button
                  type="button"
                  :disabled="!permissions.delete || !hasRawDeleteActiveFilter || rawFilteredDeleteCount === 0"
                  class="mt-1 flex w-full items-center justify-between rounded-xl !border !border-gray-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:!border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                  @click="openDeleteFilteredFromMenu()"
                >
                  <span>Delete Filtered</span>

                  <span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                    {{ rawFilteredDeleteCount }}
                  </span>
                </button>

                <p
                  v-if="!hasRawDeleteActiveFilter"
                  class="mt-1 rounded-xl !border !border-red-100 bg-red-50 px-3 py-2 text-[11px] leading-relaxed text-red-700"
                >
                  Aktifkan filter data terlebih dahulu untuk menggunakan <strong>Delete Filtered</strong>.
                </p>
              </div>
            </Transition>
          </div>

          <!-- DOWNLOAD SELECTED -->
          <div
            v-if="rawDeleteSelectedCount > 0"
            class="flex flex-col items-start"
          >
            <button
              type="button"
              :disabled="!permissions.download || !canDownloadSelectedRawExcel"
              :title="!canDownloadSelectedRawExcel ? selectedRawDownloadDescription : ''"
              class="inline-flex h-11 items-center gap-2 rounded-xl !border !border-blue-600 bg-blue-600 px-4 text-sm font-semibold text-white shadow-md transition-all hover:!border-blue-700 hover:bg-blue-700 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              @click="downloadSelectedRawFilesExcel"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" />
              </svg>
              <span>Download Selected ({{ rawDeleteSelectedCount }})</span>
            </button>

            <p
              v-if="selectedRawDownloadDescription"
              class="mt-2 max-w-[260px] px-1 text-[11px] font-medium leading-relaxed text-red-600"
            >
              {{ selectedRawDownloadDescription }}
            </p>
          </div>

          <!-- DOWNLOAD -->

          <div class="flex flex-col items-start">
            <button
              type="button"
              :disabled="!permissions.download || !canDownloadRawExcel || isDeletingRawFiles || isCancellingRawFiles || isRestoringRawFiles"
              :title="rawDownloadTitle"
              class="inline-flex h-11 items-center gap-3 rounded-xl !bg-green-600 px-4 pr-5 text-sm font-semibold text-white shadow-md transition-all hover:!bg-green-700 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              @click="downloadRawFilesExcel"
            >
              <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <svg v-if="!isDownloadingRawExcel" class="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <rect x="6" y="3" width="12" height="18" rx="2" fill="white" />
                  <rect x="4" y="7" width="7" height="10" rx="1.5" fill="#16A34A" />
                  <path d="M6.2 10.2l2.6 3.6M8.8 10.2l-2.6 3.6" stroke="white" stroke-width="1.7" stroke-linecap="round" />
                </svg>

                <svg v-else class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="white" stroke-opacity="0.3" stroke-width="3" />
                  <path d="M21 12a9 9 0 0 1-9 9" stroke="white" stroke-width="3" stroke-linecap="round" />
                </svg>
              </span>

              <span>{{ rawDownloadButtonLabel }} ({{ rawActiveRowCount }})</span>
            </button>

            <p
              v-if="rawDownloadDescription"
              :class="[
                'mt-2 px-1 text-xs font-medium whitespace-nowrap',
                downloadDescriptionIsError ? 'text-red-600' : 'text-slate-500'
              ]"
            >
              {{ rawDownloadDescription }}
            </p>
          </div>
        </div>

        <!-- COMPACT RAW CONTEXT -->
        <div
          v-if="rawMultiSchemaNotice || rawDeleteSelectedCount > 0"
          class="flex min-w-0 flex-wrap items-center gap-2 lg:col-span-2"
        >
          <span
            v-if="rawMultiSchemaNotice"
            class="inline-flex max-w-full items-center rounded-full !border !border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium leading-tight text-amber-800"
          >
            {{ rawMultiSchemaNotice }}
          </span>

          <span
            v-if="rawDeleteSelectedCount > 0"
            class="inline-flex max-w-full items-center gap-1.5 rounded-full !border !border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-medium leading-tight text-blue-700"
          >
            <strong>{{ rawDeleteSelectedCount }} row dipilih</strong>
            <span class="text-blue-500">· Selection reset saat pindah halaman/filter.</span>
          </span>
        </div>
      </div>

      <!-- RAW SALES ORDER DCWA -->
      <div
        v-if="isDcwaSoMode"
        class="relative rounded-lg bg-white"
      >
        <div
          class="relative isolate max-h-[580px] overflow-auto bg-white"
          @scroll.passive="closeDcwaRawSoFilter()"
        >
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{ width: dcwaRawSoTableWidth }"
          >
            <thead class="sticky top-[-1px] z-[300] bg-blue-50">
              <tr>
                <th
                  class="sticky left-0 z-[850] w-12 min-w-12 max-w-12 box-border bg-blue-50 px-2 py-3 text-center align-middle"
                  style="box-shadow: inset 1px 0 0 #e2e8f0, inset -1px 0 0 #e2e8f0, inset 0 1px 0 #e2e8f0, inset 0 -1px 0 #e2e8f0;"
                >
                  <input
                    type="checkbox"
                    :checked="isAllCurrentPageDcwaRawSoSelected"
                    :disabled="dcwaRawSoPaginatedRows.length === 0 || isLoadingDcwaRawSo"
                    class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Select current page"
                    @change="toggleAllCurrentPageDcwaRawSo()"
                  />
                </th>

                <th
                  v-for="col in dcwaRawSoColumns"
                  :key="`dcwa-${col.key}`"
                  class="relative box-border overflow-visible p-2 pt-3 text-center align-top"
                  :style="getDcwaRawSoColumnStyle(col.key, true, 0, false)"
                >
                  <div class="relative z-[1] mb-2 flex h-8 w-full flex-col items-center justify-center overflow-hidden">
                    <span class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-tight text-slate-700">{{ col.label }}</span>
                  </div>

                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="dcwaRawSoSelectedFilters[col.key]?.length ? 'justify-between gap-2' : 'justify-center'"
                    @click.stop="toggleDcwaRawSoDropdown(col.key, $event)"
                  >
                    <span v-if="dcwaRawSoSelectedFilters[col.key]?.length" class="truncate">
                      {{ getDcwaRawSoSelectedLabel(col.key) }}
                    </span>
                    <span>▾</span>
                  </div>

                  <RawOrderFilterPopup
                    :col="{ key: col.key, label: col.label }"
                    :store="customerOrderStore"
                    mode="dcwa"
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, rowIndex) in dcwaRawSoPaginatedRows"
                :key="row.id || `dcwa-${rowIndex}`"
                class="h-9 odd:bg-white even:bg-gray-50"
              >
                <td
                  class="sticky left-0 z-[90] w-12 min-w-12 max-w-12 box-border px-2 py-0 text-center align-middle"
                  :style="{
                    backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                    boxShadow: 'inset 1px 0 0 #e2e8f0, inset -1px 0 0 #e2e8f0, inset 0 -1px 0 #e2e8f0'
                  }"
                >
                  <input
                    type="checkbox"
                    :checked="isDcwaRawSoSelected(row.id)"
                    :disabled="!row.id || row.id <= 0"
                    class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                    @change="toggleDcwaRawSoSelection(row.id)"
                  />
                </td>

                <td
                  v-for="col in dcwaRawSoColumns"
                  :key="`${row.id}-${col.key}`"
                  class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight"
                  :style="getDcwaRawSoColumnStyle(col.key, false, rowIndex, false)"
                >
                  <span
                    class="block max-w-full truncate"
                    :title="String(row[col.key] ?? '')"
                  >
                    {{
                      col.key === 'orderDate'
                        ? formatUploadPreviewDate(row[col.key])
                        : isDcwaRawSoNumericColumn(col.key)
                          ? formatUploadPreviewNumber(row[col.key])
                          : row[col.key]
                    }}
                  </span>
                </td>
              </tr>

              <tr v-if="!isLoadingDcwaRawSo && dcwaRawSoPaginatedRows.length === 0">
                <td :colspan="dcwaRawSoColumns.length + 1" class="!border !border-gray-300 p-6 text-center text-gray-400">
                  Data tidak ditemukan
                </td>
              </tr>
              <tr v-if="isLoadingDcwaRawSo">
                <td :colspan="dcwaRawSoColumns.length + 1" class="!border !border-gray-300 p-6 text-center text-blue-500">
                  Loading Raw Sales Order DCWA...
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div class="flex items-center gap-2 text-sm text-slate-600">
              <span class="font-medium">Show</span>
              <select
                v-model.number="dcwaRawSoRowsPerPage"
              :disabled="isLoadingRawData"
                class="h-10 min-w-[82px] rounded-xl !border !border-solid !border-slate-200 !bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-all hover:!border-blue-300 focus:!border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option v-for="option in dcwaRawSoRowsPerPageOptions" :key="option" :value="option">{{ option }}</option>
              </select>
              <span class="font-medium">records</span>
            </div>

            <div class="text-sm text-slate-600">
              Showing <span class="font-bold text-blue-600">{{ dcwaRawSoShowingStart }}</span>
              to <span class="font-bold text-blue-600">{{ dcwaRawSoShowingEnd }}</span>
              of <span class="font-bold text-blue-600">{{ rawCurrentTableTotalCount }}</span> records
            </div>
          </div>

          <div class="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
            <button type="button" :disabled="isLoadingRawData || dcwaRawSoCurrentPage === 1" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40" @click="dcwaRawSoFirstPage">‹‹</button>
            <button type="button" :disabled="isLoadingRawData || dcwaRawSoCurrentPage === 1" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40" @click="dcwaRawSoPrevPage">‹</button>
            <button
              v-for="pageNumber in dcwaRawSoVisiblePages"
              :key="`dcwa-page-${pageNumber}`"
              type="button"
              :disabled="isLoadingRawData"
              class="h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all"
              :class="pageNumber === dcwaRawSoCurrentPage
                ? '!border-blue-600 bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)]'
                : '!border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600'"
              @click="dcwaRawSoCurrentPage = pageNumber"
            >
              {{ pageNumber }}
            </button>
            <button type="button" :disabled="isLoadingRawData || dcwaRawSoCurrentPage === dcwaRawSoTotalPages" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40" @click="dcwaRawSoNextPage">›</button>
            <button type="button" :disabled="isLoadingRawData || dcwaRawSoCurrentPage === dcwaRawSoTotalPages" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40" @click="dcwaRawSoLastPage">››</button>
          </div>
        </div>
      </div>


      <!-- RAW ORDERING ASI ADM -->
      <div
        v-if="isAsiAdmSoMode"
        class="relative rounded-lg bg-white"
      >
        <div
          class="relative isolate max-h-[580px] overflow-auto bg-white"
          @scroll.passive="customerOrderStore.closeAllPopups()"
        >
          <table
            class="relative isolate w-full table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{ width: '100%', minWidth: asiAdmRawSoTableWidth }"
          >
            <thead class="sticky top-[-1px] z-[300] bg-blue-50">
              <tr>
                <th
                  class="sticky left-0 z-[850] w-12 min-w-12 max-w-12 box-border bg-blue-50 px-2 py-3 text-center align-middle"
                  style="box-shadow: inset 1px 0 0 #e2e8f0, inset -1px 0 0 #e2e8f0, inset 0 1px 0 #e2e8f0, inset 0 -1px 0 #e2e8f0;"
                >
                  <input
                    type="checkbox"
                    :checked="isAllCurrentPageRawSelected"
                    :disabled="asiAdmRawSoPaginatedRows.length === 0 || isDeletingRawFiles"
                    class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Pilih semua Raw Ordering ASI ADM pada halaman ini"
                    @change="toggleAllCurrentPageRawDelete()"
                  />
                </th>

                <th
                  v-for="col in asiAdmRawSoColumns"
                  :key="col.key"
                  class="relative box-border overflow-visible p-2 pt-3 text-center align-top"
                  :style="getAsiAdmRawSoColumnStyle(col.key, true)"
                >
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center overflow-hidden">
                    <span class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-tight">{{ col.label }}</span>
                  </div>

                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="asiAdmRawSoSelectedFilters[col.key]?.length ? 'justify-between gap-2' : 'justify-center'"
                    @click.stop="toggleAsiAdmRawSoDropdown(col.key, $event)"
                  >
                    <span v-if="asiAdmRawSoSelectedFilters[col.key]?.length" class="truncate">{{ getAsiAdmRawSoSelectedLabel(col.key) }}</span>
                    <span>▾</span>
                  </div>

                  <RawOrderFilterPopup
                    :col="{ key: col.key, label: col.label }"
                    :store="customerOrderStore"
                    mode="asi"
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, rowIndex) in asiAdmRawSoPaginatedRows"
                :key="row.id || rowIndex"
                class="h-9 odd:bg-white even:bg-gray-50"
              >
                <td
                  class="sticky left-0 z-[90] w-12 min-w-12 max-w-12 box-border px-2 py-0 text-center align-middle"
                  :style="{ backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc', boxShadow: 'inset 1px 0 0 #e2e8f0, inset -1px 0 0 #e2e8f0, inset 0 -1px 0 #e2e8f0' }"
                >
                  <input
                    type="checkbox"
                    :checked="isRawSelectedForDelete(Number(row.id ?? 0))"
                    :disabled="!row.id || row.id <= 0 || isDeletingRawFiles"
                    class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                    @change="toggleRawDeleteSelection(Number(row.id ?? 0))"
                  />
                </td>

                <td
                  v-for="col in asiAdmRawSoColumns"
                  :key="`${row.id}-${col.key}`"
                  class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight"
                  :style="getAsiAdmRawSoColumnStyle(col.key, false, rowIndex)"
                >
                  <div class="flex h-full w-full items-center justify-center overflow-hidden whitespace-pre-line">
                    <span class="block max-w-full truncate" :title="String(row[col.key] ?? '')">
                      {{ ['orderDate', 'deliveryDate'].includes(col.key) ? formatUploadPreviewDate(row[col.key]) : col.key === 'qty' ? formatUploadPreviewNumber(row[col.key]) : row[col.key] }}
                    </span>
                  </div>
                </td>
              </tr>

              <tr v-if="asiAdmRawSoPaginatedRows.length === 0">
                <td :colspan="asiAdmRawSoColumns.length + 1" class="!border !border-gray-300 p-6 text-center text-gray-400">Data tidak ditemukan</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div class="flex items-center gap-2 text-sm text-slate-600">
              <span class="font-medium">Show</span>
              <select v-model.number="asiAdmRawSoRowsPerPage"
              :disabled="isLoadingRawData" class="h-10 min-w-[82px] rounded-xl !border !border-solid !border-slate-200 !bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 hover:!border-blue-300 focus:!border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option v-for="option in asiAdmRawSoRowsPerPageOptions" :key="option" :value="option">{{ option }}</option>
              </select>
              <span class="font-medium">records</span>
            </div>
            <div class="text-sm text-slate-600">Showing <span class="font-bold text-blue-600">{{ asiAdmRawSoShowingStart }}</span> to <span class="font-bold text-blue-600">{{ asiAdmRawSoShowingEnd }}</span> of <span class="font-bold text-blue-600">{{ rawCurrentTableTotalCount }}</span> records</div>
          </div>

          <div class="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
            <button type="button" :disabled="isLoadingRawData || asiAdmRawSoCurrentPage === 1" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 disabled:opacity-40" @click="asiAdmRawSoFirstPage">‹‹</button>
            <button type="button" :disabled="isLoadingRawData || asiAdmRawSoCurrentPage === 1" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 disabled:opacity-40" @click="asiAdmRawSoPrevPage">‹</button>
            <button v-for="pageNumber in asiAdmRawSoVisiblePages" :key="pageNumber" type="button"
              :disabled="isLoadingRawData" class="h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all" :class="pageNumber === asiAdmRawSoCurrentPage ? '!border-blue-600 bg-blue-600 text-white' : '!border-slate-200 bg-white text-slate-700'" @click="asiAdmRawSoCurrentPage = pageNumber">{{ pageNumber }}</button>
            <button type="button" :disabled="isLoadingRawData || asiAdmRawSoCurrentPage === asiAdmRawSoTotalPages" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 disabled:opacity-40" @click="asiAdmRawSoNextPage">›</button>
            <button type="button" :disabled="isLoadingRawData || asiAdmRawSoCurrentPage === asiAdmRawSoTotalPages" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 disabled:opacity-40" @click="asiAdmRawSoLastPage">››</button>
          </div>
        </div>
      </div>

      <!-- RAW SALES ORDER GAYA MOTOR -->
      <div
        v-if="isGayaSoMode"
        class="relative rounded-lg bg-white"
      >
        <div
          class="relative isolate max-h-[580px] overflow-auto bg-white"
          @scroll.passive="customerOrderStore.closeAllPopups()"
        >
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{ width: gayaRawSoTableWidth }"
          >
            <thead class="sticky top-[-1px] z-[300] bg-blue-50">
              <tr>
                <th
                  class="sticky left-0 z-[850] w-12 min-w-12 max-w-12 box-border bg-blue-50 px-2 py-3 text-center align-middle"
                  style="box-shadow: inset 1px 0 0 #e2e8f0, inset -1px 0 0 #e2e8f0, inset 0 1px 0 #e2e8f0, inset 0 -1px 0 #e2e8f0;"
                >
                  <input
                    type="checkbox"
                    :checked="isAllCurrentPageRawSelected"
                    :disabled="gayaRawSoPaginatedRows.length === 0 || isDeletingRawFiles"
                    class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Pilih semua Raw Gaya Motor pada halaman ini"
                    @change="toggleAllCurrentPageRawDelete()"
                  />
                </th>

                <th
                  v-for="col in gayaRawSoVisibleColumns"
                  :key="col.key"
                  class="relative box-border overflow-visible p-2 pt-3 text-center align-top"
                  :style="getGayaRawSoColumnStyle(col.key, true)"
                >
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center overflow-hidden">
                    <span class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-tight">
                      {{ col.label }}
                    </span>
                  </div>

                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="
                      gayaRawSoSelectedFilters[col.key]?.length
                        ? 'justify-between gap-2'
                        : 'justify-center'
                    "
                    @click.stop="toggleGayaRawSoDropdown(col.key, $event)"
                  >
                    <span
                      v-if="gayaRawSoSelectedFilters[col.key]?.length"
                      class="truncate"
                    >
                      {{ getGayaRawSoSelectedLabel(col.key) }}
                    </span>
                    <span>▾</span>
                  </div>

                  <RawOrderFilterPopup
                    :col="{ key: col.key, label: col.label }"
                    :store="customerOrderStore"
                    mode="gaya"
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, rowIndex) in gayaRawSoPaginatedRows"
                :key="row.id || rowIndex"
                class="h-9 odd:bg-white even:bg-gray-50"
              >
                <td
                  class="sticky left-0 z-[90] w-12 min-w-12 max-w-12 box-border px-2 py-0 text-center align-middle"
                  :style="{
                    backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                    boxShadow: 'inset 1px 0 0 #e2e8f0, inset -1px 0 0 #e2e8f0, inset 0 -1px 0 #e2e8f0'
                  }"
                >
                  <input
                    type="checkbox"
                    :checked="isRawSelectedForDelete(Number(row.id ?? 0))"
                    :disabled="!row.id || row.id <= 0 || isDeletingRawFiles"
                    class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                    @change="toggleRawDeleteSelection(Number(row.id ?? 0))"
                  />
                </td>

                <td
                  v-for="col in gayaRawSoVisibleColumns"
                  :key="`${row.id}-${col.key}`"
                  class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight"
                  :style="getGayaRawSoColumnStyle(col.key, false, rowIndex)"
                >
                  <div class="flex h-full w-full items-center justify-center overflow-hidden whitespace-pre-line">
                    <span class="block max-w-full truncate" :title="String(row[col.key] ?? '')">
                      {{
                        col.key === 'orderDate'
                          ? formatUploadPreviewDate(row[col.key])
                          : ['totalQty', 'qtyPerKanban', 'totalKanban'].includes(col.key)
                            ? formatUploadPreviewNumber(row[col.key])
                            : row[col.key]
                      }}
                    </span>
                  </div>
                </td>
              </tr>

              <tr v-if="gayaRawSoPaginatedRows.length === 0">
                <td
                  :colspan="gayaRawSoVisibleColumns.length + 1"
                  class="!border !border-gray-300 p-6 text-center text-gray-400"
                >
                  Data tidak ditemukan
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div class="flex items-center gap-2 text-sm text-slate-600">
              <span class="font-medium">Show</span>
              <select
                v-model.number="gayaRawSoRowsPerPage"
              :disabled="isLoadingRawData"
                class="h-10 min-w-[82px] rounded-xl !border !border-solid !border-slate-200 !bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 hover:!border-blue-300 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option
                  v-for="option in gayaRawSoRowsPerPageOptions"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
              <span class="font-medium">records</span>
            </div>

            <div class="text-sm text-slate-600">
              Showing
              <span class="font-bold text-blue-600">{{ gayaRawSoShowingStart }}</span>
              to
              <span class="font-bold text-blue-600">{{ gayaRawSoShowingEnd }}</span>
              of
              <span class="font-bold text-blue-600">{{ rawCurrentTableTotalCount }}</span>
              records
            </div>
          </div>

          <div class="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              :disabled="isLoadingRawData || gayaRawSoCurrentPage === 1"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="gayaRawSoFirstPage"
            >‹‹</button>
            <button
              type="button"
              :disabled="isLoadingRawData || gayaRawSoCurrentPage === 1"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="gayaRawSoPrevPage"
            >‹</button>
            <button
              v-for="pageNumber in gayaRawSoVisiblePages"
              :key="pageNumber"
              type="button"
              :disabled="isLoadingRawData"
              class="h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all"
              :class="
                pageNumber === gayaRawSoCurrentPage
                  ? '!border-blue-600 bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)]'
                  : '!border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
              "
              @click="gayaRawSoCurrentPage = pageNumber"
            >
              {{ pageNumber }}
            </button>
            <button
              type="button"
              :disabled="isLoadingRawData || gayaRawSoCurrentPage === gayaRawSoTotalPages"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="gayaRawSoNextPage"
            >›</button>
            <button
              type="button"
              :disabled="isLoadingRawData || gayaRawSoCurrentPage === gayaRawSoTotalPages"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="gayaRawSoLastPage"
            >››</button>
          </div>
        </div>
      </div>

      <!-- RAW SALES ORDER MES -->
      <div
        v-if="isMesSoMode"
        class="relative bg-white"
      >
        <div
          class="relative isolate max-h-[580px] overflow-auto bg-white"
          @scroll.passive="customerOrderStore.closeAllPopups()"
        >
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{ width: '100%', minWidth: mesRawSoTableWidth }"
          >
            <thead class="sticky top-[-1px] z-[300] bg-blue-50">
              <tr>
                <th
                  class="sticky left-0 z-[850] w-12 min-w-12 max-w-12 box-border bg-blue-50 px-2 py-3 text-center align-middle"
                  style="box-shadow: inset 1px 0 0 #e2e8f0, inset -1px 0 0 #e2e8f0, inset 0 1px 0 #e2e8f0, inset 0 -1px 0 #e2e8f0;"
                >
                  <input
                    type="checkbox"
                    :checked="isAllCurrentPageRawSelected"
                    :disabled="mesRawSoPaginatedRows.length === 0 || isDeletingRawFiles"
                    class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Pilih semua Raw MES pada halaman ini"
                    @change="toggleAllCurrentPageRawDelete()"
                  />
                </th>

                <th
                  v-for="col in mesRawSoColumns"
                  :key="`mes-header-${col.key}`"
                  class="relative box-border overflow-visible p-2 pt-3 text-center align-top"
                  :style="getMesRawSoColumnStyle(col.key, true, 0)"
                >
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center overflow-hidden">
                    <span
                      class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-tight text-slate-800"
                      :title="col.label"
                    >
                      {{ col.label }}
                    </span>
                    <span
                      v-if="mesRawSoSelectedFilters[col.key]?.length"
                      class="ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600"
                    />
                  </div>

                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="mesRawSoSelectedFilters[col.key]?.length ? 'justify-between gap-2' : 'justify-center'"
                    @click.stop="toggleMesRawSoDropdown(col.key, $event)"
                  >
                    <span
                      v-if="mesRawSoSelectedFilters[col.key]?.length"
                      class="truncate"
                    >
                      {{ getMesRawSoSelectedLabel(col.key) }}
                    </span>
                    <span>▾</span>
                  </div>

                  <RawOrderFilterPopup
                    :col="{ key: col.key, label: col.label }"
                    :store="customerOrderStore"
                    mode="mes"
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, rowIndex) in mesRawSoPaginatedRows"
                :key="`mes-main-${row.id || rowIndex}`"
                class="h-9 odd:bg-white even:bg-gray-50"
              >
                <td
                  class="sticky left-0 z-[90] w-12 min-w-12 max-w-12 box-border px-2 py-0 text-center align-middle"
                  :style="{
                    backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                    boxShadow: 'inset 1px 0 0 #e2e8f0, inset -1px 0 0 #e2e8f0, inset 0 -1px 0 #e2e8f0'
                  }"
                >
                  <input
                    type="checkbox"
                    :checked="isRawSelectedForDelete(Number(row.id ?? 0))"
                    :disabled="!row.id || Number(row.id) <= 0 || isDeletingRawFiles"
                    class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                    @change="toggleRawDeleteSelection(Number(row.id ?? 0))"
                  />
                </td>

                <td
                  v-for="col in mesRawSoColumns"
                  :key="`mes-main-cell-${row.id || rowIndex}-${col.key}`"
                  class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight text-slate-700"
                  :style="getMesRawSoColumnStyle(col.key, false, rowIndex)"
                >
                  <div class="flex h-full w-full items-center justify-center overflow-hidden">
                    <span
                      class="block max-w-full truncate"
                      :title="String(row[col.key] ?? '')"
                    >
                      {{
                        col.key === 'qty'
                          ? formatUploadPreviewNumber(row[col.key])
                          : ['orderDate', 'deliveryDate'].includes(col.key)
                            ? formatUploadPreviewDate(row[col.key])
                            : row[col.key]
                      }}
                    </span>
                  </div>
                </td>
              </tr>

              <tr v-if="mesRawSoPaginatedRows.length === 0">
                <td
                  :colspan="mesRawSoColumns.length + 1"
                  class="!border !border-gray-300 p-6 text-center text-gray-400"
                >
                  Data tidak ditemukan
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div class="flex items-center gap-2 text-sm text-slate-600">
              <span class="font-medium">Show</span>
              <select
                v-model.number="mesRawSoRowsPerPage"
              :disabled="isLoadingRawData"
                class="h-10 min-w-[82px] rounded-xl !border !border-solid !border-slate-200 !bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 hover:!border-blue-300 focus:!border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option v-for="option in mesRawSoRowsPerPageOptions" :key="`mes-size-${option}`" :value="option">{{ option }}</option>
              </select>
              <span class="font-medium">records</span>
            </div>
            <div class="text-sm text-slate-600">
              Showing <span class="font-bold text-blue-600">{{ mesRawSoShowingStart }}</span> to <span class="font-bold text-blue-600">{{ mesRawSoShowingEnd }}</span> of <span class="font-bold text-blue-600">{{ rawCurrentTableTotalCount }}</span> records
            </div>
          </div>

          <div class="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
            <button type="button" :disabled="isLoadingRawData || mesRawSoCurrentPage === 1" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40" @click="mesRawSoFirstPage">‹‹</button>
            <button type="button" :disabled="isLoadingRawData || mesRawSoCurrentPage === 1" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40" @click="mesRawSoPrevPage">‹</button>
            <button
              v-for="pageNumber in mesRawSoVisiblePages"
              :key="`mes-page-${pageNumber}`"
              type="button"
              :disabled="isLoadingRawData"
              class="h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all"
              :class="pageNumber === mesRawSoCurrentPage ? '!border-blue-600 bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)]' : '!border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'"
              @click="mesRawSoCurrentPage = pageNumber"
            >{{ pageNumber }}</button>
            <button type="button" :disabled="isLoadingRawData || mesRawSoCurrentPage === mesRawSoTotalPages" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40" @click="mesRawSoNextPage">›</button>
            <button type="button" :disabled="isLoadingRawData || mesRawSoCurrentPage === mesRawSoTotalPages" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40" @click="mesRawSoLastPage">››</button>
          </div>
        </div>
      </div>


      <!-- RAW SALES ORDER FTI -->
      <div
        v-if="isFtiSoMode"
        class="relative bg-white"
      >
        <div
          class="relative isolate max-h-[580px] overflow-auto bg-white"
          @scroll.passive="customerOrderStore.closeAllPopups()"
        >
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{ width: '100%', minWidth: ftiRawSoTableWidth }"
          >
            <thead class="sticky top-[-1px] z-[300] bg-blue-50">
              <tr>
                <th
                  class="sticky left-0 z-[850] w-12 min-w-12 max-w-12 box-border bg-blue-50 px-2 py-3 text-center align-middle"
                  style="box-shadow: inset 1px 0 0 #e2e8f0, inset -1px 0 0 #e2e8f0, inset 0 1px 0 #e2e8f0, inset 0 -1px 0 #e2e8f0;"
                >
                  <input
                    type="checkbox"
                    :checked="isAllCurrentPageRawSelected"
                    :disabled="ftiRawSoPaginatedRows.length === 0 || isDeletingRawFiles"
                    class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Pilih semua Raw FTI pada halaman ini"
                    @change="toggleAllCurrentPageRawDelete()"
                  />
                </th>

                <th
                  v-for="col in ftiRawSoColumns"
                  :key="`fti-header-${col.key}`"
                  class="relative box-border overflow-visible p-2 pt-3 text-center align-top"
                  :style="getFtiRawSoColumnStyle(col.key, true, 0)"
                >
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center overflow-hidden">
                    <span
                      class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-tight text-slate-800"
                      :title="col.label"
                    >
                      {{ col.label }}
                    </span>
                    <span
                      v-if="ftiRawSoSelectedFilters[col.key]?.length"
                      class="ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600"
                    />
                  </div>

                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="ftiRawSoSelectedFilters[col.key]?.length ? 'justify-between gap-2' : 'justify-center'"
                    @click.stop="toggleFtiRawSoDropdown(col.key, $event)"
                  >
                    <span
                      v-if="ftiRawSoSelectedFilters[col.key]?.length"
                      class="truncate"
                    >
                      {{ getFtiRawSoSelectedLabel(col.key) }}
                    </span>
                    <span>▾</span>
                  </div>

                  <RawOrderFilterPopup
                    :col="{ key: col.key, label: col.label }"
                    :store="customerOrderStore"
                    mode="fti"
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, rowIndex) in ftiRawSoPaginatedRows"
                :key="`fti-main-${row.id || rowIndex}`"
                class="h-9 odd:bg-white even:bg-gray-50"
              >
                <td
                  class="sticky left-0 z-[90] w-12 min-w-12 max-w-12 box-border px-2 py-0 text-center align-middle"
                  :style="{
                    backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                    boxShadow: 'inset 1px 0 0 #e2e8f0, inset -1px 0 0 #e2e8f0, inset 0 -1px 0 #e2e8f0'
                  }"
                >
                  <input
                    type="checkbox"
                    :checked="isRawSelectedForDelete(Number(row.id ?? 0))"
                    :disabled="!row.id || Number(row.id) <= 0 || isDeletingRawFiles"
                    class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                    @change="toggleRawDeleteSelection(Number(row.id ?? 0))"
                  />
                </td>

                <td
                  v-for="col in ftiRawSoColumns"
                  :key="`fti-main-cell-${row.id || rowIndex}-${col.key}`"
                  class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight text-slate-700"
                  :style="getFtiRawSoColumnStyle(col.key, false, rowIndex)"
                >
                  <div class="flex h-full w-full items-center justify-center overflow-hidden">
                    <span
                      class="block max-w-full truncate"
                      :title="String(row[col.key] ?? '')"
                    >
                      {{
                        col.key === 'qty'
                          ? formatUploadPreviewNumber(row[col.key])
                          : ['orderDate', 'deliveryDate'].includes(col.key)
                            ? formatUploadPreviewDate(row[col.key])
                            : row[col.key]
                      }}
                    </span>
                  </div>
                </td>
              </tr>

              <tr v-if="ftiRawSoPaginatedRows.length === 0">
                <td
                  :colspan="ftiRawSoColumns.length + 1"
                  class="!border !border-gray-300 p-6 text-center text-gray-400"
                >
                  Data tidak ditemukan
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div class="flex items-center gap-2 text-sm text-slate-600">
              <span class="font-medium">Show</span>
              <select
                v-model.number="ftiRawSoRowsPerPage"
              :disabled="isLoadingRawData"
                class="h-10 min-w-[82px] rounded-xl !border !border-solid !border-slate-200 !bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 hover:!border-blue-300 focus:!border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option v-for="option in ftiRawSoRowsPerPageOptions" :key="`fti-size-${option}`" :value="option">{{ option }}</option>
              </select>
              <span class="font-medium">records</span>
            </div>
            <div class="text-sm text-slate-600">
              Showing <span class="font-bold text-blue-600">{{ ftiRawSoShowingStart }}</span> to <span class="font-bold text-blue-600">{{ ftiRawSoShowingEnd }}</span> of <span class="font-bold text-blue-600">{{ rawCurrentTableTotalCount }}</span> records
            </div>
          </div>

          <div class="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
            <button type="button" :disabled="isLoadingRawData || ftiRawSoCurrentPage === 1" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40" @click="ftiRawSoFirstPage">‹‹</button>
            <button type="button" :disabled="isLoadingRawData || ftiRawSoCurrentPage === 1" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40" @click="ftiRawSoPrevPage">‹</button>
            <button
              v-for="pageNumber in ftiRawSoVisiblePages"
              :key="`fti-page-${pageNumber}`"
              type="button"
              :disabled="isLoadingRawData"
              class="h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all"
              :class="pageNumber === ftiRawSoCurrentPage ? '!border-blue-600 bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)]' : '!border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'"
              @click="ftiRawSoCurrentPage = pageNumber"
            >{{ pageNumber }}</button>
            <button type="button" :disabled="isLoadingRawData || ftiRawSoCurrentPage === ftiRawSoTotalPages" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40" @click="ftiRawSoNextPage">›</button>
            <button type="button" :disabled="isLoadingRawData || ftiRawSoCurrentPage === ftiRawSoTotalPages" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40" @click="ftiRawSoLastPage">››</button>
          </div>
        </div>
      </div>

      <!-- RAW SALES ORDER DPM -->
      <div
        v-if="isDpmSoMode"
        class="relative rounded-lg bg-white"
      >
        <div
          class="relative isolate max-h-[580px] overflow-auto bg-white"
          @scroll.passive="customerOrderStore.closeAllPopups()"
        >
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{ width: dpmRawSoMainTableWidth, minWidth: dpmRawSoMainTableWidth }"
          >
            <thead class="sticky top-[-1px] z-[300] bg-blue-50">
              <tr>
                <th
                  class="sticky left-0 top-[-1px] z-[380] w-11 min-w-11 bg-blue-50 p-2 text-center shadow-[inset_1px_0_0_#e2e8f0,inset_-1px_0_0_#e2e8f0,inset_0_-1px_0_#e2e8f0]"
                >
                  <input
                    type="checkbox"
                    :checked="isAllCurrentPageRawSelected"
                    :disabled="dpmRawSoPaginatedRows.length === 0 || isDeletingRawFiles"
                    class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Pilih semua pada halaman ini"
                    @change="toggleAllCurrentPageRawDelete()"
                  />
                </th>
                <th
                  v-for="col in dpmRawSoMainColumns"
                  :key="`dpm-header-${col.key}`"
                  class="relative box-border overflow-visible p-2 pt-3 text-center align-top"
                  :style="getDpmRawSoMainColumnStyle(col.key, true, 0)"
                >
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center overflow-hidden">
                    <span
                      class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-tight text-slate-800"
                      :title="col.label"
                    >
                      {{ col.key === 'diNumber' ? 'DI Number' : col.label }}
                    </span>
                    <span
                      v-if="dpmRawSoSelectedFilters[col.key]?.length"
                      class="ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600"
                    />
                  </div>

                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="dpmRawSoSelectedFilters[col.key]?.length ? 'justify-between gap-2' : 'justify-center'"
                    @click.stop="toggleDpmRawSoDropdown(col.key, $event)"
                  >
                    <span
                      v-if="dpmRawSoSelectedFilters[col.key]?.length"
                      class="truncate"
                    >
                      {{ getDpmRawSoSelectedLabel(col.key) }}
                    </span>
                    <span>▾</span>
                  </div>

                  <RawOrderFilterPopup
                    :col="{ key: col.key, label: col.label }"
                    :store="customerOrderStore"
                    mode="dpm"
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, rowIndex) in dpmRawSoPaginatedRows"
                :key="`dpm-row-${row.id || rowIndex}`"
                class="h-9 odd:bg-white even:bg-gray-50"
              >
                <td
                  class="sticky left-0 z-[100] h-9 w-11 min-w-11 bg-inherit px-2 text-center align-middle shadow-[inset_1px_0_0_#e2e8f0,inset_-1px_0_0_#e2e8f0,inset_0_-1px_0_#e2e8f0]"
                >
                  <input
                    type="checkbox"
                    :checked="isRawSelectedForDelete(Number(row.id ?? 0))"
                    :disabled="!row.id || Number(row.id) <= 0 || isDeletingRawFiles"
                    class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                    @change="toggleRawDeleteSelection(Number(row.id ?? 0))"
                  />
                </td>
                <td
                  v-for="col in dpmRawSoMainColumns"
                  :key="`dpm-cell-${row.id || rowIndex}-${col.key}`"
                  class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight text-slate-700"
                  :style="getDpmRawSoMainColumnStyle(col.key, false, rowIndex)"
                >
                  <div class="flex h-full w-full items-center justify-center overflow-hidden">
                    <span
                      class="block max-w-full truncate"
                      :title="String(row[col.key] ?? '')"
                    >
                      {{
                        col.numeric
                          ? formatUploadPreviewNumber(row[col.key])
                          : row[col.key]
                      }}
                    </span>
                  </div>
                </td>
              </tr>

              <tr v-if="dpmRawSoPaginatedRows.length === 0">
                <td
                  :colspan="dpmRawSoMainColumns.length + 1"
                  class="!border !border-gray-300 p-6 text-center text-gray-400"
                >
                  Data tidak ditemukan
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div class="flex items-center gap-2 text-sm text-slate-600">
              <span class="font-medium">Show</span>
              <select
                v-model.number="dpmRawSoRowsPerPage"
              :disabled="isLoadingRawData"
                class="h-10 min-w-[82px] rounded-xl !border !border-solid !border-slate-200 !bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 hover:!border-blue-300 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option
                  v-for="option in dpmRawSoRowsPerPageOptions"
                  :key="`dpm-size-${option}`"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
              <span class="font-medium">records</span>
            </div>

            <div class="text-sm text-slate-600">
              Showing
              <span class="font-bold text-blue-600">{{ dpmRawSoShowingStart }}</span>
              to
              <span class="font-bold text-blue-600">{{ dpmRawSoShowingEnd }}</span>
              of
              <span class="font-bold text-blue-600">{{ rawCurrentTableTotalCount }}</span>
              records
            </div>
          </div>

          <div class="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              :disabled="isLoadingRawData || dpmRawSoCurrentPage === 1"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="dpmRawSoCurrentPage = 1"
            >‹‹</button>
            <button
              type="button"
              :disabled="isLoadingRawData || dpmRawSoCurrentPage === 1"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="dpmRawSoCurrentPage = Math.max(1, dpmRawSoCurrentPage - 1)"
            >‹</button>
            <button
              v-for="pageNumber in dpmRawSoVisiblePages"
              :key="`dpm-page-${pageNumber}`"
              type="button"
              :disabled="isLoadingRawData"
              class="h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all"
              :class="
                pageNumber === dpmRawSoCurrentPage
                  ? '!border-blue-600 bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)]'
                  : '!border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
              "
              @click="dpmRawSoCurrentPage = pageNumber"
            >
              {{ pageNumber }}
            </button>
            <button
              type="button"
              :disabled="isLoadingRawData || dpmRawSoCurrentPage === dpmRawSoTotalPages"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="dpmRawSoCurrentPage = Math.min(dpmRawSoTotalPages, dpmRawSoCurrentPage + 1)"
            >›</button>
            <button
              type="button"
              :disabled="isLoadingRawData || dpmRawSoCurrentPage === dpmRawSoTotalPages"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="dpmRawSoCurrentPage = dpmRawSoTotalPages"
            >››</button>
          </div>
        </div>
      </div>

      <!-- RAW SALES ORDER NTC -->
      <div
        v-if="isNtcSoMode"
        class="relative rounded-lg bg-white"
      >
        <div
          class="relative isolate max-h-[580px] overflow-auto bg-white"
          @scroll.passive="customerOrderStore.closeAllPopups()"
        >
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{ width: ntcRawSoTableWidth }"
          >
            <thead class="sticky top-[-1px] z-[300] bg-blue-50">
              <tr>
                <th
                  class="sticky left-0 z-[850] w-12 min-w-12 max-w-12 box-border bg-blue-50 px-2 py-3 text-center align-middle"
                  style="box-shadow: inset 1px 0 0 #e2e8f0, inset -1px 0 0 #e2e8f0, inset 0 1px 0 #e2e8f0, inset 0 -1px 0 #e2e8f0;"
                >
                  <input
                    type="checkbox"
                    :checked="isAllCurrentPageRawSelected"
                    class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 accent-blue-600"
                    title="Pilih semua data NTC pada halaman ini"
                    @change="toggleAllCurrentPageRawDelete()"
                  />
                </th>

                <th
                  v-for="col in ntcRawSoVisibleColumns"
                  :key="col.key"
                  class="relative box-border overflow-visible p-2 pt-3 text-center align-top"
                  :style="getNtcRawSoColumnStyle(col.key, true)"
                >
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center overflow-hidden">
                    <span class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-tight">
                      {{ col.label }}
                    </span>
                  </div>

                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="
                      ntcRawSoSelectedFilters[col.key]?.length
                        ? 'justify-between gap-2'
                        : 'justify-center'
                    "
                    @click.stop="toggleNtcRawSoDropdown(col.key, $event)"
                  >
                    <span
                      v-if="ntcRawSoSelectedFilters[col.key]?.length"
                      class="truncate"
                    >
                      {{ getNtcRawSoSelectedLabel(col.key) }}
                    </span>

                    <span>▾</span>
                  </div>

                  <RawOrderFilterPopup
                    :col="{
                      key: col.key,
                      label: col.label
                    }"
                    :store="customerOrderStore"
                    mode="ntc"
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, rowIndex) in ntcRawSoPaginatedRows"
                :key="row.id || rowIndex"
                class="h-9 odd:bg-white even:bg-gray-50"
              >
                <td
                  class="sticky left-0 z-[90] w-12 min-w-12 max-w-12 box-border px-2 py-0 text-center align-middle"
                  :style="{
                    backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                    boxShadow: 'inset 1px 0 0 #e2e8f0, inset -1px 0 0 #e2e8f0, inset 0 -1px 0 #e2e8f0'
                  }"
                >
                  <input
                    type="checkbox"
                    :checked="isRawSelectedForDelete(Number(row.id ?? 0))"
                    class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 accent-blue-600"
                    @change="toggleRawDeleteSelection(Number(row.id ?? 0))"
                  />
                </td>

                <td
                  v-for="col in ntcRawSoVisibleColumns"
                  :key="`${row.id}-${col.key}`"
                  class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight"
                  :style="getNtcRawSoColumnStyle(col.key, false, rowIndex)"
                >
                  <div class="flex h-full w-full items-center justify-center overflow-hidden whitespace-pre-line">
                    <span
                      class="block max-w-full truncate"
                      :title="row[col.key]"
                    >
                      {{ row[col.key] }}
                    </span>
                  </div>
                </td>
              </tr>

              <tr v-if="ntcRawSoPaginatedRows.length === 0">
                <td
                  :colspan="ntcRawSoVisibleColumns.length + 1"
                  class="!border !border-gray-300 p-6 text-center text-gray-400"
                >
                  Data tidak ditemukan
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div class="flex items-center gap-2 text-sm text-slate-600">
              <span class="font-medium">Show</span>

              <select
                v-model.number="ntcRawSoRowsPerPage"
              :disabled="isLoadingRawData"
                class="h-10 min-w-[82px] rounded-xl !border !border-solid !border-slate-200 !bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 hover:!border-blue-300 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option
                  v-for="option in ntcRawSoRowsPerPageOptions"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>

              <span class="font-medium">records</span>
            </div>

            <div class="text-sm text-slate-600">
              Showing
              <span class="font-bold text-blue-600">{{ ntcRawSoShowingStart }}</span>
              to
              <span class="font-bold text-blue-600">{{ ntcRawSoShowingEnd }}</span>
              of
              <span class="font-bold text-blue-600">{{ rawCurrentTableTotalCount }}</span>
              records
            </div>
          </div>

          <div class="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              :disabled="isLoadingRawData || ntcRawSoCurrentPage === 1"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="ntcRawSoFirstPage"
            >
              ‹‹
            </button>

            <button
              type="button"
              :disabled="isLoadingRawData || ntcRawSoCurrentPage === 1"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="ntcRawSoPrevPage"
            >
              ‹
            </button>

            <button
              v-for="pageNumber in ntcRawSoVisiblePages"
              :key="pageNumber"
              type="button"
              :disabled="isLoadingRawData"
              class="h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all"
              :class="
                pageNumber === ntcRawSoCurrentPage
                  ? '!border-blue-600 bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)]'
                  : '!border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
              "
              @click="ntcRawSoCurrentPage = pageNumber"
            >
              {{ pageNumber }}
            </button>

            <button
              type="button"
              :disabled="isLoadingRawData || ntcRawSoCurrentPage === ntcRawSoTotalPages"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="ntcRawSoNextPage"
            >
              ›
            </button>

            <button
              type="button"
              :disabled="isLoadingRawData || ntcRawSoCurrentPage === ntcRawSoTotalPages"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="ntcRawSoLastPage"
            >
              ››
            </button>
          </div>
        </div>
      </div>

      <!-- RAW SALES ORDER TMMIN -->
      <div
        v-if="isTmminSoMode"
        class="relative rounded-lg bg-white"
      >
        <div
          class="relative isolate max-h-[580px] overflow-auto bg-white"
          @scroll.passive="customerOrderStore.closeAllPopups()"
        >
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{ width: tmminRawSoTableWidth }"
          >
            <thead class="sticky top-[-1px] z-[300] bg-blue-50">
              <tr>
                <th
                  class="h-full p-0 text-center align-middle"
                  :style="getTmminRawSoCheckboxColumnStyle(true)"
                >
                  <input
                    type="checkbox"
                    :checked="isAllCurrentPageRawSelected"
                    :disabled="tmminRawSoPaginatedRows.length === 0 || isDeletingRawFiles"
                    class="h-4 w-4 cursor-pointer !border !border-gray-400 rounded accent-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Select current page"
                    @change="toggleAllCurrentPageRawDelete()"
                  />
                </th>

                <th
                  v-for="col in tmminRawSoVisibleColumns"
                  :key="col.key"
                  class="relative box-border overflow-visible p-2 pt-3 text-center align-top"
                  :style="getTmminRawSoColumnStyle(col.key, true)"
                >
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center overflow-hidden">
                    <span class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-tight">
                      {{ col.label }}
                    </span>
                  </div>

                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="
                      tmminRawSoSelectedFilters[col.key]?.length
                        ? 'justify-between gap-2'
                        : 'justify-center'
                    "
                    @click.stop="toggleTmminRawSoDropdown(col.key, $event)"
                  >
                    <span
                      v-if="tmminRawSoSelectedFilters[col.key]?.length"
                      class="truncate"
                    >
                      {{ getTmminRawSoSelectedLabel(col.key) }}
                    </span>

                    <span>▾</span>
                  </div>

                  <RawOrderFilterPopup
                    :col="{
                      key: col.key,
                      label: col.label
                    }"
                    :store="customerOrderStore"
                    mode="tmmin"
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, rowIndex) in tmminRawSoPaginatedRows"
                :key="row.id || rowIndex"
                class="h-9 odd:bg-white even:bg-gray-50"
              >
                <td
                  class="h-9 overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight"
                  :style="getTmminRawSoCheckboxColumnStyle(false, rowIndex)"
                >
                  <input
                    type="checkbox"
                    :checked="isRawSelectedForDelete(row.id)"
                    :disabled="!row.id || row.id <= 0 || isDeletingRawFiles"
                    class="h-4 w-4 cursor-pointer !border !border-gray-400 rounded accent-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    :title="isRawSelectedForDelete(row.id) ? 'Batalkan pilihan' : 'Pilih Raw File untuk action'"
                    @change="toggleRawDeleteSelection(row.id)"
                  />
                </td>

                <td
                  v-for="col in tmminRawSoVisibleColumns"
                  :key="`${row.id}-${col.key}`"
                  class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight"
                  :style="getTmminRawSoColumnStyle(col.key, false, rowIndex)"
                >
                  <div class="flex h-full w-full items-center justify-center overflow-hidden whitespace-pre-line">
                    <span
                      class="block max-w-full truncate"
                      :title="row[col.key]"
                    >
                      {{ row[col.key] }}
                    </span>
                  </div>
                </td>
              </tr>

              <tr v-if="tmminRawSoPaginatedRows.length === 0">
                <td
                  :colspan="tmminRawSoVisibleColumns.length + 1"
                  class="!border !border-gray-300 p-6 text-center text-gray-400"
                >
                  Data tidak ditemukan
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div class="flex items-center gap-2 text-sm text-slate-600">
              <span class="font-medium">Show</span>

              <select
                v-model.number="tmminRawSoRowsPerPage"
              :disabled="isLoadingRawData"
                class="h-10 min-w-[82px] rounded-xl !border !border-solid !border-slate-200 !bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 hover:!border-blue-300 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option
                  v-for="option in tmminRawSoRowsPerPageOptions"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>

              <span class="font-medium">records</span>
            </div>

            <div class="text-sm text-slate-600">
              Showing

              <span class="font-bold text-blue-600">
                {{ tmminRawSoShowingStart }}
              </span>

              to

              <span class="font-bold text-blue-600">
                {{ tmminRawSoShowingEnd }}
              </span>

              of

              <span class="font-bold text-blue-600">
                {{ rawCurrentTableTotalCount }}
              </span>

              records
            </div>
          </div>

          <div class="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              :disabled="isLoadingRawData || tmminRawSoCurrentPage === 1"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="tmminRawSoFirstPage"
            >
              ‹‹
            </button>

            <button
              type="button"
              :disabled="isLoadingRawData || tmminRawSoCurrentPage === 1"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="tmminRawSoPrevPage"
            >
              ‹
            </button>

            <button
              v-for="pageNumber in tmminRawSoVisiblePages"
              :key="pageNumber"
              type="button"
              :disabled="isLoadingRawData"
              class="h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all"
              :class="
                pageNumber === tmminRawSoCurrentPage
                  ? '!border-blue-600 bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)]'
                  : '!border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
              "
              @click="tmminRawSoCurrentPage = pageNumber"
            >
              {{ pageNumber }}
            </button>

            <button
              type="button"
              :disabled="isLoadingRawData || tmminRawSoCurrentPage === tmminRawSoTotalPages"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="tmminRawSoNextPage"
            >
              ›
            </button>

            <button
              type="button"
              :disabled="isLoadingRawData || tmminRawSoCurrentPage === tmminRawSoTotalPages"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="tmminRawSoLastPage"
            >
              ››
            </button>
          </div>
        </div>
      </div>

      <!-- AREA TABEL ADM -->
      <div
        v-if="!isTmminSoMode && !isNtcSoMode && !isAsiAdmSoMode && !isGayaSoMode && !isDcwaSoMode && !isDpmSoMode && !isFtiSoMode && !isMesSoMode"
        class="relative rounded-lg bg-white"
      >
        <div class="relative isolate max-h-[580px] overflow-auto bg-white" @scroll.passive="customerOrderStore.closeAllPopups()">
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{
              width: card2TableWidth
            }"
          >
            <!-- ========================= -->
            <!-- HEADER TABEL -->
            <!-- ========================= -->
            <thead class="sticky top-[-1px] z-[300] bg-blue-50">
              <tr>
                <!-- =============================================== -->
                <!-- SELECT CURRENT PAGE                             -->
                <!-- =============================================== -->

                <th class="h-full p-0 text-center align-middle" :style="getCard2CheckboxColumnStyle(true)">
                  <input
                    type="checkbox"
                    :checked="isAllCurrentPageRawSelected"
                    :disabled="card2PaginatedData.length === 0 || isDeletingRawFiles"
                    class="h-4 w-4 cursor-pointer !border !border-gray-400 rounded accent-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Select current page"
                    @change="toggleAllCurrentPageRawDelete()"
                  />
                </th>

                <!-- EXISTING COLUMNS -->

                <th
                  v-for="col in card2Columns"
                  :key="col.key"
                  class="relative box-border overflow-visible !bg-blue-50 p-2 pt-3 text-center align-top"
                  :style="getCard2ColumnStyle(col.key, true)"
                >
                  <!-- LABEL KOLOM -->
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center overflow-hidden">
                    <span class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-tight mb-1">
                      {{ col.label }}
                    </span>
                  </div>

                  <!-- TOGGLE FILTER -->
                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="card2SelectedFilters[col.key]?.length ? 'justify-between gap-2' : 'justify-center'"
                    @click.stop="toggleCard2Dropdown(col.key, $event)"
                  >
                    <span v-if="card2SelectedFilters[col.key]?.length" class="truncate">
                      {{ getCard2SelectedLabel(col.key) }}
                    </span>

                    <span>▾</span>
                  </div>

                  <!-- ========================= -->
                  <!-- POPUP FILTER -->
                  <!-- ========================= -->
                  <RawOrderFilterPopup :col="col" :store="customerOrderStore" />
                </th>
              </tr>
            </thead>

            <!-- ========================= -->
            <!-- BODY TABEL -->
            <!-- ========================= -->
            <tbody>
              <tr v-for="(row, rowIndex) in card2PaginatedData" :key="row.rawId || rowIndex" class="h-9 odd:bg-white even:bg-gray-50">
                <!-- ===================================================== -->
                <!-- CHECKBOX DELETE RAW FILE                              -->
                <!-- ===================================================== -->

                <td
                  class="h-9 overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight"
                  :style="getCard2CheckboxColumnStyle(false, rowIndex)"
                >
                  <input
                    type="checkbox"
                    :checked="isRawSelectedForDelete(row.rawId)"
                    :disabled="!row.rawId || row.rawId <= 0 || isDeletingRawFiles"
                    class="h-4 w-4 cursor-pointer !border !border-gray-400 rounded accent-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    :title="isRawSelectedForDelete(row.rawId) ? 'Batalkan pilihan' : 'Pilih Raw File untuk dihapus'"
                    @change="toggleRawDeleteSelection(row.rawId)"
                  />
                </td>

                <!-- ===================================================== -->
                <!-- EXISTING RAW FILE COLUMNS                             -->
                <!-- ===================================================== -->

                <td
                  v-for="col in card2Columns"
                  :key="col.key"
                  class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight"
                  :class="card2FrozenColumns?.includes(col.key) ? (rowIndex % 2 === 0 ? '!bg-white' : '!bg-gray-50') : ''"
                  :style="getCard2ColumnStyle(col.key, false, rowIndex)"
                >
                  <div class="relative z-[1] flex h-full w-full items-center justify-center overflow-hidden whitespace-pre-line">
                    <span
                      v-if="isCard2ChipColumn(col.key) && row[col.key]"
                      :class="[
                        card2ChipClass(col.key, row[col.key]),
                        `
              inline-flex
              min-w-[72px]
              items-center
              justify-center
              rounded-full
              border
              px-2
              py-1
              text-xs
              font-medium
            `
                      ]"
                    >
                      {{ row[col.key] }}
                    </span>

                    <span v-else>
                      {{ displayCard2Value(col.key, row[col.key]) }}
                    </span>
                  </div>
                </td>
              </tr>

              <!-- ======================================================= -->
              <!-- EMPTY                                                   -->
              <!-- ======================================================= -->

              <tr v-if="card2PaginatedData.length === 0">
                <td :colspan="card2Columns.length + 1" class="!border !border-gray-300 p-6 text-center text-gray-400">
                  Data tidak ditemukan
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ========================= -->
      <!-- PAGINATION -->
      <!-- ========================= -->
      <div
        v-if="!isTmminSoMode && !isNtcSoMode && !isAsiAdmSoMode && !isGayaSoMode && !isDcwaSoMode && !isDpmSoMode && !isFtiSoMode && !isMesSoMode"
        class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between"
      >
        <!-- KIRI -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <!-- ROWS PER PAGE -->
          <div class="flex items-center gap-2 text-sm text-slate-600">
            <span class="font-medium"> Show </span>

            <select
              v-model.number="card2RowsPerPage"
              :disabled="isLoadingRawData"
              class="h-10 min-w-[82px] rounded-xl !border !border-solid !border-slate-200 !bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 hover:!border-blue-300 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option v-for="option in card2RowsPerPageOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>

            <span class="font-medium"> records </span>
          </div>

          <!-- SHOWING INFO -->
          <div class="text-sm text-slate-600">
            Showing

            <span class="font-bold text-blue-600">
              {{ card2ShowingStart }}
            </span>

            to

            <span class="font-bold text-blue-600">
              {{ card2ShowingEnd }}
            </span>

            of

            <span class="font-bold text-blue-600">
              {{ rawCurrentTableTotalCount }}
            </span>

            records
          </div>
        </div>

        <!-- KANAN -->
        <div class="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            :disabled="isLoadingRawData || card2CurrentPage === 1"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            @click="card2FirstPage"
          >
            ‹‹
          </button>

          <button
            type="button"
            :disabled="isLoadingRawData || card2CurrentPage === 1"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            @click="card2PrevPage"
          >
            ‹
          </button>

          <button
            v-for="pageNumber in card2VisiblePages"
            :key="pageNumber"
            type="button"
              :disabled="isLoadingRawData"
            class="h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all"
            :class="
              pageNumber === card2CurrentPage
                ? ` !border
                    !border-blue-600
                    bg-blue-600
                    text-white
                    shadow-[0_8px_18px_rgba(37,99,235,0.28)]
                  `
                : ` !border
                    !border-slate-200
                    bg-white
                    text-slate-700
                    hover:border-blue-300
                    hover:bg-blue-50
                    hover:text-blue-600
                  `
            "
            @click="card2CurrentPage = pageNumber"
          >
            {{ pageNumber }}
          </button>

          <button
            type="button"
            :disabled="isLoadingRawData || card2CurrentPage === card2TotalPages"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            @click="card2NextPage"
          >
            ›
          </button>

          <button
            type="button"
            :disabled="isLoadingRawData || card2CurrentPage === card2TotalPages"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            @click="card2LastPage"
          >
            ››
          </button>
        </div>
      </div>
    </div>

    <!-- ========================= -->

    <!-- ======================================================= -->
    <!-- CANCEL RAW ORDER MODAL                                  -->
    <!-- ======================================================= -->

    <div
      v-if="showCancelRawModal"
      class="fixed inset-0 z-[100150] flex items-center justify-center bg-slate-950/50 p-2 sm:p-3"
      @click.self="closeCancelRawModal()"
    >
      <div class="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <!-- HEADER -->

        <div class="flex shrink-0 items-start justify-between gap-4 !border-b !border-slate-200 bg-orange-50 px-6 py-5">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-orange-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                Reversible
              </span>

              <span class="text-[11px] font-medium text-orange-700">
                Sales Document tetap disimpan
              </span>
            </div>

            <h3 class="mt-2 text-lg font-bold text-slate-900">
              {{
                cancelRawMode === 'selected'
                  ? 'Cancel Selected Order'
                  : 'Cancel Filtered Order'
              }}
            </h3>

            <p class="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">
              {{
                isAsiAdmSoMode
                  ? 'Raw Ordering ASI ADM akan keluar dari data aktif. Format Sales Order dan Tracking ASI ADM ikut tersembunyi sampai data direstore kembali; Sales Document tetap dipertahankan. ASI ADM belum masuk DN Crosscheck/Report.'
                  : isDpmSoMode
                    ? 'Raw Sales Order DPM akan keluar dari data aktif. Format Sales Order dan Tracking DPM ikut tersembunyi sampai data direstore kembali; Sales Document tetap dipertahankan. DPM tidak dimasukkan ke DN Crosscheck/Report.'
                  : isDcwaSoMode
                    ? 'Raw Sales Order DCWA akan keluar dari data aktif. Format Sales Order dan DN Crosscheck juga tidak menghitung data yang dicancel sampai data direstore kembali; Sales Document tetap dipertahankan.'
                    : 'Raw Files akan keluar dari data aktif. Format Sales Order dan DN Monitoring juga tidak menghitung data yang dicancel sampai data direstore kembali.'
              }}
            </p>
          </div>

          <button
            type="button"
            :disabled="isCancellingRawFiles"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full !border !border-slate-300 bg-white text-lg text-slate-500 transition hover:!border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
            @click="closeCancelRawModal()"
          >
            ×
          </button>
        </div>

        <!-- BODY -->

        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <!-- SUMMARY -->

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl !border !border-slate-200 bg-slate-50 px-4 py-3.5">
              <p class="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                Total Data
              </p>

              <p class="mt-1 text-lg font-bold text-orange-700">
                {{ cancelTotalCount }}
                <span class="text-xs font-semibold text-slate-500">row</span>
              </p>
            </div>

            <div class="rounded-2xl !border !border-slate-200 bg-slate-50 px-4 py-3.5">
              <label
                for="cancelActionBy"
                class="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400"
              >
                Cancelled By
                <span class="text-red-500">*</span>
              </label>

              <div class="mt-2 flex items-center gap-2">
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700"
                >
                  {{
                    cancelActionBy
                      ? cancelActionBy.slice(0, 1).toUpperCase()
                      : '?'
                  }}
                </span>

                <div class="relative min-w-0 flex-1">
                  <select
                    id="cancelActionBy"
                    v-model="cancelActionBy"
                    :disabled="isCancellingRawFiles"
                    class="h-10 w-full appearance-none rounded-xl !border !border-slate-300 bg-white px-3 pr-9 text-sm font-semibold text-slate-700 outline-none transition hover:!border-blue-300 focus:!border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="" disabled>
                      Pilih user
                    </option>

                    <option
                      v-for="user in uploadUserOptions"
                      :key="user"
                      :value="user"
                    >
                      {{ user }}
                    </option>
                  </select>

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="m6 9 6 6 6-6"
                    />
                  </svg>
                </div>
              </div>

              <p class="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                Menggunakan daftar user yang sama dengan Upload By.
              </p>
            </div>
          </div>

          <!-- ORDER / DN -->

          <div class="overflow-hidden rounded-2xl !border !border-slate-200 bg-white">
            <div class="flex flex-col gap-2 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  Order / DN yang akan dicancel
                </p>

                <p class="mt-1 text-xs text-slate-500">
                  {{ cancelPreviewOrderNos.length }} nomor Order / DN terdeteksi.
                </p>
              </div>

              <div class="flex max-w-full flex-wrap gap-1.5">
                <span
                  v-for="orderNo in cancelPreviewOrderNos.slice(0, 5)"
                  :key="orderNo"
                  class="max-w-[190px] truncate rounded-full bg-white px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200"
                  :title="orderNo"
                >
                  {{ orderNo }}
                </span>

                <span
                  v-if="cancelPreviewOrderNos.length > 5"
                  class="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600"
                >
                  +{{ cancelPreviewOrderNos.length - 5 }} lainnya
                </span>
              </div>
            </div>

            <div class="max-h-[260px] overflow-auto">
              <table class="min-w-[760px] w-full text-left text-xs">
                <thead class="sticky top-0 z-10 bg-white text-[10px] uppercase text-slate-500 shadow-[inset_0_-1px_0_#e2e8f0]">
                  <tr>
                    <th class="px-4 py-3">Order / DN</th>
                    <th class="px-4 py-3">Part No</th>
                    <th class="px-4 py-3">Part Name</th>
                    <th class="px-4 py-3 text-right">Qty</th>
                    <th class="px-4 py-3">Order Date</th>
                  </tr>
                </thead>

                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="row in cancelPreviewRows"
                    :key="row.rawId"
                    class="hover:bg-orange-50/40"
                  >
                    <td class="px-4 py-2.5 font-mono text-[11px] font-semibold text-slate-800">
                      {{ row.orderNo || '-' }}
                    </td>

                    <td class="px-4 py-2.5 font-mono text-[11px] text-slate-700">
                      {{ row.partNo || '-' }}
                    </td>

                    <td class="max-w-[280px] px-4 py-2.5 text-slate-700">
                      <span class="block truncate" :title="row.partName || ''">
                        {{ row.partName || '-' }}
                      </span>
                    </td>

                    <td class="px-4 py-2.5 text-right font-semibold text-slate-700">
                      {{ row.orderPcs || '-' }}
                    </td>

                    <td class="px-4 py-2.5 text-slate-600">
                      {{ row.orderDate || '-' }}
                    </td>
                  </tr>

                  <tr v-if="cancelPreviewRows.length === 0">
                    <td colspan="5" class="px-4 py-10 text-center text-sm text-slate-400">
                      Detail row tidak tersedia.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              v-if="cancelPreviewHiddenCount > 0"
              class="!border-t !border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-[10px] font-semibold text-slate-500"
            >
              Preview menampilkan 20 row pertama · {{ cancelPreviewHiddenCount }} row lainnya tetap ikut diproses.
            </div>
          </div>

          <!-- FILTER INFO -->

          <div
            v-if="cancelRawMode === 'filtered'"
            class="rounded-2xl !border !border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-700"
          >
            <strong>Cancel Filtered</strong> diproses ulang oleh backend berdasarkan Customer, Order Date, dan filter kolom aktif. Seluruh hasil filter ikut dicancel, bukan hanya row pada pagination yang sedang terlihat.
          </div>

          <!-- DN RULE -->

          <div class="rounded-2xl !border !border-orange-200 bg-orange-50 px-4 py-3 text-xs leading-relaxed text-orange-800">
            <strong>DN rule:</strong>
            jika hanya sebagian part dari satu DN dicancel, DN tetap aktif di Monitoring. DN baru hilang ketika seluruh part pada DN tersebut sudah dicancel.
          </div>

          <!-- REASON - ALWAYS LAST -->

          <div>
            <label class="text-xs font-bold text-slate-700">
              Alasan Cancel
              <span class="text-red-500">*</span>
            </label>

            <textarea
              v-model="cancelReason"
              rows="4"
              maxlength="500"
              placeholder="Contoh: Sudah ada SO pengganti / customer revise order / salah upload..."
              class="mt-2 w-full resize-y rounded-2xl !border !border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:!border-orange-400 focus:ring-2 focus:ring-orange-100"
            />

            <div class="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
              <span>Wajib diisi untuk audit history.</span>
              <span>{{ cancelReason.length }} / 500</span>
            </div>
          </div>
        </div>

        <!-- FOOTER -->

        <div class="flex shrink-0 items-center justify-end gap-2 !border-t !border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            :disabled="isCancellingRawFiles"
            class="h-10 rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
            @click="closeCancelRawModal()"
          >
            Batal
          </button>

          <button
            type="button"
            :disabled="!cancelReason.trim() || !cancelActionBy || isCancellingRawFiles"
            class="h-10 rounded-xl !border !border-orange-700 bg-orange-600 px-5 text-sm font-bold text-white shadow-sm transition hover:!border-orange-800 hover:bg-orange-700 active:scale-95 disabled:cursor-not-allowed disabled:!border-orange-200 disabled:bg-orange-200 disabled:text-orange-500"
            @click="openFinalCancelConfirm()"
          >
            {{ isCancellingRawFiles ? 'Cancelling...' : `Confirm Cancel (${cancelTotalCount})` }}
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- FINAL CANCEL CONFIRM MODAL                              -->
    <!-- ======================================================= -->

    <Teleport to="body">
      <div
        v-if="showFinalCancelConfirm"
        class="fixed inset-0 z-[100300] flex h-[100dvh] items-center justify-center bg-slate-950/55 p-4"
        @click.self="closeFinalCancelConfirm()"
      >
        <div
          class="w-full max-w-[500px] overflow-hidden rounded-[24px] !border !border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.35)]"
        >
          <!-- HEADER -->

          <div class="flex items-start justify-between gap-4 !border-b !border-orange-100 bg-orange-50 px-5 py-4">
            <div class="flex min-w-0 items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="h-5 w-5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01" />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M10.3 3.7h3.4L21 17l-1.5 2.5h-15L3 17l7.3-13.3Z"
                  />
                </svg>
              </div>

              <div class="min-w-0">
                <h3 class="text-base font-bold text-slate-900">
                  Confirm Cancel Order
                </h3>

                <p class="mt-1 text-xs leading-relaxed text-slate-500">
                  Pastikan data berikut sudah benar sebelum proses cancel dijalankan.
                </p>
              </div>
            </div>

            <button
              type="button"
              :disabled="isCancellingRawFiles"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full !border !border-slate-300 bg-white text-lg text-slate-500 transition hover:!border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="closeFinalCancelConfirm()"
            >
              ×
            </button>
          </div>

          <!-- BODY -->

          <div class="space-y-4 px-5 py-5">
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-2xl !border !border-slate-200 bg-slate-50 px-4 py-3">
                <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Total Data
                </p>

                <p class="mt-1 text-lg font-bold text-orange-700">
                  {{ cancelTotalCount }}
                </p>
              </div>

              <div class="rounded-2xl !border !border-slate-200 bg-slate-50 px-4 py-3">
                <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Cancelled By
                </p>

                <div class="mt-1 flex items-center gap-2">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {{
                      cancelActionBy
                        ? cancelActionBy.slice(0, 1).toUpperCase()
                        : '?'
                    }}
                  </span>

                  <span class="truncate text-sm font-bold text-slate-800">
                    {{ cancelActionBy || '-' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="rounded-2xl !border !border-slate-200 bg-white px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Cancel Mode
              </p>

              <p class="mt-1 text-sm font-semibold text-slate-800">
                {{
                  cancelRawMode === 'selected'
                    ? 'Cancel Selected'
                    : 'Cancel Filtered'
                }}
              </p>

              <p
                v-if="cancelRawMode === 'filtered'"
                class="mt-1 text-[11px] leading-relaxed text-orange-700"
              >
                Seluruh hasil filter akan dicancel, bukan hanya row pada halaman pagination yang sedang terlihat.
              </p>
            </div>

            <div
              v-if="cancelRawMode === 'selected' && cancelPreviewOrderNos.length > 0"
              class="rounded-2xl !border !border-slate-200 bg-white px-4 py-3"
            >
              <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Order / DN
              </p>

              <div class="mt-2 flex max-h-24 flex-wrap gap-2 overflow-auto">
                <span
                  v-for="orderNo in cancelPreviewOrderNos.slice(0, 10)"
                  :key="orderNo"
                  class="rounded-full !border !border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-700"
                >
                  {{ orderNo }}
                </span>

                <span
                  v-if="cancelPreviewOrderNos.length > 10"
                  class="rounded-full !border !border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500"
                >
                  +{{ cancelPreviewOrderNos.length - 10 }} lainnya
                </span>
              </div>
            </div>

            <div class="rounded-2xl !border !border-slate-200 bg-white px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Reason
              </p>

              <p class="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                {{ cancelReason || '-' }}
              </p>
            </div>

            <div class="rounded-2xl !border !border-orange-200 bg-orange-50 px-4 py-3">
              <div class="flex items-start gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="mt-0.5 h-4 w-4 shrink-0 text-orange-600"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01" />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M10.3 3.7h3.4L21 17l-1.5 2.5h-15L3 17l7.3-13.3Z"
                  />
                </svg>

                <p class="text-xs leading-relaxed text-orange-800">
                  Data akan dikeluarkan dari Raw Files aktif, Format Sales Order,
                  dan perhitungan DN terkait. Data tetap tersimpan dan dapat direstore kembali.
                </p>
              </div>
            </div>
          </div>

          <!-- FOOTER -->

          <div class="flex items-center justify-end gap-2 !border-t !border-slate-200 bg-slate-50 px-5 py-4">
            <button
              type="button"
              :disabled="isCancellingRawFiles"
              class="h-10 rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              @click="closeFinalCancelConfirm()"
            >
              Kembali
            </button>

            <button
              type="button"
              :disabled="isCancellingRawFiles"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-xl !border !border-orange-700 bg-orange-600 px-5 text-sm font-bold text-white shadow-sm transition hover:!border-orange-800 hover:bg-orange-700 active:scale-95 disabled:cursor-not-allowed disabled:!border-orange-200 disabled:bg-orange-200"
              @click="executeFinalCancel()"
            >
              <svg
                v-if="!isCancellingRawFiles"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-4 w-4"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>

              {{
                isCancellingRawFiles
                  ? 'Cancelling...'
                  : `Yes, Cancel ${cancelTotalCount} Data`
              }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ======================================================= -->
    <!-- CANCELLED / RESTORE DRAWER                               -->
    <!-- ======================================================= -->

    <Teleport to="body">
      <div
        v-if="showCancelledDrawer"
        class="fixed inset-0 z-[100040] h-[100dvh] overflow-hidden bg-slate-950/40"
        @click.self="closeCancelledDrawerPanel()"
      >
        <div class="ml-auto flex h-[100dvh] w-full max-w-[1180px] flex-col overflow-hidden bg-white shadow-2xl">
          <div class="flex shrink-0 items-start gap-4 !border-b !border-slate-200 bg-slate-50 px-5 py-4">
            <div class="min-w-0 flex-1">
            <h3 class="text-lg font-bold text-slate-900">
              Cancelled Order
            </h3>

            <p class="mt-1 text-xs text-slate-500">
              Lihat part, DN, Special Order, dan Service Part yang sedang dicancel, audit history, lalu restore menggunakan nomor Sales Document yang sama.
            </p>
          </div>

          <div class="ml-auto flex shrink-0 items-center gap-2">
            <input
              v-model="restoreReason"
              type="text"
              maxlength="500"
              placeholder="Catatan restore (optional)"
              class="h-10 w-[240px] rounded-xl !border !border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:!border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />

            <button
              type="button"
              :disabled="cancelledSelectedCount === 0 || isRestoringRawFiles || hasMultiSpecialRawSchemaSelection"
              class="h-10 shrink-0 rounded-xl !border !border-indigo-700 bg-indigo-600 px-4 text-xs font-bold text-white transition hover:!border-indigo-800 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:!border-indigo-200 disabled:bg-indigo-200"
              @click="openRestoreSelectedConfirm()"
            >
              {{
                isRestoringRawFiles
                  ? 'Restoring...'
                  : `Restore Selected (${cancelledSelectedCount})`
              }}
            </button>

            <button
              type="button"
              title="Close"
              class="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full !border !border-slate-300 bg-white text-xl text-slate-500 transition hover:!border-red-200 hover:bg-red-50 hover:text-red-600"
              @click="closeCancelledDrawerPanel()"
            >
              ×
            </button>
          </div>
        </div>

        <!-- TABS -->

        <div class="flex shrink-0 gap-2 !border-b !border-slate-200 bg-white px-5 py-3">
          <button
            type="button"
            class="rounded-xl px-4 py-2 text-xs font-bold transition"
            :class="cancelledDrawerTab === 'parts' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="setCancelledDrawerTab('parts')"
          >
            Cancelled Parts ({{ cancelledRawTotal }})
          </button>

          <button
            type="button"
            class="rounded-xl px-4 py-2 text-xs font-bold transition"
            :class="cancelledDrawerTab === 'dn' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="setCancelledDrawerTab('dn')"
          >
            Cancelled DN / SO-SP ({{ cancelledDnLoaded ? cancelledDnTotal : '…' }})
          </button>

          <button
            type="button"
            class="rounded-xl px-4 py-2 text-xs font-bold transition"
            :class="cancelledDrawerTab === 'history' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="setCancelledDrawerTab('history')"
          >
            History ({{ cancelHistoryTotal }})
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-hidden p-5 pb-0">
          <div
            v-if="isLoadingCancelledData"
            class="flex h-48 items-center justify-center text-sm font-semibold text-slate-500"
          >
            Loading cancelled data...
          </div>

          <!-- PARTS -->

          <div v-else-if="cancelledDrawerTab === 'parts'" class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl !border !border-slate-200">
            <div class="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
              <div>
                <h4 class="text-sm font-bold text-slate-800">
                  Current Cancelled Parts
                </h4>

                <p class="mt-0.5 text-[10px] text-slate-500">
                  {{
                    isDcwaSoMode
                      ? 'Row DCWA di sini tidak muncul pada Raw Sales Order aktif maupun Format Sales Order sampai direstore.'
                      : 'Row di sini tidak muncul pada Raw Files aktif dan Format Sales Order.'
                  }}
                </p>

                <p
                  v-if="hasMultiSpecialRawSchemaSelection"
                  class="mt-2 rounded-lg !border !border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold leading-relaxed text-amber-800"
                >
                  Multi-customer dengan schema Raw berbeda hanya untuk melihat data. Restore Selected dilakukan per customer agar ID Raw tidak tercampur antar tabel.
                </p>
              </div>

              <button
                type="button"
                :disabled="hasMultiSpecialRawSchemaSelection"
                class="rounded-lg !border !border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                @click="toggleAllCancelledRawSelection()"
              >
                Toggle All
              </button>
            </div>

            <div class="min-h-0 flex-1 overflow-auto">
              <table class="min-w-[1180px] w-full text-left text-xs">
                <thead class="sticky top-0 bg-slate-100 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th class="w-10 px-3 py-3">✓</th>
                    <th class="px-3 py-3">Customer / Plant</th>
                    <th class="px-3 py-3">Order / DN</th>
                    <th class="px-3 py-3">Sales Document</th>
                    <th class="px-3 py-3">Part No</th>
                    <th class="px-3 py-3">Part Name</th>
                    <th class="px-3 py-3">Qty</th>
                    <th class="px-3 py-3">Order Date</th>
                    <th class="px-3 py-3">Cancelled At</th>
                    <th class="px-3 py-3">Cancelled By</th>
                    <th class="px-3 py-3">Reason</th>
                  </tr>
                </thead>

                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="row in cancelledRawRows"
                    :key="`${row.customer_code || row.plant_code || 'UNKNOWN'}-${row.id}`"
                    class="hover:bg-indigo-50/40"
                  >
                    <td class="px-3 py-2">
                      <input
                        type="checkbox"
                        :checked="isCancelledRawSelected(row.id)"
                        :disabled="hasMultiSpecialRawSchemaSelection"
                        class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                        @change="toggleCancelledRawSelection(row.id)"
                      />
                    </td>

                    <td class="px-3 py-2 font-semibold text-slate-700">
                      {{ row.customer_code || row.plant_code || '-' }}
                    </td>

                    <td class="px-3 py-2 font-mono text-[11px] text-slate-800">
                      {{ row.order_no || '-' }}
                    </td>

                    <td class="px-3 py-2 font-mono text-[11px] text-blue-700">
                      {{ row.sales_document || '-' }}
                    </td>

                    <td class="px-3 py-2 font-mono text-[11px]">
                      {{ row.part_no || '-' }}
                    </td>

                    <td class="max-w-[240px] px-3 py-2">
                      <span class="block truncate" :title="String(row.part_name || '')">
                        {{ row.part_name || '-' }}
                      </span>
                    </td>

                    <td class="px-3 py-2 text-right">
                      {{ row.order_pcs || '-' }}
                    </td>

                    <td class="px-3 py-2">
                      {{ row.order_date || '-' }}
                    </td>

                    <td class="px-3 py-2">
                      {{ formatCancelLifecycleDate(row.cancelled_at) }}
                    </td>

                    <td class="px-3 py-2">
                      {{ row.cancelled_by || '-' }}
                    </td>

                    <td class="max-w-[260px] px-3 py-2">
                      <span class="block truncate" :title="String(row.cancel_reason || '')">
                        {{ row.cancel_reason || '-' }}
                      </span>
                    </td>
                  </tr>

                  <tr v-if="cancelledRawRows.length === 0">
                    <td colspan="11" class="px-4 py-12 text-center text-sm text-slate-400">
                      Tidak ada part yang sedang dicancel.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex shrink-0 flex-wrap items-center justify-between gap-3 !border-t !border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
              <div>
                {{ cancelledRawTotal === 0 ? 0 : ((cancelledRawPage - 1) * cancelledRowsPerPage) + 1 }}
                -
                {{ Math.min(cancelledRawPage * cancelledRowsPerPage, cancelledRawTotal) }}
                dari {{ cancelledRawTotal }} part
              </div>

              <div class="flex items-center gap-2">
                <select
                  v-model.number="cancelledRowsPerPage"
                  class="h-8 rounded-lg !border !border-slate-300 bg-white px-2 text-xs"
                  @change="setCancelledRowsPerPage(cancelledRowsPerPage)"
                >
                  <option v-for="size in cancelledRowsPerPageOptions" :key="`cancelled-parts-${size}`" :value="size">
                    {{ size }} / page
                  </option>
                </select>

                <button
                  type="button"
                  class="h-8 rounded-lg !border !border-slate-300 bg-white px-3 disabled:opacity-40"
                  :disabled="cancelledRawPage <= 1 || isLoadingCancelledData"
                  @click="setCancelledRawPage(cancelledRawPage - 1)"
                >
                  Prev
                </button>

                <span class="min-w-[76px] text-center font-semibold">
                  {{ cancelledRawPage }} / {{ cancelledRawTotalPages }}
                </span>

                <button
                  type="button"
                  class="h-8 rounded-lg !border !border-slate-300 bg-white px-3 disabled:opacity-40"
                  :disabled="cancelledRawPage >= cancelledRawTotalPages || isLoadingCancelledData"
                  @click="setCancelledRawPage(cancelledRawPage + 1)"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <!-- DN -->

          <div v-else-if="cancelledDrawerTab === 'dn'" class="h-full min-h-0 overflow-auto pr-1">
            <div class="mb-3 rounded-xl !border !border-indigo-100 bg-indigo-50 px-4 py-3 text-[11px] leading-relaxed text-indigo-700">
              Tab ini mengelompokkan satu logical order menjadi satu kartu: DN, Special Order (SO), dan Service Part (SP). Jadi beberapa part dengan Order No yang sama tidak ditampilkan sebagai kartu terpisah.
            </div>

            <div
              v-for="row in cancelledDnRows"
              :key="row.dn_number"
              class="mb-3 rounded-xl !border !border-slate-200 bg-white p-4 shadow-sm"
            >
              <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-mono text-sm font-bold text-slate-900">
                      {{ row.dn_number }}
                    </span>

                    <span class="rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-bold text-cyan-700">
                      {{ row.customer }}
                    </span>

                    <span
                      class="rounded-full px-2.5 py-1 text-[10px] font-bold"
                      :class="
                        row.cancel_state === 'FULL_CANCELLED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      "
                    >
                      {{
                        row.cancel_state === 'FULL_CANCELLED'
                          ? 'FULL CANCELLED'
                          : 'PARTIAL CANCELLED'
                      }}
                    </span>
                  </div>

                  <p class="mt-2 text-xs text-slate-500">
                    {{ row.cancelled_parts }} cancelled /
                    {{ row.total_parts }} total part ·
                    {{ row.active_parts }} active
                  </p>

                  <pre class="mt-3 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 px-3 py-2 font-sans text-[11px] leading-relaxed text-slate-700">{{ row.cancelled_part_list || '-' }}</pre>

                  <div class="mt-3 grid gap-1 text-[10px] text-slate-500 sm:grid-cols-2">
                    <span>Last Cancel: {{ formatCancelLifecycleDate(row.last_cancelled_at) }}</span>
                    <span>By: {{ row.cancelled_by || '-' }}</span>
                    <span>
                      DN In Office:
                      {{
                        row.registered_date
                          ? `Close · ${row.registered_date}`
                          : 'Open / belum registered'
                      }}
                    </span>
                    <span>Registration: {{ row.registration_status || '-' }}</span>
                    <span class="sm:col-span-2">Reason: {{ row.cancel_reason || '-' }}</span>
                  </div>
                </div>

                <button
                  type="button"
                  :disabled="isRestoringRawFiles"
                  class="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:bg-indigo-200"
                  @click="openRestoreDnConfirm(row)"
                >
                  Restore Cancelled Order
                </button>
              </div>
            </div>

            <div
              v-if="cancelledDnRows.length === 0"
              class="rounded-xl !border !border-dashed !border-slate-300 px-4 py-12 text-center text-sm text-slate-400"
            >
              Tidak ada DN, Special Order, atau Service Part yang mempunyai part cancelled.
            </div>
          </div>

          <!-- HISTORY -->

          <div v-else class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl !border !border-slate-200">
            <div class="min-h-0 flex-1 overflow-auto">
              <table class="min-w-[1120px] w-full text-left text-xs">
                <thead class="sticky top-0 bg-slate-100 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th class="px-3 py-3">Action</th>
                    <th class="px-3 py-3">Action At</th>
                    <th class="px-3 py-3">By</th>
                    <th class="px-3 py-3">Customer</th>
                    <th class="px-3 py-3">Order / DN</th>
                    <th class="px-3 py-3">Sales Document</th>
                    <th class="px-3 py-3">Part</th>
                    <th class="px-3 py-3">Reason / Note</th>
                  </tr>
                </thead>

                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="row in cancelHistoryRows"
                    :key="`${row.customer_code || row.plant_code || 'UNKNOWN'}-${row.id}-${row.action}`"
                    class="hover:bg-slate-50"
                  >
                    <td class="px-3 py-2">
                      <span
                        class="rounded-full px-2.5 py-1 text-[10px] font-bold"
                        :class="
                          row.action === 'CANCEL'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        "
                      >
                        {{ row.action }}
                      </span>
                    </td>

                    <td class="px-3 py-2">
                      {{ formatCancelLifecycleDate(row.action_at) }}
                    </td>

                    <td class="px-3 py-2">
                      {{ row.action_by || '-' }}
                    </td>

                    <td class="px-3 py-2">
                      {{ row.customer_code || row.plant_code || '-' }}
                    </td>

                    <td class="px-3 py-2 font-mono text-[11px]">
                      {{ row.order_no || '-' }}
                    </td>

                    <td class="px-3 py-2 font-mono text-[11px] text-blue-700">
                      {{ row.sales_document || '-' }}
                    </td>

                    <td class="px-3 py-2">
                      {{ row.part_no || '-' }}
                      <span v-if="row.part_name" class="text-slate-400">
                        · {{ row.part_name }}
                      </span>
                    </td>

                    <td class="max-w-[300px] px-3 py-2">
                      <span class="block truncate" :title="String(row.reason || '')">
                        {{ row.reason || '-' }}
                      </span>
                    </td>
                  </tr>

                  <tr v-if="cancelHistoryRows.length === 0">
                    <td colspan="8" class="h-[420px] px-4 py-12 text-center align-middle text-sm text-slate-400">
                      Belum ada history Cancel / Restore.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex shrink-0 flex-wrap items-center justify-between gap-3 !border-t !border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
              <div>
                {{ cancelHistoryTotal === 0 ? 0 : ((cancelHistoryPage - 1) * cancelHistoryRowsPerPage) + 1 }}
                -
                {{ Math.min(cancelHistoryPage * cancelHistoryRowsPerPage, cancelHistoryTotal) }}
                dari {{ cancelHistoryTotal }} history
              </div>

              <div class="flex items-center gap-2">
                <select
                  v-model.number="cancelHistoryRowsPerPage"
                  class="h-8 rounded-lg !border !border-slate-300 bg-white px-2 text-xs"
                  @change="setCancelHistoryRowsPerPage(cancelHistoryRowsPerPage)"
                >
                  <option v-for="size in cancelledRowsPerPageOptions" :key="`cancelled-history-${size}`" :value="size">
                    {{ size }} / page
                  </option>
                </select>

                <button
                  type="button"
                  class="h-8 rounded-lg !border !border-slate-300 bg-white px-3 disabled:opacity-40"
                  :disabled="cancelHistoryPage <= 1 || isLoadingCancelledData"
                  @click="setCancelHistoryPage(cancelHistoryPage - 1)"
                >
                  Prev
                </button>

                <span class="min-w-[76px] text-center font-semibold">
                  {{ cancelHistoryPage }} / {{ cancelHistoryTotalPages }}
                </span>

                <button
                  type="button"
                  class="h-8 rounded-lg !border !border-slate-300 bg-white px-3 disabled:opacity-40"
                  :disabled="cancelHistoryPage >= cancelHistoryTotalPages || isLoadingCancelledData"
                  @click="setCancelHistoryPage(cancelHistoryPage + 1)"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </Teleport>

    <!-- ======================================================= -->
    <!-- RESTORE CONFIRM MODAL - ALWAYS ABOVE CANCELLED DRAWER      -->
    <!-- ======================================================= -->

    <Teleport to="body">
      <div
        v-if="showRestoreConfirmModal"
        class="fixed inset-0 z-[100250] flex h-[100dvh] items-center justify-center bg-slate-950/55 p-4"
        @click.self="closeRestoreConfirmModal()"
      >
      <div class="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
        <div class="flex items-start justify-between gap-4 !border-b !border-slate-200 bg-indigo-50 px-6 py-5">
          <div>
            <div class="flex items-center gap-2">
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
                </svg>
              </span>

              <div>
                <h3 class="text-base font-bold text-slate-900">
                  {{ restoreConfirmTitle }}
                </h3>

                <p class="mt-0.5 text-[11px] font-medium text-indigo-600">
                  Data akan diaktifkan kembali
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            :disabled="isRestoringRawFiles"
            class="flex h-9 w-9 items-center justify-center rounded-full !border !border-slate-300 bg-white text-lg text-slate-500 transition hover:!border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
            @click="closeRestoreConfirmModal()"
          >
            ×
          </button>
        </div>

        <div class="space-y-4 px-6 py-5">
          <p class="text-sm leading-relaxed text-slate-600">
            {{ restoreConfirmMessage }}
          </p>

          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-2xl !border !border-slate-200 bg-slate-50 px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Total Restore
              </p>

              <p class="mt-1 text-lg font-bold text-indigo-700">
                {{ restoreConfirmIds.length }}
                <span class="text-xs font-semibold text-slate-500">row</span>
              </p>
            </div>

            <div class="rounded-2xl !border !border-emerald-200 bg-emerald-50 px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                Sales Document
              </p>

              <p class="mt-1 text-xs font-bold leading-relaxed text-emerald-800">
                Nomor lama tetap digunakan
              </p>
            </div>
          </div>

          <div>
            <label class="text-xs font-bold text-slate-700">
              Catatan Restore
              <span class="font-normal text-slate-400">(optional)</span>
            </label>

            <textarea
              v-model="restoreReason"
              rows="3"
              maxlength="500"
              placeholder="Tambahkan catatan restore jika diperlukan..."
              class="mt-2 w-full resize-y rounded-2xl !border !border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:!border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 !border-t !border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            :disabled="isRestoringRawFiles"
            class="h-10 rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
            @click="closeRestoreConfirmModal()"
          >
            Batal
          </button>

          <button
            type="button"
            :disabled="isRestoringRawFiles"
            class="h-10 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-indigo-200"
            @click="confirmRestoreFromModal()"
          >
            {{ isRestoringRawFiles ? 'Restoring...' : `Confirm Restore (${restoreConfirmIds.length})` }}
          </button>
        </div>
        </div>
      </div>
    </Teleport>

    <!-- FORMAT SALES ORDER -->
    <!-- ========================= -->
    <div
      ref="formatSOSectionRef"
      class="mb-10 rounded-xl border border-gray-200 bg-white p-4 shadow-md"
    >
      <!-- HEADER -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="mt-2 text-xl font-bold text-blue-600">Format Sales Order</h2>

          <p class="mt-2 text-sm text-gray-500">Konversi file mentahan customer menjadi format Sales Order yang sesuai</p>

          <div
            v-if="isLoadingFormatSO"
            class="mt-3 inline-flex items-center gap-2 rounded-xl !border !border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm"
          >
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.22" stroke-width="3" />
              <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>

            <span>Memuat Format Sales Order...</span>
          </div>

        </div>

        <div class="flex flex-wrap items-start justify-end gap-3">
          <button
            v-if="formatSOSelectedCount > 0"
            type="button"
            :disabled="isLoadingFormatSO || isAnyExcelDownloading || isRegeneratingFormatSO"
            class="inline-flex h-11 items-center justify-center rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 active:scale-95 disabled:opacity-40"
            @click="clearFormatSOSelection()"
          >
            Clear Selection
          </button>

          <div
            v-if="formatSOSelectedCount > 0"
            class="flex flex-col items-start"
          >
            <button
              type="button"
              :disabled="!permissions.download || isLoadingFormatSO || !canDownloadSelectedFormatSOExcel"
              :title="!canDownloadSelectedFormatSOExcel ? selectedFormatSODownloadDescription : ''"
              class="inline-flex h-11 items-center gap-2 rounded-xl !border !border-blue-600 bg-blue-600 px-4 text-sm font-semibold text-white shadow-md transition-all hover:!border-blue-700 hover:bg-blue-700 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              @click="downloadSelectedFormatSOExcel"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" />
              </svg>
              <span>Download Selected ({{ formatSOSelectedCount }})</span>
            </button>

            <p
              v-if="selectedFormatSODownloadDescription"
              class="mt-2 max-w-[260px] px-1 text-[11px] font-medium leading-relaxed text-red-600"
            >
              {{ selectedFormatSODownloadDescription }}
            </p>
          </div>

          <!-- DOWNLOAD FORMAT SALES ORDER -->
          <div class="flex flex-col items-start">
            <button
              type="button"
              :disabled="!permissions.download || isLoadingFormatSO || !canDownloadFormatSOExcel"
              :title="!canDownloadFormatSOExcel ? formatSODownloadDescription : ''"
              class="inline-flex h-11 items-center gap-3 rounded-xl !bg-green-600 px-4 pr-5 text-sm font-semibold text-white shadow-md transition-all hover:!bg-green-700 hover:shadow-lg! active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              @click="downloadFormatSOExcel"
            >
              <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <svg v-if="!isDownloadingFormatSO" class="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <rect x="6" y="3" width="12" height="18" rx="2" fill="white" />
                  <rect x="4" y="7" width="7" height="10" rx="1.5" fill="#16A34A" />
                  <path d="M6.2 10.2l2.6 3.6M8.8 10.2l-2.6 3.6" stroke="white" stroke-width="1.7" stroke-linecap="round" />
                </svg>

                <svg v-else class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="white" stroke-opacity="0.3" stroke-width="3" />
                  <path d="M21 12a9 9 0 0 1-9 9" stroke="white" stroke-width="3" stroke-linecap="round" />
                </svg>
              </span>

              <span v-if="isLoadingFormatSO">Loading Format SO...</span>
              <span v-else>{{ formatSODownloadButtonLabel }} ({{ formatSOActiveRowCount }})</span>
            </button>


          </div>

          <!-- REGENERATE -->
          <button
            type="button"
            :disabled="!permissions.update || isLoadingFormatSO || isAnyExcelDownloading || isRegeneratingFormatSO"
            title="Regenerate memproses seluruh hasil filter, bukan hanya halaman yang sedang terlihat."
            class="inline-flex h-11 items-center gap-3 rounded-xl !bg-green-600 px-4 pr-5 text-sm font-semibold text-white shadow-md transition-all hover:!bg-green-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            @click="regenerateFormatSalesOrder"
          >
            <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
              <svg
                class="h-5 w-5"
                :class="{
                  'animate-spin': isLoadingFormatSO || isRegeneratingFormatSO
                }"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="
                      M20 11a8.1 8.1 0 0 0-15.5-2
                      M4 4v5h5
                      M4 13a8.1 8.1 0 0 0 15.5 2
                      M20 20v-5h-5
                    "
                />
              </svg>
            </span>

            <span>
              {{
                isLoadingFormatSO
                  ? 'Loading Format SO...'
                  : isRegeneratingFormatSO
                    ? 'Regenerating...'
                    : `${selectedCustomer ? `Regenerate ${selectedCustomer}` : 'Regenerate All'} (${regenerateFormatSOActiveRowCount})`
              }}
            </span>
          </button>
        </div>
      </div>

      <!-- TABLE AREA -->
      <div class="relative rounded-lg bg-white">
        <div class="relative isolate max-h-[580px] overflow-auto bg-white" @scroll.passive="customerOrderStore.closeAllPopups()">
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{
              width: formatSOTableWidth
            }"
          >
            <!-- HEADER -->
            <thead class="sticky top-[-1px] z-[300] bg-blue-50">
              <tr>
                <th
                  class="h-full p-0 text-center align-middle"
                  :style="getFormatSOCheckboxColumnStyle(true)"
                >
                  <input
                    type="checkbox"
                    :checked="isAllCurrentPageFormatSOSelected"
                    :disabled="formatSOPaginatedData.length === 0 || isDownloadingFormatSO"
                    class="h-4 w-4 cursor-pointer rounded !border !border-gray-400 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Select current page"
                    @change="toggleAllCurrentPageFormatSO()"
                  />
                </th>

                <th
                  v-for="col in formatSOColumns"
                  :key="col.key"
                  class="relative box-border overflow-visible bg-blue-50 p-2 pt-3 text-center align-top"
                  :style="getFormatSOColumnStyle(col.key, true)"
                >
                  <!-- LABEL -->
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center overflow-hidden">
                    <span class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-tight mb-1">
                      {{ col.label }}
                    </span>
                  </div>

                  <!-- FILTER BUTTON -->
                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="formatSOSelectedFilters[col.key]?.length ? 'justify-between gap-2' : 'justify-center'"
                    @click.stop="toggleFormatSOFilter(col.key, $event)"
                  >
                    <span v-if="formatSOSelectedFilters[col.key]?.length" class="truncate">
                      {{ getFormatSOSelectedLabel(col.key) }}
                    </span>

                    <span>▾</span>
                  </div>

                  <!-- POPUP -->
                  <FormatSOFilterPopup :col="col" :store="customerOrderStore" />
                </th>
              </tr>
            </thead>

            <!-- BODY -->
            <tbody>
              <tr
                v-for="(item, rowIndex) in formatSOPaginatedData"
                :key="item.id ?? `${item.sales_document}-${item.item}-${rowIndex}`"
                class="odd:bg-white even:bg-gray-50"
              >
                <td
                  class="h-9 overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight"
                  :style="getFormatSOCheckboxColumnStyle(false, rowIndex)"
                >
                  <input
                    type="checkbox"
                    :checked="isFormatSOSelected(item.id)"
                    :disabled="!item.id || Number(item.id) <= 0 || isDownloadingFormatSO"
                    class="h-4 w-4 cursor-pointer rounded !border !border-gray-400 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                    :title="isFormatSOSelected(item.id) ? 'Batalkan pilihan' : 'Pilih Format Sales Order untuk download'"
                    @change="toggleFormatSOSelection(item.id)"
                  />
                </td>

                <td
                  v-for="col in formatSOColumns"
                  :key="col.key"
                  class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight"
                  :class="formatSOFrozenColumns.includes(col.key) ? (rowIndex % 2 === 0 ? '!bg-white' : '!bg-gray-50') : ''"
                  :style="getFormatSOColumnStyle(col.key, false, rowIndex)"
                >
                  <div
                    class="relative z-[1] flex h-full w-full items-center justify-center overflow-hidden whitespace-pre-line"
                    :title="String(item[col.key] ?? '')"
                  >
                    {{ item[col.key] }}
                  </div>
                </td>
              </tr>

              <tr v-if="isLoadingFormatSO && formatSOPaginatedData.length === 0">
                <td
                  :colspan="formatSOColumns.length + 1"
                  class="!border !border-gray-300 p-8 text-center"
                >
                  <div class="flex flex-col items-center justify-center gap-3 text-blue-700">
                    <svg class="h-7 w-7 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.2" stroke-width="3" />
                      <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                    </svg>

                    <div>
                      <div class="text-sm font-bold">Memuat Format Sales Order...</div>
                      <div class="mt-1 text-xs font-medium text-slate-500">
                        Sistem masih membaca data dari database. Data akan tampil otomatis setelah proses selesai.
                      </div>
                    </div>
                  </div>
                </td>
              </tr>

              <tr v-else-if="formatSOPaginatedData.length === 0">
                <td :colspan="formatSOColumns.length + 1" class="!border !border-gray-300 p-6 text-center text-gray-400">No data</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- PAGINATION -->
      <div
        class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between"
      >
        <!-- LEFT -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div class="flex items-center gap-2 text-sm text-slate-600">
            <span class="font-medium"> Show </span>

            <select
              v-model.number="formatSORowsPerPage"
              class="h-10 min-w-[82px] rounded-xl !border !border-solid !border-slate-200 !bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 hover:!border-blue-300 hover:!bg-white focus:!border-blue-500 focus:!bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option v-for="option in formatSORowsPerPageOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>

            <span class="font-medium"> records </span>
          </div>

          <div v-if="isLoadingFormatSO" class="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.2" stroke-width="3" />
              <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            <span>Loading data...</span>
          </div>

          <div v-else class="text-sm text-slate-600">
            Showing

            <span class="font-bold text-blue-600">
              {{ formatSOShowingStart }}
            </span>

            to

            <span class="font-bold text-blue-600">
              {{ formatSOShowingEnd }}
            </span>

            of

            <span class="font-bold text-blue-600">
              {{ formatSOActiveRowCount }}
            </span>

            records
          </div>
        </div>

        <!-- RIGHT -->
        <div class="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            :disabled="isLoadingFormatSO || formatSOCurrentPage === 1"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
            @click="formatSOFirstPage"
          >
            ‹‹
          </button>

          <button
            type="button"
            :disabled="isLoadingFormatSO || formatSOCurrentPage === 1"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
            @click="formatSOPrevPage"
          >
            ‹
          </button>

          <button
            v-for="pageNumber in formatSOVisiblePages"
            :key="pageNumber"
            type="button"
            class="h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all"
            :class="
              pageNumber === formatSOCurrentPage
                ? `
                !border-blue-600
                bg-blue-600
                text-white
                shadow-[0_8px_18px_rgba(37,99,235,0.28)]
              `
                : `
                !border-slate-200
                bg-white
                text-slate-700
                hover:bg-blue-50
                hover:text-blue-600
              `
            "
            @click="formatSOCurrentPage = pageNumber"
          >
            {{ pageNumber }}
          </button>

          <button
            type="button"
            :disabled="isLoadingFormatSO || formatSOCurrentPage === formatSOTotalPages"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
            @click="formatSONextPage"
          >
            ›
          </button>

          <button
            type="button"
            :disabled="isLoadingFormatSO || formatSOCurrentPage === formatSOTotalPages"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
            @click="formatSOLastPage"
          >
            ››
          </button>
        </div>
      </div>
    </div>

    <!-- ========================= -->
    <!-- TRACKING UPLOAD SALES ORDER -->
    <!-- ========================= -->
    <div
      ref="trackingSectionRef"
      class="mb-10 rounded-xl bg-white p-4 shadow-md"
    >
      <!-- HEADER -->
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="mt-2 text-xl font-bold text-emerald-800">Tracking Upload Sales Order</h2>

          <p class="mt-2 text-sm text-gray-500">Monitoring dan histori upload Sales Order customer</p>
        </div>

        <button
          type="button"
          :disabled="!permissions.update"
          class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl !border px-4 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
          :class="
            trackingBulkMode
              ? '!border-emerald-600 bg-emerald-600 text-white shadow-sm'
              : '!border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
          "
          @click="toggleTrackingBulkMode"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>

          Update Multiple

          <span
            v-if="trackingBulkSelectedCount > 0"
            class="rounded-full px-2 py-0.5 text-[10px]"
            :class="trackingBulkMode ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'"
          >
            {{ trackingBulkSelectedCount }}
          </span>
        </button>
      </div>

      <!-- BULK UPDATE PANEL -->
      <div
        v-if="trackingBulkMode"
        class="mb-4 rounded-2xl !border !border-emerald-200 bg-emerald-50/40 p-3"
      >
        <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div class="text-sm font-bold text-emerald-800">
              Isi beberapa Tracking sekaligus
            </div>

            <p class="mt-1 text-[11px] text-slate-500">
              Pilih baris, isi field yang ingin disamakan, lalu klik Terapkan.
              Field yang kosong tidak akan diubah.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm">
              {{ trackingBulkSelectedCount }} baris dipilih
            </span>

            <button
              type="button"
              class="h-8 rounded-lg !border !border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              @click="selectTrackingBulkCurrentPage"
            >
              Pilih Halaman Ini
            </button>

            <button
              type="button"
              class="h-8 rounded-lg !border !border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              @click="selectTrackingBulkFilteredRows"
            >
              Pilih Semua Hasil Filter
            </button>

            <button
              type="button"
              class="h-8 rounded-lg !border !border-slate-200 bg-white px-3 text-[11px] font-semibold text-red-600 hover:bg-red-50"
              @click="clearTrackingBulkSelection"
            >
              Clear Pilihan
            </button>
          </div>
        </div>

        <div class="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <!-- Tanggal Upload -->
          <div class="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200">
            <div class="mb-1.5 flex items-center justify-between gap-2">
              <label class="text-[10px] font-bold uppercase text-slate-400">
                Tanggal Upload
              </label>

              <button
                type="button"
                class="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700"
                @click="setTrackingBulkToday"
              >
                Hari ini
              </button>
            </div>

            <input
              v-model="trackingBulkDate"
              type="date"
              class="h-8 w-full rounded-lg !border !border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:!border-emerald-400"
            />
          </div>

          <!-- Jam Upload -->
          <div class="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200">
            <div class="mb-1.5 flex items-center justify-between gap-2">
              <label class="text-[10px] font-bold uppercase text-slate-400">
                Jam Upload
              </label>

              <button
                type="button"
                class="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700"
                @click="setTrackingBulkNow"
              >
                Sekarang
              </button>
            </div>

            <input
              v-model="trackingBulkTime"
              type="time"
              step="60"
              class="h-8 w-full rounded-lg !border !border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:!border-emerald-400"
            />
          </div>

          <!-- Nama Upload SO -->
          <div class="relative rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200">
            <label class="mb-1.5 block text-[10px] font-bold uppercase text-slate-400">
              Nama Upload SO
            </label>

            <button
              type="button"
              class="flex h-8 w-full items-center justify-between gap-2 rounded-lg !border !border-slate-200 bg-white px-2 text-left text-xs outline-none transition hover:!border-emerald-300 focus:!border-emerald-400"
              @click.stop="toggleTrackingBulkUserValueDropdown"
            >
              <span
                v-if="trackingBulkUser"
                :class="[
                  userColorClass(trackingBulkUser),
                  'inline-flex min-w-[76px] max-w-[calc(100%_-_22px)] items-center justify-center truncate rounded-full !border px-2 py-1 text-[10px] font-medium'
                ]"
              >
                {{ trackingBulkUser }}
              </span>

              <span v-else class="truncate text-slate-400">
                Tidak diubah
              </span>

              <span class="shrink-0 text-slate-400">⌄</span>
            </button>

            <div
              v-if="trackingBulkUserDropdownOpen"
              class="absolute left-2.5 right-2.5 top-[62px] z-[500] max-h-[250px] overflow-y-auto rounded-xl !border !border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
              @click.stop
            >
              <button
                type="button"
                class="flex h-8 w-full items-center justify-center rounded-lg px-2 text-xs text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                @click="selectTrackingBulkUserValue('')"
              >
                Tidak diubah
              </button>

              <div class="my-1 !border-t !border-slate-100" />

              <button
                v-for="user in trackingBulkVisibleUserOptions"
                :key="user"
                type="button"
                class="flex h-9 w-full items-center rounded-lg px-2 transition hover:bg-slate-50"
                :class="trackingBulkUser === user ? 'bg-emerald-50' : 'bg-white'"
                @click="selectTrackingBulkUserValue(user)"
              >
                <span
                  :class="[
                    userColorClass(user),
                    'inline-flex min-w-[88px] flex-1 items-center justify-center truncate rounded-full !border px-2 py-1 text-[10px] font-medium'
                  ]"
                >
                  {{ user }}
                </span>
              </button>
            </div>
          </div>

          <!-- Status -->
          <div class="relative rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200">
            <label class="mb-1.5 block text-[10px] font-bold uppercase text-slate-400">
              Status
            </label>

            <button
              type="button"
              class="flex h-8 w-full items-center justify-between gap-2 rounded-lg !border !border-slate-200 bg-white px-2 text-left text-xs outline-none transition hover:!border-emerald-300 focus:!border-emerald-400"
              @click.stop="toggleTrackingBulkStatusValueDropdown"
            >
              <span
                v-if="trackingBulkStatusMeta"
                :class="[
                  trackingStatusClass(trackingBulkStatusMeta.value),
                  'inline-flex min-w-[92px] max-w-[calc(100%_-_22px)] items-center justify-center truncate rounded-full !border px-2 py-1 text-[10px] font-medium'
                ]"
              >
                {{ trackingBulkStatusMeta.label }}
              </span>

              <span v-else class="truncate text-slate-400">
                Tidak diubah
              </span>

              <span class="shrink-0 text-slate-400">⌄</span>
            </button>

            <div
              v-if="trackingBulkStatusDropdownOpen"
              class="absolute left-2.5 right-2.5 top-[62px] z-[500] rounded-xl !border !border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
              @click.stop
            >
              <button
                type="button"
                class="flex h-8 w-full items-center justify-center rounded-lg px-2 text-xs text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                @click="selectTrackingBulkStatusValue('')"
              >
                Tidak diubah
              </button>

              <div class="my-1 !border-t !border-slate-100" />

              <button
                v-for="statusOption in trackingStatusOptions"
                :key="statusOption.value"
                type="button"
                class="flex h-9 w-full items-center rounded-lg px-2 transition hover:bg-slate-50"
                :class="trackingBulkStatus === statusOption.value ? 'bg-emerald-50' : 'bg-white'"
                @click="selectTrackingBulkStatusValue(statusOption.value)"
              >
                <span
                  :class="[
                    trackingStatusClass(statusOption.value),
                    'inline-flex min-w-[104px] flex-1 items-center justify-center rounded-full !border px-3 py-1 text-[10px] font-medium'
                  ]"
                >
                  {{ statusOption.label }}
                </span>
              </button>
            </div>
          </div>

          <!-- Remarks -->
          <div class="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200">
            <label class="mb-1.5 block text-[10px] font-bold uppercase text-slate-400">
              Remarks
            </label>

            <input
              v-model="trackingBulkRemarks"
              type="text"
              maxlength="1000"
              placeholder="Tidak diubah"
              class="h-8 w-full rounded-lg !border !border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:!border-emerald-400"
            />

            <div class="mt-2 flex flex-wrap items-center gap-1.5">
              <span class="text-[10px] font-medium text-slate-400">Saran:</span>

              <button
                type="button"
                class="inline-flex h-6 items-center rounded-full !border !border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                @click="trackingBulkRemarks = 'Sudah upload mentahan'"
              >
                Sudah upload mentahan
              </button>
            </div>
          </div>
        </div>

        <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div
            v-if="trackingBulkMessage"
            class="text-[11px] font-medium"
            :class="
              trackingBulkMessageType === 'success'
                ? 'text-emerald-700'
                : trackingBulkMessageType === 'warning'
                  ? 'text-amber-700'
                  : 'text-red-600'
            "
          >
            {{ trackingBulkMessage }}
          </div>

          <div v-else class="text-[11px] text-slate-400">
            Checkbox ada di kolom Tgl Serah saat mode multiple aktif.
          </div>

          <div class="flex items-center gap-3 self-end sm:self-auto">
            <span
              v-if="trackingBulkIsApplying"
              class="text-[11px] font-medium text-emerald-700"
            >
              Menyimpan
              {{ trackingBulkProgressDone }}
              /
              {{ trackingBulkProgressTotal }}
            </span>

            <button
              type="button"
              :disabled="
                trackingBulkIsApplying ||
                trackingBulkSelectedCount === 0 ||
                !trackingBulkHasChanges
              "
              class="h-9 rounded-xl bg-emerald-600 px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              @click="applyTrackingBulkUpdate"
            >
              {{ trackingBulkIsApplying ? 'Menyimpan...' : `Terapkan ke ${trackingBulkSelectedCount} Baris` }}
            </button>
          </div>
        </div>
      </div>

      <!-- TABLE AREA -->
      <div class="relative min-w-0 max-w-full overflow-hidden rounded-lg bg-white">
        <div
          class="relative isolate max-h-[580px] w-full min-w-0 overflow-auto bg-white"
          @scroll.passive="customerOrderStore.closeAllPopups()"
        >
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{
              width: tableWidth
            }"
          >
            <!-- HEADER -->
            <thead class="sticky top-[-1px] z-[300] bg-emerald-50">
              <tr>
                <th
                  v-for="col in columns"
                  :key="col.key"
                  class="relative box-border border border-gray-200 overflow-visible !bg-emerald-50! p-2 pt-3 text-center align-top"
                  :style="getColumnStyle(col.key, true)"
                >
                  <!-- LABEL -->
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center overflow-hidden">
                    <input
                      v-if="trackingBulkMode && col.key === 'penyerahan'"
                      type="checkbox"
                      :checked="isTrackingBulkCurrentPageSelected"
                      class="absolute left-0.5 h-3.5 w-3.5 cursor-pointer rounded-sm !border !border-slate-300 bg-white accent-emerald-600"
                      title="Pilih / lepas semua baris di halaman ini"
                      @click.stop
                      @change="toggleTrackingBulkCurrentPageSelection"
                    />

                    <span
                      class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-tight"
                      :class="trackingBulkMode && col.key === 'penyerahan' ? 'pl-4' : ''"
                    >
                      {{ col.label }}
                    </span>
                  </div>

                  <!-- FILTER TRIGGER -->
                  <div
                    class="relative z-[1] flex cursor-pointer !border !border-slate-300 items-center overflow-hidden rounded bg-white px-2 py-2 text-xs"
                    :class="getSelectedLabel(col.key) !== 'All' ? 'justify-between gap-2' : 'justify-center'"
                    @click.stop="toggleDropdown(col.key, $event)"
                  >
                    <span v-if="getSelectedLabel(col.key) !== 'All'" class="truncate">
                      {{ getSelectedLabel(col.key) }}
                    </span>

                    <span>▾</span>
                  </div>

                  <!-- POPUP FILTER -->
                  <TrackingFilterPopup :col="col" />
                </th>
              </tr>
            </thead>

            <!-- BODY -->
            <tbody>
              <tr
                v-for="(row, rowIndex) in paginatedData"
                :key="row.id"
                class="odd:bg-white even:bg-gray-50"
                :class="trackingBulkMode && isTrackingBulkRowSelected(row.id) ? 'ring-1 ring-inset ring-emerald-200' : ''"
              >
                <td
                  v-for="col in columns"
                  :key="col.key"
                  class="h-9 box-border border border-gray-200 overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight"
                  :class="frozenColumns.includes(col.key) ? (rowIndex % 2 === 0 ? 'bg-white!' : 'bg-gray-50!') : ''"
                  :style="getColumnStyle(col.key, false, rowIndex)"
                >
                  <div class="relative z-[1] flex h-full w-full items-center justify-center overflow-hidden whitespace-pre-line">
                    <input
                      v-if="trackingBulkMode && col.key === 'penyerahan'"
                      type="checkbox"
                      :checked="isTrackingBulkRowSelected(row.id)"
                      class="absolute left-0.5 h-3.5 w-3.5 cursor-pointer rounded-sm !border !border-slate-300 bg-white accent-emerald-600"
                      title="Pilih baris ini untuk update multiple"
                      @click.stop
                      @change="toggleTrackingBulkRow(row.id)"
                    />

                    <!-- TANGGAL UPLOAD -->
                    <input
                      v-if="col.key === 'tanggalUpload'"
                      type="date"
                      :value="row.tanggalUpload"
                      :disabled="isTrackingCellSaving(row.id, 'tanggalUpload')"
                      class="mx-1 h-7 w-[calc(100%_-_8px)] rounded-lg !border !border-slate-200 !bg-white px-1 text-xs outline-none focus:!border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                      @change="saveTrackingFieldFromEvent(row, 'tanggalUpload', $event)"
                    />

                    <!-- JAM UPLOAD -->
                    <div v-else-if="col.key === 'jamUpload'" class="flex w-full items-center justify-center gap-1 px-1">
                      <!-- INPUT JAM MANUAL -->
                      <input
                        type="text"
                        inputmode="numeric"
                        maxlength="5"
                        autocomplete="off"
                        placeholder="HH:mm"
                        :value="getTrackingTimeDraft(row)"
                        :disabled="isTrackingCellSaving(row.id, 'jamUpload')"
                        class="h-7 min-w-0 flex-1 rounded-lg !border !border-slate-200 !bg-white !px-1 text-center text-xs font-medium tabular-nums !text-slate-700 outline-none transition placeholder:!text-slate-300 focus:!border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        @input="updateTrackingTimeDraft(row, $event)"
                        @keydown.enter.prevent="saveTrackingTimeDraft(row)"
                        @blur="saveTrackingTimeDraft(row)"
                      />

                      <!-- GUNAKAN JAM JAKARTA SEKARANG -->
                      <button
                        type="button"
                        title="Gunakan jam Jakarta sekarang"
                        aria-label="Gunakan jam Jakarta sekarang"
                        :disabled="isTrackingCellSaving(row.id, 'jamUpload')"
                        class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg !border !border-slate-200 !bg-white !text-slate-500 transition hover:!border-emerald-300 hover:!bg-emerald-50 hover:!text-emerald-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                        @click.prevent.stop="setTrackingTimeNow(row)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="pointer-events-none h-3.5 w-3.5">
                          <circle cx="12" cy="12" r="9" />

                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 2" />
                        </svg>
                      </button>
                    </div>

                    <!-- NAMA UPLOAD SO -->
                    <div v-else-if="col.key === 'uploadSo'" class="relative flex w-full items-center justify-center px-1">
                      <!-- TRIGGER -->
                      <button
                        type="button"
                        :disabled="isTrackingCellSaving(row.id, 'uploadSo')"
                        :class="[
                          row.uploadSo
                            ? userColorClass(row.uploadSo)
                            : `!border !border-slate-200
                                  !bg-white
                                  !text-slate-400
                                  !hover:bg-slate-50
                                `,

                          `
                              flex
                              h-6
                              w-[100px]
                              min-w-0
                              items-center
                              justify-between
                              gap-1
                              rounded-full
                              !border
                              !border-slate-200
                              px-1
                              text-xs
                              font-medium
                              leading-none
                              outline-none
                              transition-all
                              focus:ring-2
                              focus:ring-emerald-100
                              disabled:cursor-not-allowed
                              disabled:opacity-50
                            `
                        ]"
                        @click.stop="toggleTrackingUploadUserDropdown(row.id, $event)"
                      >
                        <span class="min-w-0 flex-1 truncate text-center">
                          {{ row.uploadSo || 'Pilih Nama' }}
                        </span>

                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          class="h-3 w-3 shrink-0 opacity-70 transition-transform duration-200"
                          :class="openTrackingUploadUserId === row.id ? 'rotate-180' : ''"
                        >
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="
                                M5.23 7.21
                                a.75.75 0 0 1
                                1.06.02
                                L10 11.17
                                l3.71-3.94
                                a.75.75 0 1 1
                                1.08 1.04
                                l-4.25 4.5
                                a.75.75 0 0 1
                                -1.08 0
                                l-4.25-4.5
                                a.75.75 0 0 1
                                .02-1.06
                              "
                          />
                        </svg>
                      </button>

                      <!-- POPUP -->
                      <Teleport to="body">
                        <div
                          v-if="openTrackingUploadUserId === row.id"
                          class="fixed z-[99999] overflow-hidden rounded-xl !border !border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
                          :style="{
                            top: `${trackingUploadUserPopupPosition.top}px`,

                            left: `${trackingUploadUserPopupPosition.left}px`,

                            width: `${trackingUploadUserPopupPosition.width}px`
                          }"
                          @click.stop
                        >
                          <div class="max-h-[220px] overflow-y-auto overscroll-contain pr-0.5">
                            <!-- KOSONGKAN NAMA -->
                            <button
                              type="button"
                              class="flex h-8 w-full items-center justify-center rounded-lg bg-white px-2 text-xs font-normal text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                              @click.stop="selectTrackingUploadUser(row, '')"
                            >
                              Pilih Nama
                            </button>

                            <div class="my-1 !border-t !border-slate-100" />

                            <!-- DAFTAR NAMA -->
                            <button
                              v-for="user in trackingBulkVisibleUserOptions"
                              :key="user"
                              type="button"
                              class="flex h-9 w-full items-center justify-between gap-2 bg-white px-2 text-left transition hover:bg-slate-50"
                              :class="
                                row.uploadSo === user
                                  ? `
                                      ring-slate-300
                                      bg-green-50!
                                    `
                                  : `
                                      bg-white!
                                      hover:bg-slate-50!
                                    `
                              "
                              @click.stop="selectTrackingUploadUser(row, user)"
                            >
                              <!-- CHIP WARNA USER -->
                              <span
                                :class="[
                                  userColorClass(user),

                                  `
                                    inline-flex
                                    min-w-[72px]
                                    flex-1
                                    items-center
                                    justify-center
                                    truncate
                                    rounded-full
                                    border
                                    px-2
                                    py-1
                                    text-[10px]
                                    font-medium
                                  `
                                ]"
                              >
                                {{ user }}
                              </span>

                              <!-- CHECK -->
                              <svg
                                v-if="row.uploadSo === user"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                class="h-3.5 w-3.5 shrink-0 text-emerald-600"
                              >
                                <path
                                  fill-rule="evenodd"
                                  clip-rule="evenodd"
                                  d="
                                      M16.704 5.29
                                      a1 1 0 0 1
                                      .006 1.414
                                      l-7.25 7.31
                                      a1 1 0 0 1
                                      -1.42.002
                                      l-3.75-3.75
                                      a1 1 0 1 1
                                      1.414-1.414
                                      l3.04 3.04
                                      6.544-6.596
                                      a1 1 0 0 1
                                      1.416-.006
                                    "
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </Teleport>
                    </div>

                    <!-- STATUS -->
                    <div v-else-if="col.key === 'status'" class="relative flex w-full items-center justify-center px-1">
                      <!-- TRIGGER STATUS -->
                      <button
                        type="button"
                        :disabled="isTrackingCellSaving(row.id, 'status')"
                        :class="[
                          trackingStatusClass(row.status),
                          `
                            flex
                            h-6
                            w-[120px]
                            min-w-0
                            items-center
                            justify-between
                            gap-1
                            rounded-full
                            border
                            px-2
                            text-xs
                            font-medium
                            leading-none
                            outline-none
                            transition-all
                            focus:ring-2
                            focus:ring-emerald-100
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          `
                        ]"
                        @click.stop="toggleTrackingStatusDropdown(row.id, $event)"
                      >
                        <span class="min-w-0 flex-1 truncate text-center">
                          {{ trackingStatusLabel(row.status) }}
                        </span>

                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          class="h-3 w-3 shrink-0 opacity-70 transition-transform duration-200"
                          :class="openTrackingStatusId === row.id ? 'rotate-180' : ''"
                        >
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="
                                M5.23 7.21
                                a.75.75 0 0 1
                                1.06.02
                                L10 11.17
                                l3.71-3.94
                                a.75.75 0 1 1
                                1.08 1.04
                                l-4.25 4.5
                                a.75.75 0 0 1
                                -1.08 0
                                l-4.25-4.5
                                a.75.75 0 0 1
                                .02-1.06
                              "
                          />
                        </svg>
                      </button>

                      <!-- POPUP STATUS -->
                      <Teleport to="body">
                        <div
                          v-if="openTrackingStatusId === row.id"
                          class="fixed z-[99999] overflow-hidden rounded-xl !border !border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
                          :style="{
                            top: `${trackingStatusPopupPosition.top}px`,

                            left: `${trackingStatusPopupPosition.left}px`,

                            width: `${trackingStatusPopupPosition.width}px`
                          }"
                          @click.stop
                        >
                          <div class="max-h-[190px] overflow-y-auto overscroll-contain">
                            <button
                              v-for="statusOption in trackingStatusOptions"
                              :key="statusOption.value"
                              type="button"
                              class="flex h-10 w-full items-center justify-between gap-2 rounded-lg bg-white px-3 transition hover:bg-slate-50"
                              :class="
                                row.status === statusOption.value
                                  ? `
                                      ring-slate-300
                                      bg-green-50!
                                    `
                                  : ''
                              "
                              @click.stop="selectTrackingStatus(row, statusOption.value)"
                            >
                              <!-- CHIP STATUS -->
                              <span
                                :class="[
                                  trackingStatusClass(statusOption.value),
                                  `
                                    inline-flex
                                    min-w-0
                                    flex-1
                                    items-center
                                    justify-center
                                    truncate
                                    rounded-full
                                    border
                                    px-3
                                    py-1
                                    text-[10px]
                                    font-medium
                                  `
                                ]"
                              >
                                {{ statusOption.label }}
                              </span>

                              <!-- CHECK STATUS TERPILIH -->
                              <svg
                                v-if="row.status === statusOption.value"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                class="h-3.5 w-3.5 shrink-0 text-emerald-600"
                              >
                                <path
                                  fill-rule="evenodd"
                                  clip-rule="evenodd"
                                  d="
                                      M16.704 5.29
                                      a1 1 0 0 1
                                      .006 1.414
                                      l-7.25 7.31
                                      a1 1 0 0 1
                                      -1.42.002
                                      l-3.75-3.75
                                      a1 1 0 1 1
                                      1.414-1.414
                                      l3.04 3.04
                                      6.544-6.596
                                      a1 1 0 0 1
                                      1.416-.006
                                    "
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </Teleport>
                    </div>

                    <!-- REMARKS -->
                    <div v-else-if="col.key === 'remarks'" class="relative flex w-full items-center justify-center px-1">
                      <!-- TRIGGER REMARKS -->
                      <button
                        type="button"
                        :disabled="isTrackingCellSaving(row.id, 'remarks')"
                        class="flex h-7 w-full min-w-0 items-center gap-2 rounded-lg !border !border-slate-200 bg-white! px-2 text-left text-[10px] font-normal text-slate-700! outline-none transition hover:border-emerald-300! hover:bg-emerald-50! focus:border-emerald-400! focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        :title="row.systemCancelRemarks || row.remarks || 'Klik untuk mengisi remarks'"
                        @click.stop="toggleTrackingRemarksPopup(row, $event)"
                      >
                        <span
                          class="min-w-0 flex-1 truncate text-xs"
                          :class="
                            row.systemCancelRemarks
                              ? 'font-semibold text-amber-700'
                              : row.remarks
                                ? 'text-slate-700'
                                : 'text-slate-400'
                          "
                        >
                          {{
                            row.systemCancelRemarks
                              ? `Cancelled (${row.cancelledPartCount} part)`
                              : row.remarks || 'Ketik remarks'
                          }}
                        </span>

                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          class="h-3.5 w-3.5 shrink-0 text-slate-400"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="
                                M4 21h4l11-11
                                a2.8 2.8 0 0 0
                                -4-4L4 17v4z
                              "
                          />
                        </svg>
                      </button>

                      <!-- POPUP DETAIL REMARKS -->
                      <Teleport to="body">
                        <div
                          v-if="openTrackingRemarksId !== null && Number(openTrackingRemarksId) === Number(row.id)"
                          class="fixed z-[99999] flex max-h-[calc(100vh-24px)] flex-col overflow-hidden rounded-2xl !border !border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.22)]"
                          :style="{
                            top: `${trackingRemarksPopupPosition.top}px`,

                            left: `${trackingRemarksPopupPosition.left}px`,

                            width: `${trackingRemarksPopupPosition.width}px`
                          }"
                          @click.stop
                        >
                          <!-- HEADER -->
                          <div class="flex items-center justify-between !border-b !border-slate-200 bg-slate-50 px-4 py-3">
                            <div>
                              <h4 class="text-sm font-bold text-slate-800">Detail Remarks</h4>

                              <p class="mt-0.5 text-[10px] text-slate-500">
                                {{ row.customer }}
                                ·
                                {{ row.nomorSo }}
                              </p>
                            </div>

                            <button
                              type="button"
                              title="Tutup"
                              class="flex h-7 w-7 items-center justify-center rounded-full !border !border-slate-200 bg-white text-slate-400 transition hover:border-red-200! hover:bg-red-50 hover:text-red-500"
                              @click.stop="cancelTrackingRemarks()"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                                <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
                              </svg>
                            </button>
                          </div>

                          <!-- TEXTAREA -->
                          <!-- CONTENT -->
                          <div class="min-h-0 flex-1 px-4 pb-3 pt-4">
                            <!-- SYSTEM CANCEL REMARKS - READ ONLY -->
                            <div
                              v-if="row.systemCancelRemarks"
                              class="mb-3 rounded-xl !border !border-amber-200 bg-amber-50 px-3 py-2.5"
                            >
                              <div class="flex items-center justify-between gap-2">
                                <span class="text-[11px] font-bold text-amber-800">
                                  Cancelled Order · System
                                </span>

                                <span class="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                  {{ row.cancelledPartCount }} part
                                </span>
                              </div>

                              <pre class="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words font-sans text-[10px] leading-relaxed text-amber-900">{{ row.cancelledItems }}</pre>

                              <p class="mt-2 text-[10px] text-amber-700">
                                Informasi ini otomatis dari status Cancel Order dan akan hilang setelah seluruh part terkait direstore.
                              </p>
                            </div>

                            <!-- MANUAL REMARKS -->
                            <textarea
                              v-model="activeTrackingRemarksDraft"
                              rows="4"
                              maxlength="1000"
                              placeholder="Tuliskan detail remarks..."
                              class="h-[105px] min-h-[90px] max-h-[130px] w-full resize-y rounded-xl !border !border-slate-200 bg-white! px-3 py-2.5 text-xs leading-relaxed text-slate-800! caret-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400! focus:ring-2 focus:ring-emerald-100"
                              @keydown.ctrl.enter.prevent="saveTrackingRemarksPopup(row)"
                              @keydown.meta.enter.prevent="saveTrackingRemarksPopup(row)"
                            />

                            <div class="mt-2 flex flex-wrap items-center gap-1.5">
                              <span class="text-[10px] font-medium text-slate-400">Saran cepat:</span>

                              <button
                                type="button"
                                class="inline-flex h-6 items-center rounded-full !border !border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                @click="activeTrackingRemarksDraft = 'Sudah upload mentahan'"
                              >
                                Sudah upload mentahan
                              </button>
                            </div>

                            <!-- INFO -->
                            <div class="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                              <span> Ctrl + Enter untuk menyimpan </span>

                              <span>
                                {{ activeTrackingRemarksDraft.length }}
                                / 1000
                              </span>
                            </div>
                          </div>

                          <!-- FOOTER ACTION -->
                          <div
                            class="mt-auto flex shrink-0 items-center justify-end gap-2 !border-t !border-slate-200 bg-slate-50 px-3 py-2.5"
                          >
                            <button
                              type="button"
                              class="inline-flex h-8 items-center justify-center rounded-full !border !border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition-all duration-200 hover:border-red-300! hover:bg-red-50 hover:text-red-600 active:scale-[0.97] active:bg-red-100"
                              @click.stop="cancelTrackingRemarks()"
                            >
                              Batal
                            </button>

                            <button
                              type="button"
                              :disabled="isTrackingCellSaving(row.id, 'remarks')"
                              class="inline-flex h-8 items-center justify-center rounded-full bg-emerald-600 px-4 text-xs font-semibold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                              @click.stop="saveTrackingRemarksPopup(row)"
                            >
                              {{ isTrackingCellSaving(row.id, 'remarks') ? 'Menyimpan...' : 'Simpan' }}
                            </button>
                          </div>
                        </div>
                      </Teleport>
                    </div>

                    <!-- TGL SERAH -->
                    <span
                      v-else-if="col.key === 'penyerahan'"
                      :class="trackingBulkMode ? 'pl-4' : ''"
                    >
                      {{ formatTrackingDate(row.penyerahan) }}
                    </span>

                    <!-- NAMA PEMBUAT SO -->
                    <span
                      v-else-if="col.key === 'pembuat' && row.pembuat"
                      :class="[
                        userColorClass(row.pembuat),

                        `
                          inline-flex
                          min-w-[100px]
                          items-center
                          justify-center
                          rounded-full
                          border
                          px-1
                          h-6
                          text-xs
                          font-medium
                        `
                      ]"
                    >
                      {{ row.pembuat }}
                    </span>

                    <!-- CUSTOMER -->
                    <span
                      v-else-if="col.key === 'customer'"
                      class="inline-flex min-w-[100px] items-center justify-center rounded-full !border !border-cyan-200 bg-cyan-100 px-1 py-1 text-xs font-medium text-cyan-700"
                    >
                      {{ row.customer }}
                    </span>

                    <!-- READ ONLY -->
                    <span v-else :title="String(row[col.key] ?? '')" class="whitespace-pre-line">
                      {{ row[col.key] }}
                    </span>
                  </div>
                </td>
              </tr>

              <tr v-if="isLoadingTracking">
                <td :colspan="columns.length" class="!border !border-gray-200 p-6 text-center text-emerald-600">
                  Memuat Tracking Upload Sales Order...
                </td>
              </tr>

              <tr v-else-if="paginatedData.length === 0">
                <td :colspan="columns.length" class="!border !border-gray-200 p-6 text-center text-gray-400">
                  Data Tracking tidak ditemukan
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- PAGINATION TRACKING -->
      <div
        class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between"
      >
        <!-- LEFT -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <!-- ROWS PER PAGE -->
          <div class="flex items-center gap-2 text-sm text-slate-600">
            <span class="font-medium"> Show </span>

            <select
              v-model.number="trackingRowsPerPage"
              class="h-10 min-w-[82px] rounded-xl !border !border-solid !border-slate-200 !bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 hover:!border-emerald-300 hover:!bg-white focus:!border-emerald-500 focus:!bg-white focus:ring-2 focus:ring-emerald-100"
            >
              <option v-for="option in trackingRowsPerPageOptions" :key="option" :value="option">
                {{ option === 0 ? 'All' : option }}
              </option>
            </select>

            <span class="font-medium"> records </span>
          </div>

          <!-- SHOWING INFO -->
          <div class="text-sm text-slate-600">
            Showing

            <span class="font-bold text-emerald-600">
              {{ showingStart }}
            </span>

            to

            <span class="font-bold text-emerald-600">
              {{ showingEnd }}
            </span>

            of

            <span class="font-bold text-emerald-600">
              {{ trackingDisplayTotal }}
            </span>

            records
          </div>
        </div>

        <!-- RIGHT -->
        <div class="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
          <!-- FIRST -->
          <button
            type="button"
            :disabled="currentPage === 1"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white! text-sm font-bold text-slate-600! transition-all hover:border-emerald-300! hover:bg-emerald-50! hover:text-emerald-600! disabled:cursor-not-allowed disabled:opacity-40"
            @click="trackingFirstPage"
          >
            ‹‹
          </button>

          <!-- PREVIOUS -->
          <button
            type="button"
            :disabled="currentPage === 1"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white! text-sm font-bold text-slate-600! transition-all hover:border-emerald-300! hover:bg-emerald-50! hover:text-emerald-600! disabled:cursor-not-allowed disabled:opacity-40"
            @click="prevPage"
          >
            ‹
          </button>

          <!-- PAGE NUMBER -->
          <button
            v-for="pageNumber in trackingVisiblePages"
            :key="pageNumber"
            type="button"
            class="h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all"
            :class="
              pageNumber === currentPage
                ? `
              !border-emerald-600
              !bg-emerald-600
              text-white!
              shadow-[0_8px_18px_rgba(5,150,105,0.25)]
              hover:border-emerald-700!
              hover:bg-emerald-700!
              hover:text-white!
            `
                : `
              !border !border-slate-200
              bg-white!
              text-slate-700!
              hover:border-emerald-300!
              hover:bg-emerald-50!
              hover:text-emerald-600!
            `
            "
            @click="currentPage = pageNumber"
          >
            {{ pageNumber }}
          </button>

          <!-- NEXT -->
          <button
            type="button"
            :disabled="currentPage === totalPages"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white! text-sm font-bold text-slate-600! transition-all hover:border-emerald-300! hover:bg-emerald-50! hover:text-emerald-600! disabled:cursor-not-allowed disabled:opacity-40"
            @click="nextPage"
          >
            ›
          </button>

          <!-- LAST -->
          <button
            type="button"
            :disabled="currentPage === totalPages"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white! text-sm font-bold text-slate-600! transition-all hover:border-emerald-300! hover:bg-emerald-50! hover:text-emerald-600! disabled:cursor-not-allowed disabled:opacity-40"
            @click="trackingLastPage"
          >
            ››
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- DN RAW FILE CROSSCHECK                                  -->
    <!-- ======================================================= -->

    <div
      class="mb-10 rounded-xl !border !border-gray-200 bg-white p-4 shadow-md"
    >
      <!-- ===================================================== -->
      <!-- HEADER                                                -->
      <!-- ===================================================== -->

      <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <!-- LEFT TITLE -->

        <div class="min-w-0">
          <h2 class="mt-2 text-xl font-bold text-blue-600">DN Crosscheck</h2>

          <p class="mt-2 text-sm text-gray-500">Paste nomor DN dari Excel untuk mengecek ketersediaannya di Raw Files.</p>

          <div
            v-if="isCheckingDn && dnCrosscheckRows.length === 0"
            class="mt-3 inline-flex items-center gap-2 rounded-lg !border !border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4 animate-spin">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 12a8 8 0 10-2.34 5.66" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 4v8h-8" />
            </svg>
            <span>{{ isCheckAllDnMode ? 'Memuat DN Crosscheck...' : 'Memeriksa DN...' }}</span>
          </div>
        </div>

        <!-- =================================================== -->
        <!-- RIGHT ACTION + SUMMARY                              -->
        <!-- =================================================== -->

        <div class="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          <!-- CHECK ALL / BACK TO PASTE -->

          <button
            type="button"
            :disabled="isCheckingDn"
            class="inline-flex h-9 items-center justify-center gap-2 rounded-xl !border px-4 text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            :class="
              isCheckAllDnMode
                ? `
                    !border-blue-600
                    bg-blue-600
                    text-white
                    hover:bg-blue-700
                  `
                : `
                    !border-blue-200
                    bg-blue-50
                    text-blue-700
                    hover:bg-blue-100
                  `
            "
            @click="toggleDnCheckAllMode()"
          >
            <svg v-if="!isCheckingDn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>

            {{ isCheckingDn ? 'Checking...' : isCheckAllDnMode ? 'Back to Paste' : 'Check All DN' }}
          </button>

          <!-- ================================================= -->
          <!-- REPORT ACTIONS                                    -->
          <!-- ================================================= -->
          <!--
            Single gate UX:

            Paste Mode:
              hanya tampil tombol Check All DN.

            Check All DN Mode:
              baru tampil:
              - View Report / Back to Data
              - Report Perlu Update
              - Crosscheck View / Data Only

            Dengan begitu user selalu masuk dari satu pintu:
            Check All DN.
          -->

          <template v-if="isCheckAllDnMode">
            <!-- REPORT ACTION DIVIDER -->

            <div class="mx-1 h-6 w-px shrink-0 bg-slate-200" />

            <!-- VIEW REPORT -->

            <button
              type="button"
              :disabled="
                (
                  !showDnMonitoringReport &&
                  !hasDnMonitoringReportCache &&
                  dnMonitoringReportCount === 0
                )
              "
              :title="
                !showDnMonitoringReport && hasDnMonitoringReportCache
                  ? `Report ${dnMonitoringReportPeriodLabel} · ${dnMonitoringReportDateBasisLabel} siap ditampilkan tanpa generate ulang.`
                  : (
                      !showDnMonitoringReport && isDnMonitoringReportStale
                        ? `Data DN berubah. Klik untuk update report ${dnMonitoringReportPeriodLabel} · ${dnMonitoringReportDateBasisLabel}.`
                        : undefined
                    )
              "
              class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl !border px-3 text-xs font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              :class="
                showDnMonitoringReport
                  ? `
                      !border-blue-600
                      bg-blue-600
                      text-white
                    `
                  : `
                      !border-blue-200
                      bg-blue-50
                      text-blue-700
                      hover:bg-blue-100
                    `
              "
              @click="toggleDnMonitoringReport()"
            >
              <span
                v-if="
                  !showDnMonitoringReport &&
                  !isLoadingDnMonitoringReport &&
                  (
                    hasDnMonitoringReportCache ||
                    isDnMonitoringReportStale
                  )
                "
                class="h-2 w-2 shrink-0 rounded-full"
                :class="
                  hasDnMonitoringReportCache
                    ? 'bg-emerald-500'
                    : 'bg-amber-400'
                "
              />

              {{
                showDnMonitoringReport
                  ? 'Back to Data'
                  : 'View Report'
              }}
            </button>

            <!-- REPORT PERLU UPDATE -->

            <button
              v-if="isDnMonitoringReportStale"
              type="button"
              :disabled="
                isLoadingDnMonitoringReport ||
                dnMonitoringReportCount === 0
              "
              class="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl !border !border-amber-300 bg-amber-50 px-3 text-[11px] font-bold text-amber-700 shadow-sm transition hover:!border-amber-400 hover:bg-amber-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              :title="`Report ${dnMonitoringReportPeriodLabel} · ${dnMonitoringReportDateBasisLabel} masih memakai snapshot sebelumnya. Klik untuk update dengan data DN terbaru.`"
              @click="refreshDnMonitoringReport()"
            >
              <svg
                v-if="!isLoadingDnMonitoringReport"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-3.5 w-3.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M20 11a8 8 0 1 0-2.34 5.66M20 4v7h-7"
                />
              </svg>

              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-3.5 w-3.5 animate-spin"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 3a9 9 0 1 0 9 9"
                />
              </svg>

              {{
                isLoadingDnMonitoringReport
                  ? 'Updating Report...'
                  : 'Report Perlu Update'
              }}
            </button>

            <!-- ================================================= -->
            <!-- CROSSCHECK + REPORT SPLIT VIEW                    -->
            <!-- ================================================= -->

            <button
              v-if="hasDnMonitoringReportCache"
              type="button"
              title="Tampilkan Crosscheck Data dan DN Monitoring Report berdampingan"
              class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl !border px-3 text-xs font-semibold transition-all active:scale-95"
              :class="
                showDnMonitoringCompare
                  ? `
                      !border-violet-600
                      bg-violet-600
                      text-white
                      shadow-sm
                      ring-2
                      ring-violet-100
                    `
                  : `
                      !border-violet-200
                      bg-violet-50
                      text-violet-700
                      hover:!border-violet-300
                      hover:bg-violet-100
                    `
              "
              @click="toggleDnMonitoringCompare()"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-4 w-4"
              >
                <rect x="3" y="5" width="8" height="14" rx="1.5" />
                <rect x="13" y="5" width="8" height="14" rx="1.5" />
              </svg>

              {{
                showDnMonitoringCompare
                  ? 'Data Only'
                  : 'Crosscheck View'
              }}
            </button>
          </template>

          <!-- ================================================= -->
          <!-- ALL DN MODE SUMMARY                               -->
          <!-- ================================================= -->

          <template v-if="isCheckAllDnMode">
            <button
              type="button"
              title="Tampilkan seluruh DN"
              class="inline-flex h-8 min-w-[92px] cursor-pointer items-center justify-center gap-1.5 rounded-full !border px-3 text-xs font-semibold transition-all duration-200 active:scale-95"
              :class="
                isDnCrosscheckQuickStatusActive('All')
                  ? `
                      !border-blue-500
                      bg-blue-600
                      text-white
                      shadow-sm
                      ring-2
                      ring-blue-100
                    `
                  : `
                      !border-blue-200
                      bg-blue-50
                      text-blue-700
                      hover:!border-blue-400
                      hover:bg-blue-100
                      hover:text-blue-800
                    `
              "
              @click="toggleDnCrosscheckQuickStatus('All')"
            >
              <span class="h-2 w-2 shrink-0 rounded-full" :class="isDnCrosscheckQuickStatusActive('All') ? 'bg-white' : 'bg-blue-500'" />
              <span>Total</span>
              <span>{{ formatDnCount(dnCrosscheckTotal) }}</span>
            </button>

            <button
              type="button"
              title="Tampilkan DN Close"
              class="inline-flex h-8 min-w-[92px] cursor-pointer items-center justify-center gap-1.5 rounded-full !border px-3 text-xs font-semibold transition-all duration-200 active:scale-95"
              :class="
                isDnCrosscheckQuickStatusActive('Close')
                  ? `
                      !border-emerald-500
                      bg-emerald-600
                      text-white
                      shadow-sm
                      ring-2
                      ring-emerald-100
                    `
                  : `
                      !border-emerald-200
                      bg-emerald-50
                      text-emerald-700
                      hover:!border-emerald-400
                      hover:bg-emerald-100
                      hover:text-emerald-800
                    `
              "
              @click="toggleDnCrosscheckQuickStatus('Close')"
            >
              <span
                class="h-2 w-2 shrink-0 rounded-full"
                :class="isDnCrosscheckQuickStatusActive('Close') ? 'bg-white' : 'bg-emerald-500'"
              />
              <span>Close</span>
              <span>{{ formatDnCount(dnCrosscheckClose) }}</span>
            </button>

            <button
              type="button"
              title="Tampilkan DN Open"
              class="inline-flex h-8 min-w-[92px] cursor-pointer items-center justify-center gap-1.5 rounded-full !border px-3 text-xs font-semibold transition-all duration-200 active:scale-95"
              :class="
                isDnCrosscheckQuickStatusActive('Open')
                  ? `
                      !border-red-500
                      bg-red-600
                      text-white
                      shadow-sm
                      ring-2
                      ring-red-100
                    `
                  : `
                      !border-red-200
                      bg-red-50
                      text-red-600
                      hover:!border-red-400
                      hover:bg-red-100
                      hover:text-red-700
                    `
              "
              @click="toggleDnCrosscheckQuickStatus('Open')"
            >
              <span class="h-2 w-2 shrink-0 rounded-full" :class="isDnCrosscheckQuickStatusActive('Open') ? 'bg-white' : 'bg-red-500'" />
              <span>Open</span>
              <span>{{ formatDnCount(dnCrosscheckOpen) }}</span>
            </button>
          </template>

          <!-- ================================================= -->
          <!-- PASTE MODE SUMMARY                                -->
          <!-- ================================================= -->

           <template v-else-if="dnCrosscheckTotal > 0">
            <button
              type="button"
              title="Tampilkan seluruh hasil Crosscheck"
              class="inline-flex h-8 min-w-[92px] cursor-pointer items-center justify-center gap-1.5 rounded-full !border px-3 text-xs font-semibold transition-all duration-200 active:scale-95"
              :class="
                isDnCrosscheckQuickStatusActive('All')
                  ? `
                      !border-blue-500
                      bg-blue-600
                      text-white
                      shadow-sm
                      ring-2
                      ring-blue-100
                    `
                  : `
                      !border-slate-200
                      bg-slate-50
                      text-slate-600
                      hover:!border-blue-300
                      hover:bg-blue-50
                      hover:text-blue-700
                    `
              "
              @click="toggleDnCrosscheckQuickStatus('All')"
            >
              <span
                class="h-2 w-2 shrink-0 rounded-full"
                :class="isDnCrosscheckQuickStatusActive('All') ? 'bg-white' : 'bg-blue-500'"
              />
              <span>Total</span>
              <span>{{ formatDnCount(dnCrosscheckTotal) }}</span>
            </button>

            <button
              type="button"
              title="Tampilkan hanya data Found"
              class="inline-flex h-8 min-w-[92px] cursor-pointer items-center justify-center gap-1.5 rounded-full !border px-3 text-xs font-semibold transition-all duration-200 active:scale-95"
              :class="
                isDnCrosscheckQuickStatusActive('Found')
                  ? `
                      !border-emerald-500
                      bg-emerald-600
                      text-white
                      shadow-sm
                      ring-2
                      ring-emerald-100
                    `
                  : `
                      !border-emerald-200
                      bg-emerald-50
                      text-emerald-700
                      hover:!border-emerald-400
                      hover:bg-emerald-100
                      hover:text-emerald-800
                    `
              "
              @click="toggleDnCrosscheckQuickStatus('Found')"
            >
              <span
                class="h-2 w-2 shrink-0 rounded-full"
                :class="isDnCrosscheckQuickStatusActive('Found') ? 'bg-white' : 'bg-emerald-500'"
              />
              <span>Found</span>
              <span>{{ formatDnCount(dnCrosscheckFound) }}</span>
            </button>

            <button
              type="button"
              title="Tampilkan hanya data Not Found"
              class="inline-flex h-8 min-w-[104px] cursor-pointer items-center justify-center gap-1.5 rounded-full !border px-3 text-xs font-semibold transition-all duration-200 active:scale-95"
              :class="
                isDnCrosscheckQuickStatusActive('Not Found')
                  ? `
                      !border-red-500
                      bg-red-600
                      text-white
                      shadow-sm
                      ring-2
                      ring-red-100
                    `
                  : `
                      !border-red-200
                      bg-red-50
                      text-red-600
                      hover:!border-red-400
                      hover:bg-red-100
                      hover:text-red-700
                    `
              "
              @click="toggleDnCrosscheckQuickStatus('Not Found')"
            >
              <span
                class="h-2 w-2 shrink-0 rounded-full"
                :class="isDnCrosscheckQuickStatusActive('Not Found') ? 'bg-white' : 'bg-red-500'"
              />
              <span>Not Found</span>
              <span>{{ formatDnCount(dnCrosscheckNotFound) }}</span>
            </button>
          </template>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- DN MONITORING PERIOD MODAL                              -->
      <!-- ======================================================= -->

      <div
        v-if="showDnMonitoringPeriodModal"
        class="fixed inset-0 z-[12000] flex items-center justify-center bg-slate-900/45 p-4"
        @click.self="closeDnMonitoringPeriodModal()"
      >
        <div class="w-full max-w-[500px] overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-slate-200">
          <!-- HEADER -->

          <div class="flex items-center justify-between !border-b !border-slate-200 px-5 py-4">
            <div>
              <h3 class="text-lg font-bold text-slate-800">Pilih Periode Report</h3>

              <p class="mt-1 text-xs text-slate-500">
                Pilih bulan dan dasar tanggal yang digunakan untuk membentuk DN Monitoring.
              </p>
            </div>

            <button
              type="button"
              class="flex h-9 w-9 !border !border-gray-200 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-500"
              @click="closeDnMonitoringPeriodModal()"
            >
              ✕
            </button>
          </div>

          <!-- BODY -->

          <div class="px-5 py-5">
            <label class="mb-2 block text-sm font-semibold text-slate-700"> Periode Bulan </label>

            <!--
        type="month"

        Browser hanya menampilkan:
        Bulan + Tahun.

        Tidak ada pilihan tanggal.
      -->

            <input
              v-model="dnMonitoringReportPeriod"
              type="month"
              class="h-12 w-full rounded-2xl !border !border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition hover:!border-blue-400 focus:!border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <div
              v-if="dnMonitoringReportPeriod"
              class="mt-3 rounded-xl !border !border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700"
            >
              Periode:
              {{ dnMonitoringReportPeriodLabel }}
            </div>

            <!-- ================================================ -->
            <!-- REPORT BY                                       -->
            <!-- ================================================ -->

            <div class="mt-5">
              <label class="mb-2 block text-sm font-semibold text-slate-700">
                Report Berdasarkan
              </label>

              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  class="rounded-2xl !border px-4 py-3 text-left transition-all"
                  :class="
                    dnMonitoringReportDateBasis === 'order_date'
                      ? '!border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                      : '!border-slate-200 bg-white hover:!border-blue-300 hover:bg-blue-50/40'
                  "
                  @click="dnMonitoringReportDateBasis = 'order_date'"
                >
                  <div class="flex items-center gap-2">
                    <span
                      class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full !border"
                      :class="
                        dnMonitoringReportDateBasis === 'order_date'
                          ? '!border-blue-600 bg-blue-600'
                          : '!border-slate-300 bg-white'
                      "
                    >
                      <span
                        v-if="dnMonitoringReportDateBasis === 'order_date'"
                        class="h-2 w-2 rounded-full bg-white"
                      />
                    </span>

                    <span class="text-sm font-bold text-slate-800">
                      Order Date
                    </span>
                  </div>

                  <p class="mt-2 text-[11px] leading-relaxed text-slate-500">
                    Periode dan daily report mengikuti
                    <strong>Order Date</strong>.
                  </p>
                </button>

                <button
                  type="button"
                  class="rounded-2xl !border px-4 py-3 text-left transition-all"
                  :class="
                    dnMonitoringReportDateBasis === 'delivery_date'
                      ? '!border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                      : '!border-slate-200 bg-white hover:!border-blue-300 hover:bg-blue-50/40'
                  "
                  @click="dnMonitoringReportDateBasis = 'delivery_date'"
                >
                  <div class="flex items-center gap-2">
                    <span
                      class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full !border"
                      :class="
                        dnMonitoringReportDateBasis === 'delivery_date'
                          ? '!border-blue-600 bg-blue-600'
                          : '!border-slate-300 bg-white'
                      "
                    >
                      <span
                        v-if="dnMonitoringReportDateBasis === 'delivery_date'"
                        class="h-2 w-2 rounded-full bg-white"
                      />
                    </span>

                    <span class="text-sm font-bold text-slate-800">
                      Delivery Date
                    </span>
                  </div>

                  <p class="mt-2 text-[11px] leading-relaxed text-slate-500">
                    Periode dan daily report mengikuti
                    <strong>Delivery Date</strong>.
                  </p>
                </button>
              </div>
            </div>

            <div class="mt-4 rounded-xl !border !border-slate-200 bg-slate-50 px-3 py-2.5">
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span class="font-semibold text-slate-500">
                  Report:
                </span>

                <span class="font-bold text-blue-700">
                  {{ dnMonitoringReportPeriodLabel || '-' }}
                </span>

                <span class="text-slate-300">·</span>

                <span class="font-semibold text-slate-500">
                  Base:
                </span>

                <span class="font-bold text-slate-700">
                  {{ dnMonitoringReportDateBasisLabel }}
                </span>
              </div>
            </div>
          </div>

          <!-- FOOTER -->

          <div class="flex items-center justify-end gap-2 !border-t !border-slate-200 bg-slate-50 px-5 py-4">
            <button
              type="button"
              class="h-10 rounded-xl !border !border-slate-300 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              @click="closeDnMonitoringPeriodModal()"
            >
              Cancel
            </button>

            <button
              type="button"
              :disabled="!dnMonitoringReportPeriod || !dnMonitoringReportDateBasis || isLoadingDnMonitoringReport"
              class="h-10 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              @click="confirmDnMonitoringPeriodAndView()"
            >
              {{ isLoadingDnMonitoringReport ? 'Loading...' : 'View Report' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- REPORT / DATA VIEW LAYOUT                               -->
      <!-- ======================================================= -->
      <!--
        Normal:
        - Data Only atau Report Only seperti behavior sebelumnya.

        Crosscheck View:
        - kiri  : Raw Files Crosscheck Result
        - kanan : DN Monitoring Report
        - masing-masing section dapat discroll sendiri.
      -->

      <div
        class="w-full min-w-0"
        :class="
          showDnMonitoringCompare
            ? 'grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(520px,0.9fr)_minmax(680px,1.1fr)]'
            : 'block'
        "
      >

      <!-- ======================================================= -->
      <!-- DN MONITORING REPORT PREVIEW                            -->
      <!-- ======================================================= -->

      <div
        v-show="showDnMonitoringReport || showDnMonitoringCompare"
        class="overflow-hidden rounded-2xl !border !border-slate-200 bg-white"
        :class="
          showDnMonitoringCompare
            ? 'order-2 mb-0 flex h-[760px] min-w-0 flex-col'
            : 'mb-5'
        "
      >
        <!-- ===================================================== -->
        <!-- TOOLBAR                                                -->
        <!-- ===================================================== -->

        <div
          class="dn-monitoring-preview-toolbar flex items-center justify-between gap-3 !border-b !border-slate-200 bg-slate-50 px-4 py-3"
          :class="showDnMonitoringCompare ? 'flex-wrap' : ''"
        >
          <div>
            <h3 class="text-sm font-bold text-slate-800">DN Monitoring Report</h3>

            <p class="mt-1 text-xs text-slate-500">
              Excel Print Preview ·

              {{ dnMonitoringReportPeriodLabel }}

              · Base:

              {{
                dnMonitoringReportData?.date_basis_label ||
                dnMonitoringReportDateBasisLabel
              }}

              ·

              {{ formatDnCount(dnMonitoringReportData?.total_dn ?? 0) }}

              DN
            </p>
          </div>

          <div class="flex items-center gap-2">
            <!-- ===================================================== -->
            <!-- ZOOM CONTROL                                          -->
            <!-- ===================================================== -->

            <div
              class="dn-report-zoom-controls flex h-8 shrink-0 items-center overflow-hidden rounded-lg !border !border-slate-300 bg-white"
              :class="{
                'dn-report-zoom-controls--attention': showDnMonitoringReport || showDnMonitoringCompare
              }"
            >
              <!-- ZOOM OUT -->

              <button
                type="button"
                title="Zoom Out"
                aria-label="Zoom Out"
                :disabled="activeDnReportZoom <= DN_REPORT_ZOOM_MIN"
                class="flex h-8 w-8 items-center justify-center text-base font-bold text-slate-600 transition hover:bg-slate-100 hover:text-blue-600 active:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-300"
                @click="zoomOutDnReport()"
              >
                −
              </button>

              <!-- CURRENT ZOOM / RESET -->

              <button
                type="button"
                title="Reset Zoom ke 100%"
                class="flex h-8 min-w-[52px] items-center justify-center !border-x !border-slate-200 px-2 text-[11px] font-semibold tabular-nums text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                @click="resetDnReportZoom()"
              >
                {{ Math.round(activeDnReportZoom * 100) }}%
              </button>

              <!-- ZOOM IN -->

              <button
                type="button"
                title="Zoom In"
                aria-label="Zoom In"
                :disabled="activeDnReportZoom >= DN_REPORT_ZOOM_MAX"
                class="dn-report-zoom-in-button flex h-8 w-8 items-center justify-center text-base font-bold text-slate-600 transition hover:bg-slate-100 hover:text-blue-600 active:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-300"
                @click="zoomInDnReport()"
              >
                +
              </button>
            </div>

            <!-- ===================================================== -->
            <!-- CHANGE REPORT                                         -->
            <!-- ===================================================== -->

            <button
              type="button"
              title="Ganti periode atau dasar tanggal report"
              class="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg !border !border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:!border-blue-300 hover:bg-blue-100 active:scale-95"
              @click="openDnMonitoringReportSettings()"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-3.5 w-3.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8 7V3m8 4V3M5 11h14M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                />
              </svg>

              Change Report
            </button>

            <!-- ===================================================== -->
            <!-- OUTPUT ACTIONS - ICON ONLY                            -->
            <!-- ===================================================== -->

            <!-- EXCEL -->
            <button
              type="button"
              title="Download Excel"
              aria-label="Download Excel"
              :disabled="!permissions.download || isExportingDnMonitoringExcel"
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg !border !border-emerald-200 !bg-emerald-50 text-emerald-700 transition hover:!border-emerald-300 hover:!bg-emerald-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              @click="exportDnMonitoringExcel()"
            >
              <svg
                v-if="!isExportingDnMonitoringExcel"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-4 w-4"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 2h9l5 5v15H6z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 2v6h6" />
                <path stroke-linecap="round" stroke-linejoin="round" d="m9 13 5 6m0-6-5 6" />
              </svg>

              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-4 w-4 animate-spin"
              >
                <path stroke-linecap="round" d="M12 3a9 9 0 1 1-9 9" />
              </svg>
            </button>

            <!-- PNG -->
            <button
              type="button"
              title="Download PNG HD 300 DPI"
              aria-label="Download PNG HD 300 DPI"
              :disabled="!permissions.download || isDownloadingDnMonitoringImage"
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg !border !border-sky-200 !bg-sky-50 text-sky-700 transition hover:!border-sky-300 hover:!bg-sky-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              @click="downloadDnMonitoringImage()"
            >
              <svg
                v-if="!isDownloadingDnMonitoringImage"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-4 w-4"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="9" cy="9" r="1.5" />
                <path stroke-linecap="round" stroke-linejoin="round" d="m4 17 5-5 4 4 2-2 5 5" />
              </svg>

              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-4 w-4 animate-spin"
              >
                <path stroke-linecap="round" d="M12 3a9 9 0 1 1-9 9" />
              </svg>
            </button>

            <!-- PDF -->
            <button
              type="button"
              title="Download PDF"
              aria-label="Download PDF"
              :disabled="!permissions.download || isDownloadingDnMonitoringPdf"
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg !border !border-red-200 !bg-red-50 text-red-700 transition hover:!border-red-300 hover:!bg-red-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              @click="downloadDnMonitoringPdf()"
            >
              <svg
                v-if="!isDownloadingDnMonitoringPdf"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-4 w-4"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 2h9l5 5v15H6z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 2v6h6" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6M9 17h4" />
              </svg>

              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-4 w-4 animate-spin"
              >
                <path stroke-linecap="round" d="M12 3a9 9 0 1 1-9 9" />
              </svg>
            </button>

            <!-- PRINT -->
            <button
              type="button"
              title="Print"
              aria-label="Print"
              :disabled="!permissions.download || isPrintingDnMonitoringReport"
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg !border !border-slate-300 !bg-white text-slate-700 transition hover:!border-slate-400 hover:!bg-slate-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              @click="printDnMonitoringReport()"
            >
              <svg
                v-if="!isPrintingDnMonitoringReport"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-4 w-4"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 8V3h10v5" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 14h12v7H6z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 17H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <circle cx="18" cy="11" r="0.75" fill="currentColor" stroke="none" />
              </svg>

              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-4 w-4 animate-spin"
              >
                <path stroke-linecap="round" d="M12 3a9 9 0 1 1-9 9" />
              </svg>
            </button>
          </div>
        </div>

        <!-- ===================================================== -->
        <!-- LOADING                                                -->
        <!-- ===================================================== -->

        <div
          v-if="isLoadingDnMonitoringReport"
          class="flex min-h-[500px] items-center justify-center bg-slate-200 text-sm font-medium text-slate-500"
        >
          Loading DN Monitoring Report...
        </div>

        <!-- ===================================================== -->
        <!-- REPORT                                                 -->
        <!-- ===================================================== -->

        <div
          v-else-if="dnMonitoringReportData"
          id="dn-monitoring-print-root"
          class="dn-monitoring-preview"
          :class="showDnMonitoringCompare ? 'dn-monitoring-preview-compare flex-1 min-h-0' : ''"
        >
          <!-- ===================================================== -->
          <!-- ZOOM LAYER                                            -->
          <!-- ===================================================== -->

          <div
            class="dn-monitoring-zoom-layer"
            :style="{
              zoom: activeDnReportZoom
            }"
          >
            <article
              v-for="(pageData, pageIndex) in dnMonitoringReportData.pages"
              :key="`${pageData.period}-${pageIndex}`"
              class="dn-report-page"
            >
              <!-- ================================================= -->
              <!-- HEADER                                             -->
              <!-- ================================================= -->

              <header class="dn-report-header">
                <!-- LEFT LOGO -->

                <div class="dn-brand-left">
                  <img v-if="dnMonitoringReportData.logos?.left" :src="dnMonitoringReportData.logos.left" alt="New Armada" />

                  <div v-else class="brand-fallback">NEW ARMADA</div>
                </div>

                <!-- COMPANY -->

                <div class="dn-brand-center">
                  <div class="monitoring-label">Monitoring D-Note</div>

                  <div class="company-name">PT.ASTRA DAIHATSU MOTOR</div>
                </div>

                <!-- RIGHT LOGO -->

                <div class="dn-brand-right">
                  <img v-if="dnMonitoringReportData.logos?.right" :src="dnMonitoringReportData.logos.right" alt="Daihatsu" />

                  <div v-else class="brand-right-fallback">DAIHATSU</div>
                </div>
              </header>

              <div class="dn-header-line" />

              <!-- ================================================= -->
              <!-- UPDATE                                             -->
              <!-- ================================================= -->

              <div class="dn-update-row">
                <div class="dn-update-box">
                  <span> Update : </span>

                  <strong>
                    {{ dnMonitoringReportData.updated_at }}
                  </strong>
                </div>
              </div>

              <!-- ================================================= -->
              <!-- PERIOD                                             -->
              <!-- ================================================= -->

              <div class="dn-period-title">
                <div class="dn-period-main">
                  .: {{ pageData.period }}
                </div>

                <div class="dn-period-basis">
                  Report by:
                  {{
                    dnMonitoringReportData.date_basis_label ||
                    dnMonitoringReportDateBasisLabel
                  }}
                </div>
              </div>

              <!-- ================================================= -->
              <!-- 6 SECTIONS                                         -->
              <!-- ================================================= -->

              <div class="dn-report-grid">
                <section v-for="section in pageData.sections" :key="section.key" class="dn-section">
                  <div class="dn-section-note">List D-Note</div>

                  <div class="dn-section-heading">
                    <strong>
                      {{ section.title }}
                    </strong>
                  </div>

                  <table class="dn-section-table">
                    <thead>
                      <tr>
                        <th class="col-no">No</th>

                        <th class="col-date">Tanggal</th>

                        <th>Out</th>

                        <th>In</th>

                        <th>GAP</th>

                        <th>Acv.</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr
                        v-for="row in section.rows"
                        :key="`${section.key}-${row.no}`"
                        :class="getDnMonitoringWeekendClass(row)"
                      >
                        <!-- NO -->

                        <td>
                          {{ row.date ? row.no : '' }}
                        </td>

                        <!-- DATE -->

                        <td>
                          {{ row.date }}
                        </td>

                        <!-- OUT -->

                        <td>
                          {{ row.date && (row.out !== 0 || row.in !== 0) ? row.out : '' }}
                        </td>

                        <!-- IN -->

                        <td>
                          {{ row.date && (row.out !== 0 || row.in !== 0) ? row.in : '' }}
                        </td>

                        <!-- ===================================================== -->
                        <!-- GAP                                                   -->
                        <!-- ===================================================== -->

                        <td
                          class="dn-gap-cell"
                          :class="{
                            'dn-gap-negative': hasDnActivity(row) && getDnMonitoringGap(row) < 0
                          }"
                        >
                          <button
                            v-if="hasDnActivity(row) && getDnMonitoringGap(row) < 0"
                            type="button"
                            class="dn-gap-detail-trigger"
                             :class="{
                               'dn-gap-detail-trigger--active': dnGapDetailActiveTriggerId === getDnGapDetailTriggerId(
                                 'day',
                                 section.key,
                                 getDnMonitoringRowIsoDate(row)
                               )
                             }"
                            :title="`Lihat ${Math.abs(getDnMonitoringGap(row))} DN Open ${section.title} pada ${row.date}`"
                            @click="openDnGapDetail(
                              'day',
                              getDnMonitoringGap(row),
                              section.key,
                              section.title,
                              getDnMonitoringRowIsoDate(row),
                              row.date
                            )"
                          >
                            {{ getDnMonitoringGap(row) }}
                          </button>

                          <template v-else>
                            {{ hasDnActivity(row) ? getDnMonitoringGap(row) : '' }}
                          </template>
                        </td>

                        <!-- ===================================================== -->
                        <!-- ACHIEVEMENT                                           -->
                        <!-- ===================================================== -->

                        <td
                          class="dn-acv-cell"
                          :class="{
                            'dn-acv-active': hasDnActivity(row) && getDnMonitoringAchievement(row) === 100
                          }"
                        >
                          {{ hasDnActivity(row) ? `${getDnMonitoringAchievement(row)}%` : '' }}
                        </td>
                      </tr>
                    </tbody>

                    <tfoot>
                      <tr>
                        <td />

                        <td class="total-label">Total</td>

                        <td>
                          {{ section.total_out }}
                        </td>

                        <td>
                          {{ section.total_in }}
                        </td>

                        <td>
                          <button
                            v-if="Number(section.total_gap) < 0"
                            type="button"
                            class="dn-gap-detail-trigger"
                             :class="{
                               'dn-gap-detail-trigger--active': dnGapDetailActiveTriggerId === getDnGapDetailTriggerId(
                                 'section',
                                 section.key
                               )
                             }"
                            :title="`Lihat ${Math.abs(Number(section.total_gap))} DN Open pada total ${section.title}`"
                            @click="openDnGapDetail(
                              'section',
                              Number(section.total_gap),
                              section.key,
                              section.title
                            )"
                          >
                            {{ section.total_gap }}
                          </button>

                          <template v-else>
                            {{ section.total_gap }}
                          </template>
                        </td>

                        <td>{{ section.achievement }}%</td>
                      </tr>
                    </tfoot>
                  </table>
                </section>
              </div>

              <!-- ================================================= -->
              <!-- GRAND TOTAL                                        -->
              <!-- ================================================= -->

              <div class="dn-grand-total">
                <div class="grand-title">Grand Total</div>

                <div class="grand-metric">
                  <span> Out </span>

                  <strong>
                    {{ pageData.grand_total.out }}
                  </strong>
                </div>

                <div class="grand-metric">
                  <span> IN </span>

                  <strong>
                    {{ pageData.grand_total.in }}
                  </strong>
                </div>

                <div class="grand-metric grand-gap">
                  <span> GAP </span>

                  <button
                    v-if="Number(pageData.grand_total.gap) < 0"
                    type="button"
                    class="dn-gap-detail-trigger"
                     :class="{
                       'dn-gap-detail-trigger--active': dnGapDetailActiveTriggerId === getDnGapDetailTriggerId('grand')
                     }"
                    :title="`Lihat ${Math.abs(Number(pageData.grand_total.gap))} DN Open pada Grand Total`"
                    @click="openDnGapDetail(
                      'grand',
                      Number(pageData.grand_total.gap)
                    )"
                  >
                    <strong>{{ pageData.grand_total.gap }}</strong>
                  </button>

                  <strong v-else>
                    {{ pageData.grand_total.gap }}
                  </strong>
                </div>

                <div
                  class="grand-metric acv"
                  :class="{
                    'dn-acv-active': Number(pageData.grand_total.achievement) === 100
                  }"
                >
                  <span> Acv. </span>

                  <strong> {{ pageData.grand_total.achievement }}% </strong>
                </div>
              </div>

              <!-- ================================================= -->
              <!-- FOOTER                                             -->
              <!-- ================================================= -->

              <footer class="dn-report-footer">Marketing Support@2026</footer>

              <!-- SCREEN ONLY -->

              <div class="dn-page-watermark">Page {{ pageIndex + 1 }}</div>
            </article>
          </div>
        </div>

        <!-- EMPTY -->

        <div v-else class="flex min-h-[500px] items-center justify-center bg-slate-200 text-sm text-slate-500">Report belum tersedia.</div>
      </div>

      <!-- ===================================================== -->
      <!-- MAIN CONTENT                                          -->
      <!-- ===================================================== -->

      <div
        v-show="!showDnMonitoringReport || showDnMonitoringCompare"
        class="grid w-full min-w-0 items-start gap-4"
        :class="
          showDnMonitoringCompare
            ? 'order-1 grid-cols-1'
            : (
                isCheckAllDnMode
                  ? 'grid-cols-1'
                  : 'grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]'
              )
        "
      >
        <!-- =================================================== -->
        <!-- LEFT PANEL : PASTE DN                               -->
        <!-- =================================================== -->

        <div
          v-if="!isCheckAllDnMode && !showDnMonitoringCompare"
          class="self-start overflow-visible rounded-xl !border !border-gray-200 bg-slate-50"
        >
          <!-- LEFT HEADER -->

          <div class="!border-b !border-gray-200 bg-white px-4 py-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-bold text-slate-800">Paste DN Number</h3>

                <p class="mt-1 text-xs text-slate-500">Copy kolom No. DN dari Excel, lalu paste di bawah.</p>
              </div>

              <span class="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                {{ parsedDnNumbers.length }} DN
              </span>
            </div>
          </div>

          <!-- TEXT AREA -->

          <div class="p-3">
            <textarea
              v-model="dnPasteText"
              spellcheck="false"
              placeholder="Paste DN dari Excel di sini...

Contoh:
DN4126080019983A
DN4126080019982A
DN4126080019981A"
              class="h-[313px] w-full resize-none rounded-xl !border !border-gray-200 bg-white px-3 py-3 font-mono text-xs leading-6 text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:!border-blue-400 focus:ring-2 focus:ring-blue-100"
            />

            <div class="mt-3 rounded-xl !border !border-gray-200 bg-white p-3">
              <label class="mb-2 block text-xs font-bold text-slate-700"> DN Registered Date </label>

              <input
                v-model="dnInOfficeDate"
                type="date"
                class="h-10 w-full rounded-xl !border !border-gray-200 bg-white px-3 text-xs text-slate-700 outline-none transition-all focus:!border-blue-400 focus:ring-2 focus:ring-blue-100"
              />

              <p class="mt-2 text-[10px] text-slate-400">Tanggal fisik DN kembali dan diterima di office.</p>
            </div>

            <p class="mt-2 text-[11px] leading-5 text-slate-400">
              Duplicate DN pada hasil paste akan otomatis diabaikan. Hasil crosscheck akan tampil otomatis.
            </p>
          </div>

          <!-- LEFT ACTION -->

          <div class="flex items-center justify-end gap-2 !border-t !border-gray-200 bg-white px-3 py-3">
            <button
              type="button"
              :disabled="!dnPasteText && dnCrosscheckRows.length === 0"
              class="h-10 rounded-xl !border !border-gray-200 bg-white px-4 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              @click="clearDnCrosscheck()"
            >
              Clear
            </button>

            <!-- ===================================================== -->
            <!-- POST DN REGISTER                                     -->
            <!-- ===================================================== -->

            <div
              class="relative z-[200] flex min-w-0 flex-1"
              :title="dnRegisterDisabledMessage || undefined"
              @mouseenter="showRegisterTooltip()"
              @mouseleave="hideRegisterTooltip()"
            >
              <button
                type="button"
                :disabled="!permissions.create || dnCrosscheckRegisterableCount === 0 || isRegisteringDn"
                class="inline-flex h-10 w-full min-w-0 items-center justify-center gap-1 rounded-xl px-2.5 text-[11px] font-semibold leading-tight transition-all duration-200"
                :class="
                  !permissions.create || dnCrosscheckRegisterableCount === 0 || isRegisteringDn
                    ? `
          pointer-events-none
          cursor-not-allowed
          bg-blue-300
          text-white
          opacity-80
        `
                    : `
          cursor-pointer
          bg-blue-600
          text-white
          shadow-sm
          hover:bg-blue-700
          active:scale-95
        `
                "
                @click="registerDnInOffice()"
              >
                <!-- LABEL -->
                <span class="min-w-0 whitespace-nowrap text-center">
                  {{ isRegisteringDn ? 'Posting...' : 'Post DN for Register' }}
                </span>

                <span v-if="!isRegisteringDn" class="shrink-0 whitespace-nowrap text-[11px] tabular-nums">
                  ({{ formatDnCount(dnCrosscheckRegisterableCount) }})
                </span>
              </button>

              <!-- =================================================== -->
              <!-- DISABLED TOOLTIP                                    -->
              <!-- =================================================== -->

              <!-- =================================================== -->
              <!-- DISABLED TOOLTIP                                    -->
              <!-- =================================================== -->

              <Transition
                enter-active-class="
    transition-all
    duration-150
  "
                enter-from-class="
    opacity-0
    translate-y-1
  "
                enter-to-class="
    opacity-100
    translate-y-0
  "
                leave-active-class="
    transition-all
    duration-100
  "
                leave-from-class="
    opacity-100
    translate-y-0
  "
                leave-to-class="
    opacity-0
    translate-y-1
  "
              >
                <div
                  v-if="dnRegisterDisabledMessage && showDnRegisterTooltip"
                  class="pointer-events-none absolute bottom-[calc(100%+10px)] right-0 z-[9999] w-[240px] rounded-xl bg-slate-800 px-3 py-2.5 text-left text-[11px] font-medium leading-4 text-white shadow-xl"
                >
                  <div class="flex items-start gap-2">
                    <!-- INFO ICON -->

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      class="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-300"
                    >
                      <circle cx="12" cy="12" r="9" />

                      <path stroke-linecap="round" d="M12 11v5" />

                      <path stroke-linecap="round" d="M12 8h.01" />
                    </svg>

                    <span>
                      {{ dnRegisterDisabledMessage }}
                    </span>
                  </div>

                  <!-- ARROW -->

                  <span class="absolute -bottom-1 right-7 h-2 w-2 rotate-45 bg-slate-800" />
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <!-- =================================================== -->
        <!-- RIGHT PANEL : RESULT TABLE                          -->
        <!-- =================================================== -->

        <div
          class="flex w-full min-w-0 flex-col overflow-hidden rounded-xl !border !border-gray-200 bg-white"
          :class="
            showDnMonitoringCompare
              ? 'h-[760px] max-h-[760px]'
              : 'h-[683px] max-h-[683px]'
          "
        >
          <!-- TABLE HEADER TITLE -->

          <div class="flex items-start justify-between gap-3 px-4 py-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-sm font-bold text-slate-800">
                  Raw Files Crosscheck Result
                </h3>

                <span
                  v-if="showDnMonitoringCompare"
                  class="rounded-full !border !border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700"
                >
                  Crosscheck View
                </span>
              </div>

              <p class="mt-1 text-xs text-slate-500">
                Hasil pencocokan berdasarkan kolom No. DN pada Raw Files.
              </p>
            </div>

            <!-- DELETE ACTION -->

            <div class="flex shrink-0 items-center gap-2">
              <!-- CLEAR SELECTED -->

              <button
                v-if="dnDeleteSelectedCount > 0"
                type="button"
                class="h-8 rounded-lg !border !border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
                @click="clearDnDeleteSelection()"
              >
                Clear Selection
              </button>

              <!-- DELETE SELECTED -->

              <button
                type="button"
                :disabled="!permissions.delete || dnDeleteSelectedCount === 0 || isDeletingDnRegister"
                class="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white transition-all hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-red-200 disabled:text-red-400"
                @click="deleteSelectedDnRegisters()"
              >
                Delete Selected

                <span> ({{ dnDeleteSelectedCount }}) </span>
              </button>

              <!-- DELETE FILTERED -->

              <button
                type="button"
                :disabled="!permissions.delete || deletableDnFilteredRows.length === 0 || isDeletingDnRegister"
                class="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg !border !border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 transition-all hover:!border-red-400 hover:bg-red-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                @click="deleteFilteredDnRegisters()"
              >
                {{ isDeletingDnRegister ? 'Deleting...' : 'Delete Filtered' }}

                <span> ({{ formatDnCount(deletableDnFilteredRows.length) }}) </span>
              </button>
            </div>
          </div>

          <!-- TABLE -->

          <div
            class="relative min-h-0 flex-1 overflow-auto bg-white"
            :class="
              showDnMonitoringCompare
                ? 'dn-crosscheck-table-fill'
                : ''
            "
            @scroll.passive="customerOrderStore.closeAllPopups()"
          >
            <table
              class="w-full table-fixed border-separate border-spacing-0 text-xs"
              :class="[
                'min-w-[900px]',
                showDnMonitoringCompare
                  ? 'h-full'
                  : ''
              ]"
            >
              <thead class="sticky top-0 z-[20] bg-blue-50">
                <tr>
                  <!-- NO -->

                  <th class="w-[46px] min-w-[46px] !border !border-gray-200 !bg-blue-50 px-2 text-center align-middle">
                    <input
                      type="checkbox"
                      :checked="isAllCurrentPageDnSelected"
                      :disabled="deletableDnCurrentPageRows.length === 0"
                      title="
      Select semua DN Close pada halaman ini
    "
                      class="h-4 w-4 cursor-pointer accent-red-600 rounded-md !border !border-gray-400 disabled:cursor-not-allowed disabled:opacity-40"
                      @change="toggleAllCurrentPageDnDelete()"
                    />
                  </th>

                  <th
                    class="w-[55px] !border !border-gray-200 !bg-blue-50 px-2 py-3 text-center align-middle text-xs font-bold text-slate-700"
                  >
                    No
                  </th>

                  <!-- DYNAMIC COLUMN -->

                  <th
                    v-for="col in dnCrosscheckVisibleColumns"
                    :key="col.key"
                    class="relative box-border overflow-visible !border !border-gray-200 !bg-blue-50 p-2 pt-3 text-center align-top"
                    :class="
                      showDnMonitoringCompare && col.key === 'order_no'
                        ? 'sticky left-0 z-[35] shadow-[5px_0_10px_-8px_rgba(15,23,42,0.55)]'
                        : ''
                    "
                    :style="{
                      minWidth: col.width,

                      width: col.width,

                      maxWidth: col.width
                    }"
                  >
                    <!-- LABEL -->

                    <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center overflow-hidden">
                      <span class="block w-full text-xs font-semibold leading-tight">
                        {{ col.label }}
                      </span>

                      <span
                        v-if="showDnMonitoringCompare && col.key === 'order_no'"
                        class="absolute right-1 top-0 rounded bg-violet-100 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-violet-600"
                        title="Kolom tetap terlihat saat scroll horizontal"
                      >
                        Freeze
                      </span>
                    </div>

                    <!-- FILTER TRIGGER -->

                    <div
                      class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs text-slate-700"
                      :class="
                        dnCrosscheckSelectedFilters[col.key]?.length
                          ? `
                justify-between
                gap-2
              `
                          : `
                justify-center
              `
                      "
                      @click.stop="toggleDnCrosscheckFilter(col.key, $event)"
                    >
                      <span v-if="dnCrosscheckSelectedFilters[col.key]?.length" class="truncate">
                        {{ getDnCrosscheckSelectedLabel(col.key) }}
                      </span>

                      <span> ▾ </span>
                    </div>

                    <!-- POPUP -->

                    <DnCrosscheckFilterPopup :col="col" :store="customerOrderStore" />
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(row, rowIndex) in dnCrosscheckPaginatedRows"
                  :key="row.dn_number"
                  class="odd:bg-white even:bg-slate-50"
                  :class="
                    showDnMonitoringCompare
                      ? 'h-auto'
                      : 'h-[34px]'
                  "
                >
                  <!-- NO -->

                  <td class="w-[46px] min-w-[46px] !border !border-gray-200 px-2 text-center">
                    <input
                      type="checkbox"
                      :checked="isDnSelectedForDelete(row.dn_number)"
                      :disabled="!isDnDeletable(row) || isDeletingDnRegister"
                      :title="row.registered ? 'Pilih DN untuk menghapus Register' : 'DN Open tidak memiliki Register yang dapat dihapus'"
                      class="h-4 w-4 cursor-pointer accent-red-600 rounded-md !border !border-gray-400 disabled:cursor-not-allowed disabled:opacity-30"
                      @change="toggleDnDeleteSelection(row)"
                    />
                  </td>

                  <td
                    class="!border !border-gray-200 px-2 py-2.5 text-center text-slate-500"
                    :class="
                      showDnMonitoringCompare
                        ? 'h-auto'
                        : 'h-[34px]'
                    "
                  >
                    {{ dnCrosscheckShowingStart + rowIndex }}
                  </td>

                  <!-- ===================================================== -->
                  <!-- NO. DN                                                 -->
                  <!-- ===================================================== -->
                  <!--
                    Crosscheck View:
                    No. DN tetap terlihat saat tabel discroll horizontal.
                  -->

                  <td
                    class="!border !border-gray-200 px-3 py-2.5 font-medium text-slate-700"
                    :class="[
                      showDnMonitoringCompare
                        ? 'sticky left-0 z-[15] shadow-[5px_0_10px_-8px_rgba(15,23,42,0.55)]'
                        : '',
                      showDnMonitoringCompare
                        ? (
                            rowIndex % 2 === 0
                              ? '!bg-white'
                              : '!bg-slate-50'
                          )
                        : ''
                    ]"
                  >
                    {{ row.order_no || '-' }}
                  </td>

                  <!-- CUSTOMER -->

                  <td class="box-border overflow-hidden !border !border-gray-200 px-2 py-2.5 text-center">
                    <div
                      v-if="row.found"
                      class="flex w-full min-w-0 flex-nowrap items-center justify-center gap-1 overflow-hidden"
                    >
                      <span
                        class="inline-flex h-[22px] min-w-[68px] shrink-0 items-center justify-center whitespace-nowrap rounded-full !border px-2 font-semibold"
                        :class="getDnCrosscheckCustomerBadgeClass(row)"
                      >
                        {{ row.customer }}
                      </span>

                      <span
                        v-if="getDnCrosscheckCustomerCode(row)"
                        class="inline-flex h-[22px] min-w-[52px] shrink-0 items-center justify-center whitespace-nowrap rounded-full !border px-2 font-semibold"
                        :class="getDnCrosscheckCustomerCodeBadgeClass(row)"
                      >
                        {{ getDnCrosscheckCustomerCode(row) }}
                      </span>
                    </div>

                    <span v-else class="text-slate-400"> - </span>
                  </td>

                  <!-- ===================================================== -->
                  <!-- DN PASTE - INTERNAL ONLY                               -->
                  <!-- ===================================================== -->
                  <!--
                    row.dn_number tetap ada dan tetap digunakan oleh
                    proses crosscheck/register/delete di store/backend.

                    Nilainya sengaja tidak dirender sebagai kolom website.
                  -->

                  <!-- ORDER DATE -->

                  <td class="!border !border-gray-200 px-3 text-center text-slate-600">
                    {{ formatDnCrosscheckDate(row.order_date) }}
                  </td>

                  <!-- DELIVERY DATE -->

                  <td class="!border !border-gray-200 px-3 text-center text-slate-600">
                    {{ formatDnCrosscheckDate(row.delivery_date) }}
                  </td>

                  <!-- ===================================================== -->
                  <!-- KETERANGAN                                           -->
                  <!-- ===================================================== -->

                  <td class="!border !border-gray-200 px-3 py-2 text-center">
                    <!-- =================================================== -->
                    <!-- NOT FOUND                                           -->
                    <!-- =================================================== -->

                    <span
                      v-if="!row.found"
                      class="inline-flex h-7 min-w-[96px] items-center justify-center gap-2 rounded-full !border !border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600"
                    >
                      <span class="h-2 w-2 shrink-0 rounded-full bg-red-500" />

                      Not Found
                    </span>

                    <!-- =================================================== -->
                    <!-- CLOSE                                               -->
                    <!-- =================================================== -->

                    <span
                      v-else-if="row.registered"
                      class="inline-flex h-7 min-w-[96px] items-center justify-center gap-2 rounded-full !border !border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700"
                    >
                      <span class="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />

                      Close
                    </span>

                    <!-- =================================================== -->
                    <!-- OPEN                                                -->
                    <!-- =================================================== -->

                    <span
                      v-else
                      class="inline-flex h-7 min-w-[96px] items-center justify-center gap-2 rounded-full !border !border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600"
                    >
                      <span class="h-2 w-2 shrink-0 rounded-full bg-red-500" />

                      Open
                    </span>
                  </td>

                  <!-- ===================================================== -->
                  <!-- REGISTER DATE                                         -->
                  <!-- ===================================================== -->

                  <td class="!border !border-gray-200 px-3 py-2.5 text-center text-slate-600">
                    <span v-if="row.registered_date" class="font-semibold text-emerald-700">
                      {{ formatDnCrosscheckDate(row.registered_date) }}
                    </span>

                    <span v-else class="text-slate-400"> - </span>
                  </td>
                </tr>

                <!-- LOADING -->

                <tr v-if="isCheckingDn && dnCrosscheckRows.length === 0">
                  <td :colspan="dnCrosscheckVisibleColumns.length + 2" class="!border !border-gray-200 p-8 text-center font-medium text-blue-600">
                    Memeriksa DN pada Raw Files...
                  </td>
                </tr>

                <!-- EMPTY -->

                <tr v-else-if="dnCrosscheckDisplayRows.length === 0">
                  <td :colspan="dnCrosscheckVisibleColumns.length + 2" class="!border !border-gray-200 p-10 text-center text-slate-400">
                    Paste nomor DN di panel kiri, lalu klik Register.
                  </td>
                </tr>
              </tbody>
            </table>
            <div
              class="pointer-events-none sticky bottom-0 z-[30] h-[3px] w-full bg-slate-300/80 shadow-[0_-8px_16px_rgba(15,23,42,0.16)]"
            />
          </div>

          <!-- ======================================================= -->
          <!-- DN CROSSCHECK PAGINATION                                -->
          <!-- ======================================================= -->

          <div
            class="mt-auto flex shrink-0 flex-col gap-4 !border-t !border-slate-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <!-- LEFT -->
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <!-- ROWS PER PAGE -->

              <div class="flex items-center gap-2 text-xs text-slate-600">
                <span class="font-medium"> Show </span>

                <select
                  v-model.number="dnCrosscheckRowsPerPage"
                  :disabled="isCheckingDn"
                  class="h-9 min-w-[75px] rounded-xl !border !border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition hover:!border-blue-300 focus:!border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option v-for="option in dnCrosscheckRowsPerPageOptions" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>

                <span class="font-medium"> records </span>
              </div>

              <!-- SHOWING -->

              <div class="text-xs text-slate-600">
                Showing

                <span class="font-bold text-blue-600">
                  {{ dnCrosscheckShowingStart }}
                </span>

                to

                <span class="font-bold text-blue-600">
                  {{ dnCrosscheckShowingEnd }}
                </span>

                of

                <span class="font-bold text-blue-600">
                  {{ formatDnCount(dnCrosscheckTotal) }}
                </span>

                records
              </div>
            </div>

            <!-- RIGHT -->

            <div class="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
              <!-- FIRST -->

              <button
                type="button"
                :disabled="isCheckingDn || dnCrosscheckCurrentPage === 1"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                @click="dnCrosscheckFirstPage()"
              >
                ‹‹
              </button>

              <!-- PREV -->

              <button
                type="button"
                :disabled="isCheckingDn || dnCrosscheckCurrentPage === 1"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                @click="dnCrosscheckPrevPage()"
              >
                ‹
              </button>

              <!-- PAGE -->

              <button
                v-for="pageNumber in dnCrosscheckVisiblePages"
                :key="pageNumber"
                type="button"
                :disabled="isCheckingDn"
                class="h-9 min-w-9 shrink-0 rounded-xl !border px-3 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
                :class="
                  pageNumber === dnCrosscheckCurrentPage
                    ? `
              !border-blue-600
              bg-blue-600
              text-white
              shadow-[0_6px_14px_rgba(37,99,235,0.25)]
            `
                    : `
              !border-slate-200
              bg-white
              text-slate-700
              hover:bg-blue-50
              hover:text-blue-600
            `
                "
                @click="dnCrosscheckCurrentPage = pageNumber"
              >
                {{ pageNumber }}
              </button>

              <!-- NEXT -->

              <button
                type="button"
                :disabled="isCheckingDn || dnCrosscheckCurrentPage === dnCrosscheckTotalPages"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                @click="dnCrosscheckNextPage()"
              >
                ›
              </button>

              <!-- LAST -->

              <button
                type="button"
                :disabled="isCheckingDn || dnCrosscheckCurrentPage === dnCrosscheckTotalPages"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                @click="dnCrosscheckLastPage()"
              >
                ››
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- END REPORT / DATA VIEW LAYOUT -->
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- DN MONITORING OPEN GAP DETAIL                           -->
    <!-- Modal berada di luar print root agar tidak ikut          -->
    <!-- download image/PDF/print report.                         -->
    <!-- ======================================================= -->
    <Teleport to="body">
      <div
        v-if="showDnGapDetailModal"
        class="fixed inset-0 z-[1600] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[1px]"
        @click.self="closeDnGapDetail()"
      >
        <section
          ref="dnGapDetailModalElement"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dn-gap-detail-title"
          class="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl !border !border-slate-200 bg-white shadow-2xl"
          :class="shouldScrollDnGapDetailTable
            ? 'h-[calc(100vh-24px)] max-h-[760px]'
            : 'h-auto max-h-[calc(100vh-24px)]'"
        >
          <header class="flex shrink-0 items-start justify-between gap-4 !border-b !border-slate-200 px-5 py-4 sm:px-6">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 id="dn-gap-detail-title" class="text-base font-bold text-slate-900">
                  {{ getDnGapDetailTitle }}
                </h3>

                <span
                  v-if="dnGapDetailContext"
                  class="rounded-full !border !border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600"
                >
                  GAP {{ dnGapDetailContext.gap }}
                </span>
              </div>

              <p class="mt-1 text-xs leading-relaxed text-slate-500">
                <template v-if="isDnGapDetailServerPaged">
                  Hanya menampilkan DN yang masih Open. Data dimuat per halaman dari server agar popup tetap ringan.
                </template>
                <template v-else>
                  Hanya menampilkan DN yang masih Open dari hasil paste yang sudah tersedia di browser.
                </template>
              </p>

              <p
                v-if="hasDnGapDetailSnapshotDifference"
                class="mt-2 rounded-lg !border !border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700"
              >
                GAP report adalah snapshot {{ dnGapDetailExpectedTotal }} DN Open, sedangkan kondisi terbaru sekarang {{ dnGapDetailSourceTotal }} DN Open.
              </p>

              <p
                v-if="dnGapDetailDownloadError"
                class="mt-2 text-xs font-semibold text-red-600"
              >
                {{ dnGapDetailDownloadError }}
              </p>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <button
                type="button"
                :disabled="!permissions.download || isDownloadingDnGapExcel || isLoadingDnGapDetail || dnGapDetailTotal === 0"
                class="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="downloadDnGapDetailExcel()"
              >
                {{ isDownloadingDnGapExcel
                  ? 'Menyiapkan Excel...'
                  : `Download Excel (${dnGapDetailTotal})` }}
              </button>

              <button
                type="button"
                title="Tutup detail DN Open"
                aria-label="Tutup detail DN Open"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full !border !border-slate-300 bg-white text-xl font-medium text-slate-500 transition hover:!border-red-300 hover:bg-red-50 hover:text-red-600"
                @click="closeDnGapDetail()"
              >
                ×
              </button>
            </div>
          </header>

          <div
            class="overflow-hidden p-4 sm:p-5"
            :class="shouldScrollDnGapDetailTable ? 'min-h-0 flex-1' : 'shrink-0'"
          >
            <div
              class="overflow-hidden rounded-xl !border !border-slate-200"
              :class="shouldScrollDnGapDetailTable ? 'h-full' : ''"
            >
              <div
                class="overflow-x-auto"
                :class="shouldScrollDnGapDetailTable
                  ? 'h-full overflow-y-auto'
                  : 'overflow-y-hidden'"
                @scroll="closeDnGapDetailFilter()"
              >
                <table class="w-full min-w-[900px] table-fixed text-sm">
                  <thead class="sticky top-0 z-20 bg-blue-50 text-slate-800 shadow-[0_1px_0_rgba(148,163,184,0.35)]">
                    <tr>
                      <th
                        v-for="column in dnGapDetailFilterColumns"
                        :key="column.key"
                        class="!border !border-slate-200 px-3 py-2 text-center font-bold"
                        :class="{
                          'w-[18%]': column.key === 'customer',
                          'w-[16%]': column.key === 'quantity',
                          'w-[22%]': column.key === 'dnNumber' || column.key === 'orderDate' || column.key === 'deliveryDate'
                        }"
                        :title="column.key === 'quantity'
                          ? 'Akumulasi Order Quantity dari seluruh baris Format Sales Order pada DN yang sama'
                          : undefined"
                      >
                        <div class="flex flex-col gap-1.5">
                          <span :class="column.key === 'dnNumber' ? 'text-left' : 'text-center'">
                            {{ column.label }}
                          </span>

                          <button
                            type="button"
                            class="flex h-8 w-full items-center justify-between gap-2 rounded-lg !border bg-white px-2.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                            :disabled="isLoadingDnGapDetail || dnGapDetailSourceTotal === 0"
                            :class="getDnGapDetailSelectedFilterCount(column.key) > 0
                              ? '!border-blue-400 text-blue-700 ring-1 ring-blue-100'
                              : '!border-slate-300 text-slate-500 hover:!border-blue-300 hover:text-blue-600'"
                            @click.stop="toggleDnGapDetailFilter(column.key, $event)"
                          >
                            <span class="truncate">
                              {{ getDnGapDetailSelectedFilterCount(column.key) > 0
                                ? `${getDnGapDetailSelectedFilterCount(column.key)} dipilih`
                                : column.key === 'quantity' ? 'Filter Qty' : 'Filter' }}
                            </span>
                            <span class="text-[10px]">▼</span>
                          </button>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-if="isLoadingDnGapDetail">
                      <td colspan="5" class="!border !border-slate-200 px-4 py-10 text-center font-medium text-blue-600">
                        Memuat detail DN Open...
                      </td>
                    </tr>

                    <tr v-else-if="dnGapDetailError">
                      <td colspan="5" class="!border !border-slate-200 bg-red-50 px-4 py-8 text-center text-sm font-medium text-red-600">
                        {{ dnGapDetailError }}
                      </td>
                    </tr>

                    <tr v-else-if="dnGapDetailRows.length === 0">
                      <td colspan="5" class="!border !border-slate-200 px-4 py-10 text-center text-slate-400">
                        {{ dnGapDetailSourceTotal > 0 && hasDnGapDetailActiveFilters
                          ? 'Tidak ada DN Open yang sesuai dengan filter popup.'
                          : 'Tidak ada DN Open pada scope GAP ini. Data register mungkin sudah berubah setelah report dibuat.' }}
                      </td>
                    </tr>

                    <template v-else>
                      <tr
                        v-for="row in dnGapDetailRows"
                        :key="`${row.customer}-${row.dnNumber}`"
                        class="odd:bg-white even:bg-slate-50"
                      >
                        <td class="!border !border-slate-200 px-4 py-2 text-center text-slate-700">
                          {{ row.customer }}
                        </td>
                        <td class="!border !border-slate-200 px-4 py-2 font-semibold text-slate-800">
                          {{ row.dnNumber }}
                        </td>
                        <td class="!border !border-slate-200 px-4 py-2 text-right font-semibold tabular-nums text-slate-800">
                          {{ formatDnGapQuantity(row.quantity) }}
                        </td>
                        <td class="!border !border-slate-200 px-4 py-2 text-center text-slate-600">
                          {{ formatDnCrosscheckDate(row.orderDate) }}
                        </td>
                        <td class="!border !border-slate-200 px-4 py-2 text-center text-slate-600">
                          {{ formatDnCrosscheckDate(row.deliveryDate) }}
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <footer class="flex shrink-0 flex-col gap-3 !border-t !border-slate-200 bg-slate-50 px-5 py-3 lg:flex-row lg:items-center lg:justify-between sm:px-6">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
              <label class="flex items-center gap-2 whitespace-nowrap font-medium text-slate-600">
                <span>Show</span>
                <select
                  :value="dnGapDetailPageSize"
                  class="h-9 min-w-[82px] rounded-xl !border !border-slate-300 bg-white py-0 pl-3 !pr-9 text-left text-xs font-semibold text-slate-700 outline-none transition focus:!border-blue-400 focus:ring-2 focus:ring-blue-100"
                  @change="changeDnGapDetailPageSize"
                >
                  <option
                    v-for="size in dnGapDetailPageSizeOptions"
                    :key="size"
                    :value="size"
                  >
                    {{ size === 'all' ? 'All' : size }}
                  </option>
                </select>
                <span>records</span>
              </label>

              <p>
                Menampilkan
                <strong class="text-slate-700">{{ dnGapDetailShowingStart }}</strong>
                sampai
                <strong class="text-slate-700">{{ dnGapDetailShowingEnd }}</strong>
                dari
                <strong class="text-slate-700">{{ dnGapDetailTotal }}</strong>
                DN Open
                <span v-if="hasDnGapDetailActiveFilters">
                  ({{ dnGapDetailSourceTotal }} total)
                </span>
              </p>

              <button
                v-if="hasDnGapDetailActiveFilters"
                type="button"
                class="rounded-md !border !border-slate-300 bg-white px-2 py-1 font-semibold text-slate-600 transition hover:!border-blue-300 hover:text-blue-600"
                @click="resetDnGapDetailFilters()"
              >
                Clear Filter
              </button>
            </div>

            <div class="flex min-w-0 items-center justify-end gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                :disabled="isLoadingDnGapDetail || dnGapDetailPage <= 1"
                title="Halaman pertama"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl !border !border-slate-300 bg-white text-sm font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                @click="goToDnGapDetailPage(1)"
              >
                ‹‹
              </button>

              <button
                type="button"
                :disabled="isLoadingDnGapDetail || dnGapDetailPage <= 1"
                title="Halaman sebelumnya"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl !border !border-slate-300 bg-white text-sm font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                @click="goToDnGapDetailPage(dnGapDetailPage - 1)"
              >
                ‹
              </button>

              <button
                v-for="pageNumber in dnGapDetailVisiblePages"
                :key="pageNumber"
                type="button"
                :disabled="isLoadingDnGapDetail"
                class="h-9 min-w-9 shrink-0 rounded-xl !border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
                :class="pageNumber === dnGapDetailPage
                  ? '!border-blue-600 bg-blue-600 text-white shadow-[0_6px_14px_rgba(37,99,235,0.25)]'
                  : '!border-slate-300 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600'"
                @click="goToDnGapDetailPage(pageNumber)"
              >
                {{ pageNumber }}
              </button>

              <button
                type="button"
                :disabled="isLoadingDnGapDetail || dnGapDetailPage >= dnGapDetailTotalPages"
                title="Halaman berikutnya"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl !border !border-slate-300 bg-white text-sm font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                @click="goToDnGapDetailPage(dnGapDetailPage + 1)"
              >
                ›
              </button>

              <button
                type="button"
                :disabled="isLoadingDnGapDetail || dnGapDetailPage >= dnGapDetailTotalPages"
                title="Halaman terakhir"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl !border !border-slate-300 bg-white text-sm font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                @click="goToDnGapDetailPage(dnGapDetailTotalPages)"
              >
                ››
              </button>
            </div>
          </footer>
        </section>
      </div>
    </Teleport>

    <!-- Filter popup detail GAP. Pada Check All, page utama tetap server-side.
         Search 3+ karakter mengambil opsi dari seluruh scope tanpa full hydration. -->
    <Teleport to="body">
      <div
        v-if="showDnGapDetailModal && dnGapDetailOpenFilterKey"
        class="fixed z-[1700] flex w-[270px] flex-col overflow-hidden rounded-2xl !border !border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.25)]"
        :style="{
          top: `${dnGapDetailFilterPopupPosition.top}px`,
          left: `${dnGapDetailFilterPopupPosition.left}px`,
          maxHeight: `${dnGapDetailFilterPopupPosition.maxHeight}px`
        }"
        @click.stop
      >
        <div class="flex items-center justify-between !border-b !border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <div class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Filter</div>
            <div class="text-sm font-bold text-slate-700">
              {{ getDnGapDetailColumnLabel(dnGapDetailOpenFilterKey) }}
            </div>
          </div>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-full !border !border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:text-red-500"
            @click="closeDnGapDetailFilter()"
          >
            ×
          </button>
        </div>

        <div class="flex-none !border-b !border-slate-200 bg-slate-50 px-4 pb-3">
          <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Sort
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              class="rounded-lg !border px-2 py-1.5 text-[11px] font-semibold transition"
              :class="getDnGapDetailSortDirection(dnGapDetailOpenFilterKey) === 'none'
                ? '!border-emerald-300 bg-emerald-50 text-emerald-700'
                : '!border-slate-200 bg-white text-slate-600 hover:bg-slate-100'"
              @click="setDnGapDetailSort(dnGapDetailOpenFilterKey, 'none')"
            >
              ↕ None
            </button>
            <button
              type="button"
              class="rounded-lg !border px-2 py-1.5 text-[11px] font-semibold transition"
              :class="getDnGapDetailSortDirection(dnGapDetailOpenFilterKey) === 'asc'
                ? '!border-blue-300 bg-blue-50 text-blue-700'
                : '!border-slate-200 bg-white text-slate-600 hover:bg-blue-50'"
              @click="setDnGapDetailSort(dnGapDetailOpenFilterKey, 'asc')"
            >
              A → Z
            </button>
            <button
              type="button"
              class="rounded-lg !border px-2 py-1.5 text-[11px] font-semibold transition"
              :class="getDnGapDetailSortDirection(dnGapDetailOpenFilterKey) === 'desc'
                ? '!border-orange-300 bg-orange-50 text-orange-700'
                : '!border-slate-200 bg-white text-slate-600 hover:bg-orange-50'"
              @click="setDnGapDetailSort(dnGapDetailOpenFilterKey, 'desc')"
            >
              Z → A
            </button>
          </div>
        </div>

        <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
          <input
            type="text"
            class="h-9 w-full flex-none rounded-lg !border !border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:!border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="Cari pilihan..."
            :value="dnGapDetailSearchFilters[dnGapDetailOpenFilterKey]"
            @input="onDnGapDetailSearchInput(dnGapDetailOpenFilterKey, $event)"
          />

          <!-- Nilai filter diprioritaskan tampil sebelum helper/control lain.
               Dengan begitu GAP yang hanya punya 1-4 data tetap langsung
               menampilkan opsinya, bukan terdorong ke bawah popup. -->
          <div class="min-h-[44px] max-h-[176px] flex-none overflow-y-auto rounded-lg !border !border-slate-200 bg-white">
            <label
              v-for="option in getDnGapDetailVisibleFilterOptions(dnGapDetailOpenFilterKey)"
              :key="option"
              class="flex min-h-10 cursor-pointer items-center gap-2 !border-b !border-slate-100 px-3 py-2 text-xs text-slate-700 last:!border-b-0 hover:bg-blue-50"
            >
              <input
                type="checkbox"
                class="h-4 w-4 shrink-0 cursor-pointer rounded !border !border-slate-400 bg-white accent-blue-600"
                :checked="isDnGapDetailFilterSelected(dnGapDetailOpenFilterKey, option)"
                @change="toggleDnGapDetailFilterValue(dnGapDetailOpenFilterKey, option)"
              />
              <span class="min-w-0 flex-1 truncate font-medium">
                {{ formatDnGapDetailFilterOption(dnGapDetailOpenFilterKey, option) }}
              </span>
            </label>

            <div
              v-if="getDnGapDetailVisibleFilterOptions(dnGapDetailOpenFilterKey).length === 0"
              class="px-3 py-4 text-center text-xs text-slate-400"
            >
              Tidak ada pilihan.
            </div>
          </div>

          <p
            v-if="shouldShowDnGapDetailRemoteSearchHint"
            class="flex-none px-0.5 text-[10px] leading-relaxed text-slate-400"
          >
            {{ isLoadingDnGapDetailFilterOptions
              ? 'Mencari pilihan di seluruh data...'
              : String(dnGapDetailSearchFilters[dnGapDetailOpenFilterKey] ?? '').trim().length >= 3
                ? 'Hasil pencarian mencakup seluruh scope DN Open.'
                : 'Ketik minimal 3 karakter untuk mencari pilihan di seluruh data.' }}
          </p>

          <div class="flex flex-none items-center justify-between gap-3 rounded-lg !border !border-slate-200 bg-slate-50 px-3 py-2">
            <label class="flex min-w-0 cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                class="h-4 w-4 shrink-0 cursor-pointer rounded !border !border-slate-400 accent-blue-600"
                :checked="areAllVisibleDnGapDetailFilterOptionsSelected(dnGapDetailOpenFilterKey)"
                @change="toggleAllDnGapDetailFilterOptions(dnGapDetailOpenFilterKey)"
              />
              <span>{{ isDnGapDetailServerPaged ? 'Select Visible' : 'Select All' }}</span>
              <span class="text-[10px] font-medium text-slate-400">
                ({{ getDnGapDetailVisibleFilterOptions(dnGapDetailOpenFilterKey).length }})
              </span>
            </label>
            <button
              type="button"
              class="shrink-0 text-[11px] font-semibold text-red-500 hover:text-red-600 hover:underline"
              @click.stop="clearDnGapDetailColumnFilter(dnGapDetailOpenFilterKey)"
            >
              Clear Filter
            </button>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 !border-t !border-slate-200 bg-slate-50 px-3 py-2.5">
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            @click="closeDnGapDetailFilter()"
          >
            Selesai
          </button>
        </div>
      </div>
    </Teleport>

    <button
      type="button"
      title="Ke paling bawah"
      aria-label="Scroll ke paling bawah"
      class="fixed bottom-5 right-5 z-[950] flex h-10 w-10 items-center justify-center rounded-xl !border !border-blue-200 bg-white text-blue-600 shadow-[0_6px_18px_rgba(15,23,42,0.14)] transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 active:scale-90"
      @click="scrollToPageBottom"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" class="h-5 w-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v15" />

        <path stroke-linecap="round" stroke-linejoin="round" d="m6 13 6 6 6-6" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
/*
 * ==========================================================
 * UPLOAD SO - COMPONENT SCOPED STYLES
 * ==========================================================
 *
 * Semua custom CSS pada file ini dibatasi hanya untuk DOM
 * milik UploadSo.vue.
 *
 * CSS global khusus Print/PDF tidak diletakkan di sini.
 * Print DN Monitoring sudah memakai iframe khusus melalui
 * printDnMonitoringReport() pada store.
 * ==========================================================
 */

/* ==========================================================
   DN MONITORING PRINT PREVIEW
   ========================================================== */

/*
 * @page tidak ditaruh di scoped component.
 *
 * Rule @page / html / body khusus Print/PDF sudah dibuat di
 * iframe print oleh printDnMonitoringReport().
 */

/* ==========================================================
   PREVIEW BACKGROUND
   ========================================================== */

.dn-monitoring-preview {
  width: 100%;

  /*
   * Penting:
   * ketika zoom 120%, 130%, 150%
   * user bisa scroll kanan/kiri.
   */
  overflow: auto;

  padding: 24px;

  background: #cbd5e1;

  box-sizing: border-box;

  /*
   * Supaya zoom besar nyaman dilihat.
   */
  min-height: 600px;
}

/* ==========================================================
   DN CROSSCHECK TABLE - FILL SPLIT PANEL HEIGHT
   ========================================================== */

/*
 * Pada Crosscheck View, area tabel kiri mempunyai tinggi tetap
 * yang sama dengan panel report kanan.
 *
 * Table dibuat 100% tinggi sehingga browser mendistribusikan
 * sisa ruang vertikal ke row yang sedang tampil. Dengan begitu
 * tidak ada area putih besar antara row terakhir dan pagination.
 *
 * Behavior Data Only normal tetap seperti sebelumnya.
 */
.dn-crosscheck-table-fill > table {
  height: 100%;
}

/*
 * Pastikan tbody ikut mengambil ruang sisa setelah thead.
 * Browser table-layout akan membagi ruang ini ke row yang ada.
 */
.dn-crosscheck-table-fill > table > tbody {
  height: 100%;
}

/*
 * Row tidak dipaksa 34px pada Split View.
 * min-height menjaga row tetap nyaman jika rows per page besar.
 */
.dn-crosscheck-table-fill > table > tbody > tr {
  height: auto;
  min-height: 34px;
}

/*
 * Empty/loading row tetap memenuhi area tabel dengan baik.
 */
.dn-crosscheck-table-fill > table > tbody > tr:only-child > td {
  vertical-align: middle;
}


/* ==========================================================
   DN MONITORING SPLIT CROSSCHECK VIEW
   ========================================================== */

/*
 * Pada Split View, area preview mengisi sisa tinggi panel kanan
 * dan memiliki scroll sendiri.
 */
.dn-monitoring-preview-compare {
  min-height: 0 !important;

  height: 100%;

  padding: 16px;
}

/*
 * Desktop lebar: kiri data, kanan report.
 * Pada layar yang lebih kecil Tailwind otomatis menumpuk
 * menjadi satu kolom agar tabel/report tidak terlalu sempit.
 */


/* ==========================================================
   DN MONITORING VIEW ZOOM
   ========================================================== */

/*
 * Petunjuk ringan selama report ditampilkan. Animasi berdenyut singkat lalu
 * beristirahat sebelum mengulang; tidak membuat timer atau request tambahan.
 */
.dn-report-zoom-controls--attention {
  animation: dn-report-zoom-attention 5.5s ease-in-out infinite;
}

.dn-report-zoom-controls--attention .dn-report-zoom-in-button:not(:disabled) {
  animation: dn-report-zoom-plus-attention 5.5s ease-in-out infinite;
}

@keyframes dn-report-zoom-attention {
  0%,
  28%,
  100% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
  }

  7%,
  19% {
    box-shadow:
      0 0 0 4px rgba(37, 99, 235, 0.2),
      0 6px 16px rgba(37, 99, 235, 0.16);
  }

  13%,
  25% {
    box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.08);
  }
}

@keyframes dn-report-zoom-plus-attention {
  0%,
  28%,
  100% {
    background: #ffffff;
    color: #475569;
    transform: scale(1);
  }

  7%,
  19% {
    background: #2563eb;
    color: #ffffff;
    box-shadow: inset 0 0 0 1px #1d4ed8;
    transform: scale(1.1);
  }

  13%,
  25% {
    background: #dbeafe;
    color: #1d4ed8;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dn-report-zoom-controls--attention,
  .dn-report-zoom-controls--attention .dn-report-zoom-in-button:not(:disabled) {
    animation: none;
  }
}

.dn-monitoring-zoom-layer {
  /*
   * Ukuran asli A4.
   *
   * Zoom hanya memengaruhi tampilan browser,
   * bukan struktur/data report.
   */
  width: 210mm;

  margin: 0 auto;

  transform-origin: top center;

  /*
   * Supaya perubahan zoom lebih halus.
   */
  transition: zoom 0.15s ease;

  /*
   * Mencegah perubahan ukuran child.
   */
  box-sizing: border-box;
}

/* ==========================================================
   A4 PAGE
   ========================================================== */

.dn-report-page {
  position: relative;

  width: 210mm;
  height: 297mm;

  margin: 0 auto 16px;

  padding: 5.5mm 3.5mm 2.5mm;

  display: flex;

  flex-direction: column;

  overflow: hidden;

  box-sizing: border-box;

  background: #ffffff;

  color: #000000;

  font-family: Arial, Helvetica, sans-serif;

  page-break-after: always;

  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.22);

  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.dn-report-page:last-child {
  page-break-after: auto;
}

/* ==========================================================
   HEADER
   ========================================================== */

.dn-report-header {
  flex: 0 0 18mm;

  height: 18mm;

  display: grid;

  grid-template-columns:
    32%
    48%
    20%;

  align-items: center;
}

.dn-brand-left {
  height: 100%;

  display: flex;

  align-items: center;

  justify-content: flex-start;

  padding-right: 3mm;

  overflow: hidden;
}

.dn-brand-left img {
  display: block;

  width: auto;

  /*
   * Logo New Armada diperkecil
   * supaya tidak mepet ke nama perusahaan.
   */
  max-width: 88%;

  max-height: 11.5mm;

  object-fit: contain;
}

.dn-brand-center {
  height: 100%;

  display: flex;

  flex-direction: column;

  justify-content: center;

  align-items: flex-start;

  padding-left: 1mm;
}

.monitoring-label {
  font-size: 6.8pt;

  font-weight: 600;

  line-height: 1;

  color: #404040;
}

.company-name {
  margin-top: 0.7mm;

  white-space: nowrap;

  font-size: 16.5pt;

  line-height: 1;

  font-weight: 800;

  letter-spacing: -0.65px;

  color: #3f3f3f;
}

.dn-brand-right {
  height: 100%;

  display: flex;

  align-items: center;

  justify-content: flex-end;

  overflow: hidden;
}

.dn-brand-right img {
  display: block;

  width: auto;

  max-width: 100%;

  max-height: 16.5mm;

  object-fit: contain;
}

.brand-fallback {
  font-size: 16pt;

  font-weight: 800;

  color: #19398a;
}

.brand-right-fallback {
  font-size: 11pt;

  font-weight: 800;

  color: #e41e2b;
}

.dn-header-line {
  flex: 0 0 auto;

  height: 0;

  border-bottom: 0.3mm solid #111111;
}

/* ==========================================================
   UPDATE
   ========================================================== */

.dn-update-row {
  flex: 0 0 7.5mm;

  height: 7.5mm;

  display: flex;

  align-items: center;

  justify-content: flex-end;
}

.dn-update-box {
  min-width: 44mm;

  height: 5mm;

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 2.5mm;

  padding: 0 2.5mm;

  border: 0.25mm solid #91c600;

  border-radius: 1.3mm;

  box-shadow: 0 0 1.2mm rgba(96, 165, 0, 0.22);

  font-size: 6pt;
}

/* ==========================================================
   PERIOD
   ========================================================== */

.dn-period-title {
  flex: 0 0 9.5mm;

  height: 9.5mm;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 0.7mm;

  color: #333333;
}

.dn-period-main {
  font-size: 14.5pt;

  font-weight: 700;

  line-height: 1;
}

.dn-period-basis {
  display: inline-flex;

  align-items: center;

  justify-content: center;

  min-height: 3mm;

  padding: 0.25mm 2mm;

  border: 0.2mm solid #cbd5e1;

  border-radius: 2mm;

  background: #f8fafc;

  color: #64748b;

  font-size: 5.8pt;

  font-weight: 700;

  line-height: 1;

  letter-spacing: 0.01em;

  white-space: nowrap;

  -webkit-print-color-adjust: exact;

  print-color-adjust: exact;
}

/* ==========================================================
   SIX SECTIONS
   ========================================================== */

.dn-report-grid {
  flex: 1 1 auto;

  min-height: 0;

  width: 100%;

  display: grid;

  grid-template-columns: repeat(3, minmax(0, 1fr));

  grid-template-rows: repeat(2, minmax(0, 1fr));

  column-gap: 3.5mm;

  row-gap: 2.5mm;
}

.dn-section {
  min-width: 0;

  min-height: 0;

  height: 100%;

  display: grid;

  grid-template-rows:
    3mm
    5.5mm
    minmax(0, 1fr);

  overflow: hidden;
}

.dn-section-note {
  height: 3mm;

  display: flex;

  align-items: flex-end;

  padding-bottom: 0.3mm;

  font-size: 4.8pt;

  line-height: 1;
}

.dn-section-heading {
  position: relative;

  height: 5.5mm;

  display: flex;

  align-items: center;

  justify-content: flex-start;

  padding: 0 1mm;

  box-sizing: border-box;

  font-size: 9pt;

  line-height: 1;

  white-space: nowrap;
}

.dn-section-heading strong {
  font-weight: 700;
}

.dn-section-stamp {
  margin-left: 1mm;

  font-size: 5pt;

  font-weight: 400;
}

/* ==========================================================
   TABLE
   ========================================================== */

.dn-section-table {
  width: 100%;

  height: 100%;

  min-height: 0;

  border-collapse: collapse;

  table-layout: fixed;

  font-size: 5pt;
}

.dn-section-table th,
.dn-section-table td {
  padding: 0;

  text-align: center;

  vertical-align: middle;

  white-space: nowrap;

  overflow: hidden;
}

.dn-section-table thead th {
  height: 5.2mm;

  /*
   * Abu-abu terang seperti Excel.
   */
  background: #d9d9d9;

  color: #000000;

  font-size: 6pt;

  font-weight: 700;

  border: none;
}

/*
 * Dibuat sedikit lebih panjang dibanding
 * versi backend sebelumnya supaya report
 * memenuhi tinggi A4 dengan lebih rapi.
 */
.dn-section-table tbody tr,
.dn-section-table tbody td {
  height: 3.22mm;
}

.dn-section-table tbody td {
  padding: 0;

  border-bottom: 0.08mm solid #eeeeee;

  line-height: 1;

  font-size: 5.5pt;
}

/* ==========================================================
   DN MONITORING WEEKEND ROW COLORS
   ========================================================== */

/*
 * Sabtu: blok baris kuning dibuat lebih tegas.
 * Text tetap hitam agar terbaca pada preview/print/export.
 */
.dn-section-table tbody tr.dn-weekend-saturday > td {
  background: #fff6c7;

  color: #000000;

  -webkit-print-color-adjust: exact !important;

  print-color-adjust: exact !important;
}

/*
 * Minggu: blok baris merah muda.
 * Dipilih merah yang cukup terlihat tetapi tetap menjaga text hitam terbaca.
 */
.dn-section-table tbody tr.dn-weekend-sunday > td {
  background: #f8d2d2;

  color: #000000;

  -webkit-print-color-adjust: exact !important;

  print-color-adjust: exact !important;
}

/* ==========================================================
   DN MONITORING VALUE COLORS
   ========================================================== */

/*
 * GAP negatif.
 *
 * Hanya angka yang dibuat merah. Background mengikuti row asal
 * (termasuk warna Sabtu/Minggu) supaya blok diff tidak menimpa weekend.
 */
.dn-section-table tbody td.dn-gap-negative {
  color: #c00000 !important;

  font-weight: 700 !important;
}

/*
 * Tampilan dasar tetap sama seperti angka report biasa. Penanda kotak memakai
 * outline/box-shadow sehingga tidak mengubah tinggi row atau lebar kolom.
 */
.dn-gap-detail-trigger {
  appearance: none;

  margin: 0;

  padding: 0;

  border: 0;

  background: transparent;

  color: inherit;

  font: inherit;

  font-weight: inherit;

  line-height: inherit;

  cursor: pointer;
}

@media (hover: hover) {
  .dn-gap-detail-trigger:hover {
    border-radius: 2px;

    outline: 1px solid rgba(220, 38, 38, 0.75);

    outline-offset: 1px;

    box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.1);
  }
}

.dn-gap-detail-trigger--active,
.dn-gap-detail-trigger:active,
.dn-gap-detail-trigger:focus-visible {
  border-radius: 2px;

  outline-offset: 2px;

  outline: 1px solid #dc2626;

  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.18);
}

/*
 * ACV yang mempunyai transaksi.
 *
 * Hijau terang seperti Excel.
 */
.dn-section-table tbody td.dn-acv-active {
  background: #b7ff2a !important;

  color: #000000 !important;

  font-weight: 700 !important;

  -webkit-print-color-adjust: exact !important;

  print-color-adjust: exact !important;
}

.dn-section-table tfoot td {
  height: 4.6mm;

  background: #dedede;

  font-weight: 700;

  font-size: 6pt;

  vertical-align: middle;
}

.dn-section-table .col-no {
  width: 11%;
}

.dn-section-table .col-date {
  width: 31%;
}

.dn-section-table th:nth-child(3),
.dn-section-table th:nth-child(4) {
  width: 13%;
}

.dn-section-table th:nth-child(5) {
  width: 16%;
}

.dn-section-table th:nth-child(6) {
  width: 16%;
}

.total-label {
  text-align: left !important;

  padding-left: 1mm !important;
}

/* ==========================================================
   GRAND TOTAL
   ========================================================== */

.dn-grand-total {
  flex: 0 0 7.5mm;

  height: 7.5mm;

  margin-top: 1.2mm;

  display: grid;

  grid-template-columns:
    1fr
    17mm
    17mm
    17mm
    20mm;

  align-items: stretch;

  background: #8ac400;

  font-size: 7pt;

  font-weight: 700;
}

.grand-title {
  display: flex;

  align-items: center;

  padding-left: 1.5mm;

  font-size: 7pt;

  font-weight: 700;
}

.grand-metric {
  display: grid;

  grid-template-rows:
    45%
    55%;

  align-items: center;

  justify-items: center;

  background: rgba(255, 255, 255, 0.08);

  font-size: 6pt;
}

.grand-metric strong {
  font-size: 7.5pt;

  line-height: 1;
}

.grand-metric.acv strong {
  font-size: 12pt;

  font-weight: 900;
}

/* ==========================================================
   FOOTER
   ========================================================== */

.dn-report-footer {
  flex: 0 0 3.5mm;

  height: 3.5mm;

  display: flex;

  align-items: center;

  justify-content: center;

  background: #999999;

  color: #ffffff;

  font-size: 6pt;

  font-weight: 600;
}

.grand-gap {
  background: #ffc7ce;

  color: #c00000;
}

.grand-gap strong {
  color: #c00000;

  font-weight: 900;
}

/* ==========================================================
   SCREEN WATERMARK
   ========================================================== */

.dn-page-watermark {
  position: absolute;

  top: 50%;

  left: 50%;

  transform: translate(-50%, -50%);

  pointer-events: none;

  user-select: none;

  font-size: 58pt;

  font-weight: 500;

  color: rgba(90, 90, 90, 0.5);
}

/* ==========================================================
   PRINT / PDF
   ========================================================== */

/*
 * Tidak ada @media print global di component ini.
 *
 * Tombol Print / PDF memakai printDnMonitoringReport()
 * yang membuat iframe print terpisah dan memasukkan:
 *
 * - @page
 * - html / body print sizing
 * - #dn-monitoring-print-root
 * - .dn-report-page
 *
 * ke dokumen iframe tersebut.
 *
 * Dengan begitu CSS halaman Upload SO tetap scoped dan tidak
 * bocor ke page/module lain.
 */

</style>

<style>
/* Popup filter memakai Teleport ke body; khusus halaman SO tombol Sort tanpa border. */
body.so-upload-page > div.fixed.z-\[99999\]
  .grid.grid-cols-3.gap-2
  > button[aria-pressed] {
  border-width: 0 !important;
  border-color: transparent !important;
  box-shadow: none !important;
}
</style>
