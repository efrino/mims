<!-- components/welding/params/PlanningParamsPanel.vue
     Editor grup planning_config (2026-09-25). Dipakai:
       · Params Mutasi › Parameter Planning — semua grup kecuali `exclude`
       · Params GLC Welding / GLC Press      — hanya `categories` (glc_welding / glc_press)
     Nilai dibaca backend pada proses berikutnya (pipeline / periode / simulasi baru). -->
<template>
  <div class="ppp">
    <div class="ppp-bar">
      <p class="ppp-note"><i class="mdi mdi-alert-outline"></i> {{ note }}</p>
      <div class="ppp-actions">
        <button v-if="isDirty" class="btn-ghost" :disabled="saving" @click="discardChanges">Batalkan perubahan</button>
        <button class="btn-submit" :disabled="saving || !isDirty" @click="saveAll">
          <i class="mdi" :class="saving ? 'mdi-loading mdi-spin' : 'mdi-content-save-outline'"></i> Simpan semua
        </button>
      </div>
    </div>
    <p v-if="error" class="msg msg--err"><i class="mdi mdi-alert-circle-outline"></i> {{ error }}</p>
    <p v-else-if="saveMsg" class="msg msg--ok"><i class="mdi mdi-check-circle-outline"></i> {{ saveMsg }}</p>

    <div v-if="loading" class="state"><i class="mdi mdi-loading mdi-spin"></i> Memuat parameter...</div>
    <div v-else class="ppp-grid">
      <section v-for="g in groups" :key="g.category" class="card">
        <p class="card-title"><i class="mdi mdi-tune-variant"></i> {{ g.meta.title }}</p>
        <ConfigParamList
          :configs="g.configs"
          :edit-buffer="editBuffer"
          :saving="saving"
          @update:buffer="(k, v) => (editBuffer[k] = v)"
          @save-one="(k, v) => saveOne(k, v)"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import ConfigParamList from '@/components/welding/planning/ConfigParamList.vue'
import { usePlanningConfig } from '@/composables/usePlanningConfig'

const { configGroups, editBuffer, loading, saving, error, saveMsg, isDirty, fetchConfig, saveOne, saveAll, discardChanges } = usePlanningConfig()

const props = withDefaults(defineProps<{
  categories?: string[]   // hanya grup ini (kosong = semua)
  exclude?: string[]      // kecuali grup ini
  note?: string
}>(), {
  categories: () => [],
  exclude: () => [],
  note: 'Parameter ini dipakai engine planning semua area — ubah hanya bila paham dampaknya.',
})

const groups = computed(() => configGroups.value.filter(g =>
  g.configs.length
  && (!props.categories.length || props.categories.includes(g.category))
  && !props.exclude.includes(g.category)))

onMounted(fetchConfig)
</script>

<style scoped>
.ppp-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.ppp-note { font-size: 11.5px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 6px 10px; display: flex; gap: 6px; align-items: center; }
.ppp-actions { display: flex; gap: 8px; }
.ppp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 14px; align-items: start; }
.card { background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; box-shadow: 0 1px 3px rgba(15,23,42,.05); }
.card-title { font-size: 13px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.state { font-size: 12px; color: #64748b; padding: 24px 0; text-align: center; }
.msg { margin-bottom: 10px; font-size: 11.5px; display: flex; gap: 5px; align-items: center; }
.msg--err { color: #dc2626; }
.msg--ok { color: #047857; }
.btn-ghost { height: 34px; padding: 0 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #64748b; background: white; }
.btn-submit { height: 34px; padding: 0 16px; border-radius: 8px; font-size: 12px; font-weight: 700; color: white; background: #0284c7; display: inline-flex; align-items: center; gap: 5px; }
.btn-submit:hover:not(:disabled) { background: #0369a1; }
.btn-submit:disabled { opacity: .5; cursor: not-allowed; }
</style>
