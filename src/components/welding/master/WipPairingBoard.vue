<!-- components/welding/master/WipPairingBoard.vue
     Papan pemasangan WIP (revisi):
       - KIRI  : SEMUA WIP (steker) — kartu draggable, siap di-add.
       - KANAN : pilih PARENT dulu (FP/WIP) → muncul TREE hierarki parent itu.
                 Seret WIP dari kiri → jatuhkan ke NODE sub-tree yang diinginkan
                 (drag-n-drop seperti tree detail). Node tree juga bisa di-re-parent.
-->
<template>
  <Transition name="board-fade">
    <div v-if="show" v-modal-stack="() => $emit('close')" class="board-overlay" @click.self.prevent>
      <div class="board">
        <!-- ── Header ── -->
        <div class="board-head">
          <div class="board-title">
            <i class="mdi mdi-power-plug-outline"></i>
            <div>
              <p class="bt-main">Pemasangan WIP</p>
              <p class="bt-sub">Pilih <b>parent</b> di kanan → seret <b>WIP</b> dari kiri ke <b>node</b> di tree</p>
            </div>
          </div>
          <div class="board-controls">
            <button class="ctl-btn" :disabled="loading" @click="reload" title="Muat ulang">
              <i class="mdi" :class="loading ? 'mdi-loading mdi-spin' : 'mdi-refresh'"></i>
            </button>
            <button class="ctl-btn ctl-close" @click="$emit('close')" title="Kembali ke Menu Aplikasi (Esc)"><i class="mdi mdi-arrow-left"></i></button>
          </div>
        </div>

        <!-- ── Body: 2 panel ── -->
        <div class="board-body">
          <!-- KIRI: WIP (steker) -->
          <section class="panel panel--wip">
            <header class="panel-head">
              <span class="ph-icon"><i class="mdi mdi-power-plug"></i></span>
              <span class="ph-title">WIP</span>
              <label class="ph-toggle" title="Hanya WIP yang belum punya parent">
                <input type="checkbox" v-model="wipOrphanOnly" />
                <span>Belum punya parent</span>
                <span class="ph-badge">{{ wipOrphanCount }}</span>
              </label>
              <select v-model="areaWip" class="ph-select">
                <option value="">Semua area</option>
                <option v-for="a in boardAreas" :key="a" :value="a">{{ a }}</option>
              </select>
              <div class="ph-search">
                <i class="mdi mdi-magnify"></i>
                <input v-model="searchWip" placeholder="Cari WIP…" />
              </div>
              <span class="ph-count">{{ wipGroups.length }}</span>
              <div class="ph-view-toggle">
                <button type="button" class="ph-view-btn" :class="{ active: wipViewMode === 'grid' }" title="Tampilan grid" @click="wipViewMode = 'grid'"><i class="mdi mdi-view-grid-outline"></i></button>
                <button type="button" class="ph-view-btn" :class="{ active: wipViewMode === 'detail' }" title="Tampilan detail" @click="wipViewMode = 'detail'"><i class="mdi mdi-view-list-outline"></i></button>
              </div>
            </header>
            <div class="panel-scroll">
              <div v-if="loading && !wipAll.length" class="panel-state"><i class="mdi mdi-loading mdi-spin"></i> Memuat…</div>
              <div v-else-if="!wipGroups.length" class="panel-state panel-state--ok">
                <i class="mdi mdi-check-circle-outline"></i>
                {{ wipOrphanOnly ? 'Semua WIP sudah punya mother' : 'Tidak ada WIP' }}
              </div>
              <div v-else-if="wipViewMode === 'grid'" class="card-grid">
                <article
                  v-for="g in wipGroups" :key="g.key"
                  class="card card--wip"
                  :class="{ 'card--dragging': dragKey === g.key }"
                  draggable="true"
                  @dragstart="onWipDragStart(g, $event)"
                  @dragend="onDragEnd"
                >
                  <div class="card-thumb">
                    <i class="mdi mdi-power-plug card-thumb-icon"></i>
                    <span class="card-grip"><i class="mdi mdi-drag"></i></span>
                    <button
                      v-if="!g.mothers.length"
                      type="button"
                      class="card-suggest-btn"
                      title="Cari kandidat parent (smart picker)"
                      @click.stop="openSuggestions(g)"
                    ><i class="mdi mdi-magnify-scan"></i></button>
                    <button
                      type="button"
                      class="card-edit-btn"
                      title="Edit part"
                      @click.stop="editPart(g.rep.id)"
                    ><i class="mdi mdi-pencil-outline"></i></button>
                    <span
                      v-if="g.mothers.length"
                      class="card-mother-badge"
                      :title="'Klik untuk lihat ' + g.mothers.length + ' mother'"
                      @click.stop="toggleMothers(g.key)"
                    >
                      <i class="mdi mdi-family-tree"></i> {{ g.mothers.length }}
                      <i class="mdi" :class="openMothers.has(g.key) ? 'mdi-chevron-up' : 'mdi-chevron-down'"></i>
                    </span>
                  </div>
                  <div class="card-info">
                    <p class="ci-part">{{ g.partNumber }}</p>
                    <p class="ci-meta">
                      <span v-if="g.op" class="ci-op">OP{{ g.op }}</span>
                      <span class="ci-model">{{ g.model || '—' }}</span>
                    </p>
                    <span class="ci-area" :class="{ 'ci-area--ckd': g.isCkdPress }">{{ g.area }}</span>
                    <div v-if="g.mothers.length && openMothers.has(g.key)" class="ci-mothers">
                      <div v-for="m in g.mothers" :key="m.id" class="ci-mother-row">
                        <i class="mdi mdi-subdirectory-arrow-right"></i>
                        <span class="ci-parent-mix" :title="m.parent_part_mix">{{ m.parent_part_mix }}</span>
                        <button class="ci-detach" :disabled="busyId === m.id" @click.stop="onDetachRow(m.id)" title="Putus mother ini">
                          <i class="mdi" :class="busyId === m.id ? 'mdi-loading mdi-spin' : 'mdi-close'"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
              <!-- Tampilan detail (list) — lebih ringkas & padat info per baris -->
              <div v-else class="detail-list">
                <div
                  v-for="g in wipGroups" :key="g.key"
                  class="detail-row detail-row--wip"
                  :class="{ 'detail-row--dragging': dragKey === g.key }"
                  draggable="true"
                  @dragstart="onWipDragStart(g, $event)"
                  @dragend="onDragEnd"
                >
                  <i class="mdi mdi-drag detail-grip"></i>
                  <i class="mdi mdi-power-plug detail-icon detail-icon--wip"></i>
                  <span class="detail-part">{{ g.partNumber }}</span>
                  <span v-if="g.op" class="ci-op">OP{{ g.op }}</span>
                  <span class="detail-model">{{ g.model || '—' }}</span>
                  <span class="ci-area" :class="{ 'ci-area--ckd': g.isCkdPress }">{{ g.area }}</span>
                  <button
                    v-if="!g.mothers.length"
                    type="button"
                    class="card-suggest-btn card-suggest-btn--detail"
                    title="Cari kandidat parent (smart picker)"
                    @click.stop="openSuggestions(g)"
                  ><i class="mdi mdi-magnify-scan"></i></button>
                  <button
                    type="button"
                    class="card-suggest-btn card-suggest-btn--detail"
                    title="Edit part"
                    @click.stop="editPart(g.rep.id)"
                  ><i class="mdi mdi-pencil-outline"></i></button>
                  <span
                    v-if="g.mothers.length"
                    class="card-mother-badge detail-mother-badge"
                    :title="'Klik untuk lihat ' + g.mothers.length + ' mother'"
                    @click.stop="toggleMothers(g.key)"
                  >
                    <i class="mdi mdi-family-tree"></i> {{ g.mothers.length }}
                  </span>
                  <div v-if="g.mothers.length && openMothers.has(g.key)" class="ci-mothers detail-mothers">
                    <div v-for="m in g.mothers" :key="m.id" class="ci-mother-row">
                      <i class="mdi mdi-subdirectory-arrow-right"></i>
                      <span class="ci-parent-mix" :title="m.parent_part_mix">{{ m.parent_part_mix }}</span>
                      <button class="ci-detach" :disabled="busyId === m.id" @click.stop="onDetachRow(m.id)" title="Putus mother ini">
                        <i class="mdi" :class="busyId === m.id ? 'mdi-loading mdi-spin' : 'mdi-close'"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div class="board-link"><i class="mdi mdi-arrow-right-bold"></i></div>

          <!-- KANAN: pilih parent → tree -->
          <section class="panel panel--fp">
            <!-- Header mode SUGGEST (kandidat parent utk WIP yatim) -->
            <header v-if="suggestFor && !selectedParent" class="panel-head panel-head--tree">
              <button class="ph-back" @click="backFromSuggestions"><i class="mdi mdi-arrow-left"></i> Kembali</button>
              <span class="ph-tree-title">
                <span class="type-tag type-tag--wip">WIP</span>
                {{ suggestFor.partNumber }} — kandidat parent
              </span>
              <button class="ctl-btn ctl-btn--sm" :disabled="suggestLoading" @click="openSuggestions(suggestFor)" title="Muat ulang">
                <i class="mdi" :class="suggestLoading ? 'mdi-loading mdi-spin' : 'mdi-refresh'"></i>
              </button>
            </header>
            <!-- Header mode LIST -->
            <header v-else-if="!selectedParent" class="panel-head">
              <span class="ph-icon ph-icon--fp"><i class="mdi mdi-power-socket-de"></i></span>
              <span class="ph-title">Pilih Parent</span>
              <select v-model="areaParent" class="ph-select ph-select--fp">
                <option value="">Semua area</option>
                <option v-for="a in boardAreas" :key="a" :value="a">{{ a }}</option>
              </select>
              <div class="ph-type-filter">
                <button type="button" class="ph-type-btn" :class="{ active: parentType === 'all' }" @click="parentType = 'all'">Semua</button>
                <button type="button" class="ph-type-btn" :class="{ active: parentType === 'FP' }" @click="parentType = 'FP'">FP</button>
                <button type="button" class="ph-type-btn" :class="{ active: parentType === 'WIP' }" @click="parentType = 'WIP'">WIP</button>
              </div>
              <div class="ph-search ph-search--fp">
                <i class="mdi mdi-magnify"></i>
                <input v-model="searchParent" placeholder="Cari parent…" />
              </div>
              <span class="ph-count ph-count--fp">{{ parentList.length }}</span>
              <div class="ph-view-toggle">
                <button type="button" class="ph-view-btn" :class="{ active: parentViewMode === 'grid' }" title="Tampilan grid" @click="parentViewMode = 'grid'"><i class="mdi mdi-view-grid-outline"></i></button>
                <button type="button" class="ph-view-btn" :class="{ active: parentViewMode === 'detail' }" title="Tampilan detail" @click="parentViewMode = 'detail'"><i class="mdi mdi-view-list-outline"></i></button>
              </div>
            </header>
            <!-- Header mode TREE -->
            <header v-else class="panel-head panel-head--tree">
              <button class="ph-back" @click="backToList"><i class="mdi mdi-arrow-left"></i> Ganti parent</button>
              <span class="ph-tree-title">
                <span class="type-tag" :class="selectedParent.is_wip ? 'type-tag--wip' : 'type-tag--fp'">{{ selectedParent.is_wip ? 'WIP' : 'FP' }}</span>
                {{ selectedParent.part_number }}
              </span>
              <button class="ctl-btn ctl-btn--sm" :disabled="treeLoading" @click="reloadTree" title="Muat ulang tree">
                <i class="mdi" :class="treeLoading ? 'mdi-loading mdi-spin' : 'mdi-refresh'"></i>
              </button>
            </header>

            <div class="panel-scroll">
              <!-- SUGGEST mode -->
              <template v-if="suggestFor && !selectedParent">
                <div v-if="suggestLoading" class="panel-state"><i class="mdi mdi-loading mdi-spin"></i> Mencari kandidat…</div>
                <div v-else-if="!suggestResults.length" class="panel-state">
                  Tidak ada kandidat cocok (cek model/car/mix part ini di master).
                </div>
                <div v-else class="suggest-list">
                  <article v-for="c in suggestResults" :key="c.id" class="suggest-card">
                    <div class="suggest-main">
                      <span class="type-tag" :class="c.is_wip ? 'type-tag--wip' : 'type-tag--fp'">{{ c.is_wip ? 'WIP' : 'FP' }}</span>
                      <span class="suggest-part">{{ c.part_number }}</span>
                      <span class="suggest-score" title="Skor kecocokan">{{ c.score }}</span>
                      <button type="button" class="card-suggest-btn card-suggest-btn--detail" title="Edit part" @click.stop="editPart(c.id)"><i class="mdi mdi-pencil-outline"></i></button>
                    </div>
                    <p class="suggest-meta">
                      <span class="ci-model">{{ c.model || '—' }}</span>
                      <span class="ci-area ci-area--fp">{{ c.area }}</span>
                    </p>
                    <p v-if="c.reasons?.length" class="suggest-reasons">
                      <span v-for="r in c.reasons" :key="r" class="suggest-reason-tag">{{ r }}</span>
                    </p>
                    <div class="suggest-actions">
                      <button type="button" class="suggest-btn suggest-btn--ghost" @click="previewCandidateTree(c)">
                        <i class="mdi mdi-sitemap-outline"></i> Lihat posisi di tree
                      </button>
                      <button
                        type="button" class="suggest-btn suggest-btn--primary"
                        :disabled="linkingId === suggestFor.rep.id"
                        @click="linkToCandidate(suggestFor, c)"
                      >
                        <i class="mdi" :class="linkingId === suggestFor.rep.id ? 'mdi-loading mdi-spin' : 'mdi-link-variant'"></i> Pasang
                      </button>
                    </div>
                  </article>
                </div>
              </template>
              <!-- LIST mode -->
              <template v-else-if="!selectedParent">
                <div v-if="loading && !parentAll.length" class="panel-state"><i class="mdi mdi-loading mdi-spin"></i> Memuat…</div>
                <div v-else-if="!parentList.length" class="panel-state">Tidak ada kandidat parent.</div>
                <div v-else-if="parentViewMode === 'grid'" class="card-grid">
                  <article
                    v-for="f in parentList" :key="f.id"
                    class="card card--fp card--selectable"
                    :class="{ 'card--iswip': f.is_wip }"
                    @click="selectParent(f)"
                    title="Klik untuk lihat tree & pasang WIP"
                  >
                    <div class="card-thumb">
                      <img v-if="img(f) && !imgErr[f.id!]" :src="img(f)!" alt="" @error="imgErr[f.id!] = true" />
                      <i v-else class="mdi card-thumb-icon" :class="f.is_wip ? 'mdi-power-plug card-thumb-icon--wip' : 'mdi-power-socket-de card-thumb-icon--fp'"></i>
                      <span class="card-tag" :class="f.is_wip ? 'card-tag--wip' : 'card-tag--fp'">{{ f.is_wip ? 'WIP' : 'FP' }}</span>
                      <button type="button" class="card-edit-btn" title="Edit part" @click.stop="editPart(f.id)"><i class="mdi mdi-pencil-outline"></i></button>
                      <span class="card-open-hint"><i class="mdi mdi-sitemap-outline"></i> buka tree</span>
                    </div>
                    <div class="card-info">
                      <p class="ci-part">{{ f.part_number }}</p>
                      <p class="ci-meta">
                        <span v-if="f.op" class="ci-op ci-op--fp">OP{{ f.op }}</span>
                        <span class="ci-model">{{ f.model || '—' }}</span>
                      </p>
                      <span class="ci-area ci-area--fp">{{ f.area }}</span>
                    </div>
                  </article>
                </div>
                <!-- Tampilan detail (list) -->
                <div v-else class="detail-list">
                  <div
                    v-for="f in parentList" :key="f.id"
                    class="detail-row detail-row--selectable"
                    @click="selectParent(f)"
                    title="Klik untuk lihat tree & pasang WIP"
                  >
                    <i class="mdi detail-icon" :class="f.is_wip ? 'mdi-power-plug detail-icon--wip' : 'mdi-power-socket-de detail-icon--fp'"></i>
                    <span class="card-tag detail-tag" :class="f.is_wip ? 'card-tag--wip' : 'card-tag--fp'">{{ f.is_wip ? 'WIP' : 'FP' }}</span>
                    <span class="detail-part">{{ f.part_number }}</span>
                    <span v-if="f.op" class="ci-op ci-op--fp">OP{{ f.op }}</span>
                    <span class="detail-model">{{ f.model || '—' }}</span>
                    <span class="ci-area ci-area--fp">{{ f.area }}</span>
                    <button type="button" class="card-suggest-btn card-suggest-btn--detail" title="Edit part" @click.stop="editPart(f.id)"><i class="mdi mdi-pencil-outline"></i></button>
                    <i class="mdi mdi-sitemap-outline detail-open-hint"></i>
                  </div>
                </div>
              </template>

              <!-- TREE mode -->
              <template v-else>
                <div v-if="treeLoading && !parentTree" class="panel-state"><i class="mdi mdi-loading mdi-spin"></i> Memuat tree…</div>
                <div v-else-if="parentTree" class="board-tree" :class="{ 'board-tree--refreshing': treeLoading }">
                  <div class="board-tree-search">
                    <i class="mdi mdi-magnify"></i>
                    <input v-model="treeSearch" placeholder="Cari & sorot node di tree…" />
                    <button v-if="treeSearch" class="bts-clear" @click="treeSearch = ''"><i class="mdi mdi-close"></i></button>
                  </div>
                  <p class="board-tree-hint"><i class="mdi mdi-gesture-tap-button"></i> Jatuhkan WIP dari kiri ke node mana pun, atau seret node untuk pindah parent.</p>
                  <TreeNode :node="parentTree.node" :depth="0" :is-entry="true" />
                  <div
                    v-if="boardDrag?.kind === 'int'"
                    class="tree-detach-zone"
                    :class="{ 'tree-detach-zone--over': detachZoneOver }"
                    @dragover="onDetachZoneOver"
                    @dragleave="onDetachZoneLeave"
                    @drop="onDetachZoneDrop"
                  >
                    <i class="mdi mdi-link-off"></i>
                    Jatuhkan di sini untuk putus dari mother-nya
                  </div>
                </div>
                <div v-else class="panel-state">Tidak ada data tree.</div>
              </template>
            </div>
          </section>
        </div>

        <!-- ── Toast ── -->
        <Transition name="toast-fade">
          <div v-if="toast" class="board-toast" :class="toast.ok ? 'toast--ok' : 'toast--err'">
            <i class="mdi" :class="toast.ok ? 'mdi-check-circle' : 'mdi-alert-circle'"></i>
            {{ toast.msg }}
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, provide } from 'vue';
import { vModalStack } from '@/directives/modalStack';
import masterService from '@/services/Public/Welding/masterService';
import type { ConnectCandidate } from '@/services/Public/Welding/masterService';
import type { MsWelding, MsWeldingTree, MsWeldingTreeNode } from '@/types/Public/Welding/master';
import TreeNode from '@/components/welding/master/TreeNode.vue';

