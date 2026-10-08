<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useUserStore } from '@/stores/Admin/ManageUser';
import { useConfigStore } from '@/stores/config';
import { useNotificationStore } from '@/stores/notification';
import type { User, AddUserForm, EditUserForm } from '@/types/Admin/ManageUser';
import { permissionList } from '@/router/MainRoutes';
import Pagination from '@/components/table/Pagination.vue';
import UserAvatar from '@/components/shared/UserAvatar.vue';

const userStore = useUserStore();
const configStore = useConfigStore();
const notificationStore = useNotificationStore();

const page = ref({ title: 'Manage User' });
const breadcrumbs = ref([
  {
    title: 'Admin',
    disabled: false,
    href: '#'
  },
  {
    title: 'Manage User',
    disabled: false,
    href: '#'
  },
  {
    title: 'List',
    disabled: true,
    href: '#'
  }
]);

const dialog = ref({
  add: false,
  edit: false,
  permission: false
});

const form = ref({
  username: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirm: '',
  photoData: '',
  photoType: '',
  urlPreview: ''
});

const isPasswordVisible = ref(false);
const isPasswordConfirmVisible = ref(false);
const selectedUser = ref<User | null>(null);
const searchQuery = ref('');
const selectedGroupSTO = ref('');
const selectedGroup = ref<number>(10);
const photoVersion = ref(0);

const currentPage = ref(1);
const pageSize = ref(10);
const pageSizes = ref([5, 10, 20, 50]);

interface PermissionListItem {
  type: string;
  title: string;
  permission?: {
    parent: string;
    child: string[];
    areas?: string[];
  };
  content?: Record<string, PermissionListItem>;
}

const formattedGroupSTOList = computed(() => {
  return userStore.groupStoList.map((group) => ({
    id: group.sto_group_id,
    name: group.description
  }));
});
const formattedGroupList = computed(() => {
  return userStore.groupList.map((group) => ({
    id: group.id,
    name: group.name,
    desc: group.description
  }));
});

const filteredUsers = computed(() => {
  if (!searchQuery.value) return userStore.users;

  const query = searchQuery.value.toLowerCase();

  return userStore.users.filter((user) => {
    const username = user.username?.toLowerCase() || '';
    const fullname = user.fullname?.toLowerCase() || '';

    return username.includes(query) || fullname.includes(query);
  });
});

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredUsers.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredUsers.value.length / pageSize.value);
});

const pageNumbers = computed(() => {
  const pages = [];
  const maxVisiblePages = 5;

  if (totalPages.value <= maxVisiblePages) {
    for (let i = 1; i <= totalPages.value; i++) {
      pages.push(i);
    }
  } else {
    let startPage = Math.max(1, currentPage.value - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages.value) {
      endPage = totalPages.value;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
  }

  return pages;
});

const showingInfo = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value + 1;
  const end = Math.min(currentPage.value * pageSize.value, filteredUsers.value.length);
  const total = filteredUsers.value.length;

  return `Showing ${start} to ${end} of ${total} entries`;
});

const flattenedPermissions = computed(() => {
  const rows: Array<{
    type: string;
    title: string;
    permission?: { parent: string; child: string[]; areas?: string[] };
  }> = [];

  const permissionArray = Array.isArray(permissionList) ? permissionList : Object.values(permissionList);

  permissionArray.forEach((level1) => {
    const item1 = level1 as PermissionListItem;

    if (item1.type === 'link') {
      rows.push({
        type: 'link',
        title: item1.title,
        permission: item1.permission
      });
    }

    if (item1.type === 'header') {
      rows.push({ type: 'header', title: item1.title });

      if (item1.content) {
        const contentArray = Array.isArray(item1.content) ? item1.content : Object.values(item1.content);

        contentArray.forEach((level2Value) => {
          const level2 = level2Value as PermissionListItem;

          if (level2.type === 'link') {
            rows.push({
              type: 'link',
              title: level2.title,
              permission: level2.permission
            });
          }

          if (level2.type === 'submenu') {
            rows.push({ type: 'submenu', title: level2.title });

            if (level2.content) {
              const subContentArray = Array.isArray(level2.content) ? level2.content : Object.values(level2.content);

              subContentArray.forEach((level3Value) => {
                const level3 = level3Value as PermissionListItem;

                if (level3.type === 'link') {
                  rows.push({
                    type: 'link',
                    title: level3.title,
                    permission: level3.permission
                  });
                }
              });
            }
          }
        });
      }
    }
  });

  return rows;
});

