<script setup lang="ts">
import { computed } from 'vue';
import { useCustomizerStore } from '../../../stores/customizer';
import { MenuFoldOutlined, MessageOutlined } from '@ant-design/icons-vue';
import ProfileDD from './ProfileDD.vue';
import { useConfigStore } from '@/stores/config';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore, type ThemeMode } from '@/stores/theme';
import UserAvatar from '@/components/shared/UserAvatar.vue';
import { AI_CHAT_ALLOWED_PARENTS } from '@/constants/AIChatPermissions';
import { computed } from 'vue';
import { useThemeStore, type ThemeMode } from '@/stores/theme';

const customizer = useCustomizerStore();
const configStore = useConfigStore();
const authStore = useAuthStore();

const { page } = storeToRefs(configStore);
const { user } = authStore;

const themeStore = useThemeStore();
const themeOptions: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Terang', icon: 'mdi-white-balance-sunny' },
  { value: 'dark', label: 'Gelap', icon: 'mdi-weather-night' },
  { value: 'system', label: 'Ikuti sistem', icon: 'mdi-monitor' }
];
const themeIcon = computed(() => themeOptions.find((o) => o.value === themeStore.mode)?.icon ?? 'mdi-white-balance-sunny');
</script>

<template>
  <v-app-bar elevation="0" height="45">
    <v-btn
      class="hidden-md-and-down text-secondary mr-3"
      color="darkText"
      icon
      rounded="sm"
      variant="text"
      @click.stop="customizer.SET_MINI_SIDEBAR(!customizer.mini_sidebar)"
      size="small"
    >
      <MenuFoldOutlined :style="{ fontSize: '16px' }" />
    </v-btn>
    <v-btn
      class="hidden-lg-and-up text-secondary ms-3"
      color="darkText"
      icon
      rounded="sm"
      variant="text"
      @click.stop="customizer.SET_SIDEBAR_DRAWER"
      size="small"
    >
      <MenuFoldOutlined :style="{ fontSize: '16px' }" />
    </v-btn>
    <!-- <v-toolbar-title v-if="page.name != ''">{{ page.name }}</v-toolbar-title> -->
    <!-- <v-toolbar-title>Inventory Dashboard</v-toolbar-title> -->

    <v-spacer />

    <!-- Tema: Terang / Gelap / Ikuti sistem (stores/theme.ts memasang .dark di <html>) -->
    <v-menu offset="8, 0">
      <template v-slot:activator="{ props }">
        <v-btn class="text-secondary mr-1" color="darkText" icon rounded="sm" variant="text" size="small" title="Tema" v-bind="props">
          <v-icon :icon="`mdi ${themeIcon}`" size="18" />
        </v-btn>
      </template>
      <v-list density="compact" width="180" class="theme-menu" style="overflow: hidden">
        <v-list-item
          v-for="o in themeOptions"
          :key="o.value"
          :active="themeStore.mode === o.value"
          color="primary"
          @click="themeStore.setMode(o.value)"
        >
          <div class="d-flex align-center ga-3">
            <i :class="['mdi', o.icon]" style="font-size: 18px; width: 18px; line-height: 1"></i>
            <span class="text-body-2">{{ o.label }}</span>
          </div>
        </v-list-item>
      </v-list>
    </v-menu>

    <!-- ---------------------------------------------- -->
    <!-- Chat AI -->
    <!-- ---------------------------------------------- -->
    <v-btn
      v-if="authStore.checkPermission({ permissionAnyOf: [...AI_CHAT_ALLOWED_PARENTS] })"
      class="chatAiBtn text-secondary mr-2"
      color="darkText"
      rounded="sm"
      variant="text"
      size="small"
      :to="{ path: '/ai-chat' }"
      @click="customizer.SET_MINI_SIDEBAR(true);"
    >
      <MessageOutlined :style="{ fontSize: '16px', marginRight: '6px' }" />
      Chat AI
    </v-btn>

    <!-- ---------------------------------------------- -->
    <!-- User Profile -->
    <!-- ---------------------------------------------- -->
    <v-menu :close-on-content-click="false" offset="8, 0">
      <template v-slot:activator="{ props }">
        <v-btn class="profileBtn" variant="text" rounded="sm" v-bind="props">
          <div class="d-flex align-center">
            <v-avatar size="32" class="mr-sm-2 mr-0">
              <UserAvatar :username="user.username" :version="authStore.photoVersion">
                <img src="@/assets/images/users/avatar-1.png" alt="Julia" />
              </UserAvatar>
            </v-avatar>
            <h6 class="text-subtitle-1 mb-0 d-sm-block d-none">{{ user.first_name ?? '' }}</h6>
          </div>
        </v-btn>
      </template>
      <v-sheet rounded="md" width="290" style="overflow-x: hidden">
        <ProfileDD />
      </v-sheet>
    </v-menu>
  </v-app-bar>
</template>
