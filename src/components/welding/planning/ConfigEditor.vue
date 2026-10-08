<template>
  <!-- ConfigEditor.vue -->
  <!-- Editor satu kategori parameter planning -->
  <div class="config-editor">

    <!-- Header kategori -->
    <div class="cat-header">
      <div class="cat-title">
        <i :class="`ti ti-${group.meta.icon}`" aria-hidden="true" />
        <span>{{ group.meta.title }}</span>
      </div>
      <span class="cat-badge">{{ group.configs.length }} parameter</span>
    </div>

    <!-- Daftar parameter -->
    <div class="config-list">
      <div
        v-for="cfg in group.configs"
        :key="cfg.config_key"
        class="config-row"
        :class="{ 'is-changed': isChanged(cfg) }"
      >
        <!-- Label + deskripsi -->
        <div class="config-info">
          <div class="config-label">
            {{ cfg.label }}
            <span v-if="cfg.unit" class="unit-badge">{{ cfg.unit }}</span>
          </div>
          <div v-if="cfg.description" class="config-desc">
            {{ cfg.description }}
          </div>
          <div class="config-meta">
            <span class="config-key">{{ cfg.config_key }}</span>
            <span v-if="cfg.min_value !== null || cfg.max_value !== null" class="range-hint">
              {{ cfg.min_value !== null ? `min: ${cfg.min_value}` : '' }}
              {{ cfg.max_value !== null ? `max: ${cfg.max_value}` : '' }}
            </span>
          </div>
        </div>

        <!-- Input -->
        <div class="config-input-wrap">
          <!-- Formula / string: dropdown atau text -->
          <template v-if="cfg.data_type === 'formula' || cfg.data_type === 'string'">
            <select
              v-if="getOptions(cfg.config_key).length"
              :value="localValues[cfg.config_key]"
              class="config-select"
              @change="onInput(cfg, ($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="opt in getOptions(cfg.config_key)"
                :key="opt.value"
                :value="opt.value"
              >{{ opt.label }}</option>
            </select>
            <input
              v-else
              type="text"
              :value="localValues[cfg.config_key]"
              class="config-input"
              @input="onInput(cfg, ($event.target as HTMLInputElement).value)"
            />
          </template>

          <!-- Integer: number input dengan step 1 -->
          <template v-else-if="cfg.data_type === 'integer'">
            <input
              type="number"
              step="1"
              :min="cfg.min_value ?? undefined"
              :max="cfg.max_value ?? undefined"
              :value="localValues[cfg.config_key]"
              class="config-input config-input--number"
              @input="onInput(cfg, ($event.target as HTMLInputElement).value)"
            />
          </template>

          <!-- Decimal: number input dengan step desimal -->
          <template v-else-if="cfg.data_type === 'decimal'">
            <input
              type="number"
              step="0.01"
              :min="cfg.min_value ?? undefined"
              :max="cfg.max_value ?? undefined"
              :value="localValues[cfg.config_key]"
              class="config-input config-input--number"
              @input="onInput(cfg, ($event.target as HTMLInputElement).value)"
            />
          </template>

          <!-- Indikator perubahan -->
          <span v-if="isChanged(cfg)" class="change-dot" title="Belum disimpan" />
        </div>

        <!-- Nilai lama + tombol revert -->
        <div v-if="isChanged(cfg)" class="config-revert">
          <span class="old-value">
            <i class="ti ti-arrow-back-up" aria-hidden="true" />
            Sebelum: <strong>{{ cfg.config_value }}</strong>
          </span>
          <button class="btn-revert" @click="revert(cfg)">Batalkan</button>
        </div>
      </div>
    </div>

    <!-- Preview formula (khusus kategori tertentu) -->
    <div v-if="showPreview" class="preview-box">
      <div class="preview-title">
        <i class="ti ti-eye" aria-hidden="true" />
        Preview Simulasi
      </div>
      <slot name="preview" />
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { ConfigGroup, ConfigItem } from '@/composables/usePlanningConfig'

// ─── Props ────────────────────────────────────────────────────────────────────

const props = defineProps<{
  group: ConfigGroup
  modelValue: Record<string, string>   // editBuffer dari composable
  showPreview?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: Record<string, string>): void
  (e: 'change', key: string, value: string): void
}>()

// ─── Local buffer (reactive copy) ─────────────────────────────────────────────

const localValues = reactive<Record<string, string>>({})

