<template>
  <div class="w-full px-4 mt-2">
    <div class="flex flex-wrap justify-between items-center mb-2">
      <div class="w-full md:w-1/4 mb-4 md:mb-0">
        <h2 class="text-2xl font-bold text-gray-900">Graphic Achievement</h2>
      </div>

      <div class="w-full md:w-auto flex items-center justify-between md:justify-end gap-6 mb-3 md:mb-0">
        <div class="flex justify-center">
          <h3 class="text-lg lg:text-xl font-semibold text-gray-700 whitespace-nowrap">{{ dateRangeText }}</h3>
        </div>
        <div class="flex justify-end">
          <div class="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              v-for="t in tabs"
              :key="t"
              @click="switchTab(t)"
              :class="[
                'px-4 py-1 text-sm rounded-lg transition-colors',
                tab === t ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'
              ]"
            >
              {{ t }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-end mb-8">
      <div class="flex space-x-1 bg-gray-100 rounded-lg p-1">
        <button
          v-for="p in periods"
          :key="p.value"
          @click="switchPeriod(p.value)"
          :title="p.hint"
          :class="[
            'px-3 py-1 text-xs rounded-lg transition-colors',
            period === p.value ? 'bg-white text-blue-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-200'
          ]"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center items-center py-20">
      <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
    </div>

    <div v-else-if="error" class="flex justify-center py-20">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-md">
        <p class="text-red-600 mb-3">{{ error }}</p>
        <button @click="manualRefresh" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
          Coba Lagi
        </button>
      </div>
    </div>

    <div v-else-if="getItems.length === 0" class="flex justify-center py-20">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p class="text-yellow-700">Tidak ada data untuk ditampilkan</p>
      </div>
    </div>

    <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-6 -mt-6">
      <div
        v-for="(item, i) in getItems"
        :key="i"
        class="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105"
      >
        <div class="px-4 pt-4 border-b border-gray-100">
          <h4 class="text-lg font-semibold text-gray-800"><span v-if="tab === 'Stamping'">Line </span>{{ item.line }}</h4>
          <div class="text-3xl font-bold text-blue-600 mt-2">{{ calculatePercentage(item.plan, item.actual) }}%</div>

          <AchievementProductionChart :lineId="item.line" :tab="tab" :period="period" />
        </div>

        <div class="px-4 pb-4">
          <div class="grid grid-cols-3 gap-2">
            <div class="text-center">
              <div class="inline-flex items-center justify-center w-full">
                <div class="border border-blue-600 rounded-full px-2 py-1 inline-flex items-center gap-1">
                  <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <span class="text-xs text-gray-600">Plan</span>
                </div>
              </div>
              <div class="mt-2 font-semibold text-gray-900">
                {{ formatNumber(item.plan) }}
              </div>
            </div>

            <div class="text-center">
              <div class="inline-flex items-center justify-center w-full">
                <div class="border border-green-600 rounded-full px-2 py-1 inline-flex items-center gap-1">
                  <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-xs text-gray-600">Act</span>
                </div>
              </div>
              <div class="mt-2 font-semibold text-gray-900">
                {{ formatNumber(item.actual) }}
              </div>
            </div>

            <div class="text-center">
              <div class="inline-flex items-center justify-center w-full" :class="getDiffBorderColor(item)">
                <div class="border rounded-full px-2 py-1 inline-flex items-center gap-1" :class="getDiffBorderClass(item)">
                  <svg class="w-4 h-4" :class="getDiffIconColor(item)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-xs text-gray-600">Diff</span>
                </div>
              </div>
              <div class="mt-2 font-semibold" :class="getDiffTextClass(item)">
                {{ formatNumber(calculateDiff(item.plan, item.actual)) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useReportStockStore } from '@/stores/Admin/GraphicAchievement';
import AchievementProductionChart from '@/views/dashboard/components/chart/AchievementProductionChart.vue';
import type { SummaryLine } from '@/types/Admin/GraphicAchievement';

const reportStore = useReportStockStore();

type Tab = 'Stamping' | 'Welding';
type Period = 'today' | 'week' | 'month';

const tabs: Tab[] = ['Stamping', 'Welding'];
const periods: { value: Period; label: string; hint: string }[] = [
  { value: 'today', label: 'Hari ini', hint: 'Hari ini, per shift' },
  { value: 'week', label: 'Seminggu', hint: '7 hari terakhir' },
  { value: 'month', label: 'Sebulan', hint: '30 hari terakhir' }
];

const tab = ref<Tab>('Stamping');
const period = ref<Period>('today');
// Period currently loaded per process (null = not loaded)
const isDataLoaded = ref<{ stamping: Period | null; welding: Period | null }>({
  stamping: null,
  welding: null
});
let refreshInterval: ReturnType<typeof setInterval> | null = null;

const loading = computed(() => reportStore.loading);
const error = computed(() => reportStore.error);

const dateRangeText = computed(() => {
  const currentData = tab.value === 'Stamping' ? reportStore.dailyAchievPress : reportStore.dailyAchievWeld;
  const listDate = currentData.listDate;
  if (!listDate || listDate.length === 0) return '';
  const start = listDate[0];
  const end = listDate[listDate.length - 1];
  return start === end ? formatDate(start) : `${formatDate(start)} - ${formatDate(end)}`;
});

const getItems = computed((): SummaryLine[] => {
  try {
    if (tab.value === 'Stamping') {
      const items = reportStore.dailyAchievPress.itemsLine;
      console.log('Stamping itemsLine:', items);
      return (
        items?.map((item) => ({
          ...item,
          line: item.line || 'Unknown',
          plan: Number(item.plan) || 0,
          actual: Number(item.actual) || 0
        })).filter((item) => item.plan > 0 || item.actual > 0) || []
      );
    } else {
      const items = reportStore.dailyAchievWeld.itemsLine;
      console.log('Welding itemsLine:', items);
      return (
        items?.map((item) => ({
          ...item,
          line: item.line || 'Unknown',
          plan: Number(item.plan) || 0,
          actual: Number(item.actual) || 0
        })).filter((item) => item.plan > 0 || item.actual > 0) || []
      );
    }
  } catch (err) {
    console.error('Error getting items:', err);
    return [];
  }
});

const calculatePercentage = (plan: number, actual: number): number => {
  if (plan === 0) return actual > 0 ? 100 : 0;
  return Math.round((actual / plan) * 100);
};

const calculateDiff = (plan: number, actual: number): number => {
  return actual - plan;
};

const getDiffBorderClass = (item: SummaryLine): string => {
  const diff = item.actual - item.plan;
  return diff < 0 ? 'border-red-500' : 'border-green-500';
};

const getDiffBorderColor = (item: SummaryLine): string => {
  const diff = item.actual - item.plan;
  return diff < 0 ? 'text-red-500' : 'text-green-500';
};

const getDiffIconColor = (item: SummaryLine): string => {
  const diff = item.actual - item.plan;
  return diff < 0 ? 'text-red-500' : 'text-green-500';
};

const getDiffTextClass = (item: SummaryLine): string => {
  const diff = item.actual - item.plan;
  return diff < 0 ? 'text-red-600' : 'text-green-600';
};

const formatNumber = (value: number): string => {
  const num = Number(value);
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
};

const formatDate = (date: string): string => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const toLocalKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getRange = (p: Period): [string, string] => {
  const endDate = new Date();
  const startDate = new Date();
  if (p === 'week') startDate.setDate(startDate.getDate() - 6);
  else if (p === 'month') startDate.setDate(startDate.getDate() - 29);
  return [toLocalKey(startDate), toLocalKey(endDate)];
};

const loadDataForProcess = async (process: 'press' | 'weld') => {
  const [start, end] = getRange(period.value);
  const line = 'All';
  const cutoff = '';

  await reportStore.fetchReportAchievementRangeDate([start, end], line, process, cutoff);

  if (process === 'press') {
    isDataLoaded.value.stamping = period.value;
  } else {
    isDataLoaded.value.welding = period.value;
  }
};

const loadData = async () => {
  const process = tab.value === 'Stamping' ? 'press' : 'weld';

  const loaded = process === 'press' ? isDataLoaded.value.stamping : isDataLoaded.value.welding;
  if (loaded !== period.value) await loadDataForProcess(process);
};

const resetDataForProcess = (process: 'press' | 'weld') => {
  if (process === 'press') {
    reportStore.resetDailyAchievPress();
    isDataLoaded.value.stamping = null;
  } else {
    reportStore.resetDailyAchievWeld();
    isDataLoaded.value.welding = null;
  }
};

const autoRefresh = async () => {
  console.log('Auto refreshing data...');
  const currentProcess = tab.value === 'Stamping' ? 'press' : 'weld';
  resetDataForProcess(currentProcess);
  await loadDataForProcess(currentProcess);
};

const manualRefresh = async () => {
  const currentProcess = tab.value === 'Stamping' ? 'press' : 'weld';
  resetDataForProcess(currentProcess);
  await loadDataForProcess(currentProcess);
};

const switchTab = async (newTab: Tab) => {
  if (tab.value === newTab) return;
  tab.value = newTab;
  await loadData();
};

const switchPeriod = async (newPeriod: Period) => {
  if (period.value === newPeriod) return;
  period.value = newPeriod;
  await loadData();
};

const startAutoRefresh = () => {
  if (refreshInterval) clearInterval(refreshInterval);

  refreshInterval = setInterval(() => {
    autoRefresh();
  }, 300000);
};

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

onMounted(async () => {
  await loadDataForProcess('press');
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<style scoped>
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

.hover\:scale-105:hover {
  transform: scale(1.05);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
