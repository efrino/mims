<template>
  <div class="page-wrapper">
    <!-- ===== TOP FILTER CARD ===== -->
    <v-card class="pa-6 rounded-lg mb-6 elevation-2">
      <div class="d-flex justify-space-between align-center mb-4">
        <div>
          <div class="text-h5 font-weight-medium mb-2">
            {{ pageTitle }} Monitoring
          </div>
          <div class="text-body-2 text-grey-darken-1">
            Visualisasi {{ pageTitle }}: summary, kalender, chart, dan export Excel.
          </div>
        </div>

        <div style="width: 300px;">
          <v-select
            v-model="activeType"
            :items="typeOptions"
            item-title="text"
            item-value="value"
            label="Pilih Mode Monitoring"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-monitor-dashboard"
            hide-details
            class="elevation-0"
          />
        </div>
      </div>

      <v-divider class="mb-4" />

      <v-row dense>
        <v-col cols="3">
        <v-text-field
      :model-value="monthText"
      label="Select Month"
      variant="outlined"
      prepend-inner-icon="mdi-calendar-month"
      density="comfortable"
      readonly
      @click="menuMonth = true"
    />

    <v-dialog v-model="menuMonth" width="420">
      <v-card class="pa-4">
        <div class="d-flex justify-space-between align-center mb-4">
          <v-btn icon variant="text" @click="selectedYear--">
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>

          <div class="text-h6 font-weight-bold">
            {{ selectedYear }}
          </div>

          <v-btn icon variant="text" @click="selectedYear++">
            <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
        </div>

        <v-row dense>
          <v-col
            v-for="m in months"
            :key="m.value"
            cols="4"
          >
            <v-btn
              block
              :color="isSelectedMonth(m.value) ? 'primary' : 'grey-lighten-3'"
              :variant="isSelectedMonth(m.value) ? 'flat' : 'tonal'"
              class="text-none"
              @click="pickMonth(m.value)"
            >
              {{ m.label }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card>
    </v-dialog>
        </v-col>

        <v-col cols="4" class="d-flex align-center">
          <v-btn
            color="primary"
            prepend-icon="mdi-database-search"
            class="px-6 text-white mr-2"
            @click="loadData"
            :loading="loading"
          >
            Load {{ activeType === 'compare' ? 'Data' : activeType.toUpperCase() }}
          </v-btn>

            <v-btn
            v-if="activeType !== 'compare'"
            color="yellow-darken-2"
            class="px-6 text-black"
            prepend-icon="mdi-cloud-refresh"
            @click="doGenerateSap"
            :loading="loadingGenerate"
            >
            Generate SAP
            </v-btn>
        </v-col>
      </v-row>

     
    </v-card>

    <!-- ===== NON-COMPARE SECTION ===== -->
  <div v-if="activeType !== 'compare'">
    <v-card class="pa-5 rounded-lg mb-6 elevation-2">
      <div class="d-flex justify-space-between align-center mb-4">
        <div class="text-h6 text-primary font-weight-medium">
          {{ activeType === 'mdfo' ? 'MDFO Detail' : 'Sales Order Detail' }}
          ({{ activeType.toUpperCase() }})
        </div>
       <v-btn
          color="#1D6F42"
          prepend-icon="mdi-file-excel"
          variant="elevated"
          @click="exportSummaryExcel"
          :disabled="filteredMerged.length === 0"
        >
          Export Excel
        </v-btn>
      </div>

      <!-- Filter Row -->
      <v-row dense class="mb-3">
        <v-col cols="4">
          <v-text-field
            v-model="searchPart"
            :label="searchLabel"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-magnify"
            hide-details
          />
        </v-col>
        <v-col cols="3">
          <v-select
            v-model="filterCustomer"
            :items="customerList"
            item-title="title"
            item-value="value"
            label="Filter Customer"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-account"
            clearable
            hide-details
          />
        </v-col>
      </v-row>

      <!-- Merged Table -->
      <v-data-table
        :headers="mergedHeaders"
        :items="filteredMerged"
        :loading="loading"
        density="compact"
        class="elevation-1 rounded-lg premium-table dynamic-height-table"
        hover
      >
        <!-- Custom header: weekend highlight -->
        <template #headers="{ columns, sortBy, toggleSort }">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                        'calendar-header-cell',
                        col.isWeekend ? 'weekend-header' : '',   // <-- pakai col.isWeekend
                        col.sortable !== false ? 'sortable-col' : '',
                      ]"
              :style="col.width ? `min-width:${col.width}px; width:${col.width}px;` : ''"
              @click="col.sortable !== false ? toggleSort(col) : null"
            >
              <div class="header-inner">
                <span>{{ col.title }}</span>

                <!-- Hanya tampil jika kolom sortable -->
                <span v-if="col.sortable !== false" class="sort-icon-wrap">
                  <!-- Panah atas: tampil hanya saat sort asc aktif di kolom ini -->
                  <v-icon
                    v-if="sortBy?.[0]?.key === col.key && sortBy[0].order === 'asc'"
                    size="14"
                    color="primary"
                  >
                    mdi-arrow-up
                  </v-icon>

                  <!-- Panah bawah: tampil hanya saat sort desc aktif di kolom ini -->
                  <v-icon
                    v-else-if="sortBy?.[0]?.key === col.key && sortBy[0].order === 'desc'"
                    size="14"
                    color="primary"
                  >
                    mdi-arrow-down
                  </v-icon>

                  <!-- Placeholder saat tidak aktif: icon netral kecil agar layout tidak loncat -->
                  <v-icon
                    v-else
                    size="14"
                    color="grey-lighten-2"
                  >
                    mdi-unfold-more-horizontal
                  </v-icon>
                </span>
              </div>
            </th>
          </tr>
        </template>

        <!-- Custom row -->
        <template #item="{ item }">
          <tr>
            <td>{{ item.nama_customer }}</td>
            <td>{{ item.zmodel }}</td>
            <td class="sticky-col font-weight-bold">{{ item.matnr }}</td>
        
            <td>{{ item.job_number }}</td>

            <!-- vbeln: SO type tambahkan posnr -->
            <!--<td v-if="activeType === 'so'">
              {{ item.vbeln }}{{ item.posnr ? '-' + item.posnr : '' }}
            </td>
            <td v-else>{{ item.vbeln }}</td>  -->

            <!-- PCS/Day khusus MDFO -->
            <td v-if="activeType === 'mdfo'" class="text-center">
              {{ new Intl.NumberFormat('id-ID').format(Number(item.pcs_day_monthly) || 0) }}
            </td>

            

            <!-- Total Qty -->
            <td class="text-center font-weight-bold">
              {{ new Intl.NumberFormat('id-ID').format(Number(item.tot) || 0) }}
            </td>

            <!-- Kolom tanggal t1-t31 -->
            <td
              v-for="d in 31"
              :key="d"
              :class="['text-center', ...getCellClass(item[`t${d}`], d)]"
            >
              {{ item[`t${d}`] || '' }}
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>
  </div>

    <!-- ===== COMPARE SECTION ===== -->
    <div v-if="activeType === 'compare'">

      <!-- ===== KALENDER MDFO vs SO BY PART NUMBER ===== -->
      <v-card
        class="pa-5 rounded-lg elevation-2 mb-6 cal-card-wrap"
        style="position:relative"
    
        >
          <!-- Header -->
          <div class="d-flex flex-column mb-3" style="gap:16px">
            <div class="d-flex justify-space-between align-center flex-wrap" style="gap:8px">
              <div>
                <div class="text-h6 text-primary font-weight-medium">
                  Kalender MDFO vs SO 
                </div>
                <div class="text-caption text-grey mt-1">
                  Klik header <strong>W1–W{{ calendarWeekRanges.length }}</strong>
                  untuk highlight minggu &amp; lihat subtotal
                </div>
              </div>

              <!-- Bagian Legend -->
              <div class="d-flex align-center flex-wrap" style="gap:15px; background: #f8f9fa; padding: 10px 15px; border-radius: 8px; border: 1px solid #e0e0e0;">
                <div class="d-flex align-center">
                  <v-badge dot inline color="#1565c0" class="mr-2"></v-badge>
                  <span class="text-caption"><strong>MDFO:</strong> Forecast 1 Bulan</span>
                </div>
                <div class="d-flex align-center">
                  <v-badge dot inline color="#2e7d32" class="mr-2"></v-badge>
                  <span class="text-caption"><strong>SO:</strong> Sales Order / Fix Order 1 Bulan</span>
                </div>
                <div class="d-flex align-center">
                  <v-badge dot inline color="#6a1b9a" class="mr-2"></v-badge>
                  <span class="text-caption"><strong>GAP:</strong> MDFO - SO</span>
                </div>
              </div>
            </div>

            <!-- Baris Filter & Search -->
            <div class="d-flex align-center flex-wrap" style="gap:10px">
              <v-chip
                v-if="selectedWeek"
                color="primary" variant="flat" size="small" closable
                @click:close="closeWeekTooltip"
                class="mr-2"
              >
                {{ calendarWeekRanges.find(w => w.id === selectedWeek)?.label }}
                ({{ calendarWeekRanges.find(w => w.id === selectedWeek)?.start }}–{{
                  calendarWeekRanges.find(w => w.id === selectedWeek)?.end }})
              </v-chip>

              <!-- Search Text Field diperbesar (max-width: 500px) -->
              <v-text-field
                v-model="calendarSearch"
                density="comfortable" 
                hide-details 
                clearable
                placeholder="Cari Part Number, Model, atau Job Number..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                style="max-width: 500px; flex-grow: 1;" 
              />

              <v-select
                v-model="calendarPageSize"
                :items="calendarPageOptions"
                item-title="title" item-value="value"
                density="comfortable" 
                hide-details 
                label="Rows"
                variant="outlined"
                style="max-width: 120px"
              />
            </div>
          </div>

          <!-- Info count -->
          <div class="text-caption text-grey mb-2">
            Tampil {{ calendarPaged.length }} / {{ calendarFiltered.length }} part
          </div>

          <!-- Tabel -->
          <div style="overflow-x:auto; overflow-y:auto; max-height:680px">
            <table class="cal-table">

              <thead>
                <!-- ── Baris 1: Label Minggu (colspan menyesuaikan lebar kolom) ── -->
                <tr>
                  <!-- 1. KOLOM CUSTOMER (Rowspan 2, Sticky Kiri Terluar) -->
                  <th rowspan="2" class="cal-th cal-sticky cal-th-cust"
                      style="cursor:pointer; min-width:30px; left:0; z-index:6"
                      @click="calendarToggleSort('customer')">
                    <div class="cal-th-inner">
                      Customer
                      <v-icon size="13">{{ calendarSortIcon('customer') }}</v-icon>
                    </div>
                  </th>

                  <!-- 2. KOLOM MODEL (Pindah ke kiri setelah Customer) -->
                  <th rowspan="2" class="cal-th cal-th-sm"
                      style="cursor:pointer; min-width:30px"
                      @click="calendarToggleSort('zmodel')">
                    <div class="cal-th-inner">
                      Model
                      <v-icon size="13">{{ calendarSortIcon('zmodel') }}</v-icon>
                    </div>
                  </th>

                  <!-- 3. KOLOM PART NUMBER (Sticky Kiri, Left diatur bergeser setelah kolom customer) -->
                  <th rowspan="2" class="cal-th cal-sticky cal-th-id"
                      style="cursor:pointer; min-width:100px; left:100px; z-index:5"
                      @click="calendarToggleSort('matnr')">
                    <div class="cal-th-inner">
                      Part Number
                      <v-icon size="13">{{ calendarSortIcon('matnr') }}</v-icon>
                    </div>
                  </th>

                  <!-- 4. KOLOM JOB NUMBER (Kolom Baru di sebelah Part Number) -->
                  <th rowspan="2" class="cal-th"
                      style="cursor:pointer; min-width:80px"
                      @click="calendarToggleSort('job_number')">
                    <div class="cal-th-inner">
                      Job Number
                      <v-icon size="13">{{ calendarSortIcon('job_number') }}</v-icon>
                    </div>
                  </th>
                  
                  <!-- 5. KOLOM TYPE -->
                  <th rowspan="2" class="cal-th cal-th-type-hd">Type</th>

                  <!-- W header — klikable, colspan = lebar minggu -->
                  <th
                    v-for="w in calendarWeekRanges"
                    :key="'wgrp-' + w.id"
                    :colspan="w.end - w.start + 1"
                    class="cal-th cal-th-wgrp"
                    :class="{ 'cal-wgrp-active': selectedWeek === w.id }"
                    @click="onWeekHeaderClick(w.id, $event)"
                  >
                    <div class="cal-th-inner" style="justify-content:center; gap:3px">
                      <v-icon size="12" style="opacity:.75">mdi-calendar-week</v-icon>
                      {{ w.label }}
                      <span style="font-size:10px; font-weight:400; opacity:.8">
                        ({{ w.start }}–{{ w.end }})
                      </span>
                    </div>
                  </th>

                  <!-- Total bulan rowspan=2 -->
                  <th rowspan="2" class="cal-th cal-th-total"
                      style="cursor:pointer; min-width:90px"
                      @click="calendarToggleSort('total_gap')">
                    <div class="cal-th-inner" style="justify-content:center">
                      Total<br>GAP
                      <v-icon size="13">{{ calendarSortIcon('total_gap') }}</v-icon>
                    </div>
                  </th>
                </tr>

                <!-- ── Baris 2: Angka tanggal 1–N ── -->
                <tr>
                  <th
                    v-for="d in daysInSelectedMonth"
                    :key="'dh-' + d"
                    class="cal-th cal-th-day"
                    :class="{
                      'cal-wgrp-active' : isDayInSelectedWeek(d) && !isWeekend(d),
                      'cal-day-we'      : isWeekend(d) && !isDayInSelectedWeek(d),
                      'cal-day-we-hl'   : isWeekend(d) && isDayInSelectedWeek(d),
                    }"
                  >
                    {{ d }}
                  </th>
                </tr>
              </thead>

            <tbody>
              <!-- ── Rows per part ── -->
              <template v-for="item in calendarPaged" :key="item.matnr">
                <!-- BARIS 1: MDFO (Menampung semua td dengan rowspan="4") -->
                <tr class="cal-row-mdfo">
                  <!-- 1. DATA CUSTOMER -->
                  <td rowspan="4" class="cal-td cal-sticky cal-td-cust text-center font-weight-normal" style="left:0; z-index:2; background:#fff;">
                    <div>{{ item.customer }}</div>
                  </td>
                  
                  <!-- 2. DATA MODEL -->
                  <td rowspan="4" class="cal-td cal-td-sm text-center font-weight-normal text-caption text-grey">
                    {{ item.zmodel }}
                  </td>

                  <!-- 3. DATA PART NUMBER -->
                  <td rowspan="4" class="cal-td cal-sticky text-center font-weight-normal" style="left:100px; z-index:2; background:#fff; font-size:12px">
                    {{ item.matnr }}
                  </td>

                  <!-- 4. DATA JOB NUMBER -->
                  <td rowspan="4" class="cal-td text-center font-weight-normal text-caption font-mono">
                    {{ item.job_number || '-' }}
                  </td>

                  <!-- 5. TYPE (MDFO) -->
                  <td class="cal-td cal-td-type cal-type-mdfo text-center font-weight-normal">MDFO</td>
                  
                  <!-- Kolom Tanggal -->
                  <td
                    v-for="d in daysInSelectedMonth" :key="'m' + d"
                    class="cal-td cal-td-day text-center"
                    :class="{
                      'cal-day-hl'    : isDayInSelectedWeek(d) && !isWeekend(d),
                      'cal-day-we'    : isWeekend(d) && !isDayInSelectedWeek(d),
                      'cal-day-we-hl' : isWeekend(d) && isDayInSelectedWeek(d),
                    }"
                  >
                    {{ item.mdfo[d] ? numberFormat(item.mdfo[d]) : '' }}
                  </td>
                  <td class="cal-td cal-td-total text-center font-weight-normal">{{ numberFormat(item.total_mdfo) }}</td>
                </tr>

                <!-- BARIS 2: SALES / SO -->
                <tr class="cal-row-sales">
                  <td class="cal-td cal-td-type cal-type-sales text-center font-weight-normal">SO</td>
                  <td
                    v-for="d in daysInSelectedMonth" :key="'s' + d"
                    class="cal-td cal-td-day text-center"
                    :class="{
                      'cal-day-hl'    : isDayInSelectedWeek(d) && !isWeekend(d),
                      'cal-day-we'    : isWeekend(d) && !isDayInSelectedWeek(d),
                      'cal-day-we-hl' : isWeekend(d) && isDayInSelectedWeek(d),
                    }"
                  >
                    {{ item.sales[d] ? numberFormat(item.sales[d]) : '' }}
                  </td>
                  <td class="cal-td cal-td-total text-center font-weight-normal">{{ numberFormat(item.total_sales) }}</td>
                </tr>

                <!-- BARIS 3: GAP -->
                <tr class="cal-row-gap">
                  <td class="cal-td cal-td-type cal-type-gap text-center font-weight-normal">GAP</td>
                  <td
                    v-for="d in daysInSelectedMonth" :key="'g' + d"
                    class="cal-td cal-td-day text-center"
                    :class="{
                      'cal-day-hl'    : isDayInSelectedWeek(d) && !isWeekend(d),
                      'cal-day-we'    : isWeekend(d) && !isDayInSelectedWeek(d),
                      'cal-day-we-hl' : isWeekend(d) && isDayInSelectedWeek(d),
                      'cal-gap-pos'   : (item.gap[d] || 0) > 0,
                      'cal-gap-neg'   : (item.gap[d] || 0) < 0,
                    }"
                  >
                    {{ item.gap[d] ? numberFormat(item.gap[d]) : '' }}
                  </td>
                  <td
                    class="cal-td cal-td-total text-center font-weight-normal"
                    :class="{
                      'cal-gap-pos': item.total_gap > 0,
                      'cal-gap-neg': item.total_gap < 0,
                    }"
                  >
                    {{ numberFormat(item.total_gap) }}
                  </td>
                </tr>

                <!-- BARIS 4: AKUMULASI GAP -->
                <tr class="cal-row-acc">
                  <td class="cal-td cal-td-type cal-type-acc text-center font-weight-normal">ACCUM</td>
                  <td
                    v-for="d in daysInSelectedMonth" :key="'acc' + d"
                    class="cal-td cal-td-day text-center"
                    :class="[...getAccClass(getAccumulatedGap(item, d)), isDayInSelectedWeek(d) ? 'cal-day-hl' : '']"
                    style="background-color: #fcfcfc;"
                  >
                    {{ getAccumulatedGap(item, d) !== 0 ? numberFormat(getAccumulatedGap(item, d)) : '' }}
                  </td>
                  <td class="cal-td cal-td-total text-center font-weight-normal">
                    {{ numberFormat(item.total_gap) }}
                  </td>
                </tr>

                <!-- Separator -->
                <tr class="cal-sep">
                  <td :colspan="6 + daysInSelectedMonth"></td>
                </tr>
              </template>

              <!-- ── GRAND TOTAL ── -->
              <template v-for="type in ['mdfo', 'sales', 'gap']" :key="'gt' + type">
                <tr :class="['cal-row-gt', type === 'gap' ? 'cal-row-gt-gap' : '']">
                  <td v-if="type === 'mdfo'" rowspan="3"
                      class="cal-sticky text-center font-weight-normal" style="font-size:12px; left:0; z-index:3; background:#eee;">
                    GRAND TOTAL
                  </td>
                  <td v-if="type === 'mdfo'" rowspan="3" class="cal-td-sm" style="background:#eee;"></td>
                  <td v-if="type === 'mdfo'" rowspan="3" class="cal-sticky cal-td-sm" style="left:100px; z-index:3; background:#eee;"></td>
                  <td v-if="type === 'mdfo'" rowspan="3" class="cal-td-sm" style="background:#eee;"></td>
                  
                  <td
                    class="cal-td cal-td-type text-center font-weight-normal"
                    :class="{
                      'cal-type-mdfo' : type === 'mdfo',
                      'cal-type-sales': type === 'sales',
                      'cal-type-gap'  : type === 'gap',
                    }"
                  >
                    {{ type === 'mdfo' ? 'MDFO' : type === 'sales' ? 'SO' : 'GAP' }}
                  </td>
                  <td
                    v-for="d in daysInSelectedMonth" :key="'gt' + type + d"
                    class="cal-td cal-td-day text-center font-weight-normal"
                    :class="{
                      'cal-day-hl'    : isDayInSelectedWeek(d) && !isWeekend(d),
                      'cal-day-we'    : isWeekend(d) && !isDayInSelectedWeek(d),
                      'cal-day-we-hl' : isWeekend(d) && isDayInSelectedWeek(d),
                      'cal-gap-pos'   : type === 'gap' && (calendarDailyGrandTotal.gap[d] || 0) > 0,
                      'cal-gap-neg'   : type === 'gap' && (calendarDailyGrandTotal.gap[d] || 0) < 0,
                    }"
                  >
                    {{ calendarDailyGrandTotal[type][d] ? numberFormat(calendarDailyGrandTotal[type][d]) : '' }}
                  </td>
                  <td
                    class="cal-td cal-td-total text-center font-weight-normal"
                    :class="{
                      'cal-gap-pos': type === 'gap' && calendarMdfoSoPivot.reduce((s,i) => s + i.total_gap,   0) > 0,
                      'cal-gap-neg': type === 'gap' && calendarMdfoSoPivot.reduce((s,i) => s + i.total_gap,   0) < 0,
                    }"
                  >
                    {{
                      type === 'mdfo'  ? numberFormat(calendarMdfoSoPivot.reduce((s,i) => s + i.total_mdfo,  0)) :
                      type === 'sales' ? numberFormat(calendarMdfoSoPivot.reduce((s,i) => s + i.total_sales, 0)) :
                                        numberFormat(calendarMdfoSoPivot.reduce((s,i) => s + i.total_gap,   0))
                    }}
                  </td>
                </tr>
              </template>
            </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="d-flex justify-space-between align-center mt-3">
            <div class="text-caption text-grey">
              {{ calendarPaged.length }} / {{ calendarFiltered.length }} part ditampilkan
              <span v-if="calendarPageSize !== -1 && calendarFiltered.length > calendarPageSize">
                · pilih <strong>All</strong> untuk lihat semua
              </span>
            </div>
          </div>

          <!-- ── Tooltip popup ── -->
          <transition name="tt-fade">
            <div
              v-if="weekTooltip.show"
              class="cal-tt"
              :style="{ left: weekTooltip.x + 'px', top: weekTooltip.y + 'px' }"
              @click.stop
            >
            <div class="cal-tt-head">
                <span>
                  {{ weekTooltip.weekLabel }}
                  <v-chip v-if="calendarSearch || filterZmodel" size="x-small" color="yellow" class="ml-2">
                    Filtered
                  </v-chip>
                </span>
                <v-icon size="15" @click="closeWeekTooltip">mdi-close</v-icon>
              </div>

              <div class="cal-tt-summary">
                <div class="cal-tt-row">
                  <span>Total MDFO</span>
                  <span>{{ numberFormat(weekTooltip.totalMdfo) }}</span>
                </div>
                <div class="cal-tt-row">
                  <span>Total SO</span>
                  <span>{{ numberFormat(weekTooltip.totalSales) }}</span>
                </div>
                <div class="cal-tt-row cal-tt-row-gap">
                  <span class="font-weight-bold">Total GAP</span>
                  <span
                    class="font-weight-bold"
                    :class="{
                      'cal-gap-pos': weekTooltip.totalGap > 0,
                      'cal-gap-neg': weekTooltip.totalGap < 0,
                    }"
                  >
                    {{ numberFormat(weekTooltip.totalGap) }}
                  </span>
                </div>
              </div>

              <div class="cal-tt-sub-title">Top part by |gap|</div>

              <div class="cal-tt-list">
                <div
                  v-for="(r, i) in weekTooltip.data" :key="i"
                  class="cal-tt-part"
                >
                  <div style="font-size:11px">
                    <span class="font-weight-bold">{{ r.matnr }}</span>
                    <span style="color:#aaa; margin-left:4px; font-size:10px">{{ r.zmodel }}</span>
                  </div>
                  <div style="display:flex; gap:4px; margin-top:2px">
                    <span class="cal-tt-chip cal-tt-m">M: {{ numberFormat(r.mdfo) }}</span>
                    <span class="cal-tt-chip cal-tt-s">S: {{ numberFormat(r.sales) }}</span>
                    <span
                      class="cal-tt-chip font-weight-bold"
                      :class="{
                        'cal-tt-gp': r.gap > 0,
                        'cal-tt-gn': r.gap < 0,
                        'cal-tt-gz': r.gap === 0,
                      }"
                    >
                      G: {{ numberFormat(r.gap) }}
                    </span>
                  </div>
                </div>

                <div v-if="!weekTooltip.data.length"
                    style="padding:10px; text-align:center; color:#888; font-size:11px">
                  Tidak ada data minggu ini
                </div>
              </div>
            </div>
          </transition>
        </v-card>

            <v-card class="mb-4 elevation-2">
              <v-card-title class="py-2 px-4 bg-teal-lighten-5">
                <span class="text-subtitle-1 font-weight-bold text-teal-darken-3">
                  Weekly Gap Analysis (by Customer)
                </span>
              </v-card-title>

              <v-table density="compact" class="premium-table weekly-table">
                <template #default>
                  <thead>
                    <tr>
                      <th rowspan="2" class="text-left sticky-col" style="min-width: 220px;">
                        Customer
                      </th>

                      <th
                        v-for="w in weekRanges"
                        :key="w.id"
                        colspan="1"
                        class="text-center header-group"
                      >
                        {{ w.label }} ({{ w.start }}-{{ w.end }})
                      </th>
                      <th rowspan="2" class="text-center header-total">
                        Gap 1 - Today
                      </th>
                      <th colspan="1" class="text-center header-total">Total Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in weeklyGapData" :key="item.zcust">
                      <td class="sticky-col" style="min-width:220px;">
                        <div class="font-weight-bold">{{ item.zcust }}</div>
                      </td>

                      <template v-for="w in weekRanges" :key="item.zcust + '-' + w.id">
                        <td class="text-center">
                          {{ numberFormat(item[`gap_${w.id}`]) }}
                        </td>
                      </template>

                      <td class="text-center font-weight-bold">
                        {{ numberFormat(gapToDateByCust[item.zcust] ?? 0) }}
                      </td>

                      <td class="text-center font-weight-bold">
                        {{ numberFormat(item.gap_total) }}
                      </td>
                    </tr>
                  </tbody>
                </template>
              </v-table>
            </v-card>

      <!-- ===== WEEKLY GAP ANALYSIS (BY MATNR) ===== -->
      <v-card class="mb-4 elevation-2">
        <v-card-title class="py-2 px-4 bg-teal-lighten-5 d-flex justify-space-between align-center">
          <span class="text-subtitle-1 font-weight-bold text-teal-darken-3">
            Weekly Gap Analysis (By Part Number)
          </span>

          <div class="d-flex align-center" style="gap: 12px;">
            <v-text-field
              v-model="matnrSearch"
              density="compact"
              hide-details
              clearable
              placeholder="Search Part Num..."
              prepend-inner-icon="mdi-magnify"
              style="max-width: 220px;"
            />

            <v-select
              v-model="matnrPageSize"
              :items="matnrPageOptions"
              item-title="text"
              item-value="value"
              density="compact"
              hide-details
              label="Rows"
              style="max-width: 110px"
            />
          </div>
        </v-card-title>

        <div style="max-height: 500px; overflow-y: auto;">
          <v-table density="compact" class="premium-table weekly-table">
            <template #default>
              <thead>
                <tr>
                  <th rowspan="2" class="text-left sticky-col" style="min-width: 220px;">
                    Part Number
                  </th>

                  <th
                    v-for="w in weekRanges"
                    :key="'m-h-' + w.id"
                    colspan="1"
                    class="text-center header-group"
                  >
                    {{ w.label }} ({{ w.start }}-{{ w.end }})
                  </th>

                  <th colspan="1" class="text-center header-total">Total Month</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="item in weeklyGapDataMatnrPaged" :key="item.matnr">
                  <td class="sticky-col" style="min-width:220px;">
                    <div class="font-weight-bold">{{ item.matnr }}</div>
                    <div class="text-caption text-grey">{{ item.zmodel || '-' }}</div>
                  </td>

                  <template v-for="w in weekRanges" :key="item.matnr + '-' + w.id">
                    <td class="text-center">
                      {{ numberFormat(item[`gap_${w.id}`]) }}
                    </td>
                  </template>

                  <td class="text-center font-weight-bold">
                    {{ numberFormat(item.gap_total) }}
                  </td>
                </tr>
              </tbody>
            </template>
          </v-table>
        </div>
      </v-card>

      <!-- ===== WEEKLY GAP ANALYSIS (BY ZMODEL) ===== -->
      <v-card class="mb-4 elevation-2">
        <v-card-title class="py-2 px-4 bg-teal-lighten-5 d-flex justify-space-between align-center">
          <span class="text-subtitle-1 font-weight-bold text-teal-darken-3">
            Weekly Gap Analysis (By Model)
          </span>

          <div class="d-flex align-center" style="gap: 12px;">
            <v-text-field
              v-model="zmodelSearch"
              density="compact"
              hide-details
              clearable
              placeholder="Search model..."
              prepend-inner-icon="mdi-magnify"
              style="max-width: 220px;"
            />

            <v-select
              v-model="zmodelPageSize"
              :items="zmodelPageOptions"
              item-title="text"
              item-value="value"
              density="compact"
              hide-details
              label="Rows"
              style="max-width: 110px"
            />
          </div>
        </v-card-title>

        <div style="max-height: 500px; overflow-y: auto;">
          <v-table density="compact" class="premium-table weekly-table">
            <template #default>
              <thead>
                <tr>
                  <th rowspan="2" class="text-left sticky-col" style="min-width: 220px;">
                    Model
                  </th>

                  <th
                    v-for="w in weekRanges"
                    :key="'z-h-' + w.id"
                    colspan="1"
                    class="text-center header-group"
                  >
                    {{ w.label }} ({{ w.start }}-{{ w.end }})
                  </th>

                  <th colspan="1" class="text-center header-total">Total Month</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="item in weeklyGapDataZmodelPaged" :key="item.zmodel">
                  <td class="sticky-col" style="min-width:220px;">
                    <div class="font-weight-bold">{{ item.zmodel }}</div>
                    <div class="text-caption text-grey">
                      {{ (item.matnr_list || []).length }}
                      {{ (item.matnr_list || []).length === 1 ? 'item' : 'items' }}
                    </div>
                  </td>

                  <template v-for="w in weekRanges" :key="item.zmodel + '-' + w.id">
                    <td class="text-center">
                      {{ numberFormat(item[`gap_${w.id}`]) }}
                    </td>
                  </template>

                  <td class="text-center font-weight-bold">
                    {{ numberFormat(item.gap_total) }}
                  </td>
                </tr>
              </tbody>
            </template>
          </v-table>
        </div>
      </v-card>

      <!-- TOTAL GAP ANALYSIS GRAFIK -->
      <v-card class="pa-6 rounded-lg mb-6 elevation-2">
        <div class="text-h6 mb-4 text-primary font-weight-medium">
          Total Gap Analysis (MDFO - Sales Order)
          <span class="text-caption text-grey ml-2">
            *Positif = Forecast > Sales | Negatif = Sales > Forecast
          </span>
        </div>
         <apexchart
      type="bar"
      height="320"
      :options="chartOptionsCompare"
      :series="seriesCompare"
      />
      </v-card>

      <!-- ===== COMPARISON HEATMAP ===== -->
      <v-card class="pa-5 rounded-lg elevation-2 mb-6">
        <div class="d-flex justify-space-between align-center mb-4">
          <div class="text-h6 text-primary font-weight-medium">
            Comparison Heatmap (MDFO-SO) - Customer
          </div>
          <v-btn
            color="green"
            prepend-icon="mdi-microsoft-excel"
            
            @click="exportComparisonExcel"
            :disabled="comparisonPivot.length === 0"
          >
            Export Heatmap
          </v-btn>
        </div>

        <v-data-table
          :headers="comparisonHeaders"
          :items="comparisonPivot"
          :loading="loading"
          density="compact"
          class="elevation-1 rounded-lg premium-table"
          hover
          fixed-header
          height="600"
          item-key="zcust"
        >
          <template #item="{ item }">
            <tr>
              <td class="font-weight-bold sticky-col" style="min-width:150px;">{{ item.zcust }}</td>
              <td
                v-for="d in 31"
                :key="d"
                class="text-center"
                :class="getGapColorClass(item[`data_t${d}`]?.gap ?? 0, d)"
                style="cursor: pointer; border-right: 1px solid #eee;"
                @mouseenter="setHeatmapHover(item, d)"
                @click="openHeatmapCell(item, d)"
              >
                <v-tooltip location="top">
                  <template #activator="{ props }">
                    <span v-bind="props">
                      {{
                        item[`data_t${d}`]
                          ? formatNumber(item[`data_t${d}`].gap ?? 0)
                          : formatNumber(0)
                      }}
                    </span>
                  </template>

                  <div class="text-center">
                    <div><strong>{{ item.zcust }} • Tanggal {{ d }}</strong></div>
                    <div>MDFO: {{ formatNumber(item[`data_t${d}`]?.mdfo ?? 0) }}</div>
                    <div>Sales Order: {{ formatNumber(item[`data_t${d}`]?.sales ?? 0) }}</div>
                    <v-divider class="my-1 border-white" />
                    <div>Gap: {{ formatNumber(item[`data_t${d}`]?.gap ?? 0) }}</div>
                  </div>
                </v-tooltip>
              </td>
            </tr>
          </template>
        </v-data-table>

        <v-dialog v-model="dialogHeatmap" max-width="500">
          <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
              <div>
                <div class="text-h6 font-weight-bold">
                  Detail {{ popupHeatmap.zcust }}
                </div>
                <div class="text-caption text-grey">
                  Tanggal: {{ popupHeatmap.day }}
                </div>
              </div>

              <v-btn icon @click="dialogHeatmap = false">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </v-card-title>

            <v-divider />

            <v-card-text>
              <div class="d-flex justify-space-between mb-2">
                <span>MDFO</span>
                <strong>{{ formatNumber(popupHeatmap.mdfo) }}</strong>
              </div>

              <div class="d-flex justify-space-between mb-2">
                <span>Sales</span>
                <strong>{{ formatNumber(popupHeatmap.sales) }}</strong>
              </div>

              <v-divider class="my-2" />

              <div class="d-flex justify-space-between">
                <span>Gap</span>
                <strong
                  :class="popupHeatmap.gap > 0 ? 'text-red' : popupHeatmap.gap < 0 ? 'text-blue' : 'text-grey'"
                >
                  {{ formatNumber(popupHeatmap.gap) }}
                </strong>
              </div>
            </v-card-text>
          </v-card>
        </v-dialog>
      </v-card>

      <!-- ===== COMPARISON HEATMAP (BY MATNR) ===== -->
      <v-card class="pa-5 rounded-lg elevation-2 mb-6">
        <div class="d-flex justify-space-between align-center mb-4">
          <v-text-field
            v-model="searchMatnrHeatmap"
            density="compact"
            hide-details
            clearable
            prepend-inner-icon="mdi-magnify"
            placeholder="Search Part Num..."
            style="max-width: 220px;"
          />
          <div class="text-h6 text-primary font-weight-medium">
            Comparison Heatmap (MDFO-SO)
          </div>
          <v-btn
            color="green"
            prepend-icon="mdi-microsoft-excel"
          
            @click="exportComparisonExcelMatnr"
            :disabled="comparisonPivotMatnrFiltered.length === 0"
          >
            Export Heatmap
          </v-btn>
        </div>

        <v-data-table
          :headers="comparisonHeadersMatnr"
          :items="comparisonPivotMatnrFiltered"
          :loading="loading"
          density="compact"
          class="elevation-1 rounded-lg premium-table"
          hover
          fixed-header
          height="600"
          item-key="matnr"
        >
          <template #item="{ item }">
            <tr>
              <td class="font-weight-bold sticky-col" style="min-width:180px;">
                <div>{{ item.matnr }}</div>
                <div class="text-caption text-grey">{{ item.zmodel || "-" }}</div>
              </td>

              <td
                v-for="d in 31"
                :key="d"
                class="text-center"
                :class="getGapColorClass(item[`data_t${d}`]?.gap ?? 0, d)"
                style="cursor: pointer; border-right: 1px solid #eee;"
                @click="openHeatmapCellMatnr(item, d)"
              >
                <v-tooltip location="top" v-if="item[`data_t${d}`]">
                  <template #activator="{ props }">
                    <span v-bind="props">
                      {{ formatNumber(item[`data_t${d}`].gap ?? 0) }}
                    </span>
                  </template>

                  <div class="text-center">
                    <div><strong>Tanggal {{ d }}</strong></div>
                    <div>MDFO: {{ formatNumber(item[`data_t${d}`].mdfo ?? 0) }}</div>
                    <div>Sales Order: {{ formatNumber(item[`data_t${d}`].sales ?? 0) }}</div>
                    <v-divider class="my-1 border-white" />
                    <div>Gap: {{ formatNumber(item[`data_t${d}`].gap ?? 0) }}</div>
                  </div>
                </v-tooltip>

                <span v-else>
                  {{ formatNumber(0) }}
                </span>
              </td>
            </tr>
          </template>
        </v-data-table>

        <v-dialog v-model="dialogHeatmapMatnr" max-width="520">
          <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
              <div>
                <div class="text-h6 font-weight-bold">
                  Detail {{ popupHeatmapMatnr.matnr || "-" }}
                </div>
                <div class="text-caption text-grey">
                  Model: {{ popupHeatmapMatnr.zmodel || "-" }} • Tanggal: {{ popupHeatmapMatnr.day || "-" }}
                </div>
              </div>

              <v-btn icon @click="dialogHeatmapMatnr = false">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </v-card-title>

            <v-divider />

            <v-card-text>
              <div class="d-flex justify-space-between mb-2">
                <span>MDFO</span>
                <strong>{{ formatNumber(popupHeatmapMatnr.mdfo) }}</strong>
              </div>

              <div class="d-flex justify-space-between mb-2">
                <span>SO (Sales Order)</span>
                <strong>{{ formatNumber(popupHeatmapMatnr.sales) }}</strong>
              </div>

              <v-divider class="my-2" />

              <div class="d-flex justify-space-between">
                <span>Gap</span>
                <strong
                  :class="popupHeatmapMatnr.gap > 0 ? 'text-red' : popupHeatmapMatnr.gap < 0 ? 'text-blue' : 'text-grey'"
                >
                  {{ formatNumber(popupHeatmapMatnr.gap) }}
                </strong>
              </div>
            </v-card-text>
          </v-card>
        </v-dialog>
      </v-card>

      <!-- ===== COMPARISON HEATMAP BY MODEL ===== -->
      <v-card class="pa-5 rounded-lg elevation-2 mb-6">
        <div class="d-flex justify-space-between align-center mb-4">
          <v-text-field
            v-model="searchZmodelHeatmap"
            density="compact"
            hide-details
            clearable
            prepend-inner-icon="mdi-magnify"
            placeholder="Search model..."
            style="max-width: 220px;"
          />

          <div class="text-h6 text-primary font-weight-medium">
            Comparison Heatmap (MDFO-SO) - Model
          </div>

          <v-btn
            color="green"
            prepend-icon="mdi-microsoft-excel"
        
            @click="exportComparisonExcelZmodel"
            :disabled="comparisonPivotZmodelFiltered.length === 0"
          >
            Export Heatmap
          </v-btn>
        </div>

        <v-data-table
          :headers="comparisonHeadersZmodel"
          :items="comparisonPivotZmodelFiltered"
          :loading="loading"
          density="compact"
          class="elevation-1 rounded-lg premium-table"
          hover
          fixed-header
          height="600"
          item-key="zmodel"
        >
          <template #item="{ item }">
            <tr>
              <td class="font-weight-bold sticky-col" style="min-width: 180px;">
                <div>{{ item.zmodel }}</div>
                <div class="text-caption text-grey">
                  {{ (item.matnr_list || []).length }}
                  {{ (item.matnr_list || []).length === 1 ? 'item' : 'items' }}
                </div>
              </td>

              <td
                v-for="d in 31"
                :key="d"
                class="text-center"
                :class="getGapColorClass(item[`data_t${d}`]?.gap, d)"
                style="cursor: pointer; border-right: 1px solid #eee;"
                @click.stop="openPopupZmodelMatnr(item.zmodel, d)"
              >
                <v-tooltip location="top" v-if="item[`data_t${d}`]">
                  <template #activator="{ props }">
                    <span v-bind="props">
                      {{ formatNumber(item[`data_t${d}`]?.gap ?? 0) }}
                    </span>
                  </template>

                  <div class="text-center">
                    <div><strong>Model {{ item.zmodel }}</strong></div>
                    <div><strong>Tanggal {{ d }}</strong></div>
                    <div>MDFO: {{ formatNumber(item[`data_t${d}`]?.mdfo ?? 0) }}</div>
                    <div>Sales Order: {{ formatNumber(item[`data_t${d}`]?.sales ?? 0) }}</div>
                    
                    <v-divider class="my-1 border-white" />
                    <div>Gap: {{ formatNumber(item[`data_t${d}`]?.gap ?? 0) }}</div>

                    <div v-if="(item.matnr_list || []).length" class="mt-1 text-caption">
                      Parts: {{ item.matnr_list.slice(0, 6).join(", ") }}
                      <span v-if="item.matnr_list.length > 6">
                        +{{ item.matnr_list.length - 6 }} more
                      </span>
                    </div>
                  </div>
                </v-tooltip>

                <span v-else>0</span>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card>

      <!-- ===== POPUP DETAIL MATNR PER ZMODEL & TANGGAL ===== -->
      <v-dialog v-model="dialogZmodelMatnr" max-width="900" persistent scrollable>
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <div>
              <div class="text-h6 font-weight-bold">
                Detail Part - Model {{ popupZmodel.zmodel || "-" }}
              </div>
              <div class="text-caption text-grey">
                Tanggal: {{ popupZmodel.day || "-" }}
                • Total Part: {{ (popupZmodel.rows || []).length }}
              </div>
            </div>

            <v-btn icon @click="dialogZmodelMatnr = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>

          <v-divider />

          <v-card-text>
            <v-data-table
              :headers="popupZmodelHeaders"
              :items="popupZmodel.rows"
              density="compact"
              fixed-header
              height="450"
              item-key="matnr"
              class="elevation-1"
            >
              <template #item.matnr="{ item }">
                <span class="font-weight-bold">{{ item.matnr }}</span>
              </template>

              <template #item.mdfo="{ item }">
                {{ formatNumber(item.mdfo) }}
              </template>

              <template #item.sales="{ item }">
                {{ formatNumber(item.sales) }}
              </template>

              <template #item.gap="{ item }">
                <span :class="item.gap > 0 ? 'text-red' : item.gap < 0 ? 'text-blue' : 'text-grey'">
                  {{ formatNumber(item.gap) }}
                </span>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-dialog>
    </div>

    <!-- ===== DIALOGS ===== -->
    <v-dialog v-model="loadingGenerate" persistent width="300">
      <v-card class="pa-6 d-flex flex-column align-center">
        <v-progress-circular indeterminate size="50" class="mb-4" color="primary" />
        <div class="text-subtitle-1 font-weight-medium">Generating SAP Data...</div>
        <div class="text-body-2 text-grey-darken-1">Mohon tunggu sebentar</div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogNoData" width="400">
      <v-card class="pa-4">
        <div class="text-h6 mb-3">Data belum tersedia</div>
        <div class="mb-4">
          Data {{ activeType.toUpperCase() }} {{ formatBulanTahun(month) }} belum ada.
          {{ activeType !== 'compare' ? 'Generate dari SAP terlebih dahulu?' : 'Silakan load ulang.' }}
        </div>
        <v-row>
          <v-col cols="6">
            <v-btn block variant="outlined" @click="dialogNoData = false">Batal</v-btn>
          </v-col>
          <v-col cols="6" v-if="activeType !== 'compare'">
            <v-btn block color="orange" @click="confirmGenerate">Generate</v-btn>
          </v-col>
        </v-row>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogWorkdays" persistent width="700">
      <v-card class="rounded-lg">
        <v-card-title class="text-h6 bg-primary text-white pa-4">
          Input Workdays per Customer
        </v-card-title>

        <v-card-text class="pa-4" style="max-height: 500px; overflow-y: auto;">
          <div class="mb-4 text-body-2">
            Generate berhasil. Berikut adalah data hari kerja yang ditemukan di sistem untuk periode
            <b>{{ formatBulanTahun(month) }}</b>.
          </div>

          <v-table density="comfortable" class="border rounded">
            <thead>
              <tr>
                <th class="text-left bg-grey-lighten-4">Customer Name / Code</th>
                <th class="text-left bg-grey-lighten-4">Informasi Jadwal</th>
                <th class="text-center bg-grey-lighten-4" width="100">Workdays</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in customerWorkdaysList" :key="index">
                <td class="py-2">
                  <div class="font-weight-bold">{{ item.nama_customer || item.zcust }}</div>
                  <div v-if="item.nama_customer" class="text-caption text-grey">{{ item.zcust }}</div>
                </td>
                <td class="py-2">
                  <v-chip
                    size="small"
                    :color="getStatusColor(item.status_keterangan)"
                    variant="flat"
                    class="status-chip chip-black-text"
                  >
                    {{ item.status_keterangan }}
                  </v-chip>
                </td>
                <td class="py-2">
                  <v-text-field
                    v-model.number="item.workdays"
                    type="number"
                    variant="outlined"
                    density="compact"
                    hide-details
                    min="0"
                    step="0.5"
                    class="centered-input"
                  />
                </td>
              </tr>

              <tr v-if="customerWorkdaysList.length === 0">
                <td colspan="3" class="text-center text-grey pa-4">
                  Tidak ada data customer ditemukan.
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" color="grey-darken-1" @click="dialogWorkdays = false">Tutup</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            @click="saveWorkdays"
            :disabled="customerWorkdaysList.length === 0"
          >
            Simpan Workdays
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import { defineComponent } from "vue";
import { useMaterialStore } from "@/stores/Logistik/IFP/Report/Material.ts";
import { useRundownIFP } from "@/pinia/admin/inventory/rundownIFP.js";
import { mapWritableState, mapActions } from "pinia";
import { buildCalendarWeeks } from "@/utils/date";
import VueApexCharts from "vue3-apexcharts";
import * as XLSX from "xlsx";
import axios from "axios";
import { useNotificationStore } from "@/pinia/notification.js";
import { useConfigStore } from "@/pinia/config.js";

