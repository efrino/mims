import axios from "axios";
import { useConfigStore } from "@/stores/config";
import type { response } from "@/types/response";
import type {
  AddUtilizationPayload,
  AdjustQtySupplyPayload,
  CancelTpPayload,
  TransferPostingPayload
} from "@/types/Logistik/IRM/Transaction/SupplyMaterial";

const BASE_PATH = "majsf_rest_api/api/ifrm/RundownSupplyMat";

const baseUrl = () => `http://${useConfigStore().apiUrl}/${BASE_PATH}`;

export const fetchReservationList = async (): Promise<response> => {
  return await axios.get(`${baseUrl()}/list`);
};

// Sync live dari SAP + upsert ke tabel reservation. Dipanggil tombol "Refresh"
// dan setelah item pemanfaatan disimpan.
// scope=month -> RPT SUPPLY_STP_MON, mengambil data ~1 bulan (bukan hari ini saja).
// scope=day   -> RPT SUPPLY_STP, hanya hari ini; dipakai setelah TP karena SAP
//                bisa menghapus item saat TP dan perubahan itu harus segera
//                terlihat, tanpa perlu menarik ulang data sebulan.
export const syncFromSap = async (scope: "day" | "month" = "month"): Promise<response> => {
  return await axios.get(`${baseUrl()}/showAll`, { params: { scope } });
};

export const fetchSupplyHistory = async (no_reservasi: string, no_item: string): Promise<response> => {
  return await axios.get(`${baseUrl()}/history`, { params: { no_reservasi, no_item } });
};

// Riwayat banyak no reservasi sekaligus (isi kolom riwayat pada file Excel).
export const fetchSupplyHistoryBulk = async (no_reservasi: string[]): Promise<response> => {
  return await axios.post(`${baseUrl()}/historyBulk`, { no_reservasi });
};

export const adjustQtySupply = async (payload: AdjustQtySupplyPayload): Promise<response> => {
  return await axios.post(`${baseUrl()}/adjustQtySupply`, payload);
};

// Cari material di SAP (RPT SEARCH_MAT) untuk form item pemanfaatan.
export const searchMaterial = async (keyword: string): Promise<response> => {
  return await axios.get(`${baseUrl()}/searchMaterial`, { params: { keyword } });
};

// Daftar item pemanfaatan pada satu no reservasi.
export const fetchUtilizations = async (no_reservasi: string): Promise<response> => {
  return await axios.get(`${baseUrl()}/utilizations`, { params: { no_reservasi } });
};

export const addUtilization = async (payload: AddUtilizationPayload): Promise<response> => {
  return await axios.post(`${baseUrl()}/addUtilization`, payload);
};

export const transferPosting = async (payload: TransferPostingPayload): Promise<response> => {
  return await axios.post(`${baseUrl()}/transferPosting`, payload);
};

export const cancelTp = async (payload: CancelTpPayload): Promise<response> => {
  return await axios.post(`${baseUrl()}/cancelTp`, payload);
};
