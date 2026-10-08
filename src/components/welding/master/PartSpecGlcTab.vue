<!-- components/welding/master/PartSpecGlcTab.vue
  Tab "GLC" di modal detail part (master-data.vue): hasil GLC (Generate Line
  Capacity) part ini di periode terbaru tiap area — mesin, jig, lot, pcs/hari,
  stroke, teiki, cycle time. Area GLC (mis. RSW) tak selalu sama dgn area master,
  jadi part dicari di periode terbaru SEMUA area. Read-only. -->
<template>
  <div class="sg">
    <div v-if="loading" class="sg-state"><i class="mdi mdi-loading mdi-spin"></i> Mencari part di GLC…</div>
    <div v-else-if="error" class="sg-state sg-state--err"><i class="mdi mdi-alert-circle-outline"></i> {{ error }}</div>
    <div v-else-if="!hits.length" class="sg-state">
      <i class="mdi mdi-calendar-blank-outline"></i>
      Part ini belum ada di GLC periode terbaru<template v-if="periodes.length"> ({{ periodes.map(p => `${p.area_code} ${p.periode}`).join(', ') }})</template>.
    </div>
    <template v-else>
      <section v-for="h in hits" :key="h.periode.id + h.part.machine + h.part.op" class="sg-card">
        <div class="sg-head">
          <p class="sg-title"><i class="mdi mdi-chart-gantt"></i> GLC {{ h.periode.area_code }} · {{ h.periode.periode }} <small>{{ h.periode.periode_type }}</small></p>
          <span class="sg-status" :class="`sg-status--${h.periode.status.toLowerCase()}`">{{ h.periode.status }}</span>
        </div>
        <div class="sg-grid">
          <div class="sg-cell sg-cell--hl"><span>Mesin</span><b>{{ h.part.machine }}</b></div>
          <div class="sg-cell"><span>OP</span><b>{{ h.part.op || '—' }}</b></div>
          <div class="sg-cell"><span>Jig</span><b>{{ h.part.jig || '—' }}</b></div>
          <div class="sg-cell"><span>Job</span><b>{{ h.part.job_no || '—' }}</b></div>
          <div class="sg-cell sg-cell--hl"><span>Pcs / hari</span><b>{{ fmt(h.part.pcs_day) }}</b></div>
          <div class="sg-cell"><span>Order periode</span><b>{{ fmt(h.part.order_periode) }}</b></div>
          <div class="sg-cell"><span>Stok IFPD</span><b>{{ fmt(h.part.stock_ifpd) }}</b></div>
          <div class="sg-cell"><span>Net order</span><b>{{ fmt(h.part.net_order) }}</b></div>
          <div class="sg-cell"><span>Lot size</span><b>{{ fmt(h.part.lot_size) }}</b></div>
          <div class="sg-cell"><span>Stroke / hari</span><b>{{ fmt(h.part.stroke_day) }}</b></div>
          <div class="sg-cell"><span>Teiki</span><b>{{ dec(h.part.teiki_jam) }} <small>jam</small></b></div>
          <div class="sg-cell"><span>Cycle time</span><b>{{ dec(h.part.cycle_time_sec) }} <small>dtk</small></b></div>
          <div class="sg-cell"><span>UPH</span><b>{{ fmt(h.part.uph) }}</b></div>
          <div class="sg-cell"><span>Spot</span><b>{{ fmt(h.part.spot) }}</b></div>
          <div class="sg-cell"><span>Qty kanban</span><b>{{ fmt(h.part.qty_kanban) }}</b></div>
          <div class="sg-cell"><span>Hari kerja cust.</span><b>{{ h.part.customer_wd ?? '—' }}</b></div>
        </div>
      </section>
      <p class="sg-note"><i class="mdi mdi-information-outline"></i> Sumber: menu GLC Welding, periode terbaru tiap area. Angka mengikuti hasil generate terakhir.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { fetchPeriodeList, fetchPart } from '@/services/PCD/Welding/Glc';
