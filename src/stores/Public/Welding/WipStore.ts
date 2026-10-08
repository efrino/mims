import { defineStore } from 'pinia';
import { useNotificationStore } from '@/stores/notification';
import { useUtilityStore } from '@/stores/utility';
import { getWipStock, getWipTrxList, getWipTrxDetail, generateWipReceipt, confirmWipReceipt, deleteWipTrx, syncWipStock } from '@/services/Public/Welding/WipService';
import type { WipStockItem, WipStockSummary, WipTrxRow, WipTrxDetail, StockFilter, TrxFilter, WipGeneratePayload } from '@/types/Public/Welding/Wip';

function buildSummary(stock: WipStockItem[]): WipStockSummary[] {
  const map = new Map<string, { total_qty: number; parts: Set<string> }>();
  for (const row of stock) {
    const key = row.area_code;
    if (!map.has(key)) map.set(key, { total_qty: 0, parts: new Set() });
    const entry = map.get(key)!;
    entry.total_qty += Number(row.qty) || 0;
    entry.parts.add(row.part_number);
  }
  return Array.from(map.entries()).map(([area_code, v]) => ({ area_code, total_qty: v.total_qty, total_part: v.parts.size })).sort((a, b) => a.area_code.localeCompare(b.area_code));
}

export const useWipStore = defineStore('WeldingWip', {
  state: () => ({
    summary: [] as WipStockSummary[], areaList: [] as string[],
    stockList: [] as WipStockItem[], trxList: [] as WipTrxRow[],
    trxDetail: { header: null, cross: [], internal: [] } as WipTrxDetail,
    loadingStock: false, loadingTrx: false, syncing: false, lastSync: null as string | null,
  }),
  actions: {
    async fetchSummaryAndAreas() {
      try { const res = await getWipStock({}); const all: WipStockItem[] = res.data ?? []; this.summary = buildSummary(all); this.areaList = this.summary.map(s => s.area_code); }
      catch (e) { useUtilityStore().onError(e); }
    },
    async fetchStock(filters: StockFilter = {}) {
      this.loadingStock = true;
      try {
        const res = await getWipStock(filters); this.stockList = res.data ?? [];
        if (!Object.values(filters).some(Boolean)) { this.summary = buildSummary(this.stockList); this.areaList = this.summary.map(s => s.area_code); }
      } catch (e) { useUtilityStore().onError(e); } finally { this.loadingStock = false; }
    },
    async fetchTrxList(filters: TrxFilter = {}) {
      this.loadingTrx = true;
      try { const res = await getWipTrxList(filters); this.trxList = res.data ?? []; }
      catch (e) { useUtilityStore().onError(e); } finally { this.loadingTrx = false; }
    },
    async fetchTrxDetail(id: number) {
      try { const res = await getWipTrxDetail(id); this.trxDetail = res.data; }
      catch (e) { useUtilityStore().onError(e); }
    },
    async generateReceipt(payload: WipGeneratePayload) {
      const notif = useNotificationStore(); notif.loading = true;
      try {
        const res = await generateWipReceipt(payload);
        if (res.status) { notif.showAlertSuccess('Struk berhasil dibuat!'); return res; }
        else { notif.showAlertWarning(res.message ?? 'Gagal generate'); return null; }
      } catch (e) { useUtilityStore().onError(e); return null; } finally { notif.disableLoading(); }
    },
    async confirmTrx(id: number) {
      const notif = useNotificationStore(); notif.loading = true;
      try {
        const res = await confirmWipReceipt(id);
        if (res.status) {
          notif.showAlertSuccess('Struk berhasil dikonfirmasi');
          const row = this.trxList.find(r => r.id === id); if (row) row.status = 'confirmed';
          if (this.trxDetail.header?.id === id) this.trxDetail.header.status = 'confirmed';
        } else { notif.showAlertWarning(res.message ?? 'Gagal konfirmasi'); }
      } catch (e) { useUtilityStore().onError(e); } finally { notif.disableLoading(); }
    },
    async deleteTrx(id: number) {
      const notif = useNotificationStore();
      try {
        const res = await deleteWipTrx(id);
        if (res.status) { notif.showAlertSuccess('Transaksi berhasil dihapus'); this.trxList = this.trxList.filter(r => r.id !== id); }
        else { notif.showAlertWarning(res.message ?? 'Gagal hapus'); }
      } catch (e) { useUtilityStore().onError(e); }
    },
    async sync() {
      this.syncing = true; const notif = useNotificationStore();
      try { await syncWipStock(); this.lastSync = new Date().toISOString(); await this.fetchSummaryAndAreas(); await this.fetchStock({}); notif.showAlertSuccess('Sync WIP berhasil'); }
      catch (e) { useUtilityStore().onError(e); } finally { this.syncing = false; }
    },
  },
});