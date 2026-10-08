<!-- components/welding/master/BomVerifiedBadge.vue
  Tanda BOM terverifikasi (per part_number — ikut ke semua area/tree yg memakai
  part itu) + peringatan aturan NUT FEEDER. Data dari backend tree
  (node.bom_verified / node.nut_warnings), lihat M_weld::annotate_tree. -->
<template>
  <!-- compact (node anak / kartu mother): ikon saja tanpa pill — label lengkap
       cuma di node entry supaya tree tidak sesak. -->
  <span v-if="verified || relVerified" class="bvb bvb--ok" :class="{ 'bvb--icon': compact }" :title="okTitle">
    <i class="mdi mdi-check-decagram"></i><span v-if="!compact">BOM</span>
  </span>
  <span v-if="warnings?.length" class="bvb bvb--warn" :class="{ 'bvb--icon': compact }" :title="warnings.join('\n')">
    <i class="mdi mdi-alert"></i><span v-if="!compact">NUT</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BomVerifiedInfo } from '@/types/Public/Welding/master';

const props = defineProps<{
  verified?: BomVerifiedInfo | null;
  /** Tercantum sbg komponen di BOM terverifikasi milik induknya (parentPn). */
  relVerified?: boolean;
  parentPn?: string | null;
  warnings?: string[];
  compact?: boolean;
}>();

const okTitle = computed(() => [
  props.verified ? `BOM part ini terverifikasi oleh ${props.verified.verified_by} · ${props.verified.verified_at}` : '',
  props.relVerified ? `Komponen terverifikasi di BOM ${props.parentPn ?? 'induk'}` : '',
].filter(Boolean).join('\n'));
</script>

<style scoped>
.bvb {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  white-space: nowrap;
  cursor: default;
}
.bvb .mdi { font-size: 13px; }
.bvb--ok   { background: var(--dm-tint-green, #dcfce7); color: var(--dm-on-green, #15803d); border: 1px solid var(--dm-bd-green, #86efac); }
.bvb--warn { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #b45309); border: 1px solid var(--dm-bd-amber, #fcd34d); }
.bvb--icon { background: none; border: none; padding: 0; }
.bvb--icon .mdi { font-size: 15px; }
</style>
