<!-- components/welding/master/BomVerifyModal.vue
  Verifikasi BOM 1 part_number. Sekali diverifikasi, BOM + tandanya berlaku di
  semua area/tree yg memakai part itu (lihat M_weld::get_bom_verify).
  - Sudah terverifikasi → tampil BOM tersimpan (tanpa tarik SAP lagi).
  - Belum → usulan dari BOM SAP dicocokkan ke anak master (Cocok / P→WIP /
    SAP saja / Master saja). User centang, adjust qty bila SAP tak sesuai
    aktual, tambah baris manual, lalu Verifikasi.
  - Peringatan aturan NUT FEEDER ditampilkan (warning, tidak memblok). -->
<template>
  <Teleport to="body">
    <Transition name="bvm-fade">
      <div v-if="open" v-modal-stack="close" class="bvm-overlay" @click.self.prevent>
        <div class="bvm-box">
          <div class="bvm-header">
            <div class="bvm-header-icon"><i class="mdi mdi-check-decagram-outline"></i></div>
            <div class="bvm-header-text">
              <p class="bvm-title">Verifikasi BOM</p>
              <p class="bvm-subtitle font-mono">{{ partNumber }}</p>
            </div>
            <button class="bvm-close" :disabled="saving" @click="close"><i class="mdi mdi-close"></i></button>
          </div>

          <div class="bvm-body">
            <div v-if="loading" class="bvm-note"><i class="mdi mdi-loading mdi-spin"></i> Memuat BOM…</div>
            <div v-else-if="error" class="bvm-note bvm-note--err"><i class="mdi mdi-alert-circle-outline"></i> {{ error }}</div>
            <template v-else-if="data">
              <div v-if="!data.tables_ready" class="bvm-note bvm-note--err">
                <i class="mdi mdi-database-alert-outline"></i> Tabel verifikasi BOM belum ada di server.
              </div>

              <div class="bvm-status" :class="data.verified ? 'bvm-status--ok' : 'bvm-status--none'">
                <template v-if="data.verified">
                  <i class="mdi mdi-check-decagram"></i>
                  <span>Terverifikasi oleh <strong>{{ data.verified.verified_by }}</strong> · {{ data.verified.verified_at }}</span>
                  <button class="bvm-link" :disabled="saving" @click="useProposal">Bandingkan ulang dgn SAP</button>
                </template>
                <template v-else>
                  <i class="mdi mdi-shield-outline"></i>
                  <span>Belum terverifikasi — usulan dari BOM SAP<template v-if="data.sap_synced_at"> (cache {{ data.sap_synced_at }})</template>.</span>
                </template>
                <button class="bvm-link" :disabled="saving || syncing" @click="syncSap">
                  <i class="mdi" :class="syncing ? 'mdi-loading mdi-spin' : 'mdi-cloud-download-outline'"></i> Tarik ulang SAP
                </button>
              </div>

              <div v-if="warnings.length" class="bvm-warn">
                <i class="mdi mdi-alert"></i>
                <ul><li v-for="w in warnings" :key="w">{{ w }}</li></ul>
              </div>

              <table class="bvm-table">
                <thead>
                  <tr>
                    <th class="bvm-col-chk"></th>
                    <th>Komponen</th>
                    <th>Status</th>
                    <th class="bvm-num">Qty SAP</th>
                    <th class="bvm-num">Qty Aktual</th>
                    <th v-if="steps.length > 1" title="Mesin routing tempat komponen dipasang">Mesin</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in rows" :key="i" :class="{ 'bvm-row--off': !r.include }">
                    <td class="bvm-col-chk"><input v-model="r.include" type="checkbox" /></td>
                    <td>
                      <input v-if="r.match === 'manual'" v-model="r.child_part_number" class="bvm-input bvm-input--pn font-mono" placeholder="Part number" />
                      <span v-else class="font-mono bvm-pn">{{ r.child_part_number }}</span>
                      <span v-if="r.sap_part_number && r.sap_part_number !== r.child_part_number" class="bvm-sap-pn font-mono" title="Part number di BOM SAP">SAP: {{ r.sap_part_number }}</span>
                      <span v-if="r.child_name" class="bvm-name">{{ r.child_name }}</span>
                    </td>
                    <td>
                      <span class="bvm-match" :class="`bvm-match--${r.match}`">{{ MATCH_LABEL[r.match ?? 'manual'] }}</span>
                      <label v-if="r.match === 'sap_only'" class="bvm-addmaster" :title="'Centang = komponen ini juga ditambahkan/ditautkan ke hierarki master saat Verifikasi'">
                        <input v-model="r.include" type="checkbox" /> Tambah ke master
                      </label>
                    </td>
                    <td class="bvm-num">{{ r.sap_qty ?? '—' }}</td>
                    <td class="bvm-num">
                      <input v-model.number="r.qty" type="number" step="any" class="bvm-input bvm-input--qty" :class="{ 'bvm-input--adj': r.sap_qty != null && r.qty !== r.sap_qty }" />
                      <span class="bvm-uom">{{ r.uom }}</span>
                    </td>
                    <td v-if="steps.length > 1">
                      <span v-if="['INHOUSE', 'OUTHOUSE', 'MATERIAL', 'SCRAP'].includes((r.category ?? '').toUpperCase())" class="bvm-uom" title="Part utama / material: proses awal">awal</span>
                      <span v-else-if="splitOf(r)" class="bvm-split" :title="'Dibagi per mesin (ubah lewat tag mesin di tree)'">{{ splitLabel(r) }}</span>
                      <select v-else v-model.number="r.route_seq" class="bvm-input bvm-input--step">
                        <option v-for="st in steps" :key="st.seq" :value="st.seq">{{ st.seq }}. {{ st.machine }}</option>
                      </select>
                    </td>
                    <td><button v-if="r.match === 'manual'" class="bvm-icon-btn" title="Hapus baris" @click="rows.splice(i, 1)"><i class="mdi mdi-close"></i></button></td>
                  </tr>
                </tbody>
              </table>
              <button class="bvm-add" @click="addRow"><i class="mdi mdi-plus"></i> Tambah komponen manual</button>

              <input v-model="note" class="bvm-input bvm-note-input" placeholder="Catatan (opsional, mis. alasan adjust dari SAP)" maxlength="255" />
            </template>
          </div>

          <div class="bvm-footer">
            <button v-if="data?.verified" class="bvm-btn bvm-btn--danger-ghost" :disabled="saving" @click="unverify">Cabut verifikasi</button>
            <span class="bvm-spacer"></span>
            <span class="bvm-kbd"><kbd>Esc</kbd> tutup · <kbd>Ctrl</kbd>+<kbd>S</kbd> verifikasi</span>
            <button class="bvm-btn bvm-btn--ghost" :disabled="saving" @click="close">Batal</button>
            <button class="bvm-btn bvm-btn--primary" :disabled="saving || !data?.tables_ready || !includedRows.length" @click="save">
              <i class="mdi" :class="saving ? 'mdi-loading mdi-spin' : 'mdi-check-decagram'"></i> Verifikasi
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { alertDialog, confirmDialog } from '@/utils/dialog';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import masterService from '@/services/Public/Welding/masterService';
import { vModalStack } from '@/directives/modalStack';
import type { BomVerifyData, BomVerifyMatch, BomVerifyRow } from '@/types/Public/Welding/master';

