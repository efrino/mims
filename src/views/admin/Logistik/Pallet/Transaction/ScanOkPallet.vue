<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useCombineStore } from '@/stores/Logistik/MasterData/CombinePallet';
import { usePalletService } from '@/services/Logistik/MasterData/CombinePallet';
import { useNotificationStore } from '@/stores/notification';
import type { PalletItem } from '@/types/Logistik/MasterData/CombinePallet';

interface PalletItemWithError extends PalletItem {
  errorMessage?: string;
}

const page = ref({ title: 'Scan Pallet IN' });
const breadcrumbs = shallowRef([
  { title: 'Logistik', disabled: false, href: '#' },
  { title: 'Pallet', disabled: false, href: '#' },
  { title: 'Scan Pallet (IN)', disabled: true, href: '#' }
]);

const combineStore = useCombineStore();
const palletService = usePalletService();
const notificationStore = useNotificationStore();

const inputId = ref('');
const listKanbanIN = ref<PalletItemWithError[]>([]);
const isSaving = ref(false);

const showOkNgModal = ref(false);
const scannedPallet = ref<PalletItem | null>(null);
const isUpdatingStatus = ref(false);

const handleScanInput = async () => {
  const no_rfid = inputId.value.trim();
  if (!no_rfid) return;

  try {
    notificationStore.loading = true;

    const data = await palletService.fetchMasterPallet(undefined, no_rfid);

    if (!data || data.length === 0) {
      notificationStore.showDialogWarning('Tidak Ditemukan', `NO RFID ${no_rfid} tidak ditemukan`);
      inputId.value = '';
      return;
    }

    const pallet = data[0];

    scannedPallet.value = pallet;
    showOkNgModal.value = true;
    inputId.value = '';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Gagal mengambil data pallet';
    notificationStore.showDialogError('Gagal Fetch', errorMessage);
  } finally {
    notificationStore.loading = false;
  }
};

const handleOkNgSelection = async (value: '1' | '0' | '2') => {
  if (!scannedPallet.value) return;

  const pallet = scannedPallet.value;

  try {
    isUpdatingStatus.value = true;

    combineStore.loadFormPallet('Edit', pallet);
    combineStore.updateFormData('is_active', value);
    await combineStore.onSavePallet();

    const updatedPallet: PalletItemWithError = {
      ...pallet,
      is_active: value
    };

    listKanbanIN.value.push(updatedPallet);

    showOkNgModal.value = false;
    scannedPallet.value = null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Gagal mengupdate status pallet';
    notificationStore.showDialogError('Gagal Update', errorMessage);
  } finally {
    isUpdatingStatus.value = false;
  }
};

const cancelOkNgModal = () => {
  showOkNgModal.value = false;
  scannedPallet.value = null;
};

</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7" />

  <div class="w-full flex flex-col justify-center items-center gap-10">

    <div class="w-full max-w-2xl p-4 sm:p-6 bg-white border border-gray-200 rounded-xl shadow">
      <div class="text-start">
        <label
          for="id_pallet"
          class="block mb-2 text-sm sm:text-md font-medium text-gray-900"
        >
        RFID Pallet
        </label>
        <input
          id="id_pallet"
          v-model="inputId"
          type="text"
          placeholder="Scan RFID Pallet"
          class="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm sm:text-md rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
          @keydown.enter="handleScanInput"
        />
      </div>
    </div>
  </div>

  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="showOkNgModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="cancelOkNgModal"
        />

        <div class="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div class="bg-blue-600 px-6 py-4">
            <h2 class="text-white font-semibold text-lg">Status Pallet</h2>
          </div>

          <div v-if="scannedPallet" class="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p class="text-gray-400 font-semibold uppercase tracking-wide mb-0.5">No RFID</p>
                <p class="text-gray-800 font-medium break-all">{{ scannedPallet.no_rfid }}</p>
              </div>
              <div>
                <p class="text-gray-400 font-semibold uppercase tracking-wide mb-0.5">No Pallet</p>
                <p class="text-gray-800 font-medium">{{ scannedPallet.no_pallet }}</p>
              </div>
              <div>
                <p class="text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Type</p>
                <p class="text-gray-700">{{ scannedPallet.type }}</p>
              </div>
              <div>
                <p class="text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Category</p>
                <p class="text-gray-700">{{ scannedPallet.category || '-' }}</p>
              </div>
            </div>
          </div>

          <div class="px-6 py-5">
            <p class="text-sm text-gray-500 mb-4 text-center">Pilih kondisi pallet:</p>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                :disabled="isUpdatingStatus"
                @click="handleOkNgSelection('1')"
                class="flex flex-col items-center justify-center gap-2 rounded-xl py-5 px-4 border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div class="w-10 h-10 rounded-full bg-green-100 group-hover:bg-green-200 flex items-center justify-center transition-colors">
                  <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="text-green-700 font-bold text-lg leading-none">OK</span>
              </button>

              <button
                type="button"
                :disabled="isUpdatingStatus"
                @click="handleOkNgSelection('0')"
                class="flex flex-col items-center justify-center gap-2 rounded-xl py-5 px-4 border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div class="w-10 h-10 rounded-full bg-red-100 group-hover:bg-red-200 flex items-center justify-center transition-colors">
                  <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span class="text-red-700 font-bold text-lg leading-none">NG</span>
              </button>

              <button
                type="button"
                :disabled="isUpdatingStatus"
                @click="handleOkNgSelection('2')"
                class="flex flex-col items-center justify-center gap-2 rounded-xl py-5 px-4 border-2 border-yellow-200 bg-yellow-50 hover:bg-yellow-100 hover:border-yellow-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div class="w-10 h-10 rounded-full bg-yellow-100 group-hover:bg-yellow-200 flex items-center justify-center transition-colors">
                  <svg class="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span class="text-yellow-700 font-bold text-lg leading-none">NC</span>
              </button>              
            </div>

            <div v-if="isUpdatingStatus" class="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              <svg class="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Menyimpan status...
            </div>

            <button
              v-if="!isUpdatingStatus"
              type="button"
              @click="cancelOkNgModal"
              class="mt-4 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-active .relative,
.modal-fade-leave-active .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .relative {
  transform: scale(0.95) translateY(8px);
  opacity: 0;
}
</style>