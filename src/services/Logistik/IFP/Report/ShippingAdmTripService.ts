import axios from "axios";
import { useConfigStore } from "@/pinia/config";
import type {
  AdmTripItem,
  AdmTripMappedItem,
  AdmTripParams,
  AdmTripResult,
} from '@/types/Logistik/IFP/Report/ShippingAdmTrip';
class ShippingAdmTripService {
  private get apiUrl(): string {
    const configStore = useConfigStore();
    return configStore.apiUrl;
  }

  private readonly dnMap: Record<string, string> = {
    P4: "DN4",
    P5: "DN5",
  };

  plantToDn(plant?: string | null): string {
    return this.dnMap[String(plant)] || "DN4";
  }

  normalizeDate(input?: string | null): string {
    if (!input) return "";
    if (String(input).includes("/")) {
      return String(input).split("/").reverse().join("-");
    }
    return String(input);
  }

  normalizeApiList<T = any>(data: any): T[] {
    if (!data) return [];
    if (data === 0) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [data];
  }

  normalizeMonth(input?: string | null): string {
  if (!input) return "";

  const str = String(input);

  // kalau sudah format YYYY-MM → langsung return
  if (/^\d{4}-\d{2}$/.test(str)) {
    return str;
  }

  // kalau format YYYY-MM-DD → ambil bulan saja
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str.slice(0, 7);
  }

  // kalau format pakai "/" (misal 06/2026 atau 06/05/2026)
  if (str.includes("/")) {
    const parts = str.split("/");

    // asumsi umum: DD/MM/YYYY atau MM/YYYY
    if (parts.length === 3) {
      // DD/MM/YYYY → ambil YYYY-MM
      return `${parts[2]}-${parts[1].padStart(2, "0")}`;
    }

    if (parts.length === 2) {
      // MM/YYYY
      return `${parts[1]}-${parts[0].padStart(2, "0")}`;
    }
  }

  // fallback aman: ambil 7 karakter pertama
  return str.slice(0, 7);
}

  mapTripItem(row: AdmTripItem): AdmTripMappedItem {
    return {
      ...row,
      trip_num: Number(row.trip),
      qty_num: Number(row.qty) || 0,
      is_scan_num: Number(row.is_scan) === 1 ? 1 : 0,
      plan: String(row.plan || "").toUpperCase(),
    };
  }

  buildTripOptions(rows: AdmTripMappedItem[]): number[] {
    const tripSet = new Set<number>();

    rows.forEach((row) => {
      if (Number.isFinite(row.trip_num)) {
        tripSet.add(row.trip_num);
      }
    });

    return Array.from(tripSet).sort((a, b) => a - b);
  }

  buildRouteOptions(rows: AdmTripMappedItem[]): string[] {
    const routeSet = new Set<string>();

    rows.forEach((row) => {
      const route = String(row.route || "").trim();
      if (route) {
        routeSet.add(route);
      }
    });

    return Array.from(routeSet).sort();
  }

  async fetchAdmTripAll(params: AdmTripParams = {}): Promise<AdmTripResult> {
    const dn = this.plantToDn(params.plant);
    const date = this.normalizeDate(params.date);

    const query: Record<string, any> = {
      dn,
      date,
    };

    if (params.trip != null) {
      query.trip = params.trip;
    }

    if (params.route) {
      query.route = params.route;
    }

    const res = await axios.get(
      `http://${this.apiUrl}/majsf_rest_api/api/control_prepare/adm_trip_all`,
      { params: query },
    );

    const rawList = this.normalizeApiList<AdmTripItem>(res.data);
    const dataTripAll = rawList.map((row) => this.mapTripItem(row));
    const tripOptions = this.buildTripOptions(dataTripAll);
    const routeOptions = this.buildRouteOptions(dataTripAll);

    return {
      dataTripAll,
      tripOptions,
      routeOptions,
    };
  }

  async getTripDetailP4(
    route: string,
    trip: string | number,
    plant: string,
    date: string | null = null,
  ): Promise<AdmTripItem[]> {
    const res = await axios.get(
      `http://${this.apiUrl}/majsf_rest_api/api/control_prepare/adm_p4_trip`,
      {
        params: {
          route,
          trip,
          dn: plant,
          date: date || "",
        },
      },
    );

    if (res.status !== 200) return [];
    return this.normalizeApiList<AdmTripItem>(res.data);
  }

  async getTripDetailP5(
    route: string,
    trip: string | number,
    plant: string,
    date: string | null = null,
  ): Promise<AdmTripItem[]> {
    const res = await axios.get(
      `http://${this.apiUrl}/majsf_rest_api/api/control_prepare/adm_p5_trip`,
      {
        params: {
          route,
          trip,
          dn: plant,
          date: date || "",
        },
      },
    );

    if (res.status !== 200) return [];
    return this.normalizeApiList<AdmTripItem>(res.data);
  }

  async getPerformanceCustomer(month: string, customer?: string | null) {
    const params: Record<string, any> = {
      month: this.normalizeMonth(month),
    };

    if (customer) {
      params.customer = customer.toLowerCase();
    }

    console.log("=== SERVICE PARAMS ===", params);

    const res = await axios.get(
      `http://${this.apiUrl}/majsf_rest_api/api/control_prepare/performanceDaily`,
      { params }
    );

    console.log("=== SERVICE RESPONSE ===", res.data);

    if (res.status !== 200) return [];

    return this.normalizeApiList(res.data);
  }

    async getPerformanceKanban(month: string, customer?: string) {

      const params: Record<string, any> = {
        month: this.normalizeMonth(month),
      };

      // kirim customer jika ada
      if (customer) {
        params.customer = customer;
      }

      console.log("=== SERVICE KANBAN PARAMS ===", params);

      try {
        const res = await axios.get(
          `http://${this.apiUrl}/majsf_rest_api/api/control_prepare/performanceKanban`,
          { params }
        );

        console.log("=== SERVICE KANBAN RESPONSE ===", res.data);

        if (
          res.data &&
          res.data.status === true &&
          Array.isArray(res.data.data)
        ) {
          return res.data.data;
        }

        return [];
      } catch (error) {
        console.error("Error Service Kanban:", error);
        return [];
      }
    }
}

const shippingAdmTripService = new ShippingAdmTripService();

export default shippingAdmTripService;