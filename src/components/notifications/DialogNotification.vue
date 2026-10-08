<template>
  <Teleport to="body">
    <AnimatePresence>
      <motion.div
        v-if="dialog.status"
        key="dialog-overlay"
        class="fixed inset-0 z-[99999] flex items-center justify-center"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        :transition="{ duration: 0.2 }"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" />

        <!-- Card -->
        <motion.div
          class="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden"
          :initial="{ opacity: 0, y: 24 }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0, y: 16 }"
          :transition="{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }"
        >
          <!-- Title -->
          <div class="px-4 py-3 text-white font-semibold text-base" :class="titleColorClass">
            {{ dialog.title }}
          </div>

          <!-- Body -->
          <div
            class="px-6 py-6 text-center text-base text-gray-700 dark:text-gray-300"
            v-html="dialog.message"
          />

          <!-- Divider -->
          <div class="border-t border-gray-200 dark:border-gray-700" />

          <!-- Actions -->
          <div class="px-4 py-3 flex items-center justify-between">
            <button
              v-if="dialog.onOk"
              @click="handleOk"
              class="px-4 py-1.5 rounded text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors"
            >
              {{ dialog.okLabel || 'OK' }}
            </button>
            <span v-else />
            <button
              @click="handleClose"
              class="px-4 py-1.5 rounded text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              {{ dialog.closeLabel || 'Close' }}
            </button>
          </div>
        </motion.div>
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
const { dialog } = storeToRefs(notificationStore);

const titleColorClass = computed(() => {
  const colorMap: Record<string, string> = {
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };
  return colorMap[dialog.value.type] ?? 'bg-blue-500';
});

const handleClose = () => {
  dialog.value.status = false;
  if (dialog.value.onClose) dialog.value.onClose();
  dialog.value.onClose = () => {};
  dialog.value.onOk = null;
  dialog.value.okLabel = 'OK';
  dialog.value.closeLabel = 'Close';
};

const handleOk = () => {
  dialog.value.status = false;
  if (dialog.value.onOk) dialog.value.onOk();
  dialog.value.onClose = () => {};
  dialog.value.onOk = null;
  dialog.value.okLabel = 'OK';
  dialog.value.closeLabel = 'Close';
};
</script>
