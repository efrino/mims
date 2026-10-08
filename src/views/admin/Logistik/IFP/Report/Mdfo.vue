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
          color="green-darken-2"
          prepend-icon="mdi-file-excel-outline"
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
        class="elevation-1 rounded-lg premium-table"
        hover
        fixed-header
        height="600"
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
            <td class="sticky-col font-weight-bold">{{ item.matnr }}</td>
            <td>{{ item.zmodel }}</td>
            <td>{{ item.job_number }}</td>

            <!-- vbeln: SO type tambahkan posnr -->
            <td v-if="activeType === 'so'">
              {{ item.vbeln }}{{ item.posnr ? '-' + item.posnr : '' }}
            </td>
            <td v-else>{{ item.vbeln }}</td>

            <!-- PCS/Day khusus MDFO -->
            <td v-if="activeType === 'mdfo'" class="text-center">
              {{ new Intl.NumberFormat('id-ID').format(Number(item.pcs_day_monthly) || 0) }}
            </td>

            <td>{{ item.nama_customer }}</td>

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

    <!-- Chart tetap di sini -->
    <v-card class="pa-6 rounded-lg mb-8 elevation-2">
      <div class="text-h6 mb-4 text-primary font-weight-medium">
        {{ activeType === 'mdfo' ? 'Qty Distribution per Model' : 'Total Qty per Part' }}
      </div>
      <apexchart
        type="bar"
        height="350"
        :options="chartOptions"
        :series="series"
      />
    </v-card>
  </div>

    <!-- ===== COMPARE SECTION ===== -->
    <div v-if="activeType === 'compare'">
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
          Total Gap Analysis (MDFO - Sales)
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
                    <div>Sales: {{ formatNumber(item[`data_t${d}`]?.sales ?? 0) }}</div>
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
                    <div>Sales: {{ formatNumber(item[`data_t${d}`].sales ?? 0) }}</div>
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
                    <div>Sales: {{ formatNumber(item[`data_t${d}`]?.sales ?? 0) }}</div>
                    
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
      { text: "MDFO Monitoring", value: "mdfo" },
      { text: "Sales Order (SO) Monitoring", value: "so" },
      { text: "Comparison (MDFO vs SO)", value: "compare" },
    ],
    month: "",
    monthText: "",
    datePickerValue: null,
    menuMonth: false,
     selectedYear: new Date().getFullYear(),
      selectedMonth: null,
      months: [
        { label: "Jan", value: 1 },
        { label: "Feb", value: 2 },
        { label: "Mar", value: 3 },
        { label: "Apr", value: 4 },
        { label: "Mei", value: 5 },
        { label: "Jun", value: 6 },
        { label: "Jul", value: 7 },
        { label: "Agu", value: 8 },
        { label: "Sep", value: 9 },
        { label: "Okt", value: 10 },
        { label: "Nov", value: 11 },
        { label: "Des", value: 12 },
      ],
    searchPart: "",
    filterCustomer: null,
    dialogNoData: false,
    loadingGenerate: false,
    do_date_start: "",
    do_date_end: "",
    doCustomer: null,
    doCustomerOptions: ["MKM", "TMMIN"],
    loadingDo: false,
    generateResult: null,
    dialogWorkdays: false,
    customerWorkdaysList: [],
    compareMatnr: [],
    matnrSearch: "",
    matnrPageSize: 10,
    matnrPageOptions: [
      { title: "10", key: 10 },
      { title: "15", key: 15 },
      { title: "30", key: 30 },
      { title: "All", key: -1 },
    ],
    searchMatnrHeatmap: "",
    searchZmodelHeatmap: "",
    zmodelSearch: "",
    zmodelPageSize: 10,
    zmodelPageOptions: [
      { title: "10", key: 10 },
      { title: "15", key: 15 },
      { title: "30", key: 30 },
      { title: "All", key: -1 },
    ],
    dialogZmodelMatnr: false,
    popupZmodel: {
      zmodel: "",
      day: null,
      rows: [],
      search: "",
    },
    dialogHeatmap: false,
    popupHeatmap: {
      zcust: "",
      day: null,
      mdfo: 0,
      sales: 0,
      gap: 0,
    },
    dialogHeatmapMatnr: false,
    popupHeatmapMatnr: {
      matnr: "",
      zmodel: "",
      day: null,
      mdfo: 0,
      sales: 0,
      gap: 0,
    },
    chartOptions: {
  chart: {
    id: "qty-chart",
    toolbar: { show: false },
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      columnWidth: "55%",
    },
  },
  dataLabels: {
    enabled: false,
  },
  xaxis: {
    categories: [],
    labels: {
      rotate: -45,
    },
  },
  yaxis: {
    labels: {
      formatter: (val) => new Intl.NumberFormat("id-ID").format(Number(val || 0)),
    },
  },
  tooltip: {
    y: {
      formatter: (val) => new Intl.NumberFormat("id-ID").format(Number(val || 0)),
    },
  },
},
series: [],

