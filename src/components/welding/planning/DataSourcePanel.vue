<template>
  <!-- DataSourcePanel.vue -->
  <div class="ds-panel">
    <div class="ds-title">
      <i class="ti ti-topology-star-3" />
      Sumber Data Pipeline
    </div>
    <div class="ds-subtitle">Pipeline membaca dari {{ SOURCES.length }} tabel input dan menghasilkan 1 tabel output utama.</div>

    <!-- ── Flow diagram (vertical) ─────────────────────────────────────────── -->
    <div class="ds-flow">
      <!-- ① INPUT: grid 3 kolom -->
      <div class="ds-flow-block">
        <div class="ds-flow-label-row">
          <span class="ds-badge ds-badge--input">INPUT</span>
          <span class="ds-label-desc">{{ SOURCES.length }} sumber data dibaca setiap pipeline dijalankan</span>
        </div>
        <div class="ds-inputs-grid">
          <div v-for="src in SOURCES" :key="src.table" class="ds-card" :class="`ds-card--${src.color}`">
            <div class="ds-card-icon">
              <i :class="`ti ti-${src.icon}`" />
            </div>
            <div class="ds-card-body">
              <div class="ds-card-role">{{ src.role }}</div>
              <div class="ds-card-table">{{ src.table }}</div>
              <div class="ds-card-desc">{{ src.desc }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ② Connector: down-arrow ke engine -->
      <div class="ds-flow-connector">
        <div class="ds-vline" />
        <div class="ds-merge-node">
          <i class="ti ti-arrow-merge-alt-left" />
          <span>{{ SOURCES.length }} tabel digabungkan</span>
        </div>
        <div class="ds-vline" />
      </div>

      <!-- ③ ENGINE + OUTPUT side by side -->
      <div class="ds-process-row">
        <!-- Engine circle -->
        <div class="ds-engine">
          <i class="ti ti-settings-automation spin-slow" />
          <div class="ds-engine-label">Pipeline</div>
          <div class="ds-engine-sub">16 langkah kalkulasi</div>
        </div>

        <!-- Arrow → output -->
        <div class="ds-h-arrow" />

        <!-- Output block -->
        <div class="ds-output-block">
          <div class="ds-flow-label-row ds-flow-label-row--right">
            <span class="ds-badge ds-badge--output">OUTPUT</span>
          </div>
          <div class="ds-card ds-card--output">
            <div class="ds-card-icon">
              <i class="ti ti-table-export" />
            </div>
            <div class="ds-card-body">
              <div class="ds-card-role">Hasil Planning</div>
              <div class="ds-card-table">mutasi_weld</div>
              <div class="ds-card-desc">Jadwal produksi per part per hari untuk semua shift, lengkap dengan status stok dan prioritas.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Detail tabel ───────────────────────────────────────────────────── -->
    <div class="ds-detail-grid">
      <div v-for="src in ALL_TABLES" :key="src.table" class="ds-detail-card" :class="`ds-detail-card--${src.color}`">
        <div class="ds-detail-head">
          <i :class="`ti ti-${src.icon}`" />
          <span class="ds-detail-table">{{ src.table }}</span>
          <span class="ds-detail-dir ds-detail-dir--input" v-if="src.dir === 'input'">INPUT</span>
          <span class="ds-detail-dir ds-detail-dir--output" v-else>OUTPUT</span>
        </div>
        <div class="ds-detail-role">{{ src.role }}</div>
        <div class="ds-detail-desc">{{ src.desc }}</div>
        <div class="ds-detail-fields">
          <span v-for="f in src.fields" :key="f" class="ds-field">{{ f }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ─── Data source definitions ──────────────────────────────────────────────────

const SOURCES = [
  {
    role: 'Master Part Welding',
    table: 'ms_welding',
    icon: 'box',
    color: 'blue',
    desc: 'Daftar semua part yang diproduksi di area welding beserta line-nya.'
  },
  {
    role: 'Data MDFO',
    table: 'mdfo',
    icon: 'calendar-stats',
    color: 'purple',
    desc: 'Minimum Days For Order — hari minimum sebelum perlu mulai produksi.'
  },
  {
    role: 'Jadwal DN (Delivery)',
    table: 'mieruka_delivery',
    icon: 'truck-delivery',
    color: 'orange',
    desc: 'Jadwal delivery yang sudah dikonfirmasi — menjadi jadwal fix dan prioritas utama.'
  },
  {
    role: 'Stok Awal (Carry-Forward)',
    table: 'mutasi_weld (bulan lalu)',
    icon: 'package',
    color: 'teal',
    desc: 'Stok penutupan shift malam hari terakhir bulan sebelumnya — jadi initial_stock bulan berjalan (bukan lagi dari IFPD/rundown eksternal).'
  },
  {
    role: 'Hari Kerja',
    table: 'workdays_group',
    icon: 'calendar-week',
    color: 'green',
    desc: 'Kalender hari kerja — planning hanya dibuat untuk hari yang bukan libur.'
  },
  {
    role: 'Histori Produksi',
    table: 'welding_achievement',
    icon: 'chart-bar',
    color: 'rose',
    desc: 'Data aktual hasil produksi per shift — dipakai untuk hitung pcs/hari, pola achievement, dan deteksi miss kronis.'
  }
];

interface TableDef {
  role: string;
  table: string;
  icon: string;
  color: string;
  dir: 'input' | 'output';
  desc: string;
  fields: string[];
}

const ALL_TABLES: TableDef[] = [
  ...SOURCES.map((s) => ({ ...s, dir: 'input' as const, fields: [] as string[] })),
  {
    role: 'Hasil Planning Welding',
    table: 'mutasi_weld',
    icon: 'table-export',
    color: 'indigo',
    dir: 'output' as const,
    desc: 'Tabel output utama — berisi jadwal produksi per part per hari, status stok, dan informasi shift.',
    fields: ['tanggal', 'part_number', 'line', 'shift', 'qty_plan', 'stock_status', 'priority_rank', 'source_type']
  }
];
</script>

<style scoped>
/* ── Panel wrapper ─────────────────────────────────────────────────────────── */
.ds-panel {
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-lg);
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
}

.ds-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 4px;
}

