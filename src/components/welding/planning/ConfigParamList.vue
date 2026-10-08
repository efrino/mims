<template>
  <!-- ConfigParamList.vue -->
  <!-- Daftar parameter config yang bisa diedit, dengan type-aware input & validasi -->
  <div class="cpl-root">

    <div
      v-for="cfg in configs"
      :key="cfg.config_key"
      class="cpl-row"
      :class="{
        'cpl-row--changed': isDirty(cfg),
        'cpl-row--error':   errorMap[cfg.config_key],
      }"
    >
      <!-- Label & description -->
      <div class="cpl-info">
        <div class="cpl-label">
          {{ cfg.label || cfg.config_key }}
          <span v-if="cfg.unit" class="cpl-unit">{{ cfg.unit }}</span>
          <span v-if="isDirty(cfg)" class="cpl-dirty-dot" title="Nilai diubah belum disimpan" />
        </div>
        <div v-if="cfg.description" class="cpl-desc">{{ cfg.description }}</div>
        <div v-if="errorMap[cfg.config_key]" class="cpl-error-msg">
          <i class="ti ti-alert-circle" /> {{ errorMap[cfg.config_key] }}
        </div>
        <!-- Hint range -->
        <div v-if="cfg.min_value !== null || cfg.max_value !== null" class="cpl-range-hint">
          <i class="ti ti-arrows-horizontal" />
          Rentang:
          {{ cfg.min_value !== null ? cfg.min_value : '∞' }}
          —
          {{ cfg.max_value !== null ? cfg.max_value : '∞' }}
        </div>
      </div>

      <!-- Input area -->
      <div class="cpl-controls">

        <!-- Dropdown: key dengan pilihan tetap (SELECT_OPTIONS) -->
        <select
          v-if="SELECT_OPTIONS[cfg.config_key]"
          class="cpl-select"
          :value="editBuffer[cfg.config_key]"
          @change="onChange(cfg, ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="o in SELECT_OPTIONS[cfg.config_key]" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>

        <!-- Time input: jam shift -->
        <input
          v-else-if="cfg.data_type === 'string' && (cfg.config_key.endsWith('_start') || cfg.config_key.endsWith('_end'))"
          type="time"
          class="cpl-input cpl-input--time"
          :value="editBuffer[cfg.config_key]"
          @input="onChange(cfg, ($event.target as HTMLInputElement).value)"
        />

        <!-- Number input: integer -->
        <div v-else-if="cfg.data_type === 'integer'" class="cpl-number-wrap">
          <button class="cpl-stepper" @click="step(cfg, -1)" :disabled="atMin(cfg)">−</button>
          <input
            type="number"
            class="cpl-input cpl-input--number"
            :value="editBuffer[cfg.config_key]"
            :min="cfg.min_value ?? undefined"
            :max="cfg.max_value ?? undefined"
            step="1"
            @input="onChange(cfg, ($event.target as HTMLInputElement).value)"
          />
          <button class="cpl-stepper" @click="step(cfg, +1)" :disabled="atMax(cfg)">+</button>
        </div>

        <!-- Number input: decimal -->
        <div v-else-if="cfg.data_type === 'decimal'" class="cpl-number-wrap">
          <button class="cpl-stepper" @click="step(cfg, -getStep(cfg))" :disabled="atMin(cfg)">−</button>
          <input
            type="number"
            class="cpl-input cpl-input--number"
            :value="editBuffer[cfg.config_key]"
            :min="cfg.min_value ?? undefined"
            :max="cfg.max_value ?? undefined"
            :step="getStep(cfg)"
            @input="onChange(cfg, ($event.target as HTMLInputElement).value)"
          />
          <button class="cpl-stepper" @click="step(cfg, +getStep(cfg))" :disabled="atMax(cfg)">+</button>
        </div>

        <!-- Text fallback -->
        <input
          v-else
          type="text"
          class="cpl-input"
          :value="editBuffer[cfg.config_key]"
          @input="onChange(cfg, ($event.target as HTMLInputElement).value)"
        />

        <!-- Nilai asli (DB) sebagai tooltip -->
        <div v-if="isDirty(cfg)" class="cpl-original">
          <i class="ti ti-clock-rewind" />
          DB: <code>{{ cfg.config_value }}</code>
          <button class="cpl-revert" @click="revert(cfg)" title="Kembalikan ke nilai DB">
            <i class="ti ti-rotate-clockwise" />
          </button>
        </div>

        <!-- Quick save satu field -->
        <button
          v-if="isDirty(cfg)"
          class="cpl-save-one"
          :disabled="saving"
          @click="$emit('save-one', cfg.config_key, editBuffer[cfg.config_key])"
        >
          <i class="ti ti-device-floppy" />
          Simpan
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { ConfigItem } from '@/composables/usePlanningConfig'

