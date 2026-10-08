import axios from "axios";
import { defineStore } from "pinia";
import { useNotificationStore } from "@/pinia/notification";
import { useAuthStore } from "@/pinia/auth";
import { useConfigStore } from "@/pinia/config";
import { useUtilityStore } from "@/pinia/utility";

const authStore = useAuthStore();
const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
export const usePartStore = defineStore({
  id: "master-part",
  state() {
    return {
      action: "Add",
      apiUrl: configStore.apiUrl,
      permissions: {
        create: authStore.checkAccess("Master.Create.Part"),
      },
      datatables: {
        headers: [
          { text: "ID", align: "left", value: "id" },
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Job Number", align: "left", value: "job_number" },
          { text: "Status", align: "left", value: "is_active" },
          { text: "Action", align: "left", value: "action" },
        ],
        items: [],
        filters: {
          job_number: [],
          part_number: [],
        },
      },
      datatablesMaj: {
        headers: [
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Job Number", align: "left", value: "job_number" },
          { text: "Part Name", align: "left", value: "part_name" },
          { text: "Customer", align: "left", value: "customer" },
          { text: "Model", align: "left", value: "model" },
          { text: "Routing", align: "left", value: "routing" },
          { text: "Material Grouping", align: "left", value: "mat_grouping" },
          { text: "Line", align: "left", value: "line" },
          { text: "Total OP", align: "left", value: "OP" },
          { text: "Status Part", align: "left", value: "status" },
          { text: "Action", align: "left", value: "action" },
        ],
        items: [],
        filters: {
          id: [],
          job_number: [],
          part_number: [],
          customer: [],
          model: [],
          mat_grouping: [],
        },
      },
      datatablesUpload: {
        search: "",
        headers: [
          { text: "Leveling Part", align: "left", value: "leveling_part" },
          { text: "Model", align: "left", value: "model" },
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Part Name", align: "left", value: "part_name" },
          { text: "Job Number", align: "left", value: "job_number" },
          { text: "Routing", align: "left", value: "routing" },
          { text: "Palet", align: "left", value: "pallet" },
          { text: "Qty / Palet", align: "left", value: "qty_pallet" },
          { text: "Qty / Kbn", align: "left", value: "qty_kbn" },
          { text: "Simulate", align: "left", value: "ERROR" },
        ],
        items: [],
      },
      datatablesBlankUpload: {
        search: "",
        headers: [
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Part Number Out RH", align: "left", value: "out_rh" },
          { text: "Part Number Out LH", align: "left", value: "out_lh" },
          { text: "Simulate", align: "left", value: "ERROR" },
        ],
        items: [],
      },
      datatablesBlank: {
        search: "",
        headers: [
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Part Number Out RH", align: "left", value: "out_rh" },
          { text: "Part Number Out LH", align: "left", value: "out_lh" },
          { text: "Status", align: "left", value: "is_active" },
        ],
        items: [],
        filters: {
          part_number: [],
          out_rh: [],
          out_lh: [],
        },
      },
      datatablesStroke: {
        headers: [
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Job Number", align: "left", value: "job_number" },
          { text: "Total Dies", align: "left", value: "total_dies" },
          { text: "Limit Stroke", align: "left", value: "limit_stroke" },
          { text: "Status", align: "left", value: "is_active" },
          { text: "Action", align: "left", value: "action" },
        ],
        items: [],
        filters: {
          part_number: [],
          job_number: [],
          total_dies: [],
          limit_stroke: [],
        },
      },
      form: [
        "id",
        "job_number",
        "part_number",
        // "part_name",
        // "leveling_part",
        // "qty_pallet",
        // "qty_kbn",
        // "pallet",
        // "routing",
        // "mat_grouping",
        // "line",
        // "model",
        // "mother_part",
        // "customer",
        // "status",
        "is_active",
        // "total_dies",
        // "limit_stroke",
      ],
      formUpload: ["part_number", "out_rh", "out_lh", "is_active"],
      dialog: {
        upload: false,
        form: false,
        formAdd: false,
      },
      error: 0,
      speedDial: {
        model: false,
        btn: false,
      },
      formData: {
        id: 0,
        job_number: "",
        part_number: "",
        // part_name: "",
        // customer: "",
        // model: "",
        // routing: "",
        // mat_grouping: "",
        // line: "",
        // mother_part: "",
        // leveling_part: 0,
        // total_dies: "",
        // limit_stroke: "",
        // status: "",
        is_active: 0,
      },
      list: {
        statusPart: ["Regular", "Runout"],
        status: ["1", "0"],
        customer: ["ADM", "TMMIN", "HMMI", "MKM", "MMKI", "GMR"],
        line: [
          "LNA",
          "LNB",
          "LNC",
          "LND",
          "LNE",
          "LNF",
          "LNG",
          "LNH",
          "LSP",
          "WLD",
          "WDA",
          "WDB",
          "WDC",
          "WDD",
          "WDF",
          "WSA",
        ],
      },
      partItemsMaj: [],
    };
  },
  actions: {
    resetForm() {
      // this.fetchPartAllMaj();
      // this.fetchPartBlank();
      this.fetchPartAll();
      this.formData = {
        id: "",
        job_number: "",
        part_number: "",
        // part_name: "",
        // customer: "",
        // model: "",
        // routing: "",
        // mat_grouping: "",
        // line: "",
        // mother_part: "",
        // leveling_part: "",
        // total_dies: "",
        // limit_stroke: "",
        // status: "",
        is_active: 0,
      };
      this.datatablesUpload.items = [];
      this.datatablesBlankUpload.items = [];
      this.dialog.form = false;
      this.dialog.formAdd = false;
    },
    fetchPart() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/master/part`, {
          params: this.filter,
        })
        .then((response) => {
          if (response.status === 200) {
            this.datatables.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchPartBlank() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/part/blank`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatablesBlank.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchPartAll() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/part/all`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatables.items = response.data;
            this.datatablesStroke.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchPartAllMaj() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/part/maj`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.datatablesMaj.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    fetchPartMotherMaj() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/master/part/mother`
        )
        .then((response) => {
          if (response.status === 200) {
            this.partItemsMaj = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    loadDataPart(action, data) {
      Object.entries(this.formData).map((i) => {
        this.formData[i[0]] = data[i[0]];
      });
      this.action = action;
      this.dialog.form = true;
    },
    filterItems() {
      return this.datatables.items.filter((d) => {
        return Object.keys(this.datatables.filters).every((f) => {
          return (
            this.datatables.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatables.filters[f].toLowerCase())
          );
        });
      });
    },
    filterItemsStroke() {
      return this.datatablesStroke.items.filter((d) => {
        return Object.keys(this.datatablesStroke.filters).every((f) => {
          return (
            this.datatablesStroke.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesStroke.filters[f].toLowerCase())
          );
        });
      });
    },
    filterItemsMaj() {
      return this.datatablesMaj.items.filter((d) => {
        return Object.keys(this.datatablesMaj.filters).every((f) => {
          // if (d.is_active == 1) {
          //   d.is_active = "Regular";
          // }
          // console.log(d.children.is_active);
          // if (d.line.substr(0, 2) == "LN") {
          //   d.line = "LINE " + d.line.substr(2, 2);
          // } else if (d.line.substr(0, 3) == "LSP") {
          //   d.line = "LINE SP";
          // }
          switch (d.routing) {
            case "YOSKA":
              d.routing = "PT YOSKA Prima Inti";
              break;
            case "MPI":
              d.routing = "PT Mandiri Press Indonesia";
              break;
            case "ISA":
              d.routing = "PT. Ito Seisakusho Armada";
              break;
            case "MGL":
              d.routing = "PT. MAJ Magelang";
              break;
            case "MASBI":
              d.routing = "PT. Masbi Sukses";
              break;
            case "TOSAMA":
              d.routing = "PT. Tosama Abadi";
              break;
            case "TAIKISHA":
              d.routing = "PT. Taikisha Manufacturing Indonesia";
              break;
          }
          return (
            this.datatablesMaj.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesMaj.filters[f].toLowerCase())
          );
        });
      });
    },
    filterItemsBlank() {
      return this.datatablesBlank.items.filter((d) => {
        return Object.keys(this.datatablesBlank.filters).every((f) => {
          return (
            this.datatablesBlank.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesBlank.filters[f].toLowerCase())
          );
        });
      });
    },
    onUpdate(tipe) {
      notificationStore.loading = true;
      let valid = true;
      const data =
        this.action == "Edit" ? new URLSearchParams() : new FormData();
      Object.entries(this.formData).map((e) => {
        if (
          !e[1] &&
          !((this.action == "Add" || this.action == "Edit") && (e[0] == "part_number" || e[0] == "job_number" || e[0] == "is_active" || e[0] == "id"))
        ) {
          valid = false;
        }
        if (
          tipe == "maj" &&
          !e[1] &&
          !(
            this.action == "Add" &&
            (e[0] == "part_number" || e[0] == "leveling_part")
          )
        ) {
          valid = false;
        }
        data.append(e[0], e[1]);
      });
      data.append("tipe", tipe);
      if (valid) {
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/part/add`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        if (this.action == "Edit") {
          configHttp = {
            method: "put",
            url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/part`,
            headers: {
              "Content-Type": "multipart/form-data",
            },
            data,
          };
        }

        axios(configHttp)
          .then((response) =>
            notificationStore.onApiResponseToastAlertNew(response)
          )
          .catch(configStore.onError);
        if (tipe == "maj") {
          this.fetchPartAllMaj();
          this.dialog.form = false;
        } else {
          this.resetForm();
        }
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap."
        );
        notificationStore.disableLoading();
      }
    },

    onAddBlank() {
      notificationStore.loading = true;
      let valid = true;
      const data =
        this.action == "Edit" ? new URLSearchParams() : new FormData();
      Object.entries(this.formData).map((e) => {
        if (!(this.action == "Add" || this.action == "Edit")) {
          valid = false;
        }
        data.append(e[0], e[1]);
      });

      if (valid) {
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/part/blank`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        if (this.action == "Edit") {
          configHttp = {
            method: "put",
            url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/part/blank`,
            headers: {
              "Content-Type": "multipart/form-data",
            },
            data,
          };
        }

        axios(configHttp)
          .then((response) =>
            notificationStore.onApiResponseToastAlert(response, this.resetForm)
          )
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap."
        );
        notificationStore.disableLoading();
      }
    },
    onUpload() {
      if (!this.formData.customer) {
        notificationStore.showAlertWarning("Customer belum dipilih");
      } else if (this.datatablesUpload.items.length) {
        notificationStore.loading = true;
        const data = new FormData();
        this.datatablesUpload.items.map((item) => {
          data.append("customer", this.formData.customer);
          data.append("mother_part", this.formData.mother_part);
          Object.keys(item).map((val) => {
            if (this.form.includes(val)) {
              data.append(val + "[]", item[val]);
            }
          });
        });
        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/part`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        axios(configHttp)
          .then((response) => {
            if (response.status === 200) {
              let error = true;
              let message = "";
              if (response.data.success) {
                error = false;
                this.resetForm();
                this.dialog.upload = false;
                // window.location.reload();
              }
              let tmp = document.createElement("DIV");
              tmp.innerHTML = response.data.messages + message;
              if (error) {
                notificationStore.showAlertWarning(
                  tmp.textContent || tmp.innerText || ""
                );
              } else {
                notificationStore.showAlertSuccess(
                  tmp.textContent || tmp.innerText || ""
                );
              }
            } else {
              notificationStore.showAlertWarning(response.data.status);
            }
            notificationStore.disableLoading();
          })
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap"
        );
      }
    },
    onUploadBlank() {
      notificationStore.loading = true;
      if (this.datatablesBlankUpload.items.length) {
        const data = new FormData();
        this.datatablesBlankUpload.items.map((item) => {
          Object.keys(item).map((val) => {
            if (this.formUpload.includes(val)) {
              data.append(val + "[]", item[val]);
            }
          });
        });
        const configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/master/part/upload`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        axios(configHttp)
          .then((response) => {
            if (response.status === 200) {
              let error = true;
              let message = "";
              if (response.data.success) {
                error = false;
                this.resetForm();
                this.dialog.upload = false;
              }
              let tmp = document.createElement("DIV");
              tmp.innerHTML = response.data.messages + message;
              if (error) {
                notificationStore.showAlertWarning(
                  tmp.textContent || tmp.innerText || ""
                );
              } else {
                notificationStore.showAlertSuccess(
                  tmp.textContent || tmp.innerText || ""
                );
              }
            } else {
              notificationStore.showAlertWarning(response.data.status);
            }
            notificationStore.disableLoading();
          })
          .catch(configStore.onError);
      } else {
        notificationStore.showAlertWarning(
          "Data yang anda kirim tidak Lengkap"
        );
      }
    },
  },
});
