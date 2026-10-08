<!-- components/welding/master/PartCompareModal.vue
     Komparasi daftar part (paste dari Excel) vs master data pada FILTER AKTIF
     (layer/sub-area/FP-WIP/status/kolom). Hasil: ada di keduanya, hanya di sumber,
     hanya di master. Nomor sumber dicocokkan ke part_number / part_number_delivery /
     part_number_mix / nomor varian delivery. Backend: POST welding_master/compare. -->
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <!-- Tutup HANYA lewat tombol X / Esc — klik overlay tidak menutup (daftar paste & hasil komparasi jangan hilang tak sengaja). -->
      <div v-if="open" v-modal-stack="onEscape" class="modal-overlay" @click.self.prevent>
        <div class="modal-box" style="max-width:1000px;width:100%">
          <div class="modal-header">
            <div class="modal-header-icon"><i class="mdi mdi-compare-horizontal"></i></div>
            <div style="flex:1;min-width:0">
              <p class="modal-title">Komparasi Part vs Master</p>
              <p class="modal-subtitle">Filter aktif: <strong>{{ filterLabel }}</strong></p>
            </div>
            <button class="modal-close" :disabled="busy" @click="onClose"><i class="mdi mdi-close"></i></button>
          </div>

          <div class="modal-body">
            <!-- ── Input ── -->
            <div v-if="!result" class="pc-input">
              <p class="pc-hint">
                <i class="mdi mdi-information-outline"></i>
                Paste kolom part number dari Excel (satu per baris). Kalau ada beberapa kolom, kolom <strong>pertama</strong> yang dipakai.
                Baris kosong &amp; duplikat diabaikan.
              </p>
              <textarea
                ref="taRef"
                v-model="rawText"
                class="pc-textarea font-mono"
                placeholder="57105-BZ200-00&#10;57406-BZ270-00-26&#10;…"
                spellcheck="false"
                @keydown.ctrl.enter.prevent="run"
              ></textarea>
              <div class="pc-input-foot">
                <span class="pc-muted">{{ parsed.length }} nomor terbaca<template v-if="parsedDup"> · {{ parsedDup }} duplikat</template></span>
                <label class="pc-check"><input v-model="firstColOnly" type="checkbox" /> Ambil kolom pertama saja (pisah tab / ; / ,)</label>
              </div>
            </div>

            <!-- ── Hasil ── -->
            <template v-else>
              <div class="pc-summary">
                <button class="pc-stat" :class="{ 'pc-stat--active': view === 'both' }" @click="view = 'both'">
                  <span class="pc-stat-val pc-c-green">{{ result.summary.both }}</span>
                  <span class="pc-stat-lbl">Ada di keduanya</span>
                </button>
                <button class="pc-stat" :class="{ 'pc-stat--active': view === 'source_only' }" @click="view = 'source_only'">
                  <span class="pc-stat-val pc-c-red">{{ result.summary.source_only }}</span>
                  <span class="pc-stat-lbl">Hanya di sumber (Excel)</span>
                  <span class="pc-stat-sub"><i class="mdi mdi-database-check-outline"></i> {{ result.summary.source_only_in_sap }} ada di SAP · {{ result.summary.source_only - result.summary.source_only_in_sap }} tidak</span>
                </button>
                <button class="pc-stat" :class="{ 'pc-stat--active': view === 'master_only' }" @click="view = 'master_only'">
                  <span class="pc-stat-val pc-c-amber">{{ result.summary.master_only }}</span>
                  <span class="pc-stat-lbl">Hanya di master</span>
                </button>
                <div class="pc-stat pc-stat--info">
                  <span class="pc-stat-val">{{ result.summary.source_total }} <span class="pc-muted">/ {{ result.summary.master_total }}</span></span>
                  <span class="pc-stat-lbl">sumber / master{{ result.summary.source_dup ? ` · ${result.summary.source_dup} duplikat sumber` : '' }}</span>
                </div>
              </div>

              <div class="pc-toolbar">
                <input v-model="q" class="pc-search" placeholder="Cari di hasil…" />
                <div class="pc-seg">
                  <button :class="{ on: sapFilter === 'all' }" @click="sapFilter = 'all'">Semua</button>
                  <button :class="{ on: sapFilter === 'in' }" @click="sapFilter = 'in'">Ada di SAP</button>
                  <button :class="{ on: sapFilter === 'out' }" @click="sapFilter = 'out'">Tidak di SAP</button>
                </div>
                <span class="pc-muted">{{ visibleRows.length }} baris</span>
                <span style="flex:1"></span>
                <label v-if="view === 'both'" class="pc-check" title="Setelah BOM SAP diambil, child yg belum ada langsung ditambah/ditautkan ke hierarki (tanpa modal Terapkan)">
                  <input v-model="childApply" type="checkbox" /> langsung terapkan
                </label>
                <label v-if="view === 'both'" class="pc-check" title="Abaikan cache & BOM tersinkron — tarik ulang dari SAP (lambat). Default: pakai yang sudah tersinkron/cache bila ada.">
                  <input v-model="childForce" type="checkbox" /> paksa dari SAP
                </label>
                <button v-if="view === 'both'" class="md-btn md-btn-primary" :disabled="busy || !childTargets.length" :title="selectedBoth.size ? 'Part tercentang' : 'Semua part yang tampil'" @click="getChildrenSap">
                  <i class="mdi" :class="busy && childProg ? 'mdi-loading mdi-spin' : 'mdi-file-tree-outline'"></i>
                  {{ childProg ? `SAP ${childProg.done}/${childProg.total} · ${childProg.current}` : `Get children by SAP (${childTargets.length})` }}
                </button>
                <button v-if="view === 'master_only'" class="md-btn md-btn-primary" :disabled="!visibleRows.length" @click="exportMasterOnly">
                  <i class="mdi mdi-microsoft-excel"></i> Unduh Excel ({{ visibleRows.length }})
                </button>
                <button v-if="view === 'both' && fillableIds.length" class="md-btn md-btn-primary" :disabled="busy" @click="fillFromSap">
                  <i class="mdi" :class="busy ? 'mdi-loading mdi-spin' : 'mdi-database-import-outline'"></i> Isi kosong dari SAP ({{ fillableIds.length }})
                </button>
                <button v-if="view === 'source_only' && addable.length" class="md-btn md-btn-primary" :disabled="busy || !canAdd" :title="canAdd ? '' : 'Pilih layer dulu (bukan tab Semua)'" @click="addPanel = !addPanel">
                  <i class="mdi mdi-plus-box-outline"></i> Tambah ke master ({{ selectedAdd.size || addable.length }})
                </button>
                <button class="md-btn md-btn-ghost" :disabled="!visibleRows.length" @click="copyVisible">
                  <i class="mdi" :class="copied ? 'mdi-check' : 'mdi-content-copy'"></i> {{ copied ? 'Tersalin' : 'Salin (TSV)' }}
                </button>
                <button class="md-btn md-btn-ghost" @click="result = null"><i class="mdi mdi-arrow-left"></i> Ubah daftar</button>
              </div>

              <div v-if="view === 'source_only' && addPanel" class="pc-addpanel">
                <p class="pc-add-title"><i class="mdi mdi-plus-box-outline"></i> Tambah {{ selectedAdd.size || addable.length }} part ke master dari data SAP</p>
                <div class="pc-add-grid">
                  <label>Layer<input :value="addDefaults.layer" class="pc-in" disabled /></label>
                  <label>Kategori
                    <select v-model="addDefaults.category" class="pc-in">
                      <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
                    </select>
                  </label>
                  <label>Area
                    <select v-if="areaOptions.length" v-model="addDefaults.area" class="pc-in">
                      <option value="" disabled>Pilih area…</option>
                      <option v-for="a in areaOptions" :key="a" :value="a">{{ a }}</option>
                    </select>
                    <input v-else v-model="addDefaults.area" class="pc-in" />
                  </label>
                  <label>Status
                    <select v-model="addDefaults.status_part" class="pc-in"><option value="FP">FP</option><option value="WIP">WIP</option></select>
                  </label>
                </div>
                <p class="pc-muted" style="margin:6px 0 0">Nama, job number, qty KBN, model &amp; customer diambil dari SAP. Centang baris untuk memilih sebagian; tanpa centang = semua yang ada di SAP.</p>
                <label class="pc-check" style="margin-top:8px" title="Setelah part dibuat, BOM SAP-nya diambil dan child ditambah/ditautkan ke hierarki (per part 2–100 detik)">
                  <input v-model="addWithChildren" type="checkbox" /> Sekalian ambil &amp; terapkan children dari SAP
                </label>
                <div class="pc-add-foot">
                  <button class="md-btn md-btn-ghost" :disabled="busy" @click="addPanel = false">Batal</button>
                  <button class="md-btn md-btn-primary" :disabled="busy || !addDefaults.area || !addDefaults.category" @click="addToMaster">
                    <i class="mdi" :class="busy ? 'mdi-loading mdi-spin' : 'mdi-check'"></i> {{ busy ? 'Menambahkan…' : 'Tambahkan' }}
                  </button>
                </div>
              </div>
              <div v-if="actionMsg" class="pc-ok"><i class="mdi mdi-check-circle-outline"></i> {{ actionMsg }}</div>

              <!-- Preview "Isi kosong dari SAP" — field mana yg akan diisi, per part, sebelum benar-benar ditulis -->
              <div v-if="fillPreview && view === 'both'" class="pc-addpanel">
                <p class="pc-add-title"><i class="mdi mdi-eye-outline"></i> Preview isi dari SAP — {{ fillPreview.filter(d => Object.keys(d.filled).length).length }} part akan diubah, {{ fillPreview.filter(d => !Object.keys(d.filled).length).length }} tidak ada perubahan</p>
                <div class="pc-table-wrap" style="max-height:260px">
                  <table class="pc-table">
                    <thead><tr><th class="pc-chk"><input type="checkbox" :checked="allFillChecked" @change="toggleAllFill" /></th><th>Part master</th><th>SAP</th><th>Field yang diisi (kosong → nilai SAP)</th></tr></thead>
                    <tbody>
                      <tr v-for="d in fillPreview" :key="d.id" :class="{ 'pc-row--sel': fillSel.has(d.id) }">
                        <td class="pc-chk"><input v-if="Object.keys(d.filled).length" type="checkbox" :checked="fillSel.has(d.id)" @change="toggleFill(d.id)" /></td>
                        <td class="font-mono pc-strong">{{ d.part_number }}</td>
                        <td><span v-if="d.sap_mtart" class="pc-tag pc-tag--ok">{{ d.sap_mtart }}</span><span v-else class="pc-tag pc-tag--none">{{ d.note || '—' }}</span></td>
                        <td>
                          <template v-if="Object.keys(d.filled).length">
                            <span v-for="(v, k) in d.filled" :key="k" class="pc-fillchip"><b>{{ FILL_LABEL[k as string] ?? k }}</b> ∅ → {{ v }}</span>
                          </template>
                          <span v-else class="pc-muted">{{ d.note }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="pc-add-foot">
                  <button class="md-btn md-btn-ghost" :disabled="busy" @click="fillPreview = null">Batal</button>
                  <button class="md-btn md-btn-primary" :disabled="busy || !fillSel.size" @click="applyFillFromSap">
                    <i class="mdi" :class="busy ? 'mdi-loading mdi-spin' : 'mdi-check'"></i> {{ busy ? 'Menyimpan…' : `Terapkan (${fillSel.size})` }}
                  </button>
                </div>
              </div>

              <div class="pc-table-wrap">
                <table class="pc-table">
                  <thead>
                    <tr v-if="view === 'source_only'"><th class="pc-chk"><input type="checkbox" :checked="allAddableChecked" :disabled="!addable.length" title="Pilih semua yang ada di SAP" @change="toggleAllAdd" /></th><th>#</th><th>Baris</th><th>Nomor dari sumber</th><th>SAP</th><th>Nama (SAP)</th><th>Job (SAP)</th><th>Keterangan</th></tr>
                    <tr v-else-if="view === 'both'"><th class="pc-chk"><input type="checkbox" :checked="allBothChecked" @change="toggleAllBoth" title="Pilih semua (utk Get children by SAP)" /></th><th>#</th><th>Nomor sumber</th><th>Cocok via</th><th>Part master</th><th>Nama</th><th>Job</th><th>Area</th><th>Kategori</th><th class="t-right">Qty KBN</th><th>SAP</th><th class="t-right">Child</th><th>BOM SAP</th></tr>
                    <tr v-else><th>#</th><th>Part master</th><th>Delivery</th><th>Nama</th><th>Job</th><th>Area</th><th>Kategori</th><th>Customer</th><th class="t-right">Qty KBN</th><th>SAP</th></tr>
                  </thead>
                  <tbody>
                    <tr v-if="!visibleRows.length"><td colspan="13" class="pc-empty">Tidak ada data.</td></tr>
                    <template v-if="view === 'source_only'">
                      <tr v-for="(r, i) in (visibleRows as SourceOnlyRow[])" :key="r.line" :class="{ 'pc-row--sel': selectedAdd.has(r.source.toUpperCase()) }">
                        <td class="pc-chk"><input v-if="r.sap" type="checkbox" :checked="selectedAdd.has(r.source.toUpperCase())" @change="toggleAdd(r.source)" /></td>
                        <td class="pc-muted">{{ i + 1 }}</td><td class="pc-muted">{{ r.line }}</td>
                        <td class="font-mono pc-strong">{{ r.source }}</td>
                        <td><SapTag :sap="r.sap" :layer="result.summary.sap_layer" /></td>
                        <td class="pc-name">{{ r.sap?.name || '—' }}</td>
                        <td class="font-mono">{{ r.sap?.bismt || '—' }}</td>
                        <td class="pc-muted">{{ r.sap ? 'Ada di SAP, belum ada di master' : 'Tidak ada di master maupun SAP' }}</td>
                      </tr>
                    </template>
                    <template v-else-if="view === 'both'">
                      <tr v-for="(r, i) in (visibleRows as BothRow[])" :key="r.line" :class="{ 'pc-row--sel': selectedBoth.has(r.master.id), 'pc-row--busy': childProg?.current === r.master.part_number }">
                        <td class="pc-chk"><input type="checkbox" :checked="selectedBoth.has(r.master.id)" @change="toggleBoth(r.master.id)" /></td>
                        <td class="pc-muted">{{ i + 1 }}</td>
                        <td class="font-mono">{{ r.source }}</td>
                        <td><span class="pc-tag" :class="r.matched_by === 'part_number' ? 'pc-tag--ok' : 'pc-tag--alt'">{{ r.matched_by === 'part_number' ? 'part number' : r.matched_by }}</span></td>
                        <td class="font-mono pc-strong">{{ r.master.part_number }}</td>
                        <td class="pc-name">
                          <template v-if="r.master.part_name">{{ r.master.part_name }}</template>
                          <span v-else-if="r.sap?.name" class="pc-fill" title="Kosong di master — tersedia di SAP"><i class="mdi mdi-database-arrow-left-outline"></i> {{ r.sap.name }}</span>
                          <span v-else>—</span>
                        </td>
                        <td class="font-mono">
                          <template v-if="r.master.job_number">{{ r.master.job_number }}</template>
                          <span v-else-if="r.sap?.bismt" class="pc-fill" title="Kosong di master — tersedia di SAP"><i class="mdi mdi-database-arrow-left-outline"></i> {{ r.sap.bismt }}</span>
                          <span v-else>—</span>
                        </td>
                        <td>{{ r.master.area || '—' }}</td>
                        <td>{{ r.master.category || '—' }}</td>
                        <td class="t-right">{{ r.master.qty_kbn ?? '—' }}</td>
                        <td><SapTag :sap="r.sap" :layer="result.summary.sap_layer" /></td>
                        <td class="t-right">
                          <span v-if="r.master.child_count" class="pc-tag pc-tag--ok">{{ r.master.child_count }}</span>
                          <span v-else class="pc-tag pc-tag--none" title="Belum punya child di hierarki master">0</span>
                        </td>
                        <td>
                          <span v-if="childResults[r.master.part_number]" class="pc-tag" :class="childResults[r.master.part_number].ok ? 'pc-tag--ok' : 'pc-tag--err'" :title="childResults[r.master.part_number].note">{{ childResults[r.master.part_number].label }}</span>
                          <span v-else-if="r.master.bom_synced" class="pc-tag pc-tag--ok" :title="`BOM SAP tersinkron (${r.master.bom_synced} child di tab BOM SAP hierarki)`">✓ sync {{ r.master.bom_synced }}</span>
                          <span v-else-if="r.master.bom_cached" class="pc-tag pc-tag--alt" title="BOM SAP pernah diambil (cache) tapi belum disinkron ke hierarki">cache</span>
                          <span v-else class="pc-tag pc-tag--none" title="BOM SAP belum pernah diambil utk part ini">belum dicek</span>
                        </td>
                      </tr>
                    </template>
                    <template v-else>
                      <tr v-for="(r, i) in (visibleRows as MasterRow[])" :key="r.id">
                        <td class="pc-muted">{{ i + 1 }}</td>
                        <td class="font-mono pc-strong">{{ r.part_number }}</td>
                        <td class="font-mono pc-muted">{{ r.part_number_delivery && r.part_number_delivery !== r.part_number ? r.part_number_delivery : '—' }}</td>
                        <td class="pc-name">{{ r.part_name || '—' }}</td>
                        <td class="font-mono">{{ r.job_number || '—' }}</td>
                        <td>{{ r.area || '—' }}</td>
                        <td>{{ r.category || '—' }}</td>
                        <td>{{ r.customer_1 || '—' }}</td>
                        <td class="t-right">{{ r.qty_kbn ?? '—' }}</td>
                        <td><SapTag :sap="r.sap ?? null" :layer="result.summary.sap_layer" /></td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </template>

            <p v-if="errorMsg" class="pc-error"><i class="mdi mdi-alert-circle-outline"></i> {{ errorMsg }}</p>
          </div>

          <div class="modal-footer">
            <span v-if="!result" class="pc-muted" style="margin-right:auto"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> untuk bandingkan</span>
            <button class="md-btn md-btn-ghost" :disabled="busy" @click="onClose">Tutup</button>
            <button v-if="!result" class="md-btn md-btn-primary" :disabled="busy || !parsed.length" @click="run">
              <i class="mdi" :class="busy ? 'mdi-loading mdi-spin' : 'mdi-compare-horizontal'"></i> {{ busy ? 'Membandingkan…' : 'Bandingkan' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { alertDialog, confirmDialog } from '@/utils/dialog';
import { computed, defineComponent, h, nextTick, ref, watch } from 'vue';
import * as XLSX from 'xlsx';
import masterService from '@/services/Public/Welding/masterService';
import type { MsWeldingListParams, PartCompareResult, PartCompareBoth, PartCompareSourceOnly, PartCompareMaster, PartCompareSap } from '@/types/Public/Welding/master';
import { vModalStack } from '@/directives/modalStack';

// Tag status SAP: hijau = ada di SAP pada layer aktif, kuning = ada tapi layer lain, abu = tidak ada.
const SapTag = defineComponent({
  props: { sap: { type: Object as () => PartCompareSap | null, default: null }, layer: { type: String as () => string | null, default: null } },
  setup(p) {
    return () => {
      if (!p.sap) return h('span', { class: 'pc-tag pc-tag--none', title: 'Tidak ditemukan di majsf_rundown.stocks' }, 'tidak ada');
      const layers = p.sap.mtart.split(',').map(x => x.trim());
      const inLayer = !p.layer || layers.includes(p.layer);
      return h('span', { class: ['pc-tag', inLayer ? 'pc-tag--ok' : 'pc-tag--alt'], title: `SAP: ${p.sap.matnr}${p.sap.remark ? ' · ' + p.sap.remark : ''}` }, p.sap.mtart);
    };
  },
});

type BothRow = PartCompareBoth; type SourceOnlyRow = PartCompareSourceOnly; type MasterRow = PartCompareMaster;

const props = defineProps<{
  open: boolean;
  filters: Partial<MsWeldingListParams>;   // param list aktif (tanpa page/per_page/sort)
  filterLabel: string;                      // teks ringkas filter, mis. "IFPD · SUB-ASSY · Aktif"
  // Default utk "Tambah ke master" — dari filter aktif (layer null = tab Semua → tidak bisa tambah).
  addDefaults: { layer: string | null; category: string; area: string; status_part: 'FP' | 'WIP' };
  areaOptions: string[];                    // pilihan area (IFPW: zone welding); kosong = input bebas
}>();
const emit = defineEmits<{ close: []; changed: [] }>();

const CATEGORIES = ['WELDING', 'INHOUSE', 'OUTHOUSE', 'IFPD', 'CKD', 'MATERIAL'];
// LGORT BOM SAP mengikuti tab aktif (IFPP=2200 proses press, IFPW=2202, IFPD=2300 storage).
const TAB_LGORT: Record<string, string> = { IFPP: '2200', IFPW: '2202', IFPD: '2300' };

const taRef = ref<HTMLTextAreaElement | null>(null);
const rawText = ref('');
const firstColOnly = ref(true);
const busy = ref(false);
const errorMsg = ref<string | null>(null);
const result = ref<PartCompareResult | null>(null);
const view = ref<'both' | 'source_only' | 'master_only'>('source_only');
const q = ref('');
const sapFilter = ref<'all' | 'in' | 'out'>('all');
const copied = ref(false);
const actionMsg = ref<string | null>(null);
const addPanel = ref(false);
const selectedAdd = ref(new Set<string>());
const addDefaults = ref({ layer: '' as string, category: '', area: '', status_part: 'FP' as 'FP' | 'WIP' });
const canAdd = computed(() => !!props.addDefaults.layer);

// ── Get children by SAP (tab "ada di keduanya") ──
const selectedBoth = ref(new Set<number>());
const childApply = ref(true);
const childForce = ref(false);
const addWithChildren = ref(false);
const childProg = ref<{ done: number; total: number; current: string } | null>(null);
const childResults = ref<Record<string, { ok: boolean; label: string; note: string }>>({});
const bothVisible = computed(() => (view.value === 'both' ? (visibleRows.value as BothRow[]) : []));
const allBothChecked = computed(() => bothVisible.value.length > 0 && bothVisible.value.every(r => selectedBoth.value.has(r.master.id)));
const childTargets = computed(() => selectedBoth.value.size ? bothVisible.value.filter(r => selectedBoth.value.has(r.master.id)) : bothVisible.value);
function toggleBoth(id: number) { const s = new Set(selectedBoth.value); s.has(id) ? s.delete(id) : s.add(id); selectedBoth.value = s; }
function toggleAllBoth() { selectedBoth.value = allBothChecked.value ? new Set() : new Set(bothVisible.value.map(r => r.master.id)); }

// Satu part per request (SAP 2–100 dtk/part) — berurutan supaya progres kelihatan & tidak membanjiri gateway.
// Holder dikirim by ID baris master (bukan part_number) — nomor sama bisa ada di
// IFPW/IFPP/IFPD sekaligus, salah baris = BOM lgort lain nempel ke holder keliru.
async function runChildrenSap(targets: { id: number; part_number: string }[], apply: boolean) {
  if (!result.value) return;
  childProg.value = { done: 0, total: targets.length, current: '' };
  let okCount = 0, addTotal = 0, linkTotal = 0;
  for (const t of targets) {
    const pn = t.part_number;
    childProg.value.current = pn;
    try {
      const r = await masterService.compareChildrenSap(t.id, pn, apply, childForce.value, TAB_LGORT[props.addDefaults.layer ?? ''] ?? null);
      if (r.success) {
        okCount++;
        const ap = r.applied;
        if (ap) { addTotal += ap.inserted; linkTotal += ap.linked; }
        const pending = r.adds + r.links;
        childResults.value[pn] = {
          ok: true,
          label: `✓ ${r.sap_children} child` + (ap ? ` · +${ap.inserted}/↔${ap.linked}` : pending ? ` · ${pending} belum` : ''),
          note: `BOM ${r.source === 'sap' ? `SAP (${r.elapsed_ms} ms, disinkron)` : r.source === 'synced' ? 'tersinkron' : 'cache'} lgort ${r.lgort}: ` + r.children.map(c => `${c.matnr}${c.qty != null ? ' ×' + c.qty : ''}`).join(', ') + (ap?.errors.length ? ` — ${ap.errors.join('; ')}` : ''),
        };
      } else {
        childResults.value[pn] = { ok: false, label: '✗ gagal', note: r.message || 'Gagal ambil BOM SAP' };
      }
    } catch (e: any) {
      childResults.value[pn] = { ok: false, label: '✗ gagal', note: e?.response?.data?.message || e?.message || 'Gagal' };
    }
    childProg.value.done++;
  }
  childProg.value = null;
  actionMsg.value = `BOM SAP: ${okCount}/${targets.length} part berhasil` + (apply ? ` — ${addTotal} child ditambah, ${linkTotal} ditautkan.` : '.');
}
async function getChildrenSap() {
  if (busy.value || !childTargets.value.length) return;
  const parts = childTargets.value.map(r => ({ id: r.master.id, part_number: r.master.part_number }));
  if (!await confirmDialog(`Ambil BOM SAP untuk ${parts.length} part?` + (childApply.value ? '\nChild yang belum ada akan langsung ditambah/ditautkan.' : '') + '\nPer part bisa 2–100 detik.')) return;
  busy.value = true; errorMsg.value = null; actionMsg.value = null;
  try {
    await runChildrenSap(parts, childApply.value);
    if (childApply.value) { emit('changed'); await rerun(); }
  } finally { busy.value = false; }
}

// Tab "hanya di master" → Excel (utk dicross-check manual).
function exportMasterOnly() {
  const rows = (visibleRows.value as MasterRow[]).map(r => ({
    'Part Number': r.part_number, 'Delivery': r.part_number_delivery ?? '', 'Nama': r.part_name ?? '', 'Job': r.job_number ?? '',
    'Area': r.area ?? '', 'Kategori': r.category ?? '', 'Layer': r.layer ?? '', 'FP/WIP': r.is_wip ? 'WIP' : 'FP',
    'Customer': r.customer_1 ?? '', 'Model': r.model ?? '', 'Qty KBN': r.qty_kbn ?? '', 'Child': r.child_count, 'Mother': r.mother_count,
    'SAP': r.sap ? r.sap.mtart : 'TIDAK ADA', 'Nama SAP': r.sap?.name ?? '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hanya di master');
  XLSX.writeFile(wb, `komparasi_hanya_master_${(result.value?.summary.sap_layer || 'ALL')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Baris "ada di keduanya" yg punya field kosong di master tapi tersedia di SAP.
const fillableIds = computed(() => {
  if (!result.value) return [];
  return result.value.both
    // model/customer/qty tidak ada di hasil lookup ringkas — backend yg memutuskan (hanya isi yg kosong).
    .filter(b => b.sap && ((!b.master.part_name && b.sap.name) || (!b.master.job_number && b.sap.bismt) || !b.master.qty_kbn || !b.master.model || !b.master.customer_1))
    .map(b => b.master.id);
});
// Baris "hanya di sumber" yg ada di SAP → bisa ditambah ke master.
const addable = computed(() => result.value ? result.value.source_only.filter(r => r.sap) : []);
const allAddableChecked = computed(() => addable.value.length > 0 && addable.value.every(r => selectedAdd.value.has(r.source.toUpperCase())));
function toggleAdd(src: string) {
  const k = src.toUpperCase(); const set = new Set(selectedAdd.value);
  set.has(k) ? set.delete(k) : set.add(k); selectedAdd.value = set;
}
function toggleAllAdd() {
  selectedAdd.value = allAddableChecked.value ? new Set() : new Set(addable.value.map(r => r.source.toUpperCase()));
}

// "Isi kosong dari SAP": tahap 1 dry_run → preview per part (field kosong → nilai SAP),
// user centang mana yg mau, tahap 2 tulis hanya id yg dicentang.
type FillDetail = { id: number; part_number: string; filled: Record<string, unknown>; note?: string; sap_mtart?: string };
const FILL_LABEL: Record<string, string> = { part_name: 'Nama', job_number: 'Job', job_number_delivery: 'Job delivery', model: 'Model', customer_1: 'Customer', qty_kbn: 'Qty KBN' };
const fillPreview = ref<FillDetail[] | null>(null);
const fillSel = ref(new Set<number>());
const allFillChecked = computed(() => !!fillPreview.value && fillPreview.value.filter(d => Object.keys(d.filled).length).every(d => fillSel.value.has(d.id)) && fillSel.value.size > 0);
function toggleFill(id: number) { const s = new Set(fillSel.value); s.has(id) ? s.delete(id) : s.add(id); fillSel.value = s; }
function toggleAllFill() { fillSel.value = allFillChecked.value ? new Set() : new Set((fillPreview.value ?? []).filter(d => Object.keys(d.filled).length).map(d => d.id)); }

async function fillFromSap() {
  if (!result.value || busy.value || !fillableIds.value.length) return;
  busy.value = true; errorMsg.value = null; actionMsg.value = null; fillPreview.value = null;
  try {
    const r = await masterService.compareFillSap(fillableIds.value, result.value.summary.sap_layer, true);
    // yg bisa diisi dulu, lalu yg tidak ada perubahan
    fillPreview.value = [...r.details].sort((a, b) => Object.keys(b.filled).length - Object.keys(a.filled).length || a.part_number.localeCompare(b.part_number));
    fillSel.value = new Set(r.details.filter(d => Object.keys(d.filled).length).map(d => d.id));
  } catch (e: any) { errorMsg.value = e?.response?.data?.message || e?.message || 'Gagal.'; }
  finally { busy.value = false; }
}
async function applyFillFromSap() {
  if (!result.value || busy.value || !fillSel.value.size) return;
  busy.value = true; errorMsg.value = null;
  try {
    const r = await masterService.compareFillSap([...fillSel.value], result.value.summary.sap_layer);
    actionMsg.value = r.message;
    fillPreview.value = null; fillSel.value = new Set();
    emit('changed');
    await rerun();
  } catch (e: any) { errorMsg.value = e?.response?.data?.message || e?.message || 'Gagal.'; }
  finally { busy.value = false; }
}

async function addToMaster() {
  if (!result.value || busy.value) return;
  const parts = (selectedAdd.value.size ? addable.value.filter(r => selectedAdd.value.has(r.source.toUpperCase())) : addable.value).map(r => r.source);
  if (!parts.length) return;
  const d = addDefaults.value;
  if (!await confirmDialog(`Tambah ${parts.length} part ke master?\nLayer ${d.layer} · ${d.category} · ${d.area} · ${d.status_part}`)) return;
  busy.value = true; errorMsg.value = null; actionMsg.value = null;
  try {
    const r = await masterService.compareAddFromSap(parts, { layer: d.layer, category: d.category, area: d.area, status_part: d.status_part });
    actionMsg.value = r.message + (r.errors.length ? ' — ' + r.errors.slice(0, 5).join('; ') + (r.errors.length > 5 ? ' …' : '') : '');
    addPanel.value = false; selectedAdd.value = new Set();
    emit('changed');
    await rerun();
    if (addWithChildren.value && r.inserted > 0) {
      // part yg baru masuk sekarang ada di tab "keduanya" → ambil BOM & terapkan child-nya
      const inserted = new Set(parts.map(x => x.toUpperCase()));
      const targets = (result.value?.both ?? []).filter(b => inserted.has(b.source.toUpperCase())).map(b => ({ id: b.master.id, part_number: b.master.part_number }));
      view.value = 'both';
      const baseMsg = actionMsg.value;
      await runChildrenSap(targets, true);
      actionMsg.value = baseMsg + ' · ' + actionMsg.value;
      emit('changed'); await rerun();
    }
  } catch (e: any) { errorMsg.value = e?.response?.data?.message || e?.message || 'Gagal.'; }
  finally { busy.value = false; }
}

// Ulang komparasi dgn daftar yg sama (setelah isi/tambah) — view dipertahankan.
async function rerun() {
  const keep = view.value;
  const r = await masterService.compareParts(props.filters, parsedAll.value);
  result.value = r; view.value = keep;
}

// Parse: satu nomor per baris; kolom pertama kalau ada tab/;/, (opsional).
const parsedAll = computed(() =>
  rawText.value.split(/\r?\n/).map(l => {
    let v = l.trim();
    if (firstColOnly.value) v = v.split(/\t|;|,/)[0].trim();
    return v;
  }).filter(Boolean),
);
const parsed = computed(() => [...new Set(parsedAll.value.map(v => v.toUpperCase()))]);
const parsedDup = computed(() => parsedAll.value.length - parsed.value.length);

watch(() => props.open, async (v) => {
  if (!v) return;
  result.value = null; errorMsg.value = null; q.value = ''; view.value = 'source_only'; sapFilter.value = 'all';
  actionMsg.value = null; addPanel.value = false; selectedAdd.value = new Set();
  selectedBoth.value = new Set(); childResults.value = {}; childProg.value = null; childForce.value = false;
  fillPreview.value = null; fillSel.value = new Set();
  addDefaults.value = { layer: props.addDefaults.layer ?? '', category: props.addDefaults.category, area: props.addDefaults.area, status_part: props.addDefaults.status_part };
  await nextTick(); taRef.value?.focus();
});

async function run() {
  if (busy.value || !parsed.value.length) return;
  busy.value = true; errorMsg.value = null;
  try {
    const r = await masterService.compareParts(props.filters, parsedAll.value);
    result.value = r; actionMsg.value = null; selectedAdd.value = new Set();
    view.value = r.summary.source_only ? 'source_only' : r.summary.master_only ? 'master_only' : 'both';
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || e?.message || 'Gagal membandingkan.';
  } finally { busy.value = false; }
}

const visibleRows = computed<(BothRow | SourceOnlyRow | MasterRow)[]>(() => {
  if (!result.value) return [];
  let rows = result.value[view.value] as (BothRow | SourceOnlyRow | MasterRow)[];
  if (sapFilter.value !== 'all') rows = rows.filter(r => (sapFilter.value === 'in') === !!(r as { sap?: PartCompareSap | null }).sap);
  const s = q.value.trim().toLowerCase();
  if (!s) return rows;
  return rows.filter(r => JSON.stringify(r).toLowerCase().includes(s));
});

function rowToTsv(r: BothRow | SourceOnlyRow | MasterRow): string {
  const sapCol = (sap: PartCompareSap | null | undefined) => sap ? sap.mtart : 'TIDAK ADA';
  if (view.value === 'source_only') { const x = r as SourceOnlyRow; return [x.source, sapCol(x.sap), x.sap?.name ?? '', x.sap?.bismt ?? ''].join('\t'); }
  if (view.value === 'both') { const x = r as BothRow; return [x.source, x.master.part_number, x.master.part_name ?? '', x.master.job_number ?? '', x.master.area ?? '', x.master.category ?? '', x.master.qty_kbn ?? '', sapCol(x.sap)].join('\t'); }
  const x = r as MasterRow; return [x.part_number, x.part_number_delivery ?? '', x.part_name ?? '', x.job_number ?? '', x.area ?? '', x.category ?? '', x.customer_1 ?? '', x.qty_kbn ?? '', sapCol(x.sap)].join('\t');
}
async function copyVisible() {
  const head = view.value === 'source_only' ? 'Nomor sumber\tSAP\tNama (SAP)\tJob (SAP)'
    : view.value === 'both' ? 'Nomor sumber\tPart master\tNama\tJob\tArea\tKategori\tQty KBN\tSAP'
    : 'Part master\tDelivery\tNama\tJob\tArea\tKategori\tCustomer\tQty KBN\tSAP';
  try {
    await navigator.clipboard.writeText([head, ...visibleRows.value.map(rowToTsv)].join('\n'));
    copied.value = true; setTimeout(() => (copied.value = false), 1500);
  } catch { errorMsg.value = 'Gagal menyalin ke clipboard.'; }
}

function onClose() { if (!busy.value) emit('close'); }
// Esc (lewat v-modal-stack): tutup panel preview / tambah dulu, baru modal.
function onEscape() {
  if (fillPreview.value) { fillPreview.value = null; return; }
  if (addPanel.value) { addPanel.value = false; return; }
  onClose();
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; z-index: 99990; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(2px); }
.modal-box { background: var(--dm-surface, white); border-radius: 10px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25); display: flex; flex-direction: column; max-height: 92vh; overflow: hidden; }
.modal-header { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: linear-gradient(135deg, #2e5396, #4472c4); color: white; flex-shrink: 0; }
.modal-header-icon { width: 34px; height: 34px; border-radius: 8px; background: rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.modal-title { font-size: 13px; font-weight: 700; margin: 0; }
.modal-subtitle { font-size: 11px; opacity: 0.85; margin: 0; }
.modal-close { margin-left: auto; width: 28px; height: 28px; border-radius: 6px; background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.8); display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; border: none; flex-shrink: 0; }
.modal-close:hover:not(:disabled) { background: rgba(255, 255, 255, 0.25); }
.modal-body { padding: 14px 16px; overflow: hidden; flex: 1; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.modal-footer { display: flex; justify-content: flex-end; align-items: center; gap: 8px; padding: 12px 16px; background: var(--dm-surface2, #f8fafc); border-top: 1px solid var(--dm-border, #e5e9f0); flex-shrink: 0; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.18s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.md-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; white-space: nowrap; font-family: inherit; }
.md-btn-primary { background: #2e5396; color: white; }
.md-btn-primary:hover { background: #4472c4; }
.md-btn-ghost { background: transparent; color: var(--dm-muted, #6b7280); border: 1.5px solid var(--dm-border, #e5e7eb); }
.md-btn-ghost:hover { background: var(--dm-bg, #f3f4f6); }
.md-btn:disabled { opacity: 0.6; cursor: not-allowed; }
kbd { font-family: inherit; font-size: 10px; padding: 1px 5px; border: 1px solid var(--dm-border-strong, #cbd5e1); border-bottom-width: 2px; border-radius: 4px; background: var(--dm-surface, #fff); }

.pc-hint { display: flex; gap: 7px; align-items: flex-start; margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--dm-text-2, #475569); background: var(--dm-surface2, #f8fafc); border: 1px solid var(--dm-border, #e2e8f0); border-radius: 7px; padding: 8px 10px; }
.pc-hint .mdi { font-size: 15px; color: var(--dm-accent, #2e5396); flex-shrink: 0; margin-top: 1px; }
.pc-input { display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0; }
.pc-textarea { flex: 1; min-height: 260px; resize: vertical; padding: 10px 12px; border: 1px solid var(--dm-border-strong, #cbd5e1); border-radius: 7px; font-size: 12.5px; line-height: 1.5; }
.pc-textarea:focus { outline: none; border-color: #2e5396; box-shadow: 0 0 0 3px rgba(46, 83, 150, 0.12); }
.pc-input-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 11.5px; }
.pc-check { display: flex; align-items: center; gap: 6px; color: var(--dm-text-2, #475569); }
.pc-muted { color: var(--dm-faint, #94a3b8); font-size: 11px; }
.pc-strong { font-weight: 700; color: var(--dm-text, #1a2744); }
.pc-error { margin: 0; font-size: 12px; color: var(--dm-on-red, #dc2626); display: flex; gap: 6px; align-items: center; }
.font-mono { font-family: ui-monospace, 'JetBrains Mono', Consolas, monospace; }
.t-right { text-align: right; }

.pc-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.pc-stat { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 9px 12px; border: 1.5px solid var(--dm-border, #e5e7eb); border-radius: 8px; background: var(--dm-surface, #fff); cursor: pointer; text-align: left; font-family: inherit; }
.pc-stat:hover { border-color: var(--dm-bd-blue, #93c5fd); }
.pc-stat--active { border-color: #2e5396; background: var(--dm-tint-blue, #eef4ff); box-shadow: 0 0 0 2px rgba(46, 83, 150, .12); }
.pc-stat--info { cursor: default; background: var(--dm-surface2, #f8fafc); }
.pc-stat--info:hover { border-color: var(--dm-border, #e5e7eb); }
.pc-stat-val { font-size: 20px; font-weight: 800; line-height: 1.1; color: var(--dm-text, #1a2744); }
.pc-stat-lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--dm-muted, #64748b); }
.pc-c-green { color: var(--dm-on-green, #15803d); } .pc-c-red { color: var(--dm-on-red, #b91c1c); } .pc-c-amber { color: var(--dm-on-amber, #b45309); }

.pc-toolbar { display: flex; align-items: center; gap: 10px; }
.pc-search { width: 220px; padding: 6px 9px; border: 1px solid var(--dm-border-strong, #cbd5e1); border-radius: 6px; font-size: 12px; font-family: inherit; }
.pc-table-wrap { flex: 1; min-height: 0; overflow: auto; border: 1px solid var(--dm-border, #e2e8f0); border-radius: 8px; }
.pc-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.pc-table th { position: sticky; top: 0; background: var(--dm-bg, #f1f5f9); text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: var(--dm-text-2, #475569); text-transform: uppercase; padding: 7px 9px; border-bottom: 1px solid var(--dm-border, #e2e8f0); white-space: nowrap; }
.pc-table td { padding: 6px 9px; border-bottom: 1px solid var(--dm-border, #f1f5f9); vertical-align: middle; white-space: nowrap; }
.pc-table td.pc-name { white-space: normal; max-width: 260px; font-size: 11px; color: var(--dm-text-2, #475569); }
.pc-table tbody tr:hover td { background: var(--dm-surface2, #f8fbff); }
.pc-empty { text-align: center; padding: 26px; color: var(--dm-faint, #94a3b8); }
.pc-tag { display: inline-block; font-size: 9.5px; font-weight: 700; padding: 1px 7px; border-radius: 4px; }
.pc-tag--ok { background: var(--dm-tint-green, #dcfce7); color: var(--dm-on-green, #166534); }
.pc-tag--alt { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #92400e); }
.pc-tag--none { background: var(--dm-bg, #f1f5f9); color: var(--dm-faint, #94a3b8); }
.pc-tag--err { background: var(--dm-tint-red, #fee2e2); color: var(--dm-on-red, #b91c1c); }
.pc-row--busy td { background: var(--dm-tint-blue, #eef4ff); }
.pc-fillchip { display: inline-block; margin: 1px 6px 1px 0; padding: 1px 7px; border-radius: 4px; background: var(--dm-tint-amber, #fff7ed); border: 1px solid #fdba74; color: var(--dm-on-amber, #9a3412); font-size: 11px; }
.pc-fillchip b { color: var(--dm-on-amber, #7c2d12); margin-right: 3px; }
.pc-stat-sub { font-size: 10px; color: var(--dm-muted, #64748b); display: flex; align-items: center; gap: 3px; margin-top: 2px; }
.pc-stat-sub .mdi { font-size: 12px; color: var(--dm-accent, #2e5396); }
.pc-seg { display: inline-flex; border: 1px solid var(--dm-border-strong, #cbd5e1); border-radius: 6px; overflow: hidden; }
.pc-seg button { padding: 5px 10px; border: none; background: var(--dm-surface, #fff); font-size: 11px; font-weight: 600; color: var(--dm-muted, #64748b); cursor: pointer; font-family: inherit; }
.pc-seg button + button { border-left: 1px solid var(--dm-border, #e2e8f0); }
.pc-seg button.on { background: #2e5396; color: #fff; }
.pc-ok { margin: 0; font-size: 12px; color: var(--dm-on-green, #15803d); display: flex; gap: 6px; align-items: center; background: var(--dm-tint-green, #f0fdf4); border: 1px solid var(--dm-bd-green, #bbf7d0); border-radius: 6px; padding: 6px 10px; }
.pc-fill { color: var(--dm-on-amber, #b45309); font-style: italic; display: inline-flex; align-items: center; gap: 3px; }
.pc-fill .mdi { font-size: 12px; }
.pc-chk { width: 28px; text-align: center; }
.pc-row--sel td { background: var(--dm-tint-amber, #fff7ed); }
.pc-addpanel { border: 1px dashed var(--dm-border-strong, #cbd5e1); border-radius: 8px; padding: 10px 12px; background: var(--dm-surface2, #fafbfc); }
.pc-add-title { margin: 0 0 8px; font-size: 11px; font-weight: 700; color: var(--dm-cell, #334155); text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 5px; }
.pc-add-title .mdi { color: var(--dm-accent, #2e5396); font-size: 14px; }
.pc-add-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px 10px; }
.pc-add-grid label { display: flex; flex-direction: column; gap: 3px; font-size: 10.5px; font-weight: 600; color: var(--dm-text-2, #475569); }
.pc-in { width: 100%; padding: 5px 7px; border: 1px solid var(--dm-border-strong, #cbd5e1); border-radius: 5px; font-size: 12px; font-family: inherit; box-sizing: border-box; background: var(--dm-surface, #fff); }
.pc-in:disabled { background: var(--dm-bg, #f1f5f9); color: var(--dm-muted, #64748b); }
.pc-add-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
@media (max-width: 720px) { .pc-summary { grid-template-columns: 1fr 1fr; } }
</style>
