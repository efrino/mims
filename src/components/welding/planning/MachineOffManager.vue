<template>
  <!-- components/welding/planning/MachineOffManager.vue -->
  <div class="mo-wrap">

    <div class="section-header">
      <i class="ti ti-engine" />
      <div>
        <div class="section-title">Mesin OFF &amp; Buffer Produksi</div>
        <div class="section-desc">
          Daftarkan hari/shift mesin <strong>MATI</strong> (relokasi robot, maintenance).
          Saat mesin OFF, produksi shift itu = 0 tapi pengiriman tetap jalan — engine
          otomatis <strong>menumpuk buffer</strong> beberapa hari sebelumnya (tetap dibatasi
          TPT cap 11 jam Day / 10 jam Night). Satu area berisi beberapa mesin robot;
          kosongkan <em>Mesin</em> untuk mematikan seluruh area.
        </div>
      </div>
    </div>

    <!-- Tabel belum dibuat -->
    <div v-if="!tableReady" class="mo-ddl">
      <i class="ti ti-database-off" />
      <div>
        <p><strong>Tabel <code>planning_machine_off</code> belum ada.</strong> Jalankan DDL ini di server 67:</p>
        <pre class="mo-ddl-code">{{ DDL_SQL }}</pre>
      </div>
    </div>

    <template v-else>
      <!-- Form tambah -->
      <div class="mo-form">
        <div class="mo-form-grid">
          <label class="mo-field">
            <span>Area <b>*</b></span>
            <select v-model="form.area_code" @change="onAreaChange">
              <option value="">— pilih area —</option>
              <option v-for="a in AREAS" :key="a" :value="a">{{ a }}</option>
            </select>
          </label>

          <label class="mo-field">
            <span>Mesin</span>
            <select v-model="form.machine">
              <option value="">(semua mesin di area)</option>
              <!-- bertingkat: Grup (A/B/RSW/SP) → mesin, ikut hierarki Master Mesin -->
              <optgroup v-for="g in machineGroupsForArea" :key="g.group" :label="g.group">
                <option v-for="m in g.machines" :key="m.machine" :value="m.machine">
                  {{ m.machine }} · {{ m.part_count }} part
                </option>
              </optgroup>
            </select>
          </label>

          <label class="mo-field">
            <span>Part (opsional)</span>
            <input v-model="form.part_number" type="text" placeholder="kosong = semua part" />
          </label>

          <label class="mo-field">
            <span>Shift</span>
            <select v-model="form.shift">
              <option value="both">Day &amp; Night</option>
              <option value="day">Day saja</option>
              <option value="night">Night saja</option>
            </select>
          </label>

          <label class="mo-field">
            <span>Tanggal mulai <b>*</b></span>
            <input v-model="form.off_date_start" type="date" />
          </label>

          <label class="mo-field">
            <span>Tanggal selesai</span>
            <input v-model="form.off_date_end" type="date" />
          </label>

          <label class="mo-field mo-field--wide">
            <span>Alasan</span>
            <input v-model="form.reason" type="text" placeholder="mis. relokasi robot" />
          </label>
        </div>

        <div class="mo-form-actions">
          <span class="mo-hint">
            <i class="ti ti-info-circle" />
            Tanggal selesai kosong = 1 hari saja. Rentang membuat 1 baris/hari.
          </span>
          <button class="btn btn--primary" :disabled="saving || !canSubmit" @click="onAdd">
            <i :class="saving ? 'ti ti-loader-2 spin' : 'ti ti-plus'" />
            Tambah OFF
          </button>
        </div>
      </div>

      <!-- Daftar -->
      <div class="mo-table-wrap">
        <table class="mo-table">
          <thead>
            <tr>
              <th>Area</th><th>Mesin</th><th>Part</th>
              <th>Tanggal</th><th>Shift</th><th>Alasan</th>
              <th>Status</th><th>Oleh</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="mo-cell-msg"><i class="ti ti-loader-2 spin" /> Memuat…</td>
            </tr>
            <tr v-else-if="!machineOffList.length">
              <td colspan="9" class="mo-cell-msg">Belum ada jadwal mesin OFF untuk periode ini.</td>
            </tr>
            <tr v-for="r in machineOffList" :key="r.id" :class="{ 'mo-row--off': !r.is_active }">
              <td>{{ r.area_code }}</td>
              <td>{{ r.machine || '— semua —' }}</td>
              <td class="mo-mono">{{ r.part_number || '— semua —' }}</td>
              <td class="mo-mono">{{ fmtDate(r.off_date) }}</td>
              <td>
                <span class="mo-shift" :class="`mo-shift--${r.shift}`">{{ shiftLabel(r.shift) }}</span>
              </td>
              <td class="mo-reason">{{ r.reason || '—' }}</td>
              <td>
                <button class="mo-toggle" :class="r.is_active ? 'is-on' : 'is-off'"
                  :disabled="saving" @click="onToggle(r)" :title="r.is_active ? 'Aktif — klik untuk nonaktifkan' : 'Nonaktif — klik untuk aktifkan'">
                  {{ r.is_active ? 'Aktif' : 'Nonaktif' }}
                </button>
              </td>
              <td class="mo-by">{{ r.created_by || '—' }}</td>
              <td class="mo-actions">
                <button class="mo-icon-btn mo-icon-btn--danger" :disabled="saving" @click="onDelete(r)" title="Hapus">
                  <i class="ti ti-trash" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="error" class="mo-error"><i class="ti ti-alert-circle" /> {{ error }}</p>
      <p v-else-if="saveMsg" class="mo-ok"><i class="ti ti-circle-check" /> {{ saveMsg }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { usePlanningConfig, type MachineRow } from '@/composables/usePlanningConfig'
import { useWeldingAreas } from '@/composables/useWeldingAreas'

const props = defineProps<{
  year: number
  month: number
  area?: string | null
}>()

const emit = defineEmits<{ changed: [] }>()

const {
  machineOffList, machineList, machineOffTableReady,
  loading, saving, error, saveMsg,
  fetchMachineOff, fetchMachines, addMachineOff, updateMachineOff, deleteMachineOff,
  clearMessages,
} = usePlanningConfig()

const tableReady = machineOffTableReady

// Area aktif master Area & Mesin (ms_welding_area)
const { zones: AREAS, load: loadAreas } = useWeldingAreas()
loadAreas()

const DDL_SQL = `CREATE TABLE IF NOT EXISTS majsf_andon_welding.planning_machine_off (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  area_code   VARCHAR(20)  NOT NULL,
  machine     VARCHAR(30)  NULL,
  part_number VARCHAR(30)  NULL,
  off_date    DATE         NOT NULL,
  shift       VARCHAR(10)  NOT NULL DEFAULT 'both',
  reason      VARCHAR(100) NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_by  VARCHAR(50)  NULL,
  created_at  DATETIME     NULL DEFAULT NULL,
  UNIQUE KEY uq_pmo (area_code, machine, part_number, off_date, shift)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO majsf_andon_welding.planning_config (config_key, config_value)
VALUES ('buffer_prebuild_days','5')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);`

const form = reactive({
  area_code: '',
  machine: '',
  part_number: '',
  shift: 'both',
  off_date_start: '',
  off_date_end: '',
  reason: '',
})

const machinesForArea = computed(() =>
  machineList.value.filter(m => !form.area_code || m.area_code === form.area_code)
)
const machineGroupsForArea = computed(() => {
  const map = new Map<string, MachineRow[]>()
  for (const m of machinesForArea.value) {
    const g = m.line_group || '(tanpa grup)'
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(m)
  }
  return Array.from(map, ([group, machines]) => ({ group, machines }))
})

const canSubmit = computed(() => !!form.area_code && !!form.off_date_start)

function defaultDate() {
  // default ke tanggal 1 periode yang dipilih
  const mm = String(props.month).padStart(2, '0')
  return `${props.year}-${mm}-01`
}

async function reload() {
  clearMessages()
  await Promise.all([
    fetchMachineOff({ year: props.year, month: props.month, area: props.area || undefined }),
    fetchMachines(props.area || undefined),
  ])
}

function onAreaChange() {
  form.machine = ''
  fetchMachines(form.area_code || undefined)
}

async function onAdd() {
  if (!canSubmit.value) return
  const ok = await addMachineOff({
    area_code: form.area_code,
    machine: form.machine || null,
    part_number: form.part_number || null,
    off_date_start: form.off_date_start,
    off_date_end: form.off_date_end || form.off_date_start,
    shift: form.shift,
    reason: form.reason || null,
  })
  if (ok) {
    form.part_number = ''
    form.reason = ''
    await reload()
    emit('changed')
  }
}

async function onToggle(r: any) {
  const ok = await updateMachineOff({ id: r.id, is_active: r.is_active ? 0 : 1 })
  if (ok) { await reload(); emit('changed') }
}

async function onDelete(r: any) {
  if (!confirm(`Hapus jadwal OFF ${r.area_code}${r.machine ? ' / ' + r.machine : ''} tgl ${fmtDate(r.off_date)}?`)) return
  const ok = await deleteMachineOff(r.id)
  if (ok) { await reload(); emit('changed') }
}

function fmtDate(d: string) {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
function shiftLabel(s: string) {
  return s === 'day' ? 'Day' : s === 'night' ? 'Night' : 'Day+Night'
}

onMounted(() => {
  form.off_date_start = defaultDate()
  if (props.area) form.area_code = props.area
  reload()
})

watch(() => [props.year, props.month, props.area], () => {
  form.off_date_start = defaultDate()
  reload()
})
</script>

<style scoped>
.mo-wrap { display: flex; flex-direction: column; gap: 1rem; }

.section-header { display: flex; align-items: flex-start; gap: 10px; }
.section-header > i { font-size: 20px; color: var(--color-primary, #6366f1); margin-top: 2px; }
.section-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.section-desc  { font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; line-height: 1.5; max-width: 760px; }

/* DDL hint */
.mo-ddl {
  display: flex; gap: 12px; padding: 1rem 1.25rem;
  background: var(--color-background-warning, #fffbeb);
  border: 0.5px solid #fcd34d; border-radius: var(--border-radius-lg);
  color: var(--color-text-warning, #92400e); font-size: 13px;
}
.mo-ddl > i { font-size: 22px; }
.mo-ddl-code {
  margin-top: 8px; padding: 10px; font-size: 11px; line-height: 1.5;
  background: #1e293b; color: #e2e8f0; border-radius: 8px; overflow-x: auto; white-space: pre;
}

/* Form */
.mo-form {
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-lg); padding: 1rem 1.25rem;
}
.mo-form-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;
}
.mo-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.mo-field > span { color: var(--color-text-secondary); font-weight: 500; }
.mo-field > span b { color: #dc2626; }
.mo-field--wide { grid-column: span 2; }
.mo-field select, .mo-field input {
  padding: 7px 9px; font-size: 13px;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-secondary); color: var(--color-text-primary); outline: none;
}
.mo-field select:focus, .mo-field input:focus { border-color: var(--color-primary, #6366f1); }
.mo-form-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
.mo-hint { font-size: 11px; color: var(--color-text-tertiary); display: flex; align-items: center; gap: 4px; }

/* Table */
.mo-table-wrap { overflow-x: auto; border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); }
.mo-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.mo-table thead th {
  text-align: left; padding: 9px 12px; font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--color-text-secondary); background: var(--color-background-secondary);
  border-bottom: 0.5px solid var(--color-border-tertiary); white-space: nowrap;
}
.mo-table tbody td { padding: 8px 12px; border-bottom: 0.5px solid var(--color-border-tertiary); color: var(--color-text-primary); }
.mo-table tbody tr:hover { background: var(--color-background-secondary); }
.mo-row--off { opacity: 0.5; }
.mo-mono { font-family: ui-monospace, monospace; font-size: 12px; }
.mo-reason { color: var(--color-text-secondary); }
.mo-by { font-size: 11px; color: var(--color-text-tertiary); }
.mo-cell-msg { text-align: center; padding: 1.5rem; color: var(--color-text-tertiary); }

.mo-shift { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.mo-shift--both  { background: #ede9fe; color: #7c3aed; }
.mo-shift--day   { background: #fef3c7; color: #d97706; }
.mo-shift--night { background: #dbeafe; color: #2563eb; }

.mo-toggle { padding: 2px 10px; font-size: 11px; font-weight: 600; border-radius: 10px; border: none; cursor: pointer; }
.mo-toggle.is-on  { background: var(--color-background-success, #dcfce7); color: var(--color-text-success, #16a34a); }
.mo-toggle.is-off { background: var(--color-background-secondary); color: var(--color-text-tertiary); }

.mo-actions { text-align: right; }
.mo-icon-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px; color: var(--color-text-tertiary); }
.mo-icon-btn--danger:hover { color: #dc2626; background: #fee2e2; }

.mo-error { color: var(--color-text-danger, #dc2626); font-size: 13px; display: flex; align-items: center; gap: 6px; }
.mo-ok    { color: var(--color-text-success, #16a34a); font-size: 13px; display: flex; align-items: center; gap: 6px; }

.btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; font-size: 13px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border-secondary); cursor: pointer; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn--primary { background: var(--color-text-primary); color: var(--color-background-primary); border-color: transparent; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
