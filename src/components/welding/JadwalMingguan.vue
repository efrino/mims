<!--
  Jadwal part per minggu, dari W1 sampai minggu terakhir bulan berjalan,
  beserta skema recovery akhir pekan untuk robot yang tidak achieve.

  Tiga lapis tampilan:
    1. Kalender hari kerja per customer - ini yang menjelaskan kenapa satu
       customer punya 25 hari kerja dan yang lain 22.
    2. Beban tiap robot per minggu, ditandai minggu mana yang lewat blok.
    3. Rencana recovery akhir pekan: tanggal, part, dan kuantitas yang digeser.

  Komponen berdiri sendiri: mengambil datanya sendiri dari satu periode GLC.
-->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { fetchJadwal } from '@/services/PCD/Welding/Glc'
import type { Jadwal, JadwalRobot } from '@/types/PCD/Welding/Glc'

const props = defineProps<{ glcId: number }>()

const data   = ref<Jadwal | null>(null)
const sibuk  = ref(false)
const galat  = ref('')
const tampil = ref<'robot' | 'part'>('robot')
/** Robot yang rincian recovery-nya sedang dibuka. */
const buka   = ref<Record<string, boolean>>({})
/** Hanya tampilkan robot yang bermasalah. */
const hanyaBermasalah = ref(false)

