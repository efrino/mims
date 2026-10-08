import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  deleteAIChatSession,
  fetchAIChatMessages,
  fetchAIChatSessions,
  streamAIChat,
  updateAIChatSessionTitle
} from '@/services/AI/AIChatService';
import { normalizeAIChatMessages, normalizeAIChatSessions } from '@/services/AI/AIChatMapper';
import type { ChatConversation, ChatMessage } from '@/types/AI/AIChat';

const DEFAULT_TOPIC = 'Sales Order';
const TOPICS = [
  { title: 'Sales Distribution', value: 'Sales Order' },
  { title: 'Material Management', value: 'Material Management' },
  { title: 'Production Planning', value: 'Production Planning' }
];

type FailedOperation =
  | { type: 'sessions' }
  | { type: 'messages'; sessionId: string }
  | { type: 'stream'; conversationId: string; message: string; topic: string; errorMessageId: string };

export const useAIChatStore = defineStore('ai-chat', () => {
  const conversations = ref<ChatConversation[]>([]);
  const selectedTopic = ref(DEFAULT_TOPIC);
  const activeConversationId = ref<ChatConversation['id'] | ''>('');
  const isSending = ref(false);
  const status = ref('');
  const isLoadingSessions = ref(false);
  const loadingSessionId = ref('');
  const historyError = ref('');
  const failedOperation = ref<FailedOperation | null>(null);
  const messagesByConversation = ref<Record<string, ChatMessage[]>>({});
  const sessionIds = ref<Record<string, string>>({});
  const loadedSessionMessages = ref<Record<string, boolean>>({});
  const serverSessionIds = ref<Record<string, boolean>>({});

  const activeConversation = computed(
    () => conversations.value.find((conversation) => conversation.id === activeConversationId.value)?.title ?? 'Chat AI'
  );

  const messages = computed(() =>
    activeConversationId.value ? (messagesByConversation.value[String(activeConversationId.value)] ?? []) : []
  );
  const canRetry = computed(() => {
    const failure = failedOperation.value;
    if (!failure || isSending.value || isLoadingSessions.value || loadingSessionId.value) return false;
    return failure.type !== 'stream' || failure.conversationId === String(activeConversationId.value);
  });

  const suggestions = [
    'Bagaimana performa penjualan bulan ini?',
    'Analisis performa penjualan minggu lalu',
    'Cek order yang pending pengiriman'
  ];

  function formatTime(): string {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());
  }

  function formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async function loadConversations(): Promise<void> {
    isLoadingSessions.value = true;
    historyError.value = '';

    try {
      const serverConversations = normalizeAIChatSessions(await fetchAIChatSessions());
      const serverIds = new Set(serverConversations.map((conversation) => String(conversation.id)));
      const localConversations = conversations.value.filter((conversation) => {
        const id = String(conversation.id);
        return !serverIds.has(id) && (messagesByConversation.value[id]?.length ?? 0) > 0;
      });

      conversations.value = [...localConversations, ...serverConversations];
      for (const conversation of serverConversations) {
        const id = String(conversation.id);
        sessionIds.value[id] = id;
        serverSessionIds.value[id] = true;
      }
      if (failedOperation.value?.type === 'sessions') failedOperation.value = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memuat daftar percakapan.';
      historyError.value = message;
      failedOperation.value = { type: 'sessions' };
    } finally {
      isLoadingSessions.value = false;
    }
  }

  async function loadSessionMessages(sessionId: string): Promise<void> {
    if (loadedSessionMessages.value[sessionId] || loadingSessionId.value === sessionId) return;

    loadingSessionId.value = sessionId;
    historyError.value = '';
    messagesByConversation.value[sessionId] = [];

    try {
      messagesByConversation.value[sessionId] = normalizeAIChatMessages(
        await fetchAIChatMessages(sessionId),
        sessionId
      );
      loadedSessionMessages.value[sessionId] = true;
      if (failedOperation.value?.type === 'messages' && failedOperation.value.sessionId === sessionId) {
        failedOperation.value = null;
      }
    } catch (error) {
      historyError.value = error instanceof Error ? error.message : 'Gagal memuat pesan percakapan.';
      failedOperation.value = { type: 'messages', sessionId };
    } finally {
      loadingSessionId.value = '';
    }
  }

  function getSessionId(conversationId: ChatConversation['id']): string {
    const key = String(conversationId);

    if (!sessionIds.value[key]) {
      sessionIds.value[key] =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    return sessionIds.value[key];
  }

  function startNewChat(): void {
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
    const conversation: ChatConversation = {
      id,
      title: 'Chat baru',
      date: 'Hari ini'
    };

    conversations.value.unshift(conversation);
    messagesByConversation.value[String(id)] = [];
    sessionIds.value[String(id)] = String(id);
    loadedSessionMessages.value[String(id)] = true;
    activeConversationId.value = id;
    historyError.value = '';
  }

  async function selectConversation(conversation: ChatConversation): Promise<void> {
    activeConversationId.value = conversation.id;
    const sessionId = String(conversation.id);
    sessionIds.value[sessionId] = sessionId;
    await loadSessionMessages(sessionId);
  }

  async function renameConversation(conversationId: ChatConversation['id'], title: string): Promise<void> {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) throw new Error('Judul percakapan tidak boleh kosong.');

    const id = String(conversationId);
    const conversation = conversations.value.find((item) => String(item.id) === id);
    if (!conversation) return;

    historyError.value = '';
    try {
      if (serverSessionIds.value[id]) {
        await updateAIChatSessionTitle(sessionIds.value[id] ?? id, normalizedTitle);
      }
      conversation.title = normalizedTitle;
    } catch (error) {
      historyError.value = error instanceof Error ? error.message : 'Judul percakapan gagal diubah.';
    }
  }

  async function removeConversation(conversationId: ChatConversation['id']): Promise<void> {
    const id = String(conversationId);
    const conversation = conversations.value.find((item) => String(item.id) === id);
    if (!conversation) return;

    historyError.value = '';
    try {
      if (serverSessionIds.value[id]) {
        await deleteAIChatSession(sessionIds.value[id] ?? id);
      }

      conversations.value = conversations.value.filter((item) => String(item.id) !== id);
      delete messagesByConversation.value[id];
      delete sessionIds.value[id];
      delete loadedSessionMessages.value[id];
      delete serverSessionIds.value[id];

      if (String(activeConversationId.value) === id) {
        activeConversationId.value = '';
      }
    } catch (error) {
      historyError.value = error instanceof Error ? error.message : 'Percakapan gagal dihapus.';
    }
  }

  async function sendMessage(text: string, isRetry = false, retryTopic?: string): Promise<void> {
    const value = text.trim();
    if (!value || isSending.value) return;
    const topic = isRetry && retryTopic ? retryTopic : selectedTopic.value;

    if (!isRetry) {
      failedOperation.value = null;
      historyError.value = '';
    }

    let currentConversationId = activeConversationId.value;
    if (!currentConversationId) {
      startNewChat();
      currentConversationId = activeConversationId.value;
    }
    if (!currentConversationId) return;

    const conversationId = String(currentConversationId);
    const conversationMessages = messagesByConversation.value[conversationId] ?? [];

    if (!isRetry) {
      conversationMessages.push({
        id: `${Date.now()}-user`,
        role: 'user',
        text: value,
        time: formatTime(),
        date: formatDateKey(new Date())
      });
      messagesByConversation.value[conversationId] = conversationMessages;
    }

    const conversation = conversations.value.find((item) => String(item.id) === conversationId);
    if (conversation?.title === 'Chat baru') {
      conversation.title = value.length > 36 ? `${value.slice(0, 36)}…` : value;
    }

    isSending.value = true;
    status.value = '';

    let assistantMessage: ChatMessage | undefined;
    const ensureAssistantMessage = (): ChatMessage => {
      if (!assistantMessage) {
        assistantMessage = {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: '',
          time: formatTime(),
          date: formatDateKey(new Date())
        };
        messagesByConversation.value[conversationId].push(assistantMessage);
        assistantMessage = messagesByConversation.value[conversationId][messagesByConversation.value[conversationId].length - 1];
      }

      return assistantMessage;
    };

    let pendingDataframe: unknown;
    let receivedDataframe = false;

    try {
      for await (const event of streamAIChat({
        session_id: getSessionId(currentConversationId),
        message: value,
        topic
      })) {
        if (event.type === 'text') {
          ensureAssistantMessage().text += event.content;
        } else if (event.type === 'dataframe') {
          // Tahan hasil tabel sampai stream AI selesai menyusun jawabannya.
          pendingDataframe = event.data;
          receivedDataframe = true;
        } else if (event.type === 'status') {
          status.value = event.content;
        }
      }

      if (receivedDataframe) {
        ensureAssistantMessage().dataframe = pendingDataframe;
      }

      if (assistantMessage && !assistantMessage.text && assistantMessage.dataframe === undefined) {
        messagesByConversation.value[conversationId] = messagesByConversation.value[conversationId].filter(
          (message) => message.id !== assistantMessage?.id
        );
      }

      failedOperation.value = null;
      await loadConversations();
    } catch (error) {
      console.error('Chat AI error:', error);
      const errorMessageId = `${Date.now()}-error`;
      messagesByConversation.value[conversationId].push({
        id: errorMessageId,
        role: 'assistant',
        text: error instanceof Error ? error.message : 'Error connecting to server.',
        time: formatTime(),
        date: formatDateKey(new Date())
      });
      failedOperation.value = { type: 'stream', conversationId, message: value, topic, errorMessageId };
    } finally {
      isSending.value = false;
      status.value = '';
    }
  }

  async function retryLastFailure(): Promise<void> {
    const failure = failedOperation.value;
    if (!failure || !canRetry.value) return;

    historyError.value = '';

    if (failure.type === 'sessions') {
      await loadConversations();
      return;
    }

    if (failure.type === 'messages') {
      await loadSessionMessages(failure.sessionId);
      return;
    }

    messagesByConversation.value[failure.conversationId] = (
      messagesByConversation.value[failure.conversationId] ?? []
    ).filter((message) => message.id !== failure.errorMessageId);
    failedOperation.value = null;
    selectedTopic.value = failure.topic;
    await sendMessage(failure.message, true, failure.topic);
  }

  return {
    conversations,
    topics: TOPICS,
    selectedTopic,
    activeConversationId,
    activeConversation,
    messagesByConversation,
    sessionIds,
    messages,
    isSending,
    status,
    isLoadingSessions,
    loadingSessionId,
    historyError,
    canRetry,
    suggestions,
    loadConversations,
    retryLastFailure,
    startNewChat,
    selectConversation,
    renameConversation,
    removeConversation,
    sendMessage
  };
});
