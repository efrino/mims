import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useKanbanAdmService } from '@/services/Logistik/Pallet/KanbanAdmService';
import type { KanbanHistoryItem, KanbanSubmitResult } from '@/types/Logistik/Pallet/Scanout';

export const useKanbanAdmStore = defineStore('kanbanAdm', () => {
  const kanbanAdmService = useKanbanAdmService();

  const historyKanban = ref<KanbanHistoryItem[]>([]);
  const isLoadingHistory = ref(false);
  const isSubmitting = ref(false);

  /**
   * Submit ADM Kanban (Customer Kanban + Tag OK)
   * Returns result so the view can handle dialog display.
   */
  const submitKanban = async (
    id_kanban: string,
    id_label: string
  ): Promise<KanbanSubmitResult> => {
    isSubmitting.value = true;
    try {
      return await kanbanAdmService.submitKanbanAdm({ id_kanban, id_label });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Koneksi mspin gagal';
      return { success: false, message };
    } finally {
      isSubmitting.value = false;
    }
  };

  /**
   * Fetch recent kanban history for Aktivitas Terakhir
   */
  const fetchHistory = async (customer: string = 'ADM'): Promise<void> => {
    isLoadingHistory.value = true;
    try {
      historyKanban.value = await kanbanAdmService.fetchHistoryKanban(customer);
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