.ds-subtitle {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

/* ── Flow diagram ─────────────────────────────────────────────────────────── */
.ds-flow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  margin-bottom: 1.5rem;
}

/* ── Flow blocks ─────────────────────────────────────────────────────────── */
.ds-flow-block {
  width: 100%;
}

.ds-flow-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.ds-flow-label-row--right {
  justify-content: flex-start;
}

.ds-label-desc {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.ds-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}
.ds-badge--input {
  background: #dbeafe;
  color: #2563eb;
}
.ds-badge--output {
  background: #e0e7ff;
  color: #4338ca;
}

/* ── Input grid ──────────────────────────────────────────────────────────── */
.ds-inputs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
@media (max-width: 700px) {
  .ds-inputs-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 440px) {
  .ds-inputs-grid {
    grid-template-columns: 1fr;
  }
}

/* ── Connector (down) ────────────────────────────────────────────────────── */
.ds-flow-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 6px 0;
}

.ds-vline {
  width: 2px;
  height: 14px;
  background: var(--color-border-secondary);
  border-radius: 1px;
}

.ds-merge-node {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-text-tertiary);
  background: var(--color-background-secondary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: 20px;
  padding: 4px 12px;
  white-space: nowrap;
}
.ds-merge-node i {
  font-size: 14px;
}

/* ── Process row: engine + arrow + output ────────────────────────────────── */
.ds-process-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: 100%;
}

/* ── Engine circle ───────────────────────────────────────────────────────── */
.ds-engine {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: var(--color-background-primary);
  box-shadow:
    0 0 0 2px var(--color-border-secondary, #d1d5db),
    0 2px 12px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
  font-size: 24px;
  color: var(--color-text-secondary);
  text-align: center;
}

.ds-engine-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: 0.03em;
}

.ds-engine-sub {
  font-size: 9px;
  color: var(--color-text-tertiary);
  text-align: center;
}

/* ── Horizontal arrow → ─────────────────────────────────────────────────── */
.ds-h-arrow {
  width: 32px;
  height: 2px;
  background: var(--color-border-secondary);
  position: relative;
  flex-shrink: 0;
}

.ds-h-arrow::after {
  content: '';
  position: absolute;
  right: -1px;
  top: 50%;
  transform: translateY(-50%);
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 7px solid var(--color-border-secondary);
}

