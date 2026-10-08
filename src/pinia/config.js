/* eslint-disable no-prototype-builtins */
import { defineStore } from "pinia";
const origin = window.location.origin.replace("http://", "");
let apiUrl = "192.168.10.67";
let socketUrl = "192.168.10.67";
const findTerm = (term) => {
  if (origin.includes(term)) {
    return origin;
  }
};
switch (window.location.origin.replace("http://", "")) {
  //Development
  case findTerm("localhost"):
  case findTerm("192.168.20.31"):
  case findTerm("192.168.20.144"):
    apiUrl = origin.split(":");
    // apiUrl = apiUrl[0];
    apiUrl = "192.168.10.67";
    socketUrl = "192.168.10.67";
    break;
  default:
    apiUrl = origin;
    socketUrl = origin;
    break;
}
let socketIoUrl = socketUrl.split(":");
socketIoUrl = `http://${socketIoUrl[0]}:4000`;
const tokenID = "token-mims";
export const useConfigStore = defineStore({
  id: "config",
  state: () => ({
    apiUrl,
    socketIoUrl,
    tokenID,
    sideBar: {
      drawer: true,
      topbar: true,
      // bannerSrc: require("@/assets/app-background.png"),
      width: 300
    },
    currentLayout: "layout-blank",
    page: {
      name: "",
      navigations: [],
      drawer: false,
      // topbar: false
    },
    router: null,
    route: null
  }),
  actions: {}
});
