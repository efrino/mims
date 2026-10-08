<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue';
import { usePalletLogStore } from '@/stores/Logistik/Pallet/ScanInPallet';
import { usePalletService } from '@/services/Logistik/MasterData/CombinePallet';
import { useKanbanTmminStore } from '@/stores/Logistik/Pallet/KanbanTMMIN';
import { useNotificationStore } from '@/stores/notification';
import socket from '@/plugins/socket';
import { useMspinAuthStore } from '@/stores/Logistik/Pallet/mspinAuthStore';
import type { PalletItem } from '@/types/Logistik/MasterData/CombinePallet';

// ─── Auth Store ─────────────────────────────────────────────────
const authStore = useMspinAuthStore();

const loginUsername = ref('');
const loginPassword = ref('');
const isLoggingIn = ref(false);

async function handleLogin() {
  isLoggingIn.value = true;
  const success = await authStore.login(loginUsername.value, loginPassword.value);
  isLoggingIn.value = false;
  if (success) {
    await kanbanTmminStore.fetchHistory();
  } else {
    notificationStore.showDialogError('Gagal Login', 'Periksa username/password Anda');
  }
}

// ─── Types ──────────────────────────────────────────────────────
interface PalletItemWithError extends PalletItem {
  errorMessage?: string;
}

// ─── Page Meta ──────────────────────────────────────────────────
const page = ref({ title: 'Scan Pallet OUT' });

// ─── Stores & Services ──────────────────────────────────────────
const palletLogStore = usePalletLogStore();
const palletService = usePalletService();
const kanbanTmminStore = useKanbanTmminStore();
const notificationStore = useNotificationStore();

// ─── State ──────────────────────────────────────────────────────
const rfidInput = ref('');
const customerKanbanInput = ref('');
const tagOkInput = ref('');
const listRfidPallets = ref<PalletItemWithError[]>([]);
const isSaving = ref(false);

// DOM refs
const rfidRef = ref<HTMLInputElement | null>(null);
const customerKanbanRef = ref<HTMLInputElement | null>(null);
const tagOkRef = ref<HTMLInputElement | null>(null);

const autoUser = import.meta.env.VITE_MSPIN_USER;
const autoPass = import.meta.env.VITE_MSPIN_PASS;
let autoLoginAttempted = false;

// ─── Lifecycle ──────────────────────────────────────────────────
onMounted(() => {
  if (autoUser && autoPass && !autoLoginAttempted) {
    autoLoginAttempted = true;
    loginUsername.value = autoUser;
    loginPassword.value = autoPass;
    handleLogin();
    kanbanTmminStore.fetchHistory();
    rfidRef.value?.focus();
  }
});

// ─── RFID Scan (urutan pertama) ─────────────────────────────────
const handleRfidScan = async () => {
  const no_rfid = rfidInput.value.trim();
  if (!no_rfid) return;

  const isDuplicate = listRfidPallets.value.some((item) => item.no_rfid === no_rfid);
  if (isDuplicate) {
    notificationStore.showDialogWarning('Duplikat', `NO RFID ${no_rfid} sudah ada di dalam list`);
    rfidInput.value = '';
    return;
  }

  try {
    notificationStore.loading = true;
    const data = await palletService.fetchMasterPallet(undefined, no_rfid);

    if (!data || data.length === 0) {
      notificationStore.showDialogWarning('Tidak Ditemukan', `NO RFID ${no_rfid} tidak ditemukan`);
      rfidInput.value = '';
      return;
    }

    const pallet = data[0];

    if (listRfidPallets.value.some((item) => item.no_rfid === pallet.no_rfid)) {
      notificationStore.showDialogWarning('Duplikat', `Pallet No. ${pallet.no_pallet} (${pallet.type}) sudah ada di dalam list`);
      rfidInput.value = '';
      return;
    }

    // Cek is_active dari data fetch — jika NG langsung tolak
    if (pallet.is_active !== '1') {
      notificationStore.showDialogWarning(
        'Pallet Bermasalah',
        `Pallet No. ${pallet.no_pallet} Type ${pallet.type} Perlu di cek. Segera bawa ke workshop!`
      );
      rfidInput.value = '';
      return;
    }

    if (pallet.status === 'OUT') {
      notificationStore.showDialogWarning(
        'Status Sudah OUT',
        `Pallet No. ${pallet.no_pallet} Type ${pallet.type} sudah OUT`
      );
      rfidInput.value = '';
      return;
    }

    listRfidPallets.value.push({ ...pallet } as PalletItemWithError);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Gagal mengambil data pallet';
    notificationStore.showDialogError('Gagal Fetch', msg);
  } finally {
    notificationStore.loading = false;
  }
};

