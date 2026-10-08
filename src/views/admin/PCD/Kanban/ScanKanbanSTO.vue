<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';

const page = ref({ title: 'Scan Kanban STO' });
const breadcrumbs = shallowRef([
  {
    title: 'PCD',
    disabled: false,
    href: '#'
  },
  {
    title: 'Kanban',
    disabled: false,
    href: '#'
  },
  {
    title: 'Scan Kanban STO',
    disabled: true,
    href: '#'
  }
]);

const scanKanban = ref<HTMLInputElement | null>(null);

onMounted(() => {
  scanKanban.value?.focus();
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex justify-center">
    <div class="w-2xl p-6 text-start bg-white rounded-xl shadow">
			<div class="flex justify-center gap-5">
				<div class="mb-5 w-full">
					<label for="jenis_kanban" class="block mb-2 text-sm font-medium text-gray-900">Jenis Kanban</label>
					<select id="jenis_kanban" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" required>
						<option value="" disabled>Pilih</option>
						<option value="1">Terpasang</option>
						<option value="2">Tambahan</option>
					</select>
				</div>
				<div class="mb-5 w-full">
					<label for="area" class="block mb-2 text-sm font-medium text-gray-900">Area</label>
					<select id="area" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" required>
						<option value="" disabled>Pilih</option>
						<option value="1">Ekspor / DCWA</option>
						<option value="2">Koridor Welding</option>
						<option value="2">IFP ADM</option>
						<option value="2">IFP MKM / MMKI</option>
						<option value="2">IFP HMMI</option>
					</select>
				</div>
			</div>
      <div class="mb-5">
        <label for="nik" class="block mb-2 text-sm font-medium text-gray-900">NIK</label>
        <input type="text" id="nik" class="bg-gray-50 border border-gray-300 text-gray-900 text-md rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="F.xxxx" required />
      </div>
      <div class="">
        <label for="id_kanban" class="block mb-2 text-sm font-medium text-gray-900">Scan Barcode Kanban</label>
        <input ref="scanKanban" autocomplete="off" type="text" id="id_kanban" class="bg-gray-50 border border-gray-300 text-gray-900 text-md rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="ID Kanban" required />
      </div>
    </div>
  </div>
</template>

<style>
	.border {
    border: 1px solid #e5e7eb !important;
  }
</style>