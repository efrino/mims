<script setup lang="ts">
import { RouterView } from 'vue-router';
// import LoaderWrapper from './LoaderWrapper.vue';
import LoadingBar from '@/components/apps/LoadingBar.vue';
import Sidebar from './vertical-sidebar/Sidebar.vue';
import VerticalHeaderVue from './vertical-header/VerticalHeader.vue';
import { initFlowbite } from 'flowbite';
import FooterPanel from './footer/FooterPanel.vue';
// Notification components
import {
  Alert,
  AlertAdditional,
  DialogNotification,
  LoadingOverlay
} from '@/components/notifications';
import { onMounted } from 'vue';

onMounted(() => {
  initFlowbite();
});
</script>

<template>
  <v-locale-provider>
    <v-app :class="[]">
      <Sidebar />
      <VerticalHeaderVue />

      <v-main class="page-wrapper">
        <v-container fluid>
          <div>
            <!-- Loader start -->
             <LoadingBar />
            <!-- <LoaderWrapper /> -->
            <!-- Loader end -->
            <RouterView />
          </div>
        </v-container>
      </v-main>
      <FooterPanel />
      <!-- Notification components -->
      <LoadingOverlay />
      <DialogNotification />
      <Alert />
      <AlertAdditional />
    </v-app>
  </v-locale-provider>
</template>
