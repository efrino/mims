<template>
  <div class="w-full" ref="wrapperRef">
    <div class="bg-transparent rounded-xl w-full">
      <div
        ref="highchartContainer"
        class="w-full"
        style="height: 400px;"
      ></div>
    </div>

    <div
      v-if="!isLoading && tableRows.length > 0 && colWidths.length > 0"
      class="mt-2 w-full select-none"
      :key="tableKey"
    >
      <!--
        Wrapper scroll: overflow-x-auto SELALU aktif.
        Di layar besar, minWidth = lebar chart (chart.chartWidth) sehingga tabel
        pas dengan grafik dan tidak scroll. Di layar kecil, minWidth dihitung dari
        jumlah kolom × MIN_COLUMN_WIDTH sehingga scroll horizontal aktif.
      -->
      <div
        ref="tableScrollContainer"
        class="w-full overflow-x-auto border border-gray-300 rounded shadow-sm bg-white custom-scrollbar pb-1"
      >
        <div :style="tableContainerStyle" class="overflow-hidden">

          <!-- Legend -->
          <div class="flex items-center justify-center gap-6 py-2 text-xs font-medium text-gray-600 border-b border-gray-100">
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded bg-orange-500"></span>
              <span>MDFO</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded bg-blue-600"></span>
              <span>Sales Order</span>
            </div>
          </div>

          <!-- Header row -->
          <div class="flex bg-gray-50 border-b-2 border-gray-300 w-full">
            <div
              class="flex-shrink-0 flex items-center justify-start h-[26px] px-2 font-bold text-gray-700 border-r border-gray-300 text-xs"
              :style="{ width: leftColW + 'px' }"
            >
              Model
            </div>
            <div class="flex flex-1 min-w-0">
              <div
                v-for="(cat, i) in categories"
                :key="i"
                class="flex items-center justify-center h-[26px] font-bold text-gray-700 text-center border-r border-gray-200 last:border-r-0 overflow-hidden"
                :style="getColumnStyle(i)"
              >
                <span :style="dateLabelStyle">{{ cat }}</span>
              </div>
            </div>
            <div
              class="flex-shrink-0 border-l border-gray-200 bg-gray-50"
              :style="{ width: rightColW + 'px' }"
            ></div>
          </div>

          <!-- Data rows -->
          <div
            v-for="(row, rIdx) in tableRows"
            :key="rIdx"
            class="flex border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors group w-full"
          >
            <div
              class="flex-shrink-0 flex items-center justify-start h-[34px] px-2 gap-1 border-r border-gray-200 text-xs bg-white group-hover:bg-gray-50"
              :style="{ width: leftColW + 'px' }"
            >
              <span
                class="inline-block w-2 h-2 rounded-full flex-shrink-0"
                :style="{ backgroundColor: row.color }"
              ></span>
              <span class="text-gray-800 font-semibold truncate text-[12px]">{{ row.model }}</span>
            </div>

            <div class="flex flex-1 min-w-0">
              <div
                v-for="(_, i) in categories"
                :key="i"
                class="flex flex-col h-[34px] border-r border-gray-200 last:border-r-0 overflow-hidden"
                :style="getColumnStyle(i)"
              >
                <div class="flex-1 flex items-center justify-center text-[11px] text-orange-500 border-b border-gray-200 px-1 font-medium">
                  {{ formatNumber(row.planDaily[i]) }}
                </div>
                <div class="flex-1 flex items-center justify-center text-[11px] text-blue-700 font-semibold px-1">
                  {{ i <= todayIdx ? formatNumber(row.actualDaily[i]) : '-' }}
                </div>
              </div>
            </div>

            <div
              class="flex-shrink-0 border-l border-gray-200 bg-white group-hover:bg-gray-50"
              :style="{ width: rightColW + 'px' }"
            ></div>
          </div>

          <!-- Total row -->
          <div class="flex bg-blue-50/70 w-full">
            <div
              class="flex-shrink-0 flex items-center justify-start h-[36px] px-2 font-bold text-gray-800 text-xs border-r border-gray-200"
              :style="{ width: leftColW + 'px' }"
            >
              TOTAL
            </div>
            <div class="flex flex-1 min-w-0">
              <div
                v-for="(_, i) in categories"
                :key="i"
                class="flex flex-col h-[36px] border-r border-gray-200 last:border-r-0 overflow-hidden"
                :style="getColumnStyle(i)"
              >
                <div class="flex-1 flex items-center justify-center text-[11px] font-bold text-orange-600 border-b border-gray-200 px-1">
                  {{ formatNumber(totalDaily.plan[i]) }}
                </div>
                <div class="flex-1 flex items-center justify-center text-[11px] font-bold text-blue-800 px-1">
                  {{ i <= todayIdx ? formatNumber(totalDaily.actual[i]) : '-' }}
                </div>
              </div>
            </div>
            <div
              class="flex-shrink-0 border-l border-gray-200 bg-blue-50/70"
              :style="{ width: rightColW + 'px' }"
            ></div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick
} from 'vue'

