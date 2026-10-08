<!--
  Detail GLC Simulation Stamping.
    - Grafik beban per line press (klik batang = pilih line).
    - Line terpilih: grafik beban per mesin di line itu + daftar part-nya.
    - DRAFT: part bisa dipindah ke line lain / digeser mesin awalnya; grafik
      langsung dihitung ulang di browser, baru ditulis saat "Simpan".
    - Auto Balance: backend menyusun rencana pemindahan (uji kering), lalu
      diterapkan sebagai perubahan yang belum disimpan.
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue'
import GrafikBebanPress from '@/components/stamping/glc/GrafikBebanPress.vue'
import { useNotificationStore } from '@/stores/notification'
import {
  fetchAutoBalance, fetchDetail, updateHeader, updateLoad, updateStatus
} from '@/services/PCD/Stamping/GlcSimulation'
import { bebanLine, bebanMesin, formatPeriode, jamPart } from '@/utils/glcPressCalc'
import type {
  GlcPressBalance, GlcPressLine, GlcPressPart, GlcPressSimulation
} from '@/types/PCD/Stamping/GlcSimulation'

const route = useRoute()
const router = useRouter()
const notif = useNotificationStore()
const id = Number(route.params.id)

const breadcrumbs = [
  { title: 'Stamping', disabled: false, href: '#' },
  { title: 'GLC Simulation', disabled: false, href: '/Transaction/stamping/glc-press' },
  { title: 'Detail', disabled: true, href: '#' },
]

const header = ref<GlcPressSimulation | null>(null)
const lines = ref<GlcPressLine[]>([])
const parts = ref<GlcPressPart[]>([])
/** posisi tersimpan per part, pembanding untuk perubahan yang belum disimpan */
const asli = ref(new Map<number, { line_use: string; mesin_awal: number }>())
const loading = ref(false)
const menyimpan = ref(false)
const lineDipilih = ref<string | null>(null)
const cari = ref('')

const draft = computed(() => header.value?.status === 'DRAFT')
const downtime = computed(() => Number(header.value?.downtime_menit || 0))

const muat = async () => {
  loading.value = true
  try {
    const d = await fetchDetail(id)
    header.value = d.header
    lines.value = d.lines
    // MySQL mengirim angka sebagai string — samakan, id dipakai mencocokkan hasil auto balance.
    parts.value = d.parts.map(p => ({
      ...p,
      id: Number(p.id),
      mesin_awal: Number(p.mesin_awal), proses: Number(p.proses), gsph: Number(p.gsph),
      pcs_day: Number(p.pcs_day), stroke_day: Number(p.stroke_day),
      prod_min: Number(p.prod_min), dandori_min: Number(p.dandori_min),
    }))
    asli.value = new Map(parts.value.map(p => [p.id, { line_use: p.line_use, mesin_awal: p.mesin_awal }]))
    // Buka pertama kali di line terberat.
    if (!lineDipilih.value) lineDipilih.value = [...barLine.value].sort((a, b) => b.tpt - a.tpt)[0]?.label ?? null
  } catch (e: any) {
    notif.showAlertError(e.message)
  } finally {
    loading.value = false
  }
}
onMounted(muat)

// ------------------------------------------------------------- hitung
const barLine = computed(() => bebanLine(lines.value, parts.value, downtime.value))
const lineObj = computed(() => lines.value.find(l => l.line_id === lineDipilih.value)
  ?? (lineDipilih.value ? { line_id: lineDipilih.value, jumlah_mesin: 1 } : null))
const barMesin = computed(() => (lineObj.value ? bebanMesin(lineObj.value, parts.value, downtime.value) : []))

const perubahan = computed(() => parts.value.filter(p => {
  const a = asli.value.get(p.id)
  return a && (a.line_use !== p.line_use || a.mesin_awal !== p.mesin_awal)
}))
const lineBerubah = computed(() => [...new Set(perubahan.value.flatMap(p => [asli.value.get(p.id)!.line_use, p.line_use]))])

const tptMax = computed(() => Math.max(0, ...barLine.value.map(b => b.tpt)))
const lineOver = computed(() => barLine.value.filter(b => b.tpt > 21).length)

