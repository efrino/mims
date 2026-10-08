<!-- components/welding/master/TreeNode.vue -->
<template>
  <div
    class="tree-node"
    :class="[isEntry ? 'tree-entry' : node.is_wip ? 'tree-wip' : 'tree-fp', areaClass, { 'tree-drop-target': isDropTarget, 'tree-invalid-target': isInvalidTarget, 'tree-search-match': isSearchMatch, 'is-entry': isEntry }]"
  >
    <!-- Panah arah di ujung stub konektor — flowchart standard: hierarki
         induk→anak selalu jelas arahnya, bukan cuma garis polos. -->
    <span v-if="showConnector" class="tree-connector-arrow"></span>
    <div
      class="tree-node-header"
      :draggable="!!ctx && !isEntry && perm.edit"
      @dragstart="onDragStart"
      @dragend="onDragEnd"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <!-- Toggle collapse/expand -->
      <button v-if="hasChildren" class="tree-toggle" :title="expanded ? 'Tutup' : 'Buka'" @click.stop="toggleExpand">
        <i class="mdi" :class="expanded ? 'mdi-chevron-down' : 'mdi-chevron-right'"></i>
      </button>
      <span v-else class="tree-toggle-spacer"></span>

      <span v-if="ctx && !isEntry" class="tree-drag-grip" title="Seret untuk pindah parent"><i class="mdi mdi-drag-vertical"></i></span>

      <!-- Type badge -->
      <span class="type-badge" :class="node.is_wip ? 'type-wip' : 'type-fp'">{{ node.is_wip ? 'WIP' : 'FP' }}</span>

      <!-- Identitas: part number + nama (truncate) — klik 2x utk buka spesifikasi part
           (single-click sengaja tak dipakai — biar teks masih bisa di-klik/select/copy normal). -->
      <div class="tree-label" :class="{ 'tree-label--clickable': !!ctx?.showSpec }" title="Klik 2x untuk lihat spesifikasi part" @dblclick.stop="showSpecNode">
        <span class="tree-line1">
          <span v-if="jobNo" class="tree-job" title="Job number">{{ jobNo }}</span>
          <span class="tree-pn" :class="{ 'tree-pn--sub': jobNo }">{{ node.part_number }}</span>
          <span v-if="node.op" class="tree-op">OP{{ node.op }}</span>
          <BomVerifiedBadge :verified="node.bom_verified" :rel-verified="node.rel_verified" :parent-pn="parentPn" :warnings="node.nut_warnings" :compact="!isEntry" />
        </span>
        <span
          v-if="node.part_name || node.alias"
          class="tree-sub"
          :class="{ 'tree-sub--inherited': node.part_name_inherited }"
          :title="node.part_name_inherited ? 'Nama diwarisi dari part bernomor sama (belum diisi di baris ini)' : undefined"
        >
          {{ node.part_name || node.alias }}
        </span>
      </div>

      <span class="tree-spacer"></span>

      <span v-if="showJig" class="tree-jig" :class="{ 'tree-jig--none': !parentJig }"
        :title="parentJig ? `Ditaruh di jig ${parentJig} (${parentPn ?? ''})` : 'Jig parent belum diisi — atur lewat Mesin Utama di form parent'">
        <i class="mdi mdi-vector-square"></i> Jig {{ parentJig || '?' }}
      </span>
      <!-- Mesin induk tempat komponen dipasang (induk punya >1 mesin di routing). Kosong = mesin ke-1. -->
      <span v-if="showStep" ref="stepWrapEl" class="tree-step-wrap" @click.stop>
        <button type="button" class="tree-step" :class="{ 'tree-step--miss': !splitMap && !stepMatches(stepSeq) && String(node.category ?? '').toUpperCase() === 'CKD' }" :disabled="stepSaving"
          :title="splitMap ? `Dibagi per mesin: ${splitText}` : `Dipasang di mesin ke-${stepSeq} ${parentPn ?? ''}`"
          @click="toggleStepMenu">
          <template v-if="splitMap">
            <span v-for="(q, seq) in splitMap" :key="seq" class="tree-step-part"><span class="tree-step-no">{{ seq }}</span>{{ machineOf(Number(seq)) }}<em>×{{ q }}</em></span>
          </template>
          <template v-else><span class="tree-step-no">{{ stepSeq }}</span>{{ machineOf(stepSeq) }}<em v-if="(relQty ?? 1) > 1" class="tree-step-x" :title="`${relQty}× dipasang di ${machineOf(stepSeq)} (qty relasi ${relQty})`">×{{ relQty }}</em><em v-if="stepIsAuto" class="tree-step-auto" title="Ditebak dari spec mesin — klik untuk pilih/simpan">auto</em></template>
          <i class="mdi mdi-chevron-down tree-step-caret"></i>
        </button>
        <Teleport to="body">
        <span v-if="stepMenu" ref="stepPopEl" class="tree-step-pop" :class="{ 'tree-step-pop--dark': isDark }" :style="popStyle" @mousedown.stop>
          <template v-if="!splitEdit">
            <span class="tree-step-pop-title">Dipasang di mesin<small v-if="!perm.edit" class="tree-step-ro"> · lihat saja (klik Edit utk mengubah)</small></span>
            <button v-for="r in parentRoute" :key="r.seq" type="button" class="tree-step-opt"
              :class="{ 'tree-step-opt--on': !splitMap && stepSeq === r.seq }" @click="pickStep(r.seq)">
              <span class="tree-step-no">{{ r.seq }}</span>
              <span v-if="perm.edit && parentRoute.length > 1" class="tree-step-move" @click.stop>
                <i class="mdi mdi-chevron-up" :class="{ 'is-off': r.seq === 1 }" title="Naikkan urutan mesin" @click="moveStep(r.seq, -1)"></i>
                <i class="mdi mdi-chevron-down" :class="{ 'is-off': r.seq === parentRoute.length }" title="Turunkan urutan mesin" @click="moveStep(r.seq, 1)"></i>
              </span>
              <span class="tree-step-opt-main">
                <span>{{ r.machine }} <span v-if="stepMatches(r.seq)" class="tree-step-match" title="Spec mesin ini memasok nut komponen ini">cocok</span></span>
                <span v-if="r.nuts?.length" class="tree-step-nuts">
                  <span v-for="n in r.nuts" :key="n.code" class="tree-step-nut" :class="{ 'tree-step-nut--hit': n.code === childCode }" :title="n.pn + (n.feeder ? ' · nut feeder' : ' · manual')">{{ n.feeder ? 'NF' : 'HN' }} {{ n.code }}</span>
                </span>
                <small v-else>belum ada nut di spec mesin</small>
              </span>
              <i v-if="!splitMap && stepSeq === r.seq" class="mdi mdi-check"></i>
            </button>
            <template v-if="String(node.category ?? '').toUpperCase() === 'CKD'">
              <span class="tree-step-pop-title tree-step-pop-title--sub">Mesin kompatibel (spec)</span>
              <span v-if="node.compatible_machines?.length" class="tree-compat">
                <button v-for="m in node.compatible_machines" :key="m.machine" type="button" class="tree-compat-chip"
                  :class="{ 'tree-compat-chip--route': parentRoute.some(r => r.machine.toUpperCase() === m.machine) }"
                  :disabled="stepSaving || (!splitMap && machineOf(stepSeq).toUpperCase() === m.machine)"
                  :title="!splitMap && machineOf(stepSeq).toUpperCase() === m.machine ? `${node.part_number} sudah dipasang di ${m.machine}` : `Pasang ${node.part_number} di ${m.machine}${parentRoute.some(r => r.machine.toUpperCase() === m.machine) ? '' : ' (mesin ditambahkan ke routing ' + (parentPn ?? '') + ')'} · ${m.feeder ? 'nut feeder' : 'manual'}`"
                  @click="changeStepMachine(m.machine)">
                  {{ m.machine }}<small>{{ m.feeder ? 'NF' : 'HN' }}</small>
                </button>
              </span>
              <span v-else class="tree-compat-empty">Belum ada mesin yg mencatat nut ini di spec mesin.</span>
              <template v-if="swapOptions.length">
                <span class="tree-step-pop-title tree-step-pop-title--sub">Ganti nut (tersedia di spec mesin)</span>
                <span class="tree-compat">
                  <button v-for="o in swapOptions" :key="o.code" type="button" class="tree-swap-chip" :disabled="stepSaving"
                    :title="`Ganti ${node.part_number} dengan ${o.pn} — tersedia di ${o.machines.join(', ')}`" @click="swapNut(o.pn)">
                    {{ o.pn }}<small>{{ o.machines.join(' ') }}</small>
                  </button>
                </span>
              </template>
            </template>
            <button v-if="parentRoute.length > 1" type="button" class="tree-step-opt tree-step-opt--split" :class="{ 'tree-step-opt--on': !!splitMap }" @click="openSplit">
              <span class="tree-step-no tree-step-no--split"><i class="mdi mdi-call-split"></i></span>
              <span class="tree-step-opt-main">Bagi qty per mesin<small>{{ splitMap ? splitText : 'mis. 1 di ' + machineOf(1) + ', 1 di ' + machineOf(2) }}</small></span>
              <i v-if="splitMap" class="mdi mdi-check"></i>
            </button>
          </template>
          <template v-else>
            <span class="tree-step-pop-title">Qty per mesin
              <small :class="{ 'tree-split-bad': splitMismatch }">total {{ splitTotal }}{{ relQty != null ? ' / ' + relQty : '' }}</small>
            </span>
            <label v-for="r in parentRoute" :key="r.seq" class="tree-split-row">
              <span class="tree-step-no">{{ r.seq }}</span><span class="tree-split-name">{{ r.machine }}</span>
              <input v-model.number="splitDraft[r.seq]" type="number" min="0" step="any" />
            </label>
            <span class="tree-split-actions">
              <button type="button" class="tree-split-btn" @click="splitEdit = false">Kembali</button>
              <button type="button" class="tree-split-btn tree-split-btn--ok" :disabled="stepSaving || splitMismatch" :title="splitMismatch ? 'Total qty per mesin harus sama dgn qty relasi' : undefined" @click="saveSplit">Simpan</button>
            </span>
          </template>
        </span>
        </Teleport>
      </span>
      <!-- Esensial kanan: qty · supplier/line/mesin · area · SAP.
           Qty Unit HANYA utk children WIP category WELDING/INHOUSE/OUTHOUSE
           (part fisik, bukan node terpilih/entry — utk entry lihat ParentNode.vue
           Mother card). MATERIAL/SCRAP pakai scrap_ratio (rasio konsumsi dari
           SAP), BUKAN qty_unit — field beda konsep, qty_unit tak relevan utk
           rasio material/scrap per FP. -->
      <span v-if="!isEntry && node.is_wip && (node.category === 'MATERIAL' || node.category === 'SCRAP')" class="tree-qty">
        {{ (node.rel_qty ?? node.scrap_ratio) ?? '—' }}<template v-if="(node.rel_qty ?? node.scrap_ratio) != null && node.uom"> {{ node.uom }}</template>
      </span>

      <!-- Qty per 1 mother = qty RELASI (ms_welding_parents.qty, sama dgn BOM SAP/verifikasi),
           bukan qty_unit milik part — nut 2 pcs per part tampil 2, bukan 1. -->
      <span v-else-if="!isEntry && node.is_wip" class="tree-qty" :title="parentPn ? `Qty per 1 ${parentPn}` : undefined">
        Qty Unit: {{ (node.rel_qty ?? node.qty_unit) ?? '—' }}<template v-if="(node.rel_qty ?? node.qty_unit) != null && node.uom"> {{ node.uom }}</template>
      </span>
      <span v-else-if="node.qty_kbn" class="tree-qty">
        Qty/Kbn: {{ node.qty_kbn }}<template v-if="node.uom"> {{ node.uom }}</template>
      </span>
      <span v-if="sideInfo" class="tree-side-info" :title="sideInfoLabel">{{ sideInfo }}</span>
      <span class="tree-area-badge" :class="areaClass">{{ node.area }}</span>
      <span v-if="ifppCheck" class="tree-ifpp" :class="'tree-ifpp--' + ifppCheck.tone" :title="ifppCheck.title">{{ ifppCheck.text }}</span>
      <span v-if="compareStatus === 'match' || node.rel_sap" class="sap-match-badge" :title="parentPn ? `Tercantum di BOM SAP ${parentPn}` : 'Cocok dengan BOM SAP'">
        <svg class="sap-logo" viewBox="0 0 48 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SAP">
          <defs>
            <linearGradient :id="sapGradId" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#00B8F1" />
              <stop offset="100%" stop-color="#0057B8" />
            </linearGradient>
          </defs>
          <path d="M0 0 H40 L48 24 H0 Z" :fill="`url(#${sapGradId})`" />
          <text x="20" y="17" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#fff">SAP</text>
        </svg>
      </span>

      <!-- Aksi (selalu di kanan, tak wrap) -->
      <span v-if="hasChildren && !expanded" class="tree-collapsed-count" :title="node.children!.length + ' komponen'" @click.stop="toggleExpand">{{ node.children!.length }}</span>
      <!-- Menu aksi (titik tiga) — ringkas, tidak ramai -->
      <div v-if="hasMenu" class="tree-menu-wrap">
        <button ref="kebabRef" class="tree-kebab" :class="{ active: menuOpen }" title="Aksi" @click.stop="toggleMenu">
          <i class="mdi mdi-dots-vertical"></i>
        </button>
        <Teleport to="body">
          <template v-if="menuOpen">
            <div class="tree-menu-backdrop" @click.stop="menuOpen = false" @wheel.stop="menuOpen = false" @contextmenu.prevent="menuOpen = false"></div>
            <div class="tree-menu" :style="menuStyle" @click.stop>
              <button v-if="canOpenTreeAt" class="tree-menu-item" @click="runAct('opentree')"><i class="mdi mdi-sitemap-outline"></i> Buka Hierarki di sini</button>
              <button v-if="canAdd" class="tree-menu-item" @click="runAct('add')"><i class="mdi mdi-plus"></i> Tambah komponen</button>
              <button v-if="canVerify" class="tree-menu-item" @click="runAct('verify')"><i class="mdi mdi-check-decagram-outline"></i> Verifikasi BOM</button>
              <button v-if="canEditNode" class="tree-menu-item" @click="runAct('edit')"><i class="mdi mdi-pencil-outline"></i> Edit part</button>
              <button v-if="canDetach" class="tree-menu-item" @click="runAct('detach')"><i class="mdi mdi-link-variant-off"></i> Lepas dari BOM {{ parentPn }}</button>
              <button v-if="canDeleteNode" class="tree-menu-item tree-menu-item--danger" @click="runAct('del')"><i class="mdi mdi-delete-outline"></i> Hapus part</button>
            </div>
          </template>
        </Teleport>
      </div>
    </div>

    <!-- Children -->
    <div v-if="hasChildren && expanded" class="tree-children">
      <TreeNode
        v-for="child in node.children"
        :key="child.id ?? child.part_number_mix"
        :node="child"
        :depth="depth + 1"
        :show-connector="true"
        :compare-map="isEntry ? compareMap : undefined"
        :parent-id="node.id"
        :parent-pn="node.part_number"
        :parent-route="node.route_steps ?? []"
        :parent-area="node.area ?? null"
        :parent-jig="node.jig ?? null"
        :parent-category="node.category ?? null"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import type { Ref } from 'vue';
