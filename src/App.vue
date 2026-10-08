<template>
  <RouterView />
  <!-- Dibuka otomatis oleh stoAxios saat backend STO meminta PIN admin. -->
  <StoPinModal />
  <!-- Pengganti alert/confirm bergaya web (utils/dialog.ts). -->
  <AppDialog />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import StoPinModal from '@/components/sto/StoPinModal.vue';
import AppDialog from '@/components/shared/AppDialog.vue';
</script>
