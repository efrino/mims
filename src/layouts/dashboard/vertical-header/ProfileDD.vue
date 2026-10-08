<script setup lang="ts">
import { ref } from 'vue';
import {
  LogoutOutlined,
  EditOutlined,
} from '@ant-design/icons-vue';
import { useAuthStore } from '@/stores/auth';
import { useMspinAuthStore } from '@/stores/Logistik/Pallet/mspinAuthStore';
import ChangePassword from '@/components/ChangePassword.vue';
import UserAvatar from '@/components/shared/UserAvatar.vue';

const authStore = useAuthStore();
const mspinAuthStore = useMspinAuthStore();
const { user } = authStore;

const showPasswordDialog = ref(false);

const handlePasswordChange = (data: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
  console.log('Password change requested:', data);
  // TODO: Implement API call to change password
  // Example:
  // await authStore.changePassword(data.oldPassword, data.newPassword);

  showPasswordDialog.value = false;
};

const handleCloseDialog = () => {
  showPasswordDialog.value = false;
};
</script>

<template>
  <!-- ---------------------------------------------- -->
  <!-- profile DD -->
  <!-- ---------------------------------------------- -->
  <div>
    <div class="d-flex align-center pa-5">
      <v-avatar size="32" class="mr-2">
        <UserAvatar :username="user.username" :version="authStore.photoVersion">
          <img src="@/assets/images/users/avatar-1.png" width="32" alt="Julia" />
        </UserAvatar>
      </v-avatar>
      <div>
        <h6 class="text-h6 mb-0">{{ user.first_name ?? '' }} {{ user.last_name ?? '' }}</h6>
        <p class="text-caption mb-0">{{ user.username ?? '' }}</p>
      </div>
      <!-- <div class="ml-auto">
        <v-btn variant="text" color="primary" rounded="sm" icon size="large" @click="authStore.logout(), mspinAuthStore.logout()">
          <LogoutOutlined :style="{ fontSize: '20px' }" />
        </v-btn>
      </div> -->
    </div>
      <v-list class="py-0" aria-label=" list" aria-busy="true">

        <v-list-item color="primary" rounded="0" @click="showPasswordDialog = true">
          <template v-slot:prepend>
            <EditOutlined :style="{ fontSize: '14px' }" class="mr-4" />
          </template>

          <v-list-item-title class="text-subtitle-2"> Edit Account</v-list-item-title>
        </v-list-item>

        <v-list-item @click="authStore.logout(), mspinAuthStore.logout()" color="primary" rounded="0">
          <template v-slot:prepend>
            <LogoutOutlined :style="{ fontSize: '14px' }" class="mr-4" />
          </template>

          <v-list-item-title class="text-subtitle-2"> Logout</v-list-item-title>
        </v-list-item>
      </v-list>
  </div>

  <!-- Edit Account Dialog -->
  <v-dialog v-model="showPasswordDialog" max-width="500px" persistent>
    <ChangePassword @close="handleCloseDialog" @submit="handlePasswordChange" />
  </v-dialog>
</template>

<style scoped>
.v-list {
  overflow-x: hidden !important;
}

.v-list-item {
  overflow-x: hidden !important;
}

.v-list-item-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
