import { useConfigStore } from "@/stores/config";
import type { response } from "@/types/response";
import axios from "axios";

export const scanBarcodeEKanban = async (barcodeId: string): Promise<response> => {
  const configStore = useConfigStore();

  const data = new URLSearchParams();
  data.append("scan", barcodeId);

  const response = await axios.put(
    `http://${configStore.apiUrl}/majsf_rest_api/api/kanban_circulation/scan_ekanban`,
    data,
    {
      headers: {
          "Content-Type": "multipart/form-data",
        },
    }
  )

  return response;
};