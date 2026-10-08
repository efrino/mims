import axios from "axios";
import { useConfigStore } from "@/pinia/config";
import type { response } from "@/types/response";
import type { ControlPrepareFilter } from "@/types/Logistik/MasterData/MasterCycle";

/* =========================
 * BASE
 * ========================= */

const baseUrl = () => {
    const configStore = useConfigStore();
    return `http://${configStore.apiUrl}/majsf_rest_api/api/control_prepare`;
};

/* =========================
 * MASTER
 * ========================= */

export const fetchMasterCycleService = async (): Promise<response> => {
    return axios.get(baseUrl());
};

export const fetchAllCycleService = async (
    filter: ControlPrepareFilter
): Promise<response> => {
    return axios.get(`${baseUrl()}/cycle`, { params: filter });
};

/* =========================
 * DETAIL ITEM
 * ========================= */

export const fetchDataItemP5Service = async (
    cycle: string | number,
    plant: string,
    date?: string | null
): Promise<response> => {
    return axios.get(`${baseUrl()}/adm_p5`, {
        params: { cycle, dn: plant, date: date || "" },
    });
};

export const fetchDataItemP4Service = async (
    cycle: string | number,
    plant: string,
    date?: string | null
): Promise<response> => {
    return axios.get(`${baseUrl()}/adm_p4`, {
        params: { cycle, dn: plant, date: date || "" },
    });
};

/* =========================
 * EXPORT & TOTAL
 * ========================= */

export const fetchDataEksporService = async (
    filter: ControlPrepareFilter
): Promise<response> => {
    return axios.get(`${baseUrl()}/ekspor`, { params: filter });
};

export const fetchTotalCycleService = async (
    filter: ControlPrepareFilter
): Promise<response> => {
    return axios.get(baseUrl(), { params: filter });
};

export const fetchTotalCycleNowService = async (
    cycle: string | number,
    plant: string,
    date?: string | null
): Promise<response> => {
    return axios.get(`${baseUrl()}/total_cycle`, {
        params: { cycle, dn: plant, date: date || "" },
    });
};

export const fetchTimeCycleP4Service = async (
    filter: ControlPrepareFilter
): Promise<response> => {
    return axios.get(`${baseUrl()}/time_p4`, { params: filter });
};
