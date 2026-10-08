<script setup lang="ts">
import { ref, shallowRef, onMounted, computed } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useDisplayManagementStore } from '@/stores/Admin/DisplayManagement';
import { ActionType } from '@/types/Admin/DisplayManagement';
import type { Display, DisplayAndon } from '@/types/Admin/DisplayManagement';
import { MoveDirection } from '@/types/Admin/DisplayManagement';
import { storeToRefs } from 'pinia';
import { useConfigStore } from '@/stores/config';
import { useNotificationStore } from '@/stores/notification';

const store = useDisplayManagementStore();
const configStore = useConfigStore();
const notificationStore = useNotificationStore();
const { action, permissions, datatables, datatablesList, dialog, formData, formDataAndon, list, listAndon, filteredItemsAndon } =
  storeToRefs(store);

const page = ref({ title: 'Display Management' });
const breadcrumbs = shallowRef([
  {
    title: 'Admin',
    disabled: false,
    href: '#'
  },
  {
    title: 'Master Data',
    disabled: false,
    href: '#'
  },
  {
    title: 'Andon',
    disabled: false,
    href: '#'
  },
  {
    title: 'Display Management',
    disabled: true,
    href: '#'
  }
]);

const showModalListAndon = ref(false);
const showModalAndonIn = ref(false);
const selectedDisplay = ref<Display | null>(null);
const currentDisplayId = ref<string>('');
const tableKey = ref(0);
const parameter = ref<string | null>(null);
const urlPreview = ref<string>('');
const filters = ref<Record<string, string>>({
  id: '',
  title: '',
  location: '',
  device: '',
  ip_address: '',
  short_link: ''
});

const currentPage = ref(1);
const pageSize = ref(10);
const pageSizeOptions = [5, 10, 25, 50, 100];

const currentPageAndon = ref(1);
const pageSizeAndon = ref(10);

const formattedDuration = computed({
  get() {
    if (!formDataAndon.value.duration && formDataAndon.value.duration !== 0) {
      return '';
    }
    return formDataAndon.value.duration / 60000;
  },
  set(value: number | string) {
    formDataAndon.value.duration = Number(value) * 60000;
  }
});

const filteredItems = computed(() => {
  if (!filteredItemsAndon.value) return [];

  return filteredItemsAndon.value.filter((item: Display) => {
    return Object.keys(filters.value).every((key) => {
      if (!filters.value[key]) return true;

      const itemValue = item[key as keyof Display]?.toString().toLowerCase() || '';
      const filterValue = filters.value[key].toLowerCase();
      return itemValue.includes(filterValue);
    });
  });
});

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredItems.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredItems.value.length / pageSize.value);
});

const paginatedAndonItems = computed(() => {
  if (!datatablesList.value.items) return [];
  const start = (currentPageAndon.value - 1) * pageSizeAndon.value;
  const end = start + pageSizeAndon.value;
  return datatablesList.value.items.slice(start, end);
});

const totalPagesAndon = computed(() => {
  return Math.ceil((datatablesList.value.items?.length || 0) / pageSizeAndon.value);
});

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const changePageAndon = (page: number) => {
  if (page >= 1 && page <= totalPagesAndon.value) {
    currentPageAndon.value = page;
  }
};

const changePageSize = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
};

const changePageSizeAndon = (size: number) => {
  pageSizeAndon.value = size;
  currentPageAndon.value = 1;
};

const checkParameter = (id: string) => {
  const selectedItem = listAndon.value.find((item: any) => item.id === id);

  if (selectedItem) {
    switch (true) {
      case selectedItem.is_line == 'Y':
        parameter.value = selectedItem.is_line;
        break;
      case selectedItem.is_group == 'Y':
        parameter.value = selectedItem.is_group;
        break;
      case selectedItem.is_running_text == 'Y':
        parameter.value = selectedItem.is_running_text;
        break;
      case selectedItem.is_tipe == 'Y':
        parameter.value = selectedItem.is_tipe;
        break;
      case selectedItem.is_period == 'Y':
        parameter.value = 'Y';
        break;
      case selectedItem.is_cycle == 'Y':
        parameter.value = 'Y';
        break;
      default:
        parameter.value = null;
        break;
    }

    if (selectedItem.photo) {
      urlPreview.value = selectedItem.photo;
    }
  } else {
    parameter.value = null;
    urlPreview.value = '';
  }
};

