<!-- components/welding/mutation/InitialStockModal.vue
     Edit initial stock lewat MODAL (2026-09-16) — menggantikan inline edit
     ala Excel di TableBody. Gaya visual disamakan dgn ActualEditModal. -->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="modal-overlay"
        @click.self="emit('close')"
      >
        <div class="modal-card">

          <!-- ── Header ─────────────────────────────────────────── -->
          <div class="modal-header modal-header--stock">
            <div class="flex items-center gap-2.5">
              <div class="header-icon">
                <i class="mdi mdi-package-variant-closed text-sm text-white"></i>
              </div>
              <div>
                <p class="font-bold text-sm text-white leading-tight">Edit Initial Stock</p>
                <p class="text-[10px] text-sky-100 leading-none mt-0.5">
                  Stok awal bulan · rolling stok & plan dihitung ulang
                </p>
              </div>
            </div>
            <button @click="emit('close')" class="close-btn">
              <i class="mdi mdi-close text-sm"></i>
            </button>
          </div>

          <!-- ── Body ──────────────────────────────────────────── -->
          <div class="modal-body">

            <div class="ctx-row">
              <div class="ctx-chip">
                <i class="mdi mdi-barcode text-[9px] text-slate-400"></i>
                <span class="font-mono text-[10.5px] font-semibold text-slate-700 truncate max-w-[140px]" :title="ctx?.partNo">
                  {{ ctx?.partNo }}
                </span>
              </div>
              <div class="ctx-chip" :title="ctx?.partName">
                <i class="mdi mdi-tag-outline text-[9px] text-slate-400"></i>
                <span class="text-[10.5px] font-semibold text-slate-700 truncate max-w-[150px]">{{ ctx?.partName }}</span>
              </div>
              <div v-if="ctx?.locked" class="ctx-chip ctx-chip--lock">
                <i class="mdi mdi-lock-outline text-[9px]"></i>
                <span class="text-[10.5px] font-semibold">Manual</span>
              </div>
            </div>

            <div class="adjust-row">
              <div class="val-box">
                <p class="val-label">Saat Ini</p>
                <p class="val-number">{{ ctx?.currentStock ?? 0 }}</p>
                <p class="val-sub">pcs</p>
              </div>
              <div class="arrow-col">
                <i class="mdi mdi-arrow-right-bold text-slate-300 text-xl"></i>
                <Transition name="delta-fade">
                  <span v-if="delta !== 0" class="delta-badge" :class="delta > 0 ? 'delta-pos' : 'delta-neg'">
                    {{ delta > 0 ? '+' : '' }}{{ delta }}
                  </span>
                </Transition>
              </div>
              <div class="val-box val-box--editable">
                <p class="val-label">Nilai Baru</p>
                <input
                  ref="inputRef"
                  v-model.number="newValue"
                  type="number"
                  min="0"
                  class="actual-input"
                  @keydown.enter="handleSubmit"
                  @keydown.esc="emit('close')"
                />
                <p class="val-sub">pcs</p>
              </div>
            </div>

            <div v-if="delta !== 0" class="info-banner info-banner--info">
              <i class="mdi mdi-information-outline text-xs flex-shrink-0 mt-0.5"></i>
              <span>
                Initial stock jadi <strong>{{ newValue }} pcs</strong> dan <strong>dikunci manual</strong>
                (tidak ikut stok penutupan bulan lalu). Rolling stok, strength &amp; plan seluruh bulan dihitung ulang.
              </span>
            </div>
            <div v-else class="info-banner info-banner--neutral">
              <i class="mdi mdi-information-outline text-xs flex-shrink-0 mt-0.5"></i>
              <span>
                {{ ctx?.locked ? 'Nilai saat ini hasil edit manual.' : 'Nilai saat ini mengikuti stok penutupan bulan lalu.' }}
                Masukkan nilai baru untuk mengubah.
              </span>
            </div>

            <!-- Info kunci manual + tombol reset -->
            <div v-if="ctx?.locked" class="last-adj-box">
              <div class="last-adj-header">
                <i class="mdi mdi-history text-[9px]"></i>
                Edit manual terakhir
              </div>
              <div class="last-adj-body">
                <div v-if="ctx.lockedBy" class="last-adj-row">
                  <i class="mdi mdi-account-outline text-[9px] text-cyan-600 flex-shrink-0"></i>
                  <span>{{ ctx.lockedBy }}</span>
                </div>
                <div v-if="ctx.lockedAt" class="last-adj-row">
                  <i class="mdi mdi-clock-outline text-[9px] text-cyan-600 flex-shrink-0"></i>
                  <span>{{ formatAt(ctx.lockedAt) }}</span>
                </div>
              </div>
              <button
                type="button"
                class="btn-revert"
                :disabled="submitting || resetting"
                @click="emit('reset')"
                title="Lepas kunci manual — kembali ke stok penutupan bulan lalu"
              >
                <i class="mdi text-sm leading-none" :class="resetting ? 'mdi-loading mdi-spin' : 'mdi-restore'"></i>
                <span>{{ resetting ? 'Mereset...' : 'Reset ke stok bulan lalu' }}</span>
              </button>
            </div>

            <Transition name="err-fade">
              <p v-if="error" class="error-msg">
                <i class="mdi mdi-alert-circle-outline"></i>
                {{ error }}
              </p>
            </Transition>

            <div class="flex gap-2 mt-4">
              <button @click="emit('close')" class="btn-cancel" :disabled="submitting">Batal</button>
              <button
                @click="handleSubmit"
                :disabled="submitting || newValue < 0 || newValue === (ctx?.currentStock ?? 0)"
                class="btn-submit btn-submit--stock"
                :class="{ 'btn-submit--disabled': newValue === (ctx?.currentStock ?? 0) }"
              >
                <i class="mdi text-sm leading-none" :class="submitting ? 'mdi-loading mdi-spin' : 'mdi-check-circle-outline'"></i>
                <span>{{ submitting ? 'Menyimpan...' : 'Simpan' }}</span>
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

