<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { useAchievementWld } from '@/stores/Welding/Transaction/Achievement_v2';

// Saklar OP Gabung / Pisah (disimpan per browser). Shortcut: Alt+O.
const store = useAchievementWld();

const onKey = (e: KeyboardEvent) => {
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'o') {
    e.preventDefault();
    store.setSplitOp(!store.splitOp);
  }
};
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="op-toggle" role="group" aria-label="Baris per OP" title="Baris per OP (Alt+O)">
    <span class="op-lbl">OP</span>
    <button
      type="button"
      :class="{ on: !store.splitOp }"
      :aria-pressed="!store.splitOp"
      title="Gabung — 1 baris per part, mesin digabung (Alt+O)"
      @click="store.setSplitOp(false)"
    >Gabung</button>
    <button
      type="button"
      :class="{ on: store.splitOp }"
      :aria-pressed="store.splitOp"
      title="Pisah — 1 baris per proses OP10, OP20, …; actual diisi di OP terakhir (Alt+O)"
      @click="store.setSplitOp(true)"
    >Pisah</button>
  </div>
</template>

<style scoped>
.op-toggle {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #f9fafb;
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
}
.op-lbl {
  padding: 0 6px 0 8px;
  color: #9ca3af;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.op-toggle button {
  padding: 5px 10px;
  border-radius: 999px;
  color: #4b5563;
  font-weight: 500;
  transition: background-color 0.15s, color 0.15s;
}
.op-toggle button:hover:not(.on) { background: #eef2ff; color: #3730a3; }
.op-toggle button.on { background: #4f46e5; color: #fff; box-shadow: 0 1px 2px rgb(0 0 0 / 0.12); }
.op-toggle button:focus-visible { outline: 2px solid #6366f1; outline-offset: 1px; }
</style>
