<!-- components/welding/params/DnCustomerRules.vue
     Aturan DN per customer (ms_dn_rule_customer, 2026-09-25) — bagian dari panel
     "Aturan DN". Tiap baris menimpa aturan global utk 1 customer; field kosong =
     ikut global. Customer tiap kode part = MDFO (zcust) → ms_customer_sap. -->
<template>
  <div class="dcr">
    <div class="dcr-head">
      <p class="dcr-title"><i class="mdi mdi-account-group-outline"></i> Aturan per customer</p>
      <button v-if="!form && !loadFailed" class="dcr-add" @click="startNew"><i class="mdi mdi-plus"></i> Tambah</button>
    </div>
    <p class="dcr-hint">Menimpa aturan global untuk customer tertentu. Kolom kosong = ikut global.</p>
    <p v-if="msg" class="dcr-msg" :class="{ 'dcr-msg--err': msgErr }">{{ msg }}</p>

    <div v-if="loading" class="dcr-state"><i class="mdi mdi-loading mdi-spin"></i> Memuat...</div>
    <table v-else-if="rules.length" class="dcr-table">
      <thead>
        <tr><th>Customer</th><th>Mode</th><th>Day</th><th>Dini hari</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="r in rules" :key="r.id" :class="{ 'dcr-row--off': !Number(r.is_active) }">
          <td>
            <b>{{ r.customer_name }}</b>
            <span v-if="!Number(r.is_active)" class="dcr-off">nonaktif</span>
            <p v-if="r.note" class="dcr-note">{{ r.note }}</p>
          </td>
          <td>{{ r.dn_mode ? MODE_LABEL[r.dn_mode] : inherit(MODE_LABEL[global.mode]) }}</td>
          <td>
            <template v-if="effMode(r) === 'day_only'">—</template>
            <template v-else>{{ r.day_start || inherit(global.start) }} – {{ r.day_end || inherit(global.end) }}</template>
          </td>
          <td>{{ effMode(r) === 'day_only' ? '—' : (r.early_morning ? EARLY_LABEL[r.early_morning] : inherit(EARLY_LABEL[global.early])) }}</td>
          <td class="dcr-act">
            <button title="Ubah" @click="edit(r)"><i class="mdi mdi-pencil-outline"></i></button>
            <button title="Hapus (kembali ikut global)" @click="remove(r)"><i class="mdi mdi-delete-outline"></i></button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!form && !loadFailed" class="dcr-state">Belum ada aturan khusus — semua customer ikut aturan global.</p>

    <!-- Form tambah / ubah -->
    <div v-if="form" class="dcr-form">
      <div class="dcr-grid">
        <label>Customer
          <select v-model="form.customer_name" :disabled="!!form.id">
            <option value="" disabled>Pilih customer…</option>
            <option v-for="c in customerChoices" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
        <label>Mode DN
          <select v-model="form.dn_mode">
            <option :value="null">Ikut global ({{ MODE_LABEL[global.mode] }})</option>
            <option value="shift">Shift (day / night)</option>
            <option value="day_only">Day saja</option>
          </select>
        </label>
        <label>Mulai day <input v-model="form.day_start" type="time" :placeholder="global.start" :disabled="formMode === 'day_only'" /></label>
        <label>Akhir day <input v-model="form.day_end" type="time" :placeholder="global.end" :disabled="formMode === 'day_only'" /></label>
        <label>Kiriman dini hari
          <select v-model="form.early_morning" :disabled="formMode === 'day_only'">
            <option :value="null">Ikut global ({{ EARLY_LABEL[global.early] }})</option>
            <option value="prev_night">Night tanggal sebelumnya</option>
            <option value="same_night">Night tanggal yang sama</option>
          </select>
        </label>
        <label>Catatan <input v-model="form.note" type="text" maxlength="255" placeholder="opsional" /></label>
      </div>
      <p class="dcr-hint">Jam kosong = ikut global ({{ global.start }}–{{ global.end }}).</p>
      <label class="dcr-check"><input v-model="formActive" type="checkbox" /> Aktif</label>
      <div class="dcr-btns">
        <button class="dcr-cancel" :disabled="busy" @click="form = null">Batal</button>
        <button class="dcr-save" :disabled="busy || !form.customer_name" @click="save">
          <i class="mdi" :class="busy ? 'mdi-loading mdi-spin' : 'mdi-content-save-outline'"></i> Simpan aturan customer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePlanningConfig, type DnCustomerRule } from '@/composables/usePlanningConfig'

// Aturan global yang sedang berlaku (dari panel induk) — utk label "ikut global".
const props = defineProps<{ global: { mode: string; start: string; end: string; early: string } }>()

const MODE_LABEL: Record<string, string>  = { shift: 'Shift', day_only: 'Day saja' }
const EARLY_LABEL: Record<string, string> = { prev_night: 'Night tgl sebelumnya', same_night: 'Night tgl sama' }

const { fetchDnCustomerRules, saveDnCustomerRule, deleteDnCustomerRule } = usePlanningConfig()
const rules     = ref<DnCustomerRule[]>([])
const customers = ref<string[]>([])
const loading   = ref(false)
const busy      = ref(false)
const msg       = ref<string | null>(null)
const msgErr    = ref(false)
const form      = ref<DnCustomerRule | null>(null)
const loadFailed = ref(false)

