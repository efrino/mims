<!-- components/welding/params/PlanPatternPanel.vue
     Tab "Pola Planner" di PCD › Auto › Params Mutasi (2026-09-29) — langkah 2
     "belajar dari pola planner": ringkasan edit plan manual (mutasi_weld_plan_log)
     per part: arah & besar perubahan vs plan auto, alasan dominan, kondisi DN,
     hari. Murni baca; saran otomatis di Mutasi = langkah berikutnya. -->
<template>
  <div class="ppp">
    <div class="ppp-filters">
      <select v-model="area" class="filter-input" aria-label="Area">
        <option value="">Semua area</option>
        <option v-for="a in areaCodes" :key="a" :value="a">{{ a }}</option>
      </select>
      <select v-model.number="months" class="filter-input" aria-label="Rentang">
        <option :value="1">1 bulan terakhir</option>
        <option :value="3">3 bulan terakhir</option>
        <option :value="6">6 bulan terakhir</option>
      </select>
      <label class="ppp-toggle">
        <input v-model="onlyPattern" type="checkbox" /> Hanya yang berpola
      </label>
      <button class="btn btn--outline" :disabled="loading" @click="load">
        <i class="mdi" :class="loading ? 'mdi-loading mdi-spin' : 'mdi-refresh'"></i> Muat ulang
      </button>
    </div>

    <p class="ppp-hint">
      <i class="mdi mdi-information-outline"></i>
      Pola dihitung dari edit plan manual (selisih vs plan auto). Kalimat pola muncul bila part
      diubah ≥ 3 kali dengan arah ≥ 70% sama. Alasan & kondisi (DN, hari) mulai tercatat sejak
      29 Sep 2026 — data sebelumnya tampil sebagai "tanpa alasan".
    </p>

    <div v-if="report" class="ppp-stats">
      <div class="ppp-stat"><span>{{ report.total_edits }}</span>edit manual</div>
      <div class="ppp-stat"><span>{{ report.parts.length }}</span>part diubah</div>
      <div class="ppp-stat"><span>{{ patternCount }}</span>part berpola</div>
      <div class="ppp-stat ppp-stat--reasons">
        <div class="ppp-reason-bars">
          <div v-for="r in reasonRows" :key="r.code" class="ppp-reason-row" :title="`${r.label}: ${r.n}`">
            <span class="ppp-reason-label">{{ r.label }}</span>
            <span class="ppp-reason-bar"><span :style="{ width: r.pct + '%' }" :class="{ 'is-none': r.code === 'TANPA_ALASAN' }"></span></span>
            <span class="ppp-reason-n">{{ r.n }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="audit-table-wrap">
      <table class="audit-table">
        <thead>
          <tr>
            <th>Part</th>
            <th class="num">Edit</th>
            <th>Arah</th>
            <th class="num">Rata² vs auto</th>
            <th>Alasan dominan</th>
            <th class="num">DN belum ada</th>
            <th>Planner</th>
            <th>Pola</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="8" class="loading-cell"><i class="mdi mdi-loading mdi-spin"></i> Memuat…</td></tr>
          <tr v-else-if="error"><td colspan="8" class="empty-cell ppp-err">{{ error }}</td></tr>
          <tr v-else-if="!rows.length"><td colspan="8" class="empty-cell">Belum ada edit plan manual di rentang ini.</td></tr>
          <tr v-for="p in rows" v-else :key="p.area_code + p.part_number">
            <td>
              <span class="td-mono">{{ p.part_number }}</span>
              <span class="td-sub">{{ p.area_code }} · D {{ p.shift.day }} / N {{ p.shift.night }}</span>
            </td>
            <td class="num">{{ p.edits }}</td>
            <td>
              <span class="ppp-dir">
                <span class="up"><i class="mdi mdi-arrow-up"></i>{{ p.up }}</span>
                <span class="down"><i class="mdi mdi-arrow-down"></i>{{ p.down }}</span>
              </span>
              <span class="td-sub">{{ p.consistency }}% searah</span>
            </td>
            <td class="num" :class="p.avg_delta > 0 ? 'is-up' : 'is-down'">
              {{ p.avg_delta > 0 ? '+' : '' }}{{ p.avg_delta }} pcs
              <span v-if="p.avg_pct !== null" class="td-sub">{{ p.avg_pct > 0 ? '+' : '' }}{{ p.avg_pct }}%</span>
            </td>
            <td>{{ reasonLabel(p.top_reason) }}</td>
            <td class="num">{{ p.dn_pending_pct === null ? '—' : p.dn_pending_pct + '%' }}</td>
            <td>{{ topPlanner(p) }}</td>
            <td class="ppp-pattern">
              <span v-if="p.pattern" class="ppp-pattern-text"><i class="mdi mdi-lightbulb-on-outline"></i>{{ p.pattern }}</span>
              <span v-else class="td-sub">Belum cukup data</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import mutasiService from '@/services/Public/Welding/mutasiService'
import type { PlanPatternPart, PlanPatternReport } from '@/services/Public/Welding/mutasiService'
import { useWeldingAreas } from '@/composables/useWeldingAreas'

const { groups, load: loadAreas } = useWeldingAreas()
const areaCodes = computed(() => groups.value.map(g => g.area_code))

const area        = ref('')
const months      = ref(3)
const onlyPattern = ref(false)
const loading     = ref(false)
const error       = ref('')
const report      = ref<PlanPatternReport | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const now = new Date()
    report.value = await mutasiService.getPlanPatterns(now.getFullYear(), now.getMonth() + 1, area.value || undefined, months.value)
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? 'Gagal memuat pola'
  } finally {
    loading.value = false
  }
}
watch([area, months], load)
onMounted(() => { loadAreas(); load() })