const props = defineProps<{ show: boolean; areas: string[] }>();
const emit = defineEmits<{ close: []; changed: [wip: MsWelding]; editPart: [id: number] }>();

// Papan ini fokus ke hierarki child/mother (WIP↔parent), bukan delivery —
// IFPD (area & konsep) tidak relevan di sini (delivery cuma utk WELDING FP,
// dikelola via field Part Number Delivery di form, bukan drag-n-drop).
const boardAreas = computed(() => props.areas.filter((a) => a !== 'IFPD'));

const loading       = ref(false);
const searchWip     = ref('');
const searchParent  = ref('');
const areaWip       = ref('');
const areaParent    = ref('');
const parentType    = ref<'all' | 'FP' | 'WIP'>('all');
const wipAll        = ref<MsWelding[]>([]);
const parentAll     = ref<MsWelding[]>([]);
const imgErr        = reactive<Record<number, boolean>>({});
const wipOrphanOnly = ref(false);
const wipViewMode    = ref<'grid' | 'detail'>('grid');
const parentViewMode = ref<'grid' | 'detail'>('grid');

// Parent terpilih + tree-nya
const selectedParent = ref<MsWelding | null>(null);
const parentTree     = ref<MsWeldingTree | null>(null);
const treeLoading    = ref(false);