export default defineComponent({
  name: "MonitoringMaterial",
    components: {
    apexchart: VueApexCharts,
  },


  setup() {
    const store = useMaterialStore();
    return { store };
  },

  data: () => ({
    activeType: "mdfo",
    typeOptions: [
      { text: "MDFO Monitoring",           value: "mdfo"    },
      { text: "Sales Order (SO) Monitoring", value: "so"    },
      { text: "MDFO vs Sales Order",   value: "compare" },
    ],
    month:           "",
    monthText:       "",
    datePickerValue: null,
    menuMonth:       false,
    selectedYear:    new Date().getFullYear(),
    selectedMonth:   null,
    months: [
      { label: "Jan", value: 1  }, { label: "Feb", value: 2  },
      { label: "Mar", value: 3  }, { label: "Apr", value: 4  },
      { label: "Mei", value: 5  }, { label: "Jun", value: 6  },
      { label: "Jul", value: 7  }, { label: "Agu", value: 8  },
      { label: "Sep", value: 9  }, { label: "Okt", value: 10 },
      { label: "Nov", value: 11 }, { label: "Des", value: 12 },
    ],

    searchPart:      "",
    filterCustomer:  null,
    dialogNoData:    false,
    loadingGenerate: false,

    do_date_start:     "",
    do_date_end:       "",
    doCustomer:        null,
    doCustomerOptions: ["MKM", "TMMIN"],
    loadingDo:         false,
    generateResult:    null,

    dialogWorkdays:       false,
    customerWorkdaysList: [],

    // ─── Kalender MDFO vs SO ──────────────────────────────────────
    // ✅ FIX 1: selectedWeek hanya 1x, calendarViewMode dihapus
    selectedWeek:        null,
    calendarPageSize:    10,
    calendarPageOptions: [
      { title: "10",  value: 10  },
      { title: "30",  value: 30  },
      { title: "50",  value: 50  },
      { title: "All", value: -1  },
    ],
    calendarSearch:  "",
    calendarSortKey: "matnr",
    calendarSortDir: "asc",

    // ✅ FIX 4: weekTooltip lengkap dengan semua field
    weekTooltip: {
      show:       false,
      weekId:     null,
      weekLabel:  "",
      weekStart:  0,
      weekEnd:    0,
      x:          0,
      y:          0,
      data:       [],
      totalMdfo:  0,
      totalSales: 0,
      totalGap:   0,
    },

    // ─── Compare / heatmap ────────────────────────────────────────
    compareMatnr:       [],
    matnrSearch:        "",
    searchMatnrHeatmap: "",
    searchZmodelHeatmap:"",
    zmodelSearch:       "",
    searchZmodel: '',

    // ✅ FIX 6: pakai value bukan key
    matnrPageSize:    10,
    matnrPageOptions: [
      { title: "10",  value: 10  },
      { title: "15",  value: 15  },
      { title: "30",  value: 30  },
      { title: "All", value: -1  },
    ],
    zmodelPageSize:    10,
    zmodelPageOptions: [
      { title: "10",  value: 10  },
      { title: "15",  value: 15  },
      { title: "30",  value: 30  },
      { title: "All", value: -1  },
    ],

    dialogZmodelMatnr: false,
    popupZmodel: {
      zmodel: "",
      day:    null,
      rows:   [],
      search: "",
    },

    dialogHeatmap: false,
    popupHeatmap: {
      zcust: "",
      day:   null,
      mdfo:  0,
      sales: 0,
      gap:   0,
    },

    dialogHeatmapMatnr: false,
    popupHeatmapMatnr: {
      matnr:  "",
      zmodel: "",
      day:    null,
      mdfo:   0,
      sales:  0,
      gap:    0,
    },

    // ─── Charts ───────────────────────────────────────────────────
    chartOptions: {
      chart:       { id: "qty-chart", toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
      dataLabels:  { enabled: false },
      xaxis:       { categories: [], labels: { rotate: -45 } },
      yaxis:       { labels: { formatter: (val) => new Intl.NumberFormat("id-ID").format(Number(val || 0)) } },
      tooltip:     { y: { formatter: (val) => new Intl.NumberFormat("id-ID").format(Number(val || 0)) } },
    },
    series: [],

    chartOptionsCompare: {
      chart:       { id: "qty-chart-compare", toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
      dataLabels:  { enabled: false },
      xaxis:       { categories: [], labels: { rotate: -45 } },
      yaxis:       { labels: { formatter: (val) => new Intl.NumberFormat("id-ID").format(Number(val || 0)) } },
      tooltip:     { y: { formatter: (val) => new Intl.NumberFormat("id-ID").format(Number(val || 0)) } },
    },
    seriesCompare: [],
  }),

  computed: {
    ...mapWritableState(useMaterialStore, ["parts", "partsMatnr", "loading"]),

  filteredData() {
    // 1. Ambil data asli
    let data = this.mergedData; 

    // 2. Filter berdasarkan Part Number
    if (this.searchPart) {
      data = data.filter(item => 
        item.matnr.toLowerCase().includes(this.searchPart.toLowerCase())
      );
    }

    // 3. Filter berdasarkan Model (LOGIKA BARU)
    if (this.searchZmodel) {
      data = data.filter(item => 
        item.zmodel && item.zmodel.toLowerCase().includes(this.searchZmodel.toLowerCase())
      );
    }

    // 4. Filter berdasarkan Customer
    if (this.filterCustomer) {
      data = data.filter(item => item.nama_customer === this.filterCustomer);
    }

    return data;
  },

  // Update Series Chart agar mengambil dari filteredData
  series() {
    const totalQty = this.filteredData.reduce((acc, item) => acc + (Number(item.tot) || 0), 0);
    // ... rest of chart logic
    return [{
      name: 'Total Qty',
      data: this.filteredData.map(item => item.tot)
    }];
  },

    calendarWeekRanges() {
      // ✅ Selalu bersihkan, apapun formatnya
      const m = String(this.month || "").replace(/\D/g, "").substring(0, 6);
      if (m.length !== 6) return [];

      const year      = Number(m.slice(0, 4));
      const month     = Number(m.slice(4, 6));
      if (month < 1 || month > 12) return [];

      const daysInMon = new Date(year, month, 0).getDate();
      const getIsoDay = (date) => (date.getDay() === 0 ? 7 : date.getDay());

      const weeks  = [];
      let   cursor = 1;

      while (cursor <= daysInMon) {
        const isoDay = getIsoDay(new Date(year, month - 1, cursor));
        const endDay = Math.min(cursor + (7 - isoDay), daysInMon);
        weeks.push({
          id:    `w${weeks.length + 1}`,
          label: `W${weeks.length + 1}`,
          start: cursor,
          end:   endDay,
        });
        cursor = endDay + 1;
      }

      return weeks;
    },

    calendarMdfoSoPivot() {
      if (this.activeType !== "compare") return [];
      if (!Array.isArray(this.partsMatnr) || !this.partsMatnr.length) return [];

      const grouped = {};
      this.partsMatnr.forEach((r) => {
        // Gunakan matnr sebagai base key atau kombinasikan jika matnr berulang untuk job_number berbeda
        const matnr = r.matnr || "-";
        if (!grouped[matnr]) {
          grouped[matnr] = {
            matnr, 
            zmodel: r.zmodel || "-",
            customer: r.customer || r.nama_customer || r.zcust || "-", // Mengambil properti customer
            job_number: r.job_number || "-", // Mengambil properti job_number
            mdfo: {}, sales: {}, gap: {},
            total_mdfo: 0, total_sales: 0, total_gap: 0,
          };
        }
        const d = Number(r.day);
        if (!d) return;
        grouped[matnr].mdfo[d]  = (grouped[matnr].mdfo[d]  || 0) + Number(r.mdfo  || 0);
        grouped[matnr].sales[d] = (grouped[matnr].sales[d] || 0) + Number(r.sales || 0);
        grouped[matnr].gap[d]   = (grouped[matnr].gap[d]   || 0) + Number(r.gap   || 0);
        grouped[matnr].total_mdfo  += Number(r.mdfo  || 0);
        grouped[matnr].total_sales += Number(r.sales || 0);
        grouped[matnr].total_gap   += Number(r.gap   || 0);
      });
      return Object.values(grouped);
    },

    calendarWeeklyByPart() {
      const result = {};
      this.calendarMdfoSoPivot.forEach((item) => {
        result[item.matnr] = {};
        this.calendarWeekRanges.forEach((w) => {
          let mdfo = 0, sales = 0, gap = 0;
          for (let d = w.start; d <= w.end; d++) {
            mdfo  += item.mdfo[d]  || 0;
            sales += item.sales[d] || 0;
            gap   += item.gap[d]   || 0;
          }
          result[item.matnr][w.id] = { mdfo, sales, gap };
        });
      });
      return result;
    },

    calendarDailyGrandTotal() {
      const total = {
        mdfo: {},
        sales: {},
        gap: {}
      };

      // Inisialisasi t1 sampai t31 dengan 0
      for (let d = 1; d <= 31; d++) {
        total.mdfo[d] = 0;
        total.sales[d] = 0;
        total.gap[d] = 0;
      }

      // Gunakan calendarFiltered (Data yang sudah disaring) bukan data mentah
      this.calendarFiltered.forEach(item => {
        for (let d = 1; d <= 31; d++) {
          total.mdfo[d] += (item.mdfo[d] || 0);
          total.sales[d] += (item.sales[d] || 0);
          total.gap[d] += (item.gap[d] || 0);
        }
      });

      return total;
    },

    // Grand total weekly (semua part)
    calendarWeeklyGrandTotal() {
      const result = {};
      this.calendarWeekRanges.forEach((w) => {
        let mdfo = 0, sales = 0, gap = 0;
        this.calendarMdfoSoPivot.forEach((item) => {
          mdfo  += this.calendarWeeklyByPart[item.matnr]?.[w.id]?.mdfo  || 0;
          sales += this.calendarWeeklyByPart[item.matnr]?.[w.id]?.sales || 0;
          gap   += this.calendarWeeklyByPart[item.matnr]?.[w.id]?.gap   || 0;
        });
        result[w.id] = { mdfo, sales, gap };
      });
      return result;
    },

    calendarFiltered() {
      // Ambil keyword pencarian global (Pencarian dari input text field)
      const q = (this.calendarSearch || "").toLowerCase().trim();
      const modelFilter = (this.filterZmodel || "").toLowerCase().trim(); // Filter dropdown model jika ada

      let rows = this.calendarMdfoSoPivot.filter((r) => {
        // ── LOGIKA PENCARIAN BARU (Multi-Field) ──
        // Mengecek apakah keyword (q) ada di dalam matnr, zmodel, job_number, atau customer
        const matchSearch = !q || 
          (r.matnr || "").toLowerCase().includes(q) || 
          (r.zmodel || "").toLowerCase().includes(q) ||
          (r.job_number || "").toLowerCase().includes(q) ||
          (r.customer || "").toLowerCase().includes(q);

        // Logika Filter Model Spesifik (jika Anda menggunakan dropdown filter terpisah)
        const matchModel = !modelFilter || 
          (r.zmodel || "").toLowerCase().includes(modelFilter);

        return matchSearch && matchModel;
      });

      // Proses Sorting Data
      return [...rows].sort((a, b) => {
        let va = a[this.calendarSortKey], vb = b[this.calendarSortKey];
        if (va === undefined || va === null) va = "";
        if (vb === undefined || vb === null) vb = "";
        if (typeof va === "string") { va = va.toLowerCase(); vb = vb.toLowerCase(); }
        
        if (va < vb) return this.calendarSortDir === "asc" ? -1 : 1;
        if (va > vb) return this.calendarSortDir === "asc" ? 1 : -1;
        return 0;
      });
    },

    calendarPaged() {
      if (this.calendarPageSize === -1) return this.calendarFiltered;
      return this.calendarFiltered.slice(0, this.calendarPageSize);
    },

    // ─── Jumlah hari dalam bulan ──────────────────────────────────────────────
    daysInSelectedMonth() {
      const m = String(this.month || "").replace(/\D/g, "").substring(0, 6);
      if (m.length !== 6) return 31;
      const year  = Number(m.slice(0, 4));
      const month = Number(m.slice(4, 6));
      return new Date(year, month, 0).getDate();
    },

    dayWeekId() {
      const map = {};
      this.calendarWeekRanges.forEach((w) => {
        for (let d = w.start; d <= w.end; d++) map[d] = w.id;
      });
      return map;
    },

    dayToWeekMap() {
      const map = {};
      this.calendarWeekRanges.forEach((w) => {
        for (let d = w.start; d <= w.end; d++) {
          map[d] = w.id;
        }
      });
      return map;
    },



    gapToDateByCust() {
      const map = {};
      const lastDay = this.todayDayInSelectedMonth;

      (this.comparisonPivot || []).forEach((row) => {
        let sum = 0;
        for (let d = 1; d <= lastDay; d++) {
          const cell = row[`data_t${d}`];
          sum += Number(cell?.gap ?? 0);
        }
        map[row.zcust] = sum;
      });

      return map;
    },
    mergedTableData() {
      if (this.activeType === 'compare') return [];

      const grouped = {};

      this.parts.forEach((r) => {
        const key = `${r.matnr}-${r.vbeln || ''}-${r.posnr || ''}`;
        if (!grouped[key]) {
          grouped[key] = {
            matnr:           r.matnr       || '',
            zmodel:          r.zmodel      || '-',
            job_number:      r.job_number  || '-',
            vbeln:           r.vbeln       || '-',
            posnr:           r.posnr       || '',
            nama_customer:   r.nama_customer || '',
            zcust:           r.zcust       || '',
            pcs_day_monthly: r.pcs_day_monthly || 0,
            tot:             0,
          };
          for (let d = 1; d <= 31; d++) grouped[key][`t${d}`] = 0;
        }

        grouped[key].tot += Number(r.tot || 0);
        for (let d = 1; d <= 31; d++) {
          grouped[key][`t${d}`] += Number(r[`t${d}`] || 0);
        }
      });

      return Object.values(grouped);
    },

    filteredMerged() {
      if (this.activeType === 'compare') return [];
      const query = this.searchPart.toLowerCase().trim();

      return this.mergedTableData.filter((r) => {
        if (this.filterCustomer && r.zcust !== this.filterCustomer) return false;

        if (query) {
          return (
            (r.matnr        || '').toLowerCase().includes(query) ||
            (r.zmodel       || '').toLowerCase().includes(query) ||
            (r.job_number   || '').toLowerCase().includes(query) ||
            (r.zcust        || '').toLowerCase().includes(query) ||
            (r.vbeln        || '').toLowerCase().includes(query)
          );
        }
        return true;
      });
    },

    mergedHeaders() {
      if (this.activeType === 'compare') return [];

      const headers = [
       { title: 'Customer',  key: 'nama_customer', width: 180, sortable: true },
       { title: 'Model',       key: 'zmodel',         width: 120,              sortable: true },
        { title: 'Part Number', key: 'matnr',         width: 200, fixed: true, sortable: true },
        
        { title: 'Job Number',      key: 'job_number',     width: 200,              sortable: true },
      ];

      if (this.activeType === 'mdfo') {
        headers.push(
          
          { title: 'PCS / Day',  key: 'pcs_day_monthly', width: 130, align: 'center', sortable: true },
        );
      } else {
        
      }

      headers.push(
       
        { title: 'Total Qty', key: 'tot',           width: 120, align: 'center', sortable: true },
      );

      for (let d = 1; d <= 31; d++) {
        headers.push({
          title:    `${d}`,
          key:      `t${d}`,
          width:    48,
          align:    'center',
          sortable: false,
          isWeekend: this.isWeekend(d),
        });
      }

      return headers;
    },
    todayDayInSelectedMonth() {
      const now = new Date();
      if (!this.datePickerValue) return now.getDate();

      const [y, m] = String(this.datePickerValue).split("-");
      if (!y || !m) return now.getDate();

      const selY = Number(y);
      const selM = Number(m);

      if (selY === now.getFullYear() && selM === now.getMonth() + 1) {
        return now.getDate();
      }

      return new Date(selY, selM, 0).getDate();
    },

    comparisonPivotMatnrFiltered() {
      const q = (this.searchMatnrHeatmap || "").toLowerCase().trim();
      if (!q) return this.comparisonPivotMatnr || [];

      return (this.comparisonPivotMatnr || []).filter(
        (r) =>
          String(r.matnr || "").toLowerCase().includes(q) ||
          String(r.zmodel || "").toLowerCase().includes(q)
      );
    },

    popupZmodelHeaders() {
      return [
        { title: "MATNR", value: "matnr", width: 160 },
        { title: "MDFO", value: "mdfo", align: "end", width: 120 },
        { title: "Sales", value: "sales", align: "end", width: 120 },
        { title: "Gap", value: "gap", align: "end", width: 120 },
      ];
    },

    popupZmodelFilteredRows() {
      const q = (this.popupZmodel.search || "").toLowerCase().trim();
      if (!q) return this.popupZmodel.rows;
      return (this.popupZmodel.rows || []).filter((r) =>
        String(r.matnr || "").toLowerCase().includes(q)
      );
    },

    weeklyGapDataZmodel() {
      if (this.activeType !== "compare") return [];
      if (!Array.isArray(this.compareMatnr) || this.compareMatnr.length === 0) return [];

      const ranges = this.weekRanges;
      if (!ranges.length) return [];

      const grouped = {};

      this.compareMatnr.forEach((r) => {
        const zmodel = (r.zmodel || "-").toString().trim();
        if (!grouped[zmodel]) {
          grouped[zmodel] = {
            zmodel,
            matnr_list: new Set(),
            items: [],
          };
        }

        grouped[zmodel].items.push({
          day: Number(r.day || 0),
          gap: Number(r.gap || 0),
        });

        if (r.matnr) grouped[zmodel].matnr_list.add(r.matnr);
      });

      return Object.values(grouped)
        .map((g) => {
          const row = {
            zmodel: g.zmodel,
            matnr_list: Array.from(g.matnr_list),
          };

          let totalGap = 0;

          for (const w of ranges) {
            let gapSum = 0;
            for (const it of g.items) {
              if (it.day >= w.start && it.day <= w.end) {
                gapSum += it.gap;
              }
            }

            row[`gap_${w.id}`] = gapSum;
            row[`pct_${w.id}`] = 0;
            totalGap += gapSum;
          }

          row.gap_total = totalGap;
          row.pct_total = 0;

          return row;
        })
        .sort((a, b) => a.zmodel.localeCompare(b.zmodel));
    },

    weeklyGapDataZmodelFiltered() {
      const q = (this.zmodelSearch || "").toLowerCase().trim();
      if (!q) return this.weeklyGapDataZmodel;

      return this.weeklyGapDataZmodel.filter((r) =>
        (r.zmodel || "").toLowerCase().includes(q)
      );
    },

    weeklyGapDataZmodelPaged() {
      const rows = this.weeklyGapDataZmodelFiltered;
      if (this.zmodelPageSize === -1) return rows;
      return rows.slice(0, this.zmodelPageSize);
    },

    comparisonPivotZmodel() {
      if (this.activeType !== "compare") return [];
      if (!Array.isArray(this.partsMatnr) || this.partsMatnr.length === 0) return [];

      const grouped = {};

      this.partsMatnr.forEach((item) => {
        const zmodel = item.zmodel || "-";
        if (!grouped[zmodel]) {
          grouped[zmodel] = {
            zmodel,
            matnr_list: new Set(),
            total_gap: 0,
            total_mdfo: 0,
            total_sales: 0,
          };
        }

        if (item.matnr) grouped[zmodel].matnr_list.add(item.matnr);

        const day = Number(item.day);
        grouped[zmodel][`data_t${day}`] = {
          mdfo: Number(item.mdfo || 0),
          sales: Number(item.sales || 0),
          gap: Number(item.gap || 0),
        };

        grouped[zmodel].total_gap += Number(item.gap || 0);
        grouped[zmodel].total_mdfo += Number(item.mdfo || 0);
        grouped[zmodel].total_sales += Number(item.sales || 0);
      });

      return Object.values(grouped)
        .map((r) => ({ ...r, matnr_list: Array.from(r.matnr_list) }))
        .sort((a, b) => String(a.zmodel).localeCompare(String(b.zmodel)));
    },

    comparisonPivotZmodelFiltered() {
      const q = (this.searchZmodelHeatmap || "").toLowerCase().trim();
      if (!q) return this.comparisonPivotZmodel;

      return (this.comparisonPivotZmodel || []).filter((r) =>
        String(r.zmodel || "").toLowerCase().includes(q)
      );
    },

    comparisonHeadersZmodel() {
      const headers = [{ title: "Model", key: "zmodel", width: 180, fixed: true }];

      const days = Array.from({ length: 31 }, (_, i) => ({
        title: `${i + 1}`,
        key: `data_t${i + 1}`,
        width: 50,
        align: "center",
        sortable: false,
      }));

      return [...headers, ...days];
    },

    comparisonHeadersMatnr() {
      const headers = [{ title: "Material", key: "matnr", width: 180, fixed: true }];

      const days = Array.from({ length: 31 }, (_, i) => ({
        title: `${i + 1}`,
        key: `data_t${i + 1}`,
        width: 50,
        align: "center",
        sortable: false,
      }));

      return [...headers, ...days];
    },

    comparisonPivotMatnr() {
      if (this.activeType !== "compare") return [];
      if (!Array.isArray(this.partsMatnr) || this.partsMatnr.length === 0) return [];

      const grouped = {};

      this.partsMatnr.forEach((item) => {
        const matnr = item.matnr;
        if (!matnr) return;

        if (!grouped[matnr]) {
          grouped[matnr] = {
            matnr,
            zmodel: item.zmodel || "-",
            total_gap: 0,
            total_mdfo: 0,
            total_sales: 0,
          };
        }

        const day = Number(item.day);

        grouped[matnr][`data_t${day}`] = {
          mdfo: Number(item.mdfo || 0),
          sales: Number(item.sales || 0),
          gap: Number(item.gap || 0),
        };

        grouped[matnr].total_gap += Number(item.gap || 0);
        grouped[matnr].total_mdfo += Number(item.mdfo || 0);
        grouped[matnr].total_sales += Number(item.sales || 0);

        if ((grouped[matnr].zmodel === "-" || !grouped[matnr].zmodel) && item.zmodel) {
          grouped[matnr].zmodel = item.zmodel;
        }
      });

      const q = (this.searchMatnrHeatmap || "").toLowerCase().trim();
      let rows = Object.values(grouped).sort((a, b) => a.matnr.localeCompare(b.matnr));
      if (q) rows = rows.filter((r) => (r.matnr || "").toLowerCase().includes(q));

      return rows;
    },

    weeklyGapDataMatnrFiltered() {
      const q = (this.matnrSearch || "").toLowerCase().trim();
      if (!q) return this.weeklyGapDataMatnr;

      return this.weeklyGapDataMatnr.filter((r) => {
        const matnr = (r.matnr || "").toLowerCase();
        const zmodel = (r.zmodel || "").toLowerCase();
        return matnr.includes(q) || zmodel.includes(q);
      });
    },

    weeklyGapDataMatnrPaged() {
      const rows = this.weeklyGapDataMatnrFiltered;
      if (this.matnrPageSize === -1) return rows;
      return rows.slice(0, this.matnrPageSize);
    },

    weeklyGapDataMatnr() {
      if (this.activeType !== "compare") return [];
      if (!Array.isArray(this.compareMatnr) || this.compareMatnr.length === 0) return [];
      const ranges = this.weekRanges;
      if (!ranges.length) return [];

      const grouped = {};
      for (const r of this.compareMatnr) {
        const matnr = r.matnr;
        if (!matnr) continue;
        if (!grouped[matnr]) grouped[matnr] = { zmodel: r.zmodel || "", items: [] };
        grouped[matnr].items.push({
          day: Number(r.day || 0),
          gap: Number(r.gap || 0),
        });
      }

      return Object.keys(grouped)
        .sort()
        .map((matnr) => {
          const row = {
            matnr,
            zmodel: grouped[matnr].zmodel || "-",
          };

          let totalGap = 0;

          for (const w of ranges) {
            let gapSum = 0;
            for (const it of grouped[matnr].items) {
              if (it.day >= Number(w.start) && it.day <= Number(w.end)) gapSum += it.gap;
            }
            row[`gap_${w.id}`] = gapSum;
            row[`pct_${w.id}`] = 0;
            totalGap += gapSum;
          }

          row.gap_total = totalGap;
          row.pct_total = 0;
          return row;
        });
    },

    searchLabel() {
      return this.activeType === "mdfo"
        ? "Search (Part Num, Model, Job Num)"
        : "Search (Part Num, Model, Job Num)";
    },

    weekRanges() {
      if (!this.month || this.month.length < 6) return [];

      const year = Number(this.month.slice(0, 4));
      const month = Number(this.month.slice(4, 6));

      return buildCalendarWeeks(year, month, 1).map((w, i) => ({
        id: `w${i + 1}`,
        label: `WEEK ${i + 1}`,
        start: w.start,
        end: w.end,
      }));
    },

    customerList() {
      const map = {};
      this.parts.forEach((p) => {
        if (p.zcust && !map[p.zcust]) {
          map[p.zcust] = p.nama_customer || p.zcust;
        }
      });
      return Object.entries(map)
        .map(([value, title]) => ({ title, value }))
        .sort((a, b) => a.title.localeCompare(b.title));
    },

    isGenerateDoValid() {
      return this.do_date_start && this.doCustomer;
    },

    summaryData() {
      if (this.activeType === "compare") return [];
      const grouped = {};

      this.parts.forEach((r) => {
        const key = `${r.matnr}-${r.vbeln || ""}`;
        if (!grouped[key]) {
          grouped[key] = {
            matnr: r.matnr,
            zmodel: r.zmodel,
            job_number: r.job_number,
            vbeln: r.vbeln || "-",
            zcust: r.zcust,
            nama_customer: r.nama_customer,
            tot: 0,
            pcs_day_monthly: r.pcs_day_monthly || 0,
          };
        }
        grouped[key].tot += Number(r.tot || 0);
      });

      return Object.values(grouped);
    },

    filteredSummary() {
      if (this.activeType === "compare") return [];
      const query = this.searchPart.toLowerCase().trim();

      return this.summaryData.filter((r) => {
        if (this.filterCustomer && r.zcust !== this.filterCustomer) return false;

        if (query) {
          const matnr = (r.matnr || "").toLowerCase();
          const zcust = (r.zcust || "").toLowerCase();
          const job_number = (r.job_number || "").toLowerCase();
          const zmodel = (r.zmodel || "").toLowerCase();
          const vbeln = (r.vbeln || "").toLowerCase();

          if (
            !matnr.includes(query) &&
            !zmodel.includes(query) &&
            !job_number.includes(query) &&
            !zcust.includes(query) &&
            !vbeln.includes(query)
          ) {
            return false;
          }
        }

        return true;
      });
    },

    filteredParts() {
      if (this.activeType === "compare") return [];
      const query = this.searchPart.toLowerCase().trim();

      return this.parts.filter((item) => {
        if (this.filterCustomer && item.zcust !== this.filterCustomer) return false;

        if (query) {
          const matnr = (item.matnr || "").toLowerCase();
          const zcust = (item.zcust || "").toLowerCase();
          const job_number = (item.job_number || "").toLowerCase();
          const zmodel = (item.zmodel || "").toLowerCase();
          const vbeln = (item.vbeln || "").toLowerCase();

          if (
            !matnr.includes(query) &&
            !zmodel.includes(query) &&
            !job_number.includes(query) &&
            !zcust.includes(query) &&
            !vbeln.includes(query)
          ) {
            return false;
          }
        }

        return true;
      });
    },

    comparisonPivot() {
      if (this.activeType !== "compare" || !this.parts.length) return [];

      const grouped = {};

      this.parts.forEach((item) => {
        const cust = item.zcust;
        if (!grouped[cust]) {
          grouped[cust] = {
            zcust: cust,
            total_gap: 0,
            total_mdfo: 0,
            total_sales: 0,
          };
        }

        const day = Number(item.day);

        grouped[cust][`data_t${day}`] = {
          mdfo: Number(item.mdfo || 0),
          sales: Number(item.sales || 0),
          gap: Number(item.gap || 0),
        };

        grouped[cust].total_gap += Number(item.gap || 0);
        grouped[cust].total_mdfo += Number(item.mdfo || 0);
        grouped[cust].total_sales += Number(item.sales || 0);
      });

      return Object.values(grouped).sort((a, b) => a.zcust.localeCompare(b.zcust));
    },

    weeklyGapData() {
      if (this.activeType !== "compare") return [];
      if (!Array.isArray(this.parts) || this.parts.length === 0) return [];
      const ranges = this.weekRanges;
      if (!ranges.length) return [];

      const grouped = {};
      for (const r of this.parts) {
        const cust = r.zcust;
        if (!grouped[cust]) grouped[cust] = [];
        grouped[cust].push({
          day: Number(r.day || 0),
          gap: Number(r.gap || 0),
        });
      }

      return Object.keys(grouped)
        .sort()
        .map((zcust) => {
          const row = {
            zcust,
            zcust_full: zcust,
          };

          let totalGap = 0;

          for (const w of ranges) {
            let gapSum = 0;

            for (const it of grouped[zcust]) {
              if (it.day >= w.start && it.day <= w.end) gapSum += it.gap;
            }

            row[`gap_${w.id}`] = gapSum;
            row[`pct_${w.id}`] = 0;
            totalGap += gapSum;
          }

          row.gap_total = totalGap;
          row.pct_total = 0;

          return row;
        });
    },

    weeklyGapTotals() {
      if (this.activeType !== "compare") return null;

      const totals = {
        byWeek: {},
        totalMonth: 0,
      };

      this.weekRanges.forEach((w) => {
        totals.byWeek[w.id] = 0;
      });

      this.weeklyGapData.forEach((row) => {
        this.weekRanges.forEach((w) => {
          totals.byWeek[w.id] += Number(row[`gap_${w.id}`] || 0);
        });
        totals.totalMonth += Number(row.gap_total || 0);
      });

      return totals;
    },

    comparisonHeaders() {
      const headers = [{ title: "Customer", key: "zcust", width: 150, fixed: true }];

      const days = Array.from({ length: 31 }, (_, i) => ({
        title: `${i + 1}`,
        key: `data_t${i + 1}`,
        width: 50,
        align: "center",
        sortable: false,
      }));

      return [...headers, ...days];
    },

    summaryHeaders() {
    const base = [
        { title: "Part Number", key: "matnr", width: 150 },
        { title: "Model", key: "zmodel", width: 100 },
    ];

    if (this.activeType === "mdfo" || this.activeType === "so") {
        base.push({ title: "Job No", key: "job_number", width: 150 });
    }

    if (this.activeType === "mdfo") {
        base.push(
        { title: "No Dokumen", key: "vbeln", width: 150 },
        { title: "PCS / Day", key: "pcs_day_monthly", width: 100 }
        );
    } else if (this.activeType === "so") {
        base.push({ title: "SO Number", key: "vbeln", width: 150 });
    }

    base.push(
        { title: "Customer", key: "nama_customer", width: 200 },
        { title: "Total Qty", key: "tot", width: 120 }
    );

    return base;
    },

    calendarHeaders() {
    const headers = [
        { title: "Part Number", key: "matnr", width: 120, fixed: true },
        { title: "No Dokumen", key: "vbeln", width: 120 },
        { title: "Customer", key: "nama_customer", width: 120 },
    ];

    headers.push({
        title: "Selisih (H vs H-1)",
        key: "delta_hari_ini",
        width: 140,
        align: "center",
        sortable: false,
    });

    const days = Array.from({ length: 31 }, (_, i) => ({
        title: `${i + 1}`,
        key: `t${i + 1}`,
        width: 50,
        align: "center",
        sortable: false,
    }));

    return [...headers, ...days];
    },
  },

  watch: {
    parts: {
      handler() {
        this.safeRenderChart();
      },
      deep: false,
    },

    datePickerValue(val) {
      if (!val || this._skipDateWatch) return;
      // ✅ replaceAll strip, ambil 6 digit pertama
      this.month = String(val).replace(/-/g, "").substring(0, 6);
      this.menuMonth = false;
      this.loadData();
    },

    activeType(newType, oldType) {
      if (newType === oldType) return;

      this.store.type = newType;
      this.parts = [];
      this.searchPart = "";
      this.filterCustomer = null;

      console.log("loadData with month:", this.month);

      this.loadData().then(() => {
        this.$nextTick(() => this.safeRenderChart());
      });
    },
  },

mounted() {
  const now      = new Date();
  const year     = now.getFullYear();
  const monthNum = String(now.getMonth() + 1).padStart(2, "0");

  // Set datePickerValue tanpa trigger loadData dari watcher
  this._skipDateWatch = true;
  this.datePickerValue = `${year}-${monthNum}-01`;
  this._skipDateWatch  = false;

  this.selectedYear  = year;
  this.selectedMonth = now.getMonth() + 1;

  // setMonthValue set this.month = "202605" dengan benar
  this.setMonthValue(year, now.getMonth() + 1);

  const today        = new Date().toISOString().split("T")[0];
  this.do_date_start = today;
  this.do_date_end   = today;
  this.store.type    = this.activeType;

  this.loadData();
},

  beforeUnmount() {
    if (this._chartTimer) {
      clearTimeout(this._chartTimer);
      this._chartTimer = null;
    }

    if (this._chart) {
      this._chart.destroy();
      this._chart = null;
    }
  },

  methods: {
    ...mapActions(useMaterialStore, [
      "fetchMdfoSap",
      "generateMdfo",
      "fetchSoSap",
      "generateSo",
      "updateCalculationsMonth",
      "fetchCompareMdfoSo",
    ]),
    ...mapActions(useRundownIFP, ["fetchCustMdfo"]),

    getAccumulatedGap(item, day) {
    let acc = 0;
    for (let i = 1; i <= day; i++) {
      acc += (item.gap[i] || 0);
    }
    return acc;
  },
  
  // Memberikan warna pada sel akumulasi (opsional)
  getAccClass(val) {
    if (val > 0) return 'cal-gap-pos font-weight-bold';
    if (val < 0) return 'cal-gap-neg font-weight-bold';
    return 'text-grey';
  },

    toggleWeekHighlight(weekId) {
      this.selectedWeek = this.selectedWeek === weekId ? null : weekId;
    },

    isDayInSelectedWeek(day) {
      if (!this.selectedWeek) return false;
      const w = this.calendarWeekRanges.find((w) => w.id === this.selectedWeek);
      return w ? day >= w.start && day <= w.end : false;
    },

      onWeekHeaderClick(weekId, event) {
        const week = this.calendarWeekRanges.find(w => w.id === weekId);
        if (!week) return;

        const sourceData = this.calendarFiltered; 
        let totalMdfo = 0, totalSales = 0, totalGap = 0;
        let detailParts = [];

        sourceData.forEach(item => {
          let pMdfo = 0, pSales = 0, pGap = 0;
          for (let d = week.start; d <= week.end; d++) {
            pMdfo += (item.mdfo[d] || 0);
            pSales += (item.sales[d] || 0);
            pGap += (item.gap[d] || 0);
          }
          totalMdfo += pMdfo;
          totalSales += pSales;
          totalGap += pGap;

          if (pMdfo !== 0 || pSales !== 0) {
            detailParts.push({
              matnr: item.matnr,
              zmodel: item.zmodel,
              mdfo: pMdfo,
              sales: pSales,
              gap: pGap,
              absGap: Math.abs(pGap)
            });
          }
        });

        detailParts.sort((a, b) => b.absGap - a.absGap);

        // --- LOGIKA POSISI TOOLTIP ---
        const tooltipWidth = 320; 
  const padding = 20; // Jarak aman dari tepi layar
  
 const rect = event.currentTarget.getBoundingClientRect();
  
  // posX diatur tepat di tengah lebar layar browser
  let posX = window.innerWidth / 2;
  
  // posY tetap mengikuti posisi bawah header agar tidak menutupi header
  let posY = rect.bottom + 10; 

  this.weekTooltip = {
    show: true,
    x: posX,
    y: posY,
    weekLabel: week.label,
    weekStart: week.start,
    weekEnd: week.end,
    totalMdfo,
    totalSales,
    totalGap,
    data: detailParts.slice(0, 10)
        };
      },

      closeWeekTooltip() {
        this.selectedWeek     = null;
        this.weekTooltip.show = false;
      },

      calendarToggleSort(key) {
        if (this.calendarSortKey === key) {
          this.calendarSortDir = this.calendarSortDir === "asc" ? "desc" : "asc";
        } else {
          this.calendarSortKey = key;
          this.calendarSortDir = "asc";
        }
      },

      calendarSortIcon(key) {
        if (this.calendarSortKey !== key) return "mdi-unfold-more-horizontal";
        return this.calendarSortDir === "asc" ? "mdi-arrow-up" : "mdi-arrow-down";
      },

     pickMonth(monthValue) {
      this.selectedMonth = monthValue;
      this.setMonthValue(this.selectedYear, monthValue);
      this.menuMonth = false;
    },

    setMonthValue(year, monthValue) {
      const mm = String(monthValue).padStart(2, "0");
      this.month = `${year}${mm}`;

      const date = new Date(year, monthValue - 1, 1);
      this.monthText = new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
      }).format(date);
    },

    isSelectedMonth(monthValue) {
      return (
        Number(this.selectedMonth) === Number(monthValue) &&
        Number(this.selectedYear) === Number(this.month.slice(0, 4) || this.selectedYear)
      );
    },

    onPickMonth(val) {
      if (!val) return;

      const d = new Date(val);
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, "0");

      this.month = `${year}${monthNum}`;

      this.monthText = new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
      }).format(d);

      this.menuMonth = false;
    },

    isCalendarWeekendHeader(key) {
  if (!key || typeof key !== "string") return false;
  if (!key.startsWith("t")) return false;

  const day = Number(key.replace("t", ""));
  if (!day) return false;

  return this.isWeekend(day);
},

    numberFormat(value) {
      if (value === null || value === undefined || value === "") return "0";
      return Number(value).toLocaleString("id-ID");
    },

    fmtNumber(val) {
      if (val === null || val === undefined || val === "") return "-";
      const num = Number(val);
      if (Number.isNaN(num)) return "-";
      return num.toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    },

    openHeatmapCellMatnr(item, d) {
      const cell = item[`data_t${d}`];
      if (!cell) return;

      this.popupHeatmapMatnr = {
        matnr: item.matnr,
        zmodel: item.zmodel || "-",
        day: d,
        mdfo: cell.mdfo ?? 0,
        sales: cell.sales ?? 0,
        gap: cell.gap ?? 0,
      };

      this.dialogHeatmapMatnr = true;
    },

    openHeatmapCell(item, d) {
      const cell = item[`data_t${d}`];
      if (!cell) return;

      this.popupHeatmap = {
        zcust: item.zcust,
        day: d,
        mdfo: cell.mdfo ?? 0,
        sales: cell.sales ?? 0,
        gap: cell.gap ?? 0,
      };

      this.dialogHeatmap = true;
    },

    formatNumber(v) {
      const n = Number(v || 0);
      return new Intl.NumberFormat("id-ID").format(n);
    },

    exportComparisonExcelMatnr() {
      const header = ["Matnr", "Model"];
      for (let i = 1; i <= 31; i++) header.push(`Tgl ${i} (Gap)`);
      header.push("Total MDFO", "Total Sales", "Total Gap");

      const rows = (this.comparisonPivotMatnrFiltered || []).map((item) => {
        const row = [item.matnr, item.zmodel || "-"];

        for (let i = 1; i <= 31; i++) {
          const dayData = item[`data_t${i}`];
          row.push(dayData ? dayData.gap : 0);
        }

        row.push(
          Number(item.total_mdfo || 0),
          Number(item.total_sales || 0),
          Number(item.total_gap || 0)
        );

        return row;
      });

      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Heatmap_By_Matnr");

      XLSX.writeFile(wb, `Heatmap_Matnr_${this.month}.xlsx`);
    },

    normalizeZmodel(v) {
      const s = String(v ?? "").trim();
      return s ? s.toUpperCase() : "-";
    },

    openPopupZmodelMatnr(zmodel, day) {
      console.log("partsMatnr len:", this.partsMatnr?.length);
      console.log("clicked zmodel/day:", zmodel, day);
      console.log("sample row:", this.partsMatnr?.[0]);

      const zm = this.normalizeZmodel(zmodel);
      const d = Number(day);

      const src = Array.isArray(this.partsMatnr) ? this.partsMatnr : [];

      const filtered = src.filter(
        (r) => this.normalizeZmodel(r.zmodel) === zm && Number(r.day) === d
      );

      const map = {};
      for (const r of filtered) {
        const matnr = String(r.matnr || "").trim();
        if (!matnr) continue;

        if (!map[matnr]) map[matnr] = { matnr, mdfo: 0, sales: 0, gap: 0 };
        map[matnr].mdfo += Number(r.mdfo || 0);
        map[matnr].sales += Number(r.sales || 0);
        map[matnr].gap += Number(r.gap || 0);
      }

      const rows = Object.values(map).sort((a, b) => a.matnr.localeCompare(b.matnr));

      this.popupZmodel = { zmodel: zm, day: d, rows };
      this.dialogZmodelMatnr = true;
    },

    exportComparisonExcelZmodel() {
      const header = ["Model", "Total Part"];
      for (let i = 1; i <= 31; i++) header.push(`Tgl ${i} (Gap)`);
      header.push("Total MDFO", "Total Sales", "Total Gap");

      const rows = (this.comparisonPivotZmodelFiltered || []).map((item) => {
        const row = [item.zmodel || "-", (item.matnr_list || []).length];

        for (let i = 1; i <= 31; i++) {
          const dayData = item[`data_t${i}`];
          row.push(dayData ? dayData.gap : 0);
        }

        row.push(
          Number(item.total_mdfo || 0),
          Number(item.total_sales || 0),
          Number(item.total_gap || 0)
        );

        return row;
      });

      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Heatmap_By_Model");

      XLSX.writeFile(wb, `Heatmap_Model_${this.month}.xlsx`);
    },

    getDeltaToday(item) {
      const today = new Date().getDate();
      const yesterday = today - 1;

      if (yesterday < 1) return 0;

      const vToday = Number(item?.[`t${today}`] || 0);
      const vYest = Number(item?.[`t${yesterday}`] || 0);

      return vToday - vYest;
    },

    async loadData() {
      if (!this.month) return;
        
        // CLEANING: Hapus semua karakter non-angka dan ambil 6 digit pertama
        const cleanMonth = String(this.month).replace(/\D/g, "").substring(0, 6);
        
        this.dialogNoData = false;

        if (this.activeType === "mdfo") {
          await this.fetchMdfoSap(cleanMonth);
        } else if (this.activeType === "so") {
          await this.fetchSoSap(cleanMonth);
        } else if (this.activeType === "compare") {
          // Gunakan cleanMonth agar yang terkirim pasti 202605
          const payload = await this.fetchCompareMdfoSo(cleanMonth);
          this.partsMatnr = Array.isArray(payload?.dataMatnr) ? payload.dataMatnr : [];
          this.compareMatnr = this.partsMatnr;
        }

      // Cek berdasarkan activeType
      let hasData = false;
      if (this.activeType === "compare") {
        hasData = Array.isArray(this.partsMatnr) && this.partsMatnr.length > 0;
      } else {
        hasData = Array.isArray(this.parts) && this.parts.length > 0;
      }

      this.dialogNoData = !hasData;
    },

    getPctClass(val) {
      const num = parseFloat(val);
      if (num === 0) return "text-grey";
      if (num > 0) return "text-red-darken-2";
      return "text-blue-darken-2";
    },

    async confirmGenerate() {
      this.dialogNoData = false;
      await this.doGenerateSap();
    },

    async doGenerateSap() {
      this.loadingGenerate = true;
      try {
        if (this.activeType === "mdfo") {
          const response = await this.generateMdfo(this.month);
          if (response && response.status) {
            const resWorkdays = await this.fetchCustMdfo(this.month, "monthly");
            let apiData = [];
            if (resWorkdays && resWorkdays.data) apiData = resWorkdays.data;
            else if (Array.isArray(resWorkdays)) apiData = resWorkdays;

            if (apiData.length > 0) {
              this.customerWorkdaysList = apiData.map((c) => ({
                zcust: c.zcust,
                nama_customer: c.nama_customer,
                workdays: c.total_workdays > 0 ? c.total_workdays : 22,
                status_keterangan: c.status_keterangan || "No Info",
              }));
            } else {
              const set = new Set(this.parts.map((p) => p.zcust));
              this.customerWorkdaysList = Array.from(set)
                .filter(Boolean)
                .map((z) => ({
                  zcust: z,
                  nama_customer: null,
                  workdays: 22,
                  status_keterangan: "Data tidak di-link ke Master",
                }));
            }

            this.dialogWorkdays = true;
            await this.fetchMdfoSap(this.month);
          }
        } else {
          await this.generateSo(this.month);
          await this.fetchSoSap(this.month);
        }
      } catch (e) {
        console.error(e);
        this.showNotif("error", "Gagal memproses data");
      } finally {
        this.loadingGenerate = false;
      }
    },

    getStatusColor(status) {
      if (!status) return "grey";

      const s = status.toLowerCase();

      if (
        s.includes("tidak ada di ms customer") ||
        s.includes("data tidak ada di ms customer") ||
        s.includes("tidak ada di jadwal minggu") ||
        s.includes("customer tidak ada di jadwal")
      ) {
        return "grey-lighten-3";
      }

      if (
        s.includes("data tersedia") ||
        s.includes("data mingguan tersedia") ||
        s.includes("ikut induk") ||
        s.includes("data mingguan")
      ) {
        return "success";
      }

      return "grey";
    },

    async saveWorkdays() {
      this.loadingGenerate = true;
      try {
        const payload = {
          month: this.month,
          data: this.customerWorkdaysList.map((item) => ({
            zcust: item.zcust,
            workdays: item.workdays,
          })),
        };
        const result = await this.updateCalculationsMonth(payload);
        if (result) {
          this.showNotif("success", "Workdays diperbarui!");
          this.dialogWorkdays = false;
          await this.loadData();
        }
      } finally {
        this.loadingGenerate = false;
      }
    },

    formatBulanTahun(ym) {
      if (!ym) return "";
      const y = ym.substring(0, 4);
      const m = ym.substring(4, 6);
      const mNames = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      return `${mNames[parseInt(m)]} ${y}`;
    },

    isWeekend(day) {
    if (!this.month || String(this.month).length !== 6) return false;

    const year = Number(String(this.month).slice(0, 4));
    const month = Number(String(this.month).slice(4, 6)) - 1;

    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();

    return dayOfWeek === 0 || dayOfWeek === 6; // Minggu / Sabtu
    },

    getCellClass(val, day) {
    const classes = [];
    const qty = Number(val || 0);

    if (this.isWeekend(day)) {
        classes.push("weekend-cell");
    }

    if (qty > 0) {
        classes.push("has-qty");
    } else {
        classes.push("no-qty");
    }

    return classes;
    },

    getGapColorClass(gap, day) {
      const weekend = this.isWeekend(day);
      let baseClass = weekend ? "weekend-cell " : "";

      if (gap === undefined || gap === 0) return baseClass + "text-grey-lighten-1";
      if (gap > 0) return baseClass + "gap-positive";
      if (gap < 0) return baseClass + "gap-negative";
      return baseClass;
    },

    safeRenderChart() {
      if (this.activeType === "compare" && !this.comparisonPivot.length) return;
      if (this.activeType !== "compare" && !this.filteredSummary.length) return;

      clearTimeout(this._chartTimer);
      this._chartTimer = setTimeout(() => {
        this.$nextTick(() => this.renderChart());
      }, 200);
    },

