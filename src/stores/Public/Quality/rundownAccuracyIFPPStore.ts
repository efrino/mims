import { defineStore } from 'pinia';
import { ref } from 'vue';
import { RundownAccuracyIFPPService } from '@/services/Public/Quality/rundownAccuracyIFPPService';
import type { RundownAccuracyIFPPItem, RundownAccuracyIFPPDetailItem } from '@/types/Public/Quality/rundownAccuracyIFPP';
import type { RundownAccuracyIFPPType } from '@/services/Public/Quality/rundownAccuracyIFPPService';

function createRundownAccuracyIFPPStore(storeId: string, type: RundownAccuracyIFPPType) {
  const rundownAccuracyIFPPService = new RundownAccuracyIFPPService(type);

  return defineStore(storeId, () => {
    const data = ref<RundownAccuracyIFPPItem[]>([]);
    const total = ref<RundownAccuracyIFPPItem>({} as RundownAccuracyIFPPItem);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const detailItems = ref<RundownAccuracyIFPPDetailItem[]>([]);
    const detailLoading = ref(false);
    const detailError = ref<string | null>(null);

    async function fetchRundownAccuracy() {
      loading.value = true;
      error.value = null;

      try {
        const response = await rundownAccuracyIFPPService.getRundownAccuracy();

        data.value = response ?? [];

        const totalRow: RundownAccuracyIFPPItem = data.value.reduce((acc, item) => {
          (Object.keys(item) as (keyof RundownAccuracyIFPPItem)[]).forEach((key) => {
            if (key === 'shift' || key === 'cycle_delv') return;

            const value = Number(item[key]);

            if (!Number.isNaN(value)) {
              const current = Number(acc[key] ?? 0);
              (acc as Record<string, any>)[key] = current + value;
            }
          });

          return acc;
        }, {} as RundownAccuracyIFPPItem);

        totalRow.customer = 'TOTAL';
        totalRow.model = '';
        totalRow.project_detail = null;
        totalRow.shift = '-';
        totalRow.cycle_delv = '-';

        total.value = totalRow;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Terjadi kesalahan';
        console.error('fetchRundownAccuracy (IFPP) error:', err);
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
        const response = await rundownAccuracyIFPPService.getAccuracyDetail(
          customer,
          model,
          projectDetail,
          category,
        );

        detailItems.value = response ?? [];
      } catch (err) {
        detailError.value = err instanceof Error ? err.message : 'Terjadi kesalahan';
        detailItems.value = [];
        console.error('fetchAccuracyDetail (IFPP) error:', err);
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
}

export const useRundownAccuracyIFPPInhouseStore = createRundownAccuracyIFPPStore(
  'rundown-accuracy-ifpp-inhouse',
  'inhouse',
);

export const useRundownAccuracyIFPPOuthouseStore = createRundownAccuracyIFPPStore(
  'rundown-accuracy-ifpp-outhouse',
  'outhouse',
);
