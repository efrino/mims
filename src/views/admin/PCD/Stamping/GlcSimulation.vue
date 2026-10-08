<!--
  GLC Simulation Stamping — tiruan GLC Simulation welding untuk line press.
  Daftar simulasi per periode + dialog pembuatan dengan saklar sumber data:
    PATAN : jadwal patan press periode itu (ms_patan_mdfo_schedule)
    MDFO  : order MDFO + master part press (master_mdfo)
  Line & jumlah mesin dari master machine press.
-->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue'
import GrafikBebanPress from '@/components/stamping/glc/GrafikBebanPress.vue'
import { useNotificationStore } from '@/stores/notification'
import {
  deleteSimulation, fetchDefaults, fetchSimulationList, fetchSourcePreview, storeSimulation, updateStatus
} from '@/services/PCD/Stamping/GlcSimulation'
import { formatPeriode } from '@/utils/glcPressCalc'
import type {
  GlcPressSimulation, GlcPressSource, GlcPressSourcePreview, GlcPressStatus
} from '@/types/PCD/Stamping/GlcSimulation'

const page = { title: 'GLC Simulation Stamping' }
const breadcrumbs = [
  { title: 'Stamping', disabled: false, href: '#' },
  { title: 'Transaction', disabled: false, href: '#' },
  { title: 'GLC Simulation', disabled: true, href: '#' },
]

const router = useRouter()
const notif = useNotificationStore()

const bulanIni = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const keYm = (v: string) => v.replace('-', '')

// ------------------------------------------------------------------ daftar
const list = ref<GlcPressSimulation[]>([])
const loading = ref(false)
const filterPeriode = ref('')
const cari = ref('')

const muat = async () => {
  loading.value = true
  try {
    list.value = await fetchSimulationList(filterPeriode.value ? keYm(filterPeriode.value) : undefined)
  } catch (e: any) {
    notif.showAlertError(e.message)
  } finally {
    loading.value = false
  }
}
watch(filterPeriode, muat)
onMounted(muat)

const headers = [
  { title: 'Periode', key: 'periode', align: 'center' as const },
  { title: 'Note', key: 'note' },
  { title: 'Sumber', key: 'source', align: 'center' as const },
  { title: 'Part', key: 'total_part', align: 'end' as const },
  { title: 'WD', key: 'working_day', align: 'end' as const },
  { title: 'Status', key: 'status', align: 'center' as const },
  { title: 'Dibuat', key: 'created_at', align: 'center' as const },
  { title: '', key: 'aksi', align: 'center' as const, sortable: false },
]

const bukaDetail = (id: number) => router.push(`/Transaction/stamping/glc-press/detail/${id}`)

const ubahStatus = (s: GlcPressSimulation, status: GlcPressStatus) => {
  const msg = status === 'ACTIVE'
    ? `Jadikan simulasi ini ACTIVE untuk ${formatPeriode(s.periode)}? Simulasi ACTIVE lain di periode yang sama kembali ke DRAFT.`
    : 'Kembalikan simulasi ini ke DRAFT supaya bisa diubah lagi?'
  notif.showConfirm('Ubah Status', msg, async () => {
    try {
      await updateStatus(s.id, status)
      await muat()
    } catch (e: any) {
      notif.showAlertError(e.message)
    }
  })
}

const hapus = (s: GlcPressSimulation) => {
  notif.showConfirm('Hapus Simulasi', `Hapus simulasi ${formatPeriode(s.periode)} "${s.note || '-'}"?`, async () => {
    try {
      await deleteSimulation(s.id)
      await muat()
    } catch (e: any) {
      notif.showAlertError(e.message)
    }
  })
}

// ------------------------------------------------------------ buat baru
const dialog = ref(false)
const form = ref({
  periode: bulanIni(),
  source: 'PATAN' as GlcPressSource,
  working_day: 20,
  dandori_menit: 10,
  dandori_freq: 1,
  downtime_menit: 0,
  note: '',
})
const preview = ref<GlcPressSourcePreview | null>(null)
const loadingPreview = ref(false)
const menyimpan = ref(false)