renderChart() {
  if (this.activeType === "compare") {
    const labels = this.comparisonPivot.map((p) => p.zcust);
    const data = this.comparisonPivot.map((p) => Number(p.total_gap || 0));

    this.chartOptionsCompare = {
      ...this.chartOptionsCompare,
      xaxis: {
        ...this.chartOptionsCompare.xaxis,
        categories: labels,
      },
      colors: ["#ff5252"],
    };

    this.seriesCompare = [
      {
        name: "Total Gap",
        data,
      },
    ];
  } else {
    const labels = this.filteredSummary.map((r) => r.matnr);
    const data = this.filteredSummary.map((r) => Number(r.tot || 0));

    this.chartOptions = {
      ...this.chartOptions,
      xaxis: {
        ...this.chartOptions.xaxis,
        categories: labels,
      },
      colors: ["#42a5f5"],
    };

    this.series = [
      {
        name: "Total Qty",
        data,
      },
    ];
  }
},

    exportSummaryExcel() {
      const configStore = useConfigStore();
      const cleanMonth = String(this.month).replace(/\D/g, "").substring(0, 6);
      
      // 1. Susun URL Download
      const downloadUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/mdfoSalesOrder/exportExcel?period=${cleanMonth}&type=${this.activeType}`;
      
      // 2. Susun URL Tujuan (Halaman Kembali)
      const redirectUrl = "http://192.168.10.67/mims/mkt/monthly/mdfo-so";

      // 3. Jalankan Download
      // Gunakan window.location agar tab saat ini tetap memproses unduhan
      window.location.href = downloadUrl;

      // 4. Redirect Halaman
      // Berikan sedikit jeda (misal 500ms) agar request unduhan dikirim terlebih dahulu
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 500);
    },

    exportExcel() {
      const header = ["Part Number"];
      if (this.activeType === "mdfo") header.push("Model", "No Dokumen");
      else header.push("SO Number");
      header.push("Customer");
      for (let i = 1; i <= 31; i++) header.push(`${i}`);

      const rows = this.filteredParts.map((r) => {
        const row = [r.matnr];
        if (this.activeType === "mdfo") {
          row.push(r.zmodel || "-", r.vbeln || "-");
        } else {
          row.push(r.vbeln || "-");
        }

        row.push(r.zcust_full || r.zcust);

        for (let i = 1; i <= 31; i++) {
          row.push(r[`t${i}`] || 0);
        }
        return row;
      });

      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Calendar");
      XLSX.writeFile(wb, `${this.activeType}_Calendar_${this.month}.xlsx`);
    },

    exportComparisonExcel() {
      const header = ["Customer"];
      for (let i = 1; i <= 31; i++) header.push(`Tgl ${i} (Gap)`);
      header.push("Total MDFO", "Total Sales", "Total Gap");

      const rows = this.comparisonPivot.map((item) => {
        const row = [item.zcust];

        for (let i = 1; i <= 31; i++) {
          const dayData = item[`data_t${i}`];
          row.push(dayData ? dayData.gap : 0);
        }

        row.push(item.total_mdfo, item.total_sales, item.total_gap);
        return row;
      });

      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Comparison_Analysis");
      XLSX.writeFile(wb, `Comparison_Gap_${this.month}.xlsx`);
    },

    async onGenerateDo() {
      this.loadingDo = true;
      const configStore = useConfigStore();
      const dateParam = this.do_date_start.replaceAll("-", "");

      try {
        const url = `http://${configStore.apiUrl}/majsf_rest_api/api/mdfoSalesOrder/generateDo`;
        const res = await axios.post(url, {
          date_start: dateParam,
          date_end: dateParam,
          customer: this.doCustomer,
        });

        this.generateResult = res.data;
        this.showNotif(res.data.status === "success" ? "success" : "error", res.data.message);

        if (res.data.status === "success") {
          await this.loadData();
        }
      } catch (e) {
        this.showNotif("error", "Gagal generate DO: " + (e.message || "Server Error"));
      } finally {
        this.loadingDo = false;
      }
    },

    showNotif(type, msg) {
      const notif = useNotificationStore();
      if (type === "success") notif.showAlertSuccess(msg);
      else notif.showAlertFailed(msg);
    },
  },
});
</script>
<style scoped>
/* Memaksa kontainer internal tabel mengikuti tinggi alami baris data */
.dynamic-height-table :deep(.v-table__wrapper) {
  height: auto !important;
  overflow-y: visible !important; /* Menghilangkan scrollbar vertikal internal */
  overflow-x: auto !important;    /* Tetap pertahankan scrollbar horizontal untuk kolom tanggal t1-t31 */
}

