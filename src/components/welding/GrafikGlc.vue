<!--
  Grafik Loading Capacity, dibuat menyerupai grafik GLC di Excel: batang
  bertumpuk TEIKI + TEIRYO + TIP CHANGE + DOWNTIME, kotak TPT di atas tiap
  batang, garis putus-putus acuan blok jam kerja, sumbu UPH di kanan, dan tabel
  keterangan yang kolomnya lurus dengan batangnya.

  Komponen ini sengaja tidak tahu-menahu soal balancing. Ia hanya menerima
  sekumpulan baris robot yang sudah jadi, sehingga bisa dipakai berulang untuk
  keadaan sekarang, sesudah balancing, maupun sesudah round up.
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { GlcPeriode, BarisGrafik } from '@/types/PCD/Welding/Glc'

const props = withDefaults(defineProps<{
  data: BarisGrafik[]
  header: GlcPeriode | null
  /** dipakai di kop tabel keterangan, misal "GLC CURRENT" */
  judul?: string
  wdWeek?: number
  mcPerRobot?: number
  /**
   * Hari kerja yang benar-benar dipakai part di tiap robot, misal
   * { RSW1: '22', RSW8: '22-25' }. Kalau kosong, dipakai hari kerja line.
   */
  wdPerRobot?: Record<string, string>
}>(), { judul: '', wdWeek: 5, mcPerRobot: 1, wdPerRobot: () => ({}) })

const SIG = 'Ʃ'

/** Warna seri disamakan dengan grafik GLC di Excel. */
const WARNA = {
  teiki: '#4472c4',   // biru, bagian terbesar
  teiryo: '#ffc000',  // kuning
  tip: '#ed7d31',     // oranye
  dt: '#c00000',      // merah, paling atas
}

const num = (v: any) => Number(v ?? 0)