const param = computed(() => ({ ...form.value, periode: keYm(form.value.periode) }))

// Default form dari backend (PCD › Auto › Params GLC Press); nilai di `form` = cadangan.
const bukaDialog = async () => {
  preview.value = null
  dialog.value = true
  try {
    const d = await fetchDefaults()
    Object.assign(form.value, {
      working_day: Number(d.working_day), dandori_menit: Number(d.dandori_menit),
      dandori_freq: Number(d.dandori_freq), downtime_menit: Number(d.downtime_menit),
    })
  } catch { /* tetap pakai cadangan */ }
  muatPreview()
}

const muatPreview = async () => {
  if (!form.value.periode) return
  loadingPreview.value = true
  try {
    preview.value = await fetchSourcePreview(param.value)
  } catch (e: any) {
    preview.value = null
    notif.showAlertError(e.message)
  } finally {
    loadingPreview.value = false
  }
}

// Pratinjau ikut berubah saat saklar/parameter diganti.
let tunda: ReturnType<typeof setTimeout> | undefined
watch(form, () => {
  if (!dialog.value) return
  clearTimeout(tunda)
  tunda = setTimeout(muatPreview, 400)
}, { deep: true })

const barPreview = computed(() => (preview.value?.summary || []).map(s => ({ ...s, label: s.line })))

const simpan = async () => {
  menyimpan.value = true
  try {
    const id = await storeSimulation(param.value)
    dialog.value = false
    bukaDetail(id)
  } catch (e: any) {
    notif.showAlertError(e.message)
  } finally {
    menyimpan.value = false
  }
}
</script>

