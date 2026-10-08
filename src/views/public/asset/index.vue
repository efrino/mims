<template>
  <div class="as-page">
    <div v-if="loading" class="as-status"><i class="mdi mdi-loading mdi-spin"></i> Memuat aset…</div>
    <div v-else-if="error" class="as-status as-status--err"><i class="mdi mdi-alert-circle-outline"></i> {{ error }}</div>

    <template v-else-if="asset">
      <header class="as-head">
        <div class="as-head-icon"><i class="mdi mdi-qrcode"></i></div>
        <div class="as-head-text">
          <span class="as-type">{{ TYPE_LABEL[asset.asset_type] ?? asset.asset_type }}</span>
          <h1>{{ asset.item?.dies_code ?? asset.asset_code }}</h1>
          <span class="wui-mono as-code">{{ asset.asset_code }}</span>
        </div>
        <span class="wui-chip" :class="asset.is_active ? 'wui-chip--green' : 'wui-chip--red'">{{ asset.is_active ? 'Aktif' : 'Nonaktif' }}</span>
      </header>

      <div class="wui-seg as-mode">
        <button type="button" :class="{ on: mode === 'view' }" @click="mode = 'view'"><i class="mdi mdi-eye-outline"></i> Lihat data</button>
        <button type="button" :class="{ on: mode === 'add' }" @click="startAdd"><i class="mdi mdi-plus-circle-outline"></i> Tambah informasi</button>
      </div>

      <!-- ══ Lihat data ══ -->
      <div v-if="mode === 'view'" class="as-grid">
        <div class="as-col as-col--media">
          <section class="wui-card as-card as-photo-card">
            <img v-if="asset.item?.image" :src="diesImageUrl(asset.item.image)" alt="Foto dies" class="as-photo">
            <div v-else class="as-photo-empty"><i class="mdi mdi-image-off-outline"></i><span>Belum ada foto</span></div>
          </section>
          <section class="wui-card as-card as-qr-card">
            <img v-if="qrSrc" :src="qrSrc" alt="QR aset">
            <span class="wui-mono">{{ asset.asset_code }}</span>
          </section>
        </div>
        <div class="as-col">
        <section class="wui-card as-card as-data">
          <h2>Data item</h2>
          <dl class="as-dl">
            <template v-if="asset.item">
              <dt>Part number</dt><dd class="wui-mono">{{ asset.item.part_number || '—' }}</dd>
              <dt>Die</dt><dd>{{ asset.item.die_no ? `${asset.item.die_no} dari ${asset.item.die_total}` : '—' }}</dd>
              <dt>Proses</dt><dd>{{ asset.item.dies_name || '—' }}</dd>
              <dt>Model</dt><dd>{{ asset.item.master_model || asset.item.model || '—' }}</dd>
              <dt>Line</dt><dd>{{ asset.item.line || '—' }}</dd>
              <dt>Avg pcs / bulan</dt><dd>{{ asset.item.avg_pcs_month ? Number(asset.item.avg_pcs_month).toLocaleString('id-ID') : '—' }}</dd>
              <dt>Material</dt><dd>{{ asset.item.material_mpa ? asset.item.material_mpa + ' MPa' : '—' }}</dd>
              <dt>Frekuensi PM</dt><dd>{{ asset.item.pm_interval_month ? `1× tiap ${asset.item.pm_interval_month} bulan` : '—' }}</dd>
              <dt>Tonnage</dt><dd>{{ asset.item.tonnage_required ? asset.item.tonnage_required + ' T' : '—' }}</dd>
              <dt>Dimensi (P×L×T)</dt><dd>{{ asset.item.dies_length || asset.item.dies_width || asset.item.dies_height ? `${asset.item.dies_length || '?'} × ${asset.item.dies_width || '?'} × ${asset.item.dies_height || '?'} mm` : '—' }}</dd>
            </template>
            <template v-if="asset.parts"><dt>Part</dt><dd>
              <div v-for="p in asset.parts" :key="p.part_number" class="as-part"><span class="wui-mono">{{ p.part_number }}</span> <small>{{ p.part_name }}</small></div>
              <span v-if="!asset.parts.length">—</span>
              <div v-if="asset.item?.pairing_verified_at" class="as-verified"><i class="mdi mdi-check-decagram"></i> Pairing terverifikasi · {{ asset.item.pairing_verified_by }}</div>
              <div v-else-if="asset.parts.length" class="as-unverified"><i class="mdi mdi-shield-alert-outline"></i> Pairing belum diverifikasi</div>
            </dd></template>
            <template v-if="asset.machines"><dt>Mesin</dt><dd>{{ asset.machines.length ? asset.machines.join(', ') : '—' }}</dd></template>
          </dl>
        </section>
        </div>

        <div class="as-col">
        <div class="wui-card as-card as-pm" :class="`as-pm--${pm.state}`">
          <i class="mdi" :class="pm.state === 'ok' ? 'mdi-shield-check' : pm.state === 'overdue' ? 'mdi-alert-octagon' : 'mdi-calendar-clock'"></i>
          <div>
            <strong>{{ PM_STATE[pm.state].label }}</strong>
            <span v-if="pm.due">Jatuh tempo {{ fmtDate(pm.due.toLocaleDateString('sv-SE')) }} · {{ pm.days! < 0 ? `lewat ${-pm.days!} hari` : `${pm.days} hari lagi` }}</span>
            <span v-else-if="pm.state === 'none'">Catat PM pertama lewat Tambah informasi → Preventive Maintenance.</span>
            <span v-else>Frekuensi PM belum diisi.</span>
          </div>
        </div>

        <div class="as-stats">
          <div class="wui-stat"><span class="wui-stat__lbl">PM</span><span class="wui-stat__val">{{ countOf('PM') }}</span><span class="wui-stat__sub">{{ lastOf('PM') }}</span></div>
          <div class="wui-stat"><span class="wui-stat__lbl">Repair</span><span class="wui-stat__val">{{ countOf('REPAIR') }}</span><span class="wui-stat__sub">{{ lastOf('REPAIR') }}</span></div>
          <div class="wui-stat"><span class="wui-stat__lbl">Spare part</span><span class="wui-stat__val">{{ countOf('SPAREPART') }}</span><span class="wui-stat__sub">{{ lastOf('SPAREPART') }}</span></div>
          <div v-if="asset.can_see_cost" class="wui-stat"><span class="wui-stat__lbl">Akumulasi biaya</span><span class="wui-stat__val as-cost">{{ rupiah(totalCost) }}</span><span class="wui-stat__sub">input manual</span></div>
        </div>

        <section class="wui-card as-card as-history">
          <h2>Riwayat <small>{{ asset.activities.length }}</small></h2>
          <div class="wui-seg as-filter">
            <button type="button" :class="{ on: filter === '' }" @click="filter = ''">Semua</button>
            <button v-for="(v, k) in ACTIVITY_LABEL" :key="k" type="button" :class="{ on: filter === k }" @click="filter = k">{{ k === 'SPAREPART' ? 'Spare part' : k === 'PM' ? 'PM' : 'Repair' }}</button>
          </div>
          <ol v-if="history.length" class="as-timeline">
            <li v-for="a in history" :key="a.id">
              <div class="as-tl-head">
                <span class="wui-chip" :class="ACTIVITY_LABEL[a.activity_type].chip"><i class="mdi" :class="ACTIVITY_LABEL[a.activity_type].icon"></i> {{ ACTIVITY_LABEL[a.activity_type].label }}</span>
                <span class="as-date">{{ fmtDate(a.activity_date) }}</span>
              </div>
              <p>{{ a.description }}</p>
              <div class="as-tl-meta">
                <span v-if="a.spare_part"><i class="mdi mdi-cog-outline"></i> {{ a.spare_part }}<template v-if="a.qty"> × {{ Number(a.qty) }}</template></span>
                <span v-if="a.cost"><i class="mdi mdi-cash"></i> {{ rupiah(Number(a.cost)) }}</span>
                <span v-if="a.pic"><i class="mdi mdi-account-hard-hat-outline"></i> {{ a.pic }}</span>
                <span class="as-by">dicatat {{ a.created_by }}</span>
              </div>
            </li>
          </ol>
          <p v-else class="as-empty">Belum ada riwayat{{ filter ? ' untuk jenis ini' : '' }}.</p>
        </section>
        </div>
      </div>

      <!-- ══ Tambah informasi (wajib login) ══ -->
      <form v-else class="wui-card as-card as-form" @submit.prevent="submit">
        <h2>Tambah informasi <small>dicatat sebagai {{ auth.user?.fullname || auth.user?.username }}</small></h2>
        <div class="as-form-grid">
          <div class="as-form-col">
            <div class="as-field">
              <span class="as-lbl">Jenis aktivitas</span>
              <div class="wui-seg as-types">
                <button v-for="(v, k) in ACTIVITY_LABEL" :key="k" type="button" :class="{ on: draft.activity_type === k }" @click="draft.activity_type = k"><i class="mdi" :class="v.icon"></i> {{ v.label }}</button>
              </div>
            </div>
            <label class="as-field"><span class="as-lbl">Tanggal</span><input v-model="draft.activity_date" type="date" class="wui-input" required :max="today"></label>
            <div class="as-row">
              <label class="as-field as-grow"><span class="as-lbl">Spare part</span><input v-model.trim="draft.spare_part" class="wui-input" maxlength="150" placeholder="nama / nomor part"></label>
              <label class="as-field as-qty"><span class="as-lbl">Qty</span><input v-model="draft.qty" type="number" min="0" step="any" class="wui-input"></label>
            </div>
            <div class="as-row">
              <label class="as-field as-grow"><span class="as-lbl">Biaya (Rp)</span><input v-model="draft.cost" type="number" min="0" step="any" class="wui-input"></label>
              <label class="as-field as-grow"><span class="as-lbl">PIC / pelaksana</span><input v-model.trim="draft.pic" class="wui-input" maxlength="100"></label>
            </div>
          </div>
          <label class="as-field as-desc"><span class="as-lbl">Deskripsi <b>*</b></span>
            <textarea v-model.trim="draft.description" class="wui-input as-textarea" required maxlength="2000" placeholder="Apa yang dikerjakan / masalah yang ditemukan"></textarea>
          </label>
        </div>
        <div class="as-actions">
          <button type="button" class="wui-btn" @click="mode = 'view'">Batal</button>
          <button class="wui-btn wui-btn--primary" :disabled="saving"><i class="mdi mdi-content-save" :class="{ 'mdi-spin': saving }"></i> Simpan</button>
        </div>
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import QRCode from 'qrcode'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import assetQrService, { assetUrl, ACTIVITY_LABEL, diesImageUrl, pmStatus, PM_STATE, type ActivityForm, type ActivityType, type AssetDetail } from '@/services/Public/Asset/assetQrService'