const G = computed(() => {
  const data = [...props.data].sort(
    (a, b) => Number(a.machine.replace(/\D/g, '')) - Number(b.machine.replace(/\D/g, '')))

  const h = props.header
  const kiri = 152, lebarKol = 48, padBar = 9, atas = 26, tinggiPlot = 300, tinggiBaris = 21
  const maxY = 24
  const y = (v: number) => atas + tinggiPlot - (v / maxY) * tinggiPlot
  const x = (i: number) => kiri + i * lebarKol
  const lebar = kiri + data.length * lebarKol + 20

  const dua = (v: number) => v.toFixed(2)
  const bulat = (v: number) => (v ? v.toFixed(0) : '')
  const tetap = (v: number) => (v > 0 ? v.toFixed(0) : '')

  // Urutan baris disamakan dengan Data Table di grafik Excel.
  const baris = [
    { k: 'Robot', f: (m: BarisGrafik) => m.machine },
    { k: 'DOWNTIME', c: WARNA.dt, f: (m: BarisGrafik) => dua(m.dt) },
    { k: 'TIP CHANGE & DRESSER', c: WARNA.tip, f: (m: BarisGrafik) => dua(m.tip) },
    { k: 'TEIRYO', c: WARNA.teiryo, f: (m: BarisGrafik) => dua(m.teiryo) },
    { k: 'TEIKI', c: WARNA.teiki, f: (m: BarisGrafik) => dua(m.teiki) },
    { k: 'Hour/Day (TPT)', tebal: true, f: (m: BarisGrafik) => (m.tpt ? m.tpt.toFixed(2) : '') },
    { k: 'WT 1 SHIFT', f: () => tetap(num(h?.wt_1shift)) },
    { k: 'WT 1 SHIFT + PJK', f: () => tetap(num(h?.wt_1shift_pjk)) },
    { k: 'WT 2 SHIFT', f: () => tetap(num(h?.wt_2shift)) },
    { k: 'WT 2 SHIFT + PJK 1S', f: () => tetap(num(h?.wt_2shift_pjk1s)) },
    { k: 'WT 2 SHIFT + PJK 2S', f: () => tetap(num(h?.wt_2shift_pjk2s)) },
    { k: 'UPH', f: (m: BarisGrafik) => bulat(m.uph) },
    { k: SIG + ' ITEM', f: (m: BarisGrafik) => bulat(m.item) },
    {
      // Hari kerja customer, bukan hari kerja line: itu yang dipakai membagi
      // order jadi pcs/hari. Robot yang melayani beberapa customer dengan hari
      // kerja berbeda ditampilkan rentangnya.
      k: 'WD/month',
      f: (m: BarisGrafik) => props.wdPerRobot[m.machine] || tetap(num(h?.working_day)),
    },
    { k: 'WD/Week', f: () => String(props.wdWeek) },
    { k: SIG + ' M/C', f: () => String(props.mcPerRobot) },
    { k: SIG + ' MP / Day', tebal: true, f: (m: BarisGrafik) => (m.blok ? m.mp.toFixed(0) : '') },
    { k: 'PCS/DAY', f: (m: BarisGrafik) => bulat(m.pcs) },
    { k: 'STROKE/DAY', f: (m: BarisGrafik) => bulat(m.stroke) },
    { k: SIG + ' SPOT', f: (m: BarisGrafik) => bulat(m.spot) },
  ]
  const tabelY = (r: number) => y(0) + 8 + r * tinggiBaris
  const tinggi = tabelY(baris.length) + 12

  const wt = h ? [
    { n: 'WT 1 SHIFT', v: num(h.wt_1shift), c: '#7f7f7f' },
    { n: 'WT 1SH+PJK', v: num(h.wt_1shift_pjk), c: '#548235' },
    { n: 'WT 2 SHIFT', v: num(h.wt_2shift), c: '#c55a11' },
    { n: 'WT 2SH+PJK 1S', v: num(h.wt_2shift_pjk1s), c: '#7030a0' },
    { n: 'WT 2SH+PJK 2S', v: num(h.wt_2shift_pjk2s), c: '#c00000' },
  ].filter(w => w.v > 0) : []

  // urutan tumpukan dari bawah, sama dengan urutan seri di grafik Excel
  const tumpuk = (m: BarisGrafik) => {
    const seri = [
      { k: 'teiki', v: m.teiki, c: WARNA.teiki },
      { k: 'teiryo', v: m.teiryo, c: WARNA.teiryo },
      { k: 'tip', v: m.tip, c: WARNA.tip },
      { k: 'dt', v: m.dt, c: WARNA.dt },
    ]
    let dasar = 0
    return seri.filter(s => s.v > 0).map(s => {
      const y0 = y(dasar + s.v), y1 = y(dasar)
      dasar += s.v
      return { k: s.k, c: s.c, y: y0, h: Math.max(1, y1 - y0) }
    })
  }

  const uphTicks = [0, 60, 120, 180, 240, 300, 360]
  const totalMp = data.reduce((t, m) => t + (m.blok ? m.mp : 0), 0)

  return {
    data, kiri, lebarKol, padBar, lebarBar: lebarKol - padBar * 2, atas, tinggiPlot,
    tinggiBaris, lebar, tinggi, y, x, tabelY, baris, wt, tumpuk,
    warna: WARNA, uphTicks, totalMp,
    ticks: [0, 4, 8, 12, 16, 20, 24],
  }
})

defineExpose({ G, SIG })
</script>

