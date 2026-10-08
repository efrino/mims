<!-- components/welding/Production/PartPickerMutasi.vue
     Picker part utk modal "Tambah Planning Manual" (Achievement V2).
     Gaya sama dgn FilterDropdown mutasi (search + checkbox + Select All/Invert/Terapkan),
     tetapi tiap baris membawa angka mutasi (stok sebelum shift, plan, DN, MDFO)
     supaya planner tahu kondisi part sebelum memasukkannya ke produksi. -->
<template>
  <Teleport :to="teleportTo">
    <Transition name="filter-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[3600] flex items-center justify-center bg-gray-900/40"
        @click.self="$emit('close')"
      >
        <div class="picker" @click.stop @mousedown.stop>
          <!-- Header -->
          <div class="picker-header">
            <span class="picker-title">
              <i class="mdi mdi-filter-variant text-[#4472C4]"></i>
              Pilih PART / JOB NO. — {{ area }}
              <span class="picker-sub">{{ date }} · Shift {{ shift }}</span>
            </span>
            <button class="picker-close" @click="$emit('close')"><i class="mdi mdi-close" /></button>
          </div>

          <!-- Search -->
          <div class="picker-search-wrap">
            <div class="picker-search-inner">
              <i class="mdi mdi-magnify picker-search-icon" />
              <input
                ref="searchRef"
                v-model="query"
                type="text"
                placeholder="Cari job / part / nama / model / customer…"
                class="picker-search-input"
                @keydown.enter.prevent="apply"
                @keydown.esc.prevent="$emit('close')"
              />
              <button v-if="query" class="picker-search-clear" @mousedown.prevent @click.stop="query = ''">
                <i class="mdi mdi-close-circle" />
              </button>
            </div>
            <div class="picker-chips">
              <button class="chip" :class="{ 'chip--on': typeFilter === 'ALL' }" @click="typeFilter = 'ALL'">Semua</button>
              <button class="chip" :class="{ 'chip--on': typeFilter === 'FP' }" @click="typeFilter = 'FP'">FP</button>
              <button class="chip" :class="{ 'chip--on': typeFilter === 'WIP' }" @click="typeFilter = 'WIP'">WIP</button>
              <button class="chip" :class="{ 'chip--on': onlyNeed }" title="Hanya part dgn plan mutasi / DN shift ini > 0" @click="onlyNeed = !onlyNeed">
                <i class="mdi mdi-alert-circle-outline"></i> Perlu produksi
              </button>
              <button class="chip" :class="{ 'chip--on': hidePlanned }" title="Sembunyikan part yg sudah ada di form" @click="hidePlanned = !hidePlanned">
                <i class="mdi mdi-eye-off-outline"></i> Sembunyikan sudah ada
              </button>
              <span class="picker-counter">{{ visible.length }} dari {{ items.length }} part · dipilih {{ selected.size }}</span>
            </div>
          </div>

          <!-- Column header -->
          <div class="picker-colhead">
            <span class="c-check"></span>
            <span class="c-ident">JOB – PART NO. · NAMA</span>
            <span class="c-num" title="Stok sebelum shift ini (dari mutasi)">STOK</span>
            <span class="c-num" title="Plan mutasi shift ini">PLAN</span>
            <span class="c-num" title="DN (delivery) shift ini">DN</span>
            <span class="c-num" title="Balance shift ini (actual − plan)">BAL</span>
            <span class="c-num" title="Strength (jam) shift ini">JAM</span>
            <span class="c-num" title="MDFO bulan ini / aktual s.d. shift sebelumnya">MDFO / ACT</span>
            <span class="c-mc" title="Mesin · UPH (master)">MESIN · UPH</span>
          </div>

          <!-- Body -->
          <div class="picker-body">
            <div class="picker-item picker-item--all" @click="toggleAll">
              <span class="cbox" :class="{ 'cbox--checked': allSelected, 'cbox--mixed': someSelected && !allSelected }">
                <i v-if="allSelected" class="mdi mdi-check cbox-icon" />
                <span v-else-if="someSelected" class="cbox-dash" />
              </span>
              <span class="font-semibold">{{ allSelected ? 'Deselect All' : 'Select All' }}
                <span v-if="query" class="picker-search-label">(hasil pencarian)</span>
              </span>
            </div>
            <div class="picker-divider" />

            <div v-if="loading" class="picker-loading">
              <i class="mdi mdi-loading mdi-spin text-[18px] text-[#4472C4]" /> Memuat data mutasi…
            </div>
            <div v-else-if="!visible.length" class="picker-empty">
              <i class="mdi mdi-magnify-close picker-empty-icon" />
              <p v-if="query">Tidak ada hasil untuk <b>"{{ query }}"</b></p>
              <p v-else>Tidak ada part di mutasi area ini</p>
            </div>

            <template v-else>
              <div
                v-for="it in visible"
                :key="keyOf(it)"
                class="picker-item"
                :class="{ 'picker-item--active': selected.has(keyOf(it)), 'picker-item--planned': it.already_planned }"
                @click="toggle(it)"
              >
                <span class="c-check">
                  <span class="cbox" :class="{ 'cbox--checked': selected.has(keyOf(it)) }">
                    <i v-if="selected.has(keyOf(it))" class="mdi mdi-check cbox-icon" />
                  </span>
                </span>
                <span class="c-ident">
                  <span class="ident-line" v-html="highlight(`${it.job_number || '-'} · ${it.part_number}`)"></span>
                  <span class="ident-sub">
                    <span class="badge" :class="it.status_plan === 'WIP' ? 'badge--wip' : 'badge--fp'">{{ it.status_plan }}</span>
                    <span v-html="highlight(it.part_name || it.car_name || '—')"></span>
                    <span v-if="it.model" class="ident-dim"> · <span v-html="highlight(it.model)"></span></span>
                    <span v-if="it.customers.length" class="ident-dim"> · <span v-html="highlight(it.customers.join('/'))"></span></span>
                    <span v-if="it.already_planned" class="badge badge--planned" title="Sudah ada di form shift ini">sudah ada</span>
                  </span>
                </span>
                <span class="c-num" :class="numCls(it.stock_before, 'stock')">{{ fmt(it.stock_before) }}</span>
                <span class="c-num" :class="numCls(it.plan_shift, 'plan')">{{ fmt(it.plan_shift) }}</span>
                <span class="c-num" :class="numCls(it.dn_shift, 'dn')">{{ fmt(it.dn_shift) }}</span>
                <span class="c-num" :class="numCls(it.balance_shift, 'bal')">{{ fmt(it.balance_shift) }}</span>
                <span class="c-num" :class="numCls(it.strength_shift, 'str')">{{ it.strength_shift ? it.strength_shift.toFixed(1) : '-' }}</span>
                <span class="c-num ident-dim">{{ fmt(it.mdfo_month) }} / {{ fmt(it.actual_mtd) }}</span>
                <span class="c-mc ident-dim" :title="it.machine">{{ it.machine || '-' }} · {{ it.uph || '-' }}</span>
              </div>
            </template>
          </div>

          <!-- Footer -->
          <div class="picker-footer">
            <button class="picker-reset" @click="selected.clear()">Reset</button>
            <button class="picker-invert" @click="invert">Invert</button>
            <span class="flex-1 text-[10px] text-gray-400">
              Angka dari mutasi: <b>STOK</b> = sebelum shift, <b>PLAN/DN/BAL/JAM</b> = shift ini, <b>MDFO/ACT</b> = bulan berjalan.
            </span>
            <button class="picker-apply" :disabled="!selected.size" @click="apply">
              Terapkan <span v-if="selected.size">({{ selected.size }})</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { PartCandidate } from '@/types/Welding/Transaction/Achievement_v2';

