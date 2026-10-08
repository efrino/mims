import { useConfigStore } from "@/stores/config";
import type { Form } from "@/types/PCD/Master/MasterDataKanban";
import type { response } from "@/types/response";
import axios from "axios";

export const getAllPart = async (): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/part/wip`
  )

  return response;
};

export const addPart = async (params: Form): Promise<response> => {
  const configStore = useConfigStore();

  const data = new FormData();

  data.append("part_number", params.part_number);
  data.append("job_number", params.job_number);
  data.append("photo", params.photo);
  data.append("tipe", params.tipe);

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Print_kanban`,
    data,
    {
			headers: {
				"Content-Type": "multipart/form-data",
			},
    },
  )

  return response;
};