import { addDataScheduleWelding, getAllDataTable, getDataTagOK, LineList, previewTagOKService, uploadDataScheduleWelding } from "@/services/PCD/Welding/ScheduleService";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import type { filterData, formAddData, LineItems, TableTagOK, tableWeldingSchedule, UploadPlanItem } from "@/types/PCD/Welding/WeldingSchedule";
import { connectQZTray, disconnectQZTray, getQZPrinters } from "@/utils/qzSigning";
import { defineStore } from "pinia";
import html2canvas from "html2canvas";
import qz from "qz-tray";
import type { PrintData } from "qz-tray";
import { useAuthStore } from "@/stores/auth";

const utilityStore = useUtilityStore();
const date = utilityStore.getCurrentShift();
const notificationStore = useNotificationStore();
const authStore = useAuthStore();

export const useWeldingSchedule = defineStore('WeldingSchedule', {
	state: () => ({
		filter: {
			date: date.date,
			shift: date.shift,
			line_id: "S/A HMMI",
		} as filterData,
		dataTable: [] as tableWeldingSchedule[],
		isModalAddOpen: false as boolean,
		isModalFilterOpen: false as boolean,
		isModalTagOKOpen: false as boolean,
		isModalUploadXlsx: false as boolean,
		formData: {
			period: date.period,
			date: date.date,
			shift: "",
			patan: "",
			line_id: "",
			lotsize: "",
			part_number: "",
			job_number: "",
			tpt: "",
			stroke: "",
			uph: "",
			tipe_part: "",
		} as formAddData,
		errorCount: 0,
		dataTablesUpload: [] as UploadPlanItem[],
		lineList: [] as LineItems[],
		tableTagOk: [] as TableTagOK[],
		printers: [] as string[],
		isPrinted: true as boolean,
		selectedPrinter: "" as string,
		permissions: {
			create: authStore.checkAccess("Module.Create.WeldingSchedule"),
		},
		form: [
			"period",
			"date",
			"shift",
			"line_id",
			"patan",
			"total_process",
			"part_number",
			"lotsize",
			"stroke",
			"uph",
			"tpt",
			"urut",
			"status_plan",
		],
	}),
	actions: {
		async getDataTable () {
			try {
				this.isModalFilterOpen = false;
				notificationStore.loading = true;

				const res = await getAllDataTable(this.filter);

				if (res.status !== 200) {
					notificationStore.showDialogWarning(
						"Warning!",
						"Terjadi kesalahan saat mengambil data."
					);
					return;
				}

				this.dataTable = res.data.data;

			} catch (error) {
				console.log("err: ", error)
			} finally {
				notificationStore.disableLoading();
			}
		},

		async getLineList () {
			try {
				notificationStore.loading = true;

				const res = await LineList();

				if (res.status !== 200) {
					notificationStore.showDialogWarning(
						"Warning!",
						"Gagal mendapatkan daftar list line."
					);
					return;
				}
				
				this.lineList = res.data;

			} catch (error) {
				console.log("err: ", error);
			} finally {
				notificationStore.disableLoading();
			}
		},

		async addData () {
			try {
				this.isModalAddOpen = false;
				notificationStore.loading = true;

				// validate
				if (!this.formData.shift || !this.formData.patan || !this.formData.line_id || !this.formData.lotsize || !this.formData.part_number || !this.formData.tpt || !this.formData.uph || !this.formData.stroke) {
					notificationStore.showDialogWarning(
						"Tambah Data Gagal!",
						"Data yang diinput harus lengkap!"
					)
					return;
				}

				const res = await addDataScheduleWelding(this.formData);

				if (res.status !== 200) {
					notificationStore.showDialogWarning(
						"Tambah Data Gagal!",
						"Ada kesalahan saat menambahkan data."
					)
					return;
				}

				if (res.data.success === false) {
					notificationStore.showDialogWarning(
						"Tambah Data Gagal!",
						`${res.data.messages}`
					)
					return;
				}

				notificationStore.showAlertSuccess("Berhasil menambahkan data")
			} catch (error) {
				console.log("err: ", error);
			} finally {
				notificationStore.disableLoading();
			}
		},

		handleUpload() {
			this.isModalUploadXlsx = false;
			notificationStore.showConfirm(
				"Confirm Change",
				"Apakah Anda ingin mengubah / menambahkan achievement yang sekarang?",
				() => {
					this.uploadData();
				}, 
				() => {
					this.dataTablesUpload = [];
				}
			);
    },

		async uploadData () {
			try {
				notificationStore.loading = true;

				if (!this.dataTablesUpload.length) {
					notificationStore.showAlertWarning(
						"Data yang anda kirim tidak Lengkap"
					);
					return;
				}
				
				const data = new FormData();
				this.dataTablesUpload.forEach((item) => {

					data.append("shift", this.formData.shift);
					data.append("date", this.formData.date);

					Object.keys(item).forEach((key) => {
						if (this.form.includes(key)) {
							const value = item[key as keyof UploadPlanItem];

							data.append(`${key}[]`, String(value));
						}
					});
				});

				const res = await uploadDataScheduleWelding(data);

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
			} finally {
				notificationStore.disableLoading();
			}
		},

		async previewTagOK () {
			try {
				this.isModalTagOKOpen = false;
				notificationStore.loading = true;

				let res = null;
				if (this.formData.line_id && this.formData.shift && this.formData.tipe_part) {

					switch (this.formData.line_id) {
						case "CO2 ROBOT":
							this.formData.line_id = "CO2 RB";
							break;
						case "S/A ADM MANUAL":
							this.formData.line_id = "S/A MAN";
							break;
						case "S/A ADM ROBOT":
							this.formData.line_id = "S/A RB";
							break;
						default:
							this.formData.line_id = this.formData.line_id;
					}

					res = await previewTagOKService(this.formData);
				}

				if (res?.status !== 200) {
					notificationStore.showDialogWarning(
						"Warning",
						"Terjadi kesalahan saat memproses data"
					);
					return;
				}

			} catch (error) {
				console.log("err: ", error);
			} finally {
				notificationStore.disableLoading();
			}
		},

		async fetchDataTagOK () {
			try {
				notificationStore.loading = true;

				const params = {
					line_id: this.formData.line_id,
					date: this.formData.date,
					shift: this.formData.shift,
					tipe_part: this.formData.tipe_part,
				};

				const data = JSON.stringify(params);

				const res = await getDataTagOK(data)

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