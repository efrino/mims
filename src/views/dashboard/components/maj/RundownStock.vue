<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import moment from 'moment';

import { useUtilityStore } from '@/pinia/utility';

import type { CustomerStock, StockIFPD } from '@/types/Admin/RundownStock';
import { useRundownStock } from '@/stores/Admin/RundownStock';
import RundownStockIFPD from '../Table/RundownStockIFPD.vue';
import RundownStockIFRM from '../Table/RundownStockIFRM.vue';
import RundownStockIFPP from '../Table/RundownStockIFPP.vue';
import RundownStockIFRMSupplyMaterial from '../Table/RundownStockIFRMSupplyMaterial.vue';

type RowSpanMap = Record<string, number>;

const rundownStockStore = useRundownStock();
const utilityStore = useUtilityStore();

const activeTab = ref<'IFPD' | 'IFPP-INHOUSE' | 'IFPP-OUTHOUSE' | 'IFRM' | 'IFRM-SUPPLY'>('IFPD');

const switchTab = (tab: typeof activeTab.value) => {
  activeTab.value = tab;
};


onMounted(async () => {

});

onBeforeUnmount(() => {});
</script>
<template>
  <div class="w-full flex items-center justify-between mb-4">
    <h2 class="text-xl font-bold text-gray-800">Rundown Stock {{activeTab}}</h2>
    <div class="flex space-x-1 bg-gray-100 rounded-lg p-1">
      <button
        @click="switchTab('IFPD')"
        :class="[
          'px-4 py-1 text-sm rounded-lg transition-colors',
          activeTab === 'IFPD' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'
        ]"
      >
        IFPD
      </button>
      <button
        @click="switchTab('IFPP-INHOUSE')"
        :class="[
          'px-4 py-1 text-sm rounded-lg transition-colors',
          activeTab === 'IFPP-INHOUSE' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'
        ]"
      >
        IFPP (INHOUSE)
      </button>
      <button
        @click="switchTab('IFPP-OUTHOUSE')"
        :class="[
          'px-4 py-1 text-sm rounded-lg transition-colors',
          activeTab === 'IFPP-OUTHOUSE' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'
        ]"
      >
        IFPP (OUTHOUSE)
      </button>
      <button
        @click="switchTab('IFRM')"
        :class="[
          'px-4 py-1 text-sm rounded-lg transition-colors',
          activeTab === 'IFRM' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'
        ]"
      >
        IFRM
      </button>
      <button
        @click="switchTab('IFRM-SUPPLY')"
        :class="[
          'px-4 py-1 text-sm rounded-lg transition-colors',
          activeTab === 'IFRM-SUPPLY' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'
        ]"
      >
        IFRM (SUPPLY MATERIAL)
      </button>
    </div>
  </div>
  <RundownStockIFPD v-if="activeTab === 'IFPD'" />
  <RundownStockIFRM v-if="activeTab === 'IFRM'" />
  <RundownStockIFPP v-if="activeTab === 'IFPP-INHOUSE'" location="IN" />
  <RundownStockIFPP v-if="activeTab === 'IFPP-OUTHOUSE'" location="OUT" />
  <RundownStockIFRMSupplyMaterial v-if="activeTab === 'IFRM-SUPPLY'" />
</template>

<style>
.font-family-roboto {
  font-family: Roboto, 'Segoe UI', sans-serif;
}
</style>
