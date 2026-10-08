<!-- components/welding/lkh/LKHDualTable.vue
     Tabel LKH dual-shift — 1 baris per PART (mesin digabung di kolom MC WELD):
     NO | JOB NO | PART NO | STATUS | MC WELD | Nut/Spot | Qty/Kbn | CT (detik)
     | [PATAN(kbn,Lot,stroke) — hanya mode Per Shift (prop showPatan)]
     | DAY SHIFT  [PLAN PROD(kbn,Lot,stroke) | Actual(PCS,PJK,BLC)]   ← prop shifts:
     | NIGHT SHIFT [PLAN PROD(...) | Actual(...)]                      Per Day = keduanya
     | KETERANGAN
     Kolom TPT dihapus (boros tempat; TPT tetap ada di data untuk keperluan lain).
     Warna minimal; Actual & Keterangan editable. Layout = cermin template cetak (LKHPrint). -->
<template>
  <div class="lkh-wrap">
    <table class="lkh-tbl">
      <thead>
        <!-- Row 1 -->
        <tr class="h-row1">
          <th rowspan="3" class="h hb sticky c-no">NO</th>
          <th rowspan="3" class="h hb sticky c-job">JOB NO</th>
          <th rowspan="3" class="h hb sticky c-part">PART NO</th>
          <th rowspan="3" class="h hb c-st">STATUS</th>
          <th v-if="showOp" rowspan="3" class="h hi c-op">OP</th>
          <th rowspan="3" class="h hi c-mc">MC<br>WELD</th>
          <th rowspan="3" class="h hi c-nut">Nut/<br>Spot/<br>Mili</th>
          <th rowspan="3" class="h hi c-kbn">Qty/<br>Kbn</th>
          <th rowspan="3" class="h hi c-ct" title="Cycle time per pcs (detik)">CT<br>(s)</th>
          <th v-if="showPatan" colspan="3" class="h grp grp-patan">PATAN</th>
          <th v-for="s in shifts" :key="s" colspan="6" class="h grp" :class="'grp-' + s">{{ SHIFT_LABEL[s] }}</th>
          <th rowspan="3" class="h hb sticky-r c-ket">KETERANGAN</th>
        </tr>
        <!-- Row 2 -->
        <tr class="h-row2">
          <template v-if="showPatan">
            <th rowspan="2" class="h sub grp-patan">kbn</th>
            <th rowspan="2" class="h sub grp-patan">Lot<br>size</th>
            <th rowspan="2" class="h sub grp-patan">stroke</th>
          </template>
          <template v-for="s in shifts" :key="s">
            <th colspan="3" class="h grp2 grp-plan-grp">PLAN PROD</th>
            <th colspan="3" class="h grp2 grp-act">Actual Prod</th>
          </template>
        </tr>
        <!-- Row 3 -->
        <tr class="h-row3">
          <template v-for="s in shifts" :key="s">
            <th class="h sub grp-plan">kbn</th>
            <th class="h sub grp-plan">Lot<br>size</th>
            <th class="h sub grp-plan stroke-end">stroke</th>
            <th class="h sub grp-act">PCS</th>
            <th class="h sub grp-pjk">PJK</th>
            <th class="h sub grp-act blc-end">BLC</th>
          </template>
        </tr>
      </thead>

      <tbody>
        <template v-for="row in data" :key="row.area + '|' + row.part_number + '|' + (row.op || '')">
        <!-- Judul lembar (grup gabungan >1 area) -->
        <tr v-if="sheetStart.has(row)" class="sec">
          <td :colspan="colCount" class="sec-cell"><span class="sec-sticky"><i class="ti ti-file-text"></i> Lembar {{ sheetLabel(group!, row.area) }}</span></td>
        </tr>
        <tr class="r" :class="{ 'pg-start': pageStart.has(row), 'op-mid': row.op_last === false }"
            :title="pageStart.has(row) ? 'Halaman cetak baru' : undefined">
          <td class="b sticky c-no center muted">{{ row.op_first !== false ? row.no : '' }}</td>
          <td class="b sticky c-job left">
            <div class="job">{{ row.job_no || '—' }}</div>
            <div class="sub-meta">
              {{ row.model || '' }}
              <span v-if="row.shift_mode && row.shift_mode !== 'both'"
                    class="sm-chip" :class="'sm-' + row.shift_mode"
                    :title="'Mode shift (atur di Mutasi): ' + modeLabel(row.shift_mode)">{{ modeShort(row.shift_mode) }}</span>
            </div>
          </td>
          <td class="b sticky c-part left mono">{{ row.part_number }}</td>
          <td class="b c-st center"><span class="st" :class="row.status_part === 'WIP' ? 'st-wip' : 'st-fp'">{{ row.status_part || 'FP' }}</span></td>
          <td v-if="showOp" class="b c-op center"><span v-if="row.op" class="op-chip">{{ row.op }}</span></td>
          <td class="b c-mc left" :title="row.total_proses > 1 ? row.total_proses + ' proses/mesin' : ''">{{ row.mc_weld || '' }}</td>
          <td class="b c-nut right">{{ row.sum_nut_spot || '' }}</td>
          <td class="b c-kbn right">{{ row.qty_kbn || '' }}</td>
          <td class="b c-ct right">{{ ct(row.ct) }}</td>

          <!-- PATAN (hidden by default) -->
          <template v-if="showPatan">
            <td class="b patan right">{{ int(row.patan.kbn) }}</td>
            <td class="b patan right bold">{{ int(row.patan.lot_size) }}</td>
            <td class="b patan right">{{ int(row.patan.stroke) }}</td>
          </template>

          <!-- DAY / NIGHT (sesuai mode) -->
          <template v-for="s in shifts" :key="s">
            <td class="b plan right">{{ int(row[s].plan_kbn) }}</td>
            <td class="b plan right bold">{{ int(row[s].plan_lot_size) }}</td>
            <td class="b plan stroke-end right">{{ int(row[s].plan_stroke) }}</td>
            <td class="b act-c right bold" :class="{ edit: !blankActual && row.op_last !== false, short: !blankActual && isShort(row[s]) }"
                :title="!blankActual && isShort(row[s]) ? 'Actual di bawah plan' : ''"
                @click="edit(row, s, 'pcs', row[s].act_pcs)">{{ blankActual ? '' : row[s].act_pcs || '' }}</td>
            <td class="b act-c pjk-c center" :class="{ edit: !blankActual && row.op_last !== false }" @click="edit(row, s, 'pjk', row[s].act_pjk)">{{ blankActual ? '' : row[s].act_pjk || '' }}</td>
            <td class="b act-c blc-end center" :class="{ edit: !blankActual && row.op_last !== false }" @click="edit(row, s, 'blc', row[s].act_blc)">{{ blankActual ? '' : row[s].act_blc || '' }}</td>
          </template>

          <!-- KETERANGAN -->
          <td class="b sticky-r c-ket left" :class="{ edit: !blankActual && row.op_last !== false }" @click="edit(row, shifts[0], 'keterangan', row.keterangan)">{{ blankActual ? '' : row.keterangan || '' }}</td>
        </tr>
        </template>
      </tbody>

      <tfoot>
        <tr class="t">
          <td :colspan="showOp ? 9 : 8" class="f label">TOTAL</td>
          <template v-if="showPatan">
            <td class="f right">{{ int(totals.patan_kbn) }}</td>
            <td class="f right bold">{{ int(totals.patan_lot) }}</td>
            <td class="f right">{{ int(totals.patan_stroke) }}</td>
          </template>
          <template v-for="s in shifts" :key="s">
            <td class="f right">{{ int(totals[s].kbn) }}</td>
            <td class="f right bold">{{ int(totals[s].lot) }}</td>
            <td class="f right stroke-end">{{ int(totals[s].stroke) }}</td>
            <td class="f right bold act-t">{{ blankActual ? '' : int(totals[s].pcs) }}</td>
            <td class="f"></td>
            <td class="f blc-end"></td>
          </template>
          <td class="f sticky-r"></td>
        </tr>
      </tfoot>
    </table>

    <!-- Editor popup (floating) -->
    <div v-if="ed.active" class="ed-pop" :style="{ top: ed.y + 'px', left: ed.x + 'px' }" @click.stop>
      <label class="ed-lbl">{{ ed.label }}</label>
      <input
        ref="edInput"
        v-model="ed.value"
        :type="ed.field === 'pcs' ? 'number' : 'text'"
        class="ed-inp"
        @keyup.enter="commit"
        @keyup.esc="cancel"
      />
      <div class="ed-btns">
        <button class="ed-ok" @click="commit">Simpan</button>
        <button class="ed-no" @click="cancel">Batal</button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, nextTick } from 'vue'
