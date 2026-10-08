<script setup lang="ts">
// components/IfpwEditModal.vue
import { ref, watch } from 'vue';
import type { IfpwStockItem } from '@/types/Public/Welding/ifpwStock';

const props = defineProps<{ item: IfpwStockItem | null; loading: boolean }>();
const emit = defineEmits<{ close: []; save: [{ part_number: string; stock: number; min: number | null; max: number | null }] }>();

const form = ref({ stock: 0, min: null as number | null, max: null as number | null });

watch(
  () => props.item,
  (item) => {
    if (item) form.value = { stock: item.stock, min: item.min, max: item.max };
  }
);

function onSave() {
  if (!props.item) return;
  emit('save', { part_number: props.item.part_number, ...form.value });
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="item" class="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm" @click.self="emit('close')">
        <div class="bg-white border border-gray-200 rounded-xl p-5 w-full max-w-sm mx-4 shadow-xl">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-bold text-gray-800 text-sm">Edit Stok IFPW</h3>
              <p class="font-mono text-xs text-blue-700 mt-0.5">{{ item.part_number }}</p>
            </div>
            <button @click="emit('close')" class="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
          </div>

          <!-- Form -->
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"> Stok Saat Ini </label>
              <input
                v-model.number="form.stock"
                type="number"
                min="0"
                class="w-full bg-white border border-gray-300 text-gray-800 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <p class="text-xs text-gray-400 mt-0.5">Nilai sekarang: {{ item.stock.toLocaleString('id-ID') }} pcs</p>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Min Stock</label>
                <input
                  v-model.number="form.min"
                  type="number"
                  min="0"
                  placeholder="—"
                  class="w-full bg-white border border-gray-300 text-gray-800 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Max Stock</label>
                <input
                  v-model.number="form.max"
                  type="number"
                  min="0"
                  placeholder="—"
                  class="w-full bg-white border border-gray-300 text-gray-800 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 justify-end mt-5">
            <button
              @click="emit('close')"
              class="px-3 py-1.5 text-sm text-gray-500 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              @click="onSave"
              :disabled="loading"
              class="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <svg v-if="loading" class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.15s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
