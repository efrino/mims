<template>
  <div class="wip-page">
    <div class="wip-header">
      <div class="wip-header__left">
        <div class="wip-header__icon"><i class="mdi mdi-swap-horizontal-bold"></i></div>
        <div>
          <h1 class="wip-header__title">WIP MANAGEMENT</h1>
          <p class="wip-header__sub">{{ todayLabel }} · Sync: {{ lastSyncLabel }}</p>
        </div>
      </div>
      <div class="wip-header__right">
        <button class="wip-btn wip-btn--ghost" :disabled="store.syncing" @click="doSync">
          <i class="mdi" :class="store.syncing ? 'mdi-loading mdi-spin' : 'mdi-sync'"></i>
          {{ store.syncing ? 'Syncing...' : 'Sync WIP' }}
        </button>
        <button class="wip-btn wip-btn--primary" @click="openGenerate"><i class="mdi mdi-plus"></i> Generate Struk</button>
      </div>
    </div>
    <WipSummaryCards
      :summary="store.summary"
      :trx-list="store.trxList"
      :active-area="activeArea"
      :active-tab="activeTab"
      @toggle-area="toggleArea"
    />
    <div class="wip-tabs">
      <button v-for="t in tabs" :key="t.key" class="wip-tab" :class="{ 'wip-tab--active': activeTab === t.key }" @click="activeTab = t.key">
        <i class="mdi" :class="t.icon"></i>{{ t.label }}
        <span class="wip-tab__count">{{ t.key === 'stock' ? store.stockList.length : store.trxList.length }}</span>
      </button>
      <div v-if="activeArea" class="wip-area-chip" :style="areaChipStyle(activeArea)">
        <span class="wip-area-chip__dot"></span>{{ activeArea }}
        <button class="wip-area-chip__clear" @click="toggleArea(activeArea)">✕</button>
      </div>
    </div>
    <WipStockTable
      v-show="activeTab === 'stock'"
      :stock-list="store.stockList"
      :loading="store.loadingStock"
      @filter-change="
        (f) => {
          Object.assign(stockFilter, f);
          fetchStock();
        }
      "
    />
    <WipTrxTable
      v-show="activeTab === 'trx'"
      :trx-list="store.trxList"
      :loading="store.loadingTrx"
      @filter-change="
        (f) => {
          Object.assign(trxFilter, f);
          fetchTrx();
        }
      "
      @open-detail="openDetail"
      @confirm="confirmTrx"
      @delete="deleteTrx"
      @edit="openEditTrx"
    />
    <WipDetailModal
      :visible="showDetail"
      :detail="store.trxDetail"
      @close="showDetail = false"
      @confirm="
        (id) => {
          confirmTrx(id);
          showDetail = false;
        }
      "
    />
    <WipGenerateModal
      :visible="showGenerate"
      :area-list="store.areaList"
      :loading="generating"
      :error="genError"
      :prefill="null"
      @close="showGenerate = false"
      @submit="handleGenerate"
    />
    <WipGenerateModal
      :visible="showEditTrx"
      :area-list="store.areaList"
      :loading="generating"
      :error="genError"
      :prefill="editTrxRow"
      @close="showEditTrx = false"
      @submit="handleGenerate"
    />
  </div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue';
import { useWipManagement } from '@/composables/useWipManagement';
import { useAreaColor } from '@/composables/useAreaColor';
import WipSummaryCards from '@/components/welding/wip/WipSummaryCards.vue';
import WipStockTable from '@/components/welding/wip/WipStockTable.vue';
import WipTrxTable from '@/components/welding/wip/WipTrxTable.vue';
import WipDetailModal from '@/components/welding/wip/WipDetailModal.vue';
import WipGenerateModal from '@/components/welding/wip/WipGenerateModal.vue';
import type { WipGeneratePayload } from '@/types/Public/Welding/Wip';
const {
  store,
  activeTab,
  activeArea,
  stockFilter,
  trxFilter,
  showDetail,
  showGenerate,
  showEditTrx,
  editTrxRow,
  generating,
  genError,
  todayLabel,
  lastSyncLabel,
  init,
  fetchStock,
  fetchTrx,
  toggleArea,
  openDetail,
  openGenerate,
  openEditTrx,
  doGenerate,
  confirmTrx,
  deleteTrx,
  doSync
} = useWipManagement();
const { getColor } = useAreaColor();
const tabs = [
  { key: 'stock' as const, label: 'WIP Stock', icon: 'mdi-package-variant-closed' },
  { key: 'trx' as const, label: 'Transaksi', icon: 'mdi-swap-horizontal' }
] as const;
onMounted(init);
async function handleGenerate(payload: WipGeneratePayload) {
  await doGenerate(payload);
}
function areaChipStyle(area: string) {
  const c = getColor(area);
  return { '--chip-bg': c.pill, '--chip-border': c.border, '--chip-text': c.text };
}
</script>
<style scoped>
.wip-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding: 16px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 13px;
  --wip-bg: #f0f2f5;
  --wip-bg2: #ffffff;
  --wip-bg3: #f8fafc;
  --wip-border: #e2e8f0;
  --wip-accent: #2e5396;
  --wip-accent2: #1e3a72;
  --wip-text: #1a2744;
  --wip-muted: #6b7280;
  --wip-green: #16a34a;
  --wip-red: #dc2626;
  --wip-radius: 8px;
  --wip-shadow: 0 1px 3px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.04);
}
.wip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  border-radius: 8px;
  padding: 14px 20px;
  margin-bottom: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  flex-wrap: wrap;
  gap: 12px;
}
.wip-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.wip-header__right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.wip-header__icon {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #2e5396, #4472c4);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  flex-shrink: 0;
}
.wip-header__title {
  font-size: 16px;
  font-weight: 700;
  color: #1a2744;
  margin: 0;
}
.wip-header__sub {
  font-size: 11px;
  color: #6b7280;
  margin: 2px 0 0;
}
.wip-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
  white-space: nowrap;
}
.wip-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.wip-btn--primary {
  background: #2e5396;
  color: white;
}
.wip-btn--primary:hover:not(:disabled) {
  background: #4472c4;
}
.wip-btn--ghost {
  background: white;
  color: #374151;
  border: 1.5px solid #e5e7eb;
}
.wip-btn--ghost:hover:not(:disabled) {
  background: #f3f4f6;
}
.wip-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
  background: white;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  flex-wrap: wrap;
}
.wip-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1.5px solid transparent;
  background: transparent;
  color: #6b7280;
  transition: all 0.15s;
}
.wip-tab:hover {
  background: #f3f4f6;
  color: #374151;
}
.wip-tab--active {
  background: #eff6ff;
  color: #2e5396;
  border-color: #bfdbfe;
}
.wip-tab__count {
  background: #e5e7eb;
  border-radius: 10px;
  padding: 1px 8px;
  font-size: 10.5px;
  font-weight: 700;
  color: #4b5563;
}
.wip-tab--active .wip-tab__count {
  background: #dbeafe;
  color: #1d4ed8;
}
.wip-area-chip {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  background: var(--chip-bg, #eff6ff);
  border: 1.5px solid var(--chip-border, #2563eb);
  color: var(--chip-text, #1d4ed8);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
}
.wip-area-chip__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--chip-border, #2563eb);
}
.wip-area-chip__clear {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  font-size: 11px;
  padding: 0 0 0 2px;
}
.wip-area-chip__clear:hover {
  opacity: 1;
}
</style>
