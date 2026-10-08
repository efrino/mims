<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, computed } from 'vue';
import QrcodeVue from 'qrcode.vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { usePrintBarcodeStore } from '@/stores/Logistik/IFP/Transaction/PrintBarcode';
import { storeToRefs } from 'pinia';

const page = ref({ title: 'Print Barcode Palet' });
const breadcrumbs = shallowRef([
  {
    title: 'Logistik',
    disabled: false,
    href: '#'
  },
  {
    title: 'IFP',
    disabled: false,
    href: '#'
  },
  {
    title: 'Transaction',
    disabled: false,
    href: '#'
  },
  {
    title: 'Print Barcode Palet',
    disabled: true,
    href: '#'
  }
]);

const printBarcodeStore = usePrintBarcodeStore();
const { 
  formData, 
  formRepeat, 
  list, 
  previewData, 
  lastCounter,
  qzConnected,
  availablePrinters,
  selectedPrinter
} = storeToRefs(printBarcodeStore);

const activeTab = ref('new');
const showPreview = ref(false);

const previewItems = computed(() => {
  return previewData.value.items || [];
});

const printerList = computed(() => {
  const printers = availablePrinters.value;
  return Array.isArray(printers) ? printers : [];
});

const getPreviewQuantity = computed(() => {
  return previewItems.value.length;
});

const getPreviewType = computed(() => {
  return activeTab.value === 'new' ? formData.value.type : formRepeat.value.type;
});

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';

  if (dateStr.includes('/')) return dateStr;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

const createBarcode = async () => {
  if (activeTab.value === 'new') {
    if (formData.value.dateBuild && formData.value.type && formData.value.jarak) {
      await printBarcodeStore.addPrint();
      showPreview.value = true;
    }
  } else {
    if (formRepeat.value.type && formRepeat.value.from && formRepeat.value.to) {
      await printBarcodeStore.repeatPrint();
      showPreview.value = true;
    }
  }
};

const resetForm = () => {
  printBarcodeStore.resetForm();
  showPreview.value = false;
};

const printBarcode = async () => {
  await printBarcodeStore.printBarcode();
};

const switchTab = (tab: string) => {
  activeTab.value = tab;
  showPreview.value = false;
};

const refreshPrinters = async () => {
  await printBarcodeStore.loadPrinters();
};

onMounted(async () => {
  await printBarcodeStore.fetchDataBarcode();
  await printBarcodeStore.initializeQZ();
});

