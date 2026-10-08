<script>
import moment from "moment";

export default {
  name: "ResumeInspectionPart",

  data() {
    return {
      id: "",
      interval: null,
      waktu: null,
      tanggal: null,

      // ============ Data dummy (hardcode, belum ada backend) ============
      // type: single/semi_sa/sa/module — sesuai kolom Type
      // check: kolom "Item Check Hari Ini" (kosong dulu seperti format)
      customers: [
        { name: "ADM PLANT 1", model: "D40D", car_name: "Gran Max (PICK UP)",     single: 2,  semi_sa: 3,  sa: 0,  module: 0, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "ADM PLANT 1", model: "D40D", car_name: "Gran Max / Luxio (VAN)", single: 11, semi_sa: 0,  sa: 2,  module: 0, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "ADM PLANT 4", model: "D14N", car_name: "Terios / Rush",          single: 4,  semi_sa: 3,  sa: 18, module: 0, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "ADM PLANT 4", model: "D40D", car_name: "Gran Max (PICK UP)",     single: 22, semi_sa: 7,  sa: 15, module: 0, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "ADM PLANT 4", model: "D40D", car_name: "Gran Max / Luxio (VAN)", single: 35, semi_sa: 29, sa: 24, module: 0, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "ADM PLANT 5", model: "D26A", car_name: "Xenia / Avanza",         single: 0,  semi_sa: 0,  sa: 9,  module: 0, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "ADM PLANT 5", model: "D30D", car_name: "Sigra / Calya",          single: 1,  semi_sa: 10, sa: 9,  module: 0, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "ADM PLANT 5", model: "D55L", car_name: "Rocky / Raize",          single: 5,  semi_sa: 14, sa: 16, module: 0, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "ADM PLANT 5", model: "D74A", car_name: "Ayla / Agya",            single: 2,  semi_sa: 7,  sa: 9,  module: 0, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "ADM SUNTER CKD", model: "D40D", car_name: "Gran Max / Luxio (VAN)", single: 3, semi_sa: 5, sa: 0, module: 0, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "TMMIN", model: "D26A", car_name: "Xenia / Avanza",               single: 2,  semi_sa: 6,  sa: 20, module: 0, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "TMMIN", model: "D03B", car_name: "Yaris Cross",                  single: 0,  semi_sa: 0,  sa: 3,  module: 0, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "MMKI",  model: "SL",   car_name: "L300",                         single: 39, semi_sa: 28, sa: 31, module: 0, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "MKM",   model: "TD",   car_name: "Canter / Colt Diesel",         single: 39, semi_sa: 44, sa: 3,  module: 0, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "MKM",   model: "SL",   car_name: "L300",                         single: 17, semi_sa: 17, sa: 4,  module: 0, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "HMMI",  model: "SU2ID", car_name: "Creta (RHD)",                 single: 3,  semi_sa: 1,  sa: 0,  module: 4, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "HMMI",  model: "SU2ID", car_name: "Creta (LHD)",                 single: 2,  semi_sa: 4,  sa: 9,  module: 2, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "HMMI",  model: "KS",   car_name: "Stargazer (RHD)",              single: 0,  semi_sa: 0,  sa: 2,  module: 2, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
        { name: "HMMI",  model: "KS",   car_name: "Stargazer (LHD)",              single: 0,  semi_sa: 0,  sa: 6,  module: 2, check: { item: "", ok_pcs: "", ok_pct: "", nc_pcs: "", nc_pct: "", ng_pcs: "", ng_pct: "", pcs: "" } },
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

    getRowSpan(customerName) {
      return this.rowspanMap[customerName] || 1;
    },

    formatNumber(num) {
      return new Intl.NumberFormat("id-ID").format(num);
    },
  },

  computed: {
    // ============ Baris TOTAL dihitung dari data dummy ============
    grandTotal() {
      return this.customers.reduce(
        (acc, c) => ({
          single:  acc.single  + c.single,
          semi_sa: acc.semi_sa + c.semi_sa,
          sa:      acc.sa      + c.sa,
          module:  acc.module  + c.module,
        }),
        { single: 0, semi_sa: 0, sa: 0, module: 0 },
      );
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
      <div class="basis-1/2 text-center teks judul uppercase text-white p-3">
        Resume Inspection Part (Day Shift) (TRIAL)
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
            <th rowspan="4" class="first-th">Customer</th>
            <th rowspan="4">Model</th>
            <th rowspan="4">Car Name</th>
            <th colspan="5">Type</th>
            <th colspan="7" class="last-th">Item Check Hari Ini</th>
          </tr>
          <tr>
            <th rowspan="3" class="semi-th">Single</th>
            <th rowspan="3" class="semi-th">Semi S/A</th>
            <th rowspan="3" class="semi-th">S/A</th>
            <th rowspan="3" class="module-th">Module</th>
            <th rowspan="3">&Sigma; Item</th>
            <th colspan="6">Status</th>
            <th rowspan="3">PCS</th>
          </tr>
          <tr>
            <th colspan="2">OK</th>
            <th colspan="2">NC</th>
            <th colspan="2">NG</th>
          </tr>
          <tr>
            <th rowspan="1" class="semi-th">PCS</th>
            <th rowspan="1" class="semi-th">%</th>
            <th rowspan="1" class="semi-th">PCS</th>
            <th rowspan="1" class="semi-th">%</th>
            <th rowspan="1" class="semi-th">PCS</th>
            <th rowspan="1" class="semi-th">%</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(customer, index) in customers" :key="'customer_' + index">
            <td
              v-if="shouldDisplayCustomerName(index, customer.name)"
              :rowspan="getRowSpan(customer.name)"
            >
              {{ customer.name }}
            </td>
            <td>{{ customer.model }}</td>
            <td>{{ customer.car_name }}</td>
            <td>
              <span class="center-right-align" style="width: 50px">{{ formatNumber(customer.single) }}</span>
            </td>
            <td>
              <span class="center-right-align" style="width: 50px">{{ formatNumber(customer.semi_sa) }}</span>
            </td>
            <td>
              <span class="center-right-align" style="width: 50px">{{ formatNumber(customer.sa) }}</span>
            </td>
            <td>
              <span class="center-right-align" style="width: 50px">{{ formatNumber(customer.module) }}</span>
            </td>
            <td>{{ customer.check.item }}</td>
            <td>{{ customer.check.ok_pcs }}</td>
            <td>{{ customer.check.ok_pct }}</td>
            <td>{{ customer.check.nc_pcs }}</td>
            <td>{{ customer.check.nc_pct }}</td>
            <td>{{ customer.check.ng_pcs }}</td>
            <td>{{ customer.check.ng_pct }}</td>
            <td>{{ customer.check.pcs }}</td>
          </tr>

          <!-- ===== Baris TOTAL ===== -->
          <tr class="font-black">
            <td colspan="3" class="last-td-left">TOTAL</td>
            <td>
              <span class="center-right-align" style="width: 50px">{{ formatNumber(grandTotal.single) }}</span>
            </td>
            <td>
              <span class="center-right-align" style="width: 50px">{{ formatNumber(grandTotal.semi_sa) }}</span>
            </td>
            <td>
              <span class="center-right-align" style="width: 50px">{{ formatNumber(grandTotal.sa) }}</span>
            </td>
            <td>
              <span class="center-right-align" style="width: 50px">{{ formatNumber(grandTotal.module) }}</span>
            </td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="last-td-right"></td>
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
