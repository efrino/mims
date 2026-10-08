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
const date = utilityStore.getCurrentShift();

export const usePrintKanban = defineStore({
  id: "ifp-print-kanban",
  state() {
    return {
      apiUrl: configStore.apiUrl,
      action: "Add",
      permissions: {
        create: authStore.checkAccess("Module.Create.PrintBarcode"),
      },
      error: 0,
      table: {
        items: [],
      },
      table_tag: {
        items: [],
      },
      table_wld: {
        items: [],
      },
      filter: {
        create_date: date.date,
        shift: date.shift,
        // create_hour: date.hour,
      },
      partItems: [],
      formData: {
        part_number: "",
        range: 0,
        id_label: "",
        job_number: "",
        part_name: "",
        qty_kbn: "",
        qty_pallet: "",
        type_pallet: "",
        storage: "",
        car: "",
        customer: "",
        line: "",
        line2: "",
        status: "",
        status_lock: "",
        check_date: "",
        isSelectable: "",
        zstatus: "",
        tipe: false,
        //  pilih: {
        //  }
        pilih: [],
      },
      datatables: {
        headers: [
          { text: "No", align: "left", value: "range" },
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Job Number", align: "left", value: "job_number" },
          { text: "Part Name", align: "left", value: "part_name" },
          { text: "ID Kanban", align: "left", value: "id_kanban" },
          { text: "No Kanban", align: "left", value: "no_kanban" },
          { text: "Status", align: "left", value: "status" },
          {
            text: "Status Lock",
            align: "left",
            sortable: true,
            value: "status_lock",
          },
          { text: "Qty Kanban", align: "left", value: "qty_kbn" },
          { text: "Qty Pallet", align: "left", value: "qty_pallet" },
          { text: "Tipe Pallet", align: "left", value: "type_pallet" },
          { text: "Storage", align: "left", value: "storage" },
          { text: "Car Model", align: "left", value: "car" },
          { text: "Customer", align: "left", value: "customer" },
          { text: "Line", align: "left", value: "line" },
          { text: "To", align: "left", value: "line2" },
        ],
        items: [],
        filters: {
          "": [],
          range: [],
          part_number: [],
        },
      },
      datatablesKanban: {
        headers: [
          { text: "No", align: "left", value: "" },
          { text: "Part Number", align: "left", value: "part_number" },
          { text: "Job Number", align: "left", value: "job_number" },
          { text: "Gambar", align: "left", value: "" },
          { text: "Action", align: "left", value: "" },
        ],
        items: [],
        filters: {
          part_number: [],
          job_number: [],
          part_name: [],
        },
      },
      jumlah: 0,
      isCheckAll: false,
      singleSelect: false,
      selected: [],
      dialog: {
        form: false,
      },
      list: {
        tipe: ["WIP", "PRESS", "WELDING"],
      },
      e_kanban:[]
    };
  },

  actions: {
    resetForm() {
      // this.fetchDataBarcode();
      this.formData = {
        pilih: [],
      };
      this.dialog.form = false;
    },
    // E Kanban
    // fetchPrintDataKanban() {
    //   notificationStore.loading = true;
    //   axios
    //     .get(
    //       `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/print`,
    //       {
    //         params: this.filter,
    //       }
    //     )
    //     .then((response) => {
    //       if (response.status === 200) {
    //         this.table.items = response.data;
    //         notificationStore.disableLoading();
    //       } else {
    //         utilityStore.onApiResponse(response);
    //       }
    //     })
    //     .catch(utilityStore.onError);
    // },

    // Kanban biasa
    fetchDataPart() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/master/part/wip`)
        .then((response) => {
          if (response.status === 200) {
            this.partItems = response.data;
            this.datatablesKanban.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
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

    filterItemsKanban() {
      return this.datatablesKanban.items.filter((d) => {
        return Object.keys(this.datatablesKanban.filters).every((f) => {
          return (
            this.datatablesKanban.filters[f].length < 1 ||
            d[f]
              .toLowerCase()
              .includes(this.datatablesKanban.filters[f].toLowerCase())
          );
        });
      });
    },

    sendToSAP(part_number) {
      notificationStore.loading = true;
      this.resetForm();
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/Print_kanban/sap?part_number=${part_number}`
        )
        .then((response) => {
          if (response.status === 200) {
            this.fetchDataKanban();
            window.location.reload();
            notificationStore.disableLoading();
          }
        });
    },

    searchPart(item) {
      return `<strong>${item.job_number}</strong> - ${item.part_number}`;
    },
    addPrint() {
      const data =
        this.action == "Edit" ? new URLSearchParams() : new FormData();
      if (this.formData.pilih.length > 0) {
        Object.entries(this.formData.pilih).map((e) => {
          data.append("id_kanban[]", e[1].id_kanban);
          data.append("part_number[]", e[1].part_number);
          data.append("job_number[]", e[1].job_number);
          data.append("range[]", e[1].range);
          data.append("part_name[]", e[1].part_name);
          data.append("qty_kbn[]", e[1].qty_kbn);
          data.append("qty_pallet[]", e[1].qty_pallet);
          data.append("type_pallet[]", e[1].type_pallet);
          data.append("storage[]", e[1].storage);
          data.append("car[]", e[1].car);
          data.append("customer[]", e[1].customer);
          data.append("line[]", e[1].line);
          data.append("line2[]", e[1].line2);
          data.append("zstatus[]", e[1].zstatus);
        });
        data.append("tipe", this.formData.tipe);
        let configHttp = {
          method: "post",
          url: `http://${configStore.apiUrl}/majsf_rest_api/api/Print_kanban/add`,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data,
        };
        this.resetForm();
        axios(configHttp)
          .then((response) => console.log(response))
          .catch(configStore.onError);
        window.open(
          `http://${configStore.apiUrl}/mims/ifp/print/print-preview-kanban`,
          "_blank" // <- This is what makes it open in a new window.
        );
      } else {
        notificationStore.showAlertWarning("Pilih Data yang akan di Print");
      }
    },
    fetchDataKanban() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/Print_kanban/data-log`
        )
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
    fetchPrintDataKanban() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/Print_kanban`)
        .then((response) => {
          if (response.status === 200) {
            this.table.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchDataTag() {
      notificationStore.loading = true;
      axios
        .get(`http://${configStore.apiUrl}/majsf_rest_api/api/Print_kanban/tag`)
        .then((response) => {
          if (response.status === 200) {
            this.table_tag.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchDataTagOK(part_number) {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/welding_achievement/tag_ok?part_number=${part_number}`,
          {
            params: this.filter,
          }
        )
        .then((response) => {
          if (response.status === 200) {
            this.table_tag.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchPrintDataKanbanWld() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/Print_kanban/welding`
        )
        .then((response) => {
          if (response.status === 200) {
            this.table_wld.items = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
    fetchJumlahDataKanban() {
      notificationStore.loading = true;
      axios
        .get(
          `http://${configStore.apiUrl}/majsf_rest_api/api/Print_kanban/jumlah`
        )
        .then((response) => {
          if (response.status === 200) {
            this.jumlah = response.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },

    getImgUrl(code_material) {
      try {
        return (
          `http://192.168.10.67/part/` +
          code_material +
          `.png?t=${new Date().getTime()}`
        );
      } catch (_) {
        return `http://192.168.10.67/part/empty.png?t=${new Date().getTime()}`;
      }
    },

    loadDataMaster(action, data) {
      Object.entries(this.formData).map((i) => {
        this.formData[i[0]] = data[i[0]];
      });
      this.action = action;
      this.dialog.form = true;
    },

    onUpdate() {
      notificationStore.loading = true;
      const data = this.action == "Edit" ? new FormData() : new FormData();
      Object.entries(this.formData).map((e) => {
        data.append(e[0], e[1]);
      });
      data.append("action", this.action);
      data.append("tipe", this.formData.tipe);

      let configHttp = {
        method: "post",
        url: `http://${configStore.apiUrl}/majsf_rest_api/api/Print_kanban`,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data,
      };

      axios(configHttp)
        .then((response) =>
          notificationStore.onApiResponseToastAlert(
            response,
            this.resetForm,
            this.fetchDataPart()
          )
        )
        .catch(configStore.onError);
    },

    fetchDataEKanban(part_number, date) {
      notificationStore.loading = true;
      axios
        .get(`http://192.168.10.67/majsf_rest_api/api/kanban_circulation/sap?part_number=${part_number}&date=${date}`)
        .then((response) => {
          if (response.status === 200) {
            this.e_kanban = response.data.data;
            notificationStore.disableLoading();
          } else {
            utilityStore.onApiResponse(response);
          }
        })
        .catch(utilityStore.onError);
    },
  },
});