const props = withDefaults(defineProps<{
  show: boolean;
  items: PartCandidate[];
  loading?: boolean;
  area: string;
  date: string;
  shift: string | number;
  teleportTo?: string;
  preselected?: string[];   // key "FP|part"
}>(), { loading: false, teleportTo: 'body', preselected: () => [] });

const emit = defineEmits<{ close: []; apply: [items: PartCandidate[]] }>();

const searchRef   = ref<HTMLInputElement | null>(null);
const query       = ref('');
const typeFilter  = ref<'ALL' | 'FP' | 'WIP'>('ALL');
const onlyNeed    = ref(false);
const hidePlanned = ref(false);
const selected    = ref(new Set<string>());

const keyOf = (it: PartCandidate) => `${it.status_plan}|${it.part_number}`;

watch(() => props.show, async (v) => {
  if (!v) return;
  query.value = '';
  selected.value = new Set(props.preselected);
  await nextTick();
  searchRef.value?.focus();
});

const visible = computed(() => {
  const q = query.value.trim().toLowerCase();
  return props.items.filter((it) => {
    if (typeFilter.value !== 'ALL' && it.status_plan !== typeFilter.value) return false;
    if (onlyNeed.value && !(it.plan_shift > 0 || it.dn_shift > 0)) return false;
    if (hidePlanned.value && it.already_planned) return false;
    if (!q) return true;
    const hay = [it.job_number, it.part_number, it.part_name, it.car_name, it.model, it.machine, ...(it.customers || [])]
      .join(' ').toLowerCase();
    return hay.includes(q);
  });
});