import type { MsWeldingTreeNode, RouteStep } from '@/types/Public/Welding/master';
import BomVerifiedBadge from './BomVerifiedBadge.vue';
import masterService from '@/services/Public/Welding/masterService';
import { alertDialog, confirmDialog } from '@/utils/dialog';

// Konteks aksi tree (disediakan oleh master-data.vue saat di dalam modal).
// null bila TreeNode dipakai di tempat tanpa drag/add (mode read-only).
interface TreeCtx {
  startDrag: (n: MsWeldingTreeNode, parentId?: number | null) => void;
  endDrag: () => void;
  canDrop: (target: MsWeldingTreeNode) => boolean;
  drop: (target: MsWeldingTreeNode) => void;
  addChild?: (n: MsWeldingTreeNode) => void;   // opsional (mode papan WIP tak punya)
  // parentId = id parent LANGSUNG node ini di render tree saat ini (bukan mix — akurat
  // per-cabang; node yg sama bisa muncul di >1 cabang dgn parent berbeda kalau multi-parent).
  deleteNode?: (n: MsWeldingTreeNode, parentId?: number | null) => void; // opsional
  detachNode?: (n: MsWeldingTreeNode, parentId: number, parentPn: string | null) => void; // lepas relasi dari induk ini saja
  editNode?: (n: MsWeldingTreeNode) => void;   // opsional: buka form edit
  onReject?: (target: MsWeldingTreeNode) => void; // feedback drop ditolak
  showSpec?: (n: MsWeldingTreeNode) => void;   // opsional: buka modal spesifikasi part
  openTreeAt?: (n: MsWeldingTreeNode) => void; // opsional: buka Hierarki & BOM dgn node ini sbg entry baru
  verifyBom?: (n: MsWeldingTreeNode) => void;
  onRelationChanged?: () => void;  // opsional: muat ulang tree (peringatan NUT dihitung ulang)  // opsional: buka Verifikasi BOM part ini
}
const ctx = inject<TreeCtx | null>('treeCtx', null);
const treeSearch = inject<Ref<string>>('treeSearch', ref(''));
// Hak akses tree (master-data): edit = mode Edit aktif + izin Update. Tanpa provider (papan lain) = bebas.
interface TreePerm { edit: boolean; create: boolean; update: boolean; del: boolean }
const permRef = inject<Ref<TreePerm> | null>('treePerm', null);
const perm = computed<TreePerm>(() => permRef?.value ?? { edit: true, create: true, update: true, del: true });
const isDropTarget = ref(false);
const isInvalidTarget = ref(false);

