<script setup lang="ts">
import { onMounted } from 'vue';
import ChatComposer from '@/components/chat/ChatComposer.vue';
import ChatHistory from '@/components/chat/ChatHistory.vue';
import ChatMessages from '@/components/chat/ChatMessages.vue';
import { storeToRefs } from 'pinia';
import { useAIChatStore } from '@/stores/AI/AIChat';

const aiChatStore = useAIChatStore();
const {
  conversations,
  selectedTopic,
  activeConversationId,
  activeConversation,
  messages,
  isSending,
  status,
  isLoadingSessions,
  loadingSessionId,
  historyError,
  canRetry
} = storeToRefs(aiChatStore);

const {
  topics,
  suggestions,
  loadConversations,
  startNewChat,
  selectConversation,
  renameConversation,
  removeConversation,
  sendMessage,
  retryLastFailure
} = aiChatStore;

onMounted(() => {
  void loadConversations();
});
</script>

<template>
  <!-- Menggunakan containerBg untuk background luar agar kontras dengan bubble -->
  <v-card class="chat-page" rounded="lg" elevation="1" color="containerBg">
    <ChatHistory
      :conversations="conversations"
      :active-conversation-id="activeConversationId"
      :is-sending="isSending"
      @new-chat="startNewChat"
      @select="selectConversation"
      @rename="renameConversation"
      @delete="removeConversation"
    />

    <div class="chat-content relative">
      <v-alert v-if="historyError" type="error" density="compact" class="history-error">
        {{ historyError }}
      </v-alert>
      <v-progress-linear
        v-else-if="isLoadingSessions || loadingSessionId"
        indeterminate
        color="primary"
      />
      <ChatMessages
        :title="activeConversation"
        :messages="messages"
        :topics="topics"
        v-model:topic="selectedTopic"
        :suggestions="suggestions"
        :is-sending="isSending"
        :status="status"
        :show-refresh="canRetry"
        @refresh="retryLastFailure"
        @send-suggestion="sendMessage"
      />
      <ChatComposer
        :suggestions="suggestions"
        :show-suggestions="messages.length > 0"
        :is-sending="isSending"
        @send="sendMessage"
      />
    </div>
  </v-card>
</template>

<style scoped>
.chat-page {
  display: flex;
  height: calc(100vh - 120px);
  max-height: calc(100vh - 120px);
  overflow: hidden;
  border: 1px solid rgb(var(--v-theme-borderLight));
}

.chat-content {
  display: flex;
  position: relative;
  min-width: 0;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background-color: rgb(var(--v-theme-containerBg));
}

.history-error {
  flex: 0 0 auto;
  margin: 12px 16px 0;
}

@media (max-width: 700px) {
  .chat-page {
    height: calc(100vh - 90px);
  }
}
</style>