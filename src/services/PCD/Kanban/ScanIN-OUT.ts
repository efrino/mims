import { useConfigStore } from "@/stores/config";
import type { SaveKanbanIN } from "@/types/PCD/Kanban/ScanIN-OUT";
import type { response } from "@/types/response";
import axios from "axios";

export const getKanban = async (id_kanban: string): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/sap/execute`,
    {
      function: "Z_QC",
      params: {
        RPT: "GET_MATNR",
        PKKEY: id_kanban,
      },
    }
  )

  return response;
};

export const saveAllKanban = async (data: SaveKanbanIN[]): Promise<response> => {
  const configStore = useConfigStore();

  const formData = new FormData();
  data.forEach((dt: SaveKanbanIN) => {
    formData.append("part_number[]", dt.part_number);
    formData.append("kanban[]", dt.id_kanban);
    formData.append("qty[]", dt.qty);
    formData.append("status", dt.status);
  });

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-stock/scan-kanban`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  )

  return response;
};