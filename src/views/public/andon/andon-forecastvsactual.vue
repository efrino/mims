<template>
  <v-container fluid id="andon-container" class="fill-height pa-0">
    <!-- HEADER -->
    <v-row align="center" justify="center" class="py-0 ma-0">
      <v-col class="col-3 text-left">
        <v-img :src="require('@/assets/images/MAJ-LOGO-3.png')" style="width: 80%" />
      </v-col>

      <v-col class="col-6 text-center teks font-weight-bold text-uppercase white--text">
        Forecast vs Actual {{ modelTitle }}<br />
        <span class="date" style="font-size: 1.8rem">
          {{ formatMonthYearUpper(tanggal) }}
        </span>
      </v-col>

      <v-col class="col-3 text-right font-weight-bold white--text" style="font-size: 1.2rem">
        <h5 class="tanggal">{{ formatDate(tanggal) }}</h5>
        <h5 class="digital">{{ waktu }}</h5>
      </v-col>
    </v-row>

    <!-- LOADING -->
    <v-row v-if="faIsLoading" justify="center" align="center" class="mt-16 flex-grow-1">
      <v-progress-circular indeterminate color="white" size="64"></v-progress-circular>
    </v-row>

    <!-- CHART -->
    <v-row v-else class="mt-2">
      <v-col cols="12" class="pa-2">
        <highcharts :options="chartOptions" :highcharts="Highcharts" />
      </v-col>
    </v-row>

    <!-- TABLE -->
    <div
      v-if="categoriesCount"
      class="fc-table"
      :style="{ marginLeft: tableOffset + 'px', width: tableWidth + 'px' }"
    >
      <div
        v-for="(row, rIdx) in tableRowsDynamic"
        :key="`${row.name}-${row.type || 'na'}-${rIdx}`"
        class="fc-row"
        :style="{ gridTemplateColumns: fcGridCols }"
      >
        <div :class="nameCellClass(row)">
          <!-- avatar: bar/line -->
          <template v-if="row.type === 'barchart'">
            <span class="swatch-box" :style="{ '--fill': row.color || '#999' }"></span>
          </template>
          <template v-else-if="row.type === 'spline'">
            <span class="swatch-dash" :style="{ '--fill': row.color || '#8BC34A' }"></span>
            <span class="swatch-dash" :style="{ '--fill': row.color || '#8BC34A' }"></span>
          </template>
          <!-- DN / % tanpa swatch -->
          {{ row.name }}
        </div>

        <div v-for="(v, i) in row.data" :key="row.name + '-' + i" class="fc-cell">
          <template v-if="row.isPercent">
            {{ ((v || 0) * 100).toFixed(0) }}%
          </template>
          <template v-else>
            {{ formatNum(v) }}
          </template>
        </div>
      </div>
    </div>
  </v-container>
</template>

<script>
import Highcharts from '@/plugins/highcharts';
import { mapActions, mapState } from 'pinia';
import { useNotificationStore } from '@/pinia/notification';
import { useReportStockStore } from '@/pinia/admin/production/stamping/reportStock.js';
import moment from 'moment';

moment.locale('id');

Highcharts.setOptions({ exporting: { enabled: false } });

