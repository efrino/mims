<!--
  Wadah dua tab untuk Sub Assy Robot Spot.

  Sebelumnya keduanya jadi dua menu terpisah, padahal saling bergantung: PATAN
  membaca hasil GLC, dan GLC menentukan part mana ada di robot mana. Dijadikan
  satu halaman supaya perpindahannya tidak kehilangan konteks.

    GLC Sub Assy - beban tiap robot: tiga grafik (current, after balancing,
                   round up), master part dan robotnya, serta pemilihan periode
                   order. Periode yang sudah lewat dibekukan.
    PATAN        - skema bagaimana part diproduksi dengan pattern A/B/C/D supaya
                   keluarannya memenuhi target delivery, safety stock, dan UPH.

  Isi tiap tab sengaja tetap di berkasnya masing-masing; di sini hanya
  perpindahannya. Keduanya dibungkus keep-alive supaya pindah tab tidak
  memuat ulang data dari awal.
-->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GlcRobot from './glc-robot.vue'
import Patan from './glc-uji-skema.vue'

const route = useRoute()
const router = useRouter()

/** Tab aktif ikut alamat, supaya bisa ditautkan dan tidak hilang saat dimuat ulang. */
const tab = ref<'glc' | 'patan'>(route.query.tab === 'patan' ? 'patan' : 'glc')

watch(tab, (t) => {
  router.replace({ query: { ...route.query, tab: t } })
})
</script>

<template>
  <div class="wadah">
    <v-tabs v-model="tab" class="tab-utama" density="comfortable">
      <v-tab value="glc">
        <v-icon start size="18">mdi-chart-bar-stacked</v-icon>
        GLC Sub Assy
      </v-tab>
      <v-tab value="patan">
        <v-icon start size="18">mdi-view-grid-outline</v-icon>
        PATAN
      </v-tab>
    </v-tabs>

    <p class="ket">
      <template v-if="tab === 'glc'">
        Beban tiap robot untuk periode terpilih: grafik keadaan sekarang, sesudah balancing,
        dan sesudah round up, beserta master part dan robotnya. Periode yang sudah lewat
        dibekukan &mdash; datanya maupun grafiknya tidak berubah lagi.
      </template>
      <template v-else>
        Skema produksi tiap part dengan pattern A/B/C/D, disusun supaya keluarannya memenuhi
        target delivery, safety stock, dan UPH. PATAN mengikuti GLC after balancing kalau
        rencananya sudah disetujui; kalau belum, memakai GLC current.
      </template>
    </p>

    <v-window v-model="tab" class="isi">
      <v-window-item value="glc">
        <keep-alive><GlcRobot v-if="tab === 'glc'" /></keep-alive>
      </v-window-item>
      <v-window-item value="patan">
        <keep-alive><Patan v-if="tab === 'patan'" /></keep-alive>
      </v-window-item>
    </v-window>
  </div>
</template>

<style scoped>
.wadah { padding: 0; }
.tab-utama { border-bottom: 2px solid #e5e7eb; margin-bottom: 4px; }
.tab-utama :deep(.v-tab) { font-weight: 700; letter-spacing: .2px; }
.ket {
  font-size: 12px; color: #6b7280; font-style: italic;
  margin: 0 0 10px; max-width: 1100px; line-height: 1.5;
}
.isi :deep(.v-window__container) { overflow: visible; }
</style>