const props = defineProps<{ open: boolean; partNumber: string | null }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved', partNumber: string): void }>();

const MATCH_LABEL: Record<BomVerifyMatch, string> = {
  exact: 'Cocok',
  via_wip: 'P → WIP',
  sap_only: 'SAP saja',
  master_only: 'Master saja',
  manual: 'Manual',
};

const data = ref<BomVerifyData | null>(null);
const rows = ref<BomVerifyRow[]>([]);
const note = ref('');
const loading = ref(false);
const syncing = ref(false);
const saving = ref(false);
const error = ref('');

// Routing mesin part (urut); >1 mesin → kolom "Mesin" per komponen (kosong = mesin pertama).
const steps = computed(() => data.value?.route_steps ?? []);
// Qty per mesin "1:1,2:1" → { 1: 1, 2: 1 } (hanya bila >1 mesin).
const splitOf = (r: { route_split?: string | null }) => {
  const out: Record<number, number> = {};
  for (const part of (r.route_split ?? '').split(',')) { const m = part.trim().match(/^(\d+)\s*:\s*(-?[\d.]+)$/); if (m && Number(m[2])) out[Number(m[1])] = Number(m[2]); }
  return Object.keys(out).length > 1 ? out : null;
};
const splitLabel = (r: { route_split?: string | null }) =>
  Object.entries(splitOf(r) ?? {}).map(([k, q]) => `${steps.value.find(s => s.seq === Number(k))?.machine ?? k}×${q}`).join(' · ');