import Highcharts from 'highcharts'
import { usePlanDeliveryStore } from '@/stores/Admin/PlanDelivery'

const props = defineProps({
  model: { type: String, required: true },
  chartData: { type: Array, required: true }
})

const store = usePlanDeliveryStore()

const wrapperRef       = ref(null)
const highchartContainer = ref(null)
const tableScrollContainer = ref(null)
const hcChart          = ref(null)
const tableKey         = ref(0)

const categories  = ref([])
const totalDaily  = ref({ plan: [], actual: [] })
const todayIdx    = new Date().getDate() - 1

// Lebar piksel kolom dari Highcharts — sumber kebenaran kesejajaran
const colWidths  = ref([])
const leftColW   = ref(90)
const rightColW  = ref(65)

// ─── Deteksi layar ───────────────────────────────────────────────────────────
// Ambang batas 1366px mencakup layar 10.9" (1280×800) maupun 11" (1366×768)
const SMALL_BREAKPOINT  = 1366
const MIN_COLUMN_WIDTH  = 38   // lebar minimal kolom saat scroll aktif (px)

const isSmallScreen = ref(false)
let resizeTimeout   = null

const checkScreenSize = () => {
  isSmallScreen.value = window.innerWidth < SMALL_BREAKPOINT
}

// ─── Style container tabel ───────────────────────────────────────────────────
/*
 * Layar besar  : minWidth = chartWidth  →  tabel pas dengan chart, tanpa scroll.
 * Layar kecil  : minWidth = leftColW + rightColW + (n × MIN_COLUMN_WIDTH)
 *                →  tabel lebih lebar dari viewport, scroll aktif.
 *
 * chartWidth di-cache setelah chart selesai di-render agar computed tidak
 * bergantung pada objek Highcharts secara langsung.
 */
const chartPixelWidth = ref(0)

const tableContainerStyle = computed(() => {
  if (isSmallScreen.value) {
    // Scroll mode: lebar tetap berdasarkan jumlah kolom
    const w = leftColW.value + rightColW.value + (categories.value.length * MIN_COLUMN_WIDTH)
    return { minWidth: w + 'px' }
  }
  // Layar besar: ikuti lebar chart persis (sudah termasuk marginLeft+marginRight)
  if (chartPixelWidth.value > 0) {
    return { width: chartPixelWidth.value + 'px' }
  }
  return { width: '100%' }
})

// ─── Style label tanggal header ──────────────────────────────────────────────
/*
 * Ukuran font label tanggal disesuaikan dengan lebar kolom:
 *   layar besar  → ikuti lebar pixel dari Highcharts (bisa 10–11px)
 *   layar kecil  → tetap 9px supaya muat di MIN_COLUMN_WIDTH=38px
 */
const dateLabelStyle = computed(() => {
  if (isSmallScreen.value) {
    return { fontSize: '9px', lineHeight: '1' }
  }
  // Estimasi font size dari lebar kolom chart; clamp 9–11px
  const avgW = colWidths.value.length
    ? colWidths.value.reduce((s, v) => s + v, 0) / colWidths.value.length
    : 0
  const fs = avgW < 18 ? 9 : avgW < 22 ? 10 : 11
  return { fontSize: fs + 'px', lineHeight: '1' }
})