// Key config dengan pilihan tetap → dropdown (selain itu input sesuai data_type).
const SELECT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  // Saklar asisten AI (MAJA) — dibaca M_part_agent::allowed().
  ai_mode: [
    { value: 'off',   label: 'OFF — MAJA mati untuk semua user' },
    { value: 'pilot', label: 'PILOT — hanya user di daftar pilot' },
    { value: 'all',   label: 'ALL — semua user dengan akses Master Data' },
  ],
  pcs_day_divisor_mode: [
    { value: 'mdfo_positive_days', label: 'Hari MDFO Positif (rekomendasi)' },
    { value: 'all_workdays',       label: 'Semua Hari Kerja' },
  ],
  dn_mode: [
    { value: 'shift',    label: 'Shift (DN dibagi day / night)' },
    { value: 'day_only', label: 'Day saja (semua DN masuk day)' },
  ],
  dn_early_morning: [
    { value: 'prev_night', label: 'Night tanggal sebelumnya (ikut shift produksi)' },
    { value: 'same_night', label: 'Night tanggal yang sama' },
  ],
  achievement_source_default: [
    { value: 'v1',   label: 'v1 — achievement lama' },
    { value: 'v2',   label: 'v2 — achievement baru (area)' },
    { value: 'both', label: 'both — gabungan v1 + v2' },
  ],
  strength_std_source: [
    { value: 'master', label: 'Master Strength Standard per part (rekomendasi)' },
    { value: 'global', label: 'Global (level_stock_* sama semua part)' },
  ],
  glc_w_dasar_pcs_hari: [
    { value: 'PABRIK',   label: 'Hari kerja pabrik' },
    { value: 'CUSTOMER', label: 'Hari kerja customer' },
  ],
  glc_w_pakai_tandem:     [{ value: '1', label: 'Ya' }, { value: '0', label: 'Tidak' }],
  glc_w_pakai_stock_ifpd: [{ value: '1', label: 'Ya' }, { value: '0', label: 'Tidak' }],
  planning_mode: [
    { value: 'v1', label: 'v1 — Heijunka (step 7 lama)' },
    { value: 'v2', label: 'v2 — Primary / Secondary' },
  ],
}

// ─── Props ────────────────────────────────────────────────────────────────────

const props = defineProps<{
  configs:    ConfigItem[]
  editBuffer: Record<string, string>
  saving?:    boolean
}>()

const emit = defineEmits<{
  'update:buffer': [key: string, value: string]
  'save-one':      [key: string, value: string]
}>()

// ─── Validation error map ─────────────────────────────────────────────────────

const errorMap = reactive<Record<string, string>>({})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isDirty(cfg: ConfigItem): boolean {
  return props.editBuffer[cfg.config_key] !== undefined &&
         props.editBuffer[cfg.config_key] !== cfg.config_value
}

function getStep(cfg: ConfigItem): number {
  if (cfg.data_type !== 'decimal') return 1
  // Infer precision from min/max or current value
  const val = cfg.config_value
  if (val.includes('.')) {
    const decimals = val.split('.')[1].length
    return decimals >= 2 ? 0.01 : 0.1
  }
  return 0.1
}

function atMin(cfg: ConfigItem): boolean {
  if (cfg.min_value === null) return false
  return parseFloat(props.editBuffer[cfg.config_key] ?? cfg.config_value) <= cfg.min_value
}

function atMax(cfg: ConfigItem): boolean {
  if (cfg.max_value === null) return false
  return parseFloat(props.editBuffer[cfg.config_key] ?? cfg.config_value) >= cfg.max_value
}

function validate(cfg: ConfigItem, raw: string): string | null {
  if (cfg.data_type === 'integer' || cfg.data_type === 'decimal') {
    const num = parseFloat(raw)
    if (isNaN(num)) return 'Nilai harus angka.'
    if (cfg.min_value !== null && num < cfg.min_value)
      return `Minimum: ${cfg.min_value}`
    if (cfg.max_value !== null && num > cfg.max_value)
      return `Maksimum: ${cfg.max_value}`
  }
  return null
}

function onChange(cfg: ConfigItem, raw: string) {
  const err = validate(cfg, raw)
  if (err) {
    errorMap[cfg.config_key] = err
  } else {
    delete errorMap[cfg.config_key]
  }
  emit('update:buffer', cfg.config_key, raw)
}

function step(cfg: ConfigItem, delta: number) {
  const current = parseFloat(props.editBuffer[cfg.config_key] ?? cfg.config_value) || 0
  const newVal  = Math.round((current + delta) * 10000) / 10000
  onChange(cfg, String(newVal))
}

