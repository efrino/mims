<!-- components/welding/mutation/UnlockPreviewModal.vue
     Konfirmasi "Unlock semua" di Mutasi Bulanan (2026-09-28). Sebelum membuka
     lock, tampilkan dampaknya: sel plan mana yang terkunci, nilainya sekarang,
     dan nilai auto (SP) yang akan dipakai lagi setelah plan dihitung ulang. -->
<template>
  <Teleport to="body">
    <Transition name="ulp-fade">
      <div v-if="show" class="ulp-backdrop" @mousedown.self="$emit('close')">
        <div class="ulp-modal" role="dialog" aria-modal="true" aria-labelledby="ulp-title">
          <header class="ulp-head">
            <div class="ulp-head-icon"><i class="mdi mdi-lock-open-alert-outline"></i></div>
            <div class="ulp-head-text">
              <h2 id="ulp-title">Unlock {{ cells.length }} sel plan terkunci?</h2>
              <p>Area {{ areaCode }} · {{ periodLabel }} · FP &amp; WIP</p>
            </div>
            <button class="ulp-x" title="Tutup (Esc)" @click="$emit('close')"><i class="mdi mdi-close"></i></button>
          </header>

          <div class="ulp-stats">
            <div class="ulp-stat"><span>{{ parts.length }}</span>part</div>
            <div class="ulp-stat"><span>{{ cells.length }}</span>sel (tgl × shift)</div>
            <div class="ulp-stat" :class="deltaClass(totalDelta)">
              <span>{{ fmtDelta(totalDelta) }}</span>perubahan plan (pcs)
            </div>
            <div v-if="unknownAuto" class="ulp-stat ulp-stat--muted">
              <span>{{ unknownAuto }}</span>sel belum ada nilai auto
            </div>
          </div>

          <p class="ulp-note">
            <i class="mdi mdi-information-outline"></i>
            Plan manual di sel-sel ini dilepas, lalu plan area dihitung ulang. Nilai <b>Sesudah</b> =
            hasil auto (SP) terakhir. Angka final bisa sedikit beda karena ikut stok &amp; DN terbaru.
          </p>

          <div class="ulp-list">
            <details v-for="p in parts" :key="p.key" class="ulp-part" open>
              <summary>
                <span class="ulp-kind" :class="`ulp-kind--${p.kind.toLowerCase()}`">{{ p.kind }}</span>
                <span class="ulp-part-no">{{ p.partNo }}</span>
                <span class="ulp-part-name">{{ p.partName }}</span>
                <span class="ulp-part-meta">{{ p.cells.length }} sel</span>
                <span class="ulp-part-delta" :class="deltaClass(p.delta)">{{ fmtDelta(p.delta) }}</span>
              </summary>
              <table class="ulp-table">
                <thead>
                  <tr><th>Tgl</th><th>Shift</th><th class="num">Sekarang</th><th class="num">Sesudah</th><th class="num">Δ</th><th>Dikunci oleh</th><th>Catatan</th></tr>
                </thead>
                <tbody>
                  <tr v-for="c in p.cells" :key="`${c.day}-${c.shift}`">
                    <td>{{ c.day }}</td>
                    <td><span class="ulp-shift" :class="`ulp-shift--${c.shift}`">{{ c.shift === 'day' ? 'D' : 'N' }}</span></td>
                    <td class="num">{{ c.now ?? '—' }}</td>
                    <td class="num">{{ c.auto ?? '?' }}</td>
                    <td class="num" :class="deltaClass(c.delta)">{{ c.delta == null ? '—' : fmtDelta(c.delta) }}</td>
                    <td class="ulp-by">{{ c.by || '—' }}<small v-if="c.at"> · {{ fmtAt(c.at) }}</small></td>
                    <td class="ulp-by">{{ c.note || '' }}</td>
                  </tr>
                </tbody>
              </table>
            </details>
          </div>

          <footer class="ulp-foot">
            <span class="ulp-hint"><kbd>Esc</kbd> batal · <kbd>Enter</kbd> unlock</span>
            <button class="ulp-btn" @click="$emit('close')">Batal</button>
            <button ref="confirmRef" class="ulp-btn ulp-btn--danger" :disabled="busy" @click="$emit('confirm')">
              <i class="mdi" :class="busy ? 'mdi-loading mdi-spin' : 'mdi-lock-open-variant-outline'"></i>
              {{ busy ? 'Membuka lock...' : `Unlock ${cells.length} sel` }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import type { Job, MutasiKind } from '@/types/Public/Welding/planning'

const props = defineProps<{
  show: boolean
  busy?: boolean
  jobs: Job[]
  areaCode: string
  periodLabel: string
}>()
const emit = defineEmits<{ close: []; confirm: [] }>()

interface Cell {
  day: number; shift: 'day' | 'night'
  now: number | null; auto: number | null; delta: number | null
  by: string | null; at: string | null; note: string | null
}

const parts = computed(() => {
  const out: { key: string; kind: MutasiKind; partNo: string; partName: string; cells: Cell[]; delta: number }[] = []
  for (const job of props.jobs) {
    const plan = job.descriptions.find(d => d.type === 'PLAN')
    if (!plan) continue
    const cells: Cell[] = []
    Object.entries(plan.dates)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([day, d]) => {
        for (const shift of ['day', 'night'] as const) {
          if (!(shift === 'day' ? d.lock_day : d.lock_night)) continue
          const now = (shift === 'day' ? d.day : d.night) ?? null
          const auto = (shift === 'day' ? d.plan_day_auto : d.plan_night_auto) ?? null
          cells.push({
            day: Number(day), shift, now, auto,
            delta: auto == null ? null : auto - (now ?? 0),
            by: d.locked_by ?? null, at: d.locked_at ?? null, note: d.lock_note ?? null,
          })
        }
      })
    if (!cells.length) continue
    const kind = job.kind ?? 'FP'
    out.push({
      key: `${kind}-${job.jobNo}-${job.partNo}`, kind, partNo: job.partNo, partName: job.partName,
      cells, delta: cells.reduce((s, c) => s + (c.delta ?? 0), 0),
    })
  }
  return out
})

