// composables/useLKHDual.ts
// LKH dual-shift (rekonstruksi): baca mutasi+master via /welding_auto/lkh_dual,
// edit Actual (PCS→mutasi, PJK/BLC/keterangan→lkh_weld) via /lkh_dual_actual.
// Urutan baris dari backend = Mutasi Bulanan (abjad mesin, lalu part number).
import { ref, computed } from 'vue'
import lkhService from '@/services/Public/Welding/lkhService'
import type { LKHDualRow, LKHDualShift, LKHDualSummary, LKHDualActualPayload } from '@/types/Public/Welding/lkh'
import { rowSide, type LKHGroup } from '@/utils/lkhGroups'

// Renumber setelah merge agar NO mulai dari 1 (urutan backend dipertahankan)
function renumber(rows: LKHDualRow[]): LKHDualRow[] {
    rows.forEach((r, i) => { r.no = i + 1 })
    return rows
}

// Gabungkan baris duplikat per part_number (backend lama meng-explode 1 baris/mesin rute).
// LKH = dokumen per PART: mesin digabung ("A5 A6 A7"), nut/spot + stroke + TPT dijumlah
// (proses seri), lot/kbn/actual sama untuk semua mesin → ambil dari baris pertama.
function mergeByPart(rows: LKHDualRow[]): LKHDualRow[] {
    const map = new Map<string, LKHDualRow>()
    const mcs = new Map<string, string[]>()
    const invUph = new Map<string, number>()
    const addShift = (t: LKHDualShift, s: LKHDualShift) => {
        t.plan_stroke += Number(s.plan_stroke) || 0
        t.plan_tpt = Math.round((t.plan_tpt + (Number(s.plan_tpt) || 0)) * 10) / 10
        if (!t.act_pjk && s.act_pjk) t.act_pjk = s.act_pjk
        if (!t.act_blc && s.act_blc) t.act_blc = s.act_blc
    }
    for (const r of rows) {
        const pn = r.part_number
        const mc = (r.mc_weld ?? '').trim().split(/\s+/).filter(Boolean)
        const uph = Number(r.patan?.uph) || 0
        const ex = map.get(pn)
        if (!ex) {
            const c: LKHDualRow = { ...r, patan: { ...r.patan }, day: { ...r.day }, night: { ...r.night } }
            map.set(pn, c)
            mcs.set(pn, [...mc])
            invUph.set(pn, uph > 0 ? 1 / uph : 0)
            continue
        }
        const list = mcs.get(pn)!
        for (const m of mc) if (!list.includes(m)) list.push(m)
        invUph.set(pn, (invUph.get(pn) ?? 0) + (uph > 0 ? 1 / uph : 0))
        ex.sum_nut_spot += Number(r.sum_nut_spot) || 0
        ex.ct = Math.round(((Number(ex.ct) || 0) + (Number(r.ct) || 0)) * 10) / 10
        ex.patan.stroke += Number(r.patan?.stroke) || 0
        ex.patan.tpt = Math.round((ex.patan.tpt + (Number(r.patan?.tpt) || 0)) * 10) / 10
        addShift(ex.day, r.day)
        addShift(ex.night, r.night)
        if (!ex.keterangan && r.keterangan) ex.keterangan = r.keterangan
        if (ex.urut_plan == null && r.urut_plan != null) ex.urut_plan = r.urut_plan
    }
    const out: LKHDualRow[] = []
    for (const [pn, r] of map) {
        const list = mcs.get(pn) ?? []
        r.mc_weld = list.join(' ')
        r.total_proses = Math.max(1, list.length)
        const inv = invUph.get(pn) ?? 0
        if (list.length > 1 && inv > 0) r.patan.uph = Math.round((1 / inv) * 100) / 100
        out.push(r)
    }
    return out
}