function revert(cfg: ConfigItem) {
  delete errorMap[cfg.config_key]
  emit('update:buffer', cfg.config_key, cfg.config_value)
}
</script>

<style scoped>
.cpl-root {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Row ─────────────────────────────────────────────────────────────────────── */
.cpl-row {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.75rem 0;
  box-shadow: 0 -0.5px 0 var(--color-border-tertiary, #e5e7eb);
  transition: background 0.12s;
}
.cpl-row:first-child { box-shadow: none; }
.cpl-row:hover { background: var(--color-background-secondary, #f9fafb); border-radius: 6px; }
.cpl-row--changed { background: #fffbeb; border-radius: 6px; }
.cpl-row--error   { background: #fef2f2; border-radius: 6px; }

/* ── Info column ─────────────────────────────────────────────────────────────── */
.cpl-info {
  flex: 1;
  min-width: 0;
}

.cpl-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary, #111827);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.cpl-unit {
  font-size: 10px;
  background: var(--color-background-tertiary, #f3f4f6);
  color: var(--color-text-secondary, #6b7280);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 400;
}

.cpl-dirty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f59e0b;
  flex-shrink: 0;
}

.cpl-desc {
  font-size: 11px;
  color: var(--color-text-secondary, #6b7280);
  line-height: 1.5;
  margin-top: 2px;
}

.cpl-range-hint {
  font-size: 10px;
  color: var(--color-text-tertiary, #9ca3af);
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.cpl-error-msg {
  font-size: 11px;
  color: #dc2626;
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ── Controls column ─────────────────────────────────────────────────────────── */
.cpl-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  flex-shrink: 0;
  min-width: 200px;
}

.cpl-input {
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--color-background-primary, #fff);
  color: var(--color-text-primary, #111827);
  box-shadow: 0 0 0 1px var(--color-border-secondary, #d1d5db);
  outline: none;
  transition: box-shadow 0.15s;
  width: 100%;
}
.cpl-input:focus { box-shadow: 0 0 0 2px #3b82f6; }
.cpl-row--changed .cpl-input { box-shadow: 0 0 0 1.5px #f59e0b; background: #fffbeb; }
.cpl-row--error .cpl-input   { box-shadow: 0 0 0 1.5px #ef4444; background: #fef2f2; }

.cpl-input--number { text-align: right; width: 80px; }
.cpl-input--time   { width: 120px; }

.cpl-select {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--color-background-primary, #fff);
  color: var(--color-text-primary, #111827);
  box-shadow: 0 0 0 1px var(--color-border-secondary, #d1d5db);
  outline: none;
  cursor: pointer;
  width: 100%;
}

/* ── Number stepper ──────────────────────────────────────────────────────────── */
.cpl-number-wrap {
  display: flex;
  align-items: center;
  gap: 0;
}

.cpl-stepper {
  width: 28px;
  height: 32px;
  font-size: 14px;
  font-weight: 600;
  background: var(--color-background-tertiary, #f3f4f6);
  color: var(--color-text-secondary, #6b7280);
  box-shadow: 0 0 0 1px var(--color-border-secondary, #d1d5db);
  border-radius: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s;
  border: none;
}
.cpl-stepper:first-child { border-radius: 6px 0 0 6px; }
.cpl-stepper:last-child  { border-radius: 0 6px 6px 0; }
.cpl-stepper:hover:not(:disabled) { background: var(--color-background-secondary, #f9fafb); color: var(--color-text-primary, #111827); }
.cpl-stepper:disabled { opacity: 0.35; cursor: not-allowed; }

.cpl-number-wrap .cpl-input--number {
  border-radius: 0;
  box-shadow: 0 -1px 0 var(--color-border-secondary, #d1d5db),
              0  1px 0 var(--color-border-secondary, #d1d5db);
}

/* ── Original value & revert ─────────────────────────────────────────────────── */
.cpl-original {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--color-text-tertiary, #9ca3af);
}
.cpl-original code {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  background: var(--color-background-tertiary, #f3f4f6);
  padding: 0 4px;
  border-radius: 3px;
}

.cpl-revert {
  font-size: 11px;
  color: var(--color-text-tertiary, #9ca3af);
  background: none;
  border: none;
  cursor: pointer;
  padding: 1px 3px;
  border-radius: 4px;
  transition: color 0.12s;
}
.cpl-revert:hover { color: var(--color-text-primary, #111827); }

/* ── Quick save ──────────────────────────────────────────────────────────────── */
.cpl-save-one {
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 5px;
  background: #111827;
  color: #fff;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}
.cpl-save-one:hover:not(:disabled) { opacity: 0.82; }
.cpl-save-one:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
