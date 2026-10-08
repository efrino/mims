<!-- components/welding/master/ParentChainPicker.vue -->
<!--
  Satu LEVEL rantai induk dengan PEMILIH.
  Satu parent → langsung tampil rantainya (ParentNode) seperti biasa.
  Banyak parent → daftar parent (urut part number) di kiri, rantai parent yang
  dipilih di kanan. Dipakai di level teratas (master-data.vue) DAN rekursif di
  dalam ParentNode utk grandparent — menggantikan tampilan lama yang menjejer
  semua cabang berdampingan sampai kartunya terpotong / tidak terbaca.
-->
<template>
  <div class="pcp">
    <ParentNode
      v-if="sorted.length === 1"
      :node="sorted[0]" :depth="depth"
      :show-entry-qty="showEntryQty" :entry-qty-unit="entryQtyUnit" :entry-uom="entryUom"
    />

    <div v-else class="pcp-grid">
      <!-- Daftar mother langsung -->
      <div class="pcp-list">
        <div class="pcp-list-head">
          <i class="mdi mdi-format-list-numbered"></i>
          {{ sorted.length }} {{ depth === 0 ? 'mother langsung' : 'induk level ' + (depth + 1) }}
          <span class="pcp-list-hint">pilih untuk lihat rantai</span>
        </div>
        <button
          v-for="(p, i) in sorted" :key="keyOf(p)"
          type="button"
          class="pcp-item"
          :class="{ 'pcp-item--active': keyOf(p) === selectedKey, 'pcp-item--notfound': p._not_found }"
          @click="selectedKey = keyOf(p)"
        >
          <span class="pcp-item-no">{{ i + 1 }}</span>
          <span v-if="p._not_found" class="type-badge type-nf">?</span>
          <span v-else class="type-badge" :class="p.is_wip ? 'type-wip' : 'type-fp'">{{ p.is_wip ? 'WIP' : 'FP' }}</span>
          <span class="pcp-item-label">
            <span class="pcp-item-pn font-mono">{{ p.part_number || p.part_number_mix }}</span>
            <span class="pcp-item-sub">{{ p._not_found ? 'Tidak ditemukan di master' : (p.part_name || p.alias || '—') }}</span>
          </span>
          <span v-if="p.op" class="pcp-item-op">OP{{ p.op }}</span>
          <span v-if="p.area" class="pcp-item-area">{{ p.area }}</span>
          <span v-if="ancestorDepth(p)" class="pcp-item-depth" :title="`${ancestorDepth(p)} level di atas mother ini`">+{{ ancestorDepth(p) }}</span>
        </button>
      </div>

      <!-- Rantai mother terpilih -->
      <div class="pcp-chain">
        <div class="pcp-chain-head">
          <i class="mdi mdi-source-branch-plus"></i>
          Rantai <span class="font-mono">{{ selected?.part_number || selected?.part_number_mix }}</span>
          <span class="pcp-list-hint">akar di atas → induk langsung di bawah</span>
        </div>
        <ParentNode
          v-if="selected"
          :key="selectedKey"
          :node="selected" :depth="depth"
          :show-entry-qty="showEntryQty" :entry-qty-unit="entryQtyUnit" :entry-uom="entryUom"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ParentNode from './ParentNode.vue';
import type { MsWeldingTreeNode } from '@/types/Public/Welding/master';

interface Props {
  parents: MsWeldingTreeNode[];
  depth?: number;          // 0 = mother langsung part terpilih; >0 = grandparent (rekursi dari ParentNode)
  showEntryQty?: boolean;
  entryQtyUnit?: number | null;
  entryUom?: string | null;
}
const props = withDefaults(defineProps<Props>(), { depth: 0, showEntryQty: false, entryQtyUnit: null, entryUom: null });

const keyOf = (p: MsWeldingTreeNode) => String(p.id ?? p.part_number_mix ?? p.part_number);

