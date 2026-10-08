// ===============================|| Blank Layout ||=============================== //
<template>
  <v-app>
    <!-- Loader start -->
    <LoaderWrapper />
    <!-- Loader end -->
    <RouterView />

    <!-- Notification components -->
    <LoadingOverlay />
    <DialogNotification />
    <Alert />
  </v-app>
</template>
<script setup lang="ts">
import { RouterView } from 'vue-router';
import LoaderWrapper from '../dashboard/LoaderWrapper.vue';
// Notification components
import {
  Alert,
  DialogNotification,
  LoadingOverlay
} from '@/components/notifications';
</script>
