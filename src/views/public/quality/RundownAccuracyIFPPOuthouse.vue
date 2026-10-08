<script>
import moment from "moment";

export default {
  name: "RundownAccuracyIFPPOuthouse",

  data() {
    return {
      id: "",
      interval: null,
      refreshInterval: null,
      waktu: null,
      tanggal: null,

      // ============ Dialog & detail table state ============
      dialog: {
        detailItem: false,
      },
      tableDetail: {
        type: "",
        model: [""],
        car_name: "",
        customer: "",
        project_detail: null,
        items: [],
      },

      // ============ Data customer/model ============
      customers: [
        { name: "ADM PLANT 1", ZCUST: "ADM1", alias: "SAP", group: "1", model: ["D40D"], model_detail: "PICK UP", car_name: "GRAN MAX",             ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 3,  sa: 0,  module: 0,  total: 3, acc_std: 3, acc_mid: 0, acc_kritis: 0, acc_total: 3 },
        { name: "ADM PLANT 1", ZCUST: "ADM1", alias: "SAP", group: "1", model: ["D40D"], model_detail: "VAN",     car_name: "GRAN MAX",             ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 2,  sa: 3,  module: 0,  total: 5, acc_std: 4, acc_mid: 1, acc_kritis: 0, acc_total: 5 },
        { name: "ADM PLANT 4", ZCUST: "ADM4", alias: "SAP", group: "1", model: ["D14N"], model_detail: null,      car_name: "TERIOS / RUSH",        ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 19, sa: 11, module: 0,  total: 30, acc_std: 27, acc_mid: 3, acc_kritis: 0, acc_total: 30 },
        { name: "ADM PLANT 4", ZCUST: "ADM4", alias: "SAP", group: "1", model: ["D40D"], model_detail: "PICK UP", car_name: "GRAN MAX",             ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 7,  sa: 1,  module: 0,  total: 8, acc_std: 7, acc_mid: 1, acc_kritis: 0, acc_total: 8 },
        { name: "ADM PLANT 4", ZCUST: "ADM4", alias: "SAP", group: "1", model: ["D40D"], model_detail: "VAN",     car_name: "GRAN MAX",             ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 12, sa: 5,  module: 0,  total: 17, acc_std: 15, acc_mid: 2, acc_kritis: 0, acc_total: 17 },
        { name: "ADM PLANT 5", ZCUST: "ADM5", alias: "KAP", group: "1", model: ["D26A"], model_detail: null,      car_name: "XENIA / AVANZA",       ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 12, sa: 11, module: 0,  total: 23, acc_std: 21, acc_mid: 2, acc_kritis: 0, acc_total: 23 },
        { name: "ADM PLANT 5", ZCUST: "ADM5", alias: "KAP", group: "1", model: ["D30D"], model_detail: null,      car_name: "SIGRA / CALYA",        ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 20, sa: 5,  module: 0,  total: 25, acc_std: 23, acc_mid: 2, acc_kritis: 0, acc_total: 25 },
        { name: "ADM PLANT 5", ZCUST: "ADM5", alias: "KAP", group: "1", model: ["D55L"], model_detail: null,      car_name: "ROCKY / RAIZE",        ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 23, sa: 4,  module: 0,  total: 27, acc_std: 24, acc_mid: 3, acc_kritis: 0, acc_total: 27 },
        { name: "ADM PLANT 5", ZCUST: "ADM5", alias: "KAP", group: "1", model: ["D74A"], model_detail: null,      car_name: "AYLA / AGYA",          ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 12, sa: 2,  module: 0,  total: 14, acc_std: 13, acc_mid: 1, acc_kritis: 0, acc_total: 14 },
        // { name: "ADM SUNTER CKD", ZCUST: "DCWA", alias: "SAP", group: "1", model: ["D40D"], model_detail: "VAN",  ltq: { dies_set: 1, dies_due: "2026-04-02", jig_set: 0, jig_due: "0" } }, // tidak ada di response API
        { name: "TMMIN", ZCUST: "TMMIN", ZCUST2: "TMMIN", alias: "TMMIN", group: "1", model: ["D26A"], model_detail: null, car_name: "XENIA / AVANZA", ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 6,  sa: 1,  module: 0,  total: 7, acc_std: 6, acc_mid: 1, acc_kritis: 0, acc_total: 7 },
        { name: "TMMIN", ZCUST: "TMMIN", alias: "TMMIN", group: "1", model: ["D03B"], model_detail: null,         car_name: "YARIS CROSS",          ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 8,  sa: 0,  module: 0,  total: 8, acc_std: 7, acc_mid: 1, acc_kritis: 0, acc_total: 8 },
        { name: "MMKI",  ZCUST: "MMKI",  alias: "MMKI",  group: "2", model: ["SL"],    model_detail: null,        car_name: "L300",                 ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 7,  sa: 1,  module: 0,  total: 8, acc_std: 7, acc_mid: 1, acc_kritis: 0, acc_total: 8 },
        { name: "MKM",   ZCUST: "MKM",   alias: "MKM",   group: "2", model: ["TD"],    model_detail: null,        car_name: "CANTER / COLT DIESEL", ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 9,  sa: 0,  module: 0,  total: 9, acc_std: 8, acc_mid: 1, acc_kritis: 0, acc_total: 9 },
        { name: "MKM",   ZCUST: "MKM",   alias: "MKM",   group: "2", model: ["SL"],    model_detail: null,        car_name: "L300",                 ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 9,  sa: 5,  module: 0,  total: 14, acc_std: 12, acc_mid: 2, acc_kritis: 0, acc_total: 14 },
        { name: "HMMI",  ZCUST: "HMMI",  alias: "HMMI",  group: "2", model: ["SU2ID"], model_detail: "RHD",       car_name: "CRETA",                ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 4,  sa: 0,  module: 7,  total: 11, acc_std: 10, acc_mid: 1, acc_kritis: 0, acc_total: 11 },
        { name: "HMMI",  ZCUST: "HMMI",  alias: "HMMI",  group: "2", model: ["SU2ID"], model_detail: "LHD",       car_name: "CRETA",                ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 29, sa: 0,  module: 28, total: 57, acc_std: 52, acc_mid: 5, acc_kritis: 0, acc_total: 57 },
        { name: "HMMI",  ZCUST: "HMMI",  alias: "HMMI",  group: "2", model: ["KS"],    model_detail: "RHD",       car_name: "STARGAZER",            ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 6,  sa: 0,  module: 2,  total: 8, acc_std: 7, acc_mid: 1, acc_kritis: 0, acc_total: 8 },
        { name: "HMMI",  ZCUST: "HMMI",  alias: "HMMI",  group: "2", model: ["KS"],    model_detail: "LHD",       car_name: "STARGAZER",            ltq: { dies_set: 0, dies_due: "0", jig_set: 0, jig_due: "0" }, pct: { reject: 0, repair: 0 }, semi_sa: 17, sa: 0,  module: 7,  total: 24, acc_std: 22, acc_mid: 2, acc_kritis: 0, acc_total: 24 },
        { name: "TOTAL", ZCUST: "TOTAL", alias: "TOTAL", group: "2", model: [""],       model_detail: null,        car_name: "",                     ltq: null, pct: null },
      ],

      rowspanMap: {},
    };
  },

  created() {
    this.interval = setInterval(() => {
      this.waktu = moment().format("HH:mm:ss");
      this.tanggal = moment().format("DD MMMM YYYY");
    }, 1000);
    this.calculateRowSpan();
  },

  beforeUnmount() {
    clearInterval(this.interval);
  },

  methods: {
    // ============ Stock lookup dari dummy data ============
    stockInfo(model, customer, model_detail = null, key) {
      if (customer === 'TOTAL') {
        return this.customers
          .filter((c) => c.name !== 'TOTAL' && c[key] !== undefined)
          .reduce((acc, c) => acc + (Number(c[key]) || 0), 0);
      }
      const found = this.customers.find(
        (c) => c.model[0] === model[0] && c.name === customer && c.model_detail === model_detail,
      );
      return found ? (found[key] ?? 0) : 0;
    },

    calculateRowSpan() {
      this.customers.forEach((customer, index) => {
        if (this.shouldDisplayCustomerName(index, customer.name)) {
          let rowCount = 1;
          for (let i = index + 1; i < this.customers.length; i++) {
            if (this.customers[i].name === customer.name) {
              rowCount++;
            } else {
              break;
            }
          }
          this.rowspanMap[customer.name] = rowCount;
        }
      });
    },

    shouldDisplayCustomerName(index, currentName) {
      return index === 0 || this.customers[index - 1].name !== currentName;
    },

    formatSapDate(str) {
      if (str == "00000000" || str == "" || !str) {
        return "";
      } else {
        return new Date(
          parseInt(str.slice(0, 4)), // year
          parseInt(str.slice(4, 6)) - 1, // month (0-indexed)
          parseInt(str.slice(6, 8)), // day
        ).toLocaleDateString("id-ID");
      }
    },

    getRowSpan(customerName) {
      return this.rowspanMap[customerName] || 1;
    },

    // ============ Format due date — right-aligned, "0" sejajar dengan "n" terakhir bulan ============
    formatDueDate(str) {
      if (!str || str === "0") return "0";
      const bulan = ["jan", "feb", "mar", "apr", "mei", "jun", "jul", "agu", "sep", "okt", "nov", "des"];
      const d = new Date(str);
      if (isNaN(d.getTime())) return "0";
      return `${d.getDate()}-${bulan[d.getMonth()]}`;
    },

    formatNumber(num) {
      return new Intl.NumberFormat("id-ID").format(num);
    },

    formatPercent(num) {
      return num.toFixed(2).replace(".", ",") + "%";
    },

    // ============ Detail-item dari API item_detail_accuracy_ifpp ============
    async viewDetailItemIFPP(model, customer, model_detail, type, car_name) {
      this.tableDetail.type = type;
      this.tableDetail.model = model;
      this.tableDetail.car_name = car_name || "";
      this.tableDetail.customer = customer;
      this.tableDetail.project_detail = model_detail;
      this.tableDetail.items = [];

      this.dialog.detailItem = true;
    },
  },

  computed: {
    ltqTotal() {
      return this.customers
        .filter((c) => c.ltq !== null)
        .reduce(
          (acc, c) => ({
            dies_set:  acc.dies_set  + c.ltq.dies_set,
            dies_due:  acc.dies_due  + (c.ltq.dies_set && c.ltq.dies_due ? 1 : 0),
            jig_set:   acc.jig_set   + c.ltq.jig_set,
            jig_due:   acc.jig_due   + (c.ltq.jig_set && c.ltq.jig_due ? 1 : 0),
          }),
          { dies_set: 0, dies_due: 0, jig_set: 0, jig_due: 0 },
        );
    },
    pctTotal() {
      return this.customers
        .filter((c) => c.pct !== null && c.pct !== undefined)
        .reduce(
          (acc, c) => ({
            reject: acc.reject + c.pct.reject,
            repair: acc.repair + c.pct.repair,
          }),
          { reject: 0, repair: 0 },
        );
    },
    customersWithSigma() {
      return this.customers.map((c) => ({
        ...c,
        sigma: (c.finish || 0) + (c.wip || 0),
      }));
    },
    totalSigma() {
      return this.customers.reduce((acc, c) => acc + ((c.finish || 0) + (c.wip || 0)), 0);
    },
  },
};
</script>