const TYPE_LABEL: Record<string, string> = { DIES: 'Dies', JIG: 'Jig', ROBOT: 'Robot Welding', PRESS: 'Mesin Press', WELD: 'Mesin Welding' }

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const code = String(route.params.code ?? '')

const asset = ref<AssetDetail | null>(null)
const loading = ref(true)
const error = ref('')
const qrSrc = ref('')
async function load() {
  try {
    asset.value = await assetQrService.detail(code)
    qrSrc.value = await QRCode.toDataURL(assetUrl(asset.value.asset_code), { width: 480, margin: 1, errorCorrectionLevel: 'M' })
  }
  catch (e: any) { error.value = e?.response?.data?.message ?? 'Gagal memuat aset.' }
  finally { loading.value = false }
}

const rupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID')
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const countOf = (t: ActivityType) => asset.value?.activities.filter(a => a.activity_type === t).length ?? 0
function lastOf(t: ActivityType) {
  const a = asset.value?.activities.find(x => x.activity_type === t)   // urut terbaru dulu
  return a ? 'terakhir ' + fmtDate(a.activity_date) : 'belum ada'
}
const totalCost = computed(() => asset.value?.activities.reduce((s, a) => s + Number(a.cost ?? 0), 0) ?? 0)
// Status PM: PM terakhir (riwayat jenis PM, urut terbaru dulu) + interval bulan dies.
const pm = computed(() => pmStatus(asset.value?.item?.pm_interval_month, asset.value?.activities.find(a => a.activity_type === 'PM')?.activity_date))
const filter = ref<ActivityType | ''>('')
const history = computed(() => asset.value?.activities.filter(a => !filter.value || a.activity_type === filter.value) ?? [])

