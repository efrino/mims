<template>
  <div class="w-[100%] mx-auto mt-2">
    <apexchart
      :key="period"
      type="line"
      height="250"
      :options="chartOptions"
      :series="chartSeries"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useReportStockStore } from '@/stores/Admin/GraphicAchievement';
import type { DailyDetailDaily } from '@/types/Admin/GraphicAchievement';

const props = defineProps<{
  lineId: string;
  tab: 'Stamping' | 'Welding';
  period?: 'today' | 'week' | 'month';
}>();

const period = computed(() => props.period ?? 'today');

const fmt = (key: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('id-ID', opts);

// "Hari ini" groups by shift, other periods group by date
const bucketOf = (item: DailyDetailDaily): string =>
  period.value === 'today' ? `Shift ${item.shift || 1}` : item.date;

const bucketLabel = (key: string): string => {
  if (period.value === 'today') return key;
  if (period.value === 'month') return fmt(key, { day: '2-digit' });
  return fmt(key, { weekday: 'short' });
};

const bucketTitle = (key: string): string =>
  period.value === 'today' ? key : fmt(key, { weekday: 'long', day: '2-digit', month: 'short' });

const reportStore = useReportStockStore();

const Colors = {
  plan: '#9CA3AF',
  actual: '#06923E',
  minus: '#FF6363',
  over: '#FFA500',
  balance: '#00C49F',
  transparent: 'transparent'
};

const getWeldingLineGroup = (lineId: string): string => {
  // CO2 ROBOT line ids are prefixed "S/A ADM - ", so check it before S/A ADM
  if (lineId.includes('CO2 ROBOT')) return 'CO2 ROBOT';
  if (lineId.includes('S/A ADM')) return 'S/A ADM';
  if (lineId.includes('S/A HMMI') || lineId.includes('HMMI')) return 'S/A HMMI';
  if (lineId.includes('WSS ADM')) return 'WSS ADM';
  if (lineId.includes('WSS MITSUBISHI')) return 'WSS MITSUBISHI';
  return lineId;
};

const getDailyDataGrouped = computed(() => {
  let detailsDaily: DailyDetailDaily[] = [];

  if (props.tab === 'Stamping') {
    detailsDaily = reportStore.dailyAchievPress.details_daily;
  } else {
    detailsDaily = reportStore.dailyAchievWeld.details_daily;
  }

  let filteredData: DailyDetailDaily[] = [];

  if (props.tab === 'Stamping') {
    filteredData = detailsDaily.filter(item => item.line_id === props.lineId);
  } else {
    const weldingGroup = getWeldingLineGroup(props.lineId);
    filteredData = detailsDaily.filter(item => {
      return getWeldingLineGroup(item.line_id) === weldingGroup;
    });
  }

  const grouped: Record<string, { plan: number; actual: number }> = {};

  filteredData.forEach(item => {
    const key = bucketOf(item);
    if (!grouped[key]) {
      grouped[key] = { plan: 0, actual: 0 };
    }
    grouped[key].plan += Number(item.plan) || 0;
    grouped[key].actual += Number(item.actual) || 0;
  });

  return grouped;
});

const dateList = computed(() => {
  const dates = props.tab === 'Stamping'
    ? reportStore.dailyAchievPress.listDate
    : reportStore.dailyAchievWeld.listDate;
  if (period.value !== 'today') return dates;
  const shifts = Object.keys(getDailyDataGrouped.value).sort();
  return shifts.length ? shifts : ['Shift 1'];
});

const chartData = computed(() => {
  const grouped = getDailyDataGrouped.value;
  const dates = dateList.value;

  const categories: string[] = [];
  const planValues: any[] = [];
  const actualValues: any[] = [];

  dates.forEach(date => {
    const data = grouped[date];
    const plan = data?.plan || 0;
    const actual = data?.actual || 0;

    categories.push(date);
    planValues.push({ x: date, y: plan });
    actualValues.push({ x: date, y: actual });
  });

  return { categories, planValues, actualValues, grouped };
});

const getActualColor = (actual: number, plan: number) => {
  if (actual === 0 && plan === 0) return Colors.transparent;
  if (plan === 0) return Colors.actual;
  const pct = (actual / plan) * 100;
  if (pct < 95) return Colors.minus;
  if (pct < 100) return Colors.over;
  return Colors.balance;
};

// Single-day view has only a few shifts: bars read better than a line
const isBar = computed(() => period.value === 'today');

const chartSeries = computed(() => {
  const { planValues, actualValues } = chartData.value;

  return [
    {
      name: 'Plan',
      type: isBar.value ? 'column' : 'area',
      data: planValues
    },
    {
      name: 'Actual',
      type: isBar.value ? 'column' : 'line',
      data: actualValues
    }
  ];
});

const chartOptions = computed(() => {
  const { categories, actualValues, grouped } = chartData.value;
  const markerSize = categories.length > 10 ? 4 : 6;

  return {
    chart: {
      type: 'line',
      toolbar: { show: false },
      animations: { enabled: true, easing: 'easeinout', speed: 450 }
    },

    stroke: {
      curve: 'smooth',
      width: isBar.value ? [0, 0] : [2, 3]
    },

    colors: isBar.value
      ? [
          Colors.plan,
          ({ dataPointIndex }: { dataPointIndex: number }) => {
            const g = grouped[categories[dataPointIndex]];
            return getActualColor(g?.actual || 0, g?.plan || 0);
          }
        ]
      : [Colors.plan, Colors.actual],

    fill: {
      type: ['solid', 'solid'],
      opacity: isBar.value ? [0.35, 1] : [0.15, 1]
    },

    plotOptions: {
      bar: { columnWidth: '55%', borderRadius: 4, borderRadiusApplication: 'end' }
    },

    legend: {
      markers: { fillColors: [Colors.plan, Colors.actual] }
    },

    xaxis: {
      categories,
      labels: {
        formatter: (val: string) => (val ? bucketLabel(val) : ''),
        rotate: 0,
        hideOverlappingLabels: true
      },
      tooltip: { enabled: false }
    },

    yaxis: {
      min: 0,
      labels: {
        formatter: (val: number) =>
          new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(val)
      }
    },

    markers: {
      size: isBar.value ? 0 : [0, markerSize],
      hover: { sizeOffset: 2 },
      discrete: isBar.value ? [] : actualValues.map((d, i) => {
        const date = categories[i];
        const plan = grouped[date]?.plan || 0;
        return {
          seriesIndex: 1,
          dataPointIndex: i,
          fillColor: getActualColor(d.y, plan),
          strokeColor: getActualColor(d.y, plan),
          size: markerSize
        };
      })
    },

    tooltip: {
      custom: ({ dataPointIndex }: any) => {
        const date = categories[dataPointIndex];
        const data = grouped[date];

        const plan = data?.plan || 0;
        const actual = data?.actual || 0;
        const pct = plan > 0 ? ((actual / plan) * 100).toFixed(1) : '0.0';
        const color = getActualColor(actual, plan);

        const statusLabel =
          color === Colors.minus ? 'Below Target'
          : color === Colors.over ? 'Nearly Achieved'
          : color === Colors.balance ? 'Achieved'
          : '-';

        return `
          <div style="padding:10px; min-width:190px; font-size:12px; background:#fff; border:1px solid #e5e7eb; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1)">
            <div style="font-weight:700; margin-bottom:8px; color:#374151">
              ${bucketTitle(date)}
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px">
              <span style="color:#9CA3AF">📋 Plan</span>
              <span style="font-weight:600">${new Intl.NumberFormat('id-ID').format(plan)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px">
              <span style="color:#9CA3AF">✅ Actual</span>
              <span style="font-weight:600">${new Intl.NumberFormat('id-ID').format(actual)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px">
              <span style="color:#9CA3AF">📊 Achievement</span>
              <span style="font-weight:700; color:${color}">${pct}%</span>
            </div>
            <div style="margin-top:6px; padding-top:6px; border-top:1px solid #f3f4f6; text-align:center">
              <span style="font-size:11px; font-weight:600; color:${color}">${statusLabel}</span>
            </div>
          </div>
        `;
      }
    }
  };
});
</script>

<style scoped>
:deep(.apexcharts-tooltip) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

:deep(.apexcharts-tooltip-series-group) {
  background: transparent !important;
  padding: 0 !important;
}

:deep(.apexcharts-legend-marker) {
  margin-right: 4px !important;
}
</style>