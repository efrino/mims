import axios from 'axios';
import type {
  SAPApiResponse,
  SAPSaveResponse,
  SAPSyncResponse,
  SAPParams,
  SAPFormDataPayload,
  SAPLine,
  SAPLineDetail,
  RawApiResponse,
  AdditionalTypeEnum,
} from '@/types/Welding/Transaction/AchievementSAP';
import { AdditionalTypeEnum as AdditionalEnum } from '@/types/Welding/Transaction/AchievementSAP';

interface RawLineDetail {
  id: string;
  urut_plan: string | number;
  additional: string;
  part_number: string;
  lotsize: string | number;
  lotsize_actual: string | number | null;
  qty_sap: string | number | null;
  reject: string | number | null;
  [key: string]: any;
}

interface RawLine {
  patan: string;
  line_id: string;
  detail: RawLineDetail[];
}

export class AchievementSAPService {
  baseURL: string;

  constructor(apiUrl: string) {
    if (!apiUrl || typeof apiUrl !== 'string') {
      throw new Error('Invalid API URL provided');
    }
    this.baseURL = `http://${apiUrl}/majsf_rest_api/api`;
  }

  parseAdditional(additional: string): AdditionalTypeEnum {
    const trimmed = String(additional).trim().toUpperCase();
    if (trimmed === 'ADD' || trimmed === '1') return AdditionalEnum.ADD;
    if (trimmed === 'LJ' || trimmed === '2') return AdditionalEnum.LJ;
    if (trimmed === 'TP' || trimmed === '3') return AdditionalEnum.TP;
    return AdditionalEnum.REGULAR;
  }

  toNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  }

  mapRawLineDetail(raw: RawLineDetail): SAPLineDetail {
    return {
      urut_plan: this.toNumber(raw.urut_plan),
      additional: this.parseAdditional(raw.additional),
      patan: raw.part_number || '',
      part_number: raw.part_number || '',
      lotsize: this.toNumber(raw.lotsize),
      lotsize_actual: this.toNumber(raw.lotsize_actual),
      qty_sap: this.toNumber(raw.qty_sap),
      reject: this.toNumber(raw.reject),
      keterangan_sap: '',
    };
  }

  calculateTotals(details: SAPLineDetail[]) {
    return {
      total_lot_rh: details.reduce((sum, d) => sum + d.lotsize, 0),
      total_ok: details.reduce((sum, d) => sum + d.lotsize_actual, 0),
      total_sap: details.reduce((sum, d) => sum + d.qty_sap, 0),
      total_repair: details.reduce((sum, d) => sum + d.reject, 0),
    };
  }

  mapRawLine(raw: RawLine): SAPLine {
    const mappedDetails = raw.detail.map(d => this.mapRawLineDetail(d));
    const totals = this.calculateTotals(mappedDetails);

    return {
      line_id: raw.line_id,
      patan: raw.patan || '',
      shift: 1,
      date: '',
      connection: true,
      detail: mappedDetails,
      ...totals,
    };
  }

  handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const message =
        typeof error.response?.data === 'object' &&
        error.response?.data !== null &&
        'message' in error.response.data &&
        typeof error.response.data.message === 'string'
          ? error.response.data.message
          : error.message;

      throw new Error(message);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('An unknown error occurred');
  }

  buildFormData(payload: SAPFormDataPayload): FormData {
    const formData = new FormData();
    const { formDetail } = payload;
    const arrayFields = [
      'urut_plan',
      'additional',
      'patan',
      'part_number',
      'lotsize',
      'lotsize_actual',
      'qty_sap',
      'reject',
      'keterangan_sap',
    ] as const;

    arrayFields.forEach((fieldName) => {
      const values = formDetail[fieldName];
      if (Array.isArray(values)) {
        values.forEach((value) => {
          if (Array.isArray(value)) {
            formData.append(`${fieldName}[]`, value.join(','));
          } else {
            formData.append(`${fieldName}[]`, String(value));
          }
        });
      }
    });

    formData.append('line_id', payload.lineId);
    formData.append('date', payload.date);
    formData.append('shift', String(payload.shift));
    formData.append('patan', payload.patan);

    return formData;
  }

  async fetchAchievementForSAP(params: SAPParams): Promise<SAPApiResponse> {
    try {
      const response = await axios.get(
        `${this.baseURL}/welding-achievement/achievement_sap`,
        {
          params: {
            date: params.date,
            shift: params.shift,
          },
        }
      );

      const data = response.data;

      if (typeof data !== 'object' || data === null) {
        throw new Error('Invalid API response format');
      }

      if (!data.status) {
        throw new Error(String(data.message || 'Request failed'));
      }

      if (!Array.isArray(data.data)) {
        return {
          status: true,
          message: String(data.message || 'Success'),
          data: [],
        };
      }

      const mappedLines = data.data.map((rawLine: any) => this.mapRawLine(rawLine));

      return {
        status: true,
        message: String(data.message || 'Success'),
        data: mappedLines,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async saveSAPDetail(payload: SAPFormDataPayload): Promise<SAPSaveResponse> {
    try {
      const formData = this.buildFormData(payload);

      const response = await axios.post(
        `${this.baseURL}/welding-achievement/achievement_sap`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = response.data;

      if (typeof data !== 'object' || data === null) {
        throw new Error('Invalid API response format');
      }

      if (!data.status) {
        throw new Error(String(data.message || 'Save failed'));
      }

      return {
        status: true,
        message: String(data.message || 'Saved successfully'),
        additional_info: typeof data.additional_info === 'string' 
          ? data.additional_info 
          : undefined,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async syncSAPData(tag: string, period: string): Promise<SAPSyncResponse> {
    try {
      if (!tag || typeof tag !== 'string') {
        throw new Error('Invalid tag parameter');
      }

      if (!period || typeof period !== 'string') {
        throw new Error('Invalid period parameter');
      }

      const response = await axios.get(
        `${this.baseURL}/report-kanban/sync_sap`,
        {
          params: { tag, period },
        }
      );

      const data = response.data;

      if (typeof data !== 'object' || data === null) {
        throw new Error('Invalid API response format');
      }

      if (!data.status) {
        throw new Error(String(data.message || 'Sync failed'));
      }

      return {
        status: true,
        message: String(data.message || 'Sync successful'),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export function createAchievementSAPService(
  apiUrl: string
): AchievementSAPService {
  return new AchievementSAPService(apiUrl);
}