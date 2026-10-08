import type { response } from "@/types/response";
import axios from "axios";

export const fetchdataDropdown = async (): Promise<response> => {
  const response = await axios.get(
    'http://192.168.10.8/order-shearing/public/index.php/material'
  );

  return response;
};

export const fetchdataShearing = async (material: string): Promise<response> => {
  const res = await fetch(
    'http://192.168.10.8/order-shearing/public/index.php/shearing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        material: material,
      }),
    }
  );

  if (!res.ok) {
    throw new Error('Gagal mengambil data');
  }

  const json = await res.json();

  return {
    status: res.status,
    data: json,
  }
}

export const submitToSAP = async (
  shearing: string,
  quantity: string
): Promise<response> => {
  const res = await axios.post(
    'http://192.168.10.8/order-shearing/public/index.php/create-order',
    {
      shearing,
      quantity,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    status: res.status,
    data: res.data,
  }
}