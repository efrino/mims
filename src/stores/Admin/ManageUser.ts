import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { UserService } from '@/services/Admin/ManageUserService';
import { useNotificationStore } from '@/stores/notification';
import type {
  User,
  GroupSto,
  AddUserForm,
  EditUserForm,
  ChangePasswordForm,
  SetPermissionForm,
  UnlockScanForm,
  Group,
} from '@/types/Admin/ManageUser';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export const useUserStore = defineStore('user', () => {
  const userService = ref<UserService | null>(null);
  const users = ref<User[]>([]);
  const selectedUser = ref<User | null>(null);
  const groupStoList = ref<GroupSto[]>([]);
  const groupList = ref<Group[]>([]);
  const permissions = ref<string[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function initializeService(apiUrl: string): void {
    userService.value = new UserService(apiUrl);
  }

  async function fetchUsers(): Promise<void> {
    if (!userService.value) {
      throw new Error('UserService not initialized');
    }

    loading.value = true;
    error.value = null;

    try {
      users.value = await userService.value.getUserList();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch users';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUserData(username: string): Promise<User> {
    if (!userService.value) {
      throw new Error('UserService not initialized');
    }

    loading.value = true;
    error.value = null;

    try {
      const user = await userService.value.getUserData(username);
      selectedUser.value = user;
      return user;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch user data';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUserPermission(username: string): Promise<void> {
    if (!userService.value) {
      throw new Error('UserService not initialized');
    }

    loading.value = true;
    error.value = null;

    try {
      const result = await userService.value.getUserPermission(username);
      permissions.value = result.permission || [];
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch permissions';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchGroupStoData(): Promise<void> {
    if (!userService.value) {
      throw new Error('UserService not initialized');
    }

    loading.value = true;
    error.value = null;

    try {
      groupStoList.value = await userService.value.getGroupStoData();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch group STO data';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchGroupData(): Promise<void> {
    if (!userService.value) {
      throw new Error('UserService not initialized');
    }

    loading.value = true;
    error.value = null;

    try {
      groupList.value = await userService.value.getGroupData();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch group data';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function addUser(formData: AddUserForm): Promise<boolean> {
    if (!userService.value) {
      throw new Error('UserService not initialized');
    }

    const notificationStore = useNotificationStore();
    loading.value = true;
    error.value = null;

    try {
      const response = await userService.value.addUser(formData);
      const message = stripHtml(response.messages);
      if (response.success) {
        notificationStore.showDialogSuccess('Success', message || 'User added successfully');
        return true;
      } else {
        notificationStore.showDialogError('Error', message || 'Failed to add user');
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add user';
      error.value = message;
      notificationStore.showDialogError('Error', message);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function editUser(formData: EditUserForm): Promise<boolean> {
    if (!userService.value) {
      throw new Error('UserService not initialized');
    }

    const notificationStore = useNotificationStore();
    loading.value = true;
    error.value = null;

    try {
      const response = await userService.value.editUser(formData);
      const message = stripHtml(response.messages);
      if (response.success) {
        notificationStore.showDialogSuccess('Success', message || 'User updated successfully');
        return true;
      } else {
        notificationStore.showDialogError('Error', message || 'Failed to edit user');
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to edit user';
      error.value = message;
      notificationStore.showDialogError('Error', message);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function changePassword(formData: ChangePasswordForm): Promise<void> {
    if (!userService.value) {
      throw new Error('UserService not initialized');
    }

    loading.value = true;
    error.value = null;

    try {
      await userService.value.changePassword(formData);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to change password';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function setPermission(username: string, permissionList: string[]): Promise<boolean> {
    if (!userService.value) {
      throw new Error('UserService not initialized');
    }

    loading.value = true;
    error.value = null;

    const notificationStore = useNotificationStore();
    try {
      const formData: SetPermissionForm = {
        user: username,
        permission: permissionList,
      };
      const response = await userService.value.setPermission(formData);
      const message = stripHtml(response.messages);
      if (response.success) {
        notificationStore.showDialogSuccess('Success', message || 'Permissions updated successfully');
        return true;
      } else {
        notificationStore.showDialogError('Error', message || 'Failed to set permission');
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set permission';
      error.value = message;
      notificationStore.showDialogError('Error', message);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function toggleUserLock(username: string, lockType: 'LOCK' | 'UNLOCK'): Promise<boolean> {
    if (!userService.value) {
      throw new Error('UserService not initialized');
    }

    const notificationStore = useNotificationStore();
    loading.value = true;
    error.value = null;

    try {
      const formData: UnlockScanForm = {
        username,
        tipe: lockType,
      };
      const response = await userService.value.toggleUserLock(formData);
      const message = stripHtml(response.messages);
      if (response.success) {
        notificationStore.showDialogSuccess('Success', message || `User ${lockType === 'LOCK' ? 'locked' : 'unlocked'} successfully`);
        await fetchUsers();
        return true;
      } else {
        notificationStore.showDialogError('Error', message || 'Failed to toggle user lock');
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle user lock';
      error.value = message;
      notificationStore.showDialogError('Error', message);
      return false;
    } finally {
      loading.value = false;
    }
  }

  const hasUsers = computed(() => users.value.length > 0);
  const hasGroupSto = computed(() => groupStoList.value.length > 0);
  const hasGroup = computed(() => groupList.value.length > 0);

  return {
    users,
    selectedUser,
    groupStoList,
    groupList,
    permissions,
    loading,
    error,
    hasUsers,
    hasGroupSto,
    hasGroup,
    initializeService,
    fetchUsers,
    fetchUserData,
    fetchUserPermission,
    fetchGroupStoData,
    fetchGroupData,
    addUser,
    editUser,
    changePassword,
    setPermission,
    toggleUserLock,
  };
});