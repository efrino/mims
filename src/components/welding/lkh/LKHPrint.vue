<!-- components/welding/lkh/LKHPrint.vue
     Print layout LKH Dual-Shift (A4 Landscape) — DOKUMEN FISIK (hasil akhir).
     1 baris per PART (mesin digabung di kolom MC WELD), tanpa TPT (boros tempat),
     Mode Per Day = DAY + NIGHT; mode Per Shift = 1 shift + PATAN (prop shifts/showPatan).
     Kolom: NO | JOB NO | PART NO | STATUS (FP/WIP) | MC WELD | Nut/Spot | Qty/Kbn | CT
            | DAY SHIFT   [PLAN(kbn,Lot,stroke) | Actual(PCS,PJK,BLC)]
            | NIGHT SHIFT [PLAN(...)            | Actual(...)]
            | KETERANGAN
     Layout kolom = cermin LKHDualTable (layar) supaya yang dilihat = yang dicetak. -->
<template>
    <!-- Tombol print -->
    <button
        @click="handlePrint"
        :disabled="!hasData"
        class="no-print bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
               text-white px-4 py-1.5 rounded text-sm flex items-center gap-1 transition-colors"
    >
        <i class="ti ti-printer"></i>
        <span>Print</span>
    </button>

    <Teleport to="body">
        <div class="lkh-print-area">
            <div
                v-for="(page, pageIdx) in pages"
                :key="pageIdx"
                class="print-page"
                :class="{ 'page-break': pageIdx > 0 }"
            >
                <!-- HEADER -->
                <div class="print-header">
                    <div class="header-left">
                        <img src="../../../assets/images/logo-maj.png" alt="Logo" class="company-logo" />
                        <div class="header-left-text">
                            <div class="doc-title">Laporan Kerja Harian (LKH)</div>
                            <div class="doc-subtitle">Welding · Area {{ sheetLabel(group, page.area) }}</div>
                        </div>
                    </div>
                    <div class="header-right">
                        <table class="info-table">
                            <tbody>
                                <tr>
                                    <td class="info-label">Tanggal</td>
                                    <td class="info-sep">:</td>
                                    <td class="info-value">{{ formattedDate }}</td>
                                </tr>
                                <tr>
                                    <td class="info-label">Shift</td>
                                    <td class="info-sep">:</td>
                                    <td class="info-value">{{ shiftText }}</td>
                                </tr>
                                <tr>
                                    <td class="info-label">No Dokumen</td>
                                    <td class="info-sep">:</td>
                                    <td class="info-value">FR/MAJ-PR-03/06/00</td>
                                </tr>
                                <tr>
                                    <td class="info-label">Produksi</td>
                                    <td class="info-sep">:</td>
                                    <td class="info-value">&nbsp;</td>
                                </tr>
                                <tr>
                                    <td class="info-label">Foreman</td>
                                    <td class="info-sep">:</td>
                                    <td class="info-value">&nbsp;</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="page-num">{{ sheetLabel(group, page.area) }} · Halaman {{ page.pageNo }} / {{ page.pageCount }}</div>

                <!-- TABEL -->
                <table class="lkh-table">
                    <!--
                        Lebar (% dari 283mm usable, A4 landscape margin 6mm):
                        NO(2.5) JOB(10) PART(11) MC(7.5) NUT(3.5) KBN(3.5)          = 38
                        CT(3)  [PATAN opsional: kbn(3) Lot(4) stroke(4) = 11 — diambil dari KET]
                        DAY:   kbn(3.5) Lot(4.5) stroke(4.5) PCS(4.5) PJK(4) BLC(3) = 24
                        NIGHT: sama                                                 = 24
                        KET (sisa)                                                  = 14
                    -->
                    <colgroup>
                        <col style="width:2.5%">   <!-- NO -->
                        <col style="width:10%">    <!-- JOB NO -->
                        <col style="width:11%">    <!-- PART NO -->
                        <col style="width:3.5%">   <!-- STATUS -->
                        <col v-if="showOp" style="width:3%">  <!-- OP -->
                        <col style="width:7.5%">   <!-- MC WELD -->
                        <col style="width:3.5%">   <!-- Nut/Spot -->
                        <col style="width:3.5%">   <!-- Qty/Kbn -->
                        <col style="width:3%">     <!-- CT -->
                        <template v-if="showPatan">
                            <col style="width:3%">
                            <col style="width:4%">
                            <col style="width:4%">
                        </template>
                        <!-- per shift: kbn, Lot size, stroke, PCS, PJK, BLC -->
                        <template v-for="s in shifts" :key="s">
                            <col style="width:3.5%">
                            <col style="width:4.5%">
                            <col style="width:4.5%">
                            <col style="width:4.5%">
                            <col style="width:4%">
                            <col style="width:3%">
                        </template>
                        <!-- KET = sisa lebar -->
                        <col :style="{ width: ketWidth }">
                    </colgroup>

                    <thead>
                        <!-- Baris 1 -->
                        <tr>
                            <th rowspan="3" class="th-base">NO</th>
                            <th rowspan="3" class="th-base">JOB NO</th>
                            <th rowspan="3" class="th-base">PART NO</th>
                            <th rowspan="3" class="th-base th-status">STATUS</th>
                            <th v-if="showOp" rowspan="3" class="th-info">OP</th>
                            <th rowspan="3" class="th-info">MC<br>WELD</th>
                            <th rowspan="3" class="th-info">Nut/<br>Spot/<br>Mili</th>
                            <th rowspan="3" class="th-info">Qty/<br>Kbn</th>
                            <th rowspan="3" class="th-info">CT<br>(s)</th>
                            <th v-if="showPatan" colspan="3" class="th-section th-patan">PATAN</th>
                            <th v-for="s in shifts" :key="s" colspan="6" class="th-section" :class="'th-' + s">{{ s === 'day' ? 'DAY SHIFT' : 'NIGHT SHIFT' }}</th>
                            <th rowspan="3" class="th-base">KETERANGAN</th>
                        </tr>
                        <!-- Baris 2 -->
                        <tr>
                            <template v-if="showPatan">
                                <th rowspan="2" class="th-sub th-patan">kbn</th>
                                <th rowspan="2" class="th-sub th-patan">Lot<br>size</th>
                                <th rowspan="2" class="th-sub th-patan">stroke</th>
                            </template>
                            <template v-for="s in shifts" :key="s">
                                <th colspan="3" class="th-grp2 th-plan-grp">PLAN PROD</th>
                                <th colspan="3" class="th-grp2 th-act">Actual Prod</th>
                            </template>
                        </tr>
                        <!-- Baris 3 -->
                        <tr>
                            <template v-for="s in shifts" :key="s">
                                <th class="th-sub th-plan">kbn</th>
                                <th class="th-sub th-plan">Lot<br>size</th>
                                <th class="th-sub th-plan">stroke</th>
                                <th class="th-sub th-act">PCS</th>
                                <th class="th-sub th-pjk">PJK</th>
                                <th class="th-sub th-act">BLC</th>
                            </template>
                        </tr>
                    </thead>

                    <tbody>
                        <tr v-for="item in page.rows" :key="item.area + '|' + item.part_number + '|' + (item.op || '')"
                            class="tr-data" :class="{ 'tr-op-mid': item.op_last === false }">
                            <td class="c td-no">{{ item.op_first !== false ? item.no : '' }}</td>
                            <td class="c td-job">
                                <div class="pr-job">{{ item.job_no || '—' }}</div>
                                <span class="pr-badge">{{ item.model || '' }}</span>
                            </td>
                            <td class="c td-part">{{ item.part_number }}</td>
                            <td class="c td-c td-b" :class="{ 'pr-wip': item.status_part === 'WIP' }">{{ item.status_part || 'FP' }}</td>
                            <td v-if="showOp" class="c td-c td-b">{{ item.op || '' }}</td>
                            <td class="c td-left td-mc">{{ item.mc_weld || '' }}</td>
                            <td class="c td-r">{{ fi(item.sum_nut_spot) }}</td>
                            <td class="c td-r">{{ fi(item.qty_kbn) }}</td>
                            <td class="c td-r blk-end">{{ n(item.ct) > 0 ? n(item.ct).toLocaleString('id-ID', { maximumFractionDigits: 1 }) : '' }}</td>
                            <!-- PATAN (opsional) -->
                            <template v-if="showPatan">
                                <td class="c td-r td-patan">{{ fi(item.patan.kbn) }}</td>
                                <td class="c td-r td-patan td-b">{{ fi(item.patan.lot_size) }}</td>
                                <td class="c td-r td-patan blk-end">{{ fi(item.patan.stroke) }}</td>
                            </template>
                            <!-- DAY / NIGHT -->
                            <template v-for="s in shifts" :key="s">
                                <td class="c td-r td-plan">{{ fi(item[s].plan_kbn) }}</td>
                                <td class="c td-r td-plan td-b">{{ fi(item[s].plan_lot_size) }}</td>
                                <td class="c td-r td-plan">{{ fi(item[s].plan_stroke) }}</td>
                                <td class="c td-r td-act td-b">{{ blankActual ? '' : item[s].act_pcs || '' }}</td>
                                <td class="c td-c td-pjk td-b">{{ blankActual ? '' : item[s].act_pjk || '' }}</td>
                                <td class="c td-c td-act">{{ blankActual ? '' : item[s].act_blc || '' }}</td>
                            </template>
                            <!-- KET -->
                            <td class="c td-left td-ket">{{ blankActual ? '' : item.keterangan || '' }}</td>
                        </tr>

                        <!-- Baris total (halaman terakhir) -->
                        <tr v-if="page.isLast" class="tr-total">
                            <template v-for="totals in [sumRows(page.sheet)]" :key="page.area">
                            <td :colspan="showOp ? 9 : 8" class="td-total-label">TOTAL</td>
                            <template v-if="showPatan">
                                <td class="td-patan td-r">{{ fi(totals.patan_kbn) }}</td>
                                <td class="td-patan td-r td-b">{{ fi(totals.patan_lot) }}</td>
                                <td class="td-patan td-r">{{ fi(totals.patan_stroke) }}</td>
                            </template>
                            <template v-for="s in shifts" :key="s">
                                <td class="td-plan td-r">{{ fi(totals[s].kbn) }}</td>
                                <td class="td-plan td-r td-b">{{ fi(totals[s].lot) }}</td>
                                <td class="td-plan td-r">{{ fi(totals[s].stroke) }}</td>
                                <td class="td-act td-r td-b">{{ blankActual ? '' : fi(totals[s].pcs) }}</td>
                                <td class="td-pjk"></td>
                                <td class="td-act"></td>
                            </template>
                            <td></td>
                            </template>
                        </tr>
                    </tbody>
                </table>

                <!-- TANDA TANGAN (halaman terakhir) -->
                <div v-if="page.isLast" class="footer-wrap">
                    <div class="print-footer">
                        <!-- Kehadiran manpower (diisi tangan foreman): standar vs aktual per jabatan -->
                        <table class="att-table">
                            <thead>
                                <tr><th class="att-title">Kehadiran</th><th>Standar</th><th>Aktual</th><th>Keterangan <span class="att-hint">(sakit / izin / cuti / alpa)</span></th></tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in attendanceRoles" :key="r"><td class="att-role">{{ r }}</td><td></td><td></td><td></td></tr>
                            </tbody>
                        </table>
                        <div class="sign-spacer"></div>
                        <div class="sign-box" v-for="s in signatories" :key="s.role">
                            <div class="sign-title">{{ s.title }}</div>
                            <div class="sign-space"></div>
                            <div class="sign-name">( _____________ )</div>
                            <div class="sign-role">{{ s.role }}</div>
                        </div>
                        <div class="sign-box sign-box--qr">
                            <div class="sign-title">Dibuat Oleh</div>
                            <div class="sign-qr-wrap">
                                <img v-if="qrByArea[page.area]" :src="qrByArea[page.area]" class="sign-qr-img" alt="QR" />
                                <div v-else class="sign-qr-ph">QR</div>
                            </div>
                            <div class="sign-qr-ts">{{ printTs }}</div>
                            <div class="sign-role">System Auto</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import QRCode from 'qrcode'
