/* eslint-disable no-prototype-builtins */
import { defineStore } from "pinia";
import axios, { AxiosError } from "axios";
import { jwtDecode } from "jwt-decode";
import { useConfigStore } from "./config";
import { useNotificationStore } from "./notification";
import { router } from "@/router";
import type { Router, RouteLocationNormalizedLoaded } from "vue-router";
import type { User, JwtPayload, PermissionData } from "@/types/stores";
import { changePassword as changePasswordService } from "@/services/PasswordService";
import {
    getMyProfile as getMyProfileService,
    updateMyProfile as updateMyProfileService,
    type ProfileData,
} from "@/services/ProfileService";

export const useAuthStore = defineStore("auth", {
    state: () => {
        const configStore = useConfigStore();
        const authorizationStorageKey = `${configStore.tokenID}_authorization`;
        let storedAuthorization: string[] = [];
        try {
            const parsed: unknown = JSON.parse(localStorage.getItem(authorizationStorageKey) ?? '[]');
            if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
                storedAuthorization = parsed;
            }
        } catch {
            localStorage.removeItem(authorizationStorageKey);
        }
        return {
            user: {} as User,
            authorization: storedAuthorization,
            group: "",
            token: localStorage.getItem(configStore.tokenID) || "",
            isLogin: localStorage.getItem(configStore.tokenID) ? true : false,
            features: [] as string[],
            router: null as Router | null,
            route: null as RouteLocationNormalizedLoaded | null,
            returnUrl: null as string | null,
            photoVersion: 0,
        };
    },
    actions: {
        async login(action: () => void = function () { }) {
            const configStore = useConfigStore();
            const notificationStore = useNotificationStore();
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
                        this.setUserData(response.data.token, response.data.authorization);

                        // Redirect after login
                        if (action) {
                            action();
                            window.location.reload();
                        } else {
                            router.replace('/');
                            window.location.reload();
                        }
                    }
                })
                .catch(this.onError);
        },
        logout() {
            const configStore = useConfigStore();
            const user = this.checkUser();

            // Clear all auth data first
            this.user = {};
            this.authorization = [];
            this.group = "";
            this.features = [];
            this.token = "";
            this.isLogin = false;
            localStorage.removeItem(configStore.tokenID);
            localStorage.removeItem(`${configStore.tokenID}_authorization`);
            delete axios.defaults.headers.common.Authorization;

            // Close all sessions
            axios.get(
                `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/close_all?user=${user}`
            ).catch(() => {
                // Ignore errors from close_all endpoint
            });

            // Redirect to login page after logout
            router.replace('/login');
            window.location.reload();
        },
        // `authorization` opsional, TIDAK lagi dibaca dari isi JWT — token sengaja dibuat
        // kecil (tanpa full permission list, bisa puluhan ribu byte utk user dgn banyak
        // akses -> header Authorization kelewat besar -> Apache 400 "field too large" di
        // SETIAP request). Sumber authorization sekarang body response login (sekali saja,
        // tak kena limit header). Fallback ke decode.authorization kalau tak dikirim
        // eksplisit (kompatibel dgn caller lama / endpoint lain yg blm diupdate).
        setUserData(token: string, authorization?: string[]) {
            const configStore = useConfigStore();
            const decode = jwtDecode<JwtPayload>(token);
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
            this.authorization = authorization ?? decode.authorization ?? this.authorization;
            localStorage.setItem(configStore.tokenID, token);
            localStorage.setItem(`${configStore.tokenID}_authorization`, JSON.stringify(this.authorization));
        },
        async checkLogin() {
            const configStore = useConfigStore();
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
            if (this.user.exp && Date.now() >= this.user.exp * 1000) {
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
        checkPermission(data: PermissionData): boolean {
            const permissionObj = data.permission ?? {};
            const authorization = this.authorization as string[];
            const group = this.group;
            const isAdmin = group === "1";
            const permissionAnyOf = data.permissionAnyOf ?? [];

            // Jika route mendefinisikan any-of, cukup salah satu permission cocok.
            // Jika tidak, pertahankan perilaku existing untuk parent tunggal.
            let permission = permissionAnyOf.length === 0 && Object.keys(permissionObj).length === 0;

            if (permissionAnyOf.length > 0) {
                permission = permissionAnyOf.some((item) => authorization.includes(item));
            } else if (!permission) {
                permission = data.permission?.parent !== undefined && authorization.includes(data.permission.parent);
            }

            return permission || isAdmin;
        },
        checkAccess(permission: string | false = false): boolean {
            const authorization = this.authorization as string[];
            const group = this.group;
            const isAdmin = group === "1";

            let allowed = false;

            if (permission) {
                allowed =
                authorization.length > 0
                    ? authorization.includes(permission)
                    : false;
            }

            return allowed || isAdmin;
        },
        async changePassword(oldPassword: string, newPassword: string, confirmPassword: string) {
            const notificationStore = useNotificationStore();

            try {
                notificationStore.loading = true;

                const response = await changePasswordService({
                    username: this.user.username!,
                    old: oldPassword,
                    new: newPassword,
                    new_confirm: confirmPassword,
                });

                notificationStore.disableLoading();
                const cleanMessage = response.messages?.replace(/<[^>]+>/g, '') || "Failed to change password";

                if (response.status == 'success' || response.status == '200') {
                    notificationStore.showDialogSuccess(
                        "Success",
                        cleanMessage || "Password Successfully Changed"
                    );
                    return { success: true, message: response.messages || "Password changed successfully" };
                } else {
                    notificationStore.showDialogWarning(
                        "Warning",
                        cleanMessage || "Failed to change password"
                    );
                    return { success: false, message: response.messages || "Failed to change password" };
                }
            } catch (error) {
                notificationStore.disableLoading();

                if (axios.isAxiosError(error)) {
                    const errorMessage = error.response?.data?.message ||
                                       error.response?.data?.status ||
                                       error.response?.statusText ||
                                       "An error occurred while changing password";

                    notificationStore.showDialogWarning("Error", errorMessage, () => {});
                    return { success: false, message: errorMessage };
                }

                notificationStore.showDialogWarning("Error", "An unexpected error occurred", () => {});
                return { success: false, message: "An unexpected error occurred" };
            }
        },
        async fetchProfile(): Promise<ProfileData | null> {
            const notificationStore = useNotificationStore();

            try {
                return await getMyProfileService(this.user.username!);
            } catch (error) {
                const errorMessage = axios.isAxiosError(error)
                    ? error.response?.data?.messages || error.response?.data?.status || error.response?.statusText || "Failed to load account"
                    : "Failed to load account";

                notificationStore.showDialogWarning("Error", errorMessage, () => {});
                return null;
            }
        },
        async updateProfile(firstName: string, lastName: string, email: string, phone: string, photoData: string, photoType: string) {
            const notificationStore = useNotificationStore();

            try {
                notificationStore.loading = true;

                const response = await updateMyProfileService({
                    username: this.user.username!,
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    phone,
                    photo_data: photoData,
                    photo_type: photoType,
                });

                notificationStore.disableLoading();
                const cleanMessage = response.messages?.replace(/<[^>]+>/g, '') || "";

                if (response.success) {
                    this.user.first_name = firstName;
                    this.user.last_name = lastName;
                    this.user.fullname = `${firstName} ${lastName}`;
                    if (photoData) {
                        this.photoVersion = Date.now();
                    }
                    notificationStore.showDialogSuccess("Success", cleanMessage || "Account Successfully Updated");
                    return { success: true, message: cleanMessage };
                } else {
                    notificationStore.showDialogWarning("Warning", cleanMessage || "Failed to update account");
                    return { success: false, message: cleanMessage };
                }
            } catch (error) {
                notificationStore.disableLoading();

                const errorMessage = axios.isAxiosError(error)
                    ? error.response?.data?.messages || error.response?.data?.status || error.response?.statusText || "An error occurred while updating account"
                    : "An unexpected error occurred";

                notificationStore.showDialogWarning("Error", errorMessage, () => {});
                return { success: false, message: errorMessage };
            }
        },
        onError(error: AxiosError<{ status?: string }>) {
            const configStore = useConfigStore();
            const notificationStore = useNotificationStore();
            let msg: string;
            let callback = () => { };
            if (error.response?.data?.status) {
                msg = error.response.data.status;
                switch (error.response.data.status) {
                    case "Expired token":
                        callback = () => {
                            this.logout();
                            if (configStore.router) {
                                configStore.router.push({
                                    name: "login",
                                });
                            }
                        };
                        break;
                    case "Access Denied!!":
                        callback = () => {
                            if (configStore.router) {
                                configStore.router.back();
                            }
                        };
                        break;
                    default:
                        break;
                }
            } else {
                msg = error.response?.statusText || "An error occurred";
            }
            notificationStore.showDialogWarning("Warning", msg, callback);
            notificationStore.disableLoading();
        },
    },
});
