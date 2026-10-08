<!-- components/shared/AppDialog.vue — modal global pengganti alert/confirm (lihat utils/dialog.ts).
  Gaya mengikuti modal web: header gradasi biru (merah utk aksi berbahaya), ikon per nada.
  Keyboard: Enter = lanjut/OK, Esc = batal. Klik di luar tidak menutup (standar modal web). -->
<template>
  <Teleport to="body">
    <Transition name="ad-fade">
      <div v-if="s.open" class="ad-overlay" @click.self.prevent>
        <div class="ad-box" role="alertdialog" aria-modal="true" :aria-label="s.title">
          <div class="ad-header" :class="{ 'ad-header--danger': s.danger || s.tone === 'error' }">
            <span class="ad-icon"><i class="mdi" :class="icon"></i></span>
            <p class="ad-title">{{ s.title }}</p>
          </div>
          <div class="ad-body">
            <p class="ad-msg">{{ s.message }}</p>
          </div>
          <div class="ad-footer">
            <span class="ad-keys"><kbd>Esc</kbd> {{ s.kind === 'confirm' ? 'batal' : 'tutup' }} · <kbd>Enter</kbd> {{ s.kind === 'confirm' ? 'lanjut' : 'OK' }}</span>
            <button v-if="s.kind === 'confirm'" type="button" class="ad-btn ad-btn--ghost" @click="close(false)">{{ s.cancelText }}</button>
            <button ref="okRef" type="button" class="ad-btn" :class="s.danger ? 'ad-btn--danger' : 'ad-btn--primary'" @click="close(true)">
              {{ s.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { dialogState as s } from '@/utils/dialog';

const okRef = ref<HTMLButtonElement | null>(null);
const icon = computed(() => (
  s.kind === 'confirm' ? (s.danger ? 'mdi-alert-outline' : 'mdi-help-circle-outline')
  : s.tone === 'error' ? 'mdi-close-circle-outline'
  : s.tone === 'success' ? 'mdi-check-circle-outline'
  : s.tone === 'warning' ? 'mdi-alert-outline' : 'mdi-information-outline'
));

function close(ok: boolean) { s.resolve?.(s.kind === 'confirm' ? ok : true); }

// Keydown fase CAPTURE + stopPropagation: Esc/Enter milik dialog ini, bukan modal di bawahnya.
function onKey(e: KeyboardEvent) {
  if (!s.open) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); }
  else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); close(true); }
}
watch(() => s.open, async (open) => {
  if (open) { document.addEventListener('keydown', onKey, true); await nextTick(); okRef.value?.focus(); }
  else document.removeEventListener('keydown', onKey, true);
});
onBeforeUnmount(() => document.removeEventListener('keydown', onKey, true));
</script>

<style scoped>
.ad-overlay { position: fixed; inset: 0; z-index: 100000; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; padding: 16px; }
.ad-box { width: min(440px, 100%); background: var(--dm-surface, #fff); border-radius: 14px; overflow: hidden; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.3); }
.ad-header { display: flex; align-items: center; gap: 12px; padding: 14px 16px; color: #fff; background: linear-gradient(135deg, #2e5396, #4472c4); }
.ad-header--danger { background: linear-gradient(135deg, #dc2626, #ef4444); }
.ad-icon { width: 34px; height: 34px; border-radius: 8px; background: rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.ad-title { margin: 0; font-size: 14px; font-weight: 700; }
.ad-body { padding: 16px 18px 8px; }
.ad-msg { margin: 0; font-size: 13px; line-height: 1.6; color: var(--dm-text, #1e293b); white-space: pre-line; }
.ad-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 12px 16px 14px; }
.ad-keys { margin-right: auto; font-size: 11px; color: var(--dm-faint, #94a3b8); }
.ad-keys kbd { font-family: inherit; font-size: 10px; padding: 1px 5px; border: 1px solid var(--dm-border, #e2e8f0); border-radius: 4px; background: var(--dm-surface2, #f8fafc); color: var(--dm-text-2, #475569); }
.ad-btn { padding: 7px 16px; border-radius: 8px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: background .15s, box-shadow .15s; }
.ad-btn--ghost { background: var(--dm-surface, #fff); border-color: var(--dm-border, #e2e8f0); color: var(--dm-text-2, #475569); }
.ad-btn--ghost:hover { background: var(--dm-bg, #f1f5f9); }
.ad-btn--primary { background: #2e5396; color: #fff; }
.ad-btn--primary:hover { background: #274781; }
.ad-btn--danger { background: #dc2626; color: #fff; }
.ad-btn--danger:hover { background: #b91c1c; }
.ad-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(68, 114, 196, 0.35); }
.ad-fade-enter-active, .ad-fade-leave-active { transition: opacity .15s ease; }
.ad-fade-enter-active .ad-box, .ad-fade-leave-active .ad-box { transition: transform .18s ease; }
.ad-fade-enter-from, .ad-fade-leave-to { opacity: 0; }
.ad-fade-enter-from .ad-box, .ad-fade-leave-to .ad-box { transform: translateY(8px) scale(.98); }
</style>
