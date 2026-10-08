<template>
  <v-navigation-drawer
    app
    left
    v-model="customizer.Sidebar_drawer"
    elevation="0"
    rail-width="50"
    :rail="customizer.mini_sidebar"
    width="280"
    expand-on-hover
    class="custom-sidebar"
    style="display: flex; flex-direction: column"
  >
    <div class="sidebar-header pa-4" @click="goToHome" style="cursor: pointer">
      <div class="sidebar-header-content">
        <div class="text-container centered-text">
          <img src="@/assets/images/mims-logo.png" alt="Logo MIMS" class="w-42 self-center" />
        </div>
      </div>
    </div>

    <v-divider></v-divider>
    <div class="px-3 py-2">
      <div class="relative w-full max-w-sm">
        <!-- Prepend Inner Icon (mdi-magnify) -->
        <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            class="w-4 h-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z"
            />
          </svg>
        </div>

        <!-- Input Field -->
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search Here"
          class="w-full pl-9 pr-3 py-1.5 text-[13px] bg-gray-100 border border-gray-300 rounded-lg outline-none transition placeholder-gray-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
    <v-divider style="border-color: #314158; border-width: 6px 0 0 0"></v-divider>
    <v-list v-model:opened="openGroups">
      <RecursiveMenu v-if="Object.keys(filteredMenuTree).length" :menu-items="filteredMenuTree" />
    </v-list>
    <div class="mt-auto">
      <v-divider style="border-color: #314158; border-width: 4px 0 0 0"></v-divider>

      <v-menu v-model="profileMenuOpen" :close-on-content-click="false" location="top" offset="8">
        <template v-slot:activator="{ props }">
          <div v-bind="props" class="px-2 profile-trigger" style="height: 40px; display: flex; align-items: center; cursor: pointer">
            <v-avatar size="24" class="mr-2">
              <UserAvatar :username="authStore.user.username" :version="authStore.photoVersion">
                <img src="@/assets/images/users/avatar-1.png" width="24" alt="Avatar" />
              </UserAvatar>
            </v-avatar>

            <div class="flex items-center justify-between flex-1 overflow-hidden">
              <span class="text-subtitle-2 font-weight-medium truncate">
                {{ authStore.user.first_name ?? '' }}
                {{ authStore.user.last_name ?? '' }}
              </span>
              <span class="text-caption text-grey truncate ml-2">
                {{ authStore.user.username ?? '' }}
              </span>
            </div>

            <!-- icon panah kecil -->
            <v-icon size="14" class="ml-1 text-grey">
              {{ profileMenuOpen ? 'mdi-chevron-down' : 'mdi-chevron-up' }}
            </v-icon>
          </div>
        </template>

        <v-sheet rounded="md" width="290" style="overflow-x: hidden">
          <ProfileDD />
        </v-sheet>
      </v-menu>
    </div>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { menu as menuRoutes } from '@/router/MainRoutes';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import RecursiveMenu from '@/layouts/dashboard/vertical-sidebar/RecursiveMenu.vue';
import { LogoutOutlined } from '@ant-design/icons-vue';
import ProfileDD from '@/layouts/dashboard/vertical-header/ProfileDD.vue';
import UserAvatar from '@/components/shared/UserAvatar.vue';
import { useMspinAuthStore } from '@/stores/Logistik/Pallet/mspinAuthStore';
import { useCustomizerStore } from '@/stores/customizer';
const customizer = useCustomizerStore();

// HP/tablet: drawer jadi overlay (temporary). Halaman ber-`position: fixed` menutup scrim-nya,
// jadi drawer tak bisa ditutup dgn tap di luar → tutup otomatis saat dibuka & tiap pindah halaman.
const { mobile } = useDisplay();
onMounted(() => { if (mobile.value) customizer.Sidebar_drawer = false; });
const authStore = useAuthStore();
const mspinAuthStore = useMspinAuthStore();
const router = useRouter();
const offRoute = router.afterEach(() => { if (mobile.value) customizer.Sidebar_drawer = false; });
onUnmounted(offRoute);
const menuTree = ref({ directItems: [], subGroups: {}, subGroupIcons: {} });
const searchQuery = ref('');
const openGroups = ref([]);
const profileMenuOpen = ref(false);
const goToHome = () => {
  router.push('/');
};

const getAllGroupIds = (node, parentPath = '') => {
  let ids = [];
  Object.keys(node.subGroups).forEach((groupName) => {
    const uniqueId = parentPath ? `${parentPath}-${groupName}` : groupName;
    ids.push(uniqueId);
    const subNode = node.subGroups[groupName];
    if (subNode && Object.keys(subNode.subGroups).length > 0) {
      ids = ids.concat(getAllGroupIds(subNode, uniqueId));
    }
  });
  return ids;
};