// ------------------------------------------------------------- tabel part
const semuaLine = ref(false)
const partTampil = computed(() => (semuaLine.value || !lineDipilih.value
  ? parts.value
  : parts.value.filter(p => p.line_use === lineDipilih.value)))

const headers = [
  { title: 'Part Number', key: 'part_number' },
  { title: 'Status', key: 'status_part', align: 'center' as const },
  { title: 'Proses', key: 'proses', align: 'center' as const },
  { title: 'Line Awal', key: 'line_prev', align: 'center' as const },
  { title: 'Line', key: 'line_use', align: 'center' as const, width: 110 },
  { title: 'Mesin', key: 'mesin_awal', align: 'center' as const, width: 150 },
  { title: 'Total (jam)', key: 'total', align: 'end' as const, value: (p: GlcPressPart) => jamPart(p) },
  { title: 'Produksi (jam)', key: 'prod_min', align: 'end' as const },
  { title: 'Dandori (jam)', key: 'dandori_min', align: 'end' as const },
  { title: 'GSPH', key: 'gsph', align: 'end' as const },
  { title: 'Pcs/Day', key: 'pcs_day', align: 'end' as const },
  { title: 'Stroke/Day', key: 'stroke_day', align: 'end' as const },
  { title: 'Pernah di Line', key: 'line_history', sortable: false },
]

/** Line yang mesinnya cukup untuk semua proses part. */
const opsiLine = (p: GlcPressPart) => lines.value
  .filter(l => l.jumlah_mesin >= p.proses || l.line_id === p.line_use)
  .map(l => l.line_id)

const jumlahMesin = (line: string) => lines.value.find(l => l.line_id === line)?.jumlah_mesin ?? 1

const opsiMesin = (p: GlcPressPart) => {
  const n = jumlahMesin(p.line_use)
  const maks = Math.max(1, n - p.proses + 1)
  return Array.from({ length: maks }, (_, i) => ({
    value: i + 1,
    title: p.proses > 1 ? `${p.line_use}-${i + 1} s/d ${p.line_use}-${Math.min(n, i + p.proses)}` : `${p.line_use}-${i + 1}`,
  }))
}

const gantiLine = (p: GlcPressPart, line: string) => {
  p.line_use = line
  p.mesin_awal = Math.min(p.mesin_awal, Math.max(1, jumlahMesin(line) - p.proses + 1))
}

const jam = (menit: number) => (Number(menit) / 60).toFixed(2)
const angka = (v: number) => Math.round(Number(v)).toLocaleString('id-ID')

// ------------------------------------------------------------- simpan
const batal = () => {
  parts.value.forEach(p => {
    const a = asli.value.get(p.id)
    if (a) { p.line_use = a.line_use; p.mesin_awal = a.mesin_awal }
  })
}

const simpan = async () => {
  menyimpan.value = true
  try {
    await updateLoad(id, perubahan.value.map(p => ({ id: p.id, line_use: p.line_use, mesin_awal: p.mesin_awal })))
    notif.showAlertSuccess(`${perubahan.value.length} part tersimpan`)
    await muat()
  } catch (e: any) {
    notif.showAlertError(e.message)
  } finally {
    menyimpan.value = false
  }
}

const simpanHeader = async (body: { note?: string | null; downtime_menit?: number }) => {
  try {
    await updateHeader(id, body)
    Object.assign(header.value!, body)
  } catch (e: any) {
    notif.showAlertError(e.message)
  }
}

const ubahStatus = () => {
  if (!header.value) return
  const ke = draft.value ? 'ACTIVE' : 'DRAFT'
  if (ke === 'ACTIVE' && perubahan.value.length) {
    notif.showAlertWarning('Simpan atau batalkan perubahan dulu sebelum mengaktifkan simulasi.')
    return
  }
  const msg = ke === 'ACTIVE'
    ? 'Jadikan simulasi ini ACTIVE? Simulasi ACTIVE lain di periode yang sama kembali ke DRAFT, dan simulasi ini terkunci.'
    : 'Kembalikan ke DRAFT supaya bisa diubah lagi?'
  notif.showConfirm('Ubah Status', msg, async () => {
    try {
      await updateStatus(id, ke)
      header.value!.status = ke
    } catch (e: any) {
      notif.showAlertError(e.message)
    }
  })
}

