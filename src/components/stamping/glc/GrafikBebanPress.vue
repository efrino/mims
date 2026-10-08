<!--
  Grafik GLC Press: batang bertumpuk PRODUKSI + DANDORI + DOWNTIME (jam/hari)
  per line atau per mesin, garis acuan blok jam kerja seperti GLC Simulation
  welding, dan tabel keterangan yang kolomnya lurus dengan batangnya.
  Klik batang → emit `pilih` dengan label batang.
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts'
import type { GlcPressBar } from '@/types/PCD/Stamping/GlcSimulation'

const props = withDefaults(defineProps<{
  data: GlcPressBar[]
  /** label batang yang disorot (line terpilih, atau asal/tujuan pemindahan) */
  sorot?: string[]
  /** tampilkan baris jumlah mesin (grafik per line) */
  denganMesin?: boolean
  tinggi?: number
  bisaKlik?: boolean
}>(), { sorot: () => [], denganMesin: false, tinggi: 380, bisaKlik: false })

const emit = defineEmits<{ (e: 'pilih', label: string): void }>()

const KIRI = 120
const KANAN = 16
const WARNA = { dt: '#d50000', dandori: '#00a2ff', prod: '#005db9' }
const BLOK = [
  { v: 8, c: '#1a237e' }, { v: 11, c: '#f44336' }, { v: 16, c: '#1a237e' },
  { v: 19, c: '#f44336' }, { v: 21, c: '#f44336' },
]

const el = ref<HTMLElement | null>(null)
let chart: Highcharts.Chart | null = null

const f2 = (v: number) => (v ? v.toFixed(2) : '-')
const f0 = (v: number) => (v ? Math.round(v).toLocaleString('id-ID') : '-')

const baris = [
  { k: 'Downtime', c: WARNA.dt, f: (b: GlcPressBar) => f2(b.downtime) },
  { k: 'Dandori', c: WARNA.dandori, f: (b: GlcPressBar) => f2(b.dandori) },
  { k: 'Produksi', c: WARNA.prod, f: (b: GlcPressBar) => f2(b.prod_time) },
  { k: 'TPT (jam)', tebal: true, f: (b: GlcPressBar) => f2(b.tpt) },
  { k: 'Σ Item', f: (b: GlcPressBar) => f0(b.item) },
  { k: 'Pcs/Day', f: (b: GlcPressBar) => f0(b.pcs_day) },
  { k: 'Stroke/Day', f: (b: GlcPressBar) => f0(b.stroke_day) },
  { k: 'UPH', f: (b: GlcPressBar) => f0(b.uph) },
]

const render = () => {
  if (!el.value) return
  const data = props.data
  const idxSorot = data.map((d, i) => (props.sorot.includes(d.label) ? i : -1)).filter(i => i >= 0)
  const maxTpt = Math.max(24, ...data.map(d => d.tpt))

  chart?.destroy()
  chart = Highcharts.chart(el.value, {
    chart: { type: 'column', height: props.tinggi, marginLeft: KIRI, marginRight: KANAN, marginTop: 30 },
    title: { text: '' },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      categories: data.map(d => d.label),
      labels: { style: { fontSize: '12px', fontWeight: 'bold' } },
      plotBands: idxSorot.map(i => ({ from: i - 0.5, to: i + 0.5, color: 'rgba(255, 193, 7, 0.18)' })),
    },
    yAxis: {
      min: 0, max: Math.ceil(maxTpt / 2) * 2, tickInterval: 2, endOnTick: true,
      title: { text: 'TPT / DAY (JAM)', style: { fontWeight: 'bold', color: '#000' } },
      lineWidth: 1.5, lineColor: '#000',
      plotLines: BLOK.map(b => ({
        value: b.v, color: b.c, dashStyle: 'Dash' as const, width: 2, zIndex: 5,
        label: { text: String(b.v), align: 'right' as const, x: -2, style: { color: b.c, fontWeight: 'bold' } },
      })),
      stackLabels: {
        enabled: true,
        style: { fontWeight: 'bold', color: '#333' },
        formatter: function (this: any) { return this.total ? this.total.toFixed(2) : '' },
      },
    },
    tooltip: {
      shared: true,
      valueDecimals: 2,
      valueSuffix: ' jam',
    },
    plotOptions: {
      column: {
        stacking: 'normal', pointPadding: 0.05, groupPadding: 0.08, maxPointWidth: 60,
        cursor: props.bisaKlik ? 'pointer' : undefined,
        point: {
          events: {
            click: function (this: any) { if (props.bisaKlik) emit('pilih', String(this.category)) },
          },
        },
      },
    },
    series: [
      { type: 'column', name: 'Downtime', color: WARNA.dt, data: data.map(d => d.downtime) },
      { type: 'column', name: 'Dandori', color: WARNA.dandori, data: data.map(d => d.dandori) },
      { type: 'column', name: 'Produksi', color: WARNA.prod, data: data.map(d => d.prod_time) },
    ],
  })
}

onMounted(render)
watch(() => [props.data, props.sorot], render, { deep: true })
onBeforeUnmount(() => chart?.destroy())
</script>

<template>
  <div class="grafik">
    <div ref="el" />
    <!-- padding kanan = marginRight chart, supaya kolom lurus dengan batang -->
    <div :style="{ paddingRight: KANAN + 'px' }">
      <table class="ket">
        <tbody>
          <tr v-if="denganMesin">
            <th :style="{ width: KIRI + 'px' }">Jumlah Mesin</th>
            <td v-for="d in data" :key="d.label">{{ d.jumlah_mesin ?? '-' }}</td>
          </tr>
          <tr v-for="b in baris" :key="b.k" :class="{ tebal: b.tebal }">
            <th :style="{ width: KIRI + 'px' }">
              <span v-if="b.c" class="kotak" :style="{ background: b.c }" />{{ b.k }}
            </th>
            <td v-for="d in data" :key="d.label"
                :class="{ sorot: sorot.includes(d.label), over: b.tebal && d.tpt > 21 }">
              {{ b.f(d) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.grafik { width: 100%; overflow-x: auto; }
.ket { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 11.5px; }
.ket th, .ket td { border: 1px solid #e5e7eb; padding: 3px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ket th { text-align: left; font-weight: 600; background: #f8fafc; color: #374151; }
.ket td { text-align: center; }
.ket .tebal td, .ket .tebal th { font-weight: 800; background: #eef2ff; }
.ket td.sorot { background: rgba(255, 193, 7, 0.18); }
.ket td.over { color: #fff; background: #d50000; }
.kotak { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 2px; vertical-align: -1px; }
</style>
