import { addDataPart, getAllData, updateDataPart } from "@/services/PCD/Master/MasterPartAndon";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import type { dataTable, formDataInput } from "@/types/PCD/Master/MasterPartAndon";
import { defineStore } from "pinia";

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();

export const useMasterPartAndonStore = defineStore("MasterPartAndon", {
	state: () => ({
		dataTable: [] as dataTable[],
		isModalAddOpen: false,
		isModalEditOpen: false,
		formData: {
			part_number: "",
			job_number: "",
			is_active: "",
			id: "",
		} as formDataInput,
	}),
	actions: {
		async fetchAllData() {
			try {
				notificationStore.loading = true;

				const res = await getAllData();

				if (res.status !== 200) {
					notificationStore.showDialogWarning(
						"Warning!",
						"Terjadi kesalahan saat mengambil data"
					);
					return;
				}

				this.dataTable = res.data;

			} catch (error) {
				console.log("err: ", error);
			} finally {
				notificationStore.disableLoading();
			}
		},

		async addData() {
			try {
				notificationStore.loading = true;

				if (!this.formData.part_number || !this.formData.job_number || !this.formData.is_active) {
					this.isModalAddOpen = false;
					notificationStore.showDialogWarning(
						"Warning",
						"Data yang dikirim harus lengkap!"
					);
					return;
				}

				const res = await addDataPart({
					"part_number": this.formData.part_number,
					"job_number": this.formData.job_number,
					"is_active": this.formData.is_active,
					"id": "",
				});

				this.isModalAddOpen = false;

				if (res.status === 200) {
					await this.fetchAllData();
					notificationStore.showDialogSuccess(
						"Success",
						"Berhasil menambahkan data"
					);
					this.formData.part_number = "";
					this.formData.job_number = "";
					this.formData.is_active = "";
					
				} else {
					notificationStore.showDialogWarning(
						"Warning",
						"Terjadi kesalahan saat menambahkan data"
					);
				}

				
			} catch (error) {
				console.log("err: ", error)
			} finally {
				notificationStore.disableLoading();
			}
		},

		editData(id: string) {
			const selectedLine = this.dataTable.find(
				e => e.id === id
			);

			if (!selectedLine) {
				notificationStore.showDialogWarning(
					"Warning",
					"Data tidak tersedia!"
				);
				return;
			}

			this.isModalEditOpen = true;

			this.formData = {
				part_number: selectedLine?.part_number!,
				job_number: selectedLine?.job_number!,
				is_active: selectedLine?.is_active!,
				id: selectedLine?.id!,
			}
		},

		async updateData() {
			try {
				notificationStore.loading = true;

				if (!this.formData.id || !this.formData.part_number || !this.formData.job_number || !this.formData.is_active) {
					this.isModalAddOpen = false;
					notificationStore.showDialogWarning(
						"Warning",
						"Data yang dikirim harus lengkap!"
					);
					return;
				}

				const res = await updateDataPart(this.formData);

				if (res.status === 200) {
					notificationStore.showDialogSuccess(
						"Success",
						"Berhasil mengedit data"
					);
					this.fetchAllData();
					this.formData.part_number = "";
					this.formData.job_number = "";
					this.formData.is_active = "";
					this.formData.id = "";
					
				} else {
					notificationStore.showDialogWarning(
						"Warning",
						"Terjadi kesalahan saat mengedit data"
					);
				}

				this.isModalEditOpen = false;

			} catch (error) {
				this.isModalEditOpen = false;
				utilityStore.onError(error);
				console.log("err: ", error);
			} finally {
				notificationStore.disableLoading();
			}
		},
	},
});