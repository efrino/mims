<template>
  <div class="page-wrapper">
    <v-card class="pa-6 rounded-lg mb-6 shadow-md">
      <div class="flex justify-between items-center mb-4">
        <div>
          <div class="text-2xl font-medium mb-2">
            {{ pageTitle }} Report
          </div>
          <div class="text-sm text-gray-600">
            Visualisasi {{ pageTitle }}: summary, kalender, chart, dan export Excel.
          </div>
        </div>

        <div class="w-[300px]">
          
        </div>
      </div>
      <v-divider class="mb-4" />
      <v-row dense>
        <v-col cols="auto" class="d-flex align-center gap-3 flex-nowrap">
          <div style="width: 230px; min-width: 180px; flex-shrink: 0; cursor: pointer" @click="menuMonth = true">
            <v-text-field
              :model-value="monthText"
              label="Pilih Bulan"
              variant="outlined"
              prepend-inner-icon="mdi-calendar-month"
              density="compact"
              hide-details
              readonly
            />
          </div>
          <v-dialog v-model="menuMonth" width="420">
            <v-card class="pa-4">
              <div class="flex justify-between items-center mb-4">
                <v-btn icon variant="text" @click="selectedYear--">
                  <v-icon>mdi-chevron-left</v-icon>
                </v-btn>

                <div class="text-xl font-bold text-center">
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

        <v-col cols="4" class="flex items-center">
          <div class="flex items-center gap-2">
            <v-btn
              color="primary"
              prepend-icon="mdi-database-search"
              class="px-6 text-white w-[150px]"
              @click="loadData"
            >
              Load {{ activeType === 'compare' ? 'Data' : activeType.toUpperCase() }}
            </v-btn>

            <v-progress-circular
              v-if="loading"
              indeterminate
              size="20"
              width="2"
              color="primary"
            />
          </div>
          <v-btn
            v-if="store.permissions?.createSap && activeType !== 'compare'"
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

    <div v-if="activeType !== 'compare'">
      <v-card class="pa-5 rounded-lg mb-6 shadow-md">
        <div class="flex justify-between items-center mb-4">
          <div class="text-3xl text-blue-600 font-medium">
            {{ activeType === 'mdfo' ? 'MDFO Detail' : 'Sales Order Detail' }}
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

        <v-row dense class="mb-3">
          <v-col cols="4">
            <v-text-field
              v-model="searchPart"
              placeholder="Cari Part Number, Model, atau Job Number..."
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-magnify"
              hide-details
              style="max-width: 500px; flex-grow: 1;"
              clearable
            />
          </v-col>
      
          <v-col cols="3">
            <v-select
              v-model="filterCustomer"
              :items="customerList"
              item-title="title"
              item-value="value"
              label="-- Pilih Customer --"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-account"
              clearable
              hide-details
              class="w-[250px]"
            />
          </v-col>
        </v-row>

        <v-data-table
          :headers="mergedHeaders"
          :items="filteredMerged"
          :loading="loading"
          density="compact"
          class="shadow-sm rounded-lg premium-table dynamic-height-table custom-freeze-table text-sm"
          hover
        >
          <template #headers="{ columns, sortBy, toggleSort }">
            <tr>
              <th
                v-for="(col, index) in columns"
                :key="col.key"
                :class="[
                  'calendar-header-cell',
                  'text-center',
                  'text-sm',
                  col.isWeekend ? 'weekend-header' : '',
                  col.sortable !== false ? 'sortable-col' : '',
                  (index === 1 || index === 2 || index === 3) ? 'sticky-header-col' : ''
                ]"
                :style="[
                  col.width ? { minWidth: `${col.width}px`, width: `${col.width}px` } : {},
                  index === 1 ? { left: '0px', zIndex: 4 } : {},
                  index === 2 ? { left: '120px', zIndex: 4 } : {},
                  index === 3 ? { left: '260px', zIndex: 4 } : {}
                ]"
                @click="col.sortable !== false ? toggleSort(col) : null"
              >
                <div class="header-inner flex justify-center">
                  <span>{{ col.title }}</span>
                  <span v-if="col.sortable !== false" class="sort-icon-wrap">
                    <v-icon v-if="sortBy?.[0]?.key === col.key && sortBy[0].order === 'asc'" size="14" color="primary">mdi-arrow-up</v-icon>
                    <v-icon v-else-if="sortBy?.[0]?.key === col.key && sortBy[0].order === 'desc'" size="14" color="primary">mdi-arrow-down</v-icon>
                    <v-icon v-else size="14" color="grey-lighten-2">mdi-unfold-more-horizontal</v-icon>
                  </span>
                </div>
              </th>
            </tr>
          </template>

          <template #item="{ item }">
            <tr class="text-sm">
          <td class="text-center font-normal min-w-[120px] w-[120px] max-w-[120px]">
                {{ (item.nama_customer || '').toUpperCase() }}
              </td>
              
              <td class="sticky-body-col text-center font-normal text-sm text-gray-500 sticky left-0 bg-white z-[2] min-w-[120px] w-[120px] max-w-[120px]">
                {{ item.zmodel }}
              </td>
              
              <td class="sticky-body-col text-center font-normal text-sm sticky left-[120px] bg-white z-[2] min-w-[140px] w-[140px] max-w-[140px]">
                {{ item.matnr }}
              </td>
              
              <td class="sticky-body-col text-center font-normal text-sm font-mono sticky left-[260px] bg-white z-[2] min-w-[120px] w-[120px] max-w-[120px]">
                {{ item.job_number || '-' }}
              </td>

              <td v-if="activeType === 'mdfo'" class="text-center font-normal">
                {{ new Intl.NumberFormat('id-ID').format(Number(item.pcs_day_monthly) || 0) }}
              </td>

              <td class="text-center font-normal">
                {{ new Intl.NumberFormat('id-ID').format(Number(item.tot) || 0) }}
              </td>

              <td
                v-for="d in 31"
                :key="d"
                :class="['text-center', 'font-normal', ...getCellClass(item[`t${d}`], d)]"
                class="min-w-[43px] w-[40px] max-w-[40px] px-[2px] py-[1px] text-[11px]"
              >
                {{ item[`t${d}`] || '' }}
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card>
    </div>

    <div v-if="activeType === 'compare'">

      <v-card class="pa-5 rounded-lg shadow-md mb-6 cal-card-wrap relative">
        <div class="flex flex-col mb-4 gap-4">
          <div class="flex justify-between items-center flex-wrap gap-2">
            <div>
              <div class="text-2xl text-blue-600 font-medium">
                Kalender MDFO vs Sales Order
              </div>

              <div class="text-xs text-gray-500 mt-1">
                Klik header <strong>W1–W{{ calendarWeekRanges.length }}</strong> atau tanggal <strong>1–31</strong>
                untuk melihat subtotal detail gap terbesar.
              </div>
            </div>

            <div class="flex items-center flex-wrap gap-[15px] bg-[#f8f9fa] py-[10px] px-[15px] rounded-lg border border-[#e0e0e0]">
              <div class="flex items-center">
                <v-badge dot inline color="#1565c0" class="mr-2"></v-badge>
                <span class="text-xs"><strong>MDFO:</strong> Forecast</span>
              </div>
              <div class="flex items-center">
                <v-badge dot inline color="#2e7d32" class="mr-2"></v-badge>
                <span class="text-xs"><strong>Sales Order:</strong> Fix Order</span>
              </div>
              <div class="flex items-center">
                <v-badge dot inline color="#6a1b9a" class="mr-2"></v-badge>
                <span class="text-xs"><strong>GAP:</strong> Sales Order-MDFO</span>
              </div>
              <div class="flex items-center">
                <v-badge dot inline color="#a7a7a7" class="mr-2"></v-badge>
                <span class="text-xs"><strong>ACCUM:</strong> Accumulation</span>
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center flex-wrap gap-[10px]">
            <div class="flex items-center flex-wrap gap-[10px] grow">
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

              <v-text-field
                v-model="calendarSearch"
                density="comfortable"
                hide-details 
                clearable
                placeholder="Cari Customer, Part Number, Model, atau Job Number..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                style="max-width: 500px; flex-grow: 1;"
              />
              <v-btn
                v-if="hasAnyActiveFilters"
                color="error"
                variant="outlined"
                density="compact"
                prepend-icon="mdi-filter-off"
                @click="clearAllFilters"
                class="text-none text-[12px] px-3 font-semibold"
                style="height: 40px;"
              >
                Clear Filters
              </v-btn>
            </div>
            
            <div class="flex items-center gap-2">
              <v-btn
                color="success"
                variant="flat"
                prepend-icon="mdi-microsoft-excel"
                @click="exportCalendarToExcel"
                :loading="loadingExport"
              :disabled="loadingExport"
              class="px-4"
              >
                Export Excel
              </v-btn>

              <v-btn
                color="#D24726"
                variant="flat"
                prepend-icon="mdi-file-powerpoint"
                @click="openPptModal"
                class="px-4 text-white font-weight-medium"
              >
                Export PPT (Analysis)
              </v-btn>
            </div>
          </div>
        </div>

        <!-- Summary Cards Section (Daily, Weekly & Accumulation TOP Gaps) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-4 mb-5">
          <!-- Harian (Besok) -->
          <v-card variant="flat" class="pa-4 card-harian-kustom shadow-sm">
            <div class="flex items-center gap-2 mb-3">
              <v-icon color="grey-darken-3" size="20">mdi-calendar-today</v-icon>
              <span class="text-[13px] font-bold text-slate-900 uppercase tracking-wide">
                {{ gapSummaryDashboard.formattedDailyTitle }}
              </span>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Terbesar -->
              <div>
                <div class="text-[11px] font-bold text-green-800 uppercase mb-2 flex items-center gap-1">
                  <v-icon size="14" color="green-darken-2">mdi-arrow-up-bold</v-icon> Gap Tertinggi
                </div>
                <div class="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                  <div v-for="(p, idx) in gapSummaryDashboard.dailyHighest" :key="'dh-'+idx" class="bg-white border border-green-200 p-2 rounded text-[11px] hover:shadow-sm transition-shadow">
                    <div class="font-semibold text-gray-800 flex justify-between">
                      <span class="truncate max-w-[130px]" :title="p.job_number && p.job_number !== '-' ? p.job_number : p.matnr">
                        {{ idx + 1 }}. {{ p.job_number && p.job_number !== '-' ? p.job_number : p.matnr }}
                      </span>

                      <span class="text-green-700 font-bold font-mono">+{{ Math.round(p.gapPct || 0) }}% <span class="text-[10px] text-green-600 font-semibold ml-0.5">(+{{ numberFormat(p.gap) }})</span></span>
                    </div>
                    <div class="text-[10px] text-gray-400 truncate mt-0.5">{{ p.customer }} | {{ p.zmodel }}</div>
                    <div class="text-[10px] text-gray-500 mt-1 flex justify-between bg-gray-50 px-1 py-0.5 rounded border border-gray-100 font-mono">
                      <span>MDFO: {{ numberFormat(p.mdfo) }}</span>
                      <span>SO: {{ numberFormat(p.sales) }}</span>
                    </div>
                  </div>
                  <div v-if="!gapSummaryDashboard.dailyHighest.length" class="text-center text-gray-400 text-[10px] py-4 bg-white rounded border border-dashed border-gray-200">
                    Tidak ada gap positif
                  </div>
                </div>
              </div>

              <!-- Terendah -->
              <div>
                <div class="text-[11px] font-bold text-red-800 uppercase mb-2 flex items-center gap-1">
                  <v-icon size="14" color="red-darken-2">mdi-arrow-down-bold</v-icon> Gap Terendah
                </div>
                <div class="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                  <div v-for="(p, idx) in gapSummaryDashboard.dailyLowest" :key="'dl-'+idx" class="bg-white border border-red-200 p-2 rounded text-[11px] hover:shadow-sm transition-shadow">
                    <div class="font-semibold text-gray-800 flex justify-between">
                      <span class="truncate max-w-[130px]" :title="p.job_number && p.job_number !== '-' ? p.job_number : p.matnr">
                        {{ idx + 1 }}. {{ p.job_number && p.job_number !== '-' ? p.job_number : p.matnr }}
                      </span>
                      <span class="text-red-700 font-bold font-mono">{{ Math.round(p.gapPct || 0) }}% <span class="text-[10px] text-red-600 font-semibold ml-0.5">({{ numberFormat(p.gap) }})</span></span>
                    </div>
                    <div class="text-[10px] text-gray-400 truncate mt-0.5">{{ p.customer }} | {{ p.zmodel }}</div>
                    <div class="text-[10px] text-gray-500 mt-1 flex justify-between bg-gray-50 px-1 py-0.5 rounded border border-gray-100 font-mono">
                      <span>MDFO: {{ numberFormat(p.mdfo) }}</span>
                      <span>SO: {{ numberFormat(p.sales) }}</span>
                    </div>
                  </div>
                  <div v-if="!gapSummaryDashboard.dailyLowest.length" class="text-center text-gray-400 text-[10px] py-4 bg-white rounded border border-dashed border-gray-200">
                    Tidak ada gap negatif
                  </div>
                </div>
              </div>
            </div>
          </v-card>

          <!-- Mingguan (Berjalan) -->
          <v-card variant="flat" class="pa-4 card-mingguan-kustom shadow-sm">
            <div class="flex items-center gap-2 mb-3">
              <v-icon color="grey-darken-3" size="20">mdi-calendar-week</v-icon>
              <span class="text-[13px] font-bold text-slate-900 uppercase tracking-wide">
                {{ gapSummaryDashboard.formattedWeeklyTitle }}
              </span>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Terbesar -->
              <div>
                <div class="text-[11px] font-bold text-green-800 uppercase mb-2 flex items-center gap-1">
                  <v-icon size="14" color="green-darken-2">mdi-arrow-up-bold</v-icon> Gap Tertinggi
                </div>
                <div class="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                  <div v-for="(p, idx) in gapSummaryDashboard.weeklyHighest" :key="'wh-'+idx" class="bg-white border border-green-200 p-2 rounded text-[11px] hover:shadow-sm transition-shadow">
                    <div class="font-semibold text-gray-800 flex justify-between">
                      <span class="truncate max-w-[130px]" :title="p.job_number && p.job_number !== '-' ? p.job_number : p.matnr">
                        {{ idx + 1 }}. {{ p.job_number && p.job_number !== '-' ? p.job_number : p.matnr }}
                      </span>
                      <span class="text-green-700 font-bold font-mono">+{{ Math.round(p.gapPct || 0) }}% <span class="text-[10px] text-green-600 font-semibold ml-0.5">(+{{ numberFormat(p.gap) }})</span></span>
                    </div>
                    <div class="text-[10px] text-gray-400 truncate mt-0.5">{{ p.customer }} | {{ p.zmodel }}</div>
                    <div class="text-[10px] text-gray-500 mt-1 flex justify-between bg-gray-50 px-1 py-0.5 rounded border border-gray-100 font-mono">
                      <span>MDFO: {{ numberFormat(p.mdfo) }}</span>
                      <span>SO: {{ numberFormat(p.sales) }}</span>
                    </div>
                  </div>
                  <div v-if="!gapSummaryDashboard.weeklyHighest.length" class="text-center text-gray-400 text-[10px] py-4 bg-white rounded border border-dashed border-gray-200">
                    Tidak ada gap positif
                  </div>
                </div>
              </div>

              <!-- Terendah -->
              <div>
                <div class="text-[11px] font-bold text-red-800 uppercase mb-2 flex items-center gap-1">
                  <v-icon size="14" color="red-darken-2">mdi-arrow-down-bold</v-icon> Gap Terendah
                </div>
                <div class="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                  <div v-for="(p, idx) in gapSummaryDashboard.weeklyLowest" :key="'wl-'+idx" class="bg-white border border-red-200 p-2 rounded text-[11px] hover:shadow-sm transition-shadow">
                    <div class="font-semibold text-gray-800 flex justify-between">
                      <span class="truncate max-w-[130px]" :title="p.job_number && p.job_number !== '-' ? p.job_number : p.matnr">
                        {{ idx + 1 }}. {{ p.job_number && p.job_number !== '-' ? p.job_number : p.matnr }}
                      </span>
                      <span class="text-red-700 font-bold font-mono">{{ Math.round(p.gapPct || 0) }}% <span class="text-[10px] text-red-600 font-semibold ml-0.5">({{ numberFormat(p.gap) }})</span></span>
                    </div>
                    <div class="text-[10px] text-gray-400 truncate mt-0.5">{{ p.customer }} | {{ p.zmodel }}</div>
                    <div class="text-[10px] text-gray-500 mt-1 flex justify-between bg-gray-50 px-1 py-0.5 rounded border border-gray-100 font-mono">
                      <span>MDFO: {{ numberFormat(p.mdfo) }}</span>
                      <span>SO: {{ numberFormat(p.sales) }}</span>
                    </div>
                  </div>
                  <div v-if="!gapSummaryDashboard.weeklyLowest.length" class="text-center text-gray-400 text-[10px] py-4 bg-white rounded border border-dashed border-gray-200">
                    Tidak ada gap negatif
                  </div>
                </div>
              </div>
            </div>
          </v-card>

          <!-- Akumulasi (s.d. Hari Ini) -->
          <v-card variant="flat" class="pa-4 card-accum-kustom shadow-sm">
            <div class="flex items-center gap-2 mb-3">
              <v-icon color="grey-darken-3" size="20">mdi-trending-up</v-icon>
              <span class="text-[13px] font-bold text-slate-900 uppercase tracking-wide">
                {{ gapSummaryDashboard.formattedAccumTitle }}
              </span>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Terbesar -->
              <div>
                <div class="text-[11px] font-bold text-green-800 uppercase mb-2 flex items-center gap-1">
                  <v-icon size="14" color="green-darken-2">mdi-arrow-up-bold</v-icon> Gap Tertinggi
                </div>
                <div class="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                  <div v-for="(p, idx) in gapSummaryDashboard.accumHighest" :key="'ah-'+idx" class="bg-white border border-green-200 p-2 rounded text-[11px] hover:shadow-sm transition-shadow">
                    <div class="font-semibold text-gray-800 flex justify-between">
                      <span class="truncate max-w-[130px]" :title="p.job_number && p.job_number !== '-' ? p.job_number : p.matnr">
                        {{ idx + 1 }}. {{ p.job_number && p.job_number !== '-' ? p.job_number : p.matnr }}
                      </span>
                      <span class="text-green-700 font-bold font-mono">+{{ Math.round(p.gapPct || 0) }}% <span class="text-[10px] text-green-600 font-semibold ml-0.5">(+{{ numberFormat(p.gap) }})</span></span>
                    </div>
                    <div class="text-[10px] text-gray-400 truncate mt-0.5">{{ p.customer }} | {{ p.zmodel }}</div>
                    <div class="text-[10px] text-gray-500 mt-1 flex justify-between bg-gray-50 px-1 py-0.5 rounded border border-gray-100 font-mono">
                      <span>MDFO: {{ numberFormat(p.mdfo) }}</span>
                      <span>SO: {{ numberFormat(p.sales) }}</span>
                    </div>
                  </div>
                  <div v-if="!gapSummaryDashboard.accumHighest.length" class="text-center text-gray-400 text-[10px] py-4 bg-white rounded border border-dashed border-gray-200">
                    Tidak ada gap positif
                  </div>
                </div>
              </div>

              <!-- Terendah -->
              <div>
                <div class="text-[11px] font-bold text-red-800 uppercase mb-2 flex items-center gap-1">
                  <v-icon size="14" color="red-darken-2">mdi-arrow-down-bold</v-icon> Gap Terendah
                </div>
                <div class="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                  <div v-for="(p, idx) in gapSummaryDashboard.accumLowest" :key="'al-'+idx" class="bg-white border border-red-200 p-2 rounded text-[11px] hover:shadow-sm transition-shadow">
                    <div class="font-semibold text-gray-800 flex justify-between">
                      <span class="truncate max-w-[130px]" :title="p.job_number && p.job_number !== '-' ? p.job_number : p.matnr">
                        {{ idx + 1 }}. {{ p.job_number && p.job_number !== '-' ? p.job_number : p.matnr }}
                      </span>
                      <span class="text-red-700 font-bold font-mono">{{ Math.round(p.gapPct || 0) }}% <span class="text-[10px] text-red-600 font-semibold ml-0.5">({{ numberFormat(p.gap) }})</span></span>
                    </div>
                    <div class="text-[10px] text-gray-400 truncate mt-0.5">{{ p.customer }} | {{ p.zmodel }}</div>
                    <div class="text-[10px] text-gray-500 mt-1 flex justify-between bg-gray-50 px-1 py-0.5 rounded border border-gray-100 font-mono">
                      <span>MDFO: {{ numberFormat(p.mdfo) }}</span>
                      <span>SO: {{ numberFormat(p.sales) }}</span>
                    </div>
                  </div>
                  <div v-if="!gapSummaryDashboard.accumLowest.length" class="text-center text-gray-400 text-[10px] py-4 bg-white rounded border border-dashed border-gray-200">
                    Tidak ada gap negatif
                  </div>
                </div>
              </div>
            </div>
          </v-card>
        </div>

        <div 
          class="cal-table-container" 
          :style="{ 
            overflow: 'auto', 
            maxHeight: calendarMaxHeight 
          }"
        >
          <table class="cal-table">
            <thead>
              <tr>
                <th rowspan="2" class="cal-th cal-th-sticky cal-th-sticky-cust text-center sticky left-0 z-10 bg-[#f5f5f5]">
                  <div class="cal-th-filter-wrap">
                    <span>Customer</span>
                    <v-menu :close-on-content-click="false" location="bottom start" offset="6">
                      <template #activator="{ props }">
                        <v-icon
                          v-bind="props"
                          size="14"
                          class="cal-filter-icon"
                          :color="hasActiveFilter('customer') ? 'primary' : 'grey'"
                          @click.stop
                        >
                          {{ hasActiveFilter('customer') ? 'mdi-filter' : 'mdi-filter-outline' }}
                        </v-icon>
                      </template>
                      <v-card width="230" class="pa-2 cal-filter-menu">
                        <div class="flex flex-col mb-2 gap-[2px]">
                          <v-btn size="x-small" variant="text" class="justify-start text-none"
                                 prepend-icon="mdi-sort-alphabetical-ascending"
                                 @click="sortColumnAsc('customer')">
                            Sort A → Z
                          </v-btn>
                          <v-btn size="x-small" variant="text" class="justify-start text-none"
                                 prepend-icon="mdi-sort-alphabetical-descending"
                                 @click="sortColumnDesc('customer')">
                            Sort Z → A
                          </v-btn>
                        </div>
                        <v-divider class="mb-2" />
                        <v-text-field
                          v-model="columnFilters.customer.search"
                          density="compact"
                          hide-details
                          clearable
                          placeholder="Cari Customer..."
                          prepend-inner-icon="mdi-magnify"
                          variant="outlined"
                          class="mb-2"
                        />
                        <div class="flex justify-between mb-1">
                          <v-btn size="x-small" variant="text" class="text-none" @click="selectAllColumn('customer')">Select All</v-btn>
                          <v-btn size="x-small" variant="text" class="text-none" @click="deselectAllColumn('customer')">Clear All</v-btn>
                          <v-btn size="x-small" variant="text" class="text-none" @click="invertColumnSelection('customer')">Invert</v-btn>
                        </div>
                        <div class="cal-filter-list">
                          <div v-for="val in filteredColumnValues('customer')" :key="val" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                            <v-checkbox
                              :model-value="isColumnValueChecked('customer', val)"
                              @update:model-value="toggleColumnValue('customer', val)"
                              :label="String(val)"
                              density="compact"
                              hide-details
                              class="cal-filter-checkbox grow"
                            />
                            <v-btn
                              size="x-small"
                              variant="text"
                              class="text-[9px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold"
                              @click.stop="selectThisItemOnly('customer', val)"
                            >
                              Only
                            </v-btn>
                          </div>
                          <div v-if="!filteredColumnValues('customer').length" class="text-xs text-gray-500 text-center p-2">
                            Tidak ada data
                          </div>
                        </div>
                      </v-card>
                    </v-menu>
                  </div>
                </th>
                <th rowspan="2" class="cal-th cal-th-sticky cal-th-sticky-model text-center sticky left-[120px] z-10 bg-[#f5f5f5]">
                  <div class="cal-th-filter-wrap">
                    <span>Model</span>
                    <v-menu :close-on-content-click="false" location="bottom start" offset="6">
                      <template #activator="{ props }">
                        <v-icon
                          v-bind="props"
                          size="14"
                          class="cal-filter-icon"
                          :color="hasActiveFilter('zmodel') ? 'primary' : 'grey'"
                          @click.stop
                        >
                          {{ hasActiveFilter('zmodel') ? 'mdi-filter' : 'mdi-filter-outline' }}
                        </v-icon>
                      </template>
                      <v-card width="230" class="pa-2 cal-filter-menu">
                        <div class="flex flex-col mb-2 gap-[2px]">
                          <v-btn size="x-small" variant="text" class="justify-start text-none"
                                 prepend-icon="mdi-sort-alphabetical-ascending"
                                 @click="sortColumnAsc('zmodel')">
                            Sort A → Z
                          </v-btn>
                          <v-btn size="x-small" variant="text" class="justify-start text-none"
                                 prepend-icon="mdi-sort-alphabetical-descending"
                                 @click="sortColumnDesc('zmodel')">
                            Sort Z → A
                          </v-btn>
                        </div>
                        <v-divider class="mb-2" />
                        <v-text-field
                          v-model="columnFilters.zmodel.search"
                          density="compact"
                          hide-details
                          clearable
                          placeholder="Cari Model..."
                          prepend-inner-icon="mdi-magnify"
                          variant="outlined"
                          class="mb-2"
                        />
                        <div class="flex justify-between mb-1">
                          <v-btn size="x-small" variant="text" class="text-none" @click="selectAllColumn('zmodel')">Select All</v-btn>
                          <v-btn size="x-small" variant="text" class="text-none" @click="deselectAllColumn('zmodel')">Clear All</v-btn>
                          <v-btn size="x-small" variant="text" class="text-none" @click="invertColumnSelection('zmodel')">Invert</v-btn>
                        </div>
                        <div class="cal-filter-list">
                          <div v-for="val in filteredColumnValues('zmodel')" :key="val" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                            <v-checkbox
                              :model-value="isColumnValueChecked('zmodel', val)"
                              @update:model-value="toggleColumnValue('zmodel', val)"
                              :label="String(val)"
                              density="compact"
                              hide-details
                              class="cal-filter-checkbox grow"
                            />
                            <v-btn
                              size="x-small"
                              variant="text"
                              class="text-[9px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold"
                              @click.stop="selectThisItemOnly('zmodel', val)"
                            >
                              Only
                            </v-btn>
                          </div>
                          <div v-if="!filteredColumnValues('zmodel').length" class="text-xs text-gray-500 text-center p-2">
                            Tidak ada data
                          </div>
                        </div>
                      </v-card>
                    </v-menu>
                  </div>
                </th>
                <th rowspan="2" class="cal-th cal-th-sticky cal-th-sticky-part text-center sticky left-[195px] z-10 bg-[#f5f5f5]">
                  <div class="cal-th-filter-wrap">
                    <span>Part Number</span>
                    <v-menu :close-on-content-click="false" location="bottom start" offset="6">
                      <template #activator="{ props }">
                        <v-icon
                          v-bind="props"
                          size="14"
                          class="cal-filter-icon"
                          :color="hasActiveFilter('matnr') ? 'primary' : 'grey'"
                          @click.stop
                        >
                          {{ hasActiveFilter('matnr') ? 'mdi-filter' : 'mdi-filter-outline' }}
                        </v-icon>
                      </template>
                      <v-card width="230" class="pa-2 cal-filter-menu">
                        <div class="flex flex-col mb-2 gap-[2px]">
                          <v-btn size="x-small" variant="text" class="justify-start text-none"
                                 prepend-icon="mdi-sort-alphabetical-ascending"
                                 @click="sortColumnAsc('matnr')">
                            Sort A → Z
                          </v-btn>
                          <v-btn size="x-small" variant="text" class="justify-start text-none"
                                 prepend-icon="mdi-sort-alphabetical-descending"
                                 @click="sortColumnDesc('matnr')">
                            Sort Z → A
                          </v-btn>
                        </div>
                        <v-divider class="mb-2" />
                        <v-text-field
                          v-model="columnFilters.matnr.search"
                          density="compact"
                          hide-details
                          clearable
                          placeholder="Cari Part Number..."
                          prepend-inner-icon="mdi-magnify"
                          variant="outlined"
                          class="mb-2"
                        />
                        <div class="flex justify-between mb-1">
                          <v-btn size="x-small" variant="text" class="text-none" @click="selectAllColumn('matnr')">Select All</v-btn>
                          <v-btn size="x-small" variant="text" class="text-none" @click="deselectAllColumn('matnr')">Clear All</v-btn>
                          <v-btn size="x-small" variant="text" class="text-none" @click="invertColumnSelection('matnr')">Invert</v-btn>
                        </div>
                        <div class="cal-filter-list">
                          <div v-for="val in filteredColumnValues('matnr')" :key="val" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                            <v-checkbox
                              :model-value="isColumnValueChecked('matnr', val)"
                              @update:model-value="toggleColumnValue('matnr', val)"
                              :label="String(val)"
                              density="compact"
                              hide-details
                              class="cal-filter-checkbox grow"
                            />
                            <v-btn
                              size="x-small"
                              variant="text"
                              class="text-[9px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold"
                              @click.stop="selectThisItemOnly('matnr', val)"
                            >
                              Only
                            </v-btn>
                          </div>
                          <div v-if="!filteredColumnValues('matnr').length" class="text-xs text-gray-500 text-center p-2">
                            Tidak ada data
                          </div>
                        </div>
                      </v-card>
                    </v-menu>
                  </div>
                </th>
                <th rowspan="2" class="cal-th cal-th-sticky cal-th-sticky-job text-center sticky left-[345px] z-10 bg-[#f5f5f5]">
                  <div class="cal-th-filter-wrap">
                    <span>Job Number</span>
                    <v-menu :close-on-content-click="false" location="bottom start" offset="6">
                      <template #activator="{ props }">
                        <v-icon
                          v-bind="props"
                          size="14"
                          class="cal-filter-icon"
                          :color="hasActiveFilter('job_number') ? 'primary' : 'grey'"
                          @click.stop
                        >
                          {{ hasActiveFilter('job_number') ? 'mdi-filter' : 'mdi-filter-outline' }}
                        </v-icon>
                      </template>
                      <v-card width="230" class="pa-2 cal-filter-menu">
                        <div class="flex flex-col mb-2 gap-[2px]">
                          <v-btn size="x-small" variant="text" class="justify-start text-none"
                                 prepend-icon="mdi-sort-alphabetical-ascending"
                                 @click="sortColumnAsc('job_number')">
                            Sort A → Z
                          </v-btn>
                          <v-btn size="x-small" variant="text" class="justify-start text-none"
                                 prepend-icon="mdi-sort-alphabetical-descending"
                                 @click="sortColumnDesc('job_number')">
                            Sort Z → A
                          </v-btn>
                        </div>
                        <v-divider class="mb-2" />
                        <v-text-field
                          v-model="columnFilters.job_number.search"
                          density="compact"
                          hide-details
                          clearable
                          placeholder="Cari Job Number..."
                          prepend-inner-icon="mdi-magnify"
                          variant="outlined"
                          class="mb-2"
                        />
                        <div class="flex justify-between mb-1">
                          <v-btn size="x-small" variant="text" class="text-none" @click="selectAllColumn('job_number')">Select All</v-btn>
                          <v-btn size="x-small" variant="text" class="text-none" @click="deselectAllColumn('job_number')">Clear All</v-btn>
                          <v-btn size="x-small" variant="text" class="text-none" @click="invertColumnSelection('job_number')">Invert</v-btn>
                        </div>
                        <div class="cal-filter-list">
                          <div v-for="val in filteredColumnValues('job_number')" :key="val" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                            <v-checkbox
                              :model-value="isColumnValueChecked('job_number', val)"
                              @update:model-value="toggleColumnValue('job_number', val)"
                              :label="String(val)"
                              density="compact"
                              hide-details
                              class="cal-filter-checkbox grow"
                            />
                            <v-btn
                              size="x-small"
                              variant="text"
                              class="text-[9px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold"
                              @click.stop="selectThisItemOnly('job_number', val)"
                            >
                              Only
                            </v-btn>
                          </div>
                          <div v-if="!filteredColumnValues('job_number').length" class="text-xs text-gray-500 text-center p-2">
                            Tidak ada data
                          </div>
                        </div>
                      </v-card>
                    </v-menu>
                  </div>
                </th>
                <th rowspan="2" class="cal-th cal-th-sticky cal-th-sticky-type text-center sticky left-[485px] z-10 bg-[#f5f5f5]">
                  <div class="cal-th-filter-wrap">
                    <span>Type</span>
                    <v-menu :close-on-content-click="false" location="bottom start" offset="6">
                      <template #activator="{ props }">
                        <v-icon
                          v-bind="props"
                          size="14"
                          class="cal-filter-icon"
                          :color="hasActiveFilter('row_type') ? 'primary' : 'grey'"
                          @click.stop
                        >
                          {{ hasActiveFilter('row_type') ? 'mdi-filter' : 'mdi-filter-outline' }}
                        </v-icon>
                      </template>
                      <v-card width="230" class="pa-2 cal-filter-menu">
                        <div class="flex justify-between items-center px-2 py-1 mb-1 bg-slate-50 rounded">
                          <v-btn size="x-small" variant="text" class="text-none" @click="selectAllColumn('row_type')">Select All</v-btn>
                          <v-btn size="x-small" variant="text" class="text-none" @click="deselectAllColumn('row_type')">Clear All</v-btn>
                          <v-btn size="x-small" variant="text" class="text-none" @click="invertColumnSelection('row_type')">Invert</v-btn>
                        </div>
                        <v-divider class="mb-2" />
                        <div class="cal-filter-list">
                          <div v-for="val in filteredColumnValues('row_type')" :key="val" class="flex justify-between items-center pr-2 hover:bg-slate-50 rounded">
                            <v-checkbox
                              :model-value="isColumnValueChecked('row_type', val)"
                              @update:model-value="toggleColumnValue('row_type', val)"
                              :label="getRowTypeLabel(val)"
                              density="compact"
                              hide-details
                              class="cal-filter-checkbox grow"
                            />
                            <v-btn
                              size="x-small"
                              variant="text"
                              class="text-[9px] text-blue-600 hover:underline min-w-0 p-0 h-auto font-semibold"
                              @click.stop="selectThisItemOnly('row_type', val)"
                            >
                              Only
                            </v-btn>
                          </div>
                        </div>
                      </v-card>
                    </v-menu>
                  </div>
                </th>

                <th
                  v-for="w in calendarWeekRanges"
                  :key="'wgrp-' + w.id"
                  :colspan="w.end - w.start + 1"
                  class="cal-th cal-th-wgrp z-[9]"
                  :class="{ 'cal-wgrp-active': selectedWeek === w.id }"
                  @click="onWeekHeaderClick(w.id, $event)"
                  title="Klik untuk melihat subtotal & detail gap mingguan (Sales Order - MDFO)"
                >
                  <div class="cal-th-inner flex justify-center gap-[3px]">
                    <v-icon size="12" class="opacity-75">mdi-calendar-week</v-icon>
                    {{ w.label }}
                    <span class="text-[10px] font-normal opacity-80">
                      ({{ w.start }}–{{ w.end }})
                    </span>
                  </div>
                </th>

                <th rowspan="2" class="cal-th cal-th-total cursor-pointer min-w-[90px] z-[9]"
                    @click="calendarToggleSort('total_gap')">
                  <div class="cal-th-inner flex justify-center">
                    Total<br>GAP
                    <v-icon size="13">{{ calendarSortIcon('total_gap') }}</v-icon>
                  </div>
                </th>
              </tr>

              <tr>
                <th
                  v-for="d in daysInSelectedMonth"
                  :key="'dh-' + d"
                  class="cal-th cal-th-day cursor-pointer min-w-[32px] w-[32px] max-w-[32px] py-1 px-0 text-[11px] z-[9]"
                  :class="{
                    'cal-wgrp-active' : isDayInSelectedWeek(d) && !isWeekend(d),
                    'cal-day-we'      : isWeekend(d) && !isDayInSelectedWeek(d),
                    'cal-day-we-hl'   : isWeekend(d) && isDayInSelectedWeek(d),
                  }"
                  @click="onDayHeaderClick(d, $event)"
                  title="Klik untuk melihat detail gap harian (Sales Order - MDFO)"
                >
                  {{ d }}
                </th>
              </tr>
            </thead>

            <tbody>
              <template v-for="item in calendarPaged" :key="item.key">
                <tr v-if="isRowTypeVisible('mdfo')" class="cal-row-mdfo">
                  <td v-if="getFirstVisibleRowType() === 'mdfo'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-cust text-center font-normal sticky left-0 z-[2] bg-white">
                    <div>{{ (item.customer || '').toUpperCase() }}</div>
                  </td>
                  
                  <td v-if="getFirstVisibleRowType() === 'mdfo'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-model text-center font-normal text-xs text-gray-500 sticky left-[120px] z-[2] bg-white">
                    {{ item.zmodel }}
                  </td>

                  <td v-if="getFirstVisibleRowType() === 'mdfo'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-part text-center font-normal sticky left-[195px] z-[2] bg-white text-[12px]">
                    {{ item.matnr }}
                  </td>

                  <td v-if="getFirstVisibleRowType() === 'mdfo'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-job text-center font-normal text-xs font-mono sticky left-[345px] z-[2] bg-white">
                    {{ item.job_number || '-' }}
                  </td>

                  <td class="cal-td cal-sticky cal-td-type cal-type-mdfo text-center font-normal sticky left-[485px] z-[2] bg-white min-w-[90px] w-[90px]">
                    MDFO
                  </td>
                  
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
                  <td class="cal-td cal-td-total text-center font-normal">{{ numberFormat(item.total_mdfo) }}</td>
                </tr>

                <tr v-if="isRowTypeVisible('sales')" class="cal-row-sales">
                  <td v-if="getFirstVisibleRowType() === 'sales'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-cust text-center font-normal sticky left-0 z-[2] bg-white">
                    <div>{{ (item.customer || '').toUpperCase() }}</div>
                  </td>
                  
                  <td v-if="getFirstVisibleRowType() === 'sales'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-model text-center font-normal text-xs text-gray-500 sticky left-[120px] z-[2] bg-white">
                    {{ item.zmodel }}
                  </td>

                  <td v-if="getFirstVisibleRowType() === 'sales'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-part text-center font-normal sticky left-[195px] z-[2] bg-white text-[12px]">
                    {{ item.matnr }}
                  </td>

                  <td v-if="getFirstVisibleRowType() === 'sales'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-job text-center font-normal text-xs font-mono sticky left-[345px] z-[2] bg-white">
                    {{ item.job_number || '-' }}
                  </td>

                  <td class="cal-td cal-sticky cal-td-type cal-type-sales text-center font-normal sticky left-[485px] z-[2] bg-white min-w-[90px] w-[90px]">
                    Sales Order
                  </td>
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
                  <td class="cal-td cal-td-total text-center font-normal">{{ numberFormat(item.total_sales) }}</td>
                </tr>

                <tr v-if="isRowTypeVisible('gap')" class="cal-row-gap">
                  <td v-if="getFirstVisibleRowType() === 'gap'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-cust text-center font-normal sticky left-0 z-[2] bg-white">
                    <div>{{ (item.customer || '').toUpperCase() }}</div>
                  </td>
                  
                  <td v-if="getFirstVisibleRowType() === 'gap'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-model text-center font-normal text-xs text-gray-500 sticky left-[120px] z-[2] bg-white">
                    {{ item.zmodel }}
                  </td>

                  <td v-if="getFirstVisibleRowType() === 'gap'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-part text-center font-normal sticky left-[195px] z-[2] bg-white text-[12px]">
                    {{ item.matnr }}
                  </td>

                  <td v-if="getFirstVisibleRowType() === 'gap'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-job text-center font-normal text-xs font-mono sticky left-[345px] z-[2] bg-white">
                    {{ item.job_number || '-' }}
                  </td>

                  <td class="cal-td cal-sticky cal-td-type cal-type-gap text-center font-normal sticky left-[485px] z-[2] bg-white min-w-[90px] w-[90px]">
                    GAP
                  </td>
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
                    class="cal-td cal-td-total text-center font-normal"
                    :class="{
                      'cal-gap-pos': item.total_gap > 0,
                      'cal-gap-neg': item.total_gap < 0,
                    }"
                  >
                    {{ numberFormat(item.total_gap) }}
                  </td>
                </tr>

                <tr v-if="isRowTypeVisible('accum')" class="cal-row-acc">
                  <td v-if="getFirstVisibleRowType() === 'accum'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-cust text-center font-normal sticky left-0 z-[2] bg-white">
                    <div>{{ (item.customer || '').toUpperCase() }}</div>
                  </td>
                  
                  <td v-if="getFirstVisibleRowType() === 'accum'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-model text-center font-normal text-xs text-gray-500 sticky left-[120px] z-[2] bg-white">
                    {{ item.zmodel }}
                  </td>

                  <td v-if="getFirstVisibleRowType() === 'accum'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-part text-center font-normal sticky left-[195px] z-[2] bg-white text-[12px]">
                    {{ item.matnr }}
                  </td>

                  <td v-if="getFirstVisibleRowType() === 'accum'" :rowspan="visibleTypeCount()" class="cal-td cal-sticky cal-td-job text-center font-normal text-xs font-mono sticky left-[345px] z-[2] bg-white">
                    {{ item.job_number || '-' }}
                  </td>

                  <td class="cal-td cal-sticky cal-td-type cal-type-acc text-center font-normal sticky left-[485px] z-[2] bg-[#fcfcfc]">
                    ACCUM
                  </td>
                  <td
                    v-for="d in daysInSelectedMonth" :key="'acc' + d"
                    class="cal-td cal-td-day text-center bg-[#fcfcfc]"
                    :class="[
                      ...getAccClass(getAccumulatedGap(item, d)), 
                      isDayInSelectedWeek(d) ? 'cal-day-hl' : '',
                      isWeekend(d) && !isDayInSelectedWeek(d) ? 'cal-day-we' : '',
                      isWeekend(d) && isDayInSelectedWeek(d) ? 'cal-day-we-hl' : ''
                    ]"
                  >
                    {{ getAccumulatedGap(item, d) !== 0 ? numberFormat(getAccumulatedGap(item, d)) : '' }}
                  </td>
                  <td class="cal-td cal-td-total text-center font-normal bg-[#fcfcfc]">
                    {{ numberFormat(item.total_gap) }}
                  </td>
                </tr>

                <tr v-if="visibleTypeCount() > 0" class="cal-sep">
                  <td :colspan="6 + daysInSelectedMonth"></td>
                </tr>
              </template>

              <template v-for="type in ['mdfo', 'sales', 'gap', 'accum']" :key="'gt' + type">
                <tr v-if="isRowTypeVisible(type)" :class="['cal-row-gt', type === 'gap' ? 'cal-row-gt-gap' : '', type === 'accum' ? 'cal-row-gt-acc' : '']">
                  <td v-if="type === getFirstVisibleRowType()" :rowspan="visibleTypeCount()"
                      class="cal-sticky cal-td-cust text-center font-medium text-[12px] sticky left-0 z-[4] bg-[#eee]">
                    GRAND TOTAL
                  </td>
                  <td v-if="type === getFirstVisibleRowType()" :rowspan="visibleTypeCount()" class="cal-sticky cal-td-model sticky left-[120px] z-[4] bg-[#eee]"></td>
                  <td v-if="type === getFirstVisibleRowType()" :rowspan="visibleTypeCount()" class="cal-sticky cal-td-part sticky left-[195px] z-[4] bg-[#eee]"></td>
                  <td v-if="type === getFirstVisibleRowType()" :rowspan="visibleTypeCount()" class="cal-sticky cal-td-job sticky left-[345px] z-[4] bg-[#eee]"></td>
                  
                  <td
                      class="cal-td cal-sticky cal-td-type text-center font-medium sticky left-[485px] z-[4] bg-[#eee] min-w-[90px] w-[90px]"
                      :class="{
                        'cal-type-mdfo'  : type === 'mdfo',
                        'cal-type-sales' : type === 'sales',
                        'cal-type-gap'   : type === 'gap',
                        'cal-type-acc'   : type === 'accum',
                      }"
                    >
                    {{ type === 'mdfo' ? 'MDFO' : type === 'sales' ? 'Sales Order' : type === 'gap' ? 'GAP' : 'ACCUM' }}
                  </td>
                  <td
                    v-for="d in daysInSelectedMonth" :key="'gt' + type + d"
                    class="cal-td cal-td-day text-center font-medium bg-[#eee]"
                    :class="{
                      'cal-day-hl'    : isDayInSelectedWeek(d) && !isWeekend(d),
                      'cal-day-we'    : isWeekend(d) && !isDayInSelectedWeek(d),
                      'cal-day-we-hl' : isWeekend(d) && isDayInSelectedWeek(d),
                      'cal-gap-pos'   : (type === 'gap' || type === 'accum') && (calendarDailyGrandTotal[type][d] || 0) > 0,
                      'cal-gap-neg'   : (type === 'gap' || type === 'accum') && (calendarDailyGrandTotal[type][d] || 0) < 0,
                    }"
                  >
                    {{ calendarDailyGrandTotal[type] && calendarDailyGrandTotal[type][d] ? numberFormat(calendarDailyGrandTotal[type][d]) : '' }}
                  </td>
                  <td
                    class="cal-td cal-td-total text-center font-medium bg-[#eee]"
                    :class="{
                      'cal-gap-pos': (type === 'gap' || type === 'accum') && calendarFiltered.reduce((s,i) => s + i.total_gap,   0) > 0,
                      'cal-gap-neg': (type === 'gap' || type === 'accum') && calendarFiltered.reduce((s,i) => s + i.total_gap,   0) < 0,
                    }"
                  >
                    {{
                      type === 'mdfo'  ? numberFormat(calendarFiltered.reduce((s,i) => s + (i.total_mdfo  || 0), 0)) :
                      type === 'sales' ? numberFormat(calendarFiltered.reduce((s,i) => s + (i.total_sales || 0), 0)) :
                                         numberFormat(calendarFiltered.reduce((s,i) => s + (i.total_gap   || 0), 0))
                    }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="flex justify-between items-center mt-4 pt-2 border-t border-[#eee]">
          <div class="text-xs text-gray-500">
            {{ calendarPaged.length }} / {{ calendarFiltered.length }} part ditampilkan
            <span v-if="calendarPageSize !== -1 && calendarFiltered.length > calendarPageSize">
              · pilih <strong>All</strong> untuk lihat semua
            </span>
          </div>

          <div class="flex items-center gap-[10px]">
            <span class="text-sm text-gray-600">Rows per page:</span>
            <v-select
              v-model="calendarPageSize"
              :items="calendarPageOptions"
              item-title="title" 
              item-value="value"
              density="compact"
              hide-details 
              variant="outlined"
              class="max-w-[100px]"
            />
          </div>
        </div>

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
                <span>Total Sales Order</span>
                <span>{{ numberFormat(weekTooltip.totalSales) }}</span>
              </div>
              <div class="cal-tt-row cal-tt-row-gap">
                <span class="font-bold">Total GAP</span>
                <span
                  class="font-bold"
                  :class="{
                    'cal-gap-pos': weekTooltip.totalGap > 0,
                    'cal-gap-neg': weekTooltip.totalGap < 0,
                  }"
                >
                  {{ (weekTooltip.totalGap > 0 ? '+' : '') + numberFormat(weekTooltip.totalGap) }}
                  <span class="text-[11px] font-semibold ml-1">
                    ({{ (weekTooltip.totalMdfo > 0 ? (weekTooltip.totalGap > 0 ? '+' : '') + Math.round((weekTooltip.totalGap / weekTooltip.totalMdfo) * 100) : (weekTooltip.totalSales > 0 ? '+100' : '0')) }}%)
                  </span>
                </span>
              </div>
            </div>

            <div class="cal-tt-sub-title font-bold text-green-400">TOP 15 GAP Terbesar (Sales Order > MDFO)</div>

            <div class="cal-tt-list" style="max-height: 180px;">
              <div
                v-for="(r, i) in weekTooltip.data" :key="'wt-l-' + i"
                class="cal-tt-part"
              >
                <div class="text-[11px] flex flex-col gap-[2px]">
                  <span class="font-bold text-[#e0e0e0]">{{ i + 1 }}. {{ (r.job_number && r.job_number !== '-') ? r.job_number : r.matnr }}</span>
                  <span class="text-[10px] text-gray-400">{{ r.customer }} |  {{ r.zmodel }}</span>
                </div>
                <div class="flex flex-wrap gap-1 mt-[4px]">
                  <span class="cal-tt-chip cal-tt-m">MDFO: {{ numberFormat(r.mdfo) }}</span>
                  <span class="cal-tt-chip cal-tt-s">Sales Order: {{ numberFormat(r.sales) }}</span>
                  <span
                    class="cal-tt-chip font-bold cal-tt-gp"
                  >
                    GAP: +{{ Math.round(r.gapPct || 0) }}% <span class="font-normal opacity-80">(+{{ numberFormat(r.gap) }})</span>
                  </span>
                </div>
              </div>

              <div v-if="!weekTooltip.data.length"
                  class="p-[10px] text-center text-[#888] text-[11px]">
                Tidak ada data gap terbesar
              </div>
            </div>

            <div class="cal-tt-sub-title font-bold text-red-400 border-t border-gray-700 pt-2 mt-1">TOP 15 GAP Terendah (Sales Order < MDFO)</div>

            <div class="cal-tt-list" style="max-height: 180px;">
              <div
                v-for="(r, i) in weekTooltip.dataLowest" :key="'wt-s-' + i"
                class="cal-tt-part"
              >
                <div class="text-[11px] flex flex-col gap-[2px]">
                  <span class="font-bold text-[#e0e0e0]">{{ i + 1 }}. {{ (r.job_number && r.job_number !== '-') ? r.job_number : r.matnr }}</span>
                  <span class="text-[10px] text-gray-400">{{ r.customer }} |  {{ r.zmodel }}</span>
                </div>
                <div class="flex flex-wrap gap-1 mt-[4px]">
                  <span class="cal-tt-chip cal-tt-m">MDFO: {{ numberFormat(r.mdfo) }}</span>
                  <span class="cal-tt-chip cal-tt-s">Sales Order: {{ numberFormat(r.sales) }}</span>
                  <span
                    class="cal-tt-chip font-bold cal-tt-gn"
                  >
                    GAP: {{ Math.round(r.gapPct || 0) }}% <span class="font-normal opacity-80">({{ numberFormat(r.gap) }})</span>
                  </span>
                </div>
              </div>

              <div v-if="!weekTooltip.dataLowest || !weekTooltip.dataLowest.length"
                  class="p-[10px] text-center text-[#888] text-[11px]">
                Tidak ada data gap terendah
              </div>
            </div>
          </div>
        </transition>

        <transition name="tt-fade">
          <div
            v-if="dayTooltip.show"
            class="cal-tt"
            :style="{ left: dayTooltip.x + 'px', top: dayTooltip.y + 'px' }"
            @click.stop
          >
            <div class="cal-tt-head">
              <span>
                {{ dayTooltip.dayLabel }}
                <v-chip v-if="calendarSearch || filterZmodel" size="x-small" color="yellow" class="ml-2">
                  Filtered
                </v-chip>
              </span>
              <v-icon size="15" @click="closeDayTooltip">mdi-close</v-icon>
            </div>

            <div class="cal-tt-summary">
              <div class="text-[10px] text-gray-400 font-bold uppercase mb-1">Harian</div>
              <div class="cal-tt-row">
                <span>Total MDFO</span>
                <span>{{ numberFormat(dayTooltip.totalMdfo) }}</span>
              </div>
              <div class="cal-tt-row">
                <span>Total Sales Order</span>
                <span>{{ numberFormat(dayTooltip.totalSales) }}</span>
              </div>
              <div class="cal-tt-row cal-tt-row-gap">
                <span class="font-bold">Total GAP</span>
                <span
                  class="font-bold"
                  :class="{
                    'cal-gap-pos': dayTooltip.totalGap > 0,
                    'cal-gap-neg': dayTooltip.totalGap < 0,
                  }"
                >
                  {{ (dayTooltip.totalGap > 0 ? '+' : '') + numberFormat(dayTooltip.totalGap) }}
                  <span class="text-[11px] font-semibold ml-1">
                    ({{ (dayTooltip.totalMdfo > 0 ? (dayTooltip.totalGap > 0 ? '+' : '') + Math.round((dayTooltip.totalGap / dayTooltip.totalMdfo) * 100) : (dayTooltip.totalSales > 0 ? '+100' : '0')) }}%)
                  </span>
                </span>
              </div>

              <div class="text-[10px] text-gray-400 font-bold uppercase mt-3 mb-1 pt-2 border-t border-dashed border-gray-700">
                Akumulasi s.d. Tanggal {{ dayTooltip.day }}
              </div>
              <div class="cal-tt-row">
                <span>Total MDFO s.d.</span>
                <span>{{ numberFormat(dayTooltip.accumMdfo) }}</span>
              </div>
              <div class="cal-tt-row">
                <span>Total SO s.d.</span>
                <span>{{ numberFormat(dayTooltip.accumSales) }}</span>
              </div>
              <div class="cal-tt-row cal-tt-row-gap">
                <span class="font-bold">Accumulation (GAP s.d.)</span>
                <span
                  class="font-bold"
                  :class="{
                    'cal-gap-pos': dayTooltip.accumGap > 0,
                    'cal-gap-neg': dayTooltip.accumGap < 0,
                  }"
                >
                  {{ (dayTooltip.accumGap > 0 ? '+' : '') + numberFormat(dayTooltip.accumGap) }}
                  <span class="text-[11px] font-semibold ml-1">
                    ({{ (dayTooltip.accumMdfo > 0 ? (dayTooltip.accumGap > 0 ? '+' : '') + Math.round((dayTooltip.accumGap / dayTooltip.accumMdfo) * 100) : (dayTooltip.accumSales > 0 ? '+100' : '0')) }}%)
                  </span>
                </span>
              </div>
            </div>

            <div class="cal-tt-sub-title font-bold text-green-400">TOP 15 GAP Terbesar (Sales Order > MDFO)</div>

            <div class="cal-tt-list" style="max-height: 180px;">
              <div
                v-for="(r, i) in dayTooltip.data" :key="'dt-l-' + i"
                class="cal-tt-part"
              >
                <div class="text-[11px] flex flex-col gap-[2px]">
                  <span class="font-bold text-[#e0e0e0]">{{ (r.job_number && r.job_number !== '-') ? '' + r.job_number : '' + r.matnr }}</span>
                  <span class="text-[10px] text-gray-400">{{ r.customer }} | {{ r.zmodel }}</span>
                </div>
                <div class="flex flex-wrap gap-1 mt-[4px]">
                  <span class="cal-tt-chip cal-tt-m">MDFO: {{ numberFormat(r.mdfo) }}</span>
                  <span class="cal-tt-chip cal-tt-s">Sales Order: {{ numberFormat(r.sales) }}</span>
                  <span
                    class="cal-tt-chip font-bold cal-tt-gp"
                  >
                    GAP: +{{ Math.round(r.gapPct || 0) }}% <span class="font-normal opacity-80">(+{{ numberFormat(r.gap) }})</span>
                  </span>
                </div>
              </div>

              <div v-if="!dayTooltip.data.length"
                  class="p-[10px] text-center text-[#888] text-[11px]">
                Tidak ada data gap terbesar
              </div>
            </div>

            <div class="cal-tt-sub-title font-bold text-red-400 border-t border-gray-700 pt-2 mt-1">TOP 15 GAP Terendah (Sales Order < MDFO)</div>

            <div class="cal-tt-list" style="max-height: 180px;">
              <div
                v-for="(r, i) in dayTooltip.dataLowest" :key="'dt-s-' + i"
                class="cal-tt-part"
              >
                <div class="text-[11px] flex flex-col gap-[2px]">
                  <span class="font-bold text-[#e0e0e0]">{{ (r.job_number && r.job_number !== '-') ? '' + r.job_number : '' + r.matnr }}</span>
                  <span class="text-[10px] text-gray-400">{{ r.customer }} | {{ r.zmodel }}</span>
                </div>
                <div class="flex flex-wrap gap-1 mt-[4px]">
                  <span class="cal-tt-chip cal-tt-m">MDFO: {{ numberFormat(r.mdfo) }}</span>
                  <span class="cal-tt-chip cal-tt-s">Sales Order: {{ numberFormat(r.sales) }}</span>
                  <span
                    class="cal-tt-chip font-bold cal-tt-gn"
                  >
                    GAP: {{ Math.round(r.gapPct || 0) }}% <span class="font-normal opacity-80">({{ numberFormat(r.gap) }})</span>
                  </span>
                </div>
              </div>

              <div v-if="!dayTooltip.dataLowest || !dayTooltip.dataLowest.length"
                  class="p-[10px] text-center text-[#888] text-[11px]">
                Tidak ada data gap terendah
              </div>
            </div>
          </div>
        </transition>
      </v-card>

      <v-dialog v-model="dialogZmodelMatnr" max-width="900" persistent scrollable>
        <v-card>
          <v-card-title class="flex justify-between items-center">
            <div>
              <div class="text-xl font-bold">
                Detail Part - Model {{ popupZmodel.zmodel || "-" }}
              </div>
              <div class="text-xs text-gray-500">
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
              class="shadow-sm"
            >
              <template #item.matnr="{ item }">
                <span class="font-bold">{{ item.matnr }}</span>
              </template>

              <template #item.mdfo="{ item }">
                {{ formatNumber(item.mdfo) }}
              </template>

              <template #item.sales="{ item }">
                {{ formatNumber(item.sales) }}
              </template>

              <template #item.gap="{ item }">
                <span :class="item.gap > 0 ? 'text-red-500' : item.gap < 0 ? 'text-blue-500' : 'text-gray-500'">
                  {{ formatNumber(item.gap) }}
                </span>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-dialog>
    </div>

    <v-dialog v-model="loadingGenerate" persistent width="300">
      <v-card class="pa-6 flex flex-col items-center">
        <v-progress-circular indeterminate size="50" class="mb-4" color="primary" />
        <div class="text-lg font-medium">Generating SAP Data...</div>
        <div class="text-sm text-gray-600">Mohon tunggu sebentar</div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogNoData" width="400">
      <v-card class="pa-4">
        <div class="text-xl mb-3">Data belum tersedia</div>
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
        <v-card-title class="text-xl bg-blue-600 text-white pa-4">
          Input Workdays per Customer
        </v-card-title>

        <v-card-text class="pa-4 max-h-[500px] overflow-y-auto">
          <div class="mb-4 text-sm">
            Generate berhasil. Berikut adalah data hari kerja yang ditemukan di sistem untuk periode
            <b>{{ formatBulanTahun(month) }}</b>.
          </div>

          <v-table density="comfortable" class="border rounded">
            <thead>
              <tr>
                <th class="text-left bg-gray-100">Customer Name / Code</th>
                <th class="text-left bg-gray-100">Informasi Jadwal</th>
                <th class="text-center bg-gray-100" width="100">Workdays</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in customerWorkdaysList" :key="'cw-' + index">
                <td class="py-2">
                  <div class="font-bold">{{ (item.nama_customer || item.zcust || '').toUpperCase() }}</div>
                  <div v-if="item.nama_customer" class="text-xs text-gray-500">{{ (item.zcust || '').toUpperCase() }}</div>
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
                <td colspan="3" class="text-center text-gray-500 p-4">
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

    <!-- Dialog Export PPTX Analisis -->
    <v-dialog v-model="dialogPpt" max-width="520">
      <v-card class="rounded-xl p-4">
        <v-card-title class="flex items-center gap-2 text-lg font-bold text-gray-800 pb-2">
          <v-icon color="#D24726">mdi-file-powerpoint</v-icon>
          Export PowerPoint (MDFO Analysis)
        </v-card-title>
        <v-card-text class="py-2">
          <p class="text-sm text-gray-600 mb-4">
            Pilih rentang tanggal untuk mengisi data <strong>Top 10 Accumulation</strong> dan <strong>Accumulation by Customer & Model</strong> ke dalam template PowerPoint (<code>file.pptx</code>).
          </p>
          <v-row dense class="mt-1">
            <v-col cols="6">
              <v-text-field
                v-model="pptStartDate"
                type="date"
                label="Tanggal Mulai"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-calendar-start"
                hint="Pilih tanggal mulai"
                persistent-hint
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="pptEndDate"
                type="date"
                label="Tanggal Selesai"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-calendar-end"
                hint="Pilih tanggal selesai"
                persistent-hint
              />
            </v-col>
          </v-row>
          <div class="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 flex flex-col gap-1 border">
            <div class="font-bold text-gray-800">📌 Struktur Slide yang Digenerate:</div>
            <div>• <strong>Slide 2</strong>: Top 10 Accumulation Tertinggi &amp; Terendah Berdasarkan % (ACCUM / MDFO)</div>
            <div>• <strong>Slide 3</strong>: Accumulation by Customer &amp; Model + Achievement (%)</div>
          </div>
        </v-card-text>
        <v-card-actions class="pt-3 justify-end gap-2">
          <v-btn variant="tonal" color="grey" @click="dialogPpt = false" :disabled="loadingPpt">
            Batal
          </v-btn>
          <v-btn
            color="#D24726"
            variant="flat"
            class="text-white px-5 font-weight-bold"
            prepend-icon="mdi-download"
            :loading="loadingPpt"
            @click="doExportPpt"
          >
            Download PPTX
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
import { generatePptxFromTemplate } from "@/utils/pptxExport";

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
    activeType: "compare",
    typeOptions: [
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

    dialogPpt:       false,
    pptStartDate:    "",
    pptEndDate:      "",
    loadingPpt:      false,
    loadingExport:   false,

    do_date_start:     "",
    do_date_end:       "",
    doCustomer:        null,
    doCustomerOptions: ["MKM", "TMMIN"],
    loadingDo:         false,
    generateResult:    null,

    dialogWorkdays:       false,
    customerWorkdaysList: [],

    // ─── Kalender MDFO vs Sales Order ─────────────────────────────
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

    // ─── Filter Excel-style per kolom (Customer, Model, Part Number, Job Number) ──
    columnFilters: {
      customer:   { search: "", selected: null }, // selected === null artinya "semua dipilih"
      zmodel:     { search: "", selected: null },
      matnr:      { search: "", selected: null },
      job_number: { search: "", selected: null },
      row_type:   { search: "", selected: null },
    },

    weekTooltip: {
      show:       false,
      weekId:     null,
      weekLabel:  "",
      weekStart:  0,
      weekEnd:    0,
      x:          0,
      y:          0,
      data:       [],
      dataLowest: [],
      totalMdfo:  0,
      totalSales: 0,
      totalGap:   0,
    },

    dayTooltip: {
      show:       false,
      day:        null,
      dayLabel:   "",
      x:          0,
      y:          0,
      data:       [],
      dataLowest: [],
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
    filterZmodel: "",

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
    ...mapWritableState(useMaterialStore, ["parts", "partsMatnr", "loading",  'permissions']),

    summaryTomorrowDay() {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const cleanPeriod = String(this.month || "").replace(/\D/g, "").substring(0, 6);
      const tomYear = tomorrow.getFullYear();
      const tomMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const tomPeriod = `${tomYear}${tomMonth}`;
      if (cleanPeriod === tomPeriod) {
        return tomorrow.getDate();
      }
      const maxDays = this.daysInSelectedMonth;
      const day = tomorrow.getDate();
      return day <= maxDays ? day : 1;
    },

    summaryCurrentWeek() {
      const today = new Date();
      const todayDay = today.getDate();
      const week = this.calendarWeekRanges.find(w => todayDay >= w.start && todayDay <= w.end);
      return week || this.calendarWeekRanges[0] || null;
    },

    gapSummaryDashboard() {
      const tomorrowDay = this.summaryTomorrowDay;
      const currentWeek = this.summaryCurrentWeek;
      
      const allowedCustomers = [
        'ADM PLANT 1',
        'ADM PLANT 4',
        'ADM PLANT 5',
        'ADM KAP',
        'ADM SAP',
        'DN1',
        'DN4',
        'DN5',
        'TMMIN',
        'MKM',
        'MMKI',
        'HMMI'
      ];
      const isAllowedCustomer = (customerName) => {
        if (!customerName) return false;
        const custUpper = String(customerName).toUpperCase().trim();
        return allowedCustomers.some(c => custUpper === c || custUpper.includes(c));
      };

      const dailyParts = [];
      if (tomorrowDay) {
        this.calendarFiltered.forEach(item => {
          if (!isAllowedCustomer(item.customer)) return;
          const mdfo = item.mdfo[tomorrowDay] || 0;
          const sales = item.sales[tomorrowDay] || 0;
          const gap = sales - mdfo;
          const gapPct = mdfo > 0 ? (gap / mdfo) * 100 : 0;
          if (gap !== 0) {
            dailyParts.push({
              matnr: item.matnr,
              job_number: item.job_number,
              customer: item.customer,
              zmodel: item.zmodel,
              mdfo,
              sales,
              gap,
              gapPct
            });
          }
        });
      }
      const dailyHighest = dailyParts.filter(p => p.gap > 0).sort((a, b) => b.gapPct - a.gapPct).slice(0, 10);
      const dailyLowest = dailyParts.filter(p => p.gap < 0).sort((a, b) => a.gapPct - b.gapPct).slice(0, 10);

      const weeklyParts = [];
      if (currentWeek) {
        this.calendarFiltered.forEach(item => {
          if (!isAllowedCustomer(item.customer)) return;
          let mdfo = 0, sales = 0;
          for (let d = currentWeek.start; d <= currentWeek.end; d++) {
            mdfo += (item.mdfo[d] || 0);
            sales += (item.sales[d] || 0);
          }
          const gap = sales - mdfo;
          const gapPct = mdfo > 0 ? (gap / mdfo) * 100 : 0;
          if (gap !== 0) {
            weeklyParts.push({
              matnr: item.matnr,
              job_number: item.job_number,
              customer: item.customer,
              zmodel: item.zmodel,
              mdfo,
              sales,
              gap,
              gapPct
            });
          }
        });
      }
      const weeklyHighest = weeklyParts.filter(p => p.gap > 0).sort((a, b) => b.gapPct - a.gapPct).slice(0, 10);
      const weeklyLowest = weeklyParts.filter(p => p.gap < 0).sort((a, b) => a.gapPct - b.gapPct).slice(0, 10);

      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tomDay = tomorrow.getDate();
      const tomMonthName = monthNames[tomorrow.getMonth()];
      const tomYear = tomorrow.getFullYear();
      const formattedDailyTitle = `Harian (${tomDay} ${tomMonthName} ${tomYear})`;

      let formattedWeeklyTitle = 'Mingguan';
      if (currentWeek) {
        const m = String(this.month || "").replace(/\D/g, "").substring(0, 6);
        let wMonthName = '';
        let wYear = '';
        if (m.length === 6) {
          wMonthName = monthNames[Number(m.substring(4, 6)) - 1] || '';
          wYear = m.substring(0, 4);
        } else {
          wMonthName = monthNames[tomorrow.getMonth()];
          wYear = tomorrow.getFullYear();
        }
        formattedWeeklyTitle = `Mingguan (${currentWeek.label} ${currentWeek.start}-${currentWeek.end} ${wMonthName} ${wYear})`;
      }

      // 3. Akumulasi s.d. Hari Ini
      const accumParts = [];
      const todayObj = new Date();
      const maxDays = this.daysInSelectedMonth;
      const cleanPeriod = String(this.month || "").replace(/\D/g, "").substring(0, 6);
      const todayPeriod = `${todayObj.getFullYear()}${String(todayObj.getMonth() + 1).padStart(2, '0')}`;
      
      let accumTargetDay = todayObj.getDate();
      if (cleanPeriod < todayPeriod) {
        accumTargetDay = maxDays;
      } else if (cleanPeriod > todayPeriod) {
        accumTargetDay = 1;
      } else {
        accumTargetDay = Math.min(accumTargetDay, maxDays);
      }

      this.calendarFiltered.forEach(item => {
        if (!isAllowedCustomer(item.customer)) return;
        let mdfo = 0, sales = 0;
        for (let d = 1; d <= accumTargetDay; d++) {
          mdfo += (item.mdfo[d] || 0);
          sales += (item.sales[d] || 0);
        }
        const gap = sales - mdfo;
        const gapPct = mdfo > 0 ? (gap / mdfo) * 100 : 0;
        if (gap !== 0) {
          accumParts.push({
            matnr: item.matnr,
            job_number: item.job_number,
            customer: item.customer,
            zmodel: item.zmodel,
            mdfo,
            sales,
            gap,
            gapPct
          });
        }
      });

      const isExcludedItem = (p) => {
        const model = String(p.model || p.zmodel || '').toUpperCase().trim();
        const jobNo = String(p.job_number || '').toUpperCase().trim();
        if (model === 'SP') return true;
        if (jobNo === 'ATDJ3' || jobNo.includes('ATDJ3')) return true;
        return false;
      };

      const accumHighest = accumParts.filter(p => p.gap > 0 && !isExcludedItem(p)).sort((a, b) => b.gapPct - a.gapPct).slice(0, 15);
      const accumLowest = accumParts.filter(p => p.gap < 0 && !(p.mdfo < 10 && p.sales === 0) && !(p.mdfo === 1 && p.sales === 1) && !isExcludedItem(p)).sort((a, b) => a.gapPct - b.gapPct).slice(0, 15);

      let formattedAccumTitle = 'Akumulasi';
      if (cleanPeriod < todayPeriod) {
        let pastMonthName = '';
        let pastYear = '';
        if (cleanPeriod.length === 6) {
          pastMonthName = monthNames[Number(cleanPeriod.substring(4, 6)) - 1] || '';
          pastYear = cleanPeriod.substring(0, 4);
        }
        formattedAccumTitle = `Akumulasi (Full ${pastMonthName} ${pastYear})`;
      } else if (cleanPeriod > todayPeriod) {
        let futMonthName = '';
        let futYear = '';
        if (cleanPeriod.length === 6) {
          futMonthName = monthNames[Number(cleanPeriod.substring(4, 6)) - 1] || '';
          futYear = cleanPeriod.substring(0, 4);
        }
        formattedAccumTitle = `Akumulasi (1 ${futMonthName} ${futYear})`;
      } else {
        const curMonthName = monthNames[todayObj.getMonth()];
        const curYear = todayObj.getFullYear();
        formattedAccumTitle = `Akumulasi (s.d. Tgl ${accumTargetDay} ${curMonthName} ${curYear})`;
      }

      return {
        tomorrowDay,
        currentWeekLabel: currentWeek ? currentWeek.label : '',
        currentWeekRange: currentWeek ? `${currentWeek.start}–${currentWeek.end}` : '',
        formattedDailyTitle,
        formattedWeeklyTitle,
        formattedAccumTitle,
        dailyHighest,
        dailyLowest,
        weeklyHighest,
        weeklyLowest,
        accumHighest,
        accumLowest
      };
    },

    filteredData() {
      let data = this.mergedData;
      const searchPart = (this.searchPart || '').toLowerCase();
      const searchZmodel = (this.searchZmodel || '').toLowerCase();

      if (searchPart) {
        data = data.filter(item => item.matnr?.toLowerCase().includes(searchPart));
      }
      if (searchZmodel) {
        data = data.filter(item => item.zmodel?.toLowerCase().includes(searchZmodel));
      }
      if (this.filterCustomer) {
        data = data.filter(item => (item.nama_customer || '').toUpperCase().trim() === String(this.filterCustomer).toUpperCase().trim());
      }
      return data;
    },

    series() {
      return [{
        name: 'Total Qty',
        data: this.filteredData.map(item => item.tot)
      }];
    },

    calendarWeekRanges() {
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
        const matnr = String(r.matnr || "").trim() || "-";
        const zmodel = String(r.zmodel || "").trim() || "-";
        const custName = String(r.nama_customer || r.customer || r.zcust || "").trim().toUpperCase() || "-";
        const jobNum = String(r.job_number || "").trim() || "-";
        const key = `${matnr}_${zmodel}_${custName}_${jobNum}`;

        if (!grouped[key]) {
          grouped[key] = {
            key,
            matnr,
            zmodel,
            customer: custName,
            job_number: jobNum,
            route: String(r.route || r.zrouting || "-").trim() || "-",
            mdfo: {}, sales: {}, actual: {}, gap: {},
            total_mdfo: 0, total_sales: 0, total_actual: 0, total_gap: 0,
          };
        }
        const d = Number(r.day);
        if (!d || isNaN(d)) return;

        const mdfoVal = Number(r.mdfo) || 0;
        const salesVal = Number(r.sales) || 0;
        const actualVal = Number(r.actual || r.qty_out) || 0;

        if (mdfoVal) grouped[key].mdfo[d] = (grouped[key].mdfo[d] || 0) + mdfoVal;
        if (salesVal) grouped[key].sales[d] = (grouped[key].sales[d] || 0) + salesVal;
        if (actualVal) grouped[key].actual[d] = (grouped[key].actual[d] || 0) + actualVal;
        grouped[key].gap[d] = (grouped[key].sales[d] || 0) - (grouped[key].mdfo[d] || 0);

        grouped[key].total_mdfo   += mdfoVal;
        grouped[key].total_sales  += salesVal;
        grouped[key].total_actual += actualVal;
      });

      Object.values(grouped).forEach(item => {
        item.total_gap = (item.total_sales || 0) - (item.total_mdfo || 0);
      });

      // Filter out rows that have NO non-zero daily data for MDFO or Sales Order
      return Object.values(grouped).filter(item => {
        const hasMdfo = Object.values(item.mdfo || {}).some(v => Number(v) !== 0);
        const hasSales = Object.values(item.sales || {}).some(v => Number(v) !== 0);
        return hasMdfo || hasSales;
      });
    },

    calendarWeeklyByPart() {
      const result = {};
      this.calendarMdfoSoPivot.forEach((item) => {
        result[item.key] = {};
        this.calendarWeekRanges.forEach((w) => {
          let mdfo = 0, sales = 0, actual = 0, gap = 0;
          for (let d = w.start; d <= w.end; d++) {
            mdfo   += item.mdfo[d]   || 0;
            sales  += item.sales[d]  || 0;
            actual += item.actual[d] || 0;
            gap    += item.gap[d]    || 0;
          }
          result[item.key][w.id] = { mdfo, sales, actual, gap };
        });
      });
      return result;
    },

    calendarDailyGrandTotal() {
      const total = { mdfo: {}, sales: {}, actual: {}, gap: {}, accum: {} };
      for (let d = 1; d <= 31; d++) {
        total.mdfo[d]   = 0;
        total.sales[d]  = 0;
        total.actual[d] = 0;
      }

      this.calendarFiltered.forEach(item => {
        for (let d = 1; d <= 31; d++) {
          total.mdfo[d]   += (item.mdfo[d]   || 0);
          total.sales[d]  += (item.sales[d]  || 0);
          total.actual[d] += (item.actual[d] || 0);
        }
      });

      let acc = 0;
      for (let d = 1; d <= 31; d++) {
        total.gap[d] = total.sales[d] - total.mdfo[d];
        acc += total.gap[d];
        total.accum[d] = acc;
      }
      return total;
    },

    calendarWeeklyGrandTotal() {
      const result = {};
      this.calendarWeekRanges.forEach((w) => {
        let mdfo = 0, sales = 0, actual = 0, gap = 0;
        this.calendarFiltered.forEach((item) => {
          mdfo   += this.calendarWeeklyByPart[item.key]?.[w.id]?.mdfo   || 0;
          sales  += this.calendarWeeklyByPart[item.key]?.[w.id]?.sales  || 0;
          actual += this.calendarWeeklyByPart[item.key]?.[w.id]?.actual || 0;
          gap    += this.calendarWeeklyByPart[item.key]?.[w.id]?.gap    || 0;
        });
        result[w.id] = { mdfo, sales, actual, gap };
      });
      return result;
    },

    calendarFiltered() {
      const q = (this.calendarSearch || "").toLowerCase().trim();
      const modelFilter = (this.filterZmodel || "").toLowerCase().trim(); 

      let rows = this.calendarMdfoSoPivot.filter((r) => {
        const matchSearch = !q || 
          (r.matnr || "").toLowerCase().includes(q) || 
          (r.zmodel || "").toLowerCase().includes(q) ||
          (r.job_number || "").toLowerCase().includes(q) ||
          (r.customer || "").toLowerCase().includes(q);

        const matchModel = !modelFilter || (r.zmodel || "").toLowerCase().includes(modelFilter);

        const matchColumnFilters = ["customer", "zmodel", "matnr", "job_number"].every((col) => {
          const filter = this.columnFilters[col];
          if (!filter || filter.selected === null) return true;
          let val = r[col] || "-";
          if (col === "customer") {
            val = String(val).toUpperCase().trim();
          }
          return filter.selected.includes(val);
        });

        return matchSearch && matchModel && matchColumnFilters;
      });

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

    calendarMaxHeight() {
      // Tinggi disesuaikan agar opsi 10 memiliki tinggi yang sama dengan opsi 30 (600px)
      if (this.calendarPageSize === 10 || this.calendarPageSize === 30) return "600px";
      if (this.calendarPageSize === 50) return "700px";
      // Untuk All (-1), maksimalkan tinggi container dengan batas bawah proporsional
      return "calc(100vh - 270px)";
    },

    daysInSelectedMonth() {
      const m = String(this.month || "").replace(/\D/g, "").substring(0, 6);
      if (m.length !== 6) return 31;
      return new Date(Number(m.slice(0, 4)), Number(m.slice(4, 6)), 0).getDate();
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
        for (let d = w.start; d <= w.end; d++) map[d] = w.id;
      });
      return map;
    },

    gapToDateByCust() {
      const map = {};
      const lastDay = this.todayDayInSelectedMonth;
      (this.comparisonPivot || []).forEach((row) => {
        let sum = 0;
        for (let d = 1; d <= lastDay; d++) {
          sum += Number(row[`data_t${d}`]?.gap ?? 0);
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
        for (let d = 1; d <= 31; d++) grouped[key][`t${d}`] += Number(r[`t${d}`] || 0);
      });
      return Object.values(grouped);
    },

    filteredMerged() {
      if (this.activeType === 'compare') return [];
      const query = (this.searchPart || '').toLowerCase().trim();

      return this.mergedTableData.filter((r) => {
        if (this.filterCustomer && (r.zcust || '').toUpperCase().trim() !== String(this.filterCustomer).toUpperCase().trim()) return false;
        if (query) {
          return (
            (r.matnr || '').toLowerCase().includes(query) ||
            (r.zmodel || '').toLowerCase().includes(query) ||
            (r.job_number || '').toLowerCase().includes(query) ||
            (r.zcust || '').toLowerCase().includes(query) ||
            (r.vbeln || '').toLowerCase().includes(query)
          );
        }
        return true;
      });
    },

    mergedHeaders() {
      if (this.activeType === 'compare') return [];
      const headers = [
        { title: 'Customer', key: 'nama_customer', width: 130, sortable: true },
        { title: 'Model', key: 'zmodel', width: 122, sortable: true },
        { title: 'Part Number', key: 'matnr', width: 170, fixed: true, sortable: true },
        { title: 'Job Number', key: 'job_number', width: 150, sortable: true },
      ];

      if (this.activeType === 'mdfo') {
        headers.push({ title: 'PCS / Day', key: 'pcs_day_monthly', width: 130, align: 'center', sortable: true });
      }
      headers.push({ title: 'Total Qty', key: 'tot', width: 120, align: 'center', sortable: true });

      for (let d = 1; d <= 31; d++) {
        headers.push({ title: `${d}`, key: `t${d}`, width: 15, align: 'center', sortable: false, isWeekend: this.isWeekend(d) });
      }
      return headers;
    },

    todayDayInSelectedMonth() {
      const now = new Date();
      if (!this.datePickerValue) return now.getDate();
      const [y, m] = String(this.datePickerValue).split("-");
      if (!y || !m) return now.getDate();
      if (Number(y) === now.getFullYear() && Number(m) === now.getMonth() + 1) return now.getDate();
      return new Date(Number(y), Number(m), 0).getDate();
    },

    comparisonPivotMatnrFiltered() {
      const q = (this.searchMatnrHeatmap || "").toLowerCase().trim();
      if (!q) return this.comparisonPivotMatnr || [];
      return (this.comparisonPivotMatnr || []).filter(r => String(r.matnr || "").toLowerCase().includes(q) || String(r.zmodel || "").toLowerCase().includes(q));
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
      return (this.popupZmodel.rows || []).filter(r => String(r.matnr || "").toLowerCase().includes(q));
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
          grouped[zmodel] = { zmodel, matnr_list: new Set(), items: [] };
        }
        grouped[zmodel].items.push({ day: Number(r.day || 0), gap: Number(r.gap || 0) });
        if (r.matnr) grouped[zmodel].matnr_list.add(r.matnr);
      });

      return Object.values(grouped).map((g) => {
        const row = { zmodel: g.zmodel, matnr_list: Array.from(g.matnr_list) };
        let totalGap = 0;
        for (const w of ranges) {
          let gapSum = 0;
          for (const it of g.items) {
            if (it.day >= w.start && it.day <= w.end) gapSum += it.gap;
          }
          row[`gap_${w.id}`] = gapSum;
          row[`pct_${w.id}`] = 0;
          totalGap += gapSum;
        }
        row.gap_total = totalGap;
        row.pct_total = 0;
        return row;
      }).sort((a, b) => a.zmodel.localeCompare(b.zmodel));
    },

    weeklyGapDataZmodelFiltered() {
      const q = (this.zmodelSearch || "").toLowerCase().trim();
      if (!q) return this.weeklyGapDataZmodel;
      return this.weeklyGapDataZmodel.filter(r => (r.zmodel || "").toLowerCase().includes(q));
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
          grouped[zmodel] = { zmodel, matnr_list: new Set(), total_gap: 0, total_mdfo: 0, total_sales: 0 };
        }
        if (item.matnr) grouped[zmodel].matnr_list.add(item.matnr);

        const day = Number(item.day);
        grouped[zmodel][`data_t${day}`] = { mdfo: Number(item.mdfo || 0), sales: Number(item.sales || 0), gap: Number(item.gap || 0) };
        grouped[zmodel].total_gap += Number(item.gap || 0);
        grouped[zmodel].total_mdfo += Number(item.mdfo || 0);
        grouped[zmodel].total_sales += Number(item.sales || 0);
      });

      return Object.values(grouped).map(r => ({ ...r, matnr_list: Array.from(r.matnr_list) })).sort((a, b) => String(a.zmodel).localeCompare(String(b.zmodel)));
    },

    comparisonPivotZmodelFiltered() {
      const q = (this.searchZmodelHeatmap || "").toLowerCase().trim();
      if (!q) return this.comparisonPivotZmodel;
      return (this.comparisonPivotZmodel || []).filter(r => String(r.zmodel || "").toLowerCase().includes(q));
    },

    comparisonHeadersZmodel() {
      const headers = [{ title: "Model", key: "zmodel", width: 180, fixed: true }];
      const days = Array.from({ length: 31 }, (_, i) => ({ title: `${i + 1}`, key: `data_t${i + 1}`, width: 50, align: "center", sortable: false }));
      return [...headers, ...days];
    },

    comparisonHeadersMatnr() {
      const headers = [{ title: "Material", key: "matnr", width: 180, fixed: true }];
      const days = Array.from({ length: 31 }, (_, i) => ({ title: `${i + 1}`, key: `data_t${i + 1}`, width: 50, align: "center", sortable: false }));
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
          grouped[matnr] = { matnr, zmodel: item.zmodel || "-", total_gap: 0, total_mdfo: 0, total_sales: 0 };
        }
        const day = Number(item.day);
        grouped[matnr][`data_t${day}`] = { mdfo: Number(item.mdfo || 0), sales: Number(item.sales || 0), gap: Number(item.gap || 0) };
        grouped[matnr].total_gap += Number(item.gap || 0);
        grouped[matnr].total_mdfo += Number(item.mdfo || 0);
        grouped[matnr].total_sales += Number(item.sales || 0);

        if ((grouped[matnr].zmodel === "-" || !grouped[matnr].zmodel) && item.zmodel) {
          grouped[matnr].zmodel = item.zmodel;
        }
      });

      const q = (this.searchMatnrHeatmap || "").toLowerCase().trim();
      let rows = Object.values(grouped).sort((a, b) => a.matnr.localeCompare(b.matnr));
      if (q) rows = rows.filter(r => (r.matnr || "").toLowerCase().includes(q));
      return rows;
    },

    weeklyGapDataMatnrFiltered() {
      const q = (this.matnrSearch || "").toLowerCase().trim();
      if (!q) return this.weeklyGapDataMatnr;
      return this.weeklyGapDataMatnr.filter((r) => {
        return (r.matnr || "").toLowerCase().includes(q) || (r.zmodel || "").toLowerCase().includes(q);
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
        grouped[matnr].items.push({ day: Number(r.day || 0), gap: Number(r.gap || 0) });
      }

      return Object.keys(grouped).sort().map((matnr) => {
        const row = { matnr, zmodel: grouped[matnr].zmodel || "-" };
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
      return "Search (Part Num, Model, Job Num)";
    },

    weekRanges() {
      if (!this.month || this.month.length < 6) return [];
      return buildCalendarWeeks(Number(this.month.slice(0, 4)), Number(this.month.slice(4, 6)), 1).map((w, i) => ({
        id: `w${i + 1}`, label: `WEEK ${i + 1}`, start: w.start, end: w.end,
      }));
    },

    customerList() {
      const map = {};
      this.parts.forEach((p) => {
        if (p.zcust) {
          const key = p.zcust.toUpperCase().trim();
          if (!map[key]) {
            map[key] = (p.nama_customer || p.zcust).toUpperCase().trim();
          }
        }
      });
      return Object.entries(map).map(([value, title]) => ({ title, value })).sort((a, b) => a.title.localeCompare(b.title));
    },

    isGenerateDoValid() {
      return this.do_date_start && this.doCustomer;
    },

    hasAnyActiveFilters() {
      if (this.calendarSearch) return true;
      if (this.filterZmodel) return true;
      if (this.selectedWeek) return true;
      return Object.values(this.columnFilters).some(f => f.selected !== null);
    },

    summaryData() {
      if (this.activeType === "compare") return [];
      const grouped = {};
      this.parts.forEach((r) => {
        const key = `${r.matnr}-${r.vbeln || ""}`;
        if (!grouped[key]) {
          grouped[key] = { matnr: r.matnr, zmodel: r.zmodel, job_number: r.job_number, vbeln: r.vbeln || "-", zcust: r.zcust, nama_customer: r.nama_customer, tot: 0, pcs_day_monthly: r.pcs_day_monthly || 0 };
        }
        grouped[key].tot += Number(r.tot || 0);
      });
      return Object.values(grouped);
    },

    filteredSummary() {
      if (this.activeType === "compare") return [];
      const query = this.searchPart.toLowerCase().trim();

      return this.summaryData.filter((r) => {
        if (this.filterCustomer && (r.zcust || '').toUpperCase().trim() !== String(this.filterCustomer).toUpperCase().trim()) return false;
        if (query) {
          const matnr = (r.matnr || "").toLowerCase();
          const zcust = (r.zcust || "").toLowerCase();
          const job = (r.job_number || "").toLowerCase();
          const zmodel = (r.zmodel || "").toLowerCase();
          const vbeln = (r.vbeln || "").toLowerCase();
          return matnr.includes(query) || zmodel.includes(query) || job.includes(query) || zcust.includes(query) || vbeln.includes(query);
        }
        return true;
      });
    },

    filteredParts() {
      if (this.activeType === "compare") return [];
      const query = this.searchPart.toLowerCase().trim();

      return this.parts.filter((item) => {
        if (this.filterCustomer && (item.zcust || '').toUpperCase().trim() !== String(this.filterCustomer).toUpperCase().trim()) return false;
        if (query) {
          const matnr = (item.matnr || "").toLowerCase();
          const zcust = (item.zcust || "").toLowerCase();
          const job = (item.job_number || "").toLowerCase();
          const zmodel = (item.zmodel || "").toLowerCase();
          const vbeln = (item.vbeln || "").toLowerCase();
          return matnr.includes(query) || zmodel.includes(query) || job.includes(query) || zcust.includes(query) || vbeln.includes(query);
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
          grouped[cust] = { zcust: cust, total_gap: 0, total_mdfo: 0, total_sales: 0 };
        }
        const day = Number(item.day);
        grouped[cust][`data_t${day}`] = { mdfo: Number(item.mdfo || 0), sales: Number(item.sales || 0), gap: Number(item.gap || 0) };
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
        grouped[cust].push({ day: Number(r.day || 0), gap: Number(r.gap || 0) });
      }

      return Object.keys(grouped).sort().map((zcust) => {
        const row = { zcust, zcust_full: zcust };
        let totalGap = 0;
        for (const w of ranges) {
          let gapSum = 0;
          for (const it of grouped[zcust]) { if (it.day >= w.start && it.day <= w.end) gapSum += it.gap; }
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
      const totals = { byWeek: {}, totalMonth: 0 };
      this.weekRanges.forEach(w => { totals.byWeek[w.id] = 0; });

      this.weeklyGapData.forEach((row) => {
        this.weekRanges.forEach((w) => { totals.byWeek[w.id] += Number(row[`gap_${w.id}`] || 0); });
        totals.totalMonth += Number(row.gap_total || 0);
      });
      return totals;
    },

    comparisonHeaders() {
      const headers = [{ title: "Customer", key: "zcust", width: 150, fixed: true }];
      const days = Array.from({ length: 31 }, (_, i) => ({ title: `${i + 1}`, key: `data_t${i + 1}`, width: 50, align: "center", sortable: false }));
      return [...headers, ...days];
    },

    summaryHeaders() {
      const base = [
        { title: "Part Number", key: "matnr", width: 150 },
        { title: "Model", key: "zmodel", width: 100 },
      ];
      if (this.activeType === "mdfo" || this.activeType === "so") base.push({ title: "Job No", key: "job_number", width: 150 });
      if (this.activeType === "mdfo") base.push({ title: "No Dokumen", key: "vbeln", width: 150 }, { title: "PCS / Day", key: "pcs_day_monthly", width: 100 });
      else if (this.activeType === "so") base.push({ title: "Sales Order Number", key: "vbeln", width: 150 });
      base.push({ title: "Customer", key: "nama_customer", width: 200 }, { title: "Total Qty", key: "tot", width: 120 });
      return base;
    },

    calendarHeaders() {
      const headers = [
        { title: "Part Number", key: "matnr", width: 120, fixed: true },
        { title: "No Dokumen", key: "vbeln", width: 120 },
        { title: "Customer", key: "nama_customer", width: 120 },
      ];
      headers.push({ title: "Selisih (H vs H-1)", key: "delta_hari_ini", width: 140, align: "center", sortable: false });
      const days = Array.from({ length: 31 }, (_, i) => ({ title: `${i + 1}`, key: `t${i + 1}`, width: 50, align: "center", sortable: false }));
      return [...headers, ...days];
    },
  },

  watch: {
    parts: {
      handler() { this.safeRenderChart(); },
      deep: false,
    },
    datePickerValue(val) {
      if (!val) return;
      this.month = String(val).replace(/-/g, "").substring(0, 6);
      this.menuMonth = false;
      // Berhasil dicegah: TIDAK me-load data otomatis di sini
    },
    activeType(newType, oldType) {
      if (newType === oldType) return;
      this.store.type = newType;
      this.parts = [];
      this.searchPart = "";
      this.filterCustomer = null;
      // Berhasil dicegah: TIDAK me-load data otomatis di sini
    },
  },

  mounted() {
    const now      = new Date();
    const year     = now.getFullYear();
    const monthNum = String(now.getMonth() + 1).padStart(2, "0");

    this.selectedYear  = year;
    this.selectedMonth = now.getMonth() + 1;
    this.setMonthValue(year, now.getMonth() + 1);

    const today        = new Date().toISOString().split("T")[0];
    this.do_date_start = today;
    this.do_date_end   = today;

    // AMAN: Jangan sinkronisasi activeType ke store di mounted() jika store memicu api fetch otomatis.
    // Jika Anda membutuhkan sinkronisasi awal tipe tanpa trigger fetch, pastikan store Anda aman dari watch.
    // this.store.type = this.activeType; 

    this.datePickerValue = `${year}-${monthNum}-01`;
    // Seluruh pemanggilan otomatis this.loadData() di mounted BERHASIL DIHAPUS.
  },

  beforeUnmount() {
    if (this._chartTimer) clearTimeout(this._chartTimer);
    if (this._chart) this._chart.destroy();
  },

  methods: {
    ...mapActions(useMaterialStore, [
      "fetchMdfoSap", "generateMdfo", "fetchSoSap", "generateSo", "updateCalculationsMonth", "fetchCompareMdfoSo",
    ]),
    ...mapActions(useRundownIFP, ["fetchCustMdfo"]),

    async loadData() {
      // 🕵️‍♂️ PELACAK GAIB: Buka F12 Console untuk melihat siapa/baris mana yang memicu fungsi ini!
      console.trace(" loadData dipanggil!");
      
      if (!this.month) return;
      const cleanMonth = String(this.month).replace(/\D/g, "").substring(0, 6);
      this.dialogNoData = false;

      if (this.activeType === "mdfo") {
        await this.fetchMdfoSap(cleanMonth);
      } else if (this.activeType === "so") {
        await this.fetchSoSap(cleanMonth);
      } else if (this.activeType === "compare") {
        this.loading = true;
        try {
          const url = `http://192.168.10.67/majsf_rest_api/api/mdfoSalesOrder/compareMdfoSo`;
          const response = await axios.get(url, { params: { period: cleanMonth } });
          const payload = response.data || {};
          this.partsMatnr = Array.isArray(payload?.dataMatnr) ? payload.dataMatnr : [];
          this.compareMatnr = this.partsMatnr;
          this.showNotif("success", `Data MDFO SO (${cleanMonth}) berhasil dimuat.`);
        } catch (error) {
          console.error(error);
          this.showNotif("error", "Gagal memuat data MDFO SO.");
          this.partsMatnr = [];
          this.compareMatnr = [];
        } finally {
          this.loading = false;
        }
      }

      let hasData = this.activeType === "compare" 
        ? (Array.isArray(this.partsMatnr) && this.partsMatnr.length > 0)
        : (Array.isArray(this.parts) && this.parts.length > 0);

      this.dialogNoData = !hasData;
    },

    async exportCalendarToExcel() {
      if (!this.month) return;
      this.loadingExport = true;
      try {
        const configStore = useConfigStore();
        const cleanMonth = String(this.month).replace(/\D/g, "").substring(0, 6);
        const visibleMatnr = (this.calendarFiltered || []).map((item) => item.matnr).filter(Boolean);

        const url = `http://${configStore.apiUrl}/majsf_rest_api/api/mdfoSalesOrder/compareMdfoSo`;
        const response = await axios.post(
          url,
          {
            period: cleanMonth,
            export: 1,
            matnr_list: visibleMatnr,
          },
          {
            responseType: "blob",
          }
        );

        // Format nama file: YYYY.MM.DD HH.mm MDFO Analysis [Bulan] [Tahun].xlsx
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const dateStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}`;
        const mNames = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const pYear = cleanMonth.substring(0, 4);
        const pMonth = parseInt(cleanMonth.substring(4, 6), 10);
        const periodStr = `${mNames[pMonth] || ""} ${pYear}`.trim();

        const fileName = `${dateStr} MDFO Analysis ${periodStr}.xlsx`;

        // Trigger file download using blob
        const blob = new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute("download", fileName);
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(link.href);
        }, 300);
      } catch (error) {
        console.error(error);
        this.showNotif("error", "Gagal mengekspor file Excel.");
      } finally {
        this.loadingExport = false;
      }
    },

    getAccumulatedGap(item, day) {
      let acc = 0;
      for (let i = 1; i <= day; i++) acc += (item.gap[i] || 0);
      return acc;
    },
    
    getAccClass(val) {
      if (val > 0) return 'cal-gap-pos font-bold';
      if (val < 0) return 'cal-gap-neg font-bold';
      return 'text-gray-500';
    },

    toggleWeekHighlight(weekId) { this.selectedWeek = this.selectedWeek === weekId ? null : weekId; },
    isDayInSelectedWeek(day) {
      if (!this.selectedWeek) return false;
      const w = this.calendarWeekRanges.find((w) => w.id === this.selectedWeek);
      return w ? day >= w.start && day <= w.end : false;
    },

    onWeekHeaderClick(weekId, event) {
      this.closeDayTooltip();
      const week = this.calendarWeekRanges.find(w => w.id === weekId);
      if (!week) return;

      const sourceData = this.calendarFiltered; 
      let totalMdfo = 0, totalSales = 0, totalGap = 0, detailParts = [];

      sourceData.forEach(item => {
        let pMdfo = 0, pSales = 0, pGap = 0;
        for (let d = week.start; d <= week.end; d++) {
          pMdfo += (item.mdfo[d] || 0);
          pSales += (item.sales[d] || 0);
        }
        pGap = pSales - pMdfo;
        totalMdfo += pMdfo;
        totalSales += pSales;
        totalGap += pGap;
        if (pGap !== 0) {
          const gapPct = pMdfo > 0 ? (pGap / pMdfo) * 100 : (pSales > 0 ? 100 : 0);
          detailParts.push({
            matnr: item.matnr,
            job_number: item.job_number,
            customer: item.customer,
            zmodel: item.zmodel,
            mdfo: pMdfo,
            sales: pSales,
            gap: pGap,
            gapPct
          });
        }
      });

      const largestGaps = detailParts.filter(p => p.gap > 0).sort((a, b) => b.gapPct - a.gapPct).slice(0, 15);
      const lowestGaps = detailParts.filter(p => p.gap < 0).sort((a, b) => a.gapPct - b.gapPct).slice(0, 15);

      const rect = event.currentTarget.getBoundingClientRect();
      const parentRect = event.currentTarget.closest('.cal-card-wrap').getBoundingClientRect();
      this.weekTooltip = {
        show: true,
        x: (window.innerWidth / 2) - parentRect.left,
        y: rect.bottom - parentRect.top,
        weekLabel: week.label, weekStart: week.start, weekEnd: week.end, totalMdfo, totalSales, totalGap,
        data: largestGaps,
        dataLowest: lowestGaps,
      };
    },

    closeWeekTooltip() { this.selectedWeek = null; this.weekTooltip.show = false; },
    closeDayTooltip() { this.dayTooltip.show = false; },

    onDayHeaderClick(day, event) {
      this.closeWeekTooltip();

      const sourceData = this.calendarFiltered; 
      let totalMdfo = 0, totalSales = 0, totalGap = 0, detailParts = [];
      let accumMdfo = 0, accumSales = 0, accumGap = 0;

      sourceData.forEach(item => {
        const pMdfo = item.mdfo[day] || 0;
        const pSales = item.sales[day] || 0;
        const pGap = pSales - pMdfo;
        const gapPct = pMdfo > 0 ? (pGap / pMdfo) * 100 : (pSales > 0 ? 100 : 0);

        totalMdfo += pMdfo;
        totalSales += pSales;
        totalGap += pGap;

        for (let d = 1; d <= day; d++) {
          accumMdfo += (item.mdfo[d] || 0);
          accumSales += (item.sales[d] || 0);
        }

        if (pGap !== 0) {
          detailParts.push({
            matnr: item.matnr,
            job_number: item.job_number,
            customer: item.customer,
            zmodel: item.zmodel,
            mdfo: pMdfo,
            sales: pSales,
            gap: pGap,
            gapPct
          });
        }
      });
      accumGap = accumSales - accumMdfo;

      const largestGaps = detailParts.filter(p => p.gap > 0).sort((a, b) => b.gapPct - a.gapPct).slice(0, 15);
      const lowestGaps = detailParts.filter(p => p.gap < 0).sort((a, b) => a.gapPct - b.gapPct).slice(0, 15);

      const rect = event.currentTarget.getBoundingClientRect();
      const parentRect = event.currentTarget.closest('.cal-card-wrap').getBoundingClientRect();
      this.dayTooltip = {
        show: true,
        x: (window.innerWidth / 2) - parentRect.left,
        y: rect.bottom - parentRect.top,
        dayLabel: `Tanggal ${day}`,
        day,
        totalMdfo,
        totalSales,
        totalGap,
        accumMdfo,
        accumSales,
        accumGap,
        data: largestGaps,
        dataLowest: lowestGaps,
      };
    },
    calendarToggleSort(key) {
      if (this.calendarSortKey === key) this.calendarSortDir = this.calendarSortDir === "asc" ? "desc" : "asc";
      else { this.calendarSortKey = key; this.calendarSortDir = "asc"; }
    },
    calendarSortIcon(key) {
      if (this.calendarSortKey !== key) return "mdi-unfold-more-horizontal";
      return this.calendarSortDir === "asc" ? "mdi-arrow-up" : "mdi-arrow-down";
    },

    // ─── Filter Excel-style per kolom ──────────────────────────────
    // ─── Filter Excel-style per kolom (cascading) ──────────────────
    getColumnUniqueValues(col) {
      if (col === "row_type") {
        return ["mdfo", "sales", "gap", "accum"];
      }
      const cols = ["customer", "zmodel", "matnr", "job_number"];
      const otherCols = cols.filter((c) => c !== col); // jangan filter dirinya sendiri

      const rows = this.calendarMdfoSoPivot.filter((r) => {
        return otherCols.every((c) => {
          const f = this.columnFilters[c];
          if (!f || f.selected === null) return true;
          let val = r[c] || "-";
          if (c === "customer") {
            val = String(val).toUpperCase().trim();
          }
          return f.selected.includes(val);
        });
      });

      const set = new Set();
      rows.forEach((r) => {
        let val = r[col] || "-";
        if (col === "customer") {
          val = String(val).toUpperCase().trim();
        }
        set.add(val);
      });
      return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
    },

    sortColumnAsc(col) {
      this.calendarSortKey = col;
      this.calendarSortDir = "asc";
    },
    sortColumnDesc(col) {
      this.calendarSortKey = col;
      this.calendarSortDir = "desc";
    },

    filteredColumnValues(col) {
      const filter = this.columnFilters[col];
      const q = (filter?.search || "").toLowerCase().trim();
      const vals = this.getColumnUniqueValues(col);
      if (!q) return vals;
      return vals.filter((v) => String(v).toLowerCase().includes(q));
    },

    isColumnValueChecked(col, val) {
      const filter = this.columnFilters[col];
      if (!filter || filter.selected === null) return false;
      let checkVal = val;
      if (col === "customer") {
        checkVal = String(val).toUpperCase().trim();
      }
      return filter.selected.includes(checkVal);
    },

    toggleColumnValue(col, val) {
      const filter = this.columnFilters[col];
      if (!filter) return;

      let checkVal = val;
      if (col === "customer") {
        checkVal = String(val).toUpperCase().trim();
      }

      if (filter.selected === null) {
        filter.selected = [checkVal];
      } else {
        const idx = filter.selected.indexOf(checkVal);
        if (idx >= 0) filter.selected.splice(idx, 1);
        else filter.selected.push(checkVal);
      }
    },

    selectAllColumn(col) {
      if (!this.columnFilters[col]) return;
      this.columnFilters[col].selected = this.getColumnUniqueValues(col);
    },

    deselectAllColumn(col) {
      if (!this.columnFilters[col]) return;
      this.columnFilters[col].selected = null;
    },

    uncheckAllColumn(col) {
      if (!this.columnFilters[col]) return;
      this.columnFilters[col].selected = null;
    },

    selectThisItemOnly(col, val) {
      if (!this.columnFilters[col]) return;
      let checkVal = val;
      if (col === "customer") {
        checkVal = String(val).toUpperCase().trim();
      }
      this.columnFilters[col].selected = [checkVal];
    },

    clearAllFilters() {
      this.calendarSearch = "";
      this.filterZmodel = "";
      this.closeWeekTooltip();
      this.closeDayTooltip();
      Object.keys(this.columnFilters).forEach((col) => {
        this.columnFilters[col].selected = null;
        this.columnFilters[col].search = "";
      });
      this.showNotif("success", "Semua filter berhasil dibersihkan!");
    },

    invertColumnSelection(col) {
      const filter = this.columnFilters[col];
      if (!filter) return;
      const all = this.getColumnUniqueValues(col);
      const current = filter.selected === null ? all : filter.selected;
      const inverted = all.filter((v) => !current.includes(v));
      filter.selected = inverted.length === all.length ? null : inverted;
    },

    hasActiveFilter(col) {
      const filter = this.columnFilters[col];
      return !!filter && filter.selected !== null;
    },

    pickMonth(monthValue) { this.selectedMonth = monthValue; this.setMonthValue(this.selectedYear, monthValue); this.menuMonth = false; },
    setMonthValue(year, monthValue) {
      const mm = String(monthValue).padStart(2, "0");
      this.month = `${year}${mm}`;
      this.monthText = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(year, monthValue - 1, 1));
    },
    isSelectedMonth(monthValue) {
      return Number(this.selectedMonth) === Number(monthValue) && Number(this.selectedYear) === Number(this.month.slice(0, 4) || this.selectedYear);
    },

    isCalendarWeekendHeader(key) {
      if (!key || typeof key !== "string" || !key.startsWith("t")) return false;
      const day = Number(key.replace("t", ""));
      return day ? this.isWeekend(day) : false;
    },

    numberFormat(value) { return (value === null || value === undefined || value === "") ? "0" : Number(value).toLocaleString("id-ID"); },
    fmtNumber(val) {
      if (val === null || val === undefined || val === "") return "-";
      const num = Number(val);
      return Number.isNaN(num) ? "-" : num.toLocaleString("id-ID");
    },

    formatNumber(v) { return new Intl.NumberFormat("id-ID").format(Number(v || 0)); },
    normalizeZmodel(v) { return String(v ?? "").trim() ? String(v).trim().toUpperCase() : "-"; },

    isRowTypeVisible(type) {
      const filter = this.columnFilters.row_type;
      if (!filter || filter.selected === null) return true;
      return filter.selected.includes(type);
    },
    getFirstVisibleRowType() {
      if (this.isRowTypeVisible("mdfo")) return "mdfo";
      if (this.isRowTypeVisible("sales")) return "sales";
      if (this.isRowTypeVisible("gap")) return "gap";
      if (this.isRowTypeVisible("accum")) return "accum";
      return null;
    },
    visibleTypeCount() {
      let count = 0;
      if (this.isRowTypeVisible("mdfo")) count++;
      if (this.isRowTypeVisible("sales")) count++;
      if (this.isRowTypeVisible("gap")) count++;
      if (this.isRowTypeVisible("accum")) count++;
      return count;
    },
    getRowTypeLabel(val) {
      if (val === "mdfo") return "MDFO";
      if (val === "sales") return "Sales Order";
      if (val === "actual") return "Aktual";
      if (val === "gap") return "GAP";
      if (val === "accum") return "ACCUM";
      return val;
    },

    openPopupZmodelMatnr(zmodel, day) {
      const zm = this.normalizeZmodel(zmodel);
      const d = Number(day);
      const src = Array.isArray(this.partsMatnr) ? this.partsMatnr : [];
      const filtered = src.filter(r => this.normalizeZmodel(r.zmodel) === zm && Number(r.day) === d);

      const map = {};
      for (const r of filtered) {
        const matnr = String(r.matnr || "").trim();
        if (!matnr) continue;
        if (!map[matnr]) map[matnr] = { matnr, mdfo: 0, sales: 0, actual: 0, gap: 0 };
        map[matnr].mdfo += Number(r.mdfo || 0);
        map[matnr].sales += Number(r.sales || 0);
        map[matnr].actual += Number(r.actual || r.qty_out || 0);
        map[matnr].gap += Number(r.gap || 0);
      }
      this.popupZmodel = { zmodel: zm, day: d, rows: Object.values(map).sort((a, b) => a.matnr.localeCompare(b.matnr)) };
      this.dialogZmodelMatnr = true;
    },

    openPptModal() {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yyyy = today.getFullYear();

      // Set input type="date" value (format YYYY-MM-DD)
      if (this.month && this.month.length === 6) {
        const mYear = this.month.substring(0, 4);
        const mMonth = this.month.substring(4, 6);
        this.pptStartDate = `${mYear}-${mMonth}-01`;
        if (mYear === String(yyyy) && mMonth === mm) {
          this.pptEndDate = `${yyyy}-${mm}-${dd}`;
        } else {
          const lastDay = new Date(Number(mYear), Number(mMonth), 0).getDate();
          this.pptEndDate = `${mYear}-${mMonth}-${String(lastDay).padStart(2, "0")}`;
        }
      } else {
        this.pptStartDate = `${yyyy}-${mm}-01`;
        this.pptEndDate = `${yyyy}-${mm}-${dd}`;
      }
      this.dialogPpt = true;
    },

    async doExportPpt() {
      if (!this.pptStartDate || !this.pptEndDate) {
        this.showNotif("error", "Harap pilih Tanggal Mulai dan Tanggal Selesai");
        return;
      }

      this.loadingPpt = true;
      try {
        const toDmy = (isoStr) => {
          if (!isoStr) return "";
          const parts = String(isoStr).split("-");
          if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
          return isoStr;
        };

        const dmyStart = toDmy(this.pptStartDate);
        const dmyEnd = toDmy(this.pptEndDate);

        let accumulationData = null;

        // 1. Ambil data analisis akumulasi langsung dari endpoint API Backend accumulationSummary
        try {
          const configStore = useConfigStore();
          const apiUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/MdfoSalesOrder/accumulationSummary?start_date=${encodeURIComponent(dmyStart)}&end_date=${encodeURIComponent(dmyEnd)}`;
          const response = await axios.get(apiUrl);
          accumulationData = response?.data?.data || null;
        } catch (apiErr) {
          console.warn("Gagal mengambil accumulationSummary dari backend API, menggunakan kalkulasi lokal:", apiErr);
        }

        // 2. Fallback: Kalkulasi lokal jika backend API tidak mengembalikan data
        if (!accumulationData && this.calendarFiltered && this.calendarFiltered.length > 0) {
          const startParts = String(this.pptStartDate).split('-');
          const endParts = String(this.pptEndDate).split('-');
          const startDay = parseInt(startParts[2], 10) || 1;
          const endDay = parseInt(endParts[2], 10) || this.daysInSelectedMonth;

          const isAllowedCustomer = (cust) => {
            if (!cust) return false;
            const c = String(cust).toUpperCase();
            return c !== 'SUPPLY' && c !== 'SUPPLY MATERIAL' && !c.includes('SUPPLY');
          };

          const partsAccum = [];
          this.calendarFiltered.forEach(item => {
            if (!isAllowedCustomer(item.customer)) return;

            let mdfo = 0;
            let sales_order = 0;
            for (let d = startDay; d <= endDay; d++) {
              mdfo += Number(item.mdfo?.[d]) || 0;
              sales_order += Number(item.sales?.[d]) || 0;
            }
            const accum = sales_order - mdfo;
            const accum_pct = mdfo > 0 ? (accum / mdfo) * 100 : 0;

            if (mdfo > 0 || sales_order > 0 || accum !== 0) {
              partsAccum.push({
                zcust: item.zcust || item.customer,
                customer: item.customer || '-',
                model: item.zmodel || '-',
                route: item.route || item.zrouting || '-',
                part_number: item.matnr || '-',
                job_number: item.job_number || item.matnr || '-',
                mdfo,
                sales_order,
                accum,
                accum_pct
              });
            }
          });

          const isExcludedItem = (p) => {
            const model = String(p.model || p.zmodel || '').toUpperCase().trim();
            const jobNo = String(p.job_number || '').toUpperCase().trim();
            if (model === 'SP') return true;
            if (jobNo === 'ATDJ3' || jobNo.includes('ATDJ3')) return true;
            return false;
          };

          const top_highest_accumulation = partsAccum
            .filter(p => p.accum > 0 && !isExcludedItem(p))
            .sort((a, b) => b.accum_pct - a.accum_pct)
            .slice(0, 10);

          const top_lowest_accumulation = partsAccum
            .filter(p => p.accum < 0 && !(p.mdfo < 10 && p.sales_order === 0) && !(p.mdfo === 1 && p.sales_order === 1) && !isExcludedItem(p))
            .sort((a, b) => a.accum_pct - b.accum_pct)
            .slice(0, 10);

          const custModelMap = new Map();
          partsAccum.forEach(p => {
            const key = `${p.customer}_${p.model}`;
            if (!custModelMap.has(key)) {
              custModelMap.set(key, {
                zcust: p.zcust,
                customer: p.customer,
                model: p.model,
                mdfo: 0,
                sales_order: 0,
                accum: 0
              });
            }
            const cm = custModelMap.get(key);
            cm.mdfo += p.mdfo;
            cm.sales_order += p.sales_order;
            cm.accum += p.accum;
          });

          const accumulation_by_customer_model = Array.from(custModelMap.values())
            .map((cm) => ({
              ...cm,
              sales_order_achievement: cm.mdfo > 0 ? (cm.accum / cm.mdfo) * 100 : 0
            }))
            .sort((a, b) => {
              const custCmp = (a.customer || '').localeCompare(b.customer || '');
              if (custCmp !== 0) return custCmp;
              return (a.model || '').localeCompare(b.model || '');
            });

          accumulationData = {
            period: { start_date: dmyStart, end_date: dmyEnd },
            top_highest_accumulation,
            top_lowest_accumulation,
            accumulation_by_customer_model
          };
        }

        if (!accumulationData) {
          throw new Error("Data analisis akumulasi dari server tidak ditemukan.");
        }

        // Generate dan download PowerPoint di Front-End menggunakan data JSON dari Backend accumulationSummary
        await generatePptxFromTemplate(accumulationData, dmyStart, dmyEnd, '/file/template_mdfo_analysis.pptx');

        this.showNotif("success", "Laporan PowerPoint berhasil dibuat dan diunduh!");
        this.dialogPpt = false;
      } catch (error) {
        console.error("Error generating PPT in frontend:", error);
        this.showNotif("error", error?.message || "Gagal membuat file PowerPoint dari template frontend.");
      } finally {
        this.loadingPpt = false;
      }
    },

    async confirmGenerate() { this.dialogNoData = false; await this.doGenerateSap(); },
    async doGenerateSap() {
      this.loadingGenerate = true;
      try {
        if (this.activeType === "mdfo") {
          const response = await this.generateMdfo(this.month);
          if (response && response.status) {
            const resWorkdays = await this.fetchCustMdfo(this.month, "monthly");
            const apiData = resWorkdays?.data || (Array.isArray(resWorkdays) ? resWorkdays : []);

            if (apiData.length > 0) {
              this.customerWorkdaysList = apiData
                .map(c => ({ zcust: c.zcust, nama_customer: c.nama_customer, workdays: c.total_workdays > 0 ? c.total_workdays : 22, status_keterangan: c.status_keterangan || "No Info" }))
                .sort((a, b) => (a.nama_customer || '').localeCompare(b.nama_customer || ''));
            }
            this.dialogWorkdays = true;
            await this.fetchMdfoSap(this.month);
          }
        } else {
          await this.generateSo(this.month); await this.fetchSoSap(this.month);
        }
      } catch (e) {
        this.showNotif("error", "Gagal memproses data");
      } finally { this.loadingGenerate = false; }
    },

    getStatusColor(status) {
      if (!status) return "grey";
      const s = status.toLowerCase();
      if (s.includes("tidak ada") || s.includes("tidak di-link")) return "grey-lighten-3";
      if (s.includes("tersedia") || s.includes("ikut induk")) return "success";
      return "grey";
    },

async saveWorkdays() {
      this.loadingGenerate = true;
      try {
        const payload = { 
          month: this.month, 
          data: this.customerWorkdaysList.map(item => ({ zcust: item.zcust, workdays: item.workdays })) 
        };
        
        if (await this.updateCalculationsMonth(payload)) {
          this.showNotif("success", "Workdays diperbarui!"); 
          this.dialogWorkdays = false; 
          await this.loadData();
        }
      } catch (error) {
        console.error(error);
        this.showNotif("error", "Gagal memperbarui workdays.");
      } finally { 
        this.loadingGenerate = false; 
      }
    },

    formatBulanTahun(ym) {
      if (!ym) return "";
      const mNames = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      return `${mNames[parseInt(ym.substring(4, 6))]} ${ym.substring(0, 4)}`;
    },

    isWeekend(day) {
      if (!this.month || String(this.month).length !== 6) return false;
      return [0, 6].includes(new Date(Number(String(this.month).slice(0, 4)), Number(String(this.month).slice(4, 6)) - 1, day).getDay());
    },

    getCellClass(val, day) {
      return [this.isWeekend(day) ? "weekend-cell" : "", Number(val || 0) > 0 ? "has-qty" : "no-qty"];
    },

    safeRenderChart() {
      clearTimeout(this._chartTimer);
      this._chartTimer = setTimeout(() => { this.$nextTick(() => this.renderChart()); }, 200);
    },

    renderChart() {
      if (this.activeType === "compare") {
        this.chartOptionsCompare = { ...this.chartOptionsCompare, xaxis: { categories: this.comparisonPivot.map(p => p.zcust) }, colors: ["#ff5252"] };
        this.seriesCompare = [{ name: "Total Gap", data: this.comparisonPivot.map(p => Number(p.total_gap || 0)) }];
      } else {
        this.chartOptions = { ...this.chartOptions, xaxis: { categories: this.filteredSummary.map(r => r.matnr) }, colors: ["#42a5f5"] };
        this.series = [{ name: "Total Qty", data: this.filteredSummary.map(r => Number(r.tot || 0)) }];
      }
    },

    exportSummaryExcel() {
      const configStore = useConfigStore();
      window.location.href = `http://${configStore.apiUrl}/majsf_rest_api/api/mdfoSalesOrder/exportExcel?period=${String(this.month).substring(0,6)}&type=${this.activeType}`;
      setTimeout(() => { window.location.href = "http://192.168.10.67/mims/mkt/monthly/mdfo-so"; }, 500);
    },

    showNotif(type, msg) {
      const notif = useNotificationStore();
      if (type === "success") notif.showAlertSuccess(msg); else notif.showAlertFailed(msg);
    },
  },
});
</script>
<style scoped>
.custom-freeze-table :deep(th.sticky-header-col) {
  position: sticky !important;
  background: #f5f5f5 !important;
}
.custom-freeze-table :deep(td.sticky-body-col) {
  position: sticky !important;
}

/* ─── PENGATURAN FONT HEADER (DI-PERKECIL) ─── */
.custom-freeze-table :deep(th),
.cal-table thead th {
  text-align: center !important;
  font-size: 0.85rem !important;   /* Ukuran diperkecil sedikit menjadi 12px */
  font-weight: 600 !important;     /* Sedikit tebal agar tetap terbaca jelas */
}

/* ─── PENGATURAN FONT DATA BODY ─── */
.custom-freeze-table :deep(td),
.cal-table tbody td {
  font-size: 0.875rem !important;  /* Ukuran data body tetap standar (14px) */
}

:deep(.v-table__wrapper) {
  overflow-y: visible !important; /* Memaksa wrapper tabel mengikuti tinggi konten asli */
  overflow-x: auto !important;    /* Scroll horizontal tetap aktif jika kolom terlalu lebar */
}

.table-responsive-custom {
  height: auto !important;        /* Memastikan komponen tabel tidak terkunci tingginya */
}

/* ─── FILTER EXCEL-STYLE PADA HEADER KALENDER ─── */
.cal-th-filter-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.cal-filter-icon {
  cursor: pointer;
  opacity: 0.85;
}
.cal-filter-icon:hover {
  opacity: 1;
}
.cal-filter-menu {
  max-height: 380px;
  overflow-y: auto;
}
.cal-filter-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 2px 6px;
}
.cal-filter-checkbox :deep(.v-label) {
  font-size: 12px;
  opacity: 1;
}
.cal-filter-checkbox :deep(.v-selection-control) {
  min-height: 28px;
}
</style>

<style scoped>
/* ── FREEZE HEADER SAAT SCROLL VERTIKAL ────────────────── */

/* Container sudah punya max-height + overflow:auto — pastikan position:relative */
.cal-table-container {
  position: relative;
}

/* Lock widths for sticky headers and cells to prevent size changes */
.cal-th-sticky-cust, .cal-td-cust {
  min-width: 120px !important;
  width: 120px !important;
  max-width: 120px !important;
}
.cal-th-sticky-model, .cal-td-model {
  min-width: 75px !important;
  width: 75px !important;
  max-width: 75px !important;
}
.cal-th-sticky-part, .cal-td-part {
  min-width: 150px !important;
  width: 150px !important;
  max-width: 150px !important;
}
.cal-th-sticky-job, .cal-td-job {
  min-width: 140px !important;
  width: 140px !important;
  max-width: 140px !important;
}
.cal-th-sticky-type, .cal-td-type {
  min-width: 90px !important;
  width: 90px !important;
  max-width: 90px !important;
}

/* Baris header PERTAMA (Customer, Model, Part Number, Job Number, Type, W1–W5, Total GAP) */
.cal-table thead tr:first-child th {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f5f5f5; /* sama dengan .cal-th */
  box-shadow: 0 2px 0 #e0e0e0;
}

/* Baris header KEDUA (nomor hari 1–31) */
.cal-table thead tr:nth-child(2) th {
  position: sticky;
  top: 25px; /* sesuaikan dengan tinggi baris header pertama */
  z-index: 9;
  background: #f5f5f5;
}

/* Kolom sticky di baris header pertama harus z-index lebih tinggi
   agar tidak tertimpa saat scroll horizontal DAN vertikal bersamaan */
.cal-table thead tr:first-child th.cal-th-sticky {
  z-index: 15 !important;
  background: #f5f5f5;
}

/* Week group header di baris pertama — perlu background solid */
.cal-table thead tr:first-child .cal-th-wgrp {
  background: #e3f2fd;
}

.cal-table thead tr:first-child .cal-wgrp-active {
  background: #1565c0 !important;
  color: #fff !important;
}

/* Total GAP header */
.cal-table thead tr:first-child .cal-th-total {
  background: #ede7f6;
}
.v-field--focused .v-field__outline {
  --v-field-border-width: 1px !important;
  color: #9ca3af !important;
}
.no-focus-border :deep(.v-field--focused .v-field__outline) {
  --v-field-border-width: 1px;
  --v-field-border-opacity: 0.38;
  color: #9ca3af !important;
}

.no-focus-border :deep(.v-field--focused) {
  --v-field-border-color: #9ca3af;
}
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
  -webkit-user-select: text; /* Safari */
  -moz-user-select: text;    /* Firefox */
  -ms-user-select: text;     /* IE10+/Edge */
  user-select: text;         /* Standard */
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
/* ── Tabel kalender MDFO vs Sales Order ── */
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
  padding: 0px 1px;
  text-align: right;
  vertical-align: middle;
}

