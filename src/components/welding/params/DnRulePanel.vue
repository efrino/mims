<!-- components/welding/params/DnRulePanel.vue
     Tab "Aturan DN" di PCD › Auto › Params Mutasi (2026-09-25; dulu modal di halaman
     Mutasi). Parameter pembagian DN ke shift, dibaca step 3 pipeline:
       global (planning_config dn_rule)
         dn_mode           shift | day_only
         dn_day_start/end  jam kirim yang masuk shift day (end inklusif s/d :59)
         dn_early_morning  kiriman dini hari → night tanggal sebelumnya | tanggal sama
       per customer (ms_dn_rule_customer) — lihat DnCustomerRules.vue
     Perubahan berlaku pada refresh berikutnya (cron 15 menit) atau lewat tombol
     "Terapkan sekarang" (refresh semua area). -->
<template>
  <div class="dnp">
    <section class="card">
      <div class="card-head">
        <p class="card-title"><i class="mdi mdi-earth"></i> Aturan global</p>
        <p class="card-sub">Berlaku untuk semua customer yang tidak punya aturan khusus.</p>
      </div>

      <div v-if="loading" class="state"><i class="mdi mdi-loading mdi-spin"></i> Memuat parameter...</div>
      <template v-else>
        <div class="rule-summary">
          <i class="mdi mdi-information-outline"></i>
          <span>{{ summary }}</span>
        </div>

        <ConfigParamList
          v-if="dnConfigs.length"
          :configs="dnConfigs"
          :edit-buffer="editBuffer"
          :saving="saving"
          @update:buffer="(k, v) => (editBuffer[k] = v)"
          @save-one="(k, v) => saveOne(k, v)"
        />
        <p v-else class="state">Parameter Aturan DN belum ada di planning_config.</p>

        <p v-if="error" class="msg msg--err"><i class="mdi mdi-alert-circle-outline"></i> {{ error }}</p>
        <p v-else-if="saveMsg" class="msg msg--ok"><i class="mdi mdi-check-circle-outline"></i> {{ saveMsg }}</p>

        <div class="btns">
          <button class="btn-apply" :disabled="saving || applying || dirty" :title="dirty ? 'Simpan perubahan dulu' : 'Hitung ulang DN & plan semua area dengan aturan sekarang (±2 menit)'" @click="emit('apply')">
            <i class="mdi" :class="applying ? 'mdi-loading mdi-spin' : 'mdi-refresh'"></i> Terapkan sekarang
          </button>
          <button class="btn-submit" :disabled="saving || !dirty" @click="saveAll">
            <i class="mdi" :class="saving ? 'mdi-loading mdi-spin' : 'mdi-content-save-outline'"></i> Simpan aturan global
          </button>
        </div>
        <p class="hint">Tersimpan = berlaku pada refresh berikutnya (cron 15 menit) atau klik "Terapkan sekarang".</p>
      </template>
    </section>

    <section class="card">
      <DnCustomerRules :global="globalRules" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import ConfigParamList from '@/components/welding/planning/ConfigParamList.vue'
import DnCustomerRules from './DnCustomerRules.vue'
import { usePlanningConfig } from '@/composables/usePlanningConfig'

defineProps<{ applying?: boolean }>()
const emit = defineEmits<{ apply: [] }>()

const { configGroups, editBuffer, loading, saving, error, saveMsg, fetchConfig, saveOne, saveAll } = usePlanningConfig()

const ORDER = ['dn_mode', 'dn_day_start', 'dn_day_end', 'dn_early_morning']
const dnConfigs = computed(() =>
  (configGroups.value.find(g => g.category === 'dn_rule')?.configs ?? [])
    .slice().sort((a, b) => ORDER.indexOf(a.config_key) - ORDER.indexOf(b.config_key)))
// Aturan global TERSIMPAN (bukan buffer edit) — acuan label "ikut global" di aturan per customer.
const globalRules = computed(() => {
  const saved = (k: string, d: string) => dnConfigs.value.find(c => c.config_key === k)?.config_value ?? d
  return { mode: saved('dn_mode', 'shift'), start: saved('dn_day_start', '07:00'), end: saved('dn_day_end', '18:00'), early: saved('dn_early_morning', 'prev_night') }
})
const dirty = computed(() => dnConfigs.value.some(c => editBuffer.value[c.config_key] !== c.config_value))

// Ringkasan aturan (dari nilai yang sedang diedit) — supaya planner langsung paham efeknya.
const summary = computed(() => {
  const v = (k: string, d: string) => editBuffer.value[k] ?? d
  if (v('dn_mode', 'shift') === 'day_only') {
    return 'Semua DN masuk shift day di tanggal kalendernya; kiriman lewat jam 12 malam otomatis ikut hari berikutnya.'
  }
  const start = v('dn_day_start', '07:00'), end = v('dn_day_end', '18:00')
  const early = v('dn_early_morning', 'prev_night') === 'prev_night' ? 'night tanggal sebelumnya' : 'night tanggal yang sama'
  return `Day = ${start}–${end}; night = di luar itu. Kiriman 00:00 s/d sebelum ${start} masuk ${early}.`
})

onMounted(fetchConfig)
</script>

<style scoped>
.dnp { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 14px; align-items: start; }
.card { background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; box-shadow: 0 1px 3px rgba(15,23,42,.05); }
.card :deep(.dcr) { margin-top: 0; padding-top: 0; border-top: none; }
.card-head { margin-bottom: 10px; }
.card-title { font-size: 13px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 6px; }
.card-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.state { font-size: 12px; color: #64748b; padding: 16px 0; text-align: center; }
.rule-summary { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; margin-bottom: 12px; border-radius: 10px; background: #f0f9ff; border: 1px solid #bae6fd; color: #075985; font-size: 12px; line-height: 1.5; }
.msg { margin-top: 10px; font-size: 11.5px; display: flex; gap: 5px; align-items: center; }
.msg--err { color: #dc2626; }
.msg--ok { color: #047857; }
.btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.hint { margin-top: 8px; font-size: 10.5px; color: #94a3b8; text-align: right; }
.btn-apply { height: 34px; padding: 0 14px; border: 1px solid #0284c7; border-radius: 8px; font-size: 12px; font-weight: 600; color: #0369a1; background: #f0f9ff; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
.btn-submit { height: 34px; padding: 0 16px; border-radius: 8px; font-size: 12px; font-weight: 700; color: white; background: #0284c7; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
.btn-submit:hover:not(:disabled) { background: #0369a1; }
.btn-submit:disabled, .btn-apply:disabled { opacity: .5; cursor: not-allowed; }
</style>
