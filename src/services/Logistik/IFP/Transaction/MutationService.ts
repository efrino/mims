import axios from 'axios';
import type {
  MutationQuery,
  MutationResponse,
  MutationUpdatePayload,
  MutationUpdateResponse,
  DeliveryQuery,
  DeliveryResponse,
} from '@/types/Logistik/IFP/Transaction/Mutation';

// === Base URLs ===
const getMutationBaseUrl = () => {
  return `http://192.168.10.67/majsf_rest_api/api/mutation_ifp/mutation`;
};

const getDeliveryBaseUrl = () => {
  return `http://192.168.10.67/majsf_rest_api/api/Report_delivery/delivery_by_date`;
};

const getSalesOrderDoBaseUrl = () => {
  return `http://192.168.10.67/majsf_rest_api/api/mutation_ifp`;
};


// === Mutation ===
export async function getStockMutation(params: MutationQuery): Promise<MutationResponse> {
  try {
    const response = await axios.get<MutationResponse>(getMutationBaseUrl(), { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching stock mutation:', error);
    return {
      success: false,
      data: [],
      total: 0,
      message: 'Gagal memuat data mutasi stok dari server.',
    };
  }
}

export async function bulkUpdateMutation(
  items: MutationUpdatePayload[]
): Promise<MutationUpdateResponse> {
  try {
    const response = await axios.post<MutationUpdateResponse>(
      getMutationBaseUrl(),
      JSON.stringify(items),
      {
        headers: { 'Content-Type': 'application/json' },
        params: { action: 'update' },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating mutation:', error);
    return {
      success: false,
      message: 'Gagal mengupdate data mutasi stok.',
    };
  }
}

// === Delivery ===
export async function getDeliveryByDate(params: DeliveryQuery): Promise<DeliveryResponse> {
  try {
    const response = await axios.get<DeliveryResponse>(getDeliveryBaseUrl(), { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching delivery data:', error);
    return {
      success: false,
      data: {
        COUNT: '0',
        MESSAGE: '',
        MESSAGE2: '',
        SHOPCODE: '',
        ZPRINT: '',
        ISTPOX: [],
        LINES: [],
        LIPS: [],
        ZDELIVERY: [],
        ZDNDO: [],
      },
      message: 'Gagal memuat data delivery dari server.',
    };
  }
}

// === Fungsi Lama (Dibiarkan Tetap Utuh) ===
export async function getSalesOrderDo(
  date: string,
  startHour: string,
  endHour: string
): Promise<{ status: boolean; message: string; is_cycledelv_null: boolean; data: any[] }> {
  try {
    const response = await axios.get(
      `${getSalesOrderDoBaseUrl()}/sales_order_do_get/${date}/${startHour}/${endHour}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching sales order DO:', error);
    return {
      status: false,
      message: 'Gagal memuat data sales order DO dari server.',
      is_cycledelv_null: false,
      data: [],
    };
  }
}

/**
 * Update data cycledelv (vsnmr_v) menggunakan POST form-data/urlencoded
 */
export async function updateEtd(payload: {
  id: number | string;
  vbeln: string;
  vbelv: string;
  posnr: string;
  cycledelv: string;
  status?: string;
}): Promise<{ status: boolean; message: string }> {
  try {
    const formData = new URLSearchParams();
    formData.append('id', String(payload.id));
    formData.append('vbeln', String(payload.vbeln));
    formData.append('vbelv', String(payload.vbelv));
    formData.append('posnr', String(payload.posnr));
    formData.append('cycledelv', String(payload.cycledelv));
    formData.append('status', String(payload.status || ''));

    // Eksekusi POST ke endpoint update_etd_post
    const response = await axios.post(
      `${getSalesOrderDoBaseUrl()}/update_etd_post`,
      formData,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error pada Axios HTTP Layer:', error);
    // Tolak promise agar dideteksi oleh blok catch di Mutation.vue
    return Promise.reject(error); 
  }
}

// ============================================================
// === FUNGSI BARU (DITAMBAHKAN DI PALING BAWAH) ===
// ============================================================
export async function getSalesOrderDoByDate(
  date: string,
  action: string,
  mode: string = 'db'
): Promise<{ status: boolean; message: string; is_cycledelv_null: boolean; data: any[] }> {
  try {
    const response = await axios.get(
      `${getSalesOrderDoBaseUrl()}/sales_order_do_by_date`,
      {
        params: { date, action, mode }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching sales order DO by date:', error);
    return {
      status: false,
      message: 'Gagal memuat data sales order DO berdasarkan tanggal.',
      is_cycledelv_null: false,
      data: [],
    };
  }
}

export async function syncSalesOrderQtyToMovement(payload: { start_hour: string; end_hour: string; items: any[] }): Promise<any> {
  try {
    // KUNCI PERBAIKAN: Kirim 'payload' secara langsung sebagai data body POST Axios
    const response = await axios.post(
      `${getSalesOrderDoBaseUrl()}/sync_qty_to_movement`, 
      payload, // Kirim objek utuh { start_hour, end_hour, items } ke backend
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        } 
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error pada Axios Sinkronisasi Massal:', error);
    return Promise.reject(error);
  }
}

export async function importExcelMgl(
  file: File,
  tanggal: string,
  shift: string,
  updatedBy: string,
  typeUpload?: string
): Promise<{ success: boolean; message: string; data?: any[] }> {
  try {
    const formData = new FormData();
    formData.append('file_excel', file);
    formData.append('tanggal', tanggal);
    formData.append('shift', shift);
    formData.append('updated_by', updatedBy);
    if (typeUpload !== undefined && typeUpload !== null) {
      formData.append('type_upload', typeUpload);
    }

    const response = await axios.post(
      `${getSalesOrderDoBaseUrl()}/import_excel_mgl`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error importing Excel MGL:', error);
    let msg = 'Gagal mengupload file Excel.';
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      msg = error.response.data.message;
    }
    return {
      success: false,
      message: msg,
    };
  }
}

export async function syncStockMovement(date: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await axios.get(
      `http://192.168.10.67/majsf_rest_api/api/achievement_report/sync_stock_movement`,
      { params: { date } }
    );
    return {
      success: true,
      message: response.data?.message || 'Sinkronisasi pergerakan stok berhasil.',
    };
  } catch (error: any) {
    console.error('Error syncing stock movement:', error);
    let errMsg = 'Gagal sinkronisasi pergerakan stok.';
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      errMsg = error.response.data.message;
    }
    return {
      success: false,
      message: errMsg,
    };
  }
}

export async function syncStockAwal(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await axios.get(
      `http://192.168.10.67/majsf_rest_api/api/Mutation_ifp/sync_stock_awal`
    );
    return {
      success: true,
      message: response.data?.message || 'Sinkronisasi stok awal berhasil.',
    };
  } catch (error: any) {
    console.error('Error syncing stock awal:', error);
    let errMsg = 'Gagal sinkronisasi stok awal.';
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      errMsg = error.response.data.message;
    }
    return {
      success: false,
      message: errMsg,
    };
  }
}