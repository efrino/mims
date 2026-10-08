<!-- components/welding/lkh/LKHTableBody.vue -->
<!-- 21 kolom sesuai format lkh_weld: NO|JOB NO|PART NO|MC|Σ Nut/Spot|Qty/Kbn|PATAN(6)|CUT OFF(4)|Actual(3)|BLC|Ket -->
<template>
    <tbody>
        <template v-for="g in groups" :key="g.machine">
        <template v-for="row in g.rows" :key="row.id">

            <!-- ── Data row ─────────────────────────────────────────── -->
            <tr class="data-row" :class="rowClass(row)">

                <!-- NO (sticky) -->
                <td class="bcell sticky-col col-no text-center">
                    <span class="row-no">{{ row._no }}</span>
                </td>

                <!-- JOB NO + model-status badge (sticky) -->
                <td class="bcell sticky-col col-job text-left">
                    <div class="job-no">{{ row.job_number || '—' }}</div>
                    <!-- PREVIEW tetap ditulis FP (warna kuning sudah cukup sbg penanda) -->
                    <span class="status-badge" :class="statusBadgeClass(row.status_plan)">
                        {{ row.model ? row.model + ' — ' : '' }}{{ row.status_plan === 'PREVIEW' ? 'FP' : (row.status_plan || 'FP') }}
                    </span>
                </td>

                <!-- PART NO (sticky, border-right) -->
                <td class="bcell sticky-col col-part text-left">
                    <span class="part-no">{{ row.part_number }}</span>
                </td>

                <!-- MC WELD -->
                <td class="bcell info-cell text-left">{{ row.mc_weld || '' }}</td>

                <!-- Σ Nut / Spot -->
                <td class="bcell info-cell text-right">{{ fmtInt(row.sum_nut_spot) }}</td>

                <!-- Qty / Kbn -->
                <td class="bcell info-cell text-right">{{ fmtInt(row.qty_kbn) }}</td>

                <!-- ── PATAN (6 cols) ──────────────────────────────── -->
                <td class="bcell patan-cell text-right">{{ fmtInt(row.patan_sum_kbn) }}</td>
                <td class="bcell patan-cell text-right font-bold">{{ fmtInt(row.patan_lot_size) }}</td>
                <td class="bcell patan-cell text-right">{{ fmtInt(row.patan_lot_cycle) }}</td>
                <td class="bcell patan-cell text-right">{{ fmtInt(row.patan_uph) }}</td>
                <td class="bcell patan-cell text-right">{{ fmtInt(row.patan_sum_stroke) }}</td>
                <td class="bcell patan-cell text-right">{{ fmtTpt(row.patan_tpt) }}</td>

                <!-- ── PLANNING PROD (4 cols) ────────────────────── -->
                <td class="bcell cutoff-cell text-right">{{ fmtInt(row.cutoff_sum_kbn) }}</td>
                <td class="bcell cutoff-cell text-right font-bold">{{ fmtInt(row.cutoff_lot_size) }}</td>
                <td class="bcell cutoff-cell text-right">{{ fmtInt(row.cutoff_sum_stroke) }}</td>
                <td class="bcell cutoff-cell text-right">{{ fmtTpt(row.cutoff_tpt) }}</td>

                <!-- ── Actual Prod (3 cols) — semua editable ──────── -->
                <!-- Lot size -->
                <td
                    class="bcell actual-cell text-right font-bold editable-actual"
                    @click.stop="openActualEdit(row)"
                    title="Klik untuk edit Actual"
                >{{ row.actual_lot_size || '' }}</td>

                <!-- PJK (kolom utama, hijau terang) -->
                <td
                    class="bcell pjk-cell text-center font-bold editable-actual"
                    @click.stop="openActualEdit(row)"
                    title="Klik untuk input PJK"
                >
                    <span v-if="row.actual_pjk" class="pjk-val">{{ row.actual_pjk }}</span>
                    <span v-else class="pjk-empty">—</span>
                    <i class="ti ti-edit pjk-edit-icon"></i>
                </td>

                <!-- TPT actual -->
                <td
                    class="bcell actual-cell text-right editable-actual"
                    @click.stop="openActualEdit(row)"
                    title="Klik untuk edit Actual"
                >{{ row.actual_tpt || '' }}</td>

                <!-- BLC -->
                <td class="bcell blc-cell text-center">{{ row.blc || '' }}</td>

                <!-- Keterangan (sticky-right, editable) -->
                <td
                    class="bcell sticky-right col-ket text-left editable-ket"
                    @click.stop="openKetEdit(row)"
                    title="Klik untuk edit keterangan"
                >{{ row.keterangan || '' }}</td>
            </tr>

            <!-- ── Actual edit row (muncul tepat di bawah baris ini) ─ -->
            <tr v-if="actualEdit.active && actualEdit.rowId === row.id" class="edit-row edit-row-actual">
                <td colspan="21" class="edit-cell">
                    <div class="edit-inner">
                        <span class="edit-label">
                            Actual — <em>{{ actualEdit.jobNumber || actualEdit.partNumber }}</em>:
                        </span>
                        <span class="edit-field-label">Lot size</span>
                        <input
                            v-model="actualEdit.lot_size"
                            type="text"
                            class="edit-input w-20"
                            placeholder="—"
                            @keyup.enter="confirmActualEdit"
                            @keyup.esc="cancelActualEdit"
                        />
                        <span class="edit-field-label pjk-label">PJK</span>
                        <input
                            v-model="actualEdit.pjk"
                            type="text"
                            class="edit-input w-24 pjk-input"
                            placeholder="—"
                            ref="pjkInputRef"
                            @keyup.enter="confirmActualEdit"
                            @keyup.esc="cancelActualEdit"
                        />
                        <span class="edit-field-label">TPT</span>
                        <input
                            v-model="actualEdit.tpt"
                            type="text"
                            class="edit-input w-20"
                            placeholder="—"
                            @keyup.enter="confirmActualEdit"
                            @keyup.esc="cancelActualEdit"
                        />
                        <button @click="confirmActualEdit" class="btn-save">Simpan</button>
                        <button @click="cancelActualEdit" class="btn-cancel">Batal</button>
                        <span class="edit-hint">Enter = simpan · Esc = batal</span>
                    </div>
                </td>
            </tr>

            <!-- ── Keterangan edit row ─────────────────────────────── -->
            <tr v-if="ketEdit.active && ketEdit.rowId === row.id" class="edit-row edit-row-ket">
                <td colspan="21" class="edit-cell">
                    <div class="edit-inner">
                        <span class="edit-label">
                            Keterangan — <em>{{ ketEdit.partNumber }}</em>:
                        </span>
                        <input
                            v-model="ketEdit.value"
                            type="text"
                            class="edit-input w-72"
                            placeholder="Tulis keterangan..."
                            ref="ketInputRef"
                            @keyup.enter="confirmKetEdit"
                            @keyup.esc="cancelKetEdit"
                        />
                        <button @click="confirmKetEdit" class="btn-save">Simpan</button>
                        <button @click="cancelKetEdit" class="btn-cancel">Batal</button>
                        <span class="edit-hint">Enter = simpan · Esc = batal</span>
                    </div>
                </td>
            </tr>

        </template><!-- end v-for row -->

            <!-- ── Subtotal per MESIN (Σ TPT) ───────────────────────── -->
            <tr class="machine-subtotal">
                <td :colspan="21" class="bcell mc-sub-cell">
                    <span class="mc-sub-machine"><i class="ti ti-settings"></i> {{ g.machine }}</span>
                    <span class="mc-sub-sep">·</span>
                    <span class="mc-sub-count">{{ g.rows.length }} part</span>
                    <span class="mc-sub-sep">·</span>
                    <span class="mc-sub-tpt">Σ TPT Planning: <b>{{ g.tptSum.toFixed(1) }}</b> jam</span>
                    <span class="mc-sub-sep">·</span>
                    <span class="mc-sub-patan">Σ TPT Patan(DN): {{ g.patanSum.toFixed(1) }} jam</span>
                </td>
            </tr>

        </template><!-- end v-for group -->

        <!-- ── Total Row ──────────────────────────────────────────── -->
        <tr class="total-row">
            <!-- NO + JOB NO + PART NO = colspan 3 (sticky) -->
            <td colspan="3" class="bcell sticky-col total-label">TOTAL</td>
            <!-- MC WELD -->
            <td class="bcell info-cell total-cell"></td>
            <!-- Σ Nut/Spot -->
            <td class="bcell info-cell total-cell"></td>
            <!-- Qty/Kbn -->
            <td class="bcell info-cell total-cell text-right font-bold">
                {{ totals.qty_kbn > 0 ? totals.qty_kbn.toLocaleString() : '' }}
            </td>
            <!-- PATAN: Σkbn | Lot | Cycle | UPH | Σstroke | TPT -->
            <td class="bcell patan-cell total-cell"></td>
            <td class="bcell patan-cell total-cell"></td>
            <td class="bcell patan-cell total-cell"></td>
            <td class="bcell patan-cell total-cell"></td>
            <td class="bcell patan-cell total-cell text-right font-bold">
                {{ totals.patan_stroke > 0 ? totals.patan_stroke.toLocaleString() : '' }}
            </td>
            <td class="bcell patan-cell total-cell"></td>
            <!-- CUT OFF: Σkbn | Lot | Σstroke | TPT -->
            <td class="bcell cutoff-cell total-cell"></td>
            <td class="bcell cutoff-cell total-cell"></td>
            <td class="bcell cutoff-cell total-cell text-right font-bold">
                {{ totals.cutoff_stroke > 0 ? totals.cutoff_stroke.toLocaleString() : '' }}
            </td>
            <td class="bcell cutoff-cell total-cell"></td>
            <!-- Actual: Lot | PJK | TPT -->
            <td class="bcell actual-cell total-cell"></td>
            <td class="bcell pjk-cell   total-cell"></td>
            <td class="bcell actual-cell total-cell"></td>
            <!-- BLC -->
            <td class="bcell blc-cell  total-cell"></td>
            <!-- Keterangan (sticky-right) -->
            <td class="bcell sticky-right total-cell"></td>
        </tr>

    </tbody>
