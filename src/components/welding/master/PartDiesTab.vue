<template>
  <div class="pd-wrap">
    <div v-if="loading" class="pd-muted"><i class="mdi mdi-loading mdi-spin"></i> Memuat dies…</div>
    <div v-else-if="error" class="pd-muted pd-err">{{ error }}</div>
    <div v-else-if="!dies.length" class="pd-muted">Belum ada dies terhubung ke part ini. Hubungkan lewat menu QR Aset.</div>
    <table v-else class="wui-table">
      <thead><tr><th>Die</th><th>Proses</th><th>Line</th><th>Dimensi (P×L×T)</th></tr></thead>
      <tbody>
        <tr v-for="d in dies" :key="d.asset_code" :class="{ 'pd-off': !Number(d.is_active) }">
          <td class="nowrap"><strong>{{ d.die_no ? `${d.die_no}/${d.die_total}` : '—' }}</strong></td>
          <td><a class="pd-code" :href="scanHref(d.asset_code)" target="_blank" title="Buka halaman aset">{{ d.dies_name || d.dies_code }} <i class="mdi mdi-open-in-new"></i></a></td>
          <td class="nowrap">{{ d.line || '—' }}</td>
          <td class="nowrap">{{ d.dies_length || d.dies_width || d.dies_height ? `${d.dies_length || '?'} × ${d.dies_width || '?'} × ${d.dies_height || '?'}` : '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
// Tab "Dies" di detail part Master Data — dies press yang terhubung ke part ini (ms_press_dies_part).
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import assetQrService, { type PartDies } from '@/services/Public/Asset/assetQrService'

const props = defineProps<{ partNumber: string | null | undefined }>()
const router = useRouter()
const scanHref = (code: string) => router.resolve({ name: 'PublicAssetScan', params: { code } }).href

const dies = ref<PartDies[]>([])
const loading = ref(false)
const error = ref('')
watch(() => props.partNumber, async pn => {
  dies.value = []; error.value = ''
  if (!pn) return
  loading.value = true
  try { dies.value = await assetQrService.diesByPart(pn) }
  catch (e: any) { error.value = e?.response?.data?.message ?? 'Gagal memuat dies.' }
  finally { loading.value = false }
}, { immediate: true })
</script>

<style scoped>
.pd-wrap { overflow: auto; }
.pd-muted { padding: 16px; font-size: 12px; color: var(--wui-muted); }
.pd-err { color: var(--wui-danger); }
.pd-code { color: var(--wui-accent-text); font-weight: 700; text-decoration: none; }
.pd-code:hover { text-decoration: underline; }
.pd-off td { opacity: .55; }
</style>
