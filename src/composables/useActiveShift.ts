// composables/useActiveShift.ts
// Shift welding yang sedang berjalan (sama dgn LKH): Day 07:15–19:59, sisanya Night.
// Night lewat tengah malam (00:00–07:14) milik tanggal kemarin.
// Satu jam bersama (tick per menit) untuk header & body tabel Mutasi.

import { computed, onUnmounted, ref } from 'vue'

export type ShiftKey = 'day' | 'night'

const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | undefined
let users = 0

const active = computed(() => {
  const n = now.value
  const t = n.getHours() * 60 + n.getMinutes()
  if (t >= 435 && t <= 1199) return { date: n, shift: 'day' as ShiftKey }
  const d = new Date(n)
  if (t < 435) d.setDate(d.getDate() - 1)
  return { date: d, shift: 'night' as ShiftKey }
})

export function useActiveShift() {
  if (users++ === 0) timer = setInterval(() => { now.value = new Date() }, 60_000)
  onUnmounted(() => { if (--users === 0) clearInterval(timer) })

  /** Tanggal `day` (bulan/tahun tabel) = tanggal shift aktif? */
  const isActiveDay = (day: number, year: number, month: number) => {
    const d = active.value.date
    return d.getDate() === day && d.getMonth() + 1 === month && d.getFullYear() === year
  }
  const isActiveShift = (day: number, shift: ShiftKey, year: number, month: number) =>
    active.value.shift === shift && isActiveDay(day, year, month)

  /** Tanggal sudah lewat (sebelum tanggal produksi aktif) → data beku/final. */
  const isPastDay = (day: number, year: number, month: number) => {
    const d = active.value.date
    const ym = year * 100 + month, cur = d.getFullYear() * 100 + d.getMonth() + 1
    return ym < cur || (ym === cur && day < d.getDate())
  }

  return { active, isActiveDay, isActiveShift, isPastDay }
}
