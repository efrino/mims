<template>
  <!-- StrengthPreview.vue -->
  <!-- Preview live rumus strength min/max jam berdasarkan parameter saat ini -->
  <div class="strength-preview">
    <div v-if="loading" class="sp-loading">
      <i class="ti ti-loader-2 spin" aria-hidden="true" /> Menghitung...
    </div>

    <template v-else-if="result">
      <div class="sp-grid">
        <!-- Shift Day -->
        <div class="sp-card">
          <div class="sp-shift-label">Shift Day</div>
          <div class="sp-formula">
            {{ result.shift_day.normal_hours }} jam normal + {{ params_local.overtime }} jam lembur
          </div>
          <div class="sp-row">
            <span>Minimum</span>
            <strong>{{ result.shift_day.min_hours }} jam</strong>
          </div>
          <div class="sp-row sp-row--accent">
            <span>Maksimum</span>
            <strong>{{ result.shift_day.max_hours }} jam</strong>
          </div>
          <div class="sp-formula-detail">
            min = {{ result.shift_day.rumus_min }}<br/>
            max = {{ result.shift_day.rumus_max }}
          </div>
        </div>

        <!-- Shift Night -->
        <div class="sp-card">
          <div class="sp-shift-label">Shift Night</div>
          <div class="sp-formula">
            {{ result.shift_night.normal_hours }} jam normal + {{ params_local.overtime }} jam lembur
          </div>
          <div class="sp-row">
            <span>Minimum</span>
            <strong>{{ result.shift_night.min_hours }} jam</strong>
          </div>
          <div class="sp-row sp-row--accent">
            <span>Maksimum</span>
            <strong>{{ result.shift_night.max_hours }} jam</strong>
          </div>
          <div class="sp-formula-detail">
            min = {{ result.shift_night.rumus_min }}<br/>
            max = {{ result.shift_night.rumus_max }}
          </div>
        </div>
      </div>

      <!-- Efisiensi indikator -->
      <div class="eff-bar-wrap">
        <span class="eff-label">Efisiensi mesin</span>
        <div class="eff-bar">
          <div
            class="eff-fill"
            :style="{ width: (parseFloat(params_local.efficiency) * 100) + '%' }"
          />
        </div>
        <span class="eff-pct">{{ Math.round(parseFloat(params_local.efficiency) * 100) }}%</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  params: Record<string, string>
  previewFn: (params: Record<string, string | number>) => Promise<any>
}>()

const result  = ref<any>(null)
const loading = ref(false)

const params_local = computed(() => ({
  shift1:     props.params['strength_shift1_hours']        ?? '8.0',
  shift2:     props.params['strength_shift2_hours']        ?? '8.0',
  overtime:   props.params['strength_shift1_ot_max_hours'] ?? '3.75',
  efficiency: props.params['strength_efficiency_rate']     ?? '0.85',
}))

let debounceTimer: ReturnType<typeof setTimeout>

watch(
  params_local,
  async () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      loading.value = true
      result.value = await props.previewFn({
        strength_shift1_hours:        params_local.value.shift1,
        strength_shift2_hours:        params_local.value.shift2,
        strength_shift1_ot_max_hours: params_local.value.overtime,
        strength_efficiency_rate:     params_local.value.efficiency,
      })
      loading.value = false
    }, 400)
  },
  { immediate: true, deep: true }
)
</script>

<style scoped>
.strength-preview { font-size: 12px; }

.sp-loading {
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.sp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.sp-card {
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md);
  padding: 0.75rem;
}

.sp-shift-label {
  font-weight: 500;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.sp-formula {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-bottom: 6px;
}

.sp-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  color: var(--color-text-secondary);
  border-bottom: 0.5px solid var(--color-border-tertiary);
}

.sp-row strong { color: var(--color-text-primary); }

.sp-row--accent strong {
  color: var(--color-text-info);
}

.sp-formula-detail {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
  margin-top: 6px;
  line-height: 1.6;
}

.eff-bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.eff-label { font-size: 11px; color: var(--color-text-secondary); min-width: 80px; }

.eff-bar {
  flex: 1;
  height: 6px;
  background: var(--color-border-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.eff-fill {
  height: 100%;
  background: var(--color-text-success);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.eff-pct {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-success);
  min-width: 32px;
  text-align: right;
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 1s linear infinite; }
</style>
