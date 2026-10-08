<template>
  <!-- Step1DataManager.vue
       CRUD ms_welding (Part Welding) + view IFPD Stock
       Data referensi yang dipakai Step 1 pipeline -->
  <div class="s1dm">

    <!-- ── Sub-tab toggle ────────────────────────────────────────────── -->
    <div class="s1dm-tabs">
      <button
        v-for="t in SUB_TABS" :key="t.id"
        class="s1dm-tab"
        :class="{ 's1dm-tab--active': activeTab === t.id }"
        @click="activeTab = t.id as 'welding' | 'ifpd'"
      >
        <i :class="`ti ti-${t.icon}`" />
        {{ t.label }}
        <span v-if="t.id === 'welding'" class="s1dm-tab-count">{{ msWeldingList.length }}</span>
        <span v-if="t.id === 'ifpd'"    class="s1dm-tab-count">{{ ifpdStockList.length }}</span>
      </button>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- TAB 1: ms_welding CRUD -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'welding'">

      <!-- Toolbar -->
      <div class="s1dm-toolbar">
        <input
          v-model="weldSearch"
          class="s1dm-search"
          type="text"
          placeholder="Cari part number / nama…"
          @input="onWeldSearch"
        />
        <select v-model="weldArea" class="s1dm-select" @change="loadWelding">
          <option value="">Semua Area</option>
          <option v-for="a in AREAS" :key="a" :value="a">{{ a }}</option>
        </select>
        <button class="btn btn--outline btn--sm" :disabled="loading" @click="loadWelding">
          <i class="ti ti-refresh" /> Muat
        </button>
        <button class="btn btn--primary btn--sm" @click="openAdd">
          <i class="ti ti-plus" /> Tambah Part
        </button>
      </div>

      <!-- Table -->
      <div class="s1dm-table-wrap">
        <table class="s1dm-table">
          <thead>
            <tr>
              <th>Part Number</th>
              <th>Area</th>
              <th>Nama Part</th>
              <th>Job No</th>
              <th>Model</th>
              <th class="text-right">Qty KBN</th>
              <th class="text-right">Stok IFPD</th>
              <th class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="s1dm-empty">
                <i class="ti ti-loader-2 spin" /> Memuat…
              </td>
            </tr>
            <tr v-else-if="!msWeldingList.length">
              <td colspan="8" class="s1dm-empty">
                <i class="ti ti-inbox" /> Tidak ada data. Klik "Muat" untuk memuat.
              </td>
            </tr>
            <tr v-for="row in msWeldingList" :key="`${row.part_number}_${row.area_code}`">
              <td><code class="part-code">{{ row.part_number }}</code></td>
              <td><span class="area-badge">{{ row.area_code }}</span></td>
              <td>{{ row.part_name }}</td>
              <td class="muted">{{ row.job_no || '—' }}</td>
              <td class="muted">{{ row.model || '—' }}</td>
              <td class="text-right">{{ row.qty_kbn.toLocaleString('id') }}</td>
              <td class="text-right" :class="row.stock_ifpd === 0 ? 'text-danger' : ''">
                {{ row.stock_ifpd.toLocaleString('id') }}
              </td>
              <td class="text-center">
                <div class="row-actions">
                  <button class="action-btn action-btn--edit" title="Edit" @click="openEdit(row)">
                    <i class="ti ti-pencil" />
                  </button>
                  <button class="action-btn action-btn--del" title="Nonaktifkan" @click="confirmDelete(row)">
                    <i class="ti ti-trash" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- TAB 2: IFPD Stock (read-only) -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'ifpd'">

      <!-- Toolbar -->
      <div class="s1dm-toolbar">
        <input
          v-model="ifpdSearch"
          class="s1dm-search"
          type="text"
          placeholder="Cari part number…"
          @input="onIFPDSearch"
        />
        <select v-model="ifpdArea" class="s1dm-select" @change="loadIFPD">
          <option value="">Semua Area</option>
          <option v-for="a in AREAS" :key="a" :value="a">{{ a }}</option>
        </select>
        <button class="btn btn--outline btn--sm" :disabled="loading" @click="loadIFPD">
          <i class="ti ti-refresh" /> Muat
        </button>
        <span class="s1dm-note">
          <i class="ti ti-info-circle" /> Data stok dari SAP (majsf_rundown.stocks) — hanya tampilan
        </span>
      </div>

      <div class="s1dm-table-wrap">
        <table class="s1dm-table">
          <thead>
            <tr>
              <th>Part Number</th>
              <th>Nama Part</th>
              <th>Area</th>
              <th class="text-right">Stok IFPD (qty)</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="s1dm-empty">
                <i class="ti ti-loader-2 spin" /> Memuat…
              </td>
            </tr>
            <tr v-else-if="!ifpdStockList.length">
              <td colspan="5" class="s1dm-empty">
                <i class="ti ti-inbox" /> Tidak ada data. Klik "Muat" untuk memuat.
              </td>
            </tr>
            <tr v-for="row in ifpdStockList" :key="row.part_number">
              <td><code class="part-code">{{ row.part_number }}</code></td>
              <td>{{ row.part_name || '—' }}</td>
              <td>
                <span v-if="row.area_code" class="area-badge">{{ row.area_code }}</span>
                <span v-else class="muted">—</span>
              </td>
              <td class="text-right" :class="Number(row.stock_qty) === 0 ? 'text-danger' : ''">
                {{ Number(row.stock_qty).toLocaleString('id') }}
              </td>
              <td class="text-center">
                <span
                  class="stock-badge"
                  :class="Number(row.stock_qty) === 0 ? 'stock-badge--empty' : 'stock-badge--ok'"
                >
                  {{ Number(row.stock_qty) === 0 ? 'Kosong' : 'Ada' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- Modal: Tambah / Edit Part -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div v-if="showModal" class="s1dm-modal-overlay" @click.self="showModal = false">
      <div class="s1dm-modal">
        <div class="s1dm-modal-header">
          <span>{{ isEdit ? 'Edit Part' : 'Tambah Part Baru' }}</span>
          <button class="modal-close" @click="showModal = false"><i class="ti ti-x" /></button>
        </div>

        <div class="s1dm-modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Part Number <span class="req">*</span></label>
              <input v-model="form.part_number" :disabled="isEdit" class="form-input" placeholder="Contoh: 12345-AB" />
            </div>
            <div class="form-group">
              <label class="form-label">Area <span class="req">*</span></label>
              <select v-model="form.area_code" :disabled="isEdit" class="form-input">
                <option value="">— Pilih Area —</option>
                <option v-for="a in AREAS" :key="a" :value="a">{{ a }}</option>
              </select>
            </div>
            <div class="form-group form-group--full">
              <label class="form-label">Nama Part (car_name)</label>
              <input v-model="form.part_name" class="form-input" placeholder="Contoh: BRACKET ASSY" />
            </div>
            <div class="form-group">
              <label class="form-label">Job Number</label>
              <input v-model="form.job_no" class="form-input" placeholder="Contoh: J12345" />
            </div>
            <div class="form-group">
              <label class="form-label">Model</label>
              <input v-model="form.model" class="form-input" placeholder="Contoh: GR86" />
            </div>
            <div class="form-group">
              <label class="form-label">Qty KBN</label>
              <input v-model.number="form.qty_kbn" type="number" min="0" class="form-input" />
            </div>
          </div>

          <div v-if="formError" class="form-error">
            <i class="ti ti-alert-circle" /> {{ formError }}
          </div>
        </div>

        <div class="s1dm-modal-footer">
          <button class="btn btn--outline" @click="showModal = false">Batal</button>
          <button class="btn btn--primary" :disabled="saving" @click="submitForm">
            <i :class="saving ? 'ti ti-loader-2 spin' : 'ti ti-device-floppy'" />
            {{ saving ? 'Menyimpan…' : (isEdit ? 'Simpan Perubahan' : 'Tambah Part') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Konfirmasi hapus -->
    <div v-if="showDeleteConfirm" class="s1dm-modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="s1dm-modal s1dm-modal--sm">
        <div class="s1dm-modal-header s1dm-modal-header--danger">
          <span><i class="ti ti-alert-triangle" /> Nonaktifkan Part</span>
          <button class="modal-close" @click="showDeleteConfirm = false"><i class="ti ti-x" /></button>
        </div>
        <div class="s1dm-modal-body">
          <p>Part <strong>{{ deleteTarget?.part_number }}</strong> di area <strong>{{ deleteTarget?.area_code }}</strong> akan dinonaktifkan dan tidak akan ikut dalam pipeline.</p>
          <p class="text-muted-sm">Data di mutasi_weld tidak akan dihapus. Untuk hapus permanen, centang di bawah:</p>
          <label class="hard-delete-check">
            <input v-model="hardDelete" type="checkbox" />
            Hapus permanen dari tabel ms_welding
          </label>
        </div>
        <div class="s1dm-modal-footer">
          <button class="btn btn--outline" @click="showDeleteConfirm = false">Batal</button>
          <button class="btn btn--danger" :disabled="saving" @click="doDelete">
            <i :class="saving ? 'ti ti-loader-2 spin' : 'ti ti-trash'" />
            {{ hardDelete ? 'Hapus Permanen' : 'Nonaktifkan' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { MsWeldingRow, IFPDStockRow } from '@/composables/usePlanningConfig'
import { useWeldingAreas } from '@/composables/useWeldingAreas'

const props = defineProps<{
  loading:        boolean
  saving:         boolean
  msWeldingList:  MsWeldingRow[]
  ifpdStockList:  IFPDStockRow[]
  fetchWeldingFn: (p: { area?: string; q?: string }) => Promise<void>
  fetchIFPDFn:    (p: { area?: string; q?: string }) => Promise<void>
  addFn:          (r: any) => Promise<boolean>
  updateFn:       (r: any) => Promise<boolean>
  deleteFn:       (part: string, area: string, hard: boolean) => Promise<boolean>
}>()

// Area aktif master Area & Mesin (ms_welding_area)
const { zones: AREAS, load: loadAreas } = useWeldingAreas()
loadAreas()

const SUB_TABS = [
  { id: 'welding', label: 'Part Welding (ms_welding)', icon: 'box' },
  { id: 'ifpd',   label: 'Stok IFPD',                  icon: 'package' },
]

const activeTab  = ref<'welding' | 'ifpd'>('welding')

// ── Welding state ─────────────────────────────────────────────────────────────
const weldSearch = ref('')
const weldArea   = ref('')

let weldSearchTimer: ReturnType<typeof setTimeout>
function onWeldSearch() {
  clearTimeout(weldSearchTimer)
  weldSearchTimer = setTimeout(loadWelding, 400)
}
async function loadWelding() {
  await props.fetchWeldingFn({ area: weldArea.value || undefined, q: weldSearch.value || undefined })
}

// ── IFPD state ────────────────────────────────────────────────────────────────
const ifpdSearch = ref('')
const ifpdArea   = ref('')

let ifpdSearchTimer: ReturnType<typeof setTimeout>
function onIFPDSearch() {
  clearTimeout(ifpdSearchTimer)
  ifpdSearchTimer = setTimeout(loadIFPD, 400)
}
async function loadIFPD() {
  await props.fetchIFPDFn({ area: ifpdArea.value || undefined, q: ifpdSearch.value || undefined })
}

// ── Form state ────────────────────────────────────────────────────────────────
const showModal  = ref(false)
const isEdit     = ref(false)
const formError  = ref('')
const form = ref({
  part_number: '',
  area_code:   '',
  job_no:      '',
  part_name:   '',
  model:       '',
  qty_kbn:     0,
})

function openAdd() {
  isEdit.value = false
  formError.value = ''
  form.value = { part_number: '', area_code: '', job_no: '', part_name: '', model: '', qty_kbn: 0 }
  showModal.value = true
}

function openEdit(row: MsWeldingRow) {
  isEdit.value = true
  formError.value = ''
  form.value = {
    part_number: row.part_number,
    area_code:   row.area_code,
    job_no:      row.job_no,
    part_name:   row.part_name,
    model:       row.model,
    qty_kbn:     row.qty_kbn,
  }
  showModal.value = true
}

async function submitForm() {
  formError.value = ''
  if (!form.value.part_number.trim()) { formError.value = 'Part number wajib diisi.'; return }
  if (!form.value.area_code)          { formError.value = 'Area wajib dipilih.'; return }

  const ok = isEdit.value
    ? await props.updateFn({ ...form.value })
    : await props.addFn({ ...form.value })

  if (ok) {
    showModal.value = false
    await loadWelding()
  }
}

// ── Delete state ──────────────────────────────────────────────────────────────
const showDeleteConfirm = ref(false)
const deleteTarget      = ref<MsWeldingRow | null>(null)
const hardDelete        = ref(false)

function confirmDelete(row: MsWeldingRow) {
  deleteTarget.value = row
  hardDelete.value   = false
  showDeleteConfirm.value = true
}

async function doDelete() {
  if (!deleteTarget.value) return
  const ok = await props.deleteFn(
    deleteTarget.value.part_number,
    deleteTarget.value.area_code,
    hardDelete.value,
  )
  if (ok) {
    showDeleteConfirm.value = false
    deleteTarget.value      = null
    await loadWelding()
  }
}
</script>

<style scoped>
.s1dm {}

/* ── Sub-tabs ─────────────────────────────────────────────────────────────── */
.s1dm-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--color-border-tertiary);
  padding-bottom: 0;
}

.s1dm-tab {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; font-size: 12px; font-weight: 500;
  border: none; background: none; cursor: pointer;
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}
.s1dm-tab:hover { color: var(--color-text-primary); }
.s1dm-tab--active {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-text-primary);
}
.s1dm-tab-count {
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--color-background-secondary);
  border: 0.5px solid var(--color-border-secondary);
  border-radius: 10px; font-size: 10px; padding: 1px 7px;
  color: var(--color-text-secondary);
}

/* ── Toolbar ──────────────────────────────────────────────────────────────── */
.s1dm-toolbar {
  display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap; margin-bottom: 0.875rem;
}

.s1dm-search {
  flex: 1; min-width: 180px; max-width: 280px;
  padding: 6px 10px; font-size: 13px;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
}

.s1dm-select {
  padding: 6px 10px; font-size: 13px;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
}

.s1dm-note {
  font-size: 11px; color: var(--color-text-tertiary);
  display: flex; align-items: center; gap: 4px;
  margin-left: auto;
}

/* ── Table ────────────────────────────────────────────────────────────────── */
.s1dm-table-wrap {
  overflow-x: auto;
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md);
}

.s1dm-table {
  width: 100%; border-collapse: collapse;
  font-size: 12.5px;
}

.s1dm-table thead tr {
  background: var(--color-background-secondary);
  border-bottom: 0.5px solid var(--color-border-secondary);
}

.s1dm-table th {
  padding: 8px 12px; font-size: 11px; font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase; letter-spacing: 0.04em;
  white-space: nowrap;
  text-align: left;
}
.s1dm-table td {
  padding: 8px 12px; border-bottom: 0.5px solid var(--color-border-tertiary);
  color: var(--color-text-primary); vertical-align: middle;
}
.s1dm-table tbody tr:last-child td { border-bottom: none; }
.s1dm-table tbody tr:hover td { background: var(--color-background-secondary); }

.s1dm-empty {
  text-align: center; padding: 2.5rem 1rem;
  color: var(--color-text-tertiary); font-size: 13px;
}

.part-code {
  font-family: var(--font-mono, monospace); font-size: 11.5px;
  background: var(--color-background-secondary);
  padding: 1px 6px; border-radius: 4px;
  color: var(--color-text-info, #3b82f6);
}

.area-badge {
  display: inline-block; font-size: 10px; font-weight: 500;
  padding: 2px 7px; border-radius: 6px;
  background: var(--color-background-secondary);
  border: 0.5px solid var(--color-border-secondary);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.muted        { color: var(--color-text-tertiary); }
.text-right   { text-align: right; }
.text-center  { text-align: center; }
.text-danger  { color: var(--color-text-danger, #ef4444); font-weight: 500; }

/* ── Row actions ──────────────────────────────────────────────────────────── */
.row-actions { display: flex; gap: 4px; justify-content: center; }

.action-btn {
  width: 28px; height: 28px;
  border-radius: var(--border-radius-sm);
  border: 0.5px solid var(--color-border-tertiary);
  background: var(--color-background-primary);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 13px; transition: all 0.15s;
}
.action-btn--edit { color: var(--color-text-info, #3b82f6); }
.action-btn--edit:hover { background: #eff6ff; border-color: #bfdbfe; }
.action-btn--del  { color: var(--color-text-danger, #ef4444); }
.action-btn--del:hover  { background: #fef2f2; border-color: #fca5a5; }

/* ── Stock badge ──────────────────────────────────────────────────────────── */
.stock-badge {
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 500; padding: 2px 8px; border-radius: 6px;
}
.stock-badge--ok    { background: #f0fdf4; color: #16a34a; border: 0.5px solid #86efac; }
.stock-badge--empty { background: #fef2f2; color: #dc2626; border: 0.5px solid #fca5a5; }

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
.s1dm-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.45); backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
}

.s1dm-modal {
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-lg);
  width: min(560px, 95vw); max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
}
.s1dm-modal--sm { width: min(400px, 95vw); }

.s1dm-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 0.5px solid var(--color-border-tertiary);
  font-size: 14px; font-weight: 500;
}
.s1dm-modal-header--danger { color: var(--color-text-danger, #ef4444); }

.modal-close {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border: none; background: none; cursor: pointer;
  color: var(--color-text-tertiary); border-radius: 6px;
  font-size: 14px;
}
.modal-close:hover { background: var(--color-background-secondary); }

.s1dm-modal-body {
  padding: 1.25rem; overflow-y: auto; flex: 1;
  font-size: 13px; color: var(--color-text-primary);
}
.s1dm-modal-body p { margin: 0 0 8px; line-height: 1.55; }
.text-muted-sm { font-size: 12px; color: var(--color-text-secondary); }

.s1dm-modal-footer {
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 0.875rem 1.25rem;
  border-top: 0.5px solid var(--color-border-tertiary);
}

/* ── Form ─────────────────────────────────────────────────────────────────── */
.form-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group--full { grid-column: 1 / -1; }

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
  width: 100%; box-sizing: border-box;
}
.form-input:focus { outline: none; border-color: var(--color-text-info, #3b82f6); }
.form-input:disabled { opacity: 0.5; cursor: not-allowed; }

.form-error {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--color-text-danger, #ef4444);
  margin-top: 10px;
}

/* Hard delete checkbox */
.hard-delete-check {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; cursor: pointer;
  padding: 8px 12px; border-radius: var(--border-radius-md);
  border: 0.5px solid var(--color-border-tertiary);
  margin-top: 12px;
  color: var(--color-text-secondary);
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 1s linear infinite; }
</style>
