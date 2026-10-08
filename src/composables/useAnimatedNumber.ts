// ─────────────────────────────────────────────────────────────
// composables/useAnimatedNumber.ts
// Animasi hitung naik/turun (ease-out) tiap kali nilai sumber
// berubah — dipakai supaya angka ringkasan terasa "hidup"/live
// saat auto-refresh update datanya, bukan langsung loncat.
// ─────────────────────────────────────────────────────────────

import { ref, watch, onUnmounted, type Ref } from 'vue'

function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t)
}

export function useAnimatedNumber(source: Ref<number>, duration = 700) {
  const display = ref(source.value)
  let raf: number | null = null

  function animateTo(target: number) {
    if (raf) cancelAnimationFrame(raf)
    const start = display.value
    const delta = target - start
    if (delta === 0) return
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / duration)
      display.value = Math.round(start + delta * easeOutQuad(t))
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        display.value = target
        raf = null
      }
    }
    raf = requestAnimationFrame(tick)
  }

  watch(source, (val) => animateTo(val))

  onUnmounted(() => {
    if (raf) cancelAnimationFrame(raf)
  })

  return display
}
