<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useAchievementWld } from '@/stores/Welding/Transaction/Achievement';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';

const storeAch = useAchievementWld();
const { cleanData, selectedPrefixLine, selectedLineId, currentPatan, permissions, filter } = storeToRefs(storeAch);
const router = useRouter();
const route = useRoute();

// Parameter halaman (prefix line, tanggal, shift) disimpan juga di URL query supaya tetap ada
// setelah refresh, karena saat refresh isi store kembali kosong.
const queryStr = (v: unknown) => (typeof v === 'string' ? v : '');
const qPrefix = queryStr(route.query.prefix);
let needFetch = cleanData.value.length == 0;

if (qPrefix) {
  const qDate = queryStr(route.query.date);
  const qShift = queryStr(route.query.shift);
  if ((qDate && qDate != filter.value.date) || (qShift && qShift != String(filter.value.shift))) needFetch = true;

  selectedPrefixLine.value = qPrefix;
  if (qDate) filter.value.date = qDate;
  if (qShift) filter.value.shift = typeof filter.value.shift === 'number' ? Number(qShift) : qShift;
} else if (selectedPrefixLine.value != '') {
  router.replace({
    query: {
      ...route.query,
      prefix: selectedPrefixLine.value,
      date: filter.value.date,
      shift: String(filter.value.shift),
    },
  });
} else {
  router.push({ name: 'Transaction-welding-achievement' });
}

onMounted(async () => {
  if (needFetch) await storeAch.fetchData();
});

const page = ref({ title: `Achievement Welding - Line ${selectedPrefixLine.value}` });
const breadcrumbs = shallowRef([
  {
    title: 'Welding',
    disabled: false,
    href: '#'
  },
  {
    title: 'Transaction',
    disabled: false,
    href: '#'
  },
  {
    title: 'Achievement',
    disabled: false,
    href: '/transaction/welding/achievement/'
  },
  {
    title: `LINE ${selectedPrefixLine.value}`,
    disabled: true,
    href: '#'
  }
]);

const viewDetail = (line_id: string) => {
  selectedLineId.value = line_id;
  router.push({ name: 'transaction-welding-achievement-detail' });
};

const editData = async (line_id: string) => {
  selectedLineId.value = line_id;
  if (!(await storeAch.canOpenForm())) {
    router.push({ name: 'transaction-welding-achievement-detail' });
    return;
  }
  // storeAch.openFormEdit(currentPatan.value);
  router.push({ name: 'transaction-welding-achievement-detail-edit' });
};
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-col gap-8">
    <!-- Card -->
    <div class="flex flex-wrap gap-5 justify-center mt-5">
      <template v-for="(value, i) in cleanData" :key="i">
        <div
          v-if="value.prefix_line_id == selectedPrefixLine"
          v-for="(item, j) in value.detail"
          :key="j"
          class="rounded-lg shadow bg-white text-blue-700 hover:shadow-lg transition hover-menu h-fit"
          style="border-top: 5px solid"
        >
          <div class="p-6 flex gap-5 justify-between w-md items-center">
            <!-- LEFT -->
            <span class="text-xl font-semibold"> LINE {{ item.line_id }} </span>

            <!-- RIGHT BUTTONS -->
            <div class="flex items-center space-x-1">
              <button
                @click="viewDetail(item.line_id)"
                class="w-7 h-7 flex items-center justify-center rounded-full outline-1 text-blue-600 outline-offset-1 outline-solid transition me-2"
              >
                <i class="mdi mdi-eye text-sm"></i>
              </button>

              <button
                @click="editData(item.line_id)"
                class="px-3 py-1 text-sm rounded transition me-2"
                :disabled="!(permissions.create || permissions.update || permissions.pcd)"
                :class="
                  permissions.update || permissions.create || permissions.pcd
                    ? 'text-green-600 outline-1 border-green-600'
                    : 'text-gray-600 outline-1 border-gray-600 bg-gray-200 cursor-not-allowed'
                "
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
.hover-menu {
  transition: transform 0.3s ease-in-out;
}

.hover-menu:hover {
  transform: scale(1.1);
}
</style>
