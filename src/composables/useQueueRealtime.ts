// ─────────────────────────────────────────────────────────────
// composables/useQueueRealtime.ts
// Realtime stock-queue: socket.io sebagai trigger utama +
// adaptive polling sebagai fallback untuk menangkap transisi
// PENDING → DONE yang dilakukan MySQL Event di server (tidak
// memancarkan socket). Semua refresh bersifat SILENT supaya
// tabel tidak flicker/jump.
// ─────────────────────────────────────────────────────────────

import { onMounted, onUnmounted, ref } from 'vue'
import socket from '@/plugins/socket'
import { WELDING_RT_EVENT, isDataEvent, type WeldingRtPayload } from '@/utils/weldingRealtime'
import { useStockQueueStore } from '@/stores/Public/Welding/stockQueueStore'

// Polling cepat saat ada antrian berjalan, lambat saat idle (hemat beban).
const POLL_BUSY = 8_000
const POLL_IDLE = 45_000
const SOCKET_DEBOUNCE = 800

export function useQueueRealtime() {
    const store = useStockQueueStore()
    const connected = ref(socket.connected)

    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    function scheduleNextPoll() {
        if (stopped || document.hidden) return
        const busy = store.pendingCount > 0 || store.processingCount > 0
        pollTimer = setTimeout(async () => {
            await store.refresh()
            scheduleNextPoll()
        }, busy ? POLL_BUSY : POLL_IDLE)
    }

    function restartPoll() {
        if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
        scheduleNextPoll()
    }

    // Socket → coalesce burst event jadi satu refresh.
    function onAchievementUpdate(p?: WeldingRtPayload) {
        if (!isDataEvent(p)) return
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(async () => {
            await store.refresh()
            restartPoll() // reset cadence berdasarkan state terbaru
        }, SOCKET_DEBOUNCE)
    }

    function onConnect() { connected.value = true }
    function onDisconnect() { connected.value = false }

    // Hemat beban: berhenti polling saat tab disembunyikan, lanjut + refresh saat kembali.
    function onVisibility() {
        if (document.hidden) {
            if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
        } else {
            store.refresh().then(restartPoll)
        }
    }

    onMounted(() => {
        socket.on('connect', onConnect)
        socket.on('disconnect', onDisconnect)
        socket.on(WELDING_RT_EVENT, onAchievementUpdate)
        document.addEventListener('visibilitychange', onVisibility)
        scheduleNextPoll()
    })

    onUnmounted(() => {
        stopped = true
        if (pollTimer) clearTimeout(pollTimer)
        if (debounceTimer) clearTimeout(debounceTimer)
        socket.off('connect', onConnect)
        socket.off('disconnect', onDisconnect)
        socket.off(WELDING_RT_EVENT, onAchievementUpdate)
        document.removeEventListener('visibilitychange', onVisibility)
    })

    return { connected }
}
