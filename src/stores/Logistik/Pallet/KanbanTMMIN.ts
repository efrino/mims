import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useKanbanTmminService } from '@/services/Logistik/Pallet/KanbanTmminService';
import type { KanbanHistoryItem, KanbanSubmitResult } from '@/types/Logistik/Pallet/Scanout';

export const useKanbanTmminStore = defineStore('kanbanTmmin', () => {
  const kanbanTmminService = useKanbanTmminService();

  const historyKanban = ref<KanbanHistoryItem[]>([]);
  const isLoadingHistory = ref(false);
  const isSubmitting = ref(false);

  const submitKanban = async (
    id_kanban: string,
    id_label: string
  ): Promise<KanbanSubmitResult> => {
    isSubmitting.value = true;
    try {
      return await kanbanTmminService.submitKanbanTmmin({ id_kanban, id_label });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Koneksi mspin gagal';
      return { success: false, message };
    } finally {
      isSubmitting.value = false;
    }
  };


  const fetchHistory = async (customer: string = 'TMMIN'): Promise<void> => {
    isLoadingHistory.value = true;
    try {
      historyKanban.value = await kanbanTmminService.fetchHistoryKanban(customer);
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