// composables/useLKHData.ts

import { computed, ref } from 'vue';
import { useLKHStore } from '@/stores/Public/Welding/lkh';
import type { LKHGenerateParams, LKHStatus } from '@/types/Public/Welding/lkh';
import lkhService from '@/services/Public/Welding/lkhService';

export function useLKHData() {
    const store = useLKHStore();

    // ── State expose ──────────────────────────────────────────────
    const lkhData = computed(() => store.data);
    const summary = computed(() => store.summary);
    const isLoading = computed(() => store.loading);
    const isRefreshing = computed(() => store.refreshing);
    const error = computed(() => store.error);
    const hasData = computed(() => store.hasData);
    const lkhExists = computed(() => store.exists);
    const lastUpdated = computed(() => store.lastUpdated);

    // ── Label terakhir diperbarui ─────────────────────────────────
    const lastUpdatedLabel = computed(() => {
        if (!store.lastUpdated) return null;
        return new Date(store.lastUpdated).toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    });

    // ── Status LKH keseluruhan ────────────────────────────────────
    // Prioritas: summary.total_preview (dari PHP) → scan data → fallback MDFO
    // Gunakan store getter yang sudah handle logic ini
    const lkhStatus = computed<LKHStatus>(() => store.lkhStatus);
    const isTentative = computed(() => store.isTentative);
    const isFix = computed(() => store.isFix);

    // ── Totals / calculateTotals ──────────────────────────────────
    // Pakai summary dari PHP jika ada, fallback scan manual
    const calculateTotals = computed(() => {
        const s = store.summary;
        if (s) return s;
        const d = store.data;
        return {
            total_jobs: d.length,
            total_plan_process: d.reduce((a, b) => a + (b.plan_process || 0), 0),
            total_patan_stroke: d.reduce((a, b) => a + (b.patan_sum_stroke || 0), 0),
            total_patan_tpt: d.reduce((a, b) => a + (Number(b.patan_tpt) || 0), 0),
            total_cutoff_stroke: d.reduce((a, b) => a + (b.cutoff_sum_stroke || 0), 0),
            total_cutoff_tpt: d.reduce((a, b) => a + (Number(b.cutoff_tpt) || 0), 0),
            total_actual_lot: 0,
            total_actual_tpt: 0,
            total_carryover: d.reduce((a, b) => a + (b.carryover || 0), 0),
            total_fp: d.filter(r => r.status_plan === 'FP').length,
            total_preview: d.filter(r => r.status_plan === 'PREVIEW').length,
        };
    });

    // ── headerStats untuk LKHHeader ───────────────────────────────
    const headerStats = computed(() => store.headerStats);

    // ── Actions ───────────────────────────────────────────────────
    const fetchLKH = (params: LKHGenerateParams) => store.fetch(params);
    const refreshLKH = (params: LKHGenerateParams) => store.refresh(params);

    const checkLKHExists = async (params: LKHGenerateParams): Promise<boolean> => {
        const res = await store.check(params);
        return res.exists;
    };

    const updateActual = (id: number, payload: {
        actual_lot_size: string | null;
        actual_pjk: string | null;
        actual_tpt: string | null;
    }) => store.updateActual(id, payload);

    const updateRemarks = (id: number, keterangan: string) =>
        store.updateRemarks(id, keterangan);

    const updateBLC = (id: number, blc: string) =>
        store.updateBLC(id, blc);

    const resetLKH = () => store.reset();

    // ── Export ────────────────────────────────────────────────────
    const isExporting = ref(false);

    const exportToExcel = async (options: { date: string; shift: number; area: string }) => {
        if (isExporting.value) return;
        isExporting.value = true;
        try {
            await lkhService.exportToExcel(options);
        } catch (err: any) {
            if (err.response?.data instanceof Blob) {
                const text = await err.response.data.text();
                try {
                    const json = JSON.parse(text);
                    throw new Error(json.message ?? 'Export gagal');
                } catch {
                    throw new Error('Export gagal');
                }
            }
            throw err;
        } finally {
            isExporting.value = false;
        }
    };

    return {
        // State
        lkhData, summary, isLoading, isRefreshing,
        error, hasData, lkhExists, lastUpdated, lastUpdatedLabel,
        // Status
        lkhStatus, isTentative, isFix,
        // Computed
        calculateTotals, headerStats,
        // Actions
        fetchLKH, refreshLKH, checkLKHExists,
        updateActual, updateRemarks, updateBLC, resetLKH,
        isExporting, exportToExcel,
    };
}