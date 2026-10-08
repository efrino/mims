/* eslint-disable no-prototype-builtins */
import { defineStore } from "pinia";

export const useNotificationStore = defineStore({
  id: "notification",
  state: () => ({
    loading: false,
    confirmation: {
      status: false,
      message: "",
      callback: function() {}
    },
    alert: {
      status: false,
      message: "",
      type: "info"
    },
    alertAdditional: {
      status: false,
      message: "",
      type: "info"
    },
    dialog: {
      status: false,
      title: "",
      message: "",
      type: "info",
      onClose: function() {},
      onOk: null
    },
    confirm: {
      status: false,
      message: "",
      onOk: function() {}
    }
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
    showAlert(message, callback = null) {
      if (callback) {
        callback();
      }
      this.alert.status = true;
      this.alert.message = message;
      setTimeout(() => {
        this.alert.status = false;
      }, 5000);
    },
    showAlertAdditional(message, callback = null) {
      if (callback) {
        callback();
      }
      this.alertAdditional.status = true;
      this.alertAdditional.message = message;
      setTimeout(() => {
        this.alertAdditional.status = false;
      }, 5000);
    },
    showAlertSuccess(message, callback = null) {
      this.alert.type = "success";
      this.showAlert(message, callback);
    },
    showAlertWarning(message, callback = null) {
      this.alert.type = "warning";
      this.showAlert(message, callback);
    },
    showAlertError(message, callback = null) {
      this.alert.type = "error";
      this.showAlert(message, callback);
    },

    showAlertAdditionalSuccess(message, callback = null) {
      this.alertAdditional.type = "success";
      this.showAlertAdditional(message, callback);
    },
    showAlertAdditionalWarning(message, callback = null) {
      this.alertAdditional.type = "warning";
      this.showAlertAdditional(message, callback);
    },
    showAlertAdditionalError(message, callback = null) {
      this.alertAdditional.type = "error";
      this.showAlertAdditional(message, callback);
    },
    showDialogSuccess(title, message, onClose = () => {}) {
      this.dialog.title = title;
      this.dialog.type = "success";
      this.dialog.status = true;
      this.dialog.message = message;
      this.dialog.onClose = onClose;
    },
    showDialogWarning(title, message, onClose = () => {}) {
      this.dialog.title = title;
      this.dialog.type = "warning";
      this.dialog.status = true;
      this.dialog.message = message;
      this.dialog.onClose = onClose;
    },
    showDialogError(title, message, onClose = () => {}) {
      this.dialog.title = title;
      this.dialog.type = "error";
      this.dialog.status = true;
      this.dialog.message = message;
      this.dialog.onClose = onClose;
    },
    showConfirm(title, message, onOk = null, onClose = () => {}) {
      this.dialog.title = title;
      this.dialog.type = "warning";
      this.dialog.status = true;
      this.dialog.message = message;
      this.dialog.onClose = onClose;
      this.dialog.onOk = onOk;
    },
    onApiResponseDialogAlert(response, callback = () => {}) {
      if (response.status === 200) {
        let tmp = document.createElement("DIV");
        tmp.innerHTML = response.data.messages;
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
    onApiResponseToastAlert(response, callback = () => {}) {
      if (response.status === 200) {
        let tmp = document.createElement("DIV");
        tmp.innerHTML = response.data.messages;
        let msg = tmp.textContent || tmp.innerText || "";
        if (response.data.success) {
          this.showAlertSuccess(msg, callback);
        } else {
          this.showAlertWarning(msg);
        }
      } else {
        this.showAlertWarning(response.data.status);
      }
      this.disableLoading();
    },
    onApiResponseToastAlertAdditional(response, callback = () => {}) {
      if (response.status === 200) {
        let tmp = document.createElement("DIV");
        tmp.innerHTML = response.data.additional_info;
        let msg = tmp.textContent || tmp.innerText || "";
        if (response.data.success) {
          this.showAlertAdditionalWarning(msg, callback);
        } else {
          this.showAlertAdditionalWarning(msg);
        }
      } else {
        this.showAlertAdditionalWarning(response.data.status);
      }
      // this.disableLoading();
    },
    onApiResponseToastAlertNew(response, callback = () => {}) {
      if (response.status === 200) {
        let tmp = document.createElement("DIV");
        tmp.innerHTML = response.data.messages;
        let msg = tmp.textContent || tmp.innerText || "";
        if (response.data.success) {
          this.showAlertSuccess(msg, callback);
        } else {
          this.showAlertWarning(msg);
        }
      } else {
        this.showAlertWarning(response.data.status);
      }
      // this.disableLoading();
    },
  }
});