// Child di luar kolom tetap (mis. Approve/Reject milik Folder Sharing, Delete milik
// Manage User STO) sebelumnya tidak punya checkbox sama sekali, jadi tidak bisa
// diberikan admin. Semuanya ditampung di kolom "Lainnya".
const KOLOM_TETAP = ['View', 'Create', 'Update', 'Download', 'PCD'];
const extraChildren = (child?: string[]): string[] => (child ?? []).filter((c) => !KOLOM_TETAP.includes(c));

const resetForm = (): void => {
  form.value = {
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    photoData: '',
    photoType: '',
    urlPreview: ''
  };
  selectedGroup.value = 10;
  isPasswordVisible.value = false;
  isPasswordConfirmVisible.value = false;
};

const validateFormAdd = (): boolean => {
  return !!(
    form.value.username &&
    form.value.firstName &&
    form.value.lastName &&
    form.value.password &&
    form.value.passwordConfirm &&
    selectedGroup.value
  );
};

const validateFormEdit = (): boolean => {
  return !!(form.value.firstName && form.value.lastName && selectedGroup.value);
};

watch([searchQuery, pageSize], () => {
  currentPage.value = 1;
});

onMounted(async () => {
  userStore.initializeService(configStore.apiUrl);

  try {
    await Promise.all([userStore.fetchUsers(), userStore.fetchGroupData()]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load data';
    notificationStore.showDialogError('Error', message);
  }
});

const openAddDialog = (): void => {
  resetForm();
  dialog.value.add = true;
};

const openEditDialog = async (user: User): Promise<void> => {
  selectedUser.value = user;
  form.value.username = user.username;

  try {
    const userData = await userStore.fetchUserData(user.username);
    form.value.firstName = userData.first_name;
    form.value.lastName = userData.last_name;
    form.value.email = userData.email || '';
    form.value.phone = userData.phone || '';
    form.value.urlPreview = userData.photo || '';
    selectedGroup.value = userData.group_id;

    dialog.value.edit = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load user data';
    notificationStore.showDialogError('Error', message);
  }
};

const openPermissionDialog = async (user: User): Promise<void> => {
  selectedUser.value = user;

  try {
    await userStore.fetchUserPermission(user.username);
    dialog.value.permission = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load permissions';
    notificationStore.showDialogError('Error', message);
  }
};

const handleToggleLock = async (user: User): Promise<void> => {
  const lockType = user.status_lock === 'LOCK' ? 'UNLOCK' : 'LOCK';
  await userStore.toggleUserLock(user.username, lockType);
};

const handleImageUpload = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      form.value.urlPreview = result;
      const [header, data] = result.split(',');
      form.value.photoType = header.replace('data:', '').replace(';base64', '');
      form.value.photoData = data;
    };
    reader.readAsDataURL(file);
  }
};

const handleSaveUser = async (): Promise<void> => {
  if (!validateFormAdd()) {
    notificationStore.showDialogWarning('Warning', 'Please complete all required fields');
    return;
  }

  try {
    const formData: AddUserForm = {
      identity: form.value.username,
      first_name: form.value.firstName,
      last_name: form.value.lastName,
      group_id: selectedGroup.value,
      password: form.value.password,
      password_confirm: form.value.passwordConfirm
    };

    if (form.value.phone) {
      formData.phone = form.value.phone;
    }

    if (form.value.photoData && form.value.photoType) {
      formData.photo_data = form.value.photoData;
      formData.photo_type = form.value.photoType;
    }

    const success = await userStore.addUser(formData);
    if (success) {
      dialog.value.add = false;
      resetForm();
      await userStore.fetchUsers();
    }
  } catch (error) {
    // handled in store
  }
};