// ── Kandidat parent (smart picker) untuk WIP "yatim" (belum ada parent_part_mix) ──
const suggestFor    = ref<WipGroup | null>(null);
const suggestLoading = ref(false);
const suggestResults = ref<ConnectCandidate[]>([]);
const linkingId     = ref<number | null>(null);

async function openSuggestions(g: WipGroup) {
  selectedParent.value = null;
  parentTree.value = null;
  suggestFor.value = g;
  suggestLoading.value = true;
  suggestResults.value = [];
  try {
    const res = await masterService.suggestConnections({
      part_number_mix: g.rep.part_number_mix || undefined,
      part_number_delivery: g.rep.part_number_delivery || undefined,
      model: g.rep.model || undefined,
      car_name: g.rep.car_name || undefined,
      op: g.rep.op ?? undefined,
      is_wip: 1,
      parent_part_mix: g.rep.parent_part_mix || undefined,
      exclude_id: g.rep.id ?? undefined,
      limit: 15,
    });
    suggestResults.value = res?.parents ?? [];
  } catch { showToast(false, 'Gagal memuat kandidat parent.'); }
  finally { suggestLoading.value = false; }
}
function backFromSuggestions() { suggestFor.value = null; suggestResults.value = []; }

/** Klik kandidat → lihat posisinya di tree (tanpa memasang dulu). */
async function previewCandidateTree(c: ConnectCandidate) {
  await selectParent(c);
}

