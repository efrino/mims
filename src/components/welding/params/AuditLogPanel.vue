<!-- components/welding/params/AuditLogPanel.vue
     Log Welding (audit perubahan formula, jadwal, master, mutasi) — tab di halaman
     PCD › Auto › Params Mutasi (2026-09-25; dulu halaman sendiri /pcd/welding/audit-log,
     sebelumnya tab di console Planning CMS). Reuse usePlanningConfig() fetchAuditLog. -->
<template>
  <div class="alp">
    <div class="audit-filters">
      <select v-model="auditFilter.module" class="filter-input" @change="loadAudit()">
        <option value="">Semua modul</option>
        <option value="planning_config">Planning Config</option>
        <option value="formula_engine">Pipeline / Cron Refresh</option>
        <option value="master_data">Master Data</option>
        <option value="achievement">Achievement</option>
        <option value="mutasi">Mutasi</option>
        <option value="lkh">LKH</option>
        <option value="machine_master">Machine Master</option>
      </select>
      <select v-model="auditFilter.action_type" class="filter-input" @change="loadAudit()">
        <option value="">Semua aksi</option>
        <optgroup label="Planning Config">
          <option value="formula_change">Perubahan Rumus</option>
        </optgroup>
        <optgroup label="Pipeline / Cron Refresh">
          <option value="pipeline_run">Jalankan Pipeline (Cron/Manual)</option>
        </optgroup>
        <optgroup label="Master Data">
          <option value="master_data_create">Tambah Master</option>
          <option value="master_data_update">Update Master</option>
          <option value="master_data_delete">Hapus Master</option>
          <option value="master_data_deactivate">Nonaktifkan Master</option>
        </optgroup>
        <optgroup label="Achievement">
          <option value="achievement_edit">Edit Achievement</option>
          <option value="achievement_manual_add">Tambah Baris Manual</option>
          <option value="achievement_delete">Hapus Achievement</option>
          <option value="achievement_master_writeback">Write-back Master</option>
        </optgroup>
        <optgroup label="Mutasi">
          <option value="plan_lock">Kunci Plan</option>
          <option value="plan_unlock">Buka Kunci Plan</option>
          <option value="plan_reset">Reset Plan ke Auto</option>
          <option value="plan_bulk_unlock">Buka Kunci Massal</option>
          <option value="initial_stock_edit">Edit Initial Stock</option>
          <option value="initial_stock_reset">Reset Initial Stock</option>
          <option value="stock_adjust">Koreksi Stok/Actual</option>
          <option value="shift_mode_change">Ubah Mode Shift</option>
          <option value="part_area_move">Pindah Area Part</option>
          <option value="dn_adjust">Adjust DN</option>
          <option value="dn_adjust_reset">Hapus Adjust DN</option>
        </optgroup>
        <optgroup label="LKH">
          <option value="lkh_generate">Generate LKH</option>
          <option value="lkh_delete">Hapus LKH</option>
          <option value="lkh_actual_edit">Edit Actual LKH</option>
          <option value="lkh_field_edit">Edit Field LKH</option>
        </optgroup>
        <optgroup label="Machine Master">
          <option value="machine_master_create">Tambah Mesin</option>
          <option value="machine_master_update">Update Mesin</option>
          <option value="machine_master_toggle">Toggle Aktif Mesin</option>
        </optgroup>
      </select>
      <input v-model="auditFilter.changed_by" type="text" placeholder="NIK user..." class="filter-input" @keyup.enter="loadAudit()" />
      <input v-model="auditFilter.date_from" type="date" class="filter-input" @change="loadAudit()" />
      <input v-model="auditFilter.date_to" type="date" class="filter-input" @change="loadAudit()" />
      <button class="btn btn--outline btn--sm" @click="loadAudit()">
        <i class="mdi mdi-magnify"></i> Cari
      </button>
    </div>

    <div class="audit-table-wrap">
      <table class="audit-table">
        <thead>
          <tr>
            <th>Waktu</th><th>Aksi</th><th>Modul</th>
            <th>Field</th><th>Sebelum</th><th>Sesudah</th><th>Oleh</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="loading-cell"><i class="mdi mdi-loading mdi-spin"></i> Memuat...</td>
          </tr>
          <tr v-else-if="!auditLogs.length">
            <td colspan="7" class="empty-cell">Tidak ada data.</td>
          </tr>
          <tr v-for="log in auditLogs" :key="log.id">
            <td class="td-time">{{ fmtDatetime(log.changed_at) }}</td>
            <td>
              <span class="audit-badge" :class="`audit-badge--${actionClass(log.action_type)}`">
                {{ actionLabel(log.action_type) }}
              </span>
            </td>
            <td class="td-mono">
              {{ log.module }}
              <span v-if="log.table_affected" class="td-sub">{{ log.table_affected }}</span>
            </td>
            <td class="td-mono">{{ log.field_name ?? log.record_id ?? '-' }}</td>
            <td class="td-val td-val--old">{{ log.old_value ?? '-' }}</td>
            <td class="td-val td-val--new">{{ log.new_value ?? '-' }}</td>
            <td class="td-nik">{{ log.changed_by }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="auditMeta.pages > 1" class="pagination">
      <button class="btn btn--sm btn--outline" :disabled="auditMeta.page <= 1" @click="changePage(auditMeta.page - 1)">
        <i class="mdi mdi-chevron-left"></i>
      </button>
      <span class="page-info">Hal {{ auditMeta.page }} / {{ auditMeta.pages }} ({{ auditMeta.total }} entri)</span>
      <button class="btn btn--sm btn--outline" :disabled="auditMeta.page >= auditMeta.pages" @click="changePage(auditMeta.page + 1)">
        <i class="mdi mdi-chevron-right"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { usePlanningConfig } from '@/composables/usePlanningConfig'

const { auditLogs, auditMeta, loading, fetchAuditLog } = usePlanningConfig()

const auditFilter = ref({ module: '', action_type: '', changed_by: '', date_from: '', date_to: '', page: 1, per_page: 20 })

async function loadAudit(silent = false) {
  await fetchAuditLog({ ...auditFilter.value }, silent)
}
async function changePage(page: number) {
  auditFilter.value.page = page
  await loadAudit()
}

function fmtDatetime(dt: string) {
  if (!dt) return '-'
  const d = new Date(dt)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
function actionClass(action: string): string {
  const map: Record<string, string> = {
    // Planning config / pipeline / master data (existing)
    formula_change: 'info', schedule_override: 'warning', schedule_lock: 'neutral',
    schedule_unlock: 'neutral', lkh_generate: 'success', mdfo_edit: 'info',
    dn_adjust: 'warning', achievement_edit: 'info', master_edit: 'neutral',
    pipeline_run: 'success',
    master_data_create: 'success', master_data_update: 'info',
    master_data_delete: 'danger', master_data_deactivate: 'warning',
    // Achievement
    achievement_manual_add: 'success', achievement_delete: 'danger',
    achievement_master_writeback: 'neutral',
    // Mutasi
    plan_lock: 'neutral', plan_unlock: 'neutral', plan_reset: 'warning',
    plan_bulk_unlock: 'warning', initial_stock_edit: 'info', initial_stock_reset: 'warning',
    stock_adjust: 'info', shift_mode_change: 'neutral', part_area_move: 'warning',
    dn_adjust_reset: 'neutral', dn_rule_customer_save: 'info', dn_rule_customer_delete: 'warning',
    // LKH
    lkh_delete: 'danger', lkh_actual_edit: 'info', lkh_field_edit: 'info',
    // Machine master
    machine_master_create: 'success', machine_master_update: 'info',
    machine_master_toggle: 'neutral',
  }
  return map[action] ?? 'neutral'
}
function actionLabel(action: string): string {
  const map: Record<string, string> = {
    formula_change: 'Perubahan Rumus', schedule_override: 'Override Jadwal',
    schedule_lock: 'Kunci Jadwal', schedule_unlock: 'Buka Jadwal',
    lkh_generate: 'Generate LKH', mdfo_edit: 'Edit MDFO',
    dn_adjust: 'Adjust DN', achievement_edit: 'Edit Achievement', master_edit: 'Edit Master',
    pipeline_run: 'Jalankan Pipeline',
    master_data_create: 'Tambah Master', master_data_update: 'Update Master',
    master_data_delete: 'Hapus Master', master_data_deactivate: 'Nonaktifkan Master',
    achievement_manual_add: 'Tambah Baris Manual', achievement_delete: 'Hapus Achievement',
    achievement_master_writeback: 'Write-back Master',
    plan_lock: 'Kunci Plan', plan_unlock: 'Buka Kunci Plan', plan_reset: 'Reset Plan ke Auto',
    plan_bulk_unlock: 'Buka Kunci Massal', initial_stock_edit: 'Edit Initial Stock',
    initial_stock_reset: 'Reset Initial Stock', stock_adjust: 'Koreksi Stok/Actual',
    shift_mode_change: 'Ubah Mode Shift', part_area_move: 'Pindah Area Part',
    dn_adjust_reset: 'Hapus Adjust DN', dn_rule_customer_save: 'Simpan Aturan DN Customer',
    dn_rule_customer_delete: 'Hapus Aturan DN Customer',
    lkh_delete: 'Hapus LKH', lkh_actual_edit: 'Edit Actual LKH', lkh_field_edit: 'Edit Field LKH',
    machine_master_create: 'Tambah Mesin', machine_master_update: 'Update Mesin',
    machine_master_toggle: 'Toggle Aktif Mesin',
  }
  return map[action] ?? action
}

// Realtime via polling (2026-08-01) — awalnya coba Socket.IO ('newAuditLog'),
// TAPI socket_server.js (proses Node produksi bersama, dipakai SEMUA fitur
// realtime platform) tak boleh disentuh (dilarang eksplisit, blast radius
// restart terlalu besar) dan tak punya relay handler utk event ini. Polling
// ringan tiap 8 detik, HANYA saat sedang di halaman 1 (biar tak mengacaukan
// user yang lagi lihat halaman/filter lain), silent (tak toggle `loading`
// supaya tak ganggu UX saat user sedang baca tabel).
let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  loadAudit()
  pollTimer = setInterval(() => {
    if (auditFilter.value.page === 1) loadAudit(true)
  }, 8000)
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.alp { display: flex; flex-direction: column; }

.audit-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.filter-input {
  height: 32px; padding: 0 10px; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 12px; color: #334155; background: #fff; outline: none;
}
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; height: 32px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
.btn--outline { border: 1px solid #e2e8f0; background: #fff; color: #475569; }
.btn--outline:hover:not(:disabled) { background: #f8fafc; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.audit-table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow-x: auto; }
.audit-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.audit-table thead th {
  text-align: left; padding: 8px 16px; background: #f8fafc; color: #64748b;
  font-weight: 700; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.03em;
  border-bottom: 1px solid #e2e8f0; white-space: nowrap;
}
.audit-table tbody td { padding: 8px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; white-space: nowrap; }
.loading-cell, .empty-cell { text-align: center; padding: 24px; color: #94a3b8; }
.td-mono { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 11.5px; }
.td-sub { display: block; font-size: 10px; color: #94a3b8; margin-top: 1px; }
.td-val { max-width: 220px; overflow: hidden; text-overflow: ellipsis; }
.td-val--old { color: #dc2626; }
.td-val--new { color: #059669; }

.audit-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 600; }
.audit-badge--info    { background: #eff6ff; color: #1d4ed8; }
.audit-badge--warning { background: #fffbeb; color: #b45309; }
.audit-badge--success { background: #ecfdf5; color: #059669; }
.audit-badge--neutral { background: #f1f5f9; color: #64748b; }
.audit-badge--danger  { background: #fef2f2; color: #dc2626; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 12px; }
.page-info { font-size: 12px; color: #64748b; }
</style>
