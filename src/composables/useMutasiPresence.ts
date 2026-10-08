// composables/useMutasiPresence.ts
// Siapa yang sedang membuka halaman Mutasi di area yang sama (2026-09-30) —
// seperti badge user aktif di Achievement v2. Heartbeat ke backend tiap 15 dtk
// (entri kedaluwarsa 45 dtk). Key = id per tab, jadi ganti area langsung pindah.
// Tab disembunyikan → tetap ping (user masih "membuka"); tutup tab → leave.
// Realtime: backend menyiarkan kind='presence' saat ada yg masuk/pindah/keluar
// → langsung ping ulang (tak menunggu siklus 15 dtk).

import axios from 'axios'
import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import socket from '@/plugins/socket'
import { WELDING_RT_EVENT, type WeldingRtPayload } from '@/utils/weldingRealtime'

const URL = 'http://192.168.10.67/majsf_rest_api/api/welding_mutasi/presence'
const PING_MS = 15_000

export interface PresenceUser {
  user: string
  fullname: string | null
  is_admin: boolean
  since: string // 'YYYY-MM-DD HH:mm:ss' (jam server)
}

export function useMutasiPresence(areaCode: Ref<string>) {
  const auth     = useAuthStore()
  const clientId = `mt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const users    = ref<PresenceUser[]>([])
  const byArea   = ref<Record<string, number>>({})
  let timer: ReturnType<typeof setInterval> | undefined

  async function ping() {
    if (!areaCode.value) return
    try {
      const res = await axios.post(URL, { client_id: clientId, area_code: areaCode.value, action: 'ping' })
      if (res.data?.success) {
        users.value  = res.data.users ?? []
        byArea.value = res.data.by_area ?? {}
      }
    } catch { /* presence = pelengkap; gagal diam-diam */ }
  }

  // keepalive: request tetap terkirim walau tab sedang ditutup.
  function leave() {
    try {
      fetch(URL, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ client_id: clientId, action: 'leave' }),
      })
    } catch { /* abaikan */ }
  }

  function onRt(p?: WeldingRtPayload) {
    if (p?.kind === 'presence' && p.area === areaCode.value) ping()
  }

  watch(areaCode, () => ping())
  onMounted(() => {
    ping()
    timer = setInterval(ping, PING_MS)
    window.addEventListener('pagehide', leave)
    socket.on(WELDING_RT_EVENT, onRt)
  })
  onUnmounted(() => {
    clearInterval(timer)
    window.removeEventListener('pagehide', leave)
    socket.off(WELDING_RT_EVENT, onRt)
    leave()
  })

  return { users, byArea, me: () => auth.user?.username || '' }
}
