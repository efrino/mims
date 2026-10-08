import type { Router, RouteLocationNormalizedLoaded } from "vue-router";

// Auth Store Types
export interface User {
    username?: string;
    first_name?: string;
    last_name?: string;
    fullname?: string;
    photo?: string;
    exp?: number;
    password?: string;
}

export interface JwtPayload {
    username: string;
    first_name: string;
    last_name: string;
    fullname: string;
    photo: string;
    exp: number;
    group: string;
    authorization: string[];
}

export interface PermissionData {
    permission?: {
        parent: string;
    };
    permissionAnyOf?: string[];
}

// Notification Store Types
export interface AlertState {
    status: boolean;
    message: string;
    type: "info" | "success" | "warning" | "error";
}

export interface DialogState {
    status: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    okLabel?: string;
    closeLabel?: string;
    onClose: () => void;
    onOk: (() => void) | null;
}

export interface ConfirmationState {
    status: boolean;
    message: string;
    callback: () => void;
}

export interface ConfirmState {
    status: boolean;
    message: string;
    onOk: () => void;
}

export interface ApiResponse {
    status: number;
    data: {
        success?: boolean;
        messages?: string;
        additional_info?: string;
        plant?: string;
        status?: string;
    };
}

// Config Store Types
export interface ConfigState {
    apiUrl: string;
    socketIoUrl: string;
    tokenID: string;
    sideBar: {
        drawer: boolean;
        topbar: boolean;
        width: number;
    };
    currentLayout: string;
    page: {
        name: string;
        navigations: string[];
        drawer: boolean;
    };
    router: Router | null;
    route: RouteLocationNormalizedLoaded | null;
}
