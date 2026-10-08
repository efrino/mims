<script setup lang="ts">
import { ref } from 'vue';
import type { ChatConversation } from '@/types/AI/AIChat';

defineProps<{
  conversations: ChatConversation[];
  activeConversationId: ChatConversation['id'];
  isSending?: boolean;
}>();

const emit = defineEmits<{
  (event: 'new-chat'): void;
  (event: 'select', conversation: ChatConversation): void;
  (event: 'rename', conversationId: ChatConversation['id'], title: string): void;
  (event: 'delete', conversationId: ChatConversation['id']): void;
}>();

const renameDialog = ref(false);
const deleteDialog = ref(false);
const selectedConversation = ref<ChatConversation | null>(null);
const editedTitle = ref('');

function openRenameDialog(conversation: ChatConversation): void {
  selectedConversation.value = conversation;
  editedTitle.value = conversation.title;
  renameDialog.value = true;
}

function saveTitle(): void {
  const title = editedTitle.value.trim();
  if (!selectedConversation.value || !title) return;
  emit('rename', selectedConversation.value.id, title);
  renameDialog.value = false;
}

function openDeleteDialog(conversation: ChatConversation): void {
  selectedConversation.value = conversation;
  deleteDialog.value = true;
}

function confirmDelete(): void {
  if (!selectedConversation.value) return;
  emit('delete', selectedConversation.value.id);
  deleteDialog.value = false;
}
</script>

<template>
  <aside class="chat-history d-flex flex-column h-100 overflow-hidden pt-5 px-3 pb-4 bg-surface">
    <div class="mb-5 px-1">
      <div>
        <p class="text-primary text-subtitle-1 text-uppercase font-weight-bold mb-1">MIMS ASSISTANT</p>
      </div>
    </div>

    <v-btn prepend-icon="mdi-plus" color="primary" variant="flat" block height="44" rounded="lg" class="new-chat-button elevation-1" @click="emit('new-chat')">
      Chat Baru
    </v-btn>

    <p class="text-lightText text-caption font-weight-medium mt-2 mb-2 px-3">Percakapan</p>

    <div class="conversation-list px-1">
      <div
        v-for="conversation in conversations"
        :key="conversation.id"
        class="conversation-item"
        :class="{ 'conversation-item--active': conversation.id === activeConversationId }"
      >
        <button type="button" class="conversation-select" @click="emit('select', conversation)">
          <v-icon icon="mdi-message-text-outline" size="18" :color="conversation.id === activeConversationId ? 'primary' : 'secondary'" />
          <span class="conversation-copy">
            <span class="conversation-title" :class="conversation.id === activeConversationId ? 'text-primary font-weight-medium' : 'text-darkText'">{{ conversation.title }}</span>
            <span v-if="conversation.date" class="conversation-date text-lightText">{{ conversation.date }}</span>
          </span>
        </button>
        <div class="conversation-actions">
          <v-btn icon="mdi-pencil-outline" variant="text" size="x-small" color="secondary" aria-label="Ubah judul percakapan" title="Ubah judul" @click="openRenameDialog(conversation)" />
          <v-btn icon="mdi-delete-outline" variant="text" size="x-small" color="error" :disabled="isSending && conversation.id === activeConversationId" aria-label="Hapus percakapan" title="Hapus percakapan" @click="openDeleteDialog(conversation)" />
        </div>
      </div>
    </div>

    <v-dialog v-model="renameDialog" max-width="420">
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center ga-4 pt-6 px-6 pb-2">
          <v-avatar color="lightprimary" size="44">
            <v-icon icon="mdi-pencil-outline" color="primary" size="24" />
          </v-avatar>
          <span class="text-h6 font-weight-bold">Ubah judul percakapan</span>
        </v-card-title>

        <v-card-text class="px-6 py-4">
          <v-text-field
            v-model="editedTitle"
            variant="outlined"
            density="comfortable"
            persistent-label
            hide-details="auto"
            autofocus
            maxlength="120"
            counter
            @keyup.enter="saveTitle"
          />
        </v-card-text>

        <v-card-actions class="px-6 pb-6 pt-0">
          <v-spacer />
          <v-btn variant="text" color="secondary" class="text-none" @click="renameDialog = false">Batal</v-btn>
          <v-btn color="primary" variant="flat" class="text-none ml-2" :disabled="!editedTitle.trim()" @click="saveTitle">
            Simpan perubahan
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center ga-4 pt-6 px-6 pb-2">
          <v-avatar color="error" variant="tonal" size="44">
            <v-icon icon="mdi-delete-outline" size="24" />
          </v-avatar>
          <span class="text-h6 font-weight-bold">Hapus percakapan?</span>
        </v-card-title>

        <v-card-text class="px-6 py-4 text-body-1 text-medium-emphasis">
          Percakapan <strong class="text-high-emphasis">{{ selectedConversation?.title }}</strong> beserta seluruh pesannya akan dihapus.
        </v-card-text>

        <v-card-actions class="px-6 pb-6 pt-0">
          <v-spacer />
          <v-btn variant="text" color="secondary" class="text-none" @click="deleteDialog = false">Batal</v-btn>
          <v-btn color="error" variant="flat" class="text-none ml-2" @click="confirmDelete">Hapus percakapan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </aside>
</template>

<style scoped>
.chat-history {
  width: 280px;
  flex: 0 0 280px;
  border-right: 1px solid rgb(var(--v-theme-borderLight));
}

.new-chat-button {
  flex: 0 0 auto !important;
  text-transform: none !important;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.conversation-list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  min-height: 0;
}

.conversation-item {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  padding: 6px 8px 6px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  transition: all 0.2s ease;
}

.conversation-item:hover:not(.conversation-item--active) {
  background: rgb(var(--v-theme-lightsecondary));
}

.conversation-item--active {
  background: rgb(var(--v-theme-lightprimary));
}

.conversation-item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 15%;
  bottom: 15%;
  width: 4px;
  background-color: rgb(var(--v-theme-primary));
  border-radius: 0 4px 4px 0;
}

.conversation-select {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 12px;
  overflow: hidden;
  padding: 6px 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.conversation-actions {
  display: flex;
  flex: 0 0 auto;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.conversation-item:hover .conversation-actions,
.conversation-item:focus-within .conversation-actions,
.conversation-item--active .conversation-actions {
  opacity: 1;
}

.conversation-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.conversation-title {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-date {
  font-size: 10.5px;
}

@media (max-width: 700px) {
  .chat-history { display: none; }
}
</style>