/* Jika Anda ingin kolom pertama (matnr / Part Number) tetap terkunci di kiri saat scroll horizontal */
.sticky-col {
  position: sticky;
  left: 0;
  background-color: white;
  z-index: 1;
}

/* Memastikan baris saat di-hover tidak menimpa warna sticky column */
tr:hover .sticky-col {
  background-color: #f5f5f5; /* Sesuaikan dengan warna hover premium-table Anda */
}
/* 1. Atur agar border tidak hilang saat sticky */
.cal-table {
  border-collapse: separate !important;
  border-spacing: 0;
}

/* 2. Garis untuk Kolom Part Number (Sticky 1) */
.cal-sticky.cal-td-id, 
.cal-sticky.cal-th-id {
  border-right: 2px solid #bdbdbd !important; /* Garis vertikal tebal setelah Part Number */
  border-bottom: 1px solid #e0e0e0 !important;
}

/* 3. Garis untuk Kolom Model (Sticky 2) */
.cal-td-sm, 
.cal-th-sm {
  border-right: 2px solid #bdbdbd !important; /* Garis vertikal tebal setelah Model */
  border-bottom: 1px solid #e0e0e0 !important;
}

/* 4. Pastikan semua cell tetap punya border bawah dan kanan standar */
.cal-table td, 
.cal-table th {
  border-bottom: 1px solid #e0e0e0;
  border-right: 1px solid #e0e0e0;
}

