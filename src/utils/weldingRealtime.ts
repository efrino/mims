// utils/weldingRealtime.ts
// Satu-satunya channel realtime welding yang DIRELAY socket server (port 4000):
// backend emit 'updateAcievementWelding' → server broadcast 'refreshAcievementWelding'.
// Event lain ('updateMutasiWelding', dst.) DIBUANG server, jadi jangan didengarkan
// (dulu Mutasi/LKH/Queue mendengarkan nama emit → tak pernah menerima apa pun).
// Backend membedakan isi lewat `kind`:
//   'mutasi'   — plan/stok mutasi berubah
//   'achLock'  — lock form Achievement v2 (bukan perubahan data)
//   'presence' — user masuk/keluar halaman Mutasi (bukan perubahan data)
//   (kosong)   — actual Achievement tersimpan
export const WELDING_RT_EVENT = 'refreshAcievementWelding'

export interface WeldingRtPayload {
  kind?: 'mutasi' | 'achLock' | 'presence' | string
  area?: string
  [k: string]: unknown
}

/** true = event berisi perubahan DATA (perlu refresh), bukan lock/presence. */
export const isDataEvent = (p?: WeldingRtPayload | null) =>
  !p || (p.kind !== 'achLock' && p.kind !== 'presence')