const filterMenu = (node, query) => {
  const lowerCaseQuery = query.toLowerCase();

  const matchingDirectItems = node.directItems.filter((item) => item.meta.title.toLowerCase().includes(lowerCaseQuery));

  const filteredSubGroups = Object.entries(node.subGroups).reduce((acc, [groupName, subNode]) => {
    const lowerGroupName = groupName.toLowerCase();
    if (lowerGroupName.includes(lowerCaseQuery)) {
      acc[groupName] = subNode;
      return acc;
    }

    const filteredSubNode = filterMenu(subNode, query);
    if (filteredSubNode.directItems.length > 0 || Object.keys(filteredSubNode.subGroups).length > 0) {
      acc[groupName] = filteredSubNode;
    }

    return acc;
  }, {});

  return {
    directItems: matchingDirectItems,
    subGroups: filteredSubGroups,
    subGroupIcons: node.subGroupIcons
  };
};

const filteredMenuTree = computed(() => {
  if (!searchQuery.value) {
    return menuTree.value;
  }
  return filterMenu(menuTree.value, searchQuery.value);
});

watch(searchQuery, (newQuery) => {
  if (newQuery) {
    openGroups.value = getAllGroupIds(filteredMenuTree.value);
  } else {
    openGroups.value = [];
  }
});

watch(
  openGroups,
  (newVal, oldVal) => {
    if (newVal.length < oldVal.length) {
      const closedGroup = oldVal.find((group) => !newVal.includes(group));

      if (closedGroup) {
        const childPrefix = `${closedGroup}-`;

        openGroups.value = newVal.filter((group) => !group.startsWith(childPrefix));
      }
    }
  },
  { deep: true }
);

onMounted(() => {
  const root = { directItems: [], subGroups: {}, subGroupIcons: {} };
  menuRoutes.forEach((r) => {
    if (r.meta && r.meta.headers && r.meta.createSideBar) {
      const isAdmin = authStore.group === '1';
      const hasPerm =
        !r.meta.permission ||
        Object.keys(r.meta.permission).length === 0 ||
        isAdmin ||
        (Array.isArray(authStore.authorization) && authStore.authorization.includes(r.meta.permission.parent));
      if (!hasPerm) return;
      let currentNode = root;
      r.meta.headers.forEach((headerObj) => {
        const headerName = headerObj.title;
        const headerIcon = headerObj.icon;
        if (!currentNode.subGroups[headerName]) {
          currentNode.subGroups[headerName] = { directItems: [], subGroups: {}, subGroupIcons: {} };
        }
        if (headerIcon) {
          currentNode.subGroupIcons[headerName] = headerIcon;
        }
        currentNode = currentNode.subGroups[headerName];
      });
      currentNode.directItems.push(r);
    }
  });

  menuTree.value = root;
});
</script>

<style>
.custom-sidebar .v-navigation-drawer__content {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e0e0e0 !important;
}

.custom-sidebar .v-list {
  flex: 1;
  overflow-y: auto;
}

.sidebar-header {
  position: relative;
  height: 140px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-size: cover;
  background-position: center;
  background-color: white;
  background-image: url('../../../assets/images/newsidebar.png');
}

.sidebar-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
}

.sidebar-header-content {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 0 16px;
}

.logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.text-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-left: 20px;
}

.app-title {
  font-size: 36px;
  font-weight: 700;
  color: white;
  letter-spacing: 2px;
  text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.8);
}

.app-subtitle {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 500;
  color: white;
  opacity: 0.95;
  text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.8);
}

.centered-text {
  width: 100%;
  align-items: center !important;
  justify-content: center !important;
  text-align: center;
}

.shift-left {
  margin-left: -28px;
  transition: margin-left 0.3s ease;
}

.custom-sidebar:hover .logo-avatar {
  margin-left: 0;
  transition: margin-left 0.3s ease;
}

.custom-sidebar .v-list {
  flex: 1;
  overflow-y: auto;

  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: rgb(var(--v-theme-inputBorder)) rgb(var(--v-theme-gray100));
}

.custom-sidebar .v-list::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-sidebar .v-list::-webkit-scrollbar-track {
  background: #f8f8f8;
  border-radius: 8px;
}

.custom-sidebar .v-list::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 8px;
}

.custom-sidebar .v-list::-webkit-scrollbar-thumb:hover {
  background: #2d3748;
}
</style>
