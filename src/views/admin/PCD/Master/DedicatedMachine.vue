<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useDedicatedMachineStore } from '@/stores/PCD/Master/DedicatedMachine';
import { useNotificationStore } from '@/stores/notification';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { storeToRefs } from 'pinia';

const page = ref({ title: 'Master Dedicated Part & Machine' });
const breadcrumbs = ref([
  { title: 'PCD', disabled: false, href: '#' },
  { title: 'Master', disabled: false, href: '#' },
  { title: 'Dedicated Machine', disabled: true, href: '#' }
]);

const store = useDedicatedMachineStore();
const notificationStore = useNotificationStore();
const { loading, isModalFormOpen, formLoading, formData } = storeToRefs(store);
const dataTable = computed(() => store.dataTable);
const isEditMode = computed(() => store.isEditMode);
const areaOptions = computed(() => store.areaOptions);
const machineOptions = computed(() => store.machineOptions);
const partOptions = computed(() => store.partOptions);

watch(() => formData.value.area, (newVal) => {
  if (newVal) {
    store.fetchDropdownOptions(newVal);
  }
});

const searchPart = ref('');
const searchMachine = ref('');
const searchArea = ref('');
const searchQuery = ref('');

const headers: any[] = [
  { title: 'No', align: 'center', key: 'no', sortable: false },
  { title: 'Area', align: 'start', key: 'area' },
  { title: 'Part Number', align: 'start', key: 'part_number' },
  { title: 'Machine', align: 'start', key: 'machine' },
  { title: 'Machine Alternative', align: 'start', key: 'machine_alternative' },
  { title: 'Note', align: 'start', key: 'note' },
  { title: 'Dibuat Oleh', align: 'start', key: 'created_by' },
  { title: 'Diperbarui Oleh', align: 'start', key: 'updated_by' },
  { title: 'Aksi', align: 'center', key: 'actions', sortable: false }
];

const handleSearch = () => {
  store.fetchDedicatedMachines(searchPart.value, searchMachine.value, searchArea.value);
};

const handleReset = () => {
  searchPart.value = '';
  searchMachine.value = '';
  searchArea.value = '';
  store.fetchDedicatedMachines();
};

const openCreate = () => {
  store.openCreateModal();
};

const openEdit = (item: any) => {
  store.openEditModal(item);
};

const handleDelete = async (id?: number | string) => {
  if (id === undefined) return;
  notificationStore.showConfirm(
    "Konfirmasi Hapus",
    "Apakah Anda yakin ingin menghapus data ini?",
    async () => {
      await store.deleteData(id);
    }
  );
};

onMounted(() => {
  store.fetchDedicatedMachines();
  store.fetchDropdownOptions();
});
</script>

<template>
  <div class="page-wrapper">
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>

    <v-card elevation="2" class="rounded-lg mb-6 pa-5">
      <div class="d-flex align-center justify-space-between mb-4">
        <div class="text-h6 font-weight-bold text-primary">Filter Data</div>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openCreate">
          Tambah Data
        </v-btn>
      </div>
      
      <v-row>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="searchArea"
            label="Area"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            @keyup.enter="handleSearch"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="searchPart"
            label="Part Number"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            @keyup.enter="handleSearch"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="searchMachine"
            label="Machine"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            @keyup.enter="handleSearch"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="3" class="d-flex align-center">
          <v-btn color="primary" class="mr-3" @click="handleSearch">
            <v-icon left>mdi-magnify</v-icon> Cari
          </v-btn>
          <v-btn color="secondary" variant="outlined" @click="handleReset">
            <v-icon left>mdi-refresh</v-icon> Reset
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <v-card elevation="2" class="rounded-lg">
      <v-card-title class="pa-4 bg-primary text-white d-flex justify-space-between align-center">
        <span class="text-subtitle-1 font-weight-medium">Daftar Dedicated Machine</span>
        <div style="width: 250px;">
          <v-text-field
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            placeholder="Cari dalam tabel..."
            variant="solo"
            density="compact"
            hide-details
            class="bg-white rounded"
          ></v-text-field>
        </div>
      </v-card-title>
      
      <v-data-table
        :headers="headers"
        :items="dataTable"
        :search="searchQuery"
        :loading="loading"
        class="elevation-0 custom-table"
        density="comfortable"
      >
        <template v-slot:item.no="{ index }">
          <div class="text-center">{{ index + 1 }}</div>
        </template>
        
        <template v-slot:item.part_number="{ item }">
          <div class="font-weight-medium text-primary">{{ item.part_number }}</div>
        </template>
        
        <template v-slot:item.machine_alternative="{ item }">
          <div class="text-grey-darken-1">{{ item.machine_alternative || '-' }}</div>
        </template>
        
        <template v-slot:item.actions="{ item }">
          <div class="d-flex justify-center gap-2">
            <v-tooltip text="Edit Data">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-pencil"
                  size="x-small"
                  color="warning"
                  variant="text"
                  @click="openEdit(item)"
                ></v-btn>
              </template>
            </v-tooltip>
            
            <v-tooltip text="Hapus Data">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-delete"
                  size="x-small"
                  color="error"
                  variant="text"
                  @click="handleDelete(item.id)"
                ></v-btn>
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Modal Form Create/Edit -->
    <v-dialog v-model="isModalFormOpen" max-width="500px" persistent>
      <v-card>
        <v-card-title class="bg-primary text-white pa-4">
          <span class="text-h6">{{ isEditMode ? 'Edit Dedicated Machine' : 'Tambah Dedicated Machine' }}</span>
        </v-card-title>
        
        <v-card-text class="pt-6">
          <v-form @submit.prevent="store.saveDedicatedMachine">
            <v-row>
              <v-col cols="12">
                <v-select
                  v-model="formData.area"
                  :items="areaOptions"
                  item-title="area"
                  item-value="area"
                  label="Area *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => !!v || 'Area wajib diisi']"
                  required
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-autocomplete
                  v-model="formData.part_number"
                  :items="partOptions"
                  item-title="part_number"
                  item-value="part_number"
                  label="Part Number *"
                  variant="outlined"
                  density="comfortable"
                  :multiple="!isEditMode"
                  :chips="!isEditMode"
                  :closable-chips="!isEditMode"
                  :rules="[v => (Array.isArray(v) ? v.length > 0 : !!v) || 'Part Number wajib diisi']"
                  required
                ></v-autocomplete>
              </v-col>
              <v-col cols="12">
                <v-autocomplete
                  v-model="formData.machine"
                  :items="machineOptions"
                  item-title="machine"
                  item-value="machine"
                  label="Machine *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => !!v || 'Machine wajib diisi']"
                  required
                ></v-autocomplete>
              </v-col>
              <v-col cols="12">
                <v-autocomplete
                  v-model="formData.machine_alternative"
                  :items="machineOptions"
                  item-title="machine"
                  item-value="machine"
                  label="Machine Alternative"
                  variant="outlined"
                  density="comfortable"
                  clearable
                ></v-autocomplete>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="formData.note"
                  label="Note (Opsional)"
                  variant="outlined"
                  density="comfortable"
                  rows="3"
                ></v-textarea>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        
        <v-divider></v-divider>
        
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="store.closeFormModal">
            Batal
          </v-btn>
          <v-btn color="primary" variant="flat" :loading="formLoading" @click="store.saveDedicatedMachine">
            Simpan
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.custom-table {
  border-top: 1px solid #e0e0e0;
}
.custom-table :deep(th) {
  background-color: #f5f5f5;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
}
</style>
