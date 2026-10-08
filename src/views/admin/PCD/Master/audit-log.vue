<!-- views/admin/PCD/Master/audit-log.vue
     CMS "Log Perubahan" — jejak audit planning/master data welding (planning_audit):
     cari & filter log (live / arsip), export CSV, statistik ukuran, dan kebijakan arsip
     (masa simpan per jenis modul, purge arsip, cron on/off) yang bisa diubah admin.
     Backend: Welding_audit.php + M_audit_log.php; cron harian `welding_master_cli audit_archive apply`. -->
<template>
  <div class="wui-page">
    <header class="wui-header">
      <div class="wui-header__icon"><i class="mdi mdi-history"></i></div>
      <div class="wui-header__title">
        <h1>Log Perubahan Welding</h1>
        <p>Jejak audit planning &amp; master data: siapa mengubah apa, kapan. Log lama diarsipkan otomatis sesuai kebijakan.</p>
      </div>
      <div class="wui-header__actions">
        <button
          class="wui-btn wui-live" :class="{ 'wui-live--on': live }" @click="live = !live"
          :title="live ? 'Live: log baru muncul otomatis tiap 5 detik (klik untuk jeda)' : 'Live dijeda — klik untuk lanjut'"
        >
          <span class="wui-live__dot"></span> {{ live ? 'Live' : 'Dijeda' }}
        </button>
        <button class="wui-btn" :disabled="loading" @click="reload"><i class="mdi mdi-refresh" :class="{ 'mdi-spin': loading }"></i> Segarkan</button>
        <button class="wui-btn wui-btn--success" :disabled="!rows.length" @click="exportCsv"><i class="mdi mdi-microsoft-excel"></i> Export CSV</button>
      </div>
    </header>

    <main class="wui-body">
    <!-- Statistik -->
    <div v-if="stats" class="al-stats">
      <div class="wui-stat">
        <span class="wui-stat__val">{{ fmt(stats.live.rows) }}</span>
        <span class="wui-stat__lbl">Log aktif · {{ stats.live.mb }} MB</span>
        <span class="wui-stat__sub">{{ dateOnly(stats.live.oldest) }} → {{ dateOnly(stats.live.newest) }}</span>
      </div>
      <div class="wui-stat">
        <span class="wui-stat__val">{{ fmt(stats.archive.rows) }}</span>
        <span class="wui-stat__lbl">Arsip · {{ stats.archive.mb }} MB</span>
        <span class="wui-stat__sub">{{ stats.archive.rows ? dateOnly(stats.archive.oldest) + ' → ' + dateOnly(stats.archive.newest) : '—' }}</span>
      </div>
      <div class="wui-stat" :class="{ 'wui-stat--warn': stats.pending.to_archive > 0 }">
        <span class="wui-stat__val">{{ fmt(stats.pending.to_archive) }}</span>
        <span class="wui-stat__lbl">Siap diarsip (kebijakan saat ini)</span>
        <span class="wui-stat__sub">{{ stats.pending.to_purge ? fmt(stats.pending.to_purge) + ' akan dihapus permanen dari arsip' : 'tidak ada purge' }}</span>
      </div>
      <div class="wui-stat al-stat--chart">
        <span class="wui-stat__lbl">Log per bulan (12 bln)</span>
        <div class="al-bars">
          <div v-for="m in stats.monthly" :key="m.ym" class="al-bar" :title="`${m.ym}: ${fmt(m.n)}`">
            <span class="al-bar-fill" :style="{ height: barH(m.n) + '%' }"></span>
            <span class="al-bar-lbl">{{ m.ym.slice(5) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Kebijakan arsip -->
    <details class="wui-card al-policy" :open="policyOpen" @toggle="policyOpen = ($event.target as HTMLDetailsElement).open">
      <summary><i class="mdi mdi-archive-cog-outline"></i> Kebijakan arsip <span class="wui-hint">— cron harian 01:30, atau jalankan manual</span></summary>
      <div class="al-policy-body">
        <div v-for="c in policyRows" :key="c.config_key" class="al-policy-row">
          <label :for="c.config_key">{{ c.label }}<span class="wui-hint" v-if="c.unit"> ({{ c.unit }})</span></label>
          <template v-if="c.config_key === 'audit_archive_auto'">
            <select :id="c.config_key" v-model="policyEdit[c.config_key]" class="wui-input" :disabled="!canUpdate">
              <option :value="1">Aktif (cron jalan)</option>
              <option :value="0">Nonaktif (hanya manual)</option>
            </select>
          </template>
          <input v-else :id="c.config_key" v-model.number="policyEdit[c.config_key]" type="number" class="wui-input"
                 :min="c.min_value ?? undefined" :max="c.max_value ?? undefined" :disabled="!canUpdate" />
          <span class="al-policy-desc">{{ c.description }}<span v-if="c.updated_by" class="wui-hint"> · diubah {{ c.updated_by }} {{ dateOnly(c.updated_at) }}</span></span>
        </div>
        <p class="wui-hint">Modul master data: <code v-for="m in masterModules" :key="m">{{ m }}</code></p>
        <div class="al-policy-actions">
          <button class="wui-btn wui-btn--primary" :disabled="!canUpdate || savingPolicy || !policyDirty" @click="savePolicy">
            <i class="mdi" :class="savingPolicy ? 'mdi-loading mdi-spin' : 'mdi-content-save-outline'"></i> Simpan kebijakan
          </button>
          <button class="wui-btn" :disabled="archiving" @click="previewArchive"><i class="mdi mdi-eye-outline"></i> Preview arsip</button>
          <button class="wui-btn wui-btn--amber" :disabled="!canUpdate || archiving || !preview || !(preview.to_archive || preview.to_purge)" @click="runArchive">
            <i class="mdi" :class="archiving ? 'mdi-loading mdi-spin' : 'mdi-archive-arrow-down-outline'"></i> {{ archiving ? 'Mengarsipkan…' : 'Jalankan arsip sekarang' }}
          </button>
          <span v-if="preview" class="al-preview">
            {{ fmt(preview.to_archive) }} baris → arsip
            <template v-if="preview.per_module.length"> ({{ preview.per_module.map(m => `${m.module} ${fmt(m.n)}`).join(', ') }})</template>;
            {{ fmt(preview.to_purge) }} dihapus permanen
          </span>
        </div>
        <p v-if="policyMsg" class="al-msg" :class="{ 'al-msg--err': policyErr }">{{ policyMsg }}</p>
      </div>
    </details>

    <!-- Filter -->
    <div class="wui-card wui-card__pad wui-filters">
      <div class="wui-seg">
        <button :class="{ on: f.source === 'live' }" @click="setSource('live')">Log aktif</button>
        <button :class="{ on: f.source === 'archive' }" @click="setSource('archive')">Arsip</button>
      </div>
      <select v-model="f.module" class="wui-input" @change="load(1)">
        <option value="">Semua modul</option>
        <option v-for="o in facets.module" :key="o.v" :value="o.v">{{ o.v }} ({{ fmt(o.n) }})</option>
      </select>
      <select v-model="f.action_type" class="wui-input" @change="load(1)">
        <option value="">Semua aksi</option>
        <option v-for="o in facets.action_type" :key="o.v" :value="o.v">{{ o.v }} ({{ fmt(o.n) }})</option>
      </select>
      <select v-model="f.changed_by" class="wui-input" @change="load(1)">
        <option value="">Semua user</option>
        <option v-for="o in facets.changed_by" :key="o.v" :value="o.v">{{ o.v }} ({{ fmt(o.n) }})</option>
      </select>
      <input v-model="f.date_from" type="date" class="wui-input" @change="load(1)" />
      <span class="wui-hint">s/d</span>
      <input v-model="f.date_to" type="date" class="wui-input" @change="load(1)" />
      <input v-model="f.record_id" class="wui-input" placeholder="Record ID (mis. id part)" @keydown.enter="load(1)" />
      <input v-model="f.q" class="wui-input wui-input--grow" placeholder="Cari di catatan / nilai lama / nilai baru…" @keydown.enter="load(1)" />
      <button class="wui-btn" @click="load(1)"><i class="mdi mdi-magnify"></i> Cari</button>
      <button class="wui-btn" @click="resetFilters"><i class="mdi mdi-filter-remove-outline"></i></button>
    </div>

    <!-- Tabel -->
    <div class="wui-table-wrap al-table-wrap">
      <div v-if="loadError" class="al-error"><i class="mdi mdi-alert-circle"></i> {{ loadError }}</div>
      <table v-else class="wui-table">
        <thead>
          <tr><th>Waktu</th><th>User</th><th>Modul</th><th>Aksi</th><th>Tabel / Record</th><th>Field</th><th>Lama → Baru</th><th>Catatan</th></tr>
        </thead>
        <tbody>
          <tr v-if="loading && !rows.length"><td colspan="8" class="wui-table-empty"><i class="mdi mdi-loading mdi-spin"></i> Memuat…</td></tr>
          <tr v-else-if="!rows.length"><td colspan="8" class="wui-table-empty">Tidak ada log.</td></tr>
          <tr v-for="r in rows" :key="r.id" @click="detail = r" class="al-row" :class="{ 'wui-row--new': freshIds.has(r.id) }">
            <td class="nowrap">{{ r.changed_at }}</td>
            <td class="nowrap">{{ r.changed_by }}</td>
            <td><span class="al-tag" :class="'al-tag--' + (masterModules.includes(r.module) ? 'master' : 'gen')">{{ r.module }}</span></td>
            <td class="nowrap">{{ r.action_type }}</td>
            <td class="nowrap"><span class="wui-hint">{{ r.table_affected }}</span><br /><span class="wui-mono">{{ r.record_id || '—' }}</span></td>
            <td class="nowrap">{{ r.field_name || '—' }}</td>
            <td class="al-diff"><span class="al-old">{{ short(r.old_value) }}</span> <i class="mdi mdi-arrow-right"></i> <span class="al-new">{{ short(r.new_value) }}</span></td>
            <td class="al-note">{{ short(r.note, 120) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="wui-pager">
      <span class="wui-hint">{{ fmt(total) }} baris · hal {{ page }}/{{ lastPage }}</span>
      <button class="wui-btn" :disabled="page <= 1 || loading" @click="load(page - 1)"><i class="mdi mdi-chevron-left"></i></button>
      <button class="wui-btn" :disabled="page >= lastPage || loading" @click="load(page + 1)"><i class="mdi mdi-chevron-right"></i></button>
      <select v-model.number="f.per_page" class="wui-input" @change="load(1)"><option :value="50">50</option><option :value="100">100</option><option :value="200">200</option></select>
    </div>

    </main>

    <!-- Detail -->
    <Teleport to="body">
      <div v-if="detail" class="wui-overlay" @click.self="detail = null">
        <div class="wui-modal">
          <div class="wui-modal__head">
            <strong>#{{ detail.id }} · {{ detail.changed_at }} · {{ detail.changed_by }}</strong>
            <button class="wui-btn wui-btn--sm wui-btn--icon" style="margin-left:auto" title="Tutup" @click="detail = null"><i class="mdi mdi-close"></i></button>
          </div>
          <dl class="al-dl wui-modal__body">
            <dt>Modul / aksi</dt><dd>{{ detail.module }} · {{ detail.action_type }}</dd>
            <dt>Tabel / record</dt><dd>{{ detail.table_affected }} · <span class="wui-mono">{{ detail.record_id || '—' }}</span></dd>
            <dt>Field</dt><dd>{{ detail.field_name || '—' }}</dd>
            <dt>Nilai lama</dt><dd><pre>{{ pretty(detail.old_value) }}</pre></dd>
            <dt>Nilai baru</dt><dd><pre>{{ pretty(detail.new_value) }}</pre></dd>
            <dt>Catatan</dt><dd>{{ detail.note || '—' }}</dd>
            <dt>IP</dt><dd>{{ detail.ip_address || '—' }}</dd>
          </dl>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import auditLogService from '@/services/Public/Welding/auditLogService'
import type { AuditRow, AuditStats, AuditFacet, AuditConfigRow, AuditArchivePreview, AuditSource } from '@/services/Public/Welding/auditLogService'

const auth = useAuthStore()
const canUpdate = computed(() => auth.checkAccess('Module.Update.AuditLogWelding'))

const loading = ref(false)
const loadError = ref<string | null>(null)
const rows = ref<AuditRow[]>([])
const total = ref(0); const page = ref(1); const lastPage = ref(1)
const stats = ref<AuditStats | null>(null)
const facets = ref<Record<'module' | 'action_type' | 'changed_by', AuditFacet[]>>({ module: [], action_type: [], changed_by: [] })
const detail = ref<AuditRow | null>(null)

const f = reactive({ source: 'live' as AuditSource, module: '', action_type: '', changed_by: '', date_from: '', date_to: '', record_id: '', q: '', per_page: 50 })

const policyOpen = ref(false)
const policyRows = ref<AuditConfigRow[]>([])
const masterModules = ref<string[]>([])
const policyEdit = reactive<Record<string, number>>({})
const policyOrig = reactive<Record<string, number>>({})
const policyDirty = computed(() => policyRows.value.some(c => policyEdit[c.config_key] !== policyOrig[c.config_key]))
const savingPolicy = ref(false); const archiving = ref(false)
const preview = ref<AuditArchivePreview | null>(null)
const policyMsg = ref<string | null>(null); const policyErr = ref(false)

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n ?? 0)
const dateOnly = (d: string | null | undefined) => d ? d.slice(0, 10) : '—'
const short = (v: string | null, n = 60) => { if (v == null || v === '') return '∅'; return v.length > n ? v.slice(0, n) + '…' : v }
const pretty = (v: string | null) => { if (v == null || v === '') return '∅'; try { return JSON.stringify(JSON.parse(v), null, 2) } catch { return v } }
const barH = (n: number) => { const mx = Math.max(1, ...(stats.value?.monthly.map(m => m.n) ?? [1])); return Math.max(4, Math.round(n / mx * 100)) }

async function load(p = 1) {
  loading.value = true; loadError.value = null
  try {
    const r = await auditLogService.list({ ...f, page: p })
    rows.value = r.data; total.value = r.total; page.value = r.page; lastPage.value = r.last_page
  } catch (e: any) { loadError.value = e?.response?.data?.status || e?.message || 'Gagal memuat log.' }
  finally { loading.value = false }
}
async function loadFacets() { try { facets.value = await auditLogService.facets(f.source) } catch { /* opsional */ } }
async function loadStats() { try { stats.value = await auditLogService.stats() } catch { /* opsional */ } }
async function loadPolicy() {
  try {
    const r = await auditLogService.policy()
    policyRows.value = r.rows; masterModules.value = r.master_modules
    for (const c of r.rows) { policyEdit[c.config_key] = Number(c.config_value); policyOrig[c.config_key] = Number(c.config_value) }
  } catch { /* opsional */ }
}
function setSource(s: AuditSource) { f.source = s; loadFacets(); load(1) }
function resetFilters() { Object.assign(f, { module: '', action_type: '', changed_by: '', date_from: '', date_to: '', record_id: '', q: '' }); load(1) }
function reload() { load(page.value); loadStats(); loadFacets() }
function exportCsv() { auditLogService.exportCsv({ ...f }) }

async function savePolicy() {
  savingPolicy.value = true; policyMsg.value = null; policyErr.value = false
  try {
    const r = await auditLogService.savePolicy({ ...policyEdit })
    policyMsg.value = r.message; policyErr.value = r.status !== 'success'
    await loadPolicy(); await loadStats(); preview.value = null
  } catch (e: any) { policyMsg.value = e?.response?.data?.message || 'Gagal menyimpan.'; policyErr.value = true }
  finally { savingPolicy.value = false }
}
async function previewArchive() {
  policyMsg.value = null
  try { preview.value = await auditLogService.archivePreview() }
  catch (e: any) { policyMsg.value = e?.response?.data?.status || 'Gagal preview.'; policyErr.value = true }
}
async function runArchive() {
  if (!preview.value) return
  if (!confirm(`Arsipkan ${fmt(preview.value.to_archive)} baris log dan hapus permanen ${fmt(preview.value.to_purge)} baris arsip?\nProses per batch 20.000 baris, bisa beberapa menit.`)) return
  archiving.value = true; policyMsg.value = null; policyErr.value = false
  try {
    const r = await auditLogService.archiveRun()
    policyMsg.value = r.message; preview.value = null
    await loadStats(); await load(1); await loadFacets()
  } catch (e: any) { policyMsg.value = e?.response?.data?.status || e?.message || 'Gagal.'; policyErr.value = true }
  finally { archiving.value = false }
}

// ── Live: tarik log terbaru tiap 5 dtk (hanya log aktif, halaman 1, tab terlihat,
// tidak sedang buka detail). Diam-diam — tanpa spinner; baris baru disorot 4 dtk.
const LIVE_MS = 5000
const live = ref(true)
const freshIds = ref(new Set<number>())
let liveTimer: ReturnType<typeof setInterval> | undefined
async function liveTick() {
  if (!live.value || loading.value || detail.value || document.hidden) return
  if (f.source !== 'live' || page.value !== 1) return
  try {
    const r = await auditLogService.list({ ...f, page: 1 })
    const known = new Set(rows.value.map(x => x.id))
    const added = r.data.filter(x => !known.has(x.id)).map(x => x.id)
    rows.value = r.data; total.value = r.total; lastPage.value = r.last_page
    if (added.length) {
      freshIds.value = new Set([...freshIds.value, ...added])
      setTimeout(() => { const n = new Set(freshIds.value); added.forEach(id => n.delete(id)); freshIds.value = n }, 4000)
    }
  } catch { /* live = pelengkap, abaikan */ }
}

onMounted(() => {
  load(1); loadFacets(); loadStats(); loadPolicy()
  liveTimer = setInterval(liveTick, LIVE_MS)
})
onUnmounted(() => clearInterval(liveTimer))
</script>

<style scoped>
/* Kerangka, tombol, input, kartu, tabel = standar src/styles/welding-ui.css (wui-*).
   Di sini hanya gaya khas halaman log. */
.al-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 1.6fr); gap: 10px; }
.al-stat--chart { gap: 4px; }
.al-bars { display: flex; align-items: flex-end; gap: 4px; height: 44px; }
.al-bar { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.al-bar-fill { display: block; width: 100%; background: linear-gradient(180deg, #60a5fa, #2563eb); border-radius: 3px 3px 0 0; }
.al-bar-lbl { font-size: 9px; color: #94a3b8; }

.al-policy summary { cursor: pointer; padding: 10px 14px; font-weight: 700; font-size: 12.5px; color: #1e293b; display: flex; align-items: center; gap: 6px; }
.al-policy-body { padding: 4px 14px 14px; display: flex; flex-direction: column; gap: 8px; }
.al-policy-row { display: grid; grid-template-columns: 240px 140px minmax(0, 1fr); gap: 10px; align-items: center; font-size: 12px; }
.al-policy-row label { font-weight: 600; color: #334155; }
.al-policy-desc { color: #64748b; font-size: 11.5px; }
.al-policy-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.al-preview { font-size: 11.5px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 4px 8px; }
.al-msg { margin: 0; font-size: 12px; color: #15803d; }
.al-msg--err { color: #dc2626; }
.wui-hint code { background: #f1f5f9; padding: 0 4px; border-radius: 3px; margin-right: 4px; }

.al-table-wrap { flex: 1; min-height: 240px; }
.al-error { padding: 26px; text-align: center; color: #dc2626; }
.al-row { cursor: pointer; }
.al-tag { display: inline-block; padding: 1px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; }
.al-tag--master { background: #dbeafe; color: #1e40af; }
.al-tag--gen { background: #f1f5f9; color: #475569; }
.al-diff { max-width: 320px; }
.al-old { color: #b91c1c; text-decoration: line-through; }
.al-new { color: #15803d; font-weight: 600; }
.al-note { max-width: 320px; color: #475569; }

.al-dl { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 6px 12px; font-size: 12px; margin: 0; }
.al-dl dt { color: #64748b; font-weight: 600; }
.al-dl dd { margin: 0; min-width: 0; }
.al-dl pre { margin: 0; white-space: pre-wrap; word-break: break-word; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; font-size: 11px; max-height: 220px; overflow: auto; }
@media (max-width: 900px) { .al-stats { grid-template-columns: 1fr 1fr; } .al-policy-row { grid-template-columns: 1fr; } }
</style>