/** Pasang langsung WIP yatim ini ke kandidat terpilih (by id — akurat per-instance fisik). */
async function linkToCandidate(g: WipGroup, c: ConnectCandidate) {
  if (linkingId.value || !c.id) return;
  linkingId.value = g.rep.id ?? null;
  try {
    const res = await masterService.linkChild(g.rep.id!, c.id);
    if (res.success) {
      await reload();
      backFromSuggestions();
      showToast(true, res.message || `${g.partNumber} → ${c.part_number}`);
      if (res.data) emit('changed', res.data);
    } else showToast(false, res.message || 'Gagal menautkan.');
  } catch (err: unknown) { showToast(false, getErrorMessage(err)); }
  finally { linkingId.value = null; }
}

function rowMatchesSearch(row: MsWelding, query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [row.part_number, row.alias, row.job_number, row.part_number_delivery, row.parent_part_mix, row.model, row.car_name]
    .filter(Boolean).some((v) => String(v).toLowerCase().includes(term));
}

// Klasifikasi area (CKD / IFPP / welded)
const _U = (s?: string | null) => (s ?? '').toUpperCase();
function isCkd(x: { area?: string | null }) { return _U(x.area) === 'CKD'; }
function isPress(x: { area?: string | null; layer?: string | null }) { return _U(x.area) === 'INHOUSE' || _U(x.layer) === 'IFPP'; }
function isWelded(x: { area?: string | null; layer?: string | null }) { return !isCkd(x) && !isPress(x); }
function isCkdOrPress(x: { area?: string | null; layer?: string | null }) { return isCkd(x) || isPress(x); }

// WIP DISTINCT per part (part_number_mix) + daftar mother (baris ber-parent).
interface WipGroup {
  key: string; rep: MsWelding; partNumber: string; area: string | null;
  op: number | null; model: string | null; isCkdPress: boolean;
  mothers: { id: number; parent_part_mix: string }[];
}
const wipGroups = computed<WipGroup[]>(() => {
  const map = new Map<string, WipGroup>();
  for (const w of wipAll.value) {
    if (areaWip.value && w.area !== areaWip.value) continue;
    const key = w.part_number_mix || w.part_number;
    let g = map.get(key);
    if (!g) {
      g = { key, rep: w, partNumber: w.part_number, area: w.area, op: w.op, model: w.model, isCkdPress: isCkdOrPress(w), mothers: [] };
      map.set(key, g);
    }
    if (w.has_parent && w.parent_part_mix && w.id != null) g.mothers.push({ id: w.id, parent_part_mix: w.parent_part_mix });
    if (!w.has_parent) g.rep = w; // baris orphan = atribut dasar terbersih utk disalin
  }
  let arr = [...map.values()];
  if (wipOrphanOnly.value) arr = arr.filter((g) => g.mothers.length === 0);
  return arr.filter((g) => rowMatchesSearch(g.rep, searchWip.value));
});
const wipOrphanCount = computed(() => {
  const has = new Map<string, boolean>();
  for (const w of wipAll.value) {
    const key = w.part_number_mix || w.part_number;
    has.set(key, (has.get(key) || false) || !!w.has_parent);
  }
  let c = 0; has.forEach((v) => { if (!v) c++; });
  return c;
});

const parentList = computed(() =>
  parentAll.value.filter((p) => {
    if (areaParent.value && p.area !== areaParent.value) return false;
    if (parentType.value === 'FP' && p.is_wip) return false;
    if (parentType.value === 'WIP' && !p.is_wip) return false;
    return rowMatchesSearch(p, searchParent.value);
  })
);

const busyId = ref<number | null>(null);
const dragKey = ref<string | null>(null);

const toast = ref<{ ok: boolean; msg: string } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(ok: boolean, msg: string) {
  toast.value = { ok, msg };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = null), 3000);
}

function img(x: MsWelding): string | null { return masterService.getImageUrl(x.image); }

async function reload() {
  loading.value = true;
  try {
    const res = await masterService.getUnpaired();
    // Buang baris area IFPD — papan ini fokus child/mother, bukan delivery.
    wipAll.value = res.wip_list.filter((w) => w.area !== 'IFPD');
    parentAll.value = res.parent_list.filter((p) => p.area !== 'IFPD');
  } catch { showToast(false, 'Gagal memuat data.'); }
  finally { loading.value = false; }
}
watch(() => props.show, (open) => { if (open) { reload(); backToList(); backFromSuggestions(); } });

// ── Pilih parent → tree ──
async function selectParent(p: MsWelding) {
  selectedParent.value = p;
  parentTree.value = null;
  treeLoading.value = true;
  try { parentTree.value = await masterService.getTree(p.id!); }
  catch { showToast(false, 'Gagal memuat tree.'); }
  finally { treeLoading.value = false; }
}
function backToList() { selectedParent.value = null; parentTree.value = null; }
async function reloadTree() {
  if (!selectedParent.value) return;
  treeLoading.value = true;
  try { parentTree.value = await masterService.getTree(selectedParent.value.id!); }
  finally { treeLoading.value = false; }
}

