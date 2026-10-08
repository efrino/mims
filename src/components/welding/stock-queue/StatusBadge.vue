<script setup lang="ts">
import type { QueueStatus } from '@/types/Public/Welding/stockQueue';
import { STATUS_CONFIG } from '@/types/Public/Welding/stockQueue';
const props = defineProps<{ status: QueueStatus; pulse?: boolean }>();
const cfg = STATUS_CONFIG[props.status];
</script>
<template>
  <span
    :class="[
      cfg.badgeBg,
      cfg.text,
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold font-mono border',
      cfg.border
    ]"
  >
    <span :class="[cfg.dot, 'w-1.5 h-1.5 rounded-full flex-shrink-0', pulse ? 'animate-pulse' : '']" />
    {{ cfg.label }}
  </span>
</template>
