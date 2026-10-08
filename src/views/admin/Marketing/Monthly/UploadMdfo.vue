<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import MdfoFilterPopup from '@/components/shared/MdfoFilterPopup.vue';
import QuotationFilterPopup from '@/components/shared/QuotationFilterPopup.vue';
import QuotationTrackingFilterPopup from '@/components/shared/QuotationTrackingFilterPopup.vue';

import { useMdfoStore } from '@/stores/Marketing/UploadMdfo';
import { useQuotationStore } from '@/stores/Marketing/QuotationStore';
import { useQuotationTrackingStore } from '@/stores/Marketing/QuotationTrackingStore';

// Stores
const mdfoStore = useMdfoStore();
const quotationStore = useQuotationStore();
const quotationTrackingStore = useQuotationTrackingStore();

// Lazy load dokumen/tracking hanya ketika section mendekati viewport.
const quotationSectionRef = ref<HTMLElement | null>(null);
const trackingSectionRef = ref<HTMLElement | null>(null);
let mdfoSectionObserver: IntersectionObserver | null = null;

// Scroll container modal upload dan anchor Upload By.
// Saat dropdown Upload By dibuka, modal digeser otomatis agar daftar user langsung terlihat.
const mdfoUploadFormScrollRef = ref<HTMLFormElement | null>(null);
const mdfoUploadBySectionRef = ref<HTMLDivElement | null>(null);

// ============================================================
// UPLOAD MDFO PREVIEW GUIDANCE - FILE BASED CUSTOMER
// Samakan UX dengan Upload SO:
// 1. Setelah seluruh file valid + revision siap, Preview dibuka otomatis 1x.
// 2. Setelah user sudah melihat Preview, modal tidak dibuka otomatis lagi
//    untuk kombinasi file yang sama.
// 3. Hanya ada SATU tombol eye, yaitu eye utama di samping Browse.
//    Helper di bawah file hanya memberi status dan tidak memiliki eye kedua.
// 4. Flow manual FTI dan MES tidak ikut watcher ini karena bukan upload file.
// ============================================================
const hasReviewedCurrentMdfoPreview = ref(false);
const lastAutoMdfoPreviewSourceKey = ref('');
const isAutoOpeningMdfoPreview = ref(false);

const getMdfoFileSignature = (file: File): string =>
  `${file.name}:${file.size}:${file.lastModified}`;

const currentMdfoPreviewSourceKey = computed(() => {
  if (
    !mdfoStore.showUploadModal ||
    mdfoStore.isFtiManualMode ||
    mdfoStore.isMesManualMode ||
    mdfoStore.selectedFiles.length === 0
  ) {
    return '';
  }

  const fileSignature = mdfoStore.selectedFiles
    .map((file) => getMdfoFileSignature(file))
    .sort((left, right) => left.localeCompare(right))
    .join('|');

  if (!fileSignature) return '';

  return `${mdfoStore.selectedCustomerUpload}::${fileSignature}`;
});

const mdfoPreviewGuidanceTitle = computed(() => {
  if (isAutoOpeningMdfoPreview.value) return 'Preview sedang dibuka otomatis';
  if (hasReviewedCurrentMdfoPreview.value) return 'Preview sudah diperiksa';
  if (mdfoStore.canOpenUploadPreview && mdfoStore.allCheckedFilesValid) {
    return 'Periksa Preview sebelum Submit';
  }
  return 'Menyiapkan Preview';
});

const mdfoPreviewGuidanceMessage = computed(() => {
  if (isAutoOpeningMdfoPreview.value) {
    return 'File dan Revision sudah siap. Sistem membuka Preview satu kali agar hasil parsing dapat diperiksa sebelum Submit.';
  }

  if (hasReviewedCurrentMdfoPreview.value) {
    return 'Preview dapat dibuka kembali melalui satu ikon eye di samping Browse.';
  }

  if (mdfoStore.canOpenUploadPreview && mdfoStore.allCheckedFilesValid) {
    return 'Preview akan terbuka otomatis setelah validasi file dan Revision selesai. Jika diperlukan, gunakan ikon eye di samping Browse.';
  }

  return 'Sistem sedang memeriksa file dan menyiapkan data Preview.';
});

watch(
  currentMdfoPreviewSourceKey,
  (newKey, oldKey) => {
    if (newKey === oldKey) return;
    hasReviewedCurrentMdfoPreview.value = false;
    lastAutoMdfoPreviewSourceKey.value = '';
  },
  { immediate: true }
);

watch(
  () => mdfoStore.showMdfoUploadPreview,
  (isVisible) => {
    if (isVisible && currentMdfoPreviewSourceKey.value) {
      hasReviewedCurrentMdfoPreview.value = true;
    }
  }
);

watch(
  [
    () => mdfoStore.canOpenUploadPreview,
    () => mdfoStore.allCheckedFilesValid,
    () => mdfoStore.isUploadRevisionReady,
    currentMdfoPreviewSourceKey,
    () => mdfoStore.showUploadModal
  ],
  async ([canOpen, allValid, revisionReady, sourceKey, modalOpen]) => {
    if (
      !modalOpen ||
      !canOpen ||
      !allValid ||
      !revisionReady ||
      !sourceKey ||
      hasReviewedCurrentMdfoPreview.value ||
      isAutoOpeningMdfoPreview.value ||
      lastAutoMdfoPreviewSourceKey.value === sourceKey
    ) {
      return;
    }

    lastAutoMdfoPreviewSourceKey.value = sourceKey;
    isAutoOpeningMdfoPreview.value = true;

    try {
      await nextTick();

      // Beri waktu singkat agar status file/revision terlihat sebelum modal
      // Preview mengambil fokus, sama seperti UX Upload SO.
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 260);
      });

      if (
        !mdfoStore.showUploadModal ||
        !mdfoStore.canOpenUploadPreview ||
        !mdfoStore.allCheckedFilesValid ||
        !mdfoStore.isUploadRevisionReady ||
        currentMdfoPreviewSourceKey.value !== sourceKey
      ) {
        return;
      }

      await mdfoStore.openUploadPreview();
    } finally {
      isAutoOpeningMdfoPreview.value = false;
    }
  }
);

// Reactive state exposed by UploadMdfo store
const {
  permissions,
  page,
  breadcrumbs,
  uploadFileInput,
  addPartPeriodInputValue,
  quotationOrderQuantityIndex,
  quotationRightFooterColspan,

  mdfoTrackingBulkMode,
  mdfoTrackingBulkDate,
  mdfoTrackingBulkTime,
  mdfoTrackingBulkUser,
  mdfoTrackingBulkStatus,
  mdfoTrackingBulkRemarks,
  mdfoTrackingBulkUserDropdownOpen,
  mdfoTrackingBulkStatusDropdownOpen,
  mdfoTrackingVisibleUserOptions,
  mdfoTrackingBulkStatusMeta,
  mdfoTrackingBulkIsApplying,
  mdfoTrackingBulkProgressDone,
  mdfoTrackingBulkProgressTotal,
  mdfoTrackingBulkMessage,
  mdfoTrackingBulkMessageType,
  mdfoTrackingBulkSelectedCount,
  mdfoTrackingBulkHasChanges,
  isMdfoTrackingBulkCurrentPageSelected
} = storeToRefs(mdfoStore);

// Store actions used directly by the template
const {
  openMdfoFilePicker,
  onPeriodFilterChange,
  onAddPartPeriodInputChange,
  getZsttHeaderBackground,
  getZsttBodyBackground,
  regenerateQuotation,

  toggleMdfoTrackingBulkMode,
  isMdfoTrackingBulkRowSelected,
  toggleMdfoTrackingBulkRow,
  selectMdfoTrackingBulkCurrentPage,
  toggleMdfoTrackingBulkCurrentPageSelection,
  selectMdfoTrackingBulkFilteredRows,
  clearMdfoTrackingBulkSelection,
  requestTrackingLifecycleDelete,
  setMdfoTrackingBulkToday,
  setMdfoTrackingBulkNow,
  toggleMdfoTrackingBulkUserValueDropdown,
  toggleMdfoTrackingBulkStatusValueDropdown,
  selectMdfoTrackingBulkUserValue,
  selectMdfoTrackingBulkStatusValue,
  applyMdfoTrackingBulkUpdate
} = mdfoStore;

const onNtcRowsPerPageChange = (event: Event): void => {
  const input = event.target as HTMLSelectElement;
  mdfoStore.setNtcRowsPerPage(input.value);
};

const onGayaRowsPerPageChange = (event: Event): void => {
  const input = event.target as HTMLSelectElement;
  mdfoStore.setGayaRowsPerPage(input.value);
};