// ── Tambah informasi ──
const mode = ref<'view' | 'add'>(route.query.mode === 'add' && auth.token ? 'add' : 'view')
const today = new Date().toLocaleDateString('sv-SE')   // YYYY-MM-DD waktu lokal
const blank = (): ActivityForm => ({ activity_type: 'REPAIR', activity_date: today, description: '', spare_part: '', qty: '', cost: '', pic: '' })
const draft = reactive<ActivityForm>(blank())
const saving = ref(false)

function startAdd() {
  if (!auth.token) {
    router.push({ path: '/login', query: { redirect: router.resolve({ name: 'PublicAssetScan', params: { code }, query: { mode: 'add' } }).fullPath } })
    return
  }
  mode.value = 'add'
}
async function submit() {
  saving.value = true
  try {
    const res = await assetQrService.addActivity(code, { ...draft })
    if (!res.success) { alert(res.message); return }
    Object.assign(draft, blank())
    mode.value = 'view'
    await load()
  } catch (e: any) { alert(e?.response?.data?.message ?? 'Gagal menyimpan.') }
  finally { saving.value = false }
}

onMounted(() => {
  if (auth.token && !auth.user?.username) auth.setUserData(auth.token)
  load()
})
</script>

<style scoped>
.as-page { min-height: 100vh; width: 100%; box-sizing: border-box; background: var(--wui-bg); color: var(--wui-text); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
/* Lihat data — HP: 1 kolom; tablet: 2 kolom (media di atas data); desktop: 3 kolom penuh
   (media | data | PM + riwayat) dikunci setinggi layar tanpa scroll halaman. Kartu meregang
   mengisi kolom, baris data disebar rata, riwayat scroll di dalam panelnya. */
.as-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.as-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; min-height: 0; }
.as-col--media { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.as-form { width: 100%; }
/* Form tambah informasi — HP/tablet 1 kolom; desktop 2 kolom (isian | deskripsi) mengisi layar. */
.as-form-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.as-form-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.as-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.as-lbl { font-size: 11.5px; font-weight: 700; color: var(--wui-muted); }
.as-lbl b { color: var(--wui-danger); }
@media (min-width: 1024px) {
  .as-form-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; }
}
@media (min-width: 1200px) {
  .as-form { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .as-form-grid { flex: 1; min-height: 0; }
  .as-desc { min-height: 0; }
  .as-desc .as-textarea { flex: 1; height: auto !important; min-height: 160px; resize: none; }
  .as-form-col { justify-content: flex-start; }
}
.as-photo-card { display: flex; align-items: center; justify-content: center; padding: 8px; min-height: 160px; }
.as-photo-card .as-photo { width: 100%; height: 100%; max-height: none; border: 0; object-fit: contain; }
.as-photo-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--wui-faint); font-size: 12px; }
.as-photo-empty .mdi { font-size: 40px; }
.as-qr-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 10px; }
.as-qr-card img { width: 100%; max-width: 220px; aspect-ratio: 1; background: #fff; padding: 6px; border-radius: 8px; }
.as-qr-card span { font-size: 11px; color: var(--wui-muted); }
@media (min-width: 768px) {
  .as-page { padding: 20px 24px; }
  .as-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
  .as-col--media { grid-column: 1 / -1; }
}
@media (min-width: 1200px) {
  .as-page { height: 100vh; overflow: hidden; }
  .as-grid { flex: 1; min-height: 0; grid-template-columns: minmax(0, 3fr) minmax(0, 4fr) minmax(0, 5fr); align-items: stretch; }
  .as-col--media { grid-column: auto; display: flex; flex-direction: column; }
  .as-photo-card { flex: 1; min-height: 0; }
  .as-qr-card img { max-width: min(220px, 26vh); }
  .as-data { flex: 1; display: flex; flex-direction: column; }
  .as-data .as-dl { flex: 1; align-content: space-evenly; }
  .as-grid .as-stats { grid-template-columns: repeat(2, 1fr); }
  .as-history { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .as-history .as-timeline { flex: 1; min-height: 0; overflow-y: auto; padding-right: 4px; }
  .as-history .as-empty { flex: 1; display: grid; place-items: center; }
}

@media (min-width: 1024px) {
  .as-page { height: 100vh; overflow: hidden; }
  .as-grid { flex: 1; min-height: 0; align-items: stretch; }
  .as-col { overflow-y: auto; }
  .as-history { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .as-history .as-timeline { flex: 1; min-height: 0; overflow-y: auto; padding-right: 4px; }
  .as-grid .as-photo { max-height: 34vh; }
}
.as-status { padding: 40px 16px; text-align: center; color: var(--wui-muted); font-size: 14px; }
.as-status--err { color: var(--wui-danger); }
.as-head { display: flex; align-items: center; gap: 12px; }
.as-head-icon { width: 48px; height: 48px; border-radius: 12px; background: var(--wui-navy-1); color: #fff; display: grid; place-items: center; font-size: 26px; flex-shrink: 0; }
.as-head-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.as-head-text h1 { margin: 0; font-size: 20px; font-weight: 800; line-height: 1.2; word-break: break-word; }
.as-type { font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--wui-muted); }
.as-code { color: var(--wui-accent-text); font-weight: 700; }
.as-mode { width: 100%; height: 40px; }
.as-photo { width: 100%; max-height: 280px; object-fit: contain; border-radius: 12px; border: 1px solid var(--wui-border); background: var(--wui-surface); }
.as-mode button { flex: 1; font-size: 13px; }
.as-card { padding: 14px; }
.as-card h2 { margin: 0 0 10px; font-size: 13px; font-weight: 800; display: flex; align-items: baseline; gap: 6px; }
.as-card h2 small { font-size: 11px; font-weight: 600; color: var(--wui-faint); }
.as-dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 14px; margin: 0; font-size: 13px; }
.as-dl dt { color: var(--wui-muted); font-weight: 600; }
.as-dl dd { margin: 0; word-break: break-word; }
.as-part small { color: var(--wui-muted); }
.as-pm { display: flex; align-items: center; gap: 12px; border-left: 4px solid var(--wui-border-strong); }
.as-pm > .mdi { font-size: 28px; color: var(--wui-faint); }
.as-pm div { display: flex; flex-direction: column; gap: 2px; font-size: 12.5px; color: var(--wui-text-2); }
.as-pm strong { font-size: 15px; color: var(--wui-text); }
.as-pm--ok { border-left-color: #10b981; } .as-pm--ok > .mdi { color: #10b981; }
.as-pm--soon { border-left-color: #f59e0b; } .as-pm--soon > .mdi { color: #f59e0b; }
.as-pm--overdue { border-left-color: #ef4444; } .as-pm--overdue > .mdi { color: #ef4444; }
.as-verified { margin-top: 4px; font-size: 11.5px; font-weight: 700; color: #047857; }
.as-unverified { margin-top: 4px; font-size: 11.5px; font-weight: 600; color: var(--wui-amber); }
:root.dark .as-verified { color: #6ee7b7; }
.as-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.as-cost { font-size: 17px; }
.as-filter { margin-bottom: 10px; max-width: 100%; overflow-x: auto; }
.as-timeline { list-style: none; margin: 0; padding: 0 0 0 14px; border-left: 2px solid var(--wui-border); display: flex; flex-direction: column; gap: 14px; }
.as-timeline li { position: relative; }
.as-timeline li::before { content: ''; position: absolute; left: -20px; top: 5px; width: 10px; height: 10px; border-radius: 50%; background: var(--wui-surface); border: 2px solid var(--wui-primary); }
.as-tl-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.as-date { font-size: 12px; font-weight: 700; color: var(--wui-text-2); }
.as-timeline p { margin: 6px 0 4px; font-size: 13px; white-space: pre-line; }
.as-tl-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 11.5px; color: var(--wui-muted); }
.as-by { color: var(--wui-faint); }
.as-empty { margin: 0; font-size: 13px; color: var(--wui-faint); }
.as-form { display: flex; flex-direction: column; gap: 12px; }
.as-form .wui-input { height: 38px; font-size: 14px; }
.as-textarea { height: 96px !important; padding: 8px 10px; resize: vertical; }
.as-types { height: auto; flex-wrap: wrap; }
.as-types button { flex: 1; padding: 8px 10px; }
.as-row { display: flex; gap: 10px; }
.as-grow { flex: 1; min-width: 0; }
.as-qty { width: 90px; }
.as-actions { display: flex; justify-content: flex-end; gap: 8px; }
.as-actions .wui-btn { height: 38px; }
@media (max-width: 420px) { .as-row { flex-direction: column; } .as-qty { width: auto; } }
</style>
