import axios from "axios";
import { useConfigStore } from "@/pinia/config";
import type {
  ShippingCycleItem,
  ShippingCycleParams,
  ShippingCycleResponse,
} from '@/types/Logistik/IFP/Report/ShippingCycle';

class ShippingCycleService {
  private get apiUrl(): string {
    const configStore = useConfigStore();
    return configStore.apiUrl;
  }

  normalizeCycle(cycle?: string | number | null): string {
    if (cycle === null || cycle === undefined || cycle === "") return "";
    return String(cycle).trim();
  }

  normalizeTanggal(tanggal?: string | null): string | null {
    if (!tanggal) return null;
    return String(tanggal);
  }
normalizeResponse(data: any): ShippingCycleResponse {
  if (Array.isArray(data)) {
    return { data };
  }

  // Struktur HMMI: { reguler: { data: [...] }, ckd: { data: [...] } }
  if (data && (data.reguler !== undefined || data.ckd !== undefined)) {
    return data; // ← kembalikan utuh, jangan di-normalize
  }

  // Struktur legacy: { data: [...] }
  if (data && Array.isArray(data.data)) {
    return data;
  }

  return { data: [] };
}

  async fetchDataMieruka(
    params: ShippingCycleParams,
  ): Promise<ShippingCycleResponse> {
    const cycleParam = this.normalizeCycle(params.cycle);
    const tanggalParam = this.normalizeTanggal(params.tanggal);

    const res = await axios.get(
      `http://${this.apiUrl}/majsf_rest_api/api/control_prepare/mieruka_shipping`,
      {
        params: {
          cycle: cycleParam,
          customer: params.customer,
          tanggal: tanggalParam,
        },
      },
    );

    return this.normalizeResponse(res.data);
  }

  async fetchDataMierukaCustomer(
    params: ShippingCycleParams,
  ): Promise<ShippingCycleResponse> {
    const cycleParam = this.normalizeCycle(params.cycle);
    const tanggalParam = this.normalizeTanggal(params.tanggal);

    const res = await axios.get(
      `http://${this.apiUrl}/majsf_rest_api/api/control_prepare/mieruka_shipping_customer`,
      {
        params: {
          cycle: cycleParam,
          customer: params.customer,
          tanggal: tanggalParam,
        },
      },
    );

    return this.normalizeResponse(res.data);
  }

  async fetchDataMierukaValue(
    params: ShippingCycleParams,
  ): Promise<ShippingCycleItem[]> {
    const result = await this.fetchDataMieruka(params);
    return Array.isArray(result.data) ? result.data : [];
  }

  async fetchDataMierukaMmkiValue(
    params: ShippingCycleParams,
  ): Promise<ShippingCycleItem[]> {
    const result = await this.fetchDataMierukaCustomer(params);
    return Array.isArray(result.data) ? result.data : [];
  }

  async fetchMierukaAll(customer: string): Promise<ShippingCycleResponse> {
    const res = await axios.get(
      `http://${this.apiUrl}/majsf_rest_api/api/control_prepare/mieruka_shipping`,
      {
        params: {
          cycle: "",
          customer,
        },
      },
    );

    return this.normalizeResponse(res.data);
  }
}

const shippingCycleService = new ShippingCycleService();

export default shippingCycleService;