</template>

<script setup lang="ts">
import { computed, reactive, ref, nextTick } from 'vue'
import type { LKHData } from '@/types/Public/Welding/lkh'

interface Props { data: LKHData[] }
const props = defineProps<Props>()

const emit = defineEmits<{
    keteranganEdit: [payload: { id: number; keterangan: string }]
    actualEdit:     [payload: {
        id:              number
        actual_lot_size: string | null
        actual_pjk:      string | null
        actual_tpt:      string | null
    }]
}>()

// ── Helpers ────────────────────────────────────────────────────
const n      = (v: unknown) => Number(v) || 0
const fmtInt = (v: unknown) => n(v) > 0 ? n(v).toLocaleString('id-ID') : ''
const fmtTpt = (v: unknown) => n(v) > 0 ? n(v).toFixed(1) : ''

// ── Row class berdasarkan status_plan ───────────────────────────
function rowClass(row: LKHData) {
    if (row.status_plan === 'PREVIEW')   return 'row-preview'
    if (row.status_plan === 'CARRYOVER') return 'row-carryover'
    return ''   // FP = default putih
}

function statusBadgeClass(sp: string | null) {
    if (sp === 'FP')        return 'badge-fp'
    if (sp === 'PREVIEW')   return 'badge-preview'
    if (sp === 'CARRYOVER') return 'badge-carryover'
    return 'badge-fp'
}

