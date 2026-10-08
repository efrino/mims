<!-- views/admin/PCD/Auto/params-mutasi.vue
     PCD › Auto › Params Mutasi (2026-09-25) — satu tempat untuk parameter Mutasi/
     planning welding, supaya halaman Mutasi & sidebar tetap ringkas:
       · Aturan DN        — global + per customer (dulu modal di halaman Mutasi)
       · Parameter Planning — grup planning_config lain
       · Engine & Achievement — saklar Plan v2 + sumber achievement v1/v2/both per area
         (dulu tombol "Plan v2" & "Ach" di halaman Mutasi)
       · Pola Planner       — ringkasan edit plan manual (alasan, arah, kondisi DN)
       · Log Welding      — audit perubahan (dulu menu PCD › Welding › Audit Log Welding)
     Tab aktif disinkron ke ?tab= (dn | planning | ach | pattern | log). -->
<template>
  <div class="page-root">
    <header class="header-bar">
      <div class="header-title">
        <div class="header-icon"><i class="mdi mdi-tune"></i></div>
        <div>
          <h1>Params Mutasi</h1>
          <p>Aturan DN, parameter planning, engine planning, sumber achievement, dan log perubahan welding</p>
        </div>
      </div>
      <Transition name="fade">
        <span v-if="mutasi.refreshMessage.value" class="refresh-status" :class="{ 'refresh-status--run': mutasi.refreshing.value }">
          <i class="mdi" :class="mutasi.refreshing.value ? 'mdi-loading mdi-spin' : 'mdi-check-circle'"></i>
          {{ mutasi.refreshMessage.value }}
        </span>
      </Transition>
    </header>

    <nav class="tabs">
      <button v-for="t in tabs" :key="t.key" class="tab" :class="{ 'tab--on': tab === t.key }" @click="tab = t.key">
        <i class="mdi" :class="t.icon"></i> {{ t.label }}
      </button>
    </nav>

    <div class="body-scroll">
      <DnRulePanel v-if="tab === 'dn'" :applying="mutasi.refreshing.value" @apply="applyDnRules" />
      <PlanningParamsPanel v-else-if="tab === 'planning'" :exclude="['dn_rule', 'audit', 'glc_welding', 'glc_press']" />
      <div v-else-if="tab === 'ach'" class="ach-tab">
        <section class="v2-card">
          <div class="v2-text">
            <div class="v2-title"><i class="mdi mdi-layers-triple-outline"></i> Planning v2 (2-baris)</div>
            <div class="v2-desc">Engine plan yang dipakai saat Refresh di halaman Mutasi (FP &amp; WIP). Disimpan per browser; berlaku pada refresh berikutnya.</div>
          </div>
          <label class="v2-switch">
            <input type="checkbox" :checked="planningV2" @change="setPlanningV2(($event.target as HTMLInputElement).checked)" />
            <span class="v2-track"><span class="v2-thumb"></span></span>
            <span class="v2-state" :class="{ 'v2-state--on': planningV2 }">{{ planningV2 ? 'ON' : 'OFF' }}</span>
          </label>
        </section>
        <AchievementSourceManager :areas="zones" />
      </div>
      <PlanPatternPanel v-else-if="tab === 'pattern'" />
      <AuditLogPanel v-else-if="tab === 'log'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DnRulePanel from '@/components/welding/params/DnRulePanel.vue'
import PlanningParamsPanel from '@/components/welding/params/PlanningParamsPanel.vue'
import AuditLogPanel from '@/components/welding/params/AuditLogPanel.vue'
import PlanPatternPanel from '@/components/welding/params/PlanPatternPanel.vue'
import AchievementSourceManager from '@/components/welding/planning/AchievementSourceManager.vue'
import { useWeldingAreas } from '@/composables/useWeldingAreas'
import { useMutationData } from '@/composables/useMutationData'
import { useAuthStore } from '@/stores/auth'

type TabKey = 'dn' | 'planning' | 'ach' | 'pattern' | 'log'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

// Log Welding tetap mengikuti permission lamanya (Module.View.AuditLogWelding).
const canSeeLog = computed(() =>
  auth.group === '1' || (Array.isArray(auth.authorization) && auth.authorization.includes('Module.View.AuditLogWelding')))

