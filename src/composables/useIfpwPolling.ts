// composables/useIfpwPolling.ts
import { ref, onMounted, onUnmounted } from 'vue'
import { useIfpwStockStore } from '@/stores/Public/Welding/ifpwStockStore'

export function useIfpwPolling(intervalMs = 30_000) {
    const store = useIfpwStockStore()
    const timer = ref<ReturnType<typeof setInterval> | null>(null)
    const isPolling = ref(false)

    function start() {
        if (timer.value) return
        isPolling.value = true
        timer.value = setInterval(() => store.loadStock(), intervalMs)
    }

    function stop() {
        if (timer.value) { clearInterval(timer.value); timer.value = null }
        isPolling.value = false
    }

    onMounted(start)
    onUnmounted(stop)

    return { isPolling, start, stop }
}