<!-- components/welding/master/MajaChat.vue
  Chat "Tanya MAJA" (AI agent read-only, docs/prd/ai-agent-master-data.md).
  Dipakai di 2 tempat: panel Info Cepat per part (partNumber terisi) & asisten umum
  di halaman Master Data (partNumber = null). Angka & grafik dari tool backend.

  Sengaja 2 elemen root (.ec-chat + .ec-footer) supaya induk bisa menata letaknya
  (mis. grid 2 kolom PartInsightPanel). Scroll: kolom chat sendiri kalau bisa
  di-scroll, kalau tidak → ancestor bertanda [data-maja-scroll]. -->
<template>
  <section v-if="enabled" ref="chatRef" class="ec-chat">
    <div class="ec-divider"><span><i class="mdi mdi-robot-outline"></i> Tanya MAJA</span></div>
    <div v-if="!chat.length" class="ec-chips">
      <button v-for="s in suggestions" :key="s.q" type="button" class="ec-chip" :disabled="!online || asking" @click="ask(s.q)">
        <i class="mdi" :class="s.icon"></i> {{ s.q }}
      </button>
    </div>
    <div v-for="(c, i) in chat" :key="i" class="ec-row" :class="`ec-row--${c.role}`">
      <span v-if="c.role === 'assistant'" class="ec-avatar" title="MAJA — asisten AI Mekar Armada Jaya"><i class="mdi mdi-robot-happy-outline"></i></span>
      <div class="ec-msg" :class="[`ec-msg--${c.role}`, { 'ec-msg--chart': c.charts?.length || c.tables?.length }]">
        <div v-if="c.role === 'assistant'" class="ec-md" v-html="miniMarkdown(c.content)"></div>
        <p v-else class="ec-text">{{ c.content }}</p>
        <MajaTable v-for="(t, k) in c.tables" :key="'t' + k" :table="t" :part-link="partLink" @open-part="pn => emit('open-part', pn)" />
        <div v-for="(ch, k) in c.charts" :key="k" class="ec-chart">
          <p class="ec-chart-title">{{ ch.title }}</p>
          <apexchart type="line" height="230" :options="chartOptions(ch)" :series="chartSeries(ch)" />
          <p v-if="ch.note" class="ec-chart-note"><i class="mdi mdi-information-outline"></i> {{ ch.note }}</p>
        </div>
        <div v-if="c.options?.length" class="ec-opts">
          <button v-for="o in c.options" :key="o.q" type="button" class="ec-opt" :class="{ 'ec-opt--slow': o.hint }" :disabled="!online || asking" :title="o.hint" @click="ask(o.q)">
            {{ o.label }}<small v-if="o.hint"> · {{ o.hint }}</small>
          </button>
        </div>
        <div v-if="c.role === 'assistant' && c.ms != null" class="ec-meta">
          <span class="ec-time" :class="timeClass(c.ms)" title="Waktu respons (dari kirim sampai jawaban tampil)"><i class="mdi mdi-timer-outline"></i> {{ fmtSec(c.ms) }}</span>
        </div>
        <details v-if="c.sources?.length" class="ec-src">
          <summary><i class="mdi mdi-database-search-outline"></i> {{ c.sources.length }} sumber data</summary>
          <ul><li v-for="(s, j) in c.sources" :key="j"><strong>{{ TOOL_LABEL[s.tool] ?? s.tool }}</strong> <span class="font-mono">{{ fmtArgs(s.args) }}</span></li></ul>
        </details>
      </div>
    </div>
    <div v-if="asking" class="ec-row ec-row--assistant">
      <span class="ec-avatar"><i class="mdi mdi-robot-happy-outline"></i></span>
      <div class="ec-msg ec-msg--assistant ec-typing"><span></span><span></span><span></span><small>MAJA sedang membaca data…</small></div>
    </div>
  </section>

  <footer v-if="enabled" class="ec-footer">
    <div v-if="online" class="ec-inputbox">
      <input v-model="question" class="ec-input" :placeholder="placeholder" maxlength="500" :disabled="asking" @keydown.enter.prevent="ask(question)" />
      <button class="ec-send" :disabled="asking || !question.trim()" title="Kirim" @click="ask(question)"><i class="mdi mdi-send"></i></button>
    </div>
    <span v-else class="ec-offline"><i class="mdi mdi-robot-off-outline"></i> MAJA (AI) sedang tidak tersedia.</span>
  </footer>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import masterService from '@/services/Public/Welding/masterService';