// Mesin: pilihan tersimpan → tebakan spec (route_seq_auto, sama dgn tree) → mesin pertama.
const withStep = <T extends { route_seq?: number | null; route_seq_auto?: number | null }>(r: T): T => ({ ...r, route_seq: r.route_seq ?? r.route_seq_auto ?? 1 });
const includedRows = computed(() => rows.value.filter(r => r.include && r.child_part_number.trim() && r.qty));

// Aturan NUT FEEDER (warning, tidak memblok) — dinilai live atas baris yg
// dicentang, supaya efek adjust langsung terlihat.
const warnings = computed(() => {
  const rule = data.value?.nut_rule;
  if (!rule) return [];
  const mesin = rule.machines.join('/');
  const cats = includedRows.value.map(r => (r.category ?? '').toUpperCase());
  // Sama dgn M_weld::_is_feeder_nut — cocok via kode dasar (M6-17210 ≈ 9004A-17210);
  // nut_type mesin kosong → CKD apa pun dianggap nut.
  const code = (pn: string) => pn.trim().toUpperCase().split('-').pop();
  const nutCodes = rule.nuts.map(code);
  const hasNut = rule.nuts.length
    ? includedRows.value.some(r => nutCodes.includes(code(r.child_part_number)))
    : cats.includes('CKD');
  const out: string[] = [];
  // Routing >1 mesin: nut wajib dipasang di mesin feeder yg memasoknya (sama dgn backend).
  if (rule.by_step?.length && steps.value.length > 1) {
    if (!cats.some(c => c === 'INHOUSE' || c === 'OUTHOUSE')) out.push('Nut feeder: belum ada komponen INHOUSE/OUTHOUSE.');
    for (const st of rule.by_step) {
      const codes = st.nuts.map(code);
      if (!includedRows.value.some(r => (splitOf(r) ? !!splitOf(r)![st.seq] : (r.route_seq ?? 1) === st.seq) && codes.includes(code(r.child_part_number))))
        out.push(`Mesin ${st.machine} (mesin ke-${st.seq}, nut feeder): belum ada NUT ${st.nuts.join(' / ')} yg dipasang di mesin ini.`);
    }
    return out;
  }
  if (!cats.some(c => c === 'INHOUSE' || c === 'OUTHOUSE')) out.push(`Mesin ${mesin} (nut feeder): belum ada komponen INHOUSE/OUTHOUSE.`);
  if (!hasNut) out.push(`Mesin ${mesin} (nut feeder): belum ada NUT ${rule.nuts.join(' / ') || 'CKD (nut_type mesin belum diisi)'}.`);
  return out;
});

function fromProposal(d: BomVerifyData) {
  rows.value = d.proposal.map(p => withStep({ ...p }));
}

function useProposal() {
  if (data.value) fromProposal(data.value);
}