// ─── Style kolom per index ───────────────────────────────────────────────────
/*
 * Layar besar  : flex berbasis bobot piksel dari Highcharts → SEJAJAR dengan grafik.
 * Layar kecil  : fixed MIN_COLUMN_WIDTH → memungkinkan scroll horizontal.
 */
const getColumnStyle = (index) => {
  if (isSmallScreen.value) {
    return {
      width: `${MIN_COLUMN_WIDTH}px`,
      flex: `0 0 ${MIN_COLUMN_WIDTH}px`
    }
  }
  // Gunakan bobot piksel Highcharts sebagai flex-grow agar proporsional
  return {
    flex: `${colWidths.value[index] || 1} 0 0%`
  }
}

// ─── Konstanta & utilitas ────────────────────────────────────────────────────
const MODEL_COLORS = [
  '#1A73E8', '#34A853', '#FBBC05', '#b67590', '#8E44AD',
  '#00BCD4', '#FF9800', '#795548', '#9E9E9E', '#E91E63',
  '#3F51B5', '#009688',
]

const isLoading = computed(() => store.loading)

const formatNumber = (v) =>
  v === null || v === undefined || v === 0
    ? '-'
    : new Intl.NumberFormat('id-ID').format(v)

const CUSTOMER_MAP = {
  ADM_SAP: 'ADM SAP',
  ADM_KAP: 'ADM KAP',
  DN_HMMI: 'HMMI',
  MKM: 'MKM',
  MMKI: 'MMKI',
  TMMIN: 'TMMIN',
}

const getCustomerName = (tabValue) => CUSTOMER_MAP[tabValue] ?? tabValue

const getItemsBySource = (sourceArray, customerName) => {
  let items = sourceArray.filter(
    (d) =>
      d.customer === customerName &&
      d.model !== null &&
      String(d.model).trim() !== '' &&
      d.model !== 'null'
  )
  if (customerName === 'TMMIN') {
    items = items.filter((d) => d.model !== 'SP')
  }
  return items
}

const getDailyArray = (item, lastDay) =>
  Array.from({ length: lastDay }, (_, i) => Number(item[`t${i + 1}`] || 0))

const toCumulative = (dailyArr) => {
  let acc = 0
  return dailyArr.map((v) => { acc += v; return acc })
}

// ─── Sinkronisasi lebar kolom dari Highcharts ────────────────────────────────
/*
 * Membaca posisi piksel setiap kategori dari xAxis Highcharts, lalu
 * menyimpan selisihnya sebagai bobot flex untuk tabel (layar besar)
 * dan sebagai leftColW / rightColW yang sinkron dengan margin chart.
 */
const syncColWidthsFromChart = () => {
  if (!hcChart.value || !categories.value.length) return

  const chart  = hcChart.value
  const axis   = chart.xAxis[0]
  const n      = categories.value.length

  // leftColW & rightColW selalu sinkron dengan margin chart
  leftColW.value  = Math.round(chart.plotLeft)
  rightColW.value = Math.round(chart.chartWidth - chart.plotLeft - chart.plotWidth)

  // Cache lebar total chart supaya tableContainerStyle bisa pakai
  chartPixelWidth.value = Math.round(chart.chartWidth)

  // Bobot piksel per kolom (hanya dipakai di layar besar)
  const weights = []
  for (let i = 0; i < n; i++) {
    const c0 = axis.toPixels(i, false)
    const c1 = i + 1 < n
      ? axis.toPixels(i + 1, false)
      : axis.toPixels(i, false) + (n > 1
          ? axis.toPixels(1, false) - axis.toPixels(0, false)
          : chart.plotWidth / n)
    weights.push(Math.abs(c1 - c0))
  }

  colWidths.value = weights
  tableKey.value++
}