<template>
  <div>
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-4" />

    <v-card class="kartu pa-4">
      <div class="d-flex align-center flex-wrap ga-3 mb-3">
        <div>
          <div class="text-h6 font-weight-bold text-primary">Daftar Simulasi GLC Press</div>
          <div class="text-caption text-medium-emphasis">
            Beban tiap line press (jam/hari) — line & jumlah mesin dari master machine press.
          </div>
        </div>
        <v-spacer />
        <v-text-field v-model="filterPeriode" type="month" label="Periode" density="compact"
                      variant="outlined" hide-details clearable style="max-width: 190px" />
        <v-text-field v-model="cari" prepend-inner-icon="mdi-magnify" placeholder="Cari note / pembuat"
                      density="compact" variant="outlined" hide-details style="max-width: 240px" />
        <v-btn color="primary" prepend-icon="mdi-plus" @click="bukaDialog">Buat Simulasi</v-btn>
      </div>

      <v-data-table :headers="headers" :items="list" :loading="loading" :search="cari"
                    density="comfortable" hover class="tabel"
                    @click:row="(_: any, r: any) => bukaDetail(r.item.id)">
        <template #item.periode="{ item }">
          <strong>{{ formatPeriode(item.periode) }}</strong>
        </template>
        <template #item.note="{ item }">{{ item.note || '-' }}</template>
        <template #item.source="{ item }">
          <v-chip size="small" variant="tonal" :color="item.source === 'PATAN' ? 'indigo' : 'teal'">
            {{ item.source === 'PATAN' ? 'Patan Schedule' : 'MDFO + Master' }}
          </v-chip>
        </template>
        <template #item.status="{ item }">
          <v-chip size="small" variant="flat" :color="item.status === 'ACTIVE' ? 'success' : 'grey'">
            {{ item.status }}
          </v-chip>
        </template>
        <template #item.created_at="{ item }">
          <div class="text-caption">{{ item.created_at }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.created_by }}</div>
        </template>
        <template #item.aksi="{ item }">
          <div class="d-flex justify-center ga-1" @click.stop>
            <v-btn icon="mdi-eye-outline" size="small" variant="text" color="primary"
                   @click="bukaDetail(item.id)" />
            <v-btn v-if="item.status === 'DRAFT'" icon="mdi-check-decagram-outline" size="small"
                   variant="text" color="success" @click="ubahStatus(item, 'ACTIVE')" />
            <v-btn v-else icon="mdi-pencil-lock-outline" size="small" variant="text"
                   @click="ubahStatus(item, 'DRAFT')" />
            <v-btn :disabled="item.status !== 'DRAFT'" icon="mdi-delete-outline" size="small"
                   variant="text" color="error" @click="hapus(item)" />
          </div>
        </template>
        <template #no-data>
          <div class="py-6 text-medium-emphasis">Belum ada simulasi. Klik <strong>Buat Simulasi</strong>.</div>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="1200" scrollable>
      <v-card class="kartu">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon color="primary" class="mr-2">mdi-chart-bar-stacked</v-icon>Buat Simulasi GLC Press
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="dialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-row dense>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.periode" type="month" label="Periode" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" md="5">
              <div class="text-caption text-medium-emphasis mb-1">Sumber data</div>
              <v-btn-toggle v-model="form.source" mandatory color="primary" variant="outlined" density="compact" divided>
                <v-btn value="PATAN" prepend-icon="mdi-calendar-clock">Patan Schedule</v-btn>
                <v-btn value="MDFO" prepend-icon="mdi-file-table-outline">MDFO + Master Part</v-btn>
              </v-btn-toggle>
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.note" label="Note" density="compact" variant="outlined" />
            </v-col>
          </v-row>

          <v-alert density="compact" variant="tonal" :color="form.source === 'PATAN' ? 'indigo' : 'teal'" class="mb-3 text-body-2">
            <template v-if="form.source === 'PATAN'">
              Jam produksi (TPT) & dandori diambil dari jadwal patan press periode ini, dibagi jumlah
              hari yang terjadwal. Working day mengikuti data patan.
            </template>
            <template v-else>
              Qty bulanan dari order MDFO periode ini (kalau ada), selain itu dari master part press;
              jam produksi = pcs/day ÷ GSPH. Dandori = menit × frekuensi per hari per part.
            </template>
          </v-alert>

          <v-row dense>
            <v-col v-if="form.source === 'MDFO'" cols="6" md="3">
              <v-text-field v-model.number="form.working_day" type="number" min="1" label="Working day / bulan"
                            density="compact" variant="outlined" />
            </v-col>
            <v-col v-if="form.source === 'MDFO'" cols="6" md="3">
              <v-text-field v-model.number="form.dandori_menit" type="number" min="0" label="Dandori (menit / kali)"
                            density="compact" variant="outlined" />
            </v-col>
            <v-col v-if="form.source === 'MDFO'" cols="6" md="3">
              <v-text-field v-model.number="form.dandori_freq" type="number" min="0" step="0.1"
                            label="Frekuensi dandori / hari" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field v-model.number="form.downtime_menit" type="number" min="0"
                            label="Downtime (menit / line / hari)" density="compact" variant="outlined" />
            </v-col>
          </v-row>

          <div class="d-flex align-center ga-2 mb-2">
            <div class="text-subtitle-2 font-weight-bold">Pratinjau beban per line</div>
            <v-chip v-if="preview" size="small" variant="tonal">{{ preview.total_part }} part</v-chip>
            <v-chip v-if="preview" size="small" variant="tonal">WD {{ preview.working_day }}</v-chip>
            <v-progress-circular v-if="loadingPreview" indeterminate size="18" width="2" color="primary" />
          </div>
          <div class="kanvas">
            <GrafikBebanPress v-if="preview && preview.total_part" :data="barPreview" dengan-mesin :tinggi="300" />
            <div v-else-if="!loadingPreview" class="text-center py-10 text-medium-emphasis">
              Tidak ada data untuk periode & sumber ini.
            </div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Batal</v-btn>
          <v-btn color="primary" variant="flat" :loading="menyimpan"
                 :disabled="!preview || !preview.total_part || loadingPreview" @click="simpan">
            Simpan & Buka
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.kartu { border-radius: 12px !important; border: 1px solid #e5e7eb; }
.tabel :deep(tbody tr) { cursor: pointer; }
.kanvas { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background: #fff; min-height: 120px; }
</style>
