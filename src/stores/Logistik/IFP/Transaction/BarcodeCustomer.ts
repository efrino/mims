import { defineStore } from 'pinia';
import { ref, computed } from 'vue'; 
import { useConfigStore } from '@/pinia/config';
import { BarcodeDnService } from '@/services/Logistik/IFP/Transaction/BarcodeCustomerService';
import type { BarcodeDn, BarcodeDnFilter, UploadType, ApiResponse } from '@/types/Logistik/IFP/Transaction/BarcodeCustomer';
import { useAuthStore } from '@/stores/auth';
export const useBarcodeDnStore = defineStore('barcodeDn', () => {
  const data = ref<BarcodeDn[]>([]);
  const loading = ref(false);
  const uploading = ref(false);
  const authStore = useAuthStore();

  function getService(): BarcodeDnService {
    const configStore = useConfigStore();
    return new BarcodeDnService(configStore.apiUrl);
  }
  const permissions = computed(() => ({
    create: authStore.checkAccess('Logistik.Create.BarcodeCustomer'),
  }));
  async function fetchBarcode(params: BarcodeDnFilter): Promise<void> {
    const service = getService();
    loading.value = true;
    try {
      const res = await service.fetchBarcode(params);
      data.value = res.data ?? [];
    } catch {
      data.value = [];
    } finally {
      loading.value = false;
    }
  }

  function downloadFormat(type: UploadType): void {
    const configStore = useConfigStore();
    const service = getService();
    window.location.href = service.getDownloadFormatUrl(configStore.apiUrl, type);
  }

  async function uploadBarcode(
    file: File,
    type: UploadType,
    password?: string | null
  ): Promise<ApiResponse> {
    const service = getService();
    uploading.value = true;

    try {
      const res = await service.uploadBarcode(file, type, password);

      if (res.status === false || res.status === 'error') {
        throw new Error(res.message || 'Upload gagal');
      }

      return res;
    } catch (err: any) {
      throw new Error(err.message || 'Upload gagal');
    } finally {
      uploading.value = false;
    }
  }

  return {
    data,
    loading,
    uploading,
    fetchBarcode,
    downloadFormat,
    uploadBarcode,
      permissions,
  };
});