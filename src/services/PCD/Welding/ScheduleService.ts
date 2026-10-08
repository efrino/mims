import { useConfigStore } from "@/stores/config";
import type { filterData, formAddData } from "@/types/PCD/Welding/WeldingSchedule";
import type { response } from "@/types/response";
import axios from "axios";

export const getAllDataTable = async (filter: filterData): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding_schedule`,
		{
			params: filter
		}
  )

  return response;
};

export const LineList = async (): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding_schedule/line_list`,
  )

  return response;
};

export const addDataScheduleWelding = async (params: formAddData): Promise<response> => {
  const configStore = useConfigStore();

	const data = new FormData();

	data.append("period", params.period);
	data.append("line_id", params.line_id);
	data.append("date", params.date);
	data.append("shift", params.shift);
	data.append("part_number", params.part_number);
	data.append("tpt", params.tpt);
	data.append("stroke", params.stroke);
	data.append("uph", params.uph);
	data.append("lotsize", params.lotsize);
	data.append("patan", params.patan);
	data.append("job_number", params.job_number);

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding_schedule/add`,
		data,
    {
			headers: {
				"Content-Type": "multipart/form-data",
			},
    },
  )

  return response;
};

export const uploadDataScheduleWelding = async (params: any): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding-schedule`,
		params,
    {
			headers: {
				"Content-Type": "multipart/form-data",
			},
    },
  )

  return response;
};

export const previewTagOKService = async (params: formAddData): Promise<response> => {
  const configStore = useConfigStore();

	const data = new URLSearchParams();

	data.append("date", params.date);
	data.append("shift", params.shift);
	data.append("tipe_part", params.tipe_part);
	data.append("line_id", params.line_id);

  const response = await axios.put(
    `http://${configStore.apiUrl}/majsf_rest_api/api/welding-achievement/print_tag_ok`,
		data,
    {
			headers: {
				"Content-Type": "multipart/form-data",
			},
    },
  )

  return response;
};

export const getDataTagOK = async (params: any): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/Welding-schedule/data_tag_ok?parameter_tag=${params}`,
  )

  return response;
};