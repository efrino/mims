<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <v-container fluid>
    <v-row>
      <v-col cols="auto" class="mb-3">
        <v-btn
          elevation="10"
          fab
          color="success"
          :href="`http://${apiUrl}/majsf_rest_api/api/report-stock/report?start=${
            dates[0]
          }&end=${dates[1] ? dates[1] : dates[0]}&tipe=${
            datatablesPress.filter.tipe
          }`"
          target="_blank"
          small
          class="mr-1"
          ><v-icon>mdi-microsoft-excel</v-icon></v-btn
        >
        <v-btn fab dark small color="#2196F3" @click="openFile">
          <v-icon>mdi-upload</v-icon>
        </v-btn>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog.upload">
      <v-card>
        <v-card-text class="pt-4">
          <v-row>
            <v-col>
              <span class="error--text text-h5">
                Jika menggunakan fitur upload patan, maka akan menghapus seluruh
                patan pada periode yang sesuai dengan patan yang akan di upload,
                dan menggatinya dengan data yang terupload
              </span>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-text>
          <v-row
            ><v-col cols="12" xl="6" lg="6" md="6" sm="6"
              ><v-menu
                v-model="dialog.datePickerPeriod"
                :close-on-content-click="false"
                :nudge-right="40"
                transition="scale-transition"
                offset-y
                min-width="auto"
              >
                <template #activator="{ on, attrs }">
                  <v-text-field
                    v-model="formData.period"
                    label="Date"
                    append-icon="mdi-calendar"
                    readonly
                    v-bind="attrs"
                    v-on="on"
                    outlined
                    dense
                    hide-details
                  >
                  </v-text-field>
                </template>
                <v-date-picker
                  v-model="formData.period"
                  type="month"
                  @input="dialog.datePickerPeriod = false"
                >
                </v-date-picker></v-menu
            ></v-col>
          </v-row>

          <v-data-table
            v-if="datatablesUploadMDFO.items.length"
            :headers="datatablesUploadMDFO.headers"
            :items="datatablesUploadMDFO.items"
            mobile-breakpoint="0"
            disable-filtering
            disable-pagination
            hide-default-footer
          >
            <template #item="{ item }">
              <tr>
                <td>
                  {{ item.part_number }}
                </td>
                <td>
                  {{ item.status }}
                </td>
                <td>
                  {{ item.line }}
                </td>
                <td>
                  {{ item.process }}
                </td>
                <td>
                  {{ item.mdfo }}
                </td>
                <td>
                  {{ item.gsph }}
                </td>
                <td>
                  <v-tooltip left v-if="item.ERROR != ''">
                    <template #activator="{ on, attrs }">
                      <v-btn
                        v-bind="attrs"
                        v-on="on"
                        x-small
                        fab
                        class="ma-2"
                        color="warning"
                      >
                        <v-icon>mdi-alert-circle-outline</v-icon>
                      </v-btn>
                    </template>
                    <span style="white-space: pre">{{ item.ERROR }}</span>
                  </v-tooltip>
                  <v-btn v-else x-small fab class="ma-2" color="success">
                    <v-icon>mdi-check</v-icon>
                  </v-btn>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card-text>
        <v-card-text class="pt-4">
          <v-row>
            <v-col>
              <span class="error--text text-red-500 text-h5">
                Jika menggunakan fitur upload patan, maka akan menghapus seluruh
                patan pada periode yang sesuai dengan patan yang akan di upload
                dan menggatinya dengan data yang terupload.
              </span>
              <span class="text-h5">
                Tekan save untuk melanjutkan proses upload atau jika ingin
                membatalkan tekan reset
              </span>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer> </v-spacer>
          <v-btn
            v-if="
              permissions.create && datatablesUploadMDFO.items.length && !error
            "
            elevation="10"
            color="primary"
            small
            @click="onUploadMDFO"
            dark
          >
            <v-icon>mdi-content-save</v-icon> Save</v-btn
          >
          <v-btn
            v-if="permissions.create && datatablesUploadMDFO.items.length"
            elevation="10"
            color="error"
            small
            @click="onDelete"
            dark
          >
            <v-icon>mdi-delete</v-icon> Reset</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <input
      ref="excel"
      type="file"
      class="d-none"
      accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      @change="handleFileUpload"
    />

    <!-- Form Keterangan Detail-->
    <v-dialog v-model="dialog.detail" persistent width="auto">
      <v-form ref="form" lazy-validation>
        <v-card>
          <v-card-title class="font-weight-black">
            Part Number {{ detail[0] ? detail[0].part_number : "" }}
            <br />
            Periode
            {{ datatablesPress.filter ? dateMonthFull(dates[0]) : "" }}
            {{
              dates[1] == dates[0]
                ? ""
                : !dates[1]
                ? ""
                : "s.d " + dateMonthFull(dates[1])
            }}
          </v-card-title>
          <v-card-title class="subtitle-1 pa-0"> </v-card-title>
          <v-card-text class="overflow-auto">
            <table class="text-center colappse">
              <thead class="biru">
                <tr>
                  <th class="hijau" rowspan="3">No</th>
                  <th class="hijau" rowspan="3">Date</th>
                  <th class="hijau" rowspan="3">Line</th>
                  <th class="hijau" rowspan="3">Shift</th>
                  <th class="hijau" rowspan="3">Patan</th>
                  <th class="hijau" colspan="2" rowspan="2">Plan</th>
                  <th class="hijau" rowspan="3">Keterangan</th>
                  <th rowspan="2">OK</th>
                  <th colspan="2" rowspan="2">Repair</th>
                  <th colspan="2" rowspan="2">Reject</th>
                  <th colspan="3" rowspan="2">Actual</th>
                  <th rowspan="2">Idletime</th>
                  <th rowspan="2">Dandori</th>
                  <th colspan="8">Downtime</th>
                  <th rowspan="3">GSPH</th>
                  <th rowspan="3">Keterangan</th>
                </tr>
                <tr>
                  <th class="biru" colspan="2">Machines</th>
                  <th class="biru" colspan="2">Dies</th>
                  <th class="biru" colspan="2">Other</th>
                  <th class="biru" colspan="2">Material</th>
                </tr>
                <tr>
                  <th class="hijau satuan">Lot Size</th>
                  <th class="hijau satuan">TPT</th>
                  <th class="satuan">PCS</th>
                  <th class="satuan">PCS</th>
                  <th class="satuan">Keterangan</th>
                  <th class="satuan">PCS</th>
                  <th class="satuan">Keterangan</th>
                  <th class="satuan">Lot Size</th>
                  <th class="satuan">TPT</th>
                  <th class="satuan">Status</th>
                  <th class="satuan">(Menit)</th>
                  <th class="satuan">(Menit)</th>
                  <th class="satuan">(Menit)</th>
                  <th class="satuan">Keterangan</th>
                  <th class="satuan">(Menit)</th>
                  <th class="satuan">Keterangan</th>
                  <th class="satuan">(Menit)</th>
                  <th class="satuan">Keterangan</th>
                  <th class="satuan">(Menit)</th>
                  <th class="satuan">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) of detail" :key="item.name">
                  <td>
                    {{ index + 1 }}
                  </td>
                  <td class="no-wrap">
                    {{ item.date }}
                  </td>
                  <td>
                    {{ item.line_id }}
                  </td>
                  <td>
                    {{ item.shift }}
                  </td>
                  <td>
                    {{ item.patan }}
                  </td>
                  <td>
                    {{ item.lotsize }}
                  </td>
                  <td>
                    {{ item.tpt }}
                  </td>
                  <td>{{ item.keterangan }}</td>

                  <td>
                    {{ item.lotsize_actual }}
                  </td>
                  <td>
                    {{ item.repair }}
                  </td>
                  <td>
                    {{ item.ket_repair }}
                  </td>
                  <td>
                    {{ item.reject }}
                  </td>
                  <td>
                    {{ item.ket_reject }}
                  </td>
                  <td
                    class="font-weight-bold"
                    :class="
                      parseInt(item.lotsize_actual) +
                        parseInt(item.repair) +
                        parseInt(item.reject) <
                      parseInt(item.lotsize)
                        ? 'text-red-500'
                        : parseInt(item.lotsize_actual) +
                            parseInt(item.repair) +
                            parseInt(item.reject) ==
                          parseInt(item.lotsize)
                        ? 'text-green-500'
                        : parseInt(item.lotsize_actual) +
                            parseInt(item.repair) +
                            parseInt(item.reject) >
                          parseInt(item.lotsize)
                        ? 'text-blue-500'
                        : ''
                    "
                  >
                    {{
                      parseInt(item.lotsize_actual) +
                      parseInt(item.repair) +
                      parseInt(item.reject)
                    }}
                  </td>
                  <td>
                    {{ item.tpt_actual }}
                  </td>
                  <td>
                    {{ item.status }}
                  </td>
                  <td>
                    {{ item.idletime }}
                  </td>
                  <td>
                    {{ item.dandori }}
                  </td>
                  <td>
                    {{ item.dt_machines }}
                  </td>
                  <td>
                    {{ item.ket_dt_machines }}
                  </td>
                  <td>
                    {{ item.dt_dies }}
                  </td>
                  <td>
                    {{ item.ket_dt_dies }}
                  </td>
                  <td>
                    {{ item.dt_other }}
                  </td>
                  <td>
                    {{ item.ket_dt_other }}
                  </td>
                  <td>
                    {{ item.dt_material }}
                  </td>
                  <td>
                    {{ item.ket_dt_material }}
                  </td>
                  <td>
                    {{
                      formatDecimaltoNumber(
                        (parseInt(item.stroke_act) /
                          (parseInt(item.act_process) *
                            (parseInt(item.tpt_actual) -
                              parseInt(item.idletime)))) *
                          60
                      )
                    }}
                  </td>
                  <td>
                    {{ item.keterangan_all }}
                  </td>
                </tr>
              </tbody>
            </table>
          </v-card-text>
          <v-card-actions>
            <v-btn
              rounded
              color="secondary"
              dark
              @click="dialog.detail = false"
            >
              Close
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>
    <!-- Akhir Form Keterangan Detail -->

    <v-card color="primary" class="elevation-4 rounded-xl">
      <v-card-title class="text-center justify-center py-6">
        <h2 class="font-weight-bold text-h1 text-white">
          Report Achievement Press
        </h2>
      </v-card-title>

      <v-row cols="3" elevation="10" class="justify-start mb-0 ml-3 ">
        <v-tabs v-model="tab" color="primary" density="compact" hide-slider>
          <v-tab :color="tab === 'summary' ? 'primary' : undefined" :class="tab == 'summary' ? 'bg-white' : undefined" value="summary" class="rounded-t-xl">Summary</v-tab>
          <v-tab :color="tab === 'mutasi' ? 'primary' : undefined" :class="tab == 'mutasi' ? 'bg-white' : undefined" value="mutasi" class="rounded-t-xl">Mutasi</v-tab>
        </v-tabs>
      </v-row>

      <v-window v-model="tab">
        <!-- Summary TAB -->
        <v-window-item value="summary">
          <v-card class="elevation-5 pa-4 mb-10">
            <v-row>
              <v-col cols="6">
                <h2 class="text-blue-500">Summary Achievement Press</h2>
                <p>
                  Periode
                  {{ datatablesPress.filter ? dateMonthFull(dates[0]) : "" }}
                  {{
                    dates[1] == dates[0]
                      ? ""
                      : !dates[1]
                      ? ""
                      : "s.d " + dateMonthFull(dates[1])
                  }}
                </p>
              </v-col>
              <v-col cols="6" class="my-auto text-right">
                <v-row>
                  <v-col cols="6" class="my-auto">
                    <v-btn
                      color="primary"
                      @click="dialog.datePicker = true"
                      small
                      class="mr-5"
                      ><v-icon>mdi-calendar </v-icon> Select Period</v-btn
                    >
                  </v-col>
                  <v-col cols="6">
                    <v-autocomplete
                      :items="tipeData"
                      v-model="datatablesPress.filter.tipe"
                      label="Percentage"
                      variant="outlined"
                      density="comfortable"
                      hide-details
                      @change="fetchReportAchievementWeekday(dates)"
                    >
                    </v-autocomplete>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>

            <v-data-table
              :items="filteredItems()"
              :headers="datatablesPress.headers"
              mobile-breakpoint="0"
              hide-default-header
              fixed-header
            >
              <template #header="{ props }">
                <tr>
                  <th v-for="column in props.headers" :key="column.text">
                    {{ console.log(column) }}
                    <v-text-field
                      v-model="datatablesPress.filters[column.value]"
                      :label="column.text"
                      variant="outlined"
                      density="comfortable"
                      type="Text"
                      :placeholder="column.text"
                      autocomplete="off"
                      hide-details
                      v-if="
                        column.value == 'part_number' ||
                        column.value == 'line_id'
                      "
                      prepend-inner-icon="mdi-magnify"
                    >
                    </v-text-field>
                  </th>
                </tr>
                <tr class="text-green-300 rounded-lg elevation-1">
                  <th
                    v-for="column in props.headers"
                    :key="column.text"
                    class="text-left"
                    :class="
                      column.text == 'Part Number'
                        ? 'rounded-l-lg'
                        : column.text == 'Action'
                        ? 'rounded-r-lg'
                        : ''
                    "
                  >
                    {{ column.text }}
                  </th>
                </tr>
              </template>

              <template #item="{ item }">
                <tr>
                  <td>{{ item.part_number }}</td>
                  <td>{{ item.line_id }}</td>
                  <td>{{ item.plan }}</td>
                  <td>{{ item.actual }}</td>
                  <td
                    :class="
                      item.diff_plan_pcs < 0
                        ? 'text-red-500 font-weight-black'
                        : ''
                    "
                  >
                    {{ item.diff_plan_pcs }}
                  </td>
                  <td
                    :class="
                      item.diff_plan_persen > 100
                        ? 'text-blue-500'
                        : item.diff_plan_persen < 100
                        ? 'text-red-500'
                        : item.diff_plan_persen == 100
                        ? 'text-green-500'
                        : ''
                    "
                    class="font-weight-black"
                  >
                    {{
                      isFinite(item.diff_plan_persen)
                        ? formatPercent(item.diff_plan_persen)
                        : "-"
                    }}
                  </td>
                  <td>{{ formatNumberOneDecimal(item.gsph) }}</td>
                  <td>
                    {{
                      formatNumberOneDecimal(
                        Math.abs(item.diff_plan_pcs / item.gsph)
                      )
                    }}
                  </td>
                  <td>
                    <v-btn
                      color="primary"
                      @click="loadDetail(item.part_number, dates)"
                      ><v-icon class="mr-1">mdi-eye</v-icon>View</v-btn
                    >
                  </td>
                </tr>
              </template>
            </v-data-table>
            <v-dialog v-model="dialog.datePicker" width="300px">
              <v-date-picker
                width="300px"
                v-model="dates"
                range
              ></v-date-picker>
              <v-btn
                class="text-blue-600"
                dark
                @click="fetchReportAchievementWeekday(dates)"
              >
                Show Data
              </v-btn>
            </v-dialog>
          </v-card>
        </v-window-item>

        <v-window-item value="mutasi">
          <v-card class="elevation-5 pa-4">
            <v-row>
              <v-col cols="6">
                <h2 class="text-blue-500">Mutasi Achievement Press</h2>
                <p>
                  Periode
                  {{ datatablesPress.filter ? dateMonthFull(dates[0]) : "" }}
                  {{
                    dates[1] == dates[0]
                      ? ""
                      : !dates[1]
                      ? ""
                      : "s.d " + dateMonthFull(dates[1])
                  }}
                </p>
                <v-btn
                  color="primary"
                  @click="dialog.datePicker = true"
                  small
                  class="mr-5"
                  ><v-icon>mdi-calendar</v-icon> Select Period</v-btn
                >
              </v-col>
            </v-row>

            <v-data-table
              :items="filteredItemsMutasi()"
              :headers="datatablesMutasi.headers"
              mobile-breakpoint="0"
              hide-default-header
            >
              <template #header="{ props }">
                <tr>
                  <th v-for="column in props.headers" :key="column.text">
                    <v-text-field
                      v-model="datatablesMutasi.filters[column.value]"
                      :label="column.text"
                      variant="outlined"
                      density="comfortable"
                      type="Text"
                      :placeholder="column.text"
                      autocomplete="off"
                      hide-details
                      v-if="column.value == 'part_number'"
                      prepend-inner-icon="mdi-magnify"
                    >
                    </v-text-field>
                  </th>
                </tr>
                <tr class="text-blue-300 rounded-lg elevation-1">
                  <th rowspan="2">Part Number</th>
                  <th rowspan="2"></th>
                </tr>
                <tr class="text-blue-300">
                  <th
                    v-for="number in range(
                      parseInt(dates[0] ? dates[0].substr(8, 10) : 0),
                      parseInt(dates[1] ? dates[1].substr(8, 10) : 0)
                    )"
                    :key="number"
                  >
                    {{ number }}
                  </th>
                </tr>
              </template>
              <template #item="{ item }">
                <tr>
                  <td rowspan="4" class="text-center">
                    {{ item.part_number }}
                  </td>
                </tr>
                <tr>
                  <td>Plan</td>
                  <td
                    v-for="number in range(
                      parseInt(dates[0] ? dates[0].substr(8, 10) : 0),
                      parseInt(dates[1] ? dates[1].substr(8, 10) : 0)
                    )"
                    :key="number"
                    class="text-center"
                  >
                    {{
                      number == "01"
                        ? item.plan_01
                        : number == "02"
                        ? item.plan_02
                        : number == "03"
                        ? item.plan_03
                        : number == "04"
                        ? item.plan_04
                        : number == "05"
                        ? item.plan_05
                        : number == "06"
                        ? item.plan_06
                        : number == "07"
                        ? item.plan_07
                        : number == "08"
                        ? item.plan_08
                        : number == "09"
                        ? item.plan_09
                        : number == 10
                        ? item.plan_10
                        : number == 11
                        ? item.plan_11
                        : number == 12
                        ? item.plan_12
                        : number == 13
                        ? item.plan_13
                        : number == 14
                        ? item.plan_14
                        : number == 15
                        ? item.plan_15
                        : number == 16
                        ? item.plan_16
                        : number == 17
                        ? item.plan_17
                        : number == 18
                        ? item.plan_18
                        : number == 19
                        ? item.plan_19
                        : number == 20
                        ? item.plan_20
                        : number == 21
                        ? item.plan_21
                        : number == 22
                        ? item.plan_22
                        : number == 23
                        ? item.plan_23
                        : number == 24
                        ? item.plan_24
                        : number == 25
                        ? item.plan_25
                        : number == 26
                        ? item.plan_26
                        : number == 27
                        ? item.plan_27
                        : number == 28
                        ? item.plan_28
                        : number == 29
                        ? item.plan_29
                        : number == 30
                        ? item.plan_30
                        : number == 31
                        ? item.plan_31
                        : ""
                    }}
                  </td>
                </tr>
                <tr>
                  <td>Actual</td>
                  <td
                    v-for="number in range(
                      parseInt(dates[0] ? dates[0].substr(8, 10) : 0),
                      parseInt(dates[1] ? dates[1].substr(8, 10) : 0)
                    )"
                    :key="number"
                    class="text-center"
                  >
                    {{
                      number == "01"
                        ? item.act_01
                        : number == "02"
                        ? item.act_02
                        : number == "03"
                        ? item.act_03
                        : number == "04"
                        ? item.act_04
                        : number == "05"
                        ? item.act_05
                        : number == "06"
                        ? item.act_06
                        : number == "07"
                        ? item.act_07
                        : number == "08"
                        ? item.act_08
                        : number == "09"
                        ? item.act_09
                        : number == 10
                        ? item.act_10
                        : number == 11
                        ? item.act_11
                        : number == 12
                        ? item.act_12
                        : number == 13
                        ? item.act_13
                        : number == 14
                        ? item.act_14
                        : number == 15
                        ? item.act_15
                        : number == 16
                        ? item.act_16
                        : number == 17
                        ? item.act_17
                        : number == 18
                        ? item.act_18
                        : number == 19
                        ? item.act_19
                        : number == 20
                        ? item.act_20
                        : number == 21
                        ? item.act_21
                        : number == 22
                        ? item.act_22
                        : number == 23
                        ? item.act_23
                        : number == 24
                        ? item.act_24
                        : number == 25
                        ? item.act_25
                        : number == 26
                        ? item.act_26
                        : number == 27
                        ? item.act_27
                        : number == 28
                        ? item.act_28
                        : number == 29
                        ? item.act_29
                        : number == 30
                        ? item.act_30
                        : number == 31
                        ? item.act_31
                        : ""
                    }}
                  </td>
                </tr>
                <tr>
                  <td class="krem">Diff</td>
                  <td
                    v-for="number in range(
                      parseInt(dates[0] ? dates[0].substr(8, 10) : 0),
                      parseInt(dates[1] ? dates[1].substr(8, 10) : 0)
                    )"
                    :key="number"
                    class="text-center krem"
                    :class="
                      number == '01' && parseInt(item.total_01) < 0
                        ? 'text-red-500 font-weight-bold'
                        : number == '02' &&
                          parseInt(item.total_01) + parseInt(item.total_02) < 0
                        ? 'text-red-500 font-weight-bold'
                        : number == '03' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '04' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '05' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '06' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '07' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '08' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '09' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '10' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '11' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '12' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '13' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '13' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '14' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '15' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '16' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '17' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) +
                            parseInt(item.total_17) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '18' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) +
                            parseInt(item.total_17) +
                            parseInt(item.total_18) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == '19' &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) +
                            parseInt(item.total_17) +
                            parseInt(item.total_18) +
                            parseInt(item.total_19) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == 20 &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) +
                            parseInt(item.total_17) +
                            parseInt(item.total_18) +
                            parseInt(item.total_19) +
                            parseInt(item.total_20) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == 21 &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) +
                            parseInt(item.total_17) +
                            parseInt(item.total_18) +
                            parseInt(item.total_19) +
                            parseInt(item.total_20) +
                            parseInt(item.total_21) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == 22 &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) +
                            parseInt(item.total_17) +
                            parseInt(item.total_18) +
                            parseInt(item.total_19) +
                            parseInt(item.total_20) +
                            parseInt(item.total_21) +
                            parseInt(item.total_22) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == 23 &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) +
                            parseInt(item.total_17) +
                            parseInt(item.total_18) +
                            parseInt(item.total_19) +
                            parseInt(item.total_20) +
                            parseInt(item.total_21) +
                            parseInt(item.total_22) +
                            parseInt(item.total_23) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == 24 &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) +
                            parseInt(item.total_17) +
                            parseInt(item.total_18) +
                            parseInt(item.total_19) +
                            parseInt(item.total_20) +
                            parseInt(item.total_21) +
                            parseInt(item.total_22) +
                            parseInt(item.total_23) +
                            parseInt(item.total_24) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == 25 &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) +
                            parseInt(item.total_17) +
                            parseInt(item.total_18) +
                            parseInt(item.total_19) +
                            parseInt(item.total_20) +
                            parseInt(item.total_21) +
                            parseInt(item.total_22) +
                            parseInt(item.total_23) +
                            parseInt(item.total_24) +
                            parseInt(item.total_25) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == 26 &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) +
                            parseInt(item.total_17) +
                            parseInt(item.total_18) +
                            parseInt(item.total_19) +
                            parseInt(item.total_20) +
                            parseInt(item.total_21) +
                            parseInt(item.total_22) +
                            parseInt(item.total_23) +
                            parseInt(item.total_24) +
                            parseInt(item.total_25) +
                            parseInt(item.total_26) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == 27 &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) +
                            parseInt(item.total_17) +
                            parseInt(item.total_18) +
                            parseInt(item.total_19) +
                            parseInt(item.total_20) +
                            parseInt(item.total_21) +
                            parseInt(item.total_22) +
                            parseInt(item.total_23) +
                            parseInt(item.total_24) +
                            parseInt(item.total_25) +
                            parseInt(item.total_26) +
                            parseInt(item.total_27) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == 28 &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) +
                            parseInt(item.total_17) +
                            parseInt(item.total_18) +
                            parseInt(item.total_19) +
                            parseInt(item.total_20) +
                            parseInt(item.total_21) +
                            parseInt(item.total_22) +
                            parseInt(item.total_23) +
                            parseInt(item.total_24) +
                            parseInt(item.total_25) +
                            parseInt(item.total_26) +
                            parseInt(item.total_27) +
                            parseInt(item.total_28) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == 29 &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) +
                            parseInt(item.total_17) +
                            parseInt(item.total_18) +
                            parseInt(item.total_19) +
                            parseInt(item.total_20) +
                            parseInt(item.total_21) +
                            parseInt(item.total_22) +
                            parseInt(item.total_23) +
                            parseInt(item.total_24) +
                            parseInt(item.total_25) +
                            parseInt(item.total_26) +
                            parseInt(item.total_27) +
                            parseInt(item.total_28) +
                            parseInt(item.total_29) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == 30 &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) +
                            parseInt(item.total_17) +
                            parseInt(item.total_18) +
                            parseInt(item.total_19) +
                            parseInt(item.total_20) +
                            parseInt(item.total_21) +
                            parseInt(item.total_22) +
                            parseInt(item.total_23) +
                            parseInt(item.total_24) +
                            parseInt(item.total_25) +
                            parseInt(item.total_26) +
                            parseInt(item.total_27) +
                            parseInt(item.total_28) +
                            parseInt(item.total_29) +
                            parseInt(item.total_30) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : number == 31 &&
                          parseInt(item.total_01) +
                            parseInt(item.total_02) +
                            parseInt(item.total_03) +
                            parseInt(item.total_04) +
                            parseInt(item.total_05) +
                            parseInt(item.total_06) +
                            parseInt(item.total_07) +
                            parseInt(item.total_08) +
                            parseInt(item.total_09) +
                            parseInt(item.total_10) +
                            parseInt(item.total_11) +
                            parseInt(item.total_12) +
                            parseInt(item.total_13) +
                            parseInt(item.total_14) +
                            parseInt(item.total_15) +
                            parseInt(item.total_16) +
                            parseInt(item.total_17) +
                            parseInt(item.total_18) +
                            parseInt(item.total_19) +
                            parseInt(item.total_20) +
                            parseInt(item.total_21) +
                            parseInt(item.total_22) +
                            parseInt(item.total_23) +
                            parseInt(item.total_24) +
                            parseInt(item.total_25) +
                            parseInt(item.total_26) +
                            parseInt(item.total_27) +
                            parseInt(item.total_28) +
                            parseInt(item.total_29) +
                            parseInt(item.total_30) +
                            parseInt(item.total_31) <
                            0
                        ? 'text-red-500 font-weight-bold'
                        : ''
                    "
                  >
                    {{
                      number == 1
                        ? parseInt(item.total_01)
                        : number == 2
                        ? parseInt(item.total_01) + parseInt(item.total_02)
                        : number == 3
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03)
                        : number == 4
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04)
                        : number == 5
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05)
                        : number == 6
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06)
                        : number == 7
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07)
                        : number == 8
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08)
                        : number == 9
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09)
                        : number == 10
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10)
                        : number == 11
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11)
                        : number == 12
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12)
                        : number == 13
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13)
                        : number == 14
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14)
                        : number == 15
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15)
                        : number == 16
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16)
                        : number == 17
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16) +
                          parseInt(item.total_17)
                        : number == 18
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16) +
                          parseInt(item.total_17) +
                          parseInt(item.total_18)
                        : number == 19
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16) +
                          parseInt(item.total_17) +
                          parseInt(item.total_18) +
                          parseInt(item.total_19)
                        : number == 20
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16) +
                          parseInt(item.total_17) +
                          parseInt(item.total_18) +
                          parseInt(item.total_19) +
                          parseInt(item.total_20)
                        : number == 21
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16) +
                          parseInt(item.total_17) +
                          parseInt(item.total_18) +
                          parseInt(item.total_19) +
                          parseInt(item.total_20) +
                          parseInt(item.total_21)
                        : number == 22
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16) +
                          parseInt(item.total_17) +
                          parseInt(item.total_18) +
                          parseInt(item.total_19) +
                          parseInt(item.total_20) +
                          parseInt(item.total_21) +
                          parseInt(item.total_22)
                        : number == 23
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16) +
                          parseInt(item.total_17) +
                          parseInt(item.total_18) +
                          parseInt(item.total_19) +
                          parseInt(item.total_20) +
                          parseInt(item.total_21) +
                          parseInt(item.total_22) +
                          parseInt(item.total_23)
                        : number == 24
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16) +
                          parseInt(item.total_17) +
                          parseInt(item.total_18) +
                          parseInt(item.total_19) +
                          parseInt(item.total_20) +
                          parseInt(item.total_21) +
                          parseInt(item.total_22) +
                          parseInt(item.total_23) +
                          parseInt(item.total_24)
                        : number == 25
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16) +
                          parseInt(item.total_17) +
                          parseInt(item.total_18) +
                          parseInt(item.total_19) +
                          parseInt(item.total_20) +
                          parseInt(item.total_21) +
                          parseInt(item.total_22) +
                          parseInt(item.total_23) +
                          parseInt(item.total_24) +
                          parseInt(item.total_25)
                        : number == 26
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16) +
                          parseInt(item.total_17) +
                          parseInt(item.total_18) +
                          parseInt(item.total_19) +
                          parseInt(item.total_20) +
                          parseInt(item.total_21) +
                          parseInt(item.total_22) +
                          parseInt(item.total_23) +
                          parseInt(item.total_24) +
                          parseInt(item.total_25) +
                          parseInt(item.total_26)
                        : number == 27
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16) +
                          parseInt(item.total_17) +
                          parseInt(item.total_18) +
                          parseInt(item.total_19) +
                          parseInt(item.total_20) +
                          parseInt(item.total_21) +
                          parseInt(item.total_22) +
                          parseInt(item.total_23) +
                          parseInt(item.total_24) +
                          parseInt(item.total_25) +
                          parseInt(item.total_26) +
                          parseInt(item.total_27)
                        : number == 28
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16) +
                          parseInt(item.total_17) +
                          parseInt(item.total_18) +
                          parseInt(item.total_19) +
                          parseInt(item.total_20) +
                          parseInt(item.total_21) +
                          parseInt(item.total_22) +
                          parseInt(item.total_23) +
                          parseInt(item.total_24) +
                          parseInt(item.total_25) +
                          parseInt(item.total_26) +
                          parseInt(item.total_27) +
                          parseInt(item.total_28)
                        : number == 29
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16) +
                          parseInt(item.total_17) +
                          parseInt(item.total_18) +
                          parseInt(item.total_19) +
                          parseInt(item.total_20) +
                          parseInt(item.total_21) +
                          parseInt(item.total_22) +
                          parseInt(item.total_23) +
                          parseInt(item.total_24) +
                          parseInt(item.total_25) +
                          parseInt(item.total_26) +
                          parseInt(item.total_27) +
                          parseInt(item.total_28) +
                          parseInt(item.total_29)
                        : number == 30
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16) +
                          parseInt(item.total_17) +
                          parseInt(item.total_18) +
                          parseInt(item.total_19) +
                          parseInt(item.total_20) +
                          parseInt(item.total_21) +
                          parseInt(item.total_22) +
                          parseInt(item.total_23) +
                          parseInt(item.total_24) +
                          parseInt(item.total_25) +
                          parseInt(item.total_26) +
                          parseInt(item.total_27) +
                          parseInt(item.total_28) +
                          parseInt(item.total_29) +
                          parseInt(item.total_30)
                        : number == 31
                        ? parseInt(item.total_01) +
                          parseInt(item.total_02) +
                          parseInt(item.total_03) +
                          parseInt(item.total_04) +
                          parseInt(item.total_05) +
                          parseInt(item.total_06) +
                          parseInt(item.total_07) +
                          parseInt(item.total_08) +
                          parseInt(item.total_09) +
                          parseInt(item.total_10) +
                          parseInt(item.total_11) +
                          parseInt(item.total_12) +
                          parseInt(item.total_13) +
                          parseInt(item.total_14) +
                          parseInt(item.total_15) +
                          parseInt(item.total_16) +
                          parseInt(item.total_17) +
                          parseInt(item.total_18) +
                          parseInt(item.total_19) +
                          parseInt(item.total_20) +
                          parseInt(item.total_21) +
                          parseInt(item.total_22) +
                          parseInt(item.total_23) +
                          parseInt(item.total_24) +
                          parseInt(item.total_25) +
                          parseInt(item.total_26) +
                          parseInt(item.total_27) +
                          parseInt(item.total_28) +
                          parseInt(item.total_29) +
                          parseInt(item.total_30) +
                          parseInt(item.total_31)
                        : ""
                    }}
                  </td>
                </tr>
              </template>
            </v-data-table>
            <v-dialog v-model="dialog.datePicker" width="300px">
              <v-date-picker
                width="300px"
                v-model="dates"
                range
              ></v-date-picker>
              <v-btn
                color="blue darken-1"
                dark
                @click="
                  [
                    fetchReportAchievementWeekday(dates),
                    fetchMutasiAndon(dates),
                  ]
                "
              >
                Show Data
              </v-btn>
            </v-dialog>
          </v-card>
        </v-window-item>
      </v-window>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, shallowRef, reactive, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useReportStockStore } from "@/pinia/admin/production/stamping/reportStock.js";
import { useUtilityStore } from "@/pinia/utility";
import { useNotificationStore } from "@/pinia/notification";
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import * as XLSX from "xlsx";

const tab = ref("summary");
const page = ref({ title: 'Achievement Andon Page' });
const breadcrumbs = shallowRef([
    { 
      title: "Report", 
      disabled: false, 
      href: "#" 
    },
    { 
      title: "Stamping", 
      disabled: false, 
      href: "#" 
    },
    { 
      title: "Achievement Andon", 
      disabled: true, 
      href: "achievement" 
    },
]);

// STORES
const reportStore = useReportStockStore();
const utilityStore = useUtilityStore();
const notificationStore = useNotificationStore();

// REFS from stores
const { 
  datatablesPress,
  datatablesMutasi,
  datatablesUploadMDFO,
  tipeData,
  detail,
  formData,
  permissions,
  dialog
} = storeToRefs(reportStore);

// LOCAL STATE
const dates = ref([
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .substr(0, 10),

  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .substr(0, 10),
]);

const excel = ref(null);
const loading = ref(false);
const error = ref(0);

// METHODS FROM STORES
const { 
  dateMonthFull,
  formatDecimaltoNumber,
  formatNumberOneDecimal,
  formatPercent
} = utilityStore;

const {
  fetchReportAchievementWeekday,
  fetchMutasiAndon,
  filteredItems,
  filteredItemsMutasi,
  loadDetail,
  onUploadMDFO
} = reportStore;

// HELPERS
function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
}

function onDelete() {
  excel.value = null;
  datatablesUploadMDFO.value.items = [];
  dialog.value.upload = false;
}

function openFile() {
  document.getElementById("excelInput").click();
}

function handleFileUpload(e) {
  loading.value = true;
  const file = e.target.files[0];
  excel.value = file?.name ?? "";

  const reader = new FileReader();
  error.value = 0;

  reader.onloadend = () => {
    try {
      const read = new Uint8Array(reader.result);
      const wb = XLSX.read(read, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const keys = ["part_number", "status", "line", "process", "mdfo", "gsph"];
      const items = [];

      data.slice(1).forEach(row => {
        const item = { ERROR: "", ERROR_UPLOAD: "" };

        keys.forEach((key, i) => {
          item[key] = row[i] ?? "";
        });

        if (!item.part_number) {
          error.value++;
          item.ERROR += (item.ERROR ? ",\n" : "") + "Period tidak boleh kosong.";
        }
        if (!item.mdfo) {
          error.value++;
          item.ERROR += (item.ERROR ? ",\n" : "") + "Line tidak boleh kosong.";
        }
        if (!item.gsph) {
          error.value++;
          item.ERROR += (item.ERROR ? ",\n" : "") + "Patan tidak boleh kosong.";
        }

        items.push(item);
      });

      datatablesUploadMDFO.value.items = items;
      dialog.value.upload = true;
    } catch (err) {
      notificationStore.showDialogWarning('Warning',"Cek Kembali Data yang akan diupload");
    }

    setTimeout(() => {
      loading.value = false;
      e.target.value = null; // reset input
    }, 800);
  };

  reader.readAsArrayBuffer(file);
}

// MOUNTED
onMounted(() => {
  fetchReportAchievementWeekday(dates.value);
  fetchMutasiAndon(dates.value);
});
</script>

<!-- <script>
import { useConfigStore } from "@/pinia/config";
import { useReportStockStore } from "@/pinia/admin/production/stamping/reportStock.js";
import { useUtilityStore } from "@/pinia/utility";
import { useNotificationStore } from "@/pinia/notification";
import { mapActions, mapState, mapWritableState } from "pinia";
import * as XLSX from "xlsx";

const notificationStore = useNotificationStore();
export default {
  data: () => ({
    dates: [
      new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .substr(0, 10),
      new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .substr(0, 10),
    ],
  }),

  computed: {
    ...mapState(useConfigStore, ["page", "apiUrl"]),
    ...mapState(useReportStockStore, [
      "datatablesPress",
      "datatablesMutasi",
      "datatablesUploadMDFO",
      "tipeData",
      "detail",
      "formData",
    ]),
    ...mapWritableState(useReportStockStore, ["permissions", "dialog"]),
  },
  mounted() {
    this.fetchReportAchievementWeekday(this.dates);
    this.fetchMutasiAndon(this.dates);
    this.page.navigations = [
      {
        text: "Dashboard",
        disabled: false,
        href: "/",
      },
      {
        text: "Report",
        disabled: true,
        href: "",
      },
      {
        text: "Stamping",
        disabled: true,
        href: "",
      },
      {
        text: "Achievement Andon",
        disabled: true,
        href: "achievement",
      },
    ];
    this.page.name = "Report Andon Achievement Stamping";
  },
  methods: {
    ...mapActions(useUtilityStore, [
      "dateMonthFull",
      "formatDecimaltoNumber",
      "formatNumberOneDecimal",
    ]),
    ...mapActions(useReportStockStore, [
      "fetchReportAchievementWeekday",
      "fetchMutasiAndon",
      "filteredItems",
      "filteredItemsMutasi",
      "loadDetail",
      "onUploadMDFO",
    ]), 
    range(start, end) {
      return Array.from(
        { length: end - start + 1 },
        (_, index) => start + index
      );
    },
    onDelete() {
      this.$refs.excel.value = null;
      this.datatablesUploadMDFO.items = [];
      this.dialog.upload = false;
    },
    openFile() {
      this.$refs.excel.click();
    },
    handleFileUpload(e) {
      this.loading = true;
      const excel = e.target.files[0];
      this.excel = excel.name;
      const reader = new FileReader();

      const vm = this;
      this.error = 0;
      reader.onloadend = () => {
        const read = new Uint8Array(reader.result);
        const wb = XLSX.read(read, { type: "array" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const keys = ["part_number", "status","line", "process", "mdfo", "gsph"];
        let items = [];
        data.slice(1).map((rows) => {
          try {
            let item = {};
            item["ERROR"] = "";
            item["ERROR_UPLOAD"] = "";
            keys.map((key, i) => {
              item[key] = rows[i] ? rows[i] : "";
            });
            if (!item["part_number"]) {
              vm.error++;
              item["ERROR"] =
                (item["ERROR"] ? item["ERROR"] + ", \n" : "") +
                "Period tidak boleh kosong.";
            }
            if (!item["mdfo"]) {
              vm.error++;
              item["ERROR"] =
                (item["ERROR"] ? item["ERROR"] + ", \n" : "") +
                "Line tidak boleh kosong.";
            }
            if (!item["gsph"]) {
              vm.error++;
              item["ERROR"] =
                (item["ERROR"] ? item["ERROR"] + ", \n" : "") +
                "Patan tidak boleh kosong.";
            }
            items.push(item);
          } catch (error) {
            notificationStore.showAlertWarning(
              "Cek Kembali Data yang akan diupload"
            );
          }
        });
        vm.datatablesUploadMDFO.items = items;
        this.dialog.upload = true;
        setTimeout(() => {
          vm.loading = false;
          this.$refs.excel.value = null;
        }, 1000);
      };
      reader.readAsArrayBuffer(excel);
    },
  },
};
</script> -->

<style scoped>
.krem {
  background-color: #fffde7;
}
#mutasi .v-data-table > .v-data-table__wrapper > table > tbody > tr > td {
  height: 26px !important;
  border: #cecece 1px solid;
  /* width: 10px !important; */
  padding: 4px 8px !important;
}
#mutasi .v-data-table > .v-data-table__wrapper > table > tbody > tr > th {
  /* padding: 4px !important; */
  font-size: 18px !important;
}
/* .v-tab--active {
  background-color: #ffff !important;
  color: #1976d2 !important;
  border-radius: 16px 16px 0 0 !important;
} */
.theme--light.v-tabs > .v-tabs-bar .v-tab:not(.v-tab--active) {
  color: #ffff !important;
}
.no-wrap {
  white-space: nowrap !important;
}
.satuan {
  font-size: 0.8rem !important;
}
.hijau {
  background-color: #7db341;
}
.biru {
  background-color: #42A5F5;
}
.colappse {
  border-collapse: collapse !important;
}
.colappse th,
.colappse td {
  border: #2b2e37 2px solid !important;
}
.colappse th {
  padding: 8px !important;
}
th {
  padding: 16px;
  font-size: 18px !important;
}
td {
  font-size: 18px !important;
}
/* table {
  border-collapse: collapse;
  width: 100%;
  background-color: #fff;
  border-spacing: 0;
} */

/* thead th {
  background-color: #d3d3d3;
  border: 2px solid #616161; 
} */
thead tr {
  border-bottom: 2px solid #e0e0e0;
  transition: background-color 0.2s ease;
}
tbody tr {
  border-bottom: 2px solid #e0e0e0;
  transition: background-color 0.2s ease;
}
tr:last-child {
  border-bottom: none;
}
tr:nth-child(even) {
  background-color: #fafafa;
}
header-1 tr:hover {
  background-color: #dbeafe !important;
}
tbody tr:hover {
  background-color: #eef6ff !important;
}
td {
  border-bottom: 2px solid #e0e0e0;
  padding: 10px 14px;
  font-size: 0.85rem;
  white-space: nowrap;
  /* color: #374151; */
}
td {
  white-space: nowrap;
}
</style>