export default {
  name: 'AndonForecastvsActual',

  data() {
    return {
      Highcharts,
      waktu: moment().format('HH:mm:ss'),
      tanggal: moment().format('YYYY-MM-DD'),
      clockTimer: null,
      chartOptions: {},
      firstColW: 110,
      colWidth: 32,
      tableOffset: 0,
      tableWidth: 0,
    };
  },

  computed: {
    ...mapState(useReportStockStore, [
      'faDays',
      'faSeries',
      'faModelKey',
      'faIsLoading',
      'barSeries',
      'lineSeries',
      'tableOnlySeries',
    ]),
    ...mapState(useNotificationStore, ['isLoading']),

    modelTitle() {
      const raw = this.faModelKey || (this.$route.params.model || 'DN-HMMI');
      // DN_HMMI / DN-HMMI -> "DN HMMI"
      return String(raw).replace(/[_-]/g, ' ');
    },

    categoriesCount() {
      return this.faDays.length;
    },

    // Index last actual pakai CUMM DN bila ada; fallback 0
    lastActualIndex() {
      const cummDN = this.getSeriesData('CUMM DN');
      if (cummDN.length) {
        let idx = -1;
        for (let i = 0; i < cummDN.length; i++) if ((+cummDN[i] || 0) > 0) idx = i;
        return Math.max(idx, 0);
      }
      return 0;
    },

    // Susun baris tabel:
    tableRowsDynamic() {
      const rows = [];
      const pushUnique = (r) => {
        if (!rows.some((x) => x.name === r.name && (x.type || '') === (r.type || ''))) {
          rows.push(r);
        }
      };

      this.barSeries.forEach((s) => {
        pushUnique({ name: s.name, type: 'barchart', color: s.color, data: s.data });
      });

      const specials = ['DN', 'SAP', 'KAP', 'TMMIN'];
      specials.forEach((name) => {
        const s = this.getSeries(name);
        if (!s) return;
        if (name === 'DN' && this.faModelKey === 'DN_MITSHUBISHI') return; // nanti dipromote ke atas
        pushUnique({ name, type: s.type || 'tableOnly', color: s.color, data: s.data });
      });

      ['CUMM DO', 'CUMM DN'].forEach((name) => {
        const s = this.getSeries(name);
        if (s) pushUnique({ name, type: 'spline', color: s.color, data: s.data });
      });

      const pct = this.getSeries('%');
      if (pct) pushUnique({ name: '%', type: 'tableOnly', data: pct.data, isPercent: true });

      if (this.faModelKey === 'DN_MITSHUBISHI') {
        const s = this.getSeries('DN');
        if (s) rows.unshift({ name: 'DN', type: s.type || 'tableOnly', color: s.color, data: s.data });
      }

      return rows;
    },

    // Grid kolom untuk tabel
    fcGridCols() {
      const cols = [this.firstColW + 'px'];
      for (let i = 0; i < this.categoriesCount; i++) cols.push(this.colWidth + 'px');
      return cols.join(' ');
    },
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

    // helper akses series
    getSeries(name) {
      return this.faSeries.find((s) => s.name === name);
    },
    getSeriesData(name) {
      return this.getSeries(name)?.data || [];
    },
    getSeriesColor(name, fallback) {
      return this.getSeries(name)?.color || fallback;
    },

    nameCellClass(row) {
      // baris tanpa avatar → fc-name2 (center)
      const noAvatar = row.type !== 'barchart' && row.type !== 'spline';
      if (noAvatar || row.name === 'DN' || row.name === '%') return 'fc-name2';
      return 'fc-name';
    },

    formatNum(v) {
      const n = Number(v) || 0;
      return new Intl.NumberFormat('id-ID').format(n);
    },

    onChartMeasure(chart) {
      this.colWidth = this.categoriesCount ? chart.plotWidth / this.categoriesCount : 0;
      this.tableWidth = this.firstColW + chart.plotWidth;
      this.tableOffset = chart.plotLeft - this.firstColW;
    },

    formatMonthYearUpper(d) {
      return d ? moment(d).format('MMMM YYYY').toUpperCase() : '';
    },
    formatDate(d) {
      return d ? moment(d).format('DD MMMM YYYY') : '';
    },

    getMonthDateKeys(baseDate) {
      const start = moment(baseDate).startOf('month');
      const end = moment(baseDate).endOf('month');
      const out = [];
      const cur = start.clone();
      while (cur.isSameOrBefore(end, 'day')) {
        out.push(cur.format('YYYY-MM-DD'));
        cur.add(1, 'day');
      }
      return out;
    },

    ChartOptions() {
      const vm = this;
      const Highcharts = this.Highcharts;
      const categories = this.faDays.map(String); // '1'..'31'
      const todayIdx = Math.max(0, Math.min(this.faDays.length - 1, moment(this.tanggal).date() - 1));
      const lastIdx = categories.length - 1;
      const nf = new Intl.NumberFormat('id-ID');
      const fade = (hex, a = 0.35) => Highcharts.color(hex).setOpacity(a).get('rgba');

      // Kolom: warna dari JSON, actual/forecast dibedakan opacity
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

      // Garis: belah actual/forecast
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
          height: 520,
          marginLeft: this.firstColW + 12,
          spacingRight: 8,
          events: {
            load() {
              vm.onChartMeasure(this);
            },
            redraw() {
              vm.onChartMeasure(this);
            },
          },
        },
        title: { text: '' },
        xAxis: {
          categories,
          tickInterval: 1,
          tickmarkPlacement: 'on',
          labels: { style: { color: '#E0E0E3' } },
          lineColor: '#707073',
          plotLines: [
            {
              value: todayIdx + 0.5,
              width: 2,
              color: '#00BCD4',
              dashStyle: 'ShortDot',
              zIndex: 5,
              label: {
                text: 'FORECAST',
                rotation: 0,
                align: 'left',
                x: 8,
                y: 15,
                style: { color: '#9EE7FF', fontSize: '10px', fontWeight: 600 },
              },
            },
            {
              value: todayIdx + 0.5,
              width: 0,
              color: 'transparent',
              zIndex: 5,
              label: {
                text: 'ACTUAL',
                rotation: 0,
                align: 'right',
                x: -8,
                y: 15,
                style: { color: '#9EE7FF', fontSize: '10px', fontWeight: 600 },
              },
            },
          ],
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
          {
            title: { text: '' },
            labels: { style: { color: '#E0E0E3' } },
            gridLineColor: 'rgba(128,128,128,0.25)',
          },
          {
            title: { text: '' },
            opposite: true,
            gridLineWidth: 0,
            labels: { style: { color: '#E0E0E3' } },
            plotLines: [{ color: '#ff3333', dashStyle: 'Dash', value: targetCap, width: 3, zIndex: 3 }],
          },
        ],
        legend: { enabled: false },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter() {
            const pts = this.points || [];
            const idx = pts[0]?.point?.index ?? 0;
            const isForecast = idx > todayIdx;
            const map = {};
            pts.forEach((p) => {
              map[p.series.name] = p;
            });

            let html = `<b>Hari ${this.x} ${isForecast ? '(Forecast)' : '(Actual)'}</b><br/>`;

            vm.barSeries.forEach((s) => {
              const p = map[s.name];
              if (p) html += `<span style="color:${p.color}">●</span> ${s.name}: <b>${nf.format(p.y || 0)}</b><br/>`;
            });

            const dnSeries = vm.getSeries('DN');
            if (dnSeries) {
              html += `<hr style="border:0;border-top:1px solid #555;margin:4px 0" />`;
              html += `DN: <b>${nf.format(dnSeries.data[idx] || 0)}</b><br/>`;
            }

            vm.lineSeries.forEach((s) => {
              const p = map[s.name];
              if (p) html += `<span style="color:${p.color}">●</span> ${s.name}: <b>${nf.format(p.y || 0)}</b><br/>`;
            });

            return html;
          },
        },
        plotOptions: {
          column: {
            stacking: 'normal',
            groupPadding: 0.08,
            pointPadding: 0.05,
            borderWidth: 0.5,
            borderColor: '#fff',
          },
          series: {
            marker: { enabled: false, states: { hover: { enabled: true } } },
          },
          spline: {
            marker: { symbol: 'diamond' },
            shadow: { color: '#000', width: 2, opacity: 1 },
          },
        },
        credits: { enabled: false },
        series: [...columnSeries, ...linePairs],
      };
    },

    async fetchAndBuild() {
      const key = this.$route.params.model || 'DN-HMMI';
      const res = await this.getForecastActual(key, { baseDate: this.tanggal });
      this.chartOptions =
        res && res.status === 'success'
          ? this.ChartOptions()
          : { chart: { backgroundColor: 'transparent' }, title: { text: 'Gagal memuat data' }, series: [] };
    },
  },

  mounted() {
    this.clockTimer = setInterval(() => {
      this.waktu = moment().format('HH:mm:ss');
      this.tanggal = moment().format('YYYY-MM-DD');
    }, 1000);
    this.fetchAndBuild();
  },

  watch: {
    tanggal() {
      if (!this.faIsLoading) this.chartOptions = this.ChartOptions();
    },
    '$route.params.model': {
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
#andon-container {
  background-color: #000;
  color: #fff;
  overflow: hidden;
}

.teks {
  font-size: 2rem;
  line-height: 1.2;
}

.tanggal {
  font-size: 2rem;
  font-family: Poppins;
}

@font-face {
  font-family: Digital;
  src: url('../../../../src/assets/fonts/Digital.ttf');
  font-display: swap;
}

@font-face {
  font-family: Montserrat;
  src: url('/src/assets/fonts/Montserrat/Montserrat-Regular.ttf');
  font-weight: 300;
  font-style: normal;
}

.digital {
  font-family: Digital, monospace;
  font-size: 2.5rem;
}

/* Tabel grid di bawah chart */
.fc-table {
  background: #121212;
  margin: 2px 8px 6px;
  font-size: 10px;
  line-height: 1.1;
  border-radius: 6px;
  overflow-x: visible;
}

.fc-row {
  display: grid;
  border-top: 1px solid #fff;
  border-left: 1px solid #fff;
  border-right: 1px solid #fff;
}

.fc-row:last-child {
  border-bottom: 1px solid #fff;
}

.fc-name,
.fc-name2,
.fc-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 0 6px;
  box-sizing: border-box;
  min-width: 0;
}

.fc-name {
  justify-content: flex-start;
  gap: 6px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: Montserrat;
  font-weight: 800;
}

.fc-name2 {
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: Montserrat;
  font-weight: 800;
}

.fc-cell {
  border-left: 1px solid #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  font-family: Montserrat;
  font-weight: 600;
}

.forecast-cell {
  opacity: 0.7;
}

.swatch-box {
  --fill: #999;
  display: inline-block;
  width: 24px;
  height: 10px;
  background: var(--fill);
  border: 2px solid #bdbdbd;
  box-shadow: inset 0 0 0 1.5px #111;
  border-radius: 2px;
  margin-right: 8px;
  vertical-align: middle;
}

.swatch-dash {
  --fill: #8bc34a;
  display: inline-block;
  width: 18px;
  height: 6px;
  background: var(--fill);
  border-radius: 6px;
  margin-right: 6px;
  vertical-align: middle;
}
</style>

<style>
html,
body {
  margin: 0;
  height: 100%;
  overflow: hidden;
  font-family: Arial, Helvetica, sans-serif;
}
</style>