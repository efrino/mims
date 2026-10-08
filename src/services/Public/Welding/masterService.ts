// services/Public/Welding/masterService.ts

import axios from 'axios'
import { compressImage } from '@/utils/compressImage'
import { useAuthStore } from '@/stores/auth'
import type {
    MsWelding,
    MsWeldingTree,
    ReconcilePressInsert,
    HandoverResult,
    MsWeldingStats,
    MsWeldingListResult,
    MsWeldingListParams,
    PartCompareResult,
    CompareChildrenSapResult,
} from '@/types/Public/Welding/master'
import type { WeldingBomItem, BomSyncResult } from '@/types/Public/Welding/bom'
import type { ReconcilePreview, ReconcileAdd, MotherBySapResult, MsWeldingMedia, MediaViewSide, AreaMovePreview, BomVerifyData, BomVerifyRow, PartInsight, AiChatResult, PartMdfoDn, DeleteCheck, DupMergeSuggest } from '@/types/Public/Welding/master'

const BASE_URL = 'http://192.168.10.67/majsf_rest_api/api'

export interface ConnectSuggestParams {
    part_number_mix?: string
    part_number?: string
    part_number_delivery?: string
    model?: string
    car_name?: string
    op?: number | string | null
    is_wip?: number | string
    parent_part_mix?: string
    exclude_id?: number | string
    child_category?: string
    area?: string
    search?: string
    limit?: number
}

export interface ConnectCandidate extends MsWelding {
    score?: number
    reasons?: string[]
    is_current_parent?: boolean
    current_parent_mix?: string | null
    parent_valid?: boolean
}

export interface ConnectSuggestResult {
    base_mix: string
    delivery_family: string
    parents: ConnectCandidate[]
    children_linked: ConnectCandidate[]
    children_candidates: ConnectCandidate[]
    current_parent: MsWelding | null
    connectivity: {
        needs_parent: boolean
        has_valid_parent: boolean
        has_child: boolean
        status: 'ok' | 'orphan_no_parent' | 'no_child'
        message: string
    }
}

// Buka URL download di tab baru → browser yang menangani unduhan (Content-Disposition:
// attachment). Tidak menarik blob ke memori JS, jadi ringan di client; server pun
// streaming langsung ke browser tanpa perantara SPA. Tab kosong auto-close saat attachment.
function _openDownload(url: string): void {
    window.open(url, '_blank', 'noopener')
}