// Urut: part yang ada di master dulu, lalu by part number — biar daftar stabil & mudah dicari.
const sorted = computed(() =>
  [...props.parents].sort((a, b) => {
    if (!!a._not_found !== !!b._not_found) return a._not_found ? 1 : -1;
    return (a.part_number || a.part_number_mix || '').localeCompare(b.part_number || b.part_number_mix || '');
  }),
);

const selectedKey = ref<string>('');
watch(sorted, (list) => {
  if (!list.some(p => keyOf(p) === selectedKey.value)) selectedKey.value = list.length ? keyOf(list[0]) : '';
}, { immediate: true });

const selected = computed(() => sorted.value.find(p => keyOf(p) === selectedKey.value) ?? null);

// Kedalaman rantai di atas mother ini (0 = mother ini sudah akar).
function ancestorDepth(p: MsWeldingTreeNode): number {
  if (!p.parents?.length) return 0;
  return 1 + Math.max(...p.parents.map(ancestorDepth));
}
</script>

<style scoped>
.pcp { width: 100%; }
.pcp-grid {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}
@media (max-width: 760px) {
  .pcp-grid { grid-template-columns: 1fr; }
}

/* ── Daftar mother ───────────────────────────────────────── */
.pcp-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid var(--dm-border, #e2e8f0);
  border-radius: 8px;
  background: var(--dm-surface2, #f8fafc);
}
.pcp-list-head, .pcp-chain-head {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--dm-cell, #334155);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 2px 4px 4px;
}
.pcp-list-head .mdi, .pcp-chain-head .mdi { color: var(--dm-accent, #2e5396); font-size: 14px; }
.pcp-list-hint {
  font-size: 9.5px;
  font-weight: 400;
  color: var(--dm-faint, #94a3b8);
  text-transform: none;
  letter-spacing: 0;
  margin-left: 2px;
}

.pcp-item {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 6px 8px;
  border: 1.5px solid var(--dm-border, #e5e7eb);
  border-radius: 7px;
  background: var(--dm-surface, #fff);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: border-color .15s, background .15s, box-shadow .15s;
}
.pcp-item:hover { border-color: var(--dm-bd-blue, #93c5fd); background: var(--dm-surface2, #f8fbff); }
.pcp-item--active {
  border-color: #2e5396;
  background: var(--dm-tint-blue, #eef4ff);
  box-shadow: 0 0 0 2px rgba(46, 83, 150, .12);
}
.pcp-item--notfound { border-style: dashed; background: var(--dm-tint-amber, #fefce8); }

.pcp-item-no {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--dm-bg, #e2e8f0);
  color: var(--dm-text-2, #475569);
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pcp-item--active .pcp-item-no { background: #2e5396; color: #fff; }

.pcp-item-label { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.pcp-item-pn { font-size: 11.5px; font-weight: 700; color: var(--dm-text, #1a2744); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pcp-item-sub { font-size: 9.5px; color: var(--dm-muted, #6b7280); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.pcp-item-op, .pcp-item-area, .pcp-item-depth {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.pcp-item-op    { background: var(--dm-tint-blue, #dbeafe); color: var(--dm-accent, #1e40af); }
.pcp-item-area  { background: var(--dm-bg, #f1f5f9); color: var(--dm-cell, #334155); border: 1px solid var(--dm-border, #e2e8f0); }
.pcp-item-depth { background: var(--dm-tint-violet, #ede9fe); color: var(--dm-on-violet, #5b21b6); }

.type-badge { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 3px; flex-shrink: 0; }
.type-fp  { background: var(--dm-tint-green, #dcfce7); color: var(--dm-on-green, #166534); }
.type-wip { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #92400e); }
.type-nf  { background: var(--dm-tint-amber, #fef9c3); color: var(--dm-on-amber, #a16207); }

/* ── Rantai terpilih ─────────────────────────────────────── */
.pcp-chain {
  min-width: 0;
  padding: 6px 8px 8px;
  border: 1px solid var(--dm-border, #e2e8f0);
  border-radius: 8px;
  background: var(--dm-surface, #fff);
}
.pcp-chain-head .font-mono { text-transform: none; color: var(--dm-text, #1a2744); }
</style>
