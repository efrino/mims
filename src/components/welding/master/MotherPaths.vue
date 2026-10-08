<!-- components/welding/master/MotherPaths.vue -->
<!--
  Hierarki Mother: part ini SEKALI di kiri, mother-mother di kolom kanan (rekursif sampai FP),
  disambung garis lengkung. Label di garis = qty part per 1 unit mother.
-->
<template>
  <div class="mp">
    <div class="mp-summary">
      <i class="mdi mdi-source-branch"></i>
      <span><b>{{ entry.job_number || entry.part_number }}</b> dipakai di <b>{{ parents.length }}</b> mother langsung</span>
      <span class="mp-summary-sub">· baca dari kiri (part ini) ke kanan (FP → kirim)</span>
    </div>
    <div ref="boxEl" class="mp-box">
      <svg class="mp-svg" :width="size.w" :height="size.h">
        <g v-for="e in edges" :key="e.id">
          <path :d="e.d" class="mp-line" :class="{ 'mp-line--end': e.end }" />
          <text v-if="e.qty" :x="e.lx" :y="e.ly" class="mp-qty" text-anchor="middle">×{{ e.qty }}</text>
        </g>
      </svg>
      <MotherBranch :node="entry" :parents="parents" mk="r" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { MsWeldingTreeNode } from '@/types/Public/Welding/master';
import MotherBranch from './MotherBranch.vue';

const props = defineProps<{ entry: MsWeldingTreeNode; parents: MsWeldingTreeNode[] }>();
const boxEl = ref<HTMLElement | null>(null);
const size = ref({ w: 0, h: 0 });
const edges = ref<{ id: string; d: string; lx: number; ly: number; qty: string; end: boolean }[]>([]);

// Qty per kunci node ("r.0.1" = mother ke-2 dari mother ke-1) utk label garis.
function qtyMap(): Record<string, number | null | undefined> {
  const out: Record<string, number | null | undefined> = {};
  const sort = (l: MsWeldingTreeNode[]) => [...l].sort((a, b) => (a.part_number || '').localeCompare(b.part_number || ''));
  const walk = (list: MsWeldingTreeNode[], key: string) => sort(list).forEach((p, i) => { out[`${key}.${i}`] = p.rel_qty; walk(p.parents ?? [], `${key}.${i}`); });
  walk(props.parents, 'r');
  return out;
}
const fmt = (q?: number | null) => (q == null ? '' : Number.isInteger(q) ? String(q) : String(+q.toFixed(3)));

// Garis dari sisi kanan kartu anak ke sisi kiri kartu mother (bezier horizontal).
function draw() {
  const box = boxEl.value;
  if (!box) return;
  const b = box.getBoundingClientRect();
  const at = (k: string) => box.querySelector<HTMLElement>(`[data-mk="${k}"]`)?.getBoundingClientRect();
  const q = qtyMap();
  const out: typeof edges.value = [];
  box.querySelectorAll<HTMLElement>('[data-mk]').forEach(el => {
    const k = el.dataset.mk!;
    if (k === 'r') return;
    const end = k.endsWith('.end');
    const from = at(end ? k.slice(0, -4) : k.slice(0, k.lastIndexOf('.')));
    const to = el.getBoundingClientRect();
    if (!from) return;
    const x1 = from.right - b.left + box.scrollLeft, y1 = from.top + from.height / 2 - b.top;
    const x2 = to.left - b.left + box.scrollLeft, y2 = to.top + to.height / 2 - b.top;
    const dx = Math.max(24, (x2 - x1) * 0.5);
    out.push({ id: k, end, d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`,
      lx: (x1 + x2) / 2, ly: (y1 + y2) / 2 - 5, qty: end ? '' : fmt(q[k]) });
  });
  edges.value = out;
  size.value = { w: box.scrollWidth, h: box.scrollHeight };
}

let ro: ResizeObserver | null = null;
onMounted(() => {
  nextTick(draw);
  ro = new ResizeObserver(() => draw());
  if (boxEl.value) ro.observe(boxEl.value);
});
onBeforeUnmount(() => ro?.disconnect());
watch(() => [props.entry, props.parents], () => nextTick(draw), { deep: true });
</script>

<style scoped>
.mp { display: flex; flex-direction: column; gap: 8px; }
.mp-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 13px; color: var(--dm-text, #1e293b); padding: 2px 2px 4px; }
.mp-summary .mdi { color: var(--dm-accent, #2563eb); font-size: 16px; }
.mp-summary-sub { font-size: 11.5px; color: var(--dm-muted, #64748b); }
.mp-box { position: relative; overflow-x: auto; padding: 14px; border: 1px solid var(--dm-border, #e2e8f0); border-radius: 10px; background: var(--dm-surface, #fff); }
.mp-svg { position: absolute; left: 0; top: 0; pointer-events: none; overflow: visible; }
.mp-line { fill: none; stroke: #60a5fa; stroke-width: 2; }
.mp-line--end { stroke: var(--dm-border-strong, #cbd5e1); stroke-dasharray: 4 4; }
.mp-qty { font-size: 10.5px; font-weight: 800; fill: var(--dm-text, #1e293b); paint-order: stroke; stroke: var(--dm-surface, #fff); stroke-width: 4px; }
</style>