// ── Actual edit state ───────────────────────────────────────────
const pjkInputRef = ref<HTMLInputElement | null>(null)

const actualEdit = reactive({
    active:      false,
    rowId:       0,
    partNumber:  '',
    jobNumber:   '',
    lot_size:    '',
    pjk:         '',
    tpt:         '',
})

async function openActualEdit(row: LKHData) {
    cancelKetEdit()
    actualEdit.active     = true
    actualEdit.rowId      = row.id
    actualEdit.partNumber = row.part_number
    actualEdit.jobNumber  = row.job_number ?? ''
    actualEdit.lot_size   = row.actual_lot_size ?? ''
    actualEdit.pjk        = row.actual_pjk      ?? ''
    actualEdit.tpt        = row.actual_tpt       ?? ''
    await nextTick()
    pjkInputRef.value?.focus()
    pjkInputRef.value?.select()
}

function confirmActualEdit() {
    if (!actualEdit.active) return
    emit('actualEdit', {
        id:              actualEdit.rowId,
        actual_lot_size: actualEdit.lot_size || null,
        actual_pjk:      actualEdit.pjk      || null,
        actual_tpt:      actualEdit.tpt       || null,
    })
    actualEdit.active = false
}

function cancelActualEdit() { actualEdit.active = false }

// ── Keterangan edit state ───────────────────────────────────────
const ketInputRef = ref<HTMLInputElement | null>(null)

const ketEdit = reactive({
    active:      false,
    rowId:       0,
    partNumber:  '',
    value:       '',
})

async function openKetEdit(row: LKHData) {
    cancelActualEdit()
    ketEdit.active     = true
    ketEdit.rowId      = row.id
    ketEdit.partNumber = row.part_number
    ketEdit.value      = row.keterangan ?? ''
    await nextTick()
    ketInputRef.value?.focus()
    ketInputRef.value?.select()
}