export interface InitialStockCtx {
  partNo: string
  partName: string
  currentStock: number
  locked: boolean
  lockedBy?: string | null
  lockedAt?: string | null
}

interface Props {
  show: boolean
  ctx: InitialStockCtx | null
  submitting?: boolean
  resetting?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), { submitting: false, resetting: false, error: null })

const emit = defineEmits<{
  close: []
  submit: [newStock: number]
  reset: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const newValue = ref(0)
const delta    = computed(() => newValue.value - (props.ctx?.currentStock ?? 0))

watch(() => props.show, (v) => {
  if (v && props.ctx) {
    newValue.value = props.ctx.currentStock
    nextTick(() => { inputRef.value?.focus(); inputRef.value?.select() })
  }
})
watch(() => props.ctx, (ctx) => { if (ctx) newValue.value = ctx.currentStock })

function handleSubmit() {
  if (props.submitting || newValue.value < 0) return
  const v = Math.max(0, Number(newValue.value) || 0)
  if (v === (props.ctx?.currentStock ?? 0)) return
  emit('submit', v)
}

function formatAt(at: string): string {
  try {
    return new Date(at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return at }
}
</script>


<style scoped>
/* ── Overlay ──────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
}

/* ── Card ─────────────────────────────────────────────── */
.modal-card {
  width: 380px;
  max-width: 100%;
  background: var(--dm-surface, white);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* ── Header ───────────────────────────────────────────── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, #7b1fa2, #9c27b0);
}

.header-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}
.close-btn:hover { background: rgba(255, 255, 255, 0.3); }

/* ── Body ─────────────────────────────────────────────── */
.modal-body {
  padding: 16px;
}

/* ── Context chips ────────────────────────────────────── */
.ctx-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.ctx-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 20px;
  background: var(--dm-bg, #f1f5f9);
  border: 1px solid var(--dm-border, #e2e8f0);
}

.ctx-chip--day {
  background: var(--dm-tint-amber, #fffbeb);
  border-color: var(--dm-bd-amber, #fde68a);
  color: var(--dm-on-amber, #92400e);
}

.ctx-chip--night {
  background: var(--dm-tint-violet, #ede9fe);
  border-color: var(--dm-bd-blue, #c4b5fd);
  color: var(--dm-on-violet, #4c1d95);
}

/* ── Adjust row ───────────────────────────────────────── */
.adjust-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--dm-surface2, #f8fafc);
  border: 1px solid var(--dm-border, #e2e8f0);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 12px;
}

.val-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.val-box--editable {
  background: var(--dm-surface, white);
  border: 1px solid var(--dm-bd-blue, #c4b5fd);
  border-radius: 10px;
  padding: 8px;
}

.val-label {
  font-size: 10px;
  color: var(--dm-faint, #94a3b8);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.val-number {
  font-size: 28px;
  font-weight: 800;
  color: var(--dm-text, #1e293b);
  line-height: 1;
}

.val-sub {
  font-size: 10px;
  color: #cbd5e1;
  font-weight: 500;
}

.arrow-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* ── Actual input ─────────────────────────────────────── */
.actual-input {
  width: 72px;
  text-align: center;
  border: none;
  outline: none;
  font-size: 26px;
  font-weight: 800;
  color: #7c3aed;
  background: transparent;
  -moz-appearance: textfield;
}
.actual-input::-webkit-inner-spin-button,
.actual-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

/* ── Delta badge ──────────────────────────────────────── */
.delta-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 20px;
}
.delta-pos {
  background: var(--dm-tint-green, #dcfce7);
  color: var(--dm-on-green, #166534);
  border: 1px solid var(--dm-bd-green, #bbf7d0);
}
.delta-neg {
  background: var(--dm-tint-red, #fee2e2);
  color: var(--dm-on-red, #991b1b);
  border: 1px solid var(--dm-bd-red, #fecaca);
}

/* ── Info banners ─────────────────────────────────────── */
.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.5;
  margin-bottom: 4px;
}
.info-banner--warn {
  background: var(--dm-tint-amber, #fff7ed);
  border: 1px solid var(--dm-bd-amber, #fed7aa);
  color: var(--dm-on-amber, #9a3412);
}
.info-banner--info {
  background: var(--dm-tint-blue, #eff6ff);
  border: 1px solid var(--dm-bd-blue, #bfdbfe);
  color: var(--dm-accent, #1e40af);
}
.info-banner--neutral {
  background: var(--dm-surface2, #f8fafc);
  border: 1px solid var(--dm-border, #e2e8f0);
  color: var(--dm-muted, #64748b);
}

/* ── Note input ───────────────────────────────────────── */
.note-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 10px;
}

.note-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--dm-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.note-input {
  width: 100%;
  border: 1px solid var(--dm-border, #e2e8f0);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 11px;
  color: var(--dm-cell, #334155);
  background: var(--dm-surface2, #f8fafc);
  outline: none;
  transition: border-color 0.15s, background 0.15s;
  box-sizing: border-box;
}
.note-input::placeholder { color: var(--dm-faint, #94a3b8); font-style: italic; }
.note-input:focus {
  border-color: var(--dm-bd-blue, #a78bfa);
  background: var(--dm-surface, white);
}

/* ── Error ────────────────────────────────────────────── */
.error-msg {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--dm-on-red, #dc2626);
  margin-top: 8px;
}

/* ── Buttons ──────────────────────────────────────────── */
.btn-cancel {
  flex: 1;
  height: 36px;
  border: 1px solid var(--dm-border, #e2e8f0);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--dm-muted, #64748b);
  background: var(--dm-surface, white);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-cancel:hover:not(:disabled) { background: var(--dm-surface2, #f8fafc); border-color: #94a3b8; }
.btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-revert {
  display: inline-flex; align-items: center; gap: 6px; margin-top: 8px;
  padding: 5px 10px; font-size: 11px; font-weight: 600; border-radius: 6px;
  border: 1px solid #f59e0b; background: var(--dm-tint-amber, #fffbeb); color: var(--dm-on-amber, #b45309); cursor: pointer;
}
.btn-revert:hover:not(:disabled) { background: var(--dm-tint-amber, #fef3c7); }
.btn-revert:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-submit {
  flex: 2;
  height: 36px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: #7c3aed;
}
.btn-submit:hover:not(:disabled) { background: #6d28d9; }
.btn-submit--reject { background: #dc2626 !important; }
.btn-submit--reject:hover:not(:disabled) { background: #b91c1c !important; }
.btn-submit--add { background: #059669 !important; }
.btn-submit--add:hover:not(:disabled) { background: #047857 !important; }
.btn-submit:disabled,
.btn-submit--disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Transitions ──────────────────────────────────────── */
.modal-enter-active { transition: opacity 0.15s ease; }
.modal-leave-active { transition: opacity 0.12s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-active .modal-card { transition: transform 0.15s ease; }
.modal-leave-active .modal-card { transition: transform 0.12s ease; }
.modal-enter-from .modal-card,
.modal-leave-to .modal-card { transform: scale(0.95) translateY(-8px); }

.delta-fade-enter-active,
.delta-fade-leave-active { transition: all 0.15s ease; }
.delta-fade-enter-from,
.delta-fade-leave-to { opacity: 0; transform: scale(0.8); }

.err-fade-enter-active,
.err-fade-leave-active { transition: opacity 0.15s ease; }
.err-fade-enter-from,
.err-fade-leave-to { opacity: 0; }

/* ── Last adjustment log ──────────────────────────────── */
.last-adj-box {
  background: var(--dm-tint-teal, #ecfeff);
  border: 1px solid var(--dm-bd-green, #a5f3fc);
  border-radius: 8px;
  padding: 8px 10px;
  margin-top: 8px;
  margin-bottom: 2px;
}

.last-adj-header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9.5px;
  font-weight: 700;
  color: var(--dm-on-teal, #0891b2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 5px;
}

.last-adj-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.last-adj-row {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 11px;
  color: var(--dm-on-teal, #164e63);
  line-height: 1.4;
}
/* ── Varian header/tombol biru utk initial stock ─────────── */
.modal-header--stock { background: linear-gradient(135deg, #0284c7, #0369a1); }
.btn-submit--stock { background: #0284c7; }
.btn-submit--stock:hover:not(:disabled) { background: #0369a1; }
.ctx-chip--lock { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #92400e); border-color: var(--dm-bd-amber, #fde68a); }
</style>
