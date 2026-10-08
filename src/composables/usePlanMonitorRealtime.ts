// composables/usePlanMonitorRealtime.ts
// Realtime refresh untuk Plan Monitor (lama vs v2).
// Socket sebagai trigger utama; adaptive polling sebagai fallback.
// Refresh bersifat SILENT (tidak flicker/jump).

import { onMounted, onUnmounted, ref } from 'vue'
import socket from '@/plugins/socket'

// Interval polling: lebih cepat setelah socket event, lambat saat idle.
const POLL_ACTIVE = 20_000   // 20 s setelah ada event
const POLL_IDLE   = 60_000   // 60 s normal
const DEBOUNCE    = 1_200    // coalesce burst events

// Event yang dipantau
const LISTEN_EVENTS = [
  'updateAcievementWelding',   // achievement lama berubah
  'welding_plan_updated',      // plan v2 berubah (jika server emit)
  'welding_achievement_v2',    // achievement v2 berubah (jika server emit)
]

export interface PlanMonitorRealtimeOptions {
  onRefresh: () => Promise<void>   // callback: reload overview + summary
  onDetailInvalidate?: () => void  // callback: invalidasi cache detail (opsional)
}

export function usePlanMonitorRealtime(opts: PlanMonitorRealtimeOptions) {
  const connected   = ref(socket.connected)
  const lastUpdated = ref<Date | null>(null)
  const pendingRefresh = ref(false)

  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let stopped = false
  let nextInterval = POLL_IDLE

  function scheduleNextPoll() {
    if (stopped || document.hidden) return
    pollTimer = setTimeout(async () => {
      await silentRefresh()
      nextInterval = POLL_IDLE
      scheduleNextPoll()
    }, nextInterval)
  }

  function restartPoll(fast = false) {
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
    nextInterval = fast ? POLL_ACTIVE : POLL_IDLE
    scheduleNextPoll()
  }

  async function silentRefresh() {
    if (stopped) return
    try {
      pendingRefresh.value = true
      await opts.onRefresh()
      opts.onDetailInvalidate?.()
      lastUpdated.value = new Date()
    } finally {
      pendingRefresh.value = false
    }
  }

  function onSocketEvent() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      await silentRefresh()
      restartPoll(true)
    }, DEBOUNCE)
  }

  function onConnect()    { connected.value = true }
  function onDisconnect() { connected.value = false }

  function onVisibility() {
    if (document.hidden) {
      if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
    } else {
      silentRefresh().then(() => restartPoll())
    }
  }

  onMounted(() => {
    socket.on('connect',    onConnect)
    socket.on('disconnect', onDisconnect)
    LISTEN_EVENTS.forEach(e => socket.on(e, onSocketEvent))
    document.addEventListener('visibilitychange', onVisibility)
    scheduleNextPoll()
  })

  onUnmounted(() => {
    stopped = true
    if (pollTimer)    clearTimeout(pollTimer)
    if (debounceTimer) clearTimeout(debounceTimer)
    socket.off('connect',    onConnect)
    socket.off('disconnect', onDisconnect)
    LISTEN_EVENTS.forEach(e => socket.off(e, onSocketEvent))
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return { connected, lastUpdated, pendingRefresh }
}