// ─── Data tabel ──────────────────────────────────────────────────────────────
const tableRows = computed(() => {
  const customerName = getCustomerName(props.model)
  const now      = new Date()
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const tIdx     = now.getDate() - 1

  const mdfoItems = getItemsBySource(store.mdfo, customerName)
  const soItems   = getItemsBySource(store.salesOrder, customerName)

  const allModels = [
    ...new Set([
      ...mdfoItems.map((i) => i.model),
      ...soItems.map((i) => i.model),
    ]),
  ]

  const filteredRows = []
  let colorIdx = 0

  allModels.forEach((model) => {
    const mdfoItem = mdfoItems.find((i) => i.model === model)
    const soItem   = soItems.find((i) => i.model === model)

    const mdfoDaily = mdfoItem
      ? getDailyArray(mdfoItem, lastDay)
      : new Array(lastDay).fill(0)

    const soDaily = soItem
      ? getDailyArray(soItem, lastDay)
      : new Array(lastDay).fill(0)

    const actualDaily = Array.from({ length: lastDay }, (_, i) =>
      i <= tIdx ? soDaily[i] : null
    )

    const totalGabungan =
      mdfoDaily.reduce((s, v) => s + (v || 0), 0) +
      actualDaily.reduce((s, v) => s + (v || 0), 0)

    if (totalGabungan > 0) {
      filteredRows.push({
        model,
        planDaily: mdfoDaily,
        actualDaily,
        color: MODEL_COLORS[colorIdx % MODEL_COLORS.length],
      })
      colorIdx++
    }
  })

  return filteredRows
})

