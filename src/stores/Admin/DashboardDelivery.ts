import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useNotificationStore } from '@/stores/notification';
import { deliveryPlanActualApi } from '@/services/Admin/DashboardDeliveryService';
import type {
  ConvertedDeliveryCustomer,
  ConvertedDeliveryCycle,
  CycleHierarchy,
  DeliveryPlanActualItem,
  DetailsSaleOrder
} from '@/types/Admin/DashboardDelivery';
import { planDeliveryApi } from '@/services/Admin/PlanDeliveryService';

export const useDeliveryPlanActualStore = defineStore('delivery-plan-actual', () => {
  const notificationStore = useNotificationStore();

  const selectedCustomers = ['ADM PLANT 1', 'ADM PLANT 4', 'ADM PLANT 5', 'TMMIN', 'GAYA MOTOR', 'HMMI', 'MMKI', 'MKM'];

  const data = ref<DeliveryPlanActualItem[]>([]);
  const deliveryCycles = ref<CycleHierarchy>({});
  const convertedDeliveryCycles = ref<ConvertedDeliveryCustomer[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const getData = computed(() => data.value);
  const getLoading = computed(() => loading.value);
  const getError = computed(() => error.value);

  const getCustomers = computed(() => {
    const customers = data.value.map((item) => item.customer);
    return [...new Set(customers)].sort();
  });

  const getTotalPlan = computed(() => {
    return data.value.reduce((sum, item) => sum + (Number(item.plan) || 0), 0);
  });

  const getTotalActual = computed(() => {
    return data.value.reduce((sum, item) => sum + (Number(item.actual) || 0), 0);
  });

  const getAchievementPercentage = computed(() => {
    if (getTotalPlan.value === 0) return 0;
    return Number(((getTotalActual.value / getTotalPlan.value) * 100).toFixed(1));
  });

  const getCustomerSummary = (customerName: string) => {
    const customerData = data.value.filter((item) => item.customer === customerName);
    const plan = customerData.reduce((sum, item) => sum + (Number(item.plan) || 0), 0);
    const actual = customerData.reduce((sum, item) => sum + (Number(item.actual) || 0), 0);
    const pct = plan === 0 ? (actual > 0 ? 100 : 0) : Number(((actual / plan) * 100).toFixed(1));

    return { plan, actual, pct };
  };

  const getAggregatedSummary = (customerNames: string[]) => {
    const filteredData = data.value.filter((item) => customerNames.includes(item.customer));
    const plan = filteredData.reduce((sum, item) => sum + (Number(item.plan) || 0), 0);
    const actual = filteredData.reduce((sum, item) => sum + (Number(item.actual) || 0), 0);
    const pct = plan === 0 ? (actual > 0 ? 100 : 0) : Number(((actual / plan) * 100).toFixed(1));

    return { plan, actual, pct };
  };

  const getDataByDate = (date: string) => {
    return data.value.filter((item) => item.date === date);
  };

  const fetchDeliveryPlanActual = async (): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const response = await deliveryPlanActualApi.fetchDeliveryPlanActual();

      if (response && Array.isArray(response)) {
        data.value = response;
        console.log('Data fetched successfully:', data.value.length, 'items');
      } else {
        throw new Error('Data tidak valid');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data delivery plan actual';
      error.value = errorMessage;
      notificationStore.showAlertError(errorMessage);
      console.error('fetchDeliveryPlanActual error:', err);
    } finally {
      loading.value = false;
    }
  };

  async function fetchDeliveryCycles() {
    loading.value = true;
    error.value = null;

    try {
      const response: CycleHierarchy = await deliveryPlanActualApi.getDeliveryCycles();

      deliveryCycles.value = response;
      convertedDeliveryCycles.value = convertDeliveryData(response);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Terjadi kesalahan';
      console.error('fetchDeliveryCycles error:', err);
    } finally {
      loading.value = false;
    }
  }

  function generateHours(): string[] {
    const result: string[] = [];

    for (let h = 7; h <= 23; h++) {
      result.push(`${String(h).padStart(2, '0')}:00`);
    }

    for (let h = 0; h <= 6; h++) {
      result.push(`${String(h).padStart(2, '0')}:00`);
    }

    return result;
  }

  function convertDeliveryData(data: Record<string, any[]>): ConvertedDeliveryCustomer[] {
    const hourlyTemplate = generateHours();

    return Object.entries(data)
      .filter(([customer]) => selectedCustomers.includes(customer))

      .map(([customer, rows]) => {
        const grouped = rows.reduce(
          (acc, row) => {
            const hour = row.ETD.substring(0, 2);

            if (!acc[hour]) {
              acc[hour] = {
                firstTime: row.ETD.substring(0, 5),
                p: 0,
                ad: 0,
                i: 0,
                details: new Map<string, DetailsSaleOrder>()
              };
            }

            acc[hour].p += Number(row.PLAN || 0);
            acc[hour].ad += Number(row.ACT || 0);

            // total item berdasarkan jumlah detail
            acc[hour].i += row.details?.length ?? 0;

            const details = row.details ?? [];

            details.forEach((detail: any) => {
              const key = detail.VBELN; // atau detail.BSTNK

              if (!acc[hour].details.has(key)) {
                acc[hour].details.set(key, {
                  vdatu: detail.VDATU,
                  vbeln: detail.VBELN,
                  bstnk: detail.BSTNK,
                  etd: detail.ETD,
                  eta: detail.ETA,
                  plan: detail.PLAN,
                  act: detail.ACT,
                  items: []
                });
              }

              const delivery = acc[hour].details.get(key)!;

              delivery.itemCount++;
              delivery.items.push(detail);
            });

            return acc;
          },
          {} as Record<
            string,
            {
              firstTime: string;
              p: number;
              ad: number;
              i: number;
              details: Map<string, DetailsSaleOrder>;
            }
          >
        );

        const slots: ConvertedDeliveryCycle[] = [];
        let cycle = 1;

        hourlyTemplate.forEach((hourSlot) => {
          const hour = hourSlot.substring(0, 2);

          if (grouped[hour]) {
            slots.push({
              time: grouped[hour].firstTime,
              c: cycle++,
              p: grouped[hour].p,
              ad: grouped[hour].ad,
              i: grouped[hour].i,
              details: [...grouped[hour].details.values()]
            });
          } else {
            slots.push({
              time: hourSlot,
              c: null,
              p: null,
              ad: null,
              i: null,
              details: []
            });
          }
        });

        return {
          name: customer,
          slots
        };
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: 'base'
        })
      );
  }

  const resetData = (): void => {
    data.value = [];
    error.value = null;
  };

  return {
    data,
    loading,
    error,

    getData,
    getLoading,
    getError,
    getCustomers,
    getTotalPlan,
    getTotalActual,
    getAchievementPercentage,
    deliveryCycles,
    convertedDeliveryCycles,
    getCustomerSummary,
    getAggregatedSummary,
    getDataByDate,
    fetchDeliveryPlanActual,
    fetchDeliveryCycles,
    resetData
  };
});