async function load() {
  if (!props.partNumber) return;
  loading.value = true;
  error.value = '';
  try {
    const d = await masterService.getBomVerify(props.partNumber);
    data.value = d;
    note.value = d.verified?.note ?? '';
    if (d.verified) {
      const byPn = new Map(d.proposal.map(p => [p.child_part_number.toUpperCase(), p]));
      rows.value = d.verified.items.map(it => {
        const p = byPn.get(it.child_part_number.toUpperCase());
        return withStep({ ...it, route_seq: it.route_seq ?? p?.route_seq ?? null, route_seq_auto: p?.route_seq_auto ?? null, route_split: it.route_split ?? p?.route_split ?? null, category: p?.category ?? null, sap_part_number: p?.sap_part_number ?? null, match: p?.match ?? 'manual', include: true });
      });
    } else {
      fromProposal(d);
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Gagal memuat BOM.';
  } finally {
    loading.value = false;
  }
}

async function syncSap() {
  if (!props.partNumber) return;
  syncing.value = true;
  try {
    await masterService.syncBom(props.partNumber);
    const d = await masterService.getBomVerify(props.partNumber);
    data.value = d;
    fromProposal(d);
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Gagal tarik BOM SAP.';
  } finally {
    syncing.value = false;
  }
}

function addRow() {
  rows.value.push({ child_part_number: '', child_name: null, sap_qty: null, qty: 1, route_seq: 1, uom: null, match: 'manual', include: true });
}

async function save() {
  if (!props.partNumber) return;
  saving.value = true;
  try {
    // Baris "SAP saja" yg dicentang → juga ditambahkan ke hierarki master (backend: Children by SAP).
    const addToMaster = includedRows.value.filter(r => r.match === 'sap_only').map(r => r.sap_part_number || r.child_part_number);
    const res = await masterService.saveBomVerify(props.partNumber, includedRows.value, note.value, addToMaster);
    if (!res.success) { alertDialog(res.message); return; }
    if (addToMaster.length && res.master) alertDialog(res.master.message, { tone: res.master.added || res.master.linked ? 'success' : 'warning' });
    emit('saved', props.partNumber);
    emit('close');
  } catch (e: any) {
    alertDialog(e?.response?.data?.message ?? 'Gagal menyimpan verifikasi.');
  } finally {
    saving.value = false;
  }
}

async function unverify() {
  if (!props.partNumber || !await confirmDialog(`Cabut verifikasi BOM ${props.partNumber}?`)) return;
  saving.value = true;
  try {
    const res = await masterService.deleteBomVerify(props.partNumber);
    if (!res.success) { alertDialog(res.message); return; }
    emit('saved', props.partNumber);
    await load();
  } finally {
    saving.value = false;
  }
}

function close() {
  if (!saving.value) emit('close');
}

// Ctrl/Cmd+S atau Ctrl/Cmd+Enter → Verifikasi (Esc ditangani v-modal-stack).
function onKey(e: KeyboardEvent) {
  if (!(e.ctrlKey || e.metaKey) || !['s', 'S', 'Enter'].includes(e.key)) return;
  e.preventDefault();
  if (!saving.value && data.value?.tables_ready && includedRows.value.length) save();
}

watch(() => [props.open, props.partNumber], () => {
  if (props.open) { load(); window.addEventListener('keydown', onKey); }
  else { data.value = null; rows.value = []; window.removeEventListener('keydown', onKey); }
}, { immediate: true });
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<style scoped>
.bvm-overlay {
  position: fixed; inset: 0; z-index: 99990;
  background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.bvm-box {
  width: min(760px, 100%); max-height: 90vh; display: flex; flex-direction: column;
  background: var(--dm-surface, #fff); border-radius: 10px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25); overflow: hidden;
}
.bvm-header {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px; flex-shrink: 0;
  background: linear-gradient(135deg, #2e5396, #4472c4); color: #fff;
}
.bvm-header-icon {
  width: 34px; height: 34px; border-radius: 8px; background: rgba(255, 255, 255, 0.15);
  display: flex; align-items: center; justify-content: center; font-size: 18px;
}
.bvm-header-text { flex: 1; min-width: 0; }
.bvm-title { font-size: 13px; font-weight: 700; margin: 0; }
.bvm-subtitle { font-size: 11px; opacity: 0.85; margin: 0; }
.bvm-close {
  width: 28px; height: 28px; border-radius: 6px; border: none; cursor: pointer;
  background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.85);
}
.bvm-close:hover:not(:disabled) { background: rgba(255, 255, 255, 0.25); }

.bvm-body { padding: 14px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.bvm-note { font-size: 12px; color: var(--dm-text-2, #475569); display: flex; gap: 6px; align-items: center; }
.bvm-note--err { color: var(--dm-on-red, #b91c1c); }

.bvm-status {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px;
  font-size: 12px; padding: 8px 10px; border-radius: 8px; border: 1px solid;
}
.bvm-status .mdi { font-size: 16px; }
.bvm-status--ok   { background: var(--dm-tint-green, #f0fdf4); border-color: var(--dm-bd-green, #bbf7d0); color: var(--dm-on-green, #166534); }
.bvm-status--none { background: var(--dm-surface2, #f8fafc); border-color: var(--dm-border, #e2e8f0); color: var(--dm-text-2, #475569); }
.bvm-link {
  border: none; background: none; padding: 0; cursor: pointer;
  color: var(--dm-accent, #2563eb); font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 3px;
}
.bvm-link:disabled { opacity: 0.5; cursor: not-allowed; }

.bvm-warn {
  display: flex; gap: 8px; font-size: 12px; padding: 8px 10px; border-radius: 8px;
  background: var(--dm-tint-amber, #fffbeb); border: 1px solid var(--dm-bd-amber, #fcd34d); color: var(--dm-on-amber, #92400e);
}
.bvm-warn .mdi { font-size: 16px; }
.bvm-warn ul { margin: 0; padding-left: 16px; }

.bvm-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.bvm-table th {
  text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.03em;
  color: var(--dm-muted, #64748b); padding: 6px 8px; border-bottom: 1px solid var(--dm-border, #e2e8f0); background: var(--dm-surface2, #f8fafc);
}
.bvm-table td { padding: 6px 8px; border-bottom: 1px solid var(--dm-border, #f1f5f9); vertical-align: middle; }
.bvm-row--off td { opacity: 0.45; }
.bvm-col-chk { width: 28px; }
.bvm-num { text-align: right; white-space: nowrap; }
.bvm-pn { font-weight: 600; color: var(--dm-text, #0f172a); }
.bvm-sap-pn { display: block; font-size: 10.5px; color: var(--dm-muted, #64748b); }
.bvm-name { display: block; font-size: 10.5px; color: var(--dm-faint, #94a3b8); }
.bvm-uom { margin-left: 4px; font-size: 10.5px; color: var(--dm-muted, #64748b); }

.bvm-match { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; white-space: nowrap; }
.bvm-match--exact       { background: var(--dm-tint-green, #dcfce7); color: var(--dm-on-green, #15803d); }
.bvm-match--via_wip     { background: var(--dm-tint-blue, #dbeafe); color: var(--dm-accent, #1d4ed8); }
.bvm-match--sap_only    { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #b45309); }
.bvm-match--master_only { background: var(--dm-tint-violet, #f3e8ff); color: var(--dm-on-violet, #7e22ce); }
.bvm-match--manual      { background: var(--dm-bg, #e2e8f0); color: var(--dm-cell, #334155); }

.bvm-input {
  border: 1px solid var(--dm-border-strong, #cbd5e1); border-radius: 6px; padding: 4px 7px; font-size: 12px; background: var(--dm-surface, #fff);
}
.bvm-input:focus { outline: none; border-color: #4472c4; box-shadow: 0 0 0 2px rgba(68, 114, 196, 0.15); }
.bvm-input--qty { width: 72px; text-align: right; }
.bvm-input--adj { border-color: #f59e0b; background: var(--dm-tint-amber, #fffbeb); }
.bvm-input--pn { width: 170px; }
.bvm-note-input { width: 100%; }
.bvm-icon-btn { border: none; background: none; cursor: pointer; color: var(--dm-faint, #94a3b8); font-size: 14px; }
.bvm-icon-btn:hover { color: var(--dm-on-red, #dc2626); }
.bvm-add {
  align-self: flex-start; border: 1px dashed #94a3b8; background: none; border-radius: 6px;
  padding: 5px 10px; font-size: 12px; color: var(--dm-text-2, #475569); cursor: pointer;
}
.bvm-add:hover { border-color: #4472c4; color: var(--dm-accent, #2e5396); }

.bvm-footer {
  display: flex; align-items: center; gap: 8px; padding: 12px 16px; flex-shrink: 0;
  background: var(--dm-surface2, #f8fafc); border-top: 1px solid var(--dm-border, #e5e9f0);
}
.bvm-spacer { flex: 1; }
.bvm-kbd { font-size: 10.5px; color: var(--dm-faint, #94a3b8); white-space: nowrap; }
.bvm-kbd kbd { font-size: 9.5px; padding: 1px 4px; border: 1px solid var(--dm-border-strong, #cbd5e1); border-bottom-width: 2px; border-radius: 4px; background: var(--dm-surface, #fff); color: var(--dm-text-2, #475569); font-family: inherit; }
@media (max-width: 640px) { .bvm-kbd { display: none; } }
.bvm-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px;
  font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent;
}
.bvm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.bvm-btn--primary { background: #2e5396; color: #fff; }
.bvm-btn--primary:hover:not(:disabled) { background: #24437b; }
.bvm-btn--ghost { background: var(--dm-surface, #fff); border-color: var(--dm-border-strong, #cbd5e1); color: var(--dm-cell, #334155); }
.bvm-btn--danger-ghost { background: var(--dm-surface, #fff); border-color: var(--dm-bd-red, #fecaca); color: var(--dm-on-red, #b91c1c); }

.bvm-fade-enter-active, .bvm-fade-leave-active { transition: opacity 0.18s; }
.bvm-fade-enter-from, .bvm-fade-leave-to { opacity: 0; }

@media (max-width: 640px) {
  .bvm-overlay { padding: 0; align-items: flex-end; }
  .bvm-box { max-height: 95vh; border-radius: 12px 12px 0 0; }
  .bvm-input--pn { width: 120px; }
}
.bvm-input--step { width: 86px; padding: 3px 4px; font-size: 11.5px; }
.bvm-split { font-size: 11.5px; font-weight: 700; color: var(--dm-accent, #1d4ed8); white-space: nowrap; }
.bvm-addmaster { display: inline-flex; align-items: center; gap: 4px; margin-left: 6px; font-size: 11px; font-weight: 700; color: var(--dm-accent, #1d4ed8); cursor: pointer; white-space: nowrap; }
</style>