chartOptionsCompare: {
  chart: {
    id: "qty-chart-compare",
    toolbar: { show: false },
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      columnWidth: "55%",
    },
  },
  dataLabels: {
    enabled: false,
  },
  xaxis: {
    categories: [],
    labels: {
      rotate: -45,
    },
  },
  yaxis: {
    labels: {
      formatter: (val) => new Intl.NumberFormat("id-ID").format(Number(val || 0)),
    },
  },
  tooltip: {
    y: {
      formatter: (val) => new Intl.NumberFormat("id-ID").format(Number(val || 0)),
    },
  },
},
seriesCompare: [],
  }),

  computed: {
    ...mapWritableState(useMaterialStore, ["parts", "partsMatnr", "loading"]),

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
        { title: 'Part Number', key: 'matnr',         width: 200, fixed: true, sortable: true },
        { title: 'Model',       key: 'zmodel',         width: 120,              sortable: true },
        { title: 'Job No',      key: 'job_number',     width: 200,              sortable: true },
      ];

      if (this.activeType === 'mdfo') {
        headers.push(
          { title: 'No Dokumen', key: 'vbeln',           width: 180, sortable: true },
          { title: 'PCS / Day',  key: 'pcs_day_monthly', width: 110, align: 'center', sortable: true },
        );
      } else {
        headers.push({ title: 'SO Number', key: 'vbeln', width: 180, sortable: true });
      }

      headers.push(
        { title: 'Customer',  key: 'nama_customer', width: 220, sortable: true },
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
        ? "Search (Part No, Model, Customer)"
        : "Search (Part No, SO No, Customer)";
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
      if (!val) return;
      this.month = val.replace("-", "");
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
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    this.month = `${y}${m}`;
    this.datePickerValue = `${y}-${m}-01`;
    this.loadData();
    const today = new Date().toISOString().split("T")[0];
    this.do_date_start = today;
    this.do_date_end = today;
    this.store.type = this.activeType;
    this.loadData();
    const d = new Date();
    const year = d.getFullYear();
    const monthNum = String(d.getMonth() + 1).padStart(2, "0");

    this.month = `${year}${monthNum}`;
    this.monthText = new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
    }).format(d);

    this.datePickerValue = `${year}-${monthNum}-01`;
     
    this.selectedYear = now.getFullYear();
    this.selectedMonth = now.getMonth() + 1;
    this.setMonthValue(this.selectedYear, this.selectedMonth);
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
:deep(.calendar-header-cell) {
  background: #eef2f7 !important;
  color: #334155;
  font-weight: 600;
  border-bottom: 2px solid #d0d0d0 !important;
  border-right: 1px solid #e5e7eb !important;
  text-align: center;
  white-space: nowrap;
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

/* Flex layout dalam header cell */
:deep(.calendar-header-cell .header-inner) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
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
</style>