// ── Drag state: WIP eksternal (kiri) ATAU node internal (tree) ──
// 'int' menyimpan parentId = parent LANGSUNG node ini di cabang yg sedang di-drag (bukan
// mix) — dipakai drop-zone "keluarkan dari tree" supaya cuma putus cabang ini, bukan
// semua mother node itu (mis. child yg sama muncul di mother OP10 & OP20 sekaligus).
type BoardDrag =
  | { kind: 'ext'; wip: MsWelding; motherMixes: Set<string> }
  | { kind: 'int'; node: MsWeldingTreeNode; parentId: number | null };
const boardDrag = ref<BoardDrag | null>(null);
const detachZoneOver = ref(false);

function onWipDragStart(g: WipGroup, e: DragEvent) {
  boardDrag.value = { kind: 'ext', wip: g.rep, motherMixes: new Set(g.mothers.map((m) => m.parent_part_mix)) };
  dragKey.value = g.key;
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(g.rep.id)); }
}
function onDragEnd() { boardDrag.value = null; dragKey.value = null; }

function descendantMixes(node: MsWeldingTreeNode): Set<string> {
  const set = new Set<string>();
  const walk = (n: MsWeldingTreeNode) => { for (const c of n.children ?? []) { if (c.part_number_mix) set.add(c.part_number_mix); walk(c); } };
  walk(node);
  return set;
}

function editPart(id?: number | null) { if (id != null) emit('editPart', id); }

/** "Hapus"/drag-keluar di tree papan ini = putus node dari SATU mother spesifik ini saja
 *  (bukan hapus record part, bukan putus semua mother — cabang lain tetap utuh). */
async function detachTreeNode(n: MsWeldingTreeNode, parentId?: number | null) {
  if (!n.id || busyId.value) return;
  busyId.value = n.id;
  try {
    const res = await masterService.detachParent(n.id, parentId ?? null);
    if (res.success) {
      await reload();
      await reloadTree();
      showToast(true, `${n.part_number} diputus dari mother${parentId ? ' ini' : ' (semua)'}.`);
      if (res.data) emit('changed', res.data);
    } else showToast(false, res.message || 'Gagal memutus.');
  } catch (err: unknown) { showToast(false, getErrorMessage(err)); }
  finally { busyId.value = null; }
}

function onDetachZoneOver(e: DragEvent) {
  if (boardDrag.value?.kind !== 'int') return;
  e.preventDefault();
  detachZoneOver.value = true;
}
function onDetachZoneLeave() { detachZoneOver.value = false; }
function onDetachZoneDrop(e: DragEvent) {
  e.preventDefault();
  detachZoneOver.value = false;
  const d = boardDrag.value;
  boardDrag.value = null;
  dragKey.value = null;
  if (d?.kind === 'int') detachTreeNode(d.node, d.parentId);
}

// Context untuk TreeNode di papan (tanpa add, tapi bisa edit part & putus mother)
const treeCtx = {
  startDrag: (n: MsWeldingTreeNode, parentId?: number | null) => { boardDrag.value = { kind: 'int', node: n, parentId: parentId ?? null }; },
  endDrag: () => { boardDrag.value = null; dragKey.value = null; detachZoneOver.value = false; },
  editNode: (n: MsWeldingTreeNode) => editPart(n.id),
  deleteNode: (n: MsWeldingTreeNode, parentId?: number | null) => detachTreeNode(n, parentId),
  canDrop: (target: MsWeldingTreeNode): boolean => {
    const d = boardDrag.value;
    if (!d || !target.id) return false;
    if (d.kind === 'ext') {
      if (target.id === d.wip.id) return false;
      if (d.motherMixes.has(target.part_number_mix)) return false;  // sudah jadi mother part ini
      if (isCkdOrPress(d.wip) && !isWelded(target)) return false;   // CKD/IFPP wajib mother welded
      return true;
    }
    if (target.id === d.node.id || target.part_number_mix === d.node.part_number_mix) return false;
    if (isCkdOrPress(d.node) && !isWelded(target)) return false;
    return !descendantMixes(d.node).has(target.part_number_mix);
  },
  drop: async (target: MsWeldingTreeNode) => {
    const d = boardDrag.value;
    boardDrag.value = null;
    dragKey.value = null;
    if (!d || !target.id) return;

    // Validasi mother welded utk CKD/IFPP
    const src = d.kind === 'ext' ? d.wip : d.node;
    if (isCkdOrPress(src) && !isWelded(target)) {
      showToast(false, 'CKD/IFPP harus dipasang ke mother WELDED (WSS / ROBOT / SA MANUAL).');
      return;
    }
    try {
      if (d.kind === 'ext') {
        // CKD/IFPP → APPEND mother baru (id baru, tak ganti parent lama).
        // Welded WIP → attach (pindah) seperti biasa.
        const res = isCkdOrPress(d.wip)
          ? await masterService.addMother(d.wip.id!, target.id)
          : await masterService.attachWip(d.wip.id!, target.id);
        if (res.success) {
          await reload();          // refresh distinct + jumlah mother di kiri
          await reloadTree();
          showToast(true, res.message || `${d.wip.part_number} → ${target.part_number}`);
          if ((res as { data?: MsWelding }).data) emit('changed', (res as { data?: MsWelding }).data!);
        } else showToast(false, res.message || 'Gagal memasang.');
      } else {
        if (descendantMixes(d.node).has(target.part_number_mix)) return;
        // Pindah parent = putus dari mother LAMA (spesifik, by id) + tautkan ke target baru.
        // Pakai relasi ms_welding_parents (id-based) — bukan kolom legacy parent_part_mix,
        // supaya konsisten dgn sumber data tree (get_tree baca dari pivot, bukan kolom itu).
        if (d.parentId) await masterService.detachParent(d.node.id!, d.parentId);
        const res = await masterService.attachWip(d.node.id!, target.id);
        if (res.success) { await reload(); await reloadTree(); showToast(true, `${d.node.part_number} dipindah ke ${target.part_number}`); }
        else showToast(false, res.message || 'Gagal memindahkan.');
      }
    } catch (err: unknown) { showToast(false, getErrorMessage(err)); }
  },
  onReject: (target: MsWeldingTreeNode) => {
    const d = boardDrag.value;
    boardDrag.value = null;
    dragKey.value = null;
    if (!d) return;
    if (d.kind === 'ext') {
      if (target.id === d.wip.id) showToast(false, 'Tidak bisa dipasang ke diri sendiri.');
      else if (d.motherMixes.has(target.part_number_mix)) showToast(false, `'${d.wip.part_number}' sudah terpasang di mother '${target.part_number}'.`);
      else if (isCkdOrPress(d.wip) && !isWelded(target)) showToast(false, 'CKD/IFPP harus dipasang ke mother WELDED (WSS / ROBOT / SA MANUAL).');
      else showToast(false, 'Tidak bisa dijatuhkan di sini.');
    } else {
      if (isCkdOrPress(d.node) && !isWelded(target)) showToast(false, 'CKD/IFPP harus punya mother WELDED.');
      else if (descendantMixes(d.node).has(target.part_number_mix)) showToast(false, 'Tidak bisa: target turunan dari node ini (loop).');
      else showToast(false, 'Tidak bisa dipindah ke sini.');
    }
  },
};
provide('treeCtx', treeCtx);

