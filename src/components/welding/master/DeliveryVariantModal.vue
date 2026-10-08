<!-- components/welding/master/DeliveryVariantModal.vue
     Varian delivery 1 part FISIK: daftar nomor part/job versi customer
     (tambah/ubah/hapus/set default) + "Gabungkan Part" — lebur part lain yang
     sebenarnya barang sama (mis. 57406-BZ270-00-26) jadi varian part ini.
     Backend: welding_variant/* (lihat deliveryVariantService.ts). -->
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" v-modal-stack="onClose" class="modal-overlay" @click.self.prevent>
        <div class="modal-box" style="max-width:760px;width:100%">
          <div class="modal-header">
            <div class="modal-header-icon"><i class="mdi mdi-tag-multiple-outline"></i></div>
            <div style="flex:1;min-width:0">
              <p class="modal-title">Varian Delivery</p>
              <p class="modal-subtitle font-mono">{{ part?.part_number }}<span v-if="part?.part_name"> · {{ part.part_name }}</span></p>
            </div>
            <button class="modal-close" :disabled="busy" @click="onClose"><i class="mdi mdi-close"></i></button>
          </div>

          <div class="dv-tabs">
            <button class="dv-tab" :class="{ 'dv-tab--active': tab === 'variants' }" @click="tab = 'variants'">
              <i class="mdi mdi-tag-multiple-outline"></i> Varian <span class="dv-tab-count">{{ variants.length }}</span>
            </button>
            <button class="dv-tab" :class="{ 'dv-tab--active': tab === 'merge' }" @click="switchToMerge">
              <i class="mdi mdi-set-merge"></i> Gabungkan Part
              <span v-if="candidates.length" class="dv-tab-count dv-tab-count--warn">{{ candidates.length }}</span>
            </button>
          </div>

          <div class="modal-body">
            <!-- ═══ TAB VARIAN ═══ -->
            <template v-if="tab === 'variants'">
              <p class="dv-hint">
                <i class="mdi mdi-information-outline"></i>
                <span>
                  Satu part produksi bisa dikirim dengan beberapa nomor delivery (beda customer/order); tiap nomor delivery
                  berdiri sendiri. Hierarki, BOM, plan &amp; mutasi tetap pakai part fisik ini. Tanda
                  <strong>PART UTAMA</strong> = nomor yang sama dengan part produksi (acuan part fisik), bukan delivery utama.
                </span>
              </p>

              <div v-if="loading" class="dv-empty"><i class="mdi mdi-loading mdi-spin"></i> Memuat varian…</div>
              <div v-else-if="!variants.length" class="dv-empty">Belum ada varian. Tambahkan di bawah.</div>
              <table v-else class="dv-table">
                <thead>
                  <tr>
                    <th>Part No. Delivery</th><th>Job No.</th><th>Customer</th><th>Model</th><th class="t-right">Qty KBN</th><th>SAP</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="v in variants" :key="v.id" :class="{ 'dv-row--default': v.is_default, 'dv-row--inactive': !v.is_active }">
                    <template v-if="editId === v.id">
                      <td><input v-model="editForm.part_number_delivery" class="dv-in font-mono" /></td>
                      <td><input v-model="editForm.job_number_delivery" class="dv-in font-mono" /></td>
                      <td><input v-model="editForm.customer" class="dv-in" /></td>
                      <td><input v-model="editForm.model" class="dv-in" /></td>
                      <td><input v-model.number="editForm.qty_kbn" type="number" min="0" class="dv-in t-right" :placeholder="String(part?.qty_kbn ?? '')" /></td>
                      <td><input v-model="editForm.sap_matnr" class="dv-in font-mono" /></td>
                      <td class="dv-actions">
                        <button class="dv-ic dv-ic--ok" title="Simpan" :disabled="busy" @click="saveEdit(v)"><i class="mdi mdi-check"></i></button>
                        <button class="dv-ic" title="Batal" :disabled="busy" @click="editId = null"><i class="mdi mdi-close"></i></button>
                      </td>
                    </template>
                    <template v-else>
                      <td class="font-mono dv-pn">
                        {{ v.part_number_delivery }}
                        <span v-if="v.is_default" class="dv-badge dv-badge--default" title="Nomor part produksi utama (acuan part fisik)">PART UTAMA</span>
                        <span v-if="!v.is_active" class="dv-badge dv-badge--off">NONAKTIF</span>
                      </td>
                      <td class="font-mono">{{ v.job_number_delivery || '—' }}</td>
                      <td>{{ v.customer || '—' }}</td>
                      <td><span v-if="v.model" class="dv-model">{{ v.model }}</span><span v-else>—</span></td>
                      <td class="t-right">
                        <span v-if="v.qty_kbn != null">{{ v.qty_kbn }}</span>
                        <span v-else class="dv-inherit" title="Ikut qty KBN part fisik (tidak diisi khusus)">{{ part?.qty_kbn ?? '—' }}</span>
                      </td>
                      <td class="font-mono dv-muted">{{ v.sap_matnr || '—' }}</td>
                      <td class="dv-actions">
                        <button v-if="!v.is_default" class="dv-ic" title="Jadikan part produksi utama" :disabled="busy" @click="setDefault(v)"><i class="mdi mdi-star-outline"></i></button>
                        <button class="dv-ic" title="Ubah" :disabled="busy" @click="startEdit(v)"><i class="mdi mdi-pencil-outline"></i></button>
                        <button v-if="!v.is_default" class="dv-ic dv-ic--danger" title="Lepas varian" :disabled="busy" @click="remove(v)"><i class="mdi mdi-link-variant-off"></i></button>
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>

              <!-- Tambah varian -->
              <div class="dv-add">
                <p class="dv-add-title"><i class="mdi mdi-plus-circle-outline"></i> Tambah varian</p>
                <div class="dv-add-grid">
                  <label>Part No. Delivery <span class="req">*</span><input v-model="addForm.part_number_delivery" class="dv-in font-mono" placeholder="mis. 57406-BZ270-00-26" /></label>
                  <label>Job No.<input v-model="addForm.job_number_delivery" class="dv-in font-mono" /></label>
                  <label>Customer<input v-model="addForm.customer" class="dv-in" /></label>
                  <label>Model<input v-model="addForm.model" class="dv-in" /></label>
                  <label>Qty KBN <span class="dv-muted">(kosong = ikut part)</span><input v-model.number="addForm.qty_kbn" type="number" min="0" class="dv-in" /></label>
                  <label>Material SAP<input v-model="addForm.sap_matnr" class="dv-in font-mono" /></label>
                </div>
                <div class="dv-add-foot">
                  <label class="dv-check"><input v-model="addForm.is_default" type="checkbox" :true-value="1" :false-value="0" /> Jadikan part produksi utama</label>
                  <button class="md-btn md-btn-primary" :disabled="busy || !addForm.part_number_delivery?.trim()" @click="add">
                    <i class="mdi" :class="busy ? 'mdi-loading mdi-spin' : 'mdi-plus'"></i> Tambah
                  </button>
                </div>
              </div>
            </template>

            <!-- ═══ TAB GABUNGKAN ═══ -->
            <template v-else>
              <p class="dv-hint dv-hint--warn">
                <i class="mdi mdi-alert-outline"></i>
                Part yang dipilih akan <strong>dilebur</strong> jadi varian <span class="font-mono">{{ part?.part_number }}</span>:
                relasi mother/child dipindah ke part ini, part lama di-runout (history tetap), qty KBN anak dihitung ulang.
                Tidak bisa dibatalkan otomatis.
              </p>

              <div v-if="candLoading" class="dv-empty"><i class="mdi mdi-loading mdi-spin"></i> Mencari kandidat…</div>
              <div v-else-if="!candidates.length" class="dv-empty">
                Tidak ada part lain dengan awalan nomor sama (FP/WIP &amp; layer sama).
              </div>
              <div v-else class="dv-cands">
                <label v-for="c in candidates" :key="c.id" class="dv-cand" :class="{ 'dv-cand--sel': mergeSel === c.id }">
                  <input v-model="mergeSel" type="radio" :value="c.id" name="dv-merge" />
                  <span class="type-badge" :class="c.is_wip ? 'type-wip' : 'type-fp'">{{ c.is_wip ? 'WIP' : 'FP' }}</span>
                  <span class="dv-cand-main">
                    <span class="font-mono dv-pn">{{ c.part_number }}</span>
                    <span class="dv-muted">{{ c.part_name || '—' }}</span>
                  </span>
                  <span class="dv-cand-meta">
                    <span v-if="c.job_number" class="font-mono">{{ c.job_number }}</span>
                    <span>{{ c.customer_1 || '—' }}<template v-if="c.model"> · {{ c.model }}</template></span>
                    <span>Qty {{ c.qty_kbn ?? '—' }} · {{ c.area || '—' }} · {{ c.category || '—' }}</span>
                    <span class="dv-muted">{{ c.mother_count }} mother · {{ c.child_count }} child</span>
                  </span>
                </label>
              </div>

              <div v-if="mergeSelected" class="dv-merge-preview">
                <p class="dv-add-title"><i class="mdi mdi-eye-outline"></i> Varian yang akan dibuat</p>
                <div class="dv-add-grid">
                  <label>Part No. Delivery<input v-model="mergeForm.part_number_delivery" class="dv-in font-mono" /></label>
                  <label>Job No.<input v-model="mergeForm.job_number_delivery" class="dv-in font-mono" /></label>
                  <label>Customer<input v-model="mergeForm.customer" class="dv-in" /></label>
                  <label>Model<input v-model="mergeForm.model" class="dv-in" /></label>
                  <label>Qty KBN <span class="dv-muted">(kosong = ikut part)</span><input v-model.number="mergeForm.qty_kbn" type="number" min="0" class="dv-in" /></label>
                  <label>Material SAP<input v-model="mergeForm.sap_matnr" class="dv-in font-mono" /></label>
                </div>
              </div>
              <p v-if="mergeResult" class="dv-ok"><i class="mdi mdi-check-circle-outline"></i> {{ mergeResult }}</p>
            </template>

            <p v-if="errorMsg" class="dv-error"><i class="mdi mdi-alert-circle-outline"></i> {{ errorMsg }}</p>
          </div>

          <div class="modal-footer">
            <button class="md-btn md-btn-ghost" :disabled="busy" @click="onClose">Tutup</button>
            <button v-if="tab === 'merge'" class="md-btn md-btn-danger" :disabled="busy || !mergeSelected" @click="doMerge">
              <i class="mdi" :class="busy ? 'mdi-loading mdi-spin' : 'mdi-set-merge'"></i>
              {{ busy ? 'Melebur…' : 'Lebur jadi varian' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { alertDialog, confirmDialog } from '@/utils/dialog';
import { computed, ref, watch } from 'vue';
import deliveryVariantService from '@/services/Public/Welding/deliveryVariantService';
import type { DeliveryVariant, DeliveryVariantForm, MergeCandidate } from '@/services/Public/Welding/deliveryVariantService';
import { vModalStack } from '@/directives/modalStack';

const props = defineProps<{
  open: boolean;
  part: { id: number; part_number: string; part_name?: string | null; qty_kbn?: number | null } | null;
}>();
const emit = defineEmits<{
  close: [];
  // dipanggil setiap ada perubahan yg mempengaruhi tabel master (jumlah varian, part dilebur)
  changed: [{ merged?: boolean; affectedChildren?: number[] }];
}>();

const tab       = ref<'variants' | 'merge'>('variants');
const loading   = ref(false);
const busy      = ref(false);
const errorMsg  = ref<string | null>(null);
const variants  = ref<DeliveryVariant[]>([]);
let dirty = false;

const emptyForm = (): DeliveryVariantForm => ({ part_number_delivery: '', job_number_delivery: '', customer: '', model: '', qty_kbn: null, sap_matnr: '', is_default: 0 });
const addForm  = ref<DeliveryVariantForm>(emptyForm());
const editId   = ref<number | null>(null);
const editForm = ref<DeliveryVariantForm>(emptyForm());

const candLoading = ref(false);
const candidates  = ref<MergeCandidate[]>([]);
const mergeSel    = ref<number | null>(null);
const mergeForm   = ref<DeliveryVariantForm>(emptyForm());
const mergeResult = ref<string | null>(null);
const mergeSelected = computed(() => candidates.value.find(c => c.id === mergeSel.value) ?? null);

watch(() => props.open, async (v) => {
  if (!v) return;
  tab.value = 'variants'; errorMsg.value = null; mergeResult.value = null; mergeSel.value = null;
  editId.value = null; addForm.value = emptyForm(); candidates.value = []; dirty = false;
  await Promise.all([loadVariants(), loadCandidates()]);
});

watch(mergeSelected, (c) => {
  if (!c) return;
  mergeForm.value = {
    part_number_delivery: c.part_number_delivery || c.part_number,
    job_number_delivery:  c.job_number_delivery || c.job_number || '',
    customer:             c.customer_1 || '',
    model:                c.model || '',
    qty_kbn:              (c.qty_kbn && c.qty_kbn !== props.part?.qty_kbn) ? c.qty_kbn : null,
    sap_matnr:            c.part_number,
  };
});

async function loadVariants() {
  if (!props.part) return;
  loading.value = true;
  try { variants.value = await deliveryVariantService.list(props.part.id); }
  catch (e: any) { errorMsg.value = e?.response?.data?.message || 'Gagal memuat varian.'; }
  finally { loading.value = false; }
}
async function loadCandidates() {
  if (!props.part) return;
  candLoading.value = true;
  try { candidates.value = await deliveryVariantService.mergeCandidates(props.part.id); }
  catch { candidates.value = []; }
  finally { candLoading.value = false; }
}
function switchToMerge() { tab.value = 'merge'; errorMsg.value = null; }

async function run(fn: () => Promise<{ status: string; message?: string }>, okMsg?: string) {
  if (!props.part || busy.value) return false;
  busy.value = true; errorMsg.value = null;
  try {
    const r = await fn();
    if (r.status !== 'success') { errorMsg.value = r.message || 'Gagal.'; return false; }
    dirty = true;
    if (okMsg) mergeResult.value = okMsg;
    await loadVariants();
    return true;
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || e?.message || 'Gagal.';
    return false;
  } finally { busy.value = false; }
}

async function add() {
  const ok = await run(() => deliveryVariantService.store(props.part!.id, addForm.value));
  if (ok) addForm.value = emptyForm();
}
function startEdit(v: DeliveryVariant) {
  editId.value = v.id;
  editForm.value = { part_number_delivery: v.part_number_delivery, job_number_delivery: v.job_number_delivery ?? '', customer: v.customer ?? '', model: v.model ?? '', qty_kbn: v.qty_kbn, sap_matnr: v.sap_matnr ?? '' };
}
async function saveEdit(v: DeliveryVariant) {
  const ok = await run(() => deliveryVariantService.update(v.id, editForm.value));
  if (ok) editId.value = null;
}
async function setDefault(v: DeliveryVariant) { await run(() => deliveryVariantService.setDefault(v.id)); }
async function remove(v: DeliveryVariant) {
  // Backend: varian hasil gabung part → part asalnya aktif lagi & berdiri sendiri (tidak hilang).
  if (!await confirmDialog(`Lepas varian ${v.part_number_delivery}?

Kalau varian ini hasil gabung part, part asalnya aktif lagi sebagai part sendiri. Varian yang diketik manual dihapus (tetap tercatat di audit).`)) return;
  await run(() => deliveryVariantService.remove(v.id));
}

async function doMerge() {
  const c = mergeSelected.value;
  if (!c || !props.part) return;
  if (!await confirmDialog(`Lebur ${c.part_number} ke ${props.part.part_number}?\n\nPart ${c.part_number} akan di-runout dan relasi mother/child-nya dipindah. Lanjutkan?`)) return;
  busy.value = true; errorMsg.value = null; mergeResult.value = null;
  try {
    const r = await deliveryVariantService.merge(props.part.id, c.id, mergeForm.value);
    if (r.status !== 'success') { errorMsg.value = r.message || 'Gagal melebur.'; return; }
    mergeResult.value = r.message;
    dirty = true;
    emit('changed', { merged: true, affectedChildren: r.affected_children });
    mergeSel.value = null;
    await Promise.all([loadVariants(), loadCandidates()]);
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || e?.message || 'Gagal melebur.';
  } finally { busy.value = false; }
}

function onClose() {
  if (busy.value) return;
  if (dirty) emit('changed', {});
  emit('close');
}
</script>

<style scoped>
/* Modal generik — disalin (scoped tidak menular antar komponen, lihat MovePartAreaModal.vue). */
.modal-overlay { position: fixed; inset: 0; z-index: 99990; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(2px); }
.modal-box { background: var(--dm-surface, white); border-radius: 10px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25); display: flex; flex-direction: column; max-height: 90vh; overflow: hidden; }
.modal-header { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: linear-gradient(135deg, #2e5396, #4472c4); color: white; flex-shrink: 0; }
.modal-header-icon { width: 34px; height: 34px; border-radius: 8px; background: rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.modal-title { font-size: 13px; font-weight: 700; margin: 0; }
.modal-subtitle { font-size: 11px; opacity: 0.85; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.modal-close { margin-left: auto; width: 28px; height: 28px; border-radius: 6px; background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.8); display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; border: none; flex-shrink: 0; }
.modal-close:hover:not(:disabled) { background: rgba(255, 255, 255, 0.25); }
.modal-body { padding: 14px 16px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 12px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; background: var(--dm-surface2, #f8fafc); border-top: 1px solid var(--dm-border, #e5e9f0); flex-shrink: 0; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.18s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.md-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; border: none; white-space: nowrap; }
.md-btn-primary { background: #2e5396; color: white; }
.md-btn-primary:hover { background: #4472c4; }
.md-btn-danger { background: #b91c1c; color: white; }
.md-btn-danger:hover { background: #dc2626; }
.md-btn-ghost { background: transparent; color: var(--dm-muted, #6b7280); border: 1.5px solid var(--dm-border, #e5e7eb); }
.md-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* Tabs */
.dv-tabs { display: flex; gap: 2px; padding: 0 12px; background: var(--dm-bg, #f1f5f9); border-bottom: 1px solid var(--dm-border, #e2e8f0); flex-shrink: 0; }
.dv-tab { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border: none; background: none; font-size: 12px; font-weight: 600; color: var(--dm-muted, #64748b); cursor: pointer; border-bottom: 2px solid transparent; font-family: inherit; }
.dv-tab--active { color: var(--dm-accent, #2e5396); border-bottom-color: #2e5396; background: var(--dm-surface, #fff); }
.dv-tab-count { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 10px; background: var(--dm-bg, #e2e8f0); color: var(--dm-text-2, #475569); }
.dv-tab-count--warn { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #92400e); }

.dv-hint { display: flex; gap: 7px; align-items: flex-start; margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--dm-text-2, #475569); background: var(--dm-surface2, #f8fafc); border: 1px solid var(--dm-border, #e2e8f0); border-radius: 7px; padding: 8px 10px; }
.dv-hint .mdi { font-size: 15px; color: var(--dm-accent, #2e5396); flex-shrink: 0; margin-top: 1px; }
.dv-hint--warn { background: var(--dm-tint-amber, #fffbeb); border-color: var(--dm-bd-amber, #fcd34d); color: var(--dm-on-amber, #78350f); }
.dv-hint--warn .mdi { color: var(--dm-on-amber, #b45309); }
.dv-empty { text-align: center; padding: 22px; font-size: 12px; color: var(--dm-faint, #94a3b8); }
.dv-error { margin: 0; font-size: 12px; color: var(--dm-on-red, #dc2626); display: flex; gap: 6px; align-items: center; }
.dv-ok { margin: 0; font-size: 12px; color: var(--dm-on-green, #15803d); display: flex; gap: 6px; align-items: center; }
.dv-muted { color: var(--dm-faint, #94a3b8); font-size: 11px; }
.dv-inherit { color: var(--dm-muted, #64748b); font-style: italic; }
.t-right { text-align: right; }
.font-mono { font-family: ui-monospace, 'JetBrains Mono', Consolas, monospace; }

/* Tabel varian */
.dv-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.dv-table th { text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: var(--dm-muted, #64748b); text-transform: uppercase; padding: 6px 8px; border-bottom: 1px solid var(--dm-border, #e2e8f0); }
.dv-table td { padding: 7px 8px; border-bottom: 1px solid var(--dm-border, #f1f5f9); vertical-align: middle; }
.dv-row--default td { background: var(--dm-tint-blue, #f0f7ff); }
.dv-row--inactive td { opacity: 0.55; }
.dv-pn { font-weight: 700; color: var(--dm-text, #1a2744); }
.dv-badge { display: inline-block; margin-left: 6px; font-size: 8.5px; font-weight: 700; padding: 1px 6px; border-radius: 3px; letter-spacing: 0.04em; vertical-align: middle; }
.dv-badge--default { background: var(--dm-tint-blue, #dbeafe); color: var(--dm-accent, #1e40af); }
.dv-badge--off { background: var(--dm-bg, #f1f5f9); color: var(--dm-muted, #64748b); }
.dv-model { display: inline-block; padding: 1px 7px; border-radius: 3px; background: var(--dm-bg, #f1f5f9); color: var(--dm-cell, #334155); font-size: 10.5px; font-weight: 700; }
.dv-actions { white-space: nowrap; text-align: right; }
.dv-ic { width: 26px; height: 26px; border-radius: 5px; border: 1px solid var(--dm-border, #e2e8f0); background: var(--dm-surface, #fff); color: var(--dm-text-2, #475569); cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; margin-left: 3px; }
.dv-ic:hover { background: var(--dm-bg, #f1f5f9); }
.dv-ic--ok { color: var(--dm-on-green, #15803d); border-color: var(--dm-bd-green, #bbf7d0); }
.dv-ic--danger { color: var(--dm-on-red, #b91c1c); border-color: var(--dm-bd-red, #fecaca); }
.dv-ic:disabled { opacity: 0.5; cursor: not-allowed; }
.dv-in { width: 100%; padding: 5px 7px; border: 1px solid var(--dm-border-strong, #cbd5e1); border-radius: 5px; font-size: 12px; font-family: inherit; box-sizing: border-box; }
.dv-in:focus { outline: none; border-color: #2e5396; box-shadow: 0 0 0 2px rgba(46, 83, 150, 0.12); }

/* Tambah / preview */
.dv-add, .dv-merge-preview { border: 1px dashed var(--dm-border-strong, #cbd5e1); border-radius: 8px; padding: 10px 12px; background: var(--dm-surface2, #fafbfc); }
.dv-add-title { margin: 0 0 8px; font-size: 11px; font-weight: 700; color: var(--dm-cell, #334155); text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 5px; }
.dv-add-title .mdi { color: var(--dm-accent, #2e5396); font-size: 14px; }
.dv-add-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px 10px; }
.dv-add-grid label { display: flex; flex-direction: column; gap: 3px; font-size: 10.5px; font-weight: 600; color: var(--dm-text-2, #475569); }
.dv-add-grid .req { color: var(--dm-on-red, #dc2626); }
.dv-add-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.dv-check { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--dm-text-2, #475569); }
@media (max-width: 640px) { .dv-add-grid { grid-template-columns: 1fr 1fr; } }

/* Kandidat gabung */
.dv-cands { display: flex; flex-direction: column; gap: 6px; max-height: 260px; overflow-y: auto; }
.dv-cand { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border: 1.5px solid var(--dm-border, #e5e7eb); border-radius: 7px; background: var(--dm-surface, #fff); cursor: pointer; }
.dv-cand:hover { border-color: var(--dm-bd-blue, #93c5fd); }
.dv-cand--sel { border-color: #b91c1c; background: var(--dm-tint-red, #fef2f2); box-shadow: 0 0 0 2px rgba(185, 28, 28, 0.1); }
.dv-cand-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.dv-cand-meta { display: flex; flex-direction: column; gap: 1px; font-size: 10.5px; color: var(--dm-text-2, #475569); text-align: right; flex-shrink: 0; }
.type-badge { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 3px; flex-shrink: 0; }
.type-fp  { background: var(--dm-tint-green, #dcfce7); color: var(--dm-on-green, #166534); }
.type-wip { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #92400e); }
</style>
