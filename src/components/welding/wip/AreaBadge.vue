<template>
  <span class="area-badge" :style="style">
    <span class="area-badge__dot"></span>
    {{ area }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAreaColor } from '@/composables/useAreaColor';

const props = defineProps<{ area: string }>();
const { getColor } = useAreaColor();

const style = computed(() => {
  const c = getColor(props.area);
  return {
    background: c.pill,
    color: c.pillText,
    borderColor: c.border,
    '--dot-color': c.border
  };
});
</script>

<style scoped>
.area-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px 2px 6px;
  border-radius: 5px;
  border: 1px solid;
  font-size: 10.5px;
  font-weight: 700;
  white-space: nowrap;
}
.area-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dot-color, #64748b);
  flex-shrink: 0;
}
</style>
