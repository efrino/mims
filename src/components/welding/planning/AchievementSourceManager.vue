<!-- components/welding/planning/AchievementSourceManager.vue -->
<template>
  <div class="as-wrap">
    <div class="section-header">
      <i class="ti ti-git-branch" />
      <div>
        <div class="section-title">Isolasi Sumber Achievement per-Area</div>
        <div class="section-desc">
          Default <strong>Both</strong> = perilaku lama (v1 &amp; v2 sama-sama jalan, v2
          menang otomatis per-part). Set area ke <strong>V1 saja</strong> atau
          <strong>V2 saja</strong> untuk mengisolasi total — sumber yang bukan pemiliknya
          tidak akan disentuh sama sekali di area itu (auto-insert, reset, maupun update),
          supaya data test tidak bercampur ke planning.
        </div>
      </div>
    </div>

    <!-- Saklar GLOBAL (admin): default utk area tanpa override + terapkan ke semua -->
    <div class="as-global">
      <div class="as-global-label">
        <i class="ti ti-world" />
        <span>Default global</span>
        <span class="as-hint">berlaku utk area tanpa override per-area · transisi v1 → v2 cukup satu klik</span>
      </div>
      <div class="as-global-controls">
        <select v-model="globalSource" :disabled="globalBusy">
          <option value="both">Both</option>
          <option value="v1">V1 (achievement lama)</option>
          <option value="v2">V2 (achievement baru)</option>
        </select>
        <button class="btn btn--primary" :disabled="globalBusy || globalSource === globalSaved" @click="onSaveDefault">
          <i :class="globalBusy ? 'ti ti-loader-2 spin' : 'ti ti-device-floppy'" />
          Simpan default
        </button>
        <button class="btn btn--danger" :disabled="globalBusy" @click="onApplyAll"
                title="Set SEMUA area ke sumber ini (override per-area ikut ditimpa) + set default global">
          <i :class="globalBusy ? 'ti ti-loader-2 spin' : 'ti ti-arrows-shuffle'" />
          Terapkan ke semua area
        </button>
      </div>
    </div>

    <div class="as-table-wrap">
      <table class="as-table">
        <thead>
          <tr>
            <th>Area</th>
            <th>Sumber</th>
            <th>Diubah oleh</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="4" class="as-cell-msg"><i class="ti ti-loader-2 spin" /> Memuat…</td>
          </tr>
          <tr v-for="row in rows" :key="row.area_code" :class="`as-row--${row.source}`">
            <td class="as-area">{{ row.area_code }}</td>
            <td>
              <select v-model="row.source" :disabled="saving[row.area_code]">
                <option value="both">Both</option>
                <option value="v1">V1 saja</option>
                <option value="v2">V2 saja</option>
              </select>
              <span class="as-badge" :class="`as-badge--${row.source}`">{{ badgeLabel(row.source) }}</span>
              <span v-if="!row.__override" class="as-inherit" title="Belum ada override — mengikuti default global">ikut default</span>
            </td>
            <td class="as-by">{{ row.updated_by || '—' }}</td>
            <td class="as-actions">
              <button
                class="btn btn--primary"
                :disabled="saving[row.area_code] || row.source === row.__saved"
                @click="onSave(row)"
              >
                <i :class="saving[row.area_code] ? 'ti ti-loader-2 spin' : 'ti ti-device-floppy'" />
                Simpan
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="error" class="as-error"><i class="ti ti-alert-circle" /> {{ error }}</p>
    <p v-else-if="saveMsg" class="as-ok"><i class="ti ti-circle-check" /> {{ saveMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import achievementSourceService, { type AchievementSource, type AchievementSourceRow } from '@/services/Public/Welding/achievementSourceService'

const props = defineProps<{ areas: string[] }>()

type RowState = {
  area_code: string; source: AchievementSource; updated_by: string | null
  __saved: AchievementSource
  __override: boolean   // false = belum ada baris per-area, nilai tampil = default global
}

const rows = ref<RowState[]>([])
const loading = ref(false)
const saving = reactive<Record<string, boolean>>({})
const error = ref('')
const saveMsg = ref('')

// Saklar global
const globalSource = ref<AchievementSource>('both')
const globalSaved  = ref<AchievementSource>('both')
const globalBusy   = ref(false)

function badgeLabel(s: AchievementSource) {
  return s === 'v1' ? 'V1' : s === 'v2' ? 'V2' : 'Both'
}

async function reload() {
  loading.value = true
  error.value = ''
  try {
    const [existing, def] = await Promise.all([
      achievementSourceService.getList(),
      achievementSourceService.getDefault(),
    ])
    globalSource.value = def
    globalSaved.value  = def
    const byArea = new Map(existing.map(r => [r.area_code, r]))
    const areaList = props.areas.length ? props.areas : Array.from(byArea.keys())
    rows.value = areaList.map(a => {
      const found = byArea.get(a)
      // Tanpa override → engine memakai default global, tampilkan itu (bukan 'both' mati).
      const source: AchievementSource = found?.source ?? def
      return { area_code: a, source, updated_by: found?.updated_by ?? null, __saved: source, __override: !!found }
    })
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? 'Gagal memuat data'
  } finally {
    loading.value = false
  }
}

async function onSave(row: RowState) {
  saving[row.area_code] = true
  error.value = ''
  saveMsg.value = ''
  try {
    const ok = await achievementSourceService.save(row.area_code, row.source)
    if (ok) {
      row.__saved = row.source
      row.__override = true
      saveMsg.value = `Sumber achievement ${row.area_code} → ${badgeLabel(row.source)} disimpan.`
    } else {
      error.value = 'Gagal menyimpan.'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? 'Gagal menyimpan'
  } finally {
    saving[row.area_code] = false
  }
}

async function onSaveDefault() {
  globalBusy.value = true
  error.value = ''
  saveMsg.value = ''
  try {
    const r = await achievementSourceService.setDefault(globalSource.value)
    if (r.ok) {
      globalSaved.value = globalSource.value
      saveMsg.value = r.message ?? `Default global → ${badgeLabel(globalSource.value)}.`
      await reload()   // baris "ikut default" harus tampil nilai baru
    } else {
      error.value = r.message ?? 'Gagal menyimpan default global.'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? 'Gagal menyimpan default global'
  } finally {
    globalBusy.value = false
  }
}

async function onApplyAll() {
  const label = badgeLabel(globalSource.value)
  if (!confirm(`Terapkan sumber ${label} ke SEMUA area?\nOverride per-area yang ada akan ditimpa, dan default global ikut di-set ${label}.\nBerlaku pada refresh/pipeline berikutnya.`)) return
  globalBusy.value = true
  error.value = ''
  saveMsg.value = ''
  try {
    const r = await achievementSourceService.applyAll(globalSource.value)
    if (r.ok) {
      saveMsg.value = r.message ?? `Sumber ${label} diterapkan ke semua area.`
      await reload()
    } else {
      error.value = r.message ?? 'Gagal menerapkan ke semua area.'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? 'Gagal menerapkan ke semua area'
  } finally {
    globalBusy.value = false
  }
}

onMounted(reload)
watch(() => props.areas, reload)
</script>

<style scoped>
.as-wrap { display: flex; flex-direction: column; gap: 1rem; }

.section-header { display: flex; align-items: flex-start; gap: 10px; }
.section-header > i { font-size: 20px; color: var(--color-primary, #6366f1); margin-top: 2px; }
.section-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.section-desc  { font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; line-height: 1.5; max-width: 760px; }

.as-table-wrap { overflow-x: auto; border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); }
.as-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.as-table thead th {
  text-align: left; padding: 9px 12px; font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--color-text-secondary); background: var(--color-background-secondary);
  border-bottom: 0.5px solid var(--color-border-tertiary); white-space: nowrap;
}
.as-table tbody td { padding: 8px 12px; border-bottom: 0.5px solid var(--color-border-tertiary); color: var(--color-text-primary); vertical-align: middle; }
.as-table tbody tr:hover { background: var(--color-background-secondary); }
.as-area { font-weight: 600; }
.as-by { font-size: 11px; color: var(--color-text-tertiary); }
.as-cell-msg { text-align: center; padding: 1.5rem; color: var(--color-text-tertiary); }
.as-actions { text-align: right; }

.as-table select {
  padding: 5px 8px; font-size: 12px; margin-right: 8px;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-secondary); color: var(--color-text-primary); outline: none;
}

.as-badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.as-badge--both { background: var(--color-background-secondary); color: var(--color-text-tertiary); }
.as-badge--v1   { background: #dbeafe; color: #2563eb; }
.as-badge--v2   { background: #dcfce7; color: #16a34a; }

.as-error { color: var(--color-text-danger, #dc2626); font-size: 13px; display: flex; align-items: center; gap: 6px; }
.as-ok    { color: var(--color-text-success, #16a34a); font-size: 13px; display: flex; align-items: center; gap: 6px; }

.btn { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; font-size: 12px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border-secondary); cursor: pointer; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn--primary { background: var(--color-text-primary); color: var(--color-background-primary); border-color: transparent; }
.btn--danger  { background: #fff7ed; color: #c2410c; border-color: #fdba74; }
.btn--danger:hover:not(:disabled) { background: #ffedd5; }

/* Saklar global */
.as-global {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding: 10px 14px; border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-lg); background: var(--color-background-secondary);
}
.as-global-label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.as-global-label > i { color: var(--color-primary, #6366f1); font-size: 16px; }
.as-hint { font-size: 11px; font-weight: 400; color: var(--color-text-tertiary); }
.as-global-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.as-global-controls select {
  padding: 5px 8px; font-size: 12px; border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md); background: var(--color-background-primary); color: var(--color-text-primary);
}
.as-inherit { margin-left: 6px; font-size: 10px; color: var(--color-text-tertiary); font-style: italic; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
