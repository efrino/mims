<!-- views/public/welding/plan/master-data.vue -->
<template>
  <div class="md-page">
    <!-- Header -->
    <div class="md-header">
      <div class="md-header-left">
        <div class="md-header-icon"><i class="mdi mdi-database-cog"></i></div>
        <div>
          <h1 class="md-title">MASTER DATA PART</h1>
          <p class="md-subtitle">Manajemen data part, BOM, dan hierarki produksi</p>
        </div>
      </div>
      <div class="md-header-actions">
        <button class="md-btn md-btn-violet" @click="uploadMenuOpen = true" title="Menu Aplikasi (U)">
          <i class="mdi mdi-apps"></i> Menu Aplikasi <kbd class="btn-kbd">U</kbd>
        </button>
        <button v-if="can.create" class="md-btn md-btn-primary" @click="openCreateModal" title="Tambah Part (N)"><i class="mdi mdi-plus"></i> Tambah Part <kbd class="btn-kbd">N</kbd></button>
      </div>
    </div>

    <!-- Papan pemasangan WIP (steker ↔ stop kontak) -->
    <WipPairingBoard
      :show="pairingOpen"
      :areas="areas"
      @close="pairingOpen = false; uploadMenuOpen = true;"
      @changed="onWipPaired"
      @edit-part="onEditPartFromBoard"
    />

    <!-- Stats -->
    <div class="md-stats" v-if="stats">
      <div class="md-stat">
        <span class="md-stat-val">{{ stats.total_rows.toLocaleString() }}</span
        ><span class="md-stat-lbl">Total Baris</span>
      </div>
      <div class="md-stat md-stat--part">
        <span class="md-stat-val">{{ stats.total_parts.toLocaleString() }}</span
        ><span class="md-stat-lbl">Total Part</span>
      </div>
      <div class="md-stat md-stat--fp">
        <span class="md-stat-val">{{ stats.total_fp.toLocaleString() }}</span
        ><span class="md-stat-lbl">FP</span>
      </div>
      <div class="md-stat md-stat--wip">
        <span class="md-stat-val">{{ stats.total_wip.toLocaleString() }}</span
        ><span class="md-stat-lbl">WIP</span>
      </div>
      <div class="md-stat md-stat--area">
        <span class="md-stat-val">{{ stats.total_areas }}</span
        ><span class="md-stat-lbl">Area</span>
      </div>
      <!-- SELALU tampil (dulu v-if total_obsolete>0) — jumlah kartu berubah2
           tiap ganti layer/tab bikin toolbar & tabel di bawahnya naik-turun. -->
      <div class="md-stat md-stat--obsolete">
        <span class="md-stat-val">{{ stats.total_obsolete.toLocaleString() }}</span
        ><span class="md-stat-lbl">RUN OUT</span>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="md-toolbar">
      <!-- Layer tabs: IFRM · CKD · IFPP · IFPW · IFPD -->
      <div class="md-layer-nav">
        <div class="md-area-tabs">
          <button class="md-area-tab" :class="{ active: selectedLayer === null }" @click="selectLayer(null)">Semua</button>
          <button
            v-for="lc in LAYER_CONFIG" :key="lc.key"
            class="md-area-tab md-area-tab--layer"
            :class="{ active: selectedLayer === lc.key }"
            @click="selectLayer(lc.key)"
          >{{ lc.key }}</button>
        </div>
        <!-- Sub-area chips: baris ini SELALU di-render (min-height tetap via CSS)
             walau kosong (layer tanpa subs, mis. IFRM/CKD) — dulu pakai v-if yg
             menghapus row dari DOM, jadi tabel di bawahnya "naik-turun" tiap
             ganti tab layer (row muncul/hilang = tinggi toolbar berubah). -->
        <div class="md-sub-area-row">
          <template v-if="selectedLayer && activeLayerSubs.length">
            <button
              class="md-sub-chip"
              :class="{ active: selectedSubArea === null }"
              @click="selectSubArea(null)"
            >Semua</button>
            <button
              v-for="sub in activeLayerSubs" :key="sub.key"
              class="md-sub-chip"
              :class="{ active: selectedSubArea === sub.key, 'md-sub-chip--off': sub.off }"
              :title="sub.off ? 'Area nonaktif' : (sub.empty ? 'Belum ada zone di master area' : '')"
              @click="selectSubArea(sub.key)"
            >{{ sub.label }}</button>
          </template>
        </div>
      </div>
      <div class="md-toolbar-right">
        <div class="md-seg">
          <button
            class="md-seg-btn"
            :class="{ active: filterWip === null }"
            @click="filterWip = null; _saveFilterState(); loadList();"
          >
            Semua
          </button>
          <button
            class="md-seg-btn"
            :class="{ active: filterWip === 0 }"
            @click="filterWip = 0; _saveFilterState(); loadList();"
          >
            FP
          </button>
          <button
            class="md-seg-btn"
            :class="{ active: filterWip === 1 }"
            @click="filterWip = 1; _saveFilterState(); loadList();"
          >
            WIP
          </button>
        </div>
        <div class="md-seg">
          <button
            class="md-seg-btn"
            :class="{ active: filterStatus === 'all' }"
            @click="filterStatus = 'all'; _saveFilterState(); loadList(1);"
          >
            Semua
          </button>
          <button
            class="md-seg-btn md-seg-btn--active"
            :class="{ active: filterStatus === 'active' }"
            @click="filterStatus = 'active'; _saveFilterState(); loadList(1);"
          >
            Aktif
          </button>
          <button
            class="md-seg-btn md-seg-btn--obsolete"
            :class="{ active: filterStatus === 'obsolete' }"
            @click="filterStatus = 'obsolete'; _saveFilterState(); loadList(1);"
          >
            Nonaktif
          </button>
        </div>
        <div class="md-search-wrap">
          <i class="mdi mdi-magnify md-search-icon"></i>
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            class="md-search"
            placeholder="Cari part / job / alias — pakai * mis. 57111*  ( / )"
            title="Wildcard gaya SAP: * = banyak karakter, ? = 1 karakter. 57111* = diawali 57111, *BZ010* = mengandung BZ010. Tanpa * = mengandung."
            @input="onSearchInput"
          />
          <button
            v-if="searchQuery"
            class="md-search-clear"
            @click="
              searchQuery = '';
              loadList();
            "
          >
            <i class="mdi mdi-close"></i>
          </button>
        </div>
        <select v-model="perPage" @change="loadList(1)" class="md-select">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>
    </div>

    <!-- Upload Result -->
    <Transition name="slide-down">
      <div v-if="uploadResult" class="md-upload-result" :class="uploadResult.success ? 'success' : 'error'">
        <i class="mdi" :class="uploadResult.success ? 'mdi-check-circle' : 'mdi-alert-circle'"></i>
        <div class="upload-result-body">
          <span>{{ uploadResult.message }}</span>
          <div v-if="uploadResult.result && uploadResult.result.errors && uploadResult.result.errors.length" class="md-upload-errors">
            <span v-for="(err, i) in uploadResult.result.errors.slice(0, 5)" :key="i" class="md-upload-error-item">{{ err }}</span>
          </div>
        </div>
        <button class="md-upload-result-close" @click="uploadResult = null"><i class="mdi mdi-close"></i></button>
      </div>
    </Transition>

    <!-- Table -->
    <div ref="tableWrapEl" class="md-table-wrap">
      <div v-if="loading" class="md-table-loading-bar"><span></span></div>
      <div v-if="!loading && rows.length === 0" class="md-empty">
        <i class="mdi mdi-database-off-outline"></i>
        <p>Belum ada data</p>
        <span>Upload file Excel atau tambah data secara manual</span>
      </div>
      <template v-else-if="rows.length > 0">
      <div v-if="hasActiveFilters" class="md-filter-summary">
        <span>Filter aktif: {{ Object.entries(filters).filter(([_, list]) => list.length).map(([key, list]) => `${key.toUpperCase()} (${list.length})`).join(', ') }}</span>
        <button type="button" @click="clearFilter()">Hapus semua filter</button>
      </div>
      <div v-if="displayRows.length === 0" class="md-empty">
        <i class="mdi mdi-filter-remove-outline"></i>
        <p>Tidak ada hasil filter</p>
        <span>Ubah kriteria filter atau bersihkan filter aktif</span>
      </div>
      <table v-if="displayRows.length" class="md-table" :class="{ 'is-refreshing': loading, 'md-table--ifpw': isIfpwCompact, 'md-table--ifpd': isIfpdLayer, 'md-table--ifpp': selectedLayer === 'IFPP', 'md-table--ckd': selectedLayer === 'CKD', 'md-table--ifrm': selectedLayer === 'IFRM' }">
        <thead>
          <tr>
            <th class="col-no">NO</th>
            <th v-if="isMergedCols" class="col-part th-combo" :class="{ 'th-combo--active': isFilterActive('part_combo') }">
              <div class="th-combo-inner">
                <button class="filter-btn" :class="{ 'filter-btn--active': isFilterActive('part_combo') }" :title="isFilterActive('part_combo') ? 'Filter aktif — klik untuk ubah' : 'Filter PART NUMBER / NAMA PART'" @click.stop="openFilter('part_combo', $event)"><i class="mdi" :class="isFilterActive('part_combo') ? 'mdi-filter' : 'mdi-filter-outline'" /></button>
                <button class="th-combo-label th-combo-label--sort" @click="toggleSort('part_number')">
                  <span>PART NUMBER <i class="mdi" :class="sortIcon('part_number')"></i></span>
                  <span class="th-combo-sub">NAMA PART</span>
                </button>
              </div>
            </th>
            <th v-else class="col-part th-combo" :class="{ 'th-combo--active': isFilterActive('part_number') }">
              <div class="th-combo-inner">
                <button class="filter-btn" :class="{ 'filter-btn--active': isFilterActive('part_number') }" :title="isFilterActive('part_number') ? 'Filter aktif — klik untuk ubah' : 'Filter PART NUMBER'" @click.stop="openFilter('part_number', $event)"><i class="mdi" :class="isFilterActive('part_number') ? 'mdi-filter' : 'mdi-filter-outline'" /></button>
                <button class="th-combo-label th-combo-label--sort" @click="toggleSort('part_number')">
                  <span>PART NUMBER <i class="mdi" :class="sortIcon('part_number')"></i></span>
                  <span class="th-combo-sub">NAMA PART</span>
                </button>
              </div>
            </th>
            <th v-if="isMergedCols" class="col-mix th-combo" :class="{ 'th-combo--active': isFilterActive('job_combo') }">
              <div class="th-combo-inner">
                <button class="filter-btn" :class="{ 'filter-btn--active': isFilterActive('job_combo') }" :title="isFilterActive('job_combo') ? 'Filter aktif — klik untuk ubah' : 'Filter JOB NUMBER / ALIAS'" @click.stop="openFilter('job_combo', $event)"><i class="mdi" :class="isFilterActive('job_combo') ? 'mdi-filter' : 'mdi-filter-outline'" /></button>
                <span class="th-combo-label">
                  <span>JOB NUMBER</span>
                  <span class="th-combo-sub">ALIAS</span>
                </span>
              </div>
            </th>
            <th v-else class="col-mix th-combo" :class="{ 'th-combo--active': isFilterActive('job') }">
              <div class="th-combo-inner">
                <button class="filter-btn" :class="{ 'filter-btn--active': isFilterActive('job') }" :title="isFilterActive('job') ? 'Filter aktif — klik untuk ubah' : 'Filter JOB NUMBER / ALIAS'" @click.stop="openFilter('job', $event)"><i class="mdi" :class="isFilterActive('job') ? 'mdi-filter' : 'mdi-filter-outline'" /></button>
                <span class="th-combo-label">
                  <span>JOB NUMBER</span>
                  <span class="th-combo-sub">ALIAS</span>
                </span>
              </div>
            </th>
            <th v-if="showColOp" class="col-op">OP</th>
            <th v-if="!isMergedCols" class="col-type th-combo">
              <div class="th-combo-inner">
                <span class="th-combo-label">
                  <span>TYPE</span>
                  <span class="th-combo-sub">KATEGORI</span>
                </span>
              </div>
            </th>
            <th v-if="showColMesin" class="col-machine th-combo" :class="{ 'th-combo--active': isFilterActive('machine') }">
              <div class="th-combo-inner">
                <button class="filter-btn" :class="{ 'filter-btn--active': isFilterActive('machine') }" :title="isFilterActive('machine') ? 'Filter aktif — klik untuk ubah' : 'Filter MESIN'" @click.stop="openFilter('machine', $event)"><i class="mdi" :class="isFilterActive('machine') ? 'mdi-filter' : 'mdi-filter-outline'" /></button>
                <span class="th-combo-label"><span>MESIN</span></span>
              </div>
            </th>
            <th v-if="showColGpart" class="col-gpart th-combo">
              <div class="th-combo-inner">
                <span class="th-combo-label">
                  <span>GPART</span>
                  <span class="th-combo-sub">JML MOTHER</span>
                </span>
              </div>
            </th>
            <th v-if="showColMother" class="col-mother th-combo">
              <div class="th-combo-inner"><span class="th-combo-label"><span>JML MOTHER</span></span></div>
            </th>
            <th v-if="isCkdLayer" class="col-ckd-type th-combo" :class="{ 'th-combo--active': isFilterActive('ckd_type') }">
              <div class="th-combo-inner">
                <button class="filter-btn" :class="{ 'filter-btn--active': isFilterActive('ckd_type') }" :title="isFilterActive('ckd_type') ? 'Filter aktif — klik untuk ubah' : 'Filter JENIS CKD'" @click.stop="openFilter('ckd_type', $event)"><i class="mdi" :class="isFilterActive('ckd_type') ? 'mdi-filter' : 'mdi-filter-outline'" /></button>
                <span class="th-combo-label">
                  <span>JENIS CKD</span>
                  <span class="th-combo-sub">JML MOTHER</span>
                </span>
              </div>
            </th>
            <th v-if="showColTotalProses" class="col-proses th-combo">
              <div class="th-combo-inner">
                <span class="th-combo-label">
                  <span>TOTAL PROSES</span>
                  <span class="th-combo-sub">JML MOTHER</span>
                </span>
              </div>
            </th>
            <th v-if="showColIfpdType" class="col-ifpd-type th-combo">
              <div class="th-combo-inner">
                <span class="th-combo-label">
                  <span>TIPE PART</span>
                  <span class="th-combo-sub">JML PROSES</span>
                </span>
              </div>
            </th>
            <th v-if="!isMergedCols" class="col-model th-combo" :class="{ 'th-combo--active': isFilterActive('model') }">
              <div class="th-combo-inner">
                <button class="filter-btn" :class="{ 'filter-btn--active': isFilterActive('model') }" :title="isFilterActive('model') ? 'Filter aktif — klik untuk ubah' : 'Filter MODEL'" @click.stop="openFilter('model', $event)"><i class="mdi" :class="isFilterActive('model') ? 'mdi-filter' : 'mdi-filter-outline'" /></button>
                <button class="th-combo-label th-combo-label--sort" @click="toggleSort('model')">
                  <span>MODEL <i class="mdi" :class="sortIcon('model')"></i></span>
                </button>
              </div>
            </th>
            <th v-if="isMergedCols" class="col-qty th-combo">
              <div class="th-combo-inner">
                <span class="th-combo-label">
                  <span>QTY KBN</span>
                  <span class="th-combo-sub">STATUS</span>
                </span>
              </div>
            </th>
            <th v-else class="col-qty">QTY KBN</th>
            <th v-if="isMergedCols" class="col-area th-combo" :class="{ 'th-combo--active': isFilterActive('area_combo') }">
              <div class="th-combo-inner">
                <button class="filter-btn" :class="{ 'filter-btn--active': isFilterActive('area_combo') }" :title="isFilterActive('area_combo') ? 'Filter aktif — klik untuk ubah' : 'Filter AREA / MESIN'" @click.stop="openFilter('area_combo', $event)"><i class="mdi" :class="isFilterActive('area_combo') ? 'mdi-filter' : 'mdi-filter-outline'" /></button>
                <button class="th-combo-label th-combo-label--sort" @click="toggleSort('area')">
                  <span>AREA <i class="mdi" :class="sortIcon('area')"></i></span>
                  <span class="th-combo-sub">{{ areaSubLabel }}</span>
                </button>
              </div>
            </th>
            <th v-else class="col-area th-combo" :class="{ 'th-combo--active': isFilterActive('area') || isFilterActive('machine') }">
              <div class="th-combo-inner">
                <button class="filter-btn" :class="{ 'filter-btn--active': isFilterActive('area') }" :title="isFilterActive('area') ? 'Filter aktif — klik untuk ubah' : 'Filter AREA'" @click.stop="openFilter('area', $event)"><i class="mdi" :class="isFilterActive('area') ? 'mdi-filter' : 'mdi-filter-outline'" /></button>
                <button class="filter-btn" :class="{ 'filter-btn--active': isFilterActive('machine') }" :title="isFilterActive('machine') ? 'Filter aktif — klik untuk ubah' : 'Filter MESIN'" @click.stop="openFilter('machine', $event)"><i class="mdi" :class="isFilterActive('machine') ? 'mdi-robot-industrial' : 'mdi-robot-industrial-outline'" /></button>
                <button class="th-combo-label th-combo-label--sort" @click="toggleSort('area')">
                  <span>AREA <i class="mdi" :class="sortIcon('area')"></i></span>
                  <span class="th-combo-sub">MESIN</span>
                </button>
              </div>
            </th>
            <th v-if="isMergedCols && !isIfpdLayer" class="col-next-process th-combo" :class="{ 'th-combo--active': isFilterActive('next_combo') }">
              <div class="th-combo-inner">
                <button class="filter-btn" :class="{ 'filter-btn--active': isFilterActive('next_combo') }" :title="isFilterActive('next_combo') ? 'Filter aktif — klik untuk ubah' : 'Filter NEXT PROCESS / MESIN'" @click.stop="openFilter('next_combo', $event)"><i class="mdi" :class="isFilterActive('next_combo') ? 'mdi-filter' : 'mdi-filter-outline'" /></button>
                <span class="th-combo-label">
                  <span>NEXT PROCESS</span>
                  <span class="th-combo-sub">MESIN</span>
                </span>
              </div>
            </th>
            <th v-else-if="!isIfpdLayer" class="col-next-process">NEXT PROCESS</th>
            <th v-if="isMergedCols" class="col-customer th-combo" :class="{ 'th-combo--active': isFilterActive(isCkdLayer ? 'customer' : 'customer_combo') }">
              <div class="th-combo-inner">
                <button v-if="isCkdLayer" class="filter-btn" :class="{ 'filter-btn--active': isFilterActive('customer') }" :title="isFilterActive('customer') ? 'Filter aktif — klik untuk ubah' : 'Filter CUSTOMER'" @click.stop="openFilter('customer', $event)"><i class="mdi" :class="isFilterActive('customer') ? 'mdi-filter' : 'mdi-filter-outline'" /></button>
                <button v-else class="filter-btn" :class="{ 'filter-btn--active': isFilterActive('customer_combo') }" :title="isFilterActive('customer_combo') ? 'Filter aktif — klik untuk ubah' : 'Filter CUSTOMER / MODEL'" @click.stop="openFilter('customer_combo', $event)"><i class="mdi" :class="isFilterActive('customer_combo') ? 'mdi-filter' : 'mdi-filter-outline'" /></button>
                <span v-if="isCkdLayer" class="th-combo-label"><span>CUSTOMER</span><span class="th-combo-sub">MODEL (MOTHER)</span></span>
                <button v-else class="th-combo-label th-combo-label--sort" @click="toggleSort('model')">
                  <span>CUSTOMER <i class="mdi" :class="sortIcon('model')"></i></span>
                  <span class="th-combo-sub">MODEL</span>
                </button>
              </div>
            </th>
            <th v-else class="col-customer th-combo" :class="{ 'th-combo--active': isFilterActive('customer') }">
              <div class="th-combo-inner">
                <button class="filter-btn" :class="{ 'filter-btn--active': isFilterActive('customer') }" :title="isFilterActive('customer') ? 'Filter aktif — klik untuk ubah' : 'Filter CUSTOMER'" @click.stop="openFilter('customer', $event)"><i class="mdi" :class="isFilterActive('customer') ? 'mdi-filter' : 'mdi-filter-outline'" /></button>
                <span class="th-combo-label"><span>CUSTOMER</span></span>
              </div>
            </th>
            <th class="col-updated">
              <button class="sort-btn" @click="toggleSort('updated_at')">
                DIPERBARUI <i class="mdi" :class="sortIcon('updated_at')"></i>
              </button>
            </th>
            <th class="col-action">AKSI</th>
          </tr>
        </thead>
        <TransitionGroup tag="tbody" :name="suppressRowAnim ? '' : 'row-anim'" class="md-tbody" :class="{ 'md-tbody--loading': loading && rows.length }">
          <tr
            v-for="(row, idx) in displayRows"
            :key="row.id"
            :style="{ '--i': Math.min(idx, 15) }"
            :class="{
              'row-wip': row.is_wip,
              'row-obsolete': row.is_runout && !row.merged_into_id,
              'row-variant': !!row.merged_into_id,
            }"
            class="row-clickable md-row-in"
            title="Klik 2x untuk lihat spesifikasi part"
            @dblclick="openDetailModal(row)"
          >
            <td class="col-no text-center text-gray">
              {{ (currentPage - 1) * perPage + idx + 1 }}
              <span v-if="row.merged_into_id" class="runout-stamp runout-stamp--variant">VARIAN</span>
              <span v-else-if="row.is_runout && runoutRuns[idx]" class="runout-stamp runout-stamp--tape" :style="{ '--run': runoutRuns[idx] }" aria-label="RUNOUT"><span class="runout-tape"><span class="runout-tape-word">RUNOUT</span></span></span>
            </td>
            <td class="col-part">
              <div class="part-cell">
                <span class="part-number">
                  {{ row.part_number }}
                  <span v-if="row.dup_of?.length" class="dup-chip" :title="'Ada baris kembar (part number + area sama) — klik untuk saran merge'" @click.stop="suggestDupMerge(row)"><i class="mdi mdi-content-duplicate"></i> dobel</span>
                  <BomVerifiedBadge v-if="row.bom_verified || row.rel_verified" :verified="row.bom_verified" :rel-verified="row.rel_verified" compact />
                  <span v-if="altNumbers(row).length" class="alt-pn-chip" :title="altNumbersTitle(row)" @click.stop="openVariantModal(row)"><i class="mdi mdi-link-variant"></i>{{ altNumbers(row).map(a => a.short).join(' · ') }}</span>
                  <span v-if="siblingRows(row).length" class="alt-pn-chip alt-pn-chip--row" :title="siblingTitle(row)" @click.stop="showSiblings(row)"><i class="mdi mdi-link-variant"></i>{{ siblingRows(row).map(x => x.short).join(' · ') }}</span>
                  <span v-else-if="(row.variant_count ?? 0) > 1" class="variant-badge" :title="row.variant_count + ' varian delivery — klik untuk kelola'" @click.stop="openVariantModal(row)"><i class="mdi mdi-tag-multiple-outline"></i>{{ row.variant_count }}</span>
                  <span v-if="row.merged_into_id" class="variant-badge variant-badge--merged" :title="'Nomor ini varian delivery dari part fisik ' + (row.merged_into ?? '') + ' — klik untuk kelola'" @click.stop="openVariantModal({ ...row, id: row.merged_into_id, part_number: row.merged_into ?? row.part_number } as MsWelding)"><i class="mdi mdi-tag-arrow-right-outline"></i> varian dari {{ row.merged_into ?? '…' }}<template v-if="row.variant_active === 0"> · nonaktif</template></span>
                </span>
                <span v-if="row.part_name" class="part-name">{{ row.part_name }}</span>
              </div>
            </td>
            <td class="col-mix">
              <div class="part-cell">
                <span class="part-number" :title="row.end_job ? `Job welding: ${row.end_job} · job sendiri: ${row.job_number || '—'}` : variantJobsTitle(row)">{{ row.end_job || row.job_number || '—' }}</span>
                <span v-if="row.alias" class="part-name">{{ row.alias }}</span>
              </div>
            </td>
            <td v-if="showColOp" class="col-op text-center">
              <span v-if="row.op" class="op-badge">OP{{ row.op }}</span>
              <span v-else class="text-gray text-xs">—</span>
            </td>
            <td v-if="!isMergedCols" class="col-type text-center" @click.stop>
              <span
                class="type-badge"
                :class="[row.is_wip ? 'type-wip' : 'type-fp']"
              >
                {{ row.is_wip ? 'WIP' : 'FP' }}
              </span>
              <span v-if="row.category" class="cat-badge">{{ row.category }}</span>
            </td>
            <td v-if="showColMesin" class="col-machine">
              <span class="machine-tag">{{ row.machine || '—' }}</span>
            </td>
            <td v-if="showColGpart" class="col-gpart">
              <div class="stack-cell">
                <span v-if="row.gpart" class="gpart-tag">{{ row.gpart === 'GPART' ? 'GPART' : 'Non-GPART' }}</span>
                <span v-else class="text-gray text-xs">—</span>
                <span class="proc-sub">{{ row.mother_count ?? 0 }} mother</span>
              </div>
            </td>
            <td v-if="showColMother" class="col-mother text-center">
              {{ row.mother_count ?? 0 }}
            </td>
            <td v-if="isCkdLayer" class="col-ckd-type">
              <div class="stack-cell">
                <span v-if="row.ckd_type" class="ckd-type-tag">{{ row.ckd_type }}</span>
                <span v-else class="text-gray text-xs">—</span>
                <span class="proc-sub">{{ row.mother_count ?? 0 }} mother</span>
              </div>
            </td>
            <td v-if="showColTotalProses" class="col-proses">
              <div class="stack-cell">
                <span class="proc-count">{{ procCount(row) }} proses</span>
                <!-- FP di IFPP = barang jadi (single), tak punya mother — jangan tampil "0 mother" -->
                <span v-if="row.is_wip" class="proc-sub">{{ row.mother_count ?? 0 }} mother</span>
                <span v-else class="proc-sub proc-sub--fp">single / FP</span>
              </div>
            </td>
            <td v-if="showColIfpdType" class="col-ifpd-type">
              <div class="stack-cell">
                <span v-if="row.ifpd_type" class="ifpd-type-tag">{{ IFPD_TYPE_LABEL[row.ifpd_type] ?? row.ifpd_type }}</span>
                <span v-else class="text-gray text-xs">—</span>
                <span v-if="row.op" class="op-badge">OP{{ row.op }}</span>
                <span v-else-if="procCount(row)" class="proc-sub">{{ procCount(row) }} proses</span>
              </div>
            </td>
            <td v-if="!isMergedCols" class="col-model text-center">
              <span class="model-tag">{{ row.model || '—' }}</span>
            </td>
            <td class="col-qty" :class="isMergedCols ? 'text-center' : 'text-right'">
              <!-- COMMON: 2 baris sejajar Next Process/Customer — jalur WIP (ke mother), lalu jalur FP -->
              <div v-if="isMergedCols && row.is_common" class="route-stack">
                <span class="combo-cell route-line" title="Qty KBN jalur WIP (dirakit ke mother)"><span class="qty-val">{{ row.qty_kbn_wip ?? row.qty_kbn }}</span><span class="combo-sep">-</span><span class="type-badge type-wip">WIP</span></span>
                <span class="combo-cell route-line" title="Qty KBN jalur FP (kirim langsung)"><span class="qty-val">{{ row.qty_kbn }}</span><span class="combo-sep">-</span><span class="type-badge type-fp">FP</span></span>
              </div>
              <span v-else-if="isMergedCols" class="combo-cell">
                <span class="qty-val">{{ row.qty_kbn }}</span>
                <span class="combo-sep">-</span>
                <span v-if="row.is_common" class="type-badge type-common" title="Part common: dikirim langsung (FP) + dirakit ke part lain (WIP)">FP/WIP</span>
                <span v-else class="type-badge" :class="row.is_wip ? 'type-wip' : 'type-fp'">{{ row.is_wip ? 'WIP' : 'FP' }}</span>
              </span>
              <template v-else>{{ row.qty_kbn }}</template>
            </td>
            <!-- Tab IFPW: 1 baris "A - B" (area - mesin, next - mesin, customer - model) -->
            <td class="col-area">
              <span class="combo-cell" v-if="isMergedCols">
                <span class="area-tag" :style="areaTagStyle(areaOfZone(row.area)?.area_code ?? row.area)">{{ areaOfZone(row.area)?.area_code ?? row.area }}</span>
                <template v-if="areaSubValue(row)"><span class="combo-sep">-</span><span class="machine-sub" :title="(areaSubIsVendor(row) ? 'Vendor: ' : row.layer === 'IFPP' || row.category === 'INHOUSE' ? 'Line: ' : 'Mesin: ') + areaSubValue(row)">{{ areaSubValue(row) }}</span></template>
                <span v-if="row.nut_warnings?.length" class="nut-warn-chip" :title="nutWarnTitle(row)" @click.stop="openTree(row.id!, row.part_number)"><i class="mdi mdi-alert"></i>NUT</span>
              </span>
              <template v-else>
                <span class="area-tag" :style="areaTagStyle(areaOfZone(row.area)?.area_code ?? row.area)">{{ areaOfZone(row.area)?.area_code ?? row.area }}</span>
                <span v-if="row.machine" class="area-zone-sub machine-sub" :title="'Mesin: ' + row.machine">{{ row.machine }}</span>
              </template>
            </td>
            <td v-if="!isIfpdLayer" class="col-next-process">
              <!-- Part COMMON: 2 jalur, sejajar dgn kolom Customer — baris 1 dirakit ke mother
                   (area · mesin), baris 2 kirim langsung (IFPD). FP biasa → selalu IFPD. -->
              <div v-if="row.is_common" class="route-stack">
                <span class="combo-cell route-line" :title="`Dirakit ke ${row.fp_mothers ?? 'mother'}`">
                  <span class="next-process-tag" :style="areaTagStyle(nextProcessLabel(row.common_area ?? ''))">{{ nextProcessLabel(row.common_area ?? '') }}</span>
                  <template v-if="row.common_machine"><span class="combo-sep">-</span><span class="machine-sub">{{ row.common_machine }}</span></template>
                </span>
                <span class="combo-cell route-line" title="Dikirim langsung ke customer"><span class="next-process-tag">IFPD</span></span>
              </div>
              <span v-else-if="!row.is_wip" class="combo-cell">
                <span class="next-process-tag">IFPD</span>
              </span>
              <template v-else-if="row.next_process">
                <span class="combo-cell" v-if="isMergedCols">
                  <span class="next-process-tag" :style="areaTagStyle(nextProcessLabel(row.next_process))" :title="row.next_process">{{ nextProcessLabel(row.next_process) }}</span>
                  <template v-if="row.next_machine"><span class="combo-sep">-</span><span class="machine-sub" :title="'Mesin: ' + row.next_machine">{{ row.next_machine }}</span></template>
                </span>
                <span v-else class="next-process-tag" :style="areaTagStyle(row.next_process)" :title="row.next_process">{{ row.next_process }}</span>
                <span v-if="row.next_runout" class="next-runout-badge" :title="runoutTitle(row)">+{{ runoutMothers(row).length }} runout</span>
              </template>
              <span v-else-if="row.next_runout" class="combo-cell next-runout" :title="runoutTitle(row)">
                <span class="next-process-tag" :style="areaTagStyle(nextProcessLabel(runoutMothers(row)[0].area))">{{ nextProcessLabel(runoutMothers(row)[0].area) }}</span>
                <template v-if="runoutMothers(row)[0].machine"><span class="combo-sep">-</span><span class="machine-sub">{{ runoutMothers(row)[0].machine }}</span></template>
                <span class="next-runout-badge">runout</span>
              </span>
              <span v-else-if="row.layer === 'IFPD' && row.area !== 'IFPD'" class="next-process-tag" title="Layer part ini seragam IFPD — area di kiri adalah area proses aslinya">IFPD</span>
              <span v-else class="text-gray text-xs">—</span>
            </td>
            <td class="col-customer">
              <!-- Part common: baris 1 = customer mother (jalur rakit), baris 2 = customer kirim langsung. -->
              <div v-if="isMergedCols && row.is_common" class="route-stack">
                <span class="combo-cell route-line">
                  <span class="customer-item" :title="row.mother_customer ?? ''">{{ row.mother_customer || '—' }}</span>
                  <span class="combo-sep">-</span><span class="model-tag">{{ row.common_model || '—' }}</span>
                </span>
                <span class="combo-cell route-line">
                  <span class="customer-item" :title="customersOf(row)">{{ customersOf(row) || '—' }}</span>
                  <span class="combo-sep">-</span><span class="model-tag">{{ row.model || '—' }}</span>
                </span>
              </div>
              <span class="combo-cell" v-else-if="isMergedCols">
                <span class="customer-item" :title="customersOf(row)">{{ customersOf(row) || '—' }}</span>
                <span class="combo-sep">-</span><span class="model-tag" :title="isCkdLayer || followsMother(row) ? 'Model dari mother' : undefined">{{ (row.end_model || (isCkdLayer ? row.mother_model : row.model)) || '—' }}</span>
              </span>
              <div v-else class="customer-list">
                <span v-if="row.customer_1" class="customer-item">{{ row.customer_1 }}</span>
                <span v-if="row.customer_2" class="customer-item">{{ row.customer_2 }}</span>
                <span v-if="row.customer_3" class="customer-item">{{ row.customer_3 }}</span>
                <span v-if="!row.customer_1 && !row.customer_2 && !row.customer_3" class="text-gray text-xs">—</span>
              </div>
            </td>
            <td class="col-updated text-center">
              <span class="updated-tag" :title="`${row.updated_at ?? ''}${row.last_user_updated ? ' — oleh ' + row.last_user_updated : ''}`">{{ formatDate(row.updated_at) }}</span>
              <span v-if="row.last_user_updated" class="updated-by">{{ row.last_user_updated }}</span>
            </td>
            <td class="col-action" @click.stop>
              <div class="action-btns">
                <button class="act-btn act-tree" @click="openTree(row.id!, row.part_number)" title="Hierarki & BOM">
                  <i class="mdi mdi-sitemap-outline"></i>
                </button>
                <button v-if="can.update" class="act-btn act-edit" @click="openEditModal(row)" title="Edit"><i class="mdi mdi-pencil-outline"></i></button>
                <button class="act-btn act-img" :class="{ 'act-img--empty': !row.image }" @click="openImageModal(row)" :title="row.image ? 'Lihat Gambar' : 'Belum ada gambar'">
                  <i class="mdi" :class="row.image ? 'mdi-image-outline' : 'mdi-image-off-outline'"></i>
                </button>
                <div class="row-menu-wrap">
                  <button class="row-kebab" :class="{ active: rowMenuOpenId === row.id }" title="Aksi lainnya" @click="toggleRowMenu(row, $event)">
                    <i class="mdi mdi-dots-vertical"></i>
                  </button>
                  <Teleport to="body">
                    <template v-if="rowMenuOpenId === row.id">
                      <div class="row-menu-backdrop" @click="closeRowMenu()" @wheel="closeRowMenu()" @contextmenu.prevent="closeRowMenu()"></div>
                      <div class="row-menu" :style="rowMenuStyle" @click.stop>
                        <button class="row-menu-item" @click="closeRowMenu(); openSpecModal(row)"><i class="mdi mdi-information-outline"></i> Spesifikasi Part</button>
                        <button v-if="can.create" class="row-menu-item" @click="closeRowMenu(); openCloneModal(row)"><i class="mdi mdi-content-duplicate"></i> Duplikat Part</button>
                        <button v-if="can.update && (selectedLayer === 'IFPW' || (selectedLayer === 'IFPP' && selectedSubArea !== 'OUTHOUSE'))"
                          class="row-menu-item" @click="closeRowMenu(); openRouteModal(row)"><i class="mdi mdi-vector-polyline"></i> Routing Proses</button>
                        <button v-if="can.update && !row.is_wip && weldingAreaOptions.includes(row.area || '')"
                          class="row-menu-item" @click="closeRowMenu(); openMoveAreaModal(row)"><i class="mdi mdi-map-marker-path"></i> Pindah Area</button>
                        <button v-if="can.update && !row.merged_into_id" class="row-menu-item" @click="closeRowMenu(); openVariantModal(row)"><i class="mdi mdi-tag-multiple-outline"></i> Varian Delivery</button>
                        <div v-if="can.del" class="row-menu-sep"></div>
                        <button v-if="can.del" class="row-menu-item row-menu-item--danger" @click="closeRowMenu(); confirmDelete(row)"><i class="mdi mdi-delete-outline"></i> Hapus</button>
                      </div>
                    </template>
                  </Teleport>
                </div>
              </div>
            </td>
          </tr>
        </TransitionGroup>
      </table>
      </template>

      <FilterDropdown
        :show="showFilter"
        :title="filterTitle"
        :position="filterStyle"
        :options="visibleOptions"
        :total-options="filterOptions.length"
        :all-selected="allSelected"
        :some-selected="someSelected"
        :searchable="isSearchable"
        :search-query="filterSearch"
        :loading="filterLoading"
        :active-count="filters[filterField].length"
        :merge-existing="filterMerge"
        @close="closeFilter"
        @apply="applyFilter"
        @toggle-merge="filterMerge = $event"
        @reset="clearFilter(filterField)"
        @toggle-all="handleToggleAll"
        @toggle-option="handleToggleOption"
        @search="handleSearch"
        @invert="invertSelection"
      />
    </div>

    <!-- Pagination: server-side sudah menerapkan filter kolom + paginasi, jadi selalu normal -->
    <div class="md-pagination" v-if="lastPage > 1">
      <span class="pg-info"
        >{{ (currentPage - 1) * perPage + 1 }}–{{ Math.min(currentPage * perPage, totalRows) }} dari
        {{ totalRows.toLocaleString() }} data</span
      >
      <div class="pg-controls">
        <button class="pg-btn" :disabled="currentPage <= 1" @click="loadList(currentPage - 1)"><i class="mdi mdi-chevron-left"></i></button>
        <template v-for="p in paginationPages" :key="String(p)">
          <span v-if="p === '...'" class="pg-dots">…</span>
          <button v-else class="pg-btn" :class="{ active: p === currentPage }" @click="loadList(Number(p))">{{ p }}</button>
        </template>
        <button class="pg-btn" :disabled="currentPage >= lastPage" @click="loadList(currentPage + 1)">
          <i class="mdi mdi-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- Tree Modal (2 tab: Hierarki Produksi + BOM SAP) -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="treeModal.open" v-modal-stack="() => (treeModal.open = false)" class="modal-overlay" @click.self.prevent>
          <div class="modal-box modal-tree">

            <!-- Header -->
            <div class="modal-header">
              <div class="modal-header-icon"><i class="mdi mdi-sitemap"></i></div>
              <div>
                <p class="modal-title">Hierarki & BOM</p>
                <p class="modal-subtitle font-mono">{{ treeModal.label }}</p>
              </div>
              <button class="modal-close" @click="treeModal.open = false"><i class="mdi mdi-close"></i></button>
            </div>

            <!-- Tab bar -->
            <div class="tree-tabs">
              <!-- Hierarki dipecah 2 tab (portrait: tree ke bawah saja, rantai induk
                   terpisah). Mother tak berlaku utk FP (FP = puncak, tak punya induk). -->
              <button
                class="tree-tab"
                :class="{ 'tree-tab--active': treeModal.activeTab === 'children' }"
                @click="treeModal.activeTab = 'children'"
              >
                <i class="mdi mdi-file-tree-outline"></i>
                Hierarki Children
              </button>
              <button
                v-if="treeData?.node.is_wip"
                class="tree-tab"
                :class="{ 'tree-tab--active': treeModal.activeTab === 'mother' }"
                @click="treeModal.activeTab = 'mother'"
              >
                <i class="mdi mdi-source-branch"></i>
                Hierarki Mother
                <span v-if="treeData.parents.length" class="tree-tab-hint">{{ treeData.parents.length }}</span>
              </button>
              <button
                class="tree-tab"
                :class="{ 'tree-tab--active': treeModal.activeTab === 'bom' }"
                @click="treeModal.activeTab = 'bom'"
              >
                <i class="mdi mdi-package-variant"></i>
                BOM SAP
                <span class="tree-tab-hint">1-step</span>
              </button>
            </div>

            <!-- ── TAB 1: Hierarki Children (turunan, arah ke bawah) ── -->
            <div v-show="treeModal.activeTab === 'children'" class="modal-body tab-panel">
              <div v-if="treeLoading" class="tree-loading"><i class="mdi mdi-loading mdi-spin"></i> Memuat hierarki...</div>

              <template v-else-if="treeData">
                <div class="tree-legend tree-legend--actions">
                  <!-- Ringkasan BOM SAP (LGORT + lengkap/belum) — sejajar dgn tombol,
                       bukan baris terpisah di bawahnya. -->
                  <div v-if="bomCompare.hasBom" class="cmp-summary">
                    <span class="bom-lgort-badge" title="Storage location (P_LGORT) yang dipakai saat fetch BOM — pilih manual bila auto salah">
                      <i class="mdi mdi-warehouse"></i>
                      <select v-model="lgortOverride" class="lgort-select" @change="onLgortOverrideChange" @click.stop>
                        <option v-for="o in LGORT_OPTIONS" :key="o.value" :value="o.value">{{ o.value ? o.label : `Auto (${bomData[0]?.lgort ?? '—'})` }}</option>
                      </select>
                    </span>
                    <span v-if="bomCompare.sapOnly.length" class="cmp-chip cmp-chip--sap">Belum lengkap ({{ bomCompare.sapOnly.length }})</span>
                    <span v-else class="cmp-chip cmp-chip--ok">Lengkap ✓</span>
                  </div>
                  <span v-else class="tree-legend-spacer"></span>
                  <div class="tree-legend-btngroup">
                    <span v-if="treeValid" class="tree-safe-badge" title="BOM terverifikasi, lengkap vs BOM SAP, tanpa peringatan NUT — hierarki dikunci (Edit minta konfirmasi)">
                      <i class="mdi mdi-shield-lock-outline"></i> Hierarki aman
                    </span>
                    <button v-if="can.update" type="button" class="tree-edit-btn" :class="{ 'tree-edit-btn--on': treeEditMode }"
                      :title="treeEditMode ? 'Selesai edit — kembali ke mode lihat (drag & ubah relasi nonaktif)' : 'Aktifkan edit: drag, tambah/lepas komponen, ganti mesin/nut'"
:disabled="!treeEditMode && (treeLoading || bomLoading)"
                      @click="toggleTreeEdit">
                      <i class="mdi" :class="treeEditMode ? 'mdi-check' : 'mdi-pencil-outline'"></i> {{ treeEditMode ? 'Selesai' : 'Edit' }}
                    </button>
                    <button v-if="can.update && treeEditMode" class="reconcile-btn" @click="openReconcile()" title="Tambah/koreksi komponen ANAK dari BOM SAP">
                      <i class="mdi mdi-auto-fix"></i> Children by SAP
                    </button>
                  </div>
                </div>

                <!-- Petunjuk: belum ada BOM tersimpan untuk dibandingkan -->
                <div
                  v-if="!bomCompare.hasBom && treeData.node.children && treeData.node.children.length"
                  class="cmp-hint"
                  @click="treeModal.activeTab = 'bom'"
                >
                  <i class="mdi mdi-compare-horizontal"></i>
                  Sync <strong>BOM SAP</strong> untuk membandingkan hierarki ini dengan data SAP (anak langsung).
                </div>

                <TreeNode
                  :node="treeData.node"
                  :depth="0"
                  :is-entry="true"
                  :show-connector="false"
                  :compare-map="bomCompare.map"
                />

                <!-- Anak yang ADA di BOM SAP tapi TIDAK ada di hierarki master -->
                <div v-if="bomCompare.sapOnly.length" class="cmp-saponly">
                  <div class="cmp-saponly-label">
                    <i class="mdi mdi-alert-outline"></i> Hanya di BOM SAP (belum ada di hierarki master)
                  </div>
                  <div v-for="b in bomCompare.sapOnly" :key="b.child_matnr" class="cmp-saponly-row">
                    <span class="cmp-saponly-arrow">└─</span>
                    <span class="type-badge cmp-saponly-type">SAP</span>
                    <span class="cmp-saponly-part font-mono">{{ b.child_matnr }}</span>
                    <span class="cmp-saponly-name">{{ b.child_name ?? b.child_bismt ?? '—' }}</span>
                    <span v-if="b.bom_qty" class="cmp-saponly-qty">{{ b.bom_qty }} {{ b.meins }}</span>
                  </div>
                </div>

                <div v-if="!treeData.node.children?.length" class="tree-standalone">
                  <i class="mdi mdi-information-outline"></i>
                  Part ini belum punya komponen (children) di database.
                </div>
              </template>

              <div v-else class="tree-loading">Tidak ada data.</div>
            </div>

            <!-- ── TAB 2: Hierarki Mother (rantai induk, khusus WIP) ── -->
            <div v-if="treeData?.node.is_wip" v-show="treeModal.activeTab === 'mother'" class="modal-body tab-panel">
              <div class="tree-legend tree-legend--actions">
                <span class="tree-legend-spacer"></span>
                <div class="tree-legend-btngroup">
                  <button v-if="can.update" class="reconcile-btn" title="Cari assembly yang memakai part ini di SAP (where-used)" @click="openMotherBySap()">
                    <i class="mdi mdi-progress-wrench"></i> Mother by SAP
                  </button>
                </div>
              </div>
              <MotherPaths v-if="treeData.parents.length" :entry="treeData.node" :parents="treeData.parents" />
              <div v-else class="tree-standalone">
                <i class="mdi mdi-information-outline"></i>
                WIP ini belum punya mother di database — cari lewat Mother by SAP.
              </div>
            </div>

            <!-- ── TAB 2: BOM SAP (1-step transactional) ────────── -->
            <div v-show="treeModal.activeTab === 'bom'" class="modal-body bom-body tab-panel">

              <!-- Loading BOM -->
              <div v-if="bomLoading" class="tree-loading">
                <i class="mdi mdi-loading mdi-spin"></i> Memuat data BOM...
              </div>

              <template v-else>
                <!-- Sync result badge -->
                <Transition name="bom-badge-fade">
                  <div v-if="bomSyncResult" class="bom-sync-badge">
                    <i class="mdi mdi-check-circle"></i>
                    Sync selesai &mdash; <strong>{{ bomSyncResult.inserted }}</strong> baru,
                    <strong>{{ bomSyncResult.updated }}</strong> diperbarui
                    <span class="bom-sync-time">{{ bomSyncResult.synced_at }}</span>
                  </div>
                </Transition>

                <!-- Empty state -->
                <div v-if="bomData.length === 0" class="bom-empty">
                  <i class="mdi mdi-package-variant-closed bom-empty-icon"></i>
                  <p>Belum ada data BOM tersimpan</p>
                  <span>Klik <strong>Sync dari SAP</strong> untuk mengambil BOM level 1</span>
                </div>

                <!-- BOM Table -->
                <div v-else class="bom-table-wrap">
                  <div class="bom-meta">
                    <span><i class="mdi mdi-database-check"></i> {{ bomData.length }} direct child dari SAP</span>
                    <span class="bom-lgort-badge" title="Storage location (P_LGORT) yang dipakai saat fetch BOM — pilih manual bila auto salah">
                      <i class="mdi mdi-warehouse"></i>
                      <select v-model="lgortOverride" class="lgort-select" @change="onLgortOverrideChange" @click.stop>
                        <option v-for="o in LGORT_OPTIONS" :key="o.value" :value="o.value">{{ o.value ? o.label : `Auto (${bomData[0]?.lgort ?? '—'})` }}</option>
                      </select>
                    </span>
                    <span class="bom-meta-sync" v-if="bomData[0]?.synced_at">
                      Terakhir sync: {{ bomData[0].synced_at }}
                    </span>
                  </div>
                  <table class="bom-table">
                    <thead>
                      <tr>
                        <th>PART NUMBER</th>
                        <th>NAMA PART</th>
                        <th class="bom-col-center">TYPE</th>
                        <th class="bom-col-center">MASTER</th>
                        <th class="bom-col-right">QTY UNIT</th>
                        <th class="bom-col-center">UNIT</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in bomData" :key="item.child_matnr">
                        <td class="bom-matnr font-mono">{{ item.child_matnr }}</td>
                        <td class="bom-name">{{ item.child_name ?? '—' }}</td>
                        <td class="bom-col-center">
                          <span class="bom-mtart-badge" :class="`bom-mtart--${item.mtart?.toLowerCase() ?? 'unknown'}`">
                            {{ item.mtart ?? '?' }}
                          </span>
                        </td>
                        <td class="bom-col-center">
                          <span
                            v-if="bomCompare.masterSet.has(_normPart(item.child_matnr))"
                            class="bom-master-badge bom-master--yes"
                            title="Ada di master data"
                          ><i class="mdi mdi-check-circle"></i> ada</span>
                          <span v-else class="bom-master-badge bom-master--no" title="Tidak ada di master data">
                            <i class="mdi mdi-close-circle"></i> tidak
                          </span>
                        </td>
                        <td class="bom-col-right bom-qty">{{ item.bom_qty?.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 }) ?? '—' }}</td>
                        <td class="bom-col-center bom-unit">{{ item.meins ?? '—' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Footer sync button -->
                <div class="bom-footer">
                  <span class="bom-footer-note">
                    <i class="mdi mdi-information-outline"></i>
                    Data transaksional 1-step langsung dari SAP ({{ _lgortLabel(bomData[0]?.lgort) }})
                  </span>
                  <button
                    class="bom-sync-btn"
                    :disabled="bomSyncing"
                    @click="doSyncBom"
                  >
                    <i class="mdi" :class="bomSyncing ? 'mdi-loading mdi-spin' : 'mdi-sync'"></i>
                    {{ bomSyncing ? 'Menyinkronkan...' : (bomData.length ? 'Sync Ulang' : 'Sync dari SAP') }}
                  </button>
                </div>
              </template>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Mother by SAP Modal — where-used: assembly yang memakai part ini -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="motherBySapModal.open" v-modal-stack="() => { _clearMotherBySapTimer(); motherBySapModal.open = false; }" class="modal-overlay" @click.self.prevent>
          <div class="modal-box modal-reconcile" @click.stop>
            <div class="modal-header">
              <div class="modal-header-icon"><i class="mdi mdi-progress-wrench"></i></div>
              <div style="flex: 1; min-width: 0">
                <p class="modal-title">Mother by SAP</p>
                <p class="modal-subtitle font-mono">
                  {{ motherBySapModal.partNumber }}
                  <span v-if="motherBySapModal.stale" class="cmp-chip" :title="`Cache ${motherBySapModal.staleH}j — refresh jalan di background`">cache {{ motherBySapModal.staleH }}j</span>
                </p>
              </div>
              <button class="modal-close" @click="_clearMotherBySapTimer(); motherBySapModal.open = false"><i class="mdi mdi-close"></i></button>
            </div>
            <div v-if="!motherBySapModal.loading && !motherBySapModal.error && motherBySapModal.candidates.length" class="mother-sap-summary">
              <span class="mother-sap-summary-item"><strong>{{ motherBySapSummary.total }}</strong> assembly ditemukan</span>
              <span v-if="motherBySapSummary.linkable" class="mother-sap-summary-item mother-sap-summary-item--linkable"><i class="mdi mdi-link-variant"></i> {{ motherBySapSummary.linkable }} bisa di-link</span>
              <span v-if="motherBySapSummary.connected" class="mother-sap-summary-item mother-sap-summary-item--ok"><i class="mdi mdi-check-circle-outline"></i> {{ motherBySapSummary.connected }} sudah terhubung</span>
              <span v-if="motherBySapSummary.missing" class="mother-sap-summary-item mother-sap-summary-item--muted"><i class="mdi mdi-help-circle-outline"></i> {{ motherBySapSummary.missing }} belum di master</span>
            </div>
            <div class="modal-body">
              <div v-if="motherBySapModal.pending && motherBySapModal.candidates.length" class="mother-sap-local">
                <i class="mdi mdi-loading mdi-spin"></i> Hasil cepat dari cache BOM SAP lokal — SAP (where-used) masih diambil, daftar diperbarui otomatis.
              </div>
              <div v-if="motherBySapModal.loading || (motherBySapModal.pending && !motherBySapModal.candidates.length)" class="tree-loading">
                <i class="mdi mdi-loading mdi-spin"></i> {{ motherBySapModal.pendingMsg || 'Memanggil SAP (where-used)…' }}
              </div>
              <div v-else-if="motherBySapModal.error" class="cmp-empty">
                <i class="mdi mdi-alert-circle-outline"></i>
                <span>{{ motherBySapModal.error }}</span>
              </div>
              <div v-else-if="!motherBySapModal.pending && !motherBySapModal.candidates.length" class="cmp-empty">
                <i class="mdi mdi-information-outline"></i>
                <span>SAP tidak menemukan assembly yang memakai part ini (where-used kosong).</span>
              </div>
              <div v-else class="mother-sap-list">
                <div v-for="c in motherBySapSorted" :key="c.mother_matnr + (c.stlnr ?? '')" class="mother-sap-card" :class="{ 'mother-sap-card--nomatch': !c.matches.length }">
                  <div class="mother-sap-card-head">
                    <i class="mdi mdi-cube-outline mother-sap-card-icon"></i>
                    <div class="mother-sap-card-title">
                      <span class="font-mono mother-sap-pn">{{ c.mother_matnr }}</span>
                      <span v-if="c.mother_name" class="mother-sap-name">{{ c.mother_name }}</span>
                    </div>
                    <span class="tree-spacer"></span>
                    <span v-if="c.bom_qty != null" class="cmp-chip">Qty: {{ c.bom_qty }}<template v-if="c.meins"> {{ c.meins }}</template></span>
                  </div>
                  <div v-if="c.matches.length" class="mother-sap-matches">
                    <div v-for="m in c.matches" :key="m.id" class="mother-sap-match-row" :class="{ 'mother-sap-match-row--linked': m.is_current_parent }">
                      <div class="mother-sap-match-main">
                        <span class="font-mono mother-sap-match-pn">{{ m.part_number }}</span>
                        <span class="mother-sap-match-mix font-mono" v-if="m.part_number_mix && m.part_number_mix !== m.part_number">{{ m.part_number_mix }}</span>
                        <span class="mother-sap-match-tags">
                          <span class="type-badge" :class="m.category === 'IFPD' ? 'type-fp' : 'type-wip'">{{ m.category ?? '—' }}</span>
                          <span class="area-tag" v-if="m.area" :style="areaTagStyle(m.area)">{{ m.area }}</span>
                          <span class="mother-sap-match-info" v-if="cleanVal(m.model) || cleanVal(m.car_name)">{{ cleanVal(m.model) || cleanVal(m.car_name) }}</span>
                        </span>
                      </div>
                      <span class="tree-spacer"></span>
                      <span v-if="m.is_current_parent" class="cmp-chip cmp-chip--ok"><i class="mdi mdi-check"></i> Terhubung</span>
                      <button v-else class="md-btn md-btn-primary md-btn-sm" :disabled="motherBySapModal.linkingKey === String(m.id)" @click="linkMotherCandidate(m)">
                        <i class="mdi" :class="motherBySapModal.linkingKey === String(m.id) ? 'mdi-loading mdi-spin' : 'mdi-link-variant'"></i>
                        {{ motherBySapModal.linkingKey === String(m.id) ? 'Menautkan…' : 'Link' }}
                      </button>
                    </div>
                  </div>
                  <div v-else class="mother-sap-nomatch">
                    <i class="mdi mdi-alert-outline"></i>
                    <template v-if="can.create">
                      <span>Belum ada di master — tambah dari SAP &amp; tautkan:</span>
                      <select v-model="motherAddOf(c.mother_matnr).area" class="mother-add-select" title="Area proses mother">
                        <option v-for="a in weldingAreaOptions" :key="a" :value="a">{{ a }}</option>
                      </select>
                      <select v-model="motherAddOf(c.mother_matnr).status" class="mother-add-select" title="Status mother">
                        <option value="WIP">WIP</option>
                        <option value="FP">FP</option>
                      </select>
                      <button class="md-btn md-btn-primary md-btn-sm" :disabled="motherBySapModal.linkingKey === c.mother_matnr || !motherAddOf(c.mother_matnr).area" @click="addMotherFromSap(c.mother_matnr)">
                        <i class="mdi" :class="motherBySapModal.linkingKey === c.mother_matnr ? 'mdi-loading mdi-spin' : 'mdi-plus-circle-outline'"></i>
                        {{ motherBySapModal.linkingKey === c.mother_matnr ? 'Menambah…' : 'Tambah & tautkan' }}
                      </button>
                    </template>
                    <span v-else>Belum ada di master — minta user dgn akses Tambah untuk menambahkan.</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="md-btn md-btn-ghost" :disabled="motherBySapModal.loading || motherBySapModal.pending" title="Ambil ulang dari SAP (abaikan cache)" @click="refreshMotherBySap()">
                <i class="mdi mdi-refresh"></i> Refresh
              </button>
              <button class="md-btn md-btn-ghost" @click="_clearMotherBySapTimer(); motherBySapModal.open = false">Tutup</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Reconcile Modal — auto-koreksi ms_welding dari BOM SAP (preview + konfirmasi) -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="reconcileModal.open" v-modal-stack="() => { if (!reconcileApplying) reconcileModal.open = false; }" class="modal-overlay" @click.self.prevent>
          <div class="modal-box modal-reconcile" @click.stop>
            <div class="modal-header">
              <div class="modal-header-icon"><i class="mdi mdi-auto-fix"></i></div>
              <div style="flex: 1; min-width: 0">
                <p class="modal-title">Auto-koreksi dari BOM SAP</p>
                <div v-if="reconcileData" style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
                  <p class="modal-subtitle font-mono" style="margin:0">
                    Komponen di bawah {{ reconcileData.holder.part_number }}
                  </p>
                  <span v-if="reconcileStale" class="rec-stale-badge" :title="`Data cache ${reconcileStaleH} jam lalu — refresh berjalan di background`">
                    <i class="mdi mdi-clock-alert-outline"></i> Cache {{ reconcileStaleH }}j lalu
                  </span>
                  <span v-else-if="reconcileFromCache" class="rec-cache-badge">
                    <i class="mdi mdi-database-check-outline"></i> Cache
                  </span>
                  <button
                    v-if="reconcileFromCache && !reconcileLoading"
                    type="button" class="rec-refresh-btn"
                    title="Lewati cache, ambil BOM terbaru langsung dari SAP"
                    @click="openReconcile(true)"
                  ><i class="mdi mdi-refresh"></i> Refresh Cache</button>
                </div>
              </div>
              <button class="modal-close" :disabled="reconcileApplying" @click="reconcileModal.open = false">
                <i class="mdi mdi-close"></i>
              </button>
            </div>

            <div class="modal-body rec-body">
              <div v-if="reconcileLoading" class="rec-loading-wrap">
                <div class="rec-loading-spinner">
                  <i class="mdi mdi-loading mdi-spin"></i>
                </div>
                <div class="rec-loading-info">
                  <span class="rec-loading-msg">{{ reconcilePendingMsg || 'Mengambil BOM SAP & membandingkan...' }}</span>
                  <span class="rec-loading-elapsed">{{ reconcileElapsed.toFixed(1) }} dtk</span>
                </div>
                <div class="rec-loading-bar">
                  <div class="rec-loading-bar-inner"></div>
                </div>
              </div>

              <div v-else-if="reconcileError" class="form-error">
                <i class="mdi mdi-alert-circle-outline"></i> {{ reconcileError }}
              </div>

              <template v-else-if="reconcileData">
                <p v-if="reconcileData.dup_ok" class="rec-dup-ok">
                  <i class="mdi mdi-shield-check-outline"></i>
                  {{ reconcileData.holder.part_number }} di {{ reconcileData.dup_area_key?.split('|').join(', ') }} sudah ditandai <b>bukan duplikat</b>
                  oleh {{ reconcileData.dup_ok.created_by ?? '—' }} · {{ reconcileData.dup_ok.created_at }}
                  <button type="button" class="rec-dup-ok-undo" @click="undoDupOk">Cabut</button>
                </p>
                <DuplicateCompare
                  v-if="reconcileData.same_pn_other_area?.length"
                  :part-number="reconcileData.holder.part_number"
                  :holder="reconcileData.holder_compare ?? null"
                  :others="reconcileData.same_pn_other_area"
                  :area-key="reconcileData.dup_area_key"
                  @changed="(holderGone: boolean) => { if (holderGone) { reconcileModal.open = false; refreshTreeData(); } else openReconcile(); loadList(currentPage); }"
                />
                <div
                  v-if="!reconcileData.adds.length && !reconcileData.updates.length && !reconcileData.reparents.length && !reconcileData.links?.length && !reconcileData.press_inserts?.length"
                  class="rec-clean"
                >
                  <i class="mdi mdi-check-decagram"></i>
                  Hierarki master sudah sesuai dengan BOM SAP. Tidak ada yang perlu ditambah atau dikoreksi.
                </div>

                <template v-else>
                  <!-- SISIP PRESS: WSS masih pegang material langsung, padahal SAP memakai press P<x>. -->
                  <div v-if="reconcileData.press_inserts?.length" class="rec-section">
                    <div class="rec-section-head rec-head--rep">
                      <i class="mdi mdi-layers-plus"></i> Sisipkan part press ({{ reconcileData.press_inserts.length }})
                    </div>
                    <label v-for="pi in reconcileData.press_inserts" :key="pi.key" class="rec-row">
                      <input type="checkbox" :checked="pressChecked.has(pi.key)" @change="togglePress(pi.key)" />
                      <span class="rec-pn font-mono">{{ pi.press_part_number }}</span>
                      <span class="rec-name">
                        {{ pi.press_name ?? '—' }}
                        <span class="rec-target-note"><i class="mdi mdi-arrow-right-bottom"></i> jadi child {{ pi.wss_part_number }}<template v-if="!pi.press_id"> (baru, lihat "Tambah")</template></span>
                        <span v-if="pi.move_children.length" class="rec-target-note"><i class="mdi mdi-swap-vertical"></i> pindahkan {{ pi.move_children.map(m => m.part_number).join(', ') }} dari WSS ke bawah press</span>
                      </span>
                      <span class="rec-tags"><span class="rec-area">{{ pi.press_area || 'INHOUSE' }}</span></span>
                    </label>
                    <p class="rec-note">
                      <i class="mdi mdi-information-outline"></i>
                      Rantai jadi Material → Press (P) → WSS, sesuai BOM SAP. Qty material mengikuti BOM press.
                    </p>
                  </div>
                  <p v-if="reconcileData.wss_sap_pending?.length" class="rec-note">
                    <i class="mdi mdi-cloud-sync-outline"></i>
                    BOM SAP milik WSS {{ reconcileData.wss_sap_pending.join(', ') }} sedang diambil — CKD/nut-nya muncul kalau Children by SAP dibuka lagi (±1 menit).
                  </p>
                  <!-- TAMBAH -->
                  <!-- LINK EXISTING: ada di master tapi belum ditautkan -->
                  <div v-if="reconcileData.links?.length" class="rec-section">
                    <div class="rec-section-head rec-head--link">
                      <i class="mdi mdi-link-variant-plus"></i> Tautkan ke sini — sudah ada di master ({{ reconcileData.links.length }})
                    </div>
                    <label v-for="lk in reconcileData.links" :key="'lk' + lk.id" class="rec-row">
                      <input type="checkbox" :checked="lnkChecked.has(lk.id)" @change="toggleLnk(lk.id)" />
                      <span class="rec-pn font-mono">{{ lk.part_number }}</span>
                      <span class="rec-name">
                        {{ lk.part_name ?? '—' }}
                        <span v-if="lk._target_note" class="rec-target-note"><i class="mdi mdi-arrow-right-bottom"></i> {{ lk._target_note }}</span>
                      </span>
                      <span v-if="lk.bom_qty != null" class="rec-scrap-qty">{{ lk.bom_qty }} {{ lk.meins ?? '' }}</span>
                      <span class="rec-tags">
                        <span v-if="lk.mtart" class="bom-mtart-badge" :class="`bom-mtart--${lk.mtart.toLowerCase()}`">{{ lk.mtart }}</span>
                        <span v-if="lk.category" class="rec-class" :class="`rec-class--${lk.category.toLowerCase()}`">{{ lk.category }}</span>
                        <span class="rec-area">{{ lk.area || '—' }}</span>
                      </span>
                    </label>
                    <p class="rec-note">
                      <i class="mdi mdi-information-outline"></i>
                      Part ini sudah ada di master data (area/tree berbeda). Centang untuk menambah koneksi parent ke sini tanpa membuat baris baru.
                    </p>
                  </div>

                  <!-- TAMBAH BARU -->
                  <div v-if="reconcileData.adds.length" class="rec-section">
                    <div class="rec-section-head rec-head--add">
                      <i class="mdi mdi-plus-circle-outline"></i> Tambah ke master ({{ reconcileData.adds.length }})
                    </div>
                    <div v-for="a in reconcileData.adds" :key="'a' + a.part_number" class="rec-row-wrap">
                      <label class="rec-row">
                        <input type="checkbox" :checked="addChecked.has(a.part_number)" @change="toggleAdd(a.part_number)" />
                        <span class="rec-pn font-mono">{{ a.part_number }}</span>
                        <span class="rec-name">
                          {{ a.sap_name ?? '—' }}
                          <span v-if="a.alias" class="rec-alias">({{ a.alias }})</span>
                          <span v-if="a._global_note" class="rec-global-note" :title="a._global_note">⚠ duplikat</span>
                          <span v-if="a.from_override" class="rec-override-badge" title="Klasifikasi dari override manual">📌 override</span>
                        </span>
                        <span v-if="(a.classify === 'SCRAP' || a.classify === 'MATERIAL') && a.scrap_ratio != null" class="rec-scrap-qty">{{ a.scrap_ratio }} {{ a.uom ?? '' }}</span>
                        <span v-if="a.qty_unit != null" class="rec-scrap-qty" title="Qty Unit (WIP per FP), diisi otomatis dari BOM qty SAP">Qty Unit: {{ a.qty_unit }}</span>
                        <span class="rec-tags">
                          <span v-if="a.mtart" class="bom-mtart-badge" :class="`bom-mtart--${a.mtart.toLowerCase()}`">{{ a.mtart }}</span>
                          <span v-if="a.classify" class="rec-class" :class="`rec-class--${a.classify.toLowerCase()}`">{{ a.classify }}</span>
                          <span class="rec-area">{{ a.area || '—' }}</span>
                        </span>
                        <button class="rec-pin-btn" type="button" title="Simpan klasifikasi ini sebagai aturan tetap"
                          @click.stop="openOverrideDialog(a)">📌</button>
                      </label>
                    </div>
                    <p class="rec-note">
                      <i class="mdi mdi-information-outline"></i>
                      Area &amp; layer otomatis dari klasifikasi SAP (press→IFPP, nut/bolt di WELDING→CKD, material baku di IFPP→MATERIAL, lainnya warisi induk);
                      model/customer warisi induk; qty_kbn &amp; mesin diisi manual nanti.
                    </p>
                  </div>

                  <!-- UPDATE -->
                  <div v-if="reconcileData.updates.length" class="rec-section">
                    <div class="rec-section-head rec-head--upd">
                      <i class="mdi mdi-pencil-outline"></i> Koreksi atribut ({{ reconcileData.updates.length }})
                    </div>
                    <label v-for="u in reconcileData.updates" :key="'u' + u.id" class="rec-row rec-row--upd">
                      <input type="checkbox" :checked="updChecked.has(u.id)" @change="toggleUpd(u.id)" />
                      <span class="rec-pn font-mono">{{ u.part_number }}</span>
                      <span class="rec-changes">
                        <span v-for="(c, field) in u.changes" :key="field" class="rec-change">
                          <span class="rec-field">{{ (c as any).label ?? field }}</span>
                          <span class="rec-old">{{ c.old || '∅' }}</span>
                          <i class="mdi mdi-arrow-right"></i>
                          <span class="rec-new">{{ c.new }}</span>
                        </span>
                      </span>
                    </label>
                  </div>

                  <!-- RE-PARENT: nut yang salah nest di bawah part press -->
                  <div v-if="reconcileData.reparents.length" class="rec-section">
                    <div class="rec-section-head rec-head--rep">
                      <i class="mdi mdi-file-tree-outline"></i> Perbaiki nesting ({{ reconcileData.reparents.length }})
                    </div>
                    <label v-for="r in reconcileData.reparents" :key="'r' + r.id" class="rec-row">
                      <input type="checkbox" :checked="repChecked.has(r.id)" @change="toggleRep(r.id)" />
                      <span class="rec-pn font-mono">{{ r.part_number }}</span>
                      <span class="rec-move">
                        <span class="rec-from">{{ r.from_parent }}</span>
                        <i class="mdi mdi-arrow-right"></i>
                        <span class="rec-to">{{ r.to_parent }}</span>
                      </span>
                    </label>
                    <p class="rec-note">
                      <i class="mdi mdi-information-outline"></i>
                      Nut (CKD) dipindah dari bawah part PRESS ke part WELDED (WSS) terdekat → jadi WSS → [IFPP, CKD].
                    </p>
                  </div>

                  <!-- INFO: hanya di master -->
                  <div v-if="reconcileData.in_master_only.length" class="rec-section">
                    <div class="rec-section-head rec-head--info">
                      <i class="mdi mdi-eye-outline"></i> Hanya di master, tidak ada di BOM SAP ({{ reconcileData.in_master_only.length }})
                    </div>
                    <div v-for="m in reconcileData.in_master_only" :key="'m' + m.id" class="rec-row rec-row--info">
                      <span class="rec-pn font-mono">{{ m.part_number }}</span>
                      <span class="rec-name">{{ m.alias ?? '—' }}</span>
                    </div>
                    <p class="rec-note"><i class="mdi mdi-information-outline"></i> Ini tidak diubah otomatis (bisa jadi raw material atau memang sengaja).</p>
                  </div>
                </template>
              </template>
            </div>

            <div class="modal-footer">
              <span class="kbd-hint"><kbd>Esc</kbd> tutup · <kbd>⏎</kbd> terapkan</span>
              <button class="md-btn md-btn-ghost" :disabled="reconcileApplying" @click="reconcileModal.open = false">Batal</button>
              <button
                class="md-btn md-btn-primary"
                :disabled="reconcileApplying || reconcileLoading || reconcileSelCount === 0"
                @click="applyReconcile"
              >
                <i class="mdi" :class="reconcileApplying ? 'mdi-loading mdi-spin' : 'mdi-content-save-check-outline'"></i>
                {{ reconcileApplying ? 'Menerapkan...' : `Terapkan (${reconcileSelCount})` }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Override Classify Dialog — dibuka DARI DALAM reconcileModal (tombol 📌 di
         daftar "adds"), reconcileModal-nya sendiri TETAP terbuka di belakang (nested,
         bukan diganti). Urutan tumpuk diatur v-modal-stack. -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="overrideDialog.open" v-modal-stack="() => { if (!overrideDialog.saving) overrideDialog.open = false; }" class="modal-overlay" @click.self.prevent>
          <div class="modal-box" style="max-width:420px">
            <div class="modal-header">
              <div>
                <h3 class="modal-title">📌 Simpan aturan klasifikasi</h3>
                <p class="modal-subtitle font-mono">{{ overrideDialog.partNumber }}</p>
              </div>
              <button class="modal-close" @click="overrideDialog.open = false">✕</button>
            </div>
            <div class="modal-body" style="padding:16px;display:flex;flex-direction:column;gap:12px">
              <p style="font-size:12px;color:#64748b;margin:0">
                Klasifikasi ini akan selalu dipakai untuk part ini di semua reconcile berikutnya, menggantikan rule otomatis.
              </p>
              <label class="ov-field">
                <span>Category</span>
                <select v-model="overrideDialog.category" class="ov-input">
                  <option value="">— tidak diset —</option>
                  <option>WELDING</option><option>INHOUSE</option><option>OUTHOUSE</option>
                  <option>CKD</option><option>MATERIAL</option><option>IFPD</option>
                </select>
              </label>
              <label class="ov-field">
                <span>Area</span>
                <input v-model="overrideDialog.area" class="ov-input" placeholder="ex: IFPP, CKD, WSS ADM" />
              </label>
              <label class="ov-field">
                <span>Catatan</span>
                <input v-model="overrideDialog.note" class="ov-input" placeholder="Alasan override (opsional)" />
              </label>
            </div>
            <div class="modal-footer">
              <button class="md-btn md-btn-ghost" @click="overrideDialog.open = false">Batal</button>
              <button class="md-btn md-btn-primary" :disabled="overrideDialog.saving" @click="saveOverride">
                <i class="mdi" :class="overrideDialog.saving ? 'mdi-loading mdi-spin' : 'mdi-content-save-outline'"></i>
                {{ overrideDialog.saving ? 'Menyimpan...' : 'Simpan aturan' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Add Child Modal — tambah komponen (IFPP/CKD) di bawah node tree -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="addChildModal.open" v-modal-stack="() => { if (!addChildSaving) addChildModal.open = false; }" class="modal-overlay" @click.self.prevent>
          <div class="modal-box modal-addchild" @click.stop>
            <div class="modal-header">
              <div class="modal-header-icon"><i class="mdi mdi-plus-box-outline"></i></div>
              <div style="flex: 1; min-width: 0">
                <p class="modal-title">Tambah Komponen</p>
                <p class="modal-subtitle font-mono">di bawah {{ addChildModal.parent?.part_number }}</p>
              </div>
              <button class="modal-close" :disabled="addChildSaving" @click="addChildModal.open = false"><i class="mdi mdi-close"></i></button>
            </div>

            <div class="modal-body ac-body">
              <!-- parent terkunci -->
              <div class="ac-lock">
                <i class="mdi mdi-lock-outline"></i> Parent terkunci:
                <span class="font-mono">{{ addChildModal.parent?.part_number_mix }}</span>
              </div>

              <!-- mode: existing / baru -->
              <div class="ac-seg">
                <button class="ac-seg-btn" :class="{ active: addChildMode === 'existing' }" @click="addChildMode = 'existing'">
                  <i class="mdi mdi-magnify"></i> Dari data existing
                </button>
                <button class="ac-seg-btn" :class="{ active: addChildMode === 'new' }" @click="addChildMode = 'new'">
                  <i class="mdi mdi-shape-square-plus"></i> Buat baru
                </button>
              </div>

              <!-- EXISTING: search dropdown -->
              <template v-if="addChildMode === 'existing'">
                <div class="ac-field">
                  <label>Cari part (number / nama / job)</label>
                  <div class="ac-search-wrap">
                    <i class="mdi" :class="addChildSearching ? 'mdi-loading mdi-spin' : 'mdi-magnify'"></i>
                    <input v-model="addChildSearch" type="text" placeholder="ketik min. 2 huruf..." @input="onAddChildSearch" />
                  </div>
                </div>
                <div v-if="addChildResults.length" class="ac-results">
                  <button
                    v-for="r in addChildResults"
                    :key="r.id"
                    class="ac-result"
                    :class="{ active: addChildSelected?.id === r.id }"
                    @click="addChildSelected = r"
                  >
                    <span class="ac-r-pn font-mono">{{ r.part_number }}</span>
                    <span class="ac-r-name">{{ r.part_name || r.alias || '—' }}</span>
                    <span class="area-tag" :style="areaTagStyle(r.area)">{{ r.area }}</span>
                  </button>
                </div>
                <div v-else-if="addChildSearch.trim().length >= 2 && !addChildSearching" class="ac-empty">Tidak ada hasil.</div>
                <div v-if="addChildSelected" class="ac-selected">
                  <i class="mdi mdi-check-circle"></i> Dipilih:
                  <strong class="font-mono">{{ addChildSelected.part_number }}</strong>
                  <span>— akan ditautkan sebagai komponen (relasi baru, tanpa membuat baris baru).</span>
                </div>
              </template>

              <!-- BARU: form + tipe IFPP/CKD -->
              <template v-else>
                <div class="ac-field">
                  <label>Tipe komponen</label>
                  <div class="ac-type-seg">
                    <button class="ac-type-btn ac-type--ifpp" :class="{ active: addChildType === 'IFPP' }" @click="addChildType = 'IFPP'">
                      IFPP <span class="ac-type-hint">press/stamping</span>
                    </button>
                    <button class="ac-type-btn ac-type--ckd" :class="{ active: addChildType === 'CKD' }" @click="addChildType = 'CKD'">
                      CKD <span class="ac-type-hint">nut/bolt/clip</span>
                    </button>
                  </div>
                </div>
                <div class="ac-grid">
                  <div class="ac-field"><label>Part Number <span class="req">*</span></label><input v-model="addChildForm.part_number" type="text" placeholder="9004A-17210" /></div>
                  <div class="ac-field"><label>Nama Part</label><input v-model="addChildForm.part_name" type="text" placeholder="NUT WELD M6" /></div>
                  <div class="ac-field"><label>Alias</label><input v-model="addChildForm.alias" type="text" /></div>
                </div>
                <p class="ac-note">
                  <i class="mdi mdi-information-outline"></i>
                  Akan dibuat sebagai WIP dengan area
                  <strong>{{ addChildType === 'IFPP' ? 'INHOUSE' : 'CKD' }}</strong>,
                  source <strong>{{ addChildType === 'IFPP' ? 'INHOUSE' : 'CKD' }}</strong>; model/customer mewarisi parent.
                </p>
              </template>

              <Transition name="err-fade">
                <div v-if="addChildError" class="form-error"><i class="mdi mdi-alert-circle-outline"></i> {{ addChildError }}</div>
              </Transition>
            </div>

            <div class="modal-footer">
              <span class="kbd-hint"><kbd>Esc</kbd> tutup · <kbd>⏎</kbd> tambah</span>
              <button class="md-btn md-btn-ghost" :disabled="addChildSaving" @click="addChildModal.open = false">Batal</button>
              <button
                class="md-btn md-btn-primary"
                :disabled="addChildSaving || (addChildMode === 'existing' ? !addChildSelected : !addChildForm.part_number.trim())"
                @click="saveAddChild"
              >
                <i class="mdi" :class="addChildSaving ? 'mdi-loading mdi-spin' : 'mdi-content-save-outline'"></i>
                {{ addChildSaving ? 'Menyimpan...' : 'Tambah' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- CHANGED: Form Modal — tidak bisa tutup via overlay/ESC, hanya via X atau Batal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="formModal.open" v-modal-stack="closeFormModal" class="modal-overlay" @click.self.prevent>
          <div class="modal-box modal-form" @click.stop>
            <div class="modal-header">
              <div class="modal-header-icon"><i :class="formModal.mode === 'create' ? 'mdi mdi-plus' : 'mdi mdi-pencil'"></i></div>
              <div>
                <p class="modal-title">{{ formModal.mode === 'create' ? 'Tambah Part Baru' : 'Edit Part' }}</p>
                <p class="modal-subtitle" v-if="formModal.mode === 'edit'">ID: {{ form.id }}</p>
              </div>
              <!-- CHANGED: pakai closeFormModal() agar cek formSaving -->
              <button class="modal-close" :disabled="formSaving" @click="closeFormModal"><i class="mdi mdi-close"></i></button>
            </div>
            <div class="modal-body form-body">
              <!-- Saran autocomplete (typeahead) — tak terlihat, dirujuk via list= -->
              <datalist id="dl-model"><option v-for="v in suggest.model" :key="'mo'+v" :value="v" /></datalist>
              <datalist id="dl-carname"><option v-for="v in suggest.car_name" :key="'c'+v" :value="v" /></datalist>
              <datalist id="dl-customer"><option v-for="v in suggest.customer" :key="'cu'+v" :value="v" /></datalist>
              <datalist id="dl-vendor"><option v-for="v in suggest.vendor" :key="'ve'+v" :value="v" /></datalist>
              <datalist id="dl-jobno"><option v-for="j in jobNoOptions" :key="'jn'+j" :value="j" /></datalist>

              <!-- ── Langkah 1: pilih LAYER dulu, baru Category (opsi mengikuti Layer) ── -->
              <div class="form-section">
                <p class="form-section-title">Jenis Part <span class="hint">(pilih Layer dulu — Category & field lain menyesuaikan)</span></p>
                <div class="form-grid form-grid--3col">
                  <div class="form-field">
                    <label>Layer <span class="req">*</span></label>
                    <select v-model="formLayer" @change="onFormLayerChange">
                      <option :value="null">-- Pilih Layer --</option>
                      <option v-for="opt in LAYER_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label>Category <span class="req">*</span></label>
                    <select v-model="form.category" :disabled="!formLayer" @change="onCategoryChange">
                      <option :value="null">{{ formLayer ? '-- Pilih Category --' : '-- Pilih Layer dulu --' }}</option>
                      <option v-for="opt in categoryOptionsForFormLayer" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                  <!-- Tipe: pilih hanya untuk WELDING; lainnya auto dari category -->
                  <div class="form-field">
                    <label>Tipe <span class="req">*</span></label>
                    <select v-if="showTipeSelect" v-model="formTipe">
                      <option value="FP">FP — Finished Part</option>
                      <option value="WIP">WIP — Work In Progress</option>
                      <option value="COMMON">COMMON — FP + WIP </option>
                    </select>
                    <div v-else class="auto-field">
                      <span class="auto-field-val">{{ form.category ? (form.is_common ? 'COMMON — FP + WIP' : form.is_wip ? 'WIP — Work In Progress' : 'FP — Finished Part') : '—' }}</span>
                      <span v-if="form.category" class="auto-badge">auto</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ── Setelah category dipilih: identitas + section lain ── -->
              <Transition name="section-reveal">
                <div v-if="showAfterCategory" class="sections-cascade">
                  <!-- Section 1: Identitas -->
                  <div class="form-section">
                    <p class="form-section-title">Identitas Part</p>
                    <div class="form-grid">
                      <div class="form-field">
                        <label>
                          Part Number <span class="req">*</span>
                          <span v-if="isDelivery && ifpdLookupLoading" class="auto-badge">mencari…</span>
                          <span v-if="isDelivery && ifpdLookupFound" class="auto-badge" style="background:#16a34a">✓ dari ms_data_ifp</span>
                        </label>
                        <input
                          v-model="form.part_number"
                          type="text"
                          placeholder="57407-BZ060-00"
                          @blur="isDelivery ? onIfpdPartBlur() : trimPartNumber()"
                        />
                      </div>
                      <div v-if="showPartNumberDelivery" class="form-field pnd-wrap">
                        <label>
                          Part Number Delivery
                          <span v-if="isSinglePress" class="hint">(FP IFPW yang dikirim langsung)</span>
                          <span v-else class="hint">(cari → set parent)</span>
                        </label>
                        <div class="input-with-btn">
                          <input
                            v-model="form.part_number_delivery"
                            type="text"
                            placeholder="ketik untuk cari part welding..."
                            @input="onPndInput"
                            @focus="onPndInput"
                            @blur="pndBlur(); trimPartNumberDelivery()"
                          />
                          <button type="button" class="copy-btn" title="Samakan dengan Part Number" @click="copyPartToDelivery">= part</button>
                        </div>
                        <div v-if="pndOpen && (pndResults.length || pndSearching)" class="pnd-results">
                          <div v-if="pndSearching" class="pnd-loading"><i class="mdi mdi-loading mdi-spin"></i> mencari…</div>
                          <button
                            v-for="p in pndResults"
                            :key="p.id"
                            type="button"
                            class="pnd-result"
                            @mousedown.prevent="pickPnd(p)"
                          >
                            <span class="pnd-pn font-mono">{{ p.part_number }}</span>
                            <span class="pnd-name">{{ p.part_name || p.alias || '—' }}</span>
                            <span class="area-tag" :style="areaTagStyle(p.area)">{{ p.area }}</span>
                            <span v-if="!isWelding && p.is_wip" class="pnd-parent-hint" title="akan jadi parent">↳ parent</span>
                          </button>
                        </div>
                      </div>
                      <template v-if="showJobNumber">
                        <div class="form-field">
                          <label>Job Number
                            <span v-if="jobAuto" class="auto-badge">auto lookup</span>
                            <button v-if="jobAuto" type="button" class="mini-link" @click="onJobManual">✎ ubah</button>
                            <button v-else type="button" class="mini-link" @click="resetJobAuto">↺ auto</button>
                          </label>
                          <input v-model="form.job_number" type="text" :disabled="jobAuto" :list="jobAuto ? undefined : 'dl-jobno'" placeholder="otomatis dari Part Number" />
                        </div>
                      </template>
                      <template v-if="showJobNumberDelivery">
                        <div class="form-field">
                          <label>Job Number Delivery
                            <span v-if="jobAuto" class="auto-badge">auto lookup</span>
                          </label>
                          <input v-model="form.job_number_delivery" type="text" :disabled="jobAuto" placeholder="otomatis dari Part Number Delivery" />
                        </div>
                      </template>
                      <div class="form-field form-field--full alias-name-row">
                        <div class="form-field alias-col">
                          <label>Alias <span class="hint">(nama pendek)</span></label>
                          <input v-model="form.alias" type="text" placeholder="kaki kambing, kecoa, ..." />
                          <div v-if="aliasCands !== null" class="pname-cands">
                            <button v-for="c in aliasCands" :key="c.name" type="button" class="pname-cand" :class="{ 'pname-cand--on': form.alias === c.name }" :title="c.source" @click="form.alias = c.name">
                              {{ c.name }} <small>{{ c.source }}</small>
                            </button>
                            <span v-if="!aliasCands.length" class="pname-none">Alias tidak ditemukan.</span>
                          </div>
                        </div>
                        <div class="form-field name-col">
                          <label>
                            Nama Part <span class="hint">(deskripsi SAP / MAKTG)</span>
                            <button type="button" class="pname-get" :disabled="!form.part_number?.trim() || pnameLoading" title="Ambil nama & alias dari master/BOM SAP/data IFPP/stok SAP/planning" @click="fetchPartNames">
                              <i class="mdi" :class="pnameLoading ? 'mdi-loading mdi-spin' : 'mdi-magnify'"></i> Ambil nama &amp; alias
                            </button>
                          </label>
                          <input v-model="form.part_name" type="text" placeholder="PANEL SUB-ASSY, RR FLOOR" />
                          <div v-if="pnameCands !== null" class="pname-cands">
                            <button v-for="c in pnameCands" :key="c.name" type="button" class="pname-cand" :class="{ 'pname-cand--on': form.part_name === c.name }" :title="c.source" @click="form.part_name = c.name">
                              {{ c.name }} <small>{{ c.source }}</small>
                            </button>
                            <span v-if="!pnameCands.length" class="pname-none">Nama tidak ditemukan di master, BOM SAP, data IFPP, maupun stok SAP.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Section 2: Proses & Hierarki — Part Number Mix di-hidden (full auto,
                       gak pernah diedit manual lagi, lihat mixAuto watcher), OP dipindah ke
                       section "Area, Proses Selanjutnya & OP". Section ini kini isinya cuma
                       Mother/Parent, jadi v-if ikut kondisinya biar gak nongol judul kosong
                       pas part-nya gak punya mother/parent (mis. WELDING FP root). -->
                  <div v-if="!isDelivery && (isWIP || isCommonForm || isOuthouseComp)" class="form-section">
                    <p class="form-section-title">
                      <template v-if="isCommonForm"><span class="type-badge type-wip">WIP</span> Jalur WIP — dirakit ke mother</template>
                      <template v-else>Proses & Hierarki</template>
                    </p>
                    <p v-if="isCommonForm" class="common-route-hint">
                      Isi: mother (boleh lebih dari satu) + Qty Unit per mother. Customer, model &amp; proses selanjutnya jalur ini
                      ikut mother<template v-if="extraMothers.length">: {{ extraMothers.map(m => `${m.part_number} (${m.area || '—'} · ${m.customer_1 || '—'} · ${m.model || '—'})`).join(', ') }}</template>.
                    </p>
                    <div class="form-grid">
                      <!-- Mother / Parent — SATU field. WELDING (& INHOUSE/OUTHOUSE belum tersimpan):
                           picker single (kolom legacy parent_part_mix). INHOUSE/OUTHOUSE yang sudah
                           tersimpan: tag-input multi-mother (ms_welding_parents), tambah/lepas
                           langsung tersimpan ke server, tidak ada preview ganda yang membingungkan. -->
                      <div v-if="isWIP || isCommonForm || isOuthouseComp" class="form-field form-field--full">
                        <label>
                          Mother / Parent
                          <span v-if="showMultiMother" class="hint">(bisa lebih dari satu — tambah/lepas langsung tersimpan)</span>
                          <span v-else class="hint">(kosong jika FP root — model/customer ikut ter-isi dari parent)</span>
                        </label>

                        <!-- Multi-mother (INHOUSE/OUTHOUSE, atau WELDING WIP — part sudah tersimpan) -->
                        <template v-if="showMultiMother">
                          <div class="mother-tag-box">
                            <span v-for="m in extraMothers" :key="m.id" class="extra-mother-chip"
                              :class="{ 'extra-mother-chip--warn': !isCommonForm && m.model && form.model && m.model !== form.model }">
                              {{ m.part_number }}
                              <span v-if="!isCommonForm && m.model && form.model && m.model !== form.model" class="extra-mother-warn-text"
                                :title="`Model mother ini (${m.model}) berbeda dari part ini (${form.model})`">⚠</span>
                              <span class="extra-mother-qty-unit" title="Qty Unit — qty part ini per 1 unit mother ini">
                                <span class="extra-mother-qty-unit-label">Qty Unit</span>
                                <input
                                  type="number" min="0" step="0.001"
                                  :value="m.mother_qty_unit ?? 1"
                                  :disabled="qtyUnitSavingId === m.id"
                                  @change="onUpdateMotherQtyUnit(m, ($event.target as HTMLInputElement).value)"
                                />
                              </span>
                              <button type="button" class="extra-mother-remove" title="Lepas mother ini"
                                :disabled="removingMotherMix === m.part_number_mix"
                                @click="onRemoveMother(m)">
                                <i class="mdi" :class="removingMotherMix === m.part_number_mix ? 'mdi-loading mdi-spin' : 'mdi-close'"></i>
                              </button>
                            </span>
                            <ParentMixPicker
                              v-model="extraMotherMix"
                              :context="parentPickerContext"
                              placeholder="+ tambah mother…"
                              hide-preview
                              :linked-ids="extraMothers.map(m => m.id)"
                              class="mother-tag-input"
                              @picked="onAddMother"
                            />
                          </div>
                          <p class="mother-status" :class="{ 'mother-status--warn': !extraMothers.length && !extraMothersLoading }">
                            <i class="mdi" :class="extraMothersLoading ? 'mdi-loading mdi-spin' : (extraMothers.length ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline')"></i>
                            <template v-if="extraMothersLoading">memuat mother…</template>
                            <template v-else-if="extraMothers.length">{{ extraMothers.length }} mother terpasang</template>
                            <template v-else>Belum ada mother — part ini akan jadi root (terputus dari hierarki).</template>
                          </p>
                        </template>

                        <!-- Single picker: WELDING WIP, atau INHOUSE/OUTHOUSE yang belum tersimpan (create) -->
                        <ParentMixPicker
                          v-else
                          v-model="form.parent_part_mix"
                          :context="parentPickerContext"
                          @linked="onChildLinked"
                          @picked="onParentPicked"
                        />
                      </div>
                      <div v-if="isCommonForm" class="form-field">
                        <label>QTY KBN jalur WIP <span class="hint">(auto FPB qty kbn mother, boleh diubah)</span></label>
                        <input v-model.number="form.qty_kbn_wip" type="number" min="1" :placeholder="String(form.qty_kbn ?? '')" />
                      </div>
                    </div>
                  </div>

                  <!-- Section: Area, Proses Selanjutnya & OP — Area & Layer sama-sama
                       ikut toggle autoConfig (satu tombol ✎/↺), makanya digabung sini. -->
                  <div class="form-section">
                    <p class="form-section-title">
                      Area, Proses Selanjutnya &amp; OP
                      <button type="button" class="mini-link" @click="toggleAutoConfig">
                        {{ autoConfig ? '✎ ubah manual' : '↺ auto' }}
                      </button>
                    </p>
                    <div class="form-grid">
                      <div class="form-field">
                        <label>Area <span class="req">*</span> <span v-if="autoConfig && !isWelding" class="auto-badge">auto</span></label>
                        <!-- Non-welding + auto → area otomatis (INHOUSE/OUTHOUSE/CKD/IFRM) -->
                        <div v-if="autoConfig && !isWelding" class="auto-field">
                          <span class="auto-field-val">{{ form.area || '—' }}</span>
                        </div>
                        <!-- WELDING → pilih area welding (khusus area IFPW); atau mode manual → bebas -->
                        <select v-else-if="isWelding" v-model="formAreaGroup" @change="onAreaChange">
                          <option value="">-- Pilih Area --</option>
                          <option v-for="a in weldingAreasActive" :key="a.area_code" :value="a.area_code">{{ a.area_code }}</option>
                        </select>
                        <!-- Kolom `area` (nilai lama, kompatibilitas) diisi otomatis dari mesin utama —
                             tidak ada UI terpisah. Area >1 nilai lama & belum ada mesin → wajib pilih mesin. -->
                        <input v-else v-model="form.area" type="text" placeholder="INHOUSE / OUTHOUSE / CKD / IFRM / ..." />
                        <span v-if="isWelding && formAreaZones.length > 1 && !form.machine" class="hint" style="color:#d97706"><i class="mdi mdi-information-outline"></i> Pilih mesin utama untuk area ini.</span>
                      </div>
                      <div v-if="!isCommonForm" class="form-field">
                        <label>Proses Selanjutnya <span class="hint">{{ isWIP ? '(daftar mother + area prosesnya)' : '(FP — sudah barang jadi)' }}</span></label>
                        <!-- FP: udah jadi barang jadi, gak ada "proses selanjutnya" lagi. -->
                        <div v-if="!isWIP" class="auto-field">
                          <span class="auto-field-val">Storing IFPD</span>
                          <span class="auto-badge">auto</span>
                        </div>
                        <!-- WIP, belum tersimpan: belum bisa punya mother tertaut. -->
                        <div v-else-if="!form.id" class="auto-field">
                          <span class="auto-field-val">— (simpan dulu)</span>
                        </div>
                        <div v-else-if="extraMothersLoading" class="auto-field">
                          <span class="auto-field-val"><i class="mdi mdi-loading mdi-spin"></i> memuat mother…</span>
                        </div>
                        <!-- WIP tersimpan: daftar mother beserta area proses masing2 —
                             bisa lebih dari satu, bisa beda area (lihat extraMothers). -->
                        <div v-else-if="extraMothers.length" class="next-process-list">
                          <span v-for="m in extraMothers" :key="m.id" class="next-process-chip">
                            {{ m.part_number }}
                            <span class="next-process-chip-area">{{ m.area || '—' }}</span>
                          </span>
                        </div>
                        <div v-else class="auto-field">
                          <span class="auto-field-val">Belum ada mother</span>
                        </div>
                      </div>
                      <!-- Tipe Part (khusus barang jadi/IFPD) — pindah dari Mesin & Produksi,
                           lebih masuk akal di sini krn nyambung sama Area (lihat
                           _autoSuggestIfpdType: IFPP→SINGLE FINISH, WSS→SEMI SUB-ASSY,
                           ROBOT/SA MANUAL→SUB-ASSY atau MODULE, user pilih sendiri). -->
                      <div v-if="derivedLayer === 'IFPD' && !isCommonForm" class="form-field">
                        <label>Tipe Part <span class="hint">(khusus barang jadi/IFPD)</span></label>
                        <select v-model="form.ifpd_type">
                          <option :value="null">— Belum ditentukan —</option>
                          <option value="SINGLE_FINISH">SINGLE FINISH</option>
                          <option value="SUB_ASSY">SUB-ASSY</option>
                          <option value="SEMI_SUB_ASSY">SEMI SUB-ASSY</option>
                          <option value="MODULE">MODULE</option>
                        </select>
                      </div>
                      <!-- OP: angka kelipatan 10, kosong = FP tanpa OP -->
                      <template v-if="isWelding">
                        <div class="form-field">
                          <label>OP <span class="hint">(kelipatan 10, kosongkan jika tanpa OP)</span></label>
                          <input
                            :value="form.op || ''"
                            @input="onOpInput(($event.target as HTMLInputElement).value)"
                            type="number" step="10" min="10"
                            placeholder="10 / 20 / 30"
                          />
                        </div>
                      </template>
                      <!-- Layer: cuma nongol kalau autoConfig dimatikan (override manual jarang dipakai) -->
                      <div v-if="!autoConfig" class="form-field">
                        <label>Layer <span class="hint">(override manual)</span></label>
                        <select v-model="form.layer">
                          <option :value="null">-- Kosong --</option>
                          <option value="IFRM">IFRM</option>
                          <option value="CKD">CKD</option>
                          <option value="IFPP">IFPP — Komponen welding (INHOUSE/OUTHOUSE)</option>
                          <option value="IFPW">IFPW — Welding (WIP & FP)</option>
                          <option value="IFPD">IFPD — Delivery (lookup)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <!-- Section 3: Mesin & Produksi / Stok -->
                  <div class="form-section">
                    <p class="form-section-title">{{ isDelivery ? 'Stok & Kuantitas' : 'Mesin & Produksi' }}</p>
                    <div class="form-grid">
                      <div v-if="showMachine" class="form-field">
                        <label>Mesin Utama <span class="hint">(current)</span></label>
                        <button type="button" class="machine-pick-select" :class="{ 'machine-pick-select--empty': !form.machine }" :disabled="!formAreaGroup" :title="!formAreaGroup ? 'Pilih area dulu' : ''" @click="openMachinePicker('main')">
                          <i class="mdi mdi-factory"></i>
                          <span>{{ form.machine || 'Pilih mesin utama...' }}</span>
                          <i class="mdi mdi-chevron-right machine-pick-arrow"></i>
                        </button>
                        <span v-if="machineNotRegistered" class="hint" style="color:#d97706">Belum terdaftar di Master Mesin — otomatis didaftarkan saat disimpan.</span>
                      </div>
                      <div v-if="showMachine" class="form-field">
                        <label>Mesin Alternatif <span class="hint">(cadangan)</span></label>
                        <button type="button" class="machine-pick-select machine-pick-select--alt" :class="{ 'machine-pick-select--empty': !form.machine_alt }" :disabled="!formAreaGroup" @click="openMachinePicker('alt')">
                          <i class="mdi mdi-swap-horizontal"></i>
                          <span>{{ form.machine_alt || 'Pilih mesin alternatif...' }}</span>
                          <i class="mdi mdi-chevron-right machine-pick-arrow"></i>
                        </button>
                      </div>
                      <div v-if="showMachine && showJig" class="form-field">
                        <label>Jig <span class="hint">(ikut mesin — pilih lewat Mesin Utama)</span></label>
                        <button type="button" class="machine-pick-select" :class="{ 'machine-pick-select--empty': !form.jig }" @click="openMachinePicker('main')">
                          <i class="mdi mdi-vector-square"></i>
                          <span>{{ form.jig ? `${form.machine} · Jig ${form.jig}` : 'Pilih jig di mesin...' }}</span>
                          <i class="mdi mdi-chevron-right machine-pick-arrow"></i>
                        </button>
                      </div>
                      <div v-if="showMachine && form.id" class="form-field form-field--full">
                        <button type="button" class="mini-link" @click="machineHistoryOpen = !machineHistoryOpen">
                          <i class="mdi" :class="machineHistoryOpen ? 'mdi-chevron-down' : 'mdi-chevron-right'"></i>
                          Riwayat mesin <span class="hint">({{ machineHistory.length }} perubahan)</span>
                        </button>
                        <div v-if="machineHistoryOpen" class="machine-history">
                          <div v-if="machineHistoryLoading" class="hint"><i class="mdi mdi-loading mdi-spin"></i> memuat…</div>
                          <div v-else-if="!machineHistory.length" class="hint">Belum ada riwayat perubahan mesin.</div>
                          <table v-else class="machine-history-table">
                            <thead><tr><th>Waktu</th><th>Jenis</th><th>Dari</th><th>Ke</th><th>Oleh</th></tr></thead>
                            <tbody>
                              <tr v-for="h in machineHistory" :key="h.id">
                                <td class="mono">{{ h.changed_at }}</td>
                                <td><span class="hist-kind" :class="'hist-kind--' + h.field_name">{{ h.field_name === 'machine' ? 'UTAMA' : h.field_name === 'machine_alt' ? 'ALTERNATIF' : 'AREA' }}</span></td>
                                <td class="mono">{{ h.field_name === 'area' ? (areaOfZone(h.old_value)?.area_code ?? h.old_value ?? '—') : (h.old_value || '—') }}</td>
                                <td class="mono"><strong>{{ h.field_name === 'area' ? (areaOfZone(h.new_value)?.area_code ?? h.new_value ?? '—') : (h.new_value || '—') }}</strong></td>
                                <td>{{ h.changed_by }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <!-- Line / Mesin (INHOUSE) — dipindah dari Konfigurasi Layer, konsep
                           sama (urutan proses/mesin), lebih masuk akal digabung sini. -->
                      <Transition name="section-reveal">
                        <div v-if="showLinePress" class="form-field form-field--full">
                          <label>Line / Mesin <span class="req">*</span> <span class="hint">(1 baris = 1 proses berurutan; line alternatif dalam 1 proses pisahkan "/" mis. B1 / B2)</span></label>
                          <div class="line-route-editor">
                            <div class="line-route-total">
                              <span>{{ isInhouseComp ? 'Jumlah Proses' : 'Jumlah Line' }}</span>
                              <input type="number" min="1" max="12" :value="lineRows.length"
                                @input="setLineTotal(Number(($event.target as HTMLInputElement).value))" />
                              <span v-if="lineRowsLoading" class="hint"><i class="mdi mdi-loading mdi-spin"></i> memuat…</span>
                            </div>
                            <div v-for="(r, i) in lineRows" :key="i" class="line-route-row">
                              <span class="line-route-seq">{{ i + 1 }}</span>
                              <input v-model="r.machine" type="text" list="dl-line-press" :placeholder="i === 0 ? 'BL' : 'A' + i" />
                              <button type="button" class="line-route-remove" @click="removeLineRow(i)" title="Hapus proses">
                                <i class="mdi mdi-close"></i>
                              </button>
                            </div>
                            <button type="button" class="line-route-add" @click="addLineRow">
                              <i class="mdi mdi-plus-circle"></i> Tambah proses
                            </button>
                          </div>
                          <datalist id="dl-line-press">
                            <option v-for="lp in LINE_PRESS_OPTIONS" :key="lp" :value="lp" />
                          </datalist>
                        </div>
                      </Transition>
                      <!-- Jig SENGAJA gak ada field terpisah di sini — 1 paket sama
                           pemilihan mesin (chip jig muncul di dalam MachinePickerModal
                           pas area ROBOT & mesin dipilih, lihat onMachinePicked). -->
                      <!-- UPH & Stroke: hanya WELDING & PRESS -->
                      <template v-if="showProcessParams">
                        <div class="form-field"><label>UPH <span class="hint">(↔ cycle)</span></label><input v-model.number="form.uph" type="number" step="0.01" @input="onUphInput" /></div>
                        <div class="form-field">
                          <label>Stroke / Mili Spot</label><input v-model.number="form.stroke_mili_spot" type="number" />
                        </div>
                      </template>
                      <div v-if="showCycleTime" class="form-field">
                        <label>Cycle Time <span class="hint">(detik ↔ UPH)</span></label>
                        <input v-model.number="form.cycle_time_sec" type="number" step="0.001" placeholder="0.000" @input="onCycleInput" />
                      </div>
                      <div v-if="showQtyKbn" class="form-field">
                        <label>QTY KBN<template v-if="isCommonForm"> jalur FP</template> <span class="req">*</span></label>
                        <input v-model.number="form.qty_kbn" type="number" min="1" />
                      </div>
                      <div class="form-field">
                        <label>Satuan <span class="hint">(PCS, KG, SHT, dll)</span></label>
                        <input v-model="form.uom" type="text" placeholder="PCS" maxlength="10" list="dl-uom" />
                        <datalist id="dl-uom">
                          <option value="PCS" /><option value="KG" /><option value="SHT" /><option value="SET" /><option value="M" />
                        </datalist>
                      </div>
                      <div class="form-field">
                        <label>Tipe Pallet <span class="hint">(opsional)</span></label>
                        <input v-model="form.pallet_type" type="text" placeholder="mis. Pallet Besi" maxlength="50" />
                      </div>
                      <div v-if="showLotCycle" class="form-field"><label>Lot Cycle</label><input v-model.number="form.lot_cycle" type="number" /></div>
                      <div v-if="showQtyUnit && !showMultiMother" class="form-field">
                        <label>Qty Unit <span class="hint">(WIP per FP)</span></label>
                        <input v-model.number="form.qty_unit" type="number" step="0.0001" min="1" placeholder="1" />
                      </div>
                      <p v-if="showQtyUnit && showMultiMother" class="form-field form-field--full qty-unit-per-mother-note">
                        <i class="mdi mdi-information-outline"></i>
                        Qty Unit diatur per-mother (lihat kolom "Qty Unit" di tiap chip Mother/Parent di atas) — part ini punya lebih dari satu mother yang bisa beda kebutuhan.
                      </p>
                    </div>
                  </div>

                  <!-- Section 4a: Jenis CKD (khusus CKD — kolom ckd_type) -->
                  <div v-if="showCkdType" class="form-section">
                    <p class="form-section-title">Klasifikasi CKD</p>
                    <div class="form-grid">
                      <div class="form-field">
                        <label>Jenis CKD <span class="req">*</span></label>
                        <select v-model="form.ckd_type">
                          <option :value="null">-- Pilih --</option>
                          <option v-for="t in CKD_TYPES" :key="t" :value="t">{{ t }}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <!-- Section 4b: Supplier (MATERIAL — multi-supplier+GPART) / Vendor (OUTHOUSE
                       — satu field) — digabung 1 section, konsep sama "dari mana part ini". -->
                  <div v-if="showSupplier || showVendor" class="form-section">
                    <p class="form-section-title">Supplier</p>
                    <div class="form-grid">
                      <template v-if="showSupplier">
                        <div class="form-field">
                          <label>Supplier 1 <span class="hint">(asal material — utama)</span></label>
                          <input v-model="form.vendor" type="text" placeholder="Nama supplier" />
                        </div>
                        <div v-if="supplierSlots >= 2" class="form-field">
                          <label>
                            Supplier 2 <span class="hint">(cadangan/alternatif)</span>
                            <button v-if="supplierSlots === 2" type="button" class="cust-remove" title="Hapus Supplier 2" @click="removeLastSupplier">
                              <i class="mdi mdi-close"></i>
                            </button>
                          </label>
                          <input v-model="form.vendor_2" type="text" placeholder="Nama supplier" />
                        </div>
                        <div v-if="supplierSlots >= 3" class="form-field">
                          <label>
                            Supplier 3 <span class="hint">(cadangan/alternatif)</span>
                            <button type="button" class="cust-remove" title="Hapus Supplier 3" @click="removeLastSupplier">
                              <i class="mdi mdi-close"></i>
                            </button>
                          </label>
                          <input v-model="form.vendor_3" type="text" placeholder="Nama supplier" />
                        </div>
                        <div v-if="supplierSlots < 3" class="form-field customer-add-field">
                          <button type="button" class="customer-add-btn" @click="addSupplier">
                            <i class="mdi mdi-plus-circle-outline"></i> Tambah Supplier
                          </button>
                        </div>
                        <div class="form-field">
                          <label>GPART <span class="hint">(klasifikasi manual — tak ada di data SAP)</span></label>
                          <select v-model="form.gpart">
                            <option :value="null">-- Belum diisi --</option>
                            <option value="GPART">GPART</option>
                            <option value="NON_GPART">Non-GPART</option>
                          </select>
                        </div>
                      </template>
                      <!-- Vendor (OUTHOUSE) — dipindah dari Konfigurasi Layer, konsep sama
                           "supplier", cukup 1 field wajib, gak perlu slot multi. -->
                      <div v-if="showVendor" class="form-field">
                        <label>Vendor <span class="req">*</span> <span class="hint">(rekomendasi vendor existing)</span></label>
                        <input v-model="form.vendor" type="text" list="dl-vendor" placeholder="Nama vendor" />
                      </div>
                    </div>
                  </div>

                  <!-- Section 4: Model & Customer (WELDING / PRESS / SUBCON) -->
                  <div v-if="showModelCustomer" class="form-section">
                    <p class="form-section-title">
                      <template v-if="isCommonForm"><span class="type-badge type-fp">FP</span> Jalur FP — dikirim langsung (IFPD)</template>
                      <template v-else>Model & Customer</template>
                    </p>
                    <p v-if="isCommonForm" class="common-route-hint">
                      Isi: nomor &amp; job delivery (biasanya = part number), tipe part, model &amp; customer penerima langsung.
                      Customer lain dgn nomor delivery berbeda → Varian Delivery.
                    </p>
                    <div class="form-grid">
                      <template v-if="isCommonForm">
                        <div class="form-field">
                          <label>Part Number Delivery</label>
                          <div class="input-with-btn">
                            <input v-model="form.part_number_delivery" type="text" placeholder="= part number" />
                            <button type="button" class="md-btn md-btn-ghost" title="Samakan dgn part number" @click="form.part_number_delivery = form.part_number">= part</button>
                          </div>
                        </div>
                        <div class="form-field">
                          <label>Job Number Delivery</label>
                          <input v-model="form.job_number_delivery" type="text" placeholder="job delivery" />
                        </div>
                        <div class="form-field">
                          <label>Tipe Part <span class="hint">(barang jadi/IFPD)</span></label>
                          <select v-model="form.ifpd_type">
                            <option :value="null">— Belum ditentukan —</option>
                            <option value="SINGLE_FINISH">SINGLE FINISH</option>
                            <option value="SUB_ASSY">SUB-ASSY</option>
                            <option value="SEMI_SUB_ASSY">SEMI SUB-ASSY</option>
                            <option value="MODULE">MODULE</option>
                          </select>
                        </div>
                        <div class="form-field">
                          <label>Proses Selanjutnya</label>
                          <div class="auto-field"><span class="auto-field-val">Storing IFPD</span><span class="auto-badge">auto</span></div>
                        </div>
                      </template>
                      <div class="form-field"><label>Kode Model</label><input v-model="form.model" type="text" list="dl-model" placeholder="D14N" /></div>
                      <div class="form-field"><label>Nama Kendaraan</label><input v-model="form.car_name" type="text" list="dl-carname" /></div>
                      <div class="form-field"><label>Customer 1</label><input v-model="form.customer_1" type="text" list="dl-customer" placeholder="ADM Plant 4" /></div>
                      <div v-if="customerSlots >= 2" class="form-field">
                        <label>
                          Customer 2
                          <button v-if="customerSlots === 2" type="button" class="cust-remove" title="Hapus Customer 2" @click="removeLastCustomer">
                            <i class="mdi mdi-close"></i>
                          </button>
                        </label>
                        <input v-model="form.customer_2" type="text" list="dl-customer" />
                      </div>
                      <div v-if="customerSlots >= 3" class="form-field">
                        <label>
                          Customer 3
                          <button type="button" class="cust-remove" title="Hapus Customer 3" @click="removeLastCustomer">
                            <i class="mdi mdi-close"></i>
                          </button>
                        </label>
                        <input v-model="form.customer_3" type="text" list="dl-customer" />
                      </div>
                      <div v-if="customerSlots < 3" class="form-field customer-add-field">
                        <button type="button" class="customer-add-btn" @click="addCustomer">
                          <i class="mdi mdi-plus-circle-outline"></i> Tambah Customer
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Section: Status Runout (Area & Layer sudah pindah ke section
                       "Area, Proses Selanjutnya & OP" di atas; Line/Mesin & Vendor
                       masing2 pindah ke section Mesin & Produksi / Supplier). -->
                  <div class="form-section">
                    <p class="form-section-title">Status Runout</p>
                    <div class="form-grid">
                      <div class="form-field">
                        <label>Runout Date <span class="hint">(tanggal ditetapkan runout)</span></label>
                        <input v-model="form.runout_date" type="date" />
                      </div>
                      <div class="form-field">
                        <label>Status RUNOUT</label>
                        <div class="runout-toggle-wrap">
                          <label class="runout-toggle" :class="{ 'runout-toggle--on': form.is_runout }">
                            <input type="checkbox" v-model="form.is_runout" hidden />
                            <span class="runout-toggle-track">
                              <span class="runout-toggle-thumb"></span>
                            </span>
                            <span class="runout-toggle-label">{{
                              form.is_runout ? 'RUNOUT — tidak ada orderan' : 'Aktif — masih dipesan'
                            }}</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>

              <!-- ── Section 7: Media Part — cover (ringkas, 1 baris) + galeri tambahan
                   digabung 1 section (dulu 2 box dashed terpisah utk hal yg mirip,
                   kelihatan berulang/kurang rapi). ── -->
              <div class="form-section">
                <p class="form-section-title">Media Part</p>
                <template v-if="formModal.mode === 'edit'">
                  <div class="media-cover-row">
                    <div class="media-cover-thumb">
                      <img v-if="form.image" :src="masterService.getImageUrl(form.image) ?? undefined" alt="cover part" />
                      <i v-else class="mdi mdi-image-off-outline"></i>
                    </div>
                    <div class="media-cover-info">
                      <span class="media-cover-label">Cover <span class="hint">(tampil di tabel &amp; tree)</span></span>
                      <label class="media-cover-btn" :class="{ 'img-upload--loading': imageUploading }">
                        <i class="mdi" :class="imageUploading ? 'mdi-loading mdi-spin' : 'mdi-upload'"></i>
                        {{ imageUploading ? 'Mengupload...' : form.image ? 'Ganti Cover' : 'Set Cover' }}
                        <input type="file" accept=".jpg,.jpeg,.png,.gif,.webp" hidden :disabled="imageUploading || formSaving" @change="handleFormImageUpload" />
                      </label>
                      <button v-if="form.image" type="button" class="media-cover-btn media-cover-btn--danger" :disabled="imageUploading || formSaving" title="Hapus cover part" @click="removeCover('part')">
                        <i class="mdi mdi-delete-outline"></i> Hapus
                      </button>
                    </div>
                  </div>
                  <Transition name="err-fade">
                    <div v-if="imageError" class="form-error mt-4"><i class="mdi mdi-alert-circle-outline"></i> {{ imageError }}</div>
                  </Transition>

                  <!-- Foto 6 sisi part → kubus 2.5D di Spec Modal. -->
                  <Model3dSlot v-if="form.id" :part-id="form.id" kind="part" :has-cover="!!form.image" :disabled="formSaving"
                    @changed="loadFormGallery" @cover-set="(p: string) => setFormCover('part', p)" @error="(m: string) => (galleryError = m)" />
                  <MediaSideGrid v-if="form.id" :part-id="form.id" kind="part" :items="formGalleryPart" hint="tampil sbg kubus yg bisa diputar"
                    :disabled="galleryUploadingKind !== null || formSaving" @changed="loadFormGallery" @error="(m: string) => (galleryError = m)" />
                  <div class="media-gallery-divider">Galeri Tambahan <span class="hint">(foto/video, bisa banyak)</span></div>
                  <div v-if="formGalleryPartPlain.length" class="gallery-grid">
                    <div v-for="m in formGalleryPartPlain" :key="m.id" class="gallery-item">
                      <video v-if="m.media_type === 'video'" :src="m.url ?? masterService.getImageUrl(m.file_path) ?? undefined" class="gallery-thumb" muted />
                      <img v-else :src="m.url ?? masterService.getImageUrl(m.file_path) ?? undefined" :alt="m.file_path" class="gallery-thumb" />
                      <span v-if="m.media_type === 'video'" class="gallery-video-badge"><i class="mdi mdi-play-circle"></i></span>
                      <!-- Foto lama bisa langsung dijadikan salah satu sisi 3D tanpa upload ulang -->
                      <select v-if="m.media_type === 'image'" class="gallery-side-select" title="Jadikan sisi 3D" :value="''" :disabled="galleryUploadingKind !== null" @change="assignGallerySide(m, ($event.target as HTMLSelectElement).value)">
                        <option value="" disabled>→ sisi 3D…</option>
                        <option v-for="s in CUBE_SIDES" :key="s.key" :value="s.key">{{ s.label }}{{ formSideMap[s.key] ? ' (ganti)' : '' }}</option>
                      </select>
                      <button type="button" class="gallery-remove" title="Hapus" @click="deleteGalleryItem(m)"><i class="mdi mdi-close"></i></button>
                    </div>
                  </div>
                  <label class="img-upload-label" :class="{ 'img-upload--loading': galleryUploadingKind === 'part' }">
                    <i class="mdi" :class="galleryUploadingKind === 'part' ? 'mdi-loading mdi-spin' : 'mdi-upload'"></i>
                    {{ galleryUploadingKind === 'part' ? 'Mengupload...' : 'Tambah Foto/Video' }}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov"
                      multiple
                      hidden
                      :disabled="galleryUploadingKind !== null || formSaving"
                      @change="handleGalleryUpload($event, 'part')"
                    />
                  </label>
                  <p class="img-hint">gambar maks 5MB · video maks 30MB (mp4/webm/mov)</p>
                </template>
                <div v-else class="img-create-note">
                  <i class="mdi mdi-information-outline"></i> Media dapat diupload setelah data disimpan (mode Edit).
                </div>
              </div>

              <!-- ── Section 8: Media Pallet — pola sama dgn Media Part di atas ── -->
              <div class="form-section">
                <p class="form-section-title">Media Pallet</p>
                <template v-if="formModal.mode === 'edit'">
                  <div class="media-cover-row">
                    <div class="media-cover-thumb">
                      <img v-if="form.pallet_image" :src="masterService.getImageUrl(form.pallet_image) ?? undefined" alt="cover pallet" />
                      <i v-else class="mdi mdi-pallet"></i>
                    </div>
                    <div class="media-cover-info">
                      <span class="media-cover-label">Cover <span class="hint">(tampil di Spesifikasi Part)</span></span>
                      <label class="media-cover-btn" :class="{ 'img-upload--loading': palletImageUploading }">
                        <i class="mdi" :class="palletImageUploading ? 'mdi-loading mdi-spin' : 'mdi-upload'"></i>
                        {{ palletImageUploading ? 'Mengupload...' : form.pallet_image ? 'Ganti Cover' : 'Set Cover' }}
                        <input type="file" accept=".jpg,.jpeg,.png,.gif,.webp" hidden :disabled="palletImageUploading || formSaving" @change="handlePalletImageUpload" />
                      </label>
                      <button v-if="form.pallet_image" type="button" class="media-cover-btn media-cover-btn--danger" :disabled="palletImageUploading || formSaving" title="Hapus cover pallet" @click="removeCover('pallet')">
                        <i class="mdi mdi-delete-outline"></i> Hapus
                      </button>
                    </div>
                  </div>
                  <Transition name="err-fade">
                    <div v-if="palletImageError" class="form-error mt-4"><i class="mdi mdi-alert-circle-outline"></i> {{ palletImageError }}</div>
                  </Transition>

                  <!-- Foto 6 sisi pallet → penampil foto pallet (Spec Modal, mode Foto). -->
                  <Model3dSlot v-if="form.id" :part-id="form.id" kind="pallet" :has-cover="!!form.pallet_image" :disabled="formSaving"
                    @changed="loadFormGallery" @cover-set="(p: string) => setFormCover('pallet', p)" @error="(m: string) => (galleryError = m)" />
                  <MediaSideGrid v-if="form.id" :part-id="form.id" kind="pallet" :items="formGalleryPallet"
                    :disabled="galleryUploadingKind !== null || formSaving" @changed="loadFormGallery" @error="(m: string) => (galleryError = m)" />
                  <div class="media-gallery-divider">Galeri Tambahan <span class="hint">(foto/video, bisa banyak)</span></div>
                  <div v-if="formGalleryPalletPlain.length" class="gallery-grid">
                    <div v-for="m in formGalleryPalletPlain" :key="m.id" class="gallery-item">
                      <video v-if="m.media_type === 'video'" :src="m.url ?? masterService.getImageUrl(m.file_path) ?? undefined" class="gallery-thumb" muted />
                      <img v-else :src="m.url ?? masterService.getImageUrl(m.file_path) ?? undefined" :alt="m.file_path" class="gallery-thumb" />
                      <span v-if="m.media_type === 'video'" class="gallery-video-badge"><i class="mdi mdi-play-circle"></i></span>
                      <button type="button" class="gallery-remove" title="Hapus" @click="deleteGalleryItem(m)"><i class="mdi mdi-close"></i></button>
                    </div>
                  </div>
                  <label class="img-upload-label" :class="{ 'img-upload--loading': galleryUploadingKind === 'pallet' }">
                    <i class="mdi" :class="galleryUploadingKind === 'pallet' ? 'mdi-loading mdi-spin' : 'mdi-upload'"></i>
                    {{ galleryUploadingKind === 'pallet' ? 'Mengupload...' : 'Tambah Foto/Video' }}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov"
                      multiple
                      hidden
                      :disabled="galleryUploadingKind !== null || formSaving"
                      @change="handleGalleryUpload($event, 'pallet')"
                    />
                  </label>
                  <p class="img-hint">gambar maks 5MB · video maks 30MB (mp4/webm/mov)</p>
                  <Transition name="err-fade">
                    <div v-if="galleryError" class="form-error mt-4"><i class="mdi mdi-alert-circle-outline"></i> {{ galleryError }}</div>
                  </Transition>
                </template>
                <div v-else class="img-create-note">
                  <i class="mdi mdi-information-outline"></i> Media pallet dapat diupload setelah data disimpan (mode Edit).
                </div>
              </div>

              <Transition name="err-fade">
                <div v-if="formError" class="form-error-wrap">
                  <div class="form-error"><i class="mdi mdi-alert-circle-outline"></i> {{ formError }}</div>
                  <!-- Konflik part number mix → aksi langsung, tanpa cari baris itu di tabel -->
                  <div v-if="formConflict" class="form-conflict-actions">
                    <span class="fca-label">Baris #{{ formConflict.id }} · {{ formConflict.area || '—' }}{{ formConflict.is_runout ? ' · nonaktif' : '' }}</span>
                    <button v-if="conflictIsProcessChain" type="button" class="fca-btn fca-btn--primary" :disabled="conflictBusy"
                      :title="`Part sama, area beda (${formConflict.area} → ${form.area}) = proses lanjutan, bukan dobel. Mix diberi nomor urut proses.`" @click="useProcessMix">
                      <i class="mdi" :class="conflictBusy ? 'mdi-loading mdi-spin' : 'mdi-source-branch-plus'"></i> Proses lanjutan ({{ nextProcessMix(formConflict.part_number_mix) }}) &amp; simpan
                    </button>
                    <button type="button" class="fca-btn" :class="{ 'fca-btn--primary': !conflictIsProcessChain }" :disabled="conflictBusy" @click="takeOverConflict">
                      <i class="mdi" :class="conflictBusy ? 'mdi-loading mdi-spin' : 'mdi-swap-horizontal'"></i> Ambil alih &amp; simpan
                    </button>
                    <button type="button" class="fca-btn" :disabled="conflictBusy" @click="openConflictRow">
                      <i class="mdi mdi-open-in-new"></i> Buka #{{ formConflict.id }}
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
            <div class="modal-footer">
              <span class="kbd-hint"><kbd>Esc</kbd> tutup · <kbd>Ctrl</kbd>+<kbd>S</kbd> simpan</span>
              <!-- CHANGED: pakai closeFormModal() -->
              <button class="md-btn md-btn-ghost" :disabled="formSaving" @click="closeFormModal">Batal</button>
              <button class="md-btn md-btn-primary" @click="handleFormSubmit" :disabled="formSaving">
                <i class="mdi" :class="formSaving ? 'mdi-loading mdi-spin' : 'mdi-content-save-outline'"></i>
                {{ formSaving ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Image View Modal (view-only) -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="imageModal.open" v-modal-stack="() => (imageModal.open = false)" class="modal-overlay" @click.self.prevent>
          <div class="modal-box modal-confirm">
            <div class="modal-header">
              <div class="modal-header-icon"><i class="mdi mdi-image-outline"></i></div>
              <div>
                <p class="modal-title">Gambar Part</p>
                <p class="modal-subtitle font-mono">{{ imageModal.row?.part_number_mix }}</p>
              </div>
              <button class="modal-close" @click="imageModal.open = false"><i class="mdi mdi-close"></i></button>
            </div>
            <div class="modal-body">
              <div v-if="imageModal.row?.image" class="img-preview-wrap">
                <img :src="masterService.getImageUrl(imageModal.row.image) ?? undefined" alt="gambar part" class="img-preview" />
                <p class="img-path">{{ imageModal.row.image }}</p>
              </div>
              <div v-else class="img-empty">
                <i class="mdi mdi-image-off-outline"></i>
                <span>Belum ada gambar untuk part ini</span>
                <p class="img-hint">Upload gambar melalui form Edit Part</p>
              </div>
            </div>
            <div class="modal-footer">
              <button class="md-btn md-btn-ghost" @click="imageModal.open = false">Tutup</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Spec Modal — spesifikasi part (klik 2x row tabel / node tree) -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="specModal.open" v-modal-stack="() => (specModal.open = false)" class="modal-overlay" @click.self.prevent>
          <div class="modal-box spec-modal-box" @click.stop>
            <!-- Header biru MAJ — pola sama persis dgn modal lain (Mother by SAP,
                 Reconcile, dst), biar konsisten, bukan skema warna sendiri. -->
            <div class="modal-header">
              <div class="modal-header-icon"><i class="mdi mdi-card-text-outline"></i></div>
              <div style="flex: 1; min-width: 0">
                <p class="modal-title">{{ specModal.row?.alias || specModal.row?.part_name || specModal.row?.part_number }}</p>
                <p class="modal-subtitle font-mono">{{ specModal.row?.part_number }}</p>
              </div>
              <button v-if="specModal.row" class="modal-header-action" title="Info cepat: order, plan vs actual, stok, BOM" @click="insightPart = specModal.row.part_number">
                <i class="mdi mdi-lightbulb-on-outline"></i> Info Cepat
              </button>
              <button class="modal-close" @click="specModal.open = false"><i class="mdi mdi-close"></i></button>
            </div>

            <div class="spec-modal-grid" :style="{ '--spec-media-w': specMediaW + 'px' }">
              <!-- Splitter: geser utk atur lebar kolom foto vs tab (disimpan per browser).
                   Dbl-klik = reset; panah kiri/kanan saat fokus = ±20px. -->
              <div
                class="spec-splitter"
                :class="{ 'spec-splitter--drag': specSplitDrag }"
                role="separator"
                aria-orientation="vertical"
                :aria-valuenow="specMediaW"
                tabindex="0"
                title="Geser untuk atur lebar gambar (dbl-klik = reset)"
                @pointerdown="startSpecSplit"
                @dblclick="setSpecMediaW(SPEC_MEDIA_W_DEFAULT)"
                @keydown.left.prevent="setSpecMediaW(specMediaW - 20)"
                @keydown.right.prevent="setSpecMediaW(specMediaW + 20)"
              ></div>
              <!-- Kolom kiri: foto part + foto pallet — identitas visual, gambar
                   part diprioritaskan (flex:1, ngisi ruang), pallet nempel di
                   bawahnya kalau ada (bukan thumbnail kecil kayak sebelumnya).
                   SENGAJA polos tanpa tab di atasnya — foto full dari header
                   sampai bawah, tab cuma milik kolom kanan. -->
              <div class="spec-media">
                <!-- Kubus foto "3D": 6 wajah = foto 6 sisi (view_side di galeri).
                     Drag = putar bebas (X/Y), tombol = lompat ke sisi, dbl-klik =
                     lightbox sisi yg menghadap. Kalau belum ada foto sisi sama
                     sekali → fallback foto cover statis seperti sebelumnya. -->
                <!-- Model 3D asli (TripoSR) bila sudah jadi; toggle ke foto 6 sisi / cover. -->
                <div v-if="specModel3d.part?.file_path && specMediaMode === '3d'" class="spec-media-img-wrap spec-model-wrap">
                  <PartModel3D :src="masterService.modelUrl(specModel3d.part)" :alt="'model 3D ' + (specModal.row?.part_number ?? '')" @unavailable="specMediaMode = 'photo'" />
                  <span class="type-badge spec-media-typebadge" :class="specModal.row?.is_wip ? 'type-wip' : 'type-fp'">
                    {{ specModal.row?.is_wip ? 'WIP' : 'FP' }}
                  </span>
                  <span class="spec-cube-facing"><i class="mdi mdi-cube-scan"></i> 3D</span>
                </div>
                <div v-else-if="specCubeHasAny" class="spec-media-img-wrap spec-cube-wrap">
                  <div
                    class="spec-cube-scene"
                    :class="{ 'spec-cube-scene--drag': specCube.dragging }"
                    @pointerdown="cubePointerDown"
                    @pointermove="cubePointerMove"
                    @pointerup="cubePointerUp"
                    @pointercancel="cubePointerUp"
                    @dblclick="cubeOpenFacing"
                  >
                    <div class="spec-cube" :style="specCubeStyle">
                      <div v-for="s in CUBE_SIDES" v-show="specCubeFaces[s.key]" :key="s.key" class="spec-cube-face" :class="['spec-cube-face--' + s.key, { 'spec-cube-face--nobg': !!specCubeFaces[s.key]?.file_path_original }]" :style="{ opacity: cubeFaceOpacity[s.key] }">
                        <img v-if="specCubeFaces[s.key]" :src="specCubeFaces[s.key]!.url ?? masterService.getImageUrl(specCubeFaces[s.key]!.file_path) ?? undefined" :alt="'sisi ' + s.label" draggable="false" />
                        <div v-else class="spec-cube-face-empty"><i class="mdi mdi-image-off-outline"></i><span>{{ s.label }}</span><small>belum ada foto</small></div>
                      </div>
                    </div>
                  </div>
                  <span class="spec-float-shadow" aria-hidden="true"></span>
                  <span class="type-badge spec-media-typebadge" :class="specModal.row?.is_wip ? 'type-wip' : 'type-fp'">
                    {{ specModal.row?.is_wip ? 'WIP' : 'FP' }}
                  </span>
                  <span class="spec-cube-facing"><i class="mdi mdi-rotate-3d"></i> {{ CUBE_SIDES.find(s => s.key === specCubeFacing)?.label }}</span>
                  <div class="spec-cube-ctrl">
                    <button v-for="s in CUBE_SIDES" :key="s.key" type="button" class="spec-cube-btn" :class="{ 'spec-cube-btn--active': specCubeFacing === s.key, 'spec-cube-btn--empty': !specCubeFaces[s.key] }" :title="s.label" @click="cubeSnap(s.key)">
                      <i class="mdi" :class="s.icon"></i>
                    </button>
                    <button type="button" class="spec-cube-btn" title="Putar otomatis" :class="{ 'spec-cube-btn--active': specCube.auto }" @click="specCube.auto = !specCube.auto"><i class="mdi mdi-rotate-360"></i></button>
                  </div>
                </div>
                <div v-else class="spec-media-img-wrap">
                  <img v-if="specModal.row?.image" :src="masterService.getImageUrl(specModal.row.image) ?? undefined" alt="gambar part" class="spec-media-img" loading="lazy" />
                  <div v-else class="spec-media-empty"><i class="mdi mdi-image-off-outline"></i><span>Belum ada gambar</span></div>
                  <span class="type-badge spec-media-typebadge" :class="specModal.row?.is_wip ? 'type-wip' : 'type-fp'">
                    {{ specModal.row?.is_wip ? 'WIP' : 'FP' }}
                  </span>
                  <span class="spec-cube-hint" title="Upload foto Depan/Belakang/Kiri/Kanan/Atas/Bawah di Edit → Media Part → Foto 6 Sisi"><i class="mdi mdi-rotate-3d"></i> 3D: belum ada foto sisi</span>
                </div>
                <!-- Bar model 3D part: toggle 3D/Foto + generate / status antrean. -->
                <div class="spec-3d-bar">
                  <div v-if="specModel3d.part?.file_path" class="spec-3d-toggle">
                    <button type="button" :class="{ active: specMediaMode === '3d' }" @click="specMediaMode = '3d'"><i class="mdi mdi-cube-outline"></i> 3D</button>
                    <button type="button" :class="{ active: specMediaMode === 'photo' }" @click="specMediaMode = 'photo'"><i class="mdi mdi-image-outline"></i> Foto</button>
                  </div>
                  <span v-if="specModel3d.part && !specModel3d.part.file_path" class="spec-3d-pending"><i class="mdi mdi-loading mdi-spin"></i> Model 3D sedang dibuat…</span>
                  <button v-else type="button" class="spec-3d-gen" :disabled="specModel3dBusy === 'part'" :title="specModel3d.part ? 'Buat ulang model 3D dari foto terbaru' : 'Buat model 3D dari foto sisi Depan / cover'" @click="requestSpecModel('part')">
                    <i class="mdi" :class="specModel3dBusy === 'part' ? 'mdi-loading mdi-spin' : 'mdi-cube-scan'"></i> {{ specModel3d.part ? 'Buat ulang 3D' : 'Generate 3D' }}
                  </button>
                </div>
                <p v-if="specModel3dMsg" class="spec-3d-msg">{{ specModel3dMsg }}</p>
                <!-- Pallet SELALU tampil: standar data = part + pallet ada fotonya. Kosong →
                     ajakan melengkapi (langsung buka Edit) supaya semua user melihat info utuh. -->
                <div class="spec-media-pallet-wrap">
                  <span class="spec-media-pallet-label"><i class="mdi mdi-pallet"></i> Pallet</span>
                  <div class="spec-media-pallet-box">
                    <!-- Tipe pallet sbg pita di pojok kotak -->
                    <span v-if="specModal.row?.pallet_type" class="spec-pallet-ribbon" :title="'Tipe pallet: ' + specModal.row.pallet_type">{{ specModal.row.pallet_type }}</span>
                    <div v-if="specModel3d.pallet?.file_path && palletMediaMode === '3d'" class="spec-media-pallet-3d">
                      <PartModel3D compact :src="masterService.modelUrl(specModel3d.pallet)" alt="model 3D pallet" @unavailable="palletMediaMode = 'photo'" />
                    </div>
                    <img v-else-if="palletPhotoSrc" :src="palletPhotoSrc" alt="foto pallet" class="spec-media-pallet-img" loading="lazy" />
                  </div>
                  <!-- Pilih foto pallet: cover + 6 sisi yg sudah difoto (mode Foto) -->
                  <div v-if="(!specModel3d.pallet?.file_path || palletMediaMode === 'photo') && palletPhotoOptions.length > 1" class="spec-pallet-sides">
                    <button v-for="o in palletPhotoOptions" :key="o.key" type="button" :class="{ active: palletPhotoKey === o.key }" @click="palletPhotoKey = o.key">{{ o.label }}</button>
                  </div>
                  <div v-if="!palletPhotoSrc && !specModel3d.pallet?.file_path" class="spec-media-pallet-empty">
                    <i class="mdi mdi-image-plus-outline"></i>
                    <span>Belum ada foto pallet</span>
                  </div>
                  <div v-if="specModel3d.pallet?.file_path" class="spec-3d-toggle spec-3d-toggle--pallet">
                    <button type="button" :class="{ active: palletMediaMode === '3d' }" @click="palletMediaMode = '3d'"><i class="mdi mdi-cube-outline"></i> 3D</button>
                    <button type="button" :class="{ active: palletMediaMode === 'photo' }" @click="palletMediaMode = 'photo'"><i class="mdi mdi-image-outline"></i> Foto</button>
                  </div>
                  <template v-if="specModal.row?.pallet_image || specGalleryPallet.length">
                    <span v-if="specModel3d.pallet && !specModel3d.pallet.file_path" class="spec-3d-pending"><i class="mdi mdi-loading mdi-spin"></i> Model 3D pallet sedang dibuat…</span>
                    <button v-else type="button" class="spec-3d-gen spec-3d-gen--pallet" :disabled="specModel3dBusy === 'pallet'" @click="requestSpecModel('pallet')">
                      <i class="mdi" :class="specModel3dBusy === 'pallet' ? 'mdi-loading mdi-spin' : 'mdi-cube-scan'"></i> {{ specModel3d.pallet ? 'Buat ulang 3D pallet' : 'Generate 3D pallet' }}
                    </button>
                  </template>
                </div>
                <div v-if="specMediaMissing.length" class="spec-media-todo">
                  <p><i class="mdi mdi-alert-circle-outline"></i> Data belum lengkap: {{ specMediaMissing.join(', ') }}</p>
                  <button type="button" class="spec-media-todo-btn" @click="specModal.open = false; openEditModal(specModal.row as MsWelding)">
                    <i class="mdi mdi-upload"></i> Lengkapi sekarang
                  </button>
                </div>
              </div>

              <!-- Kolom kanan: spesifikasi lengkap — tab bar MILIK kolom ini saja
                   (bukan full width di atas foto), info ringkas selalu ada;
                   Hierarki/BOM/Galeri di-lazy-load saat tab-nya dibuka pertama
                   kali (lihat watch specModal.activeTab). -->
              <div class="spec-content">
                <div class="tree-tabs spec-modal-tabs">
                  <button class="tree-tab" :class="{ 'tree-tab--active': specModal.activeTab === 'info' }" @click="specModal.activeTab = 'info'">
                    <i class="mdi mdi-information-outline"></i> Info
                  </button>
                  <button class="tree-tab" :class="{ 'tree-tab--active': specModal.activeTab === 'children' }" @click="specModal.activeTab = 'children'">
                    <i class="mdi mdi-file-tree-outline"></i> Children
                  </button>
                  <button v-if="specModal.row?.is_wip" class="tree-tab" :class="{ 'tree-tab--active': specModal.activeTab === 'mother' }" @click="specModal.activeTab = 'mother'">
                    <i class="mdi mdi-source-branch"></i> Mother
                  </button>
                  <button class="tree-tab" :class="{ 'tree-tab--active': specModal.activeTab === 'bom' }" @click="specModal.activeTab = 'bom'">
                    <i class="mdi mdi-package-variant"></i> BOM SAP
                  </button>
                  <button class="tree-tab" :class="{ 'tree-tab--active': specModal.activeTab === 'order' }" @click="specModal.activeTab = 'order'">
                    <i class="mdi mdi-truck-delivery-outline"></i> Order &amp; Produksi
                  </button>
                  <button class="tree-tab" :class="{ 'tree-tab--active': specModal.activeTab === 'glc' }" @click="specModal.activeTab = 'glc'">
                    <i class="mdi mdi-chart-gantt"></i> GLC
                  </button>
                  <button class="tree-tab" :class="{ 'tree-tab--active': specModal.activeTab === 'dies' }" @click="specModal.activeTab = 'dies'">
                    <i class="mdi mdi-qrcode"></i> Dies
                  </button>
                </div>
                <div class="spec-modal-body">
                  <!-- TAB: Info (Produksi & Kuantitas + Model & Customer) -->
                  <template v-if="specModal.activeTab === 'info'">
                  <!-- Identitas — nomor & penamaan part, termasuk nomor delivery/varian -->
                  <div class="spec-section">
                    <p class="spec-section-title"><i class="mdi mdi-identifier"></i> Identitas</p>
                    <div class="spec-grid">
                      <div class="spec-cell">
                        <span class="spec-label">Part Number</span>
                        <span class="spec-val font-mono">{{ specModal.row?.part_number || '—' }}</span>
                      </div>
                      <div class="spec-cell">
                        <span class="spec-label">Nama Part</span>
                        <span class="spec-val">{{ specModal.row?.part_name || '—' }}</span>
                      </div>
                      <div class="spec-cell" v-if="specModal.row?.alias">
                        <span class="spec-label">Alias</span>
                        <span class="spec-val">{{ specModal.row.alias }}</span>
                      </div>
                      <div class="spec-cell">
                        <span class="spec-label">Job Number</span>
                        <span class="spec-val font-mono">{{ specModal.row?.job_number || '—' }}</span>
                      </div>
                      <div class="spec-cell" v-if="specModal.row?.part_number_delivery && specModal.row?.part_number_delivery !== specModal.row?.part_number">
                        <span class="spec-label">Part Number Delivery</span>
                        <span class="spec-val font-mono">{{ specModal.row.part_number_delivery }}</span>
                      </div>
                      <div class="spec-cell" v-if="specModal.row?.job_number_delivery && specModal.row?.job_number_delivery !== specModal.row?.job_number">
                        <span class="spec-label">Job Number Delivery</span>
                        <span class="spec-val font-mono">{{ specModal.row.job_number_delivery }}</span>
                      </div>
                      <!-- Varian delivery: nomor lain utk barang fisik yg SAMA (beda customer/order) -->
                      <div class="spec-cell spec-cell--wide" v-if="specVariants.length > 1">
                        <span class="spec-label">Varian Delivery ({{ specVariants.length }} nomor)</span>
                        <span class="spec-val spec-variants">
                          <span v-for="v in specVariants" :key="v.id" class="spec-variant-chip" :class="{ 'spec-variant-chip--default': v.is_default, 'spec-variant-chip--off': !v.is_active }"
                                :title="[v.customer, v.job_number_delivery, v.qty_kbn ? 'Qty ' + v.qty_kbn : ''].filter(Boolean).join(' · ')">
                            <span class="font-mono">{{ v.part_number_delivery }}</span>
                            <small v-if="v.customer">{{ v.customer }}</small>
                          </span>
                        </span>
                      </div>
                      <div class="spec-cell spec-cell--wide" v-if="(specModal.row as MsWelding)?.merged_into">
                        <span class="spec-label">Varian dari</span>
                        <span class="spec-val font-mono">{{ (specModal.row as MsWelding).merged_into }}
                          <span class="spec-hint">nomor ini sudah dilebur — data produksi ikut part fisik tsb</span>
                        </span>
                      </div>
                      <div class="spec-cell">
                        <span class="spec-label">Kategori / Layer</span>
                        <span class="spec-val">{{ specModal.row?.category || '—' }}<template v-if="specModal.row?.layer"> · {{ specModal.row.layer }}</template></span>
                      </div>
                      <div class="spec-cell">
                        <span class="spec-label">Area</span>
                        <span class="spec-val">{{ specModal.row?.area || '—' }}<template v-if="specModal.row?.op"> · OP{{ specModal.row.op }}</template></span>
                      </div>
                    </div>
                  </div>

                  <!-- Produksi — di mana & secepat apa part ini dibuat -->
                  <div class="spec-section">
                    <p class="spec-section-title"><i class="mdi mdi-cog-outline"></i> Produksi</p>
                    <div class="spec-grid">
                      <div class="spec-cell" v-if="specModal.row?.machine">
                        <span class="spec-label">Mesin</span>
                        <span class="spec-val">{{ specModal.row.machine }}</span>
                      </div>
                      <div class="spec-cell" v-if="specModal.row?.line_press">
                        <span class="spec-label">Line</span>
                        <span class="spec-val">{{ specModal.row.line_press }}</span>
                        <span class="spec-hint">{{ procCount(specModal.row as MsWelding) }} proses</span>
                      </div>
                      <div class="spec-cell" v-if="specModal.row?.vendor">
                        <span class="spec-label">Vendor</span>
                        <span class="spec-val">{{ [specModal.row?.vendor, specModal.row?.vendor_2, specModal.row?.vendor_3].filter(Boolean).join(', ') }}</span>
                      </div>
                      <div class="spec-cell" v-if="specModal.row?.jig">
                        <span class="spec-label">Jig</span>
                        <span class="spec-val">{{ specModal.row.jig }}</span>
                      </div>
                      <div class="spec-cell" v-if="specModal.row?.uph != null">
                        <span class="spec-label">UPH</span>
                        <span class="spec-val">{{ specModal.row.uph }}</span>
                        <span v-if="specModal.row?.cycle_time_sec != null" class="spec-hint">cycle {{ specModal.row.cycle_time_sec }} dtk</span>
                      </div>
                      <div class="spec-cell" v-if="specModal.row?.stroke_mili_spot != null">
                        <span class="spec-label">Stroke / Mili Spot</span>
                        <span class="spec-val">{{ specModal.row.stroke_mili_spot }}</span>
                      </div>
                      <div class="spec-cell" v-if="(specModal.row as MsWeldingTreeNode)?.next_process">
                        <span class="spec-label">Proses Berikutnya</span>
                        <span class="spec-val">{{ (specModal.row as MsWeldingTreeNode).next_process }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Kuantitas — angka yang dipakai planning & kanban -->
                  <div class="spec-section">
                    <p class="spec-section-title"><i class="mdi mdi-counter"></i> Kuantitas</p>
                    <div class="spec-grid">
                      <div class="spec-cell" v-if="specModal.row?.category === 'MATERIAL' || specModal.row?.category === 'SCRAP'">
                        <span class="spec-label">Rasio Konsumsi</span>
                        <span class="spec-val spec-val--big">{{ specModal.row?.scrap_ratio ?? '—' }}<template v-if="specModal.row?.scrap_ratio != null && specModal.row?.uom"> {{ specModal.row.uom }}</template></span>
                        <span class="spec-hint">per 1 unit mother (dari BOM SAP)</span>
                      </div>
                      <!-- Qty/Kbn dipakai utk SEMUA (bukan Qty Unit) — Qty Unit itu angka PER-RELASI
                           mother (bisa beda2 tiap mother), jadi tak ada satu nilai "benar" di sini.
                           Qty/Kbn aman krn backend auto-hitung FPB dari qty_kbn SEMUA mother
                           (lihat recompute_qty_kbn_from_mothers). -->
                      <div class="spec-cell" v-else>
                        <span class="spec-label">Qty / Kanban</span>
                        <span v-if="specModal.row?.is_common" class="spec-val spec-val--big">
                          FP {{ specModal.row?.qty_kbn ?? '—' }} · WIP {{ specModal.row?.qty_kbn_wip ?? specModal.row?.qty_kbn ?? '—' }}<template v-if="specModal.row?.uom"> {{ specModal.row.uom }}</template>
                        </span>
                        <span v-else class="spec-val spec-val--big">{{ specModal.row?.qty_kbn ?? '—' }}<template v-if="specModal.row?.uom"> {{ specModal.row.uom }}</template></span>
                        <span v-if="specModal.row?.is_wip && (specModal.row?.mother_count ?? 0) > 1" class="spec-hint">FPB dari {{ specModal.row?.mother_count }} mother</span>
                      </div>
                      <div class="spec-cell" v-if="specModal.row?.lot_cycle != null">
                        <span class="spec-label">Lot Cycle</span>
                        <span class="spec-val">{{ specModal.row.lot_cycle }}</span>
                      </div>
                      <div class="spec-cell" v-if="specModal.row?.stock != null">
                        <span class="spec-label">Stok</span>
                        <span class="spec-val">{{ specModal.row.stock }}</span>
                      </div>
                      <div class="spec-cell" v-if="(specModal.row?.mother_count ?? 0) || (specModal.row as MsWeldingTreeNode)?.children?.length">
                        <span class="spec-label">Hierarki</span>
                        <span class="spec-val">{{ specModal.row?.mother_count ?? 0 }} mother<template v-if="(specModal.row as MsWeldingTreeNode)?.children?.length"> · {{ (specModal.row as MsWeldingTreeNode).children!.length }} child</template></span>
                        <button type="button" class="spec-link" @click="specModal.activeTab = specModal.row?.is_wip && specModal.row?.mother_count ? 'mother' : 'children'">lihat hierarki</button>
                      </div>
                    </div>
                  </div>

                  <!-- Model & Customer -->
                  <div class="spec-section" v-if="specModal.row?.model || specModal.row?.car_name || [specModal.row?.customer_1, specModal.row?.customer_2, specModal.row?.customer_3].filter(Boolean).length">
                    <p class="spec-section-title"><i class="mdi mdi-car-outline"></i> Model &amp; Customer</p>
                    <div class="spec-grid">
                      <div class="spec-cell" v-if="specModal.row?.model">
                        <span class="spec-label">Model</span>
                        <span class="spec-val">{{ specModal.row.model }}</span>
                      </div>
                      <div class="spec-cell" v-if="specModal.row?.car_name">
                        <span class="spec-label">Nama Mobil</span>
                        <span class="spec-val">{{ specModal.row.car_name }}</span>
                      </div>
                      <div class="spec-cell spec-cell--wide" v-if="[specModal.row?.customer_1, specModal.row?.customer_2, specModal.row?.customer_3].filter(Boolean).length">
                        <span class="spec-label">Customer</span>
                        <span class="spec-val">{{ [specModal.row?.customer_1, specModal.row?.customer_2, specModal.row?.customer_3].filter(Boolean).join(', ') }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Status & jejak perubahan -->
                  <div class="spec-section">
                    <p class="spec-section-title"><i class="mdi mdi-history"></i> Status</p>
                    <div class="spec-grid">
                      <div class="spec-cell">
                        <span class="spec-label">Status Part</span>
                        <span class="spec-val">
                          <span class="type-badge" :class="specModal.row?.is_wip ? 'type-wip' : 'type-fp'">{{ specModal.row?.is_wip ? 'WIP' : 'FP' }}</span>
                          <span v-if="(specModal.row as MsWelding)?.merged_into_id" class="spec-status spec-status--variant">varian</span>
                          <span v-else-if="specModal.row?.is_runout" class="spec-status spec-status--off">runout{{ specModal.row?.runout_date ? ' ' + String(specModal.row.runout_date).slice(0, 10) : '' }}</span>
                          <span v-else class="spec-status spec-status--on">aktif</span>
                        </span>
                      </div>
                      <div class="spec-cell" v-if="specModal.row?.updated_at">
                        <span class="spec-label">Diperbarui</span>
                        <span class="spec-val">{{ String(specModal.row.updated_at).slice(0, 16).replace('T', ' ') }}</span>
                        <span v-if="specModal.row?.last_user_updated" class="spec-hint">oleh {{ specModal.row.last_user_updated }}</span>
                      </div>
                      <div class="spec-cell" v-if="specModal.row?.created_at">
                        <span class="spec-label">Dibuat</span>
                        <span class="spec-val">{{ String(specModal.row.created_at).slice(0, 16).replace('T', ' ') }}</span>
                        <span v-if="specModal.row?.created_by" class="spec-hint">oleh {{ specModal.row.created_by }}</span>
                      </div>
                    </div>
                  </div>
                  </template>

                  <!-- TAB: Children / Mother — read-only (tanpa aksi Children/Mother
                       by SAP — itu ada di editor penuh). Mother khusus WIP. -->
                  <div v-show="specModal.activeTab === 'children' || specModal.activeTab === 'mother'" class="spec-tab-tree tab-panel">
                    <div v-if="specTreeLoading" class="tree-loading"><i class="mdi mdi-loading mdi-spin"></i> Memuat hierarki...</div>
                    <template v-else-if="specTreeData">
                      <template v-if="specModal.activeTab === 'mother'">
                        <template v-if="specTreeData.parents.length">
                          <div class="tree-section-label tree-section-label--ancestor">
                            <i class="mdi mdi-source-branch-plus"></i>
                            Rantai Induk
                            <span v-if="specTreeData.parents.length > 1" class="tree-multi-badge">{{ specTreeData.parents.length }} cabang</span>
                            <span class="tree-section-hint">akar di atas → induk langsung di bawah → part ini</span>
                          </div>
                          <ParentChainPicker
                            :parents="specTreeData.parents"
                            :show-entry-qty="true"
                            :entry-qty-unit="specTreeData.node.qty_unit"
                            :entry-uom="specTreeData.node.uom"
                          />
                          <div class="tree-chain-to-entry">
                            <span class="tree-chain-vline"></span>
                            <span class="tree-chain-down-label"><i class="mdi mdi-chevron-down"></i> {{ specTreeData.node.part_number }}</span>
                          </div>
                        </template>
                        <div v-else class="tree-standalone">
                          <i class="mdi mdi-information-outline"></i> WIP ini belum punya mother di database.
                        </div>
                      </template>
                      <template v-else>
                        <div class="tree-legend">
                          <span class="type-badge type-fp">FP</span> Finished Part &nbsp;·&nbsp;
                          <span class="type-badge type-wip">WIP</span> Work In Progress
                        </div>
                        <TreeNode
                          :node="specTreeData.node"
                          :depth="0"
                          :is-entry="true"
                          :show-connector="false"
                        />
                        <div v-if="!specTreeData.node.children?.length" class="tree-standalone">
                          <i class="mdi mdi-information-outline"></i> Part ini belum punya komponen (children) di database.
                        </div>
                      </template>
                      <button type="button" class="spec-tab-editor-link" @click="openFullTreeFromSpec">
                        <i class="mdi mdi-open-in-new"></i> Buka Editor Hierarki &amp; BOM Lengkap
                      </button>
                    </template>
                    <div v-else class="tree-loading">Tidak ada data.</div>
                  </div>

                  <!-- TAB: BOM SAP — 1-step transactional, read-only (Sync ada di editor penuh). -->
                  <!-- Order & Produksi / GLC: v-if = baru memuat saat tab dibuka (hemat request). -->
                  <PartSpecOrderTab v-if="specModal.activeTab === 'order' && specModal.row" class="tab-panel" :part-number="specModal.row.part_number" />
                  <PartSpecGlcTab v-if="specModal.activeTab === 'glc' && specModal.row" class="tab-panel" :part-number="specModal.row.part_number" />
                  <PartDiesTab v-if="specModal.activeTab === 'dies' && specModal.row" class="tab-panel" :part-number="specModal.row.part_number" />
                  <div v-show="specModal.activeTab === 'bom'" class="spec-tab-bom bom-body tab-panel">
                    <div v-if="specBomLoading" class="tree-loading"><i class="mdi mdi-loading mdi-spin"></i> Memuat data BOM...</div>
                    <template v-else>
                      <div v-if="specBomData.length === 0" class="bom-empty">
                        <i class="mdi mdi-package-variant-closed bom-empty-icon"></i>
                        <p>Belum ada data BOM tersimpan</p>
                        <button type="button" class="spec-tab-editor-link" @click="openFullTreeFromSpec">
                          <i class="mdi mdi-open-in-new"></i> Buka Editor Hierarki &amp; BOM utk Sync dari SAP
                        </button>
                      </div>
                      <div v-else class="bom-table-wrap">
                        <div class="bom-meta">
                          <span><i class="mdi mdi-database-check"></i> {{ specBomData.length }} direct child</span>
                          <span class="bom-meta-sync" v-if="specBomData[0]?.synced_at">{{ specBomData[0].synced_at }}</span>
                        </div>
                        <table class="bom-table">
                          <thead>
                            <tr>
                              <th>PART NUMBER</th>
                              <th>NAMA PART</th>
                              <th class="bom-col-center">TYPE</th>
                              <th class="bom-col-center">MASTER</th>
                              <th class="bom-col-right">QTY UNIT</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="item in specBomData" :key="item.child_matnr">
                              <td class="bom-matnr font-mono">{{ item.child_matnr }}</td>
                              <td class="bom-name">{{ item.child_name ?? '—' }}</td>
                              <td class="bom-col-center">
                                <span class="bom-mtart-badge" :class="`bom-mtart--${item.mtart?.toLowerCase() ?? 'unknown'}`">
                                  {{ item.mtart ?? '?' }}
                                </span>
                              </td>
                              <td class="bom-col-center">
                                <span
                                  v-if="specMasterSet.has(_normPart(item.child_matnr))"
                                  class="bom-master-badge bom-master--yes"
                                  title="Ada di master data"
                                ><i class="mdi mdi-check-circle"></i></span>
                                <span v-else class="bom-master-badge bom-master--no" title="Tidak ada di master data">
                                  <i class="mdi mdi-close-circle"></i>
                                </span>
                              </td>
                              <td class="bom-col-right bom-qty">{{ item.bom_qty?.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 }) ?? '—' }} {{ item.meins }}</td>
                            </tr>
                          </tbody>
                        </table>
                        <div class="bom-footer">
                          <span class="bom-footer-note">
                            <i class="mdi mdi-information-outline"></i> {{ _lgortLabel(specBomData[0]?.lgort) }}
                          </span>
                        </div>
                      </div>
                    </template>
                  </div>

                </div>

              </div>
            </div>

            <div class="modal-footer">
              <button class="md-btn md-btn-ghost" @click="specModal.open = false">Tutup</button>
              <button v-if="specModal.row" class="md-btn md-btn-primary" @click="specModal.open = false; openEditModal(specModal.row as MsWelding)">
                <i class="mdi mdi-pencil-outline"></i> Edit Part
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Lightbox galeri — overlay simpel, gambar besar / video dgn controls -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="mediaLightbox && specModal.open" v-modal-stack="() => (mediaLightbox = null)" class="media-lightbox-overlay" @click.self.prevent>
          <button class="media-lightbox-close" @click="mediaLightbox = null"><i class="mdi mdi-close"></i></button>
          <video v-if="mediaLightbox.media_type === 'video'" :src="mediaLightbox.url ?? masterService.getImageUrl(mediaLightbox.file_path) ?? undefined" class="media-lightbox-content" controls autoplay />
          <img v-else :src="mediaLightbox.url ?? masterService.getImageUrl(mediaLightbox.file_path) ?? undefined" :alt="mediaLightbox.file_path" class="media-lightbox-content" />
        </div>
      </Transition>
    </Teleport>

    <!-- Detail Modal — tablet & mobile row click -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="detailModal.open" v-modal-stack="() => (detailModal.open = false)" class="modal-overlay" @click.self.prevent>
          <div class="modal-box modal-detail">
            <div class="modal-header">
              <div class="modal-header-icon"><i class="mdi mdi-card-account-details-outline"></i></div>
              <div style="min-width: 0; flex: 1">
                <p class="modal-title">{{ detailModal.row?.alias || detailModal.row?.part_number }}</p>
                <p class="modal-subtitle font-mono">{{ detailModal.row?.job_number || detailModal.row?.part_number_mix }}</p>
              </div>
              <button class="modal-close" @click="detailModal.open = false"><i class="mdi mdi-close"></i></button>
            </div>
            <div class="detail-modal-body">
              <!-- Kiri: tab Hierarki + BOM SAP -->
              <div class="detail-panel-left">

                <!-- Mini tab bar -->
                <div class="tree-tabs detail-tabs">
                  <button
                    class="tree-tab"
                    :class="{ 'tree-tab--active': detailModal.activeLeftTab === 'children' }"
                    @click="detailModal.activeLeftTab = 'children'"
                  >
                    <i class="mdi mdi-file-tree-outline"></i>
                    Children
                  </button>
                  <button
                    v-if="detailModal.row?.is_wip"
                    class="tree-tab"
                    :class="{ 'tree-tab--active': detailModal.activeLeftTab === 'mother' }"
                    @click="detailModal.activeLeftTab = 'mother'"
                  >
                    <i class="mdi mdi-source-branch"></i>
                    Mother
                  </button>
                  <button
                    class="tree-tab"
                    :class="{ 'tree-tab--active': detailModal.activeLeftTab === 'bom' }"
                    @click="detailModal.activeLeftTab = 'bom'"
                  >
                    <i class="mdi mdi-package-variant"></i>
                    BOM SAP
                    <span class="tree-tab-hint">1-step</span>
                  </button>
                  <button
                    class="tree-tab"
                    :class="{ 'tree-tab--active': detailModal.activeLeftTab === 'dies' }"
                    @click="detailModal.activeLeftTab = 'dies'"
                  >
                    <i class="mdi mdi-qrcode"></i>
                    Dies
                  </button>
                </div>

                <!-- Tab Children / Mother (Mother khusus WIP). Tombol SAP dipakai
                     bareng treeModal lewat activeEntryTree (treeData ATAU detailTreeData). -->
                <div v-show="detailModal.activeLeftTab === 'children' || detailModal.activeLeftTab === 'mother'" class="detail-tab-content">
                  <div v-if="detailTreeLoading" class="tree-loading"><i class="mdi mdi-loading mdi-spin"></i> Memuat...</div>
                  <div v-else-if="detailTreeData && detailModal.activeLeftTab === 'mother'" class="detail-tree-inner">
                    <div class="tree-legend-btngroup detail-sap-btngroup">
                      <button v-if="can.update" class="reconcile-btn" title="Cari assembly yang memakai part ini di SAP (where-used)" @click="openMotherBySap()">
                        <i class="mdi mdi-progress-wrench"></i> Mother by SAP
                      </button>
                    </div>
                    <template v-if="detailTreeData.parents.length">
                      <div class="tree-section-label tree-section-label--ancestor">
                        <i class="mdi mdi-source-branch-plus"></i>
                        Rantai Induk
                        <span v-if="detailTreeData.parents.length > 1" class="tree-multi-badge">{{ detailTreeData.parents.length }} cabang</span>
                        <span class="tree-section-hint">akar di atas → induk langsung di bawah → part ini</span>
                      </div>
                      <ParentChainPicker
                        :parents="detailTreeData.parents"
                        :show-entry-qty="true"
                        :entry-qty-unit="detailTreeData.node.qty_unit"
                        :entry-uom="detailTreeData.node.uom"
                      />
                      <div class="tree-chain-to-entry">
                        <span class="tree-chain-vline"></span>
                        <span class="tree-chain-down-label"><i class="mdi mdi-chevron-down"></i> {{ detailTreeData.node.part_number }}</span>
                      </div>
                    </template>
                    <div v-else class="tree-standalone">
                      <i class="mdi mdi-information-outline"></i> WIP ini belum punya mother — cari lewat Mother by SAP.
                    </div>
                  </div>
                  <div v-else-if="detailTreeData" class="detail-tree-inner">
                    <div class="tree-legend">
                      <span class="type-badge type-fp">FP</span> Finished Part &nbsp;·&nbsp;
                      <span class="type-badge type-wip">WIP</span> Work In Progress
                    </div>
                    <div class="tree-legend-btngroup detail-sap-btngroup">
                      <button class="reconcile-btn" @click="openReconcile()" title="Tambah/koreksi komponen ANAK dari BOM SAP">
                        <i class="mdi mdi-auto-fix"></i> Children by SAP
                      </button>
                    </div>
                    <TreeNode
                      :node="detailTreeData.node"
                      :depth="0"
                      :is-entry="true"
                      :show-connector="false"
                    />
                    <div v-if="!detailTreeData.node.children?.length" class="tree-standalone">
                      <i class="mdi mdi-information-outline"></i> Part ini belum punya komponen (children).
                    </div>
                  </div>
                  <div v-else class="tree-loading">Tidak ada data hierarki.</div>
                </div>

                <!-- Tab BOM SAP -->
                <div v-show="detailModal.activeLeftTab === 'bom'" class="detail-tab-content bom-body">
                  <div v-if="bomLoading" class="tree-loading">
                    <i class="mdi mdi-loading mdi-spin"></i> Memuat BOM...
                  </div>
                  <template v-else>
                    <Transition name="bom-badge-fade">
                      <div v-if="bomSyncResult" class="bom-sync-badge">
                        <i class="mdi mdi-check-circle"></i>
                        Sync selesai &mdash; <strong>{{ bomSyncResult.inserted }}</strong> baru,
                        <strong>{{ bomSyncResult.updated }}</strong> diperbarui
                        <span class="bom-sync-time">{{ bomSyncResult.synced_at }}</span>
                      </div>
                    </Transition>

                    <div v-if="bomData.length === 0" class="bom-empty">
                      <i class="mdi mdi-package-variant-closed bom-empty-icon"></i>
                      <p>Belum ada data BOM tersimpan</p>
                      <span>Klik <strong>Sync dari SAP</strong> di bawah</span>
                    </div>

                    <div v-else class="bom-table-wrap">
                      <div class="bom-meta">
                        <span><i class="mdi mdi-database-check"></i> {{ bomData.length }} direct child</span>
                        <span class="bom-meta-sync" v-if="bomData[0]?.synced_at">{{ bomData[0].synced_at }}</span>
                      </div>
                      <table class="bom-table">
                        <thead>
                          <tr>
                            <th>PART NUMBER</th>
                            <th>NAMA PART</th>
                            <th class="bom-col-center">TYPE</th>
                            <th class="bom-col-center">MASTER</th>
                            <th class="bom-col-right">QTY UNIT</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="item in bomData" :key="item.child_matnr">
                            <td class="bom-matnr font-mono">{{ item.child_matnr }}</td>
                            <td class="bom-name">{{ item.child_name ?? '—' }}</td>
                            <td class="bom-col-center">
                              <span class="bom-mtart-badge" :class="`bom-mtart--${item.mtart?.toLowerCase() ?? 'unknown'}`">
                                {{ item.mtart ?? '?' }}
                              </span>
                            </td>
                            <td class="bom-col-center">
                              <span
                                v-if="detailMasterSet.has(_normPart(item.child_matnr))"
                                class="bom-master-badge bom-master--yes"
                                title="Ada di master data"
                              ><i class="mdi mdi-check-circle"></i></span>
                              <span v-else class="bom-master-badge bom-master--no" title="Tidak ada di master data">
                                <i class="mdi mdi-close-circle"></i>
                              </span>
                            </td>
                            <td class="bom-col-right bom-qty">{{ item.bom_qty?.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 }) ?? '—' }} {{ item.meins }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div class="bom-footer">
                      <span class="bom-footer-note">
                        <i class="mdi mdi-information-outline"></i> {{ _lgortLabel(bomData[0]?.lgort) }}
                      </span>
                      <button class="bom-sync-btn" :disabled="bomSyncing" @click="doSyncBom">
                        <i class="mdi" :class="bomSyncing ? 'mdi-loading mdi-spin' : 'mdi-sync'"></i>
                        {{ bomSyncing ? 'Menyinkronkan...' : (bomData.length ? 'Sync Ulang' : 'Sync dari SAP') }}
                      </button>
                    </div>
                  </template>
                </div>

                <div v-if="detailModal.activeLeftTab === 'dies'" class="detail-tab-content">
                  <PartDiesTab :part-number="detailModal.row?.part_number" />
                </div>

              </div>

              <!-- Kanan: gambar + info + aksi -->
              <div class="detail-panel-right">
                <!-- Gambar -->
                <div class="detail-image-wrap">
                  <img
                    v-if="detailModal.row?.image"
                    :src="masterService.getImageUrl(detailModal.row.image) ?? undefined"
                    alt="gambar part"
                    class="detail-image"
                  />
                  <div v-else class="detail-image-empty">
                    <i class="mdi mdi-image-off-outline"></i>
                    <span>Belum ada gambar</span>
                  </div>
                </div>
                <!-- Info ringkas -->
                <div class="detail-info">
                  <div class="detail-info-row">
                    <span class="detail-info-lbl">Part Number</span>
                    <span class="detail-info-val font-mono">{{ detailModal.row?.part_number }}</span>
                  </div>
                  <div class="detail-info-row" v-if="detailModal.row?.area">
                    <span class="detail-info-lbl">Area</span>
                    <span class="area-tag" :style="areaTagStyle(detailModal.row.area)">{{ detailModal.row.area }}</span>
                  </div>
                  <div class="detail-info-row">
                    <span class="detail-info-lbl">Tipe</span>
                    <span class="type-badge" :class="detailModal.row?.is_wip ? 'type-wip' : 'type-fp'">
                      {{ detailModal.row?.is_wip ? 'WIP' : 'FP' }}
                    </span>
                  </div>
                  <div class="detail-info-row" v-if="detailModal.row?.machine">
                    <span class="detail-info-lbl">Mesin</span>
                    <span class="detail-info-val font-mono">{{ detailModal.row.machine }}</span>
                  </div>
                </div>
                <!-- Aksi -->
                <div class="detail-action-btns">
                  <button class="md-btn md-btn-outline detail-btn-spec" @click="detailModal.row && openSpecModal(detailModal.row)">
                    <i class="mdi mdi-information-outline"></i> Spesifikasi Lengkap
                  </button>
                  <button class="md-btn md-btn-outline detail-btn-spec" @click="insightPart = detailModal.row?.part_number ?? null">
                    <i class="mdi mdi-lightbulb-on-outline"></i> Info Cepat &amp; Tanya AI
                  </button>
                  <button v-if="can.update" class="md-btn md-btn-outline detail-btn-edit" @click="openEditFromDetail">
                    <i class="mdi mdi-pencil-outline"></i> Edit Part
                  </button>
                  <button v-if="can.del" class="md-btn md-btn-danger detail-btn-del" @click="confirmDeleteFromDetail">
                    <i class="mdi mdi-delete-outline"></i> Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Modal — bisa tutup klik overlay -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="deleteModal.open" v-modal-stack="() => { if (!deleting) deleteModal.open = false; }" class="modal-overlay" @click.self.prevent>
          <div class="modal-box modal-confirm">
            <div class="modal-header modal-header--danger">
              <div class="modal-header-icon"><i class="mdi mdi-delete-alert"></i></div>
              <div>
                <p class="modal-title">Hapus Data</p>
                <p class="modal-subtitle font-mono">{{ deleteModal.row && deleteModal.row.part_number_mix }}</p>
              </div>
              <button class="modal-close" @click="deleteModal.open = false"><i class="mdi mdi-close"></i></button>
            </div>
            <div class="modal-body">
              <!-- Cek sebelum hapus: riwayat delivery, produksi, & pemakaian di hierarki -->
              <div class="del-check" :class="delCheckTone">
                <p class="del-check-title"><i class="mdi" :class="delCheckLoading ? 'mdi-loading mdi-spin' : 'mdi-clipboard-search-outline'"></i> Cek sebelum hapus</p>
                <template v-if="delCheck">
                  <div class="del-check-row">
                    <span class="del-check-k">Delivery terakhir</span>
                    <span class="del-check-v">
                      <template v-if="delCheck.last_delivery"><b>{{ delCheck.last_delivery }}</b> ({{ delCheck.months_since! <= 0 ? 'bulan ini' : delCheck.months_since + ' bln lalu' }})</template>
                      <template v-else>Tidak pernah ada delivery</template>
                    </span>
                  </div>
                  <div class="del-check-row del-check-row--sub">
                    <span v-for="d in delCheck.deliveries" :key="d.source" class="del-check-src" :class="{ 'del-check-src--zero': !d.count }">{{ d.source }}: {{ d.count.toLocaleString('id-ID') }}× · {{ d.qty.toLocaleString('id-ID') }} pcs</span>
                  </div>
                  <div class="del-check-row">
                    <span class="del-check-k">Produksi terakhir</span>
                    <span class="del-check-v">{{ delCheck.last_production ? `${delCheck.last_production.periode} · ${delCheck.last_production.actual.toLocaleString('id-ID')} pcs` : 'Tidak ada di mutasi' }}</span>
                  </div>
                  <div class="del-check-row">
                    <span class="del-check-k">Dipakai di hierarki</span>
                    <span class="del-check-v">
                      <template v-if="delCheck.mothers.length">
                        <span v-for="m in delCheck.mothers" :key="m.id" class="del-check-mother" :class="{ 'del-check-mother--off': m.runout }">{{ m.part_number }} <small>{{ m.area }}{{ m.runout ? ' · runout' : '' }}</small></span>
                      </template>
                      <template v-else>Tidak punya mother</template>
                      <span v-if="delCheck.children" class="del-check-kids">· {{ delCheck.children }} komponen</span>
                    </span>
                  </div>
                  <p class="del-check-verdict"><i class="mdi" :class="delCheckTone === 'del-check--ok' ? 'mdi-check-circle-outline' : 'mdi-alert-outline'"></i> {{ delCheckVerdict }}</p>
                </template>
                <p v-else-if="!delCheckLoading" class="del-check-verdict">Ringkasan tidak tersedia — cek manual sebelum menghapus.</p>
              </div>
              <p class="confirm-text">Pilih jenis penghapusan:</p>
              <div class="confirm-options">
                <div class="confirm-option" @click="deleteType = 'soft'" :class="{ selected: deleteType === 'soft' }">
                  <i class="mdi mdi-eye-off-outline"></i>
                  <div>
                    <strong>Nonaktifkan</strong><span>Set is_runout = 1 dan runout_date = sekarang. Data masih ada di database.</span>
                  </div>
                </div>
                <div
                  class="confirm-option confirm-option--danger"
                  @click="deleteType = 'hard'"
                  :class="{ selected: deleteType === 'hard' }"
                >
                  <i class="mdi mdi-delete-forever-outline"></i>
                  <div><strong>Hapus Permanen</strong><span>Data dihapus dari database. Tidak bisa dibatalkan!</span></div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <span class="kbd-hint"><kbd>Esc</kbd> tutup · <kbd>⏎</kbd> konfirmasi</span>
              <button class="md-btn md-btn-ghost" @click="deleteModal.open = false" :disabled="deleting">Batal</button>
              <button
                class="md-btn"
                :class="deleteType === 'hard' ? 'md-btn-danger' : 'md-btn-outline'"
                @click="handleDelete"
                :disabled="deleting"
              >
                <i class="mdi" :class="deleting ? 'mdi-loading mdi-spin' : 'mdi-check'"></i>
                {{ deleting ? 'Menghapus...' : deleteType === 'hard' ? 'Hapus Permanen' : 'Nonaktifkan' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Routing proses (multi-mesin) -->
    <RouteEditorModal v-model="routeModalOpen" :part="routePart as any" @saved="loadList()" />

    <BomVerifyModal :open="!!bomVerifyPart" :part-number="bomVerifyPart" @close="bomVerifyPart = null" @saved="() => { refreshTreeData(); loadList(currentPage); }" />
    <PartInsightPanel :open="!!insightPart" :part-number="insightPart" @close="insightPart = null" />
    <!-- Asisten umum MAJA (tanpa konteks part) — tombol mengambang kanan bawah -->
    <MajaAssistant />

    <!-- Pilih mesin visual (denah 2D) — field "Mesin" di form Tambah/Edit Part -->
    <AreaMachinePicker
      v-model="showMachinePicker" :area-code="formAreaGroup" :mode="machinePickerMode"
      :initial-machine="machinePickerMode === 'main' ? form.machine : form.machine_alt"
      :initial-jig="machinePickerMode === 'main' ? form.jig : null"
      :exclude-machine="machinePickerMode === 'alt' ? form.machine : null"
      @apply="onMachinePicked"
    />

    <!-- Menu Aplikasi + Unduh per Area — lihat MasterAppMenu.vue -->
    <MasterAppMenu
      :open="uploadMenuOpen"
      :categories="uploadCategories"
      @close="uploadMenuOpen = false"
      @upload="(c) => openUploadModal(uploadCategories.find(u => u.key === c.key) ?? null)"
      @pairing="pairingOpen = true"
      @compare="compareOpen = true"
    />

    <!-- Update via Paste (copy-paste dari Excel, dgn preview) -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="uploadModal.open" v-modal-stack="backToUploadMenu" class="modal-overlay" @click.self.prevent>
          <div class="modal-box modal-confirm modal-box--wide">
            <div class="modal-header">
              <div class="modal-header-icon"><i class="mdi mdi-content-paste"></i></div>
              <div>
                <p class="modal-title">{{ uploadCategory ? uploadCategory.label : 'Update Data' }}</p>
                <p class="modal-subtitle">Copy dari Excel, lalu tempel (Ctrl+V) di sini — bukan upload file</p>
              </div>
              <button class="modal-close" @click="backToUploadMenu" :disabled="pasting" title="Kembali ke Menu Aplikasi"><i class="mdi mdi-arrow-left"></i></button>
            </div>
            <div class="modal-body">
              <!-- Legenda kolom yang diterima kategori ini — kolom di luar ini akan diabaikan -->
              <div class="paste-accepted-cols">
                <span class="paste-accepted-cols-label"><i class="mdi mdi-check-decagram-outline"></i> Kolom yang diterima:</span>
                <span v-for="col in uploadCategory?.columns ?? []" :key="col" class="paste-accepted-chip" :class="{ 'paste-accepted-chip--key': UPLOAD_KEY_COLUMNS.includes(col) }">{{ col }}</span>
              </div>

              <!-- Bantuan supaya kolom pasti pas: unduh template siap-header, atau tempel via tombol -->
              <div class="paste-helper-actions">
                <button type="button" class="md-btn md-btn-ghost" :disabled="pasting" @click="masterService.downloadTemplate(uploadCategory?.key)">
                  <i class="mdi mdi-file-download-outline"></i> Unduh Template (kolom sudah pas)
                </button>
                <button type="button" class="md-btn md-btn-ghost" :disabled="pasting" @click="pasteFromClipboard">
                  <i class="mdi mdi-clipboard-text-outline"></i> Tempel dari Clipboard
                </button>
              </div>

              <!-- Belum ada data: zona tempel berbentuk sel spreadsheet (bukan kotak teks polos) -->
              <label v-if="!pasteGrid.length" class="paste-cellzone">
                <textarea
                  v-model="pasteText"
                  class="paste-cellzone-input"
                  :disabled="pasting"
                  autofocus
                ></textarea>
                <div class="paste-cellzone-grid">
                  <div class="paste-cellzone-row" v-for="r in 3" :key="r">
                    <div class="paste-cellzone-cell" v-for="c in 4" :key="c"></div>
                  </div>
                </div>
                <div class="paste-cellzone-hint">
                  <i class="mdi mdi-content-paste"></i>
                  Select & copy sel data (termasuk baris header) dari Excel, lalu tempel (Ctrl+V) di sini
                </div>
              </label>

              <!-- Sudah ada data: langsung tampilkan sbg tabel/grid asli, bukan teks mentah -->
              <div v-else class="paste-preview">
                <div class="paste-preview-head">
                  <span>{{ pasteDataRows.length }} baris data, {{ pasteHeaders.length }} kolom</span>
                  <span v-if="!hasRecognizedHeader" class="paste-preview-warn">
                    <i class="mdi mdi-alert-outline"></i> Tidak ada kolom yang termasuk kategori "{{ uploadCategory?.label }}" — tidak ada yang bisa diterapkan
                  </span>
                  <button type="button" class="md-btn md-btn-ghost paste-preview-clear" :disabled="pasting" @click="pasteText = ''">
                    <i class="mdi mdi-close"></i> Ganti data
                  </button>
                </div>
                <div class="paste-preview-scroll">
                  <table class="paste-preview-table">
                    <thead>
                      <tr>
                        <th v-for="(h, i) in pasteHeaders" :key="i" :class="{ 'col-unrecognized': !isHeaderRecognized(h) }">
                          {{ h || '(kosong)' }}
                          <i v-if="!isHeaderRecognized(h)" class="mdi mdi-help-circle-outline" :title="`Kolom ini di luar kategori '${uploadCategory?.label}' — akan DIABAIKAN, tidak ditulis ke database`"></i>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, ri) in pasteDataRows.slice(0, 50)" :key="ri">
                        <td v-for="(cell, ci) in pasteHeaders.map((_, i) => row[i] ?? '')" :key="ci">{{ cell }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-if="pasteDataRows.length > 50" class="paste-preview-more">…dan {{ pasteDataRows.length - 50 }} baris lainnya</p>
              </div>
            </div>
            <div class="modal-footer">
              <span class="kbd-hint"><kbd>Esc</kbd> kembali ke menu</span>
              <button class="md-btn md-btn-ghost" @click="backToUploadMenu" :disabled="pasting">
                <i class="mdi mdi-arrow-left"></i> Kembali
              </button>
              <button class="md-btn md-btn-primary" :disabled="pasteGrid.length < 2 || !hasRecognizedHeader || pasting" @click="confirmPasteUpdate">
                <i class="mdi" :class="pasting ? 'mdi-loading mdi-spin' : 'mdi-content-paste-search-outline'"></i>
                {{ pasting ? 'Menerapkan...' : `Terapkan (${pasteDataRows.length})` }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Notifikasi ringan refresh planning area (fitur "pindah area") -->
    <Teleport to="body">
      <Transition name="md-fade">
        <div v-if="areaRefreshNotice" class="md-area-refresh-notice">
          <i class="mdi mdi-sync mdi-spin" v-if="!areaRefreshNotice.includes('sudah diperbarui')"></i>
          <i class="mdi mdi-check-circle" v-else></i>
          {{ areaRefreshNotice }}
        </div>
      </Transition>
    </Teleport>

    <MovePartAreaModal
      :open="moveAreaModal.open"
      :part="moveAreaModal.part"
      :area-options="weldingAreaOptions"
      @close="moveAreaModal.open = false"
      @moved="onPartMoved"
    />
    <DeliveryVariantModal
      :open="variantModal.open"
      :part="variantModal.part"
      @close="variantModal.open = false"
      @changed="onVariantChanged"
    />
    <PartCompareModal
      :open="compareOpen"
      :filters="activeListFilters()"
      :filter-label="activeFilterLabel"
      :add-defaults="compareAddDefaults"
      :area-options="selectedLayer === 'IFPW' ? weldingAreaOptions : []"
      @close="compareOpen = false"
      @changed="loadList(currentPage); loadStats();"
    />
  </div>
</template>

<script setup lang="ts">
import { alertDialog, confirmDialog } from '@/utils/dialog';
import { ref, computed, onMounted, onUnmounted, watch, provide, nextTick } from 'vue';
import { isRobotSetup } from '@/composables/useWeldingAreas';
import { onBeforeRouteUpdate, useRoute } from 'vue-router';
import socket from '@/plugins/socket';
import masterService from '@/services/Public/Welding/masterService';
import machineMasterService from '@/services/Public/Welding/machineMasterService';
import weldingAreaService, { type WeldingArea } from '@/services/Public/Welding/weldingAreaService';
import type { ConnectCandidate } from '@/services/Public/Welding/masterService';
import TreeNode from '@/components/welding/master/TreeNode.vue';
import MediaSideGrid from '@/components/welding/master/MediaSideGrid.vue';
import Model3dSlot from '@/components/welding/master/Model3dSlot.vue';
import { CUBE_SIDES, sideMap } from '@/components/welding/master/mediaSides';
import DuplicateCompare from '@/components/welding/master/DuplicateCompare.vue';
import { useAreaColor } from '@/composables/useAreaColor';
import BomVerifiedBadge from '@/components/welding/master/BomVerifiedBadge.vue';
import PartSpecOrderTab from '@/components/welding/master/PartSpecOrderTab.vue';
import PartModel3D from '@/components/welding/master/PartModel3D.vue';
import PartSpecGlcTab from '@/components/welding/master/PartSpecGlcTab.vue';
import PartDiesTab from '@/components/welding/master/PartDiesTab.vue';
import ParentChainPicker from '@/components/welding/master/ParentChainPicker.vue';
import MotherPaths from '@/components/welding/master/MotherPaths.vue';
import FilterDropdown from '@/components/welding/mutation/FilterDropdown.vue';
import WipPairingBoard from '@/components/welding/master/WipPairingBoard.vue';
import ParentMixPicker from '@/components/welding/master/ParentMixPicker.vue';
import MovePartAreaModal from '@/components/welding/master/MovePartAreaModal.vue';
import DeliveryVariantModal from '@/components/welding/master/DeliveryVariantModal.vue';
import deliveryVariantService from '@/services/Public/Welding/deliveryVariantService';
import type { DeliveryVariant } from '@/services/Public/Welding/deliveryVariantService';
import MasterAppMenu from '@/components/welding/master/MasterAppMenu.vue';
import { useMasterColumnFilters } from '@/composables/useMasterColumnFilters';
import PartCompareModal from '@/components/welding/master/PartCompareModal.vue';
import RouteEditorModal from '@/components/welding/master/RouteEditorModal.vue';
import AreaMachinePicker from '@/components/welding/master/AreaMachinePicker.vue';
import BomVerifyModal from '@/components/welding/master/BomVerifyModal.vue';
import PartInsightPanel from '@/components/welding/master/PartInsightPanel.vue';
import MajaAssistant from '@/components/welding/master/MajaAssistant.vue';
import type { MsWelding, MsWeldingListParams, MsWeldingStats, MsWeldingTree, MsWeldingTreeNode, ReconcilePreview, MotherBySapCandidate, MotherBySapMatch, MsWeldingMedia, MediaViewSide, DeleteCheck } from '@/types/Public/Welding/master';
import type { WeldingBomItem } from '@/types/Public/Welding/bom';
import { vModalStack } from '@/directives/modalStack';
import { useAuthStore } from '@/stores/auth';

// Hak akses Master Data (Manage User → Module.<Aksi>.MasterDataWelding; admin = semua).
const auth = useAuthStore();
const can = computed(() => ({
  create: auth.checkAccess('Module.Create.MasterDataWelding'),
  update: auth.checkAccess('Module.Update.MasterDataWelding'),
  del: auth.checkAccess('Module.Delete.MasterDataWelding'),
}));
function allowed(act: 'create' | 'update' | 'del'): boolean {
  if (can.value[act]) return true;
  alertDialog(`Anda tidak punya akses ${act === 'create' ? 'tambah' : act === 'update' ? 'ubah' : 'hapus'} Master Data. Minta admin mengatur di Manage User.`);
  return false;
}
// Tree Hierarki: default mode lihat (tanpa drag) — Edit diklik dulu supaya perubahan disadari.
const treeEditMode = ref(false);
// Hierarki "aman": BOM terverifikasi + lengkap vs BOM SAP + tak ada peringatan NUT di seluruh tree.
// Dikunci — masuk mode Edit wajib konfirmasi supaya data yg sudah valid tak berubah tanpa sengaja.
const treeValid = computed(() => {
  const root = treeData.value?.node;
  if (!root?.bom_verified || !bomCompare.value.hasBom || bomCompare.value.sapOnly.length) return false;
  const warn = (n: MsWeldingTreeNode): boolean => !!n.nut_warnings?.length || (n.children ?? []).some(warn);
  return !warn(root);
});
async function toggleTreeEdit() {
  if (!treeEditMode.value && (treeLoading.value || bomLoading.value)) return;   // status aman belum diketahui
  if (!treeEditMode.value && treeValid.value
    && !await confirmDialog('Hierarki ini sudah valid (BOM terverifikasi, lengkap, tanpa peringatan NUT).\nBuka kunci untuk mengubah?', { title: 'Hierarki aman', confirmText: 'Buka kunci', danger: true })) return;
  treeEditMode.value = !treeEditMode.value;
}
provide('treePerm', computed(() => ({ edit: treeEditMode.value && can.value.update, create: can.value.create, update: can.value.update, del: can.value.del })));

const areas = ref<string[]>([]);

// Papan pemasangan WIP (steker ↔ stop kontak)
const pairingOpen = ref(false);
function onWipPaired(wip: MsWelding) {
  // refresh ringan: broadcast update WIP + segarkan stats/list
  applySocketUpdate({ action: 'update', data: wip });
  socket.emit('welding_master_updated', { action: 'update', data: wip });
  loadStats();
}
const stats = ref<MsWeldingStats | null>(null);
const rows = ref<MsWelding[]>([]);
const loading = ref(false);
// Loading indicator = bar biru tipis di atas tabel (bukan spinner) — dipakai
// baik load pertama maupun refresh (ganti tab/filter/sort). Tabel lama tetap
// kelihatan (dim tipis) selama refresh, gak hilang-muncul.
// TransitionGroup (row-anim) match by :key row.id — pas ganti tab/filter/sort,
// HAMPIR SEMUA id baris beda dari sebelumnya (dataset ganti total), jadi Vue
// nge-treat itu sbg "semua baris lama LEAVE + semua baris baru ENTER" barengan
// → itu yg kelihatan flicker/nyeblak walau sudah di-dim (bukan animasi 1 baris
// halus, tapi puluhan baris fade bareng). Matikan animasi KHUSUS pas bulk-swap
// dari loadList; biarkan nyala lagi utk perubahan 1 baris asli (create/update
// dari socket realtime) yg justru enak dilihat animasinya.
const suppressRowAnim = ref(false);
const totalRows = ref(0);
const currentPage = ref(1);
const lastPage = ref(1);
// ── Layer filter (two-level: layer → sub-area) ──
const LAYER_CONFIG = [
  { key: 'IFRM', subs: [] as { key: string; label: string }[] },
  { key: 'CKD',  subs: [] },
  { key: 'IFPP', subs: [
    { key: 'INHOUSE',  label: 'INHOUSE' },
    { key: 'OUTHOUSE', label: 'OUTHOUSE' },
  ]},
  { key: 'IFPW', subs: [
    { key: 'WSS ADM',      label: 'WSS ADM' },
    { key: 'WSS MMKI',     label: 'WSS MMKI' },
    { key: 'WSS HMMI',     label: 'WSS HMMI' },
    { key: 'CO ADM',       label: 'CO ADM' },
    { key: 'CO MMKI',      label: 'CO MMKI' },
    { key: 'SA ADM',       label: 'SA ADM' },
    { key: 'SA HMMI',      label: 'SA HMMI' },
  ]},
  { key: 'IFPD', subs: [
    { key: 'SINGLE_FINISH',  label: 'SINGLE FINISH' },
    { key: 'SUB_ASSY',       label: 'SUB-ASSY' },
    { key: 'SEMI_SUB_ASSY',  label: 'SEMI SUB-ASSY' },
    { key: 'MODULE',         label: 'MODULE' },
  ]},
] as const;

// ── Filter persistence (localStorage) ─────────────────────────────
const FILTER_STORAGE_KEY = 'weld_master_filter_v1';

function _loadFilterState() {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      layer: string | null; subArea: string | null
      wip: 0 | 1 | null; status: 'all' | 'active' | 'obsolete'
      variant?: 'hide' | 'show' | 'only'
    };
  } catch { return null; }
}
function _saveFilterState() {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
      layer:   selectedLayer.value,
      subArea: selectedSubArea.value,
      wip:     filterWip.value,
      status:  filterStatus.value,
      variant: variantMode.value,
    }));
  } catch {}
}

const _saved = _loadFilterState();

const selectedLayer   = ref<string | null>(_saved?.layer   ?? null);
const selectedSubArea = ref<string | null>(_saved?.subArea ?? null);

// ── Master AREA baru (WSS/CO/SA × ADM/MMKI/HMMI) — tiap area memayungi
// "zone" = nilai kolom `area` lama (SA ADM = ROBOT BARAT + ROBOT TIMUR + SA
// MANUAL). Chip IFPW pakai area baru; query ke server tetap kirim zone-nya
// (`areas=...`), jadi data part tidak perlu diubah.
const weldingAreas = ref<WeldingArea[]>([]);
async function loadWeldingAreas() {
  try { weldingAreas.value = await weldingAreaService.list(); } catch { weldingAreas.value = []; }
}
const zonesOfArea = (code: string | null): string[] => {
  if (!code) return [];
  const a = weldingAreas.value.find(x => x.area_code === code);
  if (!a) return [code];
  return a.zones.length ? a.zones.map(z => z.zone) : [a.area_code];
};
const areaOfZone = (zone: string | null | undefined): WeldingArea | undefined =>
  zone ? weldingAreas.value.find(a => a.zones.some(z => z.zone === zone)) : undefined;
// Mother langsung yg runout ("pn|area|mesin;...") — ditampilkan sbg info di kolom NEXT PROCESS.
const runoutMothers = (row: MsWelding) => (row.next_runout ?? '').split(';').filter(Boolean)
  .map(x => { const [pn, area, machine] = x.split('|'); return { pn, area: area ?? '', machine: machine ?? '' }; });
const runoutTitle = (row: MsWelding) => 'Mother runout (nonaktif):\n' + runoutMothers(row).map(m => `${m.pn} · ${m.area || '—'}${m.machine ? ' · ' + m.machine : ''}`).join('\n');
/** next_process bisa list dipisah koma (multi-mother) → tiap zone dipetakan ke area baru, dedup. */
const nextProcessLabel = (v: string): string =>
  Array.from(new Set(v.split(",").map(x => x.trim()).filter(Boolean).map(x => areaOfZone(x)?.area_code ?? x))).join(", ");
/** Sub-area IFPW yg dipilih = area baru → kirim zone-nya sebagai daftar `areas`. */
const isIfpwAreaSel = computed(() => selectedLayer.value === 'IFPW' && !!selectedSubArea.value && weldingAreas.value.length > 0);
const selectedAreaZones = computed<string[]>(() => isIfpwAreaSel.value ? zonesOfArea(selectedSubArea.value) : []);

const activeLayerSubs = computed(() => {
  if (!selectedLayer.value) return [];
  if (selectedLayer.value === 'IFPW' && weldingAreas.value.length) {
    return weldingAreas.value.filter(a => a.is_active).map(a => ({ key: a.area_code, label: a.area_code, off: false, empty: !a.zones.length }));
  }
  return (LAYER_CONFIG.find(l => l.key === selectedLayer.value)?.subs ?? []).map(s => ({ ...s, off: false, empty: false }));
});

// ── Kolom tabel dinamis per tab layer — OP/MESIN generik cuma cocok utk IFPW.
// "Semua" tab (selectedLayer null) tetap pakai format default (OP/MESIN) spy
// netral lintas layer.
// Tab IFPW tampilan ringkas (2026-09-18): tanpa OP/TYPE/MODEL terpisah. Tiap kolom
// 2 baris: PART NUMBER–nama, JOB–alias, AREA–mesin, NEXT PROCESS–mesin mother
// (next_machine), CUSTOMER–model.
const isIfpwCompact    = computed(() => selectedLayer.value === 'IFPW');
// IFPW & IFPD: kolom gabungan (qty|status, customer|model), kolom TYPE & MODEL disembunyikan
// Semua tab (termasuk "Semua"/layer null) pakai kolom gabungan + filter combo yang sama.
const isMergedCols     = computed(() => true);
// Sub-label kolom AREA: CKD = supplier, IFPP = mesin (INHOUSE) / vendor (OUTHOUSE), lainnya mesin
const isSupplierLayer  = computed(() => selectedLayer.value === 'CKD' || selectedLayer.value === 'IFRM');
const areaSubLabel     = computed(() =>
  isSupplierLayer.value ? 'SUPPLIER'
  : selectedLayer.value === 'IFPP' ? 'LINE / VENDOR'
  : selectedLayer.value ? 'MESIN'
  : 'MESIN / LINE / VENDOR');   // tab "Semua" lintas layer
// Per BARIS (bukan per tab) supaya tab "Semua" yang lintas layer tetap benar:
// CKD/MATERIAL/OUTHOUSE = vendor/supplier, sisanya mesin/line.
const areaSubIsVendor  = (row: MsWelding) => ['OUTHOUSE', 'CKD', 'MATERIAL'].includes((row.category ?? '').toUpperCase());
// Nilai sub kolom AREA: OUTHOUSE/CKD/MATERIAL = vendor, IFPP INHOUSE = line (line_press), lainnya mesin.
const areaSubValue     = (row: MsWelding): string | null => areaSubIsVendor(row) ? (row.vendor || null) : row.layer === 'IFPP' || row.category === 'INHOUSE' ? (row.line_press || row.machine || null) : (row.machine || null);
const showColOp        = computed(() => false);
// Kolom MESIN dihapus (2026-09-18) — mesin tampil sebagai sub-label di kolom AREA
// (AREA baru: WSS/CO/SA × plant, bukan lagi nilai zone lama).
const showColMesin     = computed(() => false);
// IFRM: GPART dengan JML MOTHER di bawahnya (kolom gabungan); supplier tampil di kolom AREA.
const showColGpart     = computed(() => selectedLayer.value === 'IFRM');
// IFPP-OUTHOUSE = komponen beli-jadi dari vendor (bukan proses inhouse) — vendor
// tampil sebagai sub-label kolom AREA (menggantikan mesin), tanpa TOTAL PROSES.
const isIfppOuthouse = computed(() => selectedLayer.value === 'IFPP' && selectedSubArea.value === 'OUTHOUSE');
// IFPP-INHOUSE: mother tampil di bawah TOTAL PROSES (kolom gabungan), bukan kolom sendiri.
const showColTotalProses = computed(() => selectedLayer.value === 'IFPP' && !isIfppOuthouse.value);
const showColMother    = computed(() => isIfppOuthouse.value);
// CKD: kolom JENIS CKD (= model) dengan JML MOTHER di bawahnya; customer tampil sendiri.
const isCkdLayer       = computed(() => selectedLayer.value === 'CKD');
// IFPD = gabungan IFPW+IFPP (FP semua kategori kini di sini) — satu kolom
// gabungan OP/Proses & Mesin/Line supaya kolom tidak dobel; tanpa Mother
// (FP = puncak hierarki, tak punya mother).
const showColIfpdType          = computed(() => selectedLayer.value === 'IFPD');
const IFPD_TYPE_LABEL: Record<string, string> = {
  SINGLE_FINISH: 'SINGLE FINISH', SUB_ASSY: 'SUB-ASSY', SEMI_SUB_ASSY: 'SEMI SUB-ASSY', MODULE: 'MODULE',
};
// Total proses (IFPP). Dua sumber, ambil yg terbesar:
//  - `total_proses` kolom DB — akurat kalau part pernah disimpan lewat modal
//    "Generate Routing" (save_route), tapi DEFAULT 1 di DB → tak bisa dibedakan
//    dari "part 1 proses beneran" vs "belum pernah pakai modal itu".
//  - hitung token line_press — akurat utk part yg cuma diisi lewat field
//    "Line/Mesin" ringkas di form utama (bukan modal Routing). Format baru
//    dipisah koma (mis. "150T SP, 150T SP" = 2 proses — token individual bisa
//    mengandung spasi); "/" di dalam token = line ALTERNATIF, bukan proses baru
//    ("B1 / B2" = 1 proses). Fallback split-spasi hanya utk data lama tanpa koma/slash.
function procCount(row: MsWelding): number {
  const v = (row.line_press || '').trim();
  let tokenCount = 0;
  if (v) {
    if (v.includes(',')) tokenCount = v.split(',').map(t => t.trim()).filter(Boolean).length;
    else if (v.includes('/')) tokenCount = 1;
    else tokenCount = v.split(/\s+/).filter(Boolean).length;
  }
  return Math.max(tokenCount, row.total_proses || 0);
}

function selectLayer(layer: string | null) {
  selectedLayer.value   = layer;
  selectedSubArea.value = null;
  _saveFilterState();
  loadList(1);
  loadStats();
}
function selectSubArea(sub: string | null) {
  selectedSubArea.value = sub;
  _saveFilterState();
  loadList(1);
  loadStats();
}

// Alias backward-compat for places that read selectedArea (openCreateModal, rowMatchesCurrentFilters, download)
const selectedArea = computed(() => selectedSubArea.value);

// IFPD subs (SINGLE_FINISH/WELDING/V2V) are NOT real `area` column values (area is
// always 'IFPD' for this layer) — they map to category/mother-based grouping via
// `ifpd_group` instead. Anywhere selectedSubArea was treated as a literal area must
// special-case this layer so it doesn't send/compare a bogus area value.
const isIfpdLayer = computed(() => selectedLayer.value === 'IFPD');

// FP selalu tersimpan di layer IFPD apa pun area produksinya (WSS MMKI, ROBOT
// CO, dll — lihat kolom AREA yg tampil "AREA →IFPD"). Kalau sub-area IFPP/IFPW
// (mis. "ROBOT CO") dipilih dan tetap filter layer=IFPW, FP dgn area itu TAK
// AKAN PERNAH muncul (layer-nya IFPD, bukan IFPW) — user cari "part di area
// ROBOT CO" jadi buntu. Begitu sub-area dipilih, filter jadi murni by AREA
// (lintas layer IFPP/IFPW/IFPD) — layer top-tab cuma dipakai kalau BELUM
// pilih sub-area (browsing mentah per-layer stok).
const crossLayerArea = computed(() =>
  (selectedLayer.value === 'IFPP' || selectedLayer.value === 'IFPW') && !!selectedSubArea.value
);
// Sub-tab "Semua" (belum pilih area spesifik) di IFPP/IFPW — masalah yg sama
// juga berlaku: layer=IFPW doang tetap buang semua FP grup itu. Jadi kalau
// "Semua" yg aktif, filter lintas layer by DAFTAR area grup tsb (areas IN(...)),
// bukan cuma layer=IFPW/IFPP.
const tabAreaGroup = computed<string[]>(() => {
  if ((selectedLayer.value === 'IFPP' || selectedLayer.value === 'IFPW') && !selectedSubArea.value) {
    if (selectedLayer.value === 'IFPW' && weldingAreas.value.length) return weldingAreas.value.flatMap(a => a.zones.map(z => z.zone));
    return LAYER_CONFIG.find(l => l.key === selectedLayer.value)?.subs.map(s => s.key) ?? [];
  }
  if (isIfpwAreaSel.value) return selectedAreaZones.value;
  return [];
});

const filterWip    = ref<0 | 1 | null>(_saved?.wip    ?? null);
const searchQuery  = ref('');
const perPage      = ref(10);   // default 10 baris (pilihan 10/25/50/100 di pojok filter)
const sortBy       = ref<'part_number' | 'area' | 'model' | 'updated_at'>('part_number');
const sortDir      = ref<'asc' | 'desc'>('asc');
const filterStatus = ref<'all' | 'active' | 'obsolete'>(_saved?.status ?? 'all');
// Baris VARIAN (nomor lama hasil lebur) — dimensi filter sendiri, lepas dari runout.
const variantMode  = ref<'hide' | 'show' | 'only'>(_saved?.variant ?? 'hide');
let searchTimer: ReturnType<typeof setTimeout> | null = null;

// Filter kolom gaya Excel — logika di composables/useMasterColumnFilters.ts.
const {
  showFilter, filterField, filterTitle, filterStyle, filterOptions, filterSearch, filterMerge, filterLoading, filters,
  isSearchable, visibleOptions, allSelected, someSelected, hasActiveFilters,
  colParams, openFilter, closeFilter, handleToggleAll, handleToggleOption, invertSelection, handleSearch, applyFilter, isFilterActive, clearFilter,
} = useMasterColumnFilters({
  serverFilters: () => ({
    layer:         (crossLayerArea.value || tabAreaGroup.value.length) ? null : selectedLayer.value,
    area:          (isIfpdLayer.value || isIfpwAreaSel.value) ? null : selectedSubArea.value,
    areas:         tabAreaGroup.value.length ? tabAreaGroup.value.join(',') : null,
    is_wip:        filterWip.value,
    search:        searchQuery.value || null,
    hide_obsolete: filterStatus.value === 'active'   ? 1 : 0,
    only_obsolete: filterStatus.value === 'obsolete' ? 1 : 0,
    variant_mode:  variantMode.value,
  }),
  areaLabel: (zone) => areaOfZone(zone)?.area_code ?? zone,
  onChange: () => loadList(1),
});

// Filter kolom (chip) kini difilter SERVER-SIDE (lihat loadList col_*) — rows.value
// sudah hasil terfilter+terpaginasi dari server, tak perlu filter ulang di client.
const displayRows = computed(() => rows.value)

// ADDED: state loading download

const uploadResult = ref<{
  success: boolean;
  message: string;
  result?: { inserted: number; updated: number; skipped: number; errors: string[] };
} | null>(null);

const treeModal = ref({
  open: false,
  label: '',
  partNumber: '',
  activeTab: 'children' as 'children' | 'mother' | 'bom',
});
const treeData    = ref<MsWeldingTree | null>(null);
const treeLoading = ref(false);

// BOM SAP tab state
const bomData       = ref<WeldingBomItem[]>([]);
const bomLoading    = ref(false);
const bomSyncing    = ref(false);
const bomSyncResult = ref<{ inserted: number; updated: number; synced_at: string } | null>(null);
// Override manual LGORT — kosong = auto (backend derive dari category part).
// Dipakai baik utk sync BOM SAP maupun "Children by SAP" (reconcile) supaya
// user bisa pilih storage location lain kalau auto-derive salah utk part ini.
const lgortOverride = ref<string>('');
const LGORT_OPTIONS = [
  { value: '', label: 'Auto' },
  { value: '2200', label: '2200 · IFPP' },
  { value: '2202', label: '2202 · Welding' },
  { value: '2300', label: '2300 · IFPD' },
];
// LGORT default mengikuti TAB aktif (bukan cuma category/status part). FP INHOUSE
// dilihat dari tab IFPP → BOM proses press (2200), bukan BOM storage IFPD (2300).
const TAB_LGORT: Record<string, string> = { IFPP: '2200', IFPW: '2202', IFPD: '2300' };
const tabLgort = () => TAB_LGORT[selectedLayer.value ?? ''] ?? '';

const EMPTY_FORM = (): Partial<MsWelding> => ({
  job_number_delivery: null,
  part_number_delivery: null,
  job_number: null,
  part_number: '',
  alias: null,
  part_name: null,
  category: null,
  gpart: null,
  op: null,
  part_number_mix: '',
  parent_part_mix: null,
  is_wip: false,
  is_common: false,
  status_part: 'FP',
  layer: null,
  line_press: null,
  total_proses: undefined,
  vendor: null,
  vendor_2: null,
  vendor_3: null,
  machine: null,
  machine_alt: null,
  jig: null,
  stroke_mili_spot: null,
  uph: null,
  cycle_time_sec: null,
  qty_kbn: 1,
  lot_cycle: null,
  qty_unit: null,
  stock: null,
  uom: null,
  scrap_ratio: null,
  pallet_type: null,
  pallet_image: null,
  ifpd_type: null,
  model: null,
  ckd_type: null,
  car_name: null,
  customer_1: null,
  customer_2: null,
  customer_3: null,
  area: '',
  image: null,
  runout_date: null,
  is_runout: false
});
const formModal = ref({ open: false, mode: 'create' as 'create' | 'edit' });
const form = ref<Partial<MsWelding>>(EMPTY_FORM());
const formError = ref<string | null>(null);
// Ambil nama part dari sumber lain (tombol "Ambil nama" di form).
const pnameCands = ref<{ name: string; source: string }[] | null>(null);
const aliasCands = ref<{ name: string; source: string }[] | null>(null);
const pnameLoading = ref(false);
async function fetchPartNames() {
  const pn = form.value.part_number?.trim();
  if (!pn) return;
  pnameLoading.value = true;
  try {
    const r = await masterService.partNameCandidates(pn);
    pnameCands.value = r.names; aliasCands.value = r.aliases;
    if (r.names.length === 1 && !form.value.part_name?.trim()) form.value.part_name = r.names[0].name;
    if (r.aliases.length === 1 && !form.value.alias?.trim()) form.value.alias = r.aliases[0].name;
  } finally { pnameLoading.value = false; }
}
/** Baris lain yg sudah memakai part_number_mix ini (respons 409 create/update). */
const formConflict = ref<{ id: number; part_number: string; part_number_mix: string; area: string | null; category: string | null; is_runout: boolean } | null>(null);
const conflictBusy = ref(false);
const formSaving = ref(false);

// ── Form pintar: saran autocomplete (datalist) + auto-derive ──
const suggest = ref<{ machine: string[]; jig: string[]; model: string[]; car_name: string[]; customer: string[]; vendor: string[] }>(
  { machine: [], jig: [], model: [], car_name: [], customer: [], vendor: [] }
);
let suggestLoaded = false;
const mixAuto = ref(true);   // part_number_mix dihitung otomatis sampai user edit manual

async function loadSuggestions() {
  if (suggestLoaded) return;
  try {
    const [machine, jig, model, car_name, customer, vendor] = await Promise.all([
      masterService.getFilterOptions('machine', {}),
      masterService.getFilterOptions('jig', {}),
      masterService.getFilterOptions('model', {}),
      masterService.getFilterOptions('car_name', {}),
      masterService.getFilterOptions('customer', {}),
      masterService.getFilterOptions('vendor', {}),
    ]);
    suggest.value = { machine, jig, model, car_name, customer, vendor };
    suggestLoaded = true;
  } catch { /* non-fatal: form tetap jalan tanpa saran */ }
}

// part_number_mix = part_number (+ -OP{op}) — auto sampai diedit manual
function deriveMix(): string {
  const pn = (form.value.part_number ?? '').trim();
  if (!pn) return '';
  const op = form.value.op;
  return (op !== null && op !== undefined && op !== ('' as any)) ? `${pn}-OP${op}` : pn;
}
watch(
  () => [form.value.part_number, form.value.op, form.value.category],
  () => {
    if (mixAuto.value) form.value.part_number_mix = deriveMix();
    // IFPD: part_number_delivery = dirinya sendiri (delivery part IS the part)
    if (isDelivery.value) form.value.part_number_delivery = form.value.part_number || null;
  }
);
function onMixManual() { mixAuto.value = false; }
function resetMixAuto() { mixAuto.value = true; form.value.part_number_mix = deriveMix(); }

// UPH <-> Cycle time (resiprokal): isi salah satu -> yang lain ikut. Tanpa loop
// karena set programatik tidak memicu @input.
function onUphInput() {
  const u = Number(form.value.uph);
  if (u > 0) form.value.cycle_time_sec = Math.round((3600 / u) * 1000) / 1000;
}
function onCycleInput() {
  const c = Number(form.value.cycle_time_sec);
  if (c > 0) form.value.uph = Math.round((3600 / c) * 100) / 100;
}

// "= part" / "= job": salin cepat ke kolom delivery
function copyPartToDelivery() { form.value.part_number_delivery = form.value.part_number ?? null; }
function copyJobToDelivery()  { form.value.job_number_delivery  = form.value.job_number ?? null; }

// ── Job Number = XLOOKUP dari master (auto, disabled default) ────────
// Job Number          ← job_number   baris master yg part_number = input
// Job Number Delivery ← job_number   baris master yg part_number_delivery = input
// (mirip XLOOKUP di Excel). Bisa di-unlock untuk isi manual.
const jobAuto = ref(true);
const jobNoOptions = ref<string[]>([]);
let _jobTimer = 0 as any, _jobdTimer = 0 as any;

function onJobManual() { jobAuto.value = false; }
function resetJobAuto() {
  jobAuto.value = true;
  lookupJobForPart(form.value.part_number ?? '');
  lookupJobForDelivery(form.value.part_number_delivery ?? '');
}

// XLOOKUP job_number berdasarkan part_number persis. Realtime + auto-clear:
// tiap part berubah, job dikosongkan dulu lalu diisi bila ada match.
function lookupJobForPart(pn: string) {
  clearTimeout(_jobTimer);
  const q = (pn || '').trim();
  if (jobAuto.value) form.value.job_number = null;   // berubah → auto ilang dulu
  if (q.length < 2) { jobNoOptions.value = []; return; }
  _jobTimer = setTimeout(async () => {
    try {
      const res = await masterService.getList({ search: q, per_page: 25, page: 1 });
      const rows = res.data ?? [];
      const m = rows.find((r: any) => (r.part_number ?? '').trim().toLowerCase() === q.toLowerCase());
      if (jobAuto.value) {
        if (m && m.job_number) form.value.job_number = m.job_number;
        // Tak ada match → gak ada apa2 utk di-auto-fill. Buka kunci field spy
        // user gak kejebak input wajib yg ke-disable tanpa isi (mis. MATERIAL).
        else { form.value.job_number = null; jobAuto.value = false; }
      }
      const set = new Set<string>();
      rows.forEach((r: any) => { if (r.job_number) set.add(r.job_number); });
      jobNoOptions.value = Array.from(set);
    } catch { /* abaikan */ }
  }, 120);
}
// XLOOKUP job_number berdasarkan part_number_delivery persis.
function lookupJobForDelivery(pnd: string) {
  clearTimeout(_jobdTimer);
  const q = (pnd || '').trim();
  if (jobAuto.value) form.value.job_number_delivery = null; // berubah → auto ilang dulu
  if (q.length < 2) return;
  _jobdTimer = setTimeout(async () => {
    try {
      const res = await masterService.getList({ search: q, per_page: 25, page: 1 });
      const rows = res.data ?? [];
      const m = rows.find((r: any) => (r.part_number_delivery ?? '').trim().toLowerCase() === q.toLowerCase());
      if (jobAuto.value) {
        if (m) form.value.job_number_delivery = m.job_number_delivery || m.job_number || null;
        else { form.value.job_number_delivery = null; jobAuto.value = false; }
      }
    } catch { /* abaikan */ }
  }, 120);
}

watch(() => form.value.part_number,          (pn)  => lookupJobForPart((pn as any) ?? ''));
watch(() => form.value.part_number_delivery, (pnd) => lookupJobForDelivery((pnd as any) ?? ''));

// ── Auto-lookup Nama Kendaraan dari Kode Model ──────────────────────
// Pilih/ketik kode model → car_name terisi otomatis dari master (XLOOKUP).
// Hanya mengisi bila car_name masih kosong, agar tidak menimpa input manual.
let _carTimer = 0 as any;
function lookupCarName(model: string) {
  clearTimeout(_carTimer);
  const q = (model || '').trim();
  if (q.length < 1) return;
  _carTimer = setTimeout(async () => {
    try {
      const res = await masterService.getList({ search: q, per_page: 50, page: 1 });
      const rows = res.data ?? [];
      const m = rows.find(
        (r: any) => (r.model ?? '').trim().toLowerCase() === q.toLowerCase() && (r.car_name ?? '').trim(),
      );
      if (m && !(form.value.car_name ?? '').trim()) form.value.car_name = m.car_name;
    } catch { /* abaikan */ }
  }, 200);
}
watch(() => form.value.model, (model) => { if (showModelCustomer.value) lookupCarName((model as any) ?? ''); });

// Trim spasi awalan/akhiran part number (end user sering copy-paste bawa spasi).
function trimPartNumber() {
  const t = (form.value.part_number ?? '').trim();
  if (t !== form.value.part_number) form.value.part_number = t;
}
function trimPartNumberDelivery() {
  const t = (form.value.part_number_delivery ?? '').trim();
  if (t !== form.value.part_number_delivery) form.value.part_number_delivery = t || null;
}

const deleteModal = ref({ open: false, row: null as MsWelding | null });
// Cek sebelum hapus (delivery/produksi/hierarki) — dimuat saat modal Hapus dibuka.
const delCheck = ref<DeleteCheck | null>(null);
const delCheckLoading = ref(false);
const delCheckVerdict = computed(() => {
  const c = delCheck.value;
  if (!c) return '';
  if (c.active_mothers) return `Masih dirakit ke ${c.active_mothers} mother aktif — hapus akan memutus BOM mother tsb.`;
  if (c.last_delivery && (c.months_since ?? 99) < 3) return 'Masih ada delivery dalam 3 bulan terakhir — pastikan part benar-benar tidak dipakai.';
  if (c.last_production && c.last_production.periode >= new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 7)) return 'Masih ada produksi dalam 3 bulan terakhir.';
  return c.last_delivery ? `Delivery terakhir ${c.months_since} bln lalu & tak dipakai mother aktif — aman dihapus/runout.` : 'Tidak ada delivery & tak dipakai mother aktif — aman dihapus.';
});
const delCheckTone = computed(() => {
  const c = delCheck.value;
  if (!c) return '';
  if (c.active_mothers || (c.last_delivery && (c.months_since ?? 99) < 3)) return 'del-check--danger';
  if (c.last_production && c.last_production.periode >= new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 7)) return 'del-check--warn';
  return 'del-check--ok';
});
async function loadDelCheck(id?: number | null) {
  delCheck.value = null;
  if (!id) return;
  delCheckLoading.value = true;
  try { delCheck.value = await masterService.deleteCheck(id); } finally { delCheckLoading.value = false; }
}
const deleteType = ref<'soft' | 'hard'>('soft');
const deleting = ref(false);

const imageModal = ref({ open: false, row: null as MsWelding | null });
const imageUploading = ref(false);
const imageError = ref<string | null>(null);
// ── Detail spec: lebar kolom foto bisa digeser (splitter), disimpan per browser ──
const SPEC_MEDIA_W_DEFAULT = 300;
const SPEC_MEDIA_W_KEY = 'md.specMediaW';
const specMediaW = ref(SPEC_MEDIA_W_DEFAULT);
try { const v = Number(localStorage.getItem(SPEC_MEDIA_W_KEY)); if (v) specMediaW.value = v; } catch { /* storage diblok */ }
const specSplitDrag = ref(false);
function setSpecMediaW(w: number) {
  // Batas: foto tetap terbaca (≥220) & tab tetap lega (≤ 55% lebar layar).
  specMediaW.value = Math.round(Math.min(Math.max(w, 220), Math.max(260, window.innerWidth * 0.55)));
  try { localStorage.setItem(SPEC_MEDIA_W_KEY, String(specMediaW.value)); } catch { /* abaikan */ }
}
function startSpecSplit(e: PointerEvent) {
  const x0 = e.clientX, w0 = specMediaW.value;
  specSplitDrag.value = true;
  const move = (ev: PointerEvent) => setSpecMediaW(w0 + ev.clientX - x0);
  const up = () => {
    specSplitDrag.value = false;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}
// Media wajib (standar kelengkapan data) yg masih kosong utk part yg sedang dibuka.
const specMediaMissing = computed(() => {
  const r = specModal.value.row;
  if (!r) return [];
  const miss: string[] = [];
  if (!r.image && !specCubeHasAny.value) miss.push('foto part');
  if (!r.pallet_image) miss.push('foto pallet');
  if (!r.pallet_type) miss.push('jenis pallet');
  return miss;
});

const palletImageUploading = ref(false);
const palletImageError = ref<string | null>(null);

const specModal = ref({ open: false, row: null as MsWelding | MsWeldingTreeNode | null, activeTab: 'info' as 'info' | 'children' | 'mother' | 'bom' | 'order' | 'glc' | 'dies' });

const detailModal = ref({ open: false, row: null as MsWelding | null, activeLeftTab: 'children' as 'children' | 'mother' | 'bom' | 'dies' });
const detailTreeData = ref<MsWeldingTree | null>(null);
const detailTreeLoading = ref(false);
// Sumber tree yg lagi aktif, apapun modalnya — treeModal (desktop, "Hierarki &
// BOM") ATAU detailModal (mobile, tab Hierarki). Dipakai fitur yg sebelumnya
// cuma baca treeData.value langsung (Children by SAP / Mother by SAP) sehingga
// selalu no-op di mobile krn treeData.value memang tak pernah keisi di sana.
const activeEntryTree = computed(() => treeData.value ?? detailTreeData.value);

// ── Dynamic form: category sebagai SUMBU UTAMA, layer/area AUTO ──
// category: WELDING · INHOUSE · OUTHOUSE · SINGLE FINISH · IFPD · CKD · MATERIAL
// INHOUSE/OUTHOUSE = komponen welding layer IFPP (dulu terpecah jadi PRESS/SUBCON/IFPP —
// disatukan supaya tidak ada 2 kategori yang sama-sama berarti "IFPP").
const isWelding     = computed(() => form.value.category === 'WELDING');

// ── Integrasi Master Mesin (ms_welding_machine, Aturan #8/Utilisasi Mesin) ──
// Mesin yg BENERAN terdaftar di Master Mesin utk area part yg lagi diedit —
// dipakai buat kasih hint kalau mesin yg lagi kesimpen di part ini belum
// terdaftar (bukan blocking — mesin baru otomatis ke-daftar pas disimpan,
// lihat M_weld::_auto_register_machine backend). Pengisian mesin sendiri
// SEPENUHNYA lewat MachinePickerModal (denah 2D) — gak ada input teks bebas
// lagi di form ini, biar gak ada jalur kedua yg bisa bikin data machine
// beda format dari yg direpresentasikan denah.
const registeredMachines = ref<string[]>([]);
watch(
  () => [form.value.area, isWelding.value],
  async ([area, welding]) => {
    if (!welding || !area) { registeredMachines.value = []; return; }
    try {
      const res = await machineMasterService.list(area as string, '1');
      registeredMachines.value = (res.data ?? []).map(r => r.machine);
    } catch { registeredMachines.value = []; }
  },
  { immediate: true }
);
const machineNotRegistered = computed(() => {
  const m = (form.value.machine || '').trim();
  return isWelding.value && !!m && registeredMachines.value.length > 0 && !registeredMachines.value.includes(m);
});
// DEPRECATED — 'SINGLE FINISH' sudah bukan pilihan Category di picker lagi (lihat
// LAYER_CATEGORY_OPTIONS), digantikan INHOUSE/OUTHOUSE + Tipe=FP. isSinglePress
// dipertahankan cuma sbg fallback baca baris lama yg belum sempat dimigrasi
// (migration/migrate_single_finish_to_inhouse_outhouse.sql) — jangan dipakai
// utk alur baru.
const isSinglePress = computed(() => form.value.category === 'SINGLE FINISH');
const isDelivery    = computed(() => form.value.category === 'IFPD');
const isCkd         = computed(() => form.value.category === 'CKD');
const isMaterial    = computed(() => form.value.category === 'MATERIAL');
const isInhouseComp = computed(() => form.value.category === 'INHOUSE'); // komponen welding inhouse (Line)
const isOuthouseComp= computed(() => form.value.category === 'OUTHOUSE'); // komponen welding outhouse (Vendor)
// OR is_wip sbg jaga-jaga: sebagian data lama punya status_part/is_wip yang tak selaras
// (mis. status_part='FP' tapi is_wip=1 dari bug sync lama) — is_wip yg boolean lebih andal.
const isWIP = computed(() => form.value.status_part === 'WIP' || !!form.value.is_wip);
const showAfterCategory = computed(() => form.value.category !== null);
// Chip-list mother (tambah/lepas langsung tersimpan, tampil qty unit per mother)
// — awalnya cuma INHOUSE/OUTHOUSE, lalu WELDING WIP (part welding OP kecil bisa
// punya >1 mother OP besar/beda area), sekarang jg CKD (hardware generik spt
// nut/bolt/clip — 1 part CKD lazim dipakai di PULUHAN assembly WELDING berbeda,
// backend add_mother_post() dari awal memang didesain utk ini — lihat komentarnya
// "Dipakai CKD/IFPP yang punya banyak mother" — tapi gate FE-nya kelewat gak
// ikut nyertain CKD, jadi part CKD kepaksa lewat single-parent picker yg cuma
// nyimpen/nge-replace 1 parent_part_mix legacy, padahal relasi ASLI di
// ms_welding_parents bisa udah puluhan — begitu single-picker coba "reparent"
// (detach lama, link baru) jadi rusak/error krn nyoba mutilasi relasi yg
// jumlahnya bukan 1. Part masih perlu tersimpan (form.id) krn chip-nya baca
// relasi asli dari server (ms_welding_parents).
const showMultiMother = computed(() => (isInhouseComp.value || isOuthouseComp.value || isCkd.value || (isWelding.value && (isWIP.value || isCommonForm.value))) && !!form.value.id);

// Konteks untuk smart parent picker (rekomendasi + cek putus)
const parentPickerContext = computed(() => ({
  partNumberMix:        form.value.part_number_mix ?? '',
  partNumber:           form.value.part_number ?? '',
  partNumberDelivery:   form.value.part_number_delivery ?? null,
  model:                form.value.model ?? null,
  carName:              form.value.car_name ?? null,
  op:                   form.value.op ?? null,
  isWip:                form.value.is_wip ?? (form.value.status_part === 'WIP'),
  excludeId:            (form.value as any).id ?? null,
  area:                 form.value.area ?? null,
  category:             form.value.category ?? null,
}));

// Auto-lookup model/car_name/customer dari parent (WIP) saat parent dipilih —
// hanya isi field yang masih kosong, tidak menimpa yang sudah diisi manual.
// Part yg BELUM tersimpan (create, belum ada id) belum bisa langsung link_child
// (butuh child_id nyata) — simpan id mother yg dipilih di sini, ditautkan
// SETELAH create sukses (lihat saveForm). Part yg SUDAH tersimpan sudah
// ditautkan langsung oleh ParentMixPicker sendiri (choose()), gak lewat sini.
const pendingParentId = ref<number | null>(null);
function onParentPicked(p: ConnectCandidate) {
  if (!form.value.id) pendingParentId.value = p.id ?? null;
  if (!form.value.model)      form.value.model      = p.model ?? null;
  if (!form.value.car_name)   form.value.car_name    = p.car_name ?? null;
  if (!form.value.customer_1) form.value.customer_1  = p.customer_1 ?? null;
  if (!form.value.customer_2) form.value.customer_2  = p.customer_2 ?? null;
  if (!form.value.customer_3) form.value.customer_3  = p.customer_3 ?? null;
}

// Mother (multi-parent) — khusus INHOUSE/OUTHOUSE. Daftar SELALU diambil ulang dari
// server (ms_welding_parents + kolom legacy) setelah tiap tambah/lepas, supaya form
// tidak "diam-diam" berhasil POST tanpa terlihat hasilnya. Tambah = addMother (relasi,
// bukan baris baru, sama seperti drag-and-drop "Pasang WIP"). Lepas = detachParent.
const extraMotherMix = ref<string | null>(null);
const extraMothers = ref<{ id: number; part_number: string; part_number_mix: string; model?: string | null; area?: string | null; customer_1?: string | null; mother_qty_unit?: number | null; parent_qty_kbn?: number | null }[]>([]);
const extraMothersLoading = ref(false);
const removingMotherMix = ref<string | null>(null);
const qtyUnitSavingId = ref<number | null>(null);

async function loadExtraMothers() {
  const id = form.value.id;
  if (!id) { extraMothers.value = []; return; }
  extraMothersLoading.value = true;
  try {
    extraMothers.value = await masterService.getParentsOf(id);
    _autoSuggestIfpdType(); // area mother baru kebaca — coba saranin Tipe Part
  } catch {
    extraMothers.value = [];
  } finally {
    extraMothersLoading.value = false;
  }
}

// Setelah daftar mother berubah, server auto-recompute qty_kbn (FPB dari qty_kbn semua
// mother) — tarik ulang biar form yg lagi terbuka langsung ikut menampilkan nilai baru.
async function refreshQtyKbnFromServer() {
  const id = form.value.id;
  if (!id) return;
  try {
    const fresh = await masterService.getDetail(id);
    if (fresh) { form.value.qty_kbn = fresh.qty_kbn; form.value.qty_kbn_wip = fresh.qty_kbn_wip ?? null; }
  } catch { /* non-fatal, biarkan nilai lama tampil */ }
}

async function onAddMother(p: ConnectCandidate) {
  extraMotherMix.value = null;
  const sourceId = form.value.id;
  const parentId = p.id;
  if (!sourceId || !parentId || parentId === sourceId) return;
  try {
    const res = await masterService.addMother(sourceId, parentId);
    if (res.success) {
      await loadExtraMothers();
      await refreshQtyKbnFromServer();
      loadList(currentPage.value);
    } else {
      alertDialog(res.message || 'Gagal menambah mother.');
    }
  } catch (e: any) {
    alertDialog(e?.response?.data?.message ?? 'Gagal menambah mother.');
  }
}

async function onRemoveMother(m: { id: number; part_number_mix: string; part_number: string }) {
  const sourceId = form.value.id;
  if (!sourceId) return;
  if (!await confirmDialog(`Lepas "${m.part_number}" sebagai mother dari part ini?`)) return;
  removingMotherMix.value = m.part_number_mix;
  try {
    const res = await masterService.detachParent(sourceId, m.id);
    if (res.success) {
      // Kolom legacy parent_part_mix mungkin ikut dikosongkan di server — sinkronkan.
      if (form.value.parent_part_mix === m.part_number_mix) form.value.parent_part_mix = null;
      await loadExtraMothers();
      await refreshQtyKbnFromServer();
      loadList(currentPage.value);
    } else {
      alertDialog(res.message || 'Gagal melepas mother.');
    }
  } catch (e: any) {
    alertDialog(e?.response?.data?.message ?? 'Gagal melepas mother.');
  } finally {
    removingMotherMix.value = null;
  }
}

// Qty Unit per-mother = qty part ini per 1 unit mother TERTENTU (beda dari qty_kbn global,
// yg auto-FPB dari qty_kbn semua mother — Qty Unit murni manual per relasi, tak memicu recompute).
async function onUpdateMotherQtyUnit(m: { id: number; part_number: string; mother_qty_unit?: number | null }, raw: string) {
  const sourceId = form.value.id;
  if (!sourceId) return;
  const qty = parseFloat(raw);
  if (isNaN(qty) || qty < 0) return;
  qtyUnitSavingId.value = m.id;
  try {
    const res = await masterService.updateMotherQty(sourceId, m.id, qty);
    if (res.success) {
      const row = extraMothers.value.find((x) => x.id === m.id);
      if (row) row.mother_qty_unit = qty;
    } else {
      alertDialog(res.message || 'Gagal menyimpan Qty Unit.');
    }
  } catch (e: any) {
    alertDialog(e?.response?.data?.message ?? 'Gagal menyimpan Qty Unit.');
  } finally {
    qtyUnitSavingId.value = null;
  }
}

// Setelah auto-link WIP child → refresh list & tree agar konsisten
function onChildLinked() {
  loadList(currentPage.value);
  // refreshTreeData() sendiri sudah cek treeData ATAU detailTreeData — guard di
  // sini dulu cuma treeData, jadi mobile (detailTreeData) gak ke-refresh.
  if (activeEntryTree.value?.entry_id) refreshTreeData();
}

const LINE_PRESS_OPTIONS: string[] = ['BL', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'SP', '300T'];

// ── Line / Mesin multi-proses (bukan 1 nilai tunggal) — dipakai di field Line Press ──
// Contoh: 5 line (BL → A1 → A2 → A3 → A4). Disinkron ke ms_welding_route saat simpan,
// sama seperti Routing Proses modal (routeKey: WIP → part_number, FP → part_number_delivery).
interface LineRow { machine: string }
const lineRows = ref<LineRow[]>([{ machine: '' }]);
const lineRowsLoading = ref(false);
const blankLineRow = (): LineRow => ({ machine: '' });
function setLineTotal(n: number) {
  n = Math.max(1, Math.min(12, Math.floor(n) || 1));
  while (lineRows.value.length < n) lineRows.value.push(blankLineRow());
  while (lineRows.value.length > n) lineRows.value.pop();
}
function addLineRow() { lineRows.value.push(blankLineRow()); }
function removeLineRow(i: number) { lineRows.value.splice(i, 1); if (!lineRows.value.length) lineRows.value.push(blankLineRow()); }
const lineRouteKey = computed(() =>
  form.value.is_wip ? (form.value.part_number || '') : (form.value.part_number_delivery || form.value.part_number || '')
);
async function loadLineRows() {
  if (!lineRouteKey.value || !form.value.area) { lineRows.value = [blankLineRow()]; return; }
  lineRowsLoading.value = true;
  try {
    const data = await masterService.getRoute(lineRouteKey.value, form.value.area, form.value.part_number || undefined);
    lineRows.value = data.length ? data.map((d: any) => ({ machine: d.machine ?? '' })) : [blankLineRow()];
  } catch {
    lineRows.value = [blankLineRow()];
  } finally {
    lineRowsLoading.value = false;
  }
}

// Field yang tampil per category
// OP: toggle boolean — user pilih "Ada OP?" dulu, baru field OP muncul
// OP: open field numerik kelipatan 10; kosong = null (FP tanpa OP)
function onOpInput(raw: string) {
  const v = raw.trim();
  form.value.op = v === '' ? null : Math.max(0, parseInt(v, 10) || 0);
}
// FP/WIP dipilih utk WELDING & INHOUSE/OUTHOUSE — INHOUSE/OUTHOUSE bisa jadi
// root sub-assy yg langsung barang jadi (FP), bukan cuma komponen umpan ke
// welding (WIP). CKD/MATERIAL/SINGLE FINISH/IFPD tetap auto (statusnya definitif).
const showTipeSelect    = computed(() => isWelding.value || isInhouseComp.value || isOuthouseComp.value);
const showProcessParams = computed(() => isWelding.value || isInhouseComp.value); // UPH/stroke
// line_press ("Line"): untuk komponen inhouse / single finish. vendor: untuk komponen outhouse.
const showLinePress     = computed(() => isInhouseComp.value || isSinglePress.value);
const showVendor        = computed(() => isOuthouseComp.value);

// ── Langkah 1 form: Layer dipilih LEBIH DULU, Category mengikuti ──
// Layer menentukan aturan turunan yg berat (mother wajib IFPW, WIP/FP terkunci
// utk INHOUSE/OUTHOUSE, Part Number Delivery cuma utk IFPW-FP, dst) — jadi
// dipilih paling awal supaya user tidak salah pilih Category dulu baru sadar
// field-nya tidak sesuai.
// "IFPD" SENGAJA tidak jadi pilihan Layer step-1 lagi — itu bukan family
// manufaktur (gak ada part yg "diproses di IFPD"), tapi cuma STORAGE ENDPOINT
// tempat SEMUA FP akhirnya mendarat (welding FP, inhouse/outhouse FP "single
// finish", delivery), otomatis via derivedLayer begitu Tipe=FP — bukan
// sesuatu yg user pilih manual. Dulu bikin bingung: part single-press-langsung-
// jadi (no welding) keliatan "Layer IFPD" di step-1 padahal keluarganya sama
// spt INHOUSE/OUTHOUSE (proses press), cuma dia FP bukan WIP.
// "SINGLE FINISH" category SUDAH DIHAPUS dari picker (eks-workaround selagi
// INHOUSE/OUTHOUSE belum bisa Tipe=FP) — sekarang part press-langsung-jadi
// TINGGAL pilih Category INHOUSE (dipress sendiri) / OUTHOUSE (vendor) +
// Tipe=FP, hasilnya identik (area PRESS/OUTHOUSE, layer auto IFPD), tanpa
// perlu category terpisah. Baris lama sudah dimigrasi, lihat migration/
// migrate_single_finish_to_inhouse_outhouse.sql.
const LAYER_OPTIONS = [
  { value: 'IFPW', label: 'IFPW — Welding' },
  { value: 'IFPP', label: 'IFPP — Inhouse / Outhouse' },
  { value: 'CKD',  label: 'CKD — Nut/Bolt/Clip/Pin' },
  { value: 'IFRM', label: 'IFRM — Material (Sheet/Coil)' },
];
const LAYER_CATEGORY_OPTIONS: Record<string, { value: string; label: string }[]> = {
  IFPW: [{ value: 'WELDING', label: 'WELDING — Part Welding' }],
  IFPP: [
    { value: 'INHOUSE',      label: 'INHOUSE — Part Inhouse' },
    { value: 'OUTHOUSE',     label: 'OUTHOUSE — Part Outhouse' },
  ],
  CKD:  [{ value: 'CKD',      label: 'CKD — Nut/Bolt/Clip/Pin' }],
  IFRM: [{ value: 'MATERIAL', label: 'MATERIAL — Sheet/Coil' }],
};
// Kebalikan dari LAYER_CATEGORY_OPTIONS — dipakai utk init formLayer saat Edit/Clone
// dari data existing (yg cuma punya category, belum tentu user isi ulang layer-nya).
function layerKeyForCategory(category: string | null): string | null {
  if (!category) return null;
  for (const [layerKey, opts] of Object.entries(LAYER_CATEGORY_OPTIONS)) {
    if (opts.some(o => o.value === category)) return layerKey;
  }
  return null;
}
const formLayer = ref<string | null>(null);
const categoryOptionsForFormLayer = computed(() => formLayer.value ? (LAYER_CATEGORY_OPTIONS[formLayer.value] ?? []) : []);
function onFormLayerChange() {
  // Ganti Layer → Category ikut di-reset (opsi lama mungkin tak lagi valid).
  form.value.category = null;
  const opts = categoryOptionsForFormLayer.value;
  // Layer dgn cuma 1 Category (IFPW/CKD/IFRM) → auto-pilih, tak perlu klik dua kali.
  if (opts.length === 1) {
    form.value.category = opts[0].value as any;
    onCategoryChange();
  }
}

// Layer & Area OTOMATIS dari category (+is_wip utk welding). Bisa di-override manual.
const autoConfig = ref(true);
const derivedLayer = computed(() => {
  // Keputusan manajer: part FP HANYA boleh ada di layer IFPD, TAPI cuma utk
  // category yg benar-benar "diproses jadi produk" — WELDING, INHOUSE/OUTHOUSE
  // (komponen welding sbg FP = SINGLE FINISH/vendor), SINGLE FINISH. CKD & MATERIAL
  // TIDAK ikut dipaksa — tetap layer aslinya (CKD/IFRM), bukan produk proses.
  // Area proses asli (WSS MMKI, ROBOT xxx, dst) tetap tercatat di kolom `area`
  // (lihat derivedArea). WIP tetap mengikuti layer proses aslinya (tak berubah).
  if (form.value.status_part === 'FP'
      && (isWelding.value || isInhouseComp.value || isOuthouseComp.value || isSinglePress.value || isDelivery.value)) {
    return 'IFPD';
  }
  if (isWelding.value)     return 'IFPW'; // WIP welding
  if (isSinglePress.value) return 'IFPD'; // press langsung jadi → simpan di IFPD
  if (isDelivery.value)    return 'IFPD'; // delivery part
  if (isInhouseComp.value || isOuthouseComp.value) return 'IFPP'; // komponen welding → layer IFPP (area INHOUSE/OUTHOUSE)
  if (isMaterial.value)    return 'IFRM';
  if (isCkd.value)         return 'CKD';
  return null;
});
const derivedArea = computed(() => {
  // SINGLE FINISH = area proses ASLINYA press ("PRESS"), sama pola dgn WELDING
  // FP (area = area proses asli, layer yg otomatis IFPD — lihat NEXT PROCESS
  // badge di tabel). Dulu area-nya literal 'IFPD' sendiri, jadi info "diproses
  // di mana" hilang & tabel gak bisa nampilin "Next Process: IFPD" spt FP lain.
  // isDelivery (category legacy 'IFPD', sudah pensiun) TETAP 'IFPD' — gak ada
  // area proses asli yg tercatat utk baris lama itu.
  if (isSinglePress.value) return 'PRESS'; // legacy fallback, category ini sudah dipensiunkan
  if (isDelivery.value)    return 'IFPD';
  // INHOUSE yang FP (root sub-assy, langsung barang jadi) = sama persis pola
  // INHOUSE FP & WIP SAMA-SAMA area 'INHOUSE' — pola sama spt WELDING FP (area
  // = area proses asli, SAMA dgn WIP-nya) supaya nyatu 1 tab lewat crossLayerArea
  // (lihat computed di bawah). Sempat dicoba area='PRESS' tapi itu bukan salah
  // satu sub-area tab IFPP (cuma INHOUSE/OUTHOUSE) → part jadi tak kelihatan
  // di manapun saat browsing. FP/WIP tetap dibedakan dari status_part, bukan area.
  if (isInhouseComp.value)  return 'INHOUSE';
  if (isOuthouseComp.value) return 'OUTHOUSE';
  if (isCkd.value)      return 'INTEGRATED WAREHOUSE';
  if (isMaterial.value) return 'IFRM';
  return form.value.area || ''; // WELDING → user pilih
});
// ── Visibility field per category (form makin ringkas & relevan) ──
const showQtyKbn       = computed(() => !isCkd.value);                          // CKD tak butuh qty kanban
const showCycleTime    = computed(() => isWelding.value || isInhouseComp.value); // CKD/OUTHOUSE/SINGLE/MATERIAL tak butuh
const showLotCycle     = computed(() => isWelding.value || isInhouseComp.value);
const showQtyUnit           = computed(() => (isWelding.value && isWIP.value) || isInhouseComp.value || isOuthouseComp.value || isCkd.value);
const showModelCustomer= computed(() => isWelding.value || isInhouseComp.value || isOuthouseComp.value || isDelivery.value);
// Job Number: tampil utk welding/press/subcon/IFPD + MATERIAL. CKD saja yang tidak butuh.
const showJobNumber           = computed(() => showModelCustomer.value || isMaterial.value);
// Part Number Delivery: utk WELDING FP (IFPW), SINGLE FINISH, dan INHOUSE/
// OUTHOUSE yg FP (root sub-assy, langsung barang jadi — bukan komponen umpan).
// - WELDING WIP & INHOUSE/OUTHOUSE WIP: komponen umpan, dikelola via
//   attach_wip/link_child / parent picker — tidak punya konsep delivery sendiri.
// - IFPD: dirinya sendiri = delivery, field tidak relevan.
const showPartNumberDelivery  = computed(() =>
  !isCommonForm.value && (                                // COMMON: ada di bagian "Jalur FP"
  isSinglePress.value
  || (isWelding.value && form.value.status_part === 'FP')
  || ((isInhouseComp.value || isOuthouseComp.value) && form.value.status_part === 'FP'))
);
// Job Number Delivery: ikut aturan yg sama dgn showPartNumberDelivery (pasangannya) —
// WELDING WIP juga tidak relevan (dikelola via attach_wip/link_child), bukan cuma INHOUSE/OUTHOUSE.
const showJobNumberDelivery = computed(() => showPartNumberDelivery.value);
const showCkdType      = computed(() => isCkd.value);                           // "Jenis CKD" → kolom ckd_type
const showSupplier     = computed(() => isMaterial.value);                      // supplier pakai kolom vendor
const CKD_TYPES = ['NUT', 'BOLT', 'CLIP', 'SCREW', 'WASHER', 'STUD', 'BRACKET','PIN', 'LAINNYA'];

// ── IFPD Lookup — auto-fill dari majsf_inventory.ms_data_ifp ──
const ifpdLookupLoading = ref(false);
const ifpdLookupFound   = ref(false);

async function onIfpdPartBlur() {
  trimPartNumber();
  const pn = (form.value.part_number || '').trim();
  if (!pn || !isDelivery.value) return;
  ifpdLookupLoading.value = true;
  ifpdLookupFound.value   = false;
  try {
    const d = await masterService.ifpdLookup(pn);
    if (d) {
      // Auto-fill hanya field yang masih kosong (tidak timpa isian user)
      if (!form.value.job_number)   form.value.job_number   = d.job_number   ?? null;
      if (!form.value.part_name)    form.value.part_name    = d.part_name    ?? null;
      if (!form.value.customer_1)   form.value.customer_1   = d.customer     ?? null;
      if (!form.value.model)        form.value.model        = d.project      ?? null;
      if (!form.value.qty_kbn || form.value.qty_kbn === 1) form.value.qty_kbn = d.qty_kbn ?? form.value.qty_kbn;
      // part_number_delivery = dirinya sendiri
      form.value.part_number_delivery = pn;
      ifpdLookupFound.value = true;
    }
  } catch { /* non-fatal */ }
  finally { ifpdLookupLoading.value = false; }
}

// Reset lookup status saat category berubah dari IFPD
watch(isDelivery, (v) => { if (!v) { ifpdLookupFound.value = false; } });

// ── Search dropdown Part Number Delivery → set parent (mother welding) ──
const pndResults = ref<MsWelding[]>([]);
const pndSearching = ref(false);
const pndOpen = ref(false);
let _pndTimer: any = null;
const NON_WELD_AREAS = ['CKD', 'INHOUSE', 'IFPD', 'IFRM', 'OUTHOUSE'];
function isWeldingWip(p: MsWelding): boolean {
  return !!p.is_wip && !NON_WELD_AREAS.includes((p.area || '').trim().toUpperCase());
}
function onPndInput() {
  pndOpen.value = true;
  clearTimeout(_pndTimer);
  const q = (form.value.part_number_delivery || '').trim();
  if (q.length < 2) { pndResults.value = []; return; }
  pndSearching.value = true;
  _pndTimer = setTimeout(async () => {
    try {
      // WELDING FP & SINGLE FINISH: delivery parent harus dari IFPD
      const useIfpdFilter = (isWelding.value && form.value.status_part === 'FP') || isSinglePress.value;
      const params: any = { search: q, per_page: 12, page: 1 };
      if (useIfpdFilter) { params.layer = 'IFPD'; params.status_part = 'FP'; }
      const res = await masterService.getList(params);
      pndResults.value = res.data ?? [];
    } catch { pndResults.value = []; }
    finally { pndSearching.value = false; }
  }, 300);
}
function pndBlur() { setTimeout(() => { pndOpen.value = false; }, 150); }
function pickPnd(p: MsWelding) {
  form.value.part_number_delivery = p.part_number;
  // Komponen (CKD/PRESS/SUBCON/...) → parent = mix part welding-WIP yang dipilih.
  if (!isWelding.value && isWeldingWip(p) && p.part_number_mix) {
    form.value.parent_part_mix = p.part_number_mix;
  }
  pndOpen.value = false;
  pndResults.value = [];
}

// Mesin: SEMUA part WELDING (FP & WIP sama-sama IFPW) — FP tetap dilas di mesin.
// Jig hanya area SA mode ROBOT (SA HMMI; SA ADM mesin RSW/RB). CO robot tanpa jig.
// Jig = slot di mesin → dipilih bareng mesin di AreaMachinePicker, bukan input bebas.
const showMachine = computed(() => isWelding.value);
// Jig: robot CO & SA (SA ADM campur WSS/robot → lihat kode mesin).
const showJig = computed(() => /^(SA|CO) /.test((form.value.area || '').toUpperCase())
  && isRobotSetup(form.value.area, (form.value.machine || '').trim().split(/\s+/)[0]));
watch(showMachine, (v) => { if (!v) form.value.machine = null; });
watch(showJig, (v) => { if (!v) form.value.jig = null; });

// ── Area BARU di form (WSS/CO/SA × plant) — kolom `area` tetap nilai ZONE lama.
// Area dipilih → kalau 1 zone langsung isi; kalau >1 zone (SA ADM) zone diisi
// otomatis dari mesin utama yg dipilih (AreaMachinePicker), atau manual.
const weldingAreasActive = computed(() => weldingAreas.value.filter(a => a.is_active));
const formAreaGroupPending = ref('');
const formAreaGroup = computed<string>({
  get() {
    if (form.value.area) return areaOfZone(form.value.area)?.area_code ?? (weldingAreas.value.some(a => a.area_code === form.value.area) ? form.value.area! : '');
    return formAreaGroupPending.value;
  },
  set(code: string) {
    formAreaGroupPending.value = code;
    const zs = zonesOfArea(code);
    const keep = !!form.value.area && zs.includes(form.value.area);
    if (!keep) { form.value.area = (code && zs.length === 1) ? zs[0] : ''; form.value.machine = null; form.value.machine_alt = null; form.value.jig = null; }
  },
});
const formAreaZones = computed(() => formAreaGroup.value ? zonesOfArea(formAreaGroup.value) : []);

// Picker mesin (denah Area & Mesin) — utama / alternatif. Lihat AreaMachinePicker.vue.
const showMachinePicker = ref(false);
const machinePickerMode = ref<'main' | 'alt'>('main');
function openMachinePicker(mode: 'main' | 'alt') { machinePickerMode.value = mode; showMachinePicker.value = true; }
function onMachinePicked(payload: { machine: string; zone: string | null; total_proses: number; jig: string | null }) {
  if (machinePickerMode.value === 'alt') { form.value.machine_alt = payload.machine || null; return; }
  form.value.machine = payload.machine || null;
  if (payload.zone) form.value.area = payload.zone;
  form.value.jig = payload.jig;
  if (payload.total_proses > 1) form.value.total_proses = payload.total_proses;
}

// Riwayat mesin part ini — dari ms_welding_change_log (field machine / machine_alt / area).
interface MachineHistoryRow { id: number; field_name: string; old_value: string | null; new_value: string | null; changed_by: string; changed_at: string }
const machineHistory = ref<MachineHistoryRow[]>([]);
const machineHistoryLoading = ref(false);
const machineHistoryOpen = ref(false);
async function loadMachineHistory(partId: number | null | undefined) {
  machineHistory.value = []; machineHistoryOpen.value = false;
  if (!partId) return;
  machineHistoryLoading.value = true;
  try {
    const rows = await masterService.getChangeLog({ part_id: partId, limit: 200 });
    machineHistory.value = rows.filter(r => ['machine', 'machine_alt', 'area'].includes(r.field_name));
  } catch { machineHistory.value = []; }
  finally { machineHistoryLoading.value = false; }
}

// Terapkan derivasi ke form (saat auto aktif). Dipanggil saat category/status/area berubah.
function applyDerived() {
  if (isSinglePress.value || isDelivery.value) {
    form.value.status_part = 'FP'; form.value.is_wip = false; form.value.op = null; form.value.parent_part_mix = null;
    // IFPD: part_number_delivery = dirinya sendiri
    if (isDelivery.value) form.value.part_number_delivery = form.value.part_number || null;
  }
  // CKD/MATERIAL tak punya toggle Tipe (showTipeSelect) → statusnya definitif WIP.
  // INHOUSE/OUTHOUSE PUNYA toggle (bisa FP kalau dia root sub-assy) — jangan
  // dipaksa di sini tiap applyDerived() jalan, nanti nimpa pilihan FP user tiap
  // onStatusChange() memanggil applyDerived() lagi. Default WIP-nya di-set sekali
  // saat kategori baru dipilih (lihat onCategoryChange).
  else if (isCkd.value || isMaterial.value) { form.value.status_part = 'WIP'; form.value.is_wip = true; }
  else if (isInhouseComp.value || isOuthouseComp.value) { form.value.is_wip = form.value.status_part === 'WIP'; }
  // OP hanya bermakna untuk transisi DALAM welding (IFPW→IFPW / IFPW→IFPD).
  // Non-welding (mis. INHOUSE/OUTHOUSE → WSS) TIDAK ber-OP → kosongkan agar mix tanpa -OP.
  if (!isWelding.value) form.value.op = null;
  // layer / area (hanya bila auto)
  if (autoConfig.value) {
    form.value.layer = derivedLayer.value;
    if (!isWelding.value) form.value.area = derivedArea.value;
  }
  syncSourceDependents();
}
function toggleAutoConfig() { autoConfig.value = !autoConfig.value; if (autoConfig.value) applyDerived(); }

// Berapa slot customer yang tampil (1–3); plus untuk menambah.
const customerSlots = ref(1);
function customerSlotsFromForm(): number {
  if (form.value.customer_3) return 3;
  if (form.value.customer_2) return 2;
  return 1;
}
function addCustomer() { if (customerSlots.value < 3) customerSlots.value++; }
function removeLastCustomer() {
  if (customerSlots.value >= 3) { form.value.customer_3 = null; customerSlots.value = 2; }
  else if (customerSlots.value === 2) { form.value.customer_2 = null; customerSlots.value = 1; }
}

// Berapa slot supplier yang tampil (1–3) — supplier cadangan/alternatif
// (mis. supplier utama kosong stok, atau order dipecah ke 2+ supplier).
const supplierSlots = ref(1);
function supplierSlotsFromForm(): number {
  if (form.value.vendor_3) return 3;
  if (form.value.vendor_2) return 2;
  return 1;
}
function addSupplier() { if (supplierSlots.value < 3) supplierSlots.value++; }
function removeLastSupplier() {
  if (supplierSlots.value >= 3) { form.value.vendor_3 = null; supplierSlots.value = 2; }
  else if (supplierSlots.value === 2) { form.value.vendor_2 = null; supplierSlots.value = 1; }
}

// Kosongkan field turunan yang tidak relevan dengan category aktif.
function syncSourceDependents() {
  if (!showLinePress.value) form.value.line_press = null;
  if (!showVendor.value) form.value.vendor = null;
}

// Pagination slot TETAP (7) — jumlah & lebar tombol sama di tiap halaman, jadi tombol tak
// bergeser saat pindah halaman (pola standar: 1 2 3 4 5 … N · 1 … c-1 c c+1 … N · 1 … N-4..N).
const paginationPages = computed<(number | '...')[]>(() => {
  const total = lastPage.value, cur = currentPage.value;
  const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  if (total <= 7) return range(1, total);
  if (cur <= 4) return [...range(1, 5), '...', total];
  if (cur >= total - 3) return [1, '...', ...range(total - 4, total)];
  return [1, '...', cur - 1, cur, cur + 1, '...', total];
});

async function loadAreas() {
  areas.value = await masterService.getAreas();
}
// Area untuk category WELDING = hanya area layer IFPW (dari LAYER_CONFIG, single source of truth)
const weldingAreaOptions = computed<string[]>(() => {
  const ifpw = LAYER_CONFIG.find(l => l.key === 'IFPW');
  return ifpw ? ifpw.subs.map(s => s.key) : [];
});
let loadStatsSeq = 0;
async function loadStats() {
  const seq = ++loadStatsSeq;
  try {
    const res = await masterService.getStats(
      (isIfpdLayer.value || isIfpwAreaSel.value) ? null : selectedSubArea.value,
      (crossLayerArea.value || tabAreaGroup.value.length) ? null : selectedLayer.value,
      tabAreaGroup.value.length ? tabAreaGroup.value.join(',') : null,
    );
    if (seq !== loadStatsSeq) return; // basi, sama spt guard di loadList
    stats.value = res;
  } catch (e: any) {
    if (seq !== loadStatsSeq) return;
    console.error('loadStats error:', e?.response?.status, e?.response?.data ?? e?.message ?? e);
  }
}
// Token urutan request — ganti tab/filter cepat-cepat bisa bikin request LAMA
// (mis. tab IFPW, dataset lebih besar → lebih lambat) baru selesai SETELAH
// request BARU (tab IFPP, lebih cepat), lalu menimpa rows.value dgn hasil basi
// (race condition) — part yg sudah difilter-benar oleh request baru jadi
// "muncul lagi" krn hasil tab sebelumnya nyelonong belakangan. Guard: hanya
// response dari request TERBARU yg boleh menulis ke rows.value/totalRows.
// Param filter list AKTIF (layer/sub-area/FP-WIP/status/search/kolom) — dipakai
// loadList() dan komparasi part (PartCompareModal) supaya keduanya lihat dataset sama.
function activeListFilters(): Partial<MsWeldingListParams> {
  return {
    layer:         (crossLayerArea.value || tabAreaGroup.value.length) ? null : selectedLayer.value,
    area:          (isIfpdLayer.value || isIfpwAreaSel.value) ? null : selectedSubArea.value,
    areas:         tabAreaGroup.value.length ? tabAreaGroup.value.join(',') : null,
    ifpd_group:    isIfpdLayer.value ? (selectedSubArea.value as any) : null,
    is_wip:        filterWip.value,
    search:        searchQuery.value || null,
    hide_obsolete: filterStatus.value === 'active'   ? 1 : 0,
    only_obsolete: filterStatus.value === 'obsolete' ? 1 : 0,
    variant_mode:  variantMode.value,
    ...colParams(),
  };
}
// Label ringkas filter aktif utk judul modal komparasi.
const activeFilterLabel = computed(() => {
  const parts: string[] = [selectedLayer.value || 'Semua layer'];
  if (selectedSubArea.value) parts.push(selectedSubArea.value);
  parts.push(filterWip.value === 0 ? 'FP' : filterWip.value === 1 ? 'WIP' : 'FP+WIP');
  parts.push(filterStatus.value === 'active' ? 'Aktif' : filterStatus.value === 'obsolete' ? 'Nonaktif' : 'Semua status');
  if (variantMode.value !== 'hide') parts.push(variantMode.value === 'only' ? 'hanya varian' : '+ varian');
  if (searchQuery.value) parts.push(`cari "${searchQuery.value}"`);
  if (hasActiveFilters.value) parts.push('filter kolom');
  return parts.join(' · ');
});
const compareOpen = ref(false);
// Default "Tambah ke master" di modal komparasi — mengikuti layer/sub-area/FP-WIP aktif.
const compareAddDefaults = computed(() => {
  const layer = selectedLayer.value || null;
  const sub = selectedSubArea.value || '';
  const wip = filterWip.value === 1 ? 'WIP' : filterWip.value === 0 ? 'FP' : null;
  switch (layer) {
    case 'IFPD': return { layer, category: 'IFPD', area: 'IFPD', status_part: (wip ?? 'FP') as 'FP' | 'WIP' };
    case 'IFPP': return { layer, category: sub === 'OUTHOUSE' ? 'OUTHOUSE' : 'INHOUSE', area: sub === 'OUTHOUSE' ? 'OUTHOUSE' : 'INHOUSE', status_part: (wip ?? 'WIP') as 'FP' | 'WIP' };
    case 'IFPW': return { layer, category: 'WELDING', area: isIfpwAreaSel.value && selectedAreaZones.value.length === 1 ? selectedAreaZones.value[0] : '', status_part: (wip ?? 'FP') as 'FP' | 'WIP' };
    case 'IFRM': return { layer, category: 'MATERIAL', area: 'IFRM', status_part: (wip ?? 'WIP') as 'FP' | 'WIP' };
    case 'CKD':  return { layer, category: 'CKD', area: 'INTEGRATED WAREHOUSE', status_part: (wip ?? 'WIP') as 'FP' | 'WIP' };
    default:     return { layer: null, category: '', area: '', status_part: 'FP' as 'FP' | 'WIP' };
  }
});

let loadListSeq = 0;
async function loadList(page = 1) {
  const seq = ++loadListSeq;
  loading.value = true;
  currentPage.value = page;
  closeRowMenu(); // dataset ganti — menu row yg lagi kebuka jadi gak relevan
  try {
    const res = await masterService.getList({
      page:     page,
      per_page: perPage.value,
      sort_by:  sortBy.value,
      sort_dir: sortDir.value,
      ...activeListFilters(),
    });
    if (seq !== loadListSeq) return; // response basi (request lebih baru sudah nyusul) — buang
    suppressRowAnim.value = true; // bulk swap — matikan animasi TransitionGroup dulu
    rows.value      = res.data;
    totalRows.value = res.total;
    lastPage.value  = res.last_page;
    await nextTick();
    suppressRowAnim.value = false; // nyalakan lagi utk perubahan 1 baris berikutnya (socket)
  } catch (e: any) {
    if (seq !== loadListSeq) return; // request lebih baru sudah nyusul — abaikan error request basi
    // JANGAN biarkan rows.value lama nyangkut kalau request GAGAL — kalau tidak,
    // tabel kelihatan "salah filter" padahal sebenarnya cuma nampilin hasil tab
    // SEBELUMNYA yg gagal ke-replace (silent error).
    console.error('loadList error:', e?.response?.status, e?.response?.data ?? e?.message ?? e);
    suppressRowAnim.value = true;
    rows.value      = [];
    totalRows.value = 0;
    await nextTick();
    suppressRowAnim.value = false;
  } finally {
    if (seq === loadListSeq) loading.value = false;
  }
}
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadList(1), 400);
}
function toggleSort(col: typeof sortBy.value) {
  if (sortBy.value === col) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = col;
    sortDir.value = 'asc';
  }
  loadList(1);
}
function sortIcon(col: string) {
  if (sortBy.value !== col) return 'mdi-unfold-more-horizontal';
  return sortDir.value === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down';
}
function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const date = new Date(d);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} hr lalu`;
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
}

// Kolom per kategori — HARUS selaras dgn Welding_master.php::_column_groups().
// Dipakai hanya utk highlight header dikenali/tidak di preview paste (kosmetik);
// pemetaan sebenarnya tetap dilakukan server-side (satu sumber kebenaran).
const UPLOAD_KEY_COLUMNS = ['part_number', 'part_number_mix', 'area', 'layer']; // kunci pencocokan baris; layer=IFPD → hanya cocok ke baris IFPD
interface UploadCategory { key: string; label: string; icon: string; columns: string[]; shortcut: string }
const uploadCategories: UploadCategory[] = [
  { key: 'identitas', label: 'Update Data Identitas Part', icon: 'mdi-card-account-details-outline', shortcut: '1', columns: [
    'part_number', 'part_number_mix', 'area', 'layer', 'job_number_delivery', 'part_number_delivery',
    'job_number', 'alias', 'part_name', 'category', 'op', 'parent_part_mix',
    'is_wip', 'status_part', 'is_runout', 'runout_date',
  ] },
  { key: 'produksi', label: 'Update Data Produksi', icon: 'mdi-cog-outline', shortcut: '2', columns: [
    'part_number', 'part_number_mix', 'area', 'layer',
    'stroke_mili_spot', 'uph', 'cycle_time_sec', 'qty_kbn', 'lot_cycle', 'qty_unit', 'stock',
  ] },
  { key: 'model_customer', label: 'Update Data Model Customer', icon: 'mdi-car-outline', shortcut: '3', columns: [
    'part_number', 'part_number_mix', 'area', 'layer',
    'model', 'car_name', 'customer_1', 'customer_2', 'customer_3',
  ] },
  { key: 'mesin_area', label: 'Update Mesin & Area', icon: 'mdi-factory', shortcut: '4', columns: [
    'part_number', 'part_number_mix', 'area', 'layer', 'line_press', 'vendor', 'vendor_2', 'vendor_3', 'machine', 'jig',
  ] },
];

const uploadMenuOpen = ref(false);
const uploadCategory = ref<UploadCategory | null>(null);
const uploadModal = ref<{ open: boolean }>({ open: false });
const pasteText = ref('');
const pasting = ref(false);

function parsePasteGrid(text: string): string[][] {
  return text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => line.split('\t'));
}
const pasteGrid = computed(() => parsePasteGrid(pasteText.value));
const pasteHeaders = computed(() => pasteGrid.value[0] ?? []);
const pasteDataRows = computed(() => pasteGrid.value.slice(1));
function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/ /g, '_');
}
function isHeaderRecognized(h: string): boolean {
  const cols = uploadCategory.value?.columns ?? [];
  return cols.includes(normalizeHeader(h));
}
const hasRecognizedHeader = computed(() => pasteHeaders.value.some(h => isHeaderRecognized(h)));

function openUploadModal(cat: UploadCategory | null = null) {
  if (pasting.value) return;
  uploadCategory.value = cat;
  pasteText.value = '';
  uploadModal.value = { open: true };
}
// Tombol "Tempel dari Clipboard" — alternatif Ctrl+V manual (mis. utk user yg kurang
// familiar shortcut). Clipboard API butuh secure context (HTTPS/localhost); di HTTP
// biasa (mis. akses via IP LAN) browser modern akan menolak readText() → fallback:
// fokuskan textarea & minta user Ctrl+V manual.
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) { pasteText.value = text; return; }
  } catch {
    // fallthrough ke fallback di bawah
  }
  alertDialog('Tidak bisa mengambil clipboard otomatis (browser/izin/koneksi HTTP). Klik kotak tempel di bawah lalu tekan Ctrl+V.');
}
// Semua jalan keluar (Esc, X, klik overlay, tombol Kembali) dari sub-menu paste
// balik ke Menu Aplikasi (home), bukan tutup semua sekaligus — karena modal ini
// dibuka DARI Menu Aplikasi (bukan langsung dari toolbar).
function backToUploadMenu() {
  if (pasting.value) return;
  uploadModal.value.open = false;
  uploadMenuOpen.value = true;
}
async function confirmPasteUpdate() {
  if (pasting.value || pasteGrid.value.length < 2 || !hasRecognizedHeader.value) return;
  pasting.value = true;
  uploadResult.value = null;
  try {
    const res = await masterService.pasteUpdate(pasteGrid.value, uploadCategory.value?.key);
    uploadResult.value = res;
    if (res.success) {
      loadList(1);
      loadStats();
      // Beberapa part pindah area lewat paste bulk → refresh planning semua
      // area yg kena (lama+baru, dedup) di background (fitur "pindah area").
      if (res.changed_areas?.length) void refreshAreasInBackground(res.changed_areas, 'paste_bulk');
    }
  } catch (err: any) {
    uploadResult.value = { success: false, message: err?.response?.data?.message ?? 'Gagal update.' };
  } finally {
    pasting.value = false;
    uploadModal.value.open = false;
  }
}

// ════════════════════════════════════════════════════════════════
//  Tree interaktif: drag-n-drop re-parent + tambah komponen (IFPP/CKD)
// ════════════════════════════════════════════════════════════════
const treeDrag = ref<{ id: number; mix: string; parentId: number | null } | null>(null);

function findNodeById(node: MsWeldingTreeNode | null | undefined, id: number): MsWeldingTreeNode | null {
  if (!node) return null;
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const r = findNodeById(c, id);
    if (r) return r;
  }
  return null;
}
function descendantMixes(node: MsWeldingTreeNode): Set<string> {
  const set = new Set<string>();
  const walk = (n: MsWeldingTreeNode) => {
    for (const c of n.children ?? []) { if (c.part_number_mix) set.add(c.part_number_mix); walk(c); }
  };
  walk(node);
  return set;
}
// CKD/INHOUSE/OUTHOUSE = komponen terminal (nut/bolt, part press) — cuma boleh
// dipasang ke rakitan WELDING (langsung ke line las), bukan ke sesama komponen
// terminal lain (mis. nut tak bisa "dipasang" ke bracket outhouse).
const DROP_TARGET_RESTRICTED = ['CKD', 'INHOUSE', 'OUTHOUSE'];
function canTreeDrop(target: MsWeldingTreeNode): boolean {
  const d = treeDrag.value;
  if (!d || !target.id || target.id === d.id) return false;
  // Dulu ada juga cek `target.part_number_mix === d.mix` di sini (maksudnya
  // cegah drop ke diri sendiri) — tapi part_number_mix BISA duplikat lintas
  // baris fisik berbeda (persis kasus baris kembar OUTHOUSE/WSS MMKI yg mau
  // digabung lewat drag ini), jadi itu salah blokir drag yg justru valid.
  // id===id di atas sudah cukup & benar utk cegah drop-ke-diri-sendiri.
  const dragged = findNodeById(treeData.value?.node, d.id);
  if (dragged && descendantMixes(dragged).has(target.part_number_mix)) return false; // cegah siklus
  if (dragged?.category && DROP_TARGET_RESTRICTED.includes(dragged.category) && target.category !== 'WELDING') {
    return false;
  }
  return true;
}
// Setelah BOM/relasi berubah (verifikasi, link/putus, drag-drop, Children/Mother by SAP):
// muat ulang SEMUA hierarki yg sedang terbuka (modal Hierarki, detail mobile, tab
// Children/Mother di detail part) lalu kabari client lain lewat socket supaya tree
// mereka ikut segar tanpa tutup-buka modal. Dulu cuma satu sumber yg di-refresh.
async function refreshTreeData() {
  await refreshOpenTrees();
  socket.emit('welding_master_updated', { action: 'tree' });
}
async function refreshOpenTrees() {
  const jobs: Promise<unknown>[] = [];
  if (treeData.value?.entry_id) {
    const id = treeData.value.entry_id;
    jobs.push(masterService.getTree(id).then(t => { if (treeData.value?.entry_id === id) treeData.value = t; }));
  }
  if (detailTreeData.value?.entry_id) {
    const id = detailTreeData.value.entry_id;
    jobs.push(masterService.getTree(id).then(t => { if (detailTreeData.value?.entry_id === id) detailTreeData.value = t; }));
  }
  if (specModal.value.open && specTreeData.value && specModal.value.row?.id) {
    const id = specModal.value.row.id;   // tanpa spinner (loadSpecTree) → tree tak berkedip
    jobs.push(masterService.getTree(id).then(t => { if (specModal.value.row?.id === id) specTreeData.value = t; }));
  }
  await Promise.allSettled(jobs);
}
// Event 'tree' dari client lain: digabung (debounce) — satu aksi bisa memicu beberapa event.
let treeSyncTimer = 0;
function onRemoteTreeChange() {
  clearTimeout(treeSyncTimer);
  treeSyncTimer = window.setTimeout(refreshOpenTrees, 400);
}

const treeCtx = {
  // parentId = id parent LANGSUNG node ini di render tree saat ini (dikirim
  // TreeNode.vue via startDrag(node, parentId)) — dipakai utk tahu relasi
  // MANA yg harus diputus (bukan "putus semua parent", krn WIP bisa multi-mother).
  startDrag: (n: MsWeldingTreeNode, parentId?: number | null) => {
    if (n.id) treeDrag.value = { id: n.id, mix: n.part_number_mix, parentId: parentId ?? null };
  },
  endDrag: () => { treeDrag.value = null; },
  canDrop: (target: MsWeldingTreeNode) => canTreeDrop(target),
  drop: async (target: MsWeldingTreeNode) => {
    const d = treeDrag.value;
    treeDrag.value = null;
    if (!d || !target.id) return;
    const dragged = findNodeById(treeData.value?.node, d.id);
    if (dragged && descendantMixes(dragged).has(target.part_number_mix)) return;
    if (dragged?.category && DROP_TARGET_RESTRICTED.includes(dragged.category) && target.category !== 'WELDING') {
      alertDialog(`${dragged.category} hanya bisa dipasang ke rakitan WELDING, bukan ke "${target.part_number}" (${target.category ?? '—'}).`);
      return;
    }
    if (!await confirmDialog(`Pindahkan "${dragged?.part_number ?? '?'}" menjadi anak dari "${target.part_number}"?`)) return;
    try {
      // Reparent = putus relasi LAMA (spesifik by id, bukan by mix — mix bisa
      // duplikat lintas baris) + tautkan ke parent BARU. Dulu pakai kolom
      // legacy parent_part_mix (string) yg TIDAK dibaca lagi oleh tree
      // (get_tree/_children_recursive sudah full id-based via ms_welding_parents
      // sejak migrasi awal sesi ini) — makanya drag kelihatan "gak ngefek".
      if (d.parentId) {
        const detachRes = await masterService.detachParent(d.id, d.parentId);
        if (!detachRes.success) { alertDialog(detachRes.message); return; }
      }
      const linkRes = await masterService.linkChild(d.id, target.id);
      if (linkRes.success) { await refreshTreeData(); loadList(currentPage.value); }
      else alertDialog(linkRes.message);
    } catch (e: any) { alertDialog(e?.response?.data?.message ?? 'Gagal memindahkan parent.'); }
  },
  addChild: (n: MsWeldingTreeNode) => openAddChild(n),
  editNode: async (n: MsWeldingTreeNode) => {
    if (!n.id) return;
    try {
      const row = await masterService.getDetail(n.id);
      if (row) openEditModal(row);
      else alertDialog('Data part tidak ditemukan.');
    } catch (e: any) { alertDialog(e?.response?.data?.message ?? 'Gagal memuat data part.'); }
  },
  onReject: (target: MsWeldingTreeNode) => {
    const d = treeDrag.value;
    treeDrag.value = null;
    if (!d) return;
    const dragged = findNodeById(treeData.value?.node, d.id);
    if (target.id === d.id) return;
    if (dragged && descendantMixes(dragged).has(target.part_number_mix)) {
      alertDialog(`Tidak bisa: "${target.part_number}" adalah turunan dari node ini (akan membentuk loop).`);
    }
  },
  deleteNode: async (n: MsWeldingTreeNode, parentId?: number | null) => {
    if (!n.id) return;
    const kids = n.children?.length ?? 0;
    const motherCount = n.mother_count ?? 0;
    // Part fisik ini dipakai di >1 mother (multi-parent, mis. WIP outhouse yg
    // sama dipasang di beberapa assembly) → "Hapus" di sini cuma boleh MELEPAS
    // relasi dari cabang yg sedang dilihat, BUKAN hapus data permanen (data
    // masih dipakai mother lain). Kalau cuma 1 mother (atau tanpa parentId,
    // mis. dipanggil dari konteks lain), baru betul2 hard-delete.
    if (parentId && motherCount > 1) {
      const msg = `"${n.part_number}" terpasang di ${motherCount} mother berbeda. Hapus di sini hanya akan MELEPAS relasi dari cabang ini — data part tetap ada & tetap terpasang di mother lain. Lanjutkan?`;
      if (!await confirmDialog(msg)) return;
      try {
        const res = await masterService.detachParent(n.id, parentId);
        if (res.success) { await refreshTreeData(); loadList(currentPage.value); }
        else alertDialog(res.message);
      } catch (e: any) { alertDialog(e?.response?.data?.message ?? 'Gagal melepas relasi.'); }
      return;
    }
    const msg = kids > 0
      ? `Hapus "${n.part_number}"? Node ini punya ${kids} anak yang akan ikut terlepas dari hierarki (parent-nya menggantung).`
      : `Hapus komponen "${n.part_number}" dari master secara permanen?`;
    if (!await confirmDialog(msg)) return;
    try {
      const res = await masterService.hardDelete(n.id);
      if (res.success) { await refreshTreeData(); loadList(currentPage.value); }
      else alertDialog(res.message);
    } catch (e: any) { alertDialog(e?.response?.data?.message ?? 'Gagal menghapus.'); }
  },
  // Lepas komponen dari BOM induk ini saja (relasi ms_welding_parents) — part tetap ada &
  // tetap terpasang di induk lain. Beda dgn "Hapus part" (hapus data part).
  detachNode: async (n: MsWeldingTreeNode, parentId: number, parentPn: string | null) => {
    if (!n.id) return;
    if (!await confirmDialog(`Lepas "${n.part_number}" dari BOM ${parentPn ?? 'induk ini'}? Part tetap ada di master.`)) return;
    try {
      const res = await masterService.detachParent(n.id, parentId);
      if (res.success) { await refreshTreeData(); loadList(currentPage.value); }
      else alertDialog(res.message);
    } catch (e: any) { alertDialog(e?.response?.data?.message ?? 'Gagal melepas komponen.'); }
  },
  showSpec: (n: MsWeldingTreeNode) => openSpecModal(n),
  // "Buka Hierarki di sini" — Children/Mother by SAP selalu di-scope ke entry
  // tree yg lagi terbuka, jadi utk cek BOM node LAIN (mother/child manapun,
  // bukan cuma anak langsung) perlu ganti entry-nya dulu. openTree() aman
  // dipanggil ulang selagi modal udah kebuka (cuma reset state & fetch baru).
  openTreeAt: (n: MsWeldingTreeNode) => { if (n.id) openTree(n.id, n.part_number); },
  verifyBom: (n: MsWeldingTreeNode) => { bomVerifyPart.value = n.part_number; },
  onRelationChanged: () => { refreshTreeData(); loadList(currentPage.value); },
};
provide('treeCtx', treeCtx);

// Verifikasi BOM per part_number — tanda ikut di semua tree yg memakai part itu.
const bomVerifyPart = ref<string | null>(null);
// Info Cepat part (fase 0 AI Agent — angka pasti tanpa LLM), lihat PartInsightPanel.vue.
const insightPart = ref<string | null>(null);

// ── Modal tambah komponen ──
const addChildModal = ref<{ open: boolean; parent: MsWeldingTreeNode | null }>({ open: false, parent: null });
const addChildMode = ref<'existing' | 'new'>('existing');
const addChildType = ref<'IFPP' | 'CKD'>('CKD');
const addChildSearch = ref('');
const addChildResults = ref<MsWelding[]>([]);
const addChildSelected = ref<MsWelding | null>(null);
const addChildForm = ref<{ part_number: string; part_name: string; alias: string }>({ part_number: '', part_name: '', alias: '' });
const addChildSaving = ref(false);
const addChildSearching = ref(false);
const addChildError = ref<string | null>(null);
let _addSearchTimer: any = null;

function openAddChild(node: MsWeldingTreeNode) {
  addChildModal.value = { open: true, parent: node };
  addChildMode.value = 'existing';
  addChildType.value = 'CKD';
  addChildSearch.value = '';
  addChildResults.value = [];
  addChildSelected.value = null;
  addChildForm.value = { part_number: '', part_name: '', alias: '' };
  addChildError.value = null;
}
function onAddChildSearch() {
  clearTimeout(_addSearchTimer);
  addChildSelected.value = null;
  const q = addChildSearch.value.trim();
  if (q.length < 2) { addChildResults.value = []; return; }
  addChildSearching.value = true;
  _addSearchTimer = setTimeout(async () => {
    try {
      const res = await masterService.getList({ search: q, per_page: 15, page: 1 });
      addChildResults.value = res.data ?? [];
    } catch { addChildResults.value = []; }
    finally { addChildSearching.value = false; }
  }, 300);
}
function typeFields(t: 'IFPP' | 'CKD') {
  return t === 'IFPP'
    ? { area: 'INHOUSE', layer: 'IFPP', category: 'INHOUSE' as const }
    : { area: 'CKD', layer: null, category: 'CKD' as const };
}
async function saveAddChild() {
  const parent = addChildModal.value.parent;
  if (!parent) return;
  addChildError.value = null;
  let payload: Partial<MsWelding>;

  if (addChildMode.value === 'existing') {
    // Part SUDAH ADA → cukup TAUTKAN sbg child (relasi baru), jangan buat baris salinan.
    // Dulu memanggil create() → ditolak "part number mix sudah dipakai" (1 part fisik = 1 baris).
    const s = addChildSelected.value;
    if (!s?.id) { addChildError.value = 'Pilih part dari hasil pencarian dulu.'; return; }
    if (!parent.id) { addChildError.value = 'Parent tidak valid.'; return; }
    addChildSaving.value = true;
    try {
      const res = await masterService.linkChild(s.id, parent.id);
      if (!res.success) { addChildError.value = res.message; return; }
      addChildModal.value.open = false;
      await refreshTreeData();
      loadList(currentPage.value);
    } catch (e: any) {
      addChildError.value = e?.response?.data?.message ?? 'Gagal menautkan komponen.';
    } finally {
      addChildSaving.value = false;
    }
    return;
  } else {
    const pn = addChildForm.value.part_number.trim();
    if (!pn) { addChildError.value = 'Part number wajib diisi.'; return; }
    const tf = typeFields(addChildType.value);
    payload = {
      part_number: pn,
      part_number_mix: pn,
      part_name: addChildForm.value.part_name.trim() || null,
      alias: addChildForm.value.alias.trim() || null,
      ...tf,
      model: parent.model, car_name: parent.car_name,
      customer_1: parent.customer_1, customer_2: parent.customer_2, customer_3: parent.customer_3,
      is_wip: true, status_part: 'WIP',
      parent_part_mix: parent.part_number_mix,
    };
  }

  addChildSaving.value = true;
  try {
    const res = await masterService.create(payload);
    if (!res.success) { addChildError.value = res.message; return; }
    addChildModal.value.open = false;
    await refreshTreeData();
    loadList(currentPage.value);
  } catch (e: any) {
    addChildError.value = e?.response?.data?.message ?? 'Gagal menambah komponen.';
  } finally {
    addChildSaving.value = false;
  }
}

async function openTree(id: number, partNumber = '') {
  treeModal.value = { open: true, label: `ID #${id}`, partNumber, activeTab: 'children' };
  treeEditMode.value = false;
  treeData.value    = null;
  treeLoading.value = true;
  bomData.value       = [];
  bomSyncResult.value = null;
  lgortOverride.value = tabLgort(); // default ikut tab aktif; '' = Auto (backend derive dari category)
  try {
    treeData.value = await masterService.getTree(id);
    if (treeData.value) {
      const n = treeData.value.node;
      treeModal.value.label      = n.job_number || n.part_number || `ID #${id}`;
      treeModal.value.partNumber = n.part_number || partNumber;
      // Muat BOM tersimpan agar perbandingan 2-step vs 1-step siap di tab Hierarki.
      loadBom();
      // Pre-warm cache BOM SAP di background — supaya Reconcile instan saat diklik.
      masterService.prewarmSap(treeModal.value.partNumber);
    }
  } finally {
    treeLoading.value = false;
  }
}

async function loadBom() {
  if (!treeModal.value.partNumber) return;
  bomLoading.value = true;
  try {
    bomData.value = await masterService.getBom(treeModal.value.partNumber);
  } catch (e) {
    console.error('loadBom error:', e);
  } finally {
    bomLoading.value = false;
  }
}

// User ganti LGORT manual (select "Auto"/2200/2202/2300) — langsung re-fetch
// pakai LGORT baru (force, skip cache lama yg masih pakai LGORT sebelumnya).
function onLgortOverrideChange() {
  if (treeModal.value.activeTab === 'bom') doSyncBom();
  else openReconcile(true);
}

async function doSyncBom() {
  if (!treeModal.value.partNumber || bomSyncing.value) return;
  bomSyncing.value    = true;
  bomSyncResult.value = null;
  try {
    // id entry yg lagi dibuka (tree modal desktop ATAU detail modal mobile) — kirim
    // supaya backend resolve LGORT dari layer BARIS SPESIFIK ini, bukan tebak dari
    // part_number saja (part_number bisa dipakai >1 baris fisik lintas layer/mix,
    // tebakan bisa salah pilih baris IFPD/IFPW alih-alih IFPP yg dimaksud).
    const id = treeData.value?.entry_id ?? detailTreeData.value?.entry_id ?? undefined;
    const result = await masterService.syncBom(treeModal.value.partNumber, lgortOverride.value || undefined, id);
    if (result.success) {
      bomSyncResult.value = {
        inserted:  result.inserted,
        updated:   result.updated,
        synced_at: result.synced_at,
      };
      bomData.value = await masterService.getBom(treeModal.value.partNumber);
    }
  } catch (e) {
    console.error('doSyncBom error:', e);
  } finally {
    bomSyncing.value = false;
  }
}

// ── Perbandingan 2-step (hierarki ms_welding) vs 1-step (BOM SAP), level-1 ──
// Bandingkan anak LANGSUNG entry node dengan child_matnr BOM SAP tersimpan.
type CompareStatus = 'match' | 'master_only';
// Normalisasi part number untuk pencocokan SAP↔master:
//  - uppercase + trim
//  - akhiran "-00" (spec/warna default) dianggap opsional, krn SAP sering memangkasnya
//    (mis. SAP "53821-BZ020" = master "53821-BZ020-00").
const _normPart = (s?: string | null) => (s ?? '').trim().toUpperCase().replace(/-00$/, '');

// LGORT → label layer, biar footer info dinamis (bukan hardcode "2202 · Welding").
const LGORT_LAYER_LABEL: Record<string, string> = { '2200': 'IFPP', '2202': 'Welding', '2300': 'IFPD' };
const _lgortLabel = (lgort?: string | null) => lgort ? `LGORT ${lgort}${LGORT_LAYER_LABEL[lgort] ? ' · ' + LGORT_LAYER_LABEL[lgort] : ''}` : 'LGORT —';

// SAP 1-step memberi BOM DATAR (semua komponen FP jadi anak langsung), sedangkan
// master 2-step menyebar komponen ke banyak level (OP, sub-WIP). Maka komponen SAP
// dicocokkan ke SELURUH subtree master (semua keturunan, kedalaman berapa pun) —
// bukan hanya anak langsung. Yang benar-benar tak ada di mana pun = "hanya SAP".
function collectSubtree(entryNode: MsWeldingTreeNode): { set: Set<string>; nodes: MsWeldingTreeNode[] } {
  const set = new Set<string>();
  const nodes: MsWeldingTreeNode[] = [];
  const seen = new Set<string | number>();
  const walk = (n: MsWeldingTreeNode) => {
    for (const c of n.children ?? []) {
      const key = c.part_number_mix || c.id || c.part_number;
      if (seen.has(key)) continue;
      seen.add(key);
      set.add(_normPart(c.part_number));
      nodes.push(c);
      walk(c);
    }
  };
  walk(entryNode);
  return { set, nodes };
}

const bomCompare = computed(() => {
  const out = {
    hasBom: false,
    map: {} as Record<string, CompareStatus>,
    sapOnly: [] as WeldingBomItem[],
    matchCount: 0,
    masterOnly: 0,
    masterSet: new Set<string>(),   // SEMUA part_number di subtree master (cek arah SAP→master)
  };
  const node = treeData.value?.node;
  if (!node || bomData.value.length === 0) return out;
  out.hasBom = true;

  const { set: subtree, nodes } = collectSubtree(node);
  out.masterSet = subtree;
  const sapSet = new Set(bomData.value.map((b) => _normPart(b.child_matnr)));

  // Badge SAP✓ pada node master mana pun (kedalaman berapa pun) yg cocok komponen SAP
  for (const n of nodes) {
    if (sapSet.has(_normPart(n.part_number))) out.map[n.part_number] = 'match';
  }
  // cocok = komponen SAP yang ketemu di subtree; hanya SAP = yang tak ketemu di mana pun.
  // SCRAP TIDAK lagi dikecualikan — sejak SCRAP jadi entri master data penuh
  // (kategori SCRAP tersendiri), dia harus ikut dihitung match/mismatch spt
  // komponen fisik lain, bukan diam-diam disembunyikan dari perbandingan.
  out.matchCount = bomData.value.filter((b) => subtree.has(_normPart(b.child_matnr))).length;
  out.sapOnly    = bomData.value.filter((b) => !subtree.has(_normPart(b.child_matnr)));
  return out;
});

// ── Rekonsiliasi ms_welding ↔ BOM SAP (preview + apply) ──
const reconcileModal = ref<{ open: boolean }>({ open: false });
const reconcileLoading = ref(false);
const reconcileApplying = ref(false);
const reconcileError = ref<string | null>(null);
const reconcileData = ref<ReconcilePreview | null>(null);
const reconcilePendingMsg = ref<string | null>(null);
const reconcileElapsed = ref(0);
const reconcileFromCache = ref(false);
const reconcileStale = ref(false);
const reconcileStaleH = ref<number | null>(null);
let reconcileCancelled = false;
let reconcileEs: EventSource | null = null;
let reconcileTimer: ReturnType<typeof setInterval> | null = null;

// ── Override dialog ────────────────────────────────────────────
const overrideDialog = ref<{
  open: boolean; partNumber: string; category: string; area: string; note: string; saving: boolean
}>({ open: false, partNumber: '', category: '', area: '', note: '', saving: false })

function openOverrideDialog(add: any) {
  overrideDialog.value = {
    open: true,
    partNumber: add.part_number,
    category:    add.category    ?? '',
    area:        add.area        ?? '',
    note:        '',
    saving: false,
  }
}
async function saveOverride() {
  const d = overrideDialog.value
  if (!d.partNumber) return
  d.saving = true
  try {
    const res = await masterService.saveClassifyOverride(d.partNumber, {
      category:    d.category    || null,
      area:        d.area        || null,
      note:        d.note        || null,
    })
    if (res.success) overrideDialog.value.open = false
    else alertDialog(res.message)
  } finally { d.saving = false }
}
// Pilihan user: set part_number untuk add, set id untuk update/re-parent (default semua tercentang)
const addChecked = ref<Set<string>>(new Set());
const lnkChecked = ref<Set<number>>(new Set());
const updChecked = ref<Set<number>>(new Set());
const repChecked = ref<Set<number>>(new Set());
const pressChecked = ref<Set<string>>(new Set());

// "Mother by SAP" — kebalikan dari BOM/"Children by SAP": cari assembly yg
// MEMAKAI part yg sedang dibuka (where-used, RFC Z_PUD/ZCS15). Kandidat yg
// sudah ada di master bisa langsung di-LINK (reuse endpoint link_child, sama
// dgn drag&drop reparent); yg belum ada di master perlu ditambah manual dulu
// (di luar scope MVP — beda dgn Children by SAP yg bisa auto-tambah).
const motherBySapModal = ref({
  open: false,
  loading: false,
  linkingKey: null as string | null,
  error: null as string | null,
  pending: false,
  pendingMsg: null as string | null,
  stale: false,
  staleH: null as number | null,
  partNumber: '',
  candidates: [] as MotherBySapCandidate[],
});
let motherBySapTimer: ReturnType<typeof setTimeout> | null = null;
// Kandidat yg PUNYA match di master (bisa langsung di-Link) ditaruh paling atas
// — itu yg actionable, yg "belum ada di master" cuma informasi, gak perlu
// rebutan perhatian dgn yg beneran bisa diklik.
const motherBySapSorted = computed(() =>
  [...motherBySapModal.value.candidates].sort((a, b) => (b.matches.length > 0 ? 1 : 0) - (a.matches.length > 0 ? 1 : 0))
);
const motherBySapSummary = computed(() => {
  const cands = motherBySapModal.value.candidates;
  const linkable = cands.filter(c => c.matches.some(m => !m.is_current_parent)).length;
  const connected = cands.filter(c => c.matches.some(m => m.is_current_parent)).length;
  const missing = cands.filter(c => !c.matches.length).length;
  return { total: cands.length, linkable, connected, missing };
});
// Sebagian data lama nyimpen literal string "NULL" (bukan NULL asli) di kolom
// model/car_name — filter biar gak nongol sebagai teks "NULL" di UI.
function cleanVal(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return (t === '' || t.toUpperCase() === 'NULL') ? null : t;
}
function _clearMotherBySapTimer() {
  if (motherBySapTimer) { clearTimeout(motherBySapTimer); motherBySapTimer = null; }
}
// Cache backend (mirror BOM SAP): kalau masih 'pending' (belum pernah di-fetch
// / cache expired total), poll tiap 3 dtk sampai ready — sama pola spt user
// nunggu Children by SAP. Kalau 'stale' (>12 jam tapi <48 jam), data lama
// langsung dipakai & refresh jalan diam2 di background (gak perlu polling).
// Batas aman polling — backend sudah dibetulkan supaya status 'error' gak
// nyangkut jadi 'pending' selamanya (dulu bug: tiap poll re-spawn fetch baru,
// hammer SAP terus-menerus kalau errornya persisten). Ini cuma jaring pengaman
// tambahan di sisi client biar gak ada skenario lain yg bikin polling gak
// pernah berhenti.
const MOTHER_BY_SAP_MAX_POLLS = 40; // ~2 menit (40 × 3 dtk)
let motherBySapPollCount = 0;
async function _fetchMotherBySap(id: number, refresh = false) {
  try {
    const res = await masterService.getMotherBySap(id, refresh);
    if (!res.success) {
      motherBySapModal.value.error = res.message ?? 'Gagal memuat data SAP.';
      motherBySapModal.value.pending = false;
      return;
    }
    if (res.pending) {
      motherBySapPollCount++;
      if (motherBySapPollCount > MOTHER_BY_SAP_MAX_POLLS) {
        motherBySapModal.value.pending = false;
        motherBySapModal.value.error = 'SAP tidak merespons setelah beberapa saat. Coba lagi nanti.';
        return;
      }
      motherBySapModal.value.pending = true;
      motherBySapModal.value.pendingMsg = res.message ?? 'Mengambil data SAP…';
      // Hasil instan dari cache BOM lokal selagi SAP diambil (jangan timpa saat sedang menautkan).
      if (res.candidates?.length && !motherBySapModal.value.linkingKey) motherBySapModal.value.candidates = res.candidates;
      motherBySapTimer = setTimeout(() => _fetchMotherBySap(id), 3000);
      return;
    }
    motherBySapModal.value.pending = false;
    motherBySapModal.value.candidates = res.candidates ?? [];
    motherBySapModal.value.stale = !!res.stale;
    motherBySapModal.value.staleH = res.stale_h ?? null;
  } catch (e: any) {
    motherBySapModal.value.error = e?.response?.data?.message ?? e?.message ?? 'Gagal memanggil SAP.';
    motherBySapModal.value.pending = false;
  } finally {
    motherBySapModal.value.loading = false;
  }
}
async function openMotherBySap() {
  if (!allowed('update')) return;
  const id = activeEntryTree.value?.entry_id;
  if (!id) return;
  _clearMotherBySapTimer();
  motherBySapPollCount = 0;
  motherBySapModal.value = {
    open: true, loading: true, linkingKey: null, error: null,
    pending: false, pendingMsg: null, stale: false, staleH: null,
    partNumber: activeEntryTree.value?.node?.part_number ?? '', candidates: [],
  };
  await _fetchMotherBySap(id);
}
function refreshMotherBySap() {
  const id = activeEntryTree.value?.entry_id;
  if (!id) return;
  _clearMotherBySapTimer();
  motherBySapPollCount = 0;
  motherBySapModal.value.loading = true;
  motherBySapModal.value.error = null;
  _fetchMotherBySap(id, true);
}
// Mother SAP yg belum ada di master: buat dari data SAP (layer IFPW / WELDING, area & status
// dipilih user; default area = area part ini) lalu langsung tautkan sbg mother.
const motherAddForm = ref<Record<string, { area: string; status: 'WIP' | 'FP' }>>({});
function motherAddOf(matnr: string) {
  if (!motherAddForm.value[matnr]) {
    const area = activeEntryTree.value?.node?.area ?? '';
    motherAddForm.value[matnr] = { area: weldingAreaOptions.value.includes(area) ? area : '', status: 'WIP' };
  }
  return motherAddForm.value[matnr];
}
async function addMotherFromSap(matnr: string) {
  if (!allowed('create')) return;
  const id = activeEntryTree.value?.entry_id;
  const f = motherAddOf(matnr);
  if (!id || !f.area) return;
  motherBySapModal.value.linkingKey = matnr;
  try {
    const add = await masterService.compareAddFromSap([matnr], { layer: 'IFPW', category: 'WELDING', area: f.area, status_part: f.status });
    const newId = add.ids?.[0];
    if (!newId) { alertDialog(add.errors?.[0] ?? add.message); return; }
    const res = await masterService.linkChild(id, newId);
    if (!res.success) { alertDialog(`Part ${matnr} sudah ditambahkan (#${newId}), tapi gagal ditautkan: ${res.message}`); return; }
    const c = motherBySapModal.value.candidates.find(x => x.mother_matnr === matnr);
    if (c) c.matches = [{ id: newId, part_number: matnr, part_number_mix: matnr, category: 'WELDING', area: f.area, is_current_parent: true } as MotherBySapMatch];
    await refreshTreeData();
    loadList(currentPage.value);
  } catch (e: any) {
    alertDialog(e?.response?.data?.message ?? e?.message ?? 'Gagal menambah mother.');
  } finally {
    motherBySapModal.value.linkingKey = null;
  }
}

async function linkMotherCandidate(match: MotherBySapMatch) {
  const id = activeEntryTree.value?.entry_id;
  if (!id || match.is_current_parent) return;
  const key = `${match.id}`;
  motherBySapModal.value.linkingKey = key;
  try {
    const res = await masterService.linkChild(id, match.id);
    if (res.success) {
      match.is_current_parent = true;
      await refreshTreeData();
      loadList(currentPage.value);
    } else {
      alertDialog(res.message);
    }
  } catch (e: any) {
    alertDialog(e?.response?.data?.message ?? 'Gagal menautkan mother.');
  } finally {
    motherBySapModal.value.linkingKey = null;
  }
}

async function undoDupOk() {
  const d = reconcileData.value;
  if (!d?.dup_area_key) return;
  try {
    const res = await masterService.setDupOk(d.holder.part_number, d.dup_area_key, false);
    if (!res.success) { alertDialog(res.message); return; }
    openReconcile();
  } catch (e: any) { alertDialog(e?.response?.data?.message ?? 'Gagal mencabut tanda aman.'); }
}
function openReconcile(force = false) {
  if (!allowed('update')) return;
  const id = activeEntryTree.value?.entry_id;
  if (!id) return;

  if (reconcileEs) { reconcileEs.close(); reconcileEs = null; }
  if (reconcileTimer) { clearInterval(reconcileTimer); reconcileTimer = null; }

  reconcileModal.value.open   = true;
  reconcileLoading.value      = true;
  reconcileError.value        = null;
  reconcileData.value         = null;
  reconcilePendingMsg.value   = force ? 'Refresh paksa dari SAP…' : 'Menghubungkan ke server…';
  reconcileElapsed.value      = 0;
  reconcileFromCache.value    = false;
  reconcileStale.value        = false;
  reconcileStaleH.value       = null;
  reconcileCancelled          = false;

  // Elapsed timer — tick setiap 100 ms saat loading
  reconcileTimer = setInterval(() => { reconcileElapsed.value += 0.1 }, 100);

  const es = new EventSource(masterService.reconcilePreviewSseUrl(id, lgortOverride.value || undefined, force));
  reconcileEs = es;

  const finish = () => {
    if (reconcileTimer) { clearInterval(reconcileTimer); reconcileTimer = null; }
    es.close();
    if (reconcileEs === es) reconcileEs = null;
    reconcileLoading.value = false;
  };

  es.addEventListener('progress', (e: Event) => {
    if (reconcileCancelled) { finish(); return; }
    try { reconcilePendingMsg.value = (JSON.parse((e as MessageEvent).data)).message ?? null; } catch {}
  });

  es.addEventListener('result', (e: Event) => {
    finish();
    if (reconcileCancelled) return;
    const res = JSON.parse((e as MessageEvent).data);
    reconcileData.value      = res;
    reconcileFromCache.value = !!res.from_cache;
    reconcileStale.value     = !!res.stale;
    reconcileStaleH.value    = res.stale_h ?? null;
    addChecked.value = new Set(res.adds.map((a: any) => a.part_number));
    lnkChecked.value = new Set((res.links ?? []).map((lk: any) => lk.id));
    updChecked.value = new Set(res.updates.map((u: any) => u.id));
    repChecked.value = new Set((res.reparents ?? []).map((r: any) => r.id));
    pressChecked.value = new Set((res.press_inserts ?? []).map((p: any) => p.key));
  });

  es.addEventListener('error', (e: Event) => {
    finish();
    if (reconcileCancelled) return;
    if (e instanceof MessageEvent && e.data) {
      try { reconcileError.value = JSON.parse(e.data).message ?? 'Terjadi kesalahan di server.'; return; } catch {}
    }
    if (!reconcileData.value) {
      reconcileError.value = 'Koneksi ke server terputus saat mengambil BOM SAP. Coba lagi.';
    }
  });
}

watch(() => reconcileModal.value.open, (open) => {
  if (!open) {
    reconcileCancelled = true;
    if (reconcileEs) { reconcileEs.close(); reconcileEs = null; }
    if (reconcileTimer) { clearInterval(reconcileTimer); reconcileTimer = null; }
  }
});

function toggleAdd(pn: string) {
  addChecked.value.has(pn) ? addChecked.value.delete(pn) : addChecked.value.add(pn);
  addChecked.value = new Set(addChecked.value);
}
function toggleLnk(id: number) {
  lnkChecked.value.has(id) ? lnkChecked.value.delete(id) : lnkChecked.value.add(id);
  lnkChecked.value = new Set(lnkChecked.value);
}
function toggleUpd(id: number) {
  updChecked.value.has(id) ? updChecked.value.delete(id) : updChecked.value.add(id);
  updChecked.value = new Set(updChecked.value);
}
function togglePress(key: string) {
  pressChecked.value.has(key) ? pressChecked.value.delete(key) : pressChecked.value.add(key);
  pressChecked.value = new Set(pressChecked.value);
}
function toggleRep(id: number) {
  repChecked.value.has(id) ? repChecked.value.delete(id) : repChecked.value.add(id);
  repChecked.value = new Set(repChecked.value);
}
const reconcileSelCount = computed(
  () => (reconcileData.value
    ? addChecked.value.size + lnkChecked.value.size + updChecked.value.size + repChecked.value.size + pressChecked.value.size
    : 0)
);

async function applyReconcile() {
  if (!reconcileData.value || reconcileApplying.value) return;
  const adds = reconcileData.value.adds.filter((a) => addChecked.value.has(a.part_number));
  const links = (reconcileData.value.links ?? [])
    .filter((lk: any) => lnkChecked.value.has(lk.id))
    .map((lk: any) => ({ id: lk.id, connect_to_parent: lk.connect_to_parent, connect_to_parent_id: lk.connect_to_parent_id, bom_qty: lk.bom_qty, meins: lk.meins }));
  const updates = reconcileData.value.updates
    .filter((u) => updChecked.value.has(u.id))
    .map((u) => ({
      id: u.id,
      fields: Object.fromEntries(Object.entries(u.changes).map(([k, v]: [string, any]) => [k, v.new])),
    }));
  const reparents = (reconcileData.value.reparents ?? [])
    .filter((r) => repChecked.value.has(r.id))
    .map((r) => ({ id: r.id, to_parent_mix: r.to_parent_mix }));
  const press_inserts = (reconcileData.value.press_inserts ?? []).filter((p) => pressChecked.value.has(p.key));
  if (!adds.length && !links.length && !updates.length && !reparents.length && !press_inserts.length) { reconcileModal.value.open = false; return; }

  reconcileApplying.value = true;
  reconcileError.value = null;
  try {
    const res = await masterService.reconcileApply({ adds, links, updates, reparents, press_inserts, holder_id: reconcileData.value.holder.id });
    if (!res.success) { reconcileError.value = res.message; return; }
    reconcileModal.value.open = false;

    // Sinkronkan juga ms_welding_bom (dipakai badge "cocok SAP" di tree/BOM SAP tab) —
    // tanpa ini, badge SAP baru muncul setelah user klik "Sync dari SAP" manual di tab
    // BOM SAP, padahal komponennya baru saja ditambah dari data SAP yang sama persis.
    const holder = reconcileData.value.holder;
    if (holder?.part_number) {
      try { await masterService.syncBom(holder.part_number, undefined, holder.id); } catch { /* non-fatal */ }
    }

    // Refresh tree + list + BOM SAP tab agar perubahan (termasuk badge cocok SAP)
    // tampak. Dulu cuma treeData yg di-refresh — sejak Children by SAP juga bisa
    // dibuka dari detailModal (mobile), hierarki mobile jadi basi setelah apply
    // kalau gak ikut refreshTreeData() (yg sudah cek treeData ATAU detailTreeData).
    await refreshTreeData();
    if (treeModal.value.partNumber) {
      bomData.value = [];
      await loadBom();
    }
    loadList(currentPage.value);
  } catch (e: any) {
    reconcileError.value = e?.response?.data?.message ?? 'Gagal menerapkan rekonsiliasi.';
  } finally {
    reconcileApplying.value = false;
  }
}

// Set part anak efektif master untuk detail modal (mobile) — sumber pohon berbeda.
const detailMasterSet = computed(() => {
  const node = detailTreeData.value?.node;
  if (!node) return new Set<string>();
  return collectSubtree(node).set;
});

// Auto-load BOM data saat tab BOM dibuka pertama kali
watch(() => treeModal.value.activeTab, (tab) => {
  if (tab === 'bom' && bomData.value.length === 0 && !bomLoading.value) {
    loadBom();
  }
});

function openCreateModal() {
  if (!allowed('create')) return;
  form.value = EMPTY_FORM();
  formAreaGroupPending.value = '';
  machineHistory.value = []; machineHistoryOpen.value = false;
  pendingParentId.value = null;
  // Pre-fill area hanya jika sub-area spesifik dipilih (bukan hanya layer)
  if (selectedSubArea.value && !isIfpdLayer.value) form.value.area = isIfpwAreaSel.value ? (selectedAreaZones.value.length === 1 ? selectedAreaZones.value[0] : '') : selectedSubArea.value;
  // Pre-fill Layer step-1 bila user sedang browsing tab layer tertentu (bukan "Semua")
  formLayer.value = (selectedLayer.value && LAYER_CATEGORY_OPTIONS[selectedLayer.value]) ? selectedLayer.value : null;
  formError.value = null;
  imageError.value = null;
  customerSlots.value = 1;       // mulai dengan 1 customer
  supplierSlots.value = 1;       // mulai dengan 1 supplier
  autoConfig.value = true;       // layer/area auto dari category
  mixAuto.value = true;          // baru: mix dihitung otomatis
  jobAuto.value = true;          // job number = part number (identitas)
  lineRows.value = [blankLineRow()]; // part baru: mulai 1 line kosong
  extraMotherMix.value = null; extraMothers.value = []; // reset widget mother lainnya
  jobNoOptions.value = [];
  formGalleryPart.value = []; formGalleryPallet.value = []; // part baru belum ada id → galeri kosong
  loadSuggestions();            // muat saran autocomplete (sekali, cached)
  formModal.value = { open: true, mode: 'create' };
}
async function onEditPartFromBoard(id: number) {
  // Kartu/tree di papan hanya bawa subset kolom — ambil row lengkap dulu sebelum buka form edit.
  try {
    const detail = await masterService.getDetail(id);
    if (detail) openEditModal(detail);
    else alertDialog('Part tidak ditemukan.');
  } catch { alertDialog('Gagal memuat data part.'); }
}
// Part sama di AREA LAIN (mis. WSS → CO → SA) = proses lanjutan, bukan dobel: mix diberi akhiran
// urut proses (konvensi data: 57145-BZ090-OP10 di WSS, -OP20 di CO). Kolom OP tetap per area.
const conflictIsProcessChain = computed(() => {
  const c = formConflict.value;
  return !!c && !c.is_runout && c.part_number?.toUpperCase() === (form.value.part_number ?? '').trim().toUpperCase()
    && (c.area ?? '').toUpperCase() !== (form.value.area ?? '').toUpperCase();
});
function nextProcessMix(conflictMix: string): string {
  const pn = (form.value.part_number ?? '').trim();
  const base = pn.replace(/-\d{2}$/, '');
  const m = conflictMix.match(/-OP(\d+)$/i);
  return `${base}-OP${m ? Number(m[1]) + 10 : 20}`;
}
async function useProcessMix() {
  conflictBusy.value = true;
  try {
    for (let i = 0; i < 6 && formConflict.value && conflictIsProcessChain.value; i++) {
      mixAuto.value = false;
      form.value.part_number_mix = nextProcessMix(formConflict.value.part_number_mix);
      await handleFormSubmit();   // masih bentrok (nomor sudah dipakai) → naik 10 lagi
    }
  } finally { conflictBusy.value = false; }
}
// "Ambil alih": data baris lama (relasi, varian, media, mutasi bila beda area) diserahkan ke
// baris yg sedang diedit, baris lama dihapus permanen, lalu form disimpan ulang.
async function takeOverConflict() {
  const c = formConflict.value;
  const toId = form.value.id;
  if (!c) return;
  conflictBusy.value = true;
  try {
    let plan = null;
    if (toId) {
      const pv = await masterService.handover(c.id, toId, false);
      if (!pv.success) { formError.value = pv.message ?? 'Gagal membaca data baris lama.'; return; }
      plan = pv.preview!;
    }
    const items = plan ? [
      plan.mothers.length && `${plan.mothers.length} mother`, plan.children.length && `${plan.children.length} komponen`,
      plan.variants.length && `${plan.variants.length} varian delivery`, plan.media && `${plan.media} media`,
      plan.mutasi.possible && plan.mutasi.move && `${plan.mutasi.move} baris mutasi`,
    ].filter(Boolean) : [];
    const msg = `Baris #${c.id} (${c.part_number}, ${c.area ?? '—'}${c.is_runout ? ', nonaktif' : ''}) akan dihapus permanen `
      + `dan "${c.part_number_mix}" dipakai baris ini.`
      + (items.length ? `\n\nData yg dipindah ke baris ini dulu: ${items.join(', ')}.` : '\n\nBaris lama tidak punya relasi/varian/media.');
    if (!await confirmDialog(msg, { title: 'Ambil alih part number mix', confirmText: 'Ambil alih & simpan', danger: true })) return;
    if (toId && items.length) {
      const r = await masterService.handover(c.id, toId, true, !!plan?.mutasi.possible);
      if (!r.success) { formError.value = r.message ?? 'Serah terima gagal.'; return; }
    }
    const del = await masterService.hardDelete(c.id);
    if (!del.success) { formError.value = del.message; return; }
    applySocketUpdate({ action: 'hard_delete', id: c.id });
    socket.emit('welding_master_updated', { action: 'hard_delete', id: c.id });
    await handleFormSubmit();
  } catch (e: any) {
    formError.value = e?.response?.data?.message ?? 'Gagal mengambil alih.';
  } finally {
    conflictBusy.value = false;
  }
}
async function openConflictRow() {
  const c = formConflict.value;
  if (!c) return;
  const row = await masterService.getDetail(c.id).catch(() => null);
  if (!row) { formError.value = `Baris #${c.id} tidak ditemukan.`; return; }
  if (!await confirmDialog('Tutup form ini (perubahan belum tersimpan) dan buka baris #' + c.id + '?', { confirmText: 'Buka' })) return;
  openEditModal(row);
}

function openEditModal(row: MsWelding) {
  if (!allowed('update')) return;
  form.value = { ...row };
  formAreaGroupPending.value = '';
  loadMachineHistory(row.id);
  pendingParentId.value = null; // sudah tersimpan (ada id) → link langsung, gak pending
  formLayer.value = layerKeyForCategory(row.category ?? null);
  formError.value = null; formConflict.value = null; pnameCands.value = null; aliasCands.value = null;
  imageError.value = null;
  customerSlots.value = customerSlotsFromForm();
  supplierSlots.value = supplierSlotsFromForm();
  // autoConfig=true (SAMA spt Tambah Part) — Layer cukup tampil ringkas readonly
  // (via "Proses Selanjutnya"/auto-field), gak perlu nongolin dropdown override
  // manual by default lagi. AMAN: applyDerived() cuma re-derive layer/area kalau
  // user BENERAN ubah category/status_part (lihat onCategoryChange/onStatusChange)
  // — buka form doang gak nimpa apa2, & utk WELDING area SELALU tetap kolom
  // editable (gak pernah auto-overwrite terlepas dari autoConfig).
  autoConfig.value = true;
  mixAuto.value = false;        // edit: jangan timpa mix yang sudah ada
  jobAuto.value = false;        // edit: jangan timpa job number existing
  extraMotherMix.value = null; extraMothers.value = []; // reset widget mother lainnya
  jobNoOptions.value = [];
  loadSuggestions();
  // Line/Mesin multi-proses: muat dari ms_welding_route bila kategori INHOUSE/SINGLE FINISH
  if (row.category === 'INHOUSE' || row.category === 'SINGLE FINISH') loadLineRows();
  else lineRows.value = [blankLineRow()];
  // Mother (multi-parent): muat daftar asli dari server bila kategori INHOUSE/OUTHOUSE/CKD,
  // ATAU WELDING WIP (chip-list mother sekarang dipakai bareng, lihat showMultiMother).
  if (row.category === 'INHOUSE' || row.category === 'OUTHOUSE' || row.category === 'CKD' || (row.category === 'WELDING' && (!!row.is_wip || !!row.is_common))) loadExtraMothers();
  loadFormGallery();
  // Area/Layer/status_part existing kebaca dari data tersimpan → langsung evaluasi
  // saran Tipe Part (dulu BUG: cuma ke-trigger kalau user re-select Area manual,
  // part yg areanya udah WSS ADM pas dibuka gak pernah ke-suggest sampai
  // di-re-select ulang).
  _autoSuggestIfpdType();
  formModal.value = { open: true, mode: 'edit' };
}

// ── CLONE / DUPLIKAT part ──────────────────────────────────────────
// Buka form CREATE terisi dari part sumber; user tinggal ganti part_number/op.
// Routing proses (multi-mesin)
const routeModalOpen = ref(false);
const routePart = ref<MsWelding | null>(null);
function openRouteModal(row: MsWelding) {
  if (!allowed('update')) return;
  routePart.value = row;
  routeModalOpen.value = true;
}

function openCloneModal(row: MsWelding) {
  if (!allowed('create')) return;
  form.value = { ...EMPTY_FORM(), ...row };
  (form.value as any).id = undefined;   // jadi data baru
  form.value.image = null;              // jangan bawa gambar sumber
  formLayer.value = layerKeyForCategory(row.category ?? null);
  formError.value = null; formConflict.value = null; pnameCands.value = null; aliasCands.value = null;
  imageError.value = null;
  customerSlots.value = customerSlotsFromForm();
  supplierSlots.value = supplierSlotsFromForm();
  autoConfig.value = false;             // clone: pertahankan konfigurasi sumber
  mixAuto.value = true;                 // mix dihitung ulang dari part_number+op
  jobAuto.value = true;                 // job number ikut part number baru
  jobNoOptions.value = [];
  form.value.part_number_mix = deriveMix();
  loadSuggestions();
  formModal.value = { open: true, mode: 'create' };
}

// satu-satunya jalur tutup form modal
function closeFormModal() {
  if (formSaving.value || imageUploading.value) return;
  formModal.value.open = false;
}

// Saran otomatis "Tipe Part" (ifpd_type) — dari AREA part itu sendiri (bukan
// area mother lagi, lebih langsung & gak butuh mother udah ke-load dulu):
//  - FP dari IFPP (category INHOUSE/OUTHOUSE) → definitif SINGLE_FINISH, cuma
//    1 kemungkinan, gak ambigu, langsung timpa apapun nilainya.
//  - WELDING FP area WSS* → definitif SEMI_SUB_ASSY, timpa juga (gak ambigu).
//  - WELDING FP area ROBOT*/SA MANUAL → AMBIGU (SUB-ASSY atau MODULE, tergantung
//    part-nya), gak dipaksa satu nilai — user pilih sendiri. Kalau nilai
//    sekarang bukan salah satu dari dua itu (mis. sisa SEMI_SUB_ASSY dari area
//    sebelumnya), dikosongkan biar user sadar perlu pilih ulang.
function _autoSuggestIfpdType() {
  if ((isInhouseComp.value || isOuthouseComp.value) && form.value.status_part === 'FP') {
    form.value.ifpd_type = 'SINGLE_FINISH';
    return;
  }
  if (isWelding.value && form.value.status_part === 'FP') {
    const area = (form.value.area ?? '').toUpperCase();
    if (area.startsWith('WSS')) {
      form.value.ifpd_type = 'SEMI_SUB_ASSY';
    } else if (area.startsWith('SA ') || area.startsWith('CO ')) {
      if (form.value.ifpd_type !== 'SUB_ASSY' && form.value.ifpd_type !== 'MODULE') {
        form.value.ifpd_type = null;
      }
    }
  }
}

function onCategoryChange() {
  autoConfig.value = true;     // kembali ke mode auto saat ganti jenis part
  // INHOUSE/OUTHOUSE baru dipilih → default WIP (kasus umum: komponen umpan
  // welding). User bisa toggle ke FP manual (root sub-assy) via selector Tipe.
  if (isInhouseComp.value || isOuthouseComp.value) form.value.status_part = 'WIP';
  applyDerived();
  _autoSuggestIfpdType();
}
// Tipe di form: FP / WIP / COMMON. COMMON = part common (dikirim langsung sbg FP + dirakit ke
// part lain sbg WIP) → disimpan is_wip=1, status_part='WIP', is_common=1 supaya modul lain
// (GLC, LKH, planning) tetap membacanya sebagai WIP.
const isCommonForm = computed(() => !!Number(form.value.is_common));
const formTipe = computed<'FP' | 'WIP' | 'COMMON'>({
  get: () => (Number(form.value.is_common) ? 'COMMON' : (form.value.status_part === 'WIP' ? 'WIP' : 'FP')),
  set: (v) => {
    form.value.is_common = v === 'COMMON';
    form.value.status_part = v === 'FP' ? 'FP' : 'WIP';
    // Jalur FP part common: nomor delivery biasanya = part number.
    if (v === 'COMMON' && !form.value.part_number_delivery) form.value.part_number_delivery = form.value.part_number || null;
    onStatusChange();
    // Jalur WIP: tampilkan mother yg sudah tertaut (FP lama → COMMON belum pernah dimuat).
    if (v !== 'FP' && !extraMothers.value.length) loadExtraMothers();
  },
});
function onStatusChange() {
  form.value.is_wip = form.value.status_part === 'WIP';
  if (form.value.status_part === 'FP') {
    form.value.parent_part_mix = null;
    form.value.qty_unit = null;
  }
  applyDerived();              // layer welding ikut FP/WIP (IFPD/IFPW)
  _autoSuggestIfpdType();      // FP baru muncul → langsung saranin Tipe Part
}
function onAreaChange() {
  _autoSuggestIfpdType();      // area WELDING ganti → Tipe Part ikut re-evaluate
}

// Fitur "pindah area" (2026-07-31) — begitu area part FP berubah (lewat form
// edit ini, paste-bulk, atau modal Pindah Area), planning (mutasi_weld) area
// LAMA & BARU perlu di-refresh.
// (2026-09-15) TIDAK LAGI menembak welding_mutasi/refresh + wip/refresh dari
// browser: 4 POST berat × puluhan detik menghabiskan jatah koneksi browser
// (±6/host) → request Master Data berikutnya ikut antre & halaman terasa
// lambat. Master Data = pusat segalanya, harus ringan. Sekarang cuma 1 POST
// ringan yang MENANDAI area kotor (welding_refresh_queue); cron worker di
// server (scripts/welding_refresh_queue_worker.php, tiap menit) yang
// mengerjakan refresh sebenarnya. areaRefreshNotice cuma indikator ringan.
const areaRefreshNotice = ref<string | null>(null);
async function refreshAreasInBackground(areas: (string | null | undefined)[], reason = 'pindah_area', extraNote = '') {
  const list = Array.from(new Set(areas.filter((a): a is string => !!a)));
  if (!list.length) return;
  try {
    await masterService.requestPlanningRefresh(list, reason);
    areaRefreshNotice.value = `${extraNote}Refresh planning ${list.join(', ')} dijadwalkan (≤1 menit, di server).`;
  } catch {
    areaRefreshNotice.value = `Gagal menjadwalkan refresh planning ${list.join(', ')} — cron 15 menit akan menyusul.`;
  }
  setTimeout(() => { areaRefreshNotice.value = null; }, 5000);
}

// Aksi ringkas "Pindah Area" (row-menu) — lihat MovePartAreaModal.vue.
const moveAreaModal = ref<{ open: boolean; part: { id: number; part_number: string; part_name?: string | null; area: string } | null }>({
  open: false, part: null,
});
function openMoveAreaModal(row: MsWelding) {
  if (!allowed('update')) return;
  moveAreaModal.value = {
    open: true,
    part: { id: row.id!, part_number: row.part_number || '', part_name: row.part_name, area: row.area || '' },
  };
}
function onPartMoved(change: { old: string | null; new: string; mutasi_moved?: number; mutasi_conflict?: number }) {
  let note = '';
  if (change.mutasi_moved) {
    note = `${change.mutasi_moved} baris mutasi berjalan ikut dipindah ke ${change.new}`
      + (change.mutasi_conflict ? `, ${change.mutasi_conflict} hari bentrok dibiarkan` : '') + '. ';
  }
  void refreshAreasInBackground([change.old, change.new], 'pindah_area', note);
  loadList(currentPage.value);
}

// Customer tampilan = customer_1..3 part + customer semua varian delivery aktif (dedupe, urutan dipertahankan).
// Press & material ikut part yg akhirnya dikirim (end_* dari backend): customer, model, job.
const followsMother = (row: MsWelding) => !!row.end_customer || !!row.end_job;
function customersOf(row: MsWelding): string {
  if (row.end_customer) return row.end_customer;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of [row.customer_1, row.customer_2, row.customer_3, ...(row.variant_customers ?? '').split(',')]) {
    const v = (c ?? '').trim();
    const k = v.toUpperCase();
    if (v && !seen.has(k)) { seen.add(k); out.push(v); }
  }
  return out.join(', ');
}

// Kolom Job Number cuma tampilkan job BASE; job varian delivery lain (TMMIN dst)
// cukup di tooltip — daftarnya lengkap di modal varian (badge 🏷 di part number).
// Nomor lain utk produk fisik yg sama (varian delivery aktif ≠ part number baris ini).
// Ditampilkan ringkas: bagian yg beda saja (57131-BZ150-03 → "-03") supaya jelas 1 produk.
function altNumbers(row: MsWelding): { pn: string; cust: string; short: string }[] {
  // WIP tidak dikirim ke customer — varian hasil migrasinya berisi nomor mother, bukan produk lain.
  if (row.is_wip && !row.is_common) return [];
  const own = (row.part_number ?? '').toUpperCase();
  return (row.variant_alt ?? '').split(';;').filter(Boolean).map(x => { const [pn, cust] = x.split('|'); return { pn, cust: cust ?? '' }; })
    .filter(a => a.pn && a.pn.toUpperCase() !== own)
    .map(a => {
      let i = 0; const p = a.pn.toUpperCase();
      while (i < own.length && i < p.length && own[i] === p[i]) i++;
      while (i > 0 && /[A-Z0-9]/.test(p[i - 1])) i--;          // potong di batas segmen (-03, bukan 3)
      const short = i > 0 && i < p.length ? a.pn.slice(i - (p[i - 1] === '-' ? 1 : 0)) : a.pn;
      return { ...a, short };
    });
}
// Baris saudara 1 produk (backend: siblings) — nomor dasar sama, suffix beda, dipisah krn SAP
// punya material/BOM/stok sendiri (mis. press DPM beda line). Klik → tampilkan semuanya.
function siblingRows(row: MsWelding): { pn: string; proc: string; cust: string; short: string }[] {
  return (row.siblings ?? '').split(';;').filter(Boolean).map(x => { const [pn, proc, cust] = x.split('|'); return { pn, proc: proc ?? '', cust: cust ?? '', short: '-' + pn.split('-').pop() }; });
}
function siblingTitle(row: MsWelding): string {
  const own = row.category === 'INHOUSE' ? row.line_press : row.machine;
  return `1 produk, baris terpisah (SAP beda material):\n• ${row.part_number}${own ? ' — ' + own : ''} (baris ini)\n`
    + siblingRows(row).map(x => `• ${x.pn}${x.proc ? ' — ' + x.proc : ''}${x.cust ? ' (' + x.cust + ')' : ''}`).join('\n') + '\nKlik untuk tampilkan semuanya.';
}
function showSiblings(row: MsWelding) {
  const p = (row.part_number ?? '').split('-'); p.pop();
  searchQuery.value = p.join('-') + '-*';
  loadList(1);
}
const nutWarnTitle = (row: MsWelding) => 'Peringatan NUT:' + (row.nut_warnings ?? []).map(w => '\n• ' + w).join('') + '\nKlik untuk buka hierarki.';
// Saran merge baris kembar: backend memilih baris yg dipertahankan (lebih lengkap), lalu serah
// terima relasi/varian/media dari baris dobel → baris dobel dinonaktifkan (bukan dihapus permanen).
async function suggestDupMerge(row: MsWelding) {
  if (!allowed('del')) return;
  if (!row.id || !row.dup_of?.length) return;
  try {
    const sg = await masterService.dupMergeSuggest(row.id, row.dup_of[0]);
    if (!sg.success || !sg.keep || !sg.drop) { alertDialog(sg.message ?? 'Saran merge tidak tersedia.'); return; }
    const pv = sg.preview;
    const moves = pv ? [
      pv.mothers.length && `${pv.mothers.length} mother (${pv.mothers.map(m => m.label).join(', ')})`,
      pv.children.length && `${pv.children.length} komponen`, pv.variants.length && `${pv.variants.length} varian`, pv.media && `${pv.media} media`,
    ].filter(Boolean) : [];
    const side = (x: NonNullable<typeof sg.keep>) => `#${x.id} ${x.part_number} · ${x.area ?? '—'} · job ${x.job || '—'} · mesin/line ${x.machine || '—'}`;
    const msg = `Pertahankan:\n${side(sg.keep)}\n\nNonaktifkan (dobel):\n${side(sg.drop)}\n\nDipindah ke baris yg dipertahankan: ${moves.length ? moves.join(', ') : 'tidak ada'}.`;
    if (!await confirmDialog(msg, { title: 'Gabungkan baris dobel', confirmText: 'Gabungkan', danger: true })) return;
    const h = await masterService.handover(sg.drop.id, sg.keep.id, true, false);
    if (!h.success) { alertDialog(h.message ?? 'Serah terima gagal.'); return; }
    const d = await masterService.softDelete(sg.drop.id);
    if (!d.success) { alertDialog(d.message); return; }
    socket.emit('welding_master_updated', { action: 'soft_delete', id: sg.drop.id });
    loadList(currentPage.value);
    alertDialog(`Digabung ke #${sg.keep.id}; #${sg.drop.id} dinonaktifkan.`, { tone: 'success' });
  } catch (e: any) {
    alertDialog(e?.response?.data?.message ?? 'Gagal menggabungkan.');
  }
}
function altNumbersTitle(row: MsWelding): string {
  return `1 produk — ${row.part_number} juga dikirim sebagai:\n` + altNumbers(row).map(a => `• ${a.pn}${a.cust ? ' (' + a.cust + ')' : ''}`).join('\n') + '\nKlik untuk kelola varian delivery.';
}
function variantJobsTitle(row: MsWelding): string | undefined {
  const base = (row.job_number ?? '').trim().toUpperCase();
  const others = [...new Set((row.variant_jobs ?? '').split(',').map(j => j.trim()).filter(j => j && j.toUpperCase() !== base))];
  return others.length ? `Job varian delivery: ${others.join(', ')}` : undefined;
}

// Varian delivery (row-menu / badge) — lihat DeliveryVariantModal.vue.
const variantModal = ref<{ open: boolean; part: { id: number; part_number: string; part_name?: string | null; qty_kbn?: number | null } | null }>({
  open: false, part: null,
});
function openVariantModal(row: MsWelding) {
  if (!allowed('update')) return;
  variantModal.value = { open: true, part: { id: row.id!, part_number: row.part_number || '', part_name: row.part_name, qty_kbn: row.qty_kbn } };
}
function onVariantChanged(_c: { merged?: boolean; affectedChildren?: number[] }) {
  loadList(currentPage.value);
  loadStats();
}

async function handleFormSubmit() {
  formError.value = null;
  formConflict.value = null;
  if (!form.value.part_number?.trim()) {
    formError.value = 'Part number wajib diisi.';
    return;
  }
  if (!form.value.part_number_mix?.trim()) {
    formError.value = 'Part number mix wajib diisi.';
    return;
  }
  if (!form.value.area) {
    formError.value = (isWelding.value && formAreaGroup.value) ? 'Pilih mesin utama dulu untuk area ' + formAreaGroup.value + '.' : 'Area wajib dipilih.';
    return;
  }
  if (form.value.op !== null && form.value.op !== undefined && (form.value.op < 10 || form.value.op % 10 !== 0)) {
    formError.value = 'OP harus kelipatan 10 (10, 20, 30, ...) — atau kosongkan jika tanpa OP.';
    return;
  }
  if (showQtyKbn.value && (!form.value.qty_kbn || form.value.qty_kbn < 1)) {
    formError.value = 'QTY KBN minimal 1.';
    return;
  }
  if (showCkdType.value && !form.value.ckd_type) {
    formError.value = 'Jenis CKD (NUT/BOLT/CLIP/...) wajib dipilih.';
    return;
  }
  const lineTokens = lineRows.value.map(r => r.machine.trim()).filter(Boolean);
  if (showLinePress.value && !lineTokens.length) {
    formError.value = 'Line / Mesin wajib diisi minimal 1.';
    return;
  }
  if (showVendor.value && !form.value.vendor?.trim()) {
    formError.value = 'Vendor wajib diisi untuk OUTHOUSE.';
    return;
  }
  // Ringkasan line_press = gabungan token, dipisah koma (bukan spasi — token
  // proses individual bisa mengandung spasi sendiri, mis. "150T SP", jadi
  // join spasi bikin hitungan proses ambigu/salah di tabel TOTAL PROSES).
  // total_proses ditulis LANGSUNG dari jumlah baris "Line/Mesin" di sini —
  // bukan lagi ditebak dari parsing teks line_press (rawan salah, lihat
  // "Jumlah Proses" input di atas: itu sumber kebenarannya, bukan line_press).
  if (showLinePress.value) {
    form.value.line_press = lineTokens.join(', ');
    form.value.total_proses = lineTokens.length;
  }
  // Tipe FP = dikirim langsung SAJA. FP yg masih tertaut ke mother dibaca sistem sbg COMMON —
  // jadi saat user memilih FP, tawarkan lepas mother-nya (kalau tidak, label tetap COMMON).
  if (formModal.value.mode !== 'create' && form.value.id && formTipe.value === 'FP' && extraMothers.value.length) {
    const names = extraMothers.value.map(m => m.part_number).join(', ');
    const ok = await confirmDialog(`Tipe FP: part ini masih dirakit ke ${names}. Lepas relasi ke mother tsb supaya jadi FP murni? Part number & job delivery otomatis diisi nomor part ini sendiri.

Pilih Batal utk tetap menyimpan tanpa melepas (tetap tampil COMMON).`, { title: 'Jadikan FP murni', confirmText: 'Lepas & simpan', danger: true });
    if (ok) {
      for (const m of [...extraMothers.value]) {
        const r = await masterService.detachParent(form.value.id, m.id).catch((e: any) => ({ success: false, message: e?.response?.data?.message ?? 'error' }));
        if (!r.success) { formError.value = `Gagal melepas ${m.part_number}: ${r.message}`; return; }
      }
      extraMothers.value = [];
      // FP murni: delivery = nomor part sendiri (buang nomor mother hasil data lama).
      form.value.part_number_delivery = form.value.part_number;
      form.value.job_number_delivery = form.value.job_number || form.value.part_number;
    }
  }
  formSaving.value = true;
  try {
    const isCreate = formModal.value.mode === 'create';
    const res = isCreate
      ? await masterService.create(form.value)
      : await masterService.update(form.value.id!, form.value);

    if (!res.success) {
      formError.value = res.message;
      return;
    }

    // Part baru (belum ada id sebelumnya) yg mother-nya dipilih dari picker —
    // ParentMixPicker gak bisa link_child langsung krn saat itu belum ada id.
    // Tautkan sekarang, id-nya baru ada setelah create sukses (lihat
    // onParentPicked/pendingParentId). Kolom parent_part_mix legacy yg ikut
    // kesimpan itu cuma kosmetik — relasi BENERAN dari sini.
    const createdId = (res as { id?: number }).id;
    if (isCreate && pendingParentId.value && createdId) {
      try {
        const linkRes = await masterService.linkChild(createdId, pendingParentId.value);
        if (!linkRes.success) alertDialog(`Part tersimpan, tapi gagal menautkan ke mother: ${linkRes.message}`);
      } catch (e: any) {
        alertDialog(`Part tersimpan, tapi gagal menautkan ke mother: ${e?.response?.data?.message ?? 'error'}`);
      }
      pendingParentId.value = null;
    }

    // Sinkron multi-line/mesin ke ms_welding_route (sama seperti Routing Proses modal)
    if (showLinePress.value && lineTokens.length && form.value.area) {
      try {
        await masterService.saveRoute({
          route_key: lineRouteKey.value,
          area: form.value.area,
          ms_part: form.value.part_number || lineRouteKey.value,
          processes: lineRows.value.filter(r => r.machine.trim()),
        });
      } catch { /* non-fatal: part utama sudah tersimpan */ }
    }

    formModal.value.open = false;

    if (isCreate) {
      // Fetch baris baru dari server (dapat id + semua field server-assigned)
      const newId = (res as { id?: number }).id;
      const newRow = newId ? await masterService.getDetail(newId) : null;
      if (newRow) {
        applySocketUpdate({ action: 'create', data: newRow });
        socket.emit('welding_master_updated', { action: 'create', data: newRow });
      } else {
        // Fallback jika detail tidak tersedia
        loadList(currentPage.value);
      }
    } else {
      // Update: tabel di-reload dari server — form.value TIDAK punya kolom hitungan
      // (total_proses, mother_count, next_process, variant_customers/jobs, …), jadi
      // kalau ditimpa lokal tampilannya basi sampai user klik filter (bug 2026-09-22).
      const updatedRow = { ...form.value } as MsWelding;
      socket.emit('welding_master_updated', { action: 'update', data: updatedRow });
      await loadList(currentPage.value);
      // Bila edit dipicu dari modal tree (treeModal desktop ATAU detailModal
      // mobile — dulu cuma cek treeModal.open, jadi hierarki mobile basi
      // setelah edit), segarkan hierarki agar perubahan tampak.
      if (treeModal.value.open || detailModal.value.open) await refreshTreeData();
      // Area FP berubah → refresh planning area lama & baru di background
      // (fitur "pindah area", tidak di-await supaya modal langsung tertutup).
      const areaChanged = (res as { area_changed?: { old: string | null; new: string } }).area_changed;
      if (areaChanged) void refreshAreasInBackground([areaChanged.old, areaChanged.new]);
    }
  } catch (e: any) {
    formError.value = e?.response?.data?.message ?? 'Terjadi kesalahan.';
    formConflict.value = e?.response?.data?.conflict ?? null;
  } finally {
    formSaving.value = false;
  }
}
function confirmDelete(row: MsWelding) {
  if (!allowed('del')) return;
  deleteModal.value = { open: true, row };
  loadDelCheck(row?.id);
  deleteType.value = 'soft';
}
async function handleDelete() {
  if (!deleteModal.value.row?.id) return;
  deleting.value = true;
  try {
    const id     = deleteModal.value.row.id;
    const isHard = deleteType.value === 'hard';
    const res    = isHard ? await masterService.hardDelete(id) : await masterService.softDelete(id);
    if (res.success) {
      deleteModal.value.open = false;
      const action = isHard ? 'hard_delete' : 'soft_delete';
      applySocketUpdate({ action, id });
      socket.emit('welding_master_updated', { action, id });
    }
  } finally {
    deleting.value = false;
  }
}
// Menu aksi (titik tiga) per baris tabel — dulu 7 tombol berjejer di kolom
// AKSI (toolbar bloat: makan lebar kolom, susah di-scan, mayoritas jarang
// dipakai). Sekarang cuma 2 tombol paling sering dipakai (Hierarki & Edit)
// + kebab utk sisanya. Pola sama persis dgn tree-kebab di TreeNode.vue,
// tapi state-nya per-row-id (bukan per-komponen) krn ini daftar banyak baris.
const rowMenuOpenId = ref<number | null>(null);
const rowMenuStyle = ref<Record<string, string>>({});
function toggleRowMenu(row: MsWelding, e: MouseEvent) {
  if (rowMenuOpenId.value === row.id) { rowMenuOpenId.value = null; return; }
  const btn = e.currentTarget as HTMLElement;
  const r = btn?.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  const menuW = 200, menuH = 5 * 38 + 14, gap = 4, pad = 8;
  if (r) {
    let left = r.right - menuW;
    if (left < pad) left = r.left;
    left = Math.min(Math.max(left, pad), vw - menuW - pad);
    let top = r.bottom + gap;
    if (top + menuH > vh - pad) top = r.top - menuH - gap;
    if (top < pad) top = pad;
    rowMenuStyle.value = { top: `${top}px`, left: `${left}px` };
  }
  rowMenuOpenId.value = row.id ?? null;
}
function closeRowMenu() { rowMenuOpenId.value = null; }

function openImageModal(row: MsWelding) {
  imageModal.value = { open: true, row: { ...row } };
}
// Galeri media (Spec Modal, read-only) + lightbox sederhana (klik thumbnail →
// tampil besar; video langsung diputar dgn controls).
const specGalleryPart = ref<MsWeldingMedia[]>([]);
const specGalleryPallet = ref<MsWeldingMedia[]>([]);
const mediaLightbox = ref<MsWeldingMedia | null>(null);
// Nomor delivery (varian) part ini — ditampilkan di tab Info.
const specVariants = ref<DeliveryVariant[]>([]);
// ── Model 3D (TripoSR, worker di PC dev) — part & pallet ──
const specModel3d = ref<{ part: MsWeldingMedia | null; pallet: MsWeldingMedia | null }>({ part: null, pallet: null });
const specMediaMode = ref<'3d' | 'photo'>('3d');
// Pallet: switch 3D/Foto sendiri + pilihan foto (cover / 6 sisi dari galeri pallet).
const palletMediaMode = ref<'3d' | 'photo'>('3d');
const palletPhotoKey = ref<string>('cover');
const palletPhotoOptions = computed(() => {
  const opts: { key: string; label: string; src: string }[] = [];
  const cover = specModal.value.row?.pallet_image;
  if (cover) opts.push({ key: 'cover', label: 'Cover', src: masterService.getImageUrl(cover) ?? '' });
  const sides = sideMap(specGalleryPallet.value);
  for (const s of CUBE_SIDES) {
    const m = sides[s.key];
    if (m) opts.push({ key: s.key, label: s.label, src: m.url ?? masterService.getImageUrl(m.file_path) ?? '' });
  }
  return opts;
});
const palletPhotoSrc = computed(() => (palletPhotoOptions.value.find(o => o.key === palletPhotoKey.value) ?? palletPhotoOptions.value[0])?.src || null);
const specModel3dBusy = ref<'part' | 'pallet' | null>(null);
const specModel3dMsg = ref<string | null>(null);
let specModelPoll = 0;
async function loadSpecModels(id: number) {
  const [part, pallet] = await Promise.all([
    masterService.getModel(id, 'part').catch(() => null),
    masterService.getModel(id, 'pallet').catch(() => null),
  ]);
  if (specModal.value.row?.id !== id) return;
  specModel3d.value = { part, pallet };
  // Masih antre → cek lagi tiap 10 dtk selama modal terbuka.
  clearTimeout(specModelPoll);
  if ((part && !part.file_path) || (pallet && !pallet.file_path)) {
    specModelPoll = window.setTimeout(() => { if (specModal.value.open && specModal.value.row?.id === id) loadSpecModels(id); }, 10000);
  }
}
async function requestSpecModel(kind: 'part' | 'pallet') {
  const id = specModal.value.row?.id;
  if (!id) return;
  specModel3dBusy.value = kind;
  specModel3dMsg.value = null;
  try {
    const r = await masterService.requestModel(id, kind);
    specModel3dMsg.value = r.message;
    if (r.success) await loadSpecModels(id);
  } catch (e: any) {
    specModel3dMsg.value = e?.response?.data?.message ?? 'Gagal meminta model 3D.';
  } finally {
    specModel3dBusy.value = null;
  }
}
onUnmounted(() => clearTimeout(specModelPoll));

function openSpecModal(row: MsWelding | MsWeldingTreeNode) {
  specModal.value = { open: true, row: { ...row }, activeTab: 'info' };
  specGalleryPart.value = [];
  specGalleryPallet.value = [];
  specVariants.value = [];
  specTreeData.value = null;
  specBomData.value = [];
  cubeReset();
  specModel3d.value = { part: null, pallet: null };
  specModel3dMsg.value = null;
  specMediaMode.value = '3d';
  palletMediaMode.value = '3d';
  palletPhotoKey.value = 'cover';
  if (row.id) {
    loadSpecModels(row.id);
    masterService.getMedia(row.id, 'part').then((m) => { specGalleryPart.value = m; }).catch(() => {});
    masterService.getMedia(row.id, 'pallet').then((m) => { specGalleryPallet.value = m; }).catch(() => {});
    // varian delivery: baris varian → ambil milik part fisik basisnya
    const vid = (row as MsWelding).merged_into_id || row.id;
    deliveryVariantService.list(vid).then((v) => { specVariants.value = v; }).catch(() => {});
  }
}

// ── Kubus foto "3D" (Spec Modal, kolom kiri) ────────────────────────
// Bukan model 3D sungguhan (belum ada file CAD/GLB per part) — 6 foto sisi
// ditempel ke 6 wajah kubus CSS 3D, lalu kubusnya diputar bebas dgn drag.
// Sumber foto: ms_welding_media.view_side (diisi dari Edit → Media Part →
// Foto 6 Sisi). Sisi yg belum difoto tetap ada wajahnya (placeholder) supaya
// bentuk kubusnya utuh & user tahu sisi mana yg masih kurang.
// Mode "mengambang" (2.5D): tanpa kotak — tiap foto sisi (sudah hapus-background) jadi
// bidang tipis yg saling silang lewat titik tengah, jadi yg terlihat PART-nya, bukan kubus.
// Sisi yg menghadap kamera tampil penuh, sisi yg miring memudar. Putar otomatis tetap
// jalan saat di-drag (drag = dorongan + inersia), lalu pelan kembali ke putaran dasar.
const specCube = ref({ rx: -14, ry: 30, dragging: false, snapping: false, auto: true });
const CUBE_AUTO_SPEED = 0.3;   // derajat per frame (±18°/dtk)
let cubeVel = { x: 0, y: 0 };  // inersia setelah drag (derajat per frame)
let cubeDragLast: { x: number; y: number } | null = null;
let cubeDragMoved = false;
let cubeAutoRaf = 0;

const specCubeFaces = computed<Partial<Record<MediaViewSide, MsWeldingMedia>>>(() => {
  const map: Partial<Record<MediaViewSide, MsWeldingMedia>> = {};
  for (const m of specGalleryPart.value) if (m.view_side && m.media_type === 'image') map[m.view_side] = m;
  return map;
});
const specCubeHasAny = computed(() => Object.keys(specCubeFaces.value).length > 0);
const specCubeStyle = computed(() => ({
  transform: `rotateX(${specCube.value.rx}deg) rotateY(${specCube.value.ry}deg)`,
  transition: specCube.value.dragging || specCube.value.auto ? 'none' : 'transform .45s cubic-bezier(.2,.8,.2,1)',
}));
// Seberapa lurus tiap sisi menghadap kamera (komponen z normal setelah rotasi) → opacity.
// Sisi miring memudar supaya bidang yg bersilangan tak saling menimpa berantakan.
const cubeFaceOpacity = computed<Record<MediaViewSide, number>>(() => {
  const rx = (specCube.value.rx * Math.PI) / 180, ry = (specCube.value.ry * Math.PI) / 180;
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
  const o = (n: number) => Math.max(0, Math.min(1, (n - 0.12) / 0.55));
  // atas/bawah baru tampil saat benar2 dimiringkan (drag vertikal) — kalau tidak, bidangnya
  // terlihat sbg garis melintang di tengah part.
  const ov = (n: number) => Math.max(0, Math.min(1, (n - 0.5) / 0.35));
  return { front: o(cx * cy), back: o(-cx * cy), left: o(cx * sy), right: o(-cx * sy), top: ov(-sx), bottom: ov(sx) };
});
// Sisi yg paling menghadap kamera — buat highlight tombol & target dbl-klik.
const specCubeFacing = computed<MediaViewSide>(() => {
  const rx = specCube.value.rx;
  if (rx <= -45) return 'top';
  if (rx >= 45) return 'bottom';
  const ry = ((specCube.value.ry % 360) + 360) % 360;
  if (ry >= 315 || ry < 45) return 'front';
  if (ry < 135) return 'left';
  if (ry < 225) return 'back';
  return 'right';
});
function cubeReset() {
  specCube.value = { rx: -14, ry: 30, dragging: false, snapping: false, auto: true };
  cubeDragLast = null;
  cubeVel = { x: 0, y: 0 };
}
function cubePointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  specCube.value.dragging = true;   // putar otomatis TIDAK dihentikan
  cubeVel = { x: 0, y: 0 };
  cubeDragLast = { x: e.clientX, y: e.clientY };
  cubeDragMoved = false;
}
function cubePointerMove(e: PointerEvent) {
  if (!specCube.value.dragging || !cubeDragLast) return;
  const dx = e.clientX - cubeDragLast.x;
  const dy = e.clientY - cubeDragLast.y;
  cubeDragLast = { x: e.clientX, y: e.clientY };
  if (Math.abs(dx) + Math.abs(dy) > 2) cubeDragMoved = true;
  specCube.value.ry += dx * 0.5;
  cubeVel = { x: dx * 0.5, y: -dy * 0.5 };   // kecepatan terakhir → inersia saat dilepas
  // rx dibatasi ±90 supaya kubus tak pernah kebalik (atas/bawah tetap bisa dilihat penuh)
  specCube.value.rx = Math.max(-90, Math.min(90, specCube.value.rx - dy * 0.5));
}
function cubePointerUp(e: PointerEvent) {
  if (!specCube.value.dragging) return;
  specCube.value.dragging = false;
  cubeDragLast = null;
  try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* sudah lepas */ }
}
// Lompat ke sisi: pilih rotasi Y terdekat (mis. dari 350° ke 0° lewat 360°, bukan mundur 350°)
function cubeSnap(side: MediaViewSide) {
  const t = CUBE_SIDES.find(s => s.key === side)!;
  const cur = specCube.value.ry;
  let target = t.ry;
  while (target - cur > 180) target -= 360;
  while (cur - target > 180) target += 360;
  specCube.value.auto = false;
  specCube.value.rx = t.rx;
  specCube.value.ry = target;
}
function cubeOpenFacing() {
  if (cubeDragMoved) return;
  const m = specCubeFaces.value[specCubeFacing.value];
  if (m) mediaLightbox.value = m;
}
watch(() => specCube.value.auto && specModal.value.open, (on) => {
  cancelAnimationFrame(cubeAutoRaf);
  if (!on) return;
  const tick = () => {
    const c = specCube.value;
    if (!c.dragging) {
      // inersia drag meluruh, putaran dasar tetap jalan; kemiringan pelan kembali ke -14°
      c.ry += CUBE_AUTO_SPEED + cubeVel.x;
      c.rx = Math.max(-90, Math.min(90, c.rx + cubeVel.y + (-14 - c.rx) * 0.01));
      cubeVel = { x: cubeVel.x * 0.94, y: cubeVel.y * 0.94 };
    } else {
      c.ry += CUBE_AUTO_SPEED;
    }
    cubeAutoRaf = requestAnimationFrame(tick);
  };
  cubeAutoRaf = requestAnimationFrame(tick);
});
onUnmounted(() => cancelAnimationFrame(cubeAutoRaf));

// Tab Hierarki & BOM SAP di Spec Modal — state SENGAJA terpisah dari
// treeData/detailTreeData/bomData: tombol "Spesifikasi Lengkap" di Detail
// Modal (mobile) membuka Spec Modal TANPA menutup Detail Modal, jadi keduanya
// bisa terbuka bersamaan. Kalau share state, tab BOM/Hierarki di satu modal
// bisa ke-timpa data part dari modal lainnya.
const specTreeData    = ref<MsWeldingTree | null>(null);
const specTreeLoading = ref(false);
const specBomData     = ref<WeldingBomItem[]>([]);
const specBomLoading  = ref(false);
const specMasterSet = computed(() => {
  const node = specTreeData.value?.node;
  if (!node) return new Set<string>();
  return collectSubtree(node).set;
});
async function loadSpecTree() {
  const id = specModal.value.row?.id;
  if (!id) return;
  specTreeLoading.value = true;
  try {
    specTreeData.value = await masterService.getTree(id);
  } finally {
    specTreeLoading.value = false;
  }
}
async function loadSpecBom() {
  const pn = specModal.value.row?.part_number;
  if (!pn) return;
  specBomLoading.value = true;
  try {
    specBomData.value = await masterService.getBom(pn);
  } catch (e) {
    console.error('loadSpecBom error:', e);
  } finally {
    specBomLoading.value = false;
  }
}
// Lazy-load: baru fetch saat tab dibuka pertama kali (sama pola dgn tab BOM treeModal).
watch(() => specModal.value.activeTab, (tab) => {
  if ((tab === 'children' || tab === 'mother') && !specTreeData.value && !specTreeLoading.value) loadSpecTree();
  if (tab === 'bom' && specBomData.value.length === 0 && !specBomLoading.value) loadSpecBom();
});
// "Lihat lebih lengkap" — pindah dari tab ringkas Spec Modal ke editor Hierarki
// & BOM penuh (treeModal), yg punya aksi Children by SAP / Mother by SAP / Sync.
function openFullTreeFromSpec() {
  const row = specModal.value.row;
  specModal.value.open = false;
  if (row?.id) openTree(row.id, row.part_number);
}
async function openDetailModal(row: MsWelding) {
  if (window.innerWidth >= 1024) { openSpecModal(row); return; } // desktop: tampilkan spesifikasi part
  detailModal.value = { open: true, row: { ...row }, activeLeftTab: 'children' };
  detailTreeData.value  = null;
  detailTreeLoading.value = true;
  bomData.value           = [];
  bomSyncResult.value     = null;
  try {
    detailTreeData.value = await masterService.getTree(row.id!);
  } finally {
    detailTreeLoading.value = false;
  }
}

// Watch tab switch di detail modal (reuse bomData state)
watch(() => detailModal.value.activeLeftTab, (tab) => {
  if (tab === 'bom' && bomData.value.length === 0 && !bomLoading.value) {
    // Gunakan part_number dari row yang sedang dibuka di detail modal
    const pn = detailModal.value.row?.part_number;
    if (pn) {
      treeModal.value.partNumber = pn; // agar doSyncBom / loadBom tahu part numbernya
      loadBom();
    }
  }
});
function openEditFromDetail() {
  const row = detailModal.value.row;
  detailModal.value.open = false;
  if (row) openEditModal(row);
}
function confirmDeleteFromDetail() {
  const row = detailModal.value.row;
  detailModal.value.open = false;
  if (row) confirmDelete(row);
}
async function handleFormImageUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file || !form.value.id) return;
  (e.target as HTMLInputElement).value = '';
  imageUploading.value = true;
  imageError.value = null;
  try {
    const res = await masterService.uploadImage(form.value.id, file);
    if (!res.success) {
      imageError.value = res.message;
      return;
    }
    form.value.image = res.image;
    // refresh baris di tabel agar tombol lihat gambar langsung aktif
    const idx = rows.value.findIndex((r) => r.id === form.value.id);
    if (idx !== -1) rows.value[idx].image = res.image;
  } catch (err: any) {
    imageError.value = err?.response?.data?.message ?? 'Gagal upload gambar.';
  } finally {
    imageUploading.value = false;
  }
}
// Hapus cover part / pallet (file ikut dihapus di server); baris tabel ikut diperbarui.
async function removeCover(kind: 'part' | 'pallet') {
  const id = form.value.id;
  if (!id || !await confirmDialog(`Hapus cover ${kind === 'pallet' ? 'pallet' : 'part'} ini?`)) return;
  try {
    const res = await masterService.deleteCover(id, kind);
    if (!res.success) { alertDialog(res.message); return; }
    const col = kind === 'pallet' ? 'pallet_image' : 'image';
    form.value[col] = null;
    const idx = rows.value.findIndex((r) => r.id === id);
    if (idx !== -1) rows.value[idx][col] = null;
  } catch (e: any) {
    alertDialog(e?.response?.data?.message ?? 'Gagal menghapus cover.');
  }
}
async function handlePalletImageUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file || !form.value.id) return;
  (e.target as HTMLInputElement).value = '';
  palletImageUploading.value = true;
  palletImageError.value = null;
  try {
    const res = await masterService.uploadPalletImage(form.value.id, file);
    if (!res.success) {
      palletImageError.value = res.message;
      return;
    }
    form.value.pallet_image = res.pallet_image;
    const idx = rows.value.findIndex((r) => r.id === form.value.id);
    if (idx !== -1) rows.value[idx].pallet_image = res.pallet_image;
  } catch (err: any) {
    palletImageError.value = err?.response?.data?.message ?? 'Gagal upload gambar pallet.';
  } finally {
    palletImageUploading.value = false;
  }
}

// ── Galeri media (foto/video TAMBAHAN) — form Edit ─────────────────
// Terpisah dari image/pallet_image (cover tunggal di atas) — ini support
// banyak file sekaligus + video/gif, dipakai di Spec Modal sbg galeri.
const formGalleryPart = ref<MsWeldingMedia[]>([]);
const formGalleryPallet = ref<MsWeldingMedia[]>([]);
const galleryUploadingKind = ref<'part' | 'pallet' | null>(null);
const galleryError = ref<string | null>(null);

async function loadFormGallery() {
  const id = form.value.id;
  if (!id) { formGalleryPart.value = []; formGalleryPallet.value = []; return; }
  try {
    const [part, pallet] = await Promise.all([
      masterService.getMedia(id, 'part'),
      masterService.getMedia(id, 'pallet'),
    ]);
    formGalleryPart.value = part;
    formGalleryPallet.value = pallet;
  } catch { formGalleryPart.value = []; formGalleryPallet.value = []; }
  // Cover kosong bisa terisi otomatis di server (foto sisi Depan) → ambil ulang.
  if (!form.value.image || !form.value.pallet_image) {
    const d = await masterService.getDetail(id).catch(() => null);
    if (d && form.value.id === id) {
      if (!form.value.image && d.image) setFormCover('part', d.image);
      if (!form.value.pallet_image && d.pallet_image) setFormCover('pallet', d.pallet_image);
    }
  }
}
// Cover baru (otomatis dari 3D / foto Depan) → form + baris tabel.
function setFormCover(kind: 'part' | 'pallet', path: string) {
  const col = kind === 'pallet' ? 'pallet_image' : 'image';
  form.value[col] = path;
  const idx = rows.value.findIndex((r) => r.id === form.value.id);
  if (idx !== -1) rows.value[idx][col] = path;
}
async function handleGalleryUpload(e: Event, kind: 'part' | 'pallet') {
  const input = e.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  if (!files.length || !form.value.id) return;
  input.value = '';
  galleryUploadingKind.value = kind;
  galleryError.value = null;
  const id = form.value.id;
  try {
    // Upload berurutan (bukan Promise.all) — biar gak nembak banyak request
    // multipart bersamaan ke server yg sama, dan urutan sort_order predictable.
    for (const file of files) {
      const res = await masterService.uploadMedia(id, kind, file);
      if (!res.success) { galleryError.value = res.message; break; }
    }
    await loadFormGallery();
  } catch (err: any) {
    galleryError.value = err?.response?.data?.message ?? 'Gagal upload media.';
  } finally {
    galleryUploadingKind.value = null;
  }
}
// Foto 6 sisi (part & pallet) dikelola MediaSideGrid; galeri "biasa" = foto tanpa sisi
// (supaya 1 foto tak tampil 2×). formSideMap dipakai pilihan "→ sisi 3D" di galeri part.
const formSideMap = computed(() => sideMap(formGalleryPart.value));
const formGalleryPartPlain = computed(() => formGalleryPart.value.filter(m => !m.view_side));
const formGalleryPalletPlain = computed(() => formGalleryPallet.value.filter(m => !m.view_side));
async function assignGallerySide(item: MsWeldingMedia, side: string) {
  if (!side) return;
  try {
    const res = await masterService.setMediaSide(item.id, side as MediaViewSide);
    if (!res.success) galleryError.value = res.message;
    await loadFormGallery();
  } catch (err: any) {
    galleryError.value = err?.response?.data?.message ?? 'Gagal set sisi 3D.';
  }
}
async function deleteGalleryItem(item: MsWeldingMedia) {
  if (!await confirmDialog('Hapus media ini?')) return;
  try {
    const res = await masterService.deleteMedia(item.id);
    if (res.success) await loadFormGallery();
    else alertDialog(res.message);
  } catch (e: any) {
    alertDialog(e?.response?.data?.message ?? 'Gagal menghapus media.');
  }
}

// ── Socket realtime ───────────────────────────────────────────────
// Cek apakah sebuah row masih cocok dengan filter server-side aktif saat ini.
// Dipakai untuk menentukan apakah row baru/update perlu tampil di tabel.
function rowMatchesCurrentFilters(row: MsWelding): boolean {
  if (selectedLayer.value === 'IFPD') {
    // area selalu 'IFPD' di layer ini — grouping sub (SINGLE_FINISH/SUB_ASSY/
    // SEMI_SUB_ASSY/MODULE) berbasis category + REMARK di majsf_rundown.stocks,
    // bukan area, jadi tak bisa dicek 1:1 seperti biasa.
    if (row.category !== 'IFPD' && row.category !== 'SINGLE FINISH') return false;
    if (selectedSubArea.value === 'SINGLE_FINISH' && row.category !== 'SINGLE FINISH') return false;
    if (['SUB_ASSY', 'SEMI_SUB_ASSY', 'MODULE'].includes(selectedSubArea.value ?? '') && row.category !== 'IFPD') return false;
    // Sub-grup persisnya butuh lookup REMARK cross-DB (tak tersedia per-row di
    // client) — best-effort di sini; loadList() reload penuh tetap jadi sumber
    // kebenaran akhir.
  } else {
    if (isIfpwAreaSel.value) { if (!selectedAreaZones.value.includes(row.area || '')) return false; }
    else if (selectedSubArea.value && row.area !== selectedSubArea.value) return false;
    if (selectedLayer.value && !selectedSubArea.value) {
      const lc = LAYER_CONFIG.find(l => l.key === selectedLayer.value);
      const validAreas = tabAreaGroup.value.length ? tabAreaGroup.value : (lc?.subs.length ? lc.subs.map(s => s.key) : [selectedLayer.value]);
      if (!validAreas.includes(row.area)) return false;
    }
  }
  if (filterWip.value !== null && (row.is_wip ? 1 : 0) !== filterWip.value) return false;
  if (filterStatus.value === 'active'   && row.is_runout)  return false;
  if (filterStatus.value === 'obsolete' && !row.is_runout) return false;
  if (searchQuery.value && !matchesSearch(row, searchQuery.value)) return false;
  return true;
}

// Sama dgn backend (_search_clause): tiap kata wajib cocok (urutan bebas), gaya SAP —
// '*' = apa saja, '?' = 1 karakter; kata dgn wildcard dicocokkan per kolom dari awal (57115* = diawali 57115).
function matchesSearch(row: MsWelding, query: string): boolean {
  // part_number_delivery hanya utk FP/COMMON — di baris WIP berisi nomor mother (data lama).
  const fields = [row.part_number, row.part_number_mix, (!row.is_wip || row.is_common) ? row.part_number_delivery : null, row.job_number, row.car_name, row.machine, row.alias, row.part_name]
    .filter(Boolean).map(v => String(v).toLowerCase());
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean).every((w) => {
    if (!/[*?]/.test(w)) return fields.some(f => f.includes(w));
    const re = new RegExp('^' + w.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return fields.some(f => re.test(f));
  });
}

// Smart merge — tidak replace seluruh rows.value agar tidak flicker.
// Dipanggil baik dari socket event (perubahan client lain) maupun setelah
// aksi CRUD lokal (menggantikan loadList()).
// Baris hilang dari halaman (hapus / nonaktif / tak cocok filter lagi) → muat ulang halaman
// ini diam-diam supaya baris berikutnya naik & halaman tetap penuh. Debounce: beberapa event
// beruntun cukup 1 request.
let refillTimer = 0;
function refillPage() {
  clearTimeout(refillTimer);
  refillTimer = window.setTimeout(() => loadList(currentPage.value), 250);
}
function applySocketUpdate(payload: { action: string; data?: MsWelding; id?: number }) {
  const { action, data, id } = payload;

  if (action === 'tree') { onRemoteTreeChange(); return; }

  if (action === 'create' && data) {
    if (rowMatchesCurrentFilters(data)) {
      // Prepend: row baru muncul di atas tanpa re-render seluruh tabel
      rows.value = [data, ...rows.value];
      totalRows.value++;
    }
    loadStats();
    return;
  }

  if (action === 'update' && data) {
    const rowId = data.id ?? id;
    const idx   = rows.value.findIndex(r => r.id === rowId);
    if (idx !== -1) {
      if (rowMatchesCurrentFilters(data)) {
        // In-place update: Vue reuse <tr> sama → tidak ada flicker sama sekali
        Object.assign(rows.value[idx], data);
      } else {
        // Row tidak lagi cocok filter → hapus saja
        rows.value.splice(idx, 1);
        refillPage();
        totalRows.value = Math.max(0, totalRows.value - 1);
      }
    }
    return;
  }

  if (action === 'soft_delete' && id != null) {
    const idx = rows.value.findIndex(r => r.id === id);
    if (idx !== -1) {
      if (filterStatus.value === 'active') {
        // Mode "Aktif": baris yang di-nonaktifkan hilang
        rows.value.splice(idx, 1);
        refillPage();
        totalRows.value = Math.max(0, totalRows.value - 1);
      } else if (filterStatus.value === 'obsolete') {
        // Mode "Nonaktif": update is_runout in-place supaya muncul
        Object.assign(rows.value[idx], { is_runout: true });
      } else {
        // Mode "Semua": update in-place
        Object.assign(rows.value[idx], { is_runout: true });
      }
    }
    loadStats();
    return;
  }

  if (action === 'hard_delete' && id != null) {
    const idx = rows.value.findIndex(r => r.id === id);
    if (idx !== -1) {
      rows.value.splice(idx, 1);
        refillPage();
      totalRows.value = Math.max(0, totalRows.value - 1);
    }
    loadStats();
  }
}

// ════════════════════════════════════════════════════════════════
//  Keyboard shortcuts + manajemen modal (Esc / tombol close saja)
// ════════════════════════════════════════════════════════════════
const searchInput = ref<HTMLInputElement | null>(null);

function anyModalOpen(): boolean {
  return (
    addChildModal.value.open || reconcileModal.value.open || formModal.value.open ||
    deleteModal.value.open || imageModal.value.open || detailModal.value.open || specModal.value.open ||
    treeModal.value.open || pairingOpen.value || uploadModal.value.open ||
    uploadMenuOpen.value || compareOpen.value || variantModal.value.open ||
    // motherBySapModal & overrideDialog dulu gak kedaftar di sini — modal-nya tetap
    // kebuka & interaktif (mis. lagi ngetik di search Mother by SAP), tapi shortcut
    // keyboard global (N/D/U/dst) masih aktif nyelonong di baliknya.
    motherBySapModal.value.open || overrideDialog.value.open
  );
}

function onGlobalKeydown(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  const tag = (t?.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || !!t?.isContentEditable;

  // Esc → modal teratas ditutup oleh v-modal-stack (fungsi tutup per modal, urutan
  // tumpuk sebenarnya). Sampai sini berarti tak ada modal → cukup lepas fokus input.
  if (e.key === 'Escape') {
    if (typing && t) t.blur();
    return;
  }

  // Ctrl/Cmd+S atau Ctrl/Cmd+Enter → simpan form Tambah/Edit Part (walau sedang mengetik).
  if (formModal.value.open && (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
    e.preventDefault();
    if (!formSaving.value) handleFormSubmit();
    return;
  }

  // Enter → konfirmasi aksi utama modal (kecuali sedang menekan Shift)
  if (e.key === 'Enter' && !e.shiftKey) {
    if (addChildModal.value.open) {
      const ok = addChildMode.value === 'existing' ? !!addChildSelected.value : !!addChildForm.value.part_number.trim();
      if (ok && !addChildSaving.value) { e.preventDefault(); saveAddChild(); }
      return;
    }
    if (reconcileModal.value.open && !typing) {
      if (reconcileSelCount.value > 0 && !reconcileApplying.value) { e.preventDefault(); applyReconcile(); }
      return;
    }
    if (deleteModal.value.open && !deleting.value) { e.preventDefault(); handleDelete(); return; }
    if (uploadModal.value.open) {
      // Textarea paste butuh Enter untuk baris baru — jangan auto-submit di sini.
      return;
    }
  }

  // Menu Aplikasi terbuka → shortcut 1-4 / W / K / D / Esc ditangani MasterAppMenu.vue (capture)
  if (uploadMenuOpen.value) return;

  if (typing) return;

  // Shortcut global (hanya saat tak ada modal)
  if (!anyModalOpen()) {
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openCreateModal(); }
    else if (e.key === '/') { e.preventDefault(); searchInput.value?.focus(); }
    // Unduh kini lewat Menu Aplikasi (Unduh per Area): D buka menu, D lagi = unduh.
    else if (e.key === 'd' || e.key === 'D') { e.preventDefault(); uploadMenuOpen.value = true; }
    else if (e.key === 'u' || e.key === 'U') { e.preventDefault(); uploadMenuOpen.value = true; }
  }
}

const route = useRoute();

// Warna area = palet Master Area & Mesin (WSS biru · CO oranye · SA ungu, shade per plant).
// Hanya area yg ada di palet; lainnya (INHOUSE, IFRM, …) tetap gaya bawaan. List "A, B" → warna area pertama.
const { AREA_PALETTE } = useAreaColor();
function areaTagStyle(area: string | null | undefined): Record<string, string> | undefined {
  const key = String(area ?? '').split(',')[0].trim().toUpperCase();
  const c = AREA_PALETTE[key];
  return c ? { '--area-pill': c.pill, '--area-pill-text': c.pillText, '--area-border': c.border } : undefined;
}

// Runout berurutan → satu pita gabungan: index baris pertama = panjang deret, lainnya 0.
const runoutRuns = computed(() => {
  const rs = displayRows.value; const out: number[] = new Array(rs.length).fill(0);
  const isRo = (r: MsWelding) => !!r.is_runout && !r.merged_into_id;
  for (let i = 0; i < rs.length; i++) {
    if (!isRo(rs[i]) || (i > 0 && isRo(rs[i - 1]))) continue;
    let n = 1; while (i + n < rs.length && isRo(rs[i + n])) n++;
    out[i] = n;
  }
  return out;
});

// Wadah tabel setinggi isinya — scrollbar horizontal ikut dihitung, kalau tidak 10 baris
// kurang 15px & muncul scroll vertikal padahal layar masih cukup.
const tableWrapEl = ref<HTMLElement | null>(null);
let tableWrapRo: ResizeObserver | null = null;
let tableWrapMo: MutationObserver | null = null;
function fitTableWrap() {
  const el = tableWrapEl.value;
  if (!el) return;
  // Tinggi isi = semua anak dalam alur (banner filter, tabel, empty state), bukan cuma <table>.
  let content = 0;
  for (const c of Array.from(el.children) as HTMLElement[]) {
    const cs = getComputedStyle(c);
    if (cs.position === 'absolute' || cs.position === 'fixed' || cs.display === 'none') continue;
    content += c.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
  }
  const hbar = el.offsetHeight - el.clientHeight;   // tinggi scrollbar horizontal (+ border)
  el.style.flexBasis = `${Math.ceil(content) + hbar}px`;
}
onMounted(() => {
  tableWrapRo = new ResizeObserver(() => fitTableWrap());
  if (tableWrapEl.value) { tableWrapRo.observe(tableWrapEl.value); tableWrapMo = new MutationObserver(() => { for (const c of Array.from(tableWrapEl.value?.children ?? [])) tableWrapRo?.observe(c); requestAnimationFrame(fitTableWrap); }); for (const c of Array.from(tableWrapEl.value.children)) tableWrapRo.observe(c); window.addEventListener('resize', fitTableWrap); tableWrapMo.observe(tableWrapEl.value, { childList: true, subtree: true }); }
});
onUnmounted(() => { tableWrapRo?.disconnect(); tableWrapMo?.disconnect(); window.removeEventListener('resize', fitTableWrap); });

onMounted(async () => {
  window.addEventListener('keydown', onGlobalKeydown);
  // Deep-link dari halaman lain (mis. Cek DN vs Master Data) — ?search=<part_number>
  // langsung prefill kotak pencarian.
  const qSearch = route.query.search;
  if (typeof qSearch === 'string' && qSearch.trim()) searchQuery.value = qSearch.trim();
  await Promise.all([loadAreas(), loadWeldingAreas()]);
  await Promise.all([loadStats(), loadList(1)]);
  socket.on('welding_master_updated', applySocketUpdate);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
  window.removeEventListener('pageshow', onPageShow);
  socket.off('welding_master_updated', applySocketUpdate);
});

// ── Reset filter saat same-route re-navigation (klik sidebar ke halaman sama) ──
function resetFilters() {
  selectedLayer.value   = null;
  selectedSubArea.value = null;
  filterWip.value       = null;
  filterStatus.value    = 'all';
  searchQuery.value     = '';
  filters.value         = { part_number: [], job: [], model: [], ckd_type: [], area: [], machine: [], customer: [], part_combo: [], job_combo: [], area_combo: [], next_combo: [], customer_combo: [] };
  try { localStorage.removeItem(FILTER_STORAGE_KEY); } catch {}
}

onBeforeRouteUpdate(() => {
  resetFilters();
  loadList(1);
  loadStats();
});

// Bfcache: browser back button restore tanpa lifecycle — reset manual
function onPageShow(e: PageTransitionEvent) {
  if (e.persisted) {
    resetFilters();
    loadList(1);
  }
}
window.addEventListener('pageshow', onPageShow);
</script>

<!-- CSS dipisah ke master-data.css (4.000+ baris) supaya SFC ini tetap terbaca; scoped tetap berlaku. -->
<style scoped src="./master-data.css"></style>