<template>
  <div id="andon-container" class="w-full overflow-hidden bg-bgRoot text-left flex flex-col" style="height: 100vh">
    <!-- ===== Header ===== -->
    <div class="flex items-center justify-center pt-2 pb-0 m-0" style="flex: 0 0  auto">
      <div class="basis-1/4 text-left pl-6 pr-3 py-3 text-white">
        <img
          style="width: 55%"
          src="@/assets/images/MAJ-LOGO-3.png"
          alt="Logo"
          class="inline-block"
        />
      </div>
      <div class="basis-2/3 text-center teks judul uppercase text-white p-3 whitespace-nowrap">
        Report Accuracy IFPP Outhouse <span class="text-merah">(TRIAL)</span>
      </div>
      <div class="basis-1/4 text-right font-bold text-white pl-3 pr-6 py-3">
        <h5 class="tanggal">{{ tanggal }}</h5>
        <h5 class="digital">{{ waktu }}</h5>
      </div>
    </div>

    <!-- ===== Main Table ===== -->
    <div class="mx-3 px-2 flex items-center justify-center overflow-hidden" style="flex: 1 1 0">
      <table class="andon-table uppercase text-white -mb-2">
        <thead>
          <tr>
            <th rowspan="3" class="first-th">Customer</th>
            <th rowspan="3">Model</th>
            <th rowspan="3">Car Name</th>
            <th colspan="3">Type</th>
            <th rowspan="3">&Sigma; Item</th>
            <th rowspan="3">STD<br />&gt;95%</th>
            <th rowspan="3">90%<br />~<br />95%</th>
            <th rowspan="3">Kritis<br />&lt;90%</th>
            <th rowspan="3">&Sigma; Item</th>
            <th colspan="4">LTQ</th>
            <th colspan="2" class="last-th">%</th>
          </tr>
          <tr>
            <th rowspan="2" class="semi-th">Semi S/A</th>
            <th rowspan="2" class="semi-th">S/A</th>
            <th rowspan="2" class="module-th">Module</th>
            <th colspan="2">Dies</th>
            <th colspan="2">Jig</th>
            <th rowspan="2">Reject</th>
            <th rowspan="2">Repair</th>
          </tr>
          <tr>
            <th rowspan="1">Set</th>
            <th rowspan="1">Due Date</th>
            <th rowspan="1">Set</th>
            <th rowspan="1">Due Date</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(customer, index) in customers"
            :key="'customer_' + index"
            :class="customer.name == 'TOTAL' ? 'font-black' : ''"
          >
            <td
              v-if="shouldDisplayCustomerName(index, customer.name)"
              :rowspan="getRowSpan(customer.name)"
              :class="customer.name == 'TOTAL' ? 'last-td-left' : ''"
              :colspan="customer.name == 'TOTAL' ? 3 : 1"
            >
              {{ customer.name }}
            </td>
            <td v-if="customer.name != 'TOTAL'">
              {{ customer.model[0] }}
            </td>
            <td v-if="customer.name != 'TOTAL'">
              {{
                customer.car_name +
                (customer.model_detail
                  ? " (" + customer.model_detail + ")"
                  : "")
              }}
            </td>
            <td>
              <span class="center-right-align" style="width: 50px">
                {{
                  formatNumber(
                    stockInfo(
                      customer.model,
                      customer.name,
                      customer.model_detail,
                      "semi_sa",
                    ),
                  )
                }}
              </span>
            </td>
            <td>
              <span class="center-right-align" style="width: 50px">
                {{
                  formatNumber(
                    stockInfo(
                      customer.model,
                      customer.name,
                      customer.model_detail,
                      "sa",
                    ),
                  )
                }}
              </span>
            </td>
            <td>
              <span class="center-right-align" style="width: 50px">
                {{
                  formatNumber(
                    stockInfo(
                      customer.model,
                      customer.name,
                      customer.model_detail,
                      "module",
                    ),
                  )
                }}
              </span>
            </td>
            <td>
              <span class="center-right-align" style="width: 50px">
                {{
                  formatNumber(
                    stockInfo(
                      customer.model,
                      customer.name,
                      customer.model_detail,
                      "total",
                    ),
                  )
                }}
              </span>
            </td>
            <td
              class="text-hijau detail-cell"
              @click="
                customer.name != 'TOTAL'
                  ? viewDetailItemIFPP(
                      customer.model,
                      customer.name,
                      customer.model_detail,
                      'std',
                      customer.car_name,
                    )
                  : ''
              "
            >
              <span class="center-right-align" style="width: 50px">
                {{
                  formatNumber(
                    stockInfo(
                      customer.model,
                      customer.name,
                      customer.model_detail,
                      "acc_std",
                    ),
                  )
                }}
              </span>
            </td>
            <td
              class="text-biru detail-cell"
              @click="
                customer.name != 'TOTAL'
                  ? viewDetailItemIFPP(
                      customer.model,
                      customer.name,
                      customer.model_detail,
                      'mid',
                      customer.car_name,
                    )
                  : ''
              "
            >
              <span class="center-right-align" style="width: 50px">
                {{
                  formatNumber(
                    stockInfo(
                      customer.model,
                      customer.name,
                      customer.model_detail,
                      "acc_mid",
                    ),
                  )
                }}
              </span>
            </td>
            <td
              :class="
                stockInfo(
                  customer.model,
                  customer.name,
                  customer.model_detail,
                  'acc_kritis',
                ) > 0
                  ? 'text-merah'
                  : ''
              "
              class="detail-cell"
              @click="
                customer.name != 'TOTAL'
                  ? viewDetailItemIFPP(
                      customer.model,
                      customer.name,
                      customer.model_detail,
                      'kritis',
                      customer.car_name,
                    )
                  : ''
              "
            >
              <span class="center-right-align" style="width: 45px">
                {{
                  formatNumber(
                    stockInfo(
                      customer.model,
                      customer.name,
                      customer.model_detail,
                      "acc_kritis",
                    ),
                  )
                }}
              </span>
            </td>
            <td>
              <span class="center-right-align" style="width: 50px">
                {{
                  formatNumber(
                    stockInfo(
                      customer.model,
                      customer.name,
                      customer.model_detail,
                      "acc_total",
                    ),
                  )
                }}
              </span>
            </td>
            <td><span class="center-right-align" style="width: 90px">{{ customer.name === 'TOTAL' ? ltqTotal.dies_set  : customer.ltq.dies_set  }}</span></td>
            <td><span class="center-right-align" style="width: 130px">{{ customer.name === 'TOTAL' ? ltqTotal.dies_due : formatDueDate(customer.ltq.dies_due) }}</span></td>
            <td><span class="center-right-align" style="width: 90px">{{ customer.name === 'TOTAL' ? ltqTotal.jig_set   : customer.ltq.jig_set   }}</span></td>
            <td>
              <span class="center-right-align" style="width: 130px">{{ customer.name === 'TOTAL' ? ltqTotal.jig_due  : formatDueDate(customer.ltq.jig_due) }}</span>
            </td>
            <td><span class="center-right-align" style="width: 90px">{{ formatPercent(customer.name === 'TOTAL' ? pctTotal.reject : customer.pct.reject) }}</span></td>
            <td :class="index === customers.length - 1 ? 'last-td-right' : ''">
              <span class="center-right-align" style="width: 90px">{{ formatPercent(customer.name === 'TOTAL' ? pctTotal.repair : customer.pct.repair) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===== Marquee ===== -->
    <div class="flex items-center justify-center pt-0 pb-2 m-0" style="flex: 0 0 auto">
      <div class="w-full text-white marquee-footer py-3">
        <marquee width="100%" direction="left" scrollamount="8">
          1. Kepuasan konsumen adalah komitmen kami. 2. Proaktif, kepedulian, dan
          komunikasi yang baik adalah kebiasaan kami. 3. Kerja tim adalah kekuatan
          kami. 4. Pemasok, distributor, dan karyawan adalah mitra kami. 5. Terus
          mengembangkan diri adalah kunci sukses kami.
        </marquee>
      </div>
    </div>

    <!-- ===== Modal Detail Item ===== -->
    <div
      v-if="dialog.detailItem"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      @click.self="dialog.detailItem = false"
    >
      <div
        class="bg-cardDark text-white rounded-2xl w-auto max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div class="px-6 pt-4 pb-3 uppercase">
          <h3 class="text-xl font-semibold">
            <span
              :class="
                tableDetail.type == 'kritis'
                  ? 'text-merah'
                  : tableDetail.type == 'mid'
                  ? 'text-biru'
                  : 'text-hijau'
              "
            >
              {{
                tableDetail.type == 'kritis'
                  ? 'KRITIS <90%'
                  : tableDetail.type == 'mid'
                  ? 'MID 90%~95%'
                  : 'STD >95%'
              }}
            </span>
            &mdash; MODEL {{ Array.isArray(tableDetail.model) ? tableDetail.model[0] : tableDetail.model }}
            {{ tableDetail.car_name ? '/ ' + tableDetail.car_name : '' }}
            &mdash; CUSTOMER {{ tableDetail.customer }}
          </h3>
        </div>

        <hr class="divider-line mx-6" />

        <div class="px-6 pb-3 overflow-auto">
          <table class="detail-table w-full mt-2">
            <thead>
              <tr>
                <th class="first-th bg-thbg text-thtext">No</th>
                <th class="bg-thbg text-thtext">Part Number</th>
                <th class="bg-thbg text-thtext">Single/Assy</th>
                <th class="bg-thbg text-thtext">Surface</th>
                <th class="bg-thbg text-thtext">Hole</th>
                <th class="bg-thbg text-thtext">Trimline</th>
                <th class="bg-thbg text-thtext">Appearance</th>
                <th class="last-th bg-thbg text-thtext">Passrate</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="tableDetail.items.length == 0">
                <td colspan="8" class="last-td-left last-td-right bg-tdbg text-tdtext text-center py-3">
                  NO DATA
                </td>
              </tr>
              <tr v-for="(item, index) in tableDetail.items" :key="index">
                <td
                  :class="index + 1 == tableDetail.items.length ? 'last-td-left' : ''"
                  class="bg-tdbg text-tdtext text-center"
                >
                  {{ index + 1 }}
                </td>
                <td class="bg-tdbg text-tdtext text-center">{{ item.MATNR }}</td>
                <td class="bg-tdbg text-tdtext text-center">{{ item.SINGLE_ASSY }}</td>
                <td class="bg-tdbg text-tdtext text-center">{{ item.SURFACE }}</td>
                <td class="bg-tdbg text-tdtext text-center">{{ item.HOLE }}</td>
                <td class="bg-tdbg text-tdtext text-center">{{ item.TRIMLINE }}</td>
                <td class="bg-tdbg text-tdtext text-center">{{ item.APPEARANCE }}</td>
                <td
                  :class="[
                    index + 1 == tableDetail.items.length ? 'last-td-right' : '',
                    tableDetail.type === 'std' ? 'text-hijau' : tableDetail.type === 'mid' ? 'text-biru' : 'text-merah',
                  ]"
                  class="bg-tdbg text-center"
                >
                  {{ (parseFloat(item.PASSRATE) * 100).toFixed(1) }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="px-6 py-3 flex justify-end">
          <button
            @click="dialog.detailItem = false"
            class="flex items-center gap-1 bg-merah hover:bg-red-600 text-white font-medium px-4 py-2 rounded-md transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.bg-bgRoot { background-color: #100f0f; }
.bg-cardDark { background-color: #393a41; }
.bg-thbg { background-color: #0f4c75 !important; }
.text-thtext { color: #fdcb9e; }
.bg-tdbg { background-color: #101213; }
.text-tdtext { color: #ececec; }
.text-hijau { color: #00c853 !important; }
.text-merah { color: #e53935 !important; }
.text-biru  { color: #2196f3 !important; }
.text-mermud { color: #cf7272; }
.bg-merah { background-color: #e53935; }

.teks {
  font-family: Poppins !important;
  font-size: 3.1rem;
}

.judul {
  font-size: 4rem;
  font-weight: normal;
}

.marquee-footer {
  font-family: Poppins;
  font-size: 1.5rem;
  width: 100%;
}

.center-right-align {
  display: inline-block;
  margin: 0 auto;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-family: Roboto, "Segoe UI", sans-serif;
}
.center-left-align {
  display: inline-block;
  margin: 0 auto;
  text-align: left;
  font-variant-numeric: tabular-nums;
  font-family: Roboto, "Segoe UI", sans-serif;
}

.andon-table {
  margin-top: 0;
  font-family: Poppins;
  border-spacing: 0;
  border-collapse: separate;
  border-radius: 14px;
  border: 2px solid #00b7c2;
  width: 100%;
}

.andon-table th,
.andon-table td {
  border-right: 2px solid #00b7c2;
  border-bottom: 2px solid #00b7c2;
}

.andon-table th {
  padding: 5px;
  white-space: nowrap;
  font-size: clamp(0.75rem, 2vh, 1.9rem);
  text-align: center;
  background-color: #0f4c75 !important;
  color: #fdcb9e;
  width: 100px;
}

.andon-table td {
  padding: 2px 5px;
  white-space: nowrap;
  font-size: clamp(0.75rem, 2vh, 1.9rem);
  text-align: center;
  background-color: #101213;
  color: #ececec;
}

.semi-th,
.module-th {
  font-size: clamp(0.65rem, 1.8vh, 1.7rem) !important;
  padding: 0px !important;
}

.first-th { border-top-left-radius: 10px; }
.last-th { border-top-right-radius: 10px; }
.last-td-left { border-bottom-left-radius: 14px; }
.last-td-right { border-bottom-right-radius: 14px; }

.detail-cell:hover {
  cursor: pointer;
  background-color: #fff;
  color: #0f4c75;
}

.digital {
  font-family: Digital;
  font-size: 2rem;
  letter-spacing: 2px;
  font-weight: bolder;
}

.tanggal {
  font-family: Poppins;
  font-size: 2rem;
  font-weight: bolder;
}

#andon-container {
  width: 100%;
  padding: 0;
  overflow: hidden;
  background-color: #100f0f;
}

/* ====== Detail modal table ====== */
.detail-table {
  margin-top: 4px;
}
.detail-table th,
.detail-table td {
  font-size: 1.3rem !important;
  padding: 6px 10px;
}
.detail-table thead {
  position: sticky;
  z-index: 9999;
  top: 0px;
}
.divider-line {
  border-color: #ececec;
  border-width: 1px;
  border-radius: 20px;
}

/* ====== Responsive (identik dengan @media asli) ====== */
@media (min-width: 1024px) and (max-width: 1440px) {
  .andon-table th,
  .andon-table td {
    padding: 0px;
    font-size: 1.25rem;
  }

  .semi-th,
  .module-th {
    font-size: 1rem !important;
  }

  .andon-table {
    margin-top: 0;
  }
}

@media screen and (min-width: 768px) and (max-width: 1024px) and (orientation: portrait) {
  .andon-table th,
  .andon-table td {
    padding: 14px 0px;
    font-size: 1.2rem;
  }
  .teks {
    font-size: 2rem;
  }
  .tanggal,
  .digital {
    font-size: 1.2rem;
  }

  .semi-th,
  .module-th {
    font-size: 0.7rem !important;
  }

  .andon-table {
    margin-top: 0;
  }
}
</style>

<style>
@font-face {
  font-family: Poppins;
  src: url('@/assets/fonts/Poppins-Regular.ttf');
}
@font-face {
  font-family: Digital;
  src: url('@/assets/fonts/Digital.ttf');
}

html,
body {
  margin: 0;
  height: 100%;
  overflow: hidden;
  border: 1px solid gray;
}
</style>
