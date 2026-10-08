<!-- views/admin/PCD/Welding/mutasi-unified.vue
     Mutasi Bulanan — FP dan WIP dalam SATU tabel (kolom TIPE, 2026-09-24).
     Sebelumnya dipisah 2 sheet (SheetTabs). Data tetap dari 2 composable
     (useMutationData = FP, useWipMutationData = WIP) dengan endpoint & lock
     sendiri; baris diberi `kind` sehingga tiap aksi (edit plan, stok, initial
     stock, mode shift) diarahkan ke sumber yang benar per baris.
     Urutan: abjad mesin → part number (FP & WIP dicampur, lihat mergeMutasiRows). -->
<template>
  <div class="page-root">

    <!-- ── Header ──────────────────────────────────────────────── -->
    <PlanningHeader
      :area-name="areaName"
      :area-code="areaCode"
      :current-month="fp.currentMonthLabel.value"
      title="Mutasi Bulanan"
      @period-change="handlePeriodChange"
      @area-change="handleAreaChange"
      @download="(k) => apiOf(k).downloadMutasi()"
      @download-all="(k) => apiOf(k).downloadAllAreas()"
      @template="(k) => apiOf(k).downloadTemplate()"
      @upload="handleUpload"
    />

    <!-- ── Toolbar / Status strip ──────────────────────────────── -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span v-if="fp.lastUpdatedLabel.value" class="toolbar-meta">
          <i class="mdi mdi-clock-check-outline text-slate-400 text-xs"></i>
          Diperbarui: <strong class="text-slate-700">{{ fp.lastUpdatedLabel.value }}</strong>
          <span class="auto-chip" title="Planning FP dihitung ulang otomatis oleh cron tiap 15 menit (06:00–22:00) dan tersinkron ke layar ini secara realtime. Tombol Refresh hanya untuk memaksa hitung ulang sekarang.">
            <i class="mdi mdi-autorenew"></i> auto 15 mnt
          </span>
        </span>
        <span v-else class="toolbar-meta italic text-slate-400">Belum ada data untuk periode ini</span>

        <span v-if="fp.jobs.value.length || wip.jobs.value.length" class="toolbar-meta">
          <span class="toolbar-sep">·</span>
          <span class="toolbar-count toolbar-count--fp" title="Finish part (Mutasi FP)">
            <i class="mdi mdi-package-variant"></i>{{ fp.jobs.value.length }} FP
          </span>
          <span class="toolbar-count toolbar-count--wip" title="Part setengah jadi (Mutasi WIP)">
            <i class="mdi mdi-source-branch"></i>{{ wip.jobs.value.length }} WIP
          </span>
        </span>

        <template v-if="countLocked > 0">
          <span class="toolbar-sep">·</span>
          <span class="lock-badge">
            <i class="mdi mdi-lock text-[10px]"></i>
            {{ countLocked }} terkunci
            <button
              @click="openUnlockPreview"
              :disabled="bulkUnlocking"
              class="lock-unlock-btn"
              :title="bulkUnlocking ? 'Sedang unlock...' : 'Lihat dampak lalu unlock semua sel terkunci (FP & WIP) · U'"
            >
              <i class="mdi text-[10px]" :class="bulkUnlocking ? 'mdi-loading mdi-spin' : 'mdi-lock-open-variant-outline'"></i>
              {{ bulkUnlocking ? '...' : 'Unlock' }}
            </button>
          </span>
        </template>

        <template v-if="errorText">
          <span class="toolbar-sep">·</span>
          <span class="toolbar-error">
            <i class="mdi mdi-alert-circle-outline text-xs"></i>
            {{ errorText }}
          </span>
        </template>

        <Transition name="fade-in">
          <span v-if="uploadResult" class="toolbar-success">
            <i class="mdi mdi-check-circle-outline text-xs"></i>
            {{ uploadResult.message }}
            <button @click="uploadResult = null" class="ml-1 opacity-60 hover:opacity-100 transition-opacity">
              <i class="mdi mdi-close text-[10px]"></i>
            </button>
          </span>
        </Transition>

        <span v-if="anyOf('updatingStock')" class="toolbar-meta text-indigo-600">
          <span class="toolbar-sep">·</span>
          <i class="mdi mdi-loading mdi-spin text-xs"></i>
          Menghitung ulang rolling...
        </span>

        <span v-if="anyOf('adjustingStock')" class="toolbar-meta text-indigo-600">
          <span class="toolbar-sep">·</span>
          <i class="mdi mdi-loading mdi-spin text-xs"></i>
          Koreksi stok &amp; propagasi delta...
        </span>

        <span v-if="anyOf('recalculating')" class="toolbar-meta text-emerald-600">
          <span class="toolbar-sep">·</span>
          <i class="mdi mdi-loading mdi-spin text-xs"></i>
          Menghitung ulang plan ke depan...
        </span>

        <span v-if="anyOf('uploading')" class="toolbar-meta text-amber-600">
          <span class="toolbar-sep">·</span>
          <i class="mdi mdi-loading mdi-spin text-xs"></i>
          Mengupload...
        </span>
      </div>

      <div class="toolbar-right">
        <!-- User lain yang sedang membuka Mutasi area ini (heartbeat, lihat useMutasiPresence) -->
        <PresenceAvatars :users="presence.users.value" :me="presence.me()" :area="areaCode" />

        <button
          v-if="idleCount > 0 || hideIdle"
          class="toolbar-btn idle-btn"
          :class="{ 'toolbar-btn--idle': hideIdle }"
          :title="(hideIdle
            ? `${idleCount} part tanpa MDFO/DN/plan/actual bulan ini disembunyikan. Klik untuk tampilkan.`
            : `${idleCount} part tanpa MDFO/DN/plan/actual bulan ini (hanya stok). Klik untuk sembunyikan.`) + ' · H'"
          @click="hideIdle = !hideIdle"
        >
          <i class="mdi text-sm leading-none" :class="hideIdle ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"></i>
          <span class="idle-long">Part kosong: {{ hideIdle ? 'disembunyikan' : 'tampil' }}</span>
          <span class="idle-short">Kosong</span>
          <span class="idle-count">{{ idleCount }}</span>
        </button>

        <Transition name="sse-msg">
          <span v-if="refreshMessage" class="sse-status" :class="refreshing ? 'sse-status--running' : 'sse-status--done'">
            <i
              class="mdi text-[9px] flex-shrink-0"
              :class="refreshing ? 'mdi-loading mdi-spin' : 'mdi-check-circle'"
            ></i>
            <span class="sse-status__text" :title="refreshMessage">{{ refreshMessage }}</span>
          </span>
        </Transition>

        <div class="refresh-wrap" ref="refreshMenuRef">
          <button
            @click="handleRefresh"
            :disabled="refreshing || loading"
            class="toolbar-btn refresh-main"
            :class="refreshing || loading
              ? 'opacity-50 cursor-not-allowed'
              : planningV2
                ? 'border-violet-500 text-violet-700 hover:bg-violet-600 hover:text-white hover:border-violet-600'
                : 'hover:bg-blue-600 hover:text-white hover:border-blue-600'"
            :title="refreshing ? 'Sedang refresh...' : `Refresh FP lalu WIP area ini (engine ${planningV2 ? 'v2' : 'v1'})`"
          >
            <i class="mdi text-sm leading-none" :class="refreshing ? 'mdi-loading mdi-spin' : 'mdi-refresh'"></i>
            <span>{{ refreshing ? 'Refresh...' : (planningV2 ? 'Refresh v2' : 'Refresh') }}</span>
          </button>
          <button
            class="toolbar-btn refresh-caret"
            :disabled="refreshing || loading"
            :class="refreshing || loading ? 'opacity-50 cursor-not-allowed' : ''"
            title="Pilih cakupan refresh"
            @click="showRefreshMenu = !showRefreshMenu"
          >
            <i class="mdi mdi-chevron-down caret-ico"></i>
          </button>
          <div v-if="showRefreshMenu" class="refresh-menu">
            <button class="refresh-item" @click="chooseRefresh('area')">
              <i class="mdi mdi-map-marker-outline"></i> Area ini ({{ areaCode }})
            </button>
            <button class="refresh-item" @click="chooseRefresh('all')">
              <i class="mdi mdi-earth"></i> Semua area
            </button>
          </div>
        </div>

        <!-- Shortcut keyboard (tekan ?) -->
        <div class="refresh-wrap" ref="kbdMenuRef">
          <button class="toolbar-btn kbd-btn" title="Shortcut keyboard (?)" @click="showKbdHelp = !showKbdHelp">
            <i class="mdi mdi-keyboard-outline text-sm leading-none"></i>
          </button>
          <div v-if="showKbdHelp" class="refresh-menu kbd-menu">
            <div class="kbd-title">Shortcut keyboard</div>
            <div v-for="k in SHORTCUTS" :key="k.label" class="kbd-row">
              <span class="kbd-keys"><kbd v-for="key in k.keys" :key="key">{{ key }}</kbd></span>
              <span>{{ k.label }}</span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ── Lock refresh warning banner ─────────────────────────── -->
    <Transition name="warn-slide">
      <div v-if="showRefreshWarning" class="warn-banner">
        <div class="flex items-center gap-2 text-amber-700 text-xs">
          <i class="mdi mdi-alert-outline text-sm flex-shrink-0"></i>
          <span>
            Ada <strong>{{ countLocked }} baris terkunci</strong>.
            Refresh SP tidak akan mengubah baris terkunci.
            <button class="underline ml-1 hover:no-underline font-semibold" @click="openUnlockPreview">
              Unlock semua dulu?
            </button>
          </span>
        </div>
        <button class="text-amber-500 hover:text-amber-700 transition-colors p-0.5" @click="showRefreshWarning = false">
          <i class="mdi mdi-close text-sm"></i>
        </button>
      </div>
    </Transition>

    <!-- ── Socket status chip ────────────────────────────────────── -->
    <Transition name="fade-in">
      <div v-if="socketConnected" class="socket-chip">
        <span class="socket-dot socket-dot--live"></span>
        <span>Live</span>
      </div>
    </Transition>

    <!-- ── Table area ───────────────────────────────────────────── -->
    <div class="table-area" :class="{ 'table-area--swapping': swapping }">
      <!-- Ganti area/periode: tabel lama meredup + pill status, lalu data baru fade-in. -->
      <Transition name="swap-pill">
        <div v-if="swapping" class="swap-pill">
          <i class="mdi mdi-loading mdi-spin"></i> Memuat {{ areaName }}…
        </div>
      </Transition>
      <div v-if="!hasRows && loading" class="state-box">
        <div class="flex flex-col items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <i class="mdi mdi-loading mdi-spin text-2xl text-blue-500"></i>
          </div>
          <p class="text-sm text-slate-500">Memuat data mutasi FP &amp; WIP...</p>
        </div>
      </div>

      <div v-else-if="!hasRows && !fp.error.value && !wip.error.value" class="state-box">
        <div class="flex flex-col items-center gap-4 text-center max-w-xs">
          <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <i class="mdi mdi-table-off text-3xl text-slate-300"></i>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-600">Belum ada data untuk periode ini</p>
            <p class="text-xs text-slate-400 mt-1">
              Klik <strong>Generate Data</strong> untuk membuat data mutasi FP &amp; WIP bulan ini
            </p>
          </div>
          <button
            @click="handleRefresh"
            :disabled="refreshing"
            class="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700
                   text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-60"
          >
            <i class="mdi text-sm" :class="refreshing ? 'mdi-loading mdi-spin' : 'mdi-refresh'"></i>
            {{ refreshing ? 'Memuat...' : 'Generate Data' }}
          </button>
        </div>
      </div>

      <PlanningTable
        v-else
        ref="tableRef"
        :jobs="filteredRows"
        :current-year="fp.selectedYear.value"
        :current-month="fp.selectedMonth.value"
        :planning-v2="planningV2"
        :holidays="fp.meta.value?.holidays ?? {}"
        @customer-cell-click="openCustomerModal"
        @plan-cell-click="handlePlanCellClick"
        @initial-stock-open="openInitialStockModal"
        @initial-stock-reset="handleInitialStockReset"
        @stock-cell-click="handleStockCellClick"
        @shift-mode-change="handleShiftModeChange"
        @forecast-cell-click="handleForecastClick"
        @dn-cell-click="openDnModal"
      />
    </div>

    <!-- ── Preview dampak Unlock semua ─────────────────────────── -->
    <UnlockPreviewModal
      :show="showUnlockPreview"
      :busy="bulkUnlocking"
      :jobs="lockedJobs"
      :area-code="areaCode"
      :period-label="fp.currentMonthLabel.value"
      @close="showUnlockPreview = false"
      @confirm="confirmBulkUnlock"
    />

    <!-- ── Plan Edit Modal ──────────────────────────────────────── -->
    <PlanEditModal
      :show="activeLock.editModal.value.open"
      :ctx="activeLock.editModal.value.ctx"
      :submitting="activeLock.submitting.value"
      :error="activeLock.lockError.value"
      @close="activeLock.closeEditModal"
      @submit="handleModalSubmit"
    />

    <!-- ── Stock Edit Modal ──────────────────────────────────────── -->
    <ActualEditModal
      :show="stockModal.open"
      :ctx="stockModal.ctx"
      :submitting="apiOf(stockModal.kind).adjustingStock.value"
      :reverting="apiOf(stockModal.kind).revertingStock.value"
      :error="stockError"
      @close="closeStockModal"
      @submit="handleStockSubmit"
      @revert="handleStockRevert"
    />

    <!-- ── Adjust DN manual (FP, 2026-09-25) ───────────────────────────── -->
    <DnAdjustModal
      :show="dnModal.open"
      :ctx="dnModal.ctx"
      :busy="dnModal.busy"
      :error="dnModal.error"
      @close="dnModal.open = false"
      @submit="handleDnSubmit"
      @reset="handleDnReset"
    />

    <!-- ── Rincian per Customer (MDFO/DN/PCS gabungan, Aturan #16) — FP ── -->
    <CustomerBreakdownModal
      :show="custModal.open"
      :ctx="custModal.ctx"
      @close="custModal.open = false"
    />

    <!-- ── Initial Stock Modal (2026-09-16, ganti inline edit) ────── -->
    <InitialStockModal
      :show="initStockModal.open"
      :ctx="initStockModal.ctx"
      :submitting="initStockSubmitting"
      :resetting="initStockResetting"
      :error="initStockError"
      @close="closeInitialStockModal"
      @submit="handleInitialStockSubmit"
      @reset="handleInitialStockResetFromModal"
    />

    <!-- ── Parent Detail (mini-mutasi WIP) Modal — async chunk, baru
         di-fetch saat pertama kali dibuka. -->
    <ParentDetailModal
      v-if="parentModal.open"
      :show="parentModal.open"
      :part-no="parentModal.partNo"
      :part-name="parentModal.partName"
      :tanggal="parentModal.tanggal"
      :month-label="wip.currentMonthLabel.value"
      :daily="parentModal.daily"
      @close="parentModal.open = false"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PlanningHeader    from '@/components/welding/mutation/Header.vue';
import PlanningTable     from '@/components/welding/mutation/Table.vue';
import PlanEditModal     from '@/components/welding/mutation/PlanEditModal.vue';
import UnlockPreviewModal from '@/components/welding/mutation/UnlockPreviewModal.vue';
import PresenceAvatars from '@/components/welding/mutation/PresenceAvatars.vue';
import { useMutasiPresence } from '@/composables/useMutasiPresence';
import ActualEditModal   from '@/components/welding/mutation/ActualEditModal.vue';
import type { ActualEditCtx } from '@/components/welding/mutation/ActualEditModal.vue';
import InitialStockModal from '@/components/welding/mutation/InitialStockModal.vue';
import CustomerBreakdownModal from '@/components/welding/mutation/CustomerBreakdownModal.vue';
import DnAdjustModal     from '@/components/welding/mutation/DnAdjustModal.vue';
import type { DnAdjustCtx } from '@/components/welding/mutation/DnAdjustModal.vue';
import type { CustomerBreakdownCtx } from '@/components/welding/mutation/CustomerBreakdownModal.vue';
import type { InitialStockCtx } from '@/components/welding/mutation/InitialStockModal.vue';
import { useMutationData }    from '@/composables/useMutationData';
import { useWipMutationData } from '@/composables/useWipMutationData';
import { useTableFilter, applyJobFilters } from '@/composables/useTableFilter';
import { usePlanLock }        from '@/composables/usePlanLock';
import { useMutationSocket }  from '@/composables/useMutationSocket';
import mutasiService          from '@/services/Public/Welding/mutasiService';
import wipMutationService     from '@/services/Public/Welding/wipMutationService';
import type { DateData, DnAdjustMode, Job, MutasiKind, WipParentDaily } from '@/types/Public/Welding/planning';
import type { PlanEditFormData } from '@/composables/usePlanLock';
import { mergeMutasiRows, isIdleJob } from '@/utils/mutasiKind';

// Modal khusus WIP — async component, chunk terpisah, baru di-fetch saat dirender.
const ParentDetailModal = defineAsyncComponent(() =>
  import('@/components/welding/mutasi-wip/ParentDetailModal.vue'),
);

const route  = useRoute();
const router = useRouter();

// ── Data FP & WIP (endpoint + lock masing-masing) ─────────────────
const fp      = useMutationData();
const wip     = useWipMutationData();
const fpLock  = usePlanLock(fp.jobs, mutasiService);
const wipLock = usePlanLock(wip.jobs, wipMutationService);

type MutasiApi = typeof wip;
const apiOf  = (k: MutasiKind): MutasiApi => (k === 'WIP' ? wip : fp);
const lockOf = (k: MutasiKind) => (k === 'WIP' ? wipLock : fpLock);
const both   = [fp, wip] as MutasiApi[];

// Flag gabungan untuk toolbar (sibuk bila salah satu sibuk).
type BusyFlag = 'updatingStock' | 'adjustingStock' | 'recalculating' | 'uploading';
const anyOf = (flag: BusyFlag) => both.some(a => a[flag].value);
const loading        = computed(() => fp.loading.value || wip.loading.value);
const refreshing     = computed(() => fp.refreshing.value || wip.refreshing.value);
const refreshMessage = computed(() => fp.refreshMessage.value || wip.refreshMessage.value);
const planningV2     = computed(() => fp.planningV2.value);
const countLocked    = computed(() => fpLock.countLocked.value + wipLock.countLocked.value);
const bulkUnlocking  = computed(() => fpLock.bulkUnlocking.value || wipLock.bulkUnlocking.value);
const errorText      = computed(() =>
  fp.error.value || wip.error.value || fp.uploadError.value || wip.uploadError.value
  || fpLock.lockError.value || wipLock.lockError.value || '');

// ── Baris gabungan: urut mesin → part (FP & WIP dicampur) ─────────
const allRows = computed(() => mergeMutasiRows(fp.jobs.value, wip.jobs.value));
// Sedang memuat area/periode lain sementara data lama masih tampil.
const swapping = computed(() => loading.value && allRows.value.length > 0);
const hasRows = computed(() => allRows.value.length > 0);

// Saklar "sembunyikan part kosong" (tanpa MDFO/Σ parent, DN, plan, actual — hanya stok).
// Preferensi per browser; opsi filter kolom ikut dari baris yang tampil.
const HIDE_IDLE_KEY = 'mutasi_hide_idle';
const hideIdle = ref((() => { try { return localStorage.getItem(HIDE_IDLE_KEY) === '1'; } catch { return false; } })());
watch(hideIdle, (v) => { try { localStorage.setItem(HIDE_IDLE_KEY, v ? '1' : '0'); } catch { /* abaikan */ } });
const idleCount   = computed(() => allRows.value.filter(isIdleJob).length);
const visibleRows = computed(() => hideIdle.value ? allRows.value.filter(j => !isIdleJob(j)) : allRows.value);

const { filters } = useTableFilter(visibleRows);
const filteredRows = computed(() => applyJobFilters(visibleRows.value, filters.value));

// Bookmark lama sheet WIP (?sheet=wip / /mutasi-wip/:area) → filter TIPE = WIP.
if ((route.query.sheet as string) === 'wip') filters.value.kind = ['WIP'];

// ── Socket realtime ────────────────────────────────────────────────
// Sinkron cron (2026-09-17): tiap refresh (cron 15 menit / klik user lain) →
// grid silent-fetch + banner sumber pembaruan, supaya planner tahu data
// terus diperbarui tanpa menekan Refresh.
// Event dari area LAIN diabaikan: tanpa filter ini tiap input achievement di area
// mana pun memicu fetch ulang FP+WIP (MB-an) di semua layar mutasi yang terbuka.
// p.area bisa zone (pipeline/LKH) atau kode area master (Achievement V2); event
// tanpa area (mis. refresh semua area) tetap diproses.
const isOtherArea = (p?: { area?: string }) =>
  !!p?.area && p.area !== areaCode.value && !fpZonesOf(areaCode.value).includes(p.area);

const { connected: socketConnected } = useMutationSocket(async (p) => {
  if (isOtherArea(p)) return;
  await fp.silentFetch();
  if (!p?.source) return;
  const jam = p.at ? new Date(p.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
  const who = p.source === 'cron' ? 'otomatis (cron)' : `oleh ${p.by ?? 'user lain'}`;
  fp.refreshMessage.value = `Planning diperbarui ${who}${jam ? ' · ' + jam : ''}${p.elapsed_s ? ' · ' + p.elapsed_s + ' dtk' : ''}${p.restored ? ' · ' + p.restored + ' koreksi stok dipulihkan' : ''}`;
  setTimeout(() => { if (!fp.refreshing.value) fp.refreshMessage.value = null; }, 8000);
});
useMutationSocket(async (p) => { if (!isOtherArea(p)) await wip.silentFetch(); });

// ── Local state ───────────────────────────────────────────────────
const areaName           = ref('SA ADM');
const areaCode           = fp.areaCode;
const fpZonesOf          = fp.zonesOf;
const showRefreshWarning = ref(false);
const showRefreshMenu    = ref(false);
const refreshMenuRef     = ref<HTMLElement | null>(null);
const presence           = useMutasiPresence(areaCode);

// ── Modal edit: jenis baris yang sedang diedit menentukan lock/API-nya ──
const activeKind = ref<MutasiKind>('FP');
const activeLock = computed(() => lockOf(activeKind.value));

// ── Stock edit modal state ────────────────────────────────────────
const stockModal = ref<{ open: boolean; kind: MutasiKind; ctx: ActualEditCtx | null }>({ open: false, kind: 'FP', ctx: null });
const stockError = ref<string | null>(null);

// ── Rincian per customer (klik MDFO/DN/PCS pada part gabungan) — FP ──
const custModal = ref<{ open: boolean; ctx: CustomerBreakdownCtx | null }>({ open: false, ctx: null });
const openCustomerModal = (data: { job: Job; tanggal: number }) => {
  custModal.value = { open: true, ctx: { job: data.job, tanggal: data.tanggal } };
};

// ── Adjust DN manual (FP, 2026-09-25) ─────────────────────────────
// Simpan → DN sel langsung berubah; plan baru ikut setelah pipeline area jalan,
// jadi setelah simpan/hapus langsung dipicu Refresh area FP (step 3 menerapkan
// ulang adjust, step 4+ menurunkan plan).
const dnModal = ref<{ open: boolean; busy: boolean; error: string | null; areaCode: string; ctx: DnAdjustCtx | null }>(
  { open: false, busy: false, error: null, areaCode: '', ctx: null }
);
const openDnModal = (data: { job: Job; tanggal: number; shift: 'day' | 'night'; dateData: DateData }) => {
  dnModal.value = {
    open: true, busy: false, error: null,
    areaCode: data.job.areaCode || areaCode.value,
    ctx: { partNo: data.job.partNo, partName: data.job.partName, tanggal: data.tanggal, shift: data.shift, dateData: data.dateData },
  };
};
async function runDnAction(action: () => Promise<{ success: boolean; message?: string }>) {
  dnModal.value.busy = true; dnModal.value.error = null;
  try {
    const res = await action();
    if (!res.success) { dnModal.value.error = res.message ?? 'Gagal menyimpan adjust DN'; return; }
    dnModal.value.open = false;
    fp.refreshMessage.value = res.message ?? 'Adjust DN disimpan';
    await fp.refreshMutasi();
  } catch (e: any) {
    dnModal.value.error = e?.response?.data?.message ?? e?.message ?? 'Gagal menyimpan adjust DN';
  } finally {
    dnModal.value.busy = false;
  }
}
const handleDnSubmit = (d: { manualQty: number; mode: DnAdjustMode; note: string }) => {
  const c = dnModal.value.ctx; if (!c) return;
  runDnAction(() => mutasiService.adjustDn(fp.selectedYear.value, fp.selectedMonth.value, dnModal.value.areaCode,
    c.partNo, c.tanggal, c.shift, d.manualQty, d.mode, d.note || undefined));
};
const handleDnReset = () => {
  const c = dnModal.value.ctx; if (!c) return;
  if (!confirm(`Hapus adjust DN ${c.shift} tgl ${c.tanggal} untuk ${c.partNo}?\nDN kembali ke nilai sistem (SO/DO).`)) return;
  runDnAction(() => mutasiService.resetDnAdjust(fp.selectedYear.value, fp.selectedMonth.value, dnModal.value.areaCode,
    c.partNo, c.tanggal, c.shift));
};


// ── Initial stock modal state ─────────────────────────────────────
const initStockModal      = ref<{ open: boolean; kind: MutasiKind; ctx: InitialStockCtx | null }>({ open: false, kind: 'FP', ctx: null });
const initStockSubmitting = ref(false);
const initStockResetting  = ref(false);
const initStockError      = ref<string | null>(null);

// ── Parent detail (mini-mutasi WIP) modal ─────────────────────────
const parentModal = ref<{ open: boolean; partNo: string; partName: string; tanggal: number; daily: WipParentDaily[] }>(
  { open: false, partNo: '', partName: '', tanggal: 0, daily: [] }
);
const handleForecastClick = (data: { partNo: string; partName: string; tanggal: number }) => {
  const job = wip.jobs.value.find(j => j.partNo === data.partNo);
  const daily = (job?.parentDaily?.[data.tanggal] ?? []) as WipParentDaily[];
  parentModal.value = { open: true, partNo: data.partNo, partName: data.partName, tanggal: data.tanggal, daily };
};

// ── Period change — FP & WIP ──────────────────────────────────────
const handlePeriodChange = async (data: { month: number; year: number }) => {
  await Promise.all(both.map(a => a.onPeriodChange(data)));
};

// ── Refresh — FP dulu (demand parent), lalu WIP ────────────────────
const handleRefresh = async () => {
  if (countLocked.value > 0) showRefreshWarning.value = true;
  for (const a of both) {
    const result = await a.refreshMutasi();
    if (!result.success) console.error('Refresh gagal:', result.message);
  }
};
const handleRefreshAll = async () => {
  if (countLocked.value > 0) showRefreshWarning.value = true;
  for (const a of both) {
    const result = await a.refreshAllAreas();
    if (!result.success) console.error('Refresh semua area:', result.message);
  }
};
function chooseRefresh(scope: 'area' | 'all') {
  showRefreshMenu.value = false;
  if (scope === 'all') handleRefreshAll();
  else handleRefresh();
}
function onRefreshMenuOutside(e: MouseEvent) {
  if (refreshMenuRef.value && !refreshMenuRef.value.contains(e.target as Node)) showRefreshMenu.value = false;
}
// ── Shortcut keyboard ─────────────────────────────────────────────
const tableRef    = ref<{ scrollToToday: (smooth?: boolean) => void; scrollByPage: (dir: 1 | -1) => void } | null>(null);
const showKbdHelp = ref(false);
const kbdMenuRef  = ref<HTMLElement | null>(null);
const SHORTCUTS = [
  { keys: ['R'],        label: 'Refresh area ini' },
  { keys: ['T'],        label: 'Ke kolom hari ini' },
  { keys: ['Shift', '←'], label: 'Geser tanggal ke kiri' },
  { keys: ['Shift', '→'], label: 'Geser tanggal ke kanan' },
  { keys: ['H'],        label: 'Tampil / sembunyikan part kosong' },
  { keys: ['U'],        label: 'Preview & unlock sel terkunci' },
  { keys: ['?'],        label: 'Buka / tutup daftar ini' },
];
const anyModalOpen = () =>
  showUnlockPreview.value || activeLock.value.editModal.value.open || stockModal.value.open
  || custModal.value.open || dnModal.value.open || parentModal.value.open
  || !!document.querySelector('[aria-modal="true"], .v-overlay--active');

function onShortcut(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  const t = e.target as HTMLElement | null;
  if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
  if (e.key === 'Escape') { showKbdHelp.value = false; showRefreshMenu.value = false; return; }
  if (anyModalOpen()) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const run = (fn: () => void) => { e.preventDefault(); fn(); };
  if (k === '?')                           run(() => { showKbdHelp.value = !showKbdHelp.value; });
  else if (k === 'r' && !e.shiftKey)       run(() => { if (!refreshing.value && !loading.value) handleRefresh(); });
  else if (k === 't')                      run(() => tableRef.value?.scrollToToday());
  else if (k === 'h')                      run(() => { if (idleCount.value > 0 || hideIdle.value) hideIdle.value = !hideIdle.value; });
  else if (k === 'u')                      run(openUnlockPreview);
  else if (e.shiftKey && k === 'ArrowLeft')  run(() => tableRef.value?.scrollByPage(-1));
  else if (e.shiftKey && k === 'ArrowRight') run(() => tableRef.value?.scrollByPage(1));
}
function onKbdMenuOutside(e: MouseEvent) {
  if (kbdMenuRef.value && !kbdMenuRef.value.contains(e.target as Node)) showKbdHelp.value = false;
}

onMounted(() => {
  document.addEventListener('keydown', onShortcut);
  document.addEventListener('click', onKbdMenuOutside);
  document.addEventListener('click', onRefreshMenuOutside);
  if (!route.params.area) for (const a of both) a.fetchMutasi();
});
onUnmounted(() => {
  document.removeEventListener('keydown', onShortcut);
  document.removeEventListener('click', onKbdMenuOutside);
  document.removeEventListener('click', onRefreshMenuOutside);
});

// ── Area change (lewat route param) ───────────────────────────────
const handleAreaChange = async (area: { code: string; label: string; param: string }) => {
  if (area.code === areaCode.value) return;
  areaName.value = area.label;
  await router.push({ name: 'PlanningProduksiAreaWelding', params: { area: area.param }, query: route.query });
};

// ── Upload (jenis dipilih di dialog Header) ───────────────────────
const uploadResult = ref<{ message: string; rows_updated: number; rows_skipped: number } | null>(null);
const handleUpload = async (file: File, kind: MutasiKind) => {
  uploadResult.value = null;
  const res = await apiOf(kind).uploadMutasi(file);
  if (res.success) {
    uploadResult.value = {
      message:      `${kind}: ${res.message ?? ''}`,
      rows_updated: res.rows_updated ?? 0,
      rows_skipped: res.rows_skipped ?? 0,
    };
  }
};

// ── Initial stock edit (modal) ────────────────────────────────────
const openInitialStockModal = (job: Job) => {
  initStockError.value = null;
  initStockModal.value = {
    open: true,
    kind: job.kind ?? 'FP',
    ctx: {
      partNo: job.partNo, partName: job.partName,
      currentStock: job.initialStock,
      locked: !!job.initialStockLocked,
      lockedBy: job.initialStockBy ?? null,
      lockedAt: job.initialStockAt ?? null,
    },
  };
};
const closeInitialStockModal = () => { initStockModal.value.open = false; initStockError.value = null; };

const handleInitialStockSubmit = async (newStock: number) => {
  const { ctx, kind } = initStockModal.value;
  if (!ctx) return;
  initStockSubmitting.value = true; initStockError.value = null;
  try {
    const api = apiOf(kind);
    const res = await api.updateInitialStock(ctx.partNo, newStock);
    if (res.success) { closeInitialStockModal(); await api.recalcPlanning(); }
    else initStockError.value = res.message ?? 'Gagal menyimpan initial stock';
  } finally { initStockSubmitting.value = false; }
};

const handleInitialStockResetFromModal = async () => {
  const { ctx, kind } = initStockModal.value;
  if (!ctx) return;
  initStockResetting.value = true; initStockError.value = null;
  try {
    const api = apiOf(kind);
    const res = await api.unlockInitialStock(ctx.partNo);
    if (res.success) { closeInitialStockModal(); await api.recalcPlanning(); }
    else initStockError.value = res.message ?? 'Gagal reset initial stock';
  } finally { initStockResetting.value = false; }
};

const handleInitialStockReset = async (data: { kind: MutasiKind; partNo: string }) => {
  const ok = window.confirm(
    `Reset initial stock ${data.kind} ${data.partNo} ke stok sistem?\n` +
    `Nilai manual akan dihapus dan baris kembali mengikuti stok sistem.`
  );
  if (!ok) return;
  const api = apiOf(data.kind);
  const res = await api.unlockInitialStock(data.partNo);
  if (res.success) await api.recalcPlanning();
};

// ── Plan cell click ───────────────────────────────────────────────
const handlePlanCellClick = (data: { kind: MutasiKind; partNo: string; partName: string; tanggal: number; dateData: DateData }) => {
  // Aturan #7 — bawa info kapasitas (mesin/UPH/shift mode/TPT cap) ke modal,
  // supaya user tahu batas sebelum menaikkan nilai plan manual.
  const api = apiOf(data.kind);
  const job = api.jobs.value.find(j => j.partNo === data.partNo);
  activeKind.value = data.kind;
  lockOf(data.kind).openEditModal({
    partNo:         data.partNo,
    partName:       data.partName,
    tanggal:        data.tanggal,
    year:           api.selectedYear.value,
    month:          api.selectedMonth.value,
    areaCode:       job?.areaCode || areaCode.value, // zone asli baris (area master bisa gabungan)
    dateData:       data.dateData,
    machine:        job?.machine ?? null,
    uph:            job?.uph ?? null,
    shiftMode:      job?.shiftMode,
    qtyKbn:         job?.qty_kbn,
    tptCapDayHours:   api.meta.value?.tpt_cap_day_hours,
    tptCapNightHours: api.meta.value?.tpt_cap_night_hours,
  });
};

// ── Modal submit ──────────────────────────────────────────────────
const handleModalSubmit = async (form: PlanEditFormData) => {
  const lock = activeLock.value;
  const ctx = lock.editModal.value.ctx;
  if (!ctx) return;
  await lock.handleModalSubmit(ctx, form);
  await apiOf(activeKind.value).recalcPlanning();
};

// ── Bulk unlock (FP & WIP) — lewat preview dampak dulu ──────────────
const showUnlockPreview = ref(false);
// Hanya job yang punya sel terkunci (modal tak perlu memindai semua baris).
const lockedJobs = computed(() => [...fp.jobs.value, ...wip.jobs.value].filter(j =>
  Object.values(j.descriptions.find(d => d.type === 'PLAN')?.dates ?? {}).some(d => d.lock_day || d.lock_night)));
function openUnlockPreview() {
  if (countLocked.value > 0 && !bulkUnlocking.value) showUnlockPreview.value = true;
}
async function confirmBulkUnlock() {
  await handleBulkUnlock();
  showUnlockPreview.value = false;
}

const handleBulkUnlock = async () => {
  showRefreshWarning.value = false;
  // Backend bulk_unlock per zone → area master gabungan diproses berurutan.
  for (const kind of ['FP', 'WIP'] as MutasiKind[]) {
    const lock = lockOf(kind);
    if (lock.countLocked.value === 0) continue;
    const api = apiOf(kind);
    let rows = 0; let ok = true;
    for (const z of fpZonesOf(areaCode.value)) {
      const result = await lock.submitBulkUnlock({
        year:      api.selectedYear.value,
        month:     api.selectedMonth.value,
        area_code: z,
      });
      if (!result.success) { ok = false; break; }
      rows += result.rows ?? 0;
    }
    if (ok) {
      console.info(`Bulk unlock ${kind}: ${rows} baris dibuka`);
      await api.recalcPlanning();
    }
  }
};

// ── Stock cell click / adjust ─────────────────────────────────────
const handleStockCellClick = (data: {
  kind: MutasiKind; partNo: string; partName: string; tanggal: number; shift: 'day' | 'night'; currentStock: number;
  wasAdjusted: boolean; lastAdjustBy: string | null; lastAdjustAt: string | null; lastAdjustNote: string | null;
}) => {
  // Aturan #20: tolak edit baru selama adjust/revert/recalc sebelumnya belum
  // selesai. Edit beruntun dulu bikin adjust kedua membaca stok 0 di tengah
  // reset rolling area (backend kini juga antre per area, ini lapis UI-nya).
  const api = apiOf(data.kind);
  if (api.adjustingStock.value || api.revertingStock.value || api.recalculating.value) {
    api.refreshMessage.value = 'Tunggu — proses stok/plan sebelumnya masih berjalan.';
    setTimeout(() => { api.refreshMessage.value = null; }, 2500);
    return;
  }
  stockError.value = null;
  stockModal.value = {
    open: true,
    kind: data.kind,
    ctx: {
      partNo:         data.partNo,
      partName:       data.partName,
      tanggal:        data.tanggal,
      shift:          data.shift,
      currentStock:   data.currentStock,
      wasAdjusted:    data.wasAdjusted,
      lastAdjustBy:   data.lastAdjustBy,
      lastAdjustAt:   data.lastAdjustAt,
      lastAdjustNote: data.lastAdjustNote,
    },
  };
};

const closeStockModal = () => {
  stockModal.value = { open: false, kind: stockModal.value.kind, ctx: null };
  stockError.value = null;
};

// ── Shift mode (both / day / night per part) ──────────────────────
const handleShiftModeChange = async (data: { kind: MutasiKind; partNo: string; mode: 'both' | 'day' | 'night'; scope: 'month' | 'date' }) => {
  const api = apiOf(data.kind);
  const tgl = data.scope === 'date' ? new Date().getDate() : undefined;
  const res = await api.setShiftMode(data.partNo, data.mode, data.scope, tgl);
  if (res.success) {
    api.refreshMessage.value = `Mode shift ${data.kind} ${data.partNo} → ${data.mode} (${data.scope === 'date' ? 'hari ini' : 'sebulan'}) · plan dihitung ulang`;
    setTimeout(() => { api.refreshMessage.value = null; }, 4000);
  } else {
    api.error.value = res.message ?? 'Gagal mengubah mode shift';
  }
};

const handleStockSubmit = async (newStock: number, note: string) => {
  const { ctx, kind } = stockModal.value;
  if (!ctx) return;
  const { partNo, tanggal, shift } = ctx;
  stockError.value = null;

  const api = apiOf(kind);
  const res = await api.adjustStock({ part_number: partNo, tanggal, shift, new_stock: newStock, note: note || undefined });
  if (res.success) {
    closeStockModal();
    await api.recalcPlanning();
  } else {
    stockError.value = res.message ?? 'Gagal menyimpan koreksi stok';
  }
};

// Undo/revert koreksi stok (Aturan #19) — backend sudah recalc + reapply,
// balasannya 1 area penuh, jadi TIDAK perlu recalcPlanning lagi.
const handleStockRevert = async () => {
  const { ctx, kind } = stockModal.value;
  if (!ctx) return;
  const { partNo, tanggal, shift } = ctx;
  if (!confirm(`Batalkan koreksi stok ${kind} ${shift} tanggal ${tanggal} untuk ${partNo}?\nStok & plan akan dihitung ulang dari data berjalan.`)) return;
  stockError.value = null;
  const api = apiOf(kind);
  const res = await api.revertStockAdjust({ part_number: partNo, tanggal, shift });
  if (res.success) {
    closeStockModal();
    api.refreshMessage.value = res.message ?? 'Koreksi stok dibatalkan';
    setTimeout(() => { api.refreshMessage.value = null; }, 4000);
  } else {
    stockError.value = res.message ?? 'Gagal membatalkan koreksi stok';
  }
};

// ── Route watcher (area) — FP & WIP ───────────────────────────────
watch(
  () => route.params.area,
  (areaParam, prevParam) => {
    const area = areaParam as string;
    if (!area) return;
    const decoded = decodeURIComponent(area).replace(/-/g, ' ').toUpperCase();
    // Sama dengan area aktif → skip, KECUALI panggilan pertama (immediate) —
    // area default composable bisa sama dengan param route, data tetap harus dimuat.
    if (decoded === areaCode.value && prevParam !== undefined) return;
    areaName.value = decoded;
    // Filter part/model/mesin milik area lama — bila dibiarkan, part area baru
    // tersaring habis (tabel kosong walau data ada). Filter TIPE tetap.
    filters.value = { kind: filters.value.kind, jobNo: [], partNo: [], model: [], machine: [], description: [] };
    for (const a of both) {
      a.areaCode.value = decoded;
      a.fetchMutasi();
    }
    },
  { immediate: true }
);
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────── */
.page-root {
  position: fixed;
  top: var(--v-layout-top, 0px);
  left: var(--v-layout-left, 0px);
  right: 0;
  bottom: var(--v-layout-bottom, 0px);
  z-index: 1;
  display: flex;
  flex-direction: column;
  background: var(--dm-bg, #f1f5f9);
  overflow: hidden;
}

/* ── Transisi ganti area / periode ─────────────────────── */
.table-area > *:not(.swap-pill) { transition: opacity .28s ease, filter .28s ease; }
.table-area--swapping > *:not(.swap-pill) {
  opacity: .35; filter: blur(1.5px) saturate(.6); pointer-events: none;
}
.swap-pill {
  position: absolute; top: 72px; left: 50%; transform: translateX(-50%); z-index: 300;
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px;
  background: #1e3a8a; color: #fff; font-size: 12px; font-weight: 600;
  box-shadow: 0 8px 20px -6px rgba(30, 58, 138, .5);
}
.swap-pill-enter-active, .swap-pill-leave-active { transition: opacity .2s ease, transform .2s ease; }
.swap-pill-enter-from, .swap-pill-leave-to { opacity: 0; transform: translate(-50%, -6px); }
@media (prefers-reduced-motion: reduce) {
  .table-area > *, .swap-pill-enter-active, .swap-pill-leave-active { transition: none !important; }
}

/* ── Toolbar ─────────────────────────────────────────── */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 36px;
  background: var(--dm-surface, #ffffff);
  border-bottom: 1px solid var(--dm-border, #e2e8f0);
  flex-shrink: 0;
  gap: 12px;
}
.toolbar-left { display: flex; align-items: center; gap: 6px; min-width: 0; overflow: hidden; }
.toolbar-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.toolbar-sep { color: #cbd5e1; font-size: 14px; user-select: none; }
.toolbar-meta { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--dm-muted, #64748b); white-space: nowrap; }
.auto-chip {
  display: inline-flex; align-items: center; gap: 3px; margin-left: 6px; padding: 0 7px; line-height: 16px;
  border-radius: 999px; font-size: 9.5px; font-weight: 700; letter-spacing: .2px;
  background: var(--dm-tint-green, #ecfdf5); color: var(--dm-on-green, #047857); border: 1px solid var(--dm-bd-green, #a7f3d0); cursor: help;
}
.auto-chip .mdi { font-size: 11px; animation: auto-spin 6s linear infinite; }
@keyframes auto-spin { to { transform: rotate(360deg); } }

.toolbar-count {
  display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px;
  border-radius: 999px; font-weight: 600; font-size: 10px;
}
.toolbar-count--fp  { background: var(--dm-tint-blue, #eff6ff); border: 1px solid var(--dm-bd-blue, #dbeafe); color: var(--dm-accent, #1d4ed8); }
.toolbar-count--wip { background: var(--dm-tint-violet, #f5f3ff); border: 1px solid var(--dm-bd-blue, #ede9fe); color: var(--dm-on-violet, #6d28d9); }

.lock-badge {
  display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px;
  border-radius: 20px; background: var(--dm-tint-red, #fee2e2); border: 1px solid var(--dm-bd-red, #fecaca);
  color: var(--dm-on-red, #b91c1c); font-size: 11px; font-weight: 600; white-space: nowrap;
}
.lock-unlock-btn {
  display: inline-flex; align-items: center; gap: 3px; margin-left: 2px; padding: 0 4px;
  font-size: 10px; font-weight: 700; color: var(--dm-on-red, #b91c1c); opacity: 0.7; transition: opacity 0.15s; cursor: pointer;
}
.lock-unlock-btn:hover:not(:disabled) { opacity: 1; }

.toolbar-error { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #ef4444; white-space: nowrap; }
.toolbar-success {
  display: inline-flex; align-items: center; gap: 4px; padding: 1px 9px; border-radius: 20px;
  background: var(--dm-tint-green, #ecfdf5); border: 1px solid var(--dm-bd-green, #a7f3d0); color: var(--dm-on-green, #059669); font-size: 11px; font-weight: 600; white-space: nowrap;
}

/* ── Toolbar buttons ─────────────────────────────────── */
.refresh-wrap { position: relative; display: inline-flex; }
.refresh-main { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.refresh-caret { border-top-left-radius: 0; border-bottom-left-radius: 0; border-left: none; padding: 0 4px; min-width: 0; }
.caret-ico { font-size: 12px; line-height: 1; opacity: .7; }
.refresh-menu {
  position: absolute; top: calc(100% + 4px); right: 0; z-index: 200;
  background: var(--dm-surface, #fff); border: 1px solid var(--dm-border, #e2e8f0); border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.12); overflow: hidden; min-width: 180px;
}
.refresh-item {
  display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
  padding: 8px 12px; background: none; border: none; cursor: pointer; font-size: 12px; color: var(--dm-cell, #374151);
}
.refresh-item:hover { background: var(--dm-tint-violet, #f5f3ff); color: var(--dm-on-violet, #6d28d9); }
.refresh-item .mdi { font-size: 14px; }

.toolbar-btn {
  display: flex; align-items: center; gap: 5px; height: 26px; padding: 0 10px;
  border: 1px solid var(--dm-border, #e2e8f0); border-radius: 6px; font-size: 11px; font-weight: 600;
  color: var(--dm-text-2, #475569); background: var(--dm-surface, white); cursor: pointer; transition: all 0.15s; white-space: nowrap; user-select: none;
}
.toolbar-btn:hover:not(:disabled) { background: var(--dm-surface2, #f8fafc); border-color: #94a3b8; color: var(--dm-text, #1e293b); }
.idle-short { display: none; }
.idle-count { font-variant-numeric: tabular-nums; padding: 0 5px; border-radius: 999px; background: rgba(148, 163, 184, .22); font-size: 10px; line-height: 15px; }
.toolbar-btn--idle .idle-count { background: rgba(255, 255, 255, .2); }
.kbd-btn { padding: 0 7px; }
.kbd-menu { min-width: 250px; padding: 8px; }
.kbd-title { font-size: 10.5px; font-weight: 700; color: var(--dm-faint, #94a3b8); text-transform: uppercase; letter-spacing: .4px; padding: 2px 4px 6px; }
.kbd-row { display: flex; align-items: center; gap: 10px; padding: 4px; font-size: 11.5px; color: var(--dm-cell, #334155); }
.kbd-keys { display: inline-flex; gap: 3px; min-width: 64px; }
.kbd-row kbd { font-family: inherit; font-size: 10px; font-weight: 600; min-width: 18px; text-align: center; padding: 1px 5px; border: 1px solid var(--dm-border-strong, #cbd5e1); border-bottom-width: 2px; border-radius: 4px; background: var(--dm-surface2, #f8fafc); color: var(--dm-text-2, #475569); }

/* Tablet / HP: toolbar boleh turun baris, label panjang diringkas. */
@media (max-width: 1024px) {
  .toolbar { height: auto; min-height: 36px; flex-wrap: wrap; padding: 4px 12px; row-gap: 4px; }
  .toolbar-left { flex-wrap: wrap; row-gap: 4px; }
  .toolbar-right { flex-wrap: wrap; margin-left: auto; }
  .idle-long { display: none; }
  .idle-short { display: inline; }
  .kbd-btn { display: none; }
}
@media (max-width: 480px) {
  .idle-short { display: none; }
}
.toolbar-btn--idle { background: #334155; border-color: #334155; color: #ffffff; }
.toolbar-btn--idle:hover:not(:disabled) { background: #1e293b; border-color: #1e293b; color: #ffffff; }

/* ── Warn banner ─────────────────────────────────────── */
.warn-banner {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 16px; background: var(--dm-tint-amber, #fffbeb); border-bottom: 1px solid var(--dm-bd-amber, #fde68a); flex-shrink: 0;
}

/* ── Table area ──────────────────────────────────────── */
.table-area { flex: 1; overflow: hidden; padding: 10px 12px 12px; display: flex; flex-direction: column; position: relative; }
.sheet-pane { flex: 1; min-height: 0; display: flex; flex-direction: column; }

/* ── State boxes ─────────────────────────────────────── */
.state-box {
  flex: 1; display: flex; align-items: center; justify-content: center;
  background: var(--dm-surface, white); border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04);
}

/* ── Socket Live chip ────────────────────────────────── */
.socket-chip {
  position: fixed; bottom: 12px; right: 14px; z-index: 100;
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px;
  background: var(--dm-tint-green, #f0fdf4); border: 1px solid var(--dm-bd-green, #bbf7d0); color: var(--dm-on-green, #15803d); font-size: 10px; font-weight: 700;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08); pointer-events: none;
}
.socket-dot { width: 6px; height: 6px; border-radius: 50%; }
.socket-dot--live { background: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,0.25); animation: pulse-green 2s infinite; }
@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.25); }
  50%       { box-shadow: 0 0 0 5px rgba(34,197,94,0.08); }
}

/* ── SSE pipeline status message ─────────────────────── */
.sse-status {
  display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-style: italic;
  white-space: nowrap; max-width: 520px; overflow: hidden; text-overflow: ellipsis; padding: 0 2px;
}
.sse-status--running { color: var(--dm-muted, #64748b); }
.sse-status--running .mdi { color: #c4b5fd; }
.sse-status--done { color: var(--dm-on-green, #059669); }
.sse-status--done .mdi { color: #34d399; }
.sse-status__text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.sse-msg-enter-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.sse-msg-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.sse-msg-enter-from, .sse-msg-leave-to { opacity: 0; transform: translateX(6px); }

/* ── Transitions ─────────────────────────────────────── */
.fade-in-enter-active { transition: all 0.2s ease; }
.fade-in-leave-active { transition: all 0.15s ease; }
.fade-in-enter-from, .fade-in-leave-to { opacity: 0; transform: translateY(-3px); }

.warn-slide-enter-active, .warn-slide-leave-active { transition: all 0.2s ease; }
.warn-slide-enter-from, .warn-slide-leave-to { opacity: 0; transform: translateY(-4px); max-height: 0; overflow: hidden; }
.warn-slide-enter-to, .warn-slide-leave-from { max-height: 60px; }
</style>