const toggleMdfoUploadUserDropdownAndScroll = async (): Promise<void> => {
  if (!mdfoStore.canSelectUploadUser) {
    return;
  }

  const willOpen = !mdfoStore.showMdfoUploadUserDropdown;

  mdfoStore.toggleMdfoUploadUserDropdown();

  if (!willOpen) {
    return;
  }

  await nextTick();

  window.requestAnimationFrame(() => {
    const scrollContainer = mdfoUploadFormScrollRef.value;
    const uploadBySection = mdfoUploadBySectionRef.value;

    if (!scrollContainer || !uploadBySection) {
      return;
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    const sectionRect = uploadBySection.getBoundingClientRect();

    // Samakan dengan Upload SO: tempatkan Upload By tepat di bawah sticky header
    // agar dropdown user langsung terlihat tanpa scroll manual.
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

// Delete dropdowns memakai native <details>. Ref ini dipakai untuk memastikan
// hanya satu popup/dropdown yang boleh terbuka pada satu waktu.
const rawDeleteDetailsRef = ref<HTMLDetailsElement | null>(null);
const quotationDeleteDetailsRef = ref<HTMLDetailsElement | null>(null);
const trackingDeleteDetailsRef = ref<HTMLDetailsElement | null>(null);

const getDeleteDetailsElements = (): Array<HTMLDetailsElement> => {
  return [
    rawDeleteDetailsRef.value,
    quotationDeleteDetailsRef.value,
    trackingDeleteDetailsRef.value
  ].filter((element): element is HTMLDetailsElement => Boolean(element));
};

const closeDeleteDropdowns = (except: HTMLDetailsElement | null = null): void => {
  getDeleteDetailsElements().forEach((element) => {
    if (element !== except) {
      element.open = false;
    }
  });
};

const closeOtherPagePopupsForDelete = (): void => {
  // Header/customer/period/revision + filter MDFO.
  mdfoStore.closeMdfoPageDropdowns();

  // Filter / dropdown Quotation, Contract, ZSTT dan Add Part.
  quotationStore.closeAllDropdowns();

  // Filter/dropdown Tracking.
  quotationTrackingStore.closeAllPopups();
};

const handleDeleteDropdownToggle = (event: Event): void => {
  const current = event.currentTarget as HTMLDetailsElement | null;

  if (!current || !current.open) {
    return;
  }

  // Saat Delete dibuka: tutup Delete lain dan seluruh popup/dropdown halaman.
  closeDeleteDropdowns(current);
  closeOtherPagePopupsForDelete();
};

const requestRawLifecycleDelete = async (mode: 'SELECTED' | 'FILTERED'): Promise<void> => {
  // Hilangkan dropdown Delete sebelum request preview dimulai supaya panel
  // tidak tertinggal di atas/belakang sticky header Raw MDFO.
  closeDeleteDropdowns();
  closeOtherPagePopupsForDelete();
  await mdfoStore.requestRawLifecycleDelete(mode);
};

const handleDocumentPointerDown = (event: PointerEvent): void => {
  const target = event.target as Node | null;

  if (!target) {
    return;
  }

  const clickedInsideDelete = getDeleteDetailsElements().some((element) =>
    element.contains(target)
  );

  // Klik popup/filter/button lain otomatis menutup Delete terlebih dahulu.
  if (!clickedInsideDelete) {
    closeDeleteDropdowns();
  }
};

// ============================================================
// RAW MDFO SCOPE GUIDANCE
// Customer -> Period -> Revision dibuat sebagai satu rangkaian scope.
// Tidak mengubah parser / mapping customer. Total hanya diaktifkan ketika
// Customer + Period + Revision sudah spesifik agar tidak menjumlahkan versi
// revision atau forecast antarperiode yang bukan nilai additive.
// ============================================================
const hasSpecificRawCustomerScope = computed(() =>
  mdfoStore.selectedDownloadCustomers.length === 1
);

const hasSpecificRawPeriod = computed(() =>
  String(mdfoStore.selectedPeriodFilter ?? '').trim() !== ''
);

const hasSpecificRawRevision = computed(() =>
  String(mdfoStore.selectedRevisionFilter ?? '').trim() !== ''
);

const isSpecificRawScope = computed(() =>
  hasSpecificRawCustomerScope.value &&
  hasSpecificRawPeriod.value &&
  hasSpecificRawRevision.value
);

const showRawTotals = computed(() => isSpecificRawScope.value);


const rawScopeCustomerLabel = computed(() =>
  mdfoStore.rawDisplayCustomerLabel || 'Raw Customer'
);

const rawTotalLabel = computed(() => {
  if (!showRawTotals.value) {
    return 'TOTAL BELUM AKTIF';
  }

  return mdfoStore.hasActiveRawColumnFilter
    ? 'TOTAL FILTERED'
    : 'TOTAL';
});

const rawTotalScopeTitle = computed(() => {
  if (!showRawTotals.value) {
    return 'Total akan tampil setelah Customer, Period, dan Revision dipilih.';
  }

  const scope = `Scope total: ${rawScopeCustomerLabel.value} · ${mdfoStore.selectedPeriodLabel} · ${mdfoStore.selectedRevisionLabel}`;
  return mdfoStore.hasActiveRawColumnFilter
    ? `${scope} · mengikuti filter kolom aktif`
    : scope;
});

// View lifecycle delegates to store + sinkronisasi popup halaman.
onMounted(() => {
  void mdfoStore.initializeUploadMdfoView();

  if (typeof IntersectionObserver !== 'undefined') {
    mdfoSectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          if (entry.target === quotationSectionRef.value) {
            void mdfoStore.activateQuotationSection();
            mdfoSectionObserver?.unobserve(entry.target);
          }

          if (entry.target === trackingSectionRef.value) {
            void mdfoStore.activateTrackingSection();
            mdfoSectionObserver?.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '300px 0px', threshold: 0.01 }
    );

    if (quotationSectionRef.value) mdfoSectionObserver.observe(quotationSectionRef.value);
    if (trackingSectionRef.value) mdfoSectionObserver.observe(trackingSectionRef.value);
  } else {
    // Fallback browser lama: tetap load ketika view mount.
    void mdfoStore.activateQuotationSection();
    void mdfoStore.activateTrackingSection();
  }

  document.addEventListener('pointerdown', handleDocumentPointerDown, true);
});

onBeforeUnmount(() => {
  mdfoSectionObserver?.disconnect();
  mdfoSectionObserver = null;
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
  closeDeleteDropdowns();
  mdfoStore.cleanupUploadMdfoView();
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-5" />

  <div class="p-4 space-y-6 bg-gray-50 min-h-screen">
    
    <!-- Header Action -->
    
    <div class="relative z-[300] flex flex-wrap items-center gap-3">
      <!-- Select File -->
      <button
        type="button"
        :disabled="!permissions.create"
        :title="permissions.create ? 'Select File' : 'Tidak memiliki permission Create Upload MDFO'"
        @click="mdfoStore.openUploadModal"
        class="h-10 min-w-[110px] rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_3px_6px_rgba(37,99,235,0.35)] transition-all duration-200 hover:bg-blue-700 hover:shadow-[0_5px_6px_rgba(37,99,235,0.45)] active:scale-95 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
      >
        Select File
      </button>

      <!-- Customer Filter / Download Scope -->
      <div class="relative">
        <button
          type="button"
          @click="mdfoStore.toggleTableCustomerDropdown"
          class="flex h-12 min-w-[220px] items-center justify-between gap-4 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_4px_8px_rgba(37,99,235,0.35)] transition-all duration-200 hover:bg-blue-700 hover:shadow-[0_6px_12px_rgba(37,99,235,0.42)] active:scale-95"
        >
          <span class="flex min-w-0 items-center gap-3">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-black ring-1 ring-white/30"
            >
              {{ mdfoStore.selectedDownloadCustomers.length > 0 ? '✓' : '1' }}
            </span>

            <span class="flex min-w-0 flex-col items-start leading-tight">
              <span class="text-[9px] font-bold uppercase tracking-[0.14em] text-blue-100">Customer</span>
              <span class="max-w-[140px] truncate">{{ mdfoStore.downloadCustomerButtonLabel }}</span>
            </span>
          </span>

          <svg
            class="h-4 w-4 shrink-0 transition-transform duration-200"
            :class="mdfoStore.showTableCustomerDropdown ? 'rotate-180' : ''"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
              clip-rule="evenodd"
            />
          </svg>
        </button>

        <div
          v-if="mdfoStore.showTableCustomerDropdown"
          class="absolute left-0 top-[56px] z-[1000] w-[330px] overflow-hidden rounded-2xl !border !border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
        >
          <div class="!border-b !border-slate-200 px-3 py-2.5">
            <label class="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50">
              <input
                type="checkbox"
                :checked="mdfoStore.isAllDownloadCustomersDraftSelected"
                class="h-4 w-4 shrink-0 cursor-pointer rounded !border !border-slate-400 text-blue-600 focus:ring-blue-500"
                @change="mdfoStore.toggleAllDownloadCustomersDraft"
              />
              <span>All Customers</span>
            </label>

            <p class="px-2 pt-1 text-[11px] leading-4 text-slate-400">
              ADM P4 dan DCWA difilter terpisah. ASI ADM mendukung Raw MDFO, Quotation/Contract/ZSTT, serta Add Part. Khusus download Raw MDFO Plant 4, memilih ADM P4 atau DCWA tetap mengambil SAP + DCWA.
            </p>
          </div>

          <div class="max-h-[240px] overflow-y-auto p-2">
            <label
              v-for="option in mdfoStore.downloadCustomerOptions"
              :key="option.value"
              class="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-blue-50"
            >
              <input
                type="checkbox"
                :checked="mdfoStore.isDownloadCustomerDraftSelected(option.value)"
                class="h-4 w-4 shrink-0 cursor-pointer rounded !border !border-slate-400 text-blue-600 focus:ring-blue-500"
                @change="mdfoStore.toggleDownloadCustomerDraft(option.value)"
              />

              <span class="min-w-0 flex-1 truncate">
                {{ option.label }}
              </span>

              <span
                v-if="mdfoStore.selectedCustomerFilter && mdfoStore.selectedCustomerFilter === option.value"
                class="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600"
              >
                Table
              </span>
            </label>

            <div
              v-if="mdfoStore.downloadCustomerOptions.length === 0"
              class="px-3 py-4 text-center text-sm text-slate-400"
            >
              Customer tidak ditemukan
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 !border-t !border-slate-200 bg-slate-50 px-3 py-2.5">
            <span class="text-xs text-slate-500">
              {{ mdfoStore.draftDownloadCustomers.length }} selected
            </span>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-xl !border !border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                @click.stop="mdfoStore.clearDownloadCustomerDraft"
              >
                Clear
              </button>

              <button
                type="button"
                class="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                @click.stop="mdfoStore.applyDownloadCustomerSelection"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Period Filter -->
      <div class="relative">
        <button
          type="button"
          @click="mdfoStore.toggleTablePeriodDropdown"
          class="flex h-12 min-w-[245px] items-center justify-between gap-3 rounded-xl !border px-4 text-sm font-semibold transition-all duration-200 active:scale-95"
          :class="
            hasSpecificRawPeriod
              ? '!border-blue-600 bg-blue-600 text-white shadow-[0_4px_8px_rgba(37,99,235,0.35)] hover:bg-blue-700 hover:shadow-[0_6px_12px_rgba(37,99,235,0.42)]'
              : '!border-amber-300 bg-amber-50 text-amber-800 shadow-[0_4px_10px_rgba(245,158,11,0.16)] hover:bg-amber-100'
          "
        >
          <span class="flex min-w-0 items-center gap-3">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ring-1"
              :class="hasSpecificRawPeriod ? 'bg-white/20 text-white ring-white/30' : 'bg-amber-200/70 text-amber-900 ring-amber-300'"
            >
              {{ hasSpecificRawPeriod ? '✓' : '2' }}
            </span>

            <span class="flex min-w-0 flex-col items-start leading-tight">
              <span
                class="text-[9px] font-bold uppercase tracking-[0.14em]"
                :class="hasSpecificRawPeriod ? 'text-blue-100' : 'text-amber-600'"
              >
                Period
              </span>
              <span class="max-w-[155px] truncate">{{ mdfoStore.selectedPeriodLabel }}</span>
            </span>
          </span>

          <svg
            class="h-4 w-4 shrink-0 transition-transform duration-200"
            :class="mdfoStore.showTablePeriodDropdown ? 'rotate-180' : ''"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
              clip-rule="evenodd"
            />
          </svg>
        </button>

        <div
          v-if="mdfoStore.showTablePeriodDropdown"
          class="absolute right-0 top-[56px] z-[1000] w-[280px] rounded-2xl !border !border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
        >
          <label class="mb-2 block text-sm font-semibold text-slate-700"> Select month and year </label>

          <input
            type="month"
            :value="mdfoStore.periodInputValue"
            class="h-11 w-full rounded-xl !border !border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            @change="onPeriodFilterChange"
          />

          <div v-if="mdfoStore.latestYearPeriodOptions.length" class="mt-4">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Available periods</div>

            <div class="max-h-[190px] overflow-y-auto">
              <button
                v-for="periode in mdfoStore.latestYearPeriodOptions"
                :key="periode"
                type="button"
                @click="mdfoStore.selectTablePeriod(periode)"
                class="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition-all"
                :class="
                  mdfoStore.selectedPeriodFilter === periode
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                "
              >
                {{ mdfoStore.formatPeriodLabel(periode) }}
              </button>
            </div>
          </div>

          <button
            v-if="mdfoStore.selectedPeriodFilter"
            type="button"
            @click="mdfoStore.selectTablePeriod('')"
            class="mt-3 h-10 w-full rounded-xl !border !border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600 transition-all hover:border-red-200! hover:bg-red-50 hover:text-red-600"
          >
            Clear Date Filter
          </button>
        </div>
      </div>

      <!-- Revision Filter -->
      <div class="relative">
        <button
          type="button"
          @click="mdfoStore.toggleTableRevisionDropdown"
          class="flex h-12 min-w-[220px] items-center justify-between gap-3 rounded-xl !border px-4 text-sm font-semibold transition-all duration-200 active:scale-95"
          :class="
            hasSpecificRawRevision
              ? '!border-blue-600 bg-blue-600 text-white shadow-[0_4px_8px_rgba(37,99,235,0.35)] hover:bg-blue-700 hover:shadow-[0_6px_12px_rgba(37,99,235,0.42)]'
              : '!border-amber-300 bg-amber-50 text-amber-800 shadow-[0_4px_10px_rgba(245,158,11,0.16)] hover:bg-amber-100'
          "
        >
          <span class="flex min-w-0 items-center gap-3">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ring-1"
              :class="hasSpecificRawRevision ? 'bg-white/20 text-white ring-white/30' : 'bg-amber-200/70 text-amber-900 ring-amber-300'"
            >
              {{ hasSpecificRawRevision ? '✓' : '3' }}
            </span>

            <span class="flex min-w-0 flex-col items-start leading-tight">
              <span
                class="text-[9px] font-bold uppercase tracking-[0.14em]"
                :class="hasSpecificRawRevision ? 'text-blue-100' : 'text-amber-600'"
              >
                Revision
              </span>
              <span class="max-w-[135px] truncate">{{ mdfoStore.selectedRevisionLabel }}</span>
            </span>
          </span>

          <svg
            class="h-4 w-4 shrink-0 transition-transform duration-200"
            :class="mdfoStore.showTableRevisionDropdown ? 'rotate-180' : ''"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="
                M5.23 7.21
                a.75.75 0 0 1 1.06.02
                L10 11.17
                l3.71-3.94
                a.75.75 0 1 1 1.08 1.04
                l-4.25 4.5
                a.75.75 0 0 1-1.08 0
                l-4.25-4.5
                a.75.75 0 0 1 .02-1.06Z
              "
              clip-rule="evenodd"
            />
          </svg>
        </button>

        <!-- Revision Dropdown -->
        <div
          v-if="mdfoStore.showTableRevisionDropdown"
          class="absolute right-0 top-[56px] z-[1000] w-[260px] rounded-2xl !border !border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
        >
          <div class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Available revisions</div>

          <div class="max-h-[220px] overflow-y-auto">
            <!-- All Revisions -->
            <button
              type="button"
              @click="mdfoStore.selectTableRevision('')"
              class="mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all"
              :class="
                mdfoStore.selectedRevisionFilter === '' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
              "
            >
              <span>All Revisions</span>

              <span v-if="mdfoStore.selectedRevisionFilter === ''" class="text-xs"> ✓ </span>
            </button>

            <!-- Available Revisions -->
            <button
              v-for="revision in mdfoStore.revisionFilterOptions"
              :key="revision"
              type="button"
              @click="mdfoStore.selectTableRevision(revision)"
              class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all"
              :class="
                mdfoStore.selectedRevisionFilter === revision
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
              "
            >
              <span> Revision {{ revision }} </span>

              <span v-if="mdfoStore.selectedRevisionFilter === revision" class="text-xs"> ✓ </span>
            </button>

            <div v-if="mdfoStore.revisionFilterOptions.length === 0" class="px-3 py-5 text-center text-sm text-slate-400">
              Revision tidak ditemukan
            </div>
          </div>

          <button
            v-if="mdfoStore.selectedRevisionFilter !== ''"
            type="button"
            @click="mdfoStore.selectTableRevision('')"
            class="mt-3 h-10 w-full rounded-xl !border !border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600 transition-all hover:border-red-200! hover:bg-red-50 hover:text-red-600"
          >
            Clear Revision Filter
          </button>
        </div>
      </div>

      <button
        v-if="mdfoStore.canOpenMesZsttEditor"
        type="button"
        :disabled="(!permissions.create && !permissions.update) || mdfoStore.isLoadingMesZsttDraft || mdfoStore.isSubmittingMesZstt"
        class="inline-flex h-10 items-center gap-2 rounded-xl !border !border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 shadow-sm transition hover:!border-indigo-300 hover:bg-indigo-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        @click="mdfoStore.openMesZsttEditor"
      >
        <span class="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 text-xs">✎</span>
        {{ mdfoStore.isLoadingMesZsttDraft ? 'Loading ZSTT...' : 'Edit ZSTT MES' }}
      </button>
    </div>

    <!-- Upload Modal -->
    <Teleport to="body">
      <div
        v-if="mdfoStore.showUploadModal"
        class="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/45 p-2 sm:p-4 lg:items-center lg:p-6"
        @click.self="mdfoStore.closeUploadModal"
      >
        <div
          class="relative z-[10000] my-2 w-full max-h-[calc(100dvh-1rem)] overflow-hidden rounded-[20px] bg-white shadow-2xl ring-1 ring-slate-200/70 sm:my-0 sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px] lg:max-h-[calc(100dvh-3rem)]"
          :class="(mdfoStore.isFtiManualMode || mdfoStore.isMesManualMode) ? 'max-w-[1480px]' : 'max-w-[620px]'"
        >
          <form
            ref="mdfoUploadFormScrollRef"
            class="max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain sm:max-h-[calc(100dvh-2rem)] lg:max-h-[calc(100dvh-3rem)]"
            style="scrollbar-gutter: stable;"
            @submit.prevent="mdfoStore.submitUpload"
          >
            <!-- Header Modal -->
            <div class="sticky top-0 z-[30] flex items-center justify-between !border-b !border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4 rounded-t-[20px] sm:rounded-t-[28px]">
              <div>
                <h3 class="text-xl font-bold text-slate-900 sm:text-2xl">UPLOAD MDFO FORM</h3>

              <p class="mt-1 text-xs text-slate-500">Select customer, source file, and upload user</p>
            </div>

            <!-- Close -->
            <button
              type="button"
              title="Close"
              aria-label="Close upload MDFO form"
              class="flex h-9 w-9 items-center justify-center rounded-xl !border !border-solid !border-slate-300 bg-white text-lg font-bold text-slate-500 shadow-sm transition-all duration-200 hover:!border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-95"
              style="border: 1px solid #cbd5e1 !important;"
              @click="mdfoStore.closeUploadModal"
            >
              <svg
                class="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          
          <!-- Body -->
          
            <div
              class="relative overflow-visible px-4 py-4 sm:px-6"
              :class="['DPM', 'FTI', 'MES'].includes(mdfoStore.selectedCustomerUpload) ? 'sm:py-4' : 'sm:py-5'"
            >
            <div
              class="grid grid-cols-1 gap-4 overflow-visible sm:grid-cols-2"
            >
              
              <!-- Customer -->
              
              <div
                class="flex flex-col gap-2"
              >
                <label class="text-sm font-semibold text-slate-700"> Customer </label>

                <div class="relative">
                  <button
                    type="button"
                    class="group flex h-[48px] w-full items-center justify-between rounded-2xl !border !border-solid !border-slate-300 bg-white px-4 text-left text-sm shadow-[0_2px_8px_rgba(15,23,42,0.04)] outline-none transition-all duration-200 hover:!border-blue-400 hover:shadow-[0_5px_16px_rgba(37,99,235,0.10)] focus:!border-blue-500 focus:ring-2 focus:ring-blue-100"
                    @click.stop="mdfoStore.toggleMdfoCustomerDropdown"
                  >
                    <span
                      class="truncate transition-colors duration-200"
                      :class="mdfoStore.selectedCustomerUpload ? 'font-medium text-slate-700' : 'text-slate-400'"
                    >
                      {{ mdfoStore.selectedCustomerUpload || 'Select Customer' }}
                    </span>

                    <!-- Chevron -->
                    <svg
                      class="h-5 w-5 shrink-0 text-slate-400 transition-all duration-200 group-hover:text-blue-600"
                      :class="mdfoStore.showMdfoCustomerDropdown ? 'rotate-180' : ''"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1
                       1.06.02L10 11.17l3.71-3.94a.75.75
                       0 1 1 1.08 1.04l-4.25 4.5a.75.75
                       0 0 1-1.08 0l-4.25-4.5a.75.75
                       0 0 1 .02-1.06Z"
                      />
                    </svg>
                  </button>

                  <!-- Customer Dropdown -->
                  <div
                    v-if="mdfoStore.showMdfoCustomerDropdown"
                    class="absolute left-0 right-0 top-[54px] z-[10080] max-h-[260px] overflow-y-auto rounded-2xl !border !border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-1 ring-slate-100"
                    @click.stop
                  >
                    <button
                      type="button"
                      class="mb-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-slate-400 transition-all duration-150 hover:bg-slate-50"
                      @click="mdfoStore.selectMdfoCustomer('')"
                    >
                      Select Customer
                    </button>

                    <button
                      v-for="customer in mdfoStore.customerUploadOptions"
                      :key="customer"
                      type="button"
                      class="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-150"
                      :class="
                        mdfoStore.selectedCustomerUpload === customer
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                      "
                      @click="mdfoStore.selectMdfoCustomer(customer)"
                    >
                      {{ customer }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Revision selalu terdeteksi otomatis dan tidak dapat diedit user. -->
              <div class="flex flex-col gap-2">
                <label for="detectedUploadRevision" class="text-sm font-semibold text-slate-700">
                  Revision
                </label>

                <div class="relative">
                  <input
                    id="detectedUploadRevision"
                    :value="
                      mdfoStore.isDetectingUploadRevision
                        ? 'Mendeteksi...'
                        : mdfoStore.uploadRevision !== ''
                          ? `Revision ${mdfoStore.uploadRevision}`
                          : ''
                    "
                    type="text"
                    readonly
                    tabindex="-1"
                    :placeholder="(mdfoStore.isFtiManualMode || mdfoStore.isMesManualMode) ? 'Terdeteksi setelah bulan dipilih' : 'Terdeteksi setelah file dipilih'"
                    class="h-[48px] w-full cursor-not-allowed rounded-2xl !border !border-solid !border-slate-300 bg-slate-50 px-4 pr-10 text-sm font-semibold text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.03)] outline-none placeholder:font-normal placeholder:text-slate-400"
                  />

                  <svg
                    v-if="mdfoStore.isDetectingUploadRevision"
                    class="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-blue-500"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" />
                    <path class="opacity-80" fill="currentColor" d="M12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6V3Z" />
                  </svg>
                </div>

                <p
                  v-if="mdfoStore.uploadRevisionPlan?.periode"
                  class="px-1 text-[10px] leading-4"
                  :class="
                    mdfoStore.uploadRevisionPlan.can_upload
                      ? 'text-slate-500'
                      : 'font-semibold text-red-500'
                  "
                >
                  <template v-if="mdfoStore.uploadRevisionPlan.can_upload">
                    Periode {{ mdfoStore.uploadRevisionPlan.periode }} · revision ditentukan otomatis.
                  </template>
                  <template v-else>
                    {{ mdfoStore.uploadRevisionPlan.warning }}
                  </template>
                </p>
              </div>

              
              <!-- FTI MODE SWITCH -->
              <div
                v-if="mdfoStore.selectedCustomerUpload === 'FTI'"
                class="flex items-center justify-end sm:col-span-2"
              >
                <button
                  type="button"
                  class="inline-flex h-8 items-center gap-1.5 rounded-lg !border !border-blue-200 bg-blue-50 px-3 text-[11px] font-bold text-blue-700 transition hover:!border-blue-300 hover:bg-blue-100 active:scale-95"
                  :title="mdfoStore.isFtiManualMode ? 'Gunakan fitur OCR FTI lama' : 'Kembali ke input MDFO FTI manual'"
                  @click="mdfoStore.setFtiUploadMode(mdfoStore.isFtiManualMode ? 'ocr' : 'manual')"
                >
                  <svg
                    class="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3M7 12h10M12 7v10" />
                  </svg>
                  {{ mdfoStore.isFtiManualMode ? 'OCR' : 'Manual' }}
                </button>
              </div>

              <!-- FTI MANUAL MDFO -->
              <div
                v-if="mdfoStore.isFtiManualMode"
                class="sm:col-span-2 rounded-2xl !border !border-blue-100 bg-blue-50/30 p-3 sm:p-4"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div class="text-sm font-bold text-slate-800">FTI Manual MDFO</div>
                    <p class="mt-0.5 text-[11px] leading-4 text-slate-500">
                      Schedule wajib. N wajib. N+1 sampai N+3 boleh kosong; jika Forecast dipilih nilainya terisi otomatis dan readonly. Forecast kosong dapat ditambahkan kemudian lewat Edit Forecast.
                    </p>
                  </div>

                  <button
                    type="button"
                    :disabled="!mdfoStore.canOpenUploadPreview"
                    class="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    @click="mdfoStore.openUploadPreview"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Preview
                  </button>
                </div>

                <!-- Source Excel terlebih dahulu -->
                <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div class="rounded-xl !border !border-slate-200 bg-white p-3">
                    <div class="flex items-center justify-between gap-2">
                      <div>
                        <div class="text-xs font-bold text-slate-700">Excel Schedule <span class="text-red-500">*</span></div>
                        <div class="mt-0.5 text-[10px] text-slate-400">Acuan daily qty untuk ZSTT</div>
                      </div>
                      <button
                        v-if="mdfoStore.ftiManualScheduleFile"
                        type="button"
                        class="h-7 w-7 rounded-lg !border !border-red-200 bg-red-50 text-xs font-bold text-red-500 hover:bg-red-100"
                        @click="mdfoStore.clearFtiManualScheduleFile"
                      >
                        ×
                      </button>
                    </div>

                    <input
                      :key="`fti-schedule-${mdfoStore.ftiManualSourceInputKey}`"
                      id="ftiManualScheduleInput"
                      type="file"
                      accept=".xlsx,.xls"
                      class="hidden"
                      @change="mdfoStore.onFtiManualScheduleFileChange"
                    />
                    <label
                      for="ftiManualScheduleInput"
                      class="mt-2 flex h-10 cursor-pointer items-center justify-between gap-2 rounded-xl !border !border-slate-200 bg-slate-50 px-3 text-xs transition hover:!border-blue-300 hover:bg-blue-50"
                    >
                      <span class="truncate font-semibold" :class="mdfoStore.ftiManualScheduleFile ? 'text-slate-700' : 'text-slate-400'">
                        {{ mdfoStore.ftiManualScheduleFile?.name || 'Pilih Schedule Excel' }}
                      </span>
                      <span class="shrink-0 font-bold text-blue-600">Browse</span>
                    </label>
                  </div>

                  <div class="rounded-xl !border !border-slate-200 bg-white p-3">
                    <div class="flex items-center justify-between gap-2">
                      <div>
                        <div class="text-xs font-bold text-slate-700">Excel Forecast <span class="font-medium text-slate-400">(optional)</span></div>
                        <div class="mt-0.5 text-[10px] text-slate-400">Auto isi N+1, N+2, N+3</div>
                      </div>
                      <button
                        v-if="mdfoStore.ftiManualForecastFile"
                        type="button"
                        class="h-7 w-7 rounded-lg !border !border-red-200 bg-red-50 text-xs font-bold text-red-500 hover:bg-red-100"
                        @click="mdfoStore.clearFtiManualForecastFile"
                      >
                        ×
                      </button>
                    </div>

                    <input
                      :key="`fti-forecast-${mdfoStore.ftiManualSourceInputKey}`"
                      id="ftiManualForecastInput"
                      type="file"
                      accept=".xlsx,.xls"
                      class="hidden"
                      @change="mdfoStore.onFtiManualForecastFileChange"
                    />
                    <label
                      for="ftiManualForecastInput"
                      class="mt-2 flex h-10 cursor-pointer items-center justify-between gap-2 rounded-xl !border !border-slate-200 bg-slate-50 px-3 text-xs transition hover:!border-blue-300 hover:bg-blue-50"
                    >
                      <span class="truncate font-semibold" :class="mdfoStore.ftiManualForecastFile ? 'text-slate-700' : 'text-slate-400'">
                        {{ mdfoStore.ftiManualForecastFile?.name || 'Tanpa Forecast / pilih Excel' }}
                      </span>
                      <span class="shrink-0 font-bold text-blue-600">Browse</span>
                    </label>
                  </div>

                  <div class="rounded-xl !border !border-slate-200 bg-white p-3">
                    <label for="ftiManualPeriod" class="text-xs font-bold text-slate-700">
                      Bulan MDFO <span class="text-red-500">*</span>
                    </label>
                    <div class="mt-0.5 text-[10px] text-slate-400">Menentukan N dan revision FTI</div>
                    <input
                      id="ftiManualPeriod"
                      v-model="mdfoStore.ftiManualPeriod"
                      type="month"
                      class="mt-2 h-10 w-full rounded-xl !border !border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:!border-blue-400 focus:ring-2 focus:ring-blue-100"
                      @change="mdfoStore.setFtiManualPeriod(mdfoStore.ftiManualPeriod)"
                    />
                  </div>
                </div>

                <div class="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
                  <span
                    v-if="mdfoStore.isLoadingFtiManualSources"
                    class="rounded-full bg-blue-100 px-2.5 py-1 font-bold text-blue-700"
                  >
                    Membaca Schedule/Forecast...
                  </span>
                  <span
                    v-else-if="mdfoStore.ftiManualScheduleFile"
                    class="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 ring-1 ring-emerald-100"
                  >
                    Schedule siap
                  </span>
                  <span
                    v-if="mdfoStore.ftiManualForecastLocked"
                    class="rounded-full bg-violet-50 px-2.5 py-1 font-bold text-violet-700 ring-1 ring-violet-100"
                  >
                    N+1–N+3 dari Forecast (readonly)
                  </span>
                  <span
                    v-else
                    class="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 ring-1 ring-amber-100"
                  >
                    N+1–N+3 opsional; dapat diedit nanti
                  </span>
                </div>

                <!-- Manual row table -->
                <div class="mt-4 overflow-x-auto rounded-xl !border !border-slate-200 bg-white">
                  <table class="min-w-[1380px] w-full border-collapse text-xs">
                    <thead class="bg-slate-50 text-slate-600">
                      <tr>
                        <th class="w-[185px] !border-b !border-r !border-slate-200 px-2 py-2.5 text-left font-bold">Part No</th>
                        <th class="w-[245px] !border-b !border-r !border-slate-200 px-2 py-2.5 text-left font-bold">Part Name</th>
                        <th class="w-[105px] !border-b !border-r !border-slate-200 px-2 py-2.5 text-center font-bold">{{ mdfoStore.ftiManualMonthLabels[0] }}</th>
                        <th class="w-[105px] !border-b !border-r !border-slate-200 px-2 py-2.5 text-center font-bold">{{ mdfoStore.ftiManualMonthLabels[1] }}</th>
                        <th class="w-[105px] !border-b !border-r !border-slate-200 px-2 py-2.5 text-center font-bold">{{ mdfoStore.ftiManualMonthLabels[2] }}</th>
                        <th class="w-[105px] !border-b !border-r !border-slate-200 px-2 py-2.5 text-center font-bold">{{ mdfoStore.ftiManualMonthLabels[3] }}</th>
                        <th class="w-[145px] !border-b !border-r !border-slate-200 px-2 py-2.5 text-left font-bold">PO Number</th>
                        <th class="w-[135px] !border-b !border-r !border-slate-200 px-2 py-2.5 text-left font-bold">PO Date</th>
                        <th class="w-[145px] !border-b !border-r !border-slate-200 px-2 py-2.5 text-left font-bold">Delivery Date</th>
                        <th class="w-[64px] !border-b !border-slate-200 px-2 py-2.5 text-center font-bold">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="row in mdfoStore.ftiManualRows"
                        :key="row.id"
                        class="align-top"
                      >
                        <td class="!border-b !border-r !border-slate-100 p-2">
                          <input
                            v-model="row.partNo"
                            list="ftiManualPartOptionsList"
                            type="text"
                            placeholder="Pilih / ketik Part No"
                            class="h-9 w-full rounded-lg !border !border-slate-200 bg-white px-2.5 text-xs font-semibold uppercase text-slate-700 outline-none focus:!border-blue-400"
                            @change="mdfoStore.updateFtiManualPartNo(row.id, row.partNo)"
                          />
                          <span
                            v-if="row.required"
                            class="mt-1 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-600"
                          >
                            WAJIB
                          </span>
                        </td>
                        <td class="!border-b !border-r !border-slate-100 p-2">
                          <input
                            v-model="row.partName"
                            type="text"
                            :readonly="mdfoStore.isFtiManualPartNameReadonly(row.id)"
                            :placeholder="
                              mdfoStore.isFtiManualPartNameResolving(row.id)
                                ? 'Mencari Part Name...'
                                : mdfoStore.isFtiManualPartNameReadonly(row.id)
                                  ? 'Otomatis dari Part No'
                                  : 'Masukkan Part Name'
                            "
                            :class="
                              mdfoStore.isFtiManualPartNameReadonly(row.id)
                                ? 'cursor-not-allowed bg-slate-50 text-slate-600'
                                : 'bg-white text-slate-700 focus:!border-blue-400'
                            "
                            class="h-9 w-full rounded-lg !border !border-slate-200 px-2.5 text-xs uppercase outline-none"
                            @blur="mdfoStore.updateFtiManualPartName(row.id, row.partName)"
                          />
                          <span
                            v-if="mdfoStore.isFtiManualPartNameResolving(row.id)"
                            class="mt-1 inline-flex text-[9px] font-semibold text-blue-500"
                          >
                            Mencari nama part di histori order/MDFO...
                          </span>
                          <span
                            v-else-if="row.partNo && !mdfoStore.isFtiManualPartNameReadonly(row.id)"
                            class="mt-1 inline-flex text-[9px] font-semibold text-amber-600"
                          >
                            Part baru / nama belum ditemukan — isi manual
                          </span>
                        </td>
                        <td class="!border-b !border-r !border-slate-100 p-2">
                          <input v-model.number="row.n" type="number" min="0" step="1" class="h-9 w-full rounded-lg !border !border-slate-200 px-2 text-right text-xs outline-none focus:!border-blue-400" />
                        </td>
                        <td class="!border-b !border-r !border-slate-100 p-2">
                          <input v-model.number="row.n1" type="number" min="0" step="1" :readonly="mdfoStore.ftiManualForecastLocked" :class="mdfoStore.ftiManualForecastLocked ? 'cursor-not-allowed bg-slate-100 text-slate-500' : 'bg-white'" class="h-9 w-full rounded-lg !border !border-slate-200 px-2 text-right text-xs outline-none focus:!border-blue-400" />
                        </td>
                        <td class="!border-b !border-r !border-slate-100 p-2">
                          <input v-model.number="row.n2" type="number" min="0" step="1" :readonly="mdfoStore.ftiManualForecastLocked" :class="mdfoStore.ftiManualForecastLocked ? 'cursor-not-allowed bg-slate-100 text-slate-500' : 'bg-white'" class="h-9 w-full rounded-lg !border !border-slate-200 px-2 text-right text-xs outline-none focus:!border-blue-400" />
                        </td>
                        <td class="!border-b !border-r !border-slate-100 p-2">
                          <input v-model.number="row.n3" type="number" min="0" step="1" :readonly="mdfoStore.ftiManualForecastLocked" :class="mdfoStore.ftiManualForecastLocked ? 'cursor-not-allowed bg-slate-100 text-slate-500' : 'bg-white'" class="h-9 w-full rounded-lg !border !border-slate-200 px-2 text-right text-xs outline-none focus:!border-blue-400" />
                        </td>
                        <td class="!border-b !border-r !border-slate-100 p-2">
                          <input
                            :value="row.poNumber"
                            type="text"
                            inputmode="numeric"
                            pattern="[0-9]*"
                            maxlength="10"
                            placeholder="PO Number"
                            :class="
                              row.poNumber && !mdfoStore.isFtiManualPoNumberValid(row.id)
                                ? '!border-red-300 bg-red-50 focus:!border-red-400'
                                : '!border-slate-200 bg-white focus:!border-blue-400'
                            "
                            class="h-9 w-full rounded-lg !border px-2.5 text-xs outline-none"
                            @input="mdfoStore.onFtiManualPoNumberInput(row.id, $event)"
                          />
                          <div
                            v-if="mdfoStore.getFtiManualPoNumberWarning(row.id)"
                            class="mt-1 flex items-center justify-between gap-2 text-[9px] font-semibold text-red-600"
                          >
                            <span>{{ mdfoStore.getFtiManualPoNumberWarning(row.id) }}</span>
                            <span class="shrink-0 font-bold text-red-500">
                              {{ mdfoStore.getFtiManualPoNumberLength(row.id) }}/10
                            </span>
                          </div>
                        </td>
                        <td class="!border-b !border-r !border-slate-100 p-2">
                          <input v-model="row.poDate" type="date" class="h-9 w-full rounded-lg !border !border-slate-200 px-2 text-xs outline-none focus:!border-blue-400" />
                        </td>
                        <td class="!border-b !border-r !border-slate-100 p-2">
                          <input v-model="row.deliveryDate" type="date" class="h-9 w-full rounded-lg !border !border-slate-200 px-2 text-xs outline-none focus:!border-blue-400" />
                        </td>
                        <td class="!border-b !border-slate-100 p-2 text-center">
                          <button
                            v-if="!row.required"
                            type="button"
                            class="h-9 w-9 rounded-lg !border !border-red-200 bg-red-50 font-bold text-red-500 hover:bg-red-100"
                            title="Hapus baris"
                            @click="mdfoStore.removeFtiManualRow(row.id)"
                          >
                            ×
                          </button>
                          <span v-else class="inline-flex h-9 items-center text-[10px] font-bold text-slate-300">LOCK</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <datalist id="ftiManualPartOptionsList">
                    <option
                      v-for="part in mdfoStore.ftiManualPartOptions"
                      :key="part.part_no"
                      :value="part.part_no"
                    >
                      {{ part.part_name }}
                    </option>
                  </datalist>
                </div>

                <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p class="text-[10px] text-slate-500">
                    Part Name mengikuti Part No. Dua Part FTI wajib sudah disediakan otomatis.
                  </p>
                  <button
                    type="button"
                    :disabled="!permissions.create"
                    class="inline-flex h-8 items-center gap-1.5 rounded-lg !border !border-slate-300 bg-white px-3 text-[11px] font-bold text-slate-700 hover:!border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    @click="mdfoStore.addFtiManualRow"
                  >
                    <span class="text-base leading-none">+</span>
                    Add Part
                  </button>
                </div>
              </div>


              <!-- MES MANUAL MDFO -->
              <div
                v-if="mdfoStore.isMesManualMode"
                class="sm:col-span-2 rounded-2xl !border !border-blue-100 bg-blue-50/40 p-3 sm:p-4"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div class="text-sm font-bold text-slate-800">MES Manual MDFO</div>
                    <p class="mt-1 text-[10px] leading-4 text-slate-500">
                      Tidak ada upload file/OCR. Pilih bulan, lalu isi data manual. N wajib; N+1 sampai N+3 serta PO Number/PO Date/Delivery Date boleh kosong. Forecast dapat ditambahkan kemudian lewat Edit Forecast.
                    </p>
                  </div>
                  <div class="w-full sm:w-[220px]">
                    <label for="mesManualPeriod" class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Bulan MDFO *</label>
                    <input
                      id="mesManualPeriod"
                      v-model="mdfoStore.mesManualPeriod"
                      type="month"
                      class="mt-1 h-10 w-full rounded-xl !border !border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:!border-blue-400"
                      @change="mdfoStore.setMesManualPeriod(mdfoStore.mesManualPeriod)"
                    />
                  </div>
                </div>

                <div class="mt-3 overflow-x-auto rounded-xl !border !border-slate-200 bg-white">
                  <table class="min-w-[1290px] w-full border-collapse text-left text-xs">
                    <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th class="w-[170px] !border-b !border-r !border-slate-200 px-2 py-2.5">Part No *</th>
                        <th class="w-[255px] !border-b !border-r !border-slate-200 px-2 py-2.5">Part Name *</th>
                        <th class="w-[105px] !border-b !border-r !border-slate-200 px-2 py-2.5 text-center">{{ mdfoStore.mesManualMonthLabels[0] }} *</th>
                        <th class="w-[105px] !border-b !border-r !border-slate-200 px-2 py-2.5 text-center">{{ mdfoStore.mesManualMonthLabels[1] }}</th>
                        <th class="w-[105px] !border-b !border-r !border-slate-200 px-2 py-2.5 text-center">{{ mdfoStore.mesManualMonthLabels[2] }}</th>
                        <th class="w-[105px] !border-b !border-r !border-slate-200 px-2 py-2.5 text-center">{{ mdfoStore.mesManualMonthLabels[3] }}</th>
                        <th class="w-[160px] !border-b !border-r !border-slate-200 px-2 py-2.5">PO Number <span class="font-medium text-slate-400">(optional)</span></th>
                        <th class="w-[145px] !border-b !border-r !border-slate-200 px-2 py-2.5">PO Date <span class="font-medium text-slate-400">(optional)</span></th>
                        <th class="w-[145px] !border-b !border-r !border-slate-200 px-2 py-2.5">Delivery Date <span class="font-medium text-slate-400">(optional)</span></th>
                        <th class="w-[62px] !border-b !border-slate-200 px-2 py-2.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in mdfoStore.mesManualRows" :key="row.id" class="align-top">
                        <td class="!border-b !border-r !border-slate-100 p-2">
                          <input
                            v-model="row.partNo"
                            list="mesManualPartOptionsList"
                            type="text"
                            :readonly="row.required"
                            :placeholder="row.required ? 'Part wajib MES' : 'Pilih / ketik Part No'"
                            :class="row.required ? 'cursor-not-allowed bg-slate-50 text-slate-600' : 'bg-white text-slate-700 focus:!border-blue-400'"
                            class="h-9 w-full rounded-lg !border !border-slate-200 px-2.5 text-xs font-semibold uppercase outline-none"
                            @change="mdfoStore.updateMesManualPartNo(row.id, row.partNo)"
                          />
                          <span v-if="row.required" class="mt-1 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-600">WAJIB</span>
                        </td>
                        <td class="!border-b !border-r !border-slate-100 p-2">
                          <input
                            v-model="row.partName"
                            type="text"
                            :readonly="mdfoStore.isMesManualPartNameReadonly(row.id)"
                            :placeholder="mdfoStore.isMesManualPartNameResolving(row.id) ? 'Mencari Part Name...' : mdfoStore.isMesManualPartNameReadonly(row.id) ? 'Otomatis dari Part No' : 'Masukkan Part Name'"
                            :class="mdfoStore.isMesManualPartNameReadonly(row.id) ? 'cursor-not-allowed bg-slate-50 text-slate-600' : 'bg-white text-slate-700 focus:!border-blue-400'"
                            class="h-9 w-full rounded-lg !border !border-slate-200 px-2.5 text-xs uppercase outline-none"
                            @blur="mdfoStore.updateMesManualPartName(row.id, row.partName)"
                          />
                          <span v-if="mdfoStore.isMesManualPartNameResolving(row.id)" class="mt-1 inline-flex text-[9px] font-semibold text-blue-500">Mencari nama part di histori MDFO...</span>
                          <span v-else-if="row.partNo && !mdfoStore.isMesManualPartNameReadonly(row.id)" class="mt-1 inline-flex text-[9px] font-semibold text-amber-600">Part baru — Part Name boleh diisi manual</span>
                        </td>
                        <td class="!border-b !border-r !border-slate-100 p-2"><input v-model.number="row.n" type="number" min="0" step="1" placeholder="Wajib" class="h-9 w-full rounded-lg !border !border-slate-200 px-2 text-right text-xs outline-none focus:!border-blue-400" /></td>
                        <td class="!border-b !border-r !border-slate-100 p-2"><input v-model.number="row.n1" type="number" min="0" step="1" class="h-9 w-full rounded-lg !border !border-slate-200 px-2 text-right text-xs outline-none focus:!border-blue-400" /></td>
                        <td class="!border-b !border-r !border-slate-100 p-2"><input v-model.number="row.n2" type="number" min="0" step="1" class="h-9 w-full rounded-lg !border !border-slate-200 px-2 text-right text-xs outline-none focus:!border-blue-400" /></td>
                        <td class="!border-b !border-r !border-slate-100 p-2"><input v-model.number="row.n3" type="number" min="0" step="1" class="h-9 w-full rounded-lg !border !border-slate-200 px-2 text-right text-xs outline-none focus:!border-blue-400" /></td>
                        <td class="!border-b !border-r !border-slate-100 p-2">
                          <input
                            :value="row.poNumber"
                            type="text"
                            placeholder="Contoh: P0062855"
                            autocomplete="off"
                            spellcheck="false"
                            :class="
                              row.poNumber && String(row.poNumber).length !== 8
                                ? '!border-red-300 bg-red-50 focus:!border-red-400'
                                : '!border-slate-200 bg-white focus:!border-blue-400'
                            "
                            class="h-9 w-full rounded-lg !border px-2.5 text-xs outline-none"
                            @input="mdfoStore.onMesManualPoNumberInput(row.id, $event)"
                          />
                          <div
                            v-if="row.poNumber && String(row.poNumber).length !== 8"
                            class="mt-1 flex items-center justify-between gap-2 text-[9px] font-semibold text-red-600"
                          >
                            <span>
                              {{
                                String(row.poNumber).length < 8
                                  ? 'PO Number MES belum 8 karakter'
                                  : 'PO Number MES lebih dari 8 karakter'
                              }}
                            </span>
                            <span class="shrink-0 font-bold text-red-500">
                              {{ String(row.poNumber).length }}/8
                            </span>
                          </div>
                        </td>
                        <td class="!border-b !border-r !border-slate-100 p-2"><input v-model="row.poDate" type="date" class="h-9 w-full rounded-lg !border !border-slate-200 px-2 text-xs outline-none focus:!border-blue-400" /></td>
                        <td class="!border-b !border-r !border-slate-100 p-2"><input v-model="row.deliveryDate" type="date" class="h-9 w-full rounded-lg !border !border-slate-200 px-2 text-xs outline-none focus:!border-blue-400" /></td>
                        <td class="!border-b !border-slate-100 p-2 text-center">
                          <button v-if="!row.required" type="button" class="h-9 w-9 rounded-lg !border !border-red-200 bg-red-50 font-bold text-red-500 hover:bg-red-100" @click="mdfoStore.removeMesManualRow(row.id)">×</button>
                          <span v-else class="inline-flex h-9 items-center text-[10px] font-bold text-slate-300">LOCK</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <datalist id="mesManualPartOptionsList">
                    <option v-for="part in mdfoStore.mesManualPartOptions" :key="part.part_no" :value="part.part_no">{{ part.part_name }}</option>
                  </datalist>
                </div>

                <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p class="text-[10px] text-slate-500">
                    Part MES wajib: 68639-BZ010-00 dan 57161-BZ120-00. Part lain dapat dipilih dari histori atau diketik langsung.
                  </p>
                  <button type="button" :disabled="!permissions.create" class="inline-flex h-8 items-center gap-1.5 rounded-lg !border !border-slate-300 bg-white px-3 text-[11px] font-bold text-slate-700 hover:!border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50" @click="mdfoStore.addMesManualRow">
                    <span class="text-base leading-none">+</span> Add Part
                  </button>
                </div>
              </div>


              <!-- Upload File -->
              
              <div v-if="!mdfoStore.isFtiManualMode && !mdfoStore.isMesManualMode" class="flex flex-col gap-2 sm:col-span-2">
                <label class="text-sm font-semibold text-slate-700"> Upload File MDFO </label>

                <div class="flex items-center gap-3">
                  <!-- INPUT FILE ASLI Disembunyikan seperti Upload SO. -->
                  <input
                    :key="mdfoStore.uploadInputKey"
                    ref="uploadFileInput"
                    id="mdfoUploadFileInput"
                    type="file"
                    :accept="
                      mdfoStore.selectedCustomerUpload === 'DPM'
                        ? '.pdf,.zip,.rar,.7z'
                        : mdfoStore.selectedCustomerUpload === 'FTI'
                          ? '.pdf,.xlsx,.xls'
                        : '.xlsx,.xls,.csv'
                    "
                    multiple
                    class="hidden"
                    @change="mdfoStore.onFileChange"
                  />

                  <!-- Custom File Picker -->
                  <button
                    type="button"
                    class="group flex h-[48px] min-w-0 flex-1 items-center justify-between rounded-2xl !border !border-slate-300 bg-white px-3 text-left shadow-[0_2px_8px_rgba(15,23,42,0.04)] outline-none transition-all duration-200 hover:!border-blue-400 hover:shadow-[0_5px_16px_rgba(37,99,235,0.10)] focus:!border-blue-500 focus:ring-2 focus:ring-blue-100"
                    @click="openMdfoFilePicker"
                  >
                    <div class="flex min-w-0 items-center gap-3">
                      <!-- File Icon -->
                      <span
                        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-all duration-200 group-hover:bg-blue-100"
                      >
                        <svg
                          class="h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width="1.8"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M19.5 14.25v-2.625
                           a3.375 3.375 0 0 0-3.375-3.375
                           h-1.5A1.125 1.125 0 0 1
                           13.5 7.125v-1.5
                           A3.375 3.375 0 0 0
                           10.125 2.25H8.25
                           A2.25 2.25 0 0 0
                           6 4.5v15
                           a2.25 2.25 0 0 0
                           2.25 2.25h7.5
                           A2.25 2.25 0 0 0
                           18 19.5v-5.25Z"
                          />

                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M12 16.5v-6
                           m0 0-2.25 2.25
                           M12 10.5l2.25 2.25"
                          />
                        </svg>
                      </span>

                      <!-- File Name -->
                      <div class="min-w-0">
                        <p
                          class="truncate text-sm font-medium"
                          :class="mdfoStore.selectedFileNames.length ? 'text-slate-700' : 'text-slate-400'"
                        >
                          <template v-if="mdfoStore.selectedFileNames.length === 0">
                            {{
                              mdfoStore.selectedCustomerUpload === 'DPM'
                                ? 'Select PDF / ZIP / RAR / 7Z file'
                                : mdfoStore.selectedCustomerUpload === 'FTI'
                                  ? 'Select 1 PDF + 2 Excel files'
                                : 'Select Excel file'
                            }}
                          </template>

                          <template v-else-if="mdfoStore.selectedFileNames.length === 1">
                            {{ mdfoStore.selectedFileNames[0] }}
                          </template>

                          <template v-else>
                            {{ mdfoStore.selectedFileNames.length }}
                            files selected
                          </template>
                        </p>

                        <p class="text-[10px] text-slate-400">
                          {{
                            mdfoStore.selectedCustomerUpload === 'DPM'
                              ? 'Format PDF/ZIP/RAR/7Z; pilihan berikutnya akan ditambahkan'
                              : mdfoStore.selectedCustomerUpload === 'FTI'
                                ? 'Wajib 3 file: 1 PDF PO + 1 Excel Forecast + 1 Excel Schedule'
                              : 'Format XLSX/XLS/CSV; pilihan berikutnya akan ditambahkan'
                          }}
                        </p>
                      </div>
                    </div>

                    <!-- Browse Badge -->
                    <span
                      class="ml-3 shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition-all duration-200 group-hover:bg-blue-600 group-hover:text-white"
                    >
                      Browse
                    </span>
                  </button>

                  
                  <!-- Preview / Eye -->
                  
                  <button
                    type="button"
                    :disabled="!mdfoStore.canOpenUploadPreview"
                    :title="
                      mdfoStore.isCheckingFiles
                        ? 'File sedang diperiksa'
                        : mdfoStore.selectedFileNames.length === 0
                          ? 'Pilih file MDFO terlebih dahulu'
                          : mdfoStore.allCheckedFilesValid
                            ? 'Preview file MDFO'
                            : 'Klik untuk memeriksa dan preview file'
                    "
                    aria-label="Preview file MDFO"
                    class="relative flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-2xl !border bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    :class="
                      mdfoStore.canOpenUploadPreview
                        ? (
                            currentMdfoPreviewSourceKey && !hasReviewedCurrentMdfoPreview
                              ? '!border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-100 animate-pulse hover:bg-blue-100'
                              : '!border-blue-300 text-blue-600 hover:!border-blue-500 hover:bg-blue-50 hover:text-blue-700'
                          )
                        : '!border-slate-300 text-slate-400 hover:!border-slate-400 hover:bg-slate-50'
                    "
                    @click="mdfoStore.openUploadPreview"
                  >
                    <span
                      v-if="mdfoStore.canOpenUploadPreview && currentMdfoPreviewSourceKey && !hasReviewedCurrentMdfoPreview"
                      class="absolute -right-1 -top-1 flex h-3 w-3"
                      aria-hidden="true"
                    >
                      <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-70"></span>
                      <span class="relative inline-flex h-3 w-3 rounded-full bg-blue-600 ring-2 ring-white"></span>
                    </span>
                    <!-- Satu-satunya Eye untuk preview MDFO file-based -->
                    <svg
                      class="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
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

                <!-- Validating -->
                <div
                  v-if="mdfoStore.isCheckingFiles"
                  class="flex items-center gap-2 px-1 text-xs text-blue-600"
                >
                  <svg
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

                  Memeriksa file MDFO...
                </div>

                <!-- Informasi File Terpilih -->
                <div
                  v-else-if="mdfoStore.selectedFiles.length > 0"
                  class="flex items-center gap-1.5 px-1 text-xs"
                  :class="mdfoStore.allCheckedFilesValid ? 'text-emerald-600' : 'text-slate-500'"
                >
                  <svg
                    v-if="mdfoStore.allCheckedFilesValid"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="h-3.5 w-3.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="m5 12 4 4L19 6"
                    />
                  </svg>

                  <span>
                    <template v-if="mdfoStore.allCheckedFilesValid">
                      {{ mdfoStore.selectedFiles.length }} file berhasil diperiksa
                    </template>
                    <template v-else>
                      {{ mdfoStore.selectedFiles.length }} file dipilih
                    </template>
                  </span>
                </div>

                <!-- Guidance Preview MDFO: hanya status, TANPA tombol eye kedua. -->
                <div
                  v-if="currentMdfoPreviewSourceKey"
                  class="flex items-start gap-2.5 rounded-2xl !border px-3 py-3 transition-all duration-200"
                  :class="
                    hasReviewedCurrentMdfoPreview
                      ? '!border-emerald-200 bg-emerald-50/80'
                      : mdfoStore.allCheckedFilesValid && mdfoStore.isUploadRevisionReady
                        ? '!border-blue-200 bg-blue-50/90 shadow-[0_4px_14px_rgba(37,99,235,0.08)]'
                        : '!border-amber-200 bg-amber-50/80'
                  "
                >
                  <span
                    class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                    :class="
                      hasReviewedCurrentMdfoPreview
                        ? 'bg-emerald-100 text-emerald-700'
                        : mdfoStore.allCheckedFilesValid && mdfoStore.isUploadRevisionReady
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                    "
                  >
                    <svg
                      v-if="hasReviewedCurrentMdfoPreview"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      class="h-4 w-4"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="m5 12 4 4L19 6" />
                    </svg>
                    <svg
                      v-else-if="isAutoOpeningMdfoPreview"
                      class="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" />
                      <path class="opacity-80" fill="currentColor" d="M12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6V3Z" />
                    </svg>
                    <svg
                      v-else
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      class="h-4 w-4"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="m12 3 7 4v5c0 4.5-2.8 7.6-7 9-4.2-1.4-7-4.5-7-9V7l7-4Z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="m9 12 2 2 4-4" />
                    </svg>
                  </span>

                  <div class="min-w-0">
                    <p
                      class="text-xs font-bold"
                      :class="
                        hasReviewedCurrentMdfoPreview
                          ? 'text-emerald-800'
                          : mdfoStore.allCheckedFilesValid && mdfoStore.isUploadRevisionReady
                            ? 'text-blue-800'
                            : 'text-amber-800'
                      "
                    >
                      {{ mdfoPreviewGuidanceTitle }}
                    </p>
                    <p
                      class="mt-0.5 text-[10px] leading-4"
                      :class="
                        hasReviewedCurrentMdfoPreview
                          ? 'text-emerald-700'
                          : mdfoStore.allCheckedFilesValid && mdfoStore.isUploadRevisionReady
                            ? 'text-blue-700'
                            : 'text-amber-700'
                      "
                    >
                      {{ mdfoPreviewGuidanceMessage }}
                    </p>
                  </div>
                </div>

                <!--
                  Daftar file mengikuti skema Upload SO:
                  Browse berikutnya menambah file dan setiap file dapat
                  dihapus sendiri tanpa menghapus file lainnya.
                -->
                <div
                  v-if="mdfoStore.selectedFiles.length > 0"
                  class="max-h-44 space-y-1 overflow-y-auto rounded-xl !border !border-slate-200 bg-slate-50 p-2"
                >
                  <div
                    v-for="(file, fileIndex) in mdfoStore.selectedFiles"
                    :key="`${file.name}-${file.size}-${file.lastModified}`"
                    class="flex items-center justify-between gap-3 rounded-lg !border !border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <div class="min-w-0 flex-1">
                      <div class="flex min-w-0 items-center gap-2">
                        <span
                          v-if="mdfoStore.fileCheckResults[fileIndex]?.valid"
                          class="shrink-0 text-emerald-600"
                          aria-hidden="true"
                        >
                          ✓
                        </span>

                        <span
                          v-else-if="mdfoStore.fileCheckResults[fileIndex] && !mdfoStore.fileCheckResults[fileIndex]?.valid"
                          class="shrink-0 text-red-500"
                          aria-hidden="true"
                        >
                          ×
                        </span>

                        <p
                          class="truncate font-medium text-slate-700"
                          :title="file.name"
                        >
                          {{ file.name }}
                        </p>
                      </div>

                      <p
                        class="mt-0.5 truncate text-[10px]"
                        :class="
                          mdfoStore.fileCheckResults[fileIndex]?.valid
                            ? 'text-emerald-600'
                            : mdfoStore.fileCheckResults[fileIndex]
                              ? 'text-red-500'
                              : 'text-slate-400'
                        "
                        :title="mdfoStore.fileCheckResults[fileIndex]?.message || `File ${fileIndex + 1}`"
                      >
                        {{
                          mdfoStore.fileCheckResults[fileIndex]?.message ||
                          `File ${fileIndex + 1}`
                        }}
                      </p>
                    </div>

                    <button
                      type="button"
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg !border !border-red-200 bg-red-50 text-red-500 transition-all hover:!border-red-300 hover:bg-red-100 hover:text-red-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                      :disabled="mdfoStore.isCheckingFiles || mdfoStore.isUploading"
                      :aria-label="`Hapus ${file.name}`"
                      :title="`Hapus ${file.name}`"
                      @click="mdfoStore.removeSelectedFile(fileIndex)"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>

              <!-- DPM PDF Tanpa Harga -->
              <div
                v-if="mdfoStore.selectedCustomerUpload === 'DPM'"
                class="sm:col-span-2"
              >
                <button
                  type="button"
                  class="group flex w-full items-center gap-3 rounded-2xl !border px-4 py-3 text-left shadow-sm transition-all duration-200 active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-55"
                  :class="
                    mdfoStore.canPrepareDpmSanitizedPdfs
                      ? '!border-blue-200 bg-blue-50/70 hover:!border-blue-400 hover:bg-blue-50 hover:shadow-md'
                      : '!border-slate-200 bg-slate-50'
                  "
                  :disabled="!permissions.download || !mdfoStore.canPrepareDpmSanitizedPdfs"
                  title="Preview dan download PDF DPM tanpa Price, Amount, Sub Total, PPN, Additional, dan Total"
                  @click="mdfoStore.prepareDpmSanitizedPdfs"
                >
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                    <svg
                      v-if="mdfoStore.isPreparingDpmSanitizedPdfs"
                      class="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" />
                      <path class="opacity-80" fill="currentColor" d="M12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6V3Z" />
                    </svg>

                    <svg
                      v-else
                      class="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14 3v5h5M9 15h6M9 18h4" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="m9 11 1.5 1.5L14 9" />
                    </svg>
                  </span>

                  <span class="min-w-0 flex-1">
                    <span class="block text-sm font-bold text-slate-800">
                      {{ mdfoStore.isPreparingDpmSanitizedPdfs ? 'Menyiapkan PDF...' : 'Preview & Download PDF Tanpa Harga' }}
                    </span>
                    <span class="mt-0.5 block text-[11px] leading-4 text-slate-500">
                      Price, Amount, Sub Total, PPN, Additional, dan Total disembunyikan dari PDF hasil.
                    </span>
                  </span>

                  <span
                    v-if="mdfoStore.allCheckedFilesValid"
                    class="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-blue-600 ring-1 ring-blue-100"
                  >
                    Siap
                  </span>
                </button>

                <p
                  v-if="!mdfoStore.allCheckedFilesValid && mdfoStore.selectedFiles.length > 0"
                  class="mt-1.5 px-1 text-[10px] text-slate-400"
                >
                  Tombol aktif setelah seluruh file DPM selesai diperiksa.
                </p>
              </div>

              
              <!-- Upload By -->
              
              <div
                ref="mdfoUploadBySectionRef"
                class="flex flex-col gap-2 sm:col-span-2"
              >
                <label class="text-sm font-semibold text-slate-700"> Upload By </label>

                <div class="relative">
                  <button
                    type="button"
                    :disabled="!mdfoStore.canSelectUploadUser"
                    class="group flex h-[48px] w-full items-center justify-between rounded-2xl !border !border-slate-300 bg-white px-4 text-left text-sm shadow-[0_2px_8px_rgba(15,23,42,0.04)] outline-none transition-all duration-200 hover:!border-blue-400 hover:shadow-[0_5px_16px_rgba(37,99,235,0.10)] focus:!border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:!border-slate-200 disabled:!bg-slate-100 disabled:shadow-none disabled:hover:!border-slate-200"
                    @click.stop="toggleMdfoUploadUserDropdownAndScroll"
                  >
                    <span class="truncate" :class="mdfoStore.uploadBy ? 'font-medium text-slate-700' : 'text-slate-400'">
                      {{ mdfoStore.uploadBy || 'Select User' }}
                    </span>

                    <!-- Chevron -->
                    <svg
                      class="h-5 w-5 shrink-0 text-slate-400 transition-all duration-200 group-hover:text-blue-600"
                      :class="mdfoStore.showMdfoUploadUserDropdown ? 'rotate-180' : ''"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1
                       1.06.02L10 11.17l3.71-3.94
                       a.75.75 0 1 1 1.08 1.04
                       l-4.25 4.5a.75.75 0 0 1
                       -1.08 0l-4.25-4.5
                       a.75.75 0 0 1 .02-1.06Z"
                      />
                    </svg>
                  </button>

                  <!-- User Dropdown -->
                  <div
                    v-if="mdfoStore.showMdfoUploadUserDropdown && mdfoStore.canSelectUploadUser"
                    class="absolute left-0 right-0 top-[54px] z-[10090] max-h-[220px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-1 ring-slate-100"
                    @click.stop
                  >
                    <button
                      type="button"
                      class="mb-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-slate-400 transition-all duration-150 hover:bg-slate-50"
                      @click="mdfoStore.selectUploadUser('')"
                    >
                      Select User
                    </button>

                    <button
                      v-for="user in mdfoStore.uploadUserOptions"
                      :key="user"
                      type="button"
                      class="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-150"
                      :class="mdfoStore.uploadBy === user ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-blue-50'"
                      @click="mdfoStore.selectUploadUser(user)"
                    >
                      <span
                        class="mr-2 h-3 w-3 shrink-0 rounded-full"
                        :class="mdfoStore.userColorClass(user)"
                        aria-hidden="true"
                      ></span>

                      <span class="truncate">{{ user }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          
          <!-- Footer -->
          
            <div class="sticky bottom-0 z-[30] flex flex-wrap items-center justify-end gap-2 !border-t !border-slate-200 bg-slate-50 px-4 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.04)] sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-4">
            <!-- Clear Data: satu-satunya aksi manual yang menghapus draft -->
            <button
              type="button"
              :disabled="mdfoStore.isUploading"
              class="h-10 min-w-[104px] flex-1 rounded-xl !border !border-slate-300 bg-white px-5 text-sm font-semibold sm:flex-none text-slate-600 transition-all duration-200 hover:!border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              @click="mdfoStore.clearUploadForm"
            >
              Clear Data
            </button>

            <!-- Cancel: hanya menutup modal, data tetap tersimpan -->
            <button
              type="button"
              :disabled="mdfoStore.isUploading"
              class="h-10 min-w-[96px] flex-1 rounded-xl !border !border-slate-300 bg-white px-5 text-sm font-semibold sm:flex-none text-slate-600 transition-all duration-200 hover:!border-slate-400 hover:bg-slate-100 hover:text-slate-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              @click="mdfoStore.closeUploadModal"
            >
              Cancel
            </button>

            <!-- Submit -->
            <button
              type="submit"
              :disabled="!permissions.create || !mdfoStore.canSubmitUpload"
              :title="
                !permissions.create
                  ? 'Tidak memiliki permission Create Upload MDFO'
                  : !mdfoStore.selectedCustomerUpload
                  ? 'Pilih Customer'
                  : mdfoStore.isMesManualMode && !mdfoStore.mesManualPeriodCompact
                    ? 'Pilih bulan MES'
                    : mdfoStore.isFtiManualMode && !mdfoStore.ftiManualScheduleFile
                      ? 'Pilih Excel Schedule FTI'
                      : !mdfoStore.isFtiManualMode && !mdfoStore.isMesManualMode && mdfoStore.selectedFileNames.length === 0
                      ? 'Pilih file MDFO'
                    : !mdfoStore.isUploadRevisionDetected
                      ? 'Revision belum terdeteksi'
                    : !mdfoStore.isUploadRevisionReady
                      ? 'Klik Submit untuk konfirmasi Revision'
                    : mdfoStore.isMesManualMode && !mdfoStore.isMesUploadSetComplete
                      ? 'Lengkapi input MDFO MES manual'
                      : mdfoStore.isFtiManualMode && !mdfoStore.isFtiUploadSetComplete
                        ? 'Lengkapi input MDFO FTI manual'
                    : mdfoStore.isFtiOcrMode && !mdfoStore.isFtiUploadSetComplete
                      ? 'FTI OCR wajib 1 PDF dan 2 Excel'
                    : !mdfoStore.uploadBy
                      ? 'Pilih Upload By'
                      : mdfoStore.isCheckingFiles || mdfoStore.isLoadingFtiManualSources
                        ? 'File sedang diperiksa'
                        : 'Submit MDFO'
              "
              class="flex h-10 min-w-[110px] flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold sm:flex-none text-white shadow-[0_3px_6px_rgba(37,99,235,0.35)] transition-all duration-200 hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
            >
              <svg
                v-if="mdfoStore.isUploading || mdfoStore.isCheckingFiles || mdfoStore.isLoadingFtiManualSources || mdfoStore.isDetectingUploadRevision"
                class="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />

                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="
                    M4 12
                    a8 8 0 0 1
                    8-8
                    v4
                    a4 4 0 0 0
                    -4 4
                    H4Z
                  "
                />
              </svg>

              <span>
                {{ mdfoStore.isCheckingFiles || mdfoStore.isLoadingFtiManualSources
                  ? 'Checking...'
                  : mdfoStore.isDetectingUploadRevision
                    ? 'Detecting...'
                    : mdfoStore.isUploading
                      ? 'Uploading...'
                      : 'Submit' }}
              </span>
            </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- MES Manual ZSTT: muncul setelah Raw MDFO + Quotation + Contract tersimpan -->
    <Teleport to="body">
      <div
        v-if="mdfoStore.showMesZsttModal"
        class="fixed inset-0 z-[13000] flex h-screen min-h-screen w-screen items-center justify-center overflow-hidden bg-slate-900/60 p-2 sm:p-4"
        style="height: 100dvh; min-height: 100vh;"
        @click.self="mdfoStore.closeMesZsttModal"
      >
        <section class="flex h-[94dvh] w-[98vw] max-w-[1580px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl">
          <header class="flex shrink-0 flex-wrap items-start justify-between gap-3 !border-b !border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-extrabold text-slate-900 sm:text-xl">ZSTT MES — Input Daily Manual</h3>
                <span class="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">{{ mdfoStore.mesZsttPeriod }}</span>
              </div>
              <p class="mt-1 max-w-[880px] text-[11px] leading-5 text-slate-500">
                Isi Qty pada hari yang memiliki delivery. Hari tanpa delivery boleh kosong. Total Qty tanggal 1–31 untuk setiap Part harus sama dengan Qty N MDFO.
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200">
                Boleh ditutup dan dilanjutkan nanti
              </span>
              <button
                type="button"
                :disabled="mdfoStore.isSubmittingMesZstt"
                aria-label="Tutup input ZSTT MES"
                title="Tutup dan isi nanti"
                class="flex h-9 w-9 items-center justify-center rounded-full !border !border-slate-300 bg-white text-xl text-slate-500 transition hover:!border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                @click="mdfoStore.closeMesZsttModal"
              >
                ×
              </button>
            </div>
          </header>

          <div class="min-h-0 flex-1 overflow-auto bg-slate-50/50 p-3 sm:p-4">
            <div class="min-w-max overflow-hidden rounded-2xl !border !border-slate-200 bg-white shadow-sm">
              <table class="border-collapse text-xs">
                <thead class="sticky top-0 z-20 bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th class="sticky left-0 z-30 min-w-[145px] !border-b !border-r !border-slate-200 bg-slate-100 px-3 py-3 text-left">Part No</th>
                    <th class="sticky left-[145px] z-30 min-w-[245px] !border-b !border-r !border-slate-200 bg-slate-100 px-3 py-3 text-left">Part Name</th>
                    <th class="min-w-[90px] !border-b !border-r !border-slate-200 px-2 py-3 text-right">Qty N</th>
                    <th
                      v-for="dayKey in mdfoStore.mesZsttDayKeys"
                      :key="dayKey"
                      class="min-w-[76px] !border-b !border-r !border-slate-200 px-2 py-3 text-center"
                    >
                      {{ Number(dayKey.slice(1)) }}
                    </th>
                    <th class="min-w-[100px] !border-b !border-r !border-slate-200 px-2 py-3 text-right">Total Daily</th>
                    <th class="min-w-[100px] !border-b !border-slate-200 px-2 py-3 text-right">Sisa</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in mdfoStore.mesZsttRows" :key="row.rawId" class="hover:bg-blue-50/20">
                    <td class="sticky left-0 z-10 !border-b !border-r !border-slate-100 bg-white px-3 py-2 font-bold text-slate-700">{{ row.partNo }}</td>
                    <td class="sticky left-[145px] z-10 max-w-[245px] !border-b !border-r !border-slate-100 bg-white px-3 py-2 text-slate-600">
                      <span class="block truncate" :title="row.partName">{{ row.partName }}</span>
                    </td>
                    <td class="!border-b !border-r !border-slate-100 bg-blue-50/50 px-2 py-2 text-right font-bold text-blue-700">{{ row.targetQty }}</td>
                    <td v-for="dayKey in mdfoStore.mesZsttDayKeys" :key="`${row.rawId}-${dayKey}`" class="!border-b !border-r !border-slate-100 p-1.5">
                      <input
                        v-model.number="row.daily[dayKey]"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="-"
                        class="h-8 w-[64px] rounded-lg !border !border-slate-200 bg-white px-1.5 text-right text-xs outline-none focus:!border-blue-400"
                      />
                    </td>
                    <td class="!border-b !border-r !border-slate-100 px-2 py-2 text-right font-bold text-slate-700">{{ mdfoStore.getMesZsttRowTotal(row) }}</td>
                    <td class="!border-b !border-slate-100 px-2 py-2 text-right font-bold" :class="Math.abs(mdfoStore.getMesZsttRemaining(row)) < 0.000001 ? 'text-emerald-600' : 'text-red-600'">
                      {{ mdfoStore.getMesZsttRemaining(row) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <footer class="flex shrink-0 flex-wrap items-center justify-between gap-3 !border-t !border-slate-200 bg-white px-4 py-3 sm:px-6">
            <div class="text-[11px]">
              <span v-if="mdfoStore.isMesZsttValid" class="font-bold text-emerald-600">Semua total Daily sudah sesuai Qty N.</span>
              <span v-else class="font-semibold text-amber-600">Lengkapi Daily sampai nilai Sisa seluruh Part menjadi 0.</span>
              <div class="mt-1 text-[10px] text-slate-400">ZSTT dan Tracking baru dibuat setelah tombol Generate ditekan. Popup boleh ditutup sementara.</div>
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                :disabled="mdfoStore.isSubmittingMesZstt"
                class="h-10 rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                @click="mdfoStore.closeMesZsttModal"
              >
                Tutup &amp; Isi Nanti
              </button>
              <button type="button" :disabled="!permissions.create || !mdfoStore.isMesZsttValid || mdfoStore.isSubmittingMesZstt" class="h-10 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300" @click="mdfoStore.submitMesZstt">
                {{ mdfoStore.isSubmittingMesZstt ? 'Generating...' : 'Generate ZSTT & Tracking' }}
              </button>
            </div>
          </footer>
        </section>
      </div>
    </Teleport>

    <!-- Preview hasil PDF DPM tanpa harga -->
    <Teleport to="body">
      <div
        v-if="mdfoStore.showDpmSanitizedPdfPreview"
        class="fixed inset-0 z-[12000] flex h-screen min-h-screen w-screen items-center justify-center overflow-hidden bg-slate-900/60 p-2 sm:p-4"
        style="height: 100dvh; min-height: 100vh;"
        @click.self="mdfoStore.closeDpmSanitizedPdfPreview"
      >
        <section class="flex h-[94dvh] w-[96vw] max-w-[1320px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl">
          <header class="flex shrink-0 flex-wrap items-center justify-between gap-3 !border-b !border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
            <div class="min-w-0">
              <h3 class="text-lg font-extrabold text-slate-900 sm:text-xl">PREVIEW PDF DPM TANPA HARGA</h3>
              <p class="mt-1 text-[11px] text-slate-500 sm:text-xs">
                Nilai harga telah dihapus dari halaman PDF. Periksa hasil sebelum didownload.
              </p>
            </div>

            <button
              type="button"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 text-xl font-bold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
              aria-label="Tutup preview PDF tanpa harga"
              title="Tutup"
              @click="mdfoStore.closeDpmSanitizedPdfPreview"
            >
              ×
            </button>
          </header>

          <div class="flex min-h-0 flex-1 flex-col bg-slate-100 lg:flex-row">
            <aside class="shrink-0 !border-b !border-slate-200 bg-white p-3 lg:w-[300px] lg:!border-b-0 lg:!border-r">
              <div class="mb-2 flex items-center justify-between gap-2 px-1">
                <span class="text-xs font-bold uppercase tracking-wide text-slate-500">Daftar PDF</span>
                <span class="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                  {{ mdfoStore.dpmSanitizedPdfs.length }} file
                </span>
              </div>

              <div class="flex max-h-[150px] gap-2 overflow-auto lg:max-h-[calc(94dvh-205px)] lg:flex-col">
                <button
                  v-for="(file, fileIndex) in mdfoStore.dpmSanitizedPdfs"
                  :key="`${file.name}-${fileIndex}`"
                  type="button"
                  class="min-w-[230px] rounded-xl !border px-3 py-2.5 text-left transition lg:min-w-0"
                  :class="
                    mdfoStore.activeDpmSanitizedPdfIndex === fileIndex
                      ? '!border-blue-500 bg-blue-50 shadow-sm'
                      : '!border-slate-200 bg-white hover:!border-blue-300 hover:bg-blue-50/50'
                  "
                  @click="mdfoStore.selectDpmSanitizedPdf(fileIndex)"
                >
                  <span class="block truncate text-xs font-bold text-slate-700" :title="file.name">
                    {{ file.name }}
                  </span>
                  <span class="mt-1 block truncate text-[10px] text-slate-400" :title="file.sourceName">
                    {{ file.pageCount }} halaman · {{ file.sourceName }}
                  </span>
                </button>
              </div>
            </aside>

            <main class="min-h-0 flex-1 p-2 sm:p-3">
              <iframe
                v-if="mdfoStore.activeDpmSanitizedPdf"
                :key="mdfoStore.activeDpmSanitizedPdf.url"
                :src="mdfoStore.activeDpmSanitizedPdf.url"
                :title="`Preview ${mdfoStore.activeDpmSanitizedPdf.name}`"
                class="h-full min-h-[420px] w-full rounded-xl !border !border-slate-300 bg-white"
              ></iframe>
            </main>
          </div>

          <footer class="flex shrink-0 flex-wrap items-center justify-between gap-3 !border-t !border-slate-200 bg-white px-4 py-3 sm:px-6">
            <p class="max-w-[620px] text-[10px] leading-4 text-slate-500 sm:text-[11px]">
              Hasil dibuat sebagai halaman PDF baru sehingga teks harga yang ditutup tidak tersimpan sebagai teks tersembunyi.
            </p>

            <div class="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
              <button
                type="button"
                class="h-10 rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                @click="mdfoStore.closeDpmSanitizedPdfPreview"
              >
                Tutup
              </button>

              <button
                v-if="mdfoStore.dpmSanitizedPdfs.length > 1"
                type="button"
                :disabled="!permissions.download"
                class="h-10 rounded-xl bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                @click="mdfoStore.downloadAllDpmSanitizedPdfs"
              >
                Download Semua (ZIP)
              </button>

              <button
                type="button"
                class="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                :disabled="!permissions.download || !mdfoStore.activeDpmSanitizedPdf"
                @click="mdfoStore.downloadActiveDpmSanitizedPdf"
              >
                Download PDF
              </button>
            </div>
          </footer>
        </section>
      </div>
    </Teleport>

    <!-- File Preview MDFO -->

    <Teleport to="body">
      <div
        v-if="mdfoStore.showMdfoUploadPreview"
        class="fixed inset-0 z-[11000] flex h-screen min-h-screen w-screen items-center justify-center overflow-hidden bg-slate-900/50 p-4"
        style="height: 100dvh; min-height: 100vh;"
        @click.self="mdfoStore.closeUploadPreview"
      >
      <div
        class="
          flex
          w-[96vw]
          flex-col
          overflow-hidden
          rounded-3xl
          bg-white
          shadow-2xl
        "
        :class="
          [
            mdfoStore.excelPreviewSummary.customer === 'ASI ADM'
              ? 'h-[78vh] max-h-[760px]'
              : 'h-[92vh] max-h-[920px]',
            ['FTI', 'MES'].includes(mdfoStore.excelPreviewSummary.mode)
              ? 'max-w-none'
              : 'max-w-[1380px]'
          ]
        "
      >
        <!-- HEADER -->
        <div
          class="
            flex
            shrink-0
            items-center
            justify-between
            gap-4
            !border-b
            !border-slate-200
            bg-white
            px-6
            py-3.5
          "
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-lg font-bold text-slate-900">
                MDFO Preview
              </h3>

              <span
                class="
                  rounded-full
                  !border
                  !border-blue-100
                  bg-blue-50
                  px-2.5
                  py-1
                  text-[11px]
                  font-bold
                  text-blue-700
                "
              >
                {{ mdfoStore.excelPreviewSummary.mode }}
              </span>

              <span
                v-if="mdfoStore.excelPreviewSummary.periodLabel !== '-'"
                class="
                  rounded-full
                  !border
                  !border-slate-200
                  bg-slate-50
                  px-2.5
                  py-1
                  text-[11px]
                  font-semibold
                  text-slate-600
                "
              >
                {{ mdfoStore.excelPreviewSummary.periodLabel }}
              </span>
            </div>

            <p class="mt-1 truncate text-xs text-slate-500">
              <template v-if="mdfoStore.isMesManualMode">
                Manual Input MES · tanpa file
              </template>
              <template v-else-if="mdfoStore.isFtiManualMode">
                Manual Input · {{ mdfoStore.ftiManualScheduleFile?.name || 'Schedule' }}
                <template v-if="mdfoStore.ftiManualForecastFile">
                  · {{ mdfoStore.ftiManualForecastFile.name }}
                </template>
              </template>
              <template v-else>
                {{ mdfoStore.selectedFileNames.length }} file MDFO dipilih
                <template v-if="mdfoStore.selectedFileNames[mdfoStore.activePreviewFileIndex]">
                  — {{ mdfoStore.selectedFileNames[mdfoStore.activePreviewFileIndex] }}
                </template>
              </template>
            </p>
          </div>

          <button
            type="button"
            title="Close preview"
            aria-label="Close Excel preview"
            class="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-full
              !border
              !border-solid
              !border-slate-300
              bg-white
              text-slate-500
              transition-all
              hover:!border-red-200
              hover:bg-red-50
              hover:text-red-600
              active:scale-95
            "
            style="border: 1px solid #cbd5e1 !important;"
            @click="mdfoStore.closeUploadPreview"
          >
            <svg
              class="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- BODY: scroll vertikal agar seluruh preview tetap bisa dijangkau di laptop -->
        <div
          class="
            flex
            min-h-0
            flex-1
            flex-col
            overflow-x-hidden
            overflow-y-auto
            overscroll-contain
            bg-slate-50/40
            px-6
            py-3
          "
          style="
            scrollbar-gutter: stable;
            -webkit-overflow-scrolling: touch;
          "
        >
          <!-- FILE SELECTOR -->
          <div
            v-if="!mdfoStore.isFtiManualMode && !mdfoStore.isMesManualMode && mdfoStore.selectedFileNames.length > 1"
            class="mb-3 shrink-0"
          >
            <p
              class="
                mb-1.5
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-slate-400
              "
            >
              File
            </p>

            <div
              class="
                flex
                gap-2
                overflow-x-auto
                pb-1
              "
            >
              <button
                v-for="(fileName, index) in mdfoStore.selectedFileNames"
                :key="`${fileName}-${index}`"
                type="button"
                class="
                  max-w-[240px]
                  shrink-0
                  truncate
                  rounded-xl
                  !border
                  px-3
                  py-2
                  text-xs
                  font-semibold
                  transition-all
                "
                :class="
                  mdfoStore.activePreviewFileIndex === index
                    ? '!border-blue-600 bg-blue-600 text-white shadow-sm'
                    : '!border-slate-200 bg-white text-slate-600 hover:!border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                "
                :title="fileName"
                @click="mdfoStore.selectPreviewFile(index)"
              >
                {{ index + 1 }}.
                {{ fileName }}
              </button>
            </div>
          </div>

          <!-- FILE / SHEET -->
          <div
            class="
              mb-3
              grid
              shrink-0
              grid-cols-1
              gap-3
              rounded-2xl
              !border
              !border-slate-200
              bg-white
              px-3
              py-2.5
              lg:grid-cols-[minmax(0,1fr)_320px]
            "
          >
            <div class="min-w-0">
              <div class="text-[10px] font-semibold uppercase text-slate-400">
                File
              </div>

              <div class="mt-0.5 truncate text-sm font-semibold text-slate-700">
                <template v-if="mdfoStore.isMesManualMode">
                  MANUAL INPUT MES
                </template>
                <template v-else-if="mdfoStore.isFtiManualMode">
                  MANUAL INPUT + {{ mdfoStore.ftiManualScheduleFile?.name || 'Schedule' }}
                  <template v-if="mdfoStore.ftiManualForecastFile">
                    + {{ mdfoStore.ftiManualForecastFile.name }}
                  </template>
                </template>
                <template v-else>
                  {{ mdfoStore.selectedFileNames[mdfoStore.activePreviewFileIndex] || '-' }}
                </template>
              </div>
            </div>

            <div>
              <div class="text-[10px] font-semibold uppercase text-slate-400">
                {{ mdfoStore.excelPreviewSummary.mode === 'DPM' ? 'Sumber Data' : 'Sheet' }}
              </div>

              <select
                v-if="mdfoStore.excelSheetNames.length > 1"
                v-model="mdfoStore.selectedExcelSheet"
                class="
                  mt-0.5
                  h-8
                  w-full
                  rounded-xl
                  !border
                  !border-slate-200
                  bg-white
                  px-3
                  text-sm
                  font-semibold
                  text-slate-700
                  outline-none
                  focus:!border-blue-400
                "
                @change="mdfoStore.handleExcelSheetChange"
              >
                <option
                  v-for="sheetName in mdfoStore.excelSheetNames"
                  :key="sheetName"
                  :value="sheetName"
                >
                  {{ sheetName }}
                </option>
              </select>

              <div
                v-else
                class="mt-0.5 text-sm font-semibold text-slate-700"
              >
                {{ mdfoStore.selectedExcelSheet || '-' }}
              </div>
            </div>
          </div>

          <!-- LOADING -->
          <div
            v-if="mdfoStore.isPreviewLoading"
            class="
              flex
              min-h-0
              flex-1
              items-center
              justify-center
              rounded-2xl
              !border
              !border-blue-100
              bg-blue-50
              text-sm
              font-semibold
              text-blue-700
            "
          >
            <svg
              class="mr-2 h-4 w-4 animate-spin"
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

            Membaca dan merangkum MDFO...
          </div>

          <!-- ERROR -->
          <div
            v-else-if="mdfoStore.excelPreviewError"
            class="
              flex
              min-h-0
              flex-1
              items-center
              justify-center
              rounded-2xl
              !border
              !border-red-200
              bg-red-50
              p-4
              text-sm
              text-red-700
            "
          >
            {{ mdfoStore.excelPreviewError }}
          </div>

          <div
            v-else
            class="
              flex
              min-h-0
              shrink-0
              flex-col
              overflow-visible
            "
          >
            <!-- SUMMARY -->
            <section
              class="
                mb-3
                shrink-0
                rounded-2xl
                !border
                !border-slate-200
                bg-white
                p-3.5
                shadow-sm
              "
            >
              <div
                class="
                  mb-2.5
                  flex
                  flex-wrap
                  items-center
                  justify-between
                  gap-2
                "
              >
                <div>
                  <h4 class="text-sm font-bold text-slate-800">
                    Ringkasan MDFO
                  </h4>

                  <p class="mt-0.5 text-[11px] text-slate-400">
                    Informasi utama dari data mentah file yang sedang dipreview.
                  </p>
                </div>

                <div
                  class="
                    rounded-full
                    !border
                    !border-slate-200
                    bg-slate-50
                    px-3
                    py-1.5
                    text-xs
                    font-semibold
                    text-slate-600
                  "
                >
                  {{ mdfoStore.excelPreviewSummary.totalRows }}
                  baris data
                </div>
              </div>

              <!-- FORECAST -->
              <div
                class="
                  grid
                  grid-cols-2
                  gap-2
                  xl:grid-cols-4
                "
              >
                <div
                  v-for="forecast in mdfoStore.excelPreviewForecastSummary"
                  :key="forecast.key"
                  class="
                    rounded-xl
                    !border
                    !border-blue-100
                    bg-blue-50/60
                    px-3
                    py-2.5
                  "
                >
                  <div
                    class="
                      flex
                      items-start
                      justify-between
                      gap-2
                    "
                  >
                    <div>
                      <div class="text-xs font-bold text-blue-700">
                        {{ forecast.key }}
                      </div>

                      <div class="mt-0.5 text-[10px] text-slate-500">
                        {{ forecast.periodLabel }}
                      </div>
                    </div>

                    <div
                      class="
                        text-right
                        text-base
                        font-extrabold
                        text-slate-800
                      "
                    >
                      {{ mdfoStore.formatNumber(forecast.total) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- METADATA -->
              <div
                v-if="mdfoStore.excelPreviewSummary.mode === 'ADM'"
                class="
                  mt-2.5
                  grid
                  grid-cols-2
                  gap-x-5
                  gap-y-2
                  rounded-xl
                  bg-slate-50
                  px-3.5
                  py-3
                  lg:grid-cols-4
                "
              >
                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    Customer
                  </div>
                  <div class="mt-0.5 truncate text-xs font-semibold text-slate-700">
                    {{ mdfoStore.excelPreviewSummary.customer || '-' }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    Periode
                  </div>
                  <div class="mt-0.5 text-xs font-semibold text-slate-700">
                    {{ mdfoStore.excelPreviewSummary.periodLabel }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    Revision
                  </div>
                  <div class="mt-0.5 text-xs font-semibold text-slate-700">
                    {{ mdfoStore.excelPreviewSummary.revision }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    Reg No
                  </div>
                  <div
                    class="mt-0.5 truncate text-xs font-semibold text-slate-700"
                    :title="mdfoStore.excelPreviewSummary.regNo"
                  >
                    {{ mdfoStore.excelPreviewSummary.regNo }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    Vendor Code
                  </div>
                  <div
                    class="mt-0.5 truncate text-xs font-semibold text-slate-700"
                    :title="mdfoStore.excelPreviewSummary.vendorCode"
                  >
                    {{ mdfoStore.excelPreviewSummary.vendorCode }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    Vendor Name
                  </div>
                  <div
                    class="mt-0.5 truncate text-xs font-semibold text-slate-700"
                    :title="mdfoStore.excelPreviewSummary.vendorName"
                  >
                    {{ mdfoStore.excelPreviewSummary.vendorName }}
                  </div>
                </div>

                <div class="lg:col-span-2">
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    Vendor Address
                  </div>
                  <div
                    class="mt-0.5 truncate text-xs font-semibold text-slate-700"
                    :title="mdfoStore.excelPreviewSummary.vendorAddress"
                  >
                    {{ mdfoStore.excelPreviewSummary.vendorAddress }}
                  </div>
                </div>
              </div>

              <!-- FTI: metadata gabungan PDF Purchase Order + Forecast + Schedule -->
              <div
                v-else-if="['FTI', 'MES'].includes(mdfoStore.excelPreviewSummary.mode)"
                class="mt-2.5 grid grid-cols-2 gap-x-5 gap-y-2 rounded-xl bg-slate-50 px-3.5 py-3 lg:grid-cols-4"
              >
                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">Periode</div>
                  <div class="mt-0.5 text-xs font-semibold text-slate-700">
                    {{ mdfoStore.excelPreviewSummary.periodLabel }}
                  </div>
                </div>
                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">PO Number</div>
                  <div class="mt-0.5 truncate text-xs font-semibold text-slate-700">
                    {{ (mdfoStore.excelPreviewSummary.poNumbers || []).join(', ') || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">PO Date</div>
                  <div class="mt-0.5 text-xs font-semibold text-slate-700">
                    {{ mdfoStore.excelPreviewSummary.poDate || '-' }}
                  </div>
                </div>
                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">Delivery Date</div>
                  <div class="mt-0.5 text-xs font-semibold text-slate-700">
                    {{ mdfoStore.excelPreviewSummary.deliveryDate || '-' }}
                  </div>
                </div>
                <div class="col-span-2 lg:col-span-4">
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    {{ mdfoStore.excelPreviewSummary.mode === 'MES' ? 'Sumber Data' : '3 Sumber Terdeteksi' }}
                  </div>
                  <div class="mt-0.5 truncate text-xs font-semibold text-emerald-700">
                    {{ mdfoStore.excelPreviewSummary.mode === 'MES' ? 'MANUAL INPUT MES · tanpa file/OCR' : (mdfoStore.excelPreviewSummary.sourceFiles || []).join(' · ') }}
                  </div>
                </div>
              </div>

              <!-- DPM: metadata hasil gabungan PDF -->
              <div
                v-else-if="mdfoStore.excelPreviewSummary.mode === 'DPM'"
                class="
                  mt-2.5
                  grid
                  grid-cols-2
                  gap-x-5
                  gap-y-2
                  rounded-xl
                  bg-slate-50
                  px-3.5
                  py-3
                  lg:grid-cols-4
                "
              >
                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">Plant</div>
                  <div class="mt-0.5 truncate text-xs font-semibold text-slate-700">
                    {{ mdfoStore.excelPreviewSummary.plant || '-' }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">Plant Desc</div>
                  <div
                    class="mt-0.5 truncate text-xs font-semibold text-slate-700"
                    :title="mdfoStore.excelPreviewSummary.plantDesc"
                  >
                    {{ mdfoStore.excelPreviewSummary.plantDesc || '-' }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">Vendor Code</div>
                  <div class="mt-0.5 truncate text-xs font-semibold text-slate-700">
                    {{ mdfoStore.excelPreviewSummary.vendorCode || '-' }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">Vendor Name</div>
                  <div
                    class="mt-0.5 truncate text-xs font-semibold text-slate-700"
                    :title="mdfoStore.excelPreviewSummary.vendorName"
                  >
                    {{ mdfoStore.excelPreviewSummary.vendorName || '-' }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">Periode</div>
                  <div class="mt-0.5 text-xs font-semibold text-slate-700">
                    {{ mdfoStore.excelPreviewSummary.periodLabel }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">PO Number</div>
                  <div
                    class="mt-0.5 truncate text-xs font-semibold text-slate-700"
                    :title="(mdfoStore.excelPreviewSummary.poNumbers || []).join(', ')"
                  >
                    {{ (mdfoStore.excelPreviewSummary.poNumbers || []).join(', ') || '-' }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">PDF Terdeteksi</div>
                  <div class="mt-0.5 text-xs font-semibold text-slate-700">
                    {{ mdfoStore.excelPreviewSummary.totalFiles || 0 }} file
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">Status Mapping</div>
                  <div
                    class="mt-0.5 text-xs font-semibold"
                    :class="
                      (mdfoStore.excelPreviewSummary.unmappedRows || 0) > 0
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    "
                  >
                    {{ mdfoStore.excelPreviewSummary.mappedRows || 0 }} mapped ·
                    {{ mdfoStore.excelPreviewSummary.unmappedRows || 0 }} belum mapped
                  </div>
                </div>

                <div
                  v-if="mdfoStore.dpmPreviewWarnings.length > 0"
                  class="col-span-2 rounded-xl !border !border-amber-200 bg-amber-50 px-3 py-2.5 lg:col-span-4"
                >
                  <div class="text-xs font-bold text-amber-800">
                    {{ mdfoStore.dpmPreviewWarnings.length }} peringatan ditemukan
                  </div>
                  <div class="mt-1 text-[11px] leading-5 text-amber-700">
                    <span
                      v-for="(warning, warningIndex) in mdfoStore.dpmPreviewWarnings.slice(0, 3)"
                      :key="`${warning.source_file}-${warning.material_id}-${warningIndex}`"
                      class="block truncate"
                      :title="warning.description"
                    >
                      {{ warning.material_id || 'Validasi file' }} — {{ warning.description }}
                    </span>
                    <span v-if="mdfoStore.dpmPreviewWarnings.length > 3" class="block font-semibold">
                      dan {{ mdfoStore.dpmPreviewWarnings.length - 3 }} peringatan lainnya.
                    </span>
                  </div>
                </div>
              </div>

              <!-- Customer lain: metadata ringkas untuk crosscheck -->
              <div
                v-else
                class="
                  mt-2.5
                  grid
                  grid-cols-1
                  gap-x-5
                  gap-y-2
                  rounded-xl
                  bg-slate-50
                  px-3.5
                  py-3
                  sm:grid-cols-3
                "
              >
                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    Customer
                  </div>
                  <div class="mt-0.5 whitespace-nowrap text-xs font-semibold text-slate-700">
                    {{ mdfoStore.excelPreviewSummary.customer || mdfoStore.excelPreviewSummary.mode }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    Periode
                  </div>
                  <div class="mt-0.5 whitespace-nowrap text-xs font-semibold text-slate-700">
                    {{ mdfoStore.excelPreviewSummary.periodLabel }}
                  </div>
                </div>

                <div>
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    Revision
                  </div>
                  <div class="mt-0.5 whitespace-nowrap text-xs font-semibold text-slate-700">
                    {{ mdfoStore.excelPreviewSummary.revision }}
                  </div>
                </div>
              </div>
            </section>

            <!-- TABLE TITLE -->
            <div
              class="
                mb-2
                flex
                shrink-0
                flex-wrap
                items-end
                justify-between
                gap-2
              "
            >
              <div>
                <h4 class="text-sm font-bold text-slate-800">
                  Data Preview
                </h4>

                <p class="mt-0.5 text-[11px] text-slate-400">
                  <template v-if="mdfoStore.excelPreviewSummary.mode === 'DPM'">
                    Seluruh PDF di dalam file digabung menjadi satu tabel preview.
                    Kolom sampai ID Material dibekukan saat tabel digeser ke kanan.
                  </template>
                  <template v-else-if="['FTI', 'MES'].includes(mdfoStore.excelPreviewSummary.mode)">
                    <span v-if="mdfoStore.excelPreviewSummary.mode === 'MES'">
                      Data MES berasal dari input manual. Seluruh kolom memakai layout FTI dan memenuhi lebar tabel tanpa freeze pane.
                    </span>
                    <span v-else>
                      Data PDF, Forecast, dan Schedule sudah dicocokkan. Seluruh kolom memenuhi lebar tabel tanpa freeze pane.
                    </span>
                  </template>
                  <template v-else-if="mdfoStore.excelPreviewSummary.customer === 'ASI ADM'">
                    Header MDFO terdeteksi pada baris
                    {{ mdfoStore.excelPreviewDetectedHeaderRow }}.
                    Kolom sampai N+3 dibekukan saat digeser ke kanan.
                    Area tabel dipendekkan agar scrollbar horizontal langsung terlihat.
                  </template>
                  <template v-else-if="mdfoStore.excelPreviewSummary.mode === 'ADM'">
                    Header MDFO terdeteksi pada baris
                    {{ mdfoStore.excelPreviewDetectedHeaderRow }}.
                    Kolom No sampai PO Qty dibekukan saat digeser ke kanan.
                  </template>
                  <template v-else-if="mdfoStore.excelPreviewSummary.mode === 'NTC'">
                    Header MDFO terdeteksi pada baris
                    {{ mdfoStore.excelPreviewDetectedHeaderRow }}.
                    Kolom sampai PROCESS ORDER dibekukan hanya jika tabel perlu digeser ke kanan.
                    Header forecast ditampilkan langsung per bulan tanpa baris FORECAST ORDER.
                  </template>
                  <template v-else-if="mdfoStore.excelPreviewSummary.mode === 'GAYA MOTOR'">
                    Header MDFO terdeteksi pada baris
                    {{ mdfoStore.excelPreviewDetectedHeaderRow }}.
                    Seluruh blok tanggal pada file digabung berdasarkan NO.
                    Kolom sampai N+3 dibekukan saat tabel digeser ke kanan.
                  </template>
                  <template v-else>
                    Header MDFO terdeteksi pada baris
                    {{ mdfoStore.excelPreviewDetectedHeaderRow }}.
                    Kolom pertama sampai DOCK_CD dibekukan saat digeser ke kanan.
                    Lebar kolom tetap menyesuaikan header dan isi data TMMIN.
                  </template>
                </p>
              </div>

              <span class="text-[11px] text-slate-400">
                Maks. 100 baris preview
              </span>
            </div>

            <!-- EMPTY -->
            <div
              v-if="mdfoStore.normalizedExcelPreviewRows.length === 0"
              class="
                flex
                min-h-0
                flex-1
                items-center
                justify-center
                rounded-2xl
                !border
                !border-slate-200
                bg-white
                text-sm
                text-slate-500
              "
            >
              Tidak ada data yang bisa ditampilkan.
            </div>

            <!-- DATA PREVIEW: punya tinggi minimum; body modal juga dapat scroll ke bawah -->
            <div
              v-else
              class="
                relative
                shrink-0
                overflow-auto
                rounded-2xl
                !border
                !border-slate-300
                bg-white
                isolate
              "
              :class="
                mdfoStore.excelPreviewSummary.customer === 'ASI ADM'
                  ? 'min-h-[190px]'
                  : 'min-h-[260px]'
              "
              :style="{
                height:
                  mdfoStore.excelPreviewSummary.customer === 'ASI ADM'
                    ? 'clamp(190px, 26vh, 280px)'
                    : 'clamp(260px, 42vh, 520px)',
                scrollbarGutter:
                  ['FTI', 'MES', 'NTC'].includes(mdfoStore.excelPreviewSummary.mode)
                    ? 'auto'
                    : 'stable',
                WebkitOverflowScrolling: 'touch'
              }"
            >
              <table
                class="
                  table-fixed
                  border-separate
                  border-spacing-0
                  text-xs
                "
                :style="{
                  width:
                    ['FTI', 'MES', 'NTC'].includes(mdfoStore.excelPreviewSummary.mode)
                      ? '100%'
                      : `${mdfoStore.excelPreviewTableWidth}px`,
                  minWidth:
                    ['FTI', 'MES'].includes(mdfoStore.excelPreviewSummary.mode)
                      ? '100%'
                      : `${mdfoStore.excelPreviewTableWidth}px`
                }"
              >
                <colgroup>
                  <col
                    v-for="(width, columnIndex) in mdfoStore.excelPreviewColumnWidths"
                    :key="`preview-col-${columnIndex}`"
                    :style="{
                      width:
                        ['FTI', 'MES'].includes(mdfoStore.excelPreviewSummary.mode)
                          ? `${mdfoStore.getFtiPreviewColumnPercentage(columnIndex)}%`
                          : `${width}px`,
                      minWidth:
                        ['FTI', 'MES'].includes(mdfoStore.excelPreviewSummary.mode)
                          ? '0px'
                          : `${width}px`,
                      maxWidth:
                        ['FTI', 'MES'].includes(mdfoStore.excelPreviewSummary.mode)
                          ? 'none'
                          : `${width}px`
                    }"
                  />
                </colgroup>

                <thead class="relative z-[100]">
                  <tr>
                    <th
                      v-for="(header, headerIndex) in mdfoStore.excelPreviewHeaders"
                      :key="`header-${headerIndex}`"
                      class="
                        box-border
                        whitespace-nowrap
                        px-3
                        py-2.5
                        text-left
                        font-bold
                        text-slate-800
                      "
                      :class="{
                        '!px-2 !text-center':
                          mdfoStore.excelPreviewSummary.mode === 'GAYA MOTOR' &&
                          [0, 5, 6].includes(headerIndex),
                        '!px-1 !text-center':
                          mdfoStore.excelPreviewSummary.mode === 'GAYA MOTOR' &&
                          [7, 8, 9].includes(headerIndex),
                        '!text-center':
                          mdfoStore.excelPreviewSummary.mode === 'NTC'
                      }"
                      :style="
                        mdfoStore.getExcelPreviewCellStyle(
                          headerIndex,
                          true,
                          0
                        )
                      "
                    >
                      {{ header }}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="(row, rowIndex) in mdfoStore.normalizedExcelPreviewRows"
                    :key="`row-${rowIndex}`"
                  >
                    <td
                      v-for="(cell, cellIndex) in row"
                      :key="`cell-${rowIndex}-${cellIndex}`"
                      class="
                        box-border
                        whitespace-nowrap
                        px-3
                        py-2
                        text-slate-700
                      "
                      :class="{
                        '!px-2 !text-center':
                          mdfoStore.excelPreviewSummary.mode === 'GAYA MOTOR' &&
                          [0, 5, 6].includes(cellIndex),
                        '!px-1 !text-center':
                          mdfoStore.excelPreviewSummary.mode === 'GAYA MOTOR' &&
                          [7, 8, 9].includes(cellIndex),
                        '!text-center':
                          mdfoStore.excelPreviewSummary.mode === 'NTC' &&
                          [0, 8].includes(cellIndex),
                        '!text-right':
                          mdfoStore.excelPreviewSummary.mode === 'NTC' &&
                          [4, 5, 7, 9, 10, 11].includes(cellIndex)
                      }"
                      :style="
                        mdfoStore.getExcelPreviewCellStyle(
                          cellIndex,
                          false,
                          rowIndex
                        )
                      "
                    >
                      <div
                        class="whitespace-nowrap"
                        :class="{
                          'w-full text-center':
                            (
                              mdfoStore.excelPreviewSummary.mode === 'GAYA MOTOR' &&
                              [0, 5, 6, 7, 8, 9].includes(cellIndex)
                            ) ||
                            (
                              mdfoStore.excelPreviewSummary.mode === 'NTC' &&
                              [0, 8].includes(cellIndex)
                            ),
                          'w-full text-right':
                            mdfoStore.excelPreviewSummary.mode === 'NTC' &&
                            [4, 5, 7, 9, 10, 11].includes(cellIndex)
                        }"
                        :title="String(cell ?? '')"
                      >
                        {{
                          mdfoStore.getExcelPreviewDisplayValue(
                            cell,
                            cellIndex
                          )
                        }}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <small
              v-if="mdfoStore.excelPreviewSummary.totalRows > 100"
              class="mt-1.5 shrink-0 text-xs text-slate-500"
            >
              Menampilkan 100 dari
              {{ mdfoStore.excelPreviewSummary.totalRows }}
              baris agar preview tetap ringan.
            </small>
          </div>
        </div>

        <!-- FOOTER -->
        <div
          class="
            flex
            shrink-0
            justify-end
            !border-t
            !border-slate-200
            bg-white
            px-6
            py-3
          "
        >
          <button
            type="button"
            class="
              h-10
              min-w-[90px]
              rounded-xl
              !border
              !border-slate-300
              bg-white
              px-4
              text-sm
              font-semibold
              text-slate-700
              transition-all
              hover:!border-slate-400
              hover:bg-slate-100
              active:scale-95
            "
            @click="mdfoStore.closeUploadPreview"
          >
            Close
          </button>
        </div>
      </div>
    </div>
    </Teleport>


    <!-- Raw Files Mdfo -->

    <div class="mb-10 rounded-xl !border !border-gray-200 bg-white p-4 shadow-md">
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="mt-2 text-xl font-bold text-blue-600">Raw Files</h2>

          <p class="mt-2 text-sm text-gray-500">File MDFO Customer</p>

          <p
            v-if="mdfoStore.selectedDownloadCustomers.length > 1"
            class="mt-1 text-xs text-slate-400"
          >
            All Customers menampilkan Raw yang kompatibel; customer lain tetap ikut dokumen dan download.
          </p>
        </div>

        <div class="flex flex-col items-end gap-2">
          <div class="flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap">
            <button
              v-if="mdfoStore.rawDeleteSelectedKeys.size > 0"
              type="button"
              :disabled="mdfoStore.isDeletingRaw"
              class="h-11 shrink-0 rounded-xl !border !border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:!border-slate-300 hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              @click="mdfoStore.clearRawDeleteSelection()"
            >
              Clear Selection
            </button>

            <button
              v-if="mdfoStore.forecastEditCustomer"
              type="button"
              :disabled="!permissions.update || !mdfoStore.canEditForecast"
              :title="mdfoStore.forecastEditButtonTitle"
              class="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl !border !border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-700 shadow-sm transition hover:!border-violet-300 hover:bg-violet-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              @click="mdfoStore.openForecastEdit"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 20h9" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
              </svg>
              <span>Edit Forecast</span>
            </button>

            <details
              ref="rawDeleteDetailsRef"
              class="group relative shrink-0"
              :class="(!permissions.delete || mdfoStore.isDeletingRaw) ? 'pointer-events-none opacity-50' : ''"
              @toggle="handleDeleteDropdownToggle"
            >
              <summary
                class="inline-flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 [&::-webkit-details-marker]:hidden"
              >
                <span>🗑</span>
                <span>Delete</span>
                <svg class="h-4 w-4 transition group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd" />
                </svg>
              </summary>

              <div class="absolute right-0 z-[1200] mt-2 w-64 overflow-hidden rounded-2xl !border !border-slate-200 bg-white p-3 shadow-xl">
                <div class="space-y-2">
                  <button
                    type="button"
                    :disabled="!permissions.delete || mdfoStore.rawDeleteSelectedKeys.size === 0 || mdfoStore.isDeletingRaw"
                    class="flex w-full items-center justify-between rounded-xl !border !border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all hover:!border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 disabled:opacity-70"
                    @click="requestRawLifecycleDelete('SELECTED')"
                  >
                    <span>Delete Selected</span>
                    <span class="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">{{ mdfoStore.rawDeleteSelectedKeys.size }}</span>
                  </button>

                  <button
                    type="button"
                    :disabled="!permissions.delete || mdfoStore.rawDeleteFilteredCount === 0 || mdfoStore.isDeletingRaw"
                    class="flex w-full items-center justify-between rounded-xl !border !border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-600 transition-all hover:!border-red-400 hover:bg-red-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:!border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:opacity-70"
                    @click="requestRawLifecycleDelete('FILTERED')"
                  >
                    <span>Delete Filtered</span>
                    <span class="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-red-600 shadow-sm">{{ mdfoStore.rawDeleteFilteredCount }}</span>
                  </button>
                </div>
              </div>
            </details>

            <button
              type="button"
              :disabled="!permissions.download || !mdfoStore.canDownloadExcel"
              :title="mdfoStore.downloadExcelDescription || 'Download Excel MDFO'"
              @click="mdfoStore.downloadExcel"
              class="inline-flex h-11 shrink-0 items-center gap-3 rounded-xl !bg-green-600 px-4 pr-5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:!bg-green-700 hover:shadow-lg! active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M14.25 2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15A2.25 2.25 0 0 0 6.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25V7.5L14.25 2.25Zm.75 1.81L17.69 6.75H15V4.06ZM8.03 9.72h1.84l1.13 1.91 1.13-1.91h1.84l-2.05 3.14 2.17 3.42h-1.88L11 14.22l-1.21 2.06H7.91l2.17-3.42-2.05-3.14Z"
                  />
                </svg>
              </span>

              <span>{{ mdfoStore.rawDownloadButtonLabel }}</span>
            </button>
          </div>

          <p
            v-if="mdfoStore.selectedDownloadCustomers.length > 1 && !mdfoStore.downloadExcelDescription"
            class="mt-2 px-1 text-xs font-medium text-slate-500"
          >
            Semua customer yang dipilih akan didownload dalam satu file ZIP.
          </p>
        </div>
      </div>

      <div v-if="mdfoStore.isLoading" class="rounded-xl bg-blue-50 p-4 text-blue-700 text-sm mb-4">
        Mengambil data MDFO, mohon tunggu...
      </div>


      <!-- Raw Files GAYA MOTOR -->
      <div
        v-if="mdfoStore.isGayaMode"
        class="relative rounded-lg bg-white"
      >
        <!--
          Gaya Motor memakai tampilan tabel yang sama dengan ADM:
          header + filter per kolom + frozen sampai N+3 + pagination tunggal.
          Banner khusus Gaya Motor di atas tabel sengaja dihilangkan.
        -->
        <div
          class="relative isolate max-h-[580px] overflow-auto bg-white"
          @scroll.passive="mdfoStore.closeGayaFilters()"
        >
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{ width: `calc(${mdfoStore.gayaTableWidth} + 48px)` }"
          >
            <thead class="sticky top-0 z-[300] bg-blue-50">
              <tr>
                <th class="delete-checkbox-grid-header w-12 min-w-12 bg-blue-50 text-center align-middle">
                  <input type="checkbox" class="h-4 w-4 cursor-pointer accent-red-600 rounded-md !border !border-gray-400 disabled:cursor-not-allowed disabled:opacity-40" :checked="mdfoStore.isRawDeleteCurrentPageSelected" @change="mdfoStore.toggleRawDeleteCurrentPage()" />
                </th>
                <th
                  v-for="col in mdfoStore.gayaColumns"
                  :key="col.key"
                  class="relative box-border overflow-visible !bg-blue-50 p-2 pt-3 text-center align-top"
                  :style="mdfoStore.getGayaColumnStyle(col, 0, true, false)"
                >
                  <!-- Label seperti header ADM -->
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center overflow-hidden whitespace-pre-line">
                    <div class="flex min-w-0 flex-col items-center justify-center leading-none">
                      <span class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-none text-slate-700">
                        {{ col.label }}
                      </span>
                      <span
                        v-if="col.group === 'day' && col.weekday"
                        class="mt-1 text-[10px] font-semibold text-slate-400"
                      >
                        {{ col.weekday }}
                      </span>
                    </div>
                  </div>

                  <!-- Filter trigger per kolom, sama konsepnya dengan ADM -->
                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="
                      mdfoStore.gayaSelectedFilters[col.key]?.length && !col.numeric
                        ? 'justify-between gap-2'
                        : 'justify-center'
                    "
                    @click.stop="mdfoStore.toggleGayaFilter(col.key, $event)"
                  >
                    <span
                      v-if="!col.numeric && mdfoStore.gayaSelectedFilters[col.key]?.length"
                      class="truncate"
                    >
                      {{ mdfoStore.getGayaSelectedLabel(col.key) }}
                    </span>
                    <span>▾</span>
                  </div>

                  <!-- Reuse popup filter existing yang sama dengan Raw MDFO ADM -->
                  <MdfoFilterPopup
                    :col="{
                      key: col.key,
                      label: col.label
                    }"
                    :store="mdfoStore"
                    mode="gaya"
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, rowIndex) in mdfoStore.gayaPaginatedRows"
                :key="`${row._id || rowIndex}-${row._sourceFileOrder || 0}-${row._sourceRow || 0}`"
                class="odd:bg-white even:bg-gray-50"
              >
                <td class="delete-checkbox-grid-cell h-9 w-12 min-w-12 bg-inherit text-center align-middle">
                  <input type="checkbox" class="h-4 w-4 cursor-pointer accent-red-600 rounded-md !border !border-gray-400 disabled:cursor-not-allowed disabled:opacity-40" :checked="mdfoStore.isRawDeleteRowSelected(row)" @change="mdfoStore.toggleRawDeleteRow(row)" />
                </td>
                <td
                  v-for="col in mdfoStore.gayaColumns"
                  :key="col.key"
                  class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight whitespace-nowrap"
                  :style="mdfoStore.getGayaColumnStyle(col, rowIndex, false, false)"
                  :title="String(row[col.key] ?? '')"
                >
                  <div
                    class="relative z-[1] flex h-full w-full items-center overflow-hidden px-1"
                    :class="col.key === 'partName' ? 'justify-start text-left' : 'justify-center'"
                  >
                    {{ mdfoStore.formatGayaCellValue(col, row[col.key]) }}
                  </div>
                </td>
              </tr>

              <tr v-if="mdfoStore.gayaPaginatedRows.length === 0">
                <td
                  :colspan="Math.max(mdfoStore.gayaColumns.length + 1, 1)"
                  class="p-6 text-center text-gray-400"
                >
                  Data Gaya Motor tidak ditemukan
                </td>
              </tr>
            </tbody>

            <tfoot class="relative z-[200]">
              <tr class="font-bold">
                <td class="delete-checkbox-grid-footer h-10 w-12 min-w-12 bg-blue-100"></td>
                <td
                  v-for="col in mdfoStore.gayaColumns"
                  :key="`gaya-total-${col.key}`"
                  class="h-10 box-border px-1 py-0 text-center text-xs font-extrabold text-slate-900 whitespace-nowrap"
                  :style="mdfoStore.getGayaColumnStyle(col, 0, false, true)"
                >
                  <template v-if="col.key === 'partName'">
                    <span :title="rawTotalScopeTitle">{{ rawTotalLabel }}</span>
                  </template>

                  <template v-else-if="col.total && showRawTotals">
                    {{ mdfoStore.formatGayaTotalValue(mdfoStore.gayaColumnTotals[col.key] || 0) }}
                  </template>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div
          class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div class="flex items-center gap-2 text-sm text-slate-600">
              <span class="font-medium">Show</span>
              <select
                :value="mdfoStore.gayaRowsPerPage"
                class="h-10 min-w-[82px] rounded-xl !border !border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                @change="onGayaRowsPerPageChange"
              >
                <option
                  v-for="option in mdfoStore.rowsPerPageOptions"
                  :key="option"
                  :value="option"
                >
                  {{ option === 0 ? 'All' : option }}
                </option>
              </select>
              <span class="font-medium">records</span>
            </div>

            <div class="text-sm text-slate-600">
              Showing
              <span class="font-bold text-blue-600">{{ mdfoStore.gayaShowingStart }}</span>
              to
              <span class="font-bold text-blue-600">{{ mdfoStore.gayaShowingEnd }}</span>
              of
              <span class="font-bold text-blue-600">{{ mdfoStore.exportRowCount }}</span>
              records
            </div>
          </div>

          <div class="flex min-w-0 items-center justify-start gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              :disabled="mdfoStore.gayaCurrentPage === 1"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="mdfoStore.gayaFirstPage()"
            >‹‹</button>

            <button
              type="button"
              :disabled="mdfoStore.gayaCurrentPage === 1"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="mdfoStore.gayaPrevPage()"
            >‹</button>

            <button
              v-for="pageNumber in mdfoStore.gayaVisiblePages"
              :key="pageNumber"
              type="button"
              class="h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all"
              :class="
                pageNumber === mdfoStore.gayaCurrentPage
                  ? 'border-blue-600! bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)]'
                  : 'border-slate-200! bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
              "
              @click="mdfoStore.gayaCurrentPage = pageNumber"
            >
              {{ pageNumber }}
            </button>

            <button
              type="button"
              :disabled="mdfoStore.gayaCurrentPage === mdfoStore.gayaTotalPages"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="mdfoStore.gayaNextPage()"
            >›</button>

            <button
              type="button"
              :disabled="mdfoStore.gayaCurrentPage === mdfoStore.gayaTotalPages"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="mdfoStore.gayaLastPage()"
            >››</button>
          </div>
        </div>
      </div>

      <!-- Raw Files NTC -->
      <!--
        NTC menggunakan renderer tabel MDFO existing langsung di halaman ini.
        Tidak memakai NtcMdfoTable / NtcMdfoFilterPopup terpisah.
        Kolom tetap berasal dari response NTC agar struktur NTC1/NTC2 fleksibel.
      -->
      <div
        v-else-if="mdfoStore.isNtcMode"
        class="relative rounded-lg bg-white"
      >
        <div
          class="relative isolate max-h-[580px] overflow-auto bg-white"
          @scroll.passive="mdfoStore.closeNtcFilters()"
        >
          <table
            class="relative isolate min-w-full table-fixed border-separate border-spacing-0 !border !border-slate-200 bg-white text-sm"
            :style="{
              width: `calc(${mdfoStore.ntcTableWidth} + 48px)`,
              minWidth: '100%'
            }"
          >
            <thead class="sticky top-0 z-[300] bg-blue-50">
              <tr>
                <th class="delete-checkbox-grid-header w-12 min-w-12 bg-blue-50 text-center align-middle"
                  :class="{ 'fti-checkbox-grid-right': mdfoStore.isFtiMode }">
                  <input type="checkbox" class="h-4 w-4 cursor-pointer accent-red-600 rounded-md !border !border-gray-400 disabled:cursor-not-allowed disabled:opacity-40" :checked="mdfoStore.isRawDeleteCurrentPageSelected" @change="mdfoStore.toggleRawDeleteCurrentPage()" />
                </th>
                <th
                  v-for="col in mdfoStore.ntcColumns"
                  :key="col.key"
                  class="relative box-border overflow-visible !bg-blue-50 p-2 pt-3 text-center align-top"
                  :style="mdfoStore.getNtcColumnStyle(col, 0, true, false, mdfoStore.isLaptopNtcRawFreeze)"
                >
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center overflow-hidden whitespace-pre-line">
                    <span class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-none">
                      {{ col.label }}
                    </span>
                  </div>

                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="
                      mdfoStore.ntcSelectedFilters[col.key]?.length && !col.numeric
                        ? 'justify-between gap-2'
                        : 'justify-center'
                    "
                    @click.stop="mdfoStore.toggleNtcFilter(col.key, $event)"
                  >
                    <span
                      v-if="!col.numeric && mdfoStore.ntcSelectedFilters[col.key]?.length"
                      class="truncate"
                    >
                      {{ mdfoStore.getNtcSelectedLabel(col.key) }}
                    </span>

                    <span>▾</span>
                  </div>

                  <MdfoFilterPopup
                    :col="{
                      key: col.key,
                      label: col.label
                    }"
                    :store="mdfoStore"
                    mode="ntc"
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, rowIndex) in mdfoStore.ntcPaginatedRows"
                :key="`${row._id || rowIndex}-${row._sourceOrder || 0}-${row._sourceRow || 0}`"
                class="odd:bg-white even:bg-gray-50"
              >
                <td class="delete-checkbox-grid-cell h-9 w-12 min-w-12 bg-inherit text-center align-middle"
                  :class="{ 'fti-checkbox-grid-right': mdfoStore.isFtiMode }">
                  <input type="checkbox" class="h-4 w-4 cursor-pointer accent-red-600 rounded-md !border !border-gray-400 disabled:cursor-not-allowed disabled:opacity-40" :checked="mdfoStore.isRawDeleteRowSelected(row)" @change="mdfoStore.toggleRawDeleteRow(row)" />
                </td>
                <td
                  v-for="col in mdfoStore.ntcColumns"
                  :key="col.key"
                  class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight whitespace-nowrap"
                  :style="mdfoStore.getNtcColumnStyle(col, rowIndex, false, false, mdfoStore.isLaptopNtcRawFreeze)"
                  :title="String(row[col.key] ?? '')"
                >
                  <div class="flex h-full w-full items-center justify-center overflow-hidden px-1">
                    <template v-if="col.key === 'no'">
                      {{ mdfoStore.ntcShowingStart + rowIndex }}
                    </template>

                    <template v-else>
                      {{ mdfoStore.formatNtcCellValue(col, row[col.key]) }}
                    </template>
                  </div>
                </td>
              </tr>

              <tr v-if="mdfoStore.ntcPaginatedRows.length === 0">
                <td
                  :colspan="Math.max(mdfoStore.ntcColumns.length + 1, 1)"
                  class="p-6 text-center text-gray-400"
                >
                    Data {{ mdfoStore.isDpmMode ? 'DPM' : mdfoStore.isMesMode ? 'MES' : mdfoStore.isFtiMode ? 'FTI' : 'NTC' }} tidak ditemukan
                </td>
              </tr>
            </tbody>

            <tfoot class="relative z-[200]">
              <tr class="font-bold">
                <td class="delete-checkbox-grid-footer h-10 w-12 min-w-12 bg-blue-100"
                  :class="{ 'fti-checkbox-grid-right': mdfoStore.isFtiMode }"></td>
                <td
                  v-for="col in mdfoStore.ntcColumns"
                  :key="`ntc-total-${col.key}`"
                  class="relative h-10 box-border px-1 py-0 text-center text-xs font-extrabold text-slate-900 whitespace-nowrap"
                  :style="[
                    mdfoStore.getNtcColumnStyle(col, 0, false, true, mdfoStore.isLaptopNtcRawFreeze),
                    mdfoStore.isDpmMode && col.key === 'plant'
                      ? { zIndex: 370, overflow: 'visible' }
                      : {}
                  ]"
                >
                  <template
                    v-if="mdfoStore.isDpmMode && col.key === 'plant'"
                  >
                    <div
                      class="pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center text-sm font-black tracking-wide text-slate-900"
                      :style="{ width: `${mdfoStore.ntcFrozenPaneWidth}px` }"
                    >
                      <span :title="rawTotalScopeTitle">{{ rawTotalLabel }}</span>
                    </div>
                  </template>

                  <template
                    v-else-if="mdfoStore.isFtiMode && col.key === 'partNo'"
                  >
                    <span :title="rawTotalScopeTitle">{{ rawTotalLabel }}</span>
                  </template>

                  <template
                    v-else-if="!mdfoStore.isDpmMode && col.key === 'processOrder'"
                  >
                    <span :title="rawTotalScopeTitle">{{ rawTotalLabel }}</span>
                  </template>

                  <template v-else-if="col.total && showRawTotals">
                    {{ mdfoStore.formatNtcTotalValue(mdfoStore.ntcColumnTotals[col.key] || 0) }}
                  </template>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Pagination NTC mengikuti tampilan pagination Raw MDFO existing. -->
        <div
          class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div class="flex items-center gap-2 text-sm text-slate-600">
              <span class="font-medium">Show</span>

              <select
                :value="mdfoStore.ntcRowsPerPage"
                class="h-10 min-w-[82px] rounded-xl !border !border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                @change="onNtcRowsPerPageChange"
              >
                <option
                  v-for="option in mdfoStore.rowsPerPageOptions"
                  :key="option"
                  :value="option"
                >
                  {{ option === 0 ? 'All' : option }}
                </option>
              </select>

              <span class="font-medium">records</span>
            </div>

            <div class="text-sm text-slate-600">
              Showing
              <span class="font-bold text-blue-600">
                {{ mdfoStore.ntcShowingStart }}
              </span>
              to
              <span class="font-bold text-blue-600">
                {{ mdfoStore.ntcShowingEnd }}
              </span>
              of
              <span class="font-bold text-blue-600">
                {{ mdfoStore.exportRowCount }}
              </span>
              records
            </div>
          </div>

          <div class="flex min-w-0 items-center justify-start gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              :disabled="mdfoStore.ntcCurrentPage === 1"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="mdfoStore.ntcFirstPage()"
            >
              ‹‹
            </button>

            <button
              type="button"
              :disabled="mdfoStore.ntcCurrentPage === 1"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="mdfoStore.ntcPrevPage()"
            >
              ‹
            </button>

            <button
              v-for="pageNumber in mdfoStore.ntcVisiblePages"
              :key="pageNumber"
              type="button"
              class="h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all"
              :class="
                pageNumber === mdfoStore.ntcCurrentPage
                  ? 'border-blue-600! bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)]'
                  : 'border-slate-200! bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
              "
              @click="mdfoStore.ntcCurrentPage = pageNumber"
            >
              {{ pageNumber }}
            </button>

            <button
              type="button"
              :disabled="mdfoStore.ntcCurrentPage === mdfoStore.ntcTotalPages"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="mdfoStore.ntcNextPage()"
            >
              ›
            </button>

            <button
              type="button"
              :disabled="mdfoStore.ntcCurrentPage === mdfoStore.ntcTotalPages"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              @click="mdfoStore.ntcLastPage()"
            >
              ››
            </button>
          </div>
        </div>
      </div>

      <!-- Raw Files TMMIN -->
      <div
        v-else-if="mdfoStore.isTmminMode"
        class="relative rounded-lg bg-white"
      >
        <div class="relative isolate max-h-[580px] overflow-auto bg-white">
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 !border !border-slate-200 bg-white text-sm"
            :style="{
              width: `calc(${mdfoStore.tmminTableWidth} + 48px)`
            }"
          >
            <thead class="sticky top-0 z-[300] bg-blue-50">
              <tr>
                <th class="delete-checkbox-grid-header w-12 min-w-12 bg-blue-50 text-center align-middle">
                  <input type="checkbox" class="h-4 w-4 cursor-pointer accent-red-600 rounded-md !border !border-gray-400 disabled:cursor-not-allowed disabled:opacity-40" :checked="mdfoStore.isRawDeleteCurrentPageSelected" @change="mdfoStore.toggleRawDeleteCurrentPage()" />
                </th>
                <th
                  v-for="col in mdfoStore.tmminDisplayColumns"
                  :key="col.key"
                  class="relative box-border overflow-visible !bg-blue-50 p-2 pt-3 text-center align-top"
                  :style="mdfoStore.getTmminColumnStyle(col, 0, true, false)"
                >
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center overflow-hidden whitespace-pre-line">
                    <span class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-none">
                      {{ col.label }}
                    </span>
                  </div>

                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="
                      mdfoStore.selectedFilters[col.key]?.length && !mdfoStore.hideFilterLabel(col.key)
                        ? 'justify-between gap-2'
                        : 'justify-center'
                    "
                    @click.stop="mdfoStore.toggleDropdown(col.key, $event)"
                  >
                    <span
                      v-if="!mdfoStore.hideFilterLabel(col.key) && mdfoStore.selectedFilters[col.key]?.length"
                      class="truncate"
                    >
                      {{ mdfoStore.getSelectedLabel(col.key) }}
                    </span>

                    <span>▾</span>
                  </div>

                  <MdfoFilterPopup
                    :col="{
                      key: col.key,
                      label: col.label
                    }"
                    :store="mdfoStore"
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, rowIndex) in mdfoStore.tmminPaginatedRows"
                :key="`${row._id || rowIndex}-${row._supplierCode || ''}`"
                class="odd:bg-white even:bg-gray-50"
              >
                <td class="delete-checkbox-grid-cell h-9 w-12 min-w-12 bg-inherit text-center align-middle">
                  <input type="checkbox" class="h-4 w-4 cursor-pointer accent-red-600 rounded-md !border !border-gray-400 disabled:cursor-not-allowed disabled:opacity-40" :checked="mdfoStore.isRawDeleteRowSelected(row)" @change="mdfoStore.toggleRawDeleteRow(row)" />
                </td>
                <td
                  v-for="col in mdfoStore.tmminDisplayColumns"
                  :key="col.key"
                  class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight whitespace-nowrap"
                  :style="mdfoStore.getTmminColumnStyle(col, rowIndex, false, false)"
                  :title="String(row[col.key] ?? '')"
                >
                  <div class="flex h-full w-full items-center justify-center overflow-hidden px-1">
                    {{ mdfoStore.formatTmminCellValue(col, row[col.key]) }}
                  </div>
                </td>
              </tr>

              <tr v-if="mdfoStore.tmminPaginatedRows.length === 0">
                <td
                  :colspan="Math.max(mdfoStore.tmminDisplayColumns.length + 1, 1)"
                  class="p-6 text-center text-gray-400"
                >
                  Data TMMIN tidak ditemukan
                </td>
              </tr>
            </tbody>

            <tfoot>
              <tr class="font-bold">
                <td class="delete-checkbox-grid-footer h-10 w-12 min-w-12 bg-blue-100"></td>
                <td
                  :colspan="mdfoStore.tmminTotalLabelColspan"
                  class="h-10 box-border px-2 py-0 text-center text-sm font-extrabold uppercase tracking-wider text-slate-900 whitespace-nowrap"
                  :style="mdfoStore.getTmminTotalLabelStyle()"
                >
                  <span :title="rawTotalScopeTitle">{{ rawTotalLabel }}</span>
                </td>

                <td
                  v-for="col in mdfoStore.tmminDisplayColumns.slice(mdfoStore.tmminTotalLabelColspan)"
                  :key="`tmmin-total-${col.key}`"
                  class="h-10 box-border px-1 py-0 text-center text-xs font-extrabold text-slate-900 whitespace-nowrap"
                  :style="mdfoStore.getTmminColumnStyle(col, 0, false, true)"
                >
                  <template v-if="col.total && showRawTotals">
                    {{ mdfoStore.formatNumber(mdfoStore.tmminColumnTotals[col.key] || 0) }}
                  </template>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Raw Files ASI ADM: memakai data standard existing, layout khusus hanya di UI. -->
      <div
        v-else-if="mdfoStore.isAsiAdmMode"
        class="relative rounded-lg bg-white"
      >
        <div class="relative isolate max-h-[580px] overflow-auto bg-white">
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{
              width: `calc(${mdfoStore.asiTableWidth} + 48px)`,
              minWidth: `calc(${mdfoStore.asiTableWidth} + 48px)`,
              maxWidth: `calc(${mdfoStore.asiTableWidth} + 48px)`
            }"
          >
            <!--
              Kunci lebar kolom lewat colgroup supaya header, body dan footer
              memakai grid pixel yang sama. Ini mencegah TOTAL bergeser mulai
              Qty/Kanban, N dan kolom setelahnya saat horizontal scroll.
            -->
            <colgroup>
              <col style="width: 48px; min-width: 48px; max-width: 48px" />
              <col
                v-for="col in mdfoStore.asiDisplayColumns"
                :key="`asi-col-${col.key}`"
                :style="{
                  width: col.width,
                  minWidth: col.width,
                  maxWidth: col.width
                }"
              />
              <col
                :style="{
                  width: mdfoStore.dailyTotalWidth,
                  minWidth: mdfoStore.dailyTotalWidth,
                  maxWidth: mdfoStore.dailyTotalWidth
                }"
              />
            </colgroup>

            <!-- ASI ADM hanya memakai SATU row header. -->
            <thead class="sticky top-0 z-[300] bg-blue-50">
              <tr>
                <th class="delete-checkbox-grid-header w-12 min-w-12 bg-blue-50 text-center align-middle">
                  <input type="checkbox" class="h-4 w-4 cursor-pointer accent-red-600 rounded-md !border !border-gray-400 disabled:cursor-not-allowed disabled:opacity-40" :checked="mdfoStore.isRawDeleteCurrentPageSelected" @change="mdfoStore.toggleRawDeleteCurrentPage()" />
                </th>
                <th
                  v-for="col in mdfoStore.asiDisplayColumns"
                  :key="`asi-header-${col.key}`"
                  class="relative box-border overflow-visible !bg-blue-50 p-2 pt-2.5 text-center align-top"
                  :style="mdfoStore.getAsiColumnStyle(col.key, 0, true, false)"
                >
                  <div class="relative z-[1] mb-2 flex min-h-8 w-full flex-col items-center justify-center overflow-hidden">
                    <span class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-tight">
                      {{ col.label }}
                    </span>
                    <span
                      v-if="col.group === 'day' && mdfoStore.getDayHeader(col.key)"
                      class="mt-0.5 text-[10px] font-medium text-slate-500"
                    >
                      {{ mdfoStore.getDayHeader(col.key) }}
                    </span>
                  </div>

                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="
                      mdfoStore.selectedFilters[col.key]?.length && !mdfoStore.hideFilterLabel(col.key)
                        ? 'justify-between gap-2'
                        : 'justify-center'
                    "
                    @click.stop="mdfoStore.toggleDropdown(col.key, $event)"
                  >
                    <span
                      v-if="!mdfoStore.hideFilterLabel(col.key) && mdfoStore.selectedFilters[col.key]?.length"
                      class="truncate"
                    >
                      {{ mdfoStore.getSelectedLabel(col.key) }}
                    </span>
                    <span>▾</span>
                  </div>

                  <MdfoFilterPopup :col="col" :store="mdfoStore" />
                </th>

                <th
                  class="relative box-border overflow-hidden px-1 py-1 text-center align-middle text-xs font-extrabold text-slate-700 whitespace-pre-line"
                  :style="mdfoStore.getDailyTotalHeaderStyle()"
                >
                  Daily<br />
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, rowIndex) in mdfoStore.asiPaginatedRows"
                :key="`asi-${row.partNo}-${row.revision}-${rowIndex}`"
                class="odd:bg-white even:bg-gray-50"
              >
                <td class="delete-checkbox-grid-cell h-9 w-12 min-w-12 bg-inherit text-center align-middle">
                  <input type="checkbox" class="h-4 w-4 cursor-pointer accent-red-600 rounded-md !border !border-gray-400 disabled:cursor-not-allowed disabled:opacity-40" :checked="mdfoStore.isRawDeleteRowSelected(row)" @change="mdfoStore.toggleRawDeleteRow(row)" />
                </td>
                <td
                  v-for="col in mdfoStore.asiDisplayColumns"
                  :key="`asi-${rowIndex}-${col.key}`"
                  class="h-9 box-border overflow-hidden px-1 py-0 align-middle text-xs leading-tight"
                  :class="[
                    col.key === 'partName' ? 'text-left' : 'text-center',
                    mdfoStore.isAsiFrozenColumn(col.key)
                      ? ['whitespace-pre-line', rowIndex % 2 === 0 ? '!bg-white' : '!bg-gray-50']
                      : 'whitespace-nowrap'
                  ]"
                  :style="mdfoStore.getAsiColumnStyle(col.key, rowIndex, false, false)"
                >
                  <div
                    class="relative z-[1] flex h-full w-full items-center overflow-hidden"
                    :class="col.key === 'partName' ? 'justify-start' : 'justify-center'"
                  >
                    {{
                      mdfoStore.formatCellValue(
                        col.key,
                        mdfoStore.getAsiCellValue(row, col.key)
                      )
                    }}
                  </div>
                </td>

                <td
                  class="h-9 box-border overflow-hidden px-2 py-0 text-center align-middle text-xs font-bold whitespace-nowrap"
                  :style="mdfoStore.getDailyTotalBodyStyle(rowIndex)"
                >
                  {{ mdfoStore.formatNumber(mdfoStore.getDailyTotal(row)) }}
                </td>
              </tr>

              <tr v-if="mdfoStore.asiPaginatedRows.length === 0">
                <td
                  :colspan="mdfoStore.asiDisplayColumns.length + 2"
                  class="p-6 text-center text-gray-400"
                  :style="mdfoStore.getEmptyRowStyle()"
                >
                  Data tidak ditemukan
                </td>
              </tr>
            </tbody>

            <tfoot class="relative z-[200]">
              <tr class="font-bold">
                <td class="delete-checkbox-grid-footer h-10 w-12 min-w-12 bg-blue-100"></td>
                <!--
                  Jangan pakai colspan pada footer ASI ADM. Dengan satu cell
                  untuk setiap kolom, garis footer selalu mengikuti header/body
                  secara persis, termasuk Qty/Kanban dan N.
                -->
                <td
                  v-for="(col, footerLabelIndex) in mdfoStore.asiFooterLabelColumns"
                  :key="`asi-footer-label-${col.key}`"
                  class="relative h-10 box-border p-0 text-center text-sm font-extrabold uppercase tracking-wider text-slate-900 whitespace-nowrap"
                  :style="mdfoStore.getAsiFooterLabelCellStyle(col.key, footerLabelIndex)"
                >
                  <div
                    v-if="footerLabelIndex === 0"
                    :style="mdfoStore.getAsiFooterLabelOverlayStyle()"
                    :title="rawTotalScopeTitle"
                  >
                    {{ rawTotalLabel }}
                  </div>
                </td>

                <td
                  v-for="col in mdfoStore.asiFooterTotalColumns"
                  :key="`asi-footer-${col.key}`"
                  class="h-10 box-border px-1 py-0 text-center text-xs font-extrabold text-slate-900 whitespace-nowrap"
                  :style="mdfoStore.getAsiColumnStyle(col.key, 0, false, true)"
                >
                  {{ showRawTotals ? mdfoStore.formatNumber(mdfoStore.asiColumnTotals[col.key] || 0) : '' }}
                </td>

                <td
                  class="h-10 box-border px-1 py-0 text-center text-xs font-extrabold text-slate-900 whitespace-nowrap"
                  :style="mdfoStore.getDailyTotalFooterStyle()"
                >
                  {{ showRawTotals ? mdfoStore.formatNumber(mdfoStore.asiDailyGrandTotal || 0) : '' }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Raw Files ADM -->
      <div
        v-else
        class="relative rounded-lg bg-white"
      >
        
        <!-- Scroll Container -->
        
        <div class="relative isolate max-h-[580px] overflow-auto bg-white">
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{
              width: `calc(${mdfoStore.tableWidth} + 48px)`
            }"
          >
            
            <!-- Header -->
            
            <thead class="sticky top-0 z-[300] bg-blue-50">
              
              <!-- Header Row 1 -->
              
              <tr>
                <th
                  rowspan="2"
                  class="delete-checkbox-grid-header w-12 min-w-12 bg-blue-50 text-center align-middle"
                >
                  <input type="checkbox" class="h-4 w-4 cursor-pointer accent-red-600 rounded-md !border !border-gray-400 disabled:cursor-not-allowed disabled:opacity-40" :checked="mdfoStore.isRawDeleteCurrentPageSelected" @change="mdfoStore.toggleRawDeleteCurrentPage()" />
                </th>
                
                <!-- Fixed / Frozen -->
                
                <th
                  v-for="col in mdfoStore.fixedColumns"
                  :key="col.key"
                  rowspan="2"
                  class="relative box-border border border-gray-200 overflow-visible !bg-blue-50 p-2 pt-3 text-center align-top whitespace-pre-line"
                  :style="mdfoStore.getColumnStyle(col.key, true)"
                >
                  <!-- Label -->
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center gap-1 overflow-hidden whitespace-pre-line">
                    <span class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-none">
                      {{ col.label }}
                    </span>
                  </div>

                  <!-- Filter Trigger -->
                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="
                      mdfoStore.selectedFilters[col.key]?.length && !mdfoStore.hideFilterLabel(col.key)
                        ? 'justify-between gap-2'
                        : 'justify-center'
                    "
                    @click.stop="mdfoStore.toggleDropdown(col.key, $event)"
                  >
                    <span v-if="!mdfoStore.hideFilterLabel(col.key) && mdfoStore.selectedFilters[col.key]?.length" class="truncate">
                      {{ mdfoStore.getSelectedLabel(col.key) }}
                    </span>

                    <span>▾</span>
                  </div>

                  <MdfoFilterPopup :col="col" :store="mdfoStore" />
                </th>

                
                <!-- Day Columns -->
                <!-- Header Row 1 -->
                
                <th
                  v-for="col in mdfoStore.dayColumns"
                  :key="col.key"
                  class="relative box-border overflow-visible !bg-blue-50 p-2 pt-3 text-center align-top"
                  :style="mdfoStore.getColumnStyle(col.key, true)"
                >
                  <!-- Day Number -->
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center gap-1 overflow-hidden">
                    <span class="text-xs font-semibold leading-none">
                      {{ col.label }}
                    </span>
                  </div>

                  <!-- Filters -->
                  <div
                    class="relative z-[1] flex cursor-pointer items-center justify-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    @click.stop="mdfoStore.toggleDropdown(col.key, $event)"
                  >
                    <span>▾</span>
                  </div>

                  <MdfoFilterPopup :col="col" :store="mdfoStore" />
                </th>

                
                <!-- Daily Total Header -->
                
                <th
                  rowspan="2"
                  class="relative box-border overflow-hidden px-1 py-1 text-center align-middle text-xs font-extrabold text-slate-700 whitespace-pre-line"
                  :style="mdfoStore.getDailyTotalHeaderStyle()"
                >
                  Daily<br />
                  Total
                </th>
              </tr>

              
              <!-- Header Row 2 -->
              <!-- Day Name -->
              
              <tr>
                <th
                  v-for="col in mdfoStore.dayColumns"
                  :key="`${col.key}-day`"
                  class="box-border border border-gray-200 overflow-hidden !bg-blue-50 px-2 py-2 text-center text-xs font-semibold text-slate-600 whitespace-pre-line"
                  :style="mdfoStore.getColumnStyle(col.key, true, 0, false)"
                >
                  {{ mdfoStore.getDayHeader(col.key) }}
                </th>
              </tr>
            </thead>

            
            <!-- Body -->
            
            <tbody>
              <tr
                v-for="(row, rowIndex) in mdfoStore.paginatedRows"
                :key="`${row.partNo}-${row.uniqueNo}-${row.revision}-${rowIndex}`"
                class="odd:bg-white even:bg-gray-50"
              >
                <td class="delete-checkbox-grid-cell h-9 w-12 min-w-12 bg-inherit text-center align-middle">
                  <input type="checkbox" class="h-4 w-4 cursor-pointer accent-red-600 rounded-md !border !border-gray-400 disabled:cursor-not-allowed disabled:opacity-40" :checked="mdfoStore.isRawDeleteRowSelected(row)" @change="mdfoStore.toggleRawDeleteRow(row)" />
                </td>
                
                <!-- Main Column Cells -->
                
                <td
                  v-for="col in mdfoStore.columns"
                  :key="col.key"
                  class="h-9 box-border border border-gray-200 overflow-hidden px-1 py-0 align-middle text-xs leading-tight"
                  :class="[
                    col.key === 'partName' ? 'text-left' : 'text-center',

                    mdfoStore.isFrozenColumn(col.key)
                      ? ['whitespace-pre-line', rowIndex % 2 === 0 ? '!bg-white' : '!bg-gray-50']
                      : 'whitespace-nowrap'
                  ]"
                  :style="mdfoStore.getColumnStyle(col.key, false, rowIndex)"
                >
                  <div
                    class="relative z-[1] flex h-full w-full items-center overflow-hidden"
                    :class="col.key === 'partName' ? 'justify-start' : 'justify-center'"
                  >
                    {{ mdfoStore.formatCellValue(col.key, row[col.key]) }}
                  </div>
                </td>

                
                <!-- Daily Total Body -->
                
                <td
                  class="h-9 box-border overflow-hidden px-2 py-0 text-center align-middle text-xs font-bold whitespace-nowrap"
                  :style="mdfoStore.getDailyTotalBodyStyle(rowIndex)"
                >
                  {{ mdfoStore.formatNumber(mdfoStore.getDailyTotal(row)) }}
                </td>
              </tr>

              
              <!-- Empty -->
              
              <tr v-if="mdfoStore.paginatedRows.length === 0">
                <td :colspan="mdfoStore.columns.length + 2" class="p-6 text-center text-gray-400" :style="mdfoStore.getEmptyRowStyle()">
                  Data tidak ditemukan
                </td>
              </tr>
            </tbody>

            
            <!-- Footer Total -->
            
            <tfoot class="relative z-[200]">
              <tr class="font-bold">
                <td class="delete-checkbox-grid-footer h-10 w-12 min-w-12 bg-blue-100"></td>
                
                <!-- Total Label -->
                
                
                <!-- Total Label -->
                
                
                <!-- Total Label -->
                
                <td :colspan="mdfoStore.rawFooterLabelColspan" class="h-10 box-border p-0" :style="mdfoStore.getTotalLabelCellStyle()">
                  <div
                    class="text-center text-sm font-extrabold uppercase tracking-wider text-slate-900 whitespace-nowrap"
                    :style="mdfoStore.getTotalLabelStyle()"
                    :title="rawTotalScopeTitle"
                  >
                    {{ rawTotalLabel }}
                  </div>
                </td>

                <!-- Laptop: Qty/Kanban dan PO Number tidak ikut frozen, tetapi tetap dipertahankan sebagai spacer footer. -->
                <td
                  v-for="col in mdfoStore.rawFooterSpacerColumns"
                  :key="`mdfo-footer-spacer-${col.key}`"
                  class="h-10 box-border px-1 py-0 text-center text-xs font-extrabold text-slate-900 whitespace-nowrap"
                  :style="mdfoStore.getFooterColumnStyle(col.key)"
                ></td>
                
                <!-- Column Totals -->
                
                <td
                  v-for="col in mdfoStore.rawFooterTotalColumns"
                  :key="`mdfo-footer-${col.key}`"
                  class="h-10 box-border px-1 py-0 text-center text-xs font-extrabold text-slate-900 whitespace-nowrap"
                  :style="mdfoStore.getFooterColumnStyle(col.key)"
                >
                  {{ showRawTotals ? mdfoStore.formatNumber(mdfoStore.columnTotals[col.key] || 0) : '' }}
                </td>

                
                <!-- Daily Grand Total -->
                
                <td
                  class="h-10 box-border px-1 py-0 text-center text-xs font-extrabold text-slate-900 whitespace-nowrap"
                  :style="mdfoStore.getDailyTotalFooterStyle()"
                >
                  {{ showRawTotals ? mdfoStore.formatNumber(mdfoStore.dailyGrandTotal) : '' }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div
        v-if="!mdfoStore.isNtcMode && !mdfoStore.isGayaMode"
        class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between"
      >
        <!-- Left Info -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <!-- Rows Per Page -->
          <div class="flex items-center gap-2 text-sm text-slate-600">
            <span class="font-medium"> Show </span>

            <select
              v-model.number="mdfoStore.rowsPerPage"
              class="h-10 min-w-[82px] rounded-xl !border !border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option v-for="option in mdfoStore.rowsPerPageOptions" :key="option" :value="option">
                {{ option === 0 ? 'All' : option }}
              </option>
            </select>

            <span class="font-medium"> records </span>
          </div>

          <!-- Showing Info -->
          <div class="text-sm text-slate-600">
            Showing
            <span class="font-bold text-blue-600">
              {{ mdfoStore.activeShowingStart }}
            </span>
            to
            <span class="font-bold text-blue-600">
              {{ mdfoStore.activeShowingEnd }}
            </span>
            of
            <span class="font-bold text-blue-600">
              {{ mdfoStore.exportRowCount }}
            </span>
            records
          </div>
        </div>

        <!-- Right Pagination -->
        <div class="flex min-w-0 items-center justify-start gap-2 overflow-x-auto pb-1">
          <!-- First -->
          <button
            type="button"
            @click="mdfoStore.firstPage"
            :disabled="mdfoStore.currentPage === 1"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
          >
            ‹‹
          </button>

          <!-- Prev -->
          <button
            type="button"
            @click="mdfoStore.prevPage"
            :disabled="mdfoStore.currentPage === 1"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
          >
            ‹
          </button>

          <!-- Page Numbers -->
          <button
            v-for="pageNumber in mdfoStore.activeVisiblePages"
            :key="pageNumber"
            type="button"
            @click="mdfoStore.currentPage = pageNumber"
            :class="[
              pageNumber === mdfoStore.currentPage
                ? 'border-blue-600! bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)]'
                : 'border-slate-200! bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600',
              'h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all'
            ]"
          >
            {{ pageNumber }}
          </button>

          <!-- Next -->
          <button
            type="button"
            @click="mdfoStore.nextPage"
            :disabled="mdfoStore.currentPage === mdfoStore.activeTotalPages"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
          >
            ›
          </button>

          <!-- Last -->
          <button
            type="button"
            @click="mdfoStore.lastPage"
            :disabled="mdfoStore.currentPage === mdfoStore.activeTotalPages"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
          >
            ››
          </button>
        </div>
      </div>
    </div>

    
    <!-- Quotation -->
    


    
<!-- Add Part Modal -->


<div
  v-if="
    quotationStore.showAddPartModal &&
    !mdfoStore.isTmminMode &&
    !mdfoStore.isNtcMode
  "
  class="
    fixed
    inset-0
    z-[12000]
    flex
    items-center
    justify-center
    bg-slate-900/50
    p-6
  "
  @click.self="
    quotationStore.closeAddPartModal()
  "
>
<div
  class="
    relative
    flex
    max-h-[88vh]
    w-full
    max-w-[980px]
    flex-col
    overflow-hidden
    rounded-[28px]
    bg-white
    shadow-[0_30px_80px_rgba(15,23,42,0.28)]
    ring-1
    ring-slate-200/70
  "
>
    
    <!-- Header -->
    

    <div
      class="
        flex
        items-center
        justify-between
        rounded-t-[28px]
        !border-b
        !border-slate-200
        bg-white
        px-6
        py-4
      "
    >
      <div class="min-w-0">
        <h3
          class="
            text-xl
            font-bold
            text-slate-900
          "
        >
          Add Part
        </h3>

        <p
          class="
            mt-1
            text-xs
            text-slate-500
          "
        >
          Add part to Quotation and Contract only.
          Data will not be added to ZSTT.
        </p>
      </div>


      <!-- Close -->

      <button
        type="button"
        title="Close"
        aria-label="Close Add Part"
        class="
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-xl
          !border
          !border-slate-200
          bg-white
          text-slate-400
          transition-all
          duration-200
          hover:!border-red-200
          hover:bg-red-50
          hover:text-red-600
          active:scale-95
        "
        @click.stop="
          quotationStore.closeAddPartModal()
        "
      >
        <svg
          class="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 18 18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>


    
    <!-- Body -->
    

    <div
      class="
  grid
  min-h-0
  flex-1
  grid-cols-1
  gap-x-5
  gap-y-3
  overflow-y-auto
  px-6
  py-4
  sm:grid-cols-2
"
    >
      
      <!-- Customer -->
      

      <div class="relative">
        <label
          class="
            mb-2
            block
            text-sm
            font-semibold
            text-slate-700
          "
        >
          Customer
        </label>


        <button
          type="button"
          :disabled="
            quotationStore.isLoadingAddPartOptions
          "
          class="
            group
            flex
            h-[48px]
            w-full
            items-center
            justify-between
            gap-3
            rounded-2xl
            !border
            !border-solid
            !border-slate-300
            bg-white
            px-4
            text-left
            text-sm
            shadow-[0_2px_8px_rgba(15,23,42,0.04)]
            outline-none
            transition-all
            duration-200
            hover:!border-blue-400
            hover:shadow-[0_5px_16px_rgba(37,99,235,0.10)]
            focus:!border-blue-500
            focus:ring-2
            focus:ring-blue-100
            disabled:cursor-not-allowed
            disabled:bg-slate-50
            disabled:opacity-60
          "
          @click.stop="
            quotationStore.toggleAddPartCustomerDropdown()
          "
        >
          <span
            class="
              min-w-0
              flex-1
              truncate
            "
            :class="
              quotationStore.addPartForm.customer
                ? 'font-medium text-slate-700'
                : 'text-slate-400'
            "
          >
            {{
              quotationStore.addPartForm.customer ||
              'Select Customer'
            }}
          </span>


          <svg
            class="
              h-5
              w-5
              shrink-0
              text-slate-400
              transition-all
              duration-200
              group-hover:text-blue-600
            "
            :class="
              quotationStore.showAddPartCustomerDropdown
                ? 'rotate-180'
                : ''
            "
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="
                M5.23 7.21
                a.75.75 0 0 1 1.06.02
                L10 11.17
                l3.71-3.94
                a.75.75 0 1 1 1.08 1.04
                l-4.25 4.5
                a.75.75 0 0 1-1.08 0
                l-4.25-4.5
                a.75.75 0 0 1 .02-1.06Z
              "
            />
          </svg>
        </button>


        <!-- Customer Dropdown -->

        <div
          v-if="
            quotationStore.showAddPartCustomerDropdown
          "
          class="
            absolute
            left-0
            right-0
            top-[76px]
            z-[13020]
            max-h-[260px]
            overflow-y-auto
            rounded-2xl
            !border
            !border-slate-200
            bg-white
            p-2
            shadow-[0_18px_45px_rgba(15,23,42,0.18)]
            ring-1
            ring-slate-100
          "
          @click.stop
        >
          <button
            v-for="
              customer in
              quotationStore.addPartCustomerOptions
            "
            :key="customer"
            type="button"
            class="
              flex
              w-full
              items-center
              justify-between
              rounded-xl
              px-3
              py-2.5
              text-left
              text-sm
              transition-all
              duration-150
            "
            :class="
              quotationStore.addPartForm.customer === customer
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
            "
            @click.stop="
              quotationStore.selectAddPartCustomer(
                customer
              )
            "
          >
            <span>
              {{ customer }}
            </span>


            <span
              v-if="
                quotationStore.addPartForm.customer ===
                customer
              "
              class="text-xs"
            >
              ✓
            </span>
          </button>


          <div
            v-if="
              quotationStore
                .addPartCustomerOptions
                .length === 0
            "
            class="
              px-3
              py-5
              text-center
              text-sm
              text-slate-400
            "
          >
            Customer tidak ditemukan
          </div>
        </div>
      </div>


      
      <!-- Period -->
      <!-- Model Sama Dengan Header Period Filter -->
      

      <div class="relative">
        <label
          class="
            mb-2
            block
            text-sm
            font-semibold
            text-slate-700
          "
        >
          Quotation / Contract Period
        </label>


        <!-- Period Trigger -->

        <button
          type="button"
          :disabled="
            !quotationStore.addPartForm.customer ||
            quotationStore.isLoadingAddPartOptions
          "
          class="
            group
            flex
            h-[48px]
            w-full
            items-center
            justify-between
            gap-3
            rounded-2xl
            !border
            !border-solid
            !border-slate-300
            bg-white
            px-4
            text-left
            text-sm
            shadow-[0_2px_8px_rgba(15,23,42,0.04)]
            outline-none
            transition-all
            duration-200
            hover:!border-blue-400
            hover:shadow-[0_5px_16px_rgba(37,99,235,0.10)]
            focus:!border-blue-500
            focus:ring-2
            focus:ring-blue-100
            disabled:cursor-not-allowed
            disabled:bg-slate-50
            disabled:opacity-60
          "
          @click.stop="
            quotationStore.toggleAddPartPeriodDropdown()
          "
        >
          <span
            class="
              flex
              min-w-0
              flex-1
              items-center
              gap-2
            "
            :class="
              quotationStore.addPartForm.periode
                ? 'font-medium text-slate-700'
                : 'text-slate-400'
            "
          >
            <!-- Calendar Icon -->

            <svg
              class="
                h-4
                w-4
                shrink-0
              "
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="
                  M6.75 3v2.25
                  M17.25 3v2.25
                  M3.75 9h16.5
                  M5.25 5.25h13.5
                  A1.5 1.5 0 0 1
                  20.25 6.75v12
                  A1.5 1.5 0 0 1
                  18.75 20.25H5.25
                  A1.5 1.5 0 0 1
                  3.75 18.75v-12
                  A1.5 1.5 0 0 1
                  5.25 5.25Z
                "
              />
            </svg>


            <span class="truncate">
              {{
                quotationStore.addPartForm.periode
                  ? quotationStore.formatAddPartPeriod(
                      quotationStore.addPartForm.periode
                    )
                  : 'Select Period'
              }}
            </span>
          </span>


          <svg
            class="
              h-5
              w-5
              shrink-0
              text-slate-400
              transition-all
              duration-200
              group-hover:text-blue-600
            "
            :class="
              quotationStore.showAddPartPeriodDropdown
                ? 'rotate-180'
                : ''
            "
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="
                M5.23 7.21
                a.75.75 0 0 1 1.06.02
                L10 11.17
                l3.71-3.94
                a.75.75 0 1 1 1.08 1.04
                l-4.25 4.5
                a.75.75 0 0 1-1.08 0
                l-4.25-4.5
                a.75.75 0 0 1 .02-1.06Z
              "
            />
          </svg>
        </button>


        
        <!-- Period Calendar Popup -->
        

        <div
          v-if="
            quotationStore.showAddPartPeriodDropdown
          "
          class="
            absolute
            right-0
            top-[76px]
            z-[13030]
            w-[280px]
            rounded-2xl
            !border
            !border-slate-200
            bg-white
            p-4
            shadow-[0_18px_45px_rgba(15,23,42,0.18)]
            ring-1
            ring-slate-100
          "
          @click.stop
        >
          <!-- Month/Year -->

          <label
            class="
              mb-2
              block
              text-sm
              font-semibold
              text-slate-700
            "
          >
            Select month and year
          </label>


          <input
            type="month"
            :value="
              addPartPeriodInputValue
            "
            class="
              h-11
              w-full
              rounded-xl
              !border
              !border-slate-200
              bg-white
              px-3
              text-sm
              font-medium
              text-slate-700
              outline-none
              transition-all
              hover:!border-blue-300
              focus:!border-blue-500
              focus:ring-2
              focus:ring-blue-100
            "
            @change="
              onAddPartPeriodInputChange
            "
          />


          <!-- Available Periods -->

          <div
            v-if="
              quotationStore
                .addPartPeriodOptions
                .length
            "
            class="mt-4"
          >
            <div
              class="
                mb-2
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-slate-400
              "
            >
              Available periods
            </div>


            <div
              class="
                max-h-[190px]
                overflow-y-auto
              "
            >
              <button
                v-for="
                  periode in
                  quotationStore.addPartPeriodOptions
                "
                :key="periode"
                type="button"
                class="
                  flex
                  w-full
                  items-center
                  justify-between
                  rounded-xl
                  px-3
                  py-2.5
                  text-left
                  text-sm
                  transition-all
                  duration-150
                "
                :class="
                  quotationStore.addPartForm.periode === periode
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                "
                @click.stop="
                  quotationStore.selectAddPartPeriod(
                    periode
                  )
                "
              >
                <span>
                  {{
                    quotationStore.formatAddPartPeriod(
                      periode
                    )
                  }}
                </span>


                <span
                  v-if="
                    quotationStore.addPartForm.periode ===
                    periode
                  "
                  class="text-xs"
                >
                  ✓
                </span>
              </button>
            </div>
          </div>


          <!-- Empty Period -->

          <div
            v-else
            class="
              mt-4
              rounded-xl
              bg-slate-50
              px-3
              py-4
              text-center
              text-sm
              text-slate-400
            "
          >
            Periode tidak ditemukan
          </div>
        </div>
      </div>


      
      <!-- Revision -->
      

      <div class="relative">
        <label
          class="
            mb-2
            block
            text-sm
            font-semibold
            text-slate-700
          "
        >
          Revision
        </label>


        <button
          type="button"
          :disabled="
            !quotationStore.addPartForm.customer ||
            !quotationStore.addPartForm.periode ||
            quotationStore.isLoadingAddPartOptions
          "
          class="
            group
            flex
            h-[48px]
            w-full
            items-center
            justify-between
            gap-3
            rounded-2xl
            !border
            !border-solid
            !border-slate-300
            bg-white
            px-4
            text-left
            text-sm
            shadow-[0_2px_8px_rgba(15,23,42,0.04)]
            outline-none
            transition-all
            duration-200
            hover:!border-blue-400
            hover:shadow-[0_5px_16px_rgba(37,99,235,0.10)]
            focus:!border-blue-500
            focus:ring-2
            focus:ring-blue-100
            disabled:cursor-not-allowed
            disabled:bg-slate-50
            disabled:opacity-60
          "
          @click.stop="
            quotationStore.toggleAddPartRevisionDropdown()
          "
        >
          <span
            class="
              min-w-0
              flex-1
              truncate
            "
            :class="
              quotationStore.addPartForm.revision !== ''
                ? 'font-medium text-slate-700'
                : 'text-slate-400'
            "
          >
            {{
              quotationStore.addPartForm.revision !== ''
                ? `Revision ${quotationStore.addPartForm.revision}`
                : 'Select Revision'
            }}
          </span>


          <svg
            class="
              h-5
              w-5
              shrink-0
              text-slate-400
              transition-all
              duration-200
              group-hover:text-blue-600
            "
            :class="
              quotationStore.showAddPartRevisionDropdown
                ? 'rotate-180'
                : ''
            "
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="
                M5.23 7.21
                a.75.75 0 0 1 1.06.02
                L10 11.17
                l3.71-3.94
                a.75.75 0 1 1 1.08 1.04
                l-4.25 4.5
                a.75.75 0 0 1-1.08 0
                l-4.25-4.5
                a.75.75 0 0 1 .02-1.06Z
              "
            />
          </svg>
        </button>


        <!-- Revision Dropdown -->

        <div
          v-if="
            quotationStore.showAddPartRevisionDropdown
          "
          class="
            absolute
            left-0
            right-0
            top-[76px]
            z-[13020]
            max-h-[240px]
            overflow-y-auto
            rounded-2xl
            !border
            !border-slate-200
            bg-white
            p-2
            shadow-[0_18px_45px_rgba(15,23,42,0.18)]
            ring-1
            ring-slate-100
          "
          @click.stop
        >
          <div
            class="
              px-3
              pb-2
              pt-1
              text-[10px]
              font-semibold
              uppercase
              tracking-wide
              text-slate-400
            "
          >
            Available revisions
          </div>


          <button
            v-for="
              revision in
              quotationStore.addPartRevisionOptions
            "
            :key="revision"
            type="button"
            class="
              flex
              w-full
              items-center
              justify-between
              rounded-xl
              px-3
              py-2.5
              text-left
              text-sm
              transition-all
              duration-150
            "
            :class="
              quotationStore.addPartForm.revision === revision
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
            "
            @click.stop="
              quotationStore.selectAddPartRevision(
                revision
              )
            "
          >
            <span>
              Revision {{ revision }}
            </span>


            <span
              v-if="
                quotationStore.addPartForm.revision ===
                revision
              "
              class="text-xs"
            >
              ✓
            </span>
          </button>


          <div
            v-if="
              quotationStore
                .addPartRevisionOptions
                .length === 0
            "
            class="
              px-3
              py-5
              text-center
              text-sm
              text-slate-400
            "
          >
            Revision tidak ditemukan
          </div>
        </div>
      </div>


      
      <!-- Order Quantity -->
      

    
<!-- Default Quantity -->
<div>
  <div class="mb-2 flex items-center justify-between gap-2">
    <label class="block text-sm font-semibold text-slate-700">
      Default Qty
    </label>

    <button
      v-if="quotationStore.addPartDraftCount > 0"
      type="button"
      :disabled="!permissions.create || quotationStore.isSavingAddPart"
      class="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40"
      @click.stop="quotationStore.applyDefaultQtyToAllAddParts()"
    >
      Apply ke semua
    </button>
  </div>

  <input
    v-model="quotationStore.addPartForm.orderQuantity"
    type="number"
    min="0.01"
    step="0.01"
    autocomplete="off"
    placeholder="1"
    class="
      h-[48px]
      w-full
      rounded-2xl
      !border
      !border-solid
      !border-slate-300
      bg-white
      px-4
      text-sm
      font-semibold
      text-slate-700
      outline-none
      transition-all
      hover:!border-blue-400
      focus:!border-blue-500
      focus:ring-2
      focus:ring-blue-100
    "
  />

  <p class="mt-1.5 text-[11px] text-slate-400">
    Default 1. Qty setiap part masih dapat diedit di daftar.
  </p>
</div>

<div class="sm:col-span-2">
  <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
    <div>
      <label class="block text-sm font-semibold text-slate-700">
        Paste Part Number dari Excel
      </label>

      <p class="mt-1 text-[11px] text-slate-400">
        Copy satu kolom Part No lalu paste di sini. Kalau ikut copy Part Name,
        sistem tetap mengambil kolom Part No pertama.
      </p>
    </div>

    <div
      class="rounded-full !border !border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
    >
      <template v-if="quotationStore.addPartDraftCount > 0">
        {{ quotationStore.addPartDraftCount }} Part
      </template>

      <template v-else-if="quotationStore.addPartPasteCandidateCount > 0">
        {{ quotationStore.addPartPasteCandidateCount }} Paste
      </template>

      <template v-else>
        0 Part
      </template>
    </div>
  </div>

  <textarea
    v-model="quotationStore.addPartPasteText"
    :disabled="
      quotationStore.isSavingAddPart ||
      quotationStore.isCheckingAddPartDuplicates
    "
    rows="4"
    placeholder="Paste dari Excel di sini...&#10;&#10;57167-BZ011-00&#10;57168-BZ111-00&#10;57407-BZ060-00"
    class="
      min-h-[105px]
      w-full
      resize-y
      rounded-2xl
      !border
      !border-solid
      !border-slate-300
      bg-slate-50/70
      px-4
      py-3
      font-mono
      text-xs
      uppercase
      text-slate-700
      outline-none
      transition-all
      placeholder:font-sans
      placeholder:normal-case
      placeholder:text-slate-400
      hover:!border-blue-400
      focus:!border-blue-500
      focus:bg-white
      focus:ring-2
      focus:ring-blue-100
      disabled:cursor-not-allowed
      disabled:opacity-60
    "
  />

  <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
    <p class="text-[11px] text-slate-400">
      Paste tetap di kolom ini sampai klik Masukkan ke Daftar.
      Duplicate paste, daftar, dan database otomatis dilewati.
    </p>

    <div class="flex items-center gap-2">
      <!-- CLEAR DATA -->
      <button
        v-if="
          quotationStore.addPartDraftCount > 0 ||
          quotationStore.addPartPasteText.trim() ||
          quotationStore.addPartForm.material.trim() ||
          String(
            quotationStore.addPartForm.remarks ?? ''
          ).trim() ||
          String(
            quotationStore.addPartForm.orderQuantity ?? '1'
          ) !== '1'
        "
        type="button"
        :disabled="
          quotationStore.isSavingAddPart ||
          quotationStore.isCheckingAddPartDuplicates
        "
        class="
          rounded-xl
          !border
          !border-slate-200
          bg-white
          px-3
          py-2
          text-xs
          font-semibold
          text-slate-500
          transition-all
          hover:!border-red-200
          hover:bg-red-50
          hover:text-red-600
          disabled:cursor-not-allowed
          disabled:opacity-40
        "
        @click.stop="quotationStore.clearAddPartData()"
      >
        Clear Data
      </button>

      <!-- MASUKKAN KE DAFTAR -->
      <button
        type="button"
        :disabled="
          quotationStore.isSavingAddPart ||
          quotationStore.isCheckingAddPartDuplicates ||
          !quotationStore.addPartPasteText.trim()
        "
        class="
          inline-flex
          items-center
          justify-center
          gap-2
          rounded-xl
          !border
          !border-blue-200
          bg-blue-50
          px-3
          py-2
          text-xs
          font-semibold
          text-blue-700
          transition-all
          hover:bg-blue-100
          disabled:cursor-not-allowed
          disabled:opacity-40
        "
        @click.stop="
          quotationStore.importAddPartText(
            quotationStore.addPartPasteText
          )
        "
      >
        <svg
          v-if="quotationStore.isCheckingAddPartDuplicates"
          class="h-3.5 w-3.5 animate-spin"
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

        {{
          quotationStore.isCheckingAddPartDuplicates
            ? 'Checking...'
            : 'Masukkan ke Daftar'
        }}
      </button>
    </div>
  </div>
</div>

<!-- Add One by One -->
<div class="sm:col-span-2">
  <label class="mb-2 block text-sm font-semibold text-slate-700">
    Tambah Satu per Satu
  </label>

  <div class="flex gap-2">
    <input
      v-model="quotationStore.addPartForm.material"
      type="text"
      autocomplete="off"
      placeholder="Contoh: 57147-BZ010-00 atau 57147-BZ010-00."
      :disabled="quotationStore.isSavingAddPart"
      class="
        h-[48px]
        min-w-0
        flex-1
        rounded-2xl
        !border
        !border-solid
        !border-slate-300
        bg-white
        px-4
        text-sm
        font-medium
        uppercase
        text-slate-700
        outline-none
        transition-all
        placeholder:normal-case
        placeholder:text-slate-400
        hover:!border-blue-400
        focus:!border-blue-500
        focus:ring-2
        focus:ring-blue-100
        disabled:cursor-not-allowed
        disabled:opacity-60
      "
      @keyup.enter="quotationStore.addSingleAddPartItem()"
    />

    <button
      type="button"
      :disabled="
        quotationStore.isSavingAddPart ||
        !quotationStore.addPartForm.material.trim()
      "
      class="
        inline-flex
        h-[48px]
        shrink-0
        items-center
        gap-2
        rounded-2xl
        bg-blue-600
        px-5
        text-sm
        font-semibold
        text-white
        shadow-sm
        transition-all
        hover:bg-blue-700
        active:scale-95
        disabled:cursor-not-allowed
        disabled:bg-blue-300
      "
      @click.stop="quotationStore.addSingleAddPartItem()"
    >
      <span class="text-lg leading-none">+</span>
      Tambah
    </button>
  </div>
</div>

<!-- Draft List -->
<div class="sm:col-span-2">
  <div class="mb-2 flex items-center justify-between gap-3">
    <div>
      <h4 class="text-sm font-bold text-slate-800">
        Daftar Part yang akan ditambahkan
      </h4>
      <p class="mt-0.5 text-[11px] text-slate-400">
        Titik di akhir adalah bagian Part Number. Jadi
        57147-BZ010-00 dan 57147-BZ010-00. dianggap berbeda.
      </p>
    </div>
  </div>

  <div
    class="overflow-hidden rounded-2xl !border !border-slate-200 bg-white"
  >


   <div
  class="
    max-h-[300px]
    overflow-y-auto
    rounded-2xl
    !border
    !border-slate-200
    bg-white
  "
>
  <!-- Header -->
  <div
    class="
      sticky
      top-0
      z-10
      grid
      grid-cols-[54px_minmax(0,1fr)_120px_56px]
      bg-slate-50
      text-xs
      font-bold
      text-slate-600
    "
  >
    <div
      class="
        !border-r
        !border-slate-200
        px-3
        py-2.5
        text-center
      "
    >
      No
    </div>

    <div
      class="
        !border-r
        !border-slate-200
        px-3
        py-2.5
      "
    >
      Part Number
    </div>

    <div
      class="
        !border-r
        !border-slate-200
        px-3
        py-2.5
        text-center
      "
    >
      Qty
    </div>

    <div
      class="
        px-3
        py-2.5
        text-center
      "
    >
      Hapus
    </div>
  </div>

  <!-- Empty -->
  <div
    v-if="quotationStore.addPartDraftCount === 0"
    class="px-4 py-8 text-center"
  >
    <div class="text-sm font-semibold text-slate-500">
      Belum ada Part Number
    </div>

    <div class="mt-1 text-xs text-slate-400">
      Paste dari Excel atau tambahkan satu per satu.
    </div>
  </div>

  <!-- Rows -->
  <template v-else>
    <div
      v-for="(item, index) in quotationStore.addPartItems"
      :key="item.id"
      class="
        grid
        grid-cols-[54px_minmax(0,1fr)_120px_56px]
        items-start
        !border-t
        !border-slate-100
        bg-white
      "
    >
      <!-- No -->
      <div
        class="
          !border-r
          !border-slate-100
          px-3
          py-3
          text-center
          text-xs
          font-semibold
          text-slate-400
        "
      >
        {{ index + 1 }}
      </div>

      <!-- Part Number -->
      <div
        class="
          min-w-0
          !border-r
          !border-slate-100
          px-3
          py-2
        "
      >
        <input
          v-model="item.material"
          type="text"
          :disabled="quotationStore.isSavingAddPart"
          class="
            h-9
            w-full
            rounded-xl
            !border
            px-3
            text-sm
            font-semibold
            uppercase
            outline-none
            transition-all
            disabled:cursor-not-allowed
            disabled:bg-slate-50
          "
          :class="
            item.error
              ? '!border-red-300 bg-red-50 text-red-700 focus:!border-red-400'
              : '!border-slate-200 bg-white text-slate-700 focus:!border-blue-400'
          "
        />

        <p
          v-if="item.error"
          class="mt-1.5 text-[11px] leading-snug text-red-600"
        >
          {{ item.error }}
        </p>
      </div>

      <!-- Qty -->
      <div
        class="
          !border-r
          !border-slate-100
          px-2
          py-2
        "
      >
        <input
          v-model="item.orderQuantity"
          type="number"
          min="0.01"
          step="0.01"
          :disabled="quotationStore.isSavingAddPart"
          class="
            h-9
            w-full
            rounded-xl
            !border
            !border-slate-200
            bg-white
            px-2
            text-center
            text-sm
            font-semibold
            text-slate-700
            outline-none
            focus:!border-blue-400
            disabled:cursor-not-allowed
            disabled:bg-slate-50
          "
        />
      </div>

      <!-- Hapus -->
      <div
        class="
          flex
          justify-center
          px-2
          py-2
        "
      >
        <button
          type="button"
          title="Hapus part"
          :disabled="quotationStore.isSavingAddPart"
          class="
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-full
            !border
            !border-red-200
            bg-red-50
            text-red-500
            transition-all
            hover:bg-red-100
            hover:text-red-700
            disabled:opacity-40
          "
          @click.stop="
            quotationStore.removeAddPartItem(
              item.id
            )
          "
        >
          ×
        </button>
      </div>
    </div>
  </template>
</div>
  </div>
</div>

<!-- Info -->
<div
  class="
    sm:col-span-2
    rounded-2xl
    !border
    !border-blue-100
    bg-blue-50
    px-4
    py-3
    text-xs
    leading-relaxed
    text-blue-700
  "
>
  Setiap part akan ditambahkan ke Quotation dan Contract memakai Customer,
  Period, dan Revision yang dipilih di atas. Default Qty adalah 1 dan dapat
  diubah per part. Manual Part tidak ditambahkan ke ZSTT.
</div>
    </div>


    
    <!-- Footer -->
    

    <div
      class="
        flex
        items-center
        justify-end
        gap-3
        rounded-b-[28px]
        !border-t
        !border-slate-200
        bg-slate-50/60
        px-6
        py-4
      "
    >
      <!-- Cancel -->

      <button
        type="button"
        :disabled="
          quotationStore.isSavingAddPart
        "
        class="
          h-10
          min-w-[96px]
          rounded-xl
          !border
          !border-slate-300
          bg-white
          px-5
          text-sm
          font-semibold
          text-slate-600
          transition-all
          duration-200
          hover:!border-slate-400
          hover:bg-slate-100
          hover:text-slate-900
          active:scale-95
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
        @click.stop="
          quotationStore.closeAddPartModal()
        "
      >
        Cancel
      </button>


      <!-- Save -->

      <button
        type="button"
        :disabled="
  !permissions.create ||
  quotationStore.isSavingAddPart ||
  quotationStore.isCheckingAddPartDuplicates ||
  quotationStore.addPartSaveCount === 0
"
        class="
          flex
          h-10
          min-w-[115px]
          items-center
          justify-center
          gap-2
          rounded-xl
          bg-blue-600
          px-5
          text-sm
          font-semibold
          text-white
          shadow-[0_3px_6px_rgba(37,99,235,0.30)]
          transition-all
          duration-200
          hover:bg-blue-700
          hover:shadow-[0_5px_10px_rgba(37,99,235,0.35)]
          active:scale-95
          disabled:cursor-not-allowed
          disabled:bg-blue-300
          disabled:shadow-none
        "
        @click.stop="
          quotationStore.saveAddPart()
        "
      >
        <svg
          v-if="
            quotationStore.isSavingAddPart
          "
          class="
            h-4
            w-4
            animate-spin
          "
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
            d="
              M4 12
              a8 8 0 0 1
              8-8
              v4
              a4 4 0 0 0
              -4 4
              H4Z
            "
          />
        </svg>


        <span>
{{
  quotationStore.isSavingAddPart
    ? `Saving ${quotationStore.addPartSaveCurrent}/${quotationStore.addPartSaveTotal}...`
    : `Save ${quotationStore.addPartSaveCount} Part`
}}
</span>
      </button>
    </div>
  </div>
</div>

    <div
      ref="quotationSectionRef"
      class="mb-8 mt-4 bg-white rounded-xl border p-4 shadow-lg"
    >
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="mt-2 text-xl font-bold text-blue-600">
            {{ quotationStore.selectedQuotationTitle }}
          </h2>

          <p class="mt-2 text-sm text-gray-500">
            {{ quotationStore.selectedQuotationDescription }}
          </p>

          
          <!-- Switch Q / Q1 / Q2 / Q3 -->
          
          <div class="mt-4 inline-flex flex-wrap items-center gap-1 rounded-2xl !border !border-blue-100 bg-blue-50 p-1 shadow-inner">
            <button
              v-for="option in quotationStore.quotationModeOptions"
              :key="option.value"
              type="button"
              class="group flex h-8 w-[92px] shrink-0 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition-all duration-200 active:scale-95"
              :class="
                quotationStore.selectedQuotationMode === option.value
                  ? `
                bg-blue-600
                text-white
                shadow-[0_6px_16px_rgba(37,99,235,0.28)]
              `
                  : `
                bg-transparent
                text-blue-700
                hover:bg-white
                hover:shadow-sm
              `
              "
              :title="option.description"
              @click="mdfoStore.setQuotationModeForScope(option.value)"
            >
              <span class="text-xs font-extrabold">
                {{ option.label }}
              </span>

              <span
                v-if="option.forecastLabel"
                class="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                :class="quotationStore.selectedQuotationMode === option.value ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'"
              >
                {{ option.forecastLabel }}
              </span>
            </button>
          </div>
        </div>

        <!-- BAGIAN KANAN: ACTION BUTTON -->
        <div class="mt-3 flex flex-wrap items-center justify-end gap-4">
          <button
            v-if="mdfoStore.canOpenMesZsttEditor"
            type="button"
            :disabled="(!permissions.create && !permissions.update) || mdfoStore.isLoadingMesZsttDraft || mdfoStore.isSubmittingMesZstt"
            class="inline-flex h-11 items-center gap-2 rounded-xl !border !border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 shadow-sm transition hover:!border-indigo-300 hover:bg-indigo-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            @click="mdfoStore.openMesZsttEditor"
          >
            <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-sm">✎</span>
            {{ mdfoStore.isLoadingMesZsttDraft ? 'Loading ZSTT...' : 'Input / Edit ZSTT MES' }}
          </button>

          <details
            ref="quotationDeleteDetailsRef"
            class="group relative"
            :class="(!permissions.delete || quotationStore.isDeleting) ? 'pointer-events-none opacity-50' : ''"
            @toggle="handleDeleteDropdownToggle"
          >
            <summary
              class="inline-flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 [&::-webkit-details-marker]:hidden"
            >
              <span>🗑</span>
              <span>Delete</span>
              <svg class="h-4 w-4 transition group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd" />
              </svg>
            </summary>

            <div class="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl !border !border-slate-200 bg-white p-3 shadow-xl">
              <div class="space-y-2">
                <button
                  type="button"
                  :disabled="!permissions.delete || quotationStore.deleteSelectedIds.size === 0"
                  class="flex w-full items-center justify-between rounded-xl !border !border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all hover:!border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 disabled:opacity-70"
                  @click="quotationStore.requestLifecycleDelete('SELECTED')"
                >
                  <span>Delete Selected</span>
                  <span class="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">{{ quotationStore.deleteSelectedIds.size }}</span>
                </button>

                <button
                  type="button"
                  :disabled="!permissions.delete || quotationStore.filteredRows.length === 0"
                  class="flex w-full items-center justify-between rounded-xl !border !border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-600 transition-all hover:!border-red-400 hover:bg-red-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:!border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:opacity-70"
                  @click="quotationStore.requestLifecycleDelete('FILTERED')"
                >
                  <span>Delete Filtered</span>
                  <span class="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-red-600 shadow-sm">{{ quotationStore.filteredRows.length }}</span>
                </button>
              </div>
            </div>
          </details>

          <!-- Add Part -->

          <button
            v-if="
              quotationStore.selectedQuotationMode !== 'ZSTT' &&
              !mdfoStore.isTmminMode && !mdfoStore.isNtcMode
            "
            type="button"
            :disabled="!permissions.create || quotationStore.isSavingAddPart"
            class="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            @click="quotationStore.openAddPartModal()"
          >
            <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 text-lg"> + </span>

            Add Part
          </button>
          <!-- Download Excel -->
          <button
            type="button"
            :disabled="!permissions.download || !mdfoStore.canDownloadQuotationExcel"
            :title="mdfoStore.downloadQuotationDescription || 'Download Quotation, Contract & ZSTT'"
            class="inline-flex h-11 items-center gap-3 rounded-xl !border !border-green-600 !bg-green-600 px-4 pr-5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:!border-green-700 hover:!bg-green-700 hover:shadow-lg! active:scale-95 disabled:cursor-not-allowed disabled:!border-green-300 disabled:opacity-50"
            @click="mdfoStore.downloadQuotationExcel"
          >
            <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
              <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="
              M14.25 2.25H6.75
              A2.25 2.25 0 0 0 4.5 4.5
              v15
              A2.25 2.25 0 0 0 6.75 21.75
              h10.5
              A2.25 2.25 0 0 0 19.5 19.5
              V7.5
              L14.25 2.25Zm.75 1.81
              2.69 2.69H15V4.06ZM8.03 9.72
              h1.84L11 11.63l1.13-1.91h1.84
              l-2.05 3.14
              2.17 3.42h-1.88
              L11 14.22l-1.21 2.06H7.91
              l2.17-3.42-2.05-3.14Z
            "
                />
              </svg>
            </span>

            <span>{{ mdfoStore.quotationDownloadButtonLabel }}</span>
          </button>

          <!-- Regenerate Quotation -->
          <button
            type="button"
            :disabled="!permissions.update || mdfoStore.isHeavyOperationRunning || !mdfoStore.batchId"
            class="inline-flex h-11 items-center gap-3 rounded-xl !bg-green-600 px-4 pr-5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:!bg-green-700 hover:shadow-lg! active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            @click="regenerateQuotation"
          >
            <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
              <svg
                class="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="
              M4.5 12a7.5 7.5 0 0 1
              12.75-5.303L19.5 9
              M19.5 4.5V9H15
              M19.5 12a7.5 7.5 0 0 1
              -12.75 5.303L4.5 15
              M4.5 19.5V15H9
            "
                />
              </svg>
            </span>

            <span>
              {{
                quotationStore.isGenerating
                  ? 'Generating...'
                  : `Regenerate Quotation
              (${quotationStore.serverPaged ? quotationStore.serverTotal : quotationStore.sortedRows.length})`
              }}
            </span>
          </button>
        </div>
      </div>

      <div v-if="quotationStore.isLoading" class="mb-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
        Mengambil data quotation, mohon tunggu...
      </div>

      <div class="relative rounded-lg bg-white">
        <div class="relative isolate max-h-[580px] overflow-auto bg-white">
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{
              width: `calc(${quotationStore.tableWidth} + 48px)`
            }"
          >
            <thead class="sticky top-0 z-[100] bg-blue-50">
              <!-- Header Nama Kolom -->
              <tr>
                <th
                  rowspan="2"
                  class="delete-checkbox-grid-header w-12 min-w-12 bg-blue-50 text-center align-middle"
                >
                  <input
                    type="checkbox"
                    class="h-4 w-4 cursor-pointer accent-red-600 rounded-md !border !border-gray-400 disabled:cursor-not-allowed disabled:opacity-40"
                    :checked="quotationStore.deleteCurrentPageSelected"
                    aria-label="Pilih semua baris halaman ini"
                    @change="quotationStore.toggleDeleteCurrentPage()"
                  />
                </th>
                <th
                  v-for="col in quotationStore.columns"
                  :key="col.key"
                  class="relative box-border overflow-visible p-2 pt-3 text-center align-top whitespace-pre-line"
                  :style="quotationStore.getColumnStyle(col.key, true, 0, getZsttHeaderBackground(col.key, false), true)"
                >
                  <div class="relative z-[1] mb-2 flex h-8 w-full items-center justify-center overflow-hidden whitespace-pre-line">
                    <span class="block w-full overflow-hidden text-xs font-semibold leading-tight whitespace-pre-line">
                      {{
                        col.key === 'orderQuantity'
                          ? quotationStore.selectedQuotationMode === 'CONTRACT'
                            ? 'Order Quantity'
                            : `Order Quantity (${quotationStore.selectedQuotationModeOption.forecastLabel})`
                          : col.label
                      }}
                    </span>
                  </div>

                  <div
                    class="relative z-[1] flex cursor-pointer items-center justify-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="quotationStore.selectedFilters[col.key]?.length ? 'justify-between gap-2' : 'justify-center'"
                    @click.stop="quotationStore.toggleDropdown(col.key, $event)"
                  >
                    <span v-if="quotationStore.selectedFilters[col.key]?.length" class="truncate">
                      {{ quotationStore.getSelectedLabel(col.key) }}
                    </span>

                    <span>▾</span>
                  </div>

                  <QuotationFilterPopup :col="col" :store="quotationStore" />
                </th>
              </tr>

              <!-- Header Teknis Sap -->
              <tr>
                <th
                  v-for="col in quotationStore.columns"
                  :key="`${col.key}-technical`"
                  class="relative box-border overflow-hidden px-1 py-1 text-center text-[10px] font-semibold text-blue-900 whitespace-nowrap"
                  :style="quotationStore.getColumnStyle(col.key, true, 0, getZsttHeaderBackground(col.key, true), false)"
                >
                  {{ col.technicalLabel }}
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, rowIndex) in quotationStore.paginatedRows"
                :key="`${row.salesDocument}-${row.item}-${row.material}-${rowIndex}`"
                class="odd:bg-white even:bg-gray-50"
              >
                <td class="delete-checkbox-grid-cell h-9 w-12 min-w-12 bg-inherit text-center align-middle">
                  <input
                    type="checkbox"
                    class="h-4 w-4 cursor-pointer accent-red-600 rounded-md !border !border-gray-400 disabled:cursor-not-allowed disabled:opacity-40"
                    :checked="quotationStore.isDeleteRowSelected(row)"
                    aria-label="Pilih baris untuk dihapus"
                    @change="quotationStore.toggleDeleteRow(row)"
                  />
                </td>
                <td
                  v-for="col in quotationStore.columns"
                  :key="col.key"
                  class="h-9 box-border overflow-hidden border-0 px-1 py-0 align-middle text-xs leading-tight whitespace-nowrap"
                  :class="[
                    col.key === 'status' && row[col.key] === 'TRUE' ? 'text-emerald-700 font-bold' : '',

                    col.key === 'status' && row[col.key] === 'FALSE' ? 'text-red-600 font-bold' : '',

                    col.key === 'remarks' ? 'text-left' : 'text-center'
                  ]"
                  :style="quotationStore.getColumnStyle(col.key, false, rowIndex, getZsttBodyBackground(col.key, row, rowIndex))"
                >
                  <div
                    class="relative z-[1] flex h-full w-full items-center overflow-hidden"
                    :class="col.key === 'remarks' ? 'justify-start' : 'justify-center'"
                  >
                    {{ quotationStore.formatCellValue(col.key, row[col.key]) }}
                  </div>
                </td>
              </tr>

              <tr v-if="quotationStore.paginatedRows.length === 0">
                <td
                  :colspan="quotationStore.columns.length + 1"
                  class="p-6 text-center text-gray-400"
                  :style="quotationStore.getEmptyRowStyle()"
                >
                  {{
                    quotationStore.selectedQuotationMode === 'CONTRACT'
                      ? 'Data Contract tidak ditemukan'
                      : quotationStore.selectedQuotationMode === 'ZSTT'
                        ? 'Data ZSTT tidak ditemukan'
                        : 'Data Quotation tidak ditemukan'
                  }}
                </td>
              </tr>
            </tbody>

            <tfoot v-if="quotationStore.selectedQuotationMode === 'ZSTT'" class="relative z-[100]">
              <tr class="font-bold">
                <td class="delete-checkbox-grid-footer h-10 w-12 min-w-12 bg-blue-100"></td>
                <!-- TOTAL DI BAWAH DUA KOLOM FROZEN. Cell ini tetap diam ketika tabel discroll ke kanan. -->
                <td
                  colspan="2"
                  class="h-10 box-border px-3 py-0 text-center text-sm font-extrabold uppercase tracking-wider whitespace-nowrap"
                  :style="
                    quotationStore.getFooterBlockStyle({
                      backgroundColor: '#dbeafe',

                      width: quotationStore.frozenPaneWidth,

                      left: '0px',

                      zIndex: 280,

                      includeLeftBorder: true,

                      includeSeparator: true
                    })
                  "
                >
                  TOTAL
                </td>

                <!-- TOTAL HARIAN. Hanya sticky ke bawah, tidak sticky ke kiri. Jadi tetap bergerak horizontal. -->
                <td
                  v-for="col in quotationStore.zsttDayColumns"
                  :key="`zstt-footer-${col.key}`"
                  class="h-10 box-border px-1 py-0 text-center text-xs font-bold text-slate-800 whitespace-nowrap"
                  :style="
                    quotationStore.getFooterBlockStyle({
                      backgroundColor: '#eff6ff',

                      width: col.width
                    })
                  "
                >
                  {{ quotationStore.formatNumber(quotationStore.zsttColumnTotals[col.key] || 0) }}
                </td>

                <!-- Revision -->
                <td
                  class="h-10 box-border"
                  :style="
                    quotationStore.getFooterBlockStyle({
                      backgroundColor: '#f8fafc',

                      width: '65px'
                    })
                  "
                >
                  &nbsp;
                </td>

                <td
                  class="h-10 box-border px-2 text-center text-xs font-extrabold text-amber-900"
                  :style="
                    quotationStore.getFooterBlockStyle({
                      backgroundColor: '#fef3c7',

                      width: '90px'
                    })
                  "
                >
                  {{ quotationStore.formatNumber(quotationStore.zsttColumnTotals.zsttTotal || 0) }}
                </td>
                <td
                  class="h-10 box-border px-2 text-center text-xs font-extrabold text-violet-900"
                  :style="
                    quotationStore.getFooterBlockStyle({
                      backgroundColor: '#ede9fe',

                      width: '90px'
                    })
                  "
                >
                  {{ quotationStore.formatNumber(quotationStore.zsttColumnTotals.contractTotal || 0) }}
                </td>

                <td
                  class="h-10 box-border px-2 text-center text-xs font-extrabold"
                  :class="quotationStore.zsttOverallStatus === 'TRUE' ? 'text-emerald-800' : 'text-red-700'"
                  :style="
                    quotationStore.getFooterBlockStyle({
                      backgroundColor: quotationStore.zsttOverallStatus === 'TRUE' ? '#d1fae5' : '#fee2e2',

                      width: '80px'
                    })
                  "
                >
                  {{ quotationStore.zsttOverallStatus }}
                </td>
              </tr>
            </tfoot>

            <tfoot v-else class="relative z-[100]">
              <tr v-if="quotationOrderQuantityIndex >= 0" class="font-bold">
                <!-- Kolom checkbox wajib punya footer sendiri agar colspan data
                     tetap sejajar sampai Shipping Point / Remarks paling kanan. -->
                <td class="delete-checkbox-grid-footer h-10 w-12 min-w-12 bg-blue-100"></td>

                <!-- Total Sebelum Order Quantity -->
                <td
                  v-if="quotationOrderQuantityIndex > 0"
                  :colspan="quotationOrderQuantityIndex"
                  class="relative h-10 box-border px-4 py-0 text-center text-sm font-extrabold uppercase tracking-wider whitespace-nowrap overflow-hidden"
                  :style="
                    quotationStore.getFooterBlockStyle({
                      backgroundColor: '#dbeafe',

                      zIndex: 100,

                      includeLeftBorder: true
                    })
                  "
                >
                  <div class="flex h-full w-full items-center justify-center">TOTAL</div>
                </td>

                <!-- Total Order Quantity -->
                <td
                  class="relative h-10 box-border px-1 py-0 text-center text-xs font-extrabold text-slate-900 whitespace-nowrap"
                  :style="
                    quotationStore.getFooterBlockStyle({
                      backgroundColor: '#eff6ff',

                      width: quotationStore.columns[quotationOrderQuantityIndex]?.width || '110px',

                      zIndex: 100
                    })
                  "
                >
                  {{ quotationStore.formatNumber(quotationStore.orderQuantityGrandTotal) }}
                </td>

                <!-- Kolom Setelah Order Quantity -->
                <td
                  v-if="quotationRightFooterColspan > 0"
                  :colspan="quotationRightFooterColspan"
                  class="relative h-10 box-border"
                  :style="
                    quotationStore.getFooterBlockStyle({
                      backgroundColor: '#eff6ff',

                      zIndex: 100
                    })
                  "
                >
                  &nbsp;
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- PAGINATION: sama dengan Raw Files -->
      <div
        class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div class="flex items-center gap-2 text-sm text-slate-600">
            <span class="font-medium"> Show </span>

            <select
              v-model.number="quotationStore.rowsPerPage"
              class="h-10 min-w-[82px] rounded-xl !border !border-slate-200 bg-white-50 px-3 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-blue-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option v-for="option in quotationStore.rowsPerPageOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>

            <span class="font-medium"> records </span>
          </div>

          <div class="text-sm text-slate-600">
            Showing

            <span class="font-bold text-blue-600">
              {{ quotationStore.showingStart }}
            </span>

            to

            <span class="font-bold text-blue-600">
              {{ quotationStore.showingEnd }}
            </span>

            of

            <span class="font-bold text-blue-600">
              {{ quotationStore.serverPaged ? quotationStore.serverTotal : quotationStore.sortedRows.length }}
            </span>

            records
          </div>
        </div>

        <div class="flex min-w-0 items-center justify-start gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            :disabled="quotationStore.currentPage === 1"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            @click="quotationStore.firstPage"
          >
            ‹‹
          </button>

          <button
            type="button"
            :disabled="quotationStore.currentPage === 1"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            @click="quotationStore.prevPage"
          >
            ‹
          </button>

          <button
            v-for="pageNumber in quotationStore.visiblePages"
            :key="pageNumber"
            type="button"
            :class="[
              pageNumber === quotationStore.currentPage
                ? '!border-blue-600 bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)]'
                : '!border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600',
              'h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all'
            ]"
            @click="quotationStore.currentPage = pageNumber"
          >
            {{ pageNumber }}
          </button>

          <button
            type="button"
            :disabled="quotationStore.currentPage === quotationStore.totalPages"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            @click="quotationStore.nextPage"
          >
            ›
          </button>

          <button
            type="button"
            :disabled="quotationStore.currentPage === quotationStore.totalPages"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            @click="quotationStore.lastPage"
          >
            ››
          </button>
        </div>
      </div>
    </div>

    
    <!-- Tracking Quotation / Contract / Zstt -->
    
    <div
      ref="trackingSectionRef"
      class="mb-10 rounded-xl border !border-gray-200 bg-white p-4 shadow-md"
    >
      <!-- Header -->
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="mt-2 text-xl font-bold text-emerald-800">Tracking Upload Quotation, Contract &amp; ZSTT</h2>

          <p class="mt-2 text-sm text-gray-500">Monitoring dan histori upload dokumen hasil generate MDFO</p>
        </div>

        <button
          type="button"
          :disabled="!permissions.update"
          class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl !border px-4 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
          :class="
            mdfoTrackingBulkMode
              ? '!border-emerald-600 bg-emerald-600 text-white shadow-sm'
              : '!border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
          "
          @click="toggleMdfoTrackingBulkMode"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>

          Update Multiple

          <span
            v-if="mdfoTrackingBulkSelectedCount > 0"
            class="rounded-full px-2 py-0.5 text-[10px]"
            :class="mdfoTrackingBulkMode ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'"
          >
            {{ mdfoTrackingBulkSelectedCount }}
          </span>
        </button>
      </div>

      <!-- BULK UPDATE PANEL -->
      <div
        v-if="mdfoTrackingBulkMode"
        class="mb-4 rounded-2xl !border !border-emerald-200 bg-emerald-50/40 p-3"
      >
        <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div class="text-sm font-bold text-emerald-800">
              Isi beberapa Tracking sekaligus
            </div>

            <p class="mt-1 text-[11px] text-slate-500">
              Berlaku untuk Quotation, Contract, dan ZSTT.
              Field yang kosong tidak akan diubah.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm">
              {{ mdfoTrackingBulkSelectedCount }} baris dipilih
            </span>

            <button
              type="button"
              class="h-8 rounded-lg !border !border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              @click="selectMdfoTrackingBulkCurrentPage"
            >
              Pilih Halaman Ini
            </button>

            <button
              type="button"
              class="h-8 rounded-lg !border !border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              @click="selectMdfoTrackingBulkFilteredRows"
            >
              Pilih Semua Hasil Filter
            </button>

            <button
              type="button"
              class="h-8 rounded-lg !border !border-slate-200 bg-white px-3 text-[11px] font-semibold text-red-600 hover:bg-red-50"
              @click="clearMdfoTrackingBulkSelection"
            >
              Clear Pilihan
            </button>

            <details
              ref="trackingDeleteDetailsRef"
              class="group relative"
              @toggle="handleDeleteDropdownToggle"
            >
              <summary
                class="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg bg-red-600 px-3 text-[11px] font-semibold text-white hover:bg-red-700 [&::-webkit-details-marker]:hidden"
              >
                <span>🗑 Delete</span>
                <svg class="h-3.5 w-3.5 transition group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd" />
                </svg>
              </summary>
              <div class="absolute right-0 z-40 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  :disabled="!permissions.delete || mdfoTrackingBulkSelectedCount === 0"
                  class="flex w-full items-center rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  @click="requestTrackingLifecycleDelete('SELECTED')"
                >
                  Delete Selected
                </button>
                <button
                  type="button"
                  :disabled="!permissions.delete"
                  class="flex w-full items-center rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  @click="requestTrackingLifecycleDelete('FILTERED')"
                >
                  Delete Filtered
                </button>
              </div>
            </details>
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
                @click="setMdfoTrackingBulkToday"
              >
                Hari ini
              </button>
            </div>

            <input
              v-model="mdfoTrackingBulkDate"
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
                @click="setMdfoTrackingBulkNow"
              >
                Sekarang
              </button>
            </div>

            <input
              v-model="mdfoTrackingBulkTime"
              type="time"
              step="60"
              class="h-8 w-full rounded-lg !border !border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:!border-emerald-400"
            />
          </div>

          <!-- Nama Upload -->
          <div class="relative rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200">
            <label class="mb-1.5 block text-[10px] font-bold uppercase text-slate-400">
              Nama Upload
            </label>

            <button
              type="button"
              class="flex h-8 w-full items-center justify-between gap-2 rounded-lg !border !border-slate-200 bg-white px-2 text-left text-xs outline-none transition hover:!border-emerald-300 focus:!border-emerald-400"
              @click.stop="toggleMdfoTrackingBulkUserValueDropdown"
            >
              <span
                v-if="mdfoTrackingBulkUser"
                :class="[
                  quotationTrackingStore.userColorClass(mdfoTrackingBulkUser),
                  'inline-flex min-w-[76px] max-w-[calc(100%_-_22px)] items-center justify-center truncate rounded-full !border px-2 py-1 text-[10px] font-medium'
                ]"
              >
                {{ mdfoTrackingBulkUser }}
              </span>

              <span v-else class="truncate text-slate-400">
                Tidak diubah
              </span>

              <span class="shrink-0 text-slate-400">⌄</span>
            </button>

            <div
              v-if="mdfoTrackingBulkUserDropdownOpen"
              class="absolute left-2.5 right-2.5 top-[62px] z-[500] max-h-[250px] overflow-y-auto rounded-xl !border !border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
              @click.stop
            >
              <button
                type="button"
                class="flex h-8 w-full items-center justify-center rounded-lg px-2 text-xs text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                @click="selectMdfoTrackingBulkUserValue('')"
              >
                Tidak diubah
              </button>

              <div class="my-1 !border-t !border-slate-100" />

              <button
                v-for="user in mdfoTrackingVisibleUserOptions"
                :key="user"
                type="button"
                class="flex h-9 w-full items-center rounded-lg px-2 transition hover:bg-slate-50"
                :class="mdfoTrackingBulkUser === user ? 'bg-emerald-50' : 'bg-white'"
                @click="selectMdfoTrackingBulkUserValue(user)"
              >
                <span
                  :class="[
                    quotationTrackingStore.userColorClass(user),
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
              @click.stop="toggleMdfoTrackingBulkStatusValueDropdown"
            >
              <span
                v-if="mdfoTrackingBulkStatusMeta"
                :class="[
                  quotationTrackingStore.statusClass(mdfoTrackingBulkStatusMeta.value),
                  'inline-flex min-w-[92px] max-w-[calc(100%_-_22px)] items-center justify-center truncate rounded-full !border px-2 py-1 text-[10px] font-medium'
                ]"
              >
                {{ mdfoTrackingBulkStatusMeta.label }}
              </span>

              <span v-else class="truncate text-slate-400">
                Tidak diubah
              </span>

              <span class="shrink-0 text-slate-400">⌄</span>
            </button>

            <div
              v-if="mdfoTrackingBulkStatusDropdownOpen"
              class="absolute left-2.5 right-2.5 top-[62px] z-[500] rounded-xl !border !border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
              @click.stop
            >
              <button
                type="button"
                class="flex h-8 w-full items-center justify-center rounded-lg px-2 text-xs text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                @click="selectMdfoTrackingBulkStatusValue('')"
              >
                Tidak diubah
              </button>

              <div class="my-1 !border-t !border-slate-100" />

              <button
                v-for="statusOption in quotationTrackingStore.statusOptions"
                :key="statusOption.value"
                type="button"
                class="flex h-9 w-full items-center rounded-lg px-2 transition hover:bg-slate-50"
                :class="mdfoTrackingBulkStatus === statusOption.value ? 'bg-emerald-50' : 'bg-white'"
                @click="selectMdfoTrackingBulkStatusValue(statusOption.value)"
              >
                <span
                  :class="[
                    quotationTrackingStore.statusClass(statusOption.value),
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
              v-model="mdfoTrackingBulkRemarks"
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
                @click="mdfoTrackingBulkRemarks = 'Sudah upload mentahan'"
              >
                Sudah upload mentahan
              </button>
            </div>
          </div>
        </div>

        <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div
            v-if="mdfoTrackingBulkMessage"
            class="text-[11px] font-medium"
            :class="
              mdfoTrackingBulkMessageType === 'success'
                ? 'text-emerald-700'
                : mdfoTrackingBulkMessageType === 'warning'
                  ? 'text-amber-700'
                  : 'text-red-600'
            "
          >
            {{ mdfoTrackingBulkMessage }}
          </div>

          <div v-else class="text-[11px] text-slate-400">
            Checkbox ada di kolom Tgl Serah saat mode multiple aktif.
          </div>

          <div class="flex items-center gap-3 self-end sm:self-auto">
            <span
              v-if="mdfoTrackingBulkIsApplying"
              class="text-[11px] font-medium text-emerald-700"
            >
              Menyimpan
              {{ mdfoTrackingBulkProgressDone }}
              /
              {{ mdfoTrackingBulkProgressTotal }}
            </span>

            <button
              type="button"
              :disabled="
                !permissions.update ||
                mdfoTrackingBulkIsApplying ||
                mdfoTrackingBulkSelectedCount === 0 ||
                !mdfoTrackingBulkHasChanges
              "
              class="h-9 rounded-xl bg-emerald-600 px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              @click="applyMdfoTrackingBulkUpdate"
            >
              {{
                mdfoTrackingBulkIsApplying
                  ? 'Menyimpan...'
                  : `Terapkan ke ${mdfoTrackingBulkSelectedCount} Baris`
              }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="quotationTrackingStore.isLoading" class="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
        Mengambil data tracking, mohon tunggu...
      </div>

      <!-- Table Area -->
      <div class="relative min-w-0 max-w-full overflow-hidden rounded-lg bg-white">
        <div
          class="relative isolate max-h-[580px] w-full min-w-0 overflow-auto bg-white"
          @scroll.passive="quotationTrackingStore.closeAllPopups()"
        >
          <table
            class="relative isolate table-fixed border-separate border-spacing-0 bg-white text-sm"
            :style="{
              width: quotationTrackingStore.tableWidth
            }"
          >
            <!-- Header -->
            <thead class="sticky top-0 z-[300] bg-emerald-50">
              <tr>
                <th
                  v-for="col in quotationTrackingStore.columns"
                  :key="col.key"
                  class="relative box-border overflow-visible p-2 pt-3 text-center align-top"
                  :style="quotationTrackingStore.getColumnStyle(col.key, true)"
                >
                  <!-- Label -->
                  <div class="relative z-[1] mb-2 flex h-7 w-full items-center justify-center overflow-hidden">
                    <input
                      v-if="mdfoTrackingBulkMode && col.key === 'handoverDate'"
                      type="checkbox"
                      :checked="isMdfoTrackingBulkCurrentPageSelected"
                      class="absolute left-0.5 h-3.5 w-3.5 cursor-pointer rounded-sm !border !border-slate-300 bg-white accent-emerald-600"
                      title="Pilih / lepas semua baris di halaman ini"
                      @click.stop
                      @change="toggleMdfoTrackingBulkCurrentPageSelection"
                    />

                    <span
                      class="block w-full overflow-hidden whitespace-pre-line text-xs font-semibold leading-tight"
                      :class="mdfoTrackingBulkMode && col.key === 'handoverDate' ? 'pl-4' : ''"
                    >
                      {{ col.label }}
                    </span>
                  </div>

                  <!-- Filter Trigger -->
                  <div
                    class="relative z-[1] flex cursor-pointer items-center overflow-hidden rounded !border !border-gray-300 bg-white px-2 py-2 text-xs"
                    :class="quotationTrackingStore.getSelectedLabel(col.key) !== 'All' ? 'justify-between gap-2' : 'justify-center'"
                    @click.stop="quotationTrackingStore.toggleDropdown(col.key, $event)"
                  >
                    <span v-if="quotationTrackingStore.getSelectedLabel(col.key) !== 'All'" class="truncate">
                      {{ quotationTrackingStore.getSelectedLabel(col.key) }}
                    </span>

                    <span>▾</span>
                  </div>

                  <QuotationTrackingFilterPopup :col="col" :store="quotationTrackingStore" />
                </th>
              </tr>
            </thead>

            <!-- Body -->
            <tbody>
              <tr
                v-for="(row, rowIndex) in quotationTrackingStore.paginatedRows"
                :key="row.id"
                class="odd:bg-white even:bg-gray-50"
                :class="mdfoTrackingBulkMode && isMdfoTrackingBulkRowSelected(row.id) ? 'ring-1 ring-inset ring-emerald-200' : ''"
              >
                <td
                  v-for="col in quotationTrackingStore.columns"
                  :key="col.key"
                  class="h-9 box-border overflow-hidden px-1 py-0 text-center align-middle text-xs leading-tight"
                  :style="quotationTrackingStore.getColumnStyle(col.key, false, rowIndex)"
                >
                  <div class="relative z-[1] flex h-full w-full items-center justify-center overflow-hidden whitespace-pre-line">
                    <input
                      v-if="mdfoTrackingBulkMode && col.key === 'handoverDate'"
                      type="checkbox"
                      :checked="isMdfoTrackingBulkRowSelected(row.id)"
                      class="absolute left-0.5 h-3.5 w-3.5 cursor-pointer rounded-sm !border !border-slate-300 bg-white accent-emerald-600"
                      title="Pilih baris ini untuk update multiple"
                      @click.stop
                      @change="toggleMdfoTrackingBulkRow(row.id)"
                    />

                    <!-- Tanggal Upload -->
                    <input
                      v-if="col.key === 'uploadDate'"
                      type="date"
                      :value="row.uploadDate"
                      :disabled="quotationTrackingStore.isCellSaving(row.id, 'uploadDate')"
                      class="mx-1 h-7 w-[calc(100%-8px)] rounded-lg !border !border-slate-200 bg-white px-1 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                      @change="quotationTrackingStore.saveFieldFromEvent(row, 'uploadDate', $event)"
                    />

                    <!-- Jam Upload -->
                    <div v-else-if="col.key === 'uploadTime'" class="flex w-full items-center justify-center gap-1 px-1">
                      <input
                        type="text"
                        inputmode="numeric"
                        maxlength="5"
                        autocomplete="off"
                        placeholder="HH:mm"
                        :value="quotationTrackingStore.getTimeDraft(row)"
                        :disabled="quotationTrackingStore.isCellSaving(row.id, 'uploadTime')"
                        class="h-7 min-w-0 flex-1 rounded-lg !border !border-slate-200 bg-white px-1 text-center text-xs font-medium tabular-nums text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-emerald-400! focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        @input="quotationTrackingStore.updateTimeDraft(row, $event)"
                        @keydown.enter.prevent="quotationTrackingStore.saveTimeDraft(row)"
                        @blur="quotationTrackingStore.saveTimeDraft(row)"
                      />

                      <button
                        type="button"
                        title="
                          Gunakan jam Jakarta sekarang
                        "
                        aria-label="
                          Gunakan jam Jakarta sekarang
                        "
                        :disabled="quotationTrackingStore.isCellSaving(row.id, 'uploadTime')"
                        class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg !border !border-slate-200 bg-white text-slate-500 transition hover:border-emerald-300! hover:bg-emerald-50! hover:text-emerald-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                        @click.prevent.stop="quotationTrackingStore.setTimeNow(row)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="pointer-events-none h-3.5 w-3.5">
                          <circle cx="12" cy="12" r="9" />

                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 2" />
                        </svg>
                      </button>
                    </div>

                    <!-- Nama Upload -->
                    <div v-else-if="col.key === 'uploadBy'" class="relative flex w-full items-center justify-center px-1">
                      <button
                        type="button"
                        :disabled="quotationTrackingStore.isCellSaving(row.id, 'uploadBy')"
                        :class="[
                          row.uploadBy
                            ? quotationTrackingStore.userColorClass(row.uploadBy)
                            : `
                                !border-slate-200
                                bg-white
                                text-slate-400
                                hover:bg-slate-50
                              `,

                          `
                            flex
                            h-6
                            w-[105px]
                            min-w-0
                            items-center
                            justify-between
                            gap-1
                            rounded-full
                            border
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
                        @click.stop="quotationTrackingStore.toggleUploadUserDropdown(row.id, $event)"
                      >
                        <span class="min-w-0 flex-1 truncate text-center">
                          {{ row.uploadBy || 'Pilih Nama' }}
                        </span>

                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          class="h-3 w-3 shrink-0 opacity-70 transition-transform duration-200"
                          :class="quotationTrackingStore.openUploadUserId === row.id ? 'rotate-180' : ''"
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

                      <Teleport to="body">
                        <div
                          v-if="quotationTrackingStore.openUploadUserId === row.id"
                          class="fixed z-[99999] overflow-hidden rounded-xl !border !border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
                          :style="{
                            top: `${quotationTrackingStore.uploadUserPopupPosition.top}px`,

                            left: `${quotationTrackingStore.uploadUserPopupPosition.left}px`,

                            width: `${quotationTrackingStore.uploadUserPopupPosition.width}px`
                          }"
                          @click.stop
                        >
                          <div class="max-h-[220px] overflow-y-auto overscroll-contain pr-0.5">
                            <button
                              type="button"
                              class="flex h-8 w-full items-center justify-center rounded-lg bg-white px-2 text-xs font-normal text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                              @click.stop="quotationTrackingStore.selectUploadUser(row, '')"
                            >
                              Pilih Nama
                            </button>

                            <div class="my-1 border-t !border-slate-100" />

                            <button
                              v-for="user in mdfoTrackingVisibleUserOptions"
                              :key="user"
                              type="button"
                              class="flex h-9 w-full items-center justify-between gap-2 px-2 text-left transition hover:bg-slate-50"
                              :class="row.uploadBy === user ? 'bg-green-50!' : 'bg-white!'"
                              @click.stop="quotationTrackingStore.selectUploadUser(row, user)"
                            >
                              <span
                                :class="[
                                  quotationTrackingStore.userColorClass(user),
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

                              <svg
                                v-if="row.uploadBy === user"
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

                    <!-- Status -->
                    <div v-else-if="col.key === 'status'" class="relative flex w-full items-center justify-center px-1">
                      <button
                        type="button"
                        :disabled="quotationTrackingStore.isCellSaving(row.id, 'status')"
                        :class="[
                          quotationTrackingStore.statusClass(row.status),
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
                        @click.stop="quotationTrackingStore.toggleStatusDropdown(row.id, $event)"
                      >
                        <span class="min-w-0 flex-1 truncate text-center">
                          {{ quotationTrackingStore.statusLabel(row.status) }}
                        </span>

                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          class="h-3 w-3 shrink-0 opacity-70 transition-transform duration-200"
                          :class="quotationTrackingStore.openStatusId === row.id ? 'rotate-180' : ''"
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

                      <Teleport to="body">
                        <div
                          v-if="quotationTrackingStore.openStatusId === row.id"
                          class="fixed z-[99999] overflow-hidden rounded-xl !border !border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
                          :style="{
                            top: `${quotationTrackingStore.statusPopupPosition.top}px`,

                            left: `${quotationTrackingStore.statusPopupPosition.left}px`,

                            width: `${quotationTrackingStore.statusPopupPosition.width}px`
                          }"
                          @click.stop
                        >
                          <div class="max-h-[190px] overflow-y-auto overscroll-contain">
                            <button
                              v-for="statusOption in quotationTrackingStore.statusOptions"
                              :key="statusOption.value"
                              type="button"
                              class="flex h-10 w-full items-center justify-between gap-2 rounded-lg px-3 transition hover:bg-slate-50"
                              :class="row.status === statusOption.value ? 'bg-green-50!' : 'bg-white!'"
                              @click.stop="quotationTrackingStore.selectStatus(row, statusOption.value)"
                            >
                              <span
                                :class="[
                                  quotationTrackingStore.statusClass(statusOption.value),
                                  `
                                    inline-flex
                                    min-w-0
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
                                {{ statusOption.label }}
                              </span>

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

                    <!-- Remarks -->
                    <div v-else-if="col.key === 'remarks'" class="relative flex w-full items-center justify-center px-1">
                      <button
                        type="button"
                        :disabled="quotationTrackingStore.isCellSaving(row.id, 'remarks')"
                        class="flex h-7 w-full min-w-0 items-center gap-2 rounded-lg !border !border-slate-200 bg-white px-2 text-left text-xs font-normal text-slate-700! outline-none transition hover:border-emerald-300! hover:bg-emerald-50! focus:border-emerald-400! focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        :title="row.remarks || 'Klik untuk mengisi remarks'"
                        @click.stop="quotationTrackingStore.toggleRemarksPopup(row, $event)"
                      >
                        <span class="min-w-0 flex-1 truncate" :class="row.remarks ? 'text-slate-700' : 'text-slate-400'">
                          {{ row.remarks || 'Ketik remarks' }}
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

                      <Teleport to="body">
                        <div
                          v-if="
                            quotationTrackingStore.openRemarksId !== null && Number(quotationTrackingStore.openRemarksId) === Number(row.id)
                          "
                          class="remarks-popup-from-right fixed z-[99999] flex max-h-[calc(100vh-24px)] flex-col overflow-hidden rounded-2xl !border !border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.22)]"
                          :style="{
                            top: `${quotationTrackingStore.remarksPopupPosition.top}px`,

                            left: `${quotationTrackingStore.remarksPopupPosition.left}px`,

                            width: `${quotationTrackingStore.remarksPopupPosition.width}px`
                          }"
                          @click.stop
                        >
                          <!-- Header -->
                          <div class="flex items-center justify-between !border-b !border-slate-200 bg-slate-50 px-4 py-3">
                            <div>
                              <h4 class="text-sm font-bold text-slate-800">Detail Remarks</h4>

                              <p class="mt-0.5 text-[10px] text-slate-500">
                                {{ row.customer }}
                                ·
                                {{ quotationTrackingStore.documentTypeLabel(row.documentType) }}
                                ·
                                {{ quotationTrackingStore.getDocumentNumber(row) }}
                              </p>
                            </div>

                            <button
                              type="button"
                              title="Tutup"
                              class="flex h-7 w-7 items-center justify-center rounded-full !border !border-slate-200 bg-white text-slate-400 transition hover:border-red-200! hover:bg-red-50 hover:text-red-500"
                              @click.stop="quotationTrackingStore.cancelRemarks()"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                                <path
                                  stroke-linecap="round"
                                  d="
                                    M6 6l12 12
                                    M18 6L6 18
                                  "
                                />
                              </svg>
                            </button>
                          </div>

                          <!-- Content -->
                          <div class="min-h-0 flex-1 px-4 pb-3 pt-4">
                            <textarea
                              v-model="quotationTrackingStore.activeRemarksDraft"
                              rows="4"
                              maxlength="1000"
                              placeholder="Tuliskan detail remarks..."
                              class="h-[105px] min-h-[90px] max-h-[130px] w-full resize-y rounded-xl !border !border-slate-200 bg-white! px-3 py-2.5 text-left! text-xs leading-relaxed text-slate-800! caret-slate-800 outline-none transition placeholder:text-left! placeholder:text-slate-400 focus:!border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                              @keydown.ctrl.enter.prevent="quotationTrackingStore.saveRemarksPopup(row)"
                              @keydown.meta.enter.prevent="quotationTrackingStore.saveRemarksPopup(row)"
                            />

                            <div class="mt-2 flex flex-wrap items-center gap-1.5">
                              <span class="text-[10px] font-medium text-slate-400">Saran cepat:</span>

                              <button
                                type="button"
                                class="inline-flex h-6 items-center rounded-full !border !border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                @click="quotationTrackingStore.activeRemarksDraft = 'Sudah upload mentahan'"
                              >
                                Sudah upload mentahan
                              </button>
                            </div>

                            <div class="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                              <span> Ctrl + Enter untuk menyimpan </span>

                              <span>
                                {{ quotationTrackingStore.activeRemarksDraft.length }}
                                / 1000
                              </span>
                            </div>
                          </div>

                          <!-- Footer -->
                          <div
                            class="mt-auto flex shrink-0 items-center justify-end gap-2 !border-t !border-slate-200 bg-slate-50 px-3 py-2.5"
                          >
                            <button
                              type="button"
                              class="inline-flex h-8 items-center justify-center rounded-full border !border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition-all duration-200 hover:border-red-300! hover:bg-red-50 hover:text-red-600 active:scale-[0.97] active:bg-red-100"
                              @click.stop="quotationTrackingStore.cancelRemarks()"
                            >
                              Batal
                            </button>

                            <button
                              type="button"
                              :disabled="quotationTrackingStore.isCellSaving(row.id, 'remarks')"
                              class="inline-flex h-8 items-center justify-center rounded-full bg-emerald-600 px-4 text-xs font-semibold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                              @click.stop="quotationTrackingStore.saveRemarksPopup(row)"
                            >
                              {{ quotationTrackingStore.isCellSaving(row.id, 'remarks') ? 'Menyimpan...' : 'Simpan' }}
                            </button>
                          </div>
                        </div>
                      </Teleport>
                    </div>

                    <!-- Chip Pembuat -->
                    <span
                      v-else-if="col.key === 'creatorName' && row.creatorName"
                      :class="[
                        quotationTrackingStore.userColorClass(row.creatorName),
                        `
                          inline-flex
                          min-w-[86px]
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
                      {{ row.creatorName }}
                    </span>

                    <!-- Chip Customer -->
                    <span
                      v-else-if="col.key === 'customer'"
                      :class="[
                        quotationTrackingStore.customerClass(row.customer),
                        `
                          inline-flex
                          min-w-[92px]
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
                      {{ row.customer }}
                    </span>

                    <!-- Chip Jenis Dokumen -->
                    <span
                      v-else-if="col.key === 'documentType'"
                      :class="[
                        quotationTrackingStore.documentTypeClass(row.documentType),
                        `
                          inline-flex
                          min-w-[92px]
                          items-center
                          justify-center
                          rounded-full
                          border
                          px-2
                          py-1
                          text-[10px]
                          font-medium
                        `
                      ]"
                    >
                      {{ quotationTrackingStore.documentTypeLabel(row.documentType) }}
                    </span>

                    <!-- Nomor Dokumen -->
                    <div
                      v-else-if="col.key === 'documentNumber'"
                      class="flex h-full w-full flex-col items-center justify-center overflow-hidden whitespace-pre-line leading-tight"
                      :title="quotationTrackingStore.getDocumentNumber(row)"
                    >
                      {{ quotationTrackingStore.getDocumentNumber(row) || '-' }}
                    </div>

                    <!-- Cell Biasa -->
                    <span
                      v-else
                      class="block w-full overflow-hidden whitespace-pre-line"
                      :class="mdfoTrackingBulkMode && col.key === 'handoverDate' ? 'pl-4' : ''"
                      :title="quotationTrackingStore.formatCellValue(row, col.key)"
                    >
                      {{ quotationTrackingStore.formatCellValue(row, col.key) }}
                    </span>
                  </div>
                </td>
              </tr>

              <tr v-if="quotationTrackingStore.paginatedRows.length === 0">
                <td
                  :colspan="quotationTrackingStore.columns.length"
                  class="p-6 text-center text-gray-400"
                  :style="quotationTrackingStore.getEmptyRowStyle()"
                >
                  Data Tracking Quotation, Contract, dan ZSTT tidak ditemukan
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div
        class="mt-6 flex flex-col gap-4 rounded-3xl !border !border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div class="flex items-center gap-2 text-sm text-slate-600">
            <span class="font-medium"> Show </span>

            <select
              v-model.number="quotationTrackingStore.rowsPerPage"
              class="h-10 min-w-[82px] rounded-xl !border !border-slate-200 bg-white-50 px-3 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-emerald-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            >
              <option v-for="option in quotationTrackingStore.rowsPerPageOptions" :key="option" :value="option">
                {{ option === 0 ? 'All' : option }}
              </option>
            </select>

            <span class="font-medium"> records </span>
          </div>

          <div class="text-sm text-slate-600">
            Showing

            <span class="font-bold text-emerald-600">
              {{ quotationTrackingStore.showingStart }}
            </span>

            to

            <span class="font-bold text-emerald-600">
              {{ quotationTrackingStore.showingEnd }}
            </span>

            of

            <span class="font-bold text-emerald-600">
              {{ quotationTrackingStore.serverPaged ? quotationTrackingStore.serverTotal : quotationTrackingStore.sortedRows.length }}
            </span>

            records
          </div>
        </div>

        <div class="flex min-w-0 items-center justify-start gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            :disabled="quotationTrackingStore.currentPage === 1"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
            @click="quotationTrackingStore.firstPage()"
          >
            ‹‹
          </button>

          <button
            type="button"
            :disabled="quotationTrackingStore.currentPage === 1"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
            @click="quotationTrackingStore.prevPage()"
          >
            ‹
          </button>

          <button
            v-for="pageNumber in quotationTrackingStore.visiblePages"
            :key="pageNumber"
            type="button"
            class="h-10 min-w-10 shrink-0 rounded-xl !border px-3 text-sm font-semibold transition-all"
            :class="
              pageNumber === quotationTrackingStore.currentPage
                ? `
                    !border-emerald-600
                    !bg-emerald-600
                    text-white
                    shadow-[0_8px_18px_rgba(5,150,105,0.28)]
                  `
                : `
                    !border-slate-200
                    bg-white
                    text-slate-700
                    hover:border-emerald-300
                    hover:bg-emerald-50
                    hover:text-emerald-600
                  `
            "
            @click="quotationTrackingStore.currentPage = pageNumber"
          >
            {{ pageNumber }}
          </button>

          <button
            type="button"
            :disabled="quotationTrackingStore.currentPage === quotationTrackingStore.totalPages"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
            @click="quotationTrackingStore.nextPage()"
          >
            ›
          </button>

          <button
            type="button"
            :disabled="quotationTrackingStore.currentPage === quotationTrackingStore.totalPages"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
            @click="quotationTrackingStore.lastPage()"
          >
            ››
          </button>
        </div>
      </div>
    </div>


  <!-- ========================================================= -->
  <!-- EDIT FORECAST FTI / MES - REVISION TETAP                 -->
  <!-- ========================================================= -->
  <Teleport to="body">
    <div
      v-if="mdfoStore.showForecastEditModal"
      class="fixed inset-0 z-[90000] isolate flex items-center justify-center bg-slate-900/55 p-3 sm:p-5"
      @click.self="mdfoStore.closeForecastEdit()"
    >
      <div class="relative z-[1] flex max-h-[92vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div class="flex items-center justify-between gap-4 !border-b !border-violet-200 bg-violet-600 px-5 py-4 sm:px-6">
          <div class="min-w-0">
            <h3 class="truncate text-lg font-bold text-white sm:text-xl">
              Edit Forecast {{ mdfoStore.forecastEditCustomer }}
            </h3>
            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-violet-50">
              <span>{{ mdfoStore.formatPeriodLabel(mdfoStore.forecastEditPeriod) }}</span>
              <span>•</span>
              <span class="rounded-full bg-white/15 px-2 py-0.5 font-bold">
                Revision {{ mdfoStore.forecastEditRevision }} (tetap)
              </span>
            </div>
          </div>
          <button
            type="button"
            :disabled="mdfoStore.isSavingForecastEdit"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full !border !border-violet-200 bg-white/15 text-xl font-bold text-white transition hover:bg-white/25 disabled:opacity-50"
            aria-label="Tutup Edit Forecast"
            @click="mdfoStore.closeForecastEdit()"
          >×</button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          <div class="mb-4 rounded-2xl !border !border-violet-200 bg-violet-50 px-4 py-3 text-xs leading-5 text-violet-800">
            N tetap readonly. Anda dapat mengisi, mengubah, atau mengosongkan N+1 sampai N+3. Menyimpan forecast <b>tidak membuat revision baru</b>; revision saat ini tetap digunakan. Kosong disimpan sebagai belum ada forecast, sedangkan angka 0 tetap disimpan sebagai 0. Setelah disimpan, <b>Quotation Q1 sampai Q3 akan diregenerate otomatis</b>.
          </div>

          <div v-if="mdfoStore.isLoadingForecastEdit" class="rounded-2xl !border !border-blue-200 bg-blue-50 p-5 text-center text-sm font-semibold text-blue-700">
            Memuat data forecast...
          </div>

          <div
            v-else-if="mdfoStore.forecastEditRows.length === 0"
            class="rounded-2xl !border !border-slate-200 bg-white p-8 text-center text-sm text-slate-500"
          >
            Tidak ada Raw MDFO aktif pada Periode dan Revision ini.
          </div>

          <div v-else class="overflow-x-auto rounded-2xl !border !border-slate-200 bg-white">
            <table class="min-w-[900px] w-full border-collapse text-xs">
              <thead class="sticky top-0 z-10 bg-slate-100 text-slate-700">
                <tr>
                  <th class="w-[175px] !border-b !border-r !border-slate-200 px-3 py-3 text-left font-bold">Part No</th>
                  <th class="min-w-[260px] !border-b !border-r !border-slate-200 px-3 py-3 text-left font-bold">Part Name</th>
                  <th class="w-[110px] !border-b !border-r !border-slate-200 px-3 py-3 text-center font-bold">N</th>
                  <th class="w-[110px] !border-b !border-r !border-slate-200 px-3 py-3 text-center font-bold">N+1</th>
                  <th class="w-[110px] !border-b !border-r !border-slate-200 px-3 py-3 text-center font-bold">N+2</th>
                  <th class="w-[110px] !border-b !border-slate-200 px-3 py-3 text-center font-bold">N+3</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in mdfoStore.forecastEditRows" :key="row.id" class="hover:bg-violet-50/40">
                  <td class="!border-b !border-r !border-slate-100 px-3 py-2.5 font-semibold text-slate-700">{{ row.partNo }}</td>
                  <td class="!border-b !border-r !border-slate-100 px-3 py-2.5 text-slate-600">{{ row.partName || '-' }}</td>
                  <td class="!border-b !border-r !border-slate-100 p-2">
                    <input :value="row.n" type="number" readonly class="h-9 w-full cursor-not-allowed rounded-lg !border !border-slate-200 bg-slate-100 px-2 text-right text-xs font-semibold text-slate-500 outline-none" />
                  </td>
                  <td class="!border-b !border-r !border-slate-100 p-2">
                    <input v-model.number="row.n1" type="number" min="0" step="1" placeholder="Kosong" class="h-9 w-full rounded-lg !border !border-slate-300 bg-white px-2 text-right text-xs outline-none focus:!border-violet-400 focus:ring-2 focus:ring-violet-100" />
                  </td>
                  <td class="!border-b !border-r !border-slate-100 p-2">
                    <input v-model.number="row.n2" type="number" min="0" step="1" placeholder="Kosong" class="h-9 w-full rounded-lg !border !border-slate-300 bg-white px-2 text-right text-xs outline-none focus:!border-violet-400 focus:ring-2 focus:ring-violet-100" />
                  </td>
                  <td class="!border-b !border-slate-100 p-2">
                    <input v-model.number="row.n3" type="number" min="0" step="1" placeholder="Kosong" class="h-9 w-full rounded-lg !border !border-slate-300 bg-white px-2 text-right text-xs outline-none focus:!border-violet-400 focus:ring-2 focus:ring-violet-100" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 !border-t !border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div class="text-xs text-slate-500">
            {{ mdfoStore.forecastEditRows.length }} part pada scope ini
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              :disabled="mdfoStore.isSavingForecastEdit"
              class="h-10 rounded-xl !border !border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              @click="mdfoStore.closeForecastEdit()"
            >Cancel</button>
            <button
              type="button"
              :disabled="!permissions.update || mdfoStore.isLoadingForecastEdit || mdfoStore.isSavingForecastEdit || mdfoStore.forecastEditRows.length === 0"
              class="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-violet-300"
              @click="mdfoStore.saveForecastEdit()"
            >
              <span v-if="mdfoStore.isSavingForecastEdit">Menyimpan...</span>
              <span v-else>Save Forecast</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ========================================================= -->
  <!-- PREVIEW DELETE RAW MDFO - TABLE                           -->
  <!-- ========================================================= -->
  <Teleport to="body">
    <div
      v-if="mdfoStore.showRawDeletePreviewModal"
      class="fixed inset-0 z-[120000] isolate flex items-center justify-center bg-slate-900/55 p-3 sm:p-5"
      @click.self="mdfoStore.closeRawDeletePreviewModal()"
    >
      <div
        class="relative z-[1] flex max-h-[92vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200"
      >
        <!-- Header -->
        <div class="flex items-center justify-between gap-4 !border-b !border-orange-200 bg-orange-500 px-5 py-4 sm:px-6">
          <div class="min-w-0">
            <h3 class="truncate text-lg font-bold text-white sm:text-xl">
              Preview Delete Raw MDFO
              {{ mdfoStore.rawDeletePreviewMode === 'FILTERED' ? 'Filtered' : 'Selected' }}
            </h3>
            <p class="mt-1 text-xs text-orange-50 sm:text-sm">
              Periksa target dan dampak delete sebelum melanjutkan.
            </p>
          </div>

          <button
            type="button"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full !border !border-orange-200 bg-white/15 text-xl font-bold text-white transition hover:bg-white/25"
            aria-label="Tutup preview delete"
            @click="mdfoStore.closeRawDeletePreviewModal()"
          >
            ×
          </button>
        </div>

        <!-- Content -->
        <div class="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          <!-- Summary -->
          <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div class="rounded-2xl !border !border-emerald-200 bg-emerald-50 p-4">
              <div class="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Target Aman</div>
              <div class="mt-1 text-2xl font-bold text-slate-900">
                {{ mdfoStore.rawDeletePreviewSafe }} / {{ mdfoStore.rawDeletePreviewRequested }}
              </div>
            </div>

            <div class="rounded-2xl !border !border-blue-200 bg-blue-50 p-4">
              <div class="text-[11px] font-bold uppercase tracking-wide text-blue-700">Raw MDFO</div>
              <div class="mt-1 text-2xl font-bold text-slate-900">
                {{ mdfoStore.rawDeletePreviewCounts.raw }}
              </div>
            </div>

            <div class="rounded-2xl !border !border-slate-200 bg-white p-4">
              <div class="text-[11px] font-bold uppercase tracking-wide text-slate-500">Dependency Diblokir</div>
              <div class="mt-1 text-2xl font-bold text-slate-900">
                {{ mdfoStore.rawDeletePreviewProtected }}
              </div>
            </div>

            <div class="rounded-2xl !border !border-amber-200 bg-amber-50 p-4">
              <div class="text-[11px] font-bold uppercase tracking-wide text-amber-700">Warning SAP</div>
              <div class="mt-1 text-2xl font-bold text-slate-900">
                {{ mdfoStore.rawDeletePreviewWarningCount }}
              </div>
            </div>
          </div>

          <!-- Target rows -->
          <div class="mt-5 overflow-hidden rounded-2xl !border !border-slate-200 bg-white">
            <div class="flex flex-wrap items-center justify-between gap-2 !border-b !border-slate-200 px-4 py-3">
              <h4 class="font-bold text-slate-800">Data yang akan dihapus</h4>
              <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {{ mdfoStore.rawDeletePreviewSafe }} target aman
              </span>
            </div>

            <div class="max-h-[290px] overflow-auto">
              <table class="min-w-[900px] w-full border-collapse text-xs sm:text-sm">
                <thead class="sticky top-0 z-[2] bg-slate-100 text-slate-700">
                  <tr>
                    <th class="!border-b !border-r !border-slate-200 px-3 py-2 text-center">No</th>
                    <th class="!border-b !border-r !border-slate-200 px-3 py-2 text-left">Customer</th>
                    <th class="!border-b !border-r !border-slate-200 px-3 py-2 text-center">ID</th>
                    <th class="!border-b !border-r !border-slate-200 px-3 py-2 text-center">Periode</th>
                    <th class="!border-b !border-r !border-slate-200 px-3 py-2 text-left">Part No</th>
                    <th class="!border-b !border-r !border-slate-200 px-3 py-2 text-left">Job No.</th>
                    <th class="!border-b !border-r !border-slate-200 px-3 py-2 text-center">Revision</th>
                    <th class="!border-b !border-slate-200 px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="row in mdfoStore.rawDeletePreviewRows"
                    :key="row.key"
                    class="odd:bg-white even:bg-slate-50"
                  >
                    <td class="!border-b !border-r !border-slate-100 px-3 py-2 text-center">{{ row.no }}</td>
                    <td class="!border-b !border-r !border-slate-100 px-3 py-2 font-semibold text-slate-800">{{ row.customer }}</td>
                    <td class="!border-b !border-r !border-slate-100 px-3 py-2 text-center">{{ row.id }}</td>
                    <td class="!border-b !border-r !border-slate-100 px-3 py-2 text-center">{{ row.periode }}</td>
                    <td class="!border-b !border-r !border-slate-100 px-3 py-2">{{ row.partNo }}</td>
                    <td class="!border-b !border-r !border-slate-100 px-3 py-2">{{ row.jobNo }}</td>
                    <td class="!border-b !border-r !border-slate-100 px-3 py-2 text-center">{{ row.revision }}</td>
                    <td class="!border-b !border-slate-100 px-3 py-2 text-center">
                      <span class="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                        Aman
                      </span>
                    </td>
                  </tr>

                  <tr v-if="mdfoStore.rawDeletePreviewRows.length === 0">
                    <td colspan="8" class="px-4 py-8 text-center text-slate-400">
                      Tidak ada target aman untuk ditampilkan.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              v-if="mdfoStore.rawDeletePreviewHiddenCount > 0"
              class="!border-t !border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500"
            >
              Preview menampilkan 100 row pertama. {{ mdfoStore.rawDeletePreviewHiddenCount }} row lainnya tetap ikut diproses.
            </div>
          </div>

          <!-- Impact -->
          <div class="mt-5 grid gap-5 lg:grid-cols-2">
            <div class="overflow-hidden rounded-2xl !border !border-slate-200 bg-white">
              <div class="!border-b !border-slate-200 px-4 py-3 font-bold text-slate-800">
                Dampak Soft Delete
              </div>
              <table class="w-full border-collapse text-sm">
                <tbody>
                  <tr class="odd:bg-white even:bg-slate-50">
                    <td class="!border-b !border-r !border-slate-100 px-4 py-2.5 font-medium text-slate-600">Raw MDFO</td>
                    <td class="!border-b !border-slate-100 px-4 py-2.5 text-right font-bold">{{ mdfoStore.rawDeletePreviewCounts.raw }}</td>
                  </tr>
                  <tr class="odd:bg-white even:bg-slate-50">
                    <td class="!border-b !border-r !border-slate-100 px-4 py-2.5 font-medium text-slate-600">Quotation</td>
                    <td class="!border-b !border-slate-100 px-4 py-2.5 text-right font-bold">{{ mdfoStore.rawDeletePreviewCounts.quotation }}</td>
                  </tr>
                  <tr class="odd:bg-white even:bg-slate-50">
                    <td class="!border-b !border-r !border-slate-100 px-4 py-2.5 font-medium text-slate-600">Contract</td>
                    <td class="!border-b !border-slate-100 px-4 py-2.5 text-right font-bold">{{ mdfoStore.rawDeletePreviewCounts.contract }}</td>
                  </tr>
                  <tr class="odd:bg-white even:bg-slate-50">
                    <td class="!border-b !border-r !border-slate-100 px-4 py-2.5 font-medium text-slate-600">ZSTT</td>
                    <td class="!border-b !border-slate-100 px-4 py-2.5 text-right font-bold">{{ mdfoStore.rawDeletePreviewCounts.zstt }}</td>
                  </tr>
                  <tr class="odd:bg-white even:bg-slate-50">
                    <td class="!border-r !border-slate-100 px-4 py-2.5 font-medium text-slate-600">Tracking</td>
                    <td class="px-4 py-2.5 text-right font-bold">{{ mdfoStore.rawDeletePreviewCounts.tracking }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="overflow-hidden rounded-2xl !border !border-amber-200 bg-white">
              <div class="flex items-center justify-between gap-2 !border-b !border-amber-200 bg-amber-50 px-4 py-3">
                <span class="font-bold text-amber-900">Warning Tracking SAP</span>
                <span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                  {{ mdfoStore.rawDeletePreviewWarningCount }}
                </span>
              </div>

              <div v-if="mdfoStore.rawDeletePreviewWarnings.length > 0" class="max-h-[220px] overflow-auto">
                <table class="min-w-[640px] w-full border-collapse text-xs sm:text-sm">
                  <thead class="sticky top-0 bg-amber-50 text-amber-900">
                    <tr>
                      <th class="!border-b !border-r !border-amber-100 px-3 py-2 text-left">Customer</th>
                      <th class="!border-b !border-r !border-amber-100 px-3 py-2 text-center">Periode</th>
                      <th class="!border-b !border-r !border-amber-100 px-3 py-2 text-center">Rev</th>
                      <th class="!border-b !border-amber-100 px-3 py-2 text-left">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(warning, index) in mdfoStore.rawDeletePreviewWarnings"
                      :key="`${warning.customer || '-'}-${warning.id || index}-${index}`"
                      class="odd:bg-white even:bg-amber-50/40"
                    >
                      <td class="!border-b !border-r !border-slate-100 px-3 py-2 font-semibold">{{ warning.customer || '-' }}</td>
                      <td class="!border-b !border-r !border-slate-100 px-3 py-2 text-center">{{ warning.periode || '-' }}</td>
                      <td class="!border-b !border-r !border-slate-100 px-3 py-2 text-center">{{ warning.revision ?? '-' }}</td>
                      <td class="!border-b !border-slate-100 px-3 py-2 text-amber-900">{{ warning.reason || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-else class="flex min-h-[120px] items-center justify-center px-4 py-6 text-center text-sm text-slate-400">
                Tidak ada warning Tracking SAP.
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 !border-t !border-slate-200 bg-white px-5 py-4 sm:px-6">
          <button
            type="button"
            class="rounded-xl !border !border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            @click="mdfoStore.closeRawDeletePreviewModal()"
          >
            Batal
          </button>

          <button
            type="button"
            class="rounded-xl !border !border-orange-500 !bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:!bg-orange-600"
            @click="mdfoStore.continueRawDeletePreview()"
          >
            Lanjut
          </button>
        </div>
      </div>
    </div>
  </Teleport>

</div>
</template>

<style scoped>
/*
 * Checkbox grid column (Raw MDFO + Quotation/Contract/ZSTT)
 * Uses the same 1px inset grid as the dynamic table columns.
 * Inset borders remain visible on sticky/frozen cells and border-separate tables.
 */
.delete-checkbox-grid-header {
  border: 0 !important;
  /*
   * Jangan gambar border kanan di kolom checkbox.
   * Border kiri kolom data pertama sudah membentuk separator 1px,
   * sehingga tidak terjadi double-border 2px pada pertemuan kolom.
   */
  box-shadow:
    inset 1px 0 0 #e2e8f0,
    inset 0 1px 0 #e2e8f0,
    inset 0 -1px 0 #e2e8f0;
}

.delete-checkbox-grid-cell {
  border: 0 !important;
  box-shadow:
    inset 1px 0 0 #e2e8f0,
    inset 0 -1px 0 #e2e8f0;
}

.delete-checkbox-grid-footer {
  border: 0 !important;
  box-shadow:
    inset 1px 0 0 #e2e8f0,
    inset 0 -1px 0 #e2e8f0;
}


/*
 * Renderer compact NTC/DPM/FTI tidak memberi border kiri pada kolom data pertama.
 * Khusus FTI, gambar separator kanan 1px di kolom checkbox agar ketebalannya
 * sama dengan grid kolom lain tanpa mengubah ukuran cell.
 */
.delete-checkbox-grid-header.fti-checkbox-grid-right {
  box-shadow:
    inset 1px 0 0 #e2e8f0,
    inset -1px 0 0 #e2e8f0,
    inset 0 1px 0 #e2e8f0,
    inset 0 -1px 0 #e2e8f0;
}

.delete-checkbox-grid-cell.fti-checkbox-grid-right,
.delete-checkbox-grid-footer.fti-checkbox-grid-right {
  box-shadow:
    inset 1px 0 0 #e2e8f0,
    inset -1px 0 0 #e2e8f0,
    inset 0 -1px 0 #e2e8f0;
}
</style>