import type { LKHDualRow, LKHShiftKey } from '@/types/Public/Welding/lkh'
import './lkh-palette.css'
import { paginateLKH, sheetLabel, sumLKH, LKH_ROWS_PER_PAGE, type LKHGroup } from '@/utils/lkhGroups'

interface Props {
    data:         LKHDualRow[]
    date:         string
    group:        LKHGroup
    rowsPerPage?: number
    showPatan?:   boolean
    shifts?:      LKHShiftKey[]
    blankActual?: boolean   // actual & keterangan dikosongkan (diisi tangan oleh foreman)
    showOp?:      boolean   // mode Pisah OP: kolom OP, garis putus-putus antar-OP 1 part
}
const props = withDefaults(defineProps<Props>(), { rowsPerPage: LKH_ROWS_PER_PAGE, showPatan: false, shifts: () => ['day', 'night'], blankActual: false, showOp: false })

const shiftText = computed(() =>
    props.shifts.length > 1 ? 'Day & Night' : props.shifts[0] === 'day' ? 'Day' : 'Night')

// KET = sisa dari 100%: info 44.5% (termasuk STATUS 3.5% & CT 3%), tiap shift 24%, PATAN 11%.
const ketWidth = computed(() =>
    Math.max(100 - 44.5 - (props.showOp ? 3 : 0) - props.shifts.length * 24 - (props.showPatan ? 11 : 0), 8) + '%')