const inherit = (v: string) => `global (${v})`
const effMode = (r: DnCustomerRule) => r.dn_mode ?? props.global.mode
const formMode = computed(() => form.value ? (form.value.dn_mode ?? props.global.mode) : props.global.mode)
const formActive = computed({
  get: () => !!Number(form.value?.is_active ?? 1),
  set: (v: boolean) => { if (form.value) form.value.is_active = v ? 1 : 0 },
})
// Customer yang sudah punya aturan tak ditawarkan lagi saat tambah baru.
const customerChoices = computed(() => {
  const used = new Set(rules.value.map(r => r.customer_name))
  return customers.value.filter(c => !used.has(c) || c === form.value?.customer_name)
})

async function load() {
  loading.value = true; loadFailed.value = false
  try {
    const d = await fetchDnCustomerRules()
    rules.value = d.rules
    customers.value = d.customers
  } catch (e: any) {
    loadFailed.value = true; msgErr.value = true
    msg.value = e?.response?.status === 401
      ? 'Perlu login untuk melihat / mengubah aturan per customer.'
      : (e?.response?.data?.message ?? 'Gagal memuat aturan customer.')
  } finally {
    loading.value = false
  }
}

function startNew() {
  msg.value = null
  form.value = { customer_name: '', dn_mode: null, day_start: null, day_end: null, early_morning: null, note: null, is_active: 1 }
}
function edit(r: DnCustomerRule) {
  msg.value = null
  form.value = { ...r }
}

async function save() {
  if (!form.value) return
  busy.value = true; msg.value = null
  try {
    const res = await saveDnCustomerRule({ ...form.value, day_start: form.value.day_start || null, day_end: form.value.day_end || null })
    msg.value = res.message ?? null; msgErr.value = !res.success
    if (res.success) { form.value = null; await load() }
  } catch (e: any) {
    msg.value = e?.response?.data?.message ?? 'Gagal menyimpan.'; msgErr.value = true
  } finally {
    busy.value = false
  }
}

async function remove(r: DnCustomerRule) {
  if (!r.id || !confirm(`Hapus aturan DN khusus ${r.customer_name}? Customer ini kembali ikut aturan global.`)) return
  try {
    const res = await deleteDnCustomerRule(r.id)
    msg.value = res.message ?? null; msgErr.value = !res.success
    if (res.success) { await load() }
  } catch (e: any) {
    msg.value = e?.response?.data?.message ?? 'Gagal menghapus.'; msgErr.value = true
  }
}

onMounted(load)
</script>

<style scoped>
.dcr { margin-top: 16px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
.dcr-head { display: flex; align-items: center; justify-content: space-between; }
.dcr-title { font-size: 12.5px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 6px; }
.dcr-add { font-size: 11.5px; font-weight: 600; color: #0369a1; border: 1px solid #7dd3fc; background: #f0f9ff; border-radius: 7px; padding: 4px 10px; display: inline-flex; gap: 4px; align-items: center; }
.dcr-add:hover { background: #e0f2fe; }
.dcr-hint { font-size: 10.5px; color: #94a3b8; margin: 3px 0 8px; }
.dcr-state { font-size: 11.5px; color: #64748b; padding: 8px 0; }
.dcr-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
.dcr-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
.dcr-table td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; }
.dcr-row--off td { opacity: .55; }
.dcr-off { margin-left: 6px; font-size: 9.5px; padding: 1px 6px; border-radius: 9999px; background: #f1f5f9; color: #64748b; }
.dcr-note { font-size: 10.5px; color: #94a3b8; margin-top: 2px; }
.dcr-act { white-space: nowrap; text-align: right; }
.dcr-act button { width: 26px; height: 26px; border-radius: 6px; color: #64748b; }
.dcr-act button:hover { background: #f1f5f9; color: #0f172a; }
.dcr-form { margin-top: 10px; padding: 12px; border: 1px solid #bae6fd; background: #f8fbff; border-radius: 10px; }
.dcr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.dcr-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 10.5px; font-weight: 600; color: #475569; }
.dcr-grid select, .dcr-grid input { height: 32px; border: 1px solid #cbd5e1; border-radius: 7px; padding: 0 8px; font-size: 12px; font-weight: 500; color: #0f172a; background: white; }
.dcr-grid select:disabled, .dcr-grid input:disabled { background: #f1f5f9; color: #94a3b8; }
.dcr-check { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: #334155; margin-top: 4px; }
.dcr-msg { margin-top: 8px; font-size: 11.5px; color: #047857; }
.dcr-msg--err { color: #dc2626; }
.dcr-btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
.dcr-cancel { height: 32px; padding: 0 14px; border: 1px solid #e2e8f0; border-radius: 7px; font-size: 12px; color: #64748b; background: white; }
.dcr-save { height: 32px; padding: 0 16px; border-radius: 7px; font-size: 12px; font-weight: 700; color: white; background: #0284c7; display: inline-flex; align-items: center; gap: 5px; }
.dcr-save:disabled { opacity: .5; cursor: not-allowed; }
</style>