const handleCustomerKanbanEnter = () => {
  if (!customerKanbanInput.value.trim()) return;
  tagOkRef.value?.focus();
};

const handleTagOkEnter = () => {
  if (!tagOkInput.value.trim()) return;
};

const removeFromList = (index: number) => {
  listRfidPallets.value.splice(index, 1);
};

const resetForm = () => {
  rfidInput.value = '';
  customerKanbanInput.value = '';
  tagOkInput.value = '';
  rfidRef.value?.focus();
};

// ─── Save ────────────────────────────────────────────────────────
const saveAll = async () => {
  if (!customerKanbanInput.value.trim() || !tagOkInput.value.trim()) {
    notificationStore.showDialogWarning('Peringatan', 'Customer Kanban dan Tag OK wajib diisi sebelum menyimpan!');
    return;
  }

  if (listRfidPallets.value.length === 0) {
    notificationStore.showDialogWarning('Peringatan', 'Belum ada RFID yang discan!');
    return;
  }

  isSaving.value = true;
  try {
    notificationStore.loading = true;

    // Step 1: Submit kanban
    const kanbanResult = await kanbanTmminStore.submitKanban(
      tagOkInput.value.trim(),
      customerKanbanInput.value.trim()
    );

    if (!kanbanResult.success) {
      notificationStore.showDialogError('Gagal — Kanban Error', kanbanResult.message);
      return;
    }

    // Step 2: Submit scan OUT untuk setiap RFID
    // id_label diisi dari customerKanbanInput (bukan tag_ok_id)
    const results = await Promise.allSettled(
      listRfidPallets.value.map((item) =>
        palletLogStore.submitScanDirect({
          ms_pallet_id: item.id,
          no_rfid: item.no_rfid,
          type: item.type,
          no_pallet: item.no_pallet,          
          status: 'OUT',
          category: item.category || '',
          customer: item.customer || '',
          id_label: customerKanbanInput.value.trim(),
        })
      )
    );

    const failed: PalletItemWithError[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        failed.push({
          ...listRfidPallets.value[index],
          errorMessage: result.reason?.message ?? 'Gagal disimpan',
        });
      }
    });

    if (failed.length > 0) {
      listRfidPallets.value = failed;
      notificationStore.showDialogError(
        'Kanban OK — Sebagian Pallet Gagal',
        `${kanbanResult.message}\n\n${failed.length} data pallet gagal disimpan, silakan cek list di bawah.`
      );
      return;
    }

    const dnInfo = kanbanResult.dn
      ? `\nDN: ${kanbanResult.dn} (${kanbanResult.scanned}/${kanbanResult.total})`
      : '';
    socket.emit('updateRequestPallet', { status: 'OUT' });
    notificationStore.showDialogSuccess(
      'Berhasil',
      `${kanbanResult.message}${dnInfo}\n${listRfidPallets.value.length} pallet berhasil di-scan OUT.`
    );

    listRfidPallets.value = [];
    resetForm();
    await kanbanTmminStore.fetchHistory();
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Gagal menyimpan data';
    notificationStore.showDialogError('Gagal Simpan', msg);
  } finally {
    notificationStore.loading = false;
    isSaving.value = false;
  }
};
</script>

