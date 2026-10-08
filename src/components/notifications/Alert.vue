<template>
  <Teleport to="body">
    <AnimatePresence>
      <motion.div
        v-if="alert.status"
        key="alert"
        class="fixed top-4 right-4 z-[99999] flex items-start gap-3 w-80 rounded-lg shadow-lg px-4 py-3"
        :class="colorClass"
        :initial="{ opacity: 0, x: 40 }"
        :animate="{ opacity: 1, x: 0 }"
        :exit="{ opacity: 0, x: 40 }"
        :transition="{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }"
      >
        <i :class="iconClass" class="text-xl mt-0.5 shrink-0" />
        <p class="text-sm font-medium leading-snug">{{ alert.message }}</p>
      </motion.div>
    </AnimatePresence>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { motion, AnimatePresence } from 'motion-v';
import { useNotificationStore } from '@/stores/notification';

const notificationStore = useNotificationStore();
const { alert } = storeToRefs(notificationStore);

const colorClass = computed(() => {
  const map: Record<string, string> = {
    success: 'bg-green-500 text-white',
    warning: 'bg-amber-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
  };
  return map[alert.value.type] ?? 'bg-blue-500 text-white';
});

const iconClass = computed(() => {
  const map: Record<string, string> = {
    success: 'mdi mdi-check-circle',
    warning: 'mdi mdi-alert',
    error: 'mdi mdi-close-circle',
    info: 'mdi mdi-information',
  };
  return map[alert.value.type] ?? 'mdi mdi-information';
});
</script>