const masterService = {

    downloadTemplate(type?: string | null): void {
        // window.open = navigasi browser polos, TIDAK lewat axios interceptor →
        // header Authorization tak terkirim. Constructor controller ini panggil
        // auth() tanpa permission (cuma catat identitas), tapi tetap coba decode
        // JWT — tanpa token sama sekali jadi "Wrong number of segments". Kirim
        // token via query param (pola sama dgn SSE reconcile_preview).
        const token = useAuthStore().token
        const qs: string[] = []
        if (type) qs.push(`type=${encodeURIComponent(type)}`)
        if (token) qs.push(`token=${encodeURIComponent(token)}`)
        _openDownload(`${BASE_URL}/welding_master/template${qs.length ? '?' + qs.join('&') : ''}`)
    },

    downloadData(area?: string | null, areas?: string | null): void {
        const token = useAuthStore().token
        const qs: string[] = []
        if (area) qs.push(`area=${encodeURIComponent(area)}`)
        if (areas) qs.push(`areas=${encodeURIComponent(areas)}`)
        if (token) qs.push(`token=${encodeURIComponent(token)}`)
        _openDownload(`${BASE_URL}/welding_master/download${qs.length ? '?' + qs.join('&') : ''}`)
    },

    /**
     * Ambil distinct values untuk satu field dari SELURUH data di DB
     * (bukan hanya halaman aktif), dengan filter server-side + cascade kolom lain.
     */
    async getFilterOptions(
        field: string,
        serverFilters: {
            layer?: string | null
            area?: string | null
            areas?: string | null
            is_wip?: 0 | 1 | null
            search?: string | null
            hide_obsolete?: 0 | 1
            only_obsolete?: 0 | 1
            variant_mode?: 'hide' | 'show' | 'only'
        },
        colFilters: Record<string, string[]> = {}
    ): Promise<string[]> {
        const params: Record<string, string | number> = { field }

        if (serverFilters.layer)          params.layer         = serverFilters.layer
        if (serverFilters.area)           params.area          = serverFilters.area
        if (serverFilters.areas)          params.areas         = serverFilters.areas
        if (serverFilters.is_wip != null) params.is_wip        = serverFilters.is_wip
        if (serverFilters.search)         params.search        = serverFilters.search
        if (serverFilters.hide_obsolete)  params.hide_obsolete = serverFilters.hide_obsolete
        if (serverFilters.only_obsolete)  params.only_obsolete = serverFilters.only_obsolete
        if (serverFilters.variant_mode)   params.variant_mode  = serverFilters.variant_mode

        // Kirim cascade column filters sebagai comma-separated (exclude field saat ini)
        for (const [col, vals] of Object.entries(colFilters)) {
            if (col !== field && vals.length > 0)
                params[`col_${col}`] = JSON.stringify(vals) // JSON — nilai bisa mengandung koma
        }

        const res = await axios.get(`${BASE_URL}/welding_master/filter_options`, { params })
        return res.data.data ?? []
    },

    async getAreas(): Promise<string[]> {
        const res = await axios.get(`${BASE_URL}/welding_master/areas`)
        return res.data.data ?? []
    },
    // getMachineMap/getMachineParts DIPINDAH ke machineMapService.ts (modular,
    // ngikutin controller/model backend-nya yg juga sudah dipisah).

    /** Log perubahan master (ms_welding_change_log) — dipakai riwayat mesin per part. */
    async getChangeLog(params: { part_id?: number; field_name?: string; limit?: number }): Promise<{ id: number; part_id: number; field_name: string; old_value: string | null; new_value: string | null; changed_by: string; changed_at: string }[]> {
        const res = await axios.get(`${BASE_URL}/welding_master/change_log`, { params })
        return res.data.data ?? []
    },

    async getStats(area?: string | null, layer?: string | null, areas?: string | null): Promise<MsWeldingStats | null> {
        const params: Record<string, string> = {}
        if (layer) params.layer = layer
        if (area)  params.area  = area
        if (areas) params.areas = areas
        const res = await axios.get(`${BASE_URL}/welding_master/stats`, { params })
        return res.data.data ?? null
    },

    async getList(params: MsWeldingListParams): Promise<MsWeldingListResult> {
        const res = await axios.get(`${BASE_URL}/welding_master/list`, { params })
        return res.data
    },

    /** Komparasi daftar nomor part (paste Excel) vs master pada filter aktif. */
    async compareParts(filters: Partial<MsWeldingListParams>, parts: string[]): Promise<PartCompareResult> {
        const res = await axios.post(`${BASE_URL}/welding_master/compare`, { filters, parts })
        if (!res.data.success) throw new Error(res.data.message || 'Gagal membandingkan.')
        return res.data.data
    },

    /** Isi field master yg kosong (nama/job/model/customer/qty) dari SAP — tidak menimpa. */
    async compareFillSap(ids: number[], layer: string | null, dryRun = false): Promise<{ success: boolean; message: string; dry_run: boolean; updated: number; skipped: number; details: { id: number; part_number: string; filled: Record<string, unknown>; note?: string; sap_mtart?: string }[] }> {
        const res = await axios.post(`${BASE_URL}/welding_master/compare_fill_sap`, { ids, layer, dry_run: dryRun ? 1 : 0 })
        if (!res.data.success) throw new Error(res.data.message || 'Gagal mengisi dari SAP.')
        return res.data
    },
    /** Ambil BOM level-1 SAP utk 1 part (cache → fetch sinkron, bisa 2–100 dtk), cocokkan ke master; apply=true → tambah/tautkan child langsung. */
    async compareChildrenSap(holderId: number, partNumber: string, apply: boolean, force = false, lgort: string | null = null): Promise<CompareChildrenSapResult> {
        const res = await axios.post(`${BASE_URL}/welding_master/compare_children_sap`, { holder_id: holderId, part_number: partNumber, apply, force: force ? 1 : 0, lgort }, { timeout: 240000 })
        return res.data
    },
    /** Tambah part baru ke master dari data SAP dgn default layer/kategori/area/status. */
    async compareAddFromSap(parts: string[], defaults: { layer: string; category: string; area: string; status_part: 'FP' | 'WIP' }): Promise<{ success: boolean; message: string; inserted: number; skipped: number; failed: number; errors: string[]; ids: number[] }> {
        const res = await axios.post(`${BASE_URL}/welding_master/compare_add_from_sap`, { parts, defaults })
        if (!res.data.success) throw new Error(res.data.message || 'Gagal menambah part.')
        return res.data
    },

    /** Ringkasan sebelum hapus: delivery (DN ADM P5/Mieruka/SAP DO), produksi terakhir, mother & komponen. Gagal → null. */
    async deleteCheck(id: number): Promise<DeleteCheck | null> {
        const res = await axios.get(`${BASE_URL}/welding_master/delete_check`, { params: { id } }).catch(() => null)
        return res?.data?.data ?? null
    },

    /** Saran merge 2 baris kembar (part number + area + OP sama): baris yg dipertahankan & preview serah terima. */
    async dupMergeSuggest(id: number, otherId: number): Promise<DupMergeSuggest> {
        const res = await axios.get(`${BASE_URL}/welding_master/dup_merge`, { params: { id, other_id: otherId } })
        return res.data
    },

    /** Kandidat nama part (master/BOM SAP/IFPP/stok SAP) & alias (master/planning). Gagal → kosong. */
    async partNameCandidates(partNumber: string): Promise<{ names: { name: string; source: string }[]; aliases: { name: string; source: string }[] }> {
        const res = await axios.get(`${BASE_URL}/welding_master/part_name_candidates`, { params: { part_number: partNumber } }).catch(() => null)
        return { names: res?.data?.data ?? [], aliases: res?.data?.aliases ?? [] }
    },

    async getDetail(id: number): Promise<MsWelding | null> {
        const res = await axios.get(`${BASE_URL}/welding_master/detail`, { params: { id } })
        return res.data.data ?? null
    },

    // Routing per-proses (multi-mesin)
    async getRoute(route_key: string, area: string, ms_part?: string): Promise<any[]> {
        const res = await axios.get(`${BASE_URL}/welding_master/route`, { params: { route_key, area, ms_part } })
        return res.data.data ?? []
    },
    async saveRoute(payload: { route_key: string; area: string; ms_part: string; processes: any[] }): Promise<boolean> {
        const res = await axios.post(`${BASE_URL}/welding_master/route_save`, payload)
        return !!res.data.success
    },
    // Generate route awal SEMUA part dari ms_welding.machine (only_missing=1 → tak menimpa editan).
    async seedRouteAll(onlyMissing = true): Promise<any> {
        const res = await axios.post(`${BASE_URL}/welding_ach_seed/route_seed`, { only_missing: onlyMissing ? 1 : 0 })
        return res.data
    },

    // getTree sekarang pakai ID — tree naik ke ancestor + turun ke children
    async getTree(id: number): Promise<MsWeldingTree | null> {
        const res = await axios.get(`${BASE_URL}/welding_master/tree`, { params: { id } })
        return res.data.data ?? null
    },

    async create(data: Partial<MsWelding>): Promise<{ success: boolean; message: string; id?: number }> {
        const res = await axios.post(`${BASE_URL}/welding_master/create`, data)
        return res.data
    },

    async update(id: number, data: Partial<MsWelding>): Promise<{
        success: boolean; message: string
        /** Terisi kalau area part FP berubah — pakai utk trigger refresh planning area lama/baru. */
        area_changed?: { old: string | null; new: string; mutasi_moved?: number; mutasi_conflict?: number }
    }> {
        const res = await axios.put(`${BASE_URL}/welding_master/update`, data, { params: { id } })
        return res.data
    },

    /** Pasang WIP ke parent (FP atau WIP, drag-n-drop) + pewarisan atribut produk dari parent */
    async attachWip(wipId: number, parentId: number): Promise<{ success: boolean; message: string; data?: MsWelding }> {
        const res = await axios.post(`${BASE_URL}/welding_master/attach_wip`, { wip_id: wipId, fp_id: parentId })
        return res.data
    },

    /** Putus WIP dari parent-nya. parentId diisi → lepas 1 relasi SPESIFIK itu saja (akurat
     *  per-instance fisik, tak nyerempet baris lain yg kebetulan share mix); kosong → lepas semua. */
    async detachParent(wipId: number, parentId?: number | null): Promise<{ success: boolean; message: string; data?: MsWelding }> {
        const res = await axios.post(`${BASE_URL}/welding_master/detach_parent`, { wip_id: wipId, parent_id: parentId ?? undefined })
        return res.data
    },

    /** Daftar mother (semua relasi ms_welding_parents) dari satu baris fisik (by id —
     *  akurat per-instance, part_number_mix bisa dipakai >1 baris fisik sekaligus).
     *  `mother_qty_unit` = qty part ini per 1 unit mother itu; `parent_qty_kbn` = qty_kbn mother-nya. */
    async getParentsOf(id: number): Promise<{ id: number; part_number: string; part_number_mix: string; model: string | null; car_name: string | null; area?: string | null; customer_1?: string | null; mother_qty_unit?: number | null; parent_qty_kbn?: number | null }[]> {
        const res = await axios.get(`${BASE_URL}/welding_master/parents_of`, { params: { id } })
        return res.data.data ?? []
    },

    /** Set Qty Unit (qty part ini per 1 unit mother TERTENTU) — beda dari qty_kbn global yg
     *  auto-FPB dari qty_kbn semua mother (server-side, tak perlu dipanggil manual). */
    async updateMotherQty(childId: number, parentId: number, qty: number): Promise<{ success: boolean; message: string }> {
        const res = await axios.post(`${BASE_URL}/welding_master/update_mother_qty`, { child_id: childId, parent_id: parentId, qty })
        return res.data
    },

    /** Rekomendasi parent + cek konektivitas (putus?) untuk smart picker */
    async suggestConnections(params: ConnectSuggestParams): Promise<ConnectSuggestResult | null> {
        const res = await axios.get(`${BASE_URL}/welding_master/connect_suggest`, { params })
        return res.data?.data ?? null
    },

    /** Auto-link: tautkan WIP child ke parent SPESIFIK (by id — akurat per-instance fisik). */
    async linkChild(childId: number, parentId: number): Promise<{ success: boolean; message: string; data?: MsWelding }> {
        const res = await axios.post(`${BASE_URL}/welding_master/link_child`, { child_id: childId, parent_id: parentId })
        return res.data
    },

    /** Preview: bandingkan ms_data_ifp vs ms_welding IFPD */
    async ifpdSyncPreview(): Promise<{
        total_ifp: number
        missing: { part_number: string; job_number: string | null; part_name: string | null; customer: string | null; project: string | null; qty_kbn: number | null; packing: string | null }[]
        synced:  { part_number: string; ms_welding_id: number; part_name: string | null; customer: string | null; project: string | null }[]
        orphan_fps: { id: number; part_number: string; part_number_mix: string; part_name: string | null; customer_1: string | null; model: string | null; created_at: string }[]
    }> {
        const res = await axios.get(`${BASE_URL}/welding_master/ifpd_sync`)
        return res.data.data
    },

    /** Apply: insert/upsert selected part_numbers dari ms_data_ifp ke ms_welding */
    async ifpdSyncApply(partNumbers: string[], upsert = false): Promise<{ success: boolean; message: string; inserted: number; updated: number; errors: string[] }> {
        const res = await axios.post(`${BASE_URL}/welding_master/ifpd_sync`, { part_numbers: partNumbers, upsert: upsert ? 1 : 0 })
        return res.data
    },

    async ifppSyncPreview(): Promise<{
        total_ifpp: number
        missing: { part_number: string; job_number: string | null; part_name: string | null; customer: string | null; project: string | null; qty_kbn: number | null; area: string | null }[]
        synced:  { part_number: string; ms_welding_id: number; part_name: string | null; customer: string | null; area: string | null }[]
        orphan_wips: { id: number; part_number: string; part_number_mix: string; part_name: string | null; area: string | null; category: string | null; customer_1: string | null; model: string | null; created_at: string }[]
    }> {
        const res = await axios.get(`${BASE_URL}/welding_master/ifpp_sync`)
        return res.data.data
    },

    async ifppSyncApply(partNumbers: string[], upsert = false): Promise<{ success: boolean; message: string; inserted: number; updated: number; errors: string[] }> {
        const res = await axios.post(`${BASE_URL}/welding_master/ifpp_sync`, { part_numbers: partNumbers, upsert: upsert ? 1 : 0 })
        return res.data
    },

    /** Lookup referensi IFPD dari majsf_inventory.ms_data_ifp */
    async ifpdLookup(partNumber: string): Promise<{
        part_number: string; job_number: string | null; part_name: string | null
        customer: string | null; project: string | null; qty_kbn: number | null; packing: string | null
    } | null> {
        try {
            const res = await axios.get(`${BASE_URL}/welding_master/ifpd_lookup`, {
                params: { part_number: partNumber },
            })
            return res.data.data ?? null
        } catch { return null }
    },

    /** Autocomplete search IFPD dari ms_data_ifp */
    async ifpdSearch(keyword: string): Promise<{
        part_number: string; job_number: string | null; part_name: string | null
        customer: string | null; project: string | null; qty_kbn: number | null
    }[]> {
        const res = await axios.get(`${BASE_URL}/welding_master/ifpd_lookup`, {
            params: { search: keyword },
        })
        return res.data.data ?? []
    },

    /** Stok SAP satu part (referensi CKD/MATERIAL). `lgort` opsional — kosong =
     *  backend derive dari layer part (jangan hardcode default di sini). */
    async getSapStock(partNumber: string, lgort?: string): Promise<number | null> {
        const res = await axios.get(`${BASE_URL}/welding_master/sap_stock`, {
            params: { part_number: partNumber, ...(lgort ? { lgort } : {}) },
        })
        return res.data?.stock ?? null
    },

    /** Tambah mother BARU (baris/id baru) untuk part WIP yang sama — multi-parent CKD/IFPP */
    async addMother(sourceId: number, parentId: number): Promise<{ success: boolean; message: string; id?: number; data?: MsWelding }> {
        const res = await axios.post(`${BASE_URL}/welding_master/add_mother`, { source_id: sourceId, parent_id: parentId })
        return res.data
    },

    async softDelete(id: number): Promise<{ success: boolean; message: string }> {
        const res = await axios.delete(`${BASE_URL}/welding_master/delete`, { params: { id } })
        return res.data
    },

    async hardDelete(id: number): Promise<{ success: boolean; message: string }> {
        const res = await axios.delete(`${BASE_URL}/welding_master/hard_delete`, { params: { id } })
        return res.data
    },

    /** "Mother by SAP" — cari assembly yg memakai part ini (where-used, RFC Z_PUD/ZCS15).
     *  Hasil di-cache backend (mirror BOM SAP/Children by SAP) — `refresh: true` paksa
     *  spawn ulang fetch background (tetap balas data cache lama kalau masih ada). */
    async getMotherBySap(id: number, refresh = false): Promise<MotherBySapResult> {
        const res = await axios.get(`${BASE_URL}/welding_master/mother_by_sap`, {
            params: { id, ...(refresh ? { refresh: 1 } : {}) },
        })
        return res.data
    },

    /** Ambil BOM level-1 tersimpan di DB untuk satu part */
    async getBom(partNumber: string): Promise<WeldingBomItem[]> {
        const res = await axios.get(`${BASE_URL}/welding_master/bom`, {
            params: { part_number: partNumber },
        })
        return res.data.data ?? []
    },

    /** Preview rekonsiliasi ms_welding vs BOM SAP — fallback polling (cache segar).
     *  `lgort` opsional — kosong = backend derive dari layer part (jangan hardcode default di sini). */
    async reconcilePreview(id: number, lgort?: string): Promise<ReconcilePreview> {
        const res = await axios.post(`${BASE_URL}/welding_master/reconcile_preview`, {
            id, ...(lgort ? { lgort } : {}),
        })
        return res.data
    },

    // ── Classify Override ──────────────────────────────────────────────
    async getClassifyOverrides(): Promise<any[]> {
        const res = await axios.get(`${BASE_URL}/welding_master/classify_override`)
        return res.data.data ?? []
    },
    async getClassifyOverride(partNumber: string): Promise<any | null> {
        const res = await axios.get(`${BASE_URL}/welding_master/classify_override`, {
            params: { part: partNumber },
        })
        return res.data.data ?? null
    },
    async saveClassifyOverride(partNumber: string, fields: {
        category?: string | null
        area?: string | null
        layer?: string | null
        note?: string | null
    }): Promise<{ success: boolean; message: string }> {
        const res = await axios.post(`${BASE_URL}/welding_master/classify_override`, {
            part_number: partNumber,
            ...fields,
        })
        return res.data
    },
    async deleteClassifyOverride(partNumber: string): Promise<{ success: boolean }> {
        const res = await axios.delete(`${BASE_URL}/welding_master/classify_override`, {
            params: { part: partNumber },
        })
        return res.data
    },

    /** Pre-warm cache BOM SAP di background — fire-and-forget, error diabaikan.
     *  `lgort` opsional — kosong = backend derive dari layer part. */
    prewarmSap(partNumber: string, lgort?: string): void {
        axios.get(`${BASE_URL}/welding_master/prewarm`, {
            params: { part_number: partNumber, ...(lgort ? { lgort } : {}) },
        }).catch(() => {})
    },

    /** URL SSE endpoint untuk reconcile preview (gunakan dengan new EventSource(url)).
     *  `lgort` opsional — kosong = backend derive dari layer part.
     *  `force` = true → lewati cache SAP, fetch baru (tombol "Refresh Cache").
     *  Token JWT disertakan via query param (bukan header) krn native EventSource
     *  tak bisa mengirim custom header — lihat fallback di BD_Controller::auth(). */
    reconcilePreviewSseUrl(id: number, lgort?: string, force?: boolean): string {
        const token = useAuthStore().token
        return `${BASE_URL}/welding_master/reconcile_preview_sse?id=${id}`
            + (lgort ? `&lgort=${lgort}` : '')
            + (force ? `&force=1` : '')
            + (token ? `&token=${encodeURIComponent(token)}` : '')
    },

    /** Benchmark performa API SAP untuk satu part (3 runs). `lgort` opsional —
     *  kosong = backend derive dari layer part. */
    async sapPerf(partNumber: string, lgort?: string): Promise<{
        success: boolean; part: string; runs: { run: number; ms: number; ok: boolean; items: number }[];
        avg_ms: number | null; verdict: 'fast' | 'moderate' | 'slow' | 'all_failed'
    }> {
        const res = await axios.get(`${BASE_URL}/welding_master/sap_perf`, {
            params: { part_number: partNumber, ...(lgort ? { lgort } : {}) },
        })
        return res.data
    },

    /** Terapkan usulan rekonsiliasi yang disetujui (insert + link + update) */
    async reconcileApply(payload: {
        adds: ReconcileAdd[]
        links?: { id: number; connect_to_parent: string; connect_to_parent_id?: number; bom_qty?: number | null; meins?: string | null }[]
        updates: { id: number; fields: Record<string, string> }[]
        reparents: { id: number; to_parent_mix: string }[]
        press_inserts?: ReconcilePressInsert[]
        holder_id?: number   // dipakai utk update qty relasi (rel_qty) child→holder
    }): Promise<{ success: boolean; message: string; inserted: number; linked?: number; updated: number; reparented: number; errors: string[] }> {
        const res = await axios.post(`${BASE_URL}/welding_master/reconcile_apply`, payload)
        return res.data
    },

    /**
     * Sync BOM level-1 dari SAP ke DB, kembalikan summary + data baru.
     * `lgort` opsional — kosongkan agar backend derive dari layer part (lihat
     * M_weld::lgort_for_layer). JANGAN kasih default hardcode di sini — kalau
     * selalu dikirim eksplisit, backend anggap itu override manual dan tidak
     * pernah sampai ke logika derive-by-layer.
     */
    async getPartInsight(partNumber: string): Promise<PartInsight | null> {
        const res = await axios.get(`${BASE_URL}/welding_master/part_insight`, { params: { part_number: partNumber } })
        return res.data?.data ?? null
    },

    // enabled = akun ini boleh Tanya AI (config ai_enabled / ai_users); online = server AI terjangkau.
    async aiHealth(): Promise<{ online: boolean; enabled: boolean; model?: string }> {
        const res = await axios.get(`${BASE_URL}/welding_master/ai_health`, { timeout: 8000 })
        return res.data.data
    },

    // Agent AI read-only. Timeout panjang: server dev (CPU) ±30-60 dtk per pertanyaan.
    async aiChat(message: string, partNumber: string | null, history: { role: string; content: string }[]): Promise<AiChatResult> {
        const res = await axios.post(`${BASE_URL}/welding_master/ai_chat`, { message, part_number: partNumber, history }, { timeout: 400000 })
        return res.data.data
    },

    // MDFO (forecast) vs DN (delivery) per bulan/minggu/hari — pola utk planning prediktif.
    async getPartMdfoDn(partNumber: string, grain: 'month' | 'week' | 'day'): Promise<PartMdfoDn | null> {
        const res = await axios.get(`${BASE_URL}/welding_master/part_mdfo_dn`, { params: { part_number: partNumber, grain }, timeout: 60000 })
        return res.data?.data ?? null
    },

    async getBomVerify(partNumber: string): Promise<BomVerifyData> {
        const res = await axios.get(`${BASE_URL}/welding_master/bom_verify`, { params: { part_number: partNumber } })
        return res.data.data
    },

    async saveBomVerify(partNumber: string, items: BomVerifyRow[], note: string, addToMaster: string[] = []): Promise<{ success: boolean; message: string; master?: { added: number; linked?: number; message: string } }> {
        const res = await axios.post(`${BASE_URL}/welding_master/bom_verify`, { part_number: partNumber, items, note, add_to_master: addToMaster })
        return res.data
    },

    async deleteBomVerify(partNumber: string): Promise<{ success: boolean; message: string }> {
        const res = await axios.delete(`${BASE_URL}/welding_master/bom_verify`, { params: { part_number: partNumber } })
        return res.data
    },

    async syncBom(partNumber: string, lgort?: string, id?: number): Promise<BomSyncResult> {
        const res = await axios.post(`${BASE_URL}/welding_master/sync_bom`, {
            part_number: partNumber,
            ...(lgort ? { lgort } : {}),
            ...(id ? { id } : {}),
        })
        return res.data
    },

    async upload(file: File): Promise<{
        success: boolean
        message: string
        result?: { inserted: number; updated: number; skipped: number; errors: string[] }
    }> {
        const form = new FormData()
        form.append('file', file)
        const res = await axios.post(`${BASE_URL}/welding_master/upload`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return res.data
    },

    async pasteUpdate(rows: string[][], type?: string | null): Promise<{
        success: boolean
        message: string
        result?: { inserted: number; updated: number; skipped: number; errors: string[] }
        /** Area (lama+baru, dedup) yg part-nya berubah area — kategori mesin_area. */
        changed_areas?: string[]
    }> {
        const res = await axios.post(`${BASE_URL}/welding_master/paste`, { rows, type })
        return res.data
    },

    async uploadImage(id: number, file: File): Promise<{
        success: boolean
        image: string
        image_url: string
        message: string
    }> {
        const form = new FormData()
        form.append('image', await compressImage(file))   // foto HP > batas server 2 MB
        const res = await axios.post(`${BASE_URL}/welding_master/upload_image`, form, {
            params: { id },
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        const data = res.data
        // Construct image_url from BASE_URL to avoid server-side double-path bug
        if (data.image) {
            data.image_url = masterService.getImageUrl(data.image)!
        }
        return data
    },

    /** Serah terima data baris lama → baru (relasi, varian, media, opsional mutasi). apply=false = pratinjau. */
    async handover(fromId: number, toId: number, apply = false, mutasi = false): Promise<HandoverResult> {
        const res = await axios.post(`${BASE_URL}/welding_master/handover`, { from_id: fromId, to_id: toId, apply, mutasi })
        return res.data
    },

    /** Tandai / cabut "semua aman": baris di beberapa area untuk part ini BUKAN duplikat. */
    async setDupOk(partNumber: string, areaKey: string, ok: boolean): Promise<{ success: boolean; message: string }> {
        const res = ok
            ? await axios.post(`${BASE_URL}/welding_master/dup_ok`, { part_number: partNumber, area_key: areaKey })
            : await axios.delete(`${BASE_URL}/welding_master/dup_ok`, { params: { part_number: partNumber, area_key: areaKey } })
        return res.data
    },

    /** Hapus cover part (kolom image) atau pallet (pallet_image) beserta filenya. */
    async deleteCover(id: number, kind: 'part' | 'pallet'): Promise<{ success: boolean; message: string }> {
        const res = await axios.delete(`${BASE_URL}/welding_master/cover`, { params: { id, kind } })
        return res.data
    },

    async uploadPalletImage(id: number, file: File): Promise<{
        success: boolean
        pallet_image: string
        image_url: string
        message: string
    }> {
        const form = new FormData()
        form.append('image', await compressImage(file))   // foto HP > batas server 2 MB
        const res = await axios.post(`${BASE_URL}/welding_master/upload_pallet_image`, form, {
            params: { id },
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        const data = res.data
        if (data.pallet_image) {
            data.image_url = masterService.getImageUrl(data.pallet_image)!
        }
        return data
    },

    // ── Galeri media (foto/video TAMBAHAN, terpisah dari image/pallet_image) ──
    /** Foto/video galeri (tanpa model 3D — itu lewat getModel). */
    async getMedia(id: number, kind: 'part' | 'pallet'): Promise<MsWeldingMedia[]> {
        return (await masterService.getMediaAll(id, kind)).filter(m => m.media_type !== 'model')
    },
    async getMediaAll(id: number, kind: 'part' | 'pallet'): Promise<MsWeldingMedia[]> {
        const res = await axios.get(`${BASE_URL}/welding_master/media`, { params: { id, kind } })
        return res.data.data ?? []
    },
    /** Model 3D part/pallet: null = belum ada; file_path '' = masih di antrean worker. */
    async getModel(id: number, kind: 'part' | 'pallet'): Promise<MsWeldingMedia | null> {
        return (await masterService.getMediaAll(id, kind)).find(m => m.media_type === 'model') ?? null
    },
    /** URL .glb lewat API (ada header CORS — <model-viewer> memuat via fetch, file statis tidak). */
    modelUrl(m: MsWeldingMedia): string {
        return `${BASE_URL}/welding_master/model_file?media_id=${m.id}&v=${encodeURIComponent(m.file_path)}`
    },
    /** Minta (ulang) model 3D dari foto part/pallet — diproses worker TripoSR (±1–3 menit). */
    /** Komponen dipasang di mesin ke-`seq` routing induk (null = mesin pertama). */
    /** split = "1:1,2:1" (seq:qty) bila komponen sama dipasang di >1 mesin; seq diabaikan. */
    /** Ubah urutan mesin induk WSS; langkah relasi komponen ikut dipetakan. */
    async reorderSteps(parentId: number, order: string[]): Promise<{ success: boolean; message?: string; machine?: string }> {
        const res = await axios.post(`${BASE_URL}/welding_master/reorder_steps`, { parent_id: parentId, order })
        return res.data
    },

    /** Pasang komponen induk WSS di mesin (spec); mesin baru ditambah ke routing, mesin tanpa komponen dilepas. */
    async setStepMachine(parentId: number, childId: number, machine: string): Promise<{ success: boolean; message?: string; machine?: string }> {
        const res = await axios.post(`${BASE_URL}/welding_master/step_machine`, { parent_id: parentId, child_id: childId, machine })
        return res.data
    },

    /** Ganti nut (CKD) di relasi induk ini dgn nut lain dari spec mesin; qty & mesin relasi tetap. */
    async replaceChild(parentId: number, childId: number, partNumber: string): Promise<{ success: boolean; message?: string; child?: { id: number; part_number: string; part_name: string | null } }> {
        const res = await axios.post(`${BASE_URL}/welding_master/replace_child`, { parent_id: parentId, child_id: childId, part_number: partNumber })
        return res.data
    },

    async setRelationRoute(childId: number, parentId: number, seq: number | null, split: string | null = null): Promise<{ success: boolean; message?: string; route_seq?: number | null; route_split?: string | null; warning?: string | null }> {
        const res = await axios.post(`${BASE_URL}/welding_master/relation_route`, { child_id: childId, parent_id: parentId, route_seq: seq, route_split: split })
        return res.data
    },
    /** Upload model 3D (.glb) buatan user → media utama; model lama diganti. */
    async uploadModel3d(id: number, kind: 'part' | 'pallet', file: File): Promise<{ success: boolean; message: string; media_id?: number; file_path?: string }> {
        const form = new FormData()
        form.append('model', file)
        const res = await axios.post(`${BASE_URL}/welding_master/model_user_upload`, form, { params: { id, kind }, timeout: 180000 })
        return res.data
    },
    async requestModel(id: number, kind: 'part' | 'pallet'): Promise<{ success: boolean; message: string; media_id?: number }> {
        const res = await axios.post(`${BASE_URL}/welding_master/model_request`, null, { params: { id, kind } })
        return res.data
    },
    /** side terisi → foto jadi wajah kubus 3D (1 foto per sisi, foto lama di sisi itu dilepas tag-nya). */
    async uploadMedia(id: number, kind: 'part' | 'pallet', file: File, side?: MediaViewSide, removeBg = false): Promise<{ success: boolean; media?: MsWeldingMedia; message: string; warning?: string | null }> {
        const form = new FormData()
        form.append('file', file)
        const res = await axios.post(`${BASE_URL}/welding_master/upload_media`, form, {
            params: { id, kind, ...(side ? { side } : {}), ...(removeBg ? { remove_bg: 1 } : {}) },
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return res.data
    },
    /** Tandai foto galeri yg sudah ada sebagai sisi 3D (null = lepas tag). */
    /** Hapus background foto yg sudah ada (restore=true → kembalikan foto asli). */
    async mediaRemoveBg(mediaId: number, restore = false): Promise<{ success: boolean; message: string; file_path?: string }> {
        const res = await axios.post(`${BASE_URL}/welding_master/media_remove_bg`, null, { params: { media_id: mediaId, ...(restore ? { restore: 1 } : {}) } })
        return res.data
    },
    async setMediaSide(mediaId: number, side: MediaViewSide | null): Promise<{ success: boolean; message: string }> {
        const res = await axios.put(`${BASE_URL}/welding_master/media_side`, null, { params: { media_id: mediaId, side: side ?? 'none' } })
        return res.data
    },
    /** Pratinjau pindah area: data mutasi berjalan di area lama yg akan ikut dipindah + hari bentrok. */
    async areaMovePreview(id: number, to: string): Promise<AreaMovePreview> {
        const res = await axios.get(`${BASE_URL}/welding_master/area_move_preview`, { params: { id, to } })
        return res.data.data
    },
    /**
     * Tandai area agar planning-nya di-refresh oleh cron worker di server (≤1 menit).
     * SENGAJA bukan memanggil welding_mutasi/refresh langsung — itu request berat
     * puluhan detik yang membuat Master Data ikut lambat.
     */
    async requestPlanningRefresh(areas: string[], reason?: string): Promise<{ success: boolean; queued: number; message: string }> {
        const res = await axios.post(`${BASE_URL}/welding_master/request_planning_refresh`, { areas, reason })
        return res.data
    },
    async deleteMedia(mediaId: number): Promise<{ success: boolean; message: string }> {
        const res = await axios.delete(`${BASE_URL}/welding_master/media`, { params: { media_id: mediaId } })
        return res.data
    },

    /** Build the full URL for an image field value stored in DB (e.g. "robot_timur/20260504_abc.jpg") */
    getImageUrl(image: string | null | undefined): string | null {
        if (!image) return null
        const uploadBase = BASE_URL.replace(/\/api$/, '')
        return `${uploadBase}/upload/welding/${image}`
    },

    /** Data papan pemasangan WIP (steker ↔ stop kontak).
     *  wip_list    = SEMUA WIP (panel kiri / steker), tiap baris ada has_parent.
     *  parent_list = kandidat parent FP + WIP (panel kanan / stop kontak), ada has_child. */
    async getUnpaired(filters: { area?: string | null; search?: string | null; limit?: number } = {}): Promise<{
        wip_list: MsWelding[]
        parent_list: MsWelding[]
        count_wip: number
        count_parent: number
        count_wip_orphan: number
        count_parent_childless: number
    }> {
        const params: Record<string, string | number> = {}
        if (filters.area) params.area = filters.area
        if (filters.search) params.search = filters.search
        if (filters.limit) params.limit = filters.limit
        const res = await axios.get(`${BASE_URL}/welding_master/unpaired`, { params })
        return {
            wip_list: res.data.wip_list ?? [],
            parent_list: res.data.parent_list ?? [],
            count_wip: res.data.count_wip ?? 0,
            count_parent: res.data.count_parent ?? 0,
            count_wip_orphan: res.data.count_wip_orphan ?? 0,
            count_parent_childless: res.data.count_parent_childless ?? 0,
        }
    },
}

export default masterService