/* ── Output block ────────────────────────────────────────────────────────── */
.ds-output-block {
  flex: 1;
  max-width: 320px;
}

/* ── Cards ───────────────────────────────────────────────────────────────── */
.ds-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 0.625rem 0.875rem;
  border-radius: var(--border-radius-md);
  box-shadow: 0 0 0 0.5px var(--color-border-tertiary, #e5e7eb);
  background: var(--color-background-secondary);
  transition: box-shadow 0.15s;
}
.ds-card:hover {
  box-shadow:
    0 0 0 0.5px var(--color-border-tertiary, #e5e7eb),
    0 2px 8px rgba(0, 0, 0, 0.06);
}

.ds-card-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.ds-card--blue .ds-card-icon {
  background: #dbeafe;
  color: #2563eb;
}
.ds-card--purple .ds-card-icon {
  background: #ede9fe;
  color: #7c3aed;
}
.ds-card--orange .ds-card-icon {
  background: #fed7aa;
  color: #ea580c;
}
.ds-card--teal .ds-card-icon {
  background: #ccfbf1;
  color: #0d9488;
}
.ds-card--green .ds-card-icon {
  background: #dcfce7;
  color: #16a34a;
}
.ds-card--rose .ds-card-icon {
  background: #ffe4e6;
  color: #e11d48;
}
.ds-card--output .ds-card-icon {
  background: #e0e7ff;
  color: #4338ca;
}

.ds-card-body {
  flex: 1;
  min-width: 0;
}

.ds-card-role {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
  margin-bottom: 1px;
}

.ds-card-table {
  font-size: 12px;
  font-weight: 500;
  font-family: var(--font-mono, monospace);
  color: var(--color-text-primary);
  margin-bottom: 3px;
}

.ds-card-desc {
  font-size: 11px;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.ds-card--output {
  box-shadow: 0 0 0 1px rgba(67, 56, 202, 0.25);
  background: #f5f3ff;
}

/* ── Detail grid ─────────────────────────────────────────────────────────── */
.ds-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-top: 0.5rem;
}

.ds-detail-card {
  padding: 0.75rem;
  border-radius: var(--border-radius-md);
  box-shadow: 0 0 0 0.5px var(--color-border-tertiary, #e5e7eb);
  background: var(--color-background-secondary);
}

.ds-detail-head {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
  font-size: 12px;
}

.ds-detail-table {
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-primary);
  flex: 1;
}

.ds-detail-dir {
  font-size: 9px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: 0.04em;
}
.ds-detail-dir--input {
  background: #dbeafe;
  color: #2563eb;
}
.ds-detail-dir--output {
  background: #e0e7ff;
  color: #4338ca;
}

.ds-detail-role {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 3px;
}

.ds-detail-desc {
  font-size: 11px;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin-bottom: 6px;
}

.ds-detail-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.ds-field {
  font-size: 10px;
  font-family: var(--font-mono, monospace);
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: 4px;
  padding: 1px 6px;
  color: var(--color-text-secondary);
}

.ds-detail-card--blue {
  border-left: 3px solid #2563eb;
}
.ds-detail-card--purple {
  border-left: 3px solid #7c3aed;
}
.ds-detail-card--orange {
  border-left: 3px solid #ea580c;
}
.ds-detail-card--teal {
  border-left: 3px solid #0d9488;
}
.ds-detail-card--green {
  border-left: 3px solid #16a34a;
}
.ds-detail-card--rose {
  border-left: 3px solid #e11d48;
}
.ds-detail-card--indigo {
  border-left: 3px solid #4338ca;
}

.ds-detail-card--blue .ti {
  color: #2563eb;
}
.ds-detail-card--purple .ti {
  color: #7c3aed;
}
.ds-detail-card--orange .ti {
  color: #ea580c;
}
.ds-detail-card--teal .ti {
  color: #0d9488;
}
.ds-detail-card--green .ti {
  color: #16a34a;
}
.ds-detail-card--rose .ti {
  color: #e11d48;
}
.ds-detail-card--indigo .ti {
  color: #4338ca;
}

/* ── Animations ──────────────────────────────────────────────────────────── */
@keyframes spin-slow {
  to {
    transform: rotate(360deg);
  }
}
.spin-slow {
  display: inline-block;
  animation: spin-slow 4s linear infinite;
}
</style>