// ------------------------------------------------------------- auto balance
const dlgBalance = ref(false)
const target = ref(19)
const hanyaRiwayat = ref(true)
const balance = ref<GlcPressBalance | null>(null)
const loadingBalance = ref(false)

const bukaBalance = () => {
  balance.value = null
  dlgBalance.value = true
  hitungBalance()
}

const hitungBalance = async () => {
  loadingBalance.value = true
  try {
    balance.value = await fetchAutoBalance(id, target.value, hanyaRiwayat.value)
  } catch (e: any) {
    notif.showAlertError(e.message)
  } finally {
    loadingBalance.value = false
  }
}

const maks = (rows: { tpt: number }[] = []) => Math.max(0, ...rows.map(r => Number(r.tpt)))
const barSesudah = computed(() => (balance.value?.sesudah || []).map(s => ({ ...s, label: s.line })))
const lineMoves = computed(() => [...new Set((balance.value?.moves || []).flatMap(m => [m.dari, m.ke]))])

const terapkanBalance = () => {
  balance.value?.moves.forEach(m => {
    const p = parts.value.find(x => x.id === m.id)
    if (p) gantiLine(p, m.ke)
  })
  dlgBalance.value = false
  notif.showAlertSuccess(`${balance.value?.moves.length ?? 0} pemindahan diterapkan — klik Simpan untuk menyimpan.`)
}
</script>