const hasData = computed(() => props.data.length > 0)

const formattedDate = computed(() => {
    if (!props.date) return ''
    const [y, m, d] = props.date.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
})

const n  = (v: unknown) => Number(v) || 0
const fi = (v: unknown) => n(v) > 0 ? n(v).toLocaleString('id-ID') : ''

// TOTAL per lembar (area)
const sumRows = sumLKH

// 1 area = 1 lembar; halaman terakhir tiap lembar dikurangi jatah baris (lihat paginateLKH).
const pages = computed(() => paginateLKH(props.data, props.rowsPerPage))

const attendanceRoles = ['Operator', 'Checkman', 'Handling', 'Foreman']

const signatories = [
    { title: 'Mengetahui',    role: 'Div. Head' },
    { title: 'Disetujui Oleh', role: 'Dept. Head' },
    { title: 'Diperiksa Oleh', role: 'Team PPC' },
]

// QR Code — 1 per lembar (area). Isi = teks biasa supaya aplikasi scan apa pun
// langsung menampilkan informasinya (bukan JSON). Dicetak 25mm agar mudah di-scan.
const qrByArea = ref<Record<string, string>>({})
const printTs  = ref('')

function qrText(area: string, rows: LKHDualRow[]): string {
    const wip  = rows.filter(r => r.status_part === 'WIP').length
    const plan = rows.reduce((t, r) => t + props.shifts.reduce((a, s) => a + n(r[s].plan_lot_size), 0), 0)
    const act  = rows.reduce((t, r) => t + props.shifts.reduce((a, s) => a + n(r[s].act_pcs), 0), 0)
    const [y, m, d] = props.date.split('-')
    // Ringkas = modul QR lebih besar (±49 modul di 25mm) → mudah di-scan dari kertas.
    return [
        'LKH WELDING FR/MAJ-PR-03/06/00',
        `Area: ${sheetLabel(props.group, area)}`,
        `Tgl: ${d}/${m}/${y} Shift: ${shiftText.value}`,
        `Part: ${rows.length} (FP ${rows.length - wip}, WIP ${wip})`,
        `Plan: ${plan.toLocaleString('id-ID')} pcs`,
        `Actual: ${props.blankActual ? '-' : act.toLocaleString('id-ID') + ' pcs'}`,
        `Cetak: ${printTs.value}`,
    ].join('\n')
}

