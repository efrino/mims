<!-- components/welding/lkh/LKHTableHeader.vue -->
<!-- 21 kolom: NO | JOB NO | PART NO | MC WELD | Σ Nut/Spot | Qty/Kbn | PATAN(6) | CUT OFF KBN(4) | Actual Prod(3) | BLC | Keterangan -->
<template>
    <thead>
        <!-- Baris 1: Group headers -->
        <tr>
            <th rowspan="2" class="hcell sticky-col col-no">NO.</th>
            <th rowspan="2" class="hcell sticky-col col-job">JOB NO</th>
            <th rowspan="2" class="hcell sticky-col col-part">PART NO.</th>

            <th rowspan="2" class="hcell info-hdr col-mc">MC<br>WELD</th>
            <th rowspan="2" class="hcell info-hdr col-nut">Σ Nut /<br>Spot</th>
            <th rowspan="2" class="hcell info-hdr col-kbn">Qty /<br>Kbn</th>

            <th colspan="6" class="hcell section-hdr patan-hdr">PATAN</th>
            <th colspan="4" class="hcell section-hdr cutoff-hdr">PLANNING PROD</th>
            <th colspan="3" class="hcell section-hdr actual-hdr">ACTUAL PROD</th>

            <th rowspan="2" class="hcell info-hdr col-blc">BLC</th>
            <th rowspan="2" class="hcell sticky-right col-ket">KETERANGAN</th>
        </tr>

        <!-- Baris 2: Sub headers -->
        <tr>
            <!-- PATAN -->
            <th class="hcell sub-hdr patan-sub col-p">Σ kbn</th>
            <th class="hcell sub-hdr patan-sub col-p">Lot<br>size</th>
            <th class="hcell sub-hdr patan-sub col-p">Lot<br>cycle</th>
            <th class="hcell sub-hdr patan-sub col-p">UPH</th>
            <th class="hcell sub-hdr patan-sub col-p">Σ<br>stroke</th>
            <th class="hcell sub-hdr patan-sub col-p">TPT</th>

            <!-- PLANNING PROD -->
            <th class="hcell sub-hdr cutoff-sub col-c">Σ kbn</th>
            <th class="hcell sub-hdr cutoff-sub col-c">Lot<br>size</th>
            <th class="hcell sub-hdr cutoff-sub col-c">Σ<br>stroke</th>
            <th class="hcell sub-hdr cutoff-sub col-c">TPT</th>

            <!-- Actual Prod -->
            <th class="hcell sub-hdr actual-sub col-a">Lot<br>size</th>
            <th class="hcell sub-hdr pjk-sub   col-pjk">PJK</th>
            <th class="hcell sub-hdr actual-sub col-a">TPT</th>
        </tr>
    </thead>
</template>

<script setup lang="ts">
// Tidak ada props untuk header ini
</script>

<style scoped>
/* ── Sticky Left ──────────────────────────────────────────────── */
.sticky-col { position: sticky; z-index: 100 !important; }
.col-no  { left: 0;      width: 36px;  min-width: 36px;  z-index: 101 !important; }
.col-job { left: 36px;   width: 140px; min-width: 140px; z-index: 101 !important; }
.col-part {
    left: 176px;
    width: 115px;
    min-width: 115px;
    z-index: 101 !important;
    border-right: 2px solid rgba(255,255,255,.4) !important;
    box-shadow: 2px 0 6px rgba(0,0,0,.2);
}

/* ── Fixed-width info cols ────────────────────────────────────── */
.col-mc  { width: 72px;  min-width: 72px; }
.col-nut { width: 52px;  min-width: 52px; }
.col-kbn { width: 50px;  min-width: 50px; }
.col-blc { width: 50px;  min-width: 50px; }

/* PATAN sub-col widths */
.col-p   { width: 52px;  min-width: 52px; }

/* CUT OFF sub-col widths */
.col-c   { width: 52px;  min-width: 52px; }

/* Actual sub-col widths */
.col-a   { width: 58px;  min-width: 58px; }
.col-pjk { width: 68px;  min-width: 68px; }

/* ── Sticky Right ─────────────────────────────────────────────── */
.sticky-right {
    position: sticky;
    right: 0;
    z-index: 100 !important;
    border-left: 2px solid rgba(255,255,255,.4) !important;
    box-shadow: -2px 0 6px rgba(0,0,0,.2);
}
.col-ket { width: 140px; min-width: 140px; }

/* ── Base header cell ─────────────────────────────────────────── */
.hcell {
    background: linear-gradient(to bottom, #4472C4 0%, #2E5396 100%);
    color: white;
    font-weight: 700;
    padding: 4px 3px;
    border: 1px solid rgba(255,255,255,.2);
    text-align: center;
    vertical-align: middle;
    white-space: nowrap;
    position: sticky;
    top: 0;
    font-size: 9px;
    line-height: 1.3;
}

thead tr:first-child th  { height: 36px; }
thead tr:nth-child(2) th { top: 36px; }

/* ── Section headers ──────────────────────────────────────────── */
.section-hdr { font-size: 10px; font-weight: 700; letter-spacing: .3px; }

/* Info (abu-abu) */
.info-hdr { background: linear-gradient(to bottom, #6B7280 0%, #4B5563 100%) !important; }

/* PATAN (ungu) */
.patan-hdr { background: linear-gradient(to bottom, #7C3AED 0%, #5B21B6 100%) !important; }
.patan-sub { background: linear-gradient(to bottom, #8B5CF6 0%, #7C3AED 100%) !important; }

/* PLANNING PROD (biru-teal) */
.cutoff-hdr { background: linear-gradient(to bottom, #0284C7 0%, #075985 100%) !important; }
.cutoff-sub { background: linear-gradient(to bottom, #0EA5E9 0%, #0284C7 100%) !important; }

/* Actual Prod (hijau) */
.actual-hdr { background: linear-gradient(to bottom, #059669 0%, #065F46 100%) !important; }
.actual-sub { background: linear-gradient(to bottom, #10B981 0%, #059669 100%) !important; }

/* PJK — hijau terang, kolom utama input actual */
.pjk-sub {
    background: linear-gradient(to bottom, #34D399 0%, #10B981 100%) !important;
    color: #064E3B !important;
    font-size: 10px;
    font-weight: 800;
}

/* Sub header base */
.sub-hdr { font-size: 8px; font-weight: 600; padding: 3px 2px; }
</style>
