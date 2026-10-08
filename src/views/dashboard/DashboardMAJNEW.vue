<template>
  <v-container fluid class="pa-0 dash-root">
    <div class="w-full pt-2.5 bg-transparent">
      <div class="flex flex-wrap -mb-px items-center">
        <button
          @click="activeTab = 'rundown-stock'"
          :class="[
            'px-6 py-2.5 text-sm font-bold rounded-t-xl border-t border-x transition-all duration-150',
            activeTab === 'rundown-stock'
              ? 'bg-white text-blue-600 border-gray-300 z-10 shadow-[0_-2px_6px_rgba(0,0,0,0.03)] dark:bg-slate-800 dark:text-blue-300 dark:border-slate-700'
              : 'bg-transparent text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
          ]"
          :style="activeTab === 'rundown-stock' ? { marginBottom: '-1px' } : {}"
        >
          <div class="flex items-center gap-2">
            <v-icon size="small">mdi-truck-delivery-outline</v-icon>
            Rundown Stock
          </div>
        </button>
        <button
          @click="activeTab = 'delivery-overview'"
          :class="[
            'px-6 py-2.5 text-sm font-bold rounded-t-xl border-t border-x transition-all duration-150',
            activeTab === 'delivery-overview'
              ? 'bg-white text-blue-600 border-gray-300 z-10 shadow-[0_-2px_6px_rgba(0,0,0,0.03)] dark:bg-slate-800 dark:text-blue-300 dark:border-slate-700'
              : 'bg-transparent text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
          ]"
          :style="activeTab === 'delivery-overview' ? { marginBottom: '-1px' } : {}"
        >
          <div class="flex items-center gap-2">
            <v-icon size="small">mdi-truck-delivery-outline</v-icon>
            Delivery Overview
          </div>
        </button>

        <button
          @click="activeTab = 'achievement'"
          :class="[
            'px-6 py-2.5 text-sm font-bold rounded-t-xl border-t border-x transition-all duration-150',
            activeTab === 'achievement'
              ? 'bg-white text-blue-600 border-gray-300 z-10 shadow-[0_-2px_6px_rgba(0,0,0,0.03)] dark:bg-slate-800 dark:text-blue-300 dark:border-slate-700'
              : 'bg-transparent text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
          ]"
          :style="activeTab === 'achievement' ? { marginBottom: '-1px' } : {}"
        >
          <div class="flex items-center gap-2">
            <v-icon size="small">mdi-chart-timeline-variant-shimmer</v-icon>
            Achievement Production
          </div>
        </button>

        <button
          @click="activeTab = 'absensi'"
          :class="[
            'px-6 py-2.5 text-sm font-bold rounded-t-xl border-t border-x transition-all duration-150',
            activeTab === 'absensi'
              ? 'bg-white text-blue-600 border-gray-300 z-10 shadow-[0_-2px_6px_rgba(0,0,0,0.03)] dark:bg-slate-800 dark:text-blue-300 dark:border-slate-700'
              : 'bg-transparent text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
          ]"
          :style="activeTab === 'absensi' ? { marginBottom: '-1px' } : {}"
        >
          <div class="flex items-center gap-2">
            <v-icon size="small">mdi-account-check-outline</v-icon>
            Absensi Karyawan
          </div>
        </button>
      </div>
    </div>

    <div class="p-6 bg-white border border-gray-300 rounded-b-xl rounded-tr-xl shadow-sm dark:bg-slate-800 dark:border-slate-700">
      <v-window :touch="false" v-model="activeTab" class="bg-transparent">
        <v-window-item value="rundown-stock">
          <div class="animate-fade-in">
            <RundownStock />
          </div>
        </v-window-item>
        <v-window-item value="delivery-overview">
          <div class="animate-fade-in">
            <DashboardDelivery class="mb-6" />
            <PlanDelivery />
          </div>
        </v-window-item>

        <v-window-item value="achievement">
          <div class="animate-fade-in">
            <AchievementProduction />
          </div>
        </v-window-item>

        <v-window-item value="absensi">
          <div class="animate-fade-in">
            <DashboardAbsensi />
          </div>
        </v-window-item>
      </v-window>
    </div>
  </v-container>
</template>

<script>
import DashboardDelivery from '@/views/dashboard/components/maj/DashboardDelivery.vue';
import PlanDelivery from '@/views/dashboard/components/maj/PlanDelivery.vue';
import AchievementProduction from '@/views/dashboard/components/maj/AchievementProduction.vue';
import DashboardAbsensi from '@/views/dashboard/components/maj/DashboardAbsensi.vue';
import { initFlowbite } from 'flowbite';
import RundownStock from './components/maj/RundownStock.vue';

export default {
  name: 'HalamanDashboardMain',
  components: {
    RundownStock,
    DashboardDelivery,
    PlanDelivery,
    AchievementProduction,
    DashboardAbsensi
  },
  data() {
    return {
      activeTab: 'rundown-stock'
    };
  },
  mounted() {
    initFlowbite();
  }
};
</script>

<style scoped>
.v-container {
  padding: 0 !important;
  margin: 0 !important;
  max-width: 100% !important;
}

.animate-fade-in {
  animation: fadeIn 0.25s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

