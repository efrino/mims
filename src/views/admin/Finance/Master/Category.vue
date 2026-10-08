<script setup lang="ts">
import { onMounted, shallowRef, computed } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import TableExcel, { type TableColumn } from '@/components/table/TableExcel.vue';
import { useCategoryStore } from '@/stores/Finance/Master/CategoryStore';
import { PlusOutlined, SyncOutlined } from '@ant-design/icons-vue';

const breadcrumbs = shallowRef([
  { title: 'Finance', disabled: false, href: '#' },
  { title: 'Master', disabled: false, href: '#' },
  { title: 'Category', disabled: true, href: '#' },
]);

const store = useCategoryStore();
const { tableRows, form, dialog, selectedRow, loading, permissions } = storeToRefs(store);

const tableColumns: TableColumn[] = [
  { key: 'category', label: 'Nama Kategori', width: '260px' },
  { key: 'due_days',       label: 'Tenggat (Hari)', width: '140px', align: 'center' },
  { key: 'status_label',   label: 'Status',         width: '110px', align: 'center', sortable: false },
];

function toRows(rows: typeof tableRows.value) {
  return rows.map((r) => ({
    ...r,
    status_label: Number(r.active) !== 0 ? 'Aktif' : 'Nonaktif',
  }));
}

const tableData = computed(() => toRows(tableRows.value));

onMounted(() => {
  store.fetchData();
});
</script>

<template>
  <BaseBreadcrumb title="Category" :breadcrumbs="breadcrumbs" class="mb-6" />

  <div class="flex flex-col gap-5">

    <!-- ── Filter Bar ─────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-end gap-3">
      <button
        @click="store.fetchData()"
        type="button"
        class="flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 font-medium rounded-full text-sm px-5 py-2 whitespace-nowrap"
      >
        <SyncOutlined />
        Reload
      </button>

      <div class="flex-1" />

      <button
        v-if="permissions.create"
        @click="store.openAdd()"
        type="button"
        class="flex items-center gap-2 text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 font-medium rounded-full text-sm px-5 py-2 whitespace-nowrap shadow"
      >
        <PlusOutlined />
        Tambah Kategori
      </button>
    </div>

    <!-- ── Table ──────────────────────────────────────────────────── -->
    <TableExcel :columns="tableColumns" :data="tableData" :loading="loading">
      <template #cell-due_days="{ value }">
        <span class="tabular-nums font-medium">{{ value }} hari</span>
      </template>
      <template #cell-status_label="{ value }">
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          :class="value === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'"
        >
          {{ value }}
        </span>
      </template>
      <template #actions="{ row }">
        <div class="flex items-center justify-center gap-1 ">
          <button
            v-if="permissions.update"
            type="button"
            title="Edit"
            @click="store.openEdit(row as any)"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100"
          >
            <i class="mdi mdi-pencil-outline text-sm" />
          </button>
          <!-- <button
            v-if="permissions.update"
            type="button"
            title="Toggle Status"
            @click="store.onToggle(row as any)"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100"
          >
            <i class="mdi mdi-swap-horizontal text-sm" />
          </button> -->
          <button
            v-if="permissions.delete"
            type="button"
            title="Hapus"
            @click="store.onDelete(row as any)"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
          >
            <i class="mdi mdi-trash-can-outline text-sm" />
          </button>
        </div>
      </template>
    </TableExcel>

  </div>

  <!-- ════════════════════════════════════════════════════════════════
       Modal: Tambah/Edit Kategori
  ═════════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <div
      v-if="dialog.form"
      class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4"
      @click.self="dialog.form = false"
    >
      <div class="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <i class="mdi mdi-shape-outline text-emerald-600" />
            </div>
            <h3 class="text-base font-bold text-gray-800 dark:text-gray-100">
              {{ selectedRow ? 'Edit Kategori' : 'Tambah Kategori' }}
            </h3>
          </div>
          <button type="button" @click="dialog.form = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <i class="mdi mdi-close text-xl" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Kategori</label>
            <input
              v-model="form.category"
              type="text"
              placeholder="Contoh: Operasional"
              class="py-1 px-2.5 text-gray-700 text-sm bg-white border border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Tenggat (Due Days)</label>
            <input
              v-model.number="form.due_days"
              type="number"
              min="0"
              placeholder="Jumlah hari tenggat"
              class="py-1 px-2.5 text-gray-700 text-sm bg-white border border-gray-300 rounded-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
            />
            <p class="text-[11px] text-gray-400">Jumlah hari sejak tanggal pemakaian sampai jatuh tempo kasbon dengan kategori ini.</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            @click="dialog.form = false"
            class="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-full"
          >
            Batal
          </button>
          <button
            type="button"
            @click="store.onSubmit()"
            class="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-full"
          >
            Simpan
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>
