<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { usePalletLogStore } from '@/stores/Logistik/Pallet/ScanInPallet';
import { useCombineStore } from '@/stores/Logistik/MasterData/CombinePallet';
import { usePalletService } from '@/services/Logistik/MasterData/CombinePallet';
import { useNotificationStore } from '@/stores/notification';
import socket from '@/plugins/socket';
import type { PalletItem } from '@/types/Logistik/MasterData/CombinePallet';

interface PalletItemWithError extends PalletItem {
  errorMessage?: string;
}

const page = ref({ title: 'Scan Pallet IN' });

const palletLogStore = usePalletLogStore();
const combineStore = useCombineStore();
const palletService = usePalletService();
const notificationStore = useNotificationStore();

const inputId = ref('');
const listKanbanIN = ref<PalletItemWithError[]>([]);
const isSaving = ref(false);

const handleScanInput = async () => {
  const no_rfid = inputId.value.trim();
  if (!no_rfid) return;

  const isDuplicate = listKanbanIN.value.some((item) => item.no_rfid === no_rfid);
  if (isDuplicate) {
    notificationStore.showDialogWarning('Duplikat', `NO RFID ${no_rfid} sudah ada di dalam list`);
    inputId.value = '';
    return;
  }

  try {
    notificationStore.loading = true;

    const data = await palletService.fetchMasterPallet(undefined, no_rfid);

    if (!data || data.length === 0) {
      notificationStore.showDialogWarning('Tidak Ditemukan', `NO RFID ${no_rfid} tidak ditemukan`);
      inputId.value = '';
      return;
    }

    const pallet = data[0];

    const isAlreadyInList = listKanbanIN.value.some((item) => item.no_rfid === pallet.no_rfid);
    if (isAlreadyInList) {
      notificationStore.showDialogWarning('Duplikat', `Pallet No. ${pallet.no_pallet} (${pallet.type}) sudah ada di dalam list`);
      inputId.value = '';
      return;
    }

    if (pallet.status === 'IN') {
      notificationStore.showDialogWarning('Status Sudah IN', `Pallet No. ${pallet.no_pallet} Type ${pallet.type} status IN`);
      inputId.value = '';
      return;
    }

    listKanbanIN.value.push({ ...pallet } as PalletItemWithError);
    inputId.value = '';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Gagal mengambil data pallet';
    notificationStore.showDialogError('Gagal Fetch', errorMessage);
  } finally {
    notificationStore.loading = false;
  }
};

const removeFromList = (index: number) => {
  listKanbanIN.value.splice(index, 1);
};

