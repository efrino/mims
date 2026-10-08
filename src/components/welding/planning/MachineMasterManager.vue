<template>
  <!-- components/welding/planning/MachineMasterManager.vue
       Aturan #8 — master identitas mesin (area+machine unik) + TPT cap per mesin.
       Sumber kebenaran grouping utk Utilisasi Mesin, Kompetisi Mesin, dropdown
       "Mesin" di Buffer Mesin OFF, dan (2026-09-15) HIERARKI mesin:
         INHOUSE ─ PRESS   ─ A..H, SP ─ 1,2,3.. / 80T,110T,150T,300T
                 └ WELDING ─ WSS ADM, SA ADM, … ─ A,B / RSW ─ 1,2,3..
       Kode `machine` ("A1", "RSW11") tetap kunci yg dipakai engine/routing —
       grup/nomor hanya label di atasnya. Tampilan = tree editor: Process → Area
       → Grup → Mesin. Prop `area` (dari Utilisasi Mesin) → tree dibatasi 1 area. -->
  <div class="mm-wrap">
    <div class="section-header">
      <i class="ti ti-hierarchy-2" />
      <div style="flex:1;min-width:0">
        <div class="section-title">Master Mesin &amp; TPT Cap</div>
        <div class="section-desc">
          Hierarki <strong>Proses → Area/Line → Grup → Mesin</strong>. Klik grup untuk buka/tutup,
          klik <i class="ti ti-pencil" /> untuk ubah grup/nomor/kapasitas, <i class="ti ti-replace" /> untuk
          ganti kode mesin (ikut merambat ke part, routing &amp; denah — kalau kode baru sudah ada, dilebur).
        </div>
      </div>
      <div class="mm-head-actions">
        <button class="btn" :disabled="busy" @click="onDerive" title="Isi grup/nomor yg masih kosong dari pola kode & denah PRESS">
          <i :class="deriving ? 'ti ti-loader-2 spin' : 'ti ti-wand'" /> Auto-grup
        </button>
        <button class="btn" :disabled="busy" @click="onSeed" title="Tambah mesin yg dipakai part/routing tapi belum ada di master">
          <i :class="seeding ? 'ti ti-loader-2 spin' : 'ti ti-seeding'" /> Seed
        </button>
        <button class="btn btn--primary" :disabled="busy" @click="openAdd()">
          <i class="ti ti-plus" /> Tambah Mesin
        </button>
      </div>
    </div>

    <div class="mm-toolbar">
      <label class="mm-check"><input type="checkbox" v-model="showInactive" /> tampilkan nonaktif</label>
      <input v-model.trim="q" type="search" class="mm-search" placeholder="cari kode / nama mesin…" />
      <span class="mm-count">{{ totalMachines }} mesin</span>
    </div>

    <div v-if="loading" class="mm-cell-msg"><i class="ti ti-loader-2 spin" /> Memuat…</div>
    <div v-else-if="!filteredTree.length" class="mm-cell-msg">Belum ada mesin{{ props.area ? ' untuk area ' + props.area : '' }}. Klik <strong>Seed</strong> untuk mengisi dari data part/routing.</div>

    <div v-else class="mm-tree">
      <section v-for="p in filteredTree" :key="p.process" class="mm-proc">
        <header class="mm-proc-head">
          <i :class="p.process === 'PRESS' ? 'ti ti-stack-2' : p.process === 'WELDING' ? 'ti ti-bolt' : 'ti ti-box'" />
          {{ PROCESS_LABEL[p.process] ?? p.process }}
          <span class="mm-badge">{{ countProcess(p) }}</span>
        </header>

        <div v-for="a in p.areas" :key="a.area" class="mm-area">
          <header class="mm-area-head">
            <i class="ti ti-map-pin" /> {{ a.area }}
            <span class="mm-badge mm-badge--soft">{{ countArea(a) }}</span>
          </header>

          <div class="mm-groups">
            <div v-for="g in a.groups" :key="g.group" class="mm-group" :class="{ 'mm-group--open': isOpen(a.area, g.group) }">
              <button type="button" class="mm-group-head" @click="toggleGroup(a.area, g.group)">
                <i class="ti" :class="isOpen(a.area, g.group) ? 'ti-chevron-down' : 'ti-chevron-right'" />
                <span class="mm-group-name">{{ g.group === '-' ? '(tanpa grup)' : g.group }}</span>
                <span class="mm-group-chips">
                  <span v-for="m in g.machines" :key="m.id" class="mm-chip" :class="{ 'mm-chip--off': !m.is_active }" :title="m.machine">{{ m.machine_no ?? m.machine }}</span>
                </span>
              </button>

              <table v-if="isOpen(a.area, g.group)" class="mm-table">
                <thead>
                  <tr><th>No</th><th>Kode</th><th>Nama</th><th>Cap Day</th><th>Cap Night</th><th>Catatan</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  <tr v-for="m in g.machines" :key="m.id" :class="{ 'mm-row--off': !m.is_active }">
                    <td class="mm-mono">{{ m.machine_no ?? '—' }}</td>
                    <td class="mm-mono mm-code">{{ m.machine }}</td>
                    <td>{{ m.machine_name || '—' }}</td>
                    <td>{{ m.tpt_cap_day_hours }} jam</td>
                    <td>{{ m.tpt_cap_night_hours }} jam</td>
                    <td class="mm-reason">{{ m.note || '—' }}</td>
                    <td>
                      <button class="mm-toggle" :class="m.is_active ? 'is-on' : 'is-off'" :disabled="busy" @click="onToggle(m)">
                        {{ m.is_active ? 'Aktif' : 'Nonaktif' }}
                      </button>
                    </td>
                    <td class="mm-actions">
                      <button class="mm-icon-btn" :disabled="busy" title="Edit grup / nomor / kapasitas" @click="openEdit(m)"><i class="ti ti-pencil" /></button>
                      <button class="mm-icon-btn" :disabled="busy" title="Ganti kode mesin (merambat ke part/routing/denah)" @click="openRename(m)"><i class="ti ti-replace" /></button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>

    <p v-if="error" class="mm-error"><i class="ti ti-alert-circle" /> {{ error }}</p>
    <p v-else-if="saveMsg" class="mm-ok"><i class="ti ti-circle-check" /> {{ saveMsg }}</p>

    <!-- Form tambah / edit -->
    <div v-if="formOpen" class="mm-modal-overlay" @click.self="closeForm">
      <div class="mm-modal">
        <div class="mm-modal-head">
          <strong>{{ editingId ? 'Edit Mesin ' + form.machine : 'Tambah Mesin' }}</strong>
          <button class="mm-icon-btn" @click="closeForm"><i class="ti ti-x" /></button>
        </div>
        <div class="mm-form-grid">
          <label class="mm-field">
            <span>Proses</span>
            <select v-model="form.process" :disabled="!!editingId">
              <option value="WELDING">Welding</option>
              <option value="PRESS">Press</option>
              <option value="OTHER">Lainnya</option>
            </select>
          </label>
          <label class="mm-field">
            <span>Area / Line <b>*</b></span>
            <select v-model="form.area_code" :disabled="!!editingId">
              <option value="">— pilih area —</option>
              <option v-for="a in areaOptions" :key="a" :value="a">{{ a }}</option>
            </select>
          </label>
          <label class="mm-field">
            <span>Grup</span>
            <input v-model.trim="form.line_group" type="text" list="mm-group-list" placeholder="mis. A / RSW / SP" />
            <datalist id="mm-group-list"><option v-for="g in groupSuggest" :key="g" :value="g" /></datalist>
          </label>
          <label class="mm-field">
            <span>Nomor</span>
            <input v-model.trim="form.machine_no" type="text" placeholder="mis. 1 / 300T" />
          </label>
          <label class="mm-field">
            <span>Kode mesin <b>*</b> <small class="hint">(dipakai engine/routing)</small></span>
            <input v-model.trim="form.machine" type="text" :disabled="!!editingId" placeholder="mis. RSW12 / A1 / 150T SP" />
          </label>
          <label class="mm-field">
            <span>Nama (opsional)</span>
            <input v-model="form.machine_name" type="text" placeholder="label deskriptif, mis. ABB-1" />
          </label>
          <label class="mm-field">
            <span>TPT Cap Day (jam)</span>
            <input v-model.number="form.tpt_cap_day_hours" type="number" step="0.1" min="0" />
          </label>
          <label class="mm-field">
            <span>TPT Cap Night (jam)</span>
            <input v-model.number="form.tpt_cap_night_hours" type="number" step="0.1" min="0" />
          </label>
          <label class="mm-field mm-field--wide">
            <span>Catatan</span>
            <input v-model="form.note" type="text" placeholder="opsional" />
          </label>
        </div>
        <p v-if="!editingId && form.machine" class="mm-hint">
          Grup/nomor otomatis dari kode: <strong>{{ autoSplit.group ?? '—' }}</strong> / <strong>{{ autoSplit.no ?? '—' }}</strong> (boleh ditimpa di atas).
        </p>
        <div class="mm-modal-foot">
          <button class="btn" :disabled="saving" @click="closeForm">Batal</button>
          <button class="btn btn--primary" :disabled="saving || !canSubmit" @click="onSubmit">
            <i :class="saving ? 'ti ti-loader-2 spin' : 'ti ti-device-floppy'" /> {{ editingId ? 'Simpan' : 'Tambah' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Rename / merge -->
    <div v-if="renameTarget" class="mm-modal-overlay" @click.self="renameTarget = null">
      <div class="mm-modal mm-modal--sm">
        <div class="mm-modal-head">
          <strong>Ganti kode mesin</strong>
          <button class="mm-icon-btn" @click="renameTarget = null"><i class="ti ti-x" /></button>
        </div>
        <p class="mm-hint">
          <span class="mm-mono">{{ renameTarget.area_code }} / {{ renameTarget.machine }}</span> →
          kode baru. Semua part (<code>ms_welding.machine</code>), routing dan denah yang memakai kode lama
          ikut diganti. Kalau kode baru <strong>sudah ada</strong> di area ini, mesin ini <strong>dilebur</strong> ke sana.
        </p>
        <label class="mm-field">
          <span>Kode baru <b>*</b></span>
          <input v-model.trim="renameValue" type="text" list="mm-rename-list" placeholder="mis. E1 / RCO7" @keyup.enter="onRename" />
          <datalist id="mm-rename-list"><option v-for="c in renameSuggest" :key="c" :value="c" /></datalist>
        </label>
        <p v-if="renameExists" class="mm-hint mm-hint--warn"><i class="ti ti-alert-triangle" /> Kode <strong>{{ renameValue }}</strong> sudah ada di {{ renameTarget.area_code }} — akan dilebur (merge).</p>
        <div class="mm-modal-foot">
          <button class="btn" :disabled="saving" @click="renameTarget = null">Batal</button>
          <button class="btn btn--primary" :disabled="saving || !renameValue || renameValue === renameTarget.machine" @click="onRename">
            <i :class="saving ? 'ti ti-loader-2 spin' : 'ti ti-replace'" /> {{ renameExists ? 'Lebur' : 'Ganti' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useWeldingAreas } from '@/composables/useWeldingAreas'
import machineMasterService, { type WeldingMachineRow, type MachineTreeProcess, type MachineProcess } from '@/services/Public/Welding/machineMasterService'

const props = defineProps<{ area?: string | null }>()
const emit = defineEmits<{ changed: [] }>()

const PROCESS_LABEL: Record<string, string> = { PRESS: 'PRESS', WELDING: 'WELDING', OTHER: 'LAINNYA' }
// Area aktif master Area & Mesin (ms_welding_area)
const { zones: WELDING_AREAS, load: loadAreas } = useWeldingAreas()
loadAreas()
const PRESS_AREAS   = ['INHOUSE']

const tree = ref<MachineTreeProcess[]>([])
const loading = ref(false)
const saving = ref(false)
const seeding = ref(false)
const deriving = ref(false)
const error = ref<string | null>(null)
const saveMsg = ref<string | null>(null)
const showInactive = ref(false)
const q = ref('')
const busy = computed(() => saving.value || seeding.value || deriving.value || loading.value)

// ── Tree ─────────────────────────────────────────────────────────
const openGroups = ref<Set<string>>(new Set())
const gk = (area: string, group: string) => `${area}::${group}`
function isOpen(area: string, group: string) { return openGroups.value.has(gk(area, group)) }
function toggleGroup(area: string, group: string) {
  const k = gk(area, group)
  const s = new Set(openGroups.value)
  s.has(k) ? s.delete(k) : s.add(k)
  openGroups.value = s
}

const filteredTree = computed<MachineTreeProcess[]>(() => {
  const needle = q.value.toLowerCase()
  const out: MachineTreeProcess[] = []
  for (const p of tree.value) {
    const areas = []
    for (const a of p.areas) {
      if (props.area && a.area !== props.area) continue
      const groups = []
      for (const g of a.groups) {
        const machines = g.machines.filter(m =>
          (showInactive.value || m.is_active) &&
          (!needle || m.machine.toLowerCase().includes(needle) || (m.machine_name ?? '').toLowerCase().includes(needle))
        )
        if (machines.length) groups.push({ ...g, machines })
      }
      if (groups.length) areas.push({ ...a, groups })
    }
    if (areas.length) out.push({ ...p, areas })
  }
  return out
})
const countArea = (a: { groups: { machines: unknown[] }[] }) => a.groups.reduce((n, g) => n + g.machines.length, 0)
const countProcess = (p: { areas: { groups: { machines: unknown[] }[] }[] }) => p.areas.reduce((n, a) => n + countArea(a), 0)
const totalMachines = computed(() => filteredTree.value.reduce((n, p) => n + countProcess(p), 0))

const allRows = computed<WeldingMachineRow[]>(() => tree.value.flatMap(p => p.areas.flatMap(a => a.groups.flatMap(g => g.machines))))

async function reload() {
  error.value = null
  loading.value = true
  try {
    const res = await machineMasterService.tree(false)
    tree.value = res.data ?? []
    // Area tunggal (Utilisasi Mesin) → langsung buka semua grupnya; tree penuh → tertutup.
    if (props.area) {
      const s = new Set<string>()
      for (const p of tree.value) for (const a of p.areas) if (a.area === props.area) for (const g of a.groups) s.add(gk(a.area, g.group))
      openGroups.value = s
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Gagal memuat master mesin.'
  } finally {
    loading.value = false
  }
}

// ── Form tambah / edit ───────────────────────────────────────────
const formOpen = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  process: 'WELDING' as MachineProcess,
  area_code: '',
  machine: '',
  line_group: '',
  machine_no: '',
  machine_name: '',
  tpt_cap_day_hours: 11,
  tpt_cap_night_hours: 10,
  note: '',
})
const areaOptions = computed(() => {
  const known = new Set(allRows.value.map(r => r.area_code))
  const base = form.process === 'WELDING' ? WELDING_AREAS.value : form.process === 'PRESS' ? PRESS_AREAS : []
  for (const a of known) {
    const r = allRows.value.find(x => x.area_code === a)
    if (r && (r.process ?? 'OTHER') === form.process && !base.includes(a)) base.push(a)
  }
  return base
})
const groupSuggest = computed(() => Array.from(new Set(allRows.value.filter(r => r.area_code === form.area_code && r.line_group).map(r => r.line_group as string))))
// Cermin M_welding_machine::split_code — hanya utk pratinjau di form.
function splitCode(code: string): { group: string | null; no: string | null } {
  const m = code.toUpperCase().trim()
  let x = m.match(/^(\d+T)(?:\s+SP)?$/); if (x) return { group: 'SP', no: x[1] }
  x = m.match(/^([A-Z]+)\s*-?\s*0*(\d+)$/); if (x) return { group: x[1], no: x[2] }
  return { group: m || null, no: null }
}
const autoSplit = computed(() => splitCode(form.machine))
const canSubmit = computed(() => !!form.area_code && !!form.machine)

function openAdd() {
  editingId.value = null
  form.process = props.area ? (WELDING_AREAS.value.includes(props.area) ? 'WELDING' : 'PRESS') : 'WELDING'
  form.area_code = props.area ?? ''
  form.machine = ''; form.line_group = ''; form.machine_no = ''; form.machine_name = ''; form.note = ''
  form.tpt_cap_day_hours = 11; form.tpt_cap_night_hours = 10
  formOpen.value = true
}
function openEdit(m: WeldingMachineRow) {
  editingId.value = m.id
  form.process = m.process ?? 'OTHER'
  form.area_code = m.area_code
  form.machine = m.machine
  form.line_group = m.line_group ?? ''
  form.machine_no = m.machine_no ?? ''
  form.machine_name = m.machine_name ?? ''
  form.tpt_cap_day_hours = Number(m.tpt_cap_day_hours)
  form.tpt_cap_night_hours = Number(m.tpt_cap_night_hours)
  form.note = m.note ?? ''
  formOpen.value = true
}
function closeForm() { formOpen.value = false }

async function onSubmit() {
  if (!canSubmit.value) return
  saving.value = true; error.value = null; saveMsg.value = null
  try {
    if (editingId.value) {
      const res = await machineMasterService.update(editingId.value, {
        line_group: form.line_group || null,
        machine_no: form.machine_no || null,
        machine_name: form.machine_name || null,
        tpt_cap_day_hours: form.tpt_cap_day_hours,
        tpt_cap_night_hours: form.tpt_cap_night_hours,
        note: form.note || null,
      })
      saveMsg.value = res.message ?? 'Mesin diperbarui.'
    } else {
      const res = await machineMasterService.store({
        area_code: form.area_code,
        process: form.process,
        machine: form.machine,
        line_group: form.line_group || null,
        machine_no: form.machine_no || null,
        machine_name: form.machine_name || null,
        tpt_cap_day_hours: form.tpt_cap_day_hours,
        tpt_cap_night_hours: form.tpt_cap_night_hours,
        note: form.note || null,
      })
      if (res.status !== 'success') throw new Error(res.message)
      saveMsg.value = res.message ?? 'Mesin ditambahkan.'
      openGroups.value = new Set([...openGroups.value, gk(form.area_code, form.line_group || autoSplit.value.group || '-')])
    }
    formOpen.value = false
    await reload()
    emit('changed')
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? 'Gagal menyimpan mesin.'
  } finally {
    saving.value = false
  }
}

async function onToggle(m: WeldingMachineRow) {
  saving.value = true
  try {
    await machineMasterService.toggleActive(m.id)
    await reload()
    emit('changed')
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Gagal ubah status.'
  } finally {
    saving.value = false
  }
}

// ── Rename / merge ───────────────────────────────────────────────
const renameTarget = ref<WeldingMachineRow | null>(null)
const renameValue = ref('')
const renameSuggest = computed(() => renameTarget.value ? allRows.value.filter(r => r.area_code === renameTarget.value!.area_code && r.id !== renameTarget.value!.id).map(r => r.machine) : [])
const renameExists = computed(() => !!renameTarget.value && renameSuggest.value.includes(renameValue.value))
function openRename(m: WeldingMachineRow) { renameTarget.value = m; renameValue.value = '' }
async function onRename() {
  if (!renameTarget.value || !renameValue.value) return
  if (renameExists.value && !confirm(`Lebur ${renameTarget.value.machine} ke ${renameValue.value}? Part/routing/denah yang memakai ${renameTarget.value.machine} akan dialihkan.`)) return
  saving.value = true; error.value = null; saveMsg.value = null
  try {
    const res = await machineMasterService.rename(renameTarget.value.id, renameValue.value)
    if (res.status !== 'success') throw new Error(res.message)
    const c = res.result?.cascade ?? {}
    saveMsg.value = `${res.message} Ikut diubah: part ${c.ms_welding ?? 0}, routing ${c.ms_welding_route ?? 0}, denah ${c.ms_line_machine_map ?? 0}.`
    renameTarget.value = null
    await reload()
    emit('changed')
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? 'Gagal mengganti kode.'
  } finally {
    saving.value = false
  }
}

// ── Seed & auto-grup ─────────────────────────────────────────────
async function onSeed() {
  seeding.value = true; error.value = null; saveMsg.value = null
  try {
    const res = await machineMasterService.seed()
    saveMsg.value = `Seed selesai: ${res.inserted} mesin baru, ${res.skipped} sudah ada.`
    if (res.inserted) await machineMasterService.deriveGroups(false)
    await reload()
    emit('changed')
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Gagal menjalankan seed.'
  } finally {
    seeding.value = false
  }
}
async function onDerive() {
  deriving.value = true; error.value = null; saveMsg.value = null
  try {
    const res = await machineMasterService.deriveGroups(false)
    saveMsg.value = `Auto-grup: ${res.updated} mesin diisi grup/nomor.`
    await reload()
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Gagal auto-grup.'
  } finally {
    deriving.value = false
  }
}

onMounted(reload)
watch(() => props.area, () => reload())
</script>

<style scoped>
.mm-wrap { display: flex; flex-direction: column; gap: 1rem; }

.section-header { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
.section-header > i { font-size: 20px; color: var(--color-primary, #6366f1); margin-top: 2px; }
.section-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.section-desc  { font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; line-height: 1.5; max-width: 760px; }
.mm-head-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.mm-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--color-text-secondary); }
.mm-check { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.mm-search { padding: 6px 10px; font-size: 13px; border: 0.5px solid var(--color-border-secondary); border-radius: var(--border-radius-md); background: var(--color-background-secondary); color: var(--color-text-primary); min-width: 220px; }
.mm-count { margin-left: auto; }

.mm-tree { display: flex; flex-direction: column; gap: 14px; }
.mm-proc { border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); overflow: hidden; }
.mm-proc-head { display: flex; align-items: center; gap: 8px; padding: 10px 14px; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; background: var(--color-background-secondary); color: var(--color-text-primary); }
.mm-area { border-top: 0.5px solid var(--color-border-tertiary); }
.mm-area-head { display: flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.mm-badge { font-size: 10px; font-weight: 600; padding: 1px 7px; border-radius: 999px; background: var(--color-text-primary); color: var(--color-background-primary); }
.mm-badge--soft { background: var(--color-background-secondary); color: var(--color-text-secondary); border: 0.5px solid var(--color-border-tertiary); }

.mm-groups { display: flex; flex-direction: column; gap: 4px; padding: 0 14px 10px 30px; }
.mm-group { border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-md); overflow: hidden; }
.mm-group--open { border-color: var(--color-primary, #6366f1); }
.mm-group-head { width: 100%; display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: var(--color-background-primary); border: none; cursor: pointer; text-align: left; color: var(--color-text-primary); font-size: 13px; }
.mm-group-head:hover { background: var(--color-background-secondary); }
.mm-group-name { font-weight: 700; min-width: 56px; font-family: ui-monospace, monospace; }
.mm-group-chips { display: flex; gap: 4px; flex-wrap: wrap; }
.mm-chip { font-size: 10.5px; font-family: ui-monospace, monospace; padding: 1px 6px; border-radius: 4px; background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); color: var(--color-text-secondary); }
.mm-chip--off { opacity: 0.4; text-decoration: line-through; }

.mm-table { width: 100%; border-collapse: collapse; font-size: 13px; border-top: 0.5px solid var(--color-border-tertiary); }
.mm-table thead th { text-align: left; padding: 7px 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-secondary); background: var(--color-background-secondary); white-space: nowrap; }
.mm-table tbody td { padding: 7px 10px; border-top: 0.5px solid var(--color-border-tertiary); color: var(--color-text-primary); }
.mm-table tbody tr:hover { background: var(--color-background-secondary); }
.mm-row--off { opacity: 0.5; }
.mm-mono { font-family: ui-monospace, monospace; font-size: 12px; }
.mm-code { font-weight: 700; }
.mm-reason { color: var(--color-text-secondary); }
.mm-cell-msg { text-align: center; padding: 1.5rem; color: var(--color-text-tertiary); font-size: 13px; }

.mm-toggle { padding: 2px 10px; font-size: 11px; font-weight: 600; border-radius: 10px; border: none; cursor: pointer; }
.mm-toggle.is-on  { background: var(--color-background-success, #dcfce7); color: var(--color-text-success, #16a34a); }
.mm-toggle.is-off { background: var(--color-background-secondary); color: var(--color-text-tertiary); }
.mm-actions { text-align: right; white-space: nowrap; }
.mm-icon-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px; color: var(--color-text-tertiary); }
.mm-icon-btn:hover { color: var(--color-primary, #6366f1); background: var(--color-background-secondary); }

.mm-error { color: var(--color-text-danger, #dc2626); font-size: 13px; display: flex; align-items: center; gap: 6px; }
.mm-ok    { color: var(--color-text-success, #16a34a); font-size: 13px; display: flex; align-items: center; gap: 6px; }

/* modal (scoped — tidak mewarisi dari halaman lain) */
.mm-modal-overlay { position: fixed; inset: 0; z-index: 99990; background: rgba(15, 23, 42, 0.5); display: flex; align-items: center; justify-content: center; padding: 16px; }
.mm-modal { background: var(--color-background-primary, #fff); border-radius: 12px; width: min(720px, 100%); padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
.mm-modal--sm { width: min(460px, 100%); }
.mm-modal-head { display: flex; align-items: center; justify-content: space-between; font-size: 14px; color: var(--color-text-primary); }
.mm-modal-foot { display: flex; justify-content: flex-end; gap: 8px; }
.mm-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.mm-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.mm-field > span { color: var(--color-text-secondary); font-weight: 500; }
.mm-field > span b { color: #dc2626; }
.mm-field .hint { font-weight: 400; color: var(--color-text-tertiary); }
.mm-field--wide { grid-column: 1 / -1; }
.mm-field select, .mm-field input { padding: 7px 9px; font-size: 13px; border: 0.5px solid var(--color-border-secondary); border-radius: var(--border-radius-md); background: var(--color-background-secondary); color: var(--color-text-primary); outline: none; }
.mm-field select:focus, .mm-field input:focus { border-color: var(--color-primary, #6366f1); }
.mm-field input:disabled, .mm-field select:disabled { opacity: 0.6; }
.mm-hint { font-size: 12px; color: var(--color-text-secondary); margin: 0; line-height: 1.5; }
.mm-hint--warn { color: #b45309; }

.btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; font-size: 13px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border-secondary); cursor: pointer; background: var(--color-background-primary); color: var(--color-text-primary); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn--primary { background: var(--color-text-primary); color: var(--color-background-primary); border-color: transparent; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