/* Sticky kolom kiri */
.cal-sticky {
  position: sticky;
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
.cal-th-day     { min-width: 20px; width: 20px; }
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
.cal-type-mdfo   { color: #1565c0; background: #e8f4fd; }
.cal-type-sales  { color: #2e7d32; background: #e8f5e9; }
.cal-type-actual { color: #00897b; background: #e0f2f1; }
.cal-type-gap    { color: #6a1b9a; background: #f3e5f5; }

/* Part / Model sticky cell */
.cal-td-part  { text-align: left; min-width: 170px; background: #fff; }
.cal-td-model { text-align: left; min-width: 100px; color: #666; font-size: 11px; }

/* Row backgrounds */
.cal-row-mdfo   td { background: #f9fdff; }
.cal-row-sales  td { background: #f9fff9; }
.cal-row-actual td { background: #f2fbf9; }
.cal-row-gap    td { background: #fdf6ff; }

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
.cal-row-gt-acc td { background: #e0f2f1 !important; }
.cal-row-gt-acc .cal-type-acc { color: #004d40 !important; font-weight: 600 !important; }

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
  padding: 1px 4px;
  text-align: right;
  vertical-align: middle;
}

/* Sticky */
.cal-sticky { position:sticky; z-index:3; background:#fff; }
thead .cal-sticky { z-index:5; background:#f5f5f5; }

/* Header */
.cal-th           { background:#f5f5f5; font-weight:600; text-align:center; }
.cal-th-inner     { display:flex; align-items:center; justify-content:center; gap:3px; }
.cal-th-id        { min-width:170px; text-align:left; }
.cal-th-sm        { min-width:95px; }
.cal-th-type-hd   { min-width:50px; }
.cal-th-day       { min-width:30px; width:30px; font-weight:500; cursor: pointer; transition: background .15s; }
.cal-th-day:hover { background: #e3f2fd !important; color: #000 !important; }
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
.cal-th-wgrp:hover {
  background: #bbdefb !important;
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

.page-wrapper {
  padding: 24px;
}

.card-harian-kustom {
  background-color: #f1f3f5 !important;
  border: none !important;
  border-radius: 8px !important;
}
.card-mingguan-kustom {
  background-color: #f1f3f5 !important;
  border: none !important;
  border-radius: 8px !important;
}
.card-accum-kustom {
  background-color: #f1f3f5 !important;
  border: none !important;
  border-radius: 8px !important;
}

/* Reset global input styles inside Vuetify text fields and selects to prevent double borders */
:deep(.v-text-field input),
:deep(.v-select input),
:deep(.v-autocomplete input) {
  border: none !important;
  background-color: transparent !important;
  box-shadow: none !important;
  outline: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
}
:deep(.v-text-field input:focus),
:deep(.v-select input:focus),
:deep(.v-autocomplete input:focus) {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}
</style>