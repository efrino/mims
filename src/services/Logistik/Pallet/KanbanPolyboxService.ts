import type { PolyboxPayload, KanbanApiResponse, KanbanSubmitResult, KanbanHistoryItem } from '@/types/Logistik/Pallet/Scanout';
import { useMspinAuthStore } from '@/stores/Logistik/Pallet/mspinAuthStore';
import mspinApi from '@/stores/Logistik/Pallet/mspinApi';

function buildHeaders(token: string) {
  return {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Bearer ${token}`,
  };
}

async function withAuth<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const authStore = useMspinAuthStore();
  const token = authStore.getToken();
  if (!token) {
    authStore.logout();
    throw new Error('No authentication token');
  }
  try {
    return await fn(token);
  } catch (error: any) {
    if (error?.response?.status === 401) {
      authStore.logout();
      throw new Error('Sesi kadaluarsa, silakan login kembali');
    }
    throw error;
  }
}

export const useKanbanPolyboxService = () => {
  const submitKanbanPolybox = async (payload: PolyboxPayload): Promise<KanbanSubmitResult> => {
    return withAuth(async (token) => {
      const params = new URLSearchParams();
      params.append('id_label', payload.id_label);

      try {
        const response = await mspinApi.post<KanbanApiResponse>(
          '/sto/combin-kanban/polybox-kanban',
          params.toString(),
          { headers: buildHeaders(token) }
        );
        const data = response.data;
        return {
          success: data.status === true,
          message: data.message ?? '-',
          dn: data.dn ?? null,
          scanned: data.scanned ?? null,
          total: data.total ?? null,
        };
      } catch (error: any) {
        const apiMessage = error?.response?.data?.message;
        if (apiMessage) {
          return {
            success: false,
            message: apiMessage,
            dn: null,
            scanned: null,
            total: null,
          };
        }
        throw error;
      }
    });
  };

  const fetchHistoryKanban = async (customer: string = 'POLYBOX'): Promise<KanbanHistoryItem[]> => {
    return withAuth(async (token) => {
      const params = new URLSearchParams();
      params.append('customer', customer);
      params.append('quick', 'true');
      const response = await mspinApi.post(
        '/sto/combin-kanban/history-kanban',
        params.toString(),
        { headers: buildHeaders(token) }
      );
      return response.data?.data ?? [];
    });
  };

  return { submitKanbanPolybox, fetchHistoryKanban };
};