<template>
  <div>
    <!-- LOGIN FORM -->
    <div v-if="!authStore.isAuthenticated" class="w-full max-w-md mx-auto mt-10">
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div class="text-center mb-6">
          <h2 class="text-2xl font-bold text-blue-900 mt-2">Login Required</h2>
          <p class="text-gray-500 text-sm">Silakan login untuk mengakses halaman Scan Pallet</p>
        </div>
        <form @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-700">Username</label>
            <input v-model="loginUsername" type="text" required
              class="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Masukkan username" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Password</label>
            <input v-model="loginPassword" type="password" required
              class="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Masukkan password" />
          </div>
          <button type="submit" :disabled="isLoggingIn"
            class="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50">
            {{ isLoggingIn ? 'Login...' : 'SIGN IN' }}
          </button>
        </form>
        <div class="text-center text-xs text-gray-400 mt-6">
          © 2024 IT Department<br />PT MEKAR ARMADA JAYA
        </div>
      </div>
    </div>

    <!-- KONTEN UTAMA -->
    <div v-else class="w-full flex flex-col items-center gap-6 pb-10">

      <!-- FORM CARD -->
      <div class="w-full max-w-2xl">
        <div class="rounded-t-2xl px-6 py-4" style="background: linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)">
          <p class="text-white font-bold text-base sm:text-lg tracking-wide">TMMIN Kanban</p>
          <p class="text-blue-200 text-xs sm:text-sm mt-0.5">Automated Scanning System</p>
        </div>
        <div class="bg-white border border-t-0 border-gray-200 rounded-b-2xl shadow-md p-5 sm:p-6 flex flex-col gap-5">

          <!-- ① No RFID Pallet (urutan pertama) -->
          <div>
            <label class="block mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              No RFID Pallet <span class="text-red-500">*</span>
            </label>
            <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1 focus-within:ring-2 focus-within:ring-blue-400">
              <input
                ref="rfidRef"
                v-model="rfidInput"
                type="text"
                placeholder="Scan RFID Pallet"
                class="flex-1 bg-transparent text-sm text-gray-900 outline-none"
                @keydown.enter="handleRfidScan"
              />
              <button type="button" @click="rfidRef?.focus()"></button>
            </div>
          </div>



          <!-- ② Label Box -->
          <div>
            <label class="block mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Label Box <span class="text-red-500">*</span>
            </label>
            <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1 focus-within:ring-2 focus-within:ring-blue-400">
              <input
                ref="customerKanbanRef"
                v-model="customerKanbanInput"
                type="text"
                placeholder="Scan Label Box"
                class="flex-1 bg-transparent text-sm text-gray-900 outline-none"
                @keydown.enter="handleCustomerKanbanEnter"
              />
              <button type="button" @click="customerKanbanRef?.focus()"></button>
            </div>
          </div>



          <!-- ③ Tag OK -->
          <div>
            <label class="block mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Tag OK / E-Kanban <span class="text-red-500">*</span>
            </label>
            <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1 focus-within:ring-2 focus-within:ring-blue-400">
              <input
                ref="tagOkRef"
                v-model="tagOkInput"
                type="text"
                placeholder="Scan QR Tag OK"
                class="flex-1 bg-transparent text-sm text-gray-900 outline-none"
                @keydown.enter="handleTagOkEnter"
              />
              <button type="button" @click="tagOkRef?.focus()"></button>
            </div>
          </div>

          <!-- Submit -->
          <div class="flex justify-center">
            <button
              type="button"
              :disabled="isSaving || !customerKanbanInput.trim() || !tagOkInput.trim() || listRfidPallets.length === 0"
              class="w-[200px] flex items-center justify-center gap-2 rounded-xl py-2 text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-md"
              :class="!isSaving && customerKanbanInput.trim() && tagOkInput.trim() && listRfidPallets.length > 0
                ? 'hover:opacity-90 active:scale-[0.98]'
                : 'opacity-60 cursor-not-allowed'"
              style="background: linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)"
              @click="saveAll"
            >
              <svg v-if="isSaving" class="w-4 h-4 animate-spin" viewBox="0 0 100 101" fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 50.5908Z" fill="#E5E7EB"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
              </svg>
              {{ isSaving ? 'Menyimpan...' : 'SUBMIT VENDOR' }}
            </button>
          </div>

          <p class="text-center text-xs text-gray-400 italic -mt-2">
            * Semua field wajib diisi sebelum submit
          </p>
        </div>
      </div>

      <!-- AKTIVITAS TERAKHIR -->
      <div class="w-full max-w-5xl">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-bold text-base sm:text-lg text-gray-700">5 Scan Terakhir</h2>
          <button
            type="button"
            class="text-xs text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
            :disabled="kanbanTmminStore.isLoadingHistory"
            @click="kanbanTmminStore.fetchHistory()"
          >
            <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': kanbanTmminStore.isLoadingHistory }"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        <div v-if="kanbanTmminStore.isLoadingHistory" class="flex flex-col gap-3">
          <div v-for="n in 4" :key="n" class="h-16 rounded-xl bg-gray-100 animate-pulse" />
        </div>
        <div v-else-if="kanbanTmminStore.historyKanban.length === 0"
          class="bg-white rounded-xl border border-gray-100 py-10 text-center text-gray-400 text-sm shadow-sm">
          Belum ada data aktivitas.
        </div>
        <div v-else class="flex flex-col gap-3">
          <div
            v-for="(item, index) in kanbanTmminStore.historyKanban"
            :key="index"
            class="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 px-4 py-3"
          >
            <div class="shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">📦</div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-sm text-gray-800 truncate">Part — {{ item.part ?? '-' }}</p>
              <div class="flex flex-wrap gap-x-3">
                <span v-if="item.dn" class="text-xs text-gray-500">DN: {{ item.dn }}</span>
                <span v-if="item.customer" class="text-xs text-gray-500">{{ item.customer }}</span>
              </div>
            </div>
            <p class="shrink-0 text-xs text-gray-400 text-right">{{ item.created_at }}</p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>