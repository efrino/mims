<script setup lang="ts">
import { useGangguanMachine } from '@/stores/Stamping/Transaction/GangguanMachine';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { onMounted, ref, shallowRef } from 'vue';
import { storeToRefs } from 'pinia';

const page = ref({ title: 'Gangguan Mesin Stamping' });
const breadcrumbs = shallowRef([
  {
    title: 'Stamping',
    disabled: false,
    href: '#'
  },
  {
    title: 'Production',
    disabled: false,
    href: '#'
  },
  {
    title: 'Gangguan Mesin',
    disabled: true,
    href: '#'
  }
]);

const gangguanStore = useGangguanMachine();

const { fetchDataGangguan, loadFormAction, onAction, onDone } = gangguanStore;

const { job_number_actual, d_start, d_end, gangguan, dialog, selectedForm, act_mesin, is_done, mesin } = storeToRefs(gangguanStore);

onMounted(async () => {
  await fetchDataGangguan();
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="p-4 bg-gray-50 min-h-screen">
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
      <div v-for="item in gangguan" :key="item.machine">
        <div
          class="h-full bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 border-l-[6px] p-6 flex flex-col justify-between"
          :class="[
            item.act_mesin == '1'
              ? 'border-yellow-400 bg-yellow-50/30'
              : item.last_status == 'gangguan_start' && item.is_done == 'N'
                ? 'border-red-500 bg-red-50/30'
                : 'border-gray-300'
          ]"
        >
          <div class="flex justify-between items-start">
            <div class="flex flex-col">
              <span class="text-xs font-semibold uppercase tracking-wider text-gray-500"> Machine </span>
              <span class="text-2xl font-bold text-gray-800">
                {{ item.machine }}
              </span>

              <span v-if="item.act_mesin == '1'" class="mt-2 text-xs font-medium px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 w-fit">
                Repairing
              </span>
              <span
                v-else-if="item.last_status == 'gangguan_start' && item.is_done == 'N'"
                class="mt-2 text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-800 w-fit"
              >
                Gangguan
              </span>
            </div>

            <button
              @click="loadFormAction(item)"
              class="flex items-center gap-1 text-white bg-green-600 hover:bg-green-700 font-medium rounded-full text-xs px-4 py-2 shadow-md transition-colors"
            >
              ACTION
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="dialog.formAction && selectedForm"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden"
    >
      <div class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" @click="dialog.formAction = false"></div>

      <div class="relative w-full max-w-lg bg-white rounded-xl shadow-2xl transform transition-all mx-4">
        <div
          class="flex items-center justify-between p-4 rounded-t-xl border-b"
          :class="[act_mesin == '1' ? 'bg-yellow-300 text-gray-900' : is_done == 'Y' ? 'bg-green-600 text-white' : 'bg-red-600 text-white']"
        >
          <h3 class="text-lg font-bold tracking-wide">Gangguan Mesin {{ mesin }}</h3>
          <button @click="dialog.formAction = false" class="p-1 rounded hover:bg-white/20 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="p-8 text-center space-y-6">
          <div>
            <span class="text-sm text-gray-400 uppercase font-semibold">Job Number</span>
            <h2 class="text-3xl font-extrabold text-gray-800 mt-1">
              {{ job_number_actual }}
            </h2>
          </div>

          <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <h2 v-if="is_done == 'N'" class="text-xl font-mono text-blue-600 font-bold">
              START <span class="text-gray-900">{{ d_start ? d_start.substr(11, 8) : '--:--:--' }}</span>
            </h2>
            <h2 v-else class="text-xl font-mono text-green-600 font-bold">
              END <span class="text-gray-900">{{ d_end ? d_end.substr(11, 8) : '--:--:--' }}</span>
            </h2>
          </div>
        </div>

        <div class="flex items-center justify-end p-4 border-t border-gray-100 space-x-2 bg-gray-50 rounded-b-xl">
          <button
            @click="dialog.formAction = false"
            class="px-5 py-2.5 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-900 focus:ring-4 focus:ring-gray-200"
          >
            Close
          </button>

          <button
            v-if="act_mesin == '0' && is_done == 'N'"
            @click="onAction()"
            class="px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 shadow-lg shadow-green-500/30"
          >
            Action
          </button>

          <button
            v-else-if="is_done == 'N'"
            @click="onDone()"
            class="px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 shadow-lg shadow-green-500/30"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