// ─── Render / update chart ───────────────────────────────────────────────────
const updateChart = () => {
  checkScreenSize()

  const customerName = getCustomerName(props.model)
  const now      = new Date()
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const tIdx     = now.getDate() - 1

  const mdfoItems = getItemsBySource(store.mdfo, customerName)
  const soItems   = getItemsBySource(store.salesOrder, customerName)

  categories.value = Array.from({ length: lastDay }, (_, i) => `${i + 1}`)

  const totalPlanArr   = new Array(lastDay).fill(0)
  const totalActualArr = new Array(lastDay).fill(0)
  tableRows.value.forEach((row) => {
    row.planDaily.forEach((val, idx)   => { totalPlanArr[idx]   += val || 0 })
    row.actualDaily.forEach((val, idx) => { totalActualArr[idx] += val || 0 })
  })
  totalDaily.value = { plan: totalPlanArr, actual: totalActualArr }

  const barSeries = []
  tableRows.value.forEach((row) => {
    barSeries.push({
      type: 'column',
      name: `${row.model} (Plan)`,
      data: row.planDaily,
      color: row.color + '60',
      yAxis: 0,
      showInLegend: false,
      stack: 'plan',
      grouping: true,
      borderWidth: 0,
    })
    barSeries.push({
      type: 'column',
      name: row.model,
      data: row.actualDaily,
      color: row.color,
      yAxis: 0,
      stack: 'actual',
      grouping: true,
      borderWidth: 0,
    })
  })

  const totalMdfoDaily = new Array(lastDay).fill(0)
  mdfoItems.forEach((item) => {
    if (tableRows.value.some((r) => r.model === item.model)) {
      getDailyArray(item, lastDay).forEach((val, idx) => { totalMdfoDaily[idx] += val })
    }
  })
  const mdfoCumulative = toCumulative(totalMdfoDaily)

  const totalSoDaily = new Array(lastDay).fill(0)
  soItems.forEach((item) => {
    if (tableRows.value.some((r) => r.model === item.model)) {
      getDailyArray(item, lastDay).forEach((val, idx) => { totalSoDaily[idx] += val })
    }
  })
  const soCumulative    = toCumulative(totalSoDaily)
  const soActualCumData = soCumulative.map((val, idx) => idx <= tIdx ? val : null)

  /*
   * Margin chart:
   *   Layar besar  → marginLeft: 90, marginRight: 65  (nilai asal)
   *   Layar kecil  → marginLeft: 68, marginRight: 48
   *   Kedua nilai HARUS konsisten antara chartConfig & syncColWidthsFromChart
   *   karena syncColWidthsFromChart membaca chart.plotLeft secara langsung.
   */
  const chartMarginLeft  = isSmallScreen.value ? 68 : 90
  const chartMarginRight = isSmallScreen.value ? 48 : 65

  // Font 9px cukup untuk semua 31 tanggal di layar kecil; 10px untuk layar lega
  // Tidak pakai step/tickInterval — semua tanggal selalu tampil di semua ukuran layar
  const xAxisLabelFontSize = isSmallScreen.value ? '9px' : '10px'
  const chartMarginBottom  = 28   // ruang tetap agar label tidak terpotong

  const chartConfig = {
    chart: {
      backgroundColor: 'transparent',
      height: 400,
      marginLeft:   chartMarginLeft,
      marginRight:  chartMarginRight,
      marginBottom: chartMarginBottom,
      spacingLeft:  0,
      spacingRight: 0,
    },
    credits: { enabled: false },
    title:  { text: '' },
    legend: {
      layout: 'horizontal',
      align: 'center',
      verticalAlign: 'top',
    },
    xAxis: {
      categories: categories.value,
      tickmarkPlacement: 'on',
      startOnTick: false,
      endOnTick:   false,
      minPadding:  0,
      maxPadding:  0,
      offset:      0,
      labels: {
        // Tidak pakai step/tickInterval — semua 31 tanggal selalu tampil di semua ukuran layar
        autoRotation: false,
        overflow:     'justify',
        staggerLines: 1,
        style: {
          fontSize:   xAxisLabelFontSize,
          whiteSpace: 'nowrap'
        }
      }
    },
    yAxis: [
      {
        min: 0,
        title: { text: 'Qty / Hari' },
        gridLineColor: '#ececec',
        labels: {
          style: { color: '#333', fontSize: '11px' },
          formatter() {
            return this.value >= 1000 ? (this.value / 1000) + 'k' : this.value
          },
        },
      },
      {
        min: 0,
        opposite: true,
        title: { text: 'Cumulative' },
        gridLineColor: 'transparent',
        labels: {
          enabled: true,
          style: { color: '#333', fontSize: '11px' },
          formatter() {
            return this.value >= 1000 ? (this.value / 1000) + 'k' : this.value
          },
        },
      },
    ],
    tooltip: {
      shared: true,
      useHTML: true,
      formatter() {
        if (!this.points || this.points.length === 0) return ''
        const idx      = this.points[0].point.index
        const dayLabel = categories.value[idx] ?? idx + 1
        let html = `<div style="padding:4px"><b>Hari ${dayLabel}</b><br/>`
        this.points.forEach((p) => {
          if (p.y === null || p.y === undefined) return
          html += `<span style="color:${p.color}">●</span> ${p.series.name}: <b>${new Intl.NumberFormat('id-ID').format(p.y || 0)}</b><br/>`
        })
        const gap      = (soCumulative[idx] || 0) - (mdfoCumulative[idx] || 0)
        const gapColor = gap < 0 ? '#EA4335' : '#202124'
        html += `<hr style="margin:4px 0;border:0;border-top:1px dashed #ccc"/>
          <span style="color:${gapColor};font-weight:bold">⇄ Gap SO-MDFO: ${new Intl.NumberFormat('id-ID').format(gap)}</span></div>`
        return html
      },
    },
    plotOptions: {
      column: {
        grouping:     true,
        stacking:     'normal',
        pointPadding: 0,
        groupPadding: isSmallScreen.value ? 0.01 : 0.1,
        borderWidth:  0,
      },
      spline: {
        marker: { enabled: true, radius: 2.5 },
      },
    },
    series: [
      ...barSeries,
      {
        type:      'spline',
        name:      'Cumulative MDFO',
        data:      mdfoCumulative,
        color:     '#FF6D00',
        lineWidth: 2,
        dashStyle: 'ShortDash',
        yAxis:     1,
        zIndex:    10,
        marker:    { enabled: false },
      },
      {
        type:      'spline',
        name:      'Cumulative Sales Order',
        data:      soActualCumData,
        color:     '#031bf5',
        lineWidth: 2.5,
        dashStyle: 'Solid',
        yAxis:     1,
        zIndex:    11,
        marker: {
          enabled:   true,
          radius:    4,
          symbol:    'circle',
          fillColor: '#031bf5',
          lineWidth: 2,
          lineColor: '#ffffff',
        },
      },
    ],
  }

  nextTick(() => {
    if (hcChart.value?.destroy) hcChart.value.destroy()
    if (highchartContainer.value) {
      hcChart.value = Highcharts.chart(highchartContainer.value, chartConfig)
      syncColWidthsFromChart()
    }
  })
}

