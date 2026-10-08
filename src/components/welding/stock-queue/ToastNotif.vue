<script setup lang="ts">
import { watch, onUnmounted } from 'vue';
const props = defineProps<{ message: string | null; success: boolean | null; duration?: number }>();
const emit = defineEmits<{ close: [] }>();
let timer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => props.message,
  (v) => {
    if (timer) clearTimeout(timer);
    if (v) timer = setTimeout(() => emit('close'), props.duration ?? 4000);
  }
);
onUnmounted(() => {
  if (timer) clearTimeout(timer);
});
</script>
<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="message"
        :class="[
          'fixed bottom-5 right-5 z-50 flex items-start gap-2.5 px-4 py-3 rounded-lg shadow-xl border max-w-sm text-sm',
          success ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'
        ]"
      >
        <span class="flex-shrink-0 mt-0.5 font-bold">{{ success ? '✓' : '✗' }}</span>
        <p class="leading-snug flex-1">{{ message }}</p>
        <button @click="emit('close')" class="flex-shrink-0 opacity-40 hover:opacity-80 transition-opacity ml-1">✕</button>
      </div>
    </Transition>
  </Teleport>
</template>
<style scoped>
.toast-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-leave-active {
  transition: all 0.15s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
