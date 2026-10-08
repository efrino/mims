<template>
  <!-- MdfoDataManager.vue
       CRUD tabel majsf_inventory.mdfo per periode (YYYYMM)
       MDFO = Minimum Days For Order = FORECAST demand harian
       (bukan order fix — DN yang fix ada di Step 3)
       Tampilan: grid spreadsheet — baris = part, kolom = hari 1–31 -->
  <div class="mdfo">

    <!-- ── Toolbar ──────────────────────────────────────────────────────── -->
    <div class="mdfo-toolbar">
      <div class="mdfo-toolbar-left">
        <select v-model.number="filterYear" class="mdfo-select" @change="load">
          <option v-for="y in yearOpts" :key="y" :value="y">{{ y }}</option>
        </select>
        <select v-model.number="filterMonth" class="mdfo-select" @change="load">
          <option v-for="m in 12" :key="m" :value="m">{{ monthLabel(m) }}</option>
        </select>
        <select v-model="filterArea" class="mdfo-select" @change="load">
          <option value="">Semua Area</option>
          <option v-for="a in AREAS" :key="a" :value="a">{{ a }}</option>
        </select>
        <input
          v-model="filterQ"
          class="mdfo-search"
          type="text"
          placeholder="Cari matnr…"
          @input="onSearch"
        />
        <button class="btn btn--outline btn--sm" :disabled="loading" @click="load">
          <i class="ti ti-refresh" /> Muat
        </button>
      </div>
      <div class="mdfo-toolbar-right">
        <span class="mdfo-period-chip">
          <i class="ti ti-calendar-month" />
          Periode: <strong>{{ spmonDisplay }}</strong>
          · {{ daysInMonth }} hari
        </span>
        <button class="btn btn--primary btn--sm" @click="openAdd">
          <i class="ti ti-plus" /> Tambah Part
        </button>
      </div>
    </div>

    <!-- ── Info banner ──────────────────────────────────────────────────── -->
    <div class="mdfo-info">
      <i class="ti ti-info-circle" />
      <span>
        <strong>MDFO = forecast</strong> (perkiraan kebutuhan produksi harian), bukan order fix.
        Order yang sudah konfirm/fix dikelola di <strong>Step 3 (DN)</strong>.
        Kolom <code>t1–t{{ daysInMonth }}</code> = estimasi qty per hari.
        Kolom abu-abu = hari di luar bulan ini.
      </span>
    </div>

    <!-- ── Grid (spreadsheet) ───────────────────────────────────────────── -->
    <div class="mdfo-grid-wrap">
      <table class="mdfo-grid">
        <thead>
          <tr>
            <th class="col-matnr sticky-col">MATNR</th>
            <th class="col-name sticky-col2">Nama Part</th>
            <th class="col-area">Area</th>
            <th
              v-for="d in 31" :key="d"
              class="col-day"
              :class="{ 'col-day--inactive': d > daysInMonth }"
            >{{ d }}</th>
            <th class="col-total">Total</th>
            <th class="col-actions">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="37" class="mdfo-empty">
              <i class="ti ti-loader-2 spin" /> Memuat…
            </td>
          </tr>
          <tr v-else-if="!mdfoList.length">
            <td :colspan="37" class="mdfo-empty">
              <i class="ti ti-inbox" />
              Tidak ada data MDFO untuk periode {{ spmonDisplay }}.
              Klik "Tambah Part" untuk menambahkan, atau pastikan data sudah ada di sistem SAP/inventory.
            </td>
          </tr>
          <tr
            v-for="row in mdfoList"
            :key="row.matnr"
            :class="{ 'row--editing': editingMatnr === row.matnr }"
          >
            <td class="col-matnr sticky-col">
              <code class="part-code">{{ row.matnr }}</code>
            </td>
            <td class="col-name sticky-col2 muted">{{ row.part_name || '—' }}</td>
            <td class="col-area">
              <span v-if="row.area_code" class="area-badge">{{ row.area_code }}</span>
              <span v-else class="muted">—</span>
            </td>

            <!-- Day cells — inline edit when row selected -->
            <template v-if="editingMatnr === row.matnr">
              <td
                v-for="d in 31" :key="d"
                class="col-day col-day--edit"
                :class="{ 'col-day--inactive': d > daysInMonth }"
              >
                <input
                  v-if="d <= daysInMonth"
                  v-model.number="editBuf[`t${d}`]"
                  type="number" min="0"
                  class="day-input"
                />
                <span v-else class="day-inactive">—</span>
              </td>
            </template>
            <template v-else>
              <td
                v-for="d in 31" :key="d"
                class="col-day"
                :class="{
                  'col-day--inactive': d > daysInMonth,
                  'col-day--nonzero':  d <= daysInMonth && (row[`t${d}` as keyof MdfoRow] as number) > 0
                }"
              >
                <span v-if="d <= daysInMonth">
                  {{ (row[`t${d}` as keyof MdfoRow] as number) > 0 ? row[`t${d}` as keyof MdfoRow] : '' }}
                </span>
              </td>
            </template>

            <td class="col-total">
              <strong>{{ rowTotal(row) }}</strong>
            </td>

            <td class="col-actions">
              <template v-if="editingMatnr === row.matnr">
                <button class="action-btn action-btn--save" :disabled="saving" title="Simpan" @click="saveInlineEdit(row)">
                  <i :class="saving ? 'ti ti-loader-2 spin' : 'ti ti-check'" />
                </button>
                <button class="action-btn action-btn--cancel" title="Batal" @click="cancelEdit">
                  <i class="ti ti-x" />
                </button>
              </template>
              <template v-else>
                <button class="action-btn action-btn--edit" title="Edit inline" @click="startEdit(row)">
                  <i class="ti ti-pencil" />
                </button>
                <button class="action-btn action-btn--del" title="Hapus" @click="confirmDelete(row)">
                  <i class="ti ti-trash" />
                </button>
              </template>
            </td>
          </tr>
        </tbody>

        <!-- Footer: total per hari -->
        <tfoot v-if="mdfoList.length">
          <tr class="row-total">
            <td class="col-matnr sticky-col" colspan="3"><strong>TOTAL</strong></td>
            <td
              v-for="d in 31" :key="d"
              class="col-day"
              :class="{ 'col-day--inactive': d > daysInMonth }"
            >
              <strong v-if="d <= daysInMonth && colTotal(d) > 0">{{ colTotal(d) }}</strong>
            </td>
            <td class="col-total"><strong>{{ grandTotal }}</strong></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- Modal: Tambah Part Baru -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal">
        <div class="modal-header">
          <span><i class="ti ti-plus" /> Tambah Forecast MDFO</span>
          <button class="modal-close" @click="showAddModal = false"><i class="ti ti-x" /></button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">MATNR (Part Number) <span class="req">*</span></label>
              <input v-model="addForm.matnr" class="form-input" placeholder="Contoh: 12345-AB" />

            </div>
            <div class="form-group">
              <label class="form-label">Periode</label>
              <input :value="spmonDisplay" class="form-input" disabled />
            </div>
          </div>

          <div class="day-grid-label">Forecast qty per Hari — t1 s/d t{{ daysInMonth }}</div>
          <div class="day-grid">
            <div v-for="d in daysInMonth" :key="d" class="day-cell">
              <label class="day-label">{{ d }}</label>
              <input
                v-model.number="addForm[`t${d}`]"
                type="number" min="0"
                class="day-input-sm"
              />
            </div>
          </div>

          <div v-if="formError" class="form-error">
            <i class="ti ti-alert-circle" /> {{ formError }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn--outline" @click="showAddModal = false">Batal</button>
          <button class="btn btn--primary" :disabled="saving" @click="submitAdd">
            <i :class="saving ? 'ti ti-loader-2 spin' : 'ti ti-device-floppy'" />
            {{ saving ? 'Menyimpan…' : 'Tambah' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Konfirmasi hapus -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal modal--sm">
        <div class="modal-header modal-header--danger">
          <span><i class="ti ti-alert-triangle" /> Hapus Data MDFO</span>
          <button class="modal-close" @click="deleteTarget = null"><i class="ti ti-x" /></button>
        </div>
        <div class="modal-body">
          <p>Hapus forecast MDFO untuk part <strong>{{ deleteTarget.matnr }}</strong> periode <strong>{{ spmonDisplay }}</strong>?</p>
          <p class="text-muted-sm">Nilai <code>mdfo</code> di mutasi_weld yang sudah di-seed tidak akan berubah sampai Step 2 dijalankan ulang.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn--outline" @click="deleteTarget = null">Batal</button>
          <button class="btn btn--danger" :disabled="saving" @click="doDelete">
            <i :class="saving ? 'ti ti-loader-2 spin' : 'ti ti-trash'" />
            Hapus
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MdfoRow } from '@/composables/usePlanningConfig'
import { useWeldingAreas } from '@/composables/useWeldingAreas'

const props = defineProps<{
  loading:    boolean
  saving:     boolean
  mdfoList:   MdfoRow[]
  fetchFn:    (p: { year: number; month: number; area?: string; q?: string }) => Promise<void>
  addFn:      (r: any) => Promise<boolean>
  updateFn:   (r: any) => Promise<boolean>
  deleteFn:   (matnr: string, year: number, month: number) => Promise<boolean>
}>()

// Area aktif master Area & Mesin (ms_welding_area)
const { zones: AREAS, load: loadAreas } = useWeldingAreas()
loadAreas()

// ── Filter state ──────────────────────────────────────────────────────────────
const now          = new Date()
const filterYear   = ref(now.getFullYear())
const filterMonth  = ref(now.getMonth() + 1)
const filterArea   = ref('')
const filterQ      = ref('')

const yearOpts = computed(() => {
  const y = now.getFullYear()
  return [y - 1, y, y + 1]
})

const daysInMonth = computed(() =>
  new Date(filterYear.value, filterMonth.value, 0).getDate()
)

const spmonDisplay = computed(() =>
  `${filterYear.value}-${String(filterMonth.value).padStart(2, '0')}`
)

function monthLabel(m: number) {
  return new Date(2000, m - 1, 1).toLocaleDateString('id-ID', { month: 'long' })
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 400)
}

async function load() {
  await props.fetchFn({
    year:  filterYear.value,
    month: filterMonth.value,
    area:  filterArea.value || undefined,
    q:     filterQ.value    || undefined,
  })
}

// ── Computed totals ───────────────────────────────────────────────────────────
function rowTotal(row: MdfoRow): number {
  let sum = 0
  for (let d = 1; d <= daysInMonth.value; d++) sum += Number(row[`t${d}` as keyof MdfoRow]) || 0
  return sum
}

function colTotal(day: number): number {
  return props.mdfoList.reduce((s, r) => s + (Number(r[`t${day}` as keyof MdfoRow]) || 0), 0)
}

const grandTotal = computed(() =>
  props.mdfoList.reduce((s, r) => s + rowTotal(r), 0)
)

// ── Inline edit ───────────────────────────────────────────────────────────────
const editingMatnr = ref<string | null>(null)
const editBuf      = ref<Record<string, number>>({})

function startEdit(row: MdfoRow) {
  editingMatnr.value = row.matnr
  const buf: Record<string, number> = {}
  for (let d = 1; d <= 31; d++) buf[`t${d}`] = Number(row[`t${d}` as keyof MdfoRow]) || 0
  editBuf.value = buf
}

function cancelEdit() {
  editingMatnr.value = null
  editBuf.value = {}
}

async function saveInlineEdit(row: MdfoRow) {
  const ok = await props.updateFn({
    matnr: row.matnr,
    year:  filterYear.value,
    month: filterMonth.value,
    ...editBuf.value,
  })
  if (ok) {
    cancelEdit()
    await load()
  }
}

// ── Add modal ─────────────────────────────────────────────────────────────────
const showAddModal = ref(false)
const formError    = ref('')
const addForm      = ref<Record<string, any>>({ matnr: '' })

function openAdd() {
  formError.value = ''
  const form: Record<string, any> = { matnr: '' }
  for (let d = 1; d <= 31; d++) form[`t${d}`] = 0
  addForm.value    = form
  showAddModal.value = true
}

async function submitAdd() {
  formError.value = ''
  if (!addForm.value.matnr?.trim()) { formError.value = 'MATNR wajib diisi.'; return }
  const ok = await props.addFn({
    matnr: addForm.value.matnr.trim(),
    year:  filterYear.value,
    month: filterMonth.value,
    ...Object.fromEntries(
      Array.from({ length: 31 }, (_, i) => [`t${i + 1}`, addForm.value[`t${i + 1}`] ?? 0])
    ),
  })
  if (ok) {
    showAddModal.value = false
    await load()
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteTarget = ref<MdfoRow | null>(null)

function confirmDelete(row: MdfoRow) { deleteTarget.value = row }

async function doDelete() {
  if (!deleteTarget.value) return
  const ok = await props.deleteFn(
    deleteTarget.value.matnr,
    filterYear.value,
    filterMonth.value,
  )
  if (ok) {
    deleteTarget.value = null
    await load()
  }
}
</script>

<style scoped>
/* ── Toolbar ──────────────────────────────────────────────────────────────── */
.mdfo-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 8px; margin-bottom: 0.75rem;
}
.mdfo-toolbar-left, .mdfo-toolbar-right {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.mdfo-select {
  padding: 5px 9px; font-size: 12.5px;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
}
.mdfo-search {
  padding: 5px 9px; font-size: 12.5px; width: 140px;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
}
.mdfo-period-chip {
  font-size: 12px; color: var(--color-text-secondary);
  display: flex; align-items: center; gap: 5px;
  background: var(--color-background-secondary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: 20px; padding: 3px 10px;
}

/* ── Info banner ──────────────────────────────────────────────────────────── */
.mdfo-info {
  display: flex; align-items: flex-start; gap: 7px;
  font-size: 11.5px; color: var(--color-text-secondary);
  background: #eff6ff; border: 0.5px solid #bfdbfe;
  border-radius: var(--border-radius-md);
  padding: 7px 12px; margin-bottom: 0.75rem; line-height: 1.5;
}
.mdfo-info i { color: #3b82f6; flex-shrink: 0; margin-top: 1px; }
.mdfo-info code {
  font-family: var(--font-mono, monospace); font-size: 10.5px;
  background: #dbeafe; padding: 0 4px; border-radius: 3px; color: #1d4ed8;
}

/* ── Grid wrapper ─────────────────────────────────────────────────────────── */
.mdfo-grid-wrap {
  overflow-x: auto;
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md);
  max-height: 520px;
  overflow-y: auto;
}

.mdfo-grid {
  border-collapse: collapse;
  font-size: 11.5px;
  min-width: max-content;
}

/* Sticky header */
.mdfo-grid thead tr {
  position: sticky; top: 0; z-index: 3;
  background: var(--color-background-secondary);
  border-bottom: 0.5px solid var(--color-border-secondary);
}

.mdfo-grid th {
  padding: 6px 8px; font-size: 10.5px; font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase; letter-spacing: 0.04em;
  white-space: nowrap; text-align: center;
}

.mdfo-grid td {
  padding: 4px 6px; border-bottom: 0.5px solid var(--color-border-tertiary);
  color: var(--color-text-primary); vertical-align: middle;
  text-align: center;
}

.mdfo-grid tbody tr:last-child td { border-bottom: none; }
.mdfo-grid tbody tr:hover td { background: var(--color-background-secondary); }
.mdfo-grid tbody tr.row--editing td { background: #fffbeb; }

/* Sticky columns */
.sticky-col {
  position: sticky; left: 0; z-index: 2;
  background: var(--color-background-primary);
  border-right: 0.5px solid var(--color-border-secondary);
  text-align: left !important;
  min-width: 120px;
}
.sticky-col2 {
  position: sticky; left: 120px; z-index: 2;
  background: var(--color-background-primary);
  border-right: 0.5px solid var(--color-border-secondary);
  text-align: left !important;
  min-width: 140px;
}

/* Day columns */
.col-day { min-width: 32px; max-width: 42px; }
.col-day--inactive { background: var(--color-background-secondary) !important; color: var(--color-text-tertiary); }
.col-day--nonzero  { color: var(--color-text-primary); font-weight: 500; }
.col-day--edit     { padding: 2px 3px !important; }

.col-area    { min-width: 90px; }
.col-total   { min-width: 52px; font-variant-numeric: tabular-nums; text-align: right; }
.col-actions { min-width: 64px; }
.col-name    { min-width: 140px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Day inline input */
.day-input {
  width: 36px; padding: 2px 3px; font-size: 11px; text-align: center;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: 3px;
  background: var(--color-background-primary);
}
.day-inactive { color: var(--color-text-tertiary); }

/* Footer total row */
.row-total td {
  background: var(--color-background-secondary) !important;
  border-top: 1.5px solid var(--color-border-secondary);
  font-size: 11.5px;
}

.mdfo-empty {
  text-align: center; padding: 2.5rem 1rem;
  color: var(--color-text-tertiary); font-size: 13px;
}

/* Badges */
.part-code {
  font-family: var(--font-mono, monospace); font-size: 11px;
  color: var(--color-text-info, #3b82f6);
}
.area-badge {
  display: inline-block; font-size: 10px; font-weight: 500;
  padding: 1px 6px; border-radius: 5px;
  background: var(--color-background-secondary);
  border: 0.5px solid var(--color-border-secondary);
  color: var(--color-text-secondary); white-space: nowrap;
}
.muted { color: var(--color-text-tertiary); }

/* ── Row actions ──────────────────────────────────────────────────────────── */
.action-btn {
  width: 26px; height: 26px;
  border-radius: var(--border-radius-sm);
  border: 0.5px solid var(--color-border-tertiary);
  background: var(--color-background-primary);
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px; transition: all 0.15s; margin: 0 1px;
}
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.action-btn--edit   { color: var(--color-text-info, #3b82f6); }
.action-btn--edit:hover   { background: #eff6ff; border-color: #bfdbfe; }
.action-btn--del    { color: var(--color-text-danger, #ef4444); }
.action-btn--del:hover    { background: #fef2f2; border-color: #fca5a5; }
.action-btn--save   { color: var(--color-text-success, #22c55e); }
.action-btn--save:hover   { background: #f0fdf4; border-color: #86efac; }
.action-btn--cancel { color: var(--color-text-tertiary); }
.action-btn--cancel:hover { background: var(--color-background-secondary); }

/* ── Buttons ──────────────────────────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; font-size: 13px;
  border-radius: var(--border-radius-md);
  border: 0.5px solid transparent; cursor: pointer;
  transition: all 0.15s; white-space: nowrap;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--sm      { padding: 5px 10px; font-size: 12px; }
.btn--primary { background: var(--color-text-primary); color: var(--color-background-primary); }
.btn--primary:hover:not(:disabled) { opacity: 0.88; }
.btn--outline { background: transparent; border-color: var(--color-border-secondary); color: var(--color-text-primary); }
.btn--outline:hover:not(:disabled) { background: var(--color-background-secondary); }
.btn--danger  { background: #ef4444; color: #fff; border-color: #ef4444; }
.btn--danger:hover:not(:disabled)  { opacity: 0.88; }

/* ── Modal ────────────────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.45); backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
}
.modal {
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-lg);
  width: min(720px, 96vw); max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
}
.modal--sm { width: min(420px, 96vw); }
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 0.5px solid var(--color-border-tertiary);
  font-size: 14px; font-weight: 500;
}
.modal-header--danger { color: var(--color-text-danger, #ef4444); }
.modal-close {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border: none; background: none; cursor: pointer;
  color: var(--color-text-tertiary); border-radius: 6px; font-size: 14px;
}
.modal-close:hover { background: var(--color-background-secondary); }
.modal-body  { padding: 1.25rem; overflow-y: auto; flex: 1; font-size: 13px; }
.modal-body p { margin: 0 0 8px; line-height: 1.55; }
.text-muted-sm { font-size: 12px; color: var(--color-text-secondary); }
.modal-footer {
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 0.875rem 1.25rem;
  border-top: 0.5px solid var(--color-border-tertiary);
}

/* ── Add form ─────────────────────────────────────────────────────────────── */
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-label {
  font-size: 11px; font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase; letter-spacing: 0.03em;
}
.req { color: var(--color-text-danger, #ef4444); }
.form-input {
  padding: 7px 10px; font-size: 13px;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
}
.form-input:disabled { opacity: 0.5; }

/* Day grid di modal add */
.day-grid-label {
  font-size: 11px; font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase; letter-spacing: 0.04em;
  margin-bottom: 8px;
}
.day-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(46px, 1fr));
  gap: 5px;
}
.day-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.day-label { font-size: 10px; color: var(--color-text-tertiary); }
.day-input-sm {
  width: 40px; padding: 4px; font-size: 11px; text-align: center;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-sm);
  background: var(--color-background-primary);
}

.form-error {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--color-text-danger, #ef4444);
  margin-top: 10px;
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 1s linear infinite; }
</style>