function confirmKetEdit() {
    if (!ketEdit.active) return
    emit('keteranganEdit', { id: ketEdit.rowId, keterangan: ketEdit.value })
    ketEdit.active = false
}

function cancelKetEdit() { ketEdit.active = false }

// ── Grouping per MESIN (mc_weld) ────────────────────────────────
// Data sudah diurut backend: mesin dengan part terbanyak di atas.
// Tiap grup diberi subtotal Σ TPT (planning & patan). _no = nomor urut global.
type GRow = LKHData & { _no: number }
const groups = computed(() => {
    const out: { machine: string; rows: GRow[]; tptSum: number; patanSum: number }[] = []
    let no = 0
    for (const r of props.data) {
        const m = (r.mc_weld && String(r.mc_weld).trim()) ? String(r.mc_weld).trim() : '— tanpa mesin —'
        let g = out.length ? out[out.length - 1] : null
        if (!g || g.machine !== m) {
            g = { machine: m, rows: [], tptSum: 0, patanSum: 0 }
            out.push(g)
        }
        no++
        g.rows.push({ ...r, _no: no })
        g.tptSum   += n(r.cutoff_tpt)   // planning production TPT
        g.patanSum += n(r.patan_tpt)    // patan (DN) TPT
    }
    return out
})

// ── Totals ──────────────────────────────────────────────────────
const totals = computed(() => ({
    qty_kbn:       props.data.reduce((s, r) => s + n(r.qty_kbn),           0),
    patan_stroke:  props.data.reduce((s, r) => s + n(r.patan_sum_stroke),  0),
    cutoff_stroke: props.data.reduce((s, r) => s + n(r.cutoff_sum_stroke), 0),
}))
</script>

<style scoped>
/* ── Sticky Left ─────────────────────────────────────────────── */
.sticky-col { position: sticky; background: white; z-index: 10; }
.col-no  { left: 0;      width: 36px; }
.col-job { left: 36px;   width: 140px; }
.col-part {
    left: 176px;
    width: 115px;
    border-right: 2px solid #2E5396 !important;
    box-shadow: 2px 0 5px rgba(0,0,0,.12);
}

/* ── Sticky Right ────────────────────────────────────────────── */
.sticky-right {
    position: sticky; right: 0; background: white; z-index: 10;
    border-left: 2px solid #2E5396 !important;
    box-shadow: -2px 0 5px rgba(0,0,0,.12);
}
.col-ket { width: 140px; min-width: 140px; }

/* ── Base cell ───────────────────────────────────────────────── */
.bcell {
    padding: 3px 3px;
    border: 1px solid #E0E0E0;
    font-size: 10px;
    vertical-align: middle;
    white-space: nowrap;
}
.text-left   { text-align: left;   padding-left: 5px; }
.text-right  { text-align: right;  padding-right: 5px; }
.text-center { text-align: center; }
.font-bold   { font-weight: 700; }