const handleUpdateUser = async (): Promise<void> => {
  if (!validateFormEdit()) {
    notificationStore.showDialogWarning('Warning', 'Please complete all required fields');
    return;
  }

  try {
    const formData: EditUserForm = {
      username: form.value.username,
      first_name: form.value.firstName,
      last_name: form.value.lastName,
      group_id: selectedGroup.value,
      email: form.value.email,
      phone: form.value.phone
    };

    if (form.value.password && form.value.passwordConfirm) {
      formData.password = form.value.password;
      formData.password_confirm = form.value.passwordConfirm;
    }

    if (form.value.photoData && form.value.photoType) {
      formData.photo_data = form.value.photoData;
      formData.photo_type = form.value.photoType;
    }

    const success = await userStore.editUser(formData);
    if (success) {
      if (formData.photo_data) {
        photoVersion.value = Date.now();
      }
      dialog.value.edit = false;
      resetForm();
      selectedUser.value = null;
      await userStore.fetchUsers();
    }
  } catch (error) {
    // handled in store
  }
};

const handleSavePermissions = async (): Promise<void> => {
  if (!selectedUser.value) {
    notificationStore.showDialogWarning('Warning', 'No user selected');
    return;
  }

  if (!userStore.permissions.length) {
    notificationStore.showDialogWarning('Warning', 'Please select at least one permission');
    return;
  }

  try {
    const success = await userStore.setPermission(selectedUser.value.username, userStore.permissions);
    if (success) {
      dialog.value.permission = false;
      selectedUser.value = null;
    }
  } catch (error) {
    // handled in store
  }
};

const togglePermission = (permission: string, isChecked: boolean): void => {
  if (isChecked) {
    if (!userStore.permissions.includes(permission)) {
      userStore.permissions.push(permission);
    }
  } else {
    const index = userStore.permissions.indexOf(permission);
    if (index > -1) {
      userStore.permissions.splice(index, 1);
    }
  }
};

const handlePermissionChange = (event: Event, permission: string): void => {
  const target = event.target as HTMLInputElement;
  togglePermission(permission, target.checked);
};

const closeDialog = (type: 'add' | 'edit' | 'permission'): void => {
  dialog.value[type] = false;
  resetForm();
  selectedUser.value = null;
};

const changePage = (page: number): void => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const changePageSize = (size: number): void => {
  pageSize.value = size;
  currentPage.value = 1;
};

const getInitials = (fullname: string | undefined): string => {
  if (!fullname) return '?';
  const parts = fullname.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || fullname[0]?.toUpperCase() || '?';
};

