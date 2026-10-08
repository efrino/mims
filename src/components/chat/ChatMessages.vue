<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { ChatMessage } from '@/types/AI/AIChat';
import ChatDataTable from '@/components/chat/ChatDataTable.vue';
import ChatMessageContent from '@/components/chat/ChatMessageContent.vue';

const props = defineProps<{
  title: string;
  messages: ChatMessage[];
  topics: { title: string; value: string }[];
  topic: string;
  suggestions: string[];
  isSending?: boolean;
  status?: string;
  showRefresh?: boolean;
}>();

const emit = defineEmits<{
  (event: 'refresh'): void;
  (event: 'update:topic', topic: string): void;
  (event: 'send-suggestion', message: string): void;
}>();

const messageList = ref<HTMLElement | null>(null);
const suggestionIcons = ['mdi-chart-box-outline', 'mdi-chart-timeline-variant', 'mdi-truck-delivery-outline'];
const suggestionColors = ['primary', 'secondary', 'warning'];
const showTypingAvatar = computed(() => props.messages[props.messages.length - 1]?.role !== 'assistant');
const isWaitingForAnswer = computed(() => {
  if (!props.isSending) return false;

  const lastMessage = props.messages[props.messages.length - 1];
  return !(lastMessage?.role === 'assistant' && lastMessage.text.trim().length > 0);
});

watch(
  () => [props.messages, props.isSending, props.status],
  async () => {
    await nextTick();
    messageList.value?.scrollTo({
      top: messageList.value.scrollHeight,
      behavior: 'smooth'
    });
  },
  { deep: true }
);
</script>

