import { useConfigStore } from "@/stores/config";
import type { Filter } from "@/types/PCD/Stamping/Patan";
import type { response } from "@/types/response";
import axios from "axios";

export const fetchPatanPress = async (filter: Filter): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan/schedule_press`,
    {
      params: filter
    }
  )

  return response;
};

export const fetchLinePress = async (filter: Filter): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan/schedule`,
    {
      params: filter
    }
  )

  return response;
};

export const addPatanPress = async (data: any): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan/add`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  )

  return response;
};

export const editPatanPress = async (data: any): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.put(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  )

  return response;
};

export const previewTagOKPress = async (params: Filter): Promise<response> => {
  const configStore = useConfigStore();

	const data = new URLSearchParams();

	data.append("date", params.date);
	data.append("shift", params.shift);
	data.append("tipe_part", params.part_type);
	data.append("line_id", params.line);

  const response = await axios.put(
    `http://${configStore.apiUrl}/majsf_rest_api/api/inventory-achievement/print_tag_ok`,
		data,
    {
			headers: {
				"Content-Type": "multipart/form-data",
			},
    },
  )

  return response;
};

export const getDataTagOKPress = async (params: Filter): Promise<response> => {
  const configStore = useConfigStore();
  console.log(params)

  let data = {
    date: params.date,
    shift: params.shift,
    tipe_part: params.part_type,
    line_id: params.line,
  }

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan/data_tag_ok?parameter_tag=${JSON.stringify(data)}`,
  )

  return response;
};

export const uploadDataPatanPress = async (params: any): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/patan`,
		params,
    {
			headers: {
				"Content-Type": "multipart/form-data",
			},
    },
  )

  return response;
};