<template>
  <div>
    <div class="legenda">
      <strong v-if="judul" class="lgd-judul">{{ judul }}</strong>
      <span><i :style="{ background: G.warna.teiki }"></i>TEIKI</span>
      <span><i :style="{ background: G.warna.teiryo }"></i>TEIRYO</span>
      <span><i :style="{ background: G.warna.tip }"></i>TIP CHANGE &amp; DRESSER</span>
      <span><i :style="{ background: G.warna.dt }"></i>DOWNTIME</span>
      <span class="lgd-mp">{{ SIG }} MP = <strong>{{ G.totalMp }}</strong></span>
    </div>

    <!-- Bar dan tabel keterangan digambar dalam satu SVG supaya kolomnya
         dijamin lurus, sama seperti Data Table di grafik Excel. -->
    <div class="grafik-wrap">
      <svg :width="G.lebar" :height="G.tinggi" :viewBox="`0 0 ${G.lebar} ${G.tinggi}`">
        <g v-for="t in G.ticks" :key="'y' + t">
          <line :x1="G.kiri" :x2="G.lebar - 8" :y1="G.y(t)" :y2="G.y(t)"
                stroke="#e5e7eb" stroke-width="1" />
          <text :x="G.kiri - 8" :y="G.y(t) + 4" text-anchor="end" class="sv-ax">{{ t }}</text>
        </g>
        <text :x="14" :y="G.atas + G.tinggiPlot / 2" class="sv-ax"
              :transform="`rotate(-90 14 ${G.atas + G.tinggiPlot / 2})`" text-anchor="middle">
          TPT / DAY (JAM)
        </text>

        <!-- sumbu UPH di kanan, seperti di grafik Excel -->
        <g v-for="(u, ui) in G.uphTicks" :key="'u' + u">
          <text :x="G.lebar - 12"
                :y="G.atas + G.tinggiPlot - (ui / (G.uphTicks.length - 1)) * G.tinggiPlot + 4"
                text-anchor="start" class="sv-ax">{{ u }}</text>
        </g>
        <text :x="G.lebar - 4" :y="G.atas + G.tinggiPlot / 2" class="sv-ax"
              :transform="`rotate(-90 ${G.lebar - 4} ${G.atas + G.tinggiPlot / 2})`"
              text-anchor="middle">UPH</text>

        <!-- batang bertumpuk per robot -->
        <g v-for="(m, i) in G.data" :key="'b' + m.machine">
          <rect v-for="s in G.tumpuk(m)" :key="s.k"
                :x="G.x(i) + G.padBar" :width="G.lebarBar"
                :y="s.y" :height="s.h" :fill="s.c" />
          <g v-if="m.tpt > 0">
            <rect :x="G.x(i) + G.lebarKol / 2 - 17" :y="G.y(m.tpt) - 20"
                  width="34" height="15" rx="2"
                  fill="#ffffff" stroke="#374151" stroke-width="0.9" />
            <text :x="G.x(i) + G.lebarKol / 2" :y="G.y(m.tpt) - 9"
                  text-anchor="middle" class="sv-val">{{ m.tpt.toFixed(1) }}</text>
          </g>
        </g>

        <!-- garis acuan blok shift -->
        <g v-for="w in G.wt" :key="'w' + w.v">
          <line :x1="G.kiri" :x2="G.lebar - 8" :y1="G.y(w.v)" :y2="G.y(w.v)"
                :stroke="w.c" stroke-width="1.4" stroke-dasharray="7 4" />
          <text :x="G.lebar - 10" :y="G.y(w.v) - 4" text-anchor="end"
                :fill="w.c" class="sv-wt">{{ w.n }} ({{ w.v }} jam)</text>
        </g>

        <!-- sumbu X + tabel keterangan, x-nya sama dengan batang -->
        <line :x1="G.kiri" :x2="G.lebar - 8" :y1="G.y(0)" :y2="G.y(0)"
              stroke="#374151" stroke-width="1.5" />
        <g v-for="(b, r) in G.baris" :key="'r' + b.k">
          <rect :x="G.kiri" :y="G.tabelY(r)" :width="G.lebar - G.kiri - 8" :height="G.tinggiBaris"
                :fill="r % 2 ? '#f9fafb' : '#ffffff'" stroke="#e5e7eb" stroke-width="0.5" />
          <rect v-if="b.c" :x="8" :y="G.tabelY(r) + 4"
                width="11" height="11" :fill="b.c" stroke="#6b7280" stroke-width="0.5" />
          <text :x="G.kiri - 8" :y="G.tabelY(r) + G.tinggiBaris - 5" text-anchor="end"
                class="sv-lbl" :class="{ 'sv-lbl-tebal': b.tebal }">{{ b.k }}</text>
          <text v-for="(m, i) in G.data" :key="b.k + m.machine"
                :x="G.x(i) + G.lebarKol / 2" :y="G.tabelY(r) + G.tinggiBaris - 5"
                text-anchor="middle" class="sv-cell"
                :class="{ 'sv-cell-tebal': b.tebal }">{{ b.f(m) }}</text>
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.legenda { display: flex; align-items: center; gap: 14px; font-size: 11px;
  flex-wrap: wrap; margin-bottom: 6px; }
.legenda i { display: inline-block; width: 10px; height: 10px; margin-right: 4px;
  border-radius: 2px; vertical-align: -1px; }
.lgd-judul { font-size: 13px; margin-right: 4px; }
.lgd-mp { margin-left: auto; font-weight: 600; }
.grafik-wrap { overflow-x: auto; }
.sv-ax { font-size: 10px; fill: #6b7280; }
.sv-val { font-size: 10px; font-weight: 700; fill: #111827; }
.sv-wt { font-size: 9px; font-weight: 600; }
.sv-lbl { font-size: 10px; fill: #374151; }
.sv-lbl-tebal { font-weight: 700; }
.sv-cell { font-size: 10px; fill: #111827; }
.sv-cell-tebal { font-weight: 700; }
</style>
