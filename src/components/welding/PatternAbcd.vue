<!--
  Skema produksi pattern A/B/C/D per robot.

  Dipindah ke sini dari halaman GLC supaya berkumpul dengan PATAN: pattern
  inilah yang menentukan urutan job dalam satu shift, dan dari situ keluarannya
  bisa diadu dengan target delivery, safety stock, dan UPH.

  Komponen berdiri sendiri - ia mengambil datanya sendiri dari satu periode GLC,
  jadi bisa dipasang di halaman mana pun tanpa menyeret state halaman induknya.
-->
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { fetchMachine, fetchPart, fetchPattern, fetchTandem } from '@/services/PCD/Welding/Glc'
import type { GlcMachine, GlcPart, GlcPattern, GlcTandem } from '@/types/PCD/Welding/Glc'

const props = defineProps<{ glcId: number }>()

const machines = ref<GlcMachine[]>([])
const parts    = ref<GlcPart[]>([])
const pattern  = ref<GlcPattern[]>([])
const tandem   = ref<GlcTandem[]>([])
const mcAktif  = ref('')
const patAktif = ref('A')
const sibuk    = ref(false)

const num = (v: any) => Number(v || 0)
const n = (v: any) => Number(v || 0).toLocaleString('id-ID',
  { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function muat() {
  if (!props.glcId) return
  sibuk.value = true
  try {
    machines.value = await fetchMachine(props.glcId)
    tandem.value = await fetchTandem(props.glcId)
    // robot pertama yang benar-benar punya beban, supaya layar tidak kosong
    const pertama = machines.value.find(m => num(m.tpt_jam) > 0) ?? machines.value[0]
    if (pertama) await pilihRobot(pertama.machine)
  } finally { sibuk.value = false }
}

async function pilihRobot(mc: string) {
  mcAktif.value = mc
  parts.value = await fetchPart(props.glcId, mc)
  pattern.value = await fetchPattern(props.glcId, mc, patAktif.value)
}

async function pilihPattern(p: string) {
  patAktif.value = p
  if (mcAktif.value) pattern.value = await fetchPattern(props.glcId, mcAktif.value, p)
}

onMounted(muat)
watch(() => props.glcId, muat)
</script>

<template>
  <div>
    <div class="pat-kendali">
      <label>Robot
        <select :value="mcAktif" @change="pilihRobot(($event.target as HTMLSelectElement).value)">
          <option v-for="m in machines" :key="m.machine" :value="m.machine">
            {{ m.machine }}
            <template v-if="num(m.tpt_jam)"> &mdash; {{ n(m.tpt_jam) }} jam</template>
          </option>
        </select>
      </label>
      <div class="pat-tab">
        <button v-for="p in ['A', 'B', 'C', 'D']" :key="p" class="tab"
                :class="{ 'tab-on': patAktif === p }" @click="pilihPattern(p)">{{ p }}</button>
      </div>
      <span class="hint" style="margin:0">
        Pattern A/B/C/D adalah empat susunan urutan job dalam satu shift.
      </span>
    </div>

    <p v-if="!mcAktif" class="hint">Belum ada robot terpilih.</p>

    <template v-else>
      <h3>Kebutuhan part
        <small>satu baris per OP / per jig &mdash; CT dan spot tiap OP berdiri sendiri</small>
      </h3>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr>
            <th>Part</th><th>OP</th><th>Model</th><th>Jig</th>
            <th class="r">Order</th><th class="r">Stock IFPD</th><th class="r">Ditutup stock</th>
            <th class="r">Sisa order</th><th class="r">Pcs/hari</th><th class="r">Lot</th>
            <th class="r">CT</th><th class="r">TEIKI</th>
          </tr></thead>
          <tbody>
            <tr v-for="(p, i) in parts" :key="i">
              <td class="mono">{{ p.part_number }}</td>
              <td>{{ p.op || '-' }}</td><td>{{ p.model || '-' }}</td><td>{{ p.jig_first || '-' }}</td>
              <td class="r">{{ p.order_periode }}</td>
              <td class="r">{{ p.stock_ifpd }}</td>
              <td class="r ok">{{ p.stock_cover_pcs || '-' }}</td>
              <td class="r">{{ p.net_order }}</td>
              <td class="r">{{ p.pcs_day }}</td>
              <td class="r">{{ p.lot_size }}</td>
              <td class="r" :class="{ bad: !num(p.cycle_time_sec) }">
                {{ num(p.cycle_time_sec) ? n(p.cycle_time_sec) : 'kosong' }}
              </td>
              <td class="r">{{ n(p.teiki_jam) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Pattern {{ patAktif }} <small>(urutan job dalam satu shift)</small></h3>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr>
            <th class="r">#</th><th>Part</th><th>OP</th><th>Jig</th><th>Status</th>
            <th>Peran</th><th>Pasangan</th>
            <th class="r">Lot</th><th class="r">Kanban</th><th class="r">Las (mnt)</th>
            <th class="r">Idle (mnt)</th><th class="r">CT efektif</th><th class="r">UPH efektif</th>
          </tr></thead>
          <tbody>
            <tr v-for="(r, i) in pattern" :key="i">
              <td class="r">{{ r.urutan }}</td>
              <td class="mono">{{ r.part_number }}</td>
              <td>{{ r.op || '-' }}</td>
              <td><strong>{{ r.jig || '-' }}</strong></td>
              <td>{{ r.status_wip || '-' }}</td>
              <td>
                <span class="tag" :class="r.tandem_role === 'FOLLOW' ? 'tag-ok' : 'tag-warn'">
                  {{ r.tandem_role || '-' }}
                </span>
              </td>
              <td>{{ r.tandem_pair_jig || '-' }}</td>
              <td class="r">{{ r.lot_size }}</td>
              <td class="r">{{ r.jumlah_kanban }}</td>
              <td class="r">{{ n(r.weld_menit) }}</td>
              <td class="r" :class="num(r.idle_menit) > 0 ? 'warn' : 'ok'">{{ n(r.idle_menit) }}</td>
              <td class="r">{{ n(r.ct_efektif_detik) }}</td>
              <td class="r">{{ n(r.uph_efektif) }}</td>
            </tr>
            <tr v-if="!pattern.length">
              <td colspan="13" class="kosong">Belum ada pattern untuk shift ini.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="hint">
        Baris <strong>FOLLOW</strong> berarti jig-nya sudah di-loading operator selagi job
        sebelumnya masih dilas, jadi gun langsung lanjut tanpa menunggu. Idle hanya muncul
        kalau waktu loading lebih lama dari waktu las job sebelumnya, atau kalau job
        berurutan memakai jig yang sama sehingga tidak bisa ditandem.
      </p>
    </template>

    <template v-if="tandem.length">
      <h3>Hasil skema tandem</h3>
      <p class="hint">
        Total idle yang hilang berkat pairing:
        <strong>{{ n(tandem.reduce((s, t) => s + num(t.hemat_menit), 0)) }} menit</strong>
      </p>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr>
            <th>Robot</th><th>Pattern</th><th class="r">Job</th><th class="r">Las (mnt)</th>
            <th class="r">Loading (mnt)</th><th class="r">Idle sisa</th>
            <th class="r">Idle terhapus</th>
          </tr></thead>
          <tbody>
            <tr v-for="(t, i) in tandem" :key="i">
              <td class="mono">{{ String(t.machine) }}</td>
              <td>{{ t.pattern }}</td>
              <td class="r">{{ t.job }}</td>
              <td class="r">{{ n(t.weld_menit) }}</td>
              <td class="r">{{ n(t.loading_menit) }}</td>
              <td class="r warn">{{ n(t.idle_menit) }}</td>
              <td class="r ok">{{ n(t.hemat_menit) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pat-kendali { display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  margin-bottom: 10px; }
.pat-kendali label { font-weight: 600; }
.pat-kendali select { margin-left: 6px; padding: 3px 8px; border: 1px solid #9fb6c8; }
.pat-tab { display: flex; gap: 4px; }
.tab { border: 1px solid #d1d5db; background: #fff; border-radius: 7px;
  padding: 3px 14px; font-weight: 700; cursor: pointer; }
.tab-on { background: #1f4e79; border-color: #1f4e79; color: #fff; }
h3 { font-size: 13px; margin: 14px 0 6px; }
h3 small { font-weight: 400; color: #6b7280; }
.tbl-wrap { overflow-x: auto; }
.tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
.tbl th, .tbl td { border: 1px solid #9fb6c8; padding: 2px 6px; white-space: nowrap; }
.tbl th { background: #4f8fbd; color: #fff; font-weight: 700; text-align: center; }
.tbl td.r, .tbl th.r { text-align: right; font-variant-numeric: tabular-nums; }
.tbl tbody tr:nth-child(even) td { background: #f7fafc; }
.mono { font-family: ui-monospace, Menlo, Consolas, monospace; }
.ok { color: #1e7a3c; }
.warn { color: #8a6100; }
.bad { color: #c00000; }
.kosong { text-align: center; color: #9ca3af; }
.tag { padding: 1px 7px; border-radius: 9px; font-size: 10px; font-weight: 700; }
.tag-ok { background: #e6f4ea; color: #1e5c34; }
.tag-warn { background: #fdf3e7; color: #8a5a1d; }
.hint { font-size: 11px; color: #6b7280; font-style: italic; margin: 6px 0 12px; }
</style>
