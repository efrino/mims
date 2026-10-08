<template>
  <div class="chart-wrapper">
    <highcharts :options="chartOptions" :highcharts="Highcharts" />
  </div>
</template>

<script>
import Highcharts from '@/plugins/highcharts';
import { mapState, mapActions } from 'pinia';
import { useReportStockStore } from '@/pinia/admin/production/stamping/reportStock.js';
import moment from 'moment';

moment.locale('id');
Highcharts.setOptions({ exporting: { enabled: false } });

export default {
  name: 'ForecastActualChart',

  props: {
    tanggal: {
      type: String,
      default: () => moment().format('YYYY-MM-DD'),
    },
    modelKey: {
      type: String,
      default: 'DN-HMMI',
    },
    height: {
      type: Number,
      default: 420,
    }
  },

  data() {
    return {
      Highcharts,
      chartOptions: {},
      firstColW: 110,
      colWidth: 32,
    };
  },

  computed: {
    ...mapState(useReportStockStore, [
      'faDays',
      'barSeries',
      'lineSeries',
      'faSeries',
      'faIsLoading'
    ]),
  },

  methods: {
    ...mapActions(useReportStockStore, ['getForecastActual']),

    _computeTargetCap(categories) {
      const cdo = this.getSeriesData('CUMM DO');
      if (cdo.length) return Math.max(...cdo);

      if (this.lineSeries.length) {
        const firstLine = this.lineSeries[0].data.filter((n) => Number.isFinite(+n));
        if (firstLine.length) return Math.max(...firstLine);
      }

      if (this.barSeries.length) {
        const sums = categories.map((_, i) =>
          this.barSeries.reduce((t, s) => t + (+s.data[i] || 0), 0),
        );
        return Math.max(...sums, 0);
      }

      return 0;
    },

    getSeries(name) {
      return this.faSeries.find((s) => s.name === name);
    },
    getSeriesData(name) {
      return this.getSeries(name)?.data || [];
    },

    ChartOptions() {
      const vm = this;
      const Highcharts = this.Highcharts;
      const categories = this.faDays.map(String);
      const todayIdx = Math.max(0, Math.min(this.faDays.length - 1, moment(this.tanggal).date() - 1));
      const lastIdx = categories.length - 1;
      const nf = new Intl.NumberFormat('id-ID');
      const fade = (hex, a = 0.35) => Highcharts.color(hex).setOpacity(a).get('rgba');

      const columnSeries = this.barSeries.map((s) => {
        const solid = s.color || '#999';
        return {
          type: 'column',
          name: s.name,
          data: s.data.map((y, i) => ({
            y,
            color: i <= todayIdx ? solid : fade(solid),
          })),
        };
      });

      const splitAF = (arr) => ({
        actual: arr.map((v, i) => (i <= todayIdx ? v : null)),
        forecast: arr.map((v, i) => (i >= todayIdx ? v : null)),
      });

      const linePairs = this.lineSeries
        .map((s) => {
          const color = s.color || '#8FD441';
          const parts = splitAF(s.data);
          return [
            { type: 'spline', name: s.name, yAxis: 1, data: parts.actual, color, lineWidth: 2.5, zIndex: 3 },
            {
              type: 'spline',
              linkedTo: ':previous',
              showInLegend: false,
              yAxis: 1,
              data: parts.forecast,
              color,
              dashStyle: 'LongDash',
              lineWidth: 2.5,
              zIndex: 3,
            },
          ];
        })
        .flat();

      const targetCap = this._computeTargetCap(categories);

      return {
        chart: {
          backgroundColor: 'transparent',
          height: this.height,
        },
        title: { text: '' },
        xAxis: {
          categories,
          tickInterval: 1,
          tickmarkPlacement: 'on',
          labels: { style: { color: '#E0E0E3' } },
          lineColor: '#707073',
          plotBands: [
            {
              from: todayIdx + 0.5,
              to: lastIdx + 0.5,
              color: 'rgba(0,188,212,0.06)',
              zIndex: 0,
            },
          ],
        },
        yAxis: [
          { title: { text: '' }, gridLineColor: 'rgba(128,128,128,0.25)' },
          { title: { text: '' }, opposite: true, gridLineWidth: 0, plotLines: [{ color: '#ff3333', dashStyle: 'Dash', value: targetCap, width: 3, zIndex: 3 }] },
        ],
        legend: { enabled: true },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter() {
            const pts = this.points || [];
            const idx = pts[0]?.point?.index ?? 0;
            const isForecast = idx > todayIdx;
            const map = {};
            pts.forEach((p) => { map[p.series.name] = p; });

            let html = `<b>Hari ${this.x} ${isForecast ? '(Forecast)' : '(Actual)'}</b><br/>`;
            vm.barSeries.forEach((s) => {
              const p = map[s.name];
              if (p) html += `<span style="color:${p.color}">●</span> ${s.name}: <b>${nf.format(p.y || 0)}</b><br/>`;
            });
            vm.lineSeries.forEach((s) => {
              const p = map[s.name];
              if (p) html += `<span style="color:${p.color}">●</span> ${s.name}: <b>${nf.format(p.y || 0)}</b><br/>`;
            });
            return html;
          },
        },
        plotOptions: {
          column: { stacking: 'normal', groupPadding: 0.08, pointPadding: 0.05, borderWidth: 0.5, borderColor: '#fff' },
          spline: { marker: { symbol: 'diamond' } },
        },
        credits: { enabled: false },
        series: [...columnSeries, ...linePairs],
      };
    },

    async fetchAndBuild() {
      const res = await this.getForecastActual(this.modelKey, { baseDate: this.tanggal });
      this.chartOptions =
        res && res.status === 'success'
          ? this.ChartOptions()
          : { chart: { backgroundColor: 'transparent' }, title: { text: 'Gagal memuat data' }, series: [] };
    },
  },

  mounted() {
    this.fetchAndBuild();
  },

  watch: {
    tanggal() {
      if (!this.faIsLoading) this.chartOptions = this.ChartOptions();
    },
    modelKey: {
      immediate: false,
      async handler() {
        await this.fetchAndBuild();
      },
    },
    faSeries: {
      deep: true,
      handler() {
        this.chartOptions = this.ChartOptions();
      },
    },
  },
};
</script>

<style scoped>
.chart-wrapper {
  width: 100%;
  height: 100%;
}
</style>
