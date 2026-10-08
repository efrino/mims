// stores/Public/Welding/lkh.ts

import { defineStore } from 'pinia';
import { lkhService } from '@/services/Public/Welding/lkhService';
import type {
    LKHData,
    LKHSummary,
    LKHMeta,
    LKHGenerateParams,
    LKHRefreshResponse,
    LKHStatus,
} from '@/types/Public/Welding/lkh';

export const useLKHStore = defineStore('lkh', {
    state: () => ({
        data: [] as LKHData[],
        summary: null as LKHSummary | null,
        meta: null as LKHMeta | null,
        exists: false,
        lastUpdated: null as string | null,
        loading: false,
        refreshing: false,
        error: null as string | null,
        // Simpan hasil terakhir refresh untuk toast di view
        lastRefreshResult: null as Omit<LKHRefreshResponse, 'data' | 'summary' | 'meta'> | null,
    }),

    getters: {
        hasData: (state) => state.data.length > 0,

        // Status keseluruhan LKH
        // Pakai summary (dari PHP) jika ada, fallback scan data
        lkhStatus: (state): LKHStatus => {
            if (!state.data.length) return 'MDFO';
            if (state.summary) {
                return state.summary.total_preview > 0 ? 'MDFO' : 'DN';
            }
            return state.data.some(r => r.status_plan === 'PREVIEW') ? 'MDFO' : 'DN';
        },

        isTentative(): boolean { return (this as any).lkhStatus === 'MDFO'; },
        isFix(): boolean { return (this as any).lkhStatus === 'DN'; },

        // Stats untuk header — pakai summary, fallback ke scan data
        headerStats: (state): {
            totalJobs: number;
            totalFP: number;
            totalPreview: number;
            totalCarryover: number;
            totalPatanStroke: number;
            totalCutOffStroke: number;
            totalActualLot: number;
        } => {
            const s = state.summary;
            if (s) {
                return {
                    totalJobs: s.total_jobs,
                    totalFP: s.total_fp ?? 0,
                    totalPreview: s.total_preview ?? 0,
                    totalCarryover: s.total_carryover ?? 0,
                    totalPatanStroke: s.total_patan_stroke,
                    totalCutOffStroke: s.total_cutoff_stroke,
                    totalActualLot: s.total_actual_lot,
                };
            }
            // Fallback hitung dari data mentah
            return {
                totalJobs: state.data.length,
                totalFP: state.data.filter(r => r.status_plan === 'FP').length,
                totalPreview: state.data.filter(r => r.status_plan === 'PREVIEW').length,
                totalCarryover: state.data.filter(r => r.status_plan === 'CARRYOVER').length,
                totalPatanStroke: state.data.reduce((a, b) => a + (Number(b.patan_sum_stroke) || 0), 0),
                totalCutOffStroke: state.data.reduce((a, b) => a + (Number(b.cutoff_sum_stroke) || 0), 0),
                totalActualLot: 0,
            };
        },
    },

    actions: {
        async fetch(params: LKHGenerateParams) {
            this.loading = true;
            this.error = null;
            try {
                const res = await lkhService.getLKH(params);
                if (res.success) {
                    this.data = res.data ?? [];
                    this.summary = res.summary ?? null;
                    this.meta = res.meta ?? null;
                    this.lastUpdated = res.meta?.last_updated ?? null;
                } else {
                    this.error = res.message ?? 'Gagal mengambil data';
                    this.data = [];
                }
                return res;
            } catch (e: any) {
                this.error = e?.response?.data?.message ?? e?.message ?? 'Terjadi kesalahan';
                this.data = [];
                return { success: false, message: this.error };
            } finally {
                this.loading = false;
            }
        },

        async refresh(params: LKHGenerateParams) {
            this.refreshing = true;
            this.error = null;
            try {
                const res = await lkhService.refreshLKH(params);
                if (res.success) {
                    this.data = res.data ?? [];
                    this.summary = res.summary ?? null;
                    this.meta = res.meta ?? null;
                    this.exists = true;
                    this.lastUpdated = res.meta?.last_updated ?? null;
                    this.lastRefreshResult = {
                        success: res.success,
                        action: res.action,
                        message: res.message,
                        fix_inserted: res.fix_inserted ?? 0,
                        preview_inserted: res.preview_inserted ?? 0,
                        was_existing: res.was_existing ?? 0,
                        deleted: res.deleted ?? 0,
                        is_weekend: res.is_weekend ?? 0,
                        carryover_inserted: res.carryover_inserted ?? 0,
                    };
                } else {
                    this.error = res.message ?? 'Refresh gagal';
                }
                return res;
            } catch (e: any) {
                const msg = e?.response?.data?.message ?? e?.message ?? 'Terjadi kesalahan';
                this.error = msg;
                return { success: false, message: msg } as any;
            } finally {
                this.refreshing = false;
            }
        },

        async check(params: LKHGenerateParams) {
            try {
                const res = await lkhService.checkLKH(params);
                this.exists = res.success && res.exists;
                this.lastUpdated = res.last_updated ?? null;
                return res;
            } catch {
                this.exists = false;
                return { success: false, exists: false, last_updated: null };
            }
        },

        async updateActual(id: number, payload: {
            actual_lot_size: string | null;
            actual_pjk: string | null;
            actual_tpt: string | null;
        }) {
            try {
                const res = await lkhService.updateActual(id, payload);
                if (res.success) {
                    const row = this.data.find(r => r.id === id);
                    if (row) {
                        row.actual_lot_size = payload.actual_lot_size;
                        row.actual_pjk = payload.actual_pjk;
                        row.actual_tpt = payload.actual_tpt;
                    }
                }
                return res;
            } catch (e: any) {
                return { success: false, message: e?.message ?? 'Gagal update actual' };
            }
        },

        async updateRemarks(id: number, keterangan: string) {
            try {
                const res = await lkhService.updateRemarks(id, keterangan);
                if (res.success) {
                    const row = this.data.find(r => r.id === id);
                    if (row) row.keterangan = keterangan;
                }
                return res;
            } catch (e: any) {
                return { success: false, message: e?.message ?? 'Gagal update keterangan' };
            }
        },

        async updateBLC(id: number, blc: string) {
            try {
                const res = await lkhService.updateBLC(id, blc);
                if (res.success) {
                    const row = this.data.find(r => r.id === id);
                    if (row) row.blc = blc;
                }
                return res;
            } catch (e: any) {
                return { success: false, message: e?.message ?? 'Gagal update BLC' };
            }
        },

        reset() {
            this.data = [];
            this.summary = null;
            this.meta = null;
            this.exists = false;
            this.lastUpdated = null;
            this.error = null;
            this.lastRefreshResult = null;
        },
    },
});