const onAndonSelectAndCheck = () => {
  const selectedAndon = listAndon.value.find((andon: any) => andon.id === formDataAndon.value.andon_id);

  if (selectedAndon) {
    formDataAndon.value.title_andon = selectedAndon.nama_andon;
    checkParameter(formDataAndon.value.andon_id);
  }
};

const openModalListAndon = () => {
  action.value = ActionType.ADD;
  formData.value.id = '';
  formData.value.title = '';
  formData.value.location = '';
  formData.value.device = '';
  formData.value.ip_address = '';
  formData.value.short_link = '';
  showModalListAndon.value = true;
};

const editDisplay = (item: Display) => {
  action.value = ActionType.EDIT;
  store.loadData(ActionType.EDIT, item);
  showModalListAndon.value = true;
};

const saveDisplay = async () => {
  await store.onUpdate();
  showModalListAndon.value = false;
  tableKey.value++;
};

const viewAndonList = async (item: Display) => {
  selectedDisplay.value = item;
  currentDisplayId.value = item.id;
  formData.value.id = item.id;
  formData.value.title = item.title;
  await store.fetchListDataAndon(item.id);
  currentPageAndon.value = 1;
};

const openModalAndonIn = async () => {
  if (!selectedDisplay.value) {
    return;
  }

  action.value = ActionType.ADD;
  formDataAndon.value.id = '';
  formDataAndon.value.andon_id = '';
  formDataAndon.value.title_andon = '';
  formDataAndon.value.duration = 0;
  formDataAndon.value.parameter = '';
  formDataAndon.value.link = '';

  parameter.value = null;
  urlPreview.value = '';

  await store.fetchListAndon();
  showModalAndonIn.value = true;
};

const editAndonItem = async (item: DisplayAndon) => {
  action.value = ActionType.EDIT;
  await store.fetchListAndon();

  const itemToEdit = {
    ...item
  };

  store.addDataAndonGroup(ActionType.EDIT, itemToEdit);

  if (item.andon_id) {
    checkParameter(item.andon_id);
  }

  showModalAndonIn.value = true;
};

const saveAndonIn = async () => {
  if (!currentDisplayId.value) {
    notificationStore.showDialogWarning('Error', 'Display ID is missing');
    return;
  }

  await store.onUpdateAndonGroup(currentDisplayId.value);
  showModalAndonIn.value = false;
  await store.fetchListDataAndon(currentDisplayId.value);
};

const confirmDeleteAndon = (item: DisplayAndon) => {
  if (confirm(`Do you really want to delete ${item.title_andon}?`)) {
    deleteAndon(item);
  }
};

const deleteAndon = async (item: DisplayAndon) => {
  await store.deleteAndon(item.id, currentDisplayId.value);
  await store.fetchListDataAndon(currentDisplayId.value);
};

const moveUp = async (item: DisplayAndon, index: number) => {
  const actualIndex = datatablesList.value.items.findIndex((i) => i.id === item.id);
  if (actualIndex > 0 && item.urut) {
    await store.onMove(MoveDirection.UP, item.urut, item.id, currentDisplayId.value);
  }
};

const moveDown = async (item: DisplayAndon, index: number) => {
  const actualIndex = datatablesList.value.items.findIndex((i) => i.id === item.id);
  if (actualIndex < datatablesList.value.items.length - 1 && item.urut) {
    await store.onMove(MoveDirection.DOWN, item.urut, item.id, currentDisplayId.value);
  }
};

const formatDurationForDisplay = (durationMs: number): string => {
  if (!durationMs) return '0';
  return (durationMs / 60000).toString();
};

const goToDisplay = (item: Display) => {
  const baseUrl = configStore.apiUrl === 'localhost' ? 'http://localhost:8080' : `http://${configStore.apiUrl}/mims`;

  window.open(`${baseUrl}/andon/${item.short_link}`, '_blank');
};

const resetForm = () => {
  formData.value.id = '';
  formData.value.title = '';
  formData.value.location = '';
  formData.value.device = '';
  formData.value.ip_address = '';
  formData.value.short_link = '';
};

