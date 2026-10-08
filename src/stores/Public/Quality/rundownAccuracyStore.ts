import { defineStore } from 'pinia';
import { ref } from 'vue';
import { RundownAccuracyService } from '@/services/Public/Quality/rundownAccuracyService';
import type { RundownAccuracyItem, RundownAccuracyDetailItem } from '@/types/Public/Quality/rundownAccuracy';

const rundownAccuracyService = new RundownAccuracyService();

export const useRundownAccuracyStore = defineStore('rundown-accuracy', () => {
  const data = ref<RundownAccuracyItem[]>([]);
  const total = ref<RundownAccuracyItem>({} as RundownAccuracyItem);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const detailItems = ref<RundownAccuracyDetailItem[]>([]);
  const detailLoading = ref(false);
  const detailError = ref<string | null>(null);

  async function fetchRundownAccuracy() {
    loading.value = true;
    error.value = null;

    try {
      const response = await rundownAccuracyService.getRundownAccuracy();

      data.value = response ?? [];

      const totalRow: RundownAccuracyItem = data.value.reduce((acc, item) => {
        (Object.keys(item) as (keyof RundownAccuracyItem)[]).forEach((key) => {
          if (key === 'shift' || key === 'cycle_delv') return;

          const value = Number(item[key]);

          if (!Number.isNaN(value)) {
            const current = Number(acc[key] ?? 0);
            (acc as Record<string, any>)[key] = current + value;
          }
        });

        return acc;
      }, {} as RundownAccuracyItem);

      totalRow.customer = 'TOTAL';
      totalRow.model = '';
      totalRow.project_detail = null;
      totalRow.shift = '-';
      totalRow.cycle_delv = '-';

      total.value = totalRow;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Terjadi kesalahan';
      console.error('fetchRundownAccuracy error:', err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchAccuracyDetail(
    customer: string,
    model: string,
    projectDetail: string | null,
    category: string,
  ) {
    detailLoading.value = true;
    detailError.value = null;

    try {
      const response = await rundownAccuracyService.getAccuracyDetail(
        customer,
        model,
        projectDetail,
        category,
      );

      detailItems.value = response ?? [];
    } catch (err) {
      detailError.value = err instanceof Error ? err.message : 'Terjadi kesalahan';
      detailItems.value = [];
      console.error('fetchAccuracyDetail error:', err);
    } finally {
      detailLoading.value = false;
    }
  }

  return {
    data,
    total,
    loading,
    error,
    fetchRundownAccuracy,
    detailItems,
    detailLoading,
    detailError,
    fetchAccuracyDetail,
  };
});