// Pencarian/sorot node di mode tree
const treeSearch = ref('');
provide('treeSearch', treeSearch);
watch(selectedParent, () => { treeSearch.value = ''; });

// Daftar mother per kartu — collapsible (default tertutup)
const openMothers = ref<Set<string>>(new Set());
function toggleMothers(key: string) {
  openMothers.value.has(key) ? openMothers.value.delete(key) : openMothers.value.add(key);
  openMothers.value = new Set(openMothers.value);
}

// Putus salah satu mother (baris tertentu) → parent_part_mix di-null-kan.
async function onDetachRow(id: number) {
  if (busyId.value) return;
  busyId.value = id;
  try {
    const res = await masterService.detachParent(id);
    if (res.success) {
      await reload();
      if (selectedParent.value) await reloadTree();
      showToast(true, 'Mother diputus.');
      if (res.data) emit('changed', res.data);
    } else showToast(false, res.message || 'Gagal memutus mother.');
  } catch (err: unknown) { showToast(false, getErrorMessage(err)); }
  finally { busyId.value = null; }
}

function getErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Terjadi kesalahan.';
  const response = (err as { response?: unknown }).response;
  if (!response || typeof response !== 'object') return 'Terjadi kesalahan.';
  const data = (response as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return 'Terjadi kesalahan.';
  const message = (data as { message?: unknown }).message;
  return typeof message === 'string' ? message : 'Terjadi kesalahan.';
}
</script>

