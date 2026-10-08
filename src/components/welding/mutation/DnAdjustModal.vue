<!-- components/welding/mutation/DnAdjustModal.vue
     Adjust DN manual 1 sel (part, tanggal, shift) — Mutasi FP (2026-09-25).
     DN sistem = DO nyata + sisa SO yang belum ter-DO. Nilai manual disimpan terpisah
     (mutasi_weld_dn_adjust) dan dipilih lewat saklar mode:
       auto   = manual dipakai sampai DO nyata masuk, lalu DN sistem (DO)
       manual = selalu manual
       system = selalu DN sistem (manual hanya disimpan)
     Simpan → frontend menjalankan Refresh area supaya plan ikut DN baru. -->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show && ctx" class="modal-overlay" @click.self="emit('close')">
        <div class="modal-card">

          <div class="modal-header">
            <div class="flex items-center gap-2.5">
              <div class="header-icon"><i class="mdi mdi-truck-delivery-outline text-sm text-white"></i></div>
              <div>
                <p class="font-bold text-sm text-white leading-tight">Adjust DN</p>
                <p class="text-[10px] text-sky-100 leading-none mt-0.5">Nilai manual disimpan · pilih yang dipakai</p>
              </div>
            </div>
            <button class="close-btn" @click="emit('close')"><i class="mdi mdi-close text-sm"></i></button>
          </div>

          <div class="modal-body">
            <div class="ctx-row">
              <div class="ctx-chip" :title="ctx.partName">
                <i class="mdi mdi-barcode text-[9px] text-slate-400"></i>
                <span class="font-mono text-[10.5px] font-semibold text-slate-700">{{ ctx.partNo }}</span>
              </div>
              <div class="ctx-chip">
                <i class="mdi mdi-calendar-today text-[9px] text-slate-400"></i>
                <span class="text-[10.5px] font-semibold text-slate-700">Tgl {{ ctx.tanggal }}</span>
              </div>
              <div class="ctx-chip" :class="ctx.shift === 'day' ? 'ctx-chip--day' : 'ctx-chip--night'">
                <i class="mdi text-[9px]" :class="ctx.shift === 'day' ? 'mdi-weather-sunny' : 'mdi-weather-night'"></i>
                <span class="text-[10.5px] font-semibold">{{ ctx.shift === 'day' ? 'Day Shift' : 'Night Shift' }}</span>
              </div>
            </div>

            <!-- DN sistem (SO / DO) vs manual -->
            <div class="val-grid">
              <div class="val-box">
                <p class="val-label">DN Sistem</p>
                <p class="val-number">{{ systemQty }}</p>
                <p class="val-sub">{{ sourceLabel }}</p>
              </div>
              <div class="val-box val-box--editable">
                <p class="val-label">Manual</p>
                <input ref="inputRef" v-model.number="manualQty" type="number" min="0" class="dn-input" @keydown.enter="submit" />
                <p class="val-sub">pcs</p>
              </div>
            </div>

            <!-- Saklar mode -->
            <p class="sec-label">Nilai yang dipakai</p>
            <div class="mode-list">
              <label v-for="m in MODES" :key="m.value" class="mode-opt" :class="{ 'mode-opt--on': mode === m.value }">
                <input v-model="mode" type="radio" :value="m.value" class="sr-only" />
                <span class="mode-dot" :class="{ 'mode-dot--on': mode === m.value }"></span>
                <span class="mode-txt">
                  <span class="mode-title">{{ m.title }}</span>
                  <span class="mode-desc">{{ m.desc }}</span>
                </span>
                <span class="mode-eff">{{ effectiveFor(m.value) }}</span>
              </label>
            </div>

            <div v-if="customerLines.length" class="cust-box">
              <p class="sec-label">DN per customer</p>
              <p v-for="l in customerLines" :key="l.c" class="cust-line"><span>{{ l.c }}</span><b>{{ l.q }}</b></p>
            </div>

            <div class="note-row">
              <label class="note-label"><i class="mdi mdi-note-text-outline text-[10px]"></i> Catatan (opsional)</label>
              <input v-model="note" type="text" maxlength="255" class="note-input" placeholder="mis. info customer: tambah 60 pcs" />
            </div>

            <p v-if="existing" class="last-adj">
              <i class="mdi mdi-history"></i>
              Tersimpan: {{ existing.manual_qty }} ({{ MODE_TITLE[existing.mode] }}){{ existing.by ? ' · ' + existing.by : '' }}{{ existing.at ? ' · ' + existing.at.slice(0, 16) : '' }}
            </p>

            <Transition name="err-fade">
              <p v-if="error" class="error-msg"><i class="mdi mdi-alert-circle-outline"></i> {{ error }}</p>
            </Transition>

            <div class="flex gap-2 mt-4">
              <button class="btn-cancel" :disabled="busy" @click="emit('close')">Batal</button>
              <button v-if="existing" class="btn-reset" :disabled="busy" title="Hapus nilai manual, kembali ke DN sistem" @click="emit('reset')">
                <i class="mdi mdi-restore"></i> Hapus
              </button>
              <button class="btn-submit" :disabled="busy || !valid" @click="submit">
                <i class="mdi text-sm" :class="busy ? 'mdi-loading mdi-spin' : 'mdi-content-save-outline'"></i>
                {{ busy ? 'Menyimpan...' : 'Simpan & Hitung Ulang' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { DateData, DnAdjustMode } from '@/types/Public/Welding/planning'

export interface DnAdjustCtx {
  partNo: string
  partName: string
  tanggal: number
  shift: 'day' | 'night'
  dateData: DateData
}

const props = defineProps<{ show: boolean; ctx: DnAdjustCtx | null; busy?: boolean; error?: string | null }>()
const emit = defineEmits<{
  close: []
  submit: [data: { manualQty: number; mode: DnAdjustMode; note: string }]
  reset: []
}>()

const MODES: { value: DnAdjustMode; title: string; desc: string }[] = [
  { value: 'auto',   title: 'Otomatis', desc: 'Manual dipakai sampai DO nyata masuk, lalu ikut DO' },
  { value: 'manual', title: 'Manual',   desc: 'Selalu nilai manual' },
  { value: 'system', title: 'Sistem',   desc: 'Selalu DN sistem (SO/DO); manual hanya disimpan' },
]
const MODE_TITLE: Record<DnAdjustMode, string> = { auto: 'Otomatis', manual: 'Manual', system: 'Sistem' }

const inputRef  = ref<HTMLInputElement | null>(null)
const manualQty = ref<number>(0)
const mode      = ref<DnAdjustMode>('auto')
const note      = ref('')

const existing = computed(() => props.ctx ? (props.ctx.shift === 'day' ? props.ctx.dateData.adj_day : props.ctx.dateData.adj_night) ?? null : null)
const cellQty  = computed(() => Number((props.ctx?.shift === 'day' ? props.ctx?.dateData.day : props.ctx?.dateData.night) ?? 0))
// Nilai sel bisa sudah hasil adjust → DN sistem diambil dari snapshot adjust bila ada.
const systemQty = computed(() => existing.value?.system_qty ?? cellQty.value)
const doQty     = computed(() => Number((props.ctx?.shift === 'day' ? props.ctx?.dateData.do_day : props.ctx?.dateData.do_night) ?? 0))
const hasDo     = computed(() => existing.value ? existing.value.has_do : doQty.value > 0)
const sourceLabel = computed(() => {
  if (!systemQty.value) return 'tidak ada SO/DO'
  if (!hasDo.value) return 'dari SO (belum ada DO)'
  return doQty.value && doQty.value < systemQty.value ? `DO ${doQty.value} + SO ${systemQty.value - doQty.value}` : 'dari DO nyata'
})
const customerLines = computed(() => {
  const bc = (props.ctx?.dateData as any)?.by_customer as Record<string, { day: number; night: number }> | undefined
  if (!bc) return []
  return Object.entries(bc).map(([c, v]) => ({ c, q: props.ctx!.shift === 'day' ? v.day : v.night })).filter(l => l.q)
})
const valid = computed(() => Number.isInteger(manualQty.value) && manualQty.value >= 0)

function effectiveFor(m: DnAdjustMode): number {
  if (m === 'manual') return manualQty.value || 0
  if (m === 'system') return systemQty.value
  return hasDo.value ? systemQty.value : (manualQty.value || 0)
}

watch(() => [props.show, props.ctx], async () => {
  if (!props.show || !props.ctx) return
  manualQty.value = existing.value?.manual_qty ?? systemQty.value
  mode.value      = existing.value?.mode ?? 'auto'
  note.value      = existing.value?.note ?? ''
  await nextTick()
  inputRef.value?.select()
})

function submit() {
  if (!valid.value || props.busy) return
  emit('submit', { manualQty: manualQty.value, mode: mode.value, note: note.value.trim() })
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; z-index: 600; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); }
.modal-card { width: 400px; max-width: 100%; max-height: calc(100vh - 32px); overflow-y: auto; background: var(--dm-surface, white); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.1); }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: linear-gradient(135deg, #0369a1, #0284c7); }
.header-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; }
.close-btn { width: 28px; height: 28px; border-radius: 8px; background: rgba(255,255,255,.15); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.close-btn:hover { background: rgba(255,255,255,.3); }
.modal-body { padding: 16px; }

.ctx-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.ctx-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; background: var(--dm-bg, #f1f5f9); border: 1px solid var(--dm-border, #e2e8f0); }
.ctx-chip--day { background: var(--dm-tint-amber, #fffbeb); border-color: var(--dm-bd-amber, #fde68a); color: var(--dm-on-amber, #92400e); }
.ctx-chip--night { background: var(--dm-tint-violet, #ede9fe); border-color: var(--dm-bd-blue, #c4b5fd); color: var(--dm-on-violet, #4c1d95); }

.val-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: var(--dm-surface2, #f8fafc); border: 1px solid var(--dm-border, #e2e8f0); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
.val-box { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px; }
.val-box--editable { background: var(--dm-surface, white); border: 1px solid #7dd3fc; border-radius: 10px; }
.val-label { font-size: 10px; color: var(--dm-faint, #94a3b8); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.val-number { font-size: 26px; font-weight: 800; color: var(--dm-text, #1e293b); line-height: 1.1; }
.val-sub { font-size: 10px; color: var(--dm-muted, #64748b); text-align: center; }
.dn-input { width: 100px; text-align: center; border: none; outline: none; font-size: 24px; font-weight: 800; color: var(--dm-accent, #0284c7); background: transparent; -moz-appearance: textfield; }
.dn-input::-webkit-inner-spin-button, .dn-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

.sec-label { font-size: 10px; font-weight: 700; color: var(--dm-muted, #64748b); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
.mode-list { display: flex; flex-direction: column; gap: 6px; }
.mode-opt { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid var(--dm-border, #e2e8f0); border-radius: 10px; cursor: pointer; }
.mode-opt--on { border-color: #0284c7; background: var(--dm-tint-blue, #f0f9ff); }
.mode-dot { width: 14px; height: 14px; border-radius: 9999px; border: 2px solid var(--dm-border-strong, #cbd5e1); flex-shrink: 0; transition: all .12s; }
.mode-dot--on { border-color: #0284c7; box-shadow: inset 0 0 0 3px white; background: #0284c7; }
.mode-txt { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.mode-title { font-size: 12px; font-weight: 700; color: var(--dm-text, #1e293b); }
.mode-desc { font-size: 10.5px; color: var(--dm-muted, #64748b); }
.mode-eff { font-size: 14px; font-weight: 800; color: var(--dm-text, #0f172a); min-width: 40px; text-align: right; }

.cust-box { margin-top: 12px; padding: 8px 10px; border: 1px dashed var(--dm-border-strong, #cbd5e1); border-radius: 8px; }
.cust-line { display: flex; justify-content: space-between; font-size: 11px; color: var(--dm-cell, #334155); }

.note-row { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; }
.note-label { display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; color: var(--dm-muted, #64748b); text-transform: uppercase; letter-spacing: .04em; }
.note-input { width: 100%; border: 1px solid var(--dm-border, #e2e8f0); border-radius: 8px; padding: 6px 10px; font-size: 11px; color: var(--dm-cell, #334155); background: var(--dm-surface2, #f8fafc); outline: none; box-sizing: border-box; }
.note-input:focus { border-color: #38bdf8; background: var(--dm-surface, white); }

.last-adj { margin-top: 8px; font-size: 10.5px; color: var(--dm-on-amber, #92400e); background: var(--dm-tint-amber, #fffbeb); border: 1px solid var(--dm-bd-amber, #fde68a); border-radius: 8px; padding: 6px 8px; }
.error-msg { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--dm-on-red, #dc2626); margin-top: 8px; }

.btn-cancel { flex: 1; height: 36px; border: 1px solid var(--dm-border, #e2e8f0); border-radius: 8px; font-size: 12px; font-weight: 600; color: var(--dm-muted, #64748b); background: var(--dm-surface, white); cursor: pointer; }
.btn-cancel:hover:not(:disabled) { background: var(--dm-surface2, #f8fafc); }
.btn-reset { height: 36px; padding: 0 12px; border: 1px solid #f59e0b; border-radius: 8px; font-size: 12px; font-weight: 600; color: var(--dm-on-amber, #b45309); background: var(--dm-tint-amber, #fffbeb); cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
.btn-reset:hover:not(:disabled) { background: var(--dm-tint-amber, #fef3c7); }
.btn-submit { flex: 2; height: 36px; border-radius: 8px; font-size: 12px; font-weight: 700; color: white; background: #0284c7; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; }
.btn-submit:hover:not(:disabled) { background: #0369a1; }
.btn-submit:disabled, .btn-cancel:disabled, .btn-reset:disabled { opacity: .5; cursor: not-allowed; }

.modal-enter-active { transition: opacity .15s ease; }
.modal-leave-active { transition: opacity .12s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.err-fade-enter-active, .err-fade-leave-active { transition: opacity .15s ease; }
.err-fade-enter-from, .err-fade-leave-to { opacity: 0; }
</style>