import { miniMarkdown } from '@/utils/miniMarkdown';
import MajaTable from './MajaTable.vue';
import type { AiChart, AiChatMessage } from '@/types/Public/Welding/master';

const props = withDefaults(defineProps<{
  partNumber: string | null;
  suggestions: { q: string; icon: string }[];
  placeholder?: string;
  partLink?: boolean;   // nomor part di tabel bisa diklik (induk menangani event open-part)
}>(), { placeholder: 'Tanya MAJA…', partLink: false });
const emit = defineEmits<{ (e: 'availability', enabled: boolean): void; (e: 'open-part', partNumber: string): void }>();

const TOOL_LABEL: Record<string, string> = {
  get_part: 'Data part', get_orders: 'DN per customer', get_production: 'Plan & actual',
  get_stock: 'Stok & safety', get_bom: 'BOM', search_parts: 'Cari part',
  get_trend: 'Tren & prediksi', get_analysis: 'Analisis', list_alerts: 'Daftar part bermasalah', top_dn: 'Order / DN per hari',
};

const chatRef = ref<HTMLElement | null>(null);
const chat = ref<AiChatMessage[]>([]);
const question = ref('');
const asking = ref(false);
const online = ref(false);
const enabled = ref(false);   // akun boleh Tanya MAJA (config ai_enabled / ai_users)