/* ── Section tints ───────────────────────────────────────────── */
.info-cell   { background: #F8FAFC; }
.patan-cell  { background: #F5F3FF; }
.cutoff-cell { background: #F0F9FF; }
.actual-cell { background: #ECFDF5; }
.pjk-cell    { background: #D1FAE5; min-width: 68px; }
.blc-cell    { background: #F8FAFC; }

/* ── JOB NO cell ─────────────────────────────────────────────── */
.job-no {
    font-size: 10px; font-weight: 700; color: #1E3A5F; line-height: 1.2;
}
.status-badge {
    display: inline-block;
    font-size: 8px; font-weight: 700;
    border-radius: 4px; padding: 1px 5px;
    margin-top: 2px; line-height: 1.5;
    border: 1px solid;
    white-space: nowrap;
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
}
.badge-fp       { background: #D1FAE5; color: #065F46; border-color: #10B981; }
.badge-preview  { background: #FEF3C7; color: #92400E; border-color: #F59E0B; }
.badge-carryover { background: #DBEAFE; color: #1E40AF; border-color: #3B82F6; }

/* ── Part NO cell ────────────────────────────────────────────── */
.part-no { font-size: 10px; }

/* ── PJK cell ────────────────────────────────────────────────── */
.pjk-val       { font-weight: 700; color: #065F46; }
.pjk-empty     { color: #9CA3AF; }
.pjk-edit-icon {
    opacity: 0; font-size: 9px; color: #059669;
    margin-left: 3px; vertical-align: middle;
    transition: opacity .15s; pointer-events: none;
}

/* ── Editable cells ──────────────────────────────────────────── */
.editable-actual {
    cursor: pointer;
}
.editable-actual:hover {
    outline: 2px solid #10B981;
    outline-offset: -1px;
}
.editable-actual:hover .pjk-edit-icon { opacity: .6; }

.editable-ket { cursor: pointer; }
.editable-ket:hover { outline: 2px solid #3B82F6; outline-offset: -1px; }

/* ── Row states by status_plan ───────────────────────────────── */
.row-preview .bcell,
.row-preview .info-cell,
.row-preview .patan-cell,
.row-preview .cutoff-cell,
.row-preview .actual-cell,
.row-preview .pjk-cell,
.row-preview .blc-cell    { background: #FFFBEB !important; }

.row-carryover .bcell,
.row-carryover .info-cell,
.row-carryover .patan-cell,
.row-carryover .cutoff-cell,
.row-carryover .actual-cell,
.row-carryover .pjk-cell,
.row-carryover .blc-cell  { background: #EFF6FF !important; }

/* Hover resets row color to light blue across all cols */
.data-row:hover .bcell        { background: #F0F9FF !important; }
.data-row:hover .patan-cell   { background: #EDE9FE !important; }
.data-row:hover .cutoff-cell  { background: #E0F2FE !important; }
.data-row:hover .actual-cell  { background: #D1FAE5 !important; }
.data-row:hover .pjk-cell     { background: #A7F3D0 !important; }

/* ── Edit rows ───────────────────────────────────────────────── */
.edit-row { background: transparent; }

.edit-row-actual .edit-cell { background: #ECFDF5; border: 1.5px solid #10B981; padding: 6px 10px; }
.edit-row-ket    .edit-cell { background: #FFFBEB; border: 1.5px solid #F59E0B; padding: 6px 10px; }

.edit-inner {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 11px;
}
.edit-label {
    font-weight: 700; color: #374151; font-size: 11px;
}
.edit-label em { color: #2563EB; font-style: normal; }
.edit-field-label {
    font-size: 10px; font-weight: 600; color: #6B7280;
}
.pjk-label { color: #065F46; }

.edit-input {
    border: 1px solid #D1D5DB; border-radius: 6px;
    padding: 3px 7px; font-size: 11px; color: #111827;
    outline: none; transition: border .15s;
}
.edit-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 2px rgba(59,130,246,.15); }
.pjk-input        { border-color: #10B981; font-weight: 700; color: #065F46; }
.pjk-input:focus  { border-color: #059669; box-shadow: 0 0 0 2px rgba(16,185,129,.2); }
.w-20  { width: 72px; }
.w-24  { width: 88px; }
.w-72  { width: 260px; }

.btn-save {
    background: #2563EB; color: white;
    border: none; border-radius: 6px; padding: 3px 12px;
    font-size: 11px; font-weight: 600; cursor: pointer;
    transition: background .15s;
}
.btn-save:hover  { background: #1D4ED8; }
.btn-cancel {
    background: #6B7280; color: white;
    border: none; border-radius: 6px; padding: 3px 12px;
    font-size: 11px; font-weight: 600; cursor: pointer;
    transition: background .15s;
}
.btn-cancel:hover { background: #4B5563; }
.edit-hint { font-size: 10px; color: #9CA3AF; }

/* ── Total Row ───────────────────────────────────────────────── */
.total-row   { }
.total-label {
    text-align: center; font-weight: 700; font-size: 11px;
    background: #E8EAF6 !important; color: #1a237e;
    left: 0; width: calc(36px + 140px + 115px);
}
.total-cell  { background: #F5F5F5 !important; font-weight: 700; color: #1565C0; }

/* ── Subtotal per mesin ──────────────────────────────────────── */
.machine-subtotal .mc-sub-cell {
    background: linear-gradient(to right, #1E3A5F 0%, #2E5396 100%) !important;
    color: #fff; font-weight: 600; font-size: 10px;
    padding: 4px 10px; text-align: left;
    position: sticky; left: 0;
    border-top: 2px solid #14233a; border-bottom: 2px solid #14233a;
}
.mc-sub-machine { font-weight: 800; letter-spacing: .3px; }
.mc-sub-machine .ti { font-size: 11px; vertical-align: -1px; margin-right: 2px; }
.mc-sub-sep   { opacity: .5; margin: 0 6px; }
.mc-sub-count { opacity: .85; }
.mc-sub-tpt   { color: #FDE68A; }
.mc-sub-tpt b { color: #FFFFFF; font-weight: 800; }
.mc-sub-patan { opacity: .8; }

/* ── Misc ────────────────────────────────────────────────────── */
.row-no { font-size: 9px; color: #9CA3AF; }
</style>