// Sinkronisasi saat prop berubah
watch(
  () => props.modelValue,
  (newVal) => {
    for (const cfg of props.group.configs) {
      if (newVal[cfg.config_key] !== undefined) {
        localValues[cfg.config_key] = newVal[cfg.config_key]
      }
    }
  },
  { immediate: true, deep: true }
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isChanged(cfg: ConfigItem): boolean {
  return localValues[cfg.config_key] !== cfg.config_value
}

function onInput(cfg: ConfigItem, value: string) {
  localValues[cfg.config_key] = value
  // Propagate ke parent (editBuffer)
  emit('update:modelValue', { ...props.modelValue, [cfg.config_key]: value })
  emit('change', cfg.config_key, value)
}

function revert(cfg: ConfigItem) {
  localValues[cfg.config_key] = cfg.config_value
  emit('update:modelValue', { ...props.modelValue, [cfg.config_key]: cfg.config_value })
}

// Opsi dropdown untuk config bertipe formula/string dengan pilihan terbatas
const FORMULA_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  pcs_day_divisor_mode: [
    { value: 'mdfo_positive_days', label: 'Rata-rata hari MDFO > 0' },
    { value: 'all_workdays',       label: 'Rata-rata semua hari kerja' },
  ],
  planning_fix_trigger: [
    { value: 'dn_exists', label: 'DN SAP sudah masuk → otomatis FIX' },
  ],
  planning_tentative_source: [
    { value: 'mdfo', label: 'MDFO (forecast)' },
  ],
  shift_saturday_has_night: [
    { value: '0', label: 'Tidak (Sabtu hanya Day)' },
    { value: '1', label: 'Ya (Sabtu Day + Night)' },
  ],
  shift_sunday_has_day: [
    { value: '0', label: 'Tidak (Minggu hanya Night)' },
    { value: '1', label: 'Ya (Minggu Day + Night)' },
  ],
}

function getOptions(key: string) {
  return FORMULA_OPTIONS[key] ?? []
}
</script>

<style scoped>
.config-editor {
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.cat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.25rem;
  background: var(--color-background-secondary);
  border-bottom: 0.5px solid var(--color-border-tertiary);
}

.cat-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  font-size: 14px;
  color: var(--color-text-primary);
}

.cat-title i { font-size: 16px; color: var(--color-text-secondary); }

.cat-badge {
  font-size: 11px;
  background: var(--color-background-tertiary);
  color: var(--color-text-secondary);
  padding: 2px 8px;
  border-radius: 10px;
}

.config-list {
  padding: 0;
}

.config-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px 16px;
  padding: 1rem 1.25rem;
  border-bottom: 0.5px solid var(--color-border-tertiary);
  transition: background 0.15s;
  align-items: start;
}
.config-row:last-child { border-bottom: none; }
.config-row:hover { background: var(--color-background-secondary); }
.config-row.is-changed { background: var(--color-background-warning); }

.config-info { min-width: 0; }

.config-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.unit-badge {
  font-size: 10px;
  font-weight: 400;
  background: var(--color-background-info);
  color: var(--color-text-info);
  padding: 1px 7px;
  border-radius: 8px;
}

.config-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-top: 3px;
}

.config-meta {
  display: flex;
  gap: 10px;
  margin-top: 5px;
  flex-wrap: wrap;
}

.config-key {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
  background: var(--color-background-tertiary);
  padding: 1px 6px;
  border-radius: 4px;
}

.range-hint {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.config-input-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 180px;
}

.config-input,
.config-select {
  width: 180px;
  font-size: 13px;
  padding: 6px 10px;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  transition: border-color 0.15s;
}

.config-input:focus,
.config-select:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.config-input--number { width: 120px; text-align: right; }

.change-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-background-warning);
  border: 2px solid var(--color-text-warning);
  flex-shrink: 0;
}

/* Revert row */
.config-revert {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: -8px;
  padding-top: 0;
}

.old-value {
  font-size: 12px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 5px;
}

.old-value strong {
  font-family: var(--font-mono);
  color: var(--color-text-primary);
}

.btn-revert {
  font-size: 11px;
  padding: 3px 10px;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-revert:hover {
  background: var(--color-background-secondary);
  color: var(--color-text-primary);
}

/* Preview box */
.preview-box {
  margin: 0 1.25rem 1.25rem;
  padding: 0.875rem;
  background: var(--color-background-secondary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md);
}

.preview-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 0.75rem;
}
</style>
