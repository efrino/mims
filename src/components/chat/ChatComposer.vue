<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    isSending?: boolean;
    suggestions: string[];
    showSuggestions?: boolean;
  }>(),
  { isSending: false, showSuggestions: true }
);

const emit = defineEmits<{
  (event: 'send', message: string): void;
}>();

const draft = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

watch(
  () => props.isSending,
  async (isSending, wasSending) => {
    if (wasSending && !isSending) {
      await nextTick();
      textareaRef.value?.focus();
    }
  }
);

function sendMessage(message = draft.value): void {
  const text = message.trim();
  if (!text) return;

  emit('send', text);
  draft.value = '';
}
</script>

<template>
  <footer class="floating-composer-wrapper px-4 px-sm-8 px-lg-16 py-4">
    <div class="composer-container bg-surface elevation-3 rounded-xl pa-2">
      <div v-if="showSuggestions" class="suggestions d-flex flex-wrap ga-2 px-2 pt-1 pb-2">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion"
          type="button"
          class="suggestion-chip"
          :disabled="isSending"
          @click="sendMessage(suggestion)"
        >
          {{ suggestion }}
        </button>
      </div>

      <form class="composer-form d-flex align-end ga-2 px-2" @submit.prevent="sendMessage()">
        <textarea
          ref="textareaRef"
          v-model="draft"
          rows="1"
          class="text-darkText"
          aria-label="Tulis pesan"
          placeholder="Tanyakan sesuatu..."
          :disabled="isSending"
          @keydown.enter.exact.prevent="sendMessage()"
        />

        <v-btn
          icon="mdi-send"
          color="primary"
          variant="flat"
          class="mb-1"
          size="small"
          type="submit"
          aria-label="Kirim pesan"
          :disabled="!draft.trim() || isSending"
        />
      </form>
    </div>
    <p class="text-caption text-lightText text-center mt-3 mb-0">
      AI dapat membuat kesalahan. Periksa kembali informasi penting.
    </p>
  </footer>
</template>

<style scoped>
.floating-composer-wrapper {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgb(var(--v-theme-containerBg)) 70%, transparent);
  z-index: 10;
}

.composer-container {
  max-width: 820px;
  margin: 0 auto;
  border: 1px solid rgb(var(--v-theme-borderLight));
  position: relative;
  isolation: isolate;
  transition: all 0.3s ease;
}

/* Focus glow yang memanfaatkan gradasi MIMS / Ant Design blue */
.composer-container:focus-within {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 4px rgb(var(--v-theme-lightprimary)) !important;
}

.suggestion-chip {
  padding: 6px 12px;
  border: 1px solid rgb(var(--v-theme-borderLight));
  background: rgb(var(--v-theme-containerBg));
  border-radius: 999px;
  color: rgb(var(--v-theme-secondary));
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.suggestion-chip:hover:not(:disabled) {
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-lightprimary));
}

.composer-form textarea {
  max-height: 150px;
  min-height: 36px;
  flex: 1;
  resize: none; /* Hilangkan resize manual untuk estetika clean */
  border: 0;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
  padding: 8px 4px;
}
</style>