onUnmounted(async () => {
  await printBarcodeStore.disconnectQZ();
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  
  <div class="flex flex-col lg:flex-row gap-6">
    <div class="w-full lg:w-2/5">
      <div class="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-8">
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold text-gray-800">Print Barcode Palet</h1>
          <p class="text-sm text-gray-800">Last Counter: <span class="font-bold text-blue-600">{{ lastCounter }}</span></p>
        </div>
        
        <div class="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
          <button
            @click="switchTab('new')"
            :class="[
              'flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200',
              activeTab === 'new' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
            ]"
          >
            Barcode Baru
          </button>
          <button
            @click="switchTab('reprint')"
            :class="[
              'flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200',
              activeTab === 'reprint' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
            ]"
          >
            Print Ulang
          </button>
        </div>

          <div class="form-group">
            <label for="type-select" class="block text-sm font-semibold text-gray-700 mb-2">
              Type Pallet/Polybox
            </label>
            <div class="relative">
              <select 
                id="type-select"
                v-model="formData.type"
                class="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 text-sm 
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white
                       transition-all duration-200 hover:border-gray-300 appearance-none cursor-pointer"
              >
                <option value="" disabled>Pilih type pallet</option>
                <template v-for="(item, index) in list.type" :key="index">
                  <option 
                    v-if="typeof item === 'string'" 
                    :value="item"
                  >
                    {{ item }}
                  </option>
                  <option 
                    v-else 
                    :value="item.value"
                  >
                    {{ item.text }}
                  </option>
                </template>
              </select>
            </div>
          </div>

        <div v-if="activeTab === 'new'" class="space-y-6">
          <div class="form-group">
            <label for="date-input" class="block text-sm font-semibold text-gray-700 mb-2">
              Tanggal
            </label>
            <div class="relative">
              <input 
                id="date-input" 
                v-model="formData.dateBuild"
                type="date" 
                class="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 text-sm 
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white
                       transition-all duration-200 hover:border-gray-300"
                placeholder="Pilih tanggal"
              >
            </div>
          </div>

          <div class="form-group">
            <label for="quantity-input" class="block text-sm font-semibold text-gray-700 mb-2">
              Jumlah Barcode
            </label>
            <input 
              id="quantity-input"
              v-model.number="formData.jarak"
              type="number" 
              min="1"
              max="100"
              class="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 text-sm 
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white
                     transition-all duration-200 hover:border-gray-300"
              placeholder="Masukkan jumlah (e.g. 20)" 
            />
          </div>
        </div>

        <div v-else class="space-y-6">
          <div class="form-group">
            <label for="reprint-type-select" class="block text-sm font-semibold text-gray-700 mb-2">
              Type Pallet/Polybox
            </label>
            <div class="relative">
              <select 
                id="reprint-type-select"
                v-model="formRepeat.type"
                class="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 text-sm 
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white
                       transition-all duration-200 hover:border-gray-300 appearance-none cursor-pointer"
              >
                <option value="" disabled>Pilih type pallet</option>
                <template v-for="(item, index) in list.type" :key="index">
                  <option 
                    v-if="typeof item === 'string'" 
                    :value="item"
                  >
                    {{ item }}
                  </option>
                  <option 
                    v-else 
                    :value="item.value"
                  >
                    {{ item.text }}
                  </option>
                </template>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="from-input" class="block text-sm font-semibold text-gray-700 mb-2">
              Dari
            </label>
            <input 
              id="from-input"
              v-model.number="formRepeat.from"
              type="number" 
              min="1"
              class="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 text-sm 
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white
                     transition-all duration-200 hover:border-gray-300"
              placeholder="Masukkan nomor awal (e.g. 1)" 
            />
          </div>

          <div class="form-group">
            <label for="to-input" class="block text-sm font-semibold text-gray-700 mb-2">
              Sampai
            </label>
            <input 
              id="to-input"
              v-model.number="formRepeat.to"
              type="number" 
              min="1"
              class="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 text-sm 
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white
                     transition-all duration-200 hover:border-gray-300"
              placeholder="Masukkan nomor akhir (e.g. 20)" 
            />
          </div>
        </div>

        <div class="pt-4 flex gap-3">       
          <button 
            @click="resetForm"
            type="button"
            class="flex-1 bg-gray-400 hover:bg-gray-500 
                   text-white font-semibold py-4 px-6 rounded-xl 
                   shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                   transition-all duration-200 flex items-center justify-center gap-2
                   focus:outline-none focus:ring-4 focus:ring-gray-300"
          >
            Reset
          </button>
          <button 
            @click="createBarcode"
            type="button"
            class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                  text-white font-semibold py-4 px-6 rounded-xl 
                  shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                  transition-all duration-200 flex items-center justify-center gap-2"
          >
            Generate
          </button>
        </div>
      </div>
    </div>

    <div class="w-full lg:w-3/5">
      <div class="bg-white rounded-2xl shadow-lg p-8 preview-container-fixed no-print">
        <div class="preview-area">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b-2 border-gray-200">
            <div>
              <h2 class="text-2xl font-bold gradient-text mb-1">Preview Barcode</h2>
              <p class="text-sm text-gray-600">
                <span class="font-semibold">Type:</span> {{ getPreviewType || '-' }} | 
                <span class="font-semibold ml-2">Quantity:</span> {{ getPreviewQuantity }}
              </p>
            </div>
            
            <div class="flex flex-col gap-3 w-full sm:w-auto">
              <div class="flex gap-2">
                <div class="relative flex-1">
                  <select 
                    v-model="selectedPrinter"
                    :disabled="!qzConnected || printerList.length === 0"
                    class="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 text-sm 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white
                           transition-all duration-200 hover:border-gray-300 appearance-none cursor-pointer
                           disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>Pilih Printer</option>
                    <option 
                      v-for="printer in printerList" 
                      :key="printer" 
                      :value="printer"
                    >
                      {{ printer }}
                    </option>
                  </select>
                </div>
                
                <button
                  @click="refreshPrinters"
                  :disabled="!qzConnected"
                  class="px-3 py-2 bg-gray-500 hover:bg-gray-600 
                         text-white rounded-lg transition-all duration-200 
                         disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              <button 
                @click="printBarcode"
                :disabled="!showPreview || !selectedPrinter || !qzConnected"
                type="button"
                class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                       text-white font-semibold py-3 px-6 rounded-xl 
                       shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                       transition-all duration-200 flex items-center justify-center gap-2
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
            </div>
          </div>

          <div class="mt-6 preview-scroll-container">
            <div class="flex gap-4 flex-wrap">
              <!-- IMPORTANT: Tambahkan class barcode-print-item di sini -->
              <div 
                v-for="(item, index) in previewItems" 
                :key="index"
                class="barcode-preview-card barcode-print-item flex-shrink-0"
              >
                <div class="barcode-container">
                  <div class="barcode-header">
                    <img 
                      src="@/assets/images/MAJ-bw.jpg" 
                      alt="MAJ Logo"
                      class="company-logo"
                    />
                  </div>

                  <div class="barcode-content">
                    <div class="info-section">
                      <div class="info-row">
                        <span class="info-label">TYPE</span>
                        <span class="info-separator">:</span>
                        <span class="info-value">{{ item.type }}</span>
                      </div>

                      <div class="info-row">
                        <span class="info-label">Tanggal Buat</span>
                        <span class="info-separator">:</span>
                        <span class="info-value">{{ formatDate(item.create_date) }}</span>
                      </div>

                      <div class="info-row">
                        <span class="info-label">NO</span>
                        <span class="info-separator">:</span>
                        <span class="info-value">{{ item.jarak }}</span>
                      </div>
                    </div>

                    <div class="qr-section">
                      <QrcodeVue 
                        :value="item.barcode" 
                        :size="100"
                        level="H"
                        render-as="canvas"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Fixed Preview Container */
