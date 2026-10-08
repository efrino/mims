import { useConfigStore } from "@/stores/config";
import type { response } from "@/types/response";
import axios from "axios";

export const getMasterPartGlc = async (): Promise<response> => {
  const configStore = useConfigStore();
  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Welding_glc/MasterPart`
  );
  return response;
};