const cells = computed(() => parts.value.flatMap(p => p.cells))
const totalDelta = computed(() => parts.value.reduce((s, p) => s + p.delta, 0))
const unknownAuto = computed(() => cells.value.filter(c => c.auto == null).length)

const fmtDelta = (n: number) => (n > 0 ? `+${n}` : `${n}`)
const deltaClass = (n: number | null) => (n == null || n === 0 ? '' : n > 0 ? 'is-up' : 'is-down')
const fmtAt = (s: string) => s.slice(5, 16).replace('T', ' ')

// Fokus ke tombol konfirmasi saat dibuka; Esc/Enter via keyboard.
const confirmRef = ref<HTMLButtonElement | null>(null)
function onKey(e: KeyboardEvent) {
  if (!props.show) return
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); emit('close') }
  else if (e.key === 'Enter' && !props.busy) { e.preventDefault(); e.stopPropagation(); emit('confirm') }
}
watch(() => props.show, async (open) => {
  if (open) {
    window.addEventListener('keydown', onKey, true)
    await nextTick(); confirmRef.value?.focus()
  } else window.removeEventListener('keydown', onKey, true)
})
onUnmounted(() => window.removeEventListener('keydown', onKey, true))
</script>

<style scoped>
.ulp-backdrop { position: fixed; inset: 0; z-index: 2000; background: rgba(15, 23, 42, .45); display: flex; align-items: center; justify-content: center; padding: 16px; }
.ulp-modal { width: min(760px, 100%); max-height: min(86vh, 760px); display: flex; flex-direction: column; background: var(--dm-surface, #fff); border-radius: 14px; box-shadow: 0 24px 48px -12px rgba(15, 23, 42, .35); overflow: hidden; }
.ulp-head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--dm-border, #f1f5f9); }
.ulp-head-icon { width: 36px; height: 36px; border-radius: 10px; background: var(--dm-tint-red, #fef2f2); color: var(--dm-on-red, #dc2626); display: flex; align-items: center; justify-content: center; font-size: 19px; flex-shrink: 0; }
.ulp-head-text { flex: 1; min-width: 0; }
.ulp-head-text h2 { margin: 0; font-size: 14.5px; font-weight: 700; color: var(--dm-text, #0f172a); }
.ulp-head-text p { margin: 2px 0 0; font-size: 11.5px; color: var(--dm-muted, #64748b); }
.ulp-x { width: 30px; height: 30px; border-radius: 8px; color: var(--dm-faint, #94a3b8); font-size: 18px; }
.ulp-x:hover { background: var(--dm-bg, #f1f5f9); color: var(--dm-cell, #334155); }

.ulp-stats { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 16px 0; }
.ulp-stat { flex: 1 1 120px; padding: 8px 10px; border: 1px solid var(--dm-border, #e2e8f0); border-radius: 10px; font-size: 11px; color: var(--dm-muted, #64748b); }
.ulp-stat span { display: block; font-size: 18px; font-weight: 700; color: var(--dm-text, #0f172a); line-height: 1.2; }
.ulp-stat.is-up span { color: var(--dm-on-green, #047857); }
.ulp-stat.is-down span { color: var(--dm-on-red, #dc2626); }
.ulp-stat--muted span { color: var(--dm-faint, #94a3b8); }

.ulp-note { margin: 10px 16px 0; padding: 8px 10px; background: var(--dm-tint-amber, #fffbeb); border: 1px solid var(--dm-bd-amber, #fde68a); border-radius: 8px; font-size: 11.5px; color: var(--dm-on-amber, #92400e); display: flex; gap: 6px; line-height: 1.45; }
.ulp-note .mdi { font-size: 14px; margin-top: 1px; }

.ulp-list { flex: 1; overflow-y: auto; padding: 10px 16px 12px; display: flex; flex-direction: column; gap: 6px; }
.ulp-part { border: 1px solid var(--dm-border, #e2e8f0); border-radius: 10px; overflow: hidden; }
.ulp-part summary { display: flex; align-items: center; gap: 8px; padding: 7px 10px; cursor: pointer; background: var(--dm-surface2, #f8fafc); font-size: 12px; list-style: none; }
.ulp-part summary::-webkit-details-marker { display: none; }
.ulp-kind { font-size: 9.5px; font-weight: 700; padding: 1px 6px; border-radius: 999px; }
.ulp-kind--fp { background: var(--dm-tint-blue, #dbeafe); color: var(--dm-accent, #1d4ed8); }
.ulp-kind--wip { background: var(--dm-tint-violet, #ede9fe); color: var(--dm-on-violet, #6d28d9); }
.ulp-part-no { font-weight: 700; color: var(--dm-text, #0f172a); white-space: nowrap; }
.ulp-part-name { flex: 1; min-width: 0; color: var(--dm-muted, #64748b); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ulp-part-meta { color: var(--dm-faint, #94a3b8); font-size: 11px; white-space: nowrap; }
.ulp-part-delta { font-weight: 700; font-size: 12px; min-width: 42px; text-align: right; color: var(--dm-muted, #64748b); }

.ulp-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
.ulp-table th { text-align: left; font-weight: 600; color: var(--dm-faint, #94a3b8); font-size: 10.5px; padding: 5px 10px; border-top: 1px solid var(--dm-border, #f1f5f9); }
.ulp-table td { padding: 4px 10px; border-top: 1px solid var(--dm-border, #f1f5f9); color: var(--dm-cell, #334155); }
.ulp-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.ulp-by { color: var(--dm-muted, #64748b); font-size: 11px; }
.ulp-shift { font-size: 10px; font-weight: 700; padding: 0 5px; border-radius: 4px; }
.ulp-shift--day { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #b45309); }
.ulp-shift--night { background: var(--dm-tint-violet, #ede9fe); color: var(--dm-on-violet, #6d28d9); }
.is-up { color: var(--dm-on-green, #047857) !important; }
.is-down { color: var(--dm-on-red, #dc2626) !important; }

.ulp-foot { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--dm-border, #f1f5f9); }
.ulp-hint { flex: 1; font-size: 11px; color: var(--dm-faint, #94a3b8); }
.ulp-hint kbd, kbd { font-family: inherit; font-size: 10px; padding: 1px 5px; border: 1px solid var(--dm-border-strong, #cbd5e1); border-bottom-width: 2px; border-radius: 4px; background: var(--dm-surface2, #f8fafc); color: var(--dm-text-2, #475569); }
.ulp-btn { height: 32px; padding: 0 14px; border-radius: 8px; font-size: 12.5px; font-weight: 600; border: 1px solid var(--dm-border, #e2e8f0); color: var(--dm-text-2, #475569); background: var(--dm-surface, #fff); display: inline-flex; align-items: center; gap: 6px; }
.ulp-btn:hover:not(:disabled) { background: var(--dm-surface2, #f8fafc); }
.ulp-btn--danger { background: #dc2626; border-color: #dc2626; color: #fff; }
.ulp-btn--danger:hover:not(:disabled) { background: #b91c1c; }
.ulp-btn:disabled { opacity: .6; cursor: not-allowed; }

@media (max-width: 640px) {
  .ulp-hint { display: none; }
  .ulp-part-name { display: none; }
  .ulp-table th:nth-child(7), .ulp-table td:nth-child(7) { display: none; }
}

.ulp-fade-enter-active, .ulp-fade-leave-active { transition: opacity .15s; }
.ulp-fade-enter-from, .ulp-fade-leave-to { opacity: 0; }
</style>