onMounted(async () => {
  await store.fetchDataAndonManagement();
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

  <div class="bg-blue-600 shadow-lg rounded-xl p-6 mb-6">
    <div class="text-center py-6 mb-8">
      <h1 class="text-6xl font-bold text-white">Display Management Andon</h1>
    </div>

    <div class="flex flex-col lg:flex-row gap-6">
      <div class="lg:w-3/6">
        <div class="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-8">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 class="text-blue-600 text-3xl font-semibold">List Andon</h2>
            </div>

            <button
              v-if="permissions.create"
              @click="openModalListAndon"
              type="button"
              class="inline-flex items-center justify-center gap-2 text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-xl px-5 py-3 text-sm shadow-lg transition-all duration-200"
            >
              Add Data
            </button>
          </div>

          <div class="overflow-x-auto">
            <table :key="tableKey" class="w-full text-sm rtl:text-right text-gray-500 text-center">
              <thead class="text-gray-700 bg-gray-50">
                <tr>
                  <th scope="col" class="px-2 py-3">ID</th>
                  <th scope="col" class="px-2 py-3">Andon Name</th>
                  <th scope="col" class="px-2 py-3">Location</th>
                  <th scope="col" class="px-2 py-3">Device</th>
                  <th scope="col" class="px-2 py-3">IP Address</th>
                  <th scope="col" class="px-2 py-3">Short Link</th>
                  <th scope="col" class="px-2 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr class="bg-gray-100">
                  <td class="px-2 py-2">
                    <input
                      v-model="filters.id"
                      type="text"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>
                  <td class="px-2 py-2">
                    <input
                      v-model="filters.title"
                      type="text"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>
                  <td class="px-2 py-2">
                    <input
                      v-model="filters.location"
                      type="text"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>
                  <td class="px-2 py-2">
                    <input
                      v-model="filters.device"
                      type="text"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>
                  <td class="px-2 py-2">
                    <input
                      v-model="filters.ip_address"
                      type="text"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>
                  <td class="px-2 py-2">
                    <input
                      v-model="filters.short_link"
                      type="text"
                      class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>
                  <td class="px-2 py-2"></td>
                </tr>

                <tr
                  v-for="item in paginatedItems"
                  :key="item.id"
                  @click="viewAndonList(item)"
                  class="bg-white border-b hover:bg-gray-50 cursor-pointer transition-colors"
                  :class="{ 'bg-blue-50': selectedDisplay?.id === item.id }"
                >
                  <td class="px-2 py-4">{{ item.id }}</td>
                  <td class="px-2 py-4">{{ item.title }}</td>
                  <td class="px-2 py-4">{{ item.location }}</td>
                  <td class="px-2 py-4">
                    <span class="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded">
                      {{ item.device }}
                    </span>
                  </td>
                  <td class="px-2 py-4">{{ item.ip_address || '-' }}</td>
                  <td class="px-2 py-4">
                    <span class="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded">
                      {{ item.short_link }}
                    </span>
                  </td>
                  <td class="px-2 py-4">
                    <div class="flex items-center justify-center gap-2">
                      <button
                        @click.stop="goToDisplay(item)"
                        type="button"
                        class="text-blue-600 hover:text-blue-900 p-1"
                        title="Open Display"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </button>
                      <button @click.stop="editDisplay(item)" type="button" class="text-green-600 hover:text-green-900 p-1" title="Edit">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="paginatedItems.length === 0">
                  <td colspan="7" class="px-6 py-8 text-center text-gray-500">No data available</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-700">Show</span>
              <select
                v-model="pageSize"
                @change="changePageSize(pageSize)"
                class="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
              </select>
              <span class="text-sm text-gray-700">entries</span>
            </div>

            <div class="flex items-center gap-2">
              <button
                @click="changePage(1)"
                :disabled="currentPage === 1"
                class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                @click="changePage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span class="text-sm text-gray-700"> Page {{ currentPage }} of {{ totalPages }} </span>
              <button
                @click="changePage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                @click="changePage(totalPages)"
                :disabled="currentPage === totalPages"
                class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:w-3/6">
        <div class="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-8">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 class="text-blue-600 text-3xl font-semibold">Andon in {{ selectedDisplay ? `- ${selectedDisplay.title}` : '' }}</h2>
            </div>

            <button
              @click="openModalAndonIn"
              type="button"
              :disabled="!selectedDisplay"
              class="inline-flex items-center justify-center gap-2 text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-xl px-5 py-3 text-sm shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Data
            </button>
          </div>

          <div class="overflow-x-auto">
            <table :key="tableKey + 1000" class="w-full text-sm rtl:text-right text-gray-500 text-center">
              <thead class="text-gray-700 bg-gray-50">
                <tr>
                  <th scope="col" class="px-2 py-3">Order</th>
                  <th scope="col" class="px-2 py-3">Andon Name</th>
                  <th scope="col" class="px-2 py-3">Link</th>
                  <th scope="col" class="px-2 py-3">Parameter</th>
                  <th scope="col" class="px-2 py-3">Duration (Minutes)</th>
                  <th scope="col" class="px-2 py-3">Move Action</th>
                  <th scope="col" class="px-2 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in paginatedAndonItems" :key="item.id" class="bg-white border-b hover:bg-gray-50">
                  <td class="px-2 py-4">
                    <span class="inline-flex items-center justify-center w-8 h-8 text-sm font-semibold text-white bg-blue-600 rounded-full">
                      {{ item.urut }}
                    </span>
                  </td>
                  <td class="px-2 py-4">{{ item.title_andon }}</td>
                  <td class="px-2 py-4 text-xs">{{ item.link || '-' }}</td>
                  <td class="px-2 py-4">{{ item.parameter || '-' }}</td>
                  <td class="px-2 py-4">{{ formatDurationForDisplay(item.duration) }} minutes</td>
                  <td class="px-2 py-4">
                    <div class="flex items-center justify-center gap-1">
                      <button
                        @click="moveUp(item, index)"
                        :disabled="index === 0 && currentPageAndon === 1"
                        type="button"
                        class="p-1 text-green-600 hover:text-green-900 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move Up"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        @click="moveDown(item, index)"
                        :disabled="index === paginatedAndonItems.length - 1 && currentPageAndon === totalPagesAndon"
                        type="button"
                        class="p-1 text-yellow-600 hover:text-yellow-900 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move Down"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td class="px-2 py-4">
                    <div class="flex items-center justify-center gap-1">
                      <button @click="editAndonItem(item)" type="button" class="p-1 text-blue-600 hover:text-blue-900" title="Edit">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button @click="confirmDeleteAndon(item)" type="button" class="p-1 text-red-600 hover:text-red-900" title="Delete">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="paginatedAndonItems.length === 0">
                  <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                    {{ selectedDisplay ? 'No andon data available' : 'Please select a display first' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-if="selectedDisplay && datatablesList.items.length > 0"
            class="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-700">Show</span>
              <select
                v-model="pageSizeAndon"
                @change="changePageSizeAndon(pageSizeAndon)"
                class="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
              </select>
              <span class="text-sm text-gray-700">entries</span>
            </div>

            <div class="flex items-center gap-2">
              <button
                @click="changePageAndon(1)"
                :disabled="currentPageAndon === 1"
                class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                @click="changePageAndon(currentPageAndon - 1)"
                :disabled="currentPageAndon === 1"
                class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span class="text-sm text-gray-700"> Page {{ currentPageAndon }} of {{ totalPagesAndon }} </span>
              <button
                @click="changePageAndon(currentPageAndon + 1)"
                :disabled="currentPageAndon === totalPagesAndon"
                class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                @click="changePageAndon(totalPagesAndon)"
                :disabled="currentPageAndon === totalPagesAndon"
                class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <Transition name="modal">
    <div
      v-if="showModalListAndon"
      class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="showModalListAndon = false"
    >
      <div class="relative p-4 w-full max-w-2xl max-h-full">
        <div class="relative bg-white rounded-lg shadow-lg">
          <div class="flex items-center justify-between p-5 border-b rounded-t border-gray-200">
            <div>
              <h1 class="text-gray-600 text-2xl font-semibold">{{ action === 'Add' ? 'Add' : 'Edit' }} Andon Display</h1>
            </div>
            <button
              type="button"
              @click="showModalListAndon = false"
              class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
            >
              <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
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

          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-if="action === 'Edit'" class="md:col-span-2">
                <label class="block mb-2 text-sm font-medium text-gray-900"> ID </label>
                <input
                  type="text"
                  v-model="formData.id"
                  class="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3"
                  placeholder="ID"
                  readonly
                />
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900"> Andon Name * </label>
                <input
                  type="text"
                  v-model="formData.title"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3"
                  placeholder="Andon name"
                  required
                />
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900"> Location * </label>
                <input
                  type="text"
                  v-model="formData.location"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3"
                  placeholder="Location"
                  required
                />
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900"> Device * </label>
                <select
                  v-model="formData.device"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3"
                  required
                >
                  <option value="">Select device</option>
                  <option v-for="device in list.device" :key="device" :value="device">
                    {{ device }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block mb-2 text-sm font-medium text-gray-900"> IP Address </label>
                <input
                  type="text"
                  v-model="formData.ip_address"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3"
                  placeholder="IP address"
                />
              </div>

              <div class="md:col-span-2">
                <label class="block mb-2 text-sm font-medium text-gray-900"> Short Link * </label>
                <input
                  type="text"
                  v-model="formData.short_link"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3"
                  placeholder="Short link"
                  required
                />
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end p-6 border-t border-gray-200 gap-3">
            <button
              @click="showModalListAndon = false"
              type="button"
              class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
            >
              Cancel
            </button>
            <button
              @click="saveDisplay"
              type="button"
              class="text-white bg-blue-600 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <Transition name="modal">
    <div
      v-if="showModalAndonIn"
      class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="showModalAndonIn = false"
    >
      <div class="relative w-full max-w-2xl max-h-full">
        <div class="relative bg-white rounded-lg shadow-xl">
          <div class="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h1 class="text-gray-800 text-2xl font-semibold">{{ action === 'Add' ? 'Add' : 'Edit' }} Andon In</h1>
              <p class="text-sm text-gray-500 mt-1">Display: {{ formData.short_link }}</p>
            </div>
            <button
              type="button"
              @click="showModalAndonIn = false"
              class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center transition-colors"
            >
              <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
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

          <div class="p-6 md:p-8">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-6">
                <div>
                  <label class="block mb-2 text-sm font-medium text-gray-900"> Andon <span class="text-red-500">*</span> </label>
                  <select
                    v-model="formDataAndon.andon_id"
                    @change="onAndonSelectAndCheck"
                    :disabled="action === 'Edit'"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition-colors"
                    :class="{ 'bg-gray-100 cursor-not-allowed': action === 'Edit' }"
                    required
                  >
                    <option value="">Select Andon</option>
                    <option v-for="andon in listAndon" :key="andon.id" :value="andon.id">
                      {{ andon.nama_andon }} - {{ andon.nama_department }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block mb-2 text-sm font-medium text-gray-900"> Andon Title <span class="text-red-500">*</span> </label>
                  <input
                    type="text"
                    v-model="formDataAndon.title_andon"
                    class="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3"
                    placeholder="Andon title"
                    required
                  />
                </div>

                <div>
                  <label class="block mb-2 text-sm font-medium text-gray-900"> Parameter <span class="text-red-500">*</span> </label>
                  <input
                    type="text"
                    v-model="formDataAndon.parameter"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3 focus:outline-none transition-colors"
                    placeholder="Enter parameter"
                    required
                  />
                </div>
              </div>

              <div class="space-y-6">
                <div v-if="urlPreview">
                  <label class="block mb-2 text-sm font-medium text-gray-900"> Preview </label>
                  <div class="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <img :src="urlPreview" alt="Andon Preview" class="w-full h-48 object-contain rounded-lg" />
                  </div>
                </div>

                <div v-else class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p class="mt-2 text-sm text-gray-500">No preview available</p>
                </div>

                <div>
                  <label class="block mb-2 text-sm font-medium text-gray-900">
                    Duration (Minutes) <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    v-model="formattedDuration"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3 focus:outline-none transition-colors"
                    placeholder="Enter duration in minutes"
                    required
                    min="1"
                    step="1"
                  />
                  <p class="mt-2 text-xs text-gray-500 flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    Input durasi dalam menit
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end p-6 border-t border-gray-200 gap-3 bg-gray-50 rounded-b-lg">
            <button
              @click="showModalAndonIn = false"
              type="button"
              class="text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-6 py-2.5 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="saveAndonIn"
              type="button"
              class="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-6 py-2.5 transition-colors shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
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

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.9);
}

table {
  border-collapse: collapse;
  width: 100%;
}

th {
  text-align: center;
  padding: 12px 8px;
  background-color: #f9fafb;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

td {
  padding: 12px 8px;
  border-bottom: 1px solid #e5e7eb;
  text-align: center;
}

tbody tr:hover:not(:first-child) {
  background-color: #f9fafb;
}
</style>