const allSelected  = computed(() => visible.value.length > 0 && visible.value.every((it) => selected.value.has(keyOf(it))));
const someSelected = computed(() => visible.value.some((it) => selected.value.has(keyOf(it))));

const toggle = (it: PartCandidate) => {
  const k = keyOf(it);
  const s = new Set(selected.value);
  s.has(k) ? s.delete(k) : s.add(k);
  selected.value = s;
};
const toggleAll = () => {
  const s = new Set(selected.value);
  if (allSelected.value) visible.value.forEach((it) => s.delete(keyOf(it)));
  else visible.value.forEach((it) => s.add(keyOf(it)));
  selected.value = s;
};
const invert = () => {
  const s = new Set(selected.value);
  visible.value.forEach((it) => { const k = keyOf(it); s.has(k) ? s.delete(k) : s.add(k); });
  selected.value = s;
};
const apply = () => {
  const picked = props.items.filter((it) => selected.value.has(keyOf(it)));
  if (!picked.length) return;
  emit('apply', picked);
};

const fmt = (n: number) => (n === 0 || n == null ? '-' : n.toLocaleString('id-ID'));
const numCls = (n: number, kind: 'stock' | 'plan' | 'dn' | 'bal' | 'str') => {
  if (!n) return 'num-zero';
  if (kind === 'stock') return n < 0 ? 'num-neg' : 'num-stock';
  if (kind === 'plan')  return 'num-plan';
  if (kind === 'dn')    return 'num-dn';
  if (kind === 'bal')   return n < 0 ? 'num-neg' : 'num-pos';
  return n < 8 ? 'num-neg' : 'num-pos';   // strength < 8 jam = kritis
};

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const highlight = (text: string): string => {
  const q = query.value.trim();
  const esc = escapeHtml(text || '');
  if (!q) return esc;
  const eq = escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return esc.replace(new RegExp(`(${eq})`, 'gi'), '<mark class="filter-highlight">$1</mark>');
};
</script>

