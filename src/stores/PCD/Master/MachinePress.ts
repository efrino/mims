import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useConfigStore } from '@/stores/config';
import { useAuthStore } from '@/stores/auth';
import { MachinePressService } from '@/services/PCD/Master/MachinePressService';
import type {
  MachinePress,
  MachinePressCreatePayload,
  MachinePressUpdatePayload,
  MachinePressDeletePayload,
  ApiResponse
} from '@/types/PCD/Master/MachinePress';

export const useMachinePressStore = defineStore('machinePress', () => {
  const data = ref<MachinePress[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const authStore = useAuthStore();

  function getService(): MachinePressService {
    const configStore = useConfigStore();
    return new MachinePressService(configStore.apiUrl);
  }

  const permissions = computed(() => ({
    create: authStore.checkAccess('Master.Create.MachinePress'),
    update: authStore.checkAccess('Master.Update.MachinePress'),
    delete: authStore.checkAccess('Master.Delete.MachinePress')
  }));

  async function fetchMachinePress(lineId?: string): Promise<void> {
    const service = getService();
    loading.value = true;
    try {
      data.value = await service.fetchData(lineId);
    } catch (err) {
      console.error('Fetch Machine Press Error:', err);
      data.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function createMachinePress(payload: MachinePressCreatePayload): Promise<ApiResponse | null> {
    const service = getService();
    saving.value = true;
    try {
      return await service.create(payload);
    } catch (err) {
      console.error('Create Machine Press Error:', err);
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function updateMachinePress(payload: MachinePressUpdatePayload): Promise<ApiResponse | null> {
    const service = getService();
    saving.value = true;
    try {
      return await service.update(payload);
    } catch (err) {
      console.error('Update Machine Press Error:', err);
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function deleteMachinePress(payload: MachinePressDeletePayload): Promise<ApiResponse | null> {
    const service = getService();
    saving.value = true;
    try {
      return await service.delete(payload);
    } catch (err) {
      console.error('Delete Machine Press Error:', err);
      return null;
    } finally {
      saving.value = false;
    }
  }

  return {
    data,
    loading,
    saving,
    permissions,
    fetchMachinePress,
    createMachinePress,
    updateMachinePress,
    deleteMachinePress
  };
});