function showSpecNode() { ctx?.showSpec?.(props.node); }

function onDragStart(e: DragEvent) {
  if (!ctx || props.isEntry || !perm.value.edit) { e.preventDefault(); return; }
  e.stopPropagation();
  ctx.startDrag(props.node, props.parentId);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
}
function onDragEnd() { ctx?.endDrag(); isDropTarget.value = false; isInvalidTarget.value = false; }
function onDragOver(e: DragEvent) {
  if (!ctx) return;
  e.preventDefault();      // izinkan drop event supaya bisa beri feedback alasan
  e.stopPropagation();
  if (ctx.canDrop(props.node)) { isDropTarget.value = true; isInvalidTarget.value = false; }
  else { isInvalidTarget.value = true; isDropTarget.value = false; }
}
function onDragLeave() { isDropTarget.value = false; isInvalidTarget.value = false; }
function onDrop(e: DragEvent) {
  if (!ctx) return;
  e.preventDefault();
  e.stopPropagation();
  const ok = ctx.canDrop(props.node);
  isDropTarget.value = false;
  isInvalidTarget.value = false;
  if (ok) ctx.drop(props.node);
  else ctx.onReject?.(props.node);
}

interface Props {
  node: MsWeldingTreeNode;
  depth?: number;
  isEntry?: boolean;
  showConnector?: boolean;
  // Peta perbandingan BOM (part_number → status); hanya diisi untuk anak langsung entry.
  compareMap?: Record<string, 'match' | 'master_only'>;
  parentId?: number | null; // id parent LANGSUNG node ini di render tree saat ini
  parentPn?: string | null; // part_number parent langsung (judul tanda verified/SAP relasi)
  parentRoute?: RouteStep[]; // routing mesin parent (urut) — pilihan "dipasang di"
  parentArea?: string | null; // area parent: urutan mesin hanya utk WSS; robot pakai jig
  parentJig?: string | null;  // jig parent (area robot) — komponen ditaruh di jig ini
  parentCategory?: string | null; // jig hanya utk parent WELDING (robot CO/SA), bukan press
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  isEntry: false,
  showConnector: false,
  compareMap: undefined,
  parentId: null,
  parentPn: null,
  parentRoute: () => [],
  parentArea: null,
  parentJig: null,
  parentCategory: null,
});

// Langkah routing induk tempat komponen ini dipasang (ms_welding_parents.route_seq; kosong = 1).
const stepSeq = ref<number>(props.node.rel_route_seq ?? props.node.rel_route_seq_auto ?? 1);
watch(() => [props.node.rel_route_seq, props.node.rel_route_seq_auto], () => { stepSeq.value = props.node.rel_route_seq ?? props.node.rel_route_seq_auto ?? 1; });
// Mesin hasil tebakan spec (belum disimpan user).
const stepIsAuto = computed(() => props.node.rel_route_seq == null && !props.node.rel_route_split && props.node.rel_route_seq_auto != null);
// Nut komponen ini dipasok mesin mana (cocok kode dasar, mis. 9004A-17210 ≈ M6-17210).
const childCode = computed(() => String(props.node.part_number ?? '').toUpperCase().split('-').pop());
const stepNuts = (seq: number) => props.parentRoute.find(r => r.seq === seq)?.nuts ?? [];
const stepMatches = (seq: number) => stepNuts(seq).some(n => n.code === childCode.value);
// Job number ditampilkan utama (identitas di lantai produksi); part number di sampingnya.
const jobNo = computed(() => {
  const j = String(props.node.job_number ?? '').trim();
  return j && j.toUpperCase() !== String(props.node.part_number ?? '').toUpperCase() ? j : '';
});
// Part single (INHOUSE/OUTHOUSE): cocokkan kategori master dgn data IFPP (ms_data_ifpp) — entry saja.
const ifppCheck = computed(() => {
  if (!props.isEntry || props.node.ifpp_source === undefined) return null;
  const cat = String(props.node.category ?? '').toUpperCase();
  const src = props.node.ifpp_source;
  if (!src) return { tone: 'none', text: 'IFPP: tidak ada data', title: 'Part ini tidak ditemukan di data IFPP — INHOUSE/OUTHOUSE belum bisa dicek' };
  if (src.category === cat) return { tone: 'ok', text: `IFPP: ${src.category} ✓`, title: `Data IFPP (${src.area ?? '—'}) sama dgn master: ${cat}` };
  return { tone: 'bad', text: `IFPP: ${src.category || '?'} ≠ ${cat}`, title: `Data IFPP (${src.area ?? '—'}) mencatat ${src.category || '—'}, master mencatat ${cat} — cek mana yg benar` };
});
const stepSaving = ref(false);
// Nut lain yg tersedia di spec mesin routing induk (WSS) → pilihan "Ganti nut".
const swapOptions = computed(() => {
  const by = new Map<string, { pn: string; code: string; machines: string[] }>();
  for (const r of props.parentRoute) for (const n of r.nuts ?? []) {
    if (n.code === childCode.value) continue;
    const o = by.get(n.code) ?? { pn: n.pn, code: n.code, machines: [] };
    if (!o.machines.includes(r.machine)) o.machines.push(r.machine);
    by.set(n.code, o);
  }
  return [...by.values()].sort((a, b) => a.pn.localeCompare(b.pn));
});
// Pasang komponen di mesin kompatibel spec: mesin belum ada di routing induk → ditambahkan;
// mesin induk yg jadi tak dipakai komponen mana pun dilepas otomatis (backend).
async function changeStepMachine(machine: string) {
  if (!perm.value.edit) return;
  if (!props.parentId || !props.node.id) return;
  const isNew = !props.parentRoute.some(r => r.machine.toUpperCase() === machine);
  const msg = `Pasang ${props.node.part_number} di ${machine}?` + (isNew ? `\n${machine} ditambahkan ke routing ${props.parentPn ?? ''}.` : '')
    + '\nMesin yg tak lagi dipakai komponen mana pun ikut dilepas.';
  if (!await confirmDialog(msg, { title: 'Pilih mesin', confirmText: 'Pasang' })) return;
  stepSaving.value = true;
  try {
    const r = await masterService.setStepMachine(props.parentId, props.node.id, machine);
    if (!r.success) { alertDialog(r.message ?? 'Gagal memasang di mesin.'); return; }
    closeStepMenu();
    ctx?.onRelationChanged?.();
  } catch (err: any) {
    alertDialog(err?.response?.data?.message ?? err?.message ?? 'Gagal memasang di mesin.');
  } finally { stepSaving.value = false; }
}
// Urutan mesin induk WSS (mis. B6 B4 → B4 B6); komponen tetap di mesin masing-masing.
async function moveStep(seq: number, dir: -1 | 1) {
  if (!perm.value.edit || !props.parentId) return;
  const order = props.parentRoute.map(r => r.machine);
  const j = seq - 1 + dir;
  if (j < 0 || j >= order.length || stepSaving.value) return;
  [order[seq - 1], order[j]] = [order[j], order[seq - 1]];
  stepSaving.value = true;
  try {
    const r = await masterService.reorderSteps(props.parentId, order);
    if (!r.success) { alertDialog(r.message ?? 'Gagal mengubah urutan mesin.'); return; }
    closeStepMenu();
    ctx?.onRelationChanged?.();
  } catch (err: any) {
    alertDialog(err?.response?.data?.message ?? err?.message ?? 'Gagal mengubah urutan mesin.');
  } finally { stepSaving.value = false; }
}
async function swapNut(pn: string) {
  if (!perm.value.edit) return;
  if (!props.node.id || !props.parentId) return;
  stepSaving.value = true;
  try {
    const r = await masterService.replaceChild(props.parentId, props.node.id, pn);
    if (!r.success) { alertDialog(r.message ?? 'Gagal mengganti nut.'); return; }
    closeStepMenu();
    ctx?.onRelationChanged?.();
  } catch (err: any) {
    alertDialog(err?.response?.data?.message ?? err?.message ?? 'Gagal mengganti nut.');
  } finally { stepSaving.value = false; }
}
// Tag mesin hanya utk komponen yg DIPASANG di mesin tertentu (nut/CKD/part beli). Press (part
// utama setengah jadi) masuk di awal; material/scrap dikonsumsi proses pertama → tanpa tag.
// Parent robot (area non-WSS): komponen ditaruh di jig parent, bukan urutan mesin.
const parentIsWss = computed(() => String(props.parentArea ?? '').toUpperCase().startsWith('WSS'));
const showJig = computed(() => !props.isEntry && !!props.parentId && !!props.parentArea && !parentIsWss.value
  && String(props.parentCategory ?? '').toUpperCase() === 'WELDING'
  && !['INHOUSE', 'OUTHOUSE', 'MATERIAL', 'SCRAP'].includes(String(props.node.category ?? '').toUpperCase()));
