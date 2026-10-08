// stores/ifpwStockStore.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { IfpwStockItem, IfpwStockSummary, IfpwStockFilters } from '@/types/Public/Welding/ifpwStock'
import { computeStockStatus, computeStockPct } from '@/types/Public/Welding/ifpwStock'
import { fetchIfpwStock, updateIfpwStock } from '@/services/Public/Welding/ifpwStockService'
import type { UpdateStockPayload } from '@/services/Public/Welding/ifpwStockService'

export const useIfpwStockStore = defineStore('ifpwStock', () => {
    const items = ref<IfpwStockItem[]>([])
    const summary = ref<IfpwStockSummary>({
        total_parts: 0, total_stock: 0,
        critical_count: 0, low_count: 0, normal_count: 0, overstock_count: 0,
        last_updated: null,
    })
    const meta = ref({ total: 0, page: 1, per_page: 50, pages: 1 })
    const filters = ref<IfpwStockFilters>({ page: 1, per_page: 50 })

    const loading = ref(false)
    const loadingUpdate = ref(false)
    const error = ref<string | null>(null)
    const actionMessage = ref<string | null>(null)
    const actionSuccess = ref<boolean | null>(null)

    // Getters
    const criticalItems = computed(() => items.value.filter(i => i.status === 'CRITICAL'))
    const lowItems = computed(() => items.value.filter(i => i.status === 'LOW'))
    const hasCritical = computed(() => summary.value.critical_count > 0)

    async function loadStock(overrideFilters?: IfpwStockFilters) {
        if (overrideFilters) filters.value = { ...filters.value, ...overrideFilters }
        loading.value = true
        error.value = null
        try {
            const res = await fetchIfpwStock(filters.value)
            // Enrich dengan computed fields
            items.value = res.data.map(item => ({
                ...item,
                stock: Number(item.stock),
                min: item.min !== null ? Number(item.min) : null,
                max: item.max !== null ? Number(item.max) : null,
                status: computeStockStatus(Number(item.stock), item.min !== null ? Number(item.min) : null, item.max !== null ? Number(item.max) : null),
                pct: computeStockPct(Number(item.stock), item.max !== null ? Number(item.max) : null),
            }))
            summary.value = res.summary
            meta.value = res.meta
        } catch (e: any) {
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    async function updateStock(payload: UpdateStockPayload) {
        loadingUpdate.value = true
        actionMessage.value = null
        actionSuccess.value = null
        try {
            const res = await updateIfpwStock(payload)
            actionSuccess.value = res.status === 'success'
            actionMessage.value = res.message
            if (res.status === 'success') await loadStock()
        } catch (e: any) {
            actionSuccess.value = false
            actionMessage.value = e.message
        } finally {
            loadingUpdate.value = false
        }
    }

    function setPage(page: number) {
        filters.value = { ...filters.value, page }
    }

    function setFilter(key: keyof IfpwStockFilters, value: any) {
        filters.value = { ...filters.value, [key]: value, page: 1 }
    }

    function clearMessage() {
        actionMessage.value = null
        actionSuccess.value = null
    }

    return {
        items, summary, meta, filters,
        loading, loadingUpdate, error, actionMessage, actionSuccess,
        criticalItems, lowItems, hasCritical,
        loadStock, updateStock, setPage, setFilter, clearMessage,
    }
})