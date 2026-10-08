<!-- components/welding/master/MotherBranch.vue -->
<!-- Satu kartu + kolom mother-nya di kanan (rekursif). Garis lengkung digambar MotherPaths. -->
<template>
  <div class="mb">
    <div class="mb-card" :data-mk="mk" :class="{ 'mb-card--entry': isEntry, 'mb-card--fp': !isEntry && !node.is_wip && !node._not_found, 'mb-card--nf': node._not_found }">
      <div class="mb-top">
        <span v-if="isEntry" class="mb-tag mb-tag--entry">Part ini</span>
        <span v-else-if="node._not_found" class="mb-tag mb-tag--nf">?</span>
        <span v-else class="mb-tag" :class="node.is_wip ? 'mb-tag--wip' : 'mb-tag--fp'">{{ node.is_wip ? 'WIP' : 'FP' }}</span>
        <span class="mb-job">{{ node._not_found ? (node.part_number_mix || 'Tidak di master') : (node.job_number || node.part_number) }}</span>
        <span v-if="node.op" class="mb-op">OP{{ node.op }}</span>
      </div>
      <span v-if="!node._not_found && node.job_number && node.job_number !== node.part_number" class="mb-pn">{{ node.part_number }}</span>
      <span v-if="node.part_name" class="mb-name" :title="node.part_name">{{ node.part_name }}</span>
      <span v-if="node.area" class="mb-area" :style="areaStyle(node.area)">{{ node.area }}<template v-if="node.machine"> · {{ node.machine }}</template></span>
    </div>
    <div v-if="kids.length" class="mb-kids">
      <MotherBranch v-for="(p, i) in kids" :key="mk + '.' + i" :node="p" :mk="mk + '.' + i" />
    </div>
    <span v-else-if="!isEntry && !node.is_wip && !node._not_found" class="mb-end" :data-mk="mk + '.end'"><i class="mdi mdi-truck-outline"></i> Kirim (IFPD)</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MsWeldingTreeNode } from '@/types/Public/Welding/master';
import { useAreaColor } from '@/composables/useAreaColor';

const props = defineProps<{ node: MsWeldingTreeNode; mk: string; parents?: MsWeldingTreeNode[] }>();
const isEntry = computed(() => props.mk === 'r');
// Entry: mother langsung dari prop parents (node entry tak membawa .parents).
const kids = computed(() => [...((isEntry.value ? props.parents : props.node.parents) ?? [])]
  .sort((a, b) => (a.part_number || '').localeCompare(b.part_number || '')));
const { getStyle } = useAreaColor();
const areaStyle = (a: string) => getStyle(a.toUpperCase());
</script>

<style scoped>
.mb { display: flex; align-items: center; gap: 56px; }
.mb-kids { display: flex; flex-direction: column; gap: 10px; }
.mb-card { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 2px; padding: 7px 11px; border-radius: 9px; width: 210px;
  border: 1px solid var(--dm-bd-amber, #fde68a); background: var(--dm-tint-amber, #fffbeb); }
.mb-card--fp { border-color: var(--dm-bd-green, #a7f3d0); background: var(--dm-tint-green, #ecfdf5); }
.mb-card--entry { border: 2px solid #2563eb; background: var(--dm-tint-blue, #eff6ff); }
.mb-card--nf { border-style: dashed; opacity: .8; }
.mb-top { display: flex; align-items: center; gap: 5px; }
.mb-job { font-weight: 800; font-size: 13px; color: var(--dm-accent, #1d4ed8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mb-pn { font-family: monospace; font-size: 11px; font-weight: 600; color: var(--dm-text, #1e293b); }
.mb-name { font-size: 10.5px; color: var(--dm-muted, #64748b); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mb-area { align-self: flex-start; margin-top: 2px; padding: 1px 7px; border-radius: 999px; font-size: 10px; font-weight: 700;
  background: var(--area-pill, #e2e8f0); color: var(--area-pill-text, #334155); border: 1px solid var(--area-border, transparent); }
.mb-op { font-size: 9.5px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: var(--dm-tint-blue, #dbeafe); color: var(--dm-accent, #1e40af); }
.mb-tag { font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 4px; flex-shrink: 0; }
.mb-tag--entry { background: #2563eb; color: #fff; }
.mb-tag--wip { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #92400e); border: 1px solid var(--dm-bd-amber, #fcd34d); }
.mb-tag--fp { background: var(--dm-tint-green, #dcfce7); color: var(--dm-on-green, #166534); border: 1px solid var(--dm-bd-green, #86efac); }
.mb-tag--nf { background: var(--dm-tint-amber, #fef9c3); color: var(--dm-on-amber, #a16207); }
.mb-end { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap;
  background: var(--dm-surface2, #f1f5f9); color: var(--dm-text-2, #334155); border: 1px dashed var(--dm-border-strong, #cbd5e1); }
</style>