const showStep = computed(() => {
  if (props.isEntry || !props.parentRoute.length || !parentIsWss.value) return false;
  const cat = String(props.node.category ?? '').toUpperCase();
  if (['INHOUSE', 'OUTHOUSE', 'MATERIAL', 'SCRAP'].includes(cat)) return false;   // part utama (press) & material: proses awal
  // 1 mesin: tetap tampil utk CKD supaya semua nut/bolt terpetakan (tag kuning bila tak ada di spec mesin).
  return props.parentRoute.length > 1 || cat === 'CKD';
});
// Qty per mesin (komponen sama di >1 mesin): "1:1,2:1" → { 1: 1, 2: 1 }.
const parseSplit = (v?: string | null) => {
  const out: Record<number, number> = {};
  for (const part of (v ?? '').split(',')) { const m = part.trim().match(/^(\d+)\s*:\s*(-?[\d.]+)$/); if (m && Number(m[2])) out[Number(m[1])] = Number(m[2]); }
  return Object.keys(out).length > 1 ? out : null;
};
const splitMap = computed(() => parseSplit(props.node.rel_route_split));
const machineOf = (seq: number) => props.parentRoute.find(r => r.seq === seq)?.machine ?? '?';
const splitText = computed(() => Object.entries(splitMap.value ?? {}).map(([k, q]) => `${machineOf(Number(k))}×${q}`).join(', '));
const relQty = computed(() => props.node.rel_qty ?? null);
const splitEdit = ref(false);
const splitDraft = ref<Record<number, number>>({});
const splitTotal = computed(() => Object.values(splitDraft.value).reduce((a, b) => a + (Number(b) || 0), 0));
// Qty per mesin wajib habis terpakai — total harus = qty relasi (tak boleh sisa/lebih).
const splitMismatch = computed(() => relQty.value != null && Math.abs(splitTotal.value - relQty.value) > 0.0005);
async function saveSplit() {
  if (!perm.value.edit) return;
  if (!props.node.id || !props.parentId) return;
  const parts = Object.entries(splitDraft.value).filter(([, q]) => Number(q)).map(([k, q]) => `${k}:${q}`);
  stepSaving.value = true;
  try {
    const r = await masterService.setRelationRoute(props.node.id, props.parentId, null, parts.join(','));
    if (!r.success) throw new Error(r.message);
    props.node.rel_route_split = r.route_split ?? null;
    props.node.rel_route_seq = r.route_seq ?? null;
    stepSeq.value = r.route_seq ?? 1;
    closeStepMenu();
    if (r.warning) alertDialog(r.warning, { tone: 'warning' });
    ctx?.onRelationChanged?.();
  } catch (err: any) {
    alertDialog(err?.response?.data?.message ?? err?.message ?? 'Gagal menyimpan qty per mesin.');
  } finally { stepSaving.value = false; }
}
// Menu pilih mesin (popover bergaya web, bukan <select> native).
const stepMenu = ref(false);
const stepWrapEl = ref<HTMLElement | null>(null);
const stepPopEl = ref<HTMLElement | null>(null);
// Popover di-teleport ke <body> (posisi fixed) supaya tak terpotong overflow wadah tree/modal.
const popStyle = ref<Record<string, string>>({});
const isDark = ref(false);
function placePop() {
  const b = stepWrapEl.value?.getBoundingClientRect();
  if (!b) return;
  const w = 270, h = 150 + (props.parentRoute.length + 1) * 56;
  const up = b.bottom + 6 + h > window.innerHeight && b.top - 6 - h > 0;
  popStyle.value = {
    left: `${Math.max(8, Math.min(b.right - w, window.innerWidth - w - 8))}px`,
    ...(up ? { bottom: `${window.innerHeight - b.top + 6}px` } : { top: `${b.bottom + 6}px` }),
  };
}
function onDocClick(e: MouseEvent) {
  const t = e.target as Node;
  if (stepWrapEl.value?.contains(t) || stepPopEl.value?.contains(t)) return;
  closeStepMenu();
}
function closeStepMenu() { stepMenu.value = false; splitEdit.value = false; document.removeEventListener('mousedown', onDocClick); }
function toggleStepMenu() {
  if (stepMenu.value) { closeStepMenu(); return; }
  isDark.value = document.documentElement.classList.contains('dark');
  placePop();
  stepMenu.value = true; splitEdit.value = false;
  document.addEventListener('mousedown', onDocClick);
  window.addEventListener('scroll', closeStepMenu, { capture: true, once: true });
}
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick));
function openSplit() {
  if (!perm.value.edit) return;
  const cur = splitMap.value ?? { [stepSeq.value]: relQty.value ?? 1 };
  splitDraft.value = Object.fromEntries(props.parentRoute.map(r => [r.seq, cur[r.seq] ?? 0]));
  splitEdit.value = true;
}
async function pickStep(seq: number) {
  if (!perm.value.edit) return;
  closeStepMenu();
  if (!props.node.id || !props.parentId || (!splitMap.value && seq === stepSeq.value)) return;
  const prev = stepSeq.value;
  stepSeq.value = seq; stepSaving.value = true;
  try {
    const r = await masterService.setRelationRoute(props.node.id, props.parentId, seq);
    if (!r.success) throw new Error(r.message);
    props.node.rel_route_seq = seq;
    props.node.rel_route_split = null;
    ctx?.onRelationChanged?.();
  } catch (err: any) {
    stepSeq.value = prev;
    alertDialog(err?.response?.data?.message ?? err?.message ?? 'Gagal menyimpan mesin.');
  } finally { stepSaving.value = false; }
}


