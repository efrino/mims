import { useConfigStore } from "@/stores/config";
import type { formDataInput } from "@/types/PCD/Master/MasterPartAndon";
import type { response } from "@/types/response";
import axios from "axios";

export const getAllData = async (): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/part/all`
  )

  return response;
};

export const addDataPart = async (param: formDataInput): Promise<response> => {
  const configStore = useConfigStore();

	const data = new FormData();
	data.append("part_number", param.part_number);
	data.append("job_number", param.job_number);
	data.append("is_active", param.is_active);

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/part/add`,
		data,
    {
			headers: {
				"Content-Type": "multipart/form-data",
			},
    },
  )

  return response;
};

export const updateDataPart = async (param: formDataInput): Promise<response> => {
  const configStore = useConfigStore();

	const data = new FormData();
	data.append("part_number", param.part_number);
	data.append("job_number", param.job_number);
	data.append("is_active", param.is_active);
	data.append("id", param.id);

  const response = await axios.put(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/part`,
		data,
    {
			headers: {
				"Content-Type": "multipart/form-data",
			},
    },
  )

  return response;
};