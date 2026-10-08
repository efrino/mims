<template>
  <v-container fluid class="pa-4">

    <!-- ─── HEADER ─────────────────────────────────────────────── -->
    <v-row align="center" class="mb-4">
      <v-col>
        <div class="text-h6 font-weight-bold text-grey-darken-3">
          <v-icon start color="primary">mdi-table-cog</v-icon>
          Strength Standard
        </div>
        <div class="text-caption text-grey">Manajemen standar kekuatan per Customer dan Z-Routing</div>
      </v-col>
      <v-col cols="auto">
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="openDialogAdd"
          elevation="0"
        >
          Tambah Data
        </v-btn>
      </v-col>
    </v-row>

    <!-- ─── FILTER BAR ──────────────────────────────────────────── -->
    <v-card elevation="0" border class="mb-4 pa-3">
      <v-row dense align="center">
      <v-col cols="12" sm="4">
                <v-select
                  v-model="filterCustomer"
                  :items="customerOptions"
                  prepend-inner-icon="mdi-account-search-outline"
                  label="Pilih Customer"
                  density="compact"
                  variant="outlined"
                  hide-details
                  clearable
                  @update:model-value="tableOptions.page = 1"
                />
              </v-col>
        <v-col cols="12" sm="3">
          <v-select
            v-model="filterCustomer"
            :items="customerOptions"
            label="Filter Customer"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            @update:model-value="tableOptions.page = 1"
          />
        </v-col>
        <v-col cols="12" sm="3">
          <v-select
            v-model="filterZRouting"
            :items="zroutingOptions"
            label="Filter Z-Routing"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            @update:model-value="tableOptions.page = 1"
          />
        </v-col>
        <v-col cols="auto">
          <v-btn
            variant="tonal"
            color="grey"
            prepend-icon="mdi-refresh"
            @click="loadData"
            :loading="isLoading"
          >
            Refresh
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- ─── TABLE ───────────────────────────────────────────────── -->
    <v-card elevation="0" border>
      <v-data-table
        :headers="headers"
        :items="filteredItems"
        :loading="isLoading"
        v-model:page="tableOptions.page"
        :items-per-page="tableOptions.itemsPerPage"
        density="compact"
        hover
        class="strength-table"
      >
        <template #item.index="{ index }">
          <span class="text-grey text-caption">{{ index + 1 }}</span>
        </template>

        <template #item.customer="{ item }">
          <v-chip
            :color="customerColor(item.customer)"
            size="x-small"
            variant="tonal"
            class="font-weight-bold"
          >
            {{ item.customer }}
          </v-chip>
        </template>

        <template #item.zrouting="{ item }">
          <span class="text-caption font-mono font-weight-bold">{{ item.zrouting }}</span>
        </template>

        <template #item.std_min="{ item }">
          <v-chip size="x-small" color="amber-darken-3" variant="outlined" class="font-weight-bold">
            {{ item.std_min }}
          </v-chip>
        </template>

        <template #item.std_max="{ item }">
          <v-chip size="x-small" color="blue-darken-3" variant="outlined" class="font-weight-bold">
            {{ item.std_max }}
          </v-chip>
        </template>

        <template #item.created_at="{ item }">
          <span class="text-caption text-grey">{{ formatDate(item.created_at) }}</span>
        </template>

        <template #item.actions="{ item }">
          <v-btn
            icon="mdi-pencil-outline"
            size="x-small"
            variant="text"
            color="primary"
            class="mr-1"
            @click="openDialogEdit(item)"
          />
          <v-btn
            icon="mdi-delete-outline"
            size="x-small"
            variant="text"
            color="error"
            @click="openDialogDelete(item)"
          />
        </template>

        <template #loading>
          <v-skeleton-loader type="table-row@8" />
        </template>

        <template #no-data>
          <div class="text-center py-8 text-grey">
            <v-icon size="40" class="mb-2">mdi-database-off-outline</v-icon>
            <div>Tidak ada data standar kekuatan</div>
          </div>
        </template>

        <template #bottom>
          <div class="d-flex align-center justify-space-between px-4 py-2 border-t">
            <span class="text-caption text-grey">
              Total: <strong>{{ filteredItems.length }}</strong> data
            </span>
            <v-pagination
              v-model="tableOptions.page"
              :length="pageCount"
              :total-visible="5"
              density="compact"
              size="small"
            />
            <v-select
              v-model="tableOptions.itemsPerPage"
              :items="[10, 25, 50, 100]"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 90px"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- ─── DIALOG ADD / EDIT ────────────────────────────────────── -->
    <v-dialog v-model="dialog" max-width="520" persistent>
      <v-card>
        <v-card-title class="pa-4 pb-2 d-flex align-center">
          <v-icon start :color="isEdit ? 'primary' : 'success'">
            {{ isEdit ? 'mdi-pencil' : 'mdi-plus-circle' }}
          </v-icon>
          {{ isEdit ? 'Edit Strength Standard' : 'Tambah Strength Standard' }}
          <v-spacer />
          <v-btn icon="mdi-close" size="small" variant="text" @click="closeDialog" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-form ref="formRef" @submit.prevent="submitForm">
            <v-row dense>

              <!-- Input Customer -->
              <v-col cols="12" sm="6">
                <v-select
                  v-model="form.customer"
                  :items="customerList"
                  label="Customer"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                  prepend-inner-icon="mdi-account-tie"
                  :disabled="isEdit"
                />
              </v-col>

              <!-- Input Z-Routing -->
              <v-col cols="12" sm="6">
                <v-combobox
                  v-model="form.zrouting"
                  :items="isEdit ? allZRoutingList : filteredZRoutingOptions"
                  label="Z-Routing"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                  prepend-inner-icon="mdi-routes"
                  clearable
                  :disabled="isEdit"
                />
              </v-col>

              <!-- Input Std Min -->
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="form.std_min"
                  label="Std Min"
                  variant="outlined"
                  density="compact"
                  type="number"
                  min="0"
                  :rules="[rules.required, rules.numeric]"
                  prepend-inner-icon="mdi-arrow-collapse-down"
                />
              </v-col>

              <!-- Input Std Max -->
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="form.std_max"
                  label="Std Max"
                  variant="outlined"
                  density="compact"
                  type="number"
                  min="0"
                  :rules="[rules.required, rules.numeric]"
                  prepend-inner-icon="mdi-arrow-collapse-up"
                />
              </v-col>

            </v-row>
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-3">
          <v-spacer />
          <v-btn variant="text" @click="closeDialog" :disabled="loadingSubmit">Batal</v-btn>
          <v-btn
            :color="isEdit ? 'primary' : 'success'"
            variant="flat"
            :loading="loadingSubmit"
            prepend-icon="mdi-content-save"
            @click="submitForm"
          >
            {{ isEdit ? 'Simpan Perubahan' : 'Simpan' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── DIALOG DELETE ────────────────────────────────────────── -->
    <v-dialog v-model="dialogDelete" max-width="420" persistent>
      <v-card>
        <v-card-title class="pa-4 d-flex align-center">
          <v-icon start color="error">mdi-alert-circle-outline</v-icon>
          Hapus Data
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <p class="mb-2">Yakin ingin menghapus data berikut?</p>
          <v-table density="compact" class="rounded border">
            <tbody>
              <tr>
                <td class="text-grey text-caption" width="120">Customer</td>
                <td>{{ selectedItem?.customer }}</td>
              </tr>
              <tr>
                <td class="text-grey text-caption">Z-Routing</td>
                <td class="font-mono font-weight-bold">{{ selectedItem?.zrouting }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3">
          <v-spacer />
          <v-btn variant="text" @click="dialogDelete = false" :disabled="loadingDelete">Batal</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="loadingDelete"
            prepend-icon="mdi-delete"
            @click="confirmDelete"
          >
            Hapus
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── SNACKBAR ─────────────────────────────────────────────── -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="bottom right"
    >
      <v-icon start>{{ snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
      {{ snackbar.message }}
    </v-snackbar>

  </v-container>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useStrengthStandardStore } from "@/stores/Logistik/IFP/Transaction/useStrengthStandardStore";

const CUSTOMER_COLORS = {
  ADM:   "blue",
  HMMI:  "green",
  TMMIN: "orange",
  MMKI:  "purple",
  MKM:   "red",
};

export default {
  name: "StrengthStandardPage",

  data() {
    return {
      // ─── FILTER ──────────────────────────────────────────────
      search: "",
      filterCustomer: null,
      filterZRouting: null,

      // ─── TABLE ───────────────────────────────────────────────
      tableOptions: {
        page: 1,
        itemsPerPage: 25,
      },

      headers: [
        { title: "No",       key: "index",      width: 60,  align: "center", sortable: false },
        { title: "Customer", key: "customer",    width: 150, align: "center" },
        { title: "Z-Routing", key: "zrouting",    width: 180, align: "start"  },
        { title: "Std Min",  key: "std_min",    width: 120, align: "center" },
        { title: "Std Max",  key: "std_max",    width: 120, align: "center" },
        { title: "Dibuat",   key: "created_at", width: 160, align: "center" },
        { title: "Aksi",     key: "actions",    width: 100, align: "center", sortable: false },
      ],

      // ─── DIALOG ADD/EDIT ──────────────────────────────────────
      dialog: false,
      isEdit: false,
      loadingSubmit: false,
      form: this.emptyForm(),

      // ─── DIALOG DELETE ────────────────────────────────────────
      dialogDelete: false,
      loadingDelete: false,
      selectedItem: null,

      // ─── SNACKBAR ─────────────────────────────────────────────
      snackbar: {
        show: false,
        message: "",
        color: "success",
      },

      // ─── VALIDATION ───────────────────────────────────────────
      rules: {
        required: (v) => (v !== null && v !== undefined && v !== "") || "Wajib diisi",
        numeric:  (v) => (!isNaN(Number(v)) && Number(v) >= 0) || "Harus angka ≥ 0",
      },
    };
  },

  computed: {
    ...mapState(useStrengthStandardStore, ["strengthStandards", "isLoading"]),

    // Z-Routing options di form add — filter berdasarkan customer yang dipilih
    filteredZRoutingOptions() {
      if (!this.form.customer || !Array.isArray(this.strengthStandards)) return [];
      const customer = String(this.form.customer).trim().toUpperCase();
      const zroutings = this.strengthStandards
        .filter((item) => String(item.customer || "").trim().toUpperCase() === customer)
        .map((item) => item.zrouting)
        .filter(Boolean);
      return [...new Set(zroutings)].sort();
    },

    // List Z-Routing tanpa filter (digunakan saat edit)
    allZRoutingList() {
      const set = new Set((this.strengthStandards || []).map((d) => d.zrouting).filter(Boolean));
      return Array.from(set).sort();
    },

    // Customer list unik untuk opsi input form
    customerList() {
      const set = new Set((this.strengthStandards || []).map((d) => d.customer).filter(Boolean));
      return Array.from(set).sort();
    },

    // Filter bar: customer options
    customerOptions() {
      const set = new Set((this.strengthStandards || []).map((d) => d.customer).filter(Boolean));
      return Array.from(set).sort();
    },

    // Filter bar: zrouting options — otomatis terpengaruh jika filterCustomer aktif
    zroutingOptions() {
      let list = this.strengthStandards || [];
      if (this.filterCustomer) {
        list = list.filter((d) => d.customer === this.filterCustomer);
      }
      const set = new Set(list.map((d) => d.zrouting).filter(Boolean));
      return Array.from(set).sort();
    },

    // Data setelah filter tabel — unik gabungan per customer + zrouting
    filteredItems() {
      let list = this.strengthStandards || [];

      if (this.filterCustomer) {
        list = list.filter((d) => d.customer === this.filterCustomer);
      }
      if (this.filterZRouting) {
        list = list.filter((d) => d.zrouting === this.filterZRouting);
      }
      if (this.search) {
        const kw = this.search.toLowerCase().trim();
        list = list.filter(
          (d) =>
            String(d.customer || "").toLowerCase().includes(kw) ||
            String(d.zrouting || "").toLowerCase().includes(kw)
        );
      }

      // Pengelompokan dan pembersihan duplikasi berbasis kombinasi customer & zrouting
      const map = new Map();
      list.forEach((item) => {
        const key = `${item.customer}-${item.zrouting}`;
        if (!map.has(key)) map.set(key, item);
      });

      return Array.from(map.values());
    },

    pageCount() {
      return Math.ceil(this.filteredItems.length / this.tableOptions.itemsPerPage);
    },
  },

  watch: {
    "form.customer"(newVal, oldVal) {
      if (!this.isEdit && oldVal && newVal !== oldVal) {
        this.form.zrouting = null;
      }
    },

    filterCustomer() {
      this.filterZRouting = null;
      this.tableOptions.page = 1;
    },
  },

  mounted() {
    this.loadData();
  },

  methods: {
    ...mapActions(useStrengthStandardStore, [
      "getStrengthStandards",
      "addStrengthStandard",
      "bulkUpdate",
      "removeStrengthStandard",
    ]),

    async loadData() {
      try {
        await this.getStrengthStandards();
      } catch {
        this.showSnackbar("Gagal memuat data standar kekuatan", "error");
      }
    },

    openDialogAdd() {
      this.isEdit = false;
      this.form   = this.emptyForm();
      this.dialog = true;
    },

    openDialogEdit(item) {
      this.isEdit = true;
      this.form   = {
        id:       item.id,
        customer: item.customer,
        zrouting: item.zrouting,
        std_min:  Number(item.std_min),
        std_max:  Number(item.std_max),
      };
      this.dialog = true;
    },

    closeDialog() {
      this.dialog = false;
      this.$nextTick(() => {
        this.form = this.emptyForm();
        this.$refs.formRef?.reset();
      });
    },

    async submitForm() {
      const { valid } = await this.$refs.formRef.validate();
      if (!valid) return;

      if (Number(this.form.std_max) < Number(this.form.std_min)) {
        this.showSnackbar("Std Max harus lebih besar atau sama dengan Std Min", "error");
        return;
      }

      this.loadingSubmit = true;
      try {
        if (this.isEdit) {
          const payload = {
            id:       Number(this.form.id),
            customer: this.form.customer,
            zrouting: this.form.zrouting, // Dikirim ke store menggunakan key zrouting
            std_min:  Number(this.form.std_min),
            std_max:  Number(this.form.std_max),
          };
          const res = await this.bulkUpdate(payload);
          if (res?.data?.success) {
            this.showSnackbar("Data standar kekuatan berhasil diperbarui");
            this.closeDialog();
            await this.loadData();
          } else {
            this.showSnackbar(res?.data?.message || "Gagal mengupdate data", "error");
          }
        } else {
          const payload = {
            customer: this.form.customer,
            zrouting: this.form.zrouting, // Dikirim ke store menggunakan key zrouting
            std_min:  Number(this.form.std_min),
            std_max:  Number(this.form.std_max),
          };
          const res = await this.addStrengthStandard(payload);
          if (res?.data?.success) {
            this.showSnackbar("Data standar kekuatan berhasil ditambahkan");
            this.closeDialog();
            await this.loadData();
          } else {
            this.showSnackbar(res?.data?.message || "Gagal menambahkan data", "error");
          }
        }
      } catch {
        this.showSnackbar("Terjadi gangguan sistem backend, coba lagi", "error");
      } finally {
        this.loadingSubmit = false;
      }
    },

    openDialogDelete(item) {
      this.selectedItem = item;
      this.dialogDelete = true;
    },

    async confirmDelete() {
      if (!this.selectedItem) return;
      this.loadingDelete = true;
      try {
        const res = await this.removeStrengthStandard(Number(this.selectedItem.id));
        if (res?.data?.success) {
          this.showSnackbar("Data standar kekuatan berhasil dihapus");
          this.dialogDelete = false;
          this.selectedItem = null;
        } else {
          this.showSnackbar(res?.data?.message || "Gagal menghapus data", "error");
        }
      } catch {
        this.showSnackbar("Terjadi kesalahan saat menghapus data", "error");
      } finally {
        this.loadingDelete = false;
      }
    },

    emptyForm() {
      return {
        id:       null,
        customer: null,
        zrouting: null,
        std_min:  0,
        std_max:  0,
      };
    },

    customerColor(customer) {
      return CUSTOMER_COLORS[String(customer || "").toUpperCase()] || "grey";
    },

    formatDate(val) {
      if (!val) return "-";
      const d = new Date(val);
      if (isNaN(d)) return val;
      return d.toLocaleDateString("id-ID", {
        day:   "2-digit",
        month: "short",
        year:  "numeric",
      });
    },

    showSnackbar(message, color = "success") {
      this.snackbar = { show: true, message, color };
    },
  },
};
</script>