const avatarColors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
const getAvatarColor = (username: string | undefined): string => {
  if (!username) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-4" />

  <div class="flex flex-wrap items-center justify-between gap-3 mb-3 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
    <div class="flex items-center gap-3 flex-wrap">
      <div class="relative">
        <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-full focus:ring-blue-500 focus:border-blue-500 block w-[220px] pl-10 p-2.5"
          placeholder="Cari List Data User"
        />
      </div>

      <span
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-8a4 4 0 110 8 4 4 0 010-8zm6 3a4 4 0 010 8"
          />
        </svg>
        {{ filteredUsers.length }} User{{ filteredUsers.length === 1 ? '' : 's' }}
      </span>
    </div>

    <button
      @click="openAddDialog"
      class="flex items-center gap-2 text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-full text-sm px-5 py-2.5"
    >
      Add User
    </button>
  </div>

  <div class="h-[70vh] overflow-x-auto overflow-y-auto bg-white rounded-lg border border-gray-200 shadow-sm">
    <table class="w-full text-sm text-left text-gray-500">
      <thead class="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
        <tr>
          <th class="px-4 py-3 text-center font-bold border w-[70px]">NO</th>
          <th class="px-4 py-3 text-left font-bold border w-[240px]">FULLNAME</th>
          <th class="px-4 py-3 text-center font-bold border w-[160px]">NIK/USERNAME</th>
          <th class="px-4 py-3 text-center font-bold border w-[120px]">STATUS</th>
          <th class="px-4 py-3 text-center font-bold border w-[300px]">ACTION</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="paginatedUsers.length === 0">
          <td colspan="5" class="px-4 py-10 text-center text-gray-400">
            <div class="flex flex-col items-center gap-2">
              <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-8a4 4 0 110 8 4 4 0 010-8z"
                />
              </svg>
              <span class="text-sm font-medium">No users found</span>
            </div>
          </td>
        </tr>
        <tr v-for="(user, index) in paginatedUsers" :key="user.username" class="bg-white border-b hover:bg-gray-50 transition-colors">
          <td class="px-4 py-3 text-center border text-gray-400">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
          <td class="px-4 py-3 border">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 shrink-0 rounded-full overflow-hidden">
                <UserAvatar :username="user.username" :version="photoVersion">
                  <div
                    :class="[
                      'w-full h-full flex items-center justify-center text-white text-xs font-bold',
                      getAvatarColor(user.username)
                    ]"
                  >
                    {{ getInitials(user.fullname) }}
                  </div>
                </UserAvatar>
              </div>
              <div class="min-w-0 font-semibold text-gray-800 truncate">{{ user.fullname }}</div>
            </div>
          </td>
          <td class="px-4 py-3 text-center border text-gray-600 font-medium">{{ user.username }}</td>
          <td class="px-4 py-3 text-center border">
            <span
              :class="[
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                user.status_lock === 'LOCK' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              ]"
            >
              <span :class="['w-1.5 h-1.5 rounded-full', user.status_lock === 'LOCK' ? 'bg-red-500' : 'bg-green-500']"></span>
              {{ user.status_lock === 'LOCK' ? 'Locked' : 'Active' }}
            </span>
          </td>
          <td class="px-4 py-3 border">
            <div class="flex items-center justify-center gap-2">
              <button
                @click="openEditDialog(user)"
                class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 focus:ring-2 focus:ring-blue-300"
                title="Edit User"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </button>

              <button
                @click="openPermissionDialog(user)"
                class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 focus:ring-2 focus:ring-purple-300"
                title="Set Permission"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Permission
              </button>

              <button
                @click="handleToggleLock(user)"
                :class="[
                  'flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg focus:ring-2 transition-all',
                  user.status_lock === 'LOCK'
                    ? 'text-green-700 bg-green-100 hover:bg-green-200 focus:ring-green-300'
                    : 'text-red-700 bg-red-100 hover:bg-red-200 focus:ring-red-300'
                ]"
                :title="user.status_lock === 'LOCK' ? 'Click to Unlock User' : 'Click to Lock User'"
              >
                <svg v-if="user.status_lock === 'LOCK'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                  />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                {{ user.status_lock === 'LOCK' ? 'Unlock' : 'Lock' }}
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <Pagination
      class="sticky bottom-0 z-10 bg-white"
      :total-items="filteredUsers.length"
      :current-page="currentPage"
      :items-per-page="pageSize"
      :per-page-options="pageSizes"
      @update:current-page="currentPage = $event"
      @update:items-per-page="
        pageSize = $event;
        currentPage = 1;
      "
    />
  </div>

  <Transition name="modal">
    <div
      v-if="dialog.add"
      class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="closeDialog('add')"
    >
      <div class="relative p-4 w-full max-w-2xl max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg">
          <div class="flex items-center justify-between p-5 !border-b rounded-t !border-gray-200">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-green-100 rounded-lg">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-900">Add New User</h3>
            </div>
            <button
              type="button"
              @click="closeDialog('add')"
              class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 14 14">
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900">NIK/Username</label>
                <input
                  v-model="form.username"
                  type="text"
                  class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900">Group</label>
                <select
                  v-model="selectedGroup"
                  class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
                >
                  <option value="">Select Group</option>
                  <option v-for="group in formattedGroupList" :key="group.name" :value="group.id">
                    {{ group.desc }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900">First Name</label>
                <input
                  v-model="form.firstName"
                  type="text"
                  class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
                  placeholder="First name"
                  required
                />
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900">Last Name</label>
                <input
                  v-model="form.lastName"
                  type="text"
                  class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
                  placeholder="Last name"
                  required
                />
              </div>

              <div class="col-span-2">
                <label class="block mb-2 text-sm font-medium text-gray-900">Phone Number</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  maxlength="20"
                  class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
                  placeholder="08xxxxxxxxxx"
                />
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900">Password</label>
                <div class="relative">
                  <input
                    v-model="form.password"
                    :type="isPasswordVisible ? 'text' : 'password'"
                    class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    @click="isPasswordVisible = !isPasswordVisible"
                    class="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    <svg v-if="!isPasswordVisible" class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    <svg v-else class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900">Confirm Password</label>
                <div class="relative">
                  <input
                    v-model="form.passwordConfirm"
                    :type="isPasswordConfirmVisible ? 'text' : 'password'"
                    class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    @click="isPasswordConfirmVisible = !isPasswordConfirmVisible"
                    class="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    <svg
                      v-if="!isPasswordConfirmVisible"
                      class="w-5 h-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    <svg v-else class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label class="block mb-2 text-sm font-medium text-gray-900">Upload Photo</label>
              <input
                type="file"
                accept="image/*"
                @change="handleImageUpload"
                class="block w-full text-sm text-gray-900 !border !border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div v-if="form.urlPreview" class="mt-4">
              <label class="block mb-2 text-sm font-medium text-gray-900">Photo Preview</label>
              <img :src="form.urlPreview" alt="Preview" class="w-32 h-32 object-cover rounded-lg !border !border-gray-300" />
            </div>
          </div>

          <div class="flex items-center justify-end p-6 space-x-3 !border-t !border-gray-200">
            <button
              @click="closeDialog('add')"
              type="button"
              class="text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5"
            >
              Cancel
            </button>
            <button
              @click="handleSaveUser"
              type="button"
              class="text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5"
            >
              Save User
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <Transition name="modal">
    <div
      v-if="dialog.edit"
      class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="closeDialog('edit')"
    >
      <div class="relative p-4 w-full max-w-2xl max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg">
          <div class="flex items-center justify-between p-5 !border-b rounded-t !border-gray-200">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-blue-100 rounded-lg">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-900">Edit User</h3>
            </div>
            <button
              type="button"
              @click="closeDialog('edit')"
              class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 14 14">
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900">NIK/Username</label>
                <input
                  v-model="form.username"
                  type="text"
                  disabled
                  class="bg-gray-100 !border !border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 cursor-not-allowed"
                />
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900">Group</label>
                <select
                  v-model="selectedGroup"
                  class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
                >
                  <option value="">Select Group</option>
                  <option v-for="group in formattedGroupList" :key="group.name" :value="group.id">
                    {{ group.desc }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900">First Name</label>
                <input
                  v-model="form.firstName"
                  type="text"
                  class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
                  required
                />
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900">Last Name</label>
                <input
                  v-model="form.lastName"
                  type="text"
                  class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
                  required
                />
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900">Email</label>
                <input
                  v-model="form.email"
                  type="email"
                  maxlength="254"
                  class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900">Phone Number</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  maxlength="20"
                  class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
                  placeholder="08xxxxxxxxxx"
                />
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900">New Password (Optional)</label>
                <div class="relative">
                  <input
                    v-model="form.password"
                    :type="isPasswordVisible ? 'text' : 'password'"
                    class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
                    placeholder="Leave empty to keep current"
                  />
                  <button
                    type="button"
                    @click="isPasswordVisible = !isPasswordVisible"
                    class="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    <svg v-if="!isPasswordVisible" class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    <svg v-else class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900">Confirm Password</label>
                <div class="relative">
                  <input
                    v-model="form.passwordConfirm"
                    :type="isPasswordConfirmVisible ? 'text' : 'password'"
                    class="bg-gray-50 !border !border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:!border-blue-500 block w-full p-2.5"
                    placeholder="Leave empty to keep current"
                  />
                  <button
                    type="button"
                    @click="isPasswordConfirmVisible = !isPasswordConfirmVisible"
                    class="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    <svg
                      v-if="!isPasswordConfirmVisible"
                      class="w-5 h-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    <svg v-else class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label class="block mb-2 text-sm font-medium text-gray-900">Upload New Photo</label>
              <input
                type="file"
                accept="image/*"
                @change="handleImageUpload"
                class="block w-full text-sm text-gray-900 !border !border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div v-if="form.urlPreview" class="mt-4">
              <label class="block mb-2 text-sm font-medium text-gray-900">Photo Preview</label>
              <img :src="form.urlPreview" alt="Preview" class="w-32 h-32 object-cover rounded-lg !border !border-gray-300" />
            </div>
          </div>

          <div class="flex items-center justify-end p-6 space-x-3 !border-t !border-gray-200">
            <button
              @click="closeDialog('edit')"
              type="button"
              class="text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5"
            >
              Cancel
            </button>
            <button
              @click="handleUpdateUser"
              type="button"
              class="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5"
            >
              Update User
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <Transition name="modal">
    <div
      v-if="dialog.permission"
      class="fixed inset-0 z-[9999] flex items-start justify-center bg-gray-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="closeDialog('permission')"
    >
      <div class="relative p-4 w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div class="relative bg-white rounded-lg shadow-lg flex flex-col max-h-full">
          <div class="flex items-center justify-between p-5 !border-b rounded-t !border-gray-200 flex-shrink-0">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-purple-100 rounded-lg">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900">Set User Permissions</h3>
                <p v-if="selectedUser" class="text-sm text-gray-500 mt-1">{{ selectedUser.username }} - {{ selectedUser.fullname }}</p>
              </div>
            </div>
            <button
              type="button"
              @click="closeDialog('permission')"
              class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 14 14">
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
            </button>
          </div>

          <div class="px-6 flex-1">
            <div class="h-[70vh] overflow-y-auto overflow-x-auto border-[1px] border-gray-200 rounded-lg">
              <table class="w-full text-sm text-left">
                <thead class="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th class="px-4 py-3 font-bold !border !border-gray-300 text-left">Menu</th>
                    <th class="px-4 py-3 font-bold !border !border-gray-300 text-center w-[70px]">View</th>
                    <th class="px-4 py-3 font-bold !border !border-gray-300 text-center w-[70px]">Create</th>
                    <th class="px-4 py-3 font-bold !border !border-gray-300 text-center w-[70px]">Update</th>
                    <th class="px-4 py-3 font-bold !border !border-gray-300 text-center w-[70px]">Delete</th>
                    <th class="px-4 py-3 font-bold !border !border-gray-300 text-center w-[80px]">Download</th>
                    <th class="px-4 py-3 font-bold !border !border-gray-300 text-center w-[70px]">PCD</th>
                    <th class="px-4 py-3 font-bold !border !border-gray-300 text-center w-[260px]">Area</th>
                  </tr>
                </thead>

                <tbody class="">
                  <template v-for="(row, idx) in flattenedPermissions" :key="idx">
                    <tr v-if="row.type === 'header'" class="bg-blue-100">
                      <td colspan="8" class="px-4 py-2 font-bold text-blue-900 !border !border-blue-200">
                        {{ row.title }}
                      </td>
                    </tr>

                    <tr v-else-if="row.type === 'submenu'" class="bg-green-100">
                      <td colspan="8" class="px-4 py-2 font-semibold text-green-900 !border !border-green-200 pl-6">
                        {{ row.title }}
                      </td>
                    </tr>

                    <tr v-else-if="row.type === 'link' && row.permission" class="hover:bg-gray-50">
                      <td class="px-4 py-2 !border !border-gray-300 pl-10 text-gray-800">
                        {{ row.title }}
                      </td>
                      <td class="px-4 py-2 !border !border-gray-300 text-center">
                        <input
                          type="checkbox"
                          :checked="userStore.permissions.includes(row.permission.parent)"
                          @change="handlePermissionChange($event, row.permission.parent)"
                          class="w-5 h-5 appearance-none border-2 border-gray-500 rounded bg-white checked:bg-blue-600 checked:border-blue-600"
                        />
                      </td>
                      <td class="px-4 py-2 !border !border-gray-300 text-center">
                        <template v-if="row.permission.child && row.permission.child.includes('Create')">
                          <input
                            type="checkbox"
                            :checked="userStore.permissions.includes(row.permission.parent.replace('.View.', '.Create.'))"
                            @change="handlePermissionChange($event, row.permission.parent.replace('.View.', '.Create.'))"
                            class="w-5 h-5 appearance-none border-2 border-gray-500 rounded bg-white checked:bg-blue-600 checked:border-blue-600"
                          />
                        </template>
                        <span v-else class="text-gray-400">-</span>
                      </td>
                      <td class="px-4 py-2 !border !border-gray-300 text-center">
                        <template v-if="row.permission.child && row.permission.child.includes('Update')">
                          <input
                            type="checkbox"
                            :checked="userStore.permissions.includes(row.permission.parent.replace('.View.', '.Update.'))"
                            @change="handlePermissionChange($event, row.permission.parent.replace('.View.', '.Update.'))"
                            class="w-5 h-5 appearance-none border-2 border-gray-500 rounded bg-white checked:bg-blue-600 checked:border-blue-600"
                          />
                        </template>
                        <span v-else class="text-gray-400">-</span>
                      </td>
                      <td class="px-4 py-2 !border !border-gray-300 text-center">
                        <template v-if="row.permission.child && row.permission.child.includes('Delete')">
                          <input
                            type="checkbox"
                            :checked="userStore.permissions.includes(row.permission.parent.replace('.View.', '.Delete.'))"
                            @change="handlePermissionChange($event, row.permission.parent.replace('.View.', '.Delete.'))"
                            class="w-5 h-5 appearance-none border-2 border-gray-500 rounded bg-white checked:bg-blue-600 checked:border-blue-600"
                          />
                        </template>
                        <span v-else class="text-gray-400">-</span>
                      </td>
                      <td class="px-4 py-2 !border !border-gray-300 text-center">
                        <template v-if="row.permission.child && row.permission.child.includes('Download')">
                          <input
                            type="checkbox"
                            :checked="userStore.permissions.includes(row.permission.parent.replace('.View.', '.Download.'))"
                            @change="handlePermissionChange($event, row.permission.parent.replace('.View.', '.Download.'))"
                            class="w-5 h-5 appearance-none border-2 border-gray-500 rounded bg-white checked:bg-blue-600 checked:border-blue-600"
                          />
                        </template>
                        <span v-else class="text-gray-400">-</span>
                      </td>
                      <td class="px-4 py-2 !border !border-gray-300 text-center">
                        <template v-if="row.permission.child && row.permission.child.includes('PCD')">
                          <input
                            type="checkbox"
                            :checked="userStore.permissions.includes(row.permission.parent.replace('.View.', '.PCD.'))"
                            @change="handlePermissionChange($event, row.permission.parent.replace('.View.', '.PCD.'))"
                            class="w-5 h-5 appearance-none border-2 border-gray-500 rounded bg-white checked:bg-blue-600 checked:border-blue-600"
                          />
                        </template>
                        <span v-else class="text-gray-400">-</span>
                      </td>
                      <!-- Area: batasi kartu area yg tampil (kosong = semua area) -->
                      <td class="px-2 py-2 !border !border-gray-300 text-left">
                        <template v-if="row.permission.areas && row.permission.areas.length">
                          <div class="flex flex-wrap gap-x-3 gap-y-1">
                            <label
                              v-for="area in row.permission.areas"
                              :key="area"
                              class="inline-flex items-center gap-1 text-xs normal-case whitespace-nowrap cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                :checked="userStore.permissions.includes(row.permission.parent.replace('.View.', '.Area.') + ':' + area)"
                                @change="handlePermissionChange($event, row.permission.parent.replace('.View.', '.Area.') + ':' + area)"
                                class="w-4 h-4 appearance-none border-2 border-gray-500 rounded bg-white checked:bg-blue-600 checked:border-blue-600"
                              />
                              {{ area }}
                            </label>
                          </div>
                        </template>
                        <span v-else class="text-gray-400">-</span>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>

            <div class="mt-4 text-sm text-gray-500">Selected: {{ userStore.permissions.length }} permission(s)</div>
          </div>

          <div class="flex items-center justify-end px-6 pb-6 space-x-3 !border-t !border-gray-200 flex-shrink-0">
            <button
              @click="closeDialog('permission')"
              type="button"
              class="text-gray-700 bg-white !border !border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5"
            >
              Cancel
            </button>
            <button
              @click="handleSavePermissions"
              type="button"
              class="text-white bg-purple-600 hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5"
            >
              Save Permissions
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.border {
  border: 1px solid #e5e7eb !important;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
</style>
