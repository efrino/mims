<template>
  <Teleport to="body">
    <div v-if="visible" class="overlay" @click.self="$emit('close')">
      <div class="modal modal--md">
        <div class="modal__head">
          <div class="modal__title">
            {{ props.prefill ? 'Edit Struk' : 'Generate Struk Baru' }}
          </div>
          <button class="btn-close" @click="$emit('close')">✕</button>
        </div>

        <div class="form-grid">
          <div class="form-item">
            <label class="form-label">Tanggal</label>
            <input type="date" class="inp" v-model="form.trx_date" />
          </div>
          <div class="form-item">
            <label class="form-label">Shift</label>
            <select class="inp" v-model="form.shift">
              <option value="Day">Day (07:15 - 19:59)</option>
              <option value="Night">Night (20:00 - 07:14)</option>
            </select>
          </div>
          <div class="form-item">
            <label class="form-label">Area</label>
            <select class="inp" v-model="form.area_code">
              <option value="">-- Pilih Area --</option>
              <option v-for="a in areaList" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>
          <div class="form-item">
            <label class="form-label">Part Number FP</label>
            <input class="inp mono" placeholder="e.g. 61201-BZ011-00" v-model="form.fp_part_number" />
          </div>
          <div class="form-item form-item--full">
            <label class="form-label">Qty Plan (pcs)</label>
            <input type="number" class="inp" min="1" v-model.number="form.fp_qty_plan" />
          </div>
        </div>

        <div class="gen-error" v-if="error">{{ error }}</div>

        <div class="modal__foot">
          <button class="btn btn--primary" :disabled="loading" @click="submit">
            {{ loading ? 'Generating...' : props.prefill ? 'Simpan' : '+ Generate' }}
          </button>
          <button class="btn btn--ghost" @click="$emit('close')">Batal</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { WipGeneratePayload, WipTrxRow } from '@/types/Public/Welding/Wip';

const props = defineProps<{
  visible: boolean;
  areaList: string[];
  loading: boolean;
  error: string;
  prefill?: WipTrxRow | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: WipGeneratePayload): void;
}>();

const form = reactive<WipGeneratePayload>({
  trx_date: new Date().toISOString().slice(0, 10),
  shift: 'Day',
  area_code: '',
  fp_part_number: '',
  fp_qty_plan: 0
});

watch(
  () => props.visible,
  (v) => {
    if (!v) return;
    if (props.prefill) {
      // Edit mode — isi dari row existing
      form.trx_date = props.prefill.trx_date;
      form.shift = props.prefill.shift;
      form.area_code = props.prefill.area_code;
      form.fp_part_number = props.prefill.fp_part_number;
      form.fp_qty_plan = props.prefill.fp_qty_plan;
    } else {
      // Create mode — reset
      form.trx_date = new Date().toISOString().slice(0, 10);
      form.shift = 'Day';
      form.area_code = '';
      form.fp_part_number = '';
      form.fp_qty_plan = 0;
    }
  }
);

function submit() {
  emit('submit', { ...form });
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  padding: 40px 20px;
  overflow-y: auto;
}
.modal {
  background: var(--wip-bg2, #fff);
  border: 1px solid var(--wip-border, #e2e8f0);
  border-radius: 12px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
}
.modal--md {
  max-width: 520px;
}
.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--wip-border, #e2e8f0);
  background: var(--wip-bg3, #f8fafc);
  border-radius: 12px 12px 0 0;
}
.modal__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--wip-text, #1a2744);
}
.modal__foot {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 22px;
  border-top: 1px solid var(--wip-border, #e2e8f0);
  background: var(--wip-bg3, #f8fafc);
  border-radius: 0 0 12px 12px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 22px;
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-item--full {
  grid-column: 1 / -1;
}
.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--wip-text, #1a2744);
}
.gen-error {
  margin: 0 22px 14px;
  color: #dc2626;
  font-size: 12.5px;
  background: #fff1f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 8px 12px;
}
.inp {
  background: #fff;
  border: 1px solid var(--wip-border, #e2e8f0);
  color: var(--wip-text, #1a2744);
  border-radius: 7px;
  padding: 9px 12px;
  font-family: inherit;
  font-size: 13.5px;
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.inp:focus {
  border-color: var(--wip-accent, #2e5396);
  box-shadow: 0 0 0 3px rgba(46, 83, 150, 0.12);
}
.mono {
  font-family: 'Fira Code', 'Consolas', monospace;
}
.btn {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  padding: 9px 18px;
  font-weight: 600;
  transition: all 0.15s;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn--primary {
  background: var(--wip-accent, #2e5396);
  color: #fff;
}
.btn--primary:hover:not(:disabled) {
  background: var(--wip-accent2, #1e3a72);
}
.btn--ghost {
  background: #fff;
  color: var(--wip-text, #1a2744);
  border: 1px solid var(--wip-border, #e2e8f0);
}
.btn--ghost:hover {
  background: var(--wip-bg3, #f8fafc);
}
.btn-close {
  background: none;
  border: none;
  color: var(--wip-muted, #6b7280);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.btn-close:hover {
  background: var(--wip-border, #e2e8f0);
}
</style>
