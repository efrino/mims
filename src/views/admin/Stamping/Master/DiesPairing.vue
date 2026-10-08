<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useDiesStore } from '@/stores/Stamping/Master/Dies';
import { useSpecMachinePressStore } from '@/stores/Stamping/Master/SpecMachine';
import { useNotificationStore } from '@/stores/notification';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';
import DiesMachinePairingBoard from '@/components/stamping/master/DiesMachinePairingBoard.vue';
import DiesFormDialog from '@/components/stamping/master/DiesFormDialog.vue';

const page = ref({ title: 'Dies Pairing' });
const breadcrumbs = ref([
  { title: 'Stamping', disabled: false, href: '#' },
  { title: 'Master Data', disabled: false, href: '#' },
  { title: 'Dies Pairing', disabled: true, href: '#' }
]);

const store = useDiesStore();
const machineStore = useSpecMachinePressStore();
const notificationStore = useNotificationStore();
const { dataTable, pairings, loading, isModalAddOpen, isModalEditOpen } = storeToRefs(store);
const { dataTable: machineDataTable } = storeToRefs(machineStore);

const searchQuery = ref('');

const headers = [
  { title: 'Kode Dies', key: 'dies_code', align: 'center' as const },
  { title: 'Nama', key: 'dies_name', align: 'center' as const },
  { title: 'Part Number', key: 'part_number', align: 'center' as const },
  { title: 'Tonnage', key: 'tonnage_required', align: 'center' as const },
  { title: 'Ukuran (PxL)', key: 'size', align: 'center' as const },
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

const handlePair = (diesId: number, machineId: number) => {
  store.pairDiesToMachine(diesId, machineId);
};

const handleUnpair = (pairingId: number) => {
  store.unpairDies(pairingId);
};

onMounted(() => {
  store.fetchMasterData();
  store.fetchPairings();
  machineStore.fetchMasterData();
});
</script>

<template>
  <div class="page-wrapper">
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

    <DiesMachinePairingBoard
      :dies-list="dataTable"
      :machines="machineDataTable"
      :pairings="pairings"
      @pair="handlePair"
      @unpair="handleUnpair"
    />

    <v-card class="pa-5 rounded-lg mb-6 elevation-2">
      <div class="d-flex justify-space-between align-center mb-4">
        <div class="text-h4 text-primary font-weight-medium">
          Master Dies
        </div>
        <div class="d-flex gap-2">
          <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddModal">
            Tambah Dies
          </v-btn>
        </div>
      </div>

      <div class="d-flex align-center justify-space-between mb-3">
        <div class="text-caption text-grey d-flex align-center">
          <v-icon size="16" class="mr-1">mdi-information</v-icon>
          <span>Data master tooling/mold untuk pairing ke mesin press.</span>
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
            <td class="text-center font-weight-bold">{{ item.dies_code }}</td>
            <td class="text-center">{{ item.dies_name || '-' }}</td>
            <td class="text-center">{{ item.part_number || '-' }}</td>
            <td class="text-center">{{ item.tonnage_required || '-' }}</td>
            <td class="text-center">
              <template v-if="item.dies_length && item.dies_width">{{ item.dies_length }}x{{ item.dies_width }}</template>
              <template v-else>-</template>
            </td>
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

    <DiesFormDialog v-model="isModalAddOpen" mode="add" @submit="submitAdd" />
    <DiesFormDialog v-model="isModalEditOpen" mode="edit" @submit="submitEdit" />
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