.preview-container-fixed {
  height: calc(100vh - 140px);
  min-height: 600px;
  max-height: 900px;
  display: flex;
  flex-direction: column;
}

.preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-scroll-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  margin-right: -8px;
}

/* Barcode Preview Styles */
.barcode-preview-card {
  width: 360px;
  font-family: Arial, Helvetica, sans-serif;
  page-break-inside: avoid;
  aspect-ratio: 2 / 1; 
}

.barcode-container {
  background: white;
  border: 2px solid #000;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.barcode-header {
  background: white;
  padding: 8px 12px;
  border-bottom: 2px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 45px;
  flex-shrink: 0;
}

.company-logo {
  height: 30px;
  max-width: 180px;
  object-fit: contain;
}

.barcode-content {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0;
  flex: 1;
  min-height: 0;
}

.info-section {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 0;
  border-right: 2px solid #000;
}

.info-row {
  display: grid;
  grid-template-columns: 90px 15px 1fr;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid #000;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  font-weight: 600;
  color: #000;
}

.info-separator {
  font-size: 13px;
  font-weight: 600;
  color: #000;
  text-align: center;
}

.info-value {
  font-size: 13px;
  font-weight: 700;
  color: #000;
}

.qr-section {
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
}

@media print {
  .no-print {
    display: none !important;
  }

  .preview-container-fixed {
    height: auto !important;
    min-height: auto !important;
    max-height: none !important;
  }

  .preview-scroll-container {
    overflow: visible !important;
    height: auto !important;
  }

  .preview-scroll-container > div {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 16px !important;
  }

  .barcode-preview-card {
    margin-bottom: 20px;
    break-inside: avoid;
    page-break-inside: avoid;
    width: 100% !important;
    max-width: 360px !important;
  }

  .barcode-container {
    border: 2px solid #000 !important;
  }

  .barcode-header,
  .barcode-content,
  .info-section,
  .qr-section {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .barcode-header,
  .info-section {
    border-bottom: 2px solid #000 !important;
    border-right: 2px solid #000 !important;
  }

  .info-row {
    border-bottom: 1px solid #000 !important;
  }

  .info-row:last-child {
    border-bottom: none !important;
  }

  body {
    background: white !important;
  }

  .preview-area {
    overflow: visible !important;
  }
}

.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>