import type { LKHDualRow, LKHDualField, LKHDualShift, LKHShiftKey } from '@/types/Public/Welding/lkh'
import './lkh-palette.css'
import { paginateLKH, sheetLabel, sumLKH, LKH_ROWS_PER_PAGE, type LKHGroup } from '@/utils/lkhGroups'

const props = withDefaults(defineProps<{
  data: LKHDualRow[]
  showPatan?: boolean
  shifts?: LKHShiftKey[]
  group?: LKHGroup        // grup gabungan >1 area → baris judul lembar per area
  blankActual?: boolean   // mode "Actual kosong": kolom actual & keterangan dikosongkan, tidak bisa diedit
  showOp?: boolean        // mode Pisah OP: kolom OP, garis putus-putus antar-OP 1 part
}>(), { showPatan: false, shifts: () => ['day', 'night'], blankActual: false, showOp: false })
const emit = defineEmits<{
  actual: [payload: { area: string; part_number: string; status: 'FP' | 'WIP'; shift: LKHShiftKey; field: LKHDualField; value: string | number | null }]
}>()

// Batas halaman = sama persis dengan cetak (paginateLKH) → garis tebal di baris awal halaman.
const pages = computed(() => paginateLKH(props.data, LKH_ROWS_PER_PAGE))
const pageStart = computed(() => new Set(pages.value.slice(1).map(p => p.rows[0])))
const sheetStart = computed(() => new Set(
  (props.group?.sources.length ?? 0) > 1 ? pages.value.filter(p => p.pageNo === 1).map(p => p.rows[0]) : []))