const generateQR = async () => {
    const now = new Date()
    const pad = (x: number) => String(x).padStart(2, '0')
    printTs.value = `${pad(now.getHours())}:${pad(now.getMinutes())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`
    const out: Record<string, string> = {}
    for (const p of pages.value.filter(pg => pg.isLast)) {
        try {
            out[p.area] = await QRCode.toDataURL(qrText(p.area, p.sheet), { width: 320, margin: 1, errorCorrectionLevel: 'M' })
        } catch { /* QR gagal → placeholder */ }
    }
    qrByArea.value = out
}

const handlePrint = async () => {
    await generateQR()
    await nextTick()
    window.print()
}
</script>

<style>
@media screen { .lkh-print-area { display: none !important; } }

@media print {
    @page { size: A4 landscape; margin: 7mm 6mm; }

    /* Dokumen fisik selalu TERANG — abaikan dark mode aplikasi (html.dark / tema Vuetify).
       Tanpa ini latar gelap html/body tembus ke kertas (sel tanpa warna ikut abu-abu). */
    html, html.dark, body { background: #fff !important; color: #000 !important; color-scheme: light !important; }
    .lkh-print-area, .lkh-print-area * { color-scheme: light !important; }
    .lkh-print-area, .print-page { background: #fff !important; color: #000 !important; }
    .lkh-print-area .lkh-table td, .lkh-print-area .info-table td, .lkh-print-area .att-table td { background-color: #fff; color: #000; }

    body > *:not(.lkh-print-area) { display: none !important; visibility: hidden !important; }
    .lkh-print-area {
        display: block !important; visibility: visible !important;
        background: white;
        font-family: 'Arial Narrow', Arial, sans-serif;
        font-size: 7pt; color: #000;
    }

    /* Page */
    /* Tinggi dikunci = area cetak (210mm - margin 2x7mm) supaya tidak ada baris yang
       meluber ke lembar berikutnya. Jatah baris dihitung di `pages` (rowsPerPage). */
    .print-page { width: 283mm; max-height: 195mm; box-sizing: border-box; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
    .page-break { page-break-before: always; break-before: page; }
    .page-num   { text-align: right; font-size: 5.5pt; color: #888; margin: 1px 0 2px; }

    /* Header */
    .print-header {
        display: flex; justify-content: space-between; align-items: center;
        border-bottom: 2pt solid #2E5396; padding-bottom: 3px; margin-bottom: 3px;
    }
    .header-left { display: flex; align-items: center; gap: 8px; }
    .company-logo { width: 40mm; max-height: 11mm; height: auto; object-fit: contain; }
    .doc-title  { font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #1a1a1a; }
    .doc-subtitle { font-size: 6.5pt; color: #555; }
    .info-table td { padding: 0.5px 5px; border: .5pt solid #bbb; font-size: 6pt; }
    .info-label { font-weight: bold; background: #EEF2FF !important; width: 58px; white-space: nowrap; }
    .info-sep   { width: 6px; text-align: center; background: #EEF2FF !important; }
    .info-value { min-width: 110px; }

    /* Table */
    .lkh-table {
        width: 100%; table-layout: fixed;
        border-collapse: collapse; font-size: 6.5pt;
        border: 1pt solid #2E5396;
    }
    .lkh-table thead { display: table-header-group; }

    .th-status { white-space: nowrap; font-size: 5.5pt !important; letter-spacing: -0.1pt; padding-left: 0 !important; padding-right: 0 !important; }
    .th-base {
        background: var(--lkh-base) !important; color: #fff !important;
        font-weight: bold; text-align: center; vertical-align: middle;
        border: .5pt solid var(--lkh-base-line); padding: 2px 1px;
        font-size: 6pt; line-height: 1.3;
    }
    .th-info {
        background: var(--lkh-info) !important; color: #fff !important;
        font-weight: bold; text-align: center; vertical-align: middle;
        border: .5pt solid #374151; padding: 2px 1px; font-size: 6pt; line-height: 1.3;
    }
    .th-section {
        font-weight: bold; text-align: center; font-size: 7pt;
        border: .5pt solid #000; padding: 2px 1px;
    }
    .th-grp2 {
        font-weight: bold; text-align: center; font-size: 6pt;
        border: .5pt solid #000; padding: 1.5px;
    }
    .th-sub {
        font-size: 6pt; text-align: center; vertical-align: middle;
        border: .5pt solid #000; padding: 1.5px; line-height: 1.2;
    }

    /* Section colours */
    .th-patan  { background: var(--lkh-patan) !important; color: #fff !important; }
    .th-day    { background: var(--lkh-day) !important; color: #fff !important; }
    .th-night  { background: var(--lkh-night) !important; color: #fff !important; }
    .th-plan-grp { background: var(--lkh-plan-grp) !important; color: #fff !important; }
    .th-plan   { background: var(--lkh-plan) !important; color: var(--lkh-plan-ink) !important; }
    .th-act    { background: var(--lkh-act) !important; color: #fff !important; }
    .th-pjk    { background: var(--lkh-pjk) !important; color: var(--lkh-pjk-ink) !important; font-weight: 800 !important; }

    .lkh-table td {
        border: .5pt solid #ccc; padding: 0.5px 2px;
        vertical-align: middle; font-size: 6.5pt;
        line-height: 1.15; height: 4.8mm; overflow: hidden;
        white-space: nowrap; box-sizing: border-box;
    }
    .lkh-table td:last-child,
    .lkh-table th:last-child          { border-right: 1pt solid #2E5396 !important; }
    .lkh-table tbody tr:last-child td { border-bottom: 1pt solid #2E5396 !important; }
    /* Garis pemisah blok (mudah dibaca saat isi manual di lapangan) */
    .lkh-table tr.tr-data td.blk-end { border-right: 1pt solid #64748b !important; }
    /* Pisah OP: antar-OP 1 part = garis putus-putus tipis, antar-part tetap tegas */
    .lkh-table tr.tr-op-mid td { border-bottom: .5pt dashed #bbb !important; }

    /* Cell alignment */
    .td-no   { text-align: center; }
    .td-r    { text-align: right; padding-right: 2.5px; }
    .td-c    { text-align: center; }
    .td-left { text-align: left; padding-left: 2.5px; }
    .td-b    { font-weight: 800; }
    .td-ket  { font-size: 6pt; white-space: normal; }
    .td-mc   { font-size: 6pt; white-space: normal; line-height: 1.1; }

    /* Section tints */
    .td-patan { background: var(--lkh-td-patan) !important; }
    .td-plan  { background: var(--lkh-td-plan) !important; }
    .td-act   { background: var(--lkh-td-act) !important; }
    .td-pjk   { background: var(--lkh-td-pjk) !important; font-weight: bold; }

    /* JOB cell */
    .td-job    { white-space: normal !important; height: 4.8mm; overflow: hidden; padding: 0 2px; line-height: 1.05; }
    .td-part   { font-size: 6.5pt; font-family: 'Consolas', 'Arial Narrow', monospace; }
    .pr-job    { font-weight: bold; font-size: 6.5pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pr-badge  { font-size: 4.5pt; line-height: 1; color: #555; white-space: nowrap; overflow: hidden; }
    .pr-wip    { background: #FEF3C7 !important; color: #92400E !important; border-radius: 2pt; padding: 0 2pt; font-weight: bold; margin-left: 2pt; }

    /* Total row */
    .tr-total td { border: .5pt solid #999; font-weight: bold; background: var(--lkh-total) !important; }
    .td-total-label { text-align: right; padding-right: 4px; font-weight: bold; font-size: 7pt; }

    /* Footer */
    .footer-wrap { break-inside: avoid; page-break-inside: avoid; margin-top: 2mm; padding-top: 3px; border-top: .5pt solid #999; }
    .print-footer { display: flex; gap: 18px; padding-top: 2px; align-items: flex-start; }
    .sign-spacer  { flex: 1; }
    /* Tabel kehadiran — tinggi ≈ kotak tanda tangan (judul + 25mm) supaya sejajar */
    .att-table { border-collapse: collapse; font-size: 6.5pt; width: 110mm; }
    .att-table th, .att-table td { border: .5pt solid #999; height: 7.2mm; padding: 0 3px; }
    .att-table th { background: var(--lkh-info) !important; color: #fff !important; font-weight: bold; text-align: center; height: 4.6mm; }
    .att-table th.att-title { background: var(--lkh-base) !important; text-align: left; width: 22mm; }
    .att-table th:nth-child(2), .att-table th:nth-child(3) { width: 15mm; }
    .att-role { font-weight: bold; }
    .att-hint { font-weight: normal; font-size: 5.5pt; opacity: .85; }
    /* Semua kotak tanda tangan = lebar & tinggi sama dgn kotak QR (25mm),
       jadi garis nama, timestamp QR, dan jabatan sejajar satu baris. */
    .sign-box     { text-align: center; width: 29mm; display: flex; flex-direction: column; align-items: center; }
    .sign-title   { font-size: 7pt; font-weight: bold; padding-bottom: 2px; }
    .sign-space   { height: 25mm; }
    .sign-name, .sign-qr-ts { height: 9pt; line-height: 9pt; }
    .sign-name    { font-size: 6pt; }
    .sign-role    { font-size: 7pt; color: #555; }
    .sign-qr-wrap { display: flex; justify-content: center; align-items: center; height: 25mm; }
    .sign-qr-img  { width: 25mm; height: 25mm; image-rendering: pixelated; }
    .sign-qr-ph   { width: 25mm; height: 25mm; border: 1pt dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 6pt; color: #999; }
    .sign-qr-ts   { font-size: 5pt; color: #777; }

    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
</style>
