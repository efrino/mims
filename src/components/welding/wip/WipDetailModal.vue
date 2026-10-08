<template>
  <Teleport to="body">
    <div v-if="visible" class="overlay" @click.self="$emit('close')">
      <div class="modal modal--lg">
        <!-- Header -->
        <div class="modal__head">
          <div>
            <div class="modal__title">{{ detail.header?.trx_code }}</div>
            <div class="modal__sub">{{ detail.header?.trx_date }} · {{ detail.header?.shift }} · {{ detail.header?.area_code }}</div>
          </div>
          <div class="modal__head-right">
            <span class="badge-status" :class="'badge-status--' + detail.header?.status">
              {{ detail.header?.status }}
            </span>
            <button class="btn-close" @click="$emit('close')">✕</button>
          </div>
        </div>

        <!-- FP Info bar -->
        <div class="fp-info">
          <div class="fp-info__item">
            <span class="fp-info__label">FP Part</span>
            <span class="fp-info__val mono">{{ detail.header?.fp_part_number }}</span>
          </div>
          <div class="fp-info__item">
            <span class="fp-info__label">Job</span>
            <span class="fp-info__val">{{ detail.header?.fp_job_number ?? '-' }}</span>
          </div>
          <div class="fp-info__item">
            <span class="fp-info__label">Qty Plan</span>
            <span class="fp-info__val bold">{{ fmtNum(detail.header?.fp_qty_plan) }} pcs</span>
          </div>
        </div>

        <!-- Cross-area lines -->
        <div class="modal__section-title">📦 Kebutuhan Material (Cross-Area)</div>
        <div class="table-wrap">
          <table class="tbl tbl--sm">
            <thead>
              <tr>
                <th>Dari</th>
                <th>Ke</th>
                <th>Part Number</th>
                <th>Job</th>
                <th class="tc">Source</th>
                <th class="tr">Butuh</th>
                <th class="tr">Stok</th>
                <th class="tr">Delta</th>
                <th class="tc">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in detail.cross" :key="d.id" :class="d.delta > 0 ? 'row--kurang' : d.delta < 0 ? 'row--surplus' : 'row--ok'">
                <td class="small muted">{{ d.from_area }}</td>
                <td class="small muted">{{ d.to_area }}</td>
                <td class="mono small">{{ d.part_number }}</td>
                <td class="small">{{ d.job_number ?? '-' }}</td>
                <td class="tc">
                  <span class="badge-source" :class="'badge-source--' + d.source">{{ d.source }}</span>
                </td>
                <td class="tr mono">{{ fmtNum(d.required_qty) }}</td>
                <td class="tr mono">{{ fmtNum(d.stock_snapshot) }}</td>
                <td class="tr mono bold" :class="d.delta > 0 ? 'txt-red' : d.delta < 0 ? 'txt-green' : ''">
                  {{ d.delta > 0 ? '+' : '' }}{{ fmtNum(d.delta) }}
                </td>
                <td class="tc">
                  <span v-if="d.delta > 0" class="pill pill--red">KURANG</span>
                  <span v-else-if="d.delta < 0" class="pill pill--green">SURPLUS</span>
                  <span v-else class="pill pill--grey">CUKUP</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Internal OP lines -->
        <template v-if="detail.internal?.length">
          <div class="modal__section-title">🔧 Proses Internal Area</div>
          <div class="table-wrap">
            <table class="tbl tbl--sm">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Part Number</th>
                  <th>Job</th>
                  <th class="tc">OP</th>
                  <th class="tr">Qty Plan</th>
                  <th class="tr">WIP Stock</th>
                  <th class="tr">Delta</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in detail.internal" :key="d.id">
                  <td>
                    <span class="badge-area">{{ d.from_area }}</span>
                  </td>
                  <td class="mono small">{{ d.part_number }}</td>
                  <td class="small">{{ d.job_number ?? '-' }}</td>
                  <td class="tc mono">OP{{ d.op }}</td>
                  <td class="tr mono">{{ fmtNum(d.required_qty) }}</td>
                  <td class="tr mono">{{ fmtNum(d.stock_snapshot) }}</td>
                  <td class="tr mono bold" :class="d.delta > 0 ? 'txt-red' : 'txt-green'">
                    {{ d.delta > 0 ? '+' : '' }}{{ fmtNum(d.delta) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- Footer -->
        <div class="modal__foot">
          <button
            v-if="detail.header?.status === 'draft'"
            class="btn btn--primary"
            @click="
              $emit('confirm', detail.header!.id);
              $emit('close');
            "
          >
            ✓ Konfirmasi Struk
          </button>
          <button class="btn btn--ghost" @click="$emit('close')">Tutup</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { WipTrxDetail } from '@/types/Public/Welding/Wip';

defineProps<{
  visible: boolean;
  detail: WipTrxDetail;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', id: number): void;
}>();

function fmtNum(v: number | null | undefined): string {
  if (v == null) return '-';
  return Number(v).toLocaleString('id-ID');
}
</script>

<style scoped>
/* ── Overlay: kuat blur + vignette ── */
.overlay {
  position: fixed;
  inset: 0;
  /* lapisan 1: vignette radial dari sudut, lapisan 2: solid dark */
  background:
    radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.35) 100%),
    rgba(10, 15, 30, 0.65);
  backdrop-filter: blur(10px) saturate(0.8);
  -webkit-backdrop-filter: blur(10px) saturate(0.8);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  padding: 40px 20px;
  overflow-y: auto;
  animation: overlay-in 0.2s ease;
}
@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.modal {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  width: 100%;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  box-shadow:
    0 25px 80px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255,255,255,0.06);
  animation: modal-in 0.22s cubic-bezier(0.34, 1.3, 0.64, 1);
}
@keyframes modal-in {
  from { opacity: 0; transform: scale(0.96) translateY(-10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.modal--lg {
  max-width: 920px;
}
.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--wip-border);
  background: var(--wip-bg3);
  border-radius: 12px 12px 0 0;
}
.modal__head-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.modal__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--wip-text);
}
.modal__sub {
  font-size: 12px;
  color: var(--wip-muted);
  margin-top: 3px;
}
.modal__foot {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 14px 22px;
  border-top: 1px solid var(--wip-border);
  background: var(--wip-bg3);
  border-radius: 0 0 12px 12px;
}
.modal__section-title {
  padding: 14px 22px 6px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--wip-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.fp-info {
  display: flex;
  gap: 28px;
  flex-wrap: wrap;
  padding: 14px 22px;
  background: #f0f7ff;
  border-bottom: 1px solid #bfdbfe;
}
.fp-info__item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.fp-info__label {
  font-size: 10.5px;
  color: var(--wip-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  font-weight: 600;
}
.fp-info__val {
  font-size: 14px;
  color: var(--wip-text);
}

/* Table */
.table-wrap {
  overflow-x: auto;
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.tbl thead tr {
  background: var(--wip-bg3);
}
.tbl th {
  padding: 9px 13px;
  text-align: left;
  color: var(--wip-muted);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  white-space: nowrap;
  border-bottom: 1px solid var(--wip-border);
}
.tbl td {
  padding: 9px 13px;
  border-bottom: 1px solid var(--wip-border);
  white-space: nowrap;
  color: var(--wip-text);
}
.tbl--sm td,
.tbl--sm th {
  padding: 8px 11px;
}
.tbl tbody tr:hover {
  background: #f8fafc;
}
.tbl tbody tr:last-child td {
  border-bottom: none;
}

/* Row status colors — light pastels */
.row--kurang {
  background: #fff1f2 !important;
}
.row--surplus {
  background: #f0fdf4 !important;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.mono {
  font-family: 'Fira Code', 'Consolas', monospace;
}
.bold {
  font-weight: 700;
}
.muted {
  color: var(--wip-muted);
}
.small {
  font-size: 12px;
}
.txt-red {
  color: #dc2626;
  font-weight: 700;
}
.txt-green {
  color: #16a34a;
  font-weight: 700;
}

.badge-area {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  border-radius: 5px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
}
.badge-status {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}
.badge-status--draft {
  background: #fef9c3;
  color: #a16207;
}
.badge-status--confirmed {
  background: #dcfce7;
  color: #15803d;
}
.badge-source {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.4px;
}
.badge-source--IFPP {
  background: #dcfce7;
  color: #15803d;
}
.badge-source--OUTHOUSE {
  background: #ede9fe;
  color: #6d28d9;
}
.badge-source--CKD {
  background: #fef9c3;
  color: #a16207;
}
.badge-source--VENDOR {
  background: #fee2e2;
  color: #dc2626;
}
.badge-source--WIP {
  background: #dbeafe;
  color: #1d4ed8;
}
.pill {
  padding: 3px 9px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
}
.pill--red {
  background: #fee2e2;
  color: #dc2626;
}
.pill--green {
  background: #dcfce7;
  color: #15803d;
}
.pill--grey {
  background: var(--wip-bg3);
  color: var(--wip-muted);
  border: 1px solid var(--wip-border);
}

/* Buttons */
.btn {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  padding: 9px 16px;
  font-weight: 600;
  transition: all 0.15s;
}
.btn--primary {
  background: var(--wip-accent);
  color: #fff;
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.25);
}
.btn--primary:hover {
  background: var(--wip-accent2);
}
.btn--ghost {
  background: #fff;
  color: var(--wip-text);
  border: 1px solid var(--wip-border);
}
.btn--ghost:hover {
  background: var(--wip-bg3);
}
.btn-close {
  background: none;
  border: none;
  color: var(--wip-muted);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  line-height: 1;
}
.btn-close:hover {
  background: var(--wip-border);
  color: var(--wip-text);
}
</style>
