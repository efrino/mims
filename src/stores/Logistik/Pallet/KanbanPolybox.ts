import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useKanbanPolyboxService } from '@/services/Logistik/Pallet/KanbanPolyboxService';
import type { KanbanHistoryItem, KanbanSubmitResult } from '@/types/Logistik/Pallet/Scanout';

export const useKanbanPolyboxStore = defineStore('kanbanPolybox', () => {
  const kanbanPolyboxService = useKanbanPolyboxService();

  const historyKanban = ref<KanbanHistoryItem[]>([]);
  const isLoadingHistory = ref(false);
  const isSubmitting = ref(false);


  const submitKanban = async (
    id_label: string
  ): Promise<KanbanSubmitResult> => {
    isSubmitting.value = true;
    try {
      return await kanbanPolyboxService.submitKanbanPolybox({ id_label });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Koneksi mspin gagal';
      return { success: false, message };
    } finally {
      isSubmitting.value = false;
    }
  };

  const fetchHistory = async (customer: string = 'POLYBOX'): Promise<void> => {
    isLoadingHistory.value = true;
    try {
      historyKanban.value = await kanbanPolyboxService.fetchHistoryKanban(customer);
    } catch (error) {
      console.error('Gagal fetch history kanban:', error);
      historyKanban.value = [];
    } finally {
      isLoadingHistory.value = false;
    }
  };

  return {
    historyKanban,
    isLoadingHistory,
    isSubmitting,
    submitKanban,
    fetchHistory,
  };
});