const colCount = computed(() => 9 + (props.showOp ? 1 : 0) + (props.showPatan ? 3 : 0) + props.shifts.length * 6)

const SHIFT_LABEL: Record<LKHShiftKey, string> = { day: 'DAY SHIFT', night: 'NIGHT SHIFT' }

// Indikator mode shift (read-only di LKH; pengaturan ada di tabel Mutasi).
const modeLabel = (m?: string) => m === 'day' ? 'Day only' : m === 'night' ? 'Night only' : '2 Shift'
const modeShort = (m?: string) => m === 'day' ? 'D' : m === 'night' ? 'N' : '2S'

const int = (v: unknown) => { const n = Number(v) || 0; return n > 0 ? n.toLocaleString('id-ID') : '' }
const n = (v: unknown) => Number(v) || 0
// CT detik: 1 desimal bila perlu (44 / 43,5)
const ct = (v: unknown) => n(v) > 0 ? n(v).toLocaleString('id-ID', { maximumFractionDigits: 1 }) : ''

// Actual sudah diisi tapi masih di bawah plan → tanda tipis (bukan alarm).
const isShort = (s: LKHDualShift) => n(s.act_pcs) > 0 && n(s.plan_lot_size) > 0 && n(s.act_pcs) < n(s.plan_lot_size)

const totals = computed(() => sumLKH(props.data))

// ── Inline editor ──────────────────────────────────────────────
const edInput = ref<HTMLInputElement | null>(null)
const ed = reactive({
  active: false, x: 0, y: 0,
  area: '', part: '', status: 'FP' as 'FP' | 'WIP', shift: 'day' as LKHShiftKey, field: 'pcs' as LKHDualField,
  value: '' as string | number, label: '',
})