<style scoped>
.board-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(15, 23, 42, 0.55);
  display: flex; align-items: center; justify-content: center;
  padding: 18px;
}
.board {
  width: 100%; max-width: 1240px; height: 88vh;
  background: var(--dm-surface2, #f8fafc); border-radius: 16px; overflow: hidden;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
}

/* Header */
.board-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 14px 18px;
  background: linear-gradient(90deg,#1e3a8a,#2563eb);
  color: #fff; flex-shrink: 0;
}
.board-title { display: flex; align-items: center; gap: 12px; }
.board-title > .mdi { font-size: 26px; }
.bt-main { font-size: 16px; font-weight: 700; line-height: 1.1; }
.bt-sub { font-size: 11.5px; opacity: 0.85; }
.board-controls { display: flex; align-items: center; gap: 8px; }
.ctl-btn {
  height: 32px; width: 32px; border-radius: 7px; border: none; cursor: pointer;
  background: rgba(255,255,255,0.18); color: #fff; font-size: 16px;
  display: inline-flex; align-items: center; justify-content: center;
}
.ctl-btn:hover { background: rgba(255,255,255,0.3); }
.ctl-btn--sm { height: 26px; width: 26px; font-size: 14px; background: var(--dm-bg, #e2e8f0); color: var(--dm-text-2, #475569); margin-left: auto; }
.ctl-btn--sm:hover { background: var(--dm-border-strong, #cbd5e1); }
.ctl-close { background: rgba(239,68,68,0.85); }

/* Body */
.board-body { flex: 1; min-height: 0; display: flex; gap: 0; padding: 14px; align-items: stretch; }
.panel {
  flex: 1; min-width: 0; display: flex; flex-direction: column;
  background: var(--dm-surface, #fff); border-radius: 12px; overflow: hidden; border: 1px solid var(--dm-border, #e2e8f0);
}
.panel--wip { box-shadow: 0 0 0 1px #fde68a inset; }
.panel--fp  { box-shadow: 0 0 0 1px #bbf7d0 inset; }
.panel-head {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px 7px;
  padding: 8px 12px; border-bottom: 1px solid var(--dm-border, #e2e8f0); flex-shrink: 0;
}
.panel-head--tree { flex-wrap: nowrap; }
.ph-icon { font-size: 16px; color: #d97706; }
.ph-icon--fp { color: var(--dm-on-green, #16a34a); }
.ph-title { font-size: 13px; font-weight: 700; color: var(--dm-cell, #334155); white-space: nowrap; }
.ph-toggle {
  display: inline-flex; align-items: center; gap: 5px; cursor: pointer;
  font-size: 11px; font-weight: 600; color: var(--dm-on-amber, #b45309); user-select: none;
  background: var(--dm-tint-amber, #fffbeb); border: 1px solid var(--dm-bd-amber, #fde68a); border-radius: 20px; padding: 2px 8px;
}
.ph-toggle input { accent-color: #d97706; width: 13px; height: 13px; }
.ph-search, .ph-search--fp { position: relative; display: inline-flex; align-items: center; flex: 1 1 130px; min-width: 110px; }
.ph-search .mdi, .ph-search--fp .mdi { position: absolute; left: 10px; color: var(--dm-faint, #94a3b8); font-size: 14px; }
.ph-search input, .ph-search--fp input {
  width: 100%; padding: 6px 10px 6px 28px; border-radius: 8px;
  border: 1px solid var(--dm-border, #e2e8f0); background: var(--dm-surface2, #f8fafc); color: var(--dm-cell, #334155); font-size: 12px;
}
.ph-select { border: 1px solid var(--dm-border, #e2e8f0); border-radius: 8px; padding: 6px 8px; background: var(--dm-surface2, #f8fafc); color: var(--dm-cell, #334155); font-size: 12px; max-width: 130px; }
.ph-type-filter { display: inline-flex; align-items: center; gap: 4px; }
.ph-type-btn { border: 1px solid var(--dm-border-strong, #cbd5e1); border-radius: 999px; padding: 4px 10px; background: var(--dm-surface2, #f8fafc); color: var(--dm-cell, #334155); font-size: 11px; cursor: pointer; }
.ph-type-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
.ph-badge { background: var(--dm-tint-amber, #fde68a); color: var(--dm-on-amber, #92400e); border-radius: 10px; font-size: 10px; font-weight: 700; padding: 0 6px; }
.ph-count { margin-left: auto; min-width: 26px; text-align: center; background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #b45309); font-weight: 700; font-size: 12px; border-radius: 20px; padding: 2px 9px; }
.ph-count--fp { background: var(--dm-tint-green, #dcfce7); color: var(--dm-on-green, #15803d); }
.ph-view-toggle { display: inline-flex; align-items: center; gap: 2px; background: var(--dm-bg, #f1f5f9); border: 1px solid var(--dm-border, #e2e8f0); border-radius: 7px; padding: 2px; }
.ph-view-btn { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 22px; border: none; background: transparent; color: var(--dm-faint, #94a3b8); border-radius: 5px; cursor: pointer; font-size: 13px; }
.ph-view-btn:hover { color: var(--dm-text-2, #475569); }
.ph-view-btn.active { background: var(--dm-surface, #fff); color: var(--dm-accent, #2563eb); box-shadow: 0 1px 2px rgba(0,0,0,0.08); }

.ph-back {
  display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
  border: 1px solid var(--dm-border-strong, #cbd5e1); background: var(--dm-surface2, #f8fafc); color: var(--dm-cell, #334155);
  border-radius: 7px; font-size: 12px; font-weight: 600; padding: 5px 10px;
}
.ph-back:hover { background: var(--dm-bg, #eef2f7); }
.ph-tree-title { font-size: 13px; font-weight: 700; color: var(--dm-text, #1e293b); font-family: monospace; display: inline-flex; align-items: center; gap: 6px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.type-tag { font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 3px; }
.type-tag--fp { background: var(--dm-tint-green, #dcfce7); color: var(--dm-on-green, #166534); }
.type-tag--wip { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #92400e); }

.panel-scroll { flex: 1; overflow-y: auto; padding: 12px; }
.panel-state { display: flex; align-items: center; justify-content: center; gap: 8px; height: 100%; color: var(--dm-faint, #94a3b8); font-size: 13px; }
.panel-state--ok { color: var(--dm-on-green, #16a34a); }
.board-link { display: flex; align-items: center; justify-content: center; width: 40px; color: #cbd5e1; font-size: 22px; }

/* board tree */
.board-tree--refreshing { opacity: 0.55; pointer-events: none; transition: opacity 0.15s; }
.tree-detach-zone {
  margin-top: 10px; padding: 14px; border-radius: 10px;
  border: 2px dashed var(--dm-bd-red, #fca5a5); background: var(--dm-tint-red, #fef2f2); color: var(--dm-on-red, #b91c1c);
  display: flex; align-items: center; justify-content: center; gap: 8px;
  font-size: 12.5px; font-weight: 700;
}
.tree-detach-zone--over { background: var(--dm-tint-red, #fee2e2); border-color: #dc2626; }
.tree-detach-zone .mdi { font-size: 17px; }
.board-tree-search {
  position: sticky; top: 0; z-index: 2;
  display: flex; align-items: center; gap: 6px;
  background: var(--dm-surface, #fff); border: 1px solid var(--dm-border-strong, #cbd5e1); border-radius: 8px;
  padding: 0 10px; margin-bottom: 8px;
}
.board-tree-search .mdi { color: var(--dm-faint, #94a3b8); font-size: 15px; }
.board-tree-search input { flex: 1; border: none; outline: none; padding: 8px 0; font-size: 12px; }
.bts-clear { border: none; background: transparent; color: var(--dm-faint, #94a3b8); cursor: pointer; padding: 2px; }
.board-tree-hint {
  display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--dm-muted, #64748b);
  background: var(--dm-bg, #f1f5f9); border: 1px dashed var(--dm-border-strong, #cbd5e1); border-radius: 8px; padding: 7px 10px; margin-bottom: 10px;
}

/* Cards */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.card { border: 1px solid var(--dm-border, #e2e8f0); border-radius: 10px; overflow: hidden; background: var(--dm-surface, #fff); transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s; }
.card--wip { cursor: grab; }
.card--wip:active { cursor: grabbing; }
.card--wip:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); border-color: #f59e0b; }
.card--paired { opacity: 0.72; }
.card--paired:hover { opacity: 1; }
.card--dragging { outline: 2px solid #2563eb; opacity: 0.6; }
.card--selectable { cursor: pointer; }
.card--selectable:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); border-color: #16a34a; }
.card--iswip { box-shadow: 0 0 0 1px #fde68a inset; }
.card-thumb { position: relative; height: 84px; background: var(--dm-bg, #f1f5f9); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.card-thumb img { width: 100%; height: 100%; object-fit: cover; }
.card-thumb-icon { font-size: 38px; color: #f59e0b; }
.card-thumb-icon--wip { color: #f59e0b; }
.card-thumb-icon--fp { color: var(--dm-on-green, #16a34a); }
.card-grip { position: absolute; top: 4px; right: 4px; background: rgba(15,23,42,0.5); color: #fff; border-radius: 5px; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
.card-flag { position: absolute; top: 4px; left: 4px; width: 18px; height: 18px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #fff; }
.card-flag--ok { background: rgba(22,163,74,0.9); }
.card-mother-badge {
  position: absolute; top: 4px; left: 4px;
  display: inline-flex; align-items: center; gap: 3px;
  background: rgba(37,99,235,0.92); color: #fff; border-radius: 6px;
  font-size: 10px; font-weight: 700; padding: 2px 6px;
}
.card-mother-badge .mdi { font-size: 12px; }
.card-mother-badge { cursor: pointer; }
.card-mother-badge:hover { background: rgba(37,99,235,1); }
.card-tag { position: absolute; bottom: 4px; left: 4px; font-size: 9px; font-weight: 800; letter-spacing: .3px; padding: 1px 5px; border-radius: 4px; color: #fff; }
.card-tag--fp  { background: #16a34a; }
.card-tag--wip { background: #d97706; }
.card-open-hint { position: absolute; inset: 0; background: rgba(22,163,74,0.85); color: #fff; display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 11px; font-weight: 700; opacity: 0; transition: opacity 0.12s; pointer-events: none; }
.card--selectable:hover .card-open-hint { opacity: 1; }
.card-info { padding: 7px 9px; }
.ci-part { font-size: 12px; font-weight: 700; color: var(--dm-text, #1e293b); font-family: monospace; word-break: break-all; }
.ci-meta { display: flex; align-items: center; gap: 5px; margin-top: 3px; }
.ci-op { font-size: 9px; font-weight: 700; background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #b45309); padding: 1px 5px; border-radius: 3px; }
.ci-op--fp { background: var(--dm-tint-blue, #e0e7ff); color: var(--dm-on-violet, #4338ca); }
.ci-model { font-size: 11px; color: var(--dm-muted, #64748b); }
.ci-area { display: inline-block; margin-top: 5px; font-size: 9.5px; font-weight: 600; color: var(--dm-on-amber, #92400e); background: var(--dm-tint-amber, #fffbeb); border: 1px solid var(--dm-bd-amber, #fde68a); padding: 1px 6px; border-radius: 4px; }
.ci-area--fp { color: var(--dm-on-green, #065f46); background: var(--dm-tint-green, #f0fdf4); border-color: var(--dm-bd-green, #bbf7d0); }
.ci-area--ckd { color: var(--dm-on-red, #991b1b); background: var(--dm-tint-red, #fef2f2); border-color: var(--dm-bd-red, #fecaca); }
.ci-mothers { margin-top: 6px; padding-top: 5px; border-top: 1px dashed var(--dm-border, #e2e8f0); display: flex; flex-direction: column; gap: 3px; }
.ci-mother-row { display: flex; align-items: center; gap: 4px; font-size: 9.5px; color: var(--dm-muted, #64748b); }
.ci-mother-row > .mdi { color: var(--dm-accent, #2563eb); font-size: 12px; flex-shrink: 0; }
.ci-parent { display: flex; align-items: center; gap: 4px; margin-top: 6px; padding-top: 5px; border-top: 1px dashed var(--dm-border, #e2e8f0); font-size: 9.5px; color: var(--dm-muted, #64748b); }
.ci-parent > .mdi { color: var(--dm-on-green, #16a34a); font-size: 12px; }
.ci-parent-mix { font-family: monospace; color: var(--dm-text-2, #475569); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
.ci-detach { display: inline-flex; align-items: center; gap: 2px; cursor: pointer; border: 1px solid var(--dm-bd-red, #fecaca); background: var(--dm-tint-red, #fef2f2); color: var(--dm-on-red, #dc2626); border-radius: 5px; font-size: 9px; font-weight: 700; padding: 1px 5px; }
.ci-detach:hover:not(:disabled) { background: var(--dm-tint-red, #fee2e2); }
.ci-detach:disabled { opacity: 0.6; cursor: default; }

/* Detail (list) view — baris ringkas & padat, alternatif dari card-grid */
.detail-list { display: flex; flex-direction: column; gap: 4px; }
.detail-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 7px 10px; border: 1px solid var(--dm-border, #e2e8f0); border-radius: 8px; background: var(--dm-surface, #fff);
  transition: transform 0.1s, box-shadow 0.1s, border-color 0.1s;
}
.detail-row--wip { cursor: grab; }
.detail-row--wip:active { cursor: grabbing; }
.detail-row--wip:hover { border-color: #f59e0b; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.detail-row--dragging { outline: 2px solid #2563eb; opacity: 0.6; }
.detail-row--selectable { cursor: pointer; }
.detail-row--selectable:hover { border-color: #16a34a; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.detail-grip { color: #cbd5e1; font-size: 16px; flex-shrink: 0; }
.detail-icon { font-size: 18px; flex-shrink: 0; }
.detail-icon--wip { color: #f59e0b; }
.detail-icon--fp { color: var(--dm-on-green, #16a34a); }
.detail-tag { position: static; }
.detail-part { font-size: 12px; font-weight: 700; color: var(--dm-text, #1e293b); font-family: monospace; flex: 1 1 140px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.detail-model { font-size: 11px; color: var(--dm-muted, #64748b); flex: 0 1 auto; }
.detail-mother-badge { position: static; cursor: pointer; }
.detail-mothers { flex-basis: 100%; margin-top: 4px; padding-top: 4px; border-top: 1px dashed var(--dm-border, #e2e8f0); }
.detail-open-hint { margin-left: auto; color: var(--dm-on-green, #16a34a); font-size: 15px; opacity: 0; transition: opacity 0.12s; }
.detail-row--selectable:hover .detail-open-hint { opacity: 1; }

/* Smart picker: tombol "cari kandidat" pada kartu WIP yatim */
.card-suggest-btn {
  position: absolute; top: 4px; left: 4px; z-index: 1;
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border: none; border-radius: 5px; cursor: pointer;
  background: rgba(37,99,235,0.92); color: #fff; font-size: 12px;
}
.card-suggest-btn:hover { background: rgba(37,99,235,1); }
.card-edit-btn {
  position: absolute; top: 26px; left: 4px; z-index: 1;
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border: none; border-radius: 5px; cursor: pointer;
  background: rgba(217,119,6,0.92); color: #fff; font-size: 12px;
}
.card-edit-btn:hover { background: rgba(217,119,6,1); }
.card-suggest-btn--detail { position: static; width: auto; height: auto; padding: 3px 8px; border-radius: 6px; font-size: 11px; gap: 4px; }
.card-suggest-btn--detail .mdi { font-size: 13px; }

/* Suggest list (kandidat parent ter-rangking) */
.suggest-list { display: flex; flex-direction: column; gap: 8px; }
.suggest-card { border: 1px solid var(--dm-border, #e2e8f0); border-radius: 10px; padding: 9px 11px; background: var(--dm-surface, #fff); }
.suggest-main { display: flex; align-items: center; gap: 6px; }
.suggest-part { font-size: 12.5px; font-weight: 700; color: var(--dm-text, #1e293b); font-family: monospace; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.suggest-score { font-size: 10px; font-weight: 800; color: var(--dm-accent, #1d4ed8); background: var(--dm-tint-blue, #dbeafe); border-radius: 8px; padding: 1px 7px; }
.suggest-meta { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.suggest-reasons { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.suggest-reason-tag { font-size: 9.5px; font-weight: 600; color: var(--dm-on-amber, #92400e); background: var(--dm-tint-amber, #fffbeb); border: 1px solid var(--dm-bd-amber, #fde68a); border-radius: 4px; padding: 1px 6px; }
.suggest-actions { display: flex; gap: 6px; margin-top: 8px; }
.suggest-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 4px; border-radius: 7px; font-size: 11px; font-weight: 700; padding: 6px 8px; cursor: pointer; border: 1px solid transparent; }
.suggest-btn--ghost { background: var(--dm-surface2, #f8fafc); border-color: var(--dm-border-strong, #cbd5e1); color: var(--dm-cell, #334155); }
.suggest-btn--ghost:hover { background: var(--dm-bg, #eef2f7); }
.suggest-btn--primary { background: #2563eb; color: #fff; }
.suggest-btn--primary:hover:not(:disabled) { background: #1d4ed8; }
.suggest-btn--primary:disabled { opacity: 0.6; cursor: default; }

/* Toast */
.board-toast { position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%); padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 7px; color: #fff; box-shadow: 0 6px 18px rgba(0,0,0,0.2); }
.toast--ok { background: #16a34a; }
.toast--err { background: #dc2626; }

.board-fade-enter-active, .board-fade-leave-active { transition: opacity 0.2s; }
.board-fade-enter-from, .board-fade-leave-to { opacity: 0; }
.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.2s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateY(8px) translateX(-50%); }

@media (max-width: 768px) {
  .board-body { flex-direction: column; }
  .board-link { width: 100%; height: 30px; transform: rotate(90deg); }
}
</style>
