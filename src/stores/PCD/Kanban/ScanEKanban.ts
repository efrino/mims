import { scanBarcodeEKanban } from "@/services/PCD/Kanban/ScanEKanban";
import { useNotificationStore } from "@/stores/notification";
import { defineStore } from "pinia";

const notificationStore = useNotificationStore();

export const useScanEKanbanStore = defineStore('scanEKanban', {
	state: () => ({
		barcodeId: "" as string,
	}),
	actions: {
		async onScan() {
			try {
				notificationStore.loading = true;

				const res = await scanBarcodeEKanban(this.barcodeId);

				if (res.status !== 200) {
					notificationStore.showDialogWarning(
						"error", "Failed to scan E-Kanban.");
					return;
				};

				if (res.data.status === false) {

					notificationStore.showDialogWarning(
						"warning", res.data.messages);
					this.barcodeId = "";
					return;

				} else{
					notificationStore.showAlertSuccess("E-Kanban scanned successfully.");
					this.barcodeId = "";
				}

			} catch (error) {
				console.error("Err:", error);
			} finally {
				notificationStore.disableLoading();
			}
		}
	}
});