<template>
  <section class="chat-messages">
    <!-- Menggunakan class border-b agar persis seperti garis tipis di gambar -->
    <v-toolbar class="chat-header px-4 border-b" color="surface" height="72" elevation="0">
      
      <!-- Kiri: Avatar dan Info Asisten -->
      <div class="d-flex align-center ga-3">
        <!-- Avatar robot menggunakan warna latar lightprimary (#e6f4ff) dan ikon primary (#1677ff) -->
        <v-avatar color="lightprimary" size="42">
          <v-icon icon="mdi-robot-outline" color="primary" size="24" />
        </v-avatar>

        <div class="header-copy d-flex flex-column justify-center">
          <!-- Judul percakapan (misal: "hallo 2") -->
          <div class="text-subtitle-1 font-weight-bold text-darkText" style="line-height: 1.2;">
            {{ title || 'hallo 2' }}
          </div>
          <!-- Status Asisten -->
          <div class="assistant-status d-flex align-center ga-1 mt-1">
            <v-icon icon="mdi-circle" color="success" size="10" />
            <span class="text-caption text-lightText font-weight-medium">Asisten MIMS</span>
          </div>
        </div>
      </div>

      <v-spacer />

      <!-- Dropdown topik AI dinonaktifkan sementara.
      <v-select
        :model-value="topic"
        :items="topics"
        item-title="title"
        item-value="value"
        variant="outlined"
        density="compact"
        hide-details
        max-width="200"
        color="primary"
        base-color="inputBorder"
        class="topic-select bg-surface rounded-lg"
        :disabled="isSending"
        @update:model-value="emit('update:topic', $event)"
      >
        <template v-slot:selection="{ item }">
          <span class="topic-selection-text text-truncate text-darkText" style="max-width: 130px;">
            {{ item.title }}
          </span>
        </template>
        <template v-slot:item="{ props: itemProps, item }">
          <v-list-item v-bind="itemProps">
            <template #title>
              <span class="topic-option-text">{{ item.title }}</span>
            </template>
          </v-list-item>
        </template>
      </v-select>
      -->

      <!-- Tombol Refresh (jika error) -->
      <v-btn
        v-if="showRefresh"
        icon="mdi-refresh"
        variant="text"
        color="primary"
        @click="emit('refresh')"
      />
    </v-toolbar>

    <div
      ref="messageList"
      class="message-list d-flex flex-column flex-grow-1 overflow-y-auto"
      :class="{ 'message-list--with-suggestions': messages.length > 0 }"
    >
      <div v-if="messages.length === 0 && !isSending" class="empty-state d-flex flex-column align-center justify-center text-center">
        <v-avatar color="lightprimary" size="64" class="mb-4 elevation-1">
          <v-icon icon="mdi-robot-outline" color="primary" size="32" />
        </v-avatar>
        <h2 class="text-h5 font-weight-bold text-darkText mb-2">Apa yang bisa saya bantu?</h2>
        <p class="text-body-2 text-lightText ma-0">Tanyakan sesuatu tentang {{ topic }} atau pilih saran di bawah.</p>

        <v-row v-if="suggestions.length" class="empty-suggestions mt-6" justify="center">
          <v-col v-for="(suggestion, index) in suggestions.slice(0, 3)" :key="suggestion" cols="12" sm="4">
            <v-card
              class="empty-suggestion text-left pa-4"
              color="surface"
              variant="flat"
              min-height="120"
              @click="emit('send-suggestion', suggestion)"
            >
              <v-avatar :color="suggestionColors[index] + '20'" size="32" class="mb-3">
                <v-icon :icon="suggestionIcons[index]" :color="suggestionColors[index]" size="18" />
              </v-avatar>
              <div class="text-body-2 font-weight-medium text-darkText">{{ suggestion }}</div>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <template v-for="(message, index) in messages" :key="message.id">
        <!-- Render Bubble Chat -->
        <article class="message-row d-flex ga-3" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
          <v-avatar v-if="message.role === 'assistant'" class="message-avatar mt-1" color="lightprimary" size="32">
            <v-icon icon="mdi-robot-outline" color="primary" size="18" />
          </v-avatar>

          <div class="message-content d-flex flex-column" :class="message.role === 'user' ? 'align-end' : 'align-start'">
            <div
              v-if="message.text"
              class="message-bubble px-5 py-3 text-body-2"
              :class="message.role === 'user' ? 'message-bubble--user bg-primary text-white' : 'message-bubble--assistant bg-surface text-darkText'"
            >
              <ChatMessageContent v-if="message.role === 'assistant'" :content="message.text" />
              <template v-else>{{ message.text }}</template>
            </div>
            
            <ChatDataTable v-if="message.dataframe !== undefined" :data="message.dataframe" class="mt-2" />
            <time class="message-time px-1 mt-1 text-lightText">{{ message.time }}</time>
          </div>
        </article>
      </template>

      <!-- Backend status and typing animation are shown only before answer text starts. -->
      <div v-if="isWaitingForAnswer" class="message-row d-flex ga-3 justify-start">
        <v-avatar v-if="showTypingAvatar" class="message-avatar mt-1" color="lightprimary" size="32">
          <v-icon icon="mdi-robot-outline" color="primary" size="18" />
        </v-avatar>
        <div class="typing-indicator d-flex align-center ga-2 px-4 py-3 bg-surface" style="border-radius: 16px 16px 16px 4px; box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.05);">
          <span class="typing-dot" /><span class="typing-dot" /><span class="typing-dot" />
          <span class="typing-status text-caption text-lightText">{{ status || 'Menunggu respons AI...' }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.chat-messages {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}

.chat-header {
  border-bottom-color: rgb(var(--v-theme-borderLight)) !important;
}

.topic-select :deep(.v-field__input) {
  padding-top: 6px;
  padding-bottom: 6px;
  min-height: 36px;
}

.topic-selection-text {
  font-size: 13px;
}

.topic-option-text {
  font-size: 13px;
}

.assistant-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.message-list {
  gap: 24px;
  padding: 24px clamp(16px, 10vw, 120px) 120px;
}

.message-list--with-suggestions {
  padding-bottom: 190px;
}

.empty-state {
  flex: 1 0 auto;
  min-height: 300px;
}

.empty-suggestion {
  border: 1px solid rgb(var(--v-theme-borderLight)) !important;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.02) !important;
}

.empty-suggestion:hover {
  border-color: rgb(var(--v-theme-primary)) !important;
  transform: translateY(-2px);
  box-shadow: 0px 4px 12px rgba(22, 119, 255, 0.1) !important;
}

.message-row {
  min-width: 0;
  max-width: 100%;
}

.message-content {
  width: 100%;
  min-width: 0;
  max-width: min(720px, 80vw);
}

.message-bubble {
  line-height: 1.6;
}

.message-bubble--assistant {
  border-radius: 16px 16px 16px 4px;
  border: 1px solid rgb(var(--v-theme-borderLight));
  box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.03);
}

.message-bubble--user {
  border-radius: 16px 16px 4px 16px;
  box-shadow: 0px 2px 6px rgba(22, 119, 255, 0.25);
}

.message-time {
  font-size: 11px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  margin: 0 2px;
  border-radius: 50%;
  animation: pulse 1.2s infinite ease-in-out;
  background: rgb(var(--v-theme-primary));
}
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes pulse {
  0%, 80%, 100% { opacity: 0.4; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.2); }
}
</style>
