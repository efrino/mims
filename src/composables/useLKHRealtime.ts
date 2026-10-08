// composables/useLKHRealtime.ts
// Socket.IO listener untuk LKH: trigger silent refresh saat Achievement v2 simpan actual.
// Pakai event & pattern yang sama dengan useQueueRealtime (WELDING_RT_EVENT + debounce).

import { onMounted, onUnmounted, ref } from 'vue'
import socket from '@/plugins/socket'
import { WELDING_RT_EVENT, isDataEvent, type WeldingRtPayload } from '@/utils/weldingRealtime'

const DEBOUNCE_MS = 800

export function useLKHRealtime(onUpdate: () => Promise<void>) {
    const connected = ref(socket.connected)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    function onAchUpdate(p?: WeldingRtPayload) {
        if (!isDataEvent(p)) return
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => { onUpdate() }, DEBOUNCE_MS)
    }

    function onConnect()    { connected.value = true  }
    function onDisconnect() { connected.value = false }

    onMounted(() => {
        socket.on('connect',    onConnect)
        socket.on('disconnect', onDisconnect)
        socket.on(WELDING_RT_EVENT, onAchUpdate)
    })

    onUnmounted(() => {
        if (debounceTimer) clearTimeout(debounceTimer)
        socket.off('connect',    onConnect)
        socket.off('disconnect', onDisconnect)
        socket.off(WELDING_RT_EVENT, onAchUpdate)
    })

    return { connected }
}