async function edit(row: LKHDualRow, shift: LKHShiftKey, field: LKHDualField, cur: any) {
  if (props.blankActual || row.op_last === false) return   // OP antara: actual ada di OP terakhir
  const e = window.event as MouseEvent
  ed.active = true
  ed.area = row.area
  ed.part = row.part_number
  ed.status = row.status_part === 'WIP' ? 'WIP' : 'FP'
  ed.shift = shift
  ed.field = field
  ed.value = cur ?? ''
  ed.label = field === 'keterangan'
    ? `Keterangan · ${row.part_number}`
    : `${field.toUpperCase()} ${shift === 'day' ? 'DAY' : 'NIGHT'} · ${row.part_number}`
  if (e) {
    ed.x = Math.min(e.clientX, window.innerWidth - 240)
    ed.y = Math.min(e.clientY + 8, window.innerHeight - 120)
  }
  await nextTick()
  edInput.value?.focus()
  edInput.value?.select()
}

function commit() {
  if (!ed.active) return
  const v = ed.value === '' ? null : ed.value
  emit('actual', { area: ed.area, part_number: ed.part, status: ed.status, shift: ed.shift, field: ed.field, value: v })
  ed.active = false
}
function cancel() { ed.active = false }
</script>

<style scoped>
/* ═══════════════════════════════════════════════════
   LKH TABLE — Excel-like grid
   Freeze panes: 3 header rows + 3 left cols + 1 right col + footer total.
   border-collapse: separate (bukan collapse) → border ikut sel sticky,
   tidak ada celah/garis hilang saat scroll. Border hanya kanan+bawah per sel,
   garis kiri+atas dari wrapper → semua garis 1px, tidak dobel.
   ═══════════════════════════════════════════════════ */
.lkh-wrap {
  overflow: auto;
  flex: 1;
  border: 1px solid #9aa5b4;
  border-radius: 6px;
  background: #fff;
}

.lkh-tbl {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 11px;
  width: max-content;
  min-width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --line: #cfd6df;        /* garis grid */
  --line-strong: #7c8798; /* garis pemisah freeze/grup */
  --h-bg: #eef2f7;
}

.lkh-tbl th,
.lkh-tbl td {
  border: 0;
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  padding: 0 5px;
  vertical-align: middle;
  box-sizing: border-box;
}

