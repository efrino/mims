import { addPatanPress, editPatanPress, fetchLinePress, fetchPatanPress, getDataTagOKPress, previewTagOKPress, uploadDataPatanPress } from "@/services/PCD/Stamping/Patan";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import type { ExcelColumn, Filter, formData, ListInfo, SchedulePress, TableTagOK } from "@/types/PCD/Stamping/Patan";
import { defineStore } from "pinia";
import { connectQZTray, disconnectQZTray, getQZPrinters } from "@/utils/qzSigning";
import html2canvas from "html2canvas";
import qz from "qz-tray";
import type { PrintData } from "qz-tray";
import { useAuthStore } from "@/stores/auth";

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();
const authStore = useAuthStore();

export const usePatanStampStore = defineStore('patanStamping', {
  state: () => ({
    filter: {
      date: date.date,
      period: date.period,
      line: "A",
      shift: "1",
      part_type: "",
    } as Filter,
    isModalFilterOpen: false as boolean,
    isModalAddOpen: false as boolean,
    isModalPrintOpen: false as boolean,
    isModalUploadOpen: false as boolean,
    datatabel: [] as SchedulePress[],
    lineCheck: [] as string[],
    listInfo: {
      line: ["A", "B", "C", "D", "E", "F", "G", "H", "SP", "300T"],
      patan: ["A", "B", "C", "D", "R1", "R2", "R3", "R4"],
      status_plan: ["BL", "WIP", "FP"],
      combination: ["5 - 0", "4 - 0", "3 - 0", "2 - 0", "1 - 0"],
      tipe_part: ["FP", "WIP"],
      planProcess: ["1", "2", "3", "4", "5", "6", "7"],
    } as ListInfo,
    form: {
      date: date.date,
      line: "",
      shift: "",
      combination: "",
      plan_process: "",
      part_rh: "",
      part_lh: "",
      lot_rh: "",
      lot_lh: "",
      tpt: "",
      gsph: "",
      stroke_plan: "",
      dandori_plan: "",
      status_plan: "",
      status: "",
    } as formData,
    selectedPrinter: "" as string,
    isPrinted: false as boolean,
    printers: [] as string[],
    tableTagOk: [] as TableTagOK[],
    errorCount: 0,
    dataTablesUpload: [] as ExcelColumn[],
    permissions: {
      create: authStore.checkAccess("Module.Create.Patan"),
    },
    action: "add" as string,
    keyOnUpload: [
      "period",
      "line",
      "patan",
      "combination",
      "value_combination",
      "plan_process",
      "part_rh",
      "part_lh",
      "stroke_plan",
      "lot_rh",
      "lot_lh",
      "tpt",
      "gsph",
      "cycletime",
      "dandori_plan",
      "status_plan",
      "machine",
      "process",
      "raw_matnr",
      "need_qty",
      "stock_sap",
    ],
  }),
  actions: {
    async fetchPatanData() {
      try {
        notificationStore.loading = true;

        const res = await fetchPatanPress(this.filter);

        if (res.status != 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat mengambil data"
          )
          return;
        }

        this.datatabel = res.data;
        this.isModalFilterOpen = false;

      } catch (error) {
        console.log("err: ", error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },
    
    async getLinePress() {
      try {
        notificationStore.loading = true;

        const res = await fetchLinePress(this.filter);

        if (res.status != 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalahan saat mengambil data"
          )
          return;
        }

        this.lineCheck = res.data.data;

      } catch (error) {
        console.log("err: ", error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async addOrEditData() {
      try {
        notificationStore.loading = true;

        const data = this.action == "edit" ? new URLSearchParams() : new FormData();
        let validate = 0;

        Object.entries(this.form).map((e) => {
          
          if (e[1] == "" || e[1] == null) {
            validate += 1;
          }
          data.append(e[0], e[1]);

        });

        if (validate != 0) {
          notificationStore.showDialogWarning(
            "Warning",
            "Data yang anda kirim tidak lengkap"
          );
          return;
        }

        let res = null;
        if (this.action == 'edit') {
          res = await editPatanPress(data);
        } else {
          res = await addPatanPress(data);
        }

        if (res?.status !== 200 || res?.data.status !== true) {
          notificationStore.showDialogWarning(
            "Error",
            "Terjadi kesalahan saat mengirim data"
          );
          return;
        }

        notificationStore.showAlertSuccess("Berhasil melakukan perubahan data");
        
      } catch (error) {
        console.log("err: ", error);
        utilityStore.onError(error);
      } finally {
        this.isModalAddOpen = false;
        notificationStore.disableLoading();
      }
    },

    viewDetail(urut: string) {
      const detail: SchedulePress | undefined = this.datatabel.find(
        item => item.urut === urut
      );
      
      if (!detail) {
        notificationStore.showDialogWarning(
          "Warning",
          "Data tidak ditemukan"
        );
        return;
      }

      this.form = {
        date: detail.date,
        line: detail.line_id,
        shift: detail.shift,
        combination: detail.combination,
        plan_process: detail.plan_process,
        part_rh: detail.part_rh,
        part_lh: detail.part_lh,
        lot_rh: detail.lot_rh,
        lot_lh: detail.lot_lh,
        tpt: detail.tpt,
        gsph: detail.gsph,
        stroke_plan: detail.stroke_plan,
        dandori_plan: detail.dandori_plan,
        status_plan: detail.status_plan,
        status: "1",
      }

      this.action = 'edit';
      this.isModalAddOpen = true;
    },

    async uploadData() {
      try {
        this.isModalUploadOpen = false;
        notificationStore.loading = true;

        if (!this.dataTablesUpload.length) {
					notificationStore.showAlertWarning(
						"Data yang anda kirim tidak Lengkap"
					);
					return;
				}

        const data = new FormData();
        this.dataTablesUpload.forEach((item) => {

          data.append("shift", this.form.shift);
          data.append("date", this.form.date);

          Object.keys(item).forEach((key) => {
            if (this.keyOnUpload.includes(key)) {
              const value = item[key as keyof ExcelColumn];

              data.append(`${key}[]`, String(value));
            }
          });
        });

        const res = await uploadDataPatanPress(data);
        
        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning!",
            "Terjadi kesalahan saat upload data"
          );
          return;
        }

        notificationStore.showDialogSuccess(
          "Success!",
          "Berhasil menambahkan data"
        )

      } catch (error) {
        console.log("err: ", error);
        utilityStore.onError(error);
      } finally {
        notificationStore.disableLoading();
      }
    },

    async previewTagOk() {
      try {
        notificationStore.loading = true;

        if (!this.filter.line && !this.filter.shift && !this.filter.part_type) {
          notificationStore.showDialogWarning(
            "Warning",
            "Data yang anda masukan tidak lengkap"
          );
          return;
        }

        const res = await previewTagOKPress(this.filter);

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning",
            "Terjadi kesalaaan saat mengambil data"
          );
          return;
        }

      } catch (error) {
        console.log("err: ", error)
        utilityStore.onError(error)
      } finally {
        this.isModalPrintOpen = false;
        notificationStore.disableLoading();
      }
    },

    async fetchDataTagOK () {
      try {
        notificationStore.loading = true;

        const res = await getDataTagOKPress(this.filter)

        if (res.status !== 200) {
          notificationStore.showDialogWarning(
            "Warning!",
            "Terjadi kesalahan saat mengambil data Tag OK"
          );
          return;
        }

        this.isPrinted = false;
        this.tableTagOk = res.data;

      } catch (error) {
        console.log("err: ", error)
      } finally {
        notificationStore.disableLoading();
      }
    },


    // printer setup
    async getPrinters() {
      try {
        const printers = await getQZPrinters();

        this.printers = Array.isArray(printers) ? printers : [printers];
      } catch (e) {
        this.printers = [];
      }
    },

    async printArea(selectedPrinter: string | null) {
			if (this.tableTagOk.length == 0) {
				notificationStore.showConfirm(
					"Warning",
					"Tidak ada Tag OK yang ingin di print!"
				);
				return;
				
			} else if (!selectedPrinter) {
				notificationStore.showConfirm(
					"Warning",
					"Pilih printer terlebih dahulu sebelum mencetak!"
				);
				return;
			}

			notificationStore.loading = true;

			const tables = document.querySelectorAll("#print-content table");
			const images = [];

			// Render semua tabel menjadi gambar
			for (let table of tables) {
				const el = table as HTMLElement;
				const canvas = await html2canvas(el, { scale: 3 });
				images.push(canvas.toDataURL("image/png"));
			}

			try {
				await connectQZTray();

				const config = qz.configs.create(selectedPrinter, {
					orientation: "landscape",
					scaleContent: true
				});

				// Convert base64 ke format yang diterima QZ
				const printData = images.map(img => ({
					type: "image",
					format: "base64",
					data: img.replace(/^data:image\/png;base64,/, "")
				})) as unknown as PrintData[];;

				// Print langsung
				await qz.print(config, printData);

				this.isPrinted = true;
				this.tableTagOk = [];

				notificationStore.showAlertSuccess(
					"Berhasil mencetak TAG OK."
				);

			} catch (e: any) {
				console.error("QZ Error:", e);

				if (e.message && e.message.includes("Printer is not accepting job")) {
					notificationStore.showConfirm(
						"Error",
						`Printer "${selectedPrinter}" tidak ditemukan. Pastikan printer terhubung dan menyala.`
					);
					return;
				} else {
					notificationStore.showConfirm(
						"Error",
						`Gagal mencetak tag. Pastikan aplikasi QZ Tray berjalan dan printer terhubung.\nDetail: ${e.message || e}`
					);
					return;
				}
			} finally {
				// Disconnect from QZ Tray
				await disconnectQZTray();
				notificationStore.loading = false;
			}
		},

  }
})