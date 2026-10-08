/* eslint-disable no-prototype-builtins */
import { defineStore } from "pinia";
import axios from "axios";
import {jwtDecode} from "jwt-decode";
import pinia from "@/pinia/store.js";
import { useConfigStore } from "./config";
import { useNotificationStore } from "@/pinia/notification";

const configStore = useConfigStore(pinia);
const notificationStore = useNotificationStore();

export const useAuthStore = defineStore({
    id: "auth",
    state: () => ({
        user: {},
        authorization: {},
        group: "",
        token: localStorage.getItem(configStore.tokenID) || "",
        isLogin: localStorage.getItem(configStore.tokenID) ? true : false,
        features: [],
        router: null,
        route: null,
    }),
    actions: {
        async login(action = function () { }) {
            notificationStore.loading = true;
            const config = {
                method: "post",
                url: `http://${configStore.apiUrl}/majsf_rest_api/api/auth/login`,
                data: {
                    username: this.user.username,
                    password: this.user.password,
                },
            };
            axios(config)
                .then((response) => {
                    if (response.status === 200) {
                        notificationStore.disableLoading();
                        axios.defaults.headers.common.Authorization = `Bearer ${response.data.token}`;
                        this.setUserData(response.data.token);
                        if (action) {
                            action();
                        }
                    }
                })
                .catch(this.onError);
        },
        async logout() {
            const user = this.checkUser(); 
            this.user = {};
            this.authorization = {};
            this.group = "";
            this.features = [];
            this.token = "";
            localStorage.removeItem(configStore.tokenID);
            delete axios.defaults.headers.common.Authorization;
            axios.get(
                `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/close_all?user=${user}`
            );
        },
        setUserData(token) {
            const decode = jwtDecode(token);
            this.user = {
                username: decode.username,
                first_name: decode.first_name,
                last_name: decode.last_name,
                fullname: decode.fullname,
                photo: decode.photo,
                exp: decode.exp,
            };
            this.isLogin = true;
            this.token = token;
            this.group = decode.group;
            this.authorization = decode.authorization;
            localStorage.setItem(configStore.tokenID, token);
        },
        async checkLogin() {
            const config = {
                method: "get",
                url: `http://${configStore.apiUrl}/majsf_rest_api/auth/me`,
            };
            return new Promise((resolve, reject) => {
                axios(config)
                    .then((response) => {
                        if (response.status === 200) {
                            axios.defaults.headers.common.Authorization = `Bearer ${response.data.token}`;
                            this.setUserData(response.data.token);
                            resolve(true);
                        } else {
                            this.logout();
                            resolve(false);
                        }
                    })
                    .catch((error) => {
                        reject(error);
                        this.logout();
                    });
            });
        },
        checkExpired() {
            if (Date.now() >= this.user.exp * 1000) {
                return true;
            }
            return false;
        },
        checkUser() {
            return this.user.fullname;
        },
        checkUserName() {
            return this.user.username;
        },
        checkPermission(data) {
            let permission = data.hasOwnProperty("permission") ? data.permission : [];
            let authorization = this.authorization;
            let group = this.group;
            let isAdmin = group === "1";
            permission = Object.keys(permission).length ? false : true;
            if (!permission) {
                permission = Object.keys(authorization).length
                    ? authorization.includes(data.permission.parent)
                        ? true
                        : false
                    : false;
            }
            return permission || isAdmin;
        },
        checkAccess(permission = false) {
            let authorization = this.authorization;
            let group = this.group;
            let isAdmin = group === "1";
            if (permission) {
                permission = Object.keys(authorization).length
                    ? authorization.includes(permission)
                        ? true
                        : false
                    : false;
            }
            return permission || isAdmin;
        },
        onError(error) {
            let msg,
                callback = () => { };
            if (error.response.data.status) {
                msg = error.response.data.status;
                switch (error.response.data.status) {
                    case "Expired token":
                        callback = () => {
                            this.logout();
                            configStore.router.push({
                                name: "login",
                            });
                        };
                        break;
                    case "Access Denied!!":
                        callback = () => {
                            configStore.router.back();
                        };
                        break;
                    default:
                        break;
                }
            } else {
                msg = error.response.statusText;
            }
            notificationStore.showDialogWarning("Warning", msg, callback);
            notificationStore.disableLoading();
        },
    },
});
