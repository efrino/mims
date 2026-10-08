// services/Public/Welding/lkhService.ts

import axios from 'axios';
import type {
    LKHGenerateParams,
    LKHFetchResponse,
    LKHCheckResponse,
    LKHMutasiParams,
    LKHMutasiResponse,
} from '@/types/Public/Welding/lkh';

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    'http://192.168.10.67/majsf_rest_api/api';

class LKHService {
    private baseURL         = `${API_BASE_URL}/welding_auto`;
    private autoplanURL     = `${API_BASE_URL}/welding_autoplanning`;

    // GET data LKH dari tabel (tanpa prosedur)
    async getLKH(params: LKHGenerateParams): Promise<LKHFetchResponse> {
        const res = await axios.get(`${this.baseURL}/lkh`, { params });
        return res.data;
    }

    // SSE generate — kembalikan URL untuk EventSource
    getGenerateStreamURL(params: LKHGenerateParams): string {
        const p = new URLSearchParams({
            date:  params.date,
            shift: String(params.shift),
            area:  params.area,
        });
        return `${this.baseURL}/lkh_generate?${p.toString()}`;
    }

    // REFRESH = ambil ulang data terbaru. Generate ulang sesungguhnya memakai
    // SSE (getGenerateStreamURL) — endpoint refresh non-SSE tidak tersedia.
    async refreshLKH(params: LKHGenerateParams): Promise<any> {
        const res = await axios.get(`${this.baseURL}/lkh`, { params });
        return res.data;
    }

    // CEK apakah LKH sudah ada
    async checkLKH(params: LKHGenerateParams): Promise<LKHCheckResponse> {
        const res = await axios.get(`${this.baseURL}/lkh_check`, { params });
        return res.data;
    }

    // GET single row by ID
    async getLKHRow(id: number): Promise<{ success: boolean; data: any }> {
        const res = await axios.get(`${this.baseURL}/lkh_row/${id}`);
        return res.data;
    }

    // UPDATE actual production (single row)
    async updateActual(id: number, payload: {
        actual_lot_size: string | null;
        actual_pjk: string | null;
        actual_tpt: string | null;
    }): Promise<{ success: boolean; message: string; data?: any }> {
        const res = await axios.put(`${this.baseURL}/lkh_actual/${id}`, payload);
        return res.data;
    }

    // UPDATE keterangan
    async updateRemarks(id: number, keterangan: string): Promise<{ success: boolean; message: string }> {
        const res = await axios.put(`${this.baseURL}/lkh_remarks/${id}`, { keterangan });
        return res.data;
    }

    // UPDATE BLC
    async updateBLC(id: number, blc: string): Promise<{ success: boolean; message: string }> {
        const res = await axios.put(`${this.baseURL}/lkh_blc/${id}`, { blc });
        return res.data;
    }

    // DELETE LKH
    async deleteLKH(params: LKHGenerateParams): Promise<{ success: boolean; message: string }> {
        const res = await axios.delete(`${this.baseURL}/lkh_delete`, { data: params });
        return res.data;
    }

    // ── LKH DUAL-SHIFT (rekonstruksi) — mutasi + master, 2 shift sekaligus ──

    async getLKHDual(params: { date: string; area: string }): Promise<import('@/types/Public/Welding/lkh').LKHDualResponse> {
        const res = await axios.get(`${this.baseURL}/lkh_dual`, { params });
        return res.data;
    }

    async updateLKHDualActual(payload: import('@/types/Public/Welding/lkh').LKHDualActualPayload): Promise<{ success: boolean; message?: string }> {
        const res = await axios.post(`${this.baseURL}/lkh_dual_actual`, payload);
        return res.data;
    }

    // ── Mutasi LKH — baca dari mutasi_weld (plan dari pipeline) ─────────────

    async getMutasiLKH(params: LKHMutasiParams): Promise<LKHMutasiResponse> {
        const res = await axios.get(`${this.autoplanURL}/lkh_day`, { params });
        return res.data;
    }

    async updateLKHActual(payload: {
        part_number: string;
        area:        string;
        date:        string;
        shift:       1 | 2;
        actual:      number;
    }): Promise<{ success: boolean; message?: string; actual?: number; locked?: boolean }> {
        const res = await axios.post(`${this.autoplanURL}/update_lkh_actual`, payload);
        return res.data;
    }

    async unlockLKHActual(payload: {
        part_number: string;
        area:        string;
        date:        string;
        shift:       1 | 2;
    }): Promise<{ success: boolean; message?: string; locked?: boolean }> {
        const res = await axios.post(`${this.autoplanURL}/unlock_lkh_actual`, payload);
        return res.data;
    }

    // EXPORT EXCEL
    async exportToExcel(options: { date: string; shift: number; area: string }): Promise<void> {
        const res = await axios.get(`${this.baseURL}/lkh_export`, {
            params: options,
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        const filename = `LKH_${options.area}_${options.date.replace(/-/g, '')}_SHIFT${options.shift}.xlsx`;
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
}

export const lkhService = new LKHService();
export default lkhService;