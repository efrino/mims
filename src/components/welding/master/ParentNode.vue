<!-- components/welding/master/ParentNode.vue -->
<!--
  Menampilkan RANTAI induk ke atas — akar di atas, parent langsung di bawah.
  Tiap level ditampilkan sebagai kartu, disambung garis vertikal putus-putus.
  Multi-parent pada satu level ditampilkan berdampingan (flex-row) dengan cabang.
-->
<template>
  <div class="pchain">
    <!-- ── Grandparent / ancestor lebih dalam → render dulu di atas ── -->
    <template v-if="node.parents && node.parents.length">
      <!-- Banyak grandparent → pemilih (list + rantai terpilih), bukan dijejer. -->
      <div class="pchain-level">
        <ParentChainPicker :parents="node.parents" :depth="depth + 1" />
      </div>

      <!-- Konektor turun ke node ini -->
      <div class="pchain-connector">
        <span class="pchain-line"></span>
        <span class="pchain-arrow-icon"><i class="mdi mdi-chevron-down"></i></span>
        <span class="pchain-line"></span>
      </div>
    </template>

    <!-- ── Kartu node ini ── -->
    <div v-if="node._not_found" class="pcard pcard--notfound">
      <i class="mdi mdi-help-circle-outline pcard-notfound-icon"></i>
      <div class="pcard-label">
        <span class="pcard-pn font-mono">{{ node.part_number_mix }}</span>
        <span class="pcard-sub">Part tidak ditemukan di master data</span>
      </div>
    </div>

    <div v-else class="pcard" :class="[node.is_wip ? 'pcard--wip' : 'pcard--fp', areaClass]">
      <!-- Kiri: badge tipe -->
      <span class="type-badge" :class="node.is_wip ? 'type-wip' : 'type-fp'">
        {{ node.is_wip ? 'WIP' : 'FP' }}
      </span>

      <!-- Tengah: identitas -->
      <div class="pcard-label">
        <span class="pcard-pn font-mono">{{ node.part_number || node.part_number_mix }} <BomVerifiedBadge :verified="node.bom_verified" compact /></span>
        <span v-if="node.part_name || node.alias" class="pcard-sub">{{ node.part_name || node.alias }}</span>
      </div>

      <span class="pcard-spacer"></span>

      <!-- Kanan: Qty Unit ENTRY (bukan qty_unit mother — mother biasanya FP,
           tak punya qty_unit relevan). Kalau part terpilih WIP & punya mother,
           qty unit-nya ditampilkan di tiap kartu mother langsung (bukan di
           node entry sendiri, lihat TreeNode.vue) — hanya utk direct-parent
           (depth 0), bukan grandparent yg direkursi lebih dalam. + OP + area -->
      <span v-if="showEntryQty && depth === 0" class="pcard-qty">
        Qty Unit: {{ entryQtyUnit ?? '—' }}<template v-if="entryQtyUnit && entryUom"> {{ entryUom }}</template>
      </span>
      <span v-if="node.op" class="pcard-op">OP{{ node.op }}</span>
      <span v-if="node.area" class="pcard-area" :class="areaClass">{{ node.area }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ParentChainPicker from './ParentChainPicker.vue';
import BomVerifiedBadge from './BomVerifiedBadge.vue';
import type { MsWeldingTreeNode } from '@/types/Public/Welding/master';

interface Props {
  node: MsWeldingTreeNode;
  depth?: number;
  // Qty Unit part TERPILIH (entry) — bukan qty_unit node ini. Cuma tampil di
  // direct-parent (depth 0), diteruskan dari master-data.vue.
  showEntryQty?: boolean;
  entryQtyUnit?: number | null;
  entryUom?: string | null;
}
const props = withDefaults(defineProps<Props>(), { depth: 0, showEntryQty: false, entryQtyUnit: null, entryUom: null });

const AREA_COLORS: Record<string, string> = {
  'SA ADM':      'area-rb',
  'CO ADM':      'area-rc',
  'SA HMMI':     'area-rh',
  'WSS ADM':     'area-wa',
  'WSS MMKI':    'area-wm'
};
const areaClass = computed(() => AREA_COLORS[props.node.area ?? ''] ?? 'area-other');
</script>

<style scoped>
/* ── Root chain wrapper ───────────────────────────────────── */
.pchain {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Level yang berisi grandparent(s) di atas */
.pchain-level {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Konektor vertikal ────────────────────────────────────── */
.pchain-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 2px 0;
  gap: 0;
  flex-shrink: 0;
}
.pchain-line {
  display: block;
  width: 2px;
  height: 10px;
  background: var(--dm-border-strong, #cbd5e1);
  border-radius: 1px;
}
.pchain-arrow-icon {
  color: var(--dm-faint, #94a3b8);
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
}
.pchain-arrow-icon .mdi { font-size: 14px; }

/* ── Kartu induk ─────────────────────────────────────────── */
.pcard {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  border-radius: 8px;
  border: 1.5px solid var(--dm-border, #e5e7eb);
  background: var(--dm-surface, #fff);
  min-width: 0;
}
.pcard--fp  { background: var(--dm-tint-green, #f0fdf4); border-color: var(--dm-bd-green, #86efac); }
.pcard--wip { background: var(--dm-tint-amber, #fffbeb); border-color: var(--dm-bd-amber, #fcd34d); }

/* Area tint override border */
.pcard--fp.area-rb  { border-color: var(--dm-bd-blue, #93c5fd); background: var(--dm-tint-blue, #eff6ff); }
.pcard--fp.area-rt  { border-color: #c4b5fd; background: var(--dm-tint-violet, #f5f3ff); }
.pcard--fp.area-rc  { border-color: #6ee7b7; background: var(--dm-tint-green, #ecfdf5); }
.pcard--fp.area-rh  { border-color: var(--dm-bd-red, #f9a8d4); background: var(--dm-tint-red, #fdf2f8); }
.pcard--fp.area-wa  { border-color: var(--dm-bd-amber, #fde047); background: var(--dm-tint-amber, #fefce8); }
.pcard--fp.area-wm  { border-color: #fdba74; background: var(--dm-tint-amber, #fff7ed); }
.pcard--fp.area-sm  { border-color: var(--dm-bd-green, #86efac); background: var(--dm-tint-green, #f0fdf4); }
.pcard--wip.area-rb { border-color: var(--dm-bd-blue, #bfdbfe); background: var(--dm-tint-blue, #f0f7ff); }
.pcard--wip.area-rt { border-color: var(--dm-bd-blue, #ddd6fe); background: var(--dm-tint-violet, #f5f3ff); }
.pcard--wip.area-rc { border-color: var(--dm-bd-green, #a7f3d0); background: var(--dm-tint-green, #f0fdfb); }
.pcard--wip.area-rh { border-color: var(--dm-bd-red, #fbcfe8); background: var(--dm-tint-red, #fdf2f8); }
.pcard--wip.area-wa { border-color: var(--dm-bd-amber, #fef08a); background: var(--dm-tint-amber, #fefce8); }
.pcard--wip.area-wm { border-color: var(--dm-bd-amber, #fed7aa); background: var(--dm-tint-amber, #fff7ed); }
.pcard--wip.area-sm { border-color: var(--dm-bd-green, #bbf7d0); background: var(--dm-tint-green, #f0fdf4); }
.pcard.area-other   { border-color: var(--dm-border, #d1d5db); background: var(--dm-surface2, #f9fafb); }

/* ── Not found card ──────────────────────────────────────── */
.pcard--notfound {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 11px;
  border-radius: 8px;
  border: 1.5px dashed var(--dm-bd-amber, #fcd34d);
  background: var(--dm-tint-amber, #fefce8);
}
.pcard-notfound-icon {
  font-size: 16px;
  color: var(--dm-on-amber, #b45309);
  flex-shrink: 0;
}

/* ── Isi kartu ───────────────────────────────────────────── */
.type-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 3px;
  flex-shrink: 0;
}
.type-fp  { background: var(--dm-tint-green, #dcfce7); color: var(--dm-on-green, #166534); }
.type-wip { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #92400e); }

.pcard-label {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.pcard-pn {
  font-weight: 700;
  font-size: 12px;
  color: var(--dm-text, #1a2744);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pcard-sub {
  font-size: 10px;
  color: var(--dm-muted, #6b7280);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pcard-spacer { flex: 1 1 auto; min-width: 4px; }

.pcard-op {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 3px;
  background: var(--dm-tint-blue, #dbeafe);
  color: var(--dm-accent, #1d4ed8);
  flex-shrink: 0;
}
.pcard-qty {
  font-size: 10px;
  font-weight: 600;
  color: var(--dm-muted, #64748b);
  flex-shrink: 0;
  white-space: nowrap;
}
.pcard-area {
  font-size: 8.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
  white-space: nowrap;
}

/* area palette */
.area-rb { background: var(--dm-tint-blue, #dbeafe); color: var(--dm-accent, #1d4ed8); border: 1px solid var(--dm-bd-blue, #93c5fd); }
.area-rt { background: var(--dm-tint-violet, #ede9fe); color: var(--dm-on-violet, #6d28d9); border: 1px solid #c4b5fd; }
.area-rc { background: var(--dm-tint-green, #d1fae5); color: var(--dm-on-green, #065f46); border: 1px solid #6ee7b7; }
.area-rh { background: var(--dm-tint-red, #fce7f3); color: var(--dm-on-red, #9d174d); border: 1px solid var(--dm-bd-red, #f9a8d4); }
.area-wa { background: var(--dm-tint-amber, #fef9c3); color: var(--dm-on-amber, #713f12); border: 1px solid var(--dm-bd-amber, #fde047); }
.area-wm { background: var(--dm-tint-amber, #ffedd5); color: var(--dm-on-amber, #9a3412); border: 1px solid #fdba74; }
.area-sm { background: var(--dm-tint-green, #f0fdf4); color: var(--dm-on-green, #14532d); border: 1px solid var(--dm-bd-green, #86efac); }
.area-other { background: var(--dm-bg, #f3f4f6); color: var(--dm-cell, #374151); border: 1px solid var(--dm-border, #d1d5db); }

.font-mono { font-family: monospace; }
</style>
