import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import type { PeminjamanItem, StokBarangItem, PeminjamanFilters } from '@/types/Admin/Peminjaman';
import type { RingkasanBarangItem } from '@/types/Admin/MasterBarang';

interface ActionResponse<T = unknown> {
  success: boolean;
  messages: string;
  data?: T;
}

export interface PinjamPayload {
  nik_peminjam: string;
  nama_peminjam: string;
  departemen?: string;
  keperluan: string;
  lokasi_penggunaan: string;
  petugas_serah: string;
  ket?: string;
  kode_barang: string[];
  lama_pinjam: number[];
}

export interface KembaliPayload {
  no_pinjam: string;
  petugas_terima: string;
  ket?: string;
  kode_barang: string[];
  kondisi_kembali: string[];
}

export const usePeminjamanService = () => {
  const configStore = useConfigStore();
  const apiUrl = `http://${configStore.apiUrl}/majsf_rest_api/api/peminjaman`;

  const handleError = (error: unknown): never => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.messages || error.message || 'Terjadi kesalahan pada server';
      throw new Error(message);
    }
    // Error dari checkResponse sudah membawa pesan backend, jangan ditimpa
    if (error instanceof Error) throw error;
    throw new Error('Terjadi kesalahan yang tidak diketahui');
  };

  const checkResponse = <T>(data: ActionResponse<T>): ActionResponse<T> => {
    if (data && data.success === false) {
      throw new Error(data.messages || 'Proses gagal');
    }
    return data;
  };

  const fetchPeminjaman = async (filters?: Partial<PeminjamanFilters>): Promise<PeminjamanItem[]> => {
    try {
      const params: Partial<PeminjamanFilters> = {};
      if (filters?.date_from) params.date_from = filters.date_from;
      if (filters?.date_to) params.date_to = filters.date_to;

      const response = await axios.get<PeminjamanItem[]>(apiUrl, { params });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const fetchDetail = async (no_pinjam: string): Promise<PeminjamanItem[]> => {
    try {
      const response = await axios.get<ActionResponse<PeminjamanItem[]>>(`${apiUrl}/detail`, {
        params: { no_pinjam }
      });
      const data = checkResponse(response.data);
      return Array.isArray(data.data) ? data.data : [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const fetchStok = async (): Promise<StokBarangItem[]> => {
    try {
      const response = await axios.get<StokBarangItem[]>(`${apiUrl}/stok`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const fetchKetersediaan = async (): Promise<RingkasanBarangItem[]> => {
    try {
      const response = await axios.get<RingkasanBarangItem[]>(`${apiUrl}/ketersediaan`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const insertPeminjaman = async (payload: PinjamPayload) => {
    try {
      const response = await axios.post<ActionResponse<{ no_pinjam: string }>>(apiUrl, payload);
      return checkResponse(response.data);
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const prosesKembali = async (payload: KembaliPayload) => {
    try {
      const response = await axios.put<ActionResponse<PeminjamanItem[]>>(`${apiUrl}/kembali`, payload);
      return checkResponse(response.data);
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  return {
    fetchPeminjaman,
    fetchDetail,
    fetchStok,
    fetchKetersediaan,
    insertPeminjaman,
    prosesKembali
  };
};
