import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useKanbanHmmiService } from '@/services/Logistik/Pallet/KanbanGroup2Service';
import type {
  KanbanHistoryItem,
  HmmiPreviewResult,
  HmmiSubmitPayload,
  HmmiSubmitResult,
} from '@/types/Logistik/Pallet/Scanout';

export const useKanbanHmmiStore = defineStore('kanbanHmmi', () => {
  const kanbanHmmiService = useKanbanHmmiService();

  // ─── State ────────────────────────────────────────────────────────────────
  const historyKanban = ref<KanbanHistoryItem[]>([]);
  const isLoadingHistory = ref(false);
  const isLoadingPreview = ref(false);
  const isSubmitting = ref(false);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const fetchPreview = async (
    id_kanban: string,
    id_label: string
  ): Promise<HmmiPreviewResult> => {
    isLoadingPreview.value = true;
    try {
      return await kanbanHmmiService.fetchPreviewKanban(id_kanban, id_label);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal fetch preview';
      return { success: false, message };
    } finally {
      isLoadingPreview.value = false;
    }
  };

  const submitKanban = async (payload: HmmiSubmitPayload): Promise<HmmiSubmitResult> => {
    isSubmitting.value = true;
    try {
      return await kanbanHmmiService.submitKanbanHmmi(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Koneksi mspin gagal';
      return { success: false, message };
    } finally {
      isSubmitting.value = false;
    }
  };

  const fetchHistory = async (customer: string = 'Grup2'): Promise<void> => {
    isLoadingHistory.value = true;
    try {
      historyKanban.value = await kanbanHmmiService.fetchHistoryKanban(customer);
    } catch (error) {
      console.error('Gagal fetch history kanban HMMI:', error);
      historyKanban.value = [];
    } finally {
      isLoadingHistory.value = false;
    }
  };

  return {
    historyKanban,
    isLoadingHistory,
    isLoadingPreview,
    isSubmitting,
    fetchPreview,
    submitKanban,
    fetchHistory,
  };
});