// Summary ulang setelah merge (total_parts backend = jumlah baris explode).
function rebuildSummary(rows: LKHDualRow[], base: LKHDualSummary | null): LKHDualSummary {
    const s: LKHDualSummary = {
        total_parts: rows.length,
        total_patan_tpt: 0, total_day_tpt: 0, total_night_tpt: 0,
        total_day_kbn: 0, total_night_kbn: 0, total_day_lot: 0, total_night_lot: 0,
        total_day_act: 0, total_night_act: 0,
    }
    for (const r of rows) {
        s.total_patan_tpt += Number(r.patan?.tpt) || 0
        s.total_day_tpt   += Number(r.day?.plan_tpt) || 0
        s.total_night_tpt += Number(r.night?.plan_tpt) || 0
        s.total_day_kbn   += Number(r.day?.plan_kbn) || 0
        s.total_night_kbn += Number(r.night?.plan_kbn) || 0
        s.total_day_lot   += Number(r.day?.plan_lot_size) || 0
        s.total_night_lot += Number(r.night?.plan_lot_size) || 0
        s.total_day_act   += Number(r.day?.act_pcs) || 0
        s.total_night_act += Number(r.night?.act_pcs) || 0
    }
    s.total_patan_tpt = Math.round(s.total_patan_tpt * 10) / 10
    s.total_day_tpt   = Math.round(s.total_day_tpt * 10) / 10
    s.total_night_tpt = Math.round(s.total_night_tpt * 10) / 10
    return { ...(base ?? {}), ...s }
}

export function useLKHDual() {
    const data    = ref<LKHDualRow[]>([])
    const summary = ref<LKHDualSummary | null>(null)
    const loading = ref(false)
    const error   = ref<string | null>(null)
    const lastUpdated = ref<Date | null>(null)

    const hasData = computed(() => data.value.length > 0)

    // 1 grup LKH = beberapa area master (fetch paralel). Merge per area dulu (part bisa ada di
    // 2 area), SA ADM difilter per sisi mesin (BARAT/TIMUR), lalu digabung urut sumber.
    async function loadGroup(date: string, group: LKHGroup): Promise<LKHDualRow[]> {
        const parts = await Promise.all(group.sources.map(async src => {
            const res = await lkhService.getLKHDual({ date, area: src.area })
            if (!res.success) throw new Error(res.message ?? `Gagal memuat LKH ${src.area}.`)
            const rows = mergeByPart(res.data ?? [])
            return src.side ? rows.filter(r => rowSide(r) === src.side) : rows
        }))
        return parts.flatMap(renumber)   // NO mulai 1 per area = per lembar cetak
    }

    function apply(rows: LKHDualRow[]) {
        data.value    = rows
        summary.value = rebuildSummary(rows, null)
        lastUpdated.value = new Date()
    }

    async function fetchLKH(date: string, group: LKHGroup) {
        if (!date || !group) return
        loading.value = true
        error.value = null
        try {
            apply(await loadGroup(date, group))
        } catch (e: any) {
            error.value = e?.response?.data?.message ?? e?.message ?? 'Gagal memuat LKH.'
            data.value = []
        } finally {
            loading.value = false
        }
    }

    // Silent refresh — update data tanpa loading overlay (tidak blink/flicker)
    async function silentRefresh(date: string, group: LKHGroup) {
        if (!date || !group) return
        try { apply(await loadGroup(date, group)) } catch { /* silent */ }
    }

    async function saveActual(payload: LKHDualActualPayload): Promise<{ success: boolean; message?: string }> {
        try {
            const res = await lkhService.updateLKHDualActual(payload)
            return res
        } catch (e: any) {
            return { success: false, message: e?.response?.data?.message ?? 'Gagal menyimpan.' }
        }
    }

    const lastUpdatedLabel = computed(() =>
        lastUpdated.value
            ? lastUpdated.value.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : null
    )

    return { data, summary, loading, error, hasData, lastUpdated, lastUpdatedLabel, fetchLKH, silentRefresh, saveActual }
}
