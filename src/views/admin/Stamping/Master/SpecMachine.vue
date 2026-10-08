<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useSpecMachinePressStore } from '@/stores/Stamping/Master/SpecMachine';
import { useNotificationStore } from '@/stores/notification';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';
import MachineLayoutPress from '@/components/stamping/master/MachineLayoutPress.vue';
import FactoryEditor2DPress from '@/components/stamping/master/layout2d/FactoryEditor2DPress.vue';
import SpecMachineFormDialog from '@/components/stamping/master/SpecMachineFormDialog.vue';

const page = ref({ title: 'Stamping Spec Machine' });
const viewMode2D = ref(true);
const breadcrumbs = ref([
  { title: 'Stamping', disabled: false, href: '#' },
  { title: 'Master Data', disabled: false, href: '#' },
  { title: 'Spec Machine', disabled: true, href: '#' }
]);

const store = useSpecMachinePressStore();
const notificationStore = useNotificationStore();
const { dataTable, loading, isModalAddOpen, isModalEditOpen } = storeToRefs(store);

const searchQuery = ref('');

const headers = [
  { title: 'Area', key: 'area', align: 'center' as const },
  { title: 'Line', key: 'line', align: 'center' as const },
  { title: 'Machine', key: 'machine', align: 'center' as const },
  { title: 'Tipe Press', key: 'press_type', align: 'center' as const },
  { title: 'Tonnage', key: 'tonnage', align: 'center' as const },
  { title: 'Stroke', key: 'stroke', align: 'center' as const },
  { title: 'Die Size', key: 'die_size', align: 'center' as const },
  { title: 'Note', key: 'note', align: 'start' as const },
  { title: 'Action', key: 'actions', align: 'center' as const, sortable: false }
];

const filteredData = computed(() => {
  let result = [...(dataTable.value || [])];

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(item =>
      Object.values(item).some(val =>
        String(val || '').toLowerCase().includes(q)
      )
    );
  }

  return result;
});

const openAddModal = () => {
  store.resetForm();
  isModalAddOpen.value = true;
};

const handleEdit = (id: number | string) => {
  store.editData(id);
};

const handleDelete = (id: number | string) => {
  notificationStore.showConfirm(
    'Apakah anda yakin?',
    'Data yang dihapus tidak dapat dikembalikan!',
    async () => {
      await store.deleteData(id);
    }
  );
};

const handleActivate = (id: number | string) => {
  notificationStore.showConfirm(
    'Apakah anda yakin?',
    'Data ini akan diaktifkan kembali!',
    async () => {
      await store.activateData(id);
    }
  );
};

const submitAdd = () => {
  store.addData();
};

const submitEdit = () => {
  store.updateData();
};

const handleSaveLayout = (layoutData: any[]) => {
  store.saveLayout(layoutData);
};

const handleReassignLines = (changes: { id: number | string; line: string }[]) => {
  store.reassignLines(changes);
};

onMounted(() => {
  store.fetchMasterData();
});
</script>