const num = (v: any) => Number(v || 0)
const n2 = (v: any) => Number(v || 0).toLocaleString('id-ID',
  { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const n0 = (v: any) => Number(v || 0).toLocaleString('id-ID')
const tgl = (s: string) => {
  const [, b, h] = s.split('-')
  return `${h}/${b}`
}

async function muat() {
  if (!props.glcId) return
  sibuk.value = true
  galat.value = ''
  try {
    data.value = await fetchJadwal(props.glcId)
  } catch (e: any) {
    galat.value = e?.response?.data?.message || 'Jadwal gagal dimuat.'
    data.value = null
  } finally {
    sibuk.value = false
  }
}

const robotTampil = computed<JadwalRobot[]>(() => {
  const r = data.value?.robot ?? []
  return hanyaBermasalah.value ? r.filter(x => !x.achieve) : r
})

/** Jam satu robot pada satu minggu; null kalau robot tidak jalan minggu itu. */
const sel = (r: JadwalRobot, w: number) => r.minggu.find(m => m.w === w) ?? null

/** Kuantitas satu part pada satu minggu. */
const qty = (p: { minggu: { w: number; qty: number }[] }, w: number) =>
  p.minggu.find(m => m.w === w)?.qty ?? 0

const recov = (r: JadwalRobot, w: number) => r.recovery.find(x => x.w === w) ?? null

onMounted(muat)
watch(() => props.glcId, muat)
</script>

<template>
  <div>
    <div v-if="sibuk" class="hint">Menghitung jadwal&hellip;</div>
    <p v-else-if="galat" class="bad">{{ galat }}</p>

    <template v-else-if="data">
      <!-- ================= ringkasan ================= -->
      <div class="kpi">
        <div class="kpi-item">
          <span>Periode</span><strong>{{ data.periode }}</strong>
          <small>{{ data.minggu.length }} minggu &middot; W1&ndash;W{{ data.minggu.length }}</small>
        </div>
        <div class="kpi-item">
          <span>Robot dijadwalkan</span><strong>{{ data.ringkas.robot }}</strong>
          <small>{{ data.ringkas.part }} baris part</small>
        </div>
        <div class="kpi-item" :class="{ 'kpi-warn': data.ringkas.robot_tidak_achieve > 0 }">
          <span>Tidak achieve di hari biasa</span>
          <strong>{{ data.ringkas.robot_tidak_achieve }}</strong>
          <small>{{ n2(data.ringkas.jam_kurang) }} jam melewati blok</small>
        </div>
        <div class="kpi-item kpi-ok">
          <span>Tertutup akhir pekan</span><strong>{{ data.ringkas.robot_pulih }}</strong>
          <small>{{ n2(data.ringkas.jam_pulih) }} jam dipulihkan</small>
        </div>
        <div class="kpi-item" :class="data.ringkas.robot_sisa_kurang > 0 ? 'kpi-bad' : 'kpi-ok'">
          <span>Masih kurang</span><strong>{{ data.ringkas.robot_sisa_kurang }}</strong>
          <small>{{ data.ringkas.robot_sisa_kurang ? 'perlu naik blok / balancing' : 'semua tertutup' }}</small>
        </div>
      </div>

      <p class="hint">
        Tiap part dikerjakan satu lot per hari kerja customer-nya. Robot dinyatakan
        <strong>tidak achieve</strong> kalau jam satu harinya melewati blok jam kerjanya &mdash;
        batas itu berlaku per hari, jadi hari yang longgar tidak bisa menolong hari yang
        kelebihan. Kekurangannya digeser ke akhir pekan yang masih kosong; yang dipindah
        adalah kuantitas, bukan lot utuh, supaya jam yang berpindah tidak berlebihan.
      </p>

      <!-- ================= kalender hari kerja ================= -->
      <h3>Hari kerja per customer
        <small>inilah yang membuat satu customer 25 hari dan yang lain 22</small>
      </h3>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr>
            <th>Customer</th><th class="r">WD</th>
            <th v-for="m in data.minggu" :key="m.w" class="r">
              {{ m.label }}<br><small>{{ tgl(m.mulai) }}&ndash;{{ tgl(m.selesai) }}</small>
            </th>
            <th>Sabtu reguler</th><th>Libur ditebak</th><th>Recovery akhir pekan</th>
          </tr></thead>
          <tbody>
            <tr v-for="k in data.kalender" :key="k.customer">
              <td><strong>{{ k.customer }}</strong></td>
              <td class="r">{{ k.wd }}</td>
              <td v-for="m in k.minggu" :key="m.w" class="r">{{ m.hari }}</td>
              <td>
                <span v-if="k.sabtu_kerja.length" class="mono">
                  {{ k.sabtu_kerja.map(tgl).join(', ') }}
                </span>
                <span v-else class="kosong">&ndash;</span>
              </td>
              <td>
                <span v-if="k.libur_paksa.length" class="mono warn">
                  {{ k.libur_paksa.map(tgl).join(', ') }}
                </span>
                <span v-else class="kosong">&ndash;</span>
              </td>
              <td>
                <span v-if="k.pakai_sabtu" class="tag tag-warn">tetap reguler</span>
                <span v-else class="tag tag-ok">boleh dipakai</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="hint">
        Customer yang Sabtu-nya sudah masuk jadwal reguler tidak ikut skema recovery &mdash;
        jadwalnya memang sudah begitu, tidak ada Sabtu kosong yang bisa dipakai.
        Kolom <strong>Libur ditebak</strong> muncul kalau hari kerja customer lebih sedikit
        dari jumlah hari Senin&ndash;Jumat bulan itu: tanggal liburnya tidak ada di data,
        jadi diambil dari akhir bulan. Kalau tanggal aslinya berbeda, pembagian per minggu
        ikut bergeser.
      </p>

      <!-- ================= pilihan tampilan ================= -->
      <div class="kendali">
        <div class="pat-tab">
          <button class="tab" :class="{ 'tab-on': tampil === 'robot' }"
                  @click="tampil = 'robot'">Beban robot per minggu</button>
          <button class="tab" :class="{ 'tab-on': tampil === 'part' }"
                  @click="tampil = 'part'">Kuantitas part per minggu</button>
        </div>
        <label v-if="tampil === 'robot'" class="cek">
          <input type="checkbox" v-model="hanyaBermasalah">
          hanya yang tidak achieve
        </label>
      </div>

      <!-- ================= beban robot per minggu ================= -->
      <template v-if="tampil === 'robot'">
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr>
              <th>Robot</th><th>Gun</th><th class="r">Blok</th><th class="r">Jam/hari</th>
              <th v-for="m in data.minggu" :key="m.w" class="r">
                {{ m.label }}<br><small>{{ tgl(m.mulai) }}&ndash;{{ tgl(m.selesai) }}</small>
              </th>
              <th class="r">Kurang</th><th class="r">Recovery</th><th class="r">Sisa</th><th></th>
            </tr></thead>
            <tbody>
              <template v-for="r in robotTampil" :key="r.machine">
                <tr :class="{ 'baris-bad': !r.achieve }">
                  <td class="mono"><strong>{{ r.label }}</strong></td>
                  <td>{{ r.gun_type || '-' }}</td>
                  <td class="r">{{ n0(r.blok_shift) }}</td>
                  <td class="r" :class="{ bad: !r.achieve }">{{ n2(r.tpt_jam) }}</td>
                  <td v-for="m in data.minggu" :key="m.w" class="r"
                      :class="{ warn: num(sel(r, m.w)?.kurang) > 0 }">
                    <template v-if="sel(r, m.w)">
                      {{ n2(sel(r, m.w)!.jam_butuh) }}
                      <small>/ {{ n0(sel(r, m.w)!.hari_aktif) }}h</small>
                    </template>
                    <span v-else class="kosong">&ndash;</span>
                  </td>
                  <td class="r" :class="{ bad: r.total_kurang > 0 }">
                    {{ r.total_kurang ? n2(r.total_kurang) : '-' }}
                  </td>
                  <td class="r ok">{{ r.total_pulih ? n2(r.total_pulih) : '-' }}</td>
                  <td class="r" :class="r.sisa_kurang > 0 ? 'bad' : 'ok'">
                    {{ r.sisa_kurang ? n2(r.sisa_kurang) : '-' }}
                  </td>
                  <td>
                    <button v-if="r.recovery.length" class="lnk"
                            @click="buka[r.machine] = !buka[r.machine]">
                      {{ buka[r.machine] ? 'tutup' : 'rincian' }}
                    </button>
                  </td>
                </tr>

                <!-- rincian recovery -->
                <tr v-if="buka[r.machine]" :key="r.machine + '-rc'">
                  <td :colspan="data.minggu.length + 8" class="sel-rinci">
                    <p v-if="r.sisa_kurang > 0" class="bad" style="margin:0 0 8px">
                      Masih kurang {{ n2(r.sisa_kurang) }} jam sesudah recovery.
                      <template v-if="r.saran_blok">
                        Jam puncaknya {{ n2(r.jam_puncak) }} &mdash; muat kalau bloknya
                        dinaikkan dari {{ n0(r.blok_shift) }} ke
                        <strong>{{ n0(r.saran_blok) }} jam</strong>.
                      </template>
                      <template v-else>
                        Jam puncaknya {{ n2(r.jam_puncak) }}, melewati blok tertinggi &mdash;
                        sebagian part-nya memang harus dipindah lewat balancing.
                      </template>
                    </p>

                    <div v-for="rc in r.recovery" :key="rc.w" class="rc">
                      <div class="rc-hdr">
                        <strong>W{{ rc.w }}</strong>
                        kurang {{ n2(rc.jam_kurang) }} jam
                        <template v-if="rc.jam_pulih">
                          &rarr; ditutup {{ n2(rc.jam_pulih) }} jam
                        </template>
                        <span v-if="rc.cukup" class="tag tag-ok">tertutup</span>
                        <span v-else class="tag tag-bad">sisa {{ n2(rc.sisa) }} jam</span>
                      </div>
                      <p v-if="rc.catatan" class="hint" style="margin:2px 0 6px">{{ rc.catatan }}</p>

                      <table v-if="rc.hari.length" class="tbl tbl-in">
                        <thead><tr>
                          <th>Masuk kerja</th><th>Part</th><th>OP</th><th>Jig</th>
                          <th>Customer</th><th>Digeser dari</th>
                          <th class="r">Qty</th><th class="r">dari lot</th><th class="r">Jam</th>
                        </tr></thead>
                        <tbody>
                          <template v-for="h in rc.hari" :key="h.tanggal">
                            <tr v-for="(l, i) in h.lot" :key="h.tanggal + i">
                              <td v-if="i === 0" :rowspan="h.lot.length" class="sel-hari">
                                <strong>{{ h.nama_hari }} {{ tgl(h.tanggal) }}</strong><br>
                                <small>{{ n2(h.jam_hari_total) }} jam &middot; {{ n0(h.qty) }} pcs</small>
                                <div v-if="h.luar_minggu" class="tag tag-warn">
                                  dikerjakan lebih awal
                                </div>
                              </td>
                              <td class="mono">{{ l.part_number }}</td>
                              <td>{{ l.op || '-' }}</td>
                              <td>{{ l.jig || '-' }}</td>
                              <td>{{ l.customer }}</td>
                              <td>{{ l.dari_hari }} {{ tgl(l.dari) }}</td>
                              <td class="r"><strong>{{ n0(l.qty) }}</strong></td>
                              <td class="r"><small>{{ n0(l.qty_lot) }}</small></td>
                              <td class="r">{{ n2(l.jam) }}</td>
                            </tr>
                          </template>
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="!robotTampil.length">
                <td :colspan="data.minggu.length + 8" class="kosong">
                  Semua robot muat di blok jam kerjanya.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="hint">
          Angka tiap minggu adalah jam yang dibutuhkan robot itu selama minggu tersebut,
          dan <em>/nh</em> di belakangnya jumlah hari kerjanya. Sel bertanda kuning berarti
          ada hari yang melewati blok.
        </p>
      </template>

      <!-- ================= kuantitas part per minggu ================= -->
      <template v-else>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr>
              <th>Robot</th><th>Part</th><th>OP</th><th>Jig</th><th>Customer</th>
              <th class="r">WD</th><th class="r">Lot</th><th class="r">Order</th>
              <th v-for="m in data.minggu" :key="m.w" class="r">
                {{ m.label }}<br><small>{{ tgl(m.mulai) }}&ndash;{{ tgl(m.selesai) }}</small>
              </th>
              <th class="r">Total</th>
            </tr></thead>
            <tbody>
              <tr v-for="(p, i) in data.part" :key="i">
                <td class="mono">{{ p.label }}</td>
                <td class="mono">{{ p.part_number }}</td>
                <td>{{ p.op || '-' }}</td>
                <td>{{ p.jig || '-' }}</td>
                <td>{{ p.customer }}</td>
                <td class="r">{{ p.customer_wd || '-' }}</td>
                <td class="r">{{ n0(p.lot_size) }}</td>
                <td class="r">{{ n0(p.net_order) }}</td>
                <td v-for="m in data.minggu" :key="m.w" class="r">
                  {{ qty(p, m.w) ? n0(qty(p, m.w)) : '-' }}
                </td>
                <td class="r" :class="p.total_qty >= p.net_order ? 'ok' : 'bad'">
                  <strong>{{ n0(p.total_qty) }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="hint">
          Kuantitas dibagi ke hari kerja customer masing-masing, satu lot per hari, dan
          hari terakhir dipotong sisa ordernya. Kolom <strong>Total</strong> hijau berarti
          order periode ini habis terjadwal.
        </p>
      </template>
    </template>
  </div>
</template>

<style scoped>
.kpi { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
.kpi-item { border: 1px solid #d7e3ec; border-left: 4px solid #4f8fbd; border-radius: 6px;
  padding: 6px 14px; min-width: 150px; background: #fbfdff; }
.kpi-item span { display: block; font-size: 11px; color: #6b7280; }
.kpi-item strong { font-size: 20px; line-height: 1.2; }
.kpi-item small { display: block; font-size: 10px; color: #6b7280; }
.kpi-ok { border-left-color: #1e7a3c; }
.kpi-warn { border-left-color: #d08700; }
.kpi-bad { border-left-color: #c00000; }

.kendali { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin: 14px 0 8px; }
.pat-tab { display: flex; gap: 4px; }
.tab { border: 1px solid #d1d5db; background: #fff; border-radius: 7px;
  padding: 3px 14px; font-weight: 700; cursor: pointer; }
.tab-on { background: #1f4e79; border-color: #1f4e79; color: #fff; }
.cek { font-size: 12px; display: flex; align-items: center; gap: 5px; cursor: pointer; }

h3 { font-size: 13px; margin: 14px 0 6px; }
h3 small { font-weight: 400; color: #6b7280; }
.tbl-wrap { overflow-x: auto; }
.tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
.tbl th, .tbl td { border: 1px solid #9fb6c8; padding: 2px 6px; white-space: nowrap; }
.tbl th { background: #4f8fbd; color: #fff; font-weight: 700; text-align: center; }
.tbl th small { font-weight: 400; opacity: .85; }
.tbl td.r, .tbl th.r { text-align: right; font-variant-numeric: tabular-nums; }
.tbl tbody tr:nth-child(even) > td { background: #f7fafc; }
.baris-bad > td { background: #fff5f5 !important; }
.tbl-in { margin: 2px 0 6px; }
.tbl-in th { background: #7aa7c7; }
.sel-rinci { background: #fdfdfd !important; white-space: normal; padding: 10px 12px !important; }
.sel-hari { vertical-align: top; background: #eef5fa !important; }
.rc { margin-bottom: 10px; }
.rc-hdr { font-size: 12px; margin-bottom: 2px; }
.mono { font-family: ui-monospace, Menlo, Consolas, monospace; }
.ok { color: #1e7a3c; }
.warn { color: #8a6100; background: #fff8e6; }
.bad { color: #c00000; }
.kosong { text-align: center; color: #9ca3af; }
.lnk { border: 0; background: none; color: #1f4e79; text-decoration: underline;
  cursor: pointer; font-size: 11px; padding: 0; }
.tag { display: inline-block; padding: 1px 7px; border-radius: 9px; font-size: 10px;
  font-weight: 700; }
.tag-ok { background: #e6f4ea; color: #1e5c34; }
.tag-warn { background: #fdf3e7; color: #8a5a1d; }
.tag-bad { background: #fdecec; color: #8a1d1d; }
.hint { font-size: 11px; color: #6b7280; font-style: italic; margin: 6px 0 12px; }
</style>
