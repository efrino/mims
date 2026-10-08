// composables/useMutationSocket.ts
// Realtime sync untuk view Mutasi.
// Listen WELDING_RT_EVENT (lihat utils/weldingRealtime) — dipicu oleh:
//   - Welding_mutasi.php (upload plan, recalc, adjust actual, update initial stock)
//   - Welding_achievement_v2.php (actual tersimpan → mutasi actual reading berubah)
//   - Welding_auto.php (LKH actual adjust → rolling mutasi berubah)
// Debounce 800ms sebelum memanggil callback silentFetch.

import { onMounted, onUnmounted, ref } from 'vue'
import socket from '@/plugins/socket'
import { WELDING_RT_EVENT, isDataEvent } from '@/utils/weldingRealtime'

const DEBOUNCE_MS = 800

// Payload dari Welding_mutasi::refresh_post (2026-09-17): sumber refresh supaya UI
// bisa menampilkan "diperbarui otomatis oleh cron" — field lain opsional/lama.
export interface MutasiUpdatePayload {
    area?: string
    year?: number
    month?: number
    source?: 'cron' | 'manual'
    by?: string
    elapsed_s?: number
    restored?: number
    at?: string
}

export function useMutationSocket(onUpdate?: (payload?: MutasiUpdatePayload) => Promise<void>) {
    const connected = ref(socket.connected)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let lastPayload: MutasiUpdatePayload | undefined
    let burstAreas = new Set<string | undefined>()

    function onMutasiUpdate(payload?: MutasiUpdatePayload) {
        if (!onUpdate || !isDataEvent(payload as any)) return
        // simpan payload terakhir yang paling informatif (punya `source`)
        if (payload && (payload.source || !lastPayload)) lastPayload = payload
        burstAreas.add(payload?.area)
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            // Burst berisi >1 area (atau event tanpa area) → kirim tanpa `area`
            // supaya penerima yang memfilter per area tidak melewatkan update-nya.
            const p = burstAreas.size > 1 || burstAreas.has(undefined)
                ? { ...lastPayload, area: undefined }
                : lastPayload
            lastPayload = undefined
            burstAreas = new Set()
            onUpdate(p)
        }, DEBOUNCE_MS)
    }

    function onConnect()    { connected.value = true  }
    function onDisconnect() { connected.value = false }

    onMounted(() => {
        socket.on('connect',                 onConnect)
        socket.on('disconnect',              onDisconnect)
        socket.on(WELDING_RT_EVENT,          onMutasiUpdate)
    })

    onUnmounted(() => {
        if (debounceTimer) clearTimeout(debounceTimer)
        socket.off('connect',                 onConnect)
        socket.off('disconnect',              onDisconnect)
        socket.off(WELDING_RT_EVENT,          onMutasiUpdate)
    })

    return { connected }
}