/* ── HEADER ── */
.lkh-tbl .h {
  position: sticky;
  background: var(--h-bg);
  color: #1e293b;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
  line-height: 1.1;
  z-index: 5;
}
.lkh-tbl .sub  { font-size: 9.5px; font-weight: 600; background: #f6f8fb; }
.lkh-tbl .grp  { font-size: 11px; letter-spacing: .4px; text-transform: uppercase; }
.lkh-tbl .grp2 { font-size: 9.5px; letter-spacing: .2px; text-transform: uppercase; }

/* Warna header = template cetak (lkh-palette.css) */
.lkh-tbl .h.hb        { background: var(--lkh-base); color: #fff; }
.lkh-tbl .h.hi        { background: var(--lkh-info); color: #fff; }
.lkh-tbl .h.grp-patan { background: var(--lkh-patan); color: #fff; }
.lkh-tbl .h.grp-day   { background: var(--lkh-day); color: #fff; }
.lkh-tbl .h.grp-night { background: var(--lkh-night); color: #fff; }
.lkh-tbl .h.grp-plan-grp { background: var(--lkh-plan-grp); color: #fff; border-right: 1px solid var(--line-strong); }
.lkh-tbl .h.grp-plan  { background: var(--lkh-plan); color: var(--lkh-plan-ink); }
.lkh-tbl .h.grp-act   { background: var(--lkh-act); color: #fff; }
.lkh-tbl .h.grp-pjk   { background: var(--lkh-pjk); color: var(--lkh-pjk-ink); font-weight: 800; }

/* Tinggi header pasti → offset sticky top akurat, tidak ada celah antar baris */
.lkh-tbl .h-row1 .h { top: 0;    height: 22px; }
.lkh-tbl .h-row2 .h { top: 22px; height: 18px; }
.lkh-tbl .h-row3 .h { top: 40px; height: 20px; }
.lkh-tbl .h-row1 .h[rowspan="3"] { height: 60px; }
.lkh-tbl .h-row2 .h[rowspan="2"] { height: 38px; }

/* Garis tebal: bawah header, pemisah DAY|NIGHT, pemisah PLAN|ACTUAL */
.h-row3 .h,
.h-row1 .h[rowspan="3"],
.h-row2 .h[rowspan="2"] { border-bottom: 2px solid var(--line-strong); }
.lkh-tbl .grp-day, .lkh-tbl .grp-night,
.lkh-tbl .c-ct { border-right: 2px solid var(--line-strong); }
.lkh-tbl .grp-act { border-right: 2px solid var(--line-strong); }
.lkh-tbl .grp-plan { border-right: 1px solid var(--line-strong); }
.lkh-tbl .h-row3 .h.stroke-end { border-right: 1px solid var(--line-strong); }
.lkh-tbl .h-row3 .h.blc-end,
.lkh-tbl td.blc-end,
.lkh-tbl tfoot .f.blc-end { border-right: 2px solid var(--line-strong); }
.lkh-tbl td.stroke-end,
.lkh-tbl tfoot .f.stroke-end { border-right: 1px solid var(--line-strong); }

/* ── STICKY COLUMNS ── */
.sticky { position: sticky; z-index: 6; background: #fff; }
.h.sticky { z-index: 8; }

.c-no  { left: 0;     width: 34px;  min-width: 34px; }
.c-job { left: 34px;  width: 122px; min-width: 122px; }
.c-part {
  left: 156px;
  width: 140px;
  min-width: 140px;
  border-right: 2px solid var(--line-strong) !important;
}

.sticky-r {
  position: sticky;
  right: 0;
  z-index: 6;
  background: #fff;
  border-left: 2px solid var(--line-strong) !important;
  border-right: 0 !important;
}
.h.sticky-r { z-index: 8; }

.c-mc  { width: 84px; min-width: 84px; }
.c-nut { width: 46px; min-width: 46px; }
.c-kbn { width: 46px; min-width: 46px; }
.c-ct  { width: 46px; min-width: 46px; }
.c-ket { width: 180px; min-width: 180px; }

/* ── BODY ── */
.b { white-space: nowrap; background: #fff; height: 24px; }
.left   { text-align: left; }
.right  { text-align: right; padding-right: 8px; }
.center { text-align: center; }
.bold   { font-weight: 700; }
.mono   { font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace; }
.muted  { color: #94a3b8; }

.r:nth-child(even) .b { background: #f9fafb; }
.r:hover .b,
.r:hover .sticky,
.r:hover .sticky-r { background: #eef4fb; }

.lkh-tbl .b.patan { background: var(--lkh-td-patan); }
.lkh-tbl .b.plan  { background: var(--lkh-td-plan); }
.lkh-tbl .b.act-c { background: var(--lkh-td-act); }
.lkh-tbl .b.pjk-c { background: var(--lkh-td-pjk); }
.short { color: #b45309; }

.job { font-weight: 700; color: #0f2b47; line-height: 1.2; }
.sub-meta { font-size: 8.5px; color: #94a3b8; line-height: 1.3; }
.c-st { width: 48px; min-width: 48px; }
.st { display: inline-block; border-radius: 3px; padding: 0 5px; font-size: 9px; font-weight: 800; line-height: 15px; letter-spacing: .3px; }
.st-fp  { background: #e0f2fe; color: #075985; }
.st-wip { background: #fef3c7; color: #92400e; }
/* ── Editable cells ── */
.edit { cursor: pointer; }
.edit:not(.sticky-r) { position: relative; }   /* jangan timpa sticky KETERANGAN */
.edit::after {
  content: '';
  position: absolute;
  right: 1px; bottom: 1px;
  width: 0; height: 0;
  border-style: solid;
  border-width: 0 0 6px 6px;
  border-color: transparent transparent #94a3b8 transparent;
  opacity: 0.3;
}
.edit:hover { outline: 2px solid #10b981; outline-offset: -2px; }
.edit:hover::after { opacity: 0.7; }

/* ── FOOTER total ── */
.lkh-tbl tfoot .f {
  position: sticky; bottom: 0; z-index: 6;
  background: #e3e9f1; font-weight: 700; color: #0f172a;
  border-top: 2px solid var(--line-strong);
  border-bottom: 0;
  white-space: nowrap; height: 26px;
}
.lkh-tbl tfoot .f.label { text-align: right; padding-right: 10px; letter-spacing: .4px; border-right: 2px solid var(--line-strong); }
.lkh-tbl tfoot .f.right { text-align: right; padding-right: 8px; }
.lkh-tbl tfoot .f.act-t { color: #065f46; }
.lkh-tbl tfoot .f.sticky-r { right: 0; z-index: 8; }

/* ── Inline editor popup ── */
.ed-pop {
  position: fixed; z-index: 9999;
  background: #fff; border: 1px solid #cbd5e1; border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.18);
  padding: 10px 12px; width: 220px;
}
.ed-lbl { display: block; font-size: 10px; font-weight: 700; color: #475569; margin-bottom: 6px; }
.ed-inp {
  width: 100%; border: 1px solid #cbd5e1; border-radius: 6px;
  padding: 6px 8px; font-size: 12px; outline: none; box-sizing: border-box;
}
.ed-inp:focus { border-color: #10b981; box-shadow: 0 0 0 2px rgba(16,185,129,.2); }
.ed-btns { display: flex; gap: 6px; margin-top: 8px; }
.ed-ok { flex: 1; background: #059669; color: #fff; border: none; border-radius: 6px; padding: 5px; font-size: 11px; font-weight: 600; cursor: pointer; }
.ed-ok:hover { background: #047857; }
.ed-no { flex: 1; background: #e2e8f0; color: #475569; border: none; border-radius: 6px; padding: 5px; font-size: 11px; font-weight: 600; cursor: pointer; }
.ed-no:hover { background: #cbd5e1; }

/* ── Shift-mode chip ── */
.sm-chip {
  display: inline-block; margin-left: 5px; border: none; border-radius: 3px;
  font-size: 8px; font-weight: 800; padding: 0 4px; line-height: 14px;
  cursor: default; vertical-align: middle; letter-spacing: .2px;
}
/* ── Pisah OP: chip OP + OP antara (actual di OP terakhir) ── */
.c-op { width: 44px; min-width: 44px; }
.op-chip {
  display: inline-block; border-radius: 3px; padding: 0 5px;
  background: #e0e7ff; color: #3730a3; font-size: 9px; font-weight: 800; line-height: 15px;
}
/* 1 part = 1 grup: garis antar-OP tipis putus-putus, garis antar-part tetap tegas */
.r.op-mid > td { border-bottom: 1px dashed #cbd5e1; }
.r.op-mid .act-c { background: repeating-linear-gradient(135deg, #f8fafc 0 4px, #eef2f7 4px 8px); cursor: default; }

/* ── Batas halaman cetak & judul lembar ── */
.r.pg-start .b { border-top: 3px solid #334155; }
.sec-cell {
  background: #1e293b; color: #fff; height: 24px; padding: 0;
  border-right: 0 !important; border-bottom: 2px solid var(--line-strong);
}
.sec-sticky {
  position: sticky; left: 0; display: inline-flex; align-items: center; gap: 6px;
  padding: 0 10px; font-size: 11px; font-weight: 800; letter-spacing: .4px;
}
.sm-day   { background: #fde68a; color: #92400e; }
.sm-night { background: #c7d2fe; color: #3730a3; }

/* ── Lebar seragam kolom numerik (DAY cermin NIGHT) ── */
.lkh-tbl td.patan,
.lkh-tbl td.plan,
.lkh-tbl td.act-c,
.lkh-tbl th.sub:not([colspan]) {
  width: 54px; min-width: 54px; max-width: 54px;
  overflow: hidden; text-overflow: ellipsis;
}
</style>