const nf = new Intl.NumberFormat('id-ID');
// Waktu respons: < 10 dtk hijau, < 40 dtk kuning, lebih lama merah.
const fmtSec = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} dtk`);
const timeClass = (ms: number) => (ms < 10000 ? 'ec-time--fast' : ms < 40000 ? 'ec-time--mid' : 'ec-time--slow');
const fmtArgs = (a: Record<string, unknown>) => Object.values(a).filter(v => v !== '' && v != null).join(' · ');

// Grafik tren: MDFO & DN = kolom berdampingan, produksi aktual = garis, proyeksi = titik oranye.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const shortMonth = (c: string) => {
  const m = /^(\d{4})-(\d{2})/.exec(c);
  return m ? `${MONTHS[+m[2] - 1]} ${m[1].slice(2)}${c.includes('prediksi') ? ' ▸' : ''}` : c;
};
const SERIES_TYPE = ['column', 'column', 'line', 'scatter'];
const chartSeries = (ch: AiChart) => ch.series.map((s, i) => ({ ...s, type: SERIES_TYPE[i] ?? 'line' }));
function chartOptions(ch: AiChart) {
  return {
    chart: { toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit', animations: { speed: 350 }, parentHeightOffset: 0 },
    colors: ['#2e5396', '#d7263d', '#16a34a', '#f59e0b'],
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 3 } },
    stroke: { width: [0, 0, 3, 0], curve: 'smooth' },
    markers: { size: [0, 0, 4, 8], strokeWidth: 2, strokeColors: '#fff', hover: { sizeOffset: 2 } },
    dataLabels: { enabled: false },
    grid: { borderColor: '#eef2f7', strokeDashArray: 4, padding: { left: 4, right: 8 } },
    xaxis: { categories: ch.categories.map(shortMonth), labels: { rotate: 0, style: { fontSize: '10px', colors: '#64748b' } }, axisTicks: { show: false } },
    yaxis: { min: 0, forceNiceScale: true, tickAmount: 4, labels: { style: { fontSize: '10px', colors: '#94a3b8' }, formatter: (v: number) => (v == null ? '' : v >= 1000 ? (v / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + 'rb' : String(Math.round(v))) } },
    legend: { fontSize: '10.5px', position: 'top', horizontalAlign: 'left', markers: { size: 5 }, itemMargin: { horizontal: 6, vertical: 0 } },
    tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => (v == null ? '—' : nf.format(v) + ' pcs') } },
  };
}

const scrollBottom = () => nextTick(() => {
  const own = chatRef.value;
  const el = own && own.scrollHeight > own.clientHeight + 1 ? own : own?.closest<HTMLElement>('[data-maja-scroll]');
  el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
});

async function ask(q: string) {
  const text = q.trim();
  if (!text || asking.value) return;
  const history = chat.value.map(({ role, content }) => ({ role, content }));
  chat.value.push({ role: 'user', content: text });
  question.value = '';
  asking.value = true;
  const t0 = Date.now();
  scrollBottom();
  try {
    const r = await masterService.aiChat(text, props.partNumber, history);
    chat.value.push({ role: 'assistant', content: r.answer || '(tidak ada jawaban)', sources: r.sources, charts: r.charts, tables: r.tables, options: r.options, ms: Date.now() - t0 });
  } catch (e: any) {
    chat.value.push({ role: 'assistant', content: e?.response?.data?.message ?? 'Gagal menghubungi MAJA.', ms: Date.now() - t0 });
  } finally {
    asking.value = false;
    scrollBottom();
  }
}

// Konteks part berganti → percakapan baru + cek ulang akses/ketersediaan server AI.
watch(() => props.partNumber, () => {
  chat.value = [];
  masterService.aiHealth()
    .then(h => { enabled.value = h.enabled; online.value = h.online; })
    .catch(() => { enabled.value = false; online.value = false; })
    .finally(() => emit('availability', enabled.value));
}, { immediate: true });
</script>

<style scoped>
.ec-chat { display: flex; flex-direction: column; gap: 10px; }
.ec-divider { display: flex; align-items: center; gap: 8px; color: var(--dm-accent, #2e5396); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
.ec-divider::before, .ec-divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--dm-tint-blue, #c7d4ee), transparent); }
.ec-opts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.ec-opt { border: 1px solid var(--dm-bd-blue, #bfdbfe); background: var(--dm-tint-blue, #eff6ff); color: var(--dm-accent, #1e40af); font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; cursor: pointer; transition: background .15s; }
.ec-opt:hover:not(:disabled) { background: var(--dm-tint-blue, #dbeafe); }
.ec-opt:disabled { opacity: .5; cursor: not-allowed; }
.ec-opt--slow { border-color: var(--dm-border, #e2e8f0); background: var(--dm-surface2, #f8fafc); color: var(--dm-text-2, #475569); }
.ec-opt small { font-weight: 400; color: var(--dm-faint, #94a3b8); }
.ec-chips { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.ec-chip { display: flex; align-items: center; gap: 6px; text-align: left; border: 1px solid var(--dm-border, #dbe4f3); background: var(--dm-surface, #fff); color: var(--dm-text, #1e3a70); border-radius: 10px; padding: 8px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.ec-chip .mdi { color: #d7263d; font-size: 15px; }
.ec-chip:hover:not(:disabled) { border-color: #2e5396; box-shadow: 0 2px 8px rgba(46, 83, 150, 0.15); transform: translateY(-1px); }
.ec-chip:disabled { opacity: 0.5; cursor: not-allowed; }

.ec-row { display: flex; gap: 8px; align-items: flex-end; }
.ec-row--user { justify-content: flex-end; }
.ec-avatar { width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; color: #fff; font-size: 16px; background: linear-gradient(135deg, #2e5396, #d7263d); box-shadow: 0 2px 6px rgba(46, 83, 150, 0.3); }
.ec-msg { max-width: 86%; padding: 9px 12px; border-radius: 14px; font-size: 12.5px; line-height: 1.55; }
.ec-msg--user { background: linear-gradient(135deg, #2e5396, #4472c4); color: #fff; border-bottom-right-radius: 4px; box-shadow: 0 2px 8px rgba(46, 83, 150, 0.25); }
.ec-msg--assistant { background: var(--dm-surface, #fff); color: var(--dm-text, #0f172a); border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08); }
.ec-msg--chart { max-width: 100%; flex: 1; }
.ec-text { margin: 0; white-space: pre-wrap; }
.ec-md :deep(p) { margin: 0 0 6px; }
.ec-md :deep(p:last-child) { margin-bottom: 0; }
.ec-md :deep(h5) { margin: 8px 0 4px; font-size: 12px; color: var(--dm-accent, #2e5396); }
.ec-md :deep(ul), .ec-md :deep(ol) { margin: 4px 0 6px; padding-left: 18px; }
.ec-md :deep(li) { margin: 2px 0; }
.ec-md :deep(li::marker) { color: #d7263d; }
.ec-md :deep(strong) { color: var(--dm-text, #1e3a70); }
.ec-md :deep(code) { background: var(--dm-bg, #f1f5f9); padding: 0 4px; border-radius: 4px; font-size: 11.5px; }

.ec-typing { display: flex; align-items: center; gap: 4px; }
.ec-typing span { width: 7px; height: 7px; border-radius: 50%; background: #2e5396; animation: ec-dot 1.2s infinite ease-in-out; }
.ec-typing span:nth-child(2) { animation-delay: 0.15s; background: #4472c4; }
.ec-typing span:nth-child(3) { animation-delay: 0.3s; background: #d7263d; }
.ec-typing small { margin-left: 6px; color: var(--dm-faint, #94a3b8); font-size: 11px; }
@keyframes ec-dot { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-4px); opacity: 1; } }

.ec-chart { margin-top: 10px; border: 1px solid var(--dm-border, #e8eef7); border-radius: 12px; padding: 10px 8px 4px; background: var(--dm-surface, #fff); }
.ec-chart-title { margin: 0 4px 2px; font-size: 12px; font-weight: 800; color: var(--dm-text, #1e3a70); }
.ec-chart-note { margin: 0 6px 6px; font-size: 10.5px; color: var(--dm-muted, #64748b); }
.ec-meta { margin-top: 8px; display: flex; gap: 6px; }
.ec-time { display: inline-flex; align-items: center; gap: 3px; padding: 1px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 700; }
.ec-time--fast { background: var(--dm-tint-green, #dcfce7); color: var(--dm-on-green, #15803d); }
.ec-time--mid  { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #b45309); }
.ec-time--slow { background: var(--dm-tint-red, #fee2e2); color: #d7263d; }
.ec-src { margin-top: 6px; font-size: 10.5px; color: var(--dm-muted, #64748b); }
.ec-src summary { cursor: pointer; list-style: none; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; background: var(--dm-bg, #f1f5f9); }
.ec-src ul { margin: 6px 0 0; padding-left: 16px; }

.ec-footer { padding: 10px 12px; background: var(--dm-surface, #fff); border-top: 1px solid var(--dm-border, #e2e8f0); font-size: 11.5px; color: var(--dm-muted, #64748b); }
.ec-inputbox { display: flex; align-items: center; gap: 6px; padding: 4px 4px 4px 12px; border: 1.5px solid var(--dm-border, #dbe4f3); border-radius: 999px; transition: border-color 0.15s, box-shadow 0.15s; }
.ec-inputbox:focus-within { border-color: #2e5396; box-shadow: 0 0 0 3px rgba(46, 83, 150, 0.12); }
.ec-input { flex: 1; min-width: 0; border: none; outline: none; font-size: 12.5px; background: transparent; }
.ec-send { width: 34px; height: 34px; border-radius: 50%; border: none; color: #fff; cursor: pointer; font-size: 16px; background: linear-gradient(135deg, #2e5396, #d7263d); transition: transform 0.15s, opacity 0.15s; }
.ec-send:hover:not(:disabled) { transform: scale(1.06); }
.ec-send:disabled { opacity: 0.4; cursor: not-allowed; }
.ec-offline { display: flex; align-items: center; gap: 6px; }
@media (prefers-reduced-motion: reduce) { .ec-typing span { animation: none; } }
</style>
