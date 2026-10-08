import { getKanban, saveAllKanban } from "@/services/PCD/Kanban/ScanIN-OUT";
import { useNotificationStore } from "@/stores/notification";
import { useUtilityStore } from "@/stores/utility";
import type { ResScanKanban } from "@/types/PCD/Kanban/ScanIN-OUT";
import { defineStore } from "pinia";

const notificationStore = useNotificationStore();
const utilityStore = useUtilityStore();

export const useScanKanbanOUTStore = defineStore('scanKanbanOUT', {
		state: () => ({
			listKanbanOUT: [] as ResScanKanban[],
			id_kanban: "" as string,

		}),
		actions: {
			async getKanbanOUT() {
				try {
					notificationStore.loading = true;

					const res = await getKanban(this.id_kanban);

					if (res.status !== 200) {
						notificationStore.showDialogWarning(
							"Warning",
							"Gagal mendapatkan data kanban"
						);
					}
					
					const isExist = this.listKanbanOUT.some(
						item => item.id_kanban === this.id_kanban
					);

					if (isExist) {
						notificationStore.showDialogWarning(
							"Warning",
							"Kanban sudah pernah discan"
						);
						return;
					}

					this.listKanbanOUT.push({
						...res.data.data,
						id_kanban: this.id_kanban,
					} as ResScanKanban);

					notificationStore.showAlertSuccess("Kanban berhasil discan");

				} catch (error) {
					utilityStore.onError(error);
					console.log("err: ", error);
				} finally {
					this.id_kanban = "";
					notificationStore.disableLoading();
				}
			},

			deleteKanbanOUT(index: number) {
				notificationStore.showConfirm(
					"Konfirmasi",
					"Apakah anda yakin ingin menghapus kanban ini?",
					() => {
						this.listKanbanOUT.splice(index, 1);
						notificationStore.showAlertSuccess("Kanban berhasil dihapus");
					}
				);
			},

			async saveAllData() {
				try {
					notificationStore.loading = true;

					const save = await saveAllKanban(
						this.listKanbanOUT.map((item) => ({
							part_number: item.MATNR,
							id_kanban: item.id_kanban!,
							qty: item.BEHMG,
							status: "OUT",
						}))
					);

					if (save.status !== 200) {
						notificationStore.showDialogWarning(
							"Warning",
							"Gagal menyimpan data kanban"
						);
						return;
					};

					this.listKanbanOUT = [];

					notificationStore.showDialogSuccess(
						"Berhasil",
						"Semua data kanban berhasil disimpan"
					);
					
				} catch (error) {
					utilityStore.onError(error);
					console.log("err: ", error);
				} finally {
					notificationStore.disableLoading();
				}
			},
		},
});