/* eslint-disable no-prototype-builtins */
import { defineStore } from "pinia";
import type { AlertState, DialogState, ConfirmationState, ConfirmState, ApiResponse } from "@/types/stores";

export const useNotificationStore = defineStore("notification", {
  state: () => ({
    loading: false,
    confirmation: {
      status: false,
      message: "",
      callback: function() {}
    } as ConfirmationState,
    alert: {
      status: false,
      message: "",
      type: "info" as "info" | "success" | "warning" | "error"
    } as AlertState,
    alertAdditional: {
      status: false,
      message: "",
      type: "info" as "info" | "success" | "warning" | "error"
    } as AlertState,
    dialog: {
      status: false,
      title: "",
      message: "",
      type: "info" as "info" | "success" | "warning" | "error",
      okLabel: "OK",
      closeLabel: "Close",
      onClose: function() {},
      onOk: null
    } as DialogState,
    confirm: {
      status: false,
      message: "",
      onOk: function() {}
    } as ConfirmState
  }),
  actions: {
    disableLoading(){
      setTimeout(() => {
        this.loading = false;
      }, 500);
    },
    disableResponse(){
      setTimeout(() => {
        this.dialog.status = false;
      }, 500);
    },
    showAlert(message: string, callback: (() => void) | null = null) {
      if (callback) {
        callback();
      }
      this.alert.status = true;
      this.alert.message = message;
      setTimeout(() => {
        this.alert.status = false;
      }, 5000);
    },
    showAlertAdditional(message: string, callback: (() => void) | null = null) {
      if (callback) {
        callback();
      }
      this.alertAdditional.status = true;
      this.alertAdditional.message = message;
      setTimeout(() => {
        this.alertAdditional.status = false;
      }, 5000);
    },
    showAlertSuccess(message: string, callback: (() => void) | null = null) {
      this.alert.type = "success";
      this.showAlert(message, callback);
    },
    showAlertWarning(message: string, callback: (() => void) | null = null) {
      this.alert.type = "warning";
      this.showAlert(message, callback);
    },
    showAlertError(message: string, callback: (() => void) | null = null) {
      this.alert.type = "error";
      this.showAlert(message, callback);
    },

    showAlertAdditionalSuccess(message: string, callback: (() => void) | null = null) {
      this.alertAdditional.type = "success";
      this.showAlertAdditional(message, callback);
    },
    showAlertAdditionalWarning(message: string, callback: (() => void) | null = null) {
      this.alertAdditional.type = "warning";
      this.showAlertAdditional(message, callback);
    },
    showAlertAdditionalError(message: string, callback: (() => void) | null = null) {
      this.alertAdditional.type = "error";
      this.showAlertAdditional(message, callback);
    },
    showDialogSuccess(title: string, message: string, onClose: () => void = () => {}) {
      this.dialog.title = title;
      this.dialog.type = "success";
      this.dialog.status = true;
      this.dialog.message = message;
      this.dialog.okLabel = "OK";
      this.dialog.closeLabel = "Close";
      this.dialog.onOk = null;
      this.dialog.onClose = onClose;
    },
    showDialogWarning(title: string, message: string, onClose: () => void = () => {}) {
      this.dialog.title = title;
      this.dialog.type = "warning";
      this.dialog.status = true;
      this.dialog.message = message;
      this.dialog.okLabel = "OK";
      this.dialog.closeLabel = "Close";
      this.dialog.onOk = null;
      this.dialog.onClose = onClose;
    },
    showDialogError(title: string, message: string, onClose: () => void = () => {}) {
      this.dialog.title = title;
      this.dialog.type = "error";
      this.dialog.status = true;
      this.dialog.message = message;
      this.dialog.okLabel = "OK";
      this.dialog.closeLabel = "Close";
      this.dialog.onOk = null;
      this.dialog.onClose = onClose;
    },
    showConfirm(
      title: string,
      message: string,
      onOk: (() => void) | null = null,
      onClose: () => void = () => {},
      okLabel = "OK",
      closeLabel = "Close"
    ) {
      this.dialog.title = title;
      this.dialog.type = "warning";
      this.dialog.status = true;
      this.dialog.message = message;
      this.dialog.okLabel = okLabel;
      this.dialog.closeLabel = closeLabel;
      this.dialog.onClose = onClose;
      this.dialog.onOk = onOk;
    },
    onApiResponseDialogAlert(response: ApiResponse, callback: () => void = () => {}) {
      if (response.status === 200) {
        let tmp = document.createElement("DIV");
        tmp.innerHTML = response.data.messages || "";
        let msg = tmp.textContent || tmp.innerText || "";

        if (response.data.success) {
          let title = "Berhasil";
          if (response.data.plant) {
            title += ` - ${response.data.plant}`;
          }

          this.showDialogSuccess(title, msg, callback);
        } else {
          this.showDialogWarning("Peringatan", msg);
        }
      } else {
        this.showDialogWarning("Kesalahan", response.data.status || "Terjadi kesalahan.");
      }
      this.disableLoading();
    },
    onApiResponseToastAlert(response: ApiResponse, callback: () => void = () => {}) {
      if (response.status === 200) {
        let tmp = document.createElement("DIV");
        tmp.innerHTML = response.data.messages || "";
        let msg = tmp.textContent || tmp.innerText || "";
        if (response.data.success) {
          this.showAlertSuccess(msg, callback);
        } else {
          this.showAlertWarning(msg);
        }
      } else {
        this.showAlertWarning(response.data.status || "");
      }
      this.disableLoading();
    },
    onApiResponseToastAlertAdditional(response: ApiResponse, callback: () => void = () => {}) {
      if (response.status === 200) {
        let tmp = document.createElement("DIV");
        tmp.innerHTML = response.data.additional_info || "";
        let msg = tmp.textContent || tmp.innerText || "";
        if (response.data.success) {
          this.showAlertAdditionalWarning(msg, callback);
        } else {
          this.showAlertAdditionalWarning(msg);
        }
      } else {
        this.showAlertAdditionalWarning(response.data.status || "");
      }
    },
    onApiResponseToastAlertNew(response: ApiResponse, callback: () => void = () => {}) {
      if (response.status === 200) {
        let tmp = document.createElement("DIV");
        tmp.innerHTML = response.data.messages || "";
        let msg = tmp.textContent || tmp.innerText || "";
        if (response.data.success) {
          this.showAlertSuccess(msg, callback);
        } else {
          this.showAlertWarning(msg);
        }
      } else {
        this.showAlertWarning(response.data.status || "");
      }
    },
    timeoutDisableResponse(time = 10000) {
      setTimeout(() => {
        this.dialog.status = false;
      }, time);
    },
  }
});