const compareStatus = computed(() => props.compareMap?.[props.node.part_number]);
// id gradient unik per node agar tidak saling timpa antar SVG
const sapGradId = `sapgrad-${props.node.id ?? props.node.part_number_mix ?? Math.random().toString(36).slice(2)}`;

// Info tambahan di kiri badge area — beda sumber per category:
//  - IFRM / CKD / OUTHOUSE → supplier (kolom vendor)
//  - INHOUSE (IFPP)        → line terakhir (token terakhir line_press)
//  - WELDING (IFPW)        → mesin (kolom machine)
const _CAT = (s?: string | null) => (s ?? '').toUpperCase();
const sideInfo = computed(() => {
  const cat = _CAT(props.node.category);
  if (cat === 'IFRM' || cat === 'MATERIAL' || cat === 'CKD' || cat === 'OUTHOUSE') {
    return props.node.vendor || null;
  }
  if (cat === 'INHOUSE') {
    const lp = (props.node.line_press || '').trim();
    if (!lp) return null;
    const toks = lp.includes(',') ? lp.split(',') : lp.split(/\s+/);
    // Awal → akhir (urutan lengkap di tooltip): line terakhir menyerahkan part ke welding.
    const t = toks.map(x => x.trim()).filter(Boolean);
    if (!t.length) return null;
    return t.length > 1 ? `${t[0]} → ${t[t.length - 1]}` : t[0];
  }
  if (cat === 'WELDING') {
    return props.node.machine || null;
  }
  return null;
});
const sideInfoLabel = computed(() => {
  const cat = _CAT(props.node.category);
  if (cat === 'IFRM' || cat === 'MATERIAL' || cat === 'CKD' || cat === 'OUTHOUSE') return 'Supplier';
  if (cat === 'INHOUSE') return `Line press (urut): ${props.node.line_press ?? ''}`;
  if (cat === 'WELDING') return 'Mesin';
  return '';
});

const AREA_COLORS: Record<string, string> = {
  'SA ADM':      'area-rb',
  'CO ADM':      'area-rc',
  'SA HMMI':     'area-rh',
  'WSS ADM': 'area-wa',
  'WSS MMKI': 'area-wm'
};

const areaClass = computed(() => AREA_COLORS[props.node.area ?? ''] ?? 'area-other');

// Collapse/expand (explorer-like): entry terbuka, node lain dgn anak default tertutup.
// Saat ada pencarian aktif → paksa terbuka agar hasil match terlihat.
const hasChildren = computed(() => !!(props.node.children && props.node.children.length));
const expandedLocal = ref(props.isEntry);
const searchActive = computed(() => !!treeSearch.value.trim());
const expanded = computed(() => (searchActive.value ? true : expandedLocal.value));
function toggleExpand() { if (!searchActive.value) expandedLocal.value = !expandedLocal.value; }

// Sorot node yang cocok dengan pencarian (board tree)
const isSearchMatch = computed(() => {
  const t = treeSearch.value.trim().toLowerCase();
  if (!t) return false;
  return (props.node.part_number || '').toLowerCase().includes(t)
    || (props.node.part_name || '').toLowerCase().includes(t)
    || (props.node.alias || '').toLowerCase().includes(t);
});

// Node CKD (nut) / IFPP (press) = komponen terminal → tak boleh tambah anak.
const _U = (s?: string | null) => (s ?? '').toUpperCase();
const isCkd = computed(() => _U(props.node.area) === 'CKD');
const isPress = computed(() => _U(props.node.area) === 'INHOUSE' || _U(props.node.layer) === 'IFPP');
const canAdd = computed(() => !!ctx && !!ctx.addChild && !isCkd.value && !isPress.value && perm.value.edit && perm.value.create);
// "Buka Hierarki di sini" tak berguna utk entry (itu sendiri sudah tree yg lagi
// terbuka) — cuma relevan utk node LAIN di dalam tree (mother/child manapun).
const canOpenTreeAt = computed(() => !!ctx?.openTreeAt && !props.isEntry);
// Verifikasi BOM hanya utk part yg punya BOM (bukan nut/material/scrap terminal).
const canVerify = computed(() => !!ctx?.verifyBom && perm.value.edit && !['CKD', 'MATERIAL', 'SCRAP'].includes(_U(props.node.category)));
const canEditNode = computed(() => !!ctx?.editNode && perm.value.update);
const canDeleteNode = computed(() => !!ctx?.deleteNode && !props.isEntry && perm.value.edit && perm.value.del);

// Menu aksi (titik tiga) — di-Teleport ke body, posisi fixed dihitung dari tombol,
// flip kiri/kanan & atas/bawah sesuai ruang yang tersedia. Z-index di atas modal.
const menuOpen = ref(false);
const kebabRef = ref<HTMLElement | null>(null);
const menuStyle = ref<Record<string, string>>({});
// Lepas komponen dari BOM induk yg sedang dilihat (relasi saja, part tetap ada).
const canDetach = computed(() => !!ctx?.detachNode && !props.isEntry && !!props.parentId && !!props.node.id && perm.value.edit);
const menuItemCount = computed(() => (canOpenTreeAt.value ? 1 : 0) + (canAdd.value ? 1 : 0) + (canVerify.value ? 1 : 0) + (canEditNode.value ? 1 : 0) + (canDetach.value ? 1 : 0) + (canDeleteNode.value ? 1 : 0));
const hasMenu = computed(() => menuItemCount.value > 0);

function toggleMenu() {
  if (menuOpen.value) { menuOpen.value = false; return; }
  const btn = kebabRef.value;
  const r = btn ? btn.getBoundingClientRect() : null;
  const vw = window.innerWidth, vh = window.innerHeight;
  const menuW = 180, menuH = menuItemCount.value * 38 + 10, gap = 4, pad = 8;
  if (r) {
    // Horizontal: rata kanan tombol; bila tembus kiri → buka ke kanan; clamp ke viewport
    let left = r.right - menuW;
    if (left < pad) left = r.left;
    left = Math.min(Math.max(left, pad), vw - menuW - pad);
    // Vertical: bawah tombol; bila tembus bawah → atas
    let top = r.bottom + gap;
    if (top + menuH > vh - pad) top = r.top - menuH - gap;
    if (top < pad) top = pad;
    menuStyle.value = { top: `${top}px`, left: `${left}px` };
  }
  menuOpen.value = true;
}
function runAct(a: 'add' | 'edit' | 'del' | 'opentree' | 'verify' | 'detach') {
  menuOpen.value = false;
  if (a === 'add') ctx?.addChild?.(props.node);
  else if (a === 'edit') ctx?.editNode?.(props.node);
  else if (a === 'opentree') ctx?.openTreeAt?.(props.node);
  else if (a === 'verify') ctx?.verifyBom?.(props.node);
  else if (a === 'detach') ctx?.detachNode?.(props.node, props.parentId!, props.parentPn);
  else ctx?.deleteNode?.(props.node, props.parentId);
}
</script>