<template>
  <div>
    <BaseBreadcrumb :title="header ? `GLC Press — ${formatPeriode(header.periode)}` : 'GLC Press'"
                    :breadcrumbs="breadcrumbs" class="mb-4" />

    <v-card class="kartu pa-4 mb-4">
      <div class="d-flex align-center flex-wrap ga-2">
        <v-btn icon="mdi-arrow-left" variant="text" size="small" @click="router.push('/Transaction/stamping/glc-press')" />
        <template v-if="header">
          <v-chip variant="flat" :color="draft ? 'grey' : 'success'" size="small">{{ header.status }}</v-chip>
          <v-chip variant="tonal" size="small" :color="header.source === 'PATAN' ? 'indigo' : 'teal'">
            {{ header.source === 'PATAN' ? 'Patan Schedule' : 'MDFO + Master Part' }}
          </v-chip>
          <v-chip variant="tonal" size="small">WD {{ header.working_day }}</v-chip>
          <v-chip variant="tonal" size="small">{{ parts.length }} part</v-chip>
          <v-chip variant="tonal" size="small" :color="tptMax > 21 ? 'error' : undefined">
            TPT tertinggi <strong class="ml-1">{{ tptMax.toFixed(2) }}</strong>&nbsp;jam
          </v-chip>
          <v-chip v-if="lineOver" variant="flat" size="small" color="error">{{ lineOver }} line &gt; 21 jam</v-chip>
        </template>
        <v-spacer />
        <v-btn variant="outlined" size="small" prepend-icon="mdi-refresh" :loading="loading" @click="muat">Muat Ulang</v-btn>
        <v-btn v-if="header" variant="outlined" size="small" :color="draft ? 'success' : undefined"
               :prepend-icon="draft ? 'mdi-check-decagram-outline' : 'mdi-pencil-lock-outline'" @click="ubahStatus">
          {{ draft ? 'Jadikan ACTIVE' : 'Kembali ke DRAFT' }}
        </v-btn>
      </div>

      <v-row v-if="header" dense class="mt-3">
        <v-col cols="12" md="6">
          <v-text-field :model-value="header.note" label="Note" density="compact" variant="outlined" hide-details
                        :readonly="!draft" @change="(e: any) => simpanHeader({ note: e.target.value })" />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field :model-value="header.downtime_menit" type="number" min="0" label="Downtime (menit/line/hari)"
                        density="compact" variant="outlined" hide-details :readonly="!draft"
                        @change="(e: any) => simpanHeader({ downtime_menit: Number(e.target.value) || 0 })" />
        </v-col>
        <v-col v-if="header.source === 'MDFO'" cols="6" md="3" class="d-flex align-center text-caption text-medium-emphasis">
          Dandori {{ Number(header.dandori_menit) }} menit × {{ Number(header.dandori_freq) }}/hari per part
        </v-col>
      </v-row>
    </v-card>

    <!-- perubahan belum disimpan -->
    <v-alert v-if="perubahan.length" type="warning" variant="tonal" density="compact" class="mb-4">
      <div class="d-flex align-center flex-wrap ga-2">
        <span><strong>{{ perubahan.length }}</strong> part dipindah, belum disimpan
          (line {{ lineBerubah.join(', ') }}).</span>
        <v-spacer />
        <v-btn size="small" variant="text" @click="batal">Batalkan</v-btn>
        <v-btn size="small" color="primary" variant="flat" :loading="menyimpan" @click="simpan">Simpan</v-btn>
      </div>
    </v-alert>

    <v-card class="kartu pa-4 mb-4">
      <div class="d-flex align-center mb-2">
        <div>
          <div class="text-subtitle-1 font-weight-bold text-primary">Beban per Line Press</div>
          <div class="text-caption text-medium-emphasis">Klik batang untuk melihat mesin & part di line tersebut.</div>
        </div>
        <v-spacer />
        <v-tooltip :disabled="!perubahan.length" text="Simpan / batalkan perubahan dulu — auto balance membaca data tersimpan">
          <template #activator="{ props: tp }">
            <span v-bind="tp">
              <v-btn v-if="draft" color="primary" variant="flat" size="small" prepend-icon="mdi-scale-balance"
                     :disabled="!!perubahan.length" @click="bukaBalance">Auto Balance</v-btn>
            </span>
          </template>
        </v-tooltip>
      </div>
      <v-skeleton-loader v-if="loading && !parts.length" type="image" height="380" />
      <GrafikBebanPress v-else :data="barLine" dengan-mesin bisa-klik
                        :sorot="lineDipilih ? [lineDipilih, ...lineBerubah] : lineBerubah"
                        @pilih="(l) => (lineDipilih = l)" />
    </v-card>

    <v-card v-if="lineObj" class="kartu pa-4 mb-4">
      <div class="d-flex align-center flex-wrap ga-2 mb-2">
        <div class="text-subtitle-1 font-weight-bold text-primary">
          Line {{ lineObj.line_id }} — {{ lineObj.jumlah_mesin }} mesin
        </div>
        <v-chip-group v-model="lineDipilih" mandatory selected-class="text-primary" class="ml-2">
          <v-chip v-for="l in lines" :key="l.line_id" :value="l.line_id" size="small" variant="outlined" filter>
            {{ l.line_id }}
          </v-chip>
        </v-chip-group>
      </div>
      <div class="text-caption text-medium-emphasis mb-2">
        Asumsi tandem: part dengan N proses memakai N mesin berurutan mulai dari kolom "Mesin".
      </div>
      <GrafikBebanPress :data="barMesin" :tinggi="300" />
    </v-card>

    <v-card class="kartu pa-4">
      <div class="d-flex align-center flex-wrap ga-3 mb-2">
        <div class="text-subtitle-1 font-weight-bold text-primary">
          Part {{ semuaLine || !lineDipilih ? 'Semua Line' : `Line ${lineDipilih}` }}
          <span class="text-caption text-medium-emphasis">({{ partTampil.length }})</span>
        </div>
        <v-spacer />
        <v-switch v-model="semuaLine" label="Semua line" density="compact" hide-details color="primary" />
        <v-text-field v-model="cari" prepend-inner-icon="mdi-magnify" placeholder="Cari part" density="compact"
                      variant="outlined" hide-details style="max-width: 240px" />
      </div>

      <v-data-table :headers="headers" :items="partTampil" :search="cari" density="compact"
                    :items-per-page="25" :sort-by="[{ key: 'total', order: 'desc' }]" class="tabel-part">
        <template #item.part_number="{ item }">
          <div class="font-weight-bold">{{ item.part_number }}</div>
          <div v-if="item.part_lh" class="text-caption text-medium-emphasis">LH {{ item.part_lh }}</div>
        </template>
        <template #item.gsph="{ item }">{{ angka(item.gsph) }}</template>
        <template #item.pcs_day="{ item }">{{ angka(item.pcs_day) }}</template>
        <template #item.stroke_day="{ item }">{{ angka(item.stroke_day) }}</template>
        <template #item.prod_min="{ item }">{{ jam(item.prod_min) }}</template>
        <template #item.dandori_min="{ item }">{{ jam(item.dandori_min) }}</template>
        <template #item.total="{ item }"><strong>{{ jamPart(item).toFixed(2) }}</strong></template>
        <template #item.line_use="{ item }">
          <v-select :model-value="item.line_use" :items="opsiLine(item)" density="compact" variant="outlined"
                    hide-details :disabled="!draft"
                    :class="{ pindah: item.line_use !== item.line_prev }"
                    @update:model-value="(v: string) => gantiLine(item, v)" />
        </template>
        <template #item.mesin_awal="{ item }">
          <v-select v-model="item.mesin_awal" :items="opsiMesin(item)" density="compact" variant="outlined"
                    hide-details :disabled="!draft || opsiMesin(item).length < 2" />
        </template>
        <template #item.line_history="{ item }">
          <v-chip v-for="l in item.line_history" :key="l" size="x-small" class="mr-1"
                  :color="l === item.line_use ? 'primary' : undefined" variant="tonal">{{ l }}</v-chip>
          <span v-if="!item.line_history.length" class="text-caption text-medium-emphasis">-</span>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dlgBalance" max-width="1200" scrollable>
      <v-card class="kartu">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon color="primary" class="mr-2">mdi-scale-balance</v-icon>Auto Balance
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="dlgBalance = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <div class="d-flex align-center flex-wrap ga-3 mb-3">
            <v-select v-model="target" :items="[16, 19, 21]" label="Target TPT maks (jam)" density="compact"
                      variant="outlined" hide-details style="max-width: 200px" @update:model-value="hitungBalance" />
            <v-switch v-model="hanyaRiwayat" label="Hanya ke line yang pernah menjalankan part"
                      density="compact" hide-details color="primary" @update:model-value="hitungBalance" />
            <v-progress-circular v-if="loadingBalance" indeterminate size="20" width="2" color="primary" />
          </div>
          <template v-if="balance">
            <div class="d-flex ga-2 mb-3">
              <v-chip variant="tonal">TPT tertinggi sebelum <strong class="ml-1">{{ maks(balance.sebelum).toFixed(2) }}</strong></v-chip>
              <v-chip variant="tonal" color="success">sesudah <strong class="ml-1">{{ maks(balance.sesudah).toFixed(2) }}</strong></v-chip>
              <v-chip variant="tonal">{{ balance.moves.length }} pemindahan</v-chip>
            </div>
            <div class="kanvas mb-3">
              <GrafikBebanPress :data="barSesudah" dengan-mesin :sorot="lineMoves" :tinggi="300" />
            </div>
            <v-table v-if="balance.moves.length" density="compact">
              <thead>
                <tr><th>Part</th><th class="text-center">Proses</th><th class="text-center">Dari</th>
                  <th class="text-center">Ke</th><th class="text-end">Jam/hari</th></tr>
              </thead>
              <tbody>
                <tr v-for="m in balance.moves" :key="m.id">
                  <td>{{ m.part_number }}<span v-if="m.part_lh" class="text-medium-emphasis"> / {{ m.part_lh }}</span></td>
                  <td class="text-center">{{ m.proses }}</td>
                  <td class="text-center"><v-chip size="x-small" color="error" variant="tonal">{{ m.dari }}</v-chip></td>
                  <td class="text-center"><v-chip size="x-small" color="success" variant="tonal">{{ m.ke }}</v-chip></td>
                  <td class="text-end">{{ m.jam.toFixed(2) }}</td>
                </tr>
              </tbody>
            </v-table>
            <v-alert v-else type="info" variant="tonal" density="compact">
              Tidak ada pemindahan yang bisa menurunkan beban di bawah {{ target }} jam dengan batasan ini.
            </v-alert>
          </template>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="dlgBalance = false">Tutup</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!balance?.moves.length" @click="terapkanBalance">
            Terapkan
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.kartu { border-radius: 12px !important; border: 1px solid #e5e7eb; }
.kanvas { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background: #fff; }
.tabel-part :deep(td) { white-space: nowrap; }
.pindah :deep(.v-field) { background: #fff8e1; }
</style>