const saveAll = async () => {
  if (listKanbanIN.value.length === 0) return;

  isSaving.value = true;

  try {
    notificationStore.loading = true;

    // Step 1: Update is_active status untuk semua item terlebih dahulu
    const updateResults = await Promise.allSettled(
      listKanbanIN.value.map(async (item) => {
        combineStore.loadFormPallet('Edit', item);
        combineStore.updateFormData('is_active', item.is_active);
        await combineStore.onSavePallet();
        return item;
      })
    );

    // Pisah yang berhasil dan gagal update status
    const successfulItems: PalletItemWithError[] = [];
    const failedStatusItems: PalletItemWithError[] = [];

    updateResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulItems.push(listKanbanIN.value[index]);
      } else {
        failedStatusItems.push({
          ...listKanbanIN.value[index],
          errorMessage: result.reason?.message || 'Gagal update status'
        });
      }
    });

    // Step 2: Hanya item OK yang masuk scan IN
    const okItems = successfulItems.filter((item) => item.is_active === '1');

    const scanResults = await Promise.allSettled(
      okItems.map((item) =>
        palletLogStore.submitScanDirect({
          ms_pallet_id: item.id,
          no_rfid: item.no_rfid,
          type: item.type,
          no_pallet: item.no_pallet,
          status: 'IN',
          category: item.category || '',
          customer: item.customer || '',
          id_label: item.id_label || ''
        })
      )
    );

    const failedScanItems: PalletItemWithError[] = [];
    scanResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        failedScanItems.push({
          ...okItems[index],
          errorMessage: result.reason?.message || 'Gagal scan IN'
        });
      }
    });

    const allFailed = [...failedStatusItems, ...failedScanItems];

    if (allFailed.length > 0) {
      listKanbanIN.value = allFailed;
      notificationStore.showDialogError(
        'Sebagian Gagal',
        `${allFailed.length} data gagal diproses, silakan cek list di bawah`
      );
    } else {
      const ngCount = successfulItems.filter((item) => item.is_active === '0' || item.is_active === '2' ).length;
      listKanbanIN.value = [];
      socket.emit('updateRequestPallet', { status: 'IN' });
      notificationStore.showDialogSuccess(
        'Berhasil',
        `${okItems.length} pallet berhasil di scan-IN${ngCount > 0 ? `, ${ngCount} pallet (status diperbarui)` : ''}`
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan data scan IN';
    notificationStore.showDialogError('Gagal Simpan', errorMessage);
  } finally {
    notificationStore.loading = false;
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="w-full flex flex-col justify-center items-center gap-10">

    <!-- Input Scan -->
    <div class="w-full max-w-2xl p-4 sm:p-6 bg-white border border-gray-200 rounded-xl shadow">
      <div class="text-start">
        <label
          for="id_pallet"
          class="block mb-2 text-sm sm:text-md font-medium text-gray-900"
        >
          ID
        </label>
        <input
          id="id_pallet"
          v-model="inputId"
          type="text"
          placeholder="Scan Pallet"
          class="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm sm:text-md rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
          @keydown.enter="handleScanInput"
        />
      </div>
    </div>

    <!-- List Table -->
    <div class="w-full bg-white shadow-md rounded-xl p-4 sm:p-6">
      <div class="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div class="flex items-center gap-3">
          <h1 class="font-semibold text-lg sm:text-xl text-gray-600">
            List RFID Pallet (Scan IN)
          </h1>
          <span class="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
            Total: {{ listKanbanIN.length }}
          </span>
        </div>
        <button
          :disabled="listKanbanIN.length === 0 || isSaving"
          type="button"
          @click="saveAll"
          class="w-full sm:w-auto flex items-center justify-center gap-2 text-white font-medium rounded-full text-sm px-4 py-2 transition-all duration-200"
          :class="listKanbanIN.length > 0 && !isSaving ? 'bg-blue-600 hover:bg-blue-800' : 'bg-gray-400 cursor-not-allowed'"
        >
          <svg
            v-if="isSaving"
            aria-hidden="true"
            role="status"
            class="inline w-4 h-4 text-white animate-spin"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 50.5908Z" fill="#E5E7EB" />
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
          </svg>
          {{ isSaving ? 'Menyimpan...' : 'Save' }}
        </button>
      </div>

      <!-- Desktop Table -->
      <div class="hidden md:block w-full">
        <table class="w-full table-fixed text-sm text-left text-gray-500">
          <thead class="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th class="px-4 py-3 w-[22%]">No RFID</th>
              <th class="px-4 py-3 w-[18%]">No Pallet</th>
              <th class="px-4 py-3 w-[15%]">Type Pallet</th>
              <th class="px-4 py-3 w-[12%] text-center">Category</th>
              <th class="px-4 py-3 w-[14%] text-center">Status</th>
              <th class="px-4 py-3 w-[11%] text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in listKanbanIN"
              :key="item.no_rfid"
              class="border-b"
              :class="item.errorMessage ? 'bg-red-50' : 'bg-white hover:bg-gray-50'"
            >
              <td class="px-4 py-3 align-top">
                <span class="font-medium text-gray-900 break-all">{{ item.no_rfid }}</span>
                <p v-if="item.errorMessage" class="text-xs text-red-500 mt-0.5">{{ item.errorMessage }}</p>
              </td>
              <td class="px-4 py-3 align-top">
                <span class="font-medium text-gray-900 break-words">{{ item.no_pallet }}</span>
              </td>
              <td class="px-4 py-3 align-top break-words">{{ item.type }}</td>
              <td class="px-4 py-3 text-center align-top">{{ item.category || '-' }}</td>
              <td class="px-4 py-3 text-center align-top">
                <!-- Dropdown OK / NG -->
                <select
                  v-model="item.is_active"
                  class="w-full rounded-lg border px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 cursor-pointer transition-colors"
                  :class="item.is_active === '1'
                    ? 'border-green-300 bg-green-50 text-green-700 focus:ring-green-400'
                    : item.is_active === '2'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-500'"
                >
                  <option value="2">✗ NC</option>
                  <option value="1">✓ OK</option>
                  <option value="0">✗ NG</option>
                </select>
              </td>
              <td class="px-4 py-3 text-center align-top">
                <button
                  type="button"
                  @click="removeFromList(index)"
                  class="px-3 py-1 text-sm text-red-600 outline outline-1 outline-red-300 rounded-md hover:bg-red-50 transition"
                >
                  Hapus
                </button>
              </td>
            </tr>
            <tr v-if="listKanbanIN.length === 0">
              <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                Scan atau masukan ID Pallet terlebih dulu.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="md:hidden">
        <p v-if="listKanbanIN.length === 0" class="py-8 text-center text-sm text-gray-500">
          Scan atau masukan ID Pallet terlebih dulu.
        </p>

        <div class="flex flex-col gap-3">
          <div
            v-for="(item, index) in listKanbanIN"
            :key="item.no_rfid"
            class="rounded-xl border p-4 text-sm shadow-sm"
            :class="item.errorMessage ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'"
          >
            <!-- Error Banner -->
            <div
              v-if="item.errorMessage"
              class="mb-3 flex items-center gap-2 rounded-md bg-red-100 px-3 py-2 text-xs text-red-600"
            >
              <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {{ item.errorMessage }}
            </div>

            <!-- Header: No RFID + Hapus -->
            <div class="flex items-start justify-between gap-2 mb-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">No RFID</p>
                <p class="font-semibold text-gray-900 break-all text-sm">{{ item.no_rfid }}</p>
              </div>
              <button
                type="button"
                @click="removeFromList(index)"
                class="shrink-0 px-2.5 py-2 text-xs text-red-600 outline outline-1 outline-red-300 rounded-md hover:bg-red-50 transition"
              >
                Hapus
              </button>
            </div>

            <!-- Grid Info -->
            <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div>
                <p class="font-semibold uppercase tracking-wide text-gray-400 mb-0.5">No Pallet</p>
                <p class="font-medium text-gray-800">{{ item.no_pallet }}</p>
              </div>
              <div>
                <p class="font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Type Pallet</p>
                <p class="text-gray-700 mb-1.5">{{ item.type }}</p>
                <!-- Dropdown OK/NG/NC di bawah Type Pallet -->
              </div>
              <div>
                <p class="font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Category</p>
                <p class="text-gray-700">{{ item.category || '-' }}</p>
              </div>
              <div>
                <select
                  v-model="item.is_active"
                  class="w-full rounded-lg border px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 cursor-pointer transition-colors"
                  :class="item.is_active === '1'
                    ? 'border-green-300 bg-green-50 text-green-700 focus:ring-green-400'
                    : item.is_active === '2'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-500'"
                >
                  <option value="2">✗ NC</option>
                  <option value="1">✓ OK</option>
                  <option value="0">✗ NG</option>
                </select>
              </div>              
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
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