<style scoped>
.picker {
  background: #fff; border: 1px solid #4472C4; border-radius: 6px;
  box-shadow: 0 12px 32px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08);
  width: min(96vw, 900px); max-height: 86vh; display: flex; flex-direction: column;
}
.picker-header { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:#F8F9FA; border-bottom:1px solid #E0E0E0; border-radius:6px 6px 0 0; }
.picker-title  { font-size:12px; font-weight:600; color:#1F2937; display:flex; align-items:center; gap:6px; }
.picker-sub    { font-size:10px; font-weight:400; color:#6B7280; }
.picker-close  { color:#9CA3AF; padding:2px; } .picker-close:hover { color:#374151; }

.picker-search-wrap  { padding:8px 12px; border-bottom:1px solid #E0E0E0; }
.picker-search-inner { position:relative; display:flex; align-items:center; }
.picker-search-icon  { position:absolute; left:8px; color:#9CA3AF; font-size:14px; pointer-events:none; }
.picker-search-input { width:100%; padding:6px 28px 6px 26px; font-size:12px; border:1px solid #D1D5DB; border-radius:4px; outline:none; color:#374151; }
.picker-search-input:focus { border-color:#4472C4; box-shadow:0 0 0 2px rgba(68,114,196,.15); }
.picker-search-clear { position:absolute; right:7px; color:#9CA3AF; } .picker-search-clear:hover { color:#EF4444; }
.picker-chips   { display:flex; align-items:center; gap:6px; margin-top:6px; flex-wrap:wrap; }
.chip { font-size:10px; padding:2px 8px; border:1px solid #CBD5E1; border-radius:999px; color:#334155; background:#fff; }
.chip--on { background:#4472C4; border-color:#4472C4; color:#fff; }
.picker-counter { margin-left:auto; font-size:10px; color:#9CA3AF; }
.picker-search-label { font-size:10px; font-weight:400; color:#9CA3AF; }

.picker-colhead, .picker-item { display:grid; grid-template-columns: 22px 1fr 64px 60px 56px 56px 44px 90px 110px; gap:6px; align-items:center; padding:0 12px; }
.picker-colhead { font-size:10px; font-weight:700; color:#4B5563; background:#F1F5F9; padding-top:4px; padding-bottom:4px; border-bottom:1px solid #E0E0E0; }
.picker-colhead .c-num, .picker-colhead .c-mc { text-align:right; }

.picker-body { overflow-y:auto; padding:4px 0; flex:1; min-height:0; }
.picker-divider { height:1px; background:#E0E0E0; margin:2px 0; }
.picker-item { padding-top:5px; padding-bottom:5px; cursor:pointer; font-size:11px; color:#374151; user-select:none; }
.picker-item--all { display:flex; gap:8px; }
.picker-item:hover { background:#EEF2FF; }
.picker-item--active { background:#F0F4FF; }
.picker-item--planned { opacity:.72; }
.c-check { display:flex; align-items:center; }
.c-ident { min-width:0; display:flex; flex-direction:column; }
.ident-line { font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ident-sub  { font-size:10px; color:#6B7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; gap:4px; align-items:center; }
.ident-dim  { color:#9CA3AF; }
.c-num { text-align:right; font-variant-numeric:tabular-nums; font-weight:600; }
.c-mc  { text-align:right; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.num-zero  { color:#C4C9D4; font-weight:400; }
.num-neg   { color:#DC2626; }
.num-pos   { color:#059669; }
.num-stock { color:#1D4ED8; }
.num-plan  { color:#7C3AED; }
.num-dn    { color:#B45309; }

.badge { font-size:9px; font-weight:700; padding:0 5px; border-radius:999px; line-height:14px; }
.badge--fp  { background:#DBEAFE; color:#1E40AF; }
.badge--wip { background:#FEF3C7; color:#92400E; }
.badge--planned { background:#E5E7EB; color:#374151; }

.cbox { width:14px; height:14px; min-width:14px; border:1.5px solid #C4C9D4; border-radius:3px; background:#fff; display:flex; align-items:center; justify-content:center; }
.cbox--checked, .cbox--mixed { background:#4472C4; border-color:#4472C4; }
.cbox-icon { font-size:10px; color:#fff; line-height:1; }
.cbox-dash { width:8px; height:2px; background:#fff; border-radius:1px; }
.picker-item:hover .cbox:not(.cbox--checked):not(.cbox--mixed) { border-color:#4472C4; }

.picker-loading { display:flex; align-items:center; justify-content:center; gap:8px; padding:24px 12px; font-size:11px; color:#6B7280; }
.picker-empty { padding:20px 12px; text-align:center; font-size:11px; color:#9CA3AF; }
.picker-empty-icon { font-size:28px; color:#E5E7EB; display:block; margin-bottom:6px; }

.picker-footer { display:flex; align-items:center; gap:8px; padding:8px 12px; border-top:1px solid #E0E0E0; background:#F8F9FA; border-radius:0 0 6px 6px; }
.picker-reset  { font-size:11px; color:#9CA3AF; padding:2px 4px; } .picker-reset:hover { color:#EF4444; }
.picker-invert { font-size:11px; color:#334155; padding:4px 8px; border-radius:4px; border:1px solid #CBD5E1; background:#fff; }
.picker-invert:hover { border-color:#94A3B8; background:#F8FAFC; }
.picker-apply  { padding:6px 14px; background:#4472C4; color:#fff; border-radius:4px; font-size:12px; font-weight:600; }
.picker-apply:hover { background:#2E5396; }
.picker-apply:disabled { background:#CBD5E1; cursor:not-allowed; }

.filter-fade-enter-active, .filter-fade-leave-active { transition: opacity .1s ease, transform .1s ease; }
.filter-fade-enter-from, .filter-fade-leave-to { opacity:0; transform: scale(.97) translateY(-4px); }
</style>
<style>
.filter-highlight { background-color:#FEF08A; color:#713F12; border-radius:2px; padding:0 2px; }
</style>
