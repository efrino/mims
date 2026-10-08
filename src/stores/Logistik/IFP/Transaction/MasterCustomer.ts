import { defineStore } from 'pinia';
import { ref, computed } from 'vue'; 
import { useConfigStore } from '@/stores/config';
import { CustomerService } from '@/services/Logistik/IFP/Transaction/MasterCustomerService';
import type {
  Customer,
  CustomerCreatePayload,
  CustomerUpdatePayload,
  CustomerDeletePayload,
  ApiResponse,
} from '@/types/Logistik/IFP/Transaction/MasterCustomer';
import { useAuthStore } from '@/stores/auth';
export const useMasterCustomerStore = defineStore('masterCustomer', () => {
  const data = ref<Customer[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const authStore = useAuthStore();

  function getService(): CustomerService {
    const configStore = useConfigStore();
    return new CustomerService(configStore.apiUrl);
  }
  const permissions = computed(() => ({
    create: authStore.checkAccess('Logistik.Create.BarcodeCustomer'),
    update: authStore.checkAccess('Logistik.Update.BarcodeCustomer'),
    delete: authStore.checkAccess('Logistik.Delete.BarcodeCustomer'),
  }));
  async function fetchCustomers(params?: Record<string, unknown>): Promise<ApiResponse<Customer[]> | null> {
    const service = getService();
    loading.value = true;
    try {
      const res = await service.fetchData(params);
      if (res?.status === 'success') {
        data.value = res.data ?? [];
      } else {
        data.value = [];
      }
      return res;
    } catch (err) {
      console.error('Fetch Customer Error:', err);
      data.value = [];
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createCustomer(payload: CustomerCreatePayload): Promise<ApiResponse | null> {
    const service = getService();
    saving.value = true;
    try {
      return await service.create(payload);
    } catch (err) {
      console.error('Create Customer Error:', err);
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function updateCustomer(payload: CustomerUpdatePayload): Promise<ApiResponse | null> {
    const service = getService();
    saving.value = true;
    try {
      return await service.update(payload);
    } catch (err) {
      console.error('Update Customer Error:', err);
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function deleteCustomer(payload: CustomerDeletePayload): Promise<ApiResponse | null> {
    const service = getService();
    saving.value = true;
    try {
      return await service.delete(payload);
    } catch (err) {
      console.error('Delete Customer Error:', err);
      return null;
    } finally {
      saving.value = false;
    }
  }

  return {
    data,
    loading,
    saving,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    permissions
  };
});