import type { GlcPart, GlcPeriode } from '@/types/PCD/Welding/Glc';

const props = defineProps<{ partNumber: string }>();

const loading = ref(false);
const error = ref<string | null>(null);
const periodes = ref<GlcPeriode[]>([]);
const hits = ref<{ periode: GlcPeriode; part: GlcPart }[]>([]);

// Hasil GLC per periode di-cache: buka banyak part berturut-turut cukup 1x ambil.
const partCache = new Map<number, Promise<GlcPart[]>>();
const partsOf = (id: number) => {
  if (!partCache.has(id)) partCache.set(id, fetchPart(id).then(r => r ?? []).catch(() => []));
  return partCache.get(id)!;
};

async function load(pn: string) {
  loading.value = true; error.value = null; hits.value = [];
  try {
    const list = (await fetchPeriodeList()) ?? [];
    // Periode terbaru per area (list sudah urut periode DESC).
    const latest = new Map<string, GlcPeriode>();
    for (const p of list) if (!latest.has(p.area_code)) latest.set(p.area_code, p);
    periodes.value = [...latest.values()];
    const found: { periode: GlcPeriode; part: GlcPart }[] = [];
    await Promise.all(periodes.value.map(async p => {
      for (const part of await partsOf(p.id)) {
        if (part.part_number?.toUpperCase() === pn.toUpperCase()) found.push({ periode: p, part });
      }
    }));
    if (pn === props.partNumber) hits.value = found;
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Gagal memuat data GLC.';
  } finally {
    loading.value = false;
  }
}
watch(() => props.partNumber, pn => { if (pn) load(pn); }, { immediate: true });

const fmt = (v: number | null | undefined) => (v == null ? '—' : Math.round(Number(v)).toLocaleString('id-ID'));
// Angka desimal (API kirim string mis. "44.000") → maks 2 desimal, format Indonesia.
const dec = (v: number | string | null | undefined) => (v == null || v === '' ? '—' : Number(v).toLocaleString('id-ID', { maximumFractionDigits: 2 }));
</script>

<style scoped>
.sg { display: flex; flex-direction: column; gap: 12px; padding: 16px 20px; }
.sg-state { padding: 40px 12px; text-align: center; color: var(--dm-muted, #64748b); font-size: 13px; line-height: 1.6; }
.sg-state .mdi { margin-right: 4px; }
.sg-state--err { color: var(--dm-on-red, #b91c1c); }
.sg-card { border: 1px solid var(--dm-border, #e3e8f2); border-radius: 12px; padding: 12px 14px; background: var(--dm-surface, #fff); }
.sg-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.sg-title { margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--dm-accent, #1e40af); display: flex; align-items: center; gap: 5px; }
.sg-title small { font-weight: 600; color: var(--dm-faint, #94a3b8); }
.sg-status { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: var(--dm-bg, #f1f5f9); color: var(--dm-text-2, #475569); }
.sg-status--active { background: var(--dm-tint-green, #dcfce7); color: var(--dm-on-green, #15803d); }
.sg-status--frozen { background: var(--dm-tint-blue, #e0f2fe); color: var(--dm-accent, #0369a1); }
.sg-status--draft { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #b45309); }
.sg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
.sg-cell { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: 8px; background: var(--dm-surface2, #f8fafc); border: 1px solid var(--dm-border, #eef2f7); }
.sg-cell span { font-size: 10.5px; color: var(--dm-muted, #64748b); }
.sg-cell b { font-size: 14px; color: var(--dm-text, #0f172a); font-variant-numeric: tabular-nums; }
.sg-cell b small { font-size: 10.5px; font-weight: 500; color: var(--dm-faint, #94a3b8); }
.sg-cell--hl { background: var(--dm-tint-blue, #eff6ff); border-color: var(--dm-bd-blue, #bfdbfe); }
.sg-cell--hl b { color: var(--dm-accent, #1d4ed8); }
.sg-note { margin: 0; font-size: 11px; color: var(--dm-faint, #94a3b8); display: flex; gap: 4px; }
</style>
