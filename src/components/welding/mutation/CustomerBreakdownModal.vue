<!-- components/welding/mutation/CustomerBreakdownModal.vue
     Rincian per CUSTOMER utk part gabungan (Aturan #16): MDFO, DN (D/N), PCS/DAY
     pada satu tanggal + total bulan. Data murni dari payload job (by_customer). -->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="emit('close')">
        <div class="modal-card modal-card--wide">

          <div class="modal-header modal-header--cust">
            <div class="flex items-center gap-2.5">
              <div class="header-icon"><i class="mdi mdi-account-group-outline text-sm text-white"></i></div>
              <div>
                <p class="font-bold text-sm text-white leading-tight">Rincian per Customer</p>
                <p class="text-[10px] text-emerald-100 leading-none mt-0.5">MDFO · DN · PCS/DAY — kode part per customer</p>
              </div>
            </div>
            <button @click="emit('close')" class="close-btn"><i class="mdi mdi-close text-sm"></i></button>
          </div>

          <div class="modal-body" v-if="ctx">
            <div class="ctx-row">
              <div class="ctx-chip">
                <i class="mdi mdi-barcode text-[9px] text-slate-400"></i>
                <span class="font-mono text-[10.5px] font-semibold text-slate-700">{{ ctx.job.partNo }}</span>
              </div>
              <div class="ctx-chip" :title="ctx.job.partName">
                <i class="mdi mdi-tag-outline text-[9px] text-slate-400"></i>
                <span class="text-[10.5px] font-semibold text-slate-700 truncate max-w-[200px]">{{ ctx.job.partName }}</span>
              </div>
              <div class="ctx-chip">
                <i class="mdi mdi-calendar-today text-[9px] text-slate-400"></i>
                <span class="text-[10.5px] font-semibold text-slate-700">Tgl {{ ctx.tanggal }}</span>
              </div>
            </div>

            <table class="bd-table">
              <thead>
                <tr>
                  <th class="text-left">Customer</th>
                  <th>Kode part</th>
                  <th>MDFO<br><span class="bd-sub">tgl {{ ctx.tanggal }}</span></th>
                  <th>DN Day</th>
                  <th>DN Night</th>
                  <th>PCS/DAY</th>
                  <th>MDFO<br><span class="bd-sub">bulan</span></th>
                  <th>DN<br><span class="bd-sub">bulan</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rows" :key="r.customer">
                  <td class="text-left font-semibold">{{ r.customer }}</td>
                  <td class="font-mono text-[10px] text-slate-500">{{ r.codes.join(', ') || '—' }}</td>
                  <td class="num c-mdfo">{{ fmt(r.mdfo) }}</td>
                  <td class="num c-dn">{{ fmt(r.dnDay) }}</td>
                  <td class="num c-dn">{{ fmt(r.dnNight) }}</td>
                  <td class="num c-pcs">{{ fmt(r.pcs, 2) }}</td>
                  <td class="num c-mdfo">{{ fmt(r.mdfoMonth) }}</td>
                  <td class="num c-dn">{{ fmt(r.dnMonth) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td class="text-left">TOTAL</td>
                  <td></td>
                  <td class="num">{{ fmt(tot.mdfo) }}</td>
                  <td class="num">{{ fmt(tot.dnDay) }}</td>
                  <td class="num">{{ fmt(tot.dnNight) }}</td>
                  <td class="num">{{ fmt(tot.pcs, 2) }}</td>
                  <td class="num">{{ fmt(tot.mdfoMonth) }}</td>
                  <td class="num">{{ fmt(tot.dnMonth) }}</td>
                </tr>
              </tfoot>
            </table>

            <p class="bd-note">
              <i class="mdi mdi-information-outline"></i>
              Customer dari MDFO (zcust). DN per customer mengikuti kode part yang dikirim (kode berakhiran -26/-28/-KZ = customer lain).
              PCS/DAY per customer = porsi MDFO customer pada minggu itu.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Job } from '@/types/Public/Welding/planning'

export interface CustomerBreakdownCtx { job: Job; tanggal: number }
interface Props { show: boolean; ctx: CustomerBreakdownCtx | null }
const props = defineProps<Props>()
const emit  = defineEmits<{ close: [] }>()

interface Row { customer: string; codes: string[]; mdfo: number; dnDay: number; dnNight: number; pcs: number; mdfoMonth: number; dnMonth: number }

const rows = computed<Row[]>(() => {
  const ctx = props.ctx
  if (!ctx) return []
  const blk = (t: string) => ctx.job.descriptions.find(d => d.type === t)
  const fc = blk('FORECAST'), dn = blk('DELIVERY'), pc = blk('PCS_PER_DAY')
  const map = new Map<string, Row>()
  const get = (c: string) => {
    if (!map.has(c)) map.set(c, { customer: c, codes: [], mdfo: 0, dnDay: 0, dnNight: 0, pcs: 0, mdfoMonth: 0, dnMonth: 0 })
    return map.get(c)!
  }
  const t = ctx.tanggal
  for (const [c, q] of Object.entries(fc?.dates[t]?.by_customer ?? {})) get(c).mdfo += Number(q) || 0
  for (const [c, v] of Object.entries((dn?.dates[t] as any)?.by_customer ?? {})) {
    const r = get(c); const vv = v as any
    r.dnDay += Number(vv.day) || 0; r.dnNight += Number(vv.night) || 0
    for (const k of (vv.codes ?? [])) if (!r.codes.includes(k)) r.codes.push(k)
  }
  for (const [c, q] of Object.entries((pc?.dates[t] as any)?.by_customer ?? {})) get(c).pcs += Number(q) || 0
  // total bulan
  for (const cell of Object.values(fc?.dates ?? {})) for (const [c, q] of Object.entries(cell.by_customer ?? {})) get(c).mdfoMonth += Number(q) || 0
  for (const cell of Object.values(dn?.dates ?? {})) for (const [c, v] of Object.entries((cell as any).by_customer ?? {})) {
    const r = get(c); const vv = v as any
    r.dnMonth += (Number(vv.day) || 0) + (Number(vv.night) || 0)
    for (const k of (vv.codes ?? [])) if (!r.codes.includes(k)) r.codes.push(k)
  }
  // kode base utk customer yg belum punya kode (MDFO saja)
  for (const r of map.values()) if (!r.codes.length && r.customer === (ctx.job.mdfoCustomers?.[0] ?? '')) r.codes.push(ctx.job.partNo)
  return [...map.values()].sort((a, b) => b.mdfoMonth - a.mdfoMonth)
})

const tot = computed(() => rows.value.reduce((a, r) => ({
  mdfo: a.mdfo + r.mdfo, dnDay: a.dnDay + r.dnDay, dnNight: a.dnNight + r.dnNight, pcs: a.pcs + r.pcs,
  mdfoMonth: a.mdfoMonth + r.mdfoMonth, dnMonth: a.dnMonth + r.dnMonth,
}), { mdfo: 0, dnDay: 0, dnNight: 0, pcs: 0, mdfoMonth: 0, dnMonth: 0 }))

function fmt(v: number, dec = 0): string {
  if (!v) return dec ? '0.00' : '0'
  return v.toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; z-index: 600; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(15,23,42,.5); backdrop-filter: blur(4px); }
.modal-card { width: 380px; max-width: 100%; background: var(--dm-surface, #fff); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.1); overflow: hidden; }
.modal-card--wide { width: 640px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; }
.modal-header--cust { background: linear-gradient(135deg, #059669, #047857); }
.header-icon { width: 28px; height: 28px; border-radius: 8px; background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; }
.close-btn { width: 26px; height: 26px; border-radius: 6px; border: none; background: rgba(255,255,255,.18); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.close-btn:hover { background: rgba(255,255,255,.3); }
.modal-body { padding: 14px 16px 16px; }
.ctx-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.ctx-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 6px; background: var(--dm-bg, #f1f5f9); border: 1px solid var(--dm-border, #e2e8f0); }
.bd-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.bd-table th { background: var(--dm-surface2, #f8fafc); color: var(--dm-text-2, #475569); font-size: 10px; font-weight: 700; padding: 6px 8px; border-bottom: 1px solid var(--dm-border, #e2e8f0); text-align: right; line-height: 1.2; }
.bd-table th.text-left { text-align: left; }
.bd-sub { font-weight: 500; color: var(--dm-faint, #94a3b8); font-size: 9px; }
.bd-table td { padding: 6px 8px; border-bottom: 1px solid var(--dm-border, #f1f5f9); text-align: right; color: var(--dm-cell, #334155); }
.bd-table td.text-left { text-align: left; }
.bd-table tfoot td { font-weight: 800; background: var(--dm-surface2, #f8fafc); border-top: 2px solid var(--dm-border, #e2e8f0); }
.num { font-variant-numeric: tabular-nums; }
.c-mdfo { color: var(--dm-accent, #1d4ed8); }
.c-dn   { color: var(--dm-accent, #0369a1); }
.c-pcs  { color: var(--dm-on-green, #15803d); }
.bd-note { display: flex; gap: 6px; align-items: flex-start; margin: 10px 0 0; font-size: 9.5px; color: var(--dm-muted, #64748b); line-height: 1.4; }
.bd-note .mdi { margin-top: 1px; }
.modal-enter-active, .modal-leave-active { transition: opacity .18s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