const rows = computed(() => (report.value?.parts ?? []).filter(p => !onlyPattern.value || p.pattern))
const patternCount = computed(() => (report.value?.parts ?? []).filter(p => p.pattern).length)

function reasonLabel(code: string | null) {
  if (!code || code === 'TANPA_ALASAN') return 'Tanpa alasan'
  return report.value?.reason_labels[code] ?? code
}
const reasonRows = computed(() => {
  const r = report.value?.reasons ?? {}
  const max = Math.max(1, ...Object.values(r))
  return Object.entries(r).map(([code, n]) => ({ code, n, label: reasonLabel(code), pct: Math.round(n / max * 100) }))
})
function topPlanner(p: PlanPatternPart) {
  const e = Object.entries(p.planners).sort((a, b) => b[1] - a[1])
  return e.length ? `${e[0][0]}${e.length > 1 ? ` +${e.length - 1}` : ''}` : '—'
}
</script>

<style scoped>
.ppp { display: flex; flex-direction: column; gap: 12px; }
.ppp-filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.filter-input {
  height: 32px; padding: 0 10px; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 12px; color: #334155; background: #fff; outline: none;
}
.ppp-toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #475569; cursor: pointer; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; height: 32px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
.btn--outline { border: 1px solid #e2e8f0; background: #fff; color: #475569; }
.btn--outline:hover:not(:disabled) { background: #f8fafc; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.ppp-hint { margin: 0; font-size: 11.5px; color: #64748b; display: flex; gap: 6px; line-height: 1.45; }
.ppp-hint .mdi { color: #94a3b8; font-size: 14px; }

.ppp-stats { display: flex; flex-wrap: wrap; gap: 8px; }
.ppp-stat { flex: 1 1 120px; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 10px 12px; font-size: 11px; color: #64748b; }
.ppp-stat > span { display: block; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.2; }
.ppp-stat--reasons { flex: 3 1 320px; }
.ppp-reason-bars { display: flex; flex-direction: column; gap: 4px; }
.ppp-reason-row { display: grid; grid-template-columns: 130px 1fr 32px; align-items: center; gap: 8px; }
.ppp-reason-label { font-size: 11px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ppp-reason-bar { height: 6px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
.ppp-reason-bar span { display: block; height: 100%; background: #0284c7; border-radius: 999px; }
.ppp-reason-bar span.is-none { background: #cbd5e1; }
.ppp-reason-n { font-size: 11px; font-weight: 700; color: #334155; text-align: right; font-variant-numeric: tabular-nums; }

.audit-table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); overflow-x: auto; }
.audit-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.audit-table thead th {
  text-align: left; padding: 8px 14px; background: #f8fafc; color: #64748b;
  font-weight: 700; font-size: 10.5px; text-transform: uppercase; letter-spacing: .03em;
  border-bottom: 1px solid #e2e8f0; white-space: nowrap;
}
.audit-table tbody td { padding: 8px 14px; border-bottom: 1px solid #f1f5f9; color: #334155; white-space: nowrap; vertical-align: top; }
.audit-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.loading-cell, .empty-cell { text-align: center !important; padding: 24px; color: #94a3b8; }
.ppp-err { color: #dc2626 !important; }
.td-mono { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 11.5px; font-weight: 600; }
.td-sub { display: block; font-size: 10px; color: #94a3b8; margin-top: 1px; }
.ppp-dir { display: inline-flex; gap: 8px; font-weight: 700; }
.ppp-dir .up { color: #047857; }
.ppp-dir .down { color: #dc2626; }
.is-up { color: #047857; }
.is-down { color: #dc2626; }
.ppp-pattern { white-space: normal !important; min-width: 260px; }
.ppp-pattern-text { display: inline-flex; gap: 5px; font-size: 11.5px; color: #1e3a8a; line-height: 1.4; }
.ppp-pattern-text .mdi { color: #f59e0b; font-size: 14px; }
</style>