// ─── Resize handler ──────────────────────────────────────────────────────────
/*
 * Saat resize:
 * 1. checkScreenSize() → isSmallScreen diperbarui
 * 2. chart.update() → margin & label disesuaikan
 * 3. chart.reflow() → Highcharts menyesuaikan lebar container
 * 4. syncColWidthsFromChart() → leftColW, rightColW, colWidths, chartPixelWidth
 *    diperbarui → tabel otomatis menyesuaikan via computed style
 */
const handleResize = () => {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    checkScreenSize()

    if (!hcChart.value) return

    const newMarginLeft   = isSmallScreen.value ? 68    : 90
    const newMarginRight  = isSmallScreen.value ? 48    : 65
    const newFontSize     = isSmallScreen.value ? '9px' : '10px'

    hcChart.value.update({
      chart: {
        marginLeft:   newMarginLeft,
        marginRight:  newMarginRight,
        marginBottom: 28,
      },
     xAxis: {
      categories: categories.value,
      tickmarkPlacement: 'on',
      startOnTick: false,
      endOnTick:   false,
      minPadding:  0,
      maxPadding:  0,
      offset:      0,
      
      // --- PERBAIKAN UNTUK MEMAKSA LABEL TETAP MUNCUL DI TABLET ---
      tickInterval: 1, // Pastikan setiap 1 langkah tanggal wajib dievaluasi
      labels: {
        autoRotation: false,
        overflow: 'allow',     // Mengizinkan label sedikit melebihi batas container agar tidak di-hide
        allowOverlap: true,    // KUNCI UTAMA: Memaksa label tetap digambar meskipun saling bertabrakan
        staggerLines: 1,
        style: {
          fontSize:   xAxisLabelFontSize,
          whiteSpace: 'nowrap',
          textOverflow: 'none' // Mencegah teks terpotong menjadi titik-titik (...)
        }
      }
    },
      plotOptions: {
        column: {
          groupPadding: isSmallScreen.value ? 0.01 : 0.1
        }
      }
    }, false)   // false = jangan redraw dulu

    hcChart.value.reflow()   // resize container → redraw otomatis

    // Setelah reflow selesai (nextTick), baca ulang dimensi chart
    nextTick(() => {
      syncColWidthsFromChart()
    })
  }, 150)
}

// ─── Watchers ────────────────────────────────────────────────────────────────
watch(() => props.model, () => {
  if (store.mdfo.length || store.salesOrder.length) updateChart()
})

watch([() => store.mdfo], () => { updateChart() })

watch(() => props.chartData, () => { updateChart() }, { deep: true })

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  checkScreenSize()
  if (!store.mdfo.length && !store.salesOrder.length) {
    await store.fetchDetailPcsDaily()
  }
  updateChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  clearTimeout(resizeTimeout)
  if (hcChart.value?.destroy) hcChart.value.destroy()
})
</script>

<style scoped>
/* Scrollbar horizontal — sedikit lebih tebal agar mudah digeser di layar sentuh */
.custom-scrollbar::-webkit-scrollbar        { height: 10px; }
.custom-scrollbar::-webkit-scrollbar-track  { background: #f8fafc; border-radius: 0 0 4px 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb  { background: #cbd5e1; border-radius: 6px; border: 2px solid #f8fafc; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>