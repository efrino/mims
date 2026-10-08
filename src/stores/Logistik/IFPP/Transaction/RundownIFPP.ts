import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Material } from '@/types/Logistik/IFPP/Transaction/RundownIFPP';
import { rundownService } from '@/services/Logistik/IFPP/Transaction/RundownIFPPService';
import { useNotificationStore } from '@/stores/notification';
import { useConfigStore } from '@/stores/config';

export const useRundownStore = defineStore('rundown-ifpp', () => {
  const notificationStore = useNotificationStore();
  const configStore = useConfigStore();
  const materials = ref<Material[]>([]);
  const isLoading = ref(false);
  const deleteDialog = ref(false);
  const selectedType = ref<'IFPP-INHOUSE' | 'IFPP-OUTHOUSE'>('IFPP-INHOUSE');
  const strengthFilter = ref<number | null>(null);
  const destination = ref<string>('All');
  const reportUrl = ref<string>('');

  const customers = computed((): string[] => {
    const uniqueCustomers = new Set<string>(['All']);
    materials.value.forEach((item) => {
      if (item.customer_1 && item.customer_1.trim()) {
        uniqueCustomers.add(item.customer_1.trim());
      }
      if (item.customer_2 && item.customer_2.trim()) {
        uniqueCustomers.add(item.customer_2.trim());
      }
    });
    return Array.from(uniqueCustomers);
  });

  const filteredMaterials = computed(() => {
    if (!strengthFilter.value) return materials.value;
    return materials.value.filter(item => parseFloat(item.strength) < strengthFilter.value!);
  });

  async function fetchInventory(type: 'IFPP-INHOUSE' | 'IFPP-OUTHOUSE'): Promise<void> {
    isLoading.value = true;
    try {
      const result = await rundownService.fetchInventory(type);
      materials.value = result;
      selectedType.value = type;
      generateReportUrl(type);
    } catch (error) {
      notificationStore.showAlertError(
        error instanceof Error ? error.message : 'Failed to fetch inventory'
      );
      materials.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function uploadRundown(location: string): Promise<void> {
    isLoading.value = true;
    try {
      const response = await rundownService.uploadRundown(location);
      
      if (response.status === 200) {
        const message = response.data.message || `Upload Rundown ${location} Success!`;
        notificationStore.showAlertSuccess(message);
        await fetchInventory(selectedType.value);
      } else {
        notificationStore.showAlertError(response.data.message || 'Upload failed');
      }
    } catch (error) {
      notificationStore.showAlertError(
        error instanceof Error ? error.message : 'Failed to upload rundown'
      );
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteRundown(location: string): Promise<void> {
    isLoading.value = true;
    try {
      const response = await rundownService.deleteRundown(location);
      
      if (response.status === 200) {
        const message = response.data.message || `Delete Data Rundown ${location} Success!`;
        notificationStore.showAlertSuccess(message);
        await fetchInventory(selectedType.value);
      } else {
        notificationStore.showAlertError(response.data.message || 'Delete failed');
      }
    } catch (error) {
      notificationStore.showAlertError(
        error instanceof Error ? error.message : 'Failed to delete rundown'
      );
    } finally {
      isLoading.value = false;
    }
  }

  function generateReportUrl(type: 'IFPP-INHOUSE' | 'IFPP-OUTHOUSE'): void {
    let url = `http://${configStore.apiUrl}/monitoring/production/rundown/report?type=${type.toLowerCase()}`;

    if (destination.value) {
      url += `&destination=${destination.value}`;
    }

    reportUrl.value = url;
  }

  function openDeleteDialog(): void {
    deleteDialog.value = true;
  }

  function closeDeleteDialog(): void {
    deleteDialog.value = false;
  }

  function setStrengthFilter(value: number | null): void {
    strengthFilter.value = value;
  }

  function setDestination(value: string): void {
    destination.value = value;
  }

  return {
    materials,
    isLoading,
    deleteDialog,
    selectedType,
    strengthFilter,
    destination,
    reportUrl,
    customers,
    filteredMaterials,
    fetchInventory,
    uploadRundown,
    deleteRundown,
    openDeleteDialog,
    closeDeleteDialog,
    setStrengthFilter,
    setDestination
  };
});