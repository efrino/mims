import axios from 'axios';
import type {
  PrintBarcodeItem,
  PrintBarcodeFormData,
  PrintBarcodeFormRepeat,
  PrintBarcodeFilter,
  PrintBarcodeFilter1,
} from '@/types/Logistik/IFP/Transaction/PrintBarcode';

export const usePrintBarcodeService = () => {
  const getApiUrl = (configApiUrl: string) => `http://${configApiUrl}/majsf_rest_api/api`;
  const fetchDataBarcode = async (apiUrl: string): Promise<PrintBarcodeItem[]> => {
    try {
      const response = await axios.get(
        `${getApiUrl(apiUrl)}/print-barcode/data`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const fetchPrintDataBarcode = async (
    apiUrl: string,
    filter: PrintBarcodeFilter
  ): Promise<PrintBarcodeItem[]> => {
    try {
      const response = await axios.get(
        `${getApiUrl(apiUrl)}/print-barcode`,
        { params: filter }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const fetchPrintRepeat = async (
    apiUrl: string,
    filter: PrintBarcodeFilter1
  ): Promise<PrintBarcodeItem[]> => {
    try {
      const response = await axios.get(
        `${getApiUrl(apiUrl)}/print-barcode/print`,
        { params: filter }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const addPrint = async (
    apiUrl: string,
    formData: PrintBarcodeFormData
  ): Promise<any> => {
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, String(value));
      });

      const response = await axios.post(
        `${getApiUrl(apiUrl)}/print-barcode/add`,
        data,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  };

  const repeatPrint = async (
    apiUrl: string,
    formRepeat: PrintBarcodeFormRepeat
  ): Promise<any> => {
    try {
      const data = new FormData();
      Object.entries(formRepeat).forEach(([key, value]) => {
        data.append(key, String(value));
      });

      const response = await axios.post(
        `${getApiUrl(apiUrl)}/print-barcode/repeat`,
        data,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  };

  return {
    fetchDataBarcode,
    fetchPrintDataBarcode,
    fetchPrintRepeat,
    addPrint,
    repeatPrint,
  };
};