/* 5. Khusus untuk Header (thead) agar garisnya sinkron */
thead .cal-sticky {
  border-bottom: 2px solid #bdbdbd !important;
  z-index: 5; /* Agar tetap di atas body saat scroll */
}
.cal-type-acc {
  color: #455a64; /* Blue Grey */
  background: #f1f8e9;
  font-style: italic;
}

/* Background baris akumulasi agar sedikit berbeda */
.cal-row-acc td {
  background: #fdfdfd;
  border-bottom: 1px solid #ddd;
}

/* Memperjelas teks Grand Total ACC jika Anda menambahkannya juga di bawah */
.cal-row-gt-acc td {
  background: #e0f2f1 !important;
  color: #004d40;
}
.cal-tt {
  position: fixed; /* Gunakan fixed untuk koordinat viewport yang stabil */
  z-index: 9999;
  width: 320px;
  background: #1e1e2e;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,.5);
  transform: translateX(-50%); /* Menjaga kursor/header tetap di tengah tooltip */
  pointer-events: auto;
  
  /* Tambahkan ini agar transisi mulus */
  transition: opacity 0.2s ease;
  
  /* Hilangkan bayangan klik hitam dari instruksi sebelumnya */
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

/* 1. Menghilangkan highlight saat elemen diklik (Tap Highlight) */
.cal-table, 
.premium-table, 
.cal-table td, 
.cal-table th, 
.v-data-table td {
  -webkit-tap-highlight-color: transparent !important;
  outline: none !important;
}

/* 2. Menghilangkan bayangan hitam/biru akibat seleksi teks otomatis */
.cal-table, 
.premium-table {
  -webkit-user-select: none; /* Safari */
  -moz-user-select: none;    /* Firefox */
  -ms-user-select: none;     /* IE10+/Edge */
  user-select: none;         /* Standard */
}

/* 3. Menghilangkan background gelap bawaan Vuetify saat sel/baris aktif atau difokuskan */
:deep(.v-data-table__tr:active),
:deep(.v-data-table__td:active),
.cal-table tr:active,
.cal-table td:active {
  background-color: transparent !important;
}

/* 4. Jika Anda tetap ingin teks di dalam dialog atau input bisa dicopy, 
      tambahkan pengecualian agar input tidak ikut terkunci */
input, textarea {
  user-select: text !important;
}

:deep(.premium-table .v-table__wrapper > table) {
  border-collapse: collapse;
}

:deep(.premium-table .v-table__wrapper > table th),
:deep(.premium-table .v-table__wrapper > table td) {
  border-bottom: 1px solid #e0e0e0 !important;
}

:deep(.premium-table .v-table__wrapper > table th) {
  border-bottom: 2px solid #d0d0d0 !important;
}

:deep(.premium-table .v-table__wrapper > table th),
:deep(.premium-table .v-table__wrapper > table td) {
  border-right: 1px solid #eeeeee !important;
}

:deep(.premium-table .v-table__wrapper > table th:last-child),
:deep(.premium-table .v-table__wrapper > table td:last-child) {
  border-right: none !important;
}

:deep(.v-btn .v-btn__content) {
  opacity: 1 !important;
  visibility: visible !important;
}
:deep(.premium-table thead th) {
  background-color: #f5f7fa;   /* warna header */
  color: #1f2937;              /* warna text */
  font-weight: 600;
  border-bottom: 2px solid #d0d0d0;
}

:deep(.premium-table thead th) {
  border-right: 1px solid #e5e7eb;
}

:deep(.premium-table thead th:last-child) {
  border-right: none;
}

:deep(.premium-table thead th) {
  background: #eef2f7;      /* warna header */
  color: #334155;           /* warna teks */
  font-weight: 600;
  border-bottom: 2px solid #d0d0d0;
  border-right: 1px solid #e5e7eb;
}

/* Hilangkan border kanan terakhir */
:deep(.premium-table thead th:last-child) {
  border-right: none;
}

/* Sticky header saat scroll */
:deep(.premium-table thead th) {
  position: sticky;
  top: 0;
  z-index: 2;
}
.weekend-cell {
  background-color: #fbe4e4 !important;
}

.weekend-cell.has-qty {
  background-color: #fbe4e4 !important;
  color: #0d47a1 !important;
  font-weight: 700;
}

.weekend-cell.no-qty {
  background-color: #fbe4e4 !important;
  color: #9e9e9e !important;
}

.has-qty {
  background-color: #e3f2fd;
  color: #0d47a1;
  font-weight: 700;
}

.no-qty {
  color: #9e9e9e;
}
/* Header sortable cursor */
.sortable-col {
  cursor: pointer;
  user-select: none;
}

.sortable-col:hover {
  background-color: #dce8f5 !important;
}



/* Sort icon stack vertikal */
.sort-icons {
  display: inline-flex;
  flex-direction: column;
  line-height: 1;
  gap: 0px;
  margin-left: 2px;
}

.sort-icons .v-icon {
  display: block;
  height: 12px;
}


:deep(td.weekend-cell.no-qty) {
  background-color: #fff0f0 !important;
  color: #e0a0a0 !important;
}
.sort-icon-wrap {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  opacity: 0.4;
  transition: opacity 0.15s;
}

.sortable-col:hover .sort-icon-wrap {
  opacity: 1;
}

.sort-icon-wrap:has(.v-icon[color="primary"]) {
  opacity: 1;
}
:deep(.v-data-table .calendar-header-cell.weekend-header),
:deep(th.calendar-header-cell.weekend-header),
:deep(.premium-table th.weekend-header) {
  background-color: #fce4e4 !important;
  color: #b71c1c !important;
  font-weight: 700 !important;
}

/* Untuk cell td juga */
:deep(.premium-table td.weekend-cell) {
  background-color: #fff0f0 !important;
}

:deep(.premium-table td.weekend-cell.has-qty) {
  background-color: #ffd6d6 !important;
  color: #b71c1c !important;
  font-weight: 700 !important;
}
/* ── Tabel kalender MDFO vs SO ── */
.calendar-mdfo-table {
  border-collapse: collapse;
  font-size: 12px;
  min-width: 100%;
  white-space: nowrap;
}

.calendar-mdfo-table th,
.calendar-mdfo-table td {
  border: 1px solid #e0e0e0;
  padding: 3px 6px;
  text-align: right;
}

/* Sticky kolom pertama */
.calendar-mdfo-table .sticky-col {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
  text-align: left;
}

/* Header */
.th-part  { min-width: 160px; background: #f5f5f5; text-align: left; }
.th-model { min-width: 100px; background: #f5f5f5; }
.th-type  { min-width: 55px;  background: #f5f5f5; text-align: center; }
.th-day   { min-width: 42px;  background: #f5f5f5; text-align: center; cursor: default; }
.th-total { min-width: 90px;  background: #f5f5f5; text-align: center; }

/* Week header — klik untuk highlight */
.th-week {
  min-width: 90px;
  background: #e3f2fd;
  text-align: center;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}
.th-week:hover     { background: #bbdefb; }
.week-active       { background: #1565c0 !important; color: #fff !important; }

/* Type label */
.type-mdfo  { color: #1565c0; font-weight: 600; text-align: center; }
.type-sales { color: #2e7d32; font-weight: 600; text-align: center; }
.type-gap   { color: #6a1b9a; font-weight: 600; text-align: center; }

/* Row background */
.row-mdfo  td { background: #f9fdff; }
.row-sales td { background: #f9fff9; }
.row-gap   td { background: #fdf6ff; }

/* Weekly cell aktif */
.td-week { text-align: right; }
.td-week.week-active { background: #e3f2fd !important; font-weight: 600; }
.row-gap .td-week.week-active { background: #ede7f6 !important; }

/* Day highlight saat week dipilih */
.day-week-highlight { background: #fff8e1 !important; }

/* Weekend */
.day-weekend { background: #fce4ec !important; color: #c62828; }

/* Gap colors */
.gap-positive { color: #c62828; }
.gap-negative { color: #1565c0; }

/* Total column */
.td-total { background: #f5f5f5 !important; text-align: right; min-width: 90px; }

/* Separator antar part */
.row-separator td { height: 4px; background: #eeeeee; border: none; padding: 0; }

/* Grand total */
.row-grand-total td { background: #e8eaf6 !important; border-top: 2px solid #9fa8da; }
.row-grand-gap   td { background: #f3e5f5 !important; }

/* ── Cal Table ── */
.cal-table {
  border-collapse: collapse;
  font-size: 12px;
  white-space: nowrap;
  width: 100%;
}

.cal-table th,
.cal-table td {
  border: 1px solid #e0e0e0;
  padding: 3px 6px;
  text-align: right;
  vertical-align: middle;
}

/* Sticky kolom kiri */
.cal-sticky {
  position: sticky;
  left: 0;
  z-index: 3;
  background: #fff;
}
thead .cal-sticky { z-index: 4; background: #f5f5f5; }

/* Header inner flex */
.cal-th-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

/* Header cells */
.cal-th         { background: #f5f5f5; text-align: center; font-weight: 600; }
.cal-th-part    { min-width: 170px; text-align: left; }
.cal-th-model   { min-width: 100px; text-align: left; }
.cal-th-type    { min-width: 50px; }
.cal-th-day     { min-width: 40px; width: 40px; }
.cal-th-total   { min-width: 90px; background: #ede7f6; text-align: center; }

/* Week header */
.cal-th-week {
  min-width: 85px;
  background: #e3f2fd;
  cursor: pointer;
  user-select: none;
  transition: background .15s, color .15s;
}
.cal-th-week:hover            { background: #bbdefb; }
.cal-week-active-header       { background: #1565c0 !important; color: #fff !important; }

/* Type label */
.cal-td-type    { text-align: center; font-weight: 600; font-size: 11px; }
.cal-type-mdfo  { color: #1565c0; background: #e8f4fd; }
.cal-type-sales { color: #2e7d32; background: #e8f5e9; }
.cal-type-gap   { color: #6a1b9a; background: #f3e5f5; }

/* Part / Model sticky cell */
.cal-td-part  { text-align: left; min-width: 170px; background: #fff; }
.cal-td-model { text-align: left; min-width: 100px; color: #666; font-size: 11px; }

/* Row backgrounds */
.cal-row-mdfo  td { background: #f9fdff; }
.cal-row-sales td { background: #f9fff9; }
.cal-row-gap   td { background: #fdf6ff; }

/* Week cell */
.cal-td-week               { text-align: right; }
.cal-td-week.cal-week-active { background: #bbdefb !important; font-weight: 700; }
.cal-row-gap .cal-td-week.cal-week-active { background: #e1bee7 !important; }

/* Day cell */
.cal-td-day         { text-align: center; }
.cal-day-highlight  { background: #fff8e1 !important; }
.cal-day-weekend    { background: #fce4ec !important; color: #b71c1c; }

/* Gap colors */
.cal-gap-pos { color: #c62828; }
.cal-gap-neg { color: #1565c0; }

/* Total column */
.cal-td-total { background: #f3e5f5 !important; text-align: right; font-size: 12px; }

/* Separator */
.cal-row-sep td {
  height: 5px;
  background: #eeeeee;
  border: none;
  padding: 0;
}

/* Grand total */
.cal-row-gt     td { background: #e8eaf6 !important; border-top: 2px solid #9fa8da; font-size: 12px; }
.cal-row-gt-gap td { background: #ede7f6 !important; }

/* ── Week group header (baris 1, harian) ── */
.cal-th-week-group {
  background: #e3f2fd;
  text-align: center;
  cursor: pointer;
  user-select: none;
  transition: background .15s, color .15s;
  border-bottom: 2px solid #90caf9;
}
.cal-th-week-group:hover        { background: #bbdefb; }
.cal-week-group-active          { background: #1565c0 !important; color: #fff !important; }

/* Week only (view mingguan) */
.cal-th-week-only  { min-width: 90px; background: #e3f2fd; text-align: center; }
.cal-td-week-only  { text-align: right; min-width: 90px; }

/* Day highlight saat minggu dipilih */
.cal-day-hl         { background: #fff8e1 !important; }
.cal-day-hl-weekend { background: #ffe0b2 !important; }

/* ── Tooltip popup ── */
.cal-week-tooltip {
  position:       absolute;
  z-index:        999;
  background:     #1e1e2e;
  color:          #e0e0e0;
  border-radius:  10px;
  padding:        0;
  min-width:      300px;
  max-width:      380px;
  box-shadow:     0 8px 32px rgba(0,0,0,.35);
  font-size:      12px;
  transform:      translateX(-50%);
  pointer-events: all;
}

.cal-tt-header {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
  padding:         10px 14px 8px;
  border-bottom:   1px solid #333;
  font-size:       13px;
  color:           #fff;
}

.cal-tt-grand {
  padding:    8px 14px 4px;
  border-bottom: 1px solid #2a2a3e;
}

.cal-tt-row {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
  padding:         2px 0;
}

.cal-tt-gap-row {
  border-top:  1px solid #333;
  margin-top:  4px;
  padding-top: 4px;
}

.cal-tt-label { color: #aaa; font-size: 11px; }
.cal-tt-val   { font-size: 12px; color: #fff; }

.cal-tt-divider {
  padding:    6px 14px;
  font-size:  10px;
  color:      #888;
  background: #16162a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cal-tt-list {
  padding:    4px 0 8px;
  max-height: 260px;
  overflow-y: auto;
}

.cal-tt-part-row {
  padding:    4px 14px;
  border-bottom: 1px solid #2a2a3e;
}
.cal-tt-part-row:last-child { border-bottom: none; }

.cal-tt-part-name {
  margin-bottom: 3px;
  font-size:     11px;
}

.cal-tt-part-vals {
  display: flex;
  gap:     5px;
}

.cal-tt-chip {
  padding:       1px 6px;
  border-radius: 4px;
  font-size:     11px;
  background:    #2a2a3e;
}

.cal-tt-chip-mdfo  { color: #90caf9; }
.cal-tt-chip-sales { color: #a5d6a7; }
.cal-tt-chip-pos   { background: #3e1a1a; color: #ef9a9a; }
.cal-tt-chip-neg   { background: #1a1a3e; color: #90caf9; }
.cal-tt-chip-zero  { color: #888; }

/* Fade transition */
.cal-tooltip-fade-enter-active,
.cal-tooltip-fade-leave-active {
  transition: opacity .18s ease, transform .18s ease;
}
.cal-tooltip-fade-enter-from,
.cal-tooltip-fade-leave-to {
  opacity:   0;
  transform: translateX(-50%) translateY(-6px);
}
/* ── Tabel ── */
.cal-table { border-collapse:collapse; white-space:nowrap; font-size:12px; width:100%; }
.cal-table th, .cal-table td {
  border: 1px solid #e0e0e0;
  padding: 3px 6px;
  text-align: right;
  vertical-align: middle;
}

/* Sticky */
.cal-sticky { position:sticky; left:0; z-index:3; background:#fff; }
thead .cal-sticky { z-index:5; background:#f5f5f5; }

/* Header */
.cal-th           { background:#f5f5f5; font-weight:600; text-align:center; }
.cal-th-inner     { display:flex; align-items:center; justify-content:center; gap:3px; }
.cal-th-id        { min-width:170px; text-align:left; }
.cal-th-sm        { min-width:95px; }
.cal-th-type-hd   { min-width:50px; }
.cal-th-day       { min-width:38px; width:38px; font-weight:500; }
.cal-th-total     { min-width:90px; background:#ede7f6; }

/* Week group header */
.cal-th-wgrp {
  background: #e3f2fd;
  cursor: pointer;
  user-select: none;
  border-left: 2px solid #90caf9 !important;
  border-right: 2px solid #90caf9 !important;
  transition: background .15s, color .15s;
}

.cal-wgrp-active      { background:#1565c0 !important; color:#fff !important; }

/* Day highlight */
.cal-day-hl    { background:#fff8e1 !important; }
.cal-day-we    { background:#fce4ec !important; color:#b71c1c; }
.cal-day-we-hl { background:#ffe0b2 !important; color:#e65100; }

/* Type cells */
.cal-td-type    { text-align:center; font-weight:600; font-size:11px; min-width:48px; }
.cal-type-mdfo  { color:#1565c0; background:#e8f4fd; }
.cal-type-sales { color:#2e7d32; background:#e8f5e9; }
.cal-type-gap   { color:#6a1b9a; background:#f3e5f5; }

/* ID / model cells */
.cal-td-id { text-align:left; min-width:170px; }
.cal-td-sm { text-align:left; min-width:95px; color:#777; font-size:11px; }

/* Row backgrounds */
.cal-row-mdfo  td { background:#f9fdff; }
.cal-row-sales td { background:#f9fff9; }
.cal-row-gap   td { background:#fdf6ff; }

/* Day value cell */
.cal-td-day { text-align:center; }

/* Total col */
.cal-td-total { background:#f3e5f5 !important; text-align:right; }

/* Gap colors */
.cal-gap-pos { color:#c62828; }
.cal-gap-neg { color:#1565c0; }

/* Separator */
.cal-sep td { height:5px; background:#eee; border:none; padding:0; }

/* Grand total */
.cal-row-gt     td { background:#e8eaf6 !important; border-top:2px solid #9fa8da; }
.cal-row-gt-gap td { background:#ede7f6 !important; }

/* ── Tooltip ── */
.cal-tt {
  position: absolute;
  z-index: 999;
  background: #1e1e2e;
  color: #e0e0e0;
  border-radius: 10px;
  min-width: 290px;
  max-width: 360px;
  box-shadow: 0 8px 32px rgba(0,0,0,.4);
  font-size: 12px;
  transform: translateX(-50%);
  pointer-events: all;
}

.cal-tt-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px 8px;
  border-bottom: 1px solid #333;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.cal-tt-summary {
  padding: 8px 14px 6px;
  border-bottom: 1px solid #2a2a3e;
}

.cal-tt-row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
  font-size: 11px;
  color: #ccc;
}

.cal-tt-row-gap {
  border-top: 1px solid #333;
  margin-top: 4px;
  padding-top: 5px;
  color: #fff;
}

.cal-tt-sub-title {
  padding: 5px 14px;
  font-size: 10px;
  color: #888;
  background: #16162a;
  text-transform: uppercase;
  letter-spacing: .5px;
}

.cal-tt-list {
  padding: 4px 0 8px;
  max-height: 240px;
  overflow-y: auto;
}

.cal-tt-part {
  padding: 5px 14px;
  border-bottom: 1px solid #2a2a3e;
}
.cal-tt-part:last-child { border-bottom: none; }

.cal-tt-chip {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  background: #2a2a3e;
}

.cal-tt-m  { color:#90caf9; }
.cal-tt-s  { color:#a5d6a7; }
.cal-tt-gp { background:#3e1a1a; color:#ef9a9a; }
.cal-tt-gn { background:#1a1a3e; color:#90caf9; }
.cal-tt-gz { color:#888; }

/* Fade */
.tt-fade-enter-active, .tt-fade-leave-active { transition: opacity .15s, transform .15s; }
.tt-fade-enter-from, .tt-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-5px);
}

</style>
