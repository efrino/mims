import { useConfigStore } from "@/stores/config";
import type { response } from "@/types/response";
import axios from "axios";

export const fetchPartItems = async (): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/master/part/wip`
  )

  return response;
};

export const fetchKanbanData = async (): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Print_kanban/data-log`
  )

  return response;
};

export const sendToSAP = async (part_number: string): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Print_kanban/sap?part_number=${part_number}`
  )

  return response;
};

export const addPrintKanban = async (params: any): Promise<response> => {
  const configStore = useConfigStore();

  const data = new FormData();

  Object.values(params).forEach((item: any) => {
    data.append("id_kanban[]", item.id_kanban);
    data.append("part_number[]", item.part_number);
    data.append("job_number[]", item.job_number);
    data.append("range[]", item.range);
    data.append("part_name[]", item.part_name);
    data.append("qty_kbn[]", item.qty_kbn);
    data.append("qty_pallet[]", item.qty_pallet);
    data.append("type_pallet[]", item.type_pallet);
    data.append("storage[]", item.storage);
    data.append("car[]", item.car);
    data.append("customer[]", item.customer);
    data.append("line[]", item.line);
    data.append("line2[]", item.line2);
    data.append("zstatus[]", item.zstatus);
  });

  data.append("tipe", params.tipe);

  const response = await axios.post(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Print_kanban/add`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  
  return response;
};

export const fetchPrintDataKanban = async (): Promise<response> => {
  const configStore = useConfigStore();

  const response = await axios.get(
    `http://${configStore.apiUrl}/majsf_rest_api/api/Print_kanban`
  )

  return response;
};