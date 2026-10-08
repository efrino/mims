import { defineStore } from 'pinia';
import { ref } from 'vue';
import { planDeliveryApi } from '@/services/Admin/PlanDeliveryService';
import type {
  PlanDeliveryItem,
  PlanDeliveryResponse
} from '@/types/Admin/PlanDelivery';

export const usePlanDeliveryStore = defineStore('plan-delivery', () => {
  const mdfo = ref<PlanDeliveryItem[]>([]);
  const salesOrder = ref<PlanDeliveryItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchDetailPcsDaily() {
    loading.value = true;
    error.value = null;

    try {
      const response: PlanDeliveryResponse = await planDeliveryApi.getDetailPcsDaily();

      mdfo.value = response.mdfo ?? [];
      salesOrder.value = response.sales_order ?? [];
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Terjadi kesalahan';
      console.error('fetchDetailPcsDaily error:', err);
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    mdfo.value = [];
    salesOrder.value = [];
    loading.value = false;
    error.value = null;
  }

  return {
    mdfo,
    salesOrder,
    loading,
    error,
    fetchDetailPcsDaily,
    reset
  };
});