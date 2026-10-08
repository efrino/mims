<!-- components/welding/mutasi-wip/ParentDetailModal.vue
     Mini-mutasi: detail parent/mother FP dari sebuah WIP pada satu tanggal.
     Dibuka saat user klik baris "Σ PARENT (DEMAND)" di Mutasi WIP. -->
<template>
  <Teleport to="body">
    <Transition name="pd-fade">
      <div v-if="show" class="pd-overlay" @click.self="$emit('close')">
        <div class="pd-box">
          <!-- Header -->
          <div class="pd-header">
            <div class="pd-header-icon"><i class="mdi mdi-source-branch"></i></div>
            <div class="pd-header-text">
              <p class="pd-title">Detail Parent — {{ partNo }}</p>
              <p class="pd-sub">
                <span class="font-mono">{{ partName || '—' }}</span>
                <span class="pd-sep">·</span>
                Tanggal <strong>{{ tanggal }} {{ monthLabel }}</strong>
                <span class="pd-sep">·</span>
                {{ daily.length }} parent
              </p>
            </div>
            <button class="pd-close" @click="$emit('close')"><i class="mdi mdi-close"></i></button>
          </div>

          <!-- Body -->
          <div class="pd-body">
            <div v-if="!daily.length" class="pd-empty">
              <i class="mdi mdi-information-outline"></i>
              Tidak ada plan parent pada tanggal ini.
            </div>

            <table v-else class="pd-table">
              <thead>
                <tr>
                  <th class="pd-l">PARENT (FP)</th>
                  <th class="pd-c">QTY KBN</th>
                  <th class="pd-c">BQ</th>
                  <th class="pd-c">PCS/DAY</th>
                  <th class="pd-c">PLAN D</th>
                  <th class="pd-c">PLAN N</th>
                  <th class="pd-c">ACT. STOCK</th>
                  <th class="pd-c">STRENGTH</th>
                  <th class="pd-c pd-demand-col">→ DEMAND WIP</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in daily" :key="p.partNo">
                  <td class="pd-l">
                    <span class="pd-pn font-mono">{{ p.partNo }}</span>
                    <span class="pd-name">{{ p.partName || '—' }}</span>
                  </td>
                  <td class="pd-c">{{ p.qty_kbn }}</td>
                  <td class="pd-c">{{ fmt(p.bq) }}</td>
                  <td class="pd-c">{{ fmt(p.pcs) }}</td>
                  <td class="pd-c">{{ p.plan_day }}</td>
                  <td class="pd-c">{{ p.plan_night }}</td>
                  <td class="pd-c">{{ p.stock }}</td>
                  <td class="pd-c" :class="strengthClass(p.strength)">{{ fmt(p.strength) }}</td>
                  <td class="pd-c pd-demand-col">{{ demandOf(p) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td class="pd-l pd-foot-lbl">Σ TOTAL (demand WIP hari ini)</td>
                  <td class="pd-c" colspan="3"></td>
                  <td class="pd-c">{{ sum('plan_day') }}</td>
                  <td class="pd-c">{{ sum('plan_night') }}</td>
                  <td class="pd-c" colspan="2"></td>
                  <td class="pd-c pd-demand-col pd-foot-total">{{ totalDemand }}</td>
                </tr>
              </tfoot>
            </table>

            <p class="pd-note">
              <i class="mdi mdi-information-outline"></i>
              DEMAND WIP per parent = (PLAN D + PLAN N) × BQ. Total = demand WIP pada baris Σ PARENT.
              PCS/DAY &amp; STRENGTH WIP adalah penjumlahan kontribusi seluruh parent.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WipParentDaily } from '@/types/Public/Welding/planning';

const props = defineProps<{
  show: boolean;
  partNo: string;
  partName: string;
  tanggal: number;
  monthLabel: string;
  daily: WipParentDaily[];
}>();

defineEmits<{ close: [] }>();

function fmt(v: number): string {
  if (v === null || v === undefined) return '—';
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
function demandOf(p: WipParentDaily): number {
  const bq = p.bq && p.bq > 0 ? p.bq : 1;
  return Math.round((p.plan_day + p.plan_night) * bq);
}
function sum(key: 'plan_day' | 'plan_night'): number {
  return props.daily.reduce((s, p) => s + (p[key] || 0), 0);
}
const totalDemand = computed(() => props.daily.reduce((s, p) => s + demandOf(p), 0));

function strengthClass(v: number): string {
  if (!v) return '';
  if (v < 12) return 'pd-str-danger';
  if (v <= 20) return 'pd-str-safe';
  return 'pd-str-warn';
}
</script>

<style scoped>
.pd-overlay {
  position: fixed; inset: 0; z-index: 600;
  background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.pd-box {
  background: #fff; border-radius: 14px; width: 860px; max-width: 100%;
  max-height: 88vh; overflow: hidden; display: flex; flex-direction: column;
  box-shadow: 0 24px 60px rgba(0,0,0,.3);
}
.pd-header {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff;
}
.pd-header-icon {
  width: 34px; height: 34px; border-radius: 9px; background: rgba(255,255,255,.18);
  display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
}
.pd-header-text { flex: 1; min-width: 0; }
.pd-title { font-size: 14px; font-weight: 700; margin: 0; }
.pd-sub { font-size: 11.5px; opacity: .92; margin: 2px 0 0; }
.pd-sep { margin: 0 6px; opacity: .6; }
.pd-close {
  width: 30px; height: 30px; border-radius: 8px; border: none; cursor: pointer;
  background: rgba(255,255,255,.15); color: #fff; font-size: 16px;
}
.pd-close:hover { background: rgba(255,255,255,.3); }

.pd-body { padding: 14px 16px; overflow: auto; }
.pd-empty { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 13px; padding: 24px; justify-content: center; }

.pd-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.pd-table th, .pd-table td { border: 1px solid #e5e7eb; padding: 6px 8px; }
.pd-table thead th { background: #f1f5f9; color: #334155; font-weight: 700; font-size: 10.5px; white-space: nowrap; }
.pd-l { text-align: left; }
.pd-c { text-align: center; white-space: nowrap; }
.pd-pn { display: block; font-weight: 700; color: #1e293b; }
.pd-name { display: block; font-size: 10.5px; color: #64748b; }
.pd-demand-col { background: #f5f3ff; font-weight: 700; color: #5b21b6; }
.pd-foot-lbl { font-weight: 700; color: #334155; }
.pd-foot-total { background: #ede9fe; font-size: 13px; }
.pd-table tfoot td { background: #f8fafc; }

.pd-str-safe { color: #16a34a; font-weight: 700; }
.pd-str-warn { color: #ca8a04; font-weight: 700; }
.pd-str-danger { color: #dc2626; font-weight: 700; }

.pd-note {
  display: flex; gap: 6px; align-items: flex-start; margin: 12px 2px 0;
  font-size: 11px; color: #64748b; line-height: 1.5;
}

.pd-fade-enter-active, .pd-fade-leave-active { transition: opacity .18s ease; }
.pd-fade-enter-from, .pd-fade-leave-to { opacity: 0; }
</style>
