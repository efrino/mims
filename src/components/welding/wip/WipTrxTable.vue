<template>
  <div class="panel">
    <!-- Filters -->
    <div class="filter-row">
      <input type="date" class="inp inp--sm" v-model="localFilter.trx_date" @change="$emit('filter-change', localFilter)" />
      <select class="inp inp--sm" v-model="localFilter.type" @change="$emit('filter-change', localFilter)">
        <option value="">Semua Tipe</option>
        <option value="plan">Plan</option>
        <option value="actual">Actual</option>
      </select>
      <select class="inp inp--sm" v-model="localFilter.shift" @change="$emit('filter-change', localFilter)">
        <option value="">Semua Shift</option>
        <option value="Day">Day</option>
        <option value="Night">Night</option>
      </select>
      <select class="inp inp--sm" v-model="localFilter.status" @change="$emit('filter-change', localFilter)">
        <option value="">Semua Status</option>
        <option value="draft">Draft</option>
        <option value="confirmed">Confirmed</option>
      </select>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Tanggal</th>
            <th class="tc">Tipe</th>
            <th class="tc">Shift</th>
            <th>Area</th>
            <th>FP / Job</th>
            <th class="tr">Qty</th>
            <th class="tc">Lines</th>
            <th class="tc">Kurang</th>
            <th class="tc">Status</th>
            <th class="tc">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="11" class="tc muted">Memuat...</td>
          </tr>
          <tr v-else-if="trxList.length === 0">
            <td colspan="11" class="tc muted">Tidak ada transaksi</td>
          </tr>
          <tr
            v-for="row in trxList"
            :key="row.id"
            class="trx-row"
            :class="{ 'row--actual': row.type === 'actual' }"
            @click="$emit('open-detail', row.id)"
          >
            <td class="mono small">{{ row.trx_code }}</td>
            <td class="small">{{ row.trx_date }}</td>
            <td class="tc">
              <span class="badge-type" :class="'badge-type--' + row.type">
                {{ row.type === 'plan' ? 'Plan' : 'Aktual' }}
              </span>
            </td>
            <td class="tc">
              <span class="badge-shift" :class="row.shift === 'Day' ? 'badge-shift--day' : 'badge-shift--night'">
                {{ row.shift }}
              </span>
            </td>
            <td><AreaBadge :area="row.area_code" /></td>
            <td class="small">
              <div class="fp-cell">
                <span class="fp-job">{{ row.fp_job_number || row.fp_part_number }}</span>
                <span v-if="row.fp_job_number" class="fp-part">{{ row.fp_part_number }}</span>
              </div>
            </td>
            <td class="tr mono bold">{{ fmtNum(row.fp_qty_plan) }}</td>
            <td class="tc">{{ row.total_lines }}</td>
            <td class="tc">
              <span v-if="row.lines_kurang > 0" class="badge-kurang">{{ row.lines_kurang }}</span>
              <span v-else class="badge-ok">✓</span>
            </td>
            <td class="tc">
              <span class="badge-status" :class="'badge-status--' + row.status">
                {{ row.status }}
              </span>
            </td>
            <td class="tc" @click.stop>
              <div class="action-btns">
                <button
                  v-if="row.status === 'draft' && row.type === 'plan'"
                  class="act-btn act-confirm"
                  title="Konfirmasi"
                  @click="$emit('confirm', row.id)"
                >
                  <i class="mdi mdi-check"></i>
                </button>
                <button
                  v-if="row.type === 'plan' && row.status === 'draft'"
                  class="act-btn act-edit"
                  title="Edit"
                  @click="$emit('edit', row)"
                >
                  <i class="mdi mdi-pencil-outline"></i>
                </button>
                <button class="act-btn act-del" :title="row.type === 'actual' ? 'Hapus (actual)' : 'Hapus'" @click="confirmDelete(row)">
                  <i class="mdi mdi-delete-outline"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Delete dialog — Teleport ke body, di luar div.panel -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="deleteTarget" class="del-overlay" @click.self="deleteTarget = null">
        <div class="del-box">
          <div class="del-head">
            <i class="mdi mdi-delete-alert"></i>
            <span>Hapus Transaksi</span>
            <button class="del-close" @click="deleteTarget = null">✕</button>
          </div>
          <div class="del-body">
            <p class="del-code">{{ deleteTarget.trx_code }}</p>
            <div class="del-info">
              <span class="badge-type" :class="'badge-type--' + deleteTarget.type">
                {{ deleteTarget.type === 'plan' ? 'Plan' : 'Aktual' }}
              </span>
              <AreaBadge :area="deleteTarget.area_code" />
              <span class="del-fp">{{ deleteTarget.fp_job_number || deleteTarget.fp_part_number }}</span>
            </div>
            <div v-if="deleteTarget.type === 'actual'" class="del-warn">
              <i class="mdi mdi-alert-circle-outline"></i>
              Ini transaksi <strong>Aktual</strong> yang di-generate otomatis dari achievement. Menghapus hanya menghilangkan record struk,
              stok tidak akan di-rollback.
            </div>
          </div>
          <div class="del-foot">
            <button class="act-ghost" @click="deleteTarget = null">Batal</button>
            <button class="act-danger" :disabled="deleting" @click="doDelete">
              <i class="mdi" :class="deleting ? 'mdi-loading mdi-spin' : 'mdi-delete'"></i>
              {{ deleting ? 'Menghapus...' : 'Hapus' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import type { WipTrxRow, TrxFilter } from '@/types/Public/Welding/Wip';
import AreaBadge from './AreaBadge.vue';

defineProps<{ trxList: WipTrxRow[]; loading: boolean }>();

const emit = defineEmits<{
  (e: 'filter-change', f: TrxFilter): void;
  (e: 'open-detail', id: number): void;
  (e: 'confirm', id: number): void;
  (e: 'edit', row: WipTrxRow): void;
  (e: 'delete', id: number): void;
}>();

const localFilter = reactive<TrxFilter>({ trx_date: '', type: '', shift: '', status: '' });
const deleteTarget = ref<WipTrxRow | null>(null);
const deleting = ref(false);

function confirmDelete(row: WipTrxRow) {
  deleteTarget.value = row;
}

async function doDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  emit('delete', deleteTarget.value.id);
  setTimeout(() => {
    deleteTarget.value = null;
    deleting.value = false;
  }, 300);
}

function fmtNum(v: number | null | undefined): string {
  if (v == null) return '-';
  return Number(v).toLocaleString('id-ID');
}
</script>

<style scoped>
.panel {
  background: var(--wip-bg2, #fff);
  border-radius: var(--wip-radius, 8px);
  border: 1px solid var(--wip-border, #e2e8f0);
  box-shadow: var(--wip-shadow);
  overflow: hidden;
}
.filter-row {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  background: var(--wip-bg3, #f8fafc);
  border-bottom: 1px solid var(--wip-border, #e2e8f0);
  flex-wrap: wrap;
}
.table-wrap {
  overflow-x: auto;
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.tbl thead tr {
  background: var(--wip-bg3, #f8fafc);
}
.tbl th {
  padding: 10px 14px;
  text-align: left;
  color: var(--wip-muted, #6b7280);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  white-space: nowrap;
  border-bottom: 1px solid var(--wip-border, #e2e8f0);
}
.tbl td {
  padding: 9px 14px;
  border-bottom: 1px solid var(--wip-border, #e2e8f0);
  white-space: nowrap;
  color: var(--wip-text, #1a2744);
}
.tbl tbody tr:hover {
  background: #f0f7ff;
}
.tbl tbody tr:last-child td {
  border-bottom: none;
}
.trx-row {
  cursor: pointer;
}
.row--actual {
  background: #fafff4;
}
.row--actual:hover {
  background: #f0fdf4 !important;
}
.fp-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.fp-job {
  font-weight: 600;
  color: #1a2744;
  font-size: 12.5px;
}
.fp-part {
  font-size: 10.5px;
  color: #6b7280;
  font-family: 'Fira Code', monospace;
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
  color: var(--wip-muted, #6b7280);
}
.small {
  font-size: 12px;
}
.action-btns {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
}
.act-btn {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  border: 1.5px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  background: white;
}
.act-confirm {
  border-color: #16a34a;
  color: #16a34a;
}
.act-confirm:hover {
  background: #16a34a;
  color: white;
}
.act-edit {
  border-color: #2e5396;
  color: #2e5396;
}
.act-edit:hover {
  background: #2e5396;
  color: white;
}
.act-del {
  border-color: #dc2626;
  color: #dc2626;
}
.act-del:hover {
  background: #dc2626;
  color: white;
}
.badge-type {
  padding: 3px 9px;
  border-radius: 12px;
  font-size: 10.5px;
  font-weight: 700;
}
.badge-type--plan {
  background: #dbeafe;
  color: #1d4ed8;
}
.badge-type--actual {
  background: #dcfce7;
  color: #15803d;
}
.badge-shift {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}
.badge-shift--day {
  background: #dcfce7;
  color: #15803d;
}
.badge-shift--night {
  background: #e0e7ff;
  color: #4338ca;
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
.badge-kurang {
  background: #fee2e2;
  color: #dc2626;
  border-radius: 12px;
  padding: 2px 9px;
  font-size: 11px;
  font-weight: 700;
}
.badge-ok {
  color: #16a34a;
  font-size: 15px;
}
.inp {
  background: #fff;
  border: 1px solid var(--wip-border, #e2e8f0);
  color: var(--wip-text, #1a2744);
  border-radius: 7px;
  padding: 7px 11px;
  font-family: inherit;
  font-size: 13px;
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.inp:focus {
  border-color: var(--wip-accent, #2e5396);
  box-shadow: 0 0 0 3px rgba(46, 83, 150, 0.12);
}
.inp--sm {
  padding: 6px 10px;
  font-size: 12.5px;
}
/* Delete dialog */
.del-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.del-box {
  background: white;
  border-radius: 10px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}
.del-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #dc2626, #ef4444);
  color: white;
  border-radius: 10px 10px 0 0;
  font-weight: 700;
  font-size: 14px;
}
.del-head i {
  font-size: 18px;
}
.del-close {
  margin-left: auto;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 26px;
  height: 26px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.del-close:hover {
  background: rgba(255, 255, 255, 0.3);
}
.del-body {
  padding: 18px;
}
.del-code {
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #1a2744;
  margin: 0 0 10px;
}
.del-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.del-fp {
  font-size: 12px;
  color: #374151;
  font-weight: 600;
}
.del-warn {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 6px;
  font-size: 12px;
  color: #c2410c;
  line-height: 1.5;
}
.del-warn i {
  font-size: 15px;
  flex-shrink: 0;
  margin-top: 1px;
}
.del-foot {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 18px;
  border-top: 1px solid #f1f5f9;
  background: #f8fafc;
  border-radius: 0 0 10px 10px;
}
.act-ghost {
  padding: 7px 16px;
  border-radius: 7px;
  background: white;
  border: 1.5px solid #e5e7eb;
  color: #374151;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.act-ghost:hover {
  background: #f3f4f6;
}
.act-danger {
  padding: 7px 16px;
  border-radius: 7px;
  background: #dc2626;
  border: none;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.act-danger:hover:not(:disabled) {
  background: #b91c1c;
}
.act-danger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