const tabs = computed(() => [
  { key: 'dn' as TabKey,       label: 'Aturan DN',          icon: 'mdi-truck-delivery-outline' },
  { key: 'planning' as TabKey, label: 'Parameter Planning', icon: 'mdi-tune-variant' },
  { key: 'ach' as TabKey,      label: 'Engine & Achievement', icon: 'mdi-database-arrow-right-outline' },
  { key: 'pattern' as TabKey,  label: 'Pola Planner',       icon: 'mdi-lightbulb-on-outline' },
  ...(canSeeLog.value ? [{ key: 'log' as TabKey, label: 'Log Welding', icon: 'mdi-history' }] : []),
])

const initial = route.query.tab as TabKey
const tab = ref<TabKey>(['dn', 'planning', 'ach', 'pattern', 'log'].includes(initial) ? initial : 'dn')
watch(tab, (t) => router.replace({ query: { ...route.query, tab: t } }))

// Sumber achievement disimpan per zone → daftar zone dari master area.
const { zones, load: loadAreas } = useWeldingAreas()
loadAreas()

// Plan v2 — kunci localStorage sama dengan useMutationData / useWipMutationData,
// jadi halaman Mutasi membacanya saat dibuka. FP & WIP selalu diset bersamaan.
const V2_KEYS = ['welding_planning_v2', 'welding_wip_planning_v2']
const readV2 = () => { try { return localStorage.getItem(V2_KEYS[0]) === '1' } catch { return false } }
const planningV2 = ref(readV2())
function setPlanningV2(on: boolean) {
  planningV2.value = on
  try { V2_KEYS.forEach(k => localStorage.setItem(k, on ? '1' : '0')) } catch { /* storage diblokir */ }
}

// "Terapkan sekarang" = refresh pipeline semua area (sama dgn menu Refresh › Semua area di Mutasi).
const mutasi = useMutationData()
async function applyDnRules() {
  if (!confirm('Hitung ulang DN & plan SEMUA area dengan aturan DN sekarang? (±2 menit)')) return
  const r = await mutasi.refreshAllAreas()
  if (!r.success) console.error('Refresh semua area:', r.message)
}
</script>

<style scoped>
.page-root {
  position: fixed;
  top: var(--v-layout-top, 0px);
  left: var(--v-layout-left, 0px);
  right: 0;
  bottom: var(--v-layout-bottom, 0px);
  z-index: 1;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
  overflow: hidden;
}
.header-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
.header-title { display: flex; align-items: center; gap: 10px; }
.header-icon { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 17px; }
.header-title h1 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0; line-height: 1.2; }
.header-title p { font-size: 11px; color: #94a3b8; margin: 2px 0 0; }
.refresh-status { font-size: 11px; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 999px; padding: 4px 10px; display: inline-flex; gap: 5px; align-items: center; max-width: 50%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.refresh-status--run { color: #0369a1; background: #f0f9ff; border-color: #bae6fd; }

.tabs { display: flex; gap: 4px; padding: 8px 16px 0; background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
.tab { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #64748b; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab:hover { color: #0f172a; }
.tab--on { color: #0369a1; border-bottom-color: #0284c7; }

.body-scroll { flex: 1; overflow-y: auto; padding: 16px; }

.ach-tab { display: flex; flex-direction: column; gap: 12px; }
.v2-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; }
.v2-title { font-size: 13px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 6px; }
.v2-title .mdi { color: #7c3aed; font-size: 16px; }
.v2-desc { font-size: 11.5px; color: #64748b; margin-top: 2px; }
.v2-switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; flex-shrink: 0; }
.v2-switch input { position: absolute; opacity: 0; pointer-events: none; }
.v2-track { width: 36px; height: 20px; border-radius: 999px; background: #cbd5e1; position: relative; transition: background .15s; }
.v2-thumb { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.2); transition: transform .15s; }
.v2-switch input:checked + .v2-track { background: #7c3aed; }
.v2-switch input:checked + .v2-track .v2-thumb { transform: translateX(16px); }
.v2-switch input:focus-visible + .v2-track { outline: 2px solid #c4b5fd; outline-offset: 2px; }
.v2-state { font-size: 11px; font-weight: 700; color: #64748b; width: 26px; }
.v2-state--on { color: #6d28d9; }

.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
