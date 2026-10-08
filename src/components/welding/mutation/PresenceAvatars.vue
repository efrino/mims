<!-- components/welding/mutation/PresenceAvatars.vue
     Tumpukan avatar user yang sedang membuka Mutasi di area ini (useMutasiPresence).
     Klik → daftar lengkap (nama, admin, sejak kapan). Anda selalu paling kiri. -->
<template>
  <div v-if="list.length" ref="rootRef" class="pa">
    <button class="pa-stack" :title="summary" @click="open = !open">
      <span
        v-for="u in shown" :key="u.user"
        class="pa-av" :class="{ 'pa-av--me': u.user === me, 'pa-av--admin': u.is_admin && u.user !== me }"
      >
        {{ initials(u) }}
        <span class="pa-dot"></span>
      </span>
      <span v-if="extra" class="pa-av pa-av--more">+{{ extra }}</span>
      <span class="pa-label">{{ others ? `${others} lainnya aktif` : 'Hanya Anda' }}</span>
    </button>

    <Transition name="pa-pop">
      <div v-if="open" class="pa-menu">
        <div class="pa-menu-title">Sedang membuka {{ area }}</div>
        <div v-for="u in list" :key="u.user" class="pa-row">
          <span class="pa-av pa-av--sm" :class="{ 'pa-av--me': u.user === me, 'pa-av--admin': u.is_admin && u.user !== me }">
            {{ initials(u) }}<span class="pa-dot"></span>
          </span>
          <span class="pa-row-text">
            <span class="pa-name">
              {{ u.user === me ? 'Anda' : (u.fullname || u.user) }}
              <i v-if="u.is_admin" class="mdi mdi-shield-crown pa-admin" title="Administrator"></i>
            </span>
            <span class="pa-since">sejak {{ since(u.since) }}</span>
          </span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { PresenceUser } from '@/composables/useMutasiPresence'

const props = defineProps<{ users: PresenceUser[]; me: string; area: string }>()

const MAX = 4
const open    = ref(false)
const rootRef = ref<HTMLElement | null>(null)

// Anda di depan, sisanya urut paling lama.
const list   = computed(() => [...props.users].sort((a, b) => Number(b.user === props.me) - Number(a.user === props.me)))
const shown  = computed(() => list.value.slice(0, MAX))
const extra  = computed(() => Math.max(0, list.value.length - MAX))
const others = computed(() => list.value.filter(u => u.user !== props.me).length)
const summary = computed(() => list.value.map(u => (u.user === props.me ? 'Anda' : (u.fullname || u.user))).join(', '))

function initials(u: PresenceUser) {
  const n = (u.fullname || u.user || '?').trim()
  return n.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

// Jam server = WIB, sama dgn jam user → hitung selisih langsung.
const nowTick = ref(Date.now())
let tick: ReturnType<typeof setInterval> | undefined
function since(s: string) {
  const t = new Date(s.replace(' ', 'T')).getTime()
  const m = Math.max(0, Math.round((nowTick.value - t) / 60000))
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m} mnt`
  return `${Math.floor(m / 60)} jam ${m % 60} mnt`
}

function onOutside(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) open.value = false
}
onMounted(() => {
  document.addEventListener('click', onOutside)
  tick = setInterval(() => { nowTick.value = Date.now() }, 30_000)
})
onUnmounted(() => {
  document.removeEventListener('click', onOutside)
  clearInterval(tick)
})
</script>

<style scoped>
.pa { position: relative; display: inline-flex; }
.pa-stack {
  display: inline-flex; align-items: center; height: 26px; padding: 0 8px 0 4px; gap: 0;
  border: 1px solid var(--dm-border, #e2e8f0); border-radius: 999px; background: var(--dm-surface, #fff); cursor: pointer;
}
.pa-stack:hover { background: var(--dm-surface2, #f8fafc); }
.pa-av {
  position: relative; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center;
  font-size: 8.5px; font-weight: 800; color: #fff; background: #f59e0b; border: 2px solid var(--dm-border, #fff);
  margin-left: -6px; flex-shrink: 0;
}
.pa-av:first-child { margin-left: 0; }
.pa-av--me { background: #3b82f6; }
.pa-av--admin { background: #7c3aed; }
.pa-av--more { background: var(--dm-bg, #e2e8f0); color: var(--dm-text-2, #475569); }
.pa-av--sm { width: 26px; height: 26px; font-size: 10px; margin-left: 0; }
.pa-dot {
  position: absolute; right: -2px; bottom: -2px; width: 7px; height: 7px; border-radius: 50%;
  background: #34d399; border: 1.5px solid var(--dm-border, #fff); animation: pa-pulse 1.6s ease-in-out infinite;
}
@keyframes pa-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, .7); }
  50% { box-shadow: 0 0 0 4px rgba(52, 211, 153, 0); }
}
.pa-label { margin-left: 6px; font-size: 11px; font-weight: 600; color: var(--dm-text-2, #475569); white-space: nowrap; }

.pa-menu {
  position: absolute; right: 0; top: calc(100% + 6px); z-index: 400; min-width: 230px;
  background: var(--dm-surface, #fff); border: 1px solid var(--dm-border, #e2e8f0); border-radius: 10px; padding: 6px;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, .18);
}
.pa-menu-title { font-size: 10.5px; font-weight: 700; color: var(--dm-faint, #94a3b8); text-transform: uppercase; letter-spacing: .4px; padding: 4px 6px 6px; }
.pa-row { display: flex; align-items: center; gap: 8px; padding: 5px 6px; border-radius: 7px; }
.pa-row:hover { background: var(--dm-surface2, #f8fafc); }
.pa-row-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.pa-name { font-size: 12px; font-weight: 600; color: var(--dm-text, #1e293b); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pa-admin { color: #f59e0b; font-size: 12px; }
.pa-since { font-size: 10.5px; color: var(--dm-faint, #94a3b8); }

.pa-pop-enter-active, .pa-pop-leave-active { transition: opacity .15s, transform .15s; }
.pa-pop-enter-from, .pa-pop-leave-to { opacity: 0; transform: translateY(-4px); }

@media (max-width: 1024px) { .pa-label { display: none; } }
@media (prefers-reduced-motion: reduce) { .pa-dot { animation: none; } }
</style>