<template>
  <div class="page-wrapper">
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

    <div class="d-flex justify-end mb-2">
      <v-btn-toggle v-model="viewMode2D" color="primary" mandatory variant="outlined" density="compact">
        <v-btn :value="false" prepend-icon="mdi-grid">Grid Layout</v-btn>
        <v-btn :value="true" prepend-icon="mdi-factory">Stamping Factory Layout</v-btn>
      </v-btn-toggle>
    </div>

    <FactoryEditor2DPress
      v-if="viewMode2D"
      :machines="dataTable"
      @edit-machine="handleEdit"
      @reassign-lines="handleReassignLines"
    />
    <MachineLayoutPress
      v-else
      :machines="dataTable"
      @save-layout="handleSaveLayout"
      @edit-machine="handleEdit"
      @reassign-lines="handleReassignLines"
    />

    <v-card class="pa-5 rounded-lg mb-6 elevation-2">
      <div class="d-flex justify-space-between align-center mb-4">
        <div class="text-h4 text-primary font-weight-medium">
          Master Spec Machine Press
        </div>
        <div class="d-flex gap-2">
          <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddModal">
            Tambah Data
          </v-btn>
        </div>
      </div>

      <div class="d-flex align-center justify-space-between mb-3">
        <div class="text-caption text-grey d-flex align-center">
          <v-icon size="16" class="mr-1">mdi-information</v-icon>
          <span>Data master untuk spesifikasi mesin press.</span>
        </div>
        <div class="d-flex align-center gap-3" style="max-width: 600px; width: 100%; justify-content: flex-end;">
          <v-select
            v-model="store.filterIsDeleted"
            :items="[{title: 'Aktif', value: '0'}, {title: 'Tidak Aktif', value: '1'}, {title: 'Semua', value: ''}]"
            item-title="title"
            item-value="value"
            label="Status"
            density="compact"
            variant="outlined"
            hide-details
            @update:model-value="store.fetchMasterData()"
            style="max-width: 130px;"
          ></v-select>
          <v-text-field
            v-model="searchQuery"
            placeholder="Cari data..."
            density="compact"
            variant="outlined"
            hide-details
            prepend-inner-icon="mdi-magnify"
            clearable
            style="max-width: 200px;"
          />
        </div>
      </div>

      <v-data-table
        fixed-header
        :headers="headers"
        :items="filteredData"
        :loading="loading"
        density="compact"
        class="elevation-1 rounded-lg custom-table text-body-2"
        hover
      >
        <template #item="{ item }">
          <tr :class="{'bg-grey-lighten-4 text-grey': item.is_deleted === '1' || item.is_deleted === 1}">
            <td class="text-center font-weight-bold">{{ item.area || '-' }}</td>
            <td class="text-center font-weight-bold">{{ item.line || '-' }}</td>
            <td class="text-center">{{ item.machine || '-' }}</td>
            <td class="text-center">{{ item.press_type || '-' }}</td>
            <td class="text-center">{{ item.tonnage || '-' }}</td>
            <td class="text-center">{{ item.stroke || '-' }}</td>
            <td class="text-center">{{ item.die_size || '-' }}</td>
            <td>{{ item.note || '-' }}</td>
            <td class="text-center">
              <div class="d-flex justify-center align-center">
                <v-tooltip text="Edit" v-if="item.is_deleted === '0' || item.is_deleted === 0 || !item.is_deleted">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-pencil" size="x-small" color="warning" variant="text" @click="handleEdit(item.id)"></v-btn>
                  </template>
                </v-tooltip>

                <v-tooltip text="Hapus" v-if="item.is_deleted === '0' || item.is_deleted === 0 || !item.is_deleted">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-delete" size="x-small" color="error" variant="text" @click="handleDelete(item.id)"></v-btn>
                  </template>
                </v-tooltip>

                <v-tooltip text="Aktifkan" v-if="item.is_deleted === '1' || item.is_deleted === 1">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-restore" size="x-small" color="success" variant="text" @click="handleActivate(item.id)"></v-btn>
                  </template>
                </v-tooltip>
              </div>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>

    <SpecMachineFormDialog v-model="isModalAddOpen" mode="add" @submit="submitAdd" />
    <SpecMachineFormDialog v-model="isModalEditOpen" mode="edit" @submit="submitEdit" />
  </div>
</template>

<style scoped>
.custom-table :deep(.v-table__wrapper) {
  max-height: 700px;
  overflow-y: auto;
}

.custom-table :deep(table) {
  border-collapse: collapse !important;
  border: 1.5px solid #94a3b8 !important;
}

.custom-table :deep(th) {
  background-color: #eef2f7 !important;
  color: #000000 !important;
  font-weight: bold !important;
  text-transform: uppercase;
  font-size: 11px !important;
  padding: 4px 6px !important;
  border-bottom: 2px solid #94a3b8 !important;
  border-right: 1.5px solid #cbd5e1 !important;
}

.custom-table :deep(td) {
  padding: 4px 6px !important;
  font-size: 11px !important;
  border-bottom: 1.5px solid #cbd5e1 !important;
  border-right: 1.5px solid #cbd5e1 !important;
  vertical-align: middle !important;
  color: #000000 !important;
}

.custom-table :deep(tr:hover:not(.v-data-table__empty-wrapper)) {
  background-color: rgba(33, 150, 243, 0.08) !important;
}
</style>