<style scoped>
/* ── Base node ───────────────────────────────────────────────── */
.tree-node {
  border-radius: 7px;
  padding: 9px 12px;
  margin-bottom: 6px;
  border: 1.5px solid var(--dm-border, #e5e7eb);
  transition: box-shadow 0.15s;
  position: relative;
}
.tree-node:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

.tree-fp {
  background: var(--dm-tint-green, #f0fdf4);
}
.tree-wip {
  background: var(--dm-tint-amber, #fffbeb);
}

/* ── Entry node (yang diklik) ─────────────────────────────── */
.tree-entry {
  background: var(--dm-tint-blue, #eff6ff);
  border: 2px solid #2e5396;
  box-shadow: 0 0 0 3px rgba(46, 83, 150, 0.12);
}
.tree-entry-marker {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  color: var(--dm-accent, #2e5396);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.tree-entry-marker i {
  font-size: 10px;
}

/* ── Area color overrides ──────────────────────────────────── */
.tree-fp.area-rb {
  border-color: var(--dm-bd-blue, #93c5fd);
  background: var(--dm-tint-blue, #eff6ff);
}
.tree-fp.area-rt {
  border-color: #c4b5fd;
  background: var(--dm-tint-violet, #f5f3ff);
}
.tree-fp.area-rc {
  border-color: #6ee7b7;
  background: var(--dm-tint-green, #ecfdf5);
}
.tree-fp.area-rh {
  border-color: var(--dm-bd-red, #f9a8d4);
  background: var(--dm-tint-red, #fdf2f8);
}
.tree-fp.area-wa {
  border-color: var(--dm-bd-amber, #fde047);
  background: var(--dm-tint-amber, #fefce8);
}
.tree-fp.area-wm {
  border-color: #fdba74;
  background: var(--dm-tint-amber, #fff7ed);
}
.tree-fp.area-sm {
  border-color: var(--dm-bd-green, #86efac);
  background: var(--dm-tint-green, #f0fdf4);
}
.tree-wip.area-rb {
  border-color: var(--dm-bd-blue, #bfdbfe);
  background: var(--dm-tint-blue, #f0f7ff);
}
.tree-wip.area-rt {
  border-color: var(--dm-bd-blue, #ddd6fe);
  background: var(--dm-tint-violet, #f5f3ff);
}
.tree-wip.area-rc {
  border-color: var(--dm-bd-green, #a7f3d0);
  background: var(--dm-tint-green, #f0fdfb);
}
.tree-wip.area-rh {
  border-color: var(--dm-bd-red, #fbcfe8);
  background: var(--dm-tint-red, #fdf2f8);
}
.tree-wip.area-wa {
  border-color: var(--dm-bd-amber, #fef08a);
  background: var(--dm-tint-amber, #fefce8);
}
.tree-wip.area-wm {
  border-color: var(--dm-bd-amber, #fed7aa);
  background: var(--dm-tint-amber, #fff7ed);
}
.tree-wip.area-sm {
  border-color: var(--dm-bd-green, #bbf7d0);
  background: var(--dm-tint-green, #f0fdf4);
}
.tree-node.area-other {
  border-color: var(--dm-border, #d1d5db);
  background: var(--dm-surface2, #f9fafb);
}
.tree-ckd-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  background: var(--dm-tint-red, #fce7f3);
  color: var(--dm-on-red, #9d174d);
  border: 1px solid var(--dm-bd-red, #f9a8d4);
  flex-shrink: 0;
  white-space: nowrap;
  cursor: default;
}

/* Entry node keep the blue border regardless of area */
.tree-entry {
  border-color: #2e5396 !important;
}

/* ── Header row: SATU baris, tak wrap; label truncate, aksi tetap kanan ── */
.tree-node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  min-width: 0;
  min-height: 35px;  /* tinggi seragam (1 / 2 baris) → panah konektor selalu pas di tengah */
}
.tree-spacer { flex: 1 1 auto; min-width: 4px; }
.tree-entry-star { color: var(--dm-accent, #2e5396); font-size: 11px; flex-shrink: 0; }

.type-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}
.type-fp { background: var(--dm-tint-green, #dcfce7); color: var(--dm-on-green, #166534); }
.type-wip { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #92400e); }

/* Label 2 baris: part number + sub (nama/mesin) truncate */
.tree-label {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 0 1 auto;
  overflow: hidden;
}
.tree-label--clickable { cursor: pointer; }
.tree-label--clickable:hover .tree-pn { text-decoration: underline; }
.tree-job { font-weight: 800; font-size: 13px; color: var(--dm-accent, #1d4ed8); white-space: nowrap; }
.tree-pn--sub { font-weight: 600; font-size: 11.5px; color: var(--dm-muted, #64748b); }
.tree-line1 { display: flex; align-items: center; gap: 5px; min-width: 0; }
.tree-pn {
  font-weight: 700;
  font-size: 12.5px;
  color: var(--dm-text, #1a2744);
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tree-sub {
  font-size: 10px;
  color: var(--dm-faint, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tree-sub-sep { color: #cbd5e1; }
.tree-sub--inherited { font-style: italic; }

.tree-op {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--dm-tint-blue, #dbeafe);
  color: var(--dm-accent, #1d4ed8);
  flex-shrink: 0;
}

.tree-qty {
  font-size: 10px;
  font-weight: 600;
  color: var(--dm-muted, #64748b);
  flex-shrink: 0;
  white-space: nowrap;
}
.tree-side-info {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--dm-text-2, #475569);
  background: var(--dm-bg, #f1f5f9);
  border: 1px solid var(--dm-border, #e2e8f0);
  border-radius: 8px;
  padding: 1px 7px;
  flex-shrink: 0;
  white-space: nowrap;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Area badge ────────────────────────────────────────────── */
.tree-area-badge {
  font-size: 8.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  letter-spacing: 0.02em;
  flex-shrink: 0;
  white-space: nowrap;
}
.area-rb {
  background: var(--dm-tint-blue, #dbeafe);
  color: var(--dm-accent, #1d4ed8);
  border: 1px solid var(--dm-bd-blue, #93c5fd);
}
.area-rt {
  background: var(--dm-tint-violet, #ede9fe);
  color: var(--dm-on-violet, #6d28d9);
  border: 1px solid #c4b5fd;
}
.area-rc {
  background: var(--dm-tint-green, #d1fae5);
  color: var(--dm-on-green, #065f46);
  border: 1px solid #6ee7b7;
}
.area-rh {
  background: var(--dm-tint-red, #fce7f3);
  color: var(--dm-on-red, #9d174d);
  border: 1px solid var(--dm-bd-red, #f9a8d4);
}
.area-wa {
  background: var(--dm-tint-amber, #fef9c3);
  color: var(--dm-on-amber, #713f12);
  border: 1px solid var(--dm-bd-amber, #fde047);
}
.area-wm {
  background: var(--dm-tint-amber, #ffedd5);
  color: var(--dm-on-amber, #9a3412);
  border: 1px solid #fdba74;
}
.area-sm {
  background: var(--dm-tint-green, #f0fdf4);
  color: var(--dm-on-green, #14532d);
  border: 1px solid var(--dm-bd-green, #86efac);
}
.area-other {
  background: var(--dm-bg, #f3f4f6);
  color: var(--dm-cell, #374151);
  border: 1px solid var(--dm-border, #d1d5db);
}

/* ── Connector tree (explorer-like): garis vertikal + stub horizontal.
   Setiap node anak menggambar TRUNK vertikalnya sendiri (bukan satu
   border-left di container) — supaya node terakhir bisa berhenti pas di
   titik stub lalu melengkung, tanpa perlu "menghapus" sisa garis dgn warna
   background (rawan meleset kalau background node berwarna, mis. WIP kuning
   pucat, bukan putih polos). ── */
.tree-children {
  /* Warna tema perusahaan: garis biru, aliran bergantian biru–merah. */
  --tree-line: #9fb3d9;       /* garis dasar biru muda — kontras di atas bg kuning/biru pucat */
  --tree-blue: #2e5396;
  --tree-red: #d7263d;
  --stub-y: 25px;             /* tengah header (padding 9 + setengah min-height 35 − 1.5 border), diukur di browser */
  margin-top: 6px;
  margin-left: 7px;
  padding-left: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tree-children > .tree-node { margin-bottom: 0; position: relative; }
/* Panah di ujung stub, mengarah ke node — arah hierarki induk→anak eksplisit. */
.tree-connector-arrow {
  position: absolute;
  left: -5px;
  top: calc(var(--stub-y) - 4px);
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 5px 0 5px 7px;
  border-color: transparent transparent transparent var(--tree-blue);
  z-index: 1;
}
/* Trunk: turun menyambung ke gap berikutnya (garis antar-sibling tak putus).
   Garis dasar + "aliran" titik biru bergerak ke bawah (arah induk → anak). */
.tree-children > .tree-node::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 0;
  bottom: -6px;
  width: 2px;
  background:
    repeating-linear-gradient(to bottom, var(--tree-blue) 0 4px, transparent 4px 7px, var(--tree-red) 7px 11px, transparent 11px 14px),
    var(--tree-line);
  background-size: 2px 14px, auto;
  animation: tree-flow-down 1.1s linear infinite;
}
/* Stub horizontal ke tiap node — aliran bergerak ke kanan menuju panah. */
.tree-children > .tree-node::after {
  content: '';
  position: absolute;
  left: -12px;
  top: calc(var(--stub-y) - 1px);
  width: 9px;
  height: 2px;
  background:
    repeating-linear-gradient(to right, var(--tree-blue) 0 3px, transparent 3px 4.5px, var(--tree-red) 4.5px 7.5px, transparent 7.5px 9px),
    var(--tree-line);
  background-size: 9px 2px, auto;
  animation: tree-flow-right 0.9s linear infinite;
}
/* Node terakhir: trunk beranimasi turun lalu melengkung "╰" ke panah. Lengkungan
   (::after) pakai border radius — gradient tak bisa ikut melengkung, jadi warnanya
   berdenyut biru↔merah selaras aliran. */
.tree-children > .tree-node:last-child::before {
  bottom: auto;
  height: calc(var(--stub-y) - 7px);
}
.tree-children > .tree-node:last-child::after {
  top: calc(var(--stub-y) - 8px);
  width: 9px;
  height: 9px;
  background: none;
  border-left: 2px solid var(--tree-blue);
  border-bottom: 2px solid var(--tree-blue);
  border-bottom-left-radius: 8px;
  animation: tree-flow-pulse 1.1s ease-in-out infinite;
}
@keyframes tree-flow-pulse { 50% { border-color: var(--tree-red); } }
@keyframes tree-flow-down  { from { background-position: 0 0, 0 0; } to { background-position: 0 14px, 0 0; } }
@keyframes tree-flow-right { from { background-position: 0 0, 0 0; } to { background-position: 9px 0, 0 0; } }
@media (prefers-reduced-motion: reduce) {
  .tree-children > .tree-node::before,
  .tree-children > .tree-node::after { animation: none; }
}

/* ── Badge perbandingan BOM SAP ── */
.tree-cmp-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  flex-shrink: 0;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.tree-cmp-badge .mdi { font-size: 11px; }
.cmp-match {
  background: var(--dm-tint-green, #dcfce7);
  color: var(--dm-on-green, #166534);
  border: 1px solid var(--dm-bd-green, #86efac);
}
.cmp-master {
  background: var(--dm-tint-amber, #fef3c7);
  color: var(--dm-on-amber, #92400e);
  border: 1px solid var(--dm-bd-amber, #fcd34d);
}

/* ── Badge cocok berlogo SAP ── */
.sap-match-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  padding: 2px 5px 2px 3px;
  border-radius: 5px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
}
.sap-logo {
  height: 14px;
  width: auto;
  display: block;
}
.sap-match-check {
  font-size: 13px;
  color: var(--dm-on-green, #16a34a);
  line-height: 1;
}

/* ── Drag-n-drop re-parent + tambah komponen ── */
.tree-drag-grip {
  color: #cbd5e1;
  cursor: grab;
  font-size: 15px;
  flex-shrink: 0;
  display: inline-flex;
}
.tree-node-header[draggable='true'] { cursor: grab; }
.tree-drop-target {
  outline: 2px dashed #2563eb;
  outline-offset: 2px;
  background: var(--dm-tint-blue, #eff6ff) !important;
}
.tree-invalid-target {
  outline: 2px dashed #dc2626;
  outline-offset: 2px;
  background: var(--dm-tint-red, #fef2f2) !important;
  position: relative;
}
.tree-invalid-target::after {
  content: '⊘ tak boleh di sini';
  position: absolute; top: 50%; right: 10px; transform: translateY(-50%);
  font-size: 10px; font-weight: 700; color: var(--dm-on-red, #dc2626);
  background: var(--dm-surface, #fff); border: 1px solid var(--dm-bd-red, #fecaca); border-radius: 6px; padding: 1px 7px;
  pointer-events: none;
}
.tree-search-match {
  outline: 2px solid #f59e0b;
  outline-offset: 1px;
  background: var(--dm-tint-amber, #fffbeb) !important;
}
/* Menu aksi titik tiga */
.tree-menu-wrap { position: relative; flex-shrink: 0; }
.tree-kebab {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; padding: 0;
  border: none; background: transparent; color: var(--dm-faint, #94a3b8); cursor: pointer; border-radius: 5px;
}
.tree-kebab:hover, .tree-kebab.active { background: var(--dm-bg, #e2e8f0); color: var(--dm-cell, #334155); }
.tree-kebab .mdi { font-size: 17px; }
.tree-menu {
  position: fixed; z-index: 100000;
  width: 180px; background: var(--dm-surface, #fff); border: 1px solid var(--dm-border, #e2e8f0); border-radius: 9px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.2); padding: 4px; overflow: hidden;
}
.tree-menu-item {
  display: flex; align-items: center; gap: 9px; width: 100%;
  padding: 8px 10px; border: none; background: transparent; cursor: pointer;
  font-size: 12.5px; color: var(--dm-cell, #334155); text-align: left; border-radius: 6px;
}
.tree-menu-item:hover { background: var(--dm-bg, #f1f5f9); }
.tree-menu-item .mdi { font-size: 15px; color: var(--dm-muted, #64748b); }
.tree-menu-item--danger { color: var(--dm-on-red, #dc2626); }
.tree-menu-item--danger .mdi { color: var(--dm-on-red, #dc2626); }
.tree-menu-backdrop { position: fixed; inset: 0; z-index: 99999; background: transparent; }

/* ── Collapse / expand ── */
.tree-toggle {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; flex-shrink: 0; padding: 0;
  border: none; background: transparent; color: var(--dm-muted, #64748b); cursor: pointer; border-radius: 4px;
}
.tree-toggle:hover { background: var(--dm-bg, #e2e8f0); color: var(--dm-text, #1e293b); }
.tree-toggle .mdi { font-size: 17px; }
.tree-toggle-spacer { width: 18px; flex-shrink: 0; }
.tree-collapsed-count {
  font-size: 9px; font-weight: 700; color: var(--dm-text-2, #475569);
  background: var(--dm-bg, #e2e8f0); border-radius: 10px; padding: 2px 8px;
  flex-shrink: 0; cursor: pointer; white-space: nowrap;
}
.tree-collapsed-count:hover { background: var(--dm-border-strong, #cbd5e1); }

/* ── Hapus node ── */
.tree-del-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; flex-shrink: 0; padding: 0;
  border-radius: 50%; border: 1px solid var(--dm-bd-red, #fca5a5); background: var(--dm-tint-red, #fef2f2); color: var(--dm-on-red, #dc2626); cursor: pointer;
  transition: background 0.15s;
}
.tree-del-btn:hover { background: var(--dm-tint-red, #fee2e2); }
.tree-del-btn .mdi { font-size: 12px; }
.tree-edit-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; flex-shrink: 0; padding: 0;
  border-radius: 50%; border: 1px solid var(--dm-bd-amber, #fcd34d); background: var(--dm-tint-amber, #fffbeb); color: var(--dm-on-amber, #b45309); cursor: pointer;
  transition: background 0.15s;
}
.tree-edit-btn:hover { background: var(--dm-tint-amber, #fef3c7); }
.tree-edit-btn .mdi { font-size: 12px; }
.tree-drag-grip .mdi { font-size: 14px; }

/* ── Responsive: layar sempit (modal mobile) — buang info sekunder ── */
@media (max-width: 540px) {
  .tree-node { padding: 7px 9px; }
  .tree-sub { display: none; }            /* nama/mesin disembunyikan, fokus part number */
  .tree-qty { display: none; }            /* qty/qty unit sekunder */
  .tree-drag-grip { display: none; }      /* seret kurang relevan di sentuh */
  .tree-children { margin-left: 4px; padding-left: 9px; }
  .tree-children > .tree-node::before { left: -9px; }
  .tree-children > .tree-node::after { left: -9px; width: 6px; }
  .tree-children > .tree-node:last-child::before { width: 6px; }
  .tree-connector-arrow { left: -4px; }
  .tree-area-badge { max-width: 86px; overflow: hidden; text-overflow: ellipsis; }
}
.tree-step {
  position: relative; display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px 1px 2px; border-radius: 999px;
  font-size: 10.5px; font-weight: 700; cursor: pointer; white-space: nowrap;
  background: var(--dm-tint-blue, #eff6ff); color: var(--dm-accent, #1d4ed8); border: 1px solid var(--dm-bd-blue, #bfdbfe);
}
.tree-step-no { display: inline-grid; place-items: center; width: 15px; height: 15px; border-radius: 50%; background: #2563eb; color: #fff; font-size: 9.5px; }
.tree-step select { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.tree-jig { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap;
  border: 1px solid var(--dm-bd-blue, #bfdbfe); background: var(--dm-tint-blue, #eff6ff); color: var(--dm-accent, #1d4ed8); }
.tree-jig--none { border-color: var(--dm-bd-amber, #fde68a); background: var(--dm-tint-amber, #fffbeb); color: var(--dm-on-amber, #b45309); }
.tree-swap-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--dm-border-strong, #cbd5e1); background: var(--dm-surface, #fff); color: var(--dm-text, #1e293b); }
.tree-swap-chip small { font-weight: 600; color: var(--dm-muted, #64748b); }
.tree-swap-chip:hover:not(:disabled) { border-color: #2563eb; background: var(--dm-tint-blue, #eff6ff); }
.tree-swap-chip:disabled { opacity: .5; cursor: wait; }
.tree-step-x { font-style: normal; font-weight: 800; font-size: 10.5px; opacity: .8; }
.tree-step-move { display: inline-flex; flex-direction: column; line-height: .8; font-size: 15px; color: var(--dm-muted, #64748b); }
.tree-step-move i { cursor: pointer; border-radius: 3px; }
.tree-step-move i:hover { color: #2563eb; background: var(--dm-tint-blue, #eff6ff); }
.tree-step-move i.is-off { opacity: .25; pointer-events: none; }
.tree-step-ro { font-weight: 600; text-transform: none; letter-spacing: 0; opacity: .75; }
.tree-ifpp { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 800; white-space: nowrap; cursor: help; }
.tree-ifpp--ok { background: var(--dm-tint-green, #ecfdf5); color: var(--dm-on-green, #047857); border: 1px solid var(--dm-bd-green, #a7f3d0); }
.tree-ifpp--bad { background: var(--dm-tint-red, #fef2f2); color: var(--dm-on-red, #b91c1c); border: 1px solid var(--dm-bd-red, #fecaca); }
.tree-ifpp--none { background: var(--dm-surface2, #f1f5f9); color: var(--dm-muted, #64748b); border: 1px dashed var(--dm-border-strong, #cbd5e1); }
.tree-step-wrap { position: relative; display: inline-flex; }
.tree-step-part { display: inline-flex; align-items: center; gap: 3px; }
.tree-step-part + .tree-step-part { margin-left: 6px; }
.tree-step { font-family: inherit; }
.tree-step:hover:not(:disabled) { filter: brightness(1.08); }
.tree-step:disabled { opacity: .6; cursor: wait; }
.tree-step em { font-style: normal; opacity: .75; margin-left: 1px; }
.tree-step-caret { font-size: 13px; margin-left: 1px; opacity: .7; }
.tree-step-pop {
  position: fixed; z-index: 2147483000; width: 270px; display: flex; flex-direction: column; gap: 2px;
  padding: 6px; border-radius: 12px; background: var(--dm-surface, #fff); border: 1px solid var(--dm-border, #e2e8f0);
  box-shadow: 0 14px 32px -8px rgba(15, 23, 42, .35); font-size: 12px; color: var(--dm-text, #1e293b);
  animation: tree-pop-in .12s ease-out;
}
@keyframes tree-pop-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.tree-step-pop-title { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 8px 6px; font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--dm-muted, #64748b); }
.tree-step-pop-title small { text-transform: none; letter-spacing: 0; font-weight: 600; }
.tree-split-bad { color: #dc2626; }
.tree-step-opt {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 8px; border: none; border-radius: 8px; background: none;
  color: inherit; text-align: left; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 600;
}
.tree-step-opt:hover { background: var(--dm-surface2, #f1f5f9); }
.tree-step-opt--on { background: var(--dm-tint-blue, #eff6ff); color: var(--dm-accent, #1d4ed8); }
.tree-step-opt .mdi-check { margin-left: auto; font-size: 15px; color: var(--dm-accent, #2563eb); }
.tree-step-opt-main { display: flex; flex-direction: column; line-height: 1.2; }
.tree-step-opt-main small { font-size: 10.5px; font-weight: 500; color: var(--dm-muted, #64748b); }
.tree-step-opt--split { border-top: 1px dashed var(--dm-border, #e2e8f0); border-radius: 0 0 8px 8px; margin-top: 2px; }
.tree-step-no--split { background: #7c3aed; }
.tree-step-pop .tree-step-no { width: 20px; height: 20px; font-size: 11px; flex-shrink: 0; }
.tree-split-row { display: flex; align-items: center; gap: 8px; padding: 4px 8px; }
.tree-split-name { flex: 1; font-weight: 600; }
.tree-split-row input { width: 70px; padding: 5px 8px; border-radius: 7px; border: 1px solid var(--dm-border-strong, #cbd5e1); background: var(--dm-bg, #fff); color: inherit; text-align: right; font-family: inherit; }
.tree-split-row input:focus { outline: 2px solid #93c5fd; border-color: #2563eb; }
.tree-split-actions { display: flex; justify-content: flex-end; gap: 6px; padding: 6px 8px 4px; }
.tree-split-btn { padding: 5px 12px; border-radius: 7px; border: 1px solid var(--dm-border-strong, #cbd5e1); background: var(--dm-surface, #fff); color: inherit; cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit; }
.tree-split-btn--ok { background: #2563eb; border-color: #2563eb; color: #fff; }
.tree-step-auto { font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 0 4px; margin-left: 4px; border-radius: 4px; background: rgba(124, 58, 237, .15); color: #7c3aed; opacity: 1 !important; }
.tree-step-match { font-size: 9.5px; font-weight: 700; padding: 0 5px; border-radius: 4px; background: rgba(16, 185, 129, .15); color: var(--dm-on-green, #047857); margin-left: 4px; }
.tree-step-nuts { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }
.tree-step-nut { font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 4px; background: var(--dm-surface2, #f1f5f9); color: var(--dm-muted, #64748b); border: 1px solid var(--dm-border, #e2e8f0); }
.tree-step-nut--hit { background: var(--dm-tint-green, #ecfdf5); color: var(--dm-on-green, #047857); border-color: var(--dm-bd-green, #a7f3d0); }
.tree-step--miss { background: var(--dm-tint-amber, #fffbeb) !important; color: var(--dm-on-amber, #b45309) !important; border-color: var(--dm-bd-amber, #fcd34d) !important; }
.tree-step--miss .tree-step-no { background: #d97706; }
.tree-step-pop-title--sub { padding-top: 8px; margin-top: 2px; border-top: 1px dashed var(--dm-border, #e2e8f0); }
.tree-compat { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 8px 6px; }
.tree-compat-chip { display: inline-flex; align-items: baseline; gap: 3px; padding: 2px 7px; border-radius: 6px; font-size: 11.5px; font-weight: 700; background: var(--dm-surface2, #f1f5f9); color: var(--dm-text-2, #334155); border: 1px solid var(--dm-border, #e2e8f0); cursor: default; }
.tree-compat-chip small { font-size: 9px; font-weight: 700; opacity: .65; }
.tree-compat-chip:not(:disabled) { cursor: pointer; }
.tree-compat-chip:not(:disabled):hover { border-color: #2563eb; background: var(--dm-tint-blue, #eff6ff); }
.tree-compat-chip--route { background: var(--dm-tint-green, #ecfdf5); color: var(--dm-on-green, #047857); border-color: var(--dm-bd-green, #a7f3d0); }
.tree-compat-empty { padding: 0 8px 8px; font-size: 11px; color: var(--dm-